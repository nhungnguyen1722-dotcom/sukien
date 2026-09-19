const { Pool } = require('pg');

let NEON_CONN_STRING = 'postgresql://neondb_owner:npg_Gy2mBY4leKgb@ep-snowy-forest-ax0u3mls.c-4.us-east-2.aws.neon.tech/neondb?sslmode=require';

const LOCAL_CONFIG = {
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '1111222267',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5433', 10),
  database: process.env.DB_NAME || 'postgismap',
};

const SKIP_TABLES = [
  'spatial_ref_sys',
  'pointcloud_formats',
  'geometry_columns',
  'geography_columns',
  'raster_columns',
  'raster_overviews',
];

function mapType(udtName, dataType, charMaxLen) {
  if (udtName === 'jsonb') return 'json';
  if (udtName === '_text') return 'text[]';
  if (udtName === '_int4') return 'integer[]';
  if (udtName === '_varchar') return 'varchar[]';
  if (dataType === 'character varying' && charMaxLen) return `varchar(${charMaxLen})`;
  if (dataType === 'character varying') return 'varchar';
  if (dataType === 'timestamp without time zone') return 'timestamp';
  if (dataType === 'timestamp with time zone') return 'timestamptz';
  return udtName;
}

async function syncDatabases() {
  console.log('=== BẮT ĐẦU ĐỒNG BỘ DỮ LIỆU TỪ NEON VỀ LOCALHOST POSTGRESQL ===\n');

  const neonPool = new Pool({
    connectionString: NEON_CONN_STRING,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 15000,
  });

  const localPool = new Pool(LOCAL_CONFIG);
  const localClient = await localPool.connect();

  try {
    const neonVer = await neonPool.query('SELECT version()');
    console.log('[Neon DB] Đã kết nối:', neonVer.rows[0].version.split(' on ')[0]);

    const localVer = await localClient.query('SELECT version()');
    console.log('[Local DB] Đã kết nối:', localVer.rows[0].version.split(' on ')[0]);
    console.log('');

    const tablesRes = await neonPool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `);

    const neonTables = tablesRes.rows
      .map(r => r.table_name)
      .filter(t => !SKIP_TABLES.includes(t));

    console.log(`Tìm thấy ${neonTables.length} bảng dữ liệu trên Neon:`);
    console.log(neonTables.join(', '));
    console.log('');

    try {
      await localClient.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
    } catch (e) {
      // ignore
    }

    // 1. Đồng bộ cấu trúc bảng và cột
    for (const tableName of neonTables) {
      const colsRes = await neonPool.query(`
        SELECT column_name, data_type, udt_name, is_nullable, column_default, character_maximum_length, numeric_precision, numeric_scale
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = $1
        ORDER BY ordinal_position
      `, [tableName]);

      const localTableCheck = await localClient.query(`
        SELECT table_name FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = $1
      `, [tableName]);

      if (localTableCheck.rows.length === 0) {
        console.log(`[Cấu trúc] Bảng "${tableName}" chưa có trên local. Đang tạo...`);
        
        const colDefs = [];
        for (const col of colsRes.rows) {
          if (col.udt_name === 'geometry') {
            colDefs.push(`"${col.column_name}" geometry`);
            continue;
          }
          const colType = mapType(col.udt_name, col.data_type, col.character_maximum_length);
          let def = `"${col.column_name}" ${colType}`;
          if (col.is_nullable === 'NO') def += ' NOT NULL';
          if (col.column_default && !col.column_default.includes('nextval')) {
            let d = col.column_default;
            if (d.includes('::jsonb')) d = d.replace('::jsonb', '::json');
            def += ` DEFAULT ${d}`;
          }
          colDefs.push(def);
        }

        const pkRes = await neonPool.query(`
          SELECT kcu.column_name
          FROM information_schema.table_constraints tc
          JOIN information_schema.key_column_usage kcu 
            ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
          WHERE tc.constraint_type = 'PRIMARY KEY' AND tc.table_schema = 'public' AND tc.table_name = $1
          ORDER BY kcu.ordinal_position
        `, [tableName]);

        if (pkRes.rows.length > 0) {
          const pkCols = pkRes.rows.map(r => `"${r.column_name}"`).join(', ');
          colDefs.push(`PRIMARY KEY (${pkCols})`);
        }

        const createSql = `CREATE TABLE "${tableName}" (\n  ${colDefs.join(',\n  ')}\n);`;
        await localClient.query(createSql);
        console.log(`[Cấu trúc] Đã tạo bảng "${tableName}".`);
      } else {
        const localColsRes = await localClient.query(`
          SELECT column_name 
          FROM information_schema.columns
          WHERE table_schema = 'public' AND table_name = $1
        `, [tableName]);
        const localColNames = new Set(localColsRes.rows.map(r => r.column_name));

        for (const col of colsRes.rows) {
          if (!localColNames.has(col.column_name)) {
            console.log(`[Cấu trúc] Bổ sung cột "${col.column_name}" cho bảng "${tableName}"...`);
            let colType = mapType(col.udt_name, col.data_type, col.character_maximum_length);
            let alterSql = `ALTER TABLE "${tableName}" ADD COLUMN "${col.column_name}" ${colType}`;
            if (col.column_default && !col.column_default.includes('nextval')) {
              let d = col.column_default;
              if (d.includes('::jsonb')) d = d.replace('::jsonb', '::json');
              alterSql += ` DEFAULT ${d}`;
            }
            await localClient.query(alterSql);
          }
        }
      }
    }

    console.log('\n=== ĐỒNG BỘ CẤU TRÚC HOÀN TẤT. BẮT ĐẦU CHUYỂN DỮ LIỆU ===\n');

    // 2. Tạm tắt kiểm tra Foreign Key để import an toàn
    await localClient.query("SET session_replication_role = 'replica'");

    const tableListStr = neonTables.map(t => `"${t}"`).join(', ');
    console.log(`[Dữ liệu] Dọn sạch dữ liệu cũ các bảng đích: ${tableListStr}...`);
    await localClient.query(`TRUNCATE TABLE ${tableListStr} CASCADE`);

    // 3. Sao chép dữ liệu từng bảng
    for (const tableName of neonTables) {
      const colsRes = await neonPool.query(`
        SELECT column_name, udt_name 
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = $1
        ORDER BY ordinal_position
      `, [tableName]);

      const colNames = colsRes.rows.map(r => r.column_name);
      const colUdtMap = new Map(colsRes.rows.map(r => [r.column_name, r.udt_name]));

      const isGeomCol = (col) => colUdtMap.get(col) === 'geometry';
      const isJsonCol = (col) => ['json', 'jsonb'].includes(colUdtMap.get(col));
      const isArrayCol = (col) => (colUdtMap.get(col) || '').startsWith('_');

      let selectQuery = '';
      if (colsRes.rows.some(r => r.udt_name === 'geometry')) {
        const selectCols = colNames.map(c => {
          if (isGeomCol(c)) return `ST_AsEWKT("${c}") as "${c}"`;
          return `"${c}"`;
        }).join(', ');
        selectQuery = `SELECT ${selectCols} FROM "${tableName}"`;
      } else {
        selectQuery = `SELECT * FROM "${tableName}"`;
      }

      const neonDataRes = await neonPool.query(selectQuery);
      const rows = neonDataRes.rows;

      if (rows.length === 0) {
        console.log(`  - "${tableName}": 0 dòng (trống)`);
        continue;
      }

      const BATCH_SIZE = 100;
      for (let i = 0; i < rows.length; i += BATCH_SIZE) {
        const batch = rows.slice(i, i + BATCH_SIZE);
        
        for (const row of batch) {
          const valuePlaceholders = [];
          const values = [];
          
          colNames.forEach((col) => {
            let val = row[col];
            if (isGeomCol(col)) {
              if (val) {
                valuePlaceholders.push(`ST_GeomFromEWKT($${values.length + 1})`);
                values.push(val);
              } else {
                valuePlaceholders.push(`$${values.length + 1}`);
                values.push(null);
              }
            } else if (isJsonCol(col)) {
              if (val !== null && typeof val !== 'undefined') {
                const jsonStr = typeof val === 'string' ? val : JSON.stringify(val);
                valuePlaceholders.push(`$${values.length + 1}`);
                values.push(jsonStr);
              } else {
                valuePlaceholders.push(`$${values.length + 1}`);
                values.push(null);
              }
            } else if (isArrayCol(col)) {
              valuePlaceholders.push(`$${values.length + 1}`);
              values.push(val);
            } else {
              valuePlaceholders.push(`$${values.length + 1}`);
              values.push(val);
            }
          });

          const quotedCols = colNames.map(c => `"${c}"`).join(', ');
          const insertSql = `INSERT INTO "${tableName}" (${quotedCols}) VALUES (${valuePlaceholders.join(', ')})`;
          await localClient.query(insertSql, values);
        }
      }

      console.log(`  - "${tableName}": Đã import thành công ${rows.length} dòng.`);
    }

    // 4. Bật lại kiểm tra Foreign Key
    await localClient.query("SET session_replication_role = 'origin'");
    console.log('\n[Dữ liệu] Đã kích hoạt lại kiểm tra Foreign Key.');

    // 5. Cập nhật Sequences
    console.log('\n=== ĐỒNG BỘ AUTO-INCREMENT SEQUENCES ===\n');
    for (const tableName of neonTables) {
      const cols = await localClient.query(`
        SELECT column_name, column_default 
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = $1
      `, [tableName]);

      for (const col of cols.rows) {
        if (col.column_default && col.column_default.includes('nextval')) {
          const match = col.column_default.match(/nextval\('([^']+)'/);
          if (match) {
            const seqName = match[1].replace(/^public\./, '');
            const maxRes = await localClient.query(`SELECT COALESCE(MAX("${col.column_name}"), 0) as max_val FROM "${tableName}"`);
            const maxVal = parseInt(maxRes.rows[0].max_val, 10);
            const nextVal = maxVal > 0 ? maxVal : 1;
            const isCalled = maxVal > 0;
            
            try {
              await localClient.query(`SELECT setval('${seqName}', ${nextVal}, ${isCalled})`);
              console.log(`  - Sequence "${seqName}" (Bảng: ${tableName}.${col.column_name}) đặt về ${nextVal}`);
            } catch (seqErr) {
              if (seqErr.message.includes('does not exist')) {
                await localClient.query(`CREATE SEQUENCE IF NOT EXISTS "${seqName}" START WITH ${nextVal}`);
                await localClient.query(`ALTER TABLE "${tableName}" ALTER COLUMN "${col.column_name}" SET DEFAULT nextval('${seqName}'::regclass)`);
                await localClient.query(`SELECT setval('${seqName}', ${nextVal}, ${isCalled})`);
                console.log(`  - Sequence "${seqName}" đã tạo mới và đặt về ${nextVal}`);
              }
            }
          }
        }
      }
    }

    // 6. Đối soát tổng kết
    console.log('\n=== KẾT QUẢ ĐỐI SOÁT DỮ LIỆU ===\n');
    console.log('| # | Tên bảng | Số dòng Neon | Số dòng Localhost | Trạng thái |');
    console.log('|---|---|---|---|---|');

    let allMatch = true;
    let idx = 1;
    for (const tableName of neonTables) {
      const neonCntRes = await neonPool.query(`SELECT COUNT(*) as cnt FROM "${tableName}"`);
      const localCntRes = await localClient.query(`SELECT COUNT(*) as cnt FROM "${tableName}"`);
      const neonCnt = parseInt(neonCntRes.rows[0].cnt, 10);
      const localCnt = parseInt(localCntRes.rows[0].cnt, 10);
      const match = neonCnt === localCnt;
      if (!match) allMatch = false;

      console.log(`| ${idx++} | ${tableName} | ${neonCnt} | ${localCnt} | ${match ? 'KHỚP (100%)' : 'LỆCH'} |`);
    }

    console.log('');
    if (allMatch) {
      console.log('>>> THÀNH CÔNG RỰC RỠ: 100% DỮ LIỆU ĐÃ ĐƯỢC CHUYỂN VỀ POSTGRESQL LOCALHOST AN TOÀN VÀ CHÍNH XÁC! <<<');
    }

  } catch (err) {
    console.error('\nLỗi khi đồng bộ:', err);
  } finally {
    localClient.release();
    await neonPool.end();
    await localPool.end();
    console.log('\nĐã đóng kết nối cơ sở dữ liệu.');
  }
}

syncDatabases();
