const { Pool } = require('pg');
const { getDatabaseConfig } = require('./db-config');
const { loadEnvConfig } = require('@next/env');
loadEnvConfig(process.cwd());

async function runFixesOnPool(pool, dbLabel) {
  console.log(`\n=== Running fixes on ${dbLabel} ===`);
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Update contracts 34 and 35
    const updateContract34 = await client.query(`
      UPDATE contracts
      SET 
        closer_name = 'Nguyễn Hùng Vĩ',
        closer_id = COALESCE(closer_id, 41),
        referrer_name = 'Chu Thị Lương',
        referrer_id = 45,
        supporter_name = 'Vũ Thị Cúc',
        supporter_id = COALESCE(supporter_id, 15),
        status = CASE WHEN status = 'Ch? duy?t' THEN 'Chờ duyệt' ELSE status END
      WHERE id = 34
      RETURNING id, closer_name, referrer_name, supporter_name, status
    `);
    console.log(`[${dbLabel}] Updated contract 34:`, updateContract34.rows[0]);

    const updateContract35 = await client.query(`
      UPDATE contracts
      SET 
        closer_name = 'Nguyễn Hùng Vĩ',
        closer_id = COALESCE(closer_id, 41),
        referrer_name = 'Chu Thị Lương',
        referrer_id = 45,
        supporter_name = 'Nguyễn Hùng Vĩ',
        supporter_id = COALESCE(supporter_id, 41),
        status = CASE WHEN status = 'Ch? duy?t' THEN 'Chờ duyệt' ELSE status END
      WHERE id = 35
      RETURNING id, closer_name, referrer_name, supporter_name, status
    `);
    console.log(`[${dbLabel}] Updated contract 35:`, updateContract35.rows[0]);

    // 2. Also fix any other contracts that might have these corrupted strings
    const updateOtherContracts = await client.query(`
      UPDATE contracts
      SET 
        closer_name = CASE WHEN closer_name = 'Nguy?n H?ng V?' THEN 'Nguyễn Hùng Vĩ' ELSE closer_name END,
        referrer_name = CASE WHEN referrer_name = 'Chu Th? L??ng' THEN 'Chu Thị Lương' ELSE referrer_name END,
        supporter_name = CASE 
          WHEN supporter_name = 'V? Th? C?c' THEN 'Vũ Thị Cúc'
          WHEN supporter_name = 'Nguy?n H?ng V?' THEN 'Nguyễn Hùng Vĩ'
          ELSE supporter_name 
        END,
        status = CASE WHEN status = 'Ch? duy?t' THEN 'Chờ duyệt' ELSE status END
      WHERE closer_name = 'Nguy?n H?ng V?' 
         OR referrer_name = 'Chu Th? L??ng' 
         OR supporter_name IN ('V? Th? C?c', 'Nguy?n H?ng V?')
         OR status = 'Ch? duy?t'
      RETURNING id, closer_name, referrer_name, supporter_name, status
    `);
    console.log(`[${dbLabel}] Any remaining contracts fixed count:`, updateOtherContracts.rowCount);

    // 3. Fix system_settings description if present
    try {
      const updateSettings = await client.query(`
        UPDATE system_settings
        SET description = 'Đường dẫn logo chính thức của hệ thống'
        WHERE id = 1 AND description LIKE '%?%'
        RETURNING id, description
      `);
      if (updateSettings.rowCount > 0) {
        console.log(`[${dbLabel}] Updated system_settings:`, updateSettings.rows[0]);
      }
    } catch (e) {
      console.log(`[${dbLabel}] system_settings update skipped:`, e.message);
    }

    // 4. Delete corrupted duplicate in teamlead_teams if present
    try {
      const deleteTeam = await client.query(`
        DELETE FROM teamlead_teams
        WHERE id = 6 AND name = 'Th?nh C?ng'
        RETURNING id, name
      `);
      if (deleteTeam.rowCount > 0) {
        console.log(`[${dbLabel}] Deleted duplicate teamlead_teams row:`, deleteTeam.rows[0]);
      }
    } catch (e) {
      console.log(`[${dbLabel}] teamlead_teams check skipped:`, e.message);
    }

    await client.query('COMMIT');
    console.log(`[${dbLabel}] All fixes committed successfully.`);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error(`[${dbLabel}] Error executing fixes:`, error);
    throw error;
  } finally {
    client.release();
  }
}

async function main() {
  const localPool = new Pool(getDatabaseConfig());
  try {
    await runFixesOnPool(localPool, 'LOCAL DATABASE');
  } finally {
    await localPool.end();
  }

  if (process.env.NEON_CONN_STRING) {
    const neonPool = new Pool({
      connectionString: process.env.NEON_CONN_STRING,
      ssl: { rejectUnauthorized: false },
    });
    try {
      await runFixesOnPool(neonPool, 'NEON DATABASE');
    } catch (err) {
      console.warn('Neon update encountered error (non-fatal for local):', err.message);
    } finally {
      await neonPool.end();
    }
  }
}

main().catch((err) => {
  console.error('Fatal error in main:', err);
  process.exit(1);
});
