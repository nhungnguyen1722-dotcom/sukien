const { Pool } = require('pg');
const { loadEnvConfig } = require('@next/env');
loadEnvConfig(process.cwd());

const NEON_CONN_STRING = process.env.NEON_CONN_STRING;
if (!NEON_CONN_STRING) {
  throw new Error('NEON_CONN_STRING is required in the environment.');
}

async function inspectNeon() {
  const pool = new Pool({
    connectionString: NEON_CONN_STRING,
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
