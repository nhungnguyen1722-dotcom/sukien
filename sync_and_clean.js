const { Pool } = require('pg');

const NEON_CONN_STRING = 'postgresql://neondb_owner:npg_Gy2mBY4leKgb@ep-snowy-forest-ax0u3mls-pooler.c-4.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

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

async function main() {
  console.log('================================================================');
  console.log('🚀 BƯỚC 1: KẾT NỐI VÀ ĐỒNG BỘ DỮ LIỆU TỪ NEON SANG POSTGISMAP');
  console.log('================================================================\n');

  const neonPool = new Pool({
    connectionString: NEON_CONN_STRING,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 30000,
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
        SELECT column_name, data_type, udt_name, is_nullable, column_default, character_maximum_length
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

    console.log('\n=== BẮT ĐẦU CHUYỂN DỮ LIỆU ===\n');

    // 2. Tạm tắt kiểm tra Foreign Key để import an toàn
    await localClient.query("SET session_replication_role = 'replica'");

    // Check table_tinh
    let needSyncTinh = true;
    try {
      const localTinhCountRes = await localClient.query('SELECT COUNT(*) as cnt FROM table_tinh');
      const localTinhCount = parseInt(localTinhCountRes.rows[0].cnt, 10);
      needSyncTinh = localTinhCount < 63;
    } catch (e) {
      needSyncTinh = true;
    }

    // Truncate target tables
    const tablesToTruncate = neonTables.filter(t => t !== 'table_tinh' || needSyncTinh);
    const tableListStr = tablesToTruncate.map(t => `"${t}"`).join(', ');
    console.log(`[Dữ liệu] Dọn sạch dữ liệu cũ các bảng đích: ${tableListStr}...`);
    await localClient.query(`TRUNCATE TABLE ${tableListStr} CASCADE`);

    // 3. Sao chép dữ liệu từng bảng
    for (const tableName of neonTables) {
      if (tableName === 'table_tinh' && !needSyncTinh) {
        console.log(`  - "table_tinh": Giữ nguyên 63 tỉnh/thành GIS hiện có.`);
        continue;
      }

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
          if (isGeomCol(c)) return `ST_AsBinary("${c}") as "${c}"`;
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
                valuePlaceholders.push(`ST_GeomFromWKB($${values.length + 1}, 4326)`);
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

      console.log(`  - "${tableName}": Đã chuyển thành công ${rows.length} dòng.`);
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
              console.log(`  - Sequence "${seqName}" (${tableName}.${col.column_name}) đặt về ${nextVal}`);
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

    console.log('\n================================================================');
    console.log('🧹 BƯỚC 2: XÓA CÁC KHÁCH HÀNG CÓ KÍ TỰ "KIỂM TRA" TRÊN LOCAL');
    console.log('================================================================\n');

    // 1. Tìm các user có tên chứa "kiểm tra" / "kiem tra"
    const testUsersRes = await localClient.query(`
      SELECT id, full_name, phone, role, classification
      FROM users 
      WHERE full_name ILIKE '%kiểm tra%' 
         OR full_name ILIKE '%kiem tra%'
    `);

    const testUsers = testUsersRes.rows;
    console.log(`Tìm thấy ${testUsers.length} tài khoản thành viên/khách hàng trong bảng 'users':`);
    testUsers.forEach(u => console.log(`  - ID: ${u.id}, Tên: "${u.full_name}", SĐT: ${u.phone}, Vai trò: ${u.role}`));

    const testUserIds = testUsers.map(u => u.id);

    // 2. Tìm trong bảng invitations
    let testInvitations = [];
    try {
      const invQuery = testUserIds.length > 0
        ? `SELECT id, inviter_id, invitee_name, invitee_phone FROM invitations 
           WHERE invitee_name ILIKE '%kiểm tra%' 
              OR invitee_name ILIKE '%kiem tra%'
              OR inviter_id = ANY($1)`
        : `SELECT id, inviter_id, invitee_name, invitee_phone FROM invitations 
           WHERE invitee_name ILIKE '%kiểm tra%' 
              OR invitee_name ILIKE '%kiem tra%'`;
      const invParams = testUserIds.length > 0 ? [testUserIds] : [];
      const invRes = await localClient.query(invQuery, invParams);
      testInvitations = invRes.rows;
      console.log(`\nTìm thấy ${testInvitations.length} khách mời trong bảng 'invitations':`);
      testInvitations.forEach(i => console.log(`  - ID: ${i.id}, Khách mời: "${i.invitee_name}", SĐT: ${i.invitee_phone}`));
    } catch (e) {
      console.log('Không thể kiểm tra invitations:', e.message);
    }

    // 3. Tìm trong bảng event_registrations
    let testRegistrations = [];
    try {
      const regQuery = testUserIds.length > 0
        ? `SELECT id, event_id, guest_name, guest_phone, user_id FROM event_registrations 
           WHERE guest_name ILIKE '%kiểm tra%' 
              OR guest_name ILIKE '%kiem tra%'
              OR notes ILIKE '%kiểm tra%'
              OR user_id = ANY($1)`
        : `SELECT id, event_id, guest_name, guest_phone, user_id FROM event_registrations 
           WHERE guest_name ILIKE '%kiểm tra%' 
              OR guest_name ILIKE '%kiem tra%'
              OR notes ILIKE '%kiểm tra%'`;
      const regParams = testUserIds.length > 0 ? [testUserIds] : [];
      const regRes = await localClient.query(regQuery, regParams);
      testRegistrations = regRes.rows;
      console.log(`\nTìm thấy ${testRegistrations.length} lượt đăng ký sự kiện trong bảng 'event_registrations':`);
      testRegistrations.forEach(r => console.log(`  - ID: ${r.id}, Sự kiện ID: ${r.event_id}, Khách: "${r.guest_name}", SĐT: ${r.guest_phone}`));
    } catch (e) {
      console.log('Không thể kiểm tra event_registrations:', e.message);
    }

    // 4. Tìm trong bảng contracts
    let testContracts = [];
    try {
      const conQuery = testUserIds.length > 0
        ? `SELECT id, contract_code, customer_name FROM contracts 
           WHERE customer_name ILIKE '%kiểm tra%' 
              OR customer_name ILIKE '%kiem tra%'
              OR seller_id = ANY($1)
              OR closer_id = ANY($1)`
        : `SELECT id, contract_code, customer_name FROM contracts 
           WHERE customer_name ILIKE '%kiểm tra%' 
              OR customer_name ILIKE '%kiem tra%'`;
      const conParams = testUserIds.length > 0 ? [testUserIds] : [];
      const conRes = await localClient.query(conQuery, conParams);
      testContracts = conRes.rows;
      console.log(`\nTìm thấy ${testContracts.length} hợp đồng trong bảng 'contracts':`);
      testContracts.forEach(c => console.log(`  - ID: ${c.id}, Mã: ${c.contract_code}, Khách: "${c.customer_name}"`));
    } catch (e) {
      console.log('Không thể kiểm tra contracts:', e.message);
    }

    // THỰC HIỆN XÓA
    console.log('\n--- TIẾN HÀNH XÓA DỮ LIỆU KIỂM TRA ---');
    
    // Tắt tạm FK check để xóa sạch sẽ và an toàn
    await localClient.query("SET session_replication_role = 'replica'");

    // Xóa event_registrations
    if (testRegistrations.length > 0) {
      const regIds = testRegistrations.map(r => r.id);
      await localClient.query('DELETE FROM event_registrations WHERE id = ANY($1)', [regIds]);
      console.log(`✓ Đã xóa ${regIds.length} dòng trong 'event_registrations'`);
    }

    // Xóa invitations
    if (testInvitations.length > 0) {
      const invIds = testInvitations.map(i => i.id);
      await localClient.query('DELETE FROM invitations WHERE id = ANY($1)', [invIds]);
      console.log(`✓ Đã xóa ${invIds.length} dòng trong 'invitations'`);
    }

    // Xóa contracts
    if (testContracts.length > 0) {
      const conIds = testContracts.map(c => c.id);
      await localClient.query('DELETE FROM contracts WHERE id = ANY($1)', [conIds]);
      console.log(`✓ Đã xóa ${conIds.length} dòng trong 'contracts'`);
    }

    // Xóa các bảng liên quan đến user (nếu có)
    if (testUserIds.length > 0) {
      const relTables = ['event_in_charge', 'training_logs', 'lucky_wheel_spins', 'event_logs', 'event_organizer_roles'];
      for (const t of relTables) {
        try {
          const colCheck = await localClient.query(`
            SELECT column_name FROM information_schema.columns WHERE table_name = $1 AND column_name = 'user_id'
          `, [t]);
          if (colCheck.rows.length > 0) {
            const delRes = await localClient.query(`DELETE FROM "${t}" WHERE user_id = ANY($1)`, [testUserIds]);
            if (delRes.rowCount > 0) {
              console.log(`✓ Đã xóa ${delRes.rowCount} dòng trong '${t}' liên quan đến user kiểm tra`);
            }
          }
        } catch (e) {
          // ignore
        }
      }

      // Xóa users
      await localClient.query('DELETE FROM users WHERE id = ANY($1)', [testUserIds]);
      console.log(`✓ Đã xóa ${testUserIds.length} tài khoản khách hàng/thành viên trong 'users'`);
    }

    // Bật lại FK check
    await localClient.query("SET session_replication_role = 'origin'");

    console.log('\n================================================================');
    console.log('📊 BƯỚC 3: ĐỐI SOÁT VÀ BÁO CÁO KẾT QUẢ CUỐI CÙNG');
    console.log('================================================================\n');

    console.log('| # | Tên bảng | Neon (Gốc) | Local (Đã cập nhật & làm sạch) | Trạng thái |');
    console.log('|---|---|---|---|---|');

    let idx = 1;
    for (const tableName of neonTables) {
      const neonCntRes = await neonPool.query(`SELECT COUNT(*) as cnt FROM "${tableName}"`);
      const localCntRes = await localClient.query(`SELECT COUNT(*) as cnt FROM "${tableName}"`);
      const neonCnt = parseInt(neonCntRes.rows[0].cnt, 10);
      const localCnt = parseInt(localCntRes.rows[0].cnt, 10);

      let note = '✓ KHỚP 100%';
      if (tableName === 'users') {
        note = `✓ Đã làm sạch (-${testUserIds.length} user kiểm tra)`;
      } else if (neonCnt !== localCnt) {
        note = `Khác biệt: ${localCnt - neonCnt}`;
      }

      console.log(`| ${idx++} | ${tableName.padEnd(22)} | ${String(neonCnt).padStart(10)} | ${String(localCnt).padStart(30)} | ${note} |`);
    }

    // Kiểm tra lại toàn bộ DB xem còn sót từ "kiểm tra" nào không
    console.log('\n--- KIỂM TRA LẠI TỪ KHÓA "KIỂM TRA" TRÊN TOÀN BỘ DATABASE ---');
    let remainingFound = 0;
    for (const t of ['users', 'invitations', 'event_registrations', 'contracts']) {
      const checkRes = await localClient.query(`
        SELECT * FROM "${t}" 
        WHERE cast(row_to_json("${t}") as text) ILIKE '%kiểm tra%'
           OR cast(row_to_json("${t}") as text) ILIKE '%kiem tra%'
      `);
      if (checkRes.rows.length > 0) {
        remainingFound += checkRes.rows.length;
        console.log(`⚠️ Bảng ${t} còn ${checkRes.rows.length} dòng:`, checkRes.rows);
      }
    }

    if (remainingFound === 0) {
      console.log('✓ HOÀN TOÀN SẠCH SẼ! Không còn bất kỳ khách hàng hay bản ghi nào chứa "kiểm tra".');
    }

    console.log('\n🎉 TẤT CẢ CÔNG VIỆC ĐÃ HOÀN TẤT THÀNH CÔNG RỰC RỠ!');

  } catch (err) {
    console.error('\n❌ Lỗi:', err);
  } finally {
    localClient.release();
    await neonPool.end();
    await localPool.end();
    console.log('\nĐã đóng các kết nối cơ sở dữ liệu.');
  }
}

main();
