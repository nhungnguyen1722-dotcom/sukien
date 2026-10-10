const { Pool } = require('pg');
const { getDatabaseConfig } = require('./db-config');

async function main() {
  const pool = new Pool(getDatabaseConfig());
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    const updated = await client.query(`
      UPDATE contracts
      SET status = 'Chờ duyệt'
      WHERE status = 'Ch? duy?t'
      RETURNING id
    `);
    const remaining = await client.query(`
      SELECT count(*)::int AS count
      FROM contracts
      WHERE status = 'Ch? duy?t'
    `);

    if (remaining.rows[0].count !== 0) {
      throw new Error(`Status cleanup incomplete: ${remaining.rows[0].count} contract rows remain.`);
    }

    await client.query('COMMIT');
    console.log(`Updated ${updated.rowCount} contract statuses; no listed misspellings remain.`);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((error) => {
  console.error('Failed to fix corrupted contract statuses:', error.message);
  process.exitCode = 1;
});
