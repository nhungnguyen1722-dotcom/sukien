/* eslint-disable @typescript-eslint/no-require-imports */
const https = require('https');
const { Pool } = require('pg');

const agent = new https.Agent({ keepAlive: true, family: 4 });

const NEON_CONN_STRING =
  'postgresql://neondb_owner:npg_Gy2mBY4leKgb@ep-snowy-forest-ax0u3mls-pooler.c-4.us-east-2.aws.neon.tech/neondb?sslmode=require';

const LOCAL_CONFIG = {
  user: 'postgres',
  password: '1111222267',
  host: 'localhost',
  port: 5433,
  database: 'postgismap',
};

// Target tables for:
// - Sự kiện (/admin/su-kien): events, event_schedules, event_in_charge, event_organizer_roles, event_registrations, event_attachments, event_logs
// - Người mới (/admin/nguoi-moi): invitations
// - Thành viên (/admin/thanh-vien): teams, users
const TABLES_TO_SYNC = [
  'teams',
  'users',
  'events',
  'event_attachments',
  'event_in_charge',
  'event_logs',
  'event_organizer_roles',
  'event_registrations',
  'event_schedules',
  'invitations',
];

function neonQueryRaw(sql, params = []) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({ query: sql, params });
    const req = https.request(
      {
        hostname: 'ep-snowy-forest-ax0u3mls-pooler.c-4.us-east-2.aws.neon.tech',
        port: 443,
        path: '/sql',
        method: 'POST',
        agent,
        headers: {
          'Neon-Connection-String': NEON_CONN_STRING,
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData),
        },
        timeout: 30000,
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          try {
            const parsed = JSON.parse(data);
            if (parsed.message) reject(new Error(parsed.message));
            else resolve(parsed.rows);
          } catch (e) {
            reject(e);
          }
        });
      }
    );
    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy(new Error('Neon request timed out'));
    });
    req.write(postData);
    req.end();
  });
}

async function neonQuery(sql, params = []) {
  let lastErr;
  for (let attempt = 1; attempt <= 5; attempt++) {
    try {
      return await neonQueryRaw(sql, params);
    } catch (err) {
      lastErr = err;
      console.log(`Neon query attempt ${attempt} failed: ${err.message}. Retrying in 1.5s...`);
      await new Promise((r) => setTimeout(r, 1500));
    }
  }
  throw lastErr;
}

function quoteId(name) {
  return `"${name.replaceAll('"', '""')}"`;
}

function stableValue(val) {
  if (val === null || val === undefined) return val;
  if (val instanceof Date) return val.toISOString();
  if (Buffer.isBuffer(val)) return val.toString('hex');
  if (Array.isArray(val)) return val.map(stableValue);
  if (typeof val === 'object') {
    return Object.fromEntries(
      Object.keys(val)
        .sort()
        .map((k) => [k, stableValue(val[k])])
    );
  }
  if (typeof val === 'string' && /^\d{4}-\d{2}-\d{2}/.test(val)) {
    const d = new Date(val);
    if (!isNaN(d.getTime())) return d.toISOString();
  }
  return String(val);
}

function rowsDiffer(r1, r2, columns) {
  return columns.some((col) => {
    return JSON.stringify(stableValue(r1[col])) !== JSON.stringify(stableValue(r2[col]));
  });
}

async function syncTable(tableName, localClient) {
  console.log(`\n--- Đồng bộ bảng [${tableName}] ---`);

  // Lấy danh sách cột
  const neonCols = await neonQuery(
    `SELECT column_name, data_type FROM information_schema.columns WHERE table_name = '${tableName}' ORDER BY ordinal_position`
  );
  const localColsRes = await localClient.query(
    `SELECT column_name, data_type FROM information_schema.columns WHERE table_name = $1 ORDER BY ordinal_position`,
    [tableName]
  );

  const localColSet = new Set(localColsRes.rows.map((c) => c.column_name));
  const sharedCols = neonCols.map((c) => c.column_name).filter((name) => localColSet.has(name));

  if (!sharedCols.includes('id')) {
    console.log(`Bỏ qua ${tableName}: không có cột khóa chính 'id'.`);
    return { inserted: 0, updated: 0, unchanged: 0, total: 0 };
  }

  // Tải dữ liệu từ Neon và Local
  const neonRows = await neonQuery(`SELECT * FROM ${quoteId(tableName)} ORDER BY id`);
  const localRowsRes = await localClient.query(
    `SELECT ${sharedCols.map(quoteId).join(', ')} FROM ${quoteId(tableName)} ORDER BY id`
  );

  const localById = new Map(localRowsRes.rows.map((r) => [Number(r.id), r]));

  let inserted = 0;
  let updated = 0;
  let unchanged = 0;

  const updateCols = sharedCols.filter((c) => c !== 'id');
  const updateSql = updateCols.length
    ? `UPDATE ${quoteId(tableName)} SET ${updateCols.map((col, idx) => `${quoteId(col)} = $${idx + 1}`).join(', ')} WHERE id = $${updateCols.length + 1}`
    : null;

  const insertCols = sharedCols;
  const insertSql = `INSERT INTO ${quoteId(tableName)} (${insertCols.map(quoteId).join(', ')}) VALUES (${insertCols.map((_, idx) => `$${idx + 1}`).join(', ')})`;

  for (const nRow of neonRows) {
    const lRow = localById.get(Number(nRow.id));
    if (!lRow) {
      // Thêm bản ghi mới
      await localClient.query(
        insertSql,
        insertCols.map((col) => nRow[col])
      );
      inserted++;
    } else if (rowsDiffer(nRow, lRow, sharedCols)) {
      // Cập nhật bản ghi có thay đổi
      if (updateSql) {
        await localClient.query(updateSql, [
          ...updateCols.map((col) => nRow[col]),
          nRow.id,
        ]);
      }
      updated++;
    } else {
      unchanged++;
    }
  }

  // Reset sequence về MAX(id)
  try {
    const seqRes = await localClient.query(
      `SELECT pg_get_serial_sequence($1, 'id') AS seq_name`,
      [`public.${tableName}`]
    );
    const seqName = seqRes.rows[0]?.seq_name;
    if (seqName) {
      await localClient.query(
        `SELECT setval($1::regclass, GREATEST(COALESCE((SELECT MAX(id) FROM ${quoteId(tableName)}), 1), 1), true)`,
        [seqName]
      );
    }
  } catch (seqErr) {
    console.warn(`Không thể reset sequence cho ${tableName}:`, seqErr.message);
  }

  const finalCountRes = await localClient.query(`SELECT COUNT(*)::int AS count FROM ${quoteId(tableName)}`);
  const finalCount = finalCountRes.rows[0].count;

  console.log(
    `Bảng [${tableName}] hoàn tất: Thêm mới = ${inserted}, Cập nhật = ${updated}, Giữ nguyên = ${unchanged}. Tổng local hiện tại = ${finalCount} (Neon = ${neonRows.length})`
  );

  return {
    inserted,
    updated,
    unchanged,
    totalLocal: finalCount,
    totalNeon: neonRows.length,
  };
}

async function run() {
  console.log('====================================================');
  console.log('BẮT ĐẦU ĐỒNG BỘ DỮ LIỆU TỪ NEON VỀ LOCAL DATABASE');
  console.log('Nguồn: Neon PostgreSQL (neondb)');
  console.log('Đích: Local PostgreSQL (postgismap:5433)');
  console.log('Các bảng:', TABLES_TO_SYNC.join(', '));
  console.log('====================================================');

  const localPool = new Pool(LOCAL_CONFIG);
  const localClient = await localPool.connect();

  try {
    await localClient.query('BEGIN');
    await localClient.query("SET session_replication_role = 'replica'");

    const summary = {};
    for (const table of TABLES_TO_SYNC) {
      summary[table] = await syncTable(table, localClient);
    }

    await localClient.query("SET session_replication_role = 'origin'");
    await localClient.query('COMMIT');

    console.log('\n====================================================');
    console.log('ĐỒNG BỘ HOÀN TẤT THÀNH CÔNG VÀ ĐÃ COMMIT TRANSACTION!');
    console.log('====================================================');
    console.table(summary);
  } catch (error) {
    console.error('\nLỖI XẢY RA, ĐANG ROLLBACK TRANSACTION...', error);
    await localClient.query('ROLLBACK').catch(() => {});
    throw error;
  } finally {
    localClient.release();
    await localPool.end();
  }
}

run().catch((err) => {
  console.error('Lỗi thực thi:', err);
  process.exit(1);
});
