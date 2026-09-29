const { Pool } = require('pg');

const NEON_CONN_STRING = 'postgresql://neondb_owner:npg_Gy2mBY4leKgb@ep-snowy-forest-ax0u3mls-pooler.c-4.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

async function inspectNeon() {
  const pool = new Pool({
    connectionString: NEON_CONN_STRING,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 10000,
  });

  try {
    const tablesRes = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `);
    
    console.log('Tables on Neon:');
    for (const row of tablesRes.rows) {
      const cntRes = await pool.query(`SELECT COUNT(*) as cnt FROM "${row.table_name}"`);
      console.log(`- ${row.table_name}: ${cntRes.rows[0].cnt} rows`);
    }
  } catch (err) {
    console.error('Error inspecting Neon:', err);
  } finally {
    await pool.end();
  }
}

inspectNeon();
