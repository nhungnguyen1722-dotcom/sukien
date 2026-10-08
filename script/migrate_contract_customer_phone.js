const { Pool } = require('pg');
const { getDatabaseConfig } = require('./db-config');

const pool = new Pool(getDatabaseConfig());

async function migrate() {
  try {
    await pool.query('ALTER TABLE contracts ADD COLUMN IF NOT EXISTS customer_phone VARCHAR(50)');
    console.log('Added contracts.customer_phone (if it was missing).');
  } catch (error) {
    console.error('Failed to add contracts.customer_phone:', error);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

migrate();
