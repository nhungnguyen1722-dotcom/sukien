const { Pool } = require('pg');
const { loadEnvConfig } = require('@next/env');
loadEnvConfig(process.cwd());

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '1111222267',
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 5433),
  database: process.env.DB_NAME || 'postgismap',
  connectionTimeoutMillis: 10000,
});

async function inspectLocal() {
  try {
    const tablesRes = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `);
    
    console.log('Tables on Local postgismap:');
    for (const row of tablesRes.rows) {
      const cntRes = await pool.query(`SELECT COUNT(*) as cnt FROM "${row.table_name}"`);
      console.log(`- ${row.table_name}: ${cntRes.rows[0].cnt} rows`);
    }

    const viewsRes = await pool.query(`
      SELECT table_name 
      FROM information_schema.views 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);
    console.log('\nViews on Local postgismap:');
    for (const row of viewsRes.rows) {
      console.log(`- ${row.table_name}`);
    }
  } catch (err) {
    console.error('Error inspecting Local:', err);
  } finally {
    await pool.end();
  }
}

inspectLocal();
