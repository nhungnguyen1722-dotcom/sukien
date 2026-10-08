const { Pool } = require('pg');
const { getDatabaseConfig } = require('./db-config');

const pool = new Pool(getDatabaseConfig());

async function migrate() {
  try {
    const column = await pool.query(`
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'contracts'
        AND column_name = 'customer_address'
      LIMIT 1
    `);
    if (!column.rows.length) {
      await pool.query('ALTER TABLE contracts ADD COLUMN customer_address VARCHAR(500)');
      console.log('Added contracts.customer_address.');
    } else {
      console.log('contracts.customer_address already exists.');
    }
  } catch (error) {
    console.error('Failed to add contracts.customer_address:', error);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

migrate();
