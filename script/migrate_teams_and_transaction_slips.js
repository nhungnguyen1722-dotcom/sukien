const { Client } = require('pg');
const { getDatabaseConfig } = require('./db-config');

const client = new Client(getDatabaseConfig());

const teamNames = [
  'Kiến Vàng',
  'Ong Vàng',
  'Lộc Phát',
  'Thành Công',
  'Biệt đội Kim Cương',
  'Happy',
];

const memberTeams = [
  ['TRẦN THỊ THANH HƯƠNG', 'Kiến Vàng'],
  ['NGUYỄN THỊ NGA', 'Ong Vàng'],
  ['PHẠM THÙY LAN', 'Ong Vàng'],
  ['NGUYỄN TẤT THẮNG', 'Lộc Phát'],
  ['GIANG THANH NGỌC', 'Thành Công'],
  ['LÊ VĂN TIẾN', 'Ong Vàng'],
  ['HOÀNG VĂN NHẬT', 'Ong Vàng'],
  ['TRƯƠNG THỊ THỦY TRANG', 'Ong Vàng'],
  ['NGUYỄN THỊ HƯƠNG', 'Ong Vàng'],
  ['PHẠM THỊ KIM DUNG', 'Ong Vàng'],
  ['DƯƠNG HỒNG PHƯƠNG', 'Biệt đội Kim Cương'],
  ['NGUYỄN THỊ CÚC', 'Happy'],
  ['HOÀNG TRẦN NGỌC DIỆU', 'Kiến Vàng'],
  ['ĐỖ MỘNG LONG', 'Happy'],
  ['NGUYỄN THỊ THOA', 'Thành Công'],
  ['NGUYỄN THỊ KIM THOA', 'Thành Công'],
  ['NGUYỄN THỊ MỸ', 'Ong Vàng'],
  ['TRẦN THỊ LAN HƯƠNG', 'Happy'],
  ['PHẠM THỊ THANH PHƯƠNG', 'Happy'],
  ['QUẢNG THỊ ĐOÀN', 'Happy'],
  ['NGUYỄN THỊ MINH', 'Happy'],
  ['NGUYỄN VĂN DẬU', 'Ong Vàng'],
  ['VŨ HÙNG VỸ', 'Ong Vàng'],
];

async function ensureTeam(tableName, name) {
  const existing = await client.query(
    `SELECT id FROM ${tableName} WHERE LOWER(BTRIM(name)) = LOWER(BTRIM($1)) ORDER BY id LIMIT 1`,
    [name]
  );
  if (existing.rows.length) return existing.rows[0].id;
  const inserted = await client.query(`INSERT INTO ${tableName} (name) VALUES ($1) RETURNING id`, [name]);
  return inserted.rows[0].id;
}

async function ensureColumn(tableName, columnName, definition) {
  const existing = await client.query(
    `SELECT 1 FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = $1 AND column_name = $2 LIMIT 1`,
    [tableName, columnName]
  );
  if (!existing.rows.length) {
    await client.query(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${definition}`);
  }
}

async function ensureIndex(indexName, createSql) {
  const existing = await client.query(
    `SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = $1 LIMIT 1`,
    [indexName]
  );
  if (!existing.rows.length) await client.query(createSql);
}

async function run() {
  await client.connect();
  await client.query('BEGIN');
  try {
    await ensureColumn('event_registrations', 'business_unit', "VARCHAR(100) NOT NULL DEFAULT 'Khối kinh doanh'");
    await client.query(`
      UPDATE event_registrations
      SET business_unit = 'Khối kinh doanh'
      WHERE business_unit IS NULL OR BTRIM(business_unit) = ''
    `);

    await ensureColumn('transaction_logs', 'expense_type', "VARCHAR(20) NOT NULL DEFAULT 'Thủ công'");
    await ensureColumn('transaction_logs', 'beneficiary_user_id', 'INTEGER REFERENCES users(id) ON DELETE SET NULL');
    await ensureColumn('transaction_logs', 'beneficiary_bank_account', 'VARCHAR(255)');
    await ensureColumn('transaction_logs', 'source_contract_id', 'INTEGER REFERENCES contracts(id) ON DELETE CASCADE');
    await ensureColumn('transaction_logs', 'beneficiary_role', 'VARCHAR(40)');
    await ensureIndex(
      'transaction_logs_contract_role_unique_idx',
      `CREATE UNIQUE INDEX transaction_logs_contract_role_unique_idx
       ON transaction_logs (source_contract_id, beneficiary_role)
       WHERE source_contract_id IS NOT NULL`
    );

    await client.query(`
      CREATE TABLE IF NOT EXISTS teamlead_teams (
        id SERIAL PRIMARY KEY,
        name VARCHAR(160) NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await ensureIndex(
      'teamlead_teams_name_ci_idx',
      'CREATE UNIQUE INDEX teamlead_teams_name_ci_idx ON teamlead_teams (LOWER(BTRIM(name)))'
    );

    for (const name of teamNames) {
      await ensureTeam('teams', name);
      await ensureTeam('teamlead_teams', name);
    }

    const updated = [];
    for (const [fullName, teamName] of memberTeams) {
      const team = await client.query(
        'SELECT id FROM teams WHERE LOWER(BTRIM(name)) = LOWER(BTRIM($1)) ORDER BY id LIMIT 1',
        [teamName]
      );
      const result = await client.query(
        `UPDATE users
         SET team_id = $1, updated_at = CURRENT_TIMESTAMP
         WHERE LOWER(REGEXP_REPLACE(BTRIM(full_name), '\\s+', ' ', 'g')) =
               LOWER(REGEXP_REPLACE(BTRIM($2), '\\s+', ' ', 'g'))`,
        [team.rows[0].id, fullName]
      );
      updated.push({ fullName, teamName, matched: result.rowCount || 0 });
    }

    await client.query('COMMIT');
    console.log(`Prepared ${teamNames.length} team options; checked ${memberTeams.length} member names.`);
    for (const row of updated) {
      if (!row.matched) console.log(`No matching member: ${row.fullName}`);
    }
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    await client.end();
  }
}

run().catch((error) => {
  console.error('Team and transaction slip migration failed:', error.message);
  process.exitCode = 1;
});
