const { Pool } = require('d:/ProjectNextJS/project1/node_modules/pg');

const LOCAL_CONFIG = {
  user: 'postgres',
  password: '1111222267',
  host: 'localhost',
  port: 5433,
  database: 'postgismap'
};

const NEON_CONN_STRING = 'postgresql://neondb_owner:npg_Gy2mBY4leKgb@ep-snowy-forest-ax0u3mls-pooler.c-4.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

async function ensureColumn(client, tableName, columnName, definition) {
  const existing = await client.query(
    `SELECT 1 FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = $1 AND column_name = $2 LIMIT 1`,
    [tableName, columnName]
  );
  if (!existing.rows.length) {
    await client.query(`ALTER TABLE "${tableName}" ADD COLUMN "${columnName}" ${definition}`);
  }
}

async function migratePool(pool, label) {
  console.log(`--- Migrating ${label} ---`);
  const client = await pool.connect();
  try {
    // 1. Ensure business_unit column on users
    await ensureColumn(client, 'users', 'business_unit', "VARCHAR(100) DEFAULT 'Khối kinh doanh'");
    console.log(`[${label}] Added/verified business_unit on users`);

    // 2. Ensure business_unit column on event_registrations
    await ensureColumn(client, 'event_registrations', 'business_unit', "VARCHAR(100) DEFAULT 'Khối kinh doanh'");
    console.log(`[${label}] Added/verified business_unit on event_registrations`);

    // 3. Set users whose past invited guests were mostly 'Ban nguồn vốn' to 'Ban nguồn vốn'
    const updateBnvUsers = await client.query(`
      WITH bnv_counts AS (
        SELECT 
          referrer_id,
          SUM(CASE WHEN business_unit ILIKE '%nguồn vốn%' THEN 1 ELSE 0 END) as bnv,
          SUM(CASE WHEN business_unit ILIKE '%kinh doanh%' THEN 1 ELSE 0 END) as kkd
        FROM event_registrations
        WHERE referrer_id IS NOT NULL
        GROUP BY referrer_id
      )
      UPDATE users u
      SET business_unit = 'Ban nguồn vốn'
      FROM bnv_counts c
      WHERE u.id = c.referrer_id AND c.bnv > c.kkd AND (u.business_unit IS NULL OR u.business_unit = 'Khối kinh doanh')
    `);
    console.log(`[${label}] Updated ${updateBnvUsers.rowCount} users to 'Ban nguồn vốn' based on registration history`);

    // 4. Default remaining null business_unit to 'Khối kinh doanh'
    await client.query(`
      UPDATE users
      SET business_unit = 'Khối kinh doanh'
      WHERE business_unit IS NULL OR BTRIM(business_unit) = ''
    `);

    console.log(`[${label}] Migration completed successfully!`);
  } finally {
    client.release();
  }
}

async function main() {
  const localPool = new Pool(LOCAL_CONFIG);
  try {
    await migratePool(localPool, 'Localhost');
  } catch (err) {
    console.error('Localhost migration error:', err);
  } finally {
    await localPool.end();
  }

  const neonPool = new Pool({
    connectionString: NEON_CONN_STRING,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 10000,
  });
  try {
    await migratePool(neonPool, 'Neon');
  } catch (err) {
    console.warn('Neon migration skipped or failed (offline / timeout):', err.message);
  } finally {
    await neonPool.end();
  }
}

main();
