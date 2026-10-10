const { Pool } = require('pg');
const { getDatabaseConfig } = require('./db-config');

const corruptedNames = ['Nguy?n H?ng V?', 'Chu Th? L??ng', 'V? Th? C?c'];

async function main() {
  const pool = new Pool(getDatabaseConfig());
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    const updated = await client.query(`
      UPDATE contracts
      SET closer_name = CASE closer_name
            WHEN 'Nguy?n H?ng V?' THEN 'Nguyễn Hùng Vĩ'
            WHEN 'Chu Th? L??ng' THEN 'Chu Thị Lương'
            WHEN 'V? Th? C?c' THEN 'Vũ Thị Cúc'
            ELSE closer_name
          END,
          referrer_name = CASE referrer_name
            WHEN 'Nguy?n H?ng V?' THEN 'Nguyễn Hùng Vĩ'
            WHEN 'Chu Th? L??ng' THEN 'Chu Thị Lương'
            WHEN 'V? Th? C?c' THEN 'Vũ Thị Cúc'
            ELSE referrer_name
          END,
          supporter_name = CASE supporter_name
            WHEN 'Nguy?n H?ng V?' THEN 'Nguyễn Hùng Vĩ'
            WHEN 'Chu Th? L??ng' THEN 'Chu Thị Lương'
            WHEN 'V? Th? C?c' THEN 'Vũ Thị Cúc'
            ELSE supporter_name
          END
      WHERE closer_name = ANY($1)
         OR referrer_name = ANY($1)
         OR supporter_name = ANY($1)
      RETURNING id
    `, [corruptedNames]);

    const remaining = await client.query(`
      SELECT count(*)::int AS count
      FROM contracts
      WHERE closer_name = ANY($1)
         OR referrer_name = ANY($1)
         OR supporter_name = ANY($1)
    `, [corruptedNames]);

    if (remaining.rows[0].count !== 0) {
      throw new Error(`Name cleanup incomplete: ${remaining.rows[0].count} contract rows remain.`);
    }

    await client.query('COMMIT');
    console.log(`Updated ${updated.rowCount} contract rows; no listed misspellings remain.`);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((error) => {
  console.error('Failed to fix contract person names:', error.message);
  process.exitCode = 1;
});
