const { Pool } = require('pg');
const { getDatabaseConfig } = require('./db-config');
const pool = new Pool(getDatabaseConfig());

async function check() {
  try {
    const res = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `);
    console.log('Tables:', res.rows.map(r => r.table_name));
  } catch (err) {
    console.error('Error:', err);
  } finally {
    pool.end();
  }
}
check();
