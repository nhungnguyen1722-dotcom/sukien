const { Pool } = require('pg');
const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_Gy2mBY4leKgb@ep-snowy-forest-ax0u3mls-pooler.c-4.us-east-2.aws.neon.tech/neondb?sslmode=require',
  ssl: { rejectUnauthorized: false }
});

async function main() {
  // Update Phạm Thị Hương (id=26): token 50->60, reward 250000->300000
  const res1 = await pool.query(
    `UPDATE training_logs SET token_count = 60, reward_amount = 300000 WHERE id = 26 RETURNING *`
  );
  console.log('Updated id=26 (Phạm Thị Hương):', JSON.stringify(res1.rows[0], null, 2));

  // Update total_tokens for both records (id 25 & 26) to 120
  const res2 = await pool.query(
    `UPDATE training_logs SET total_tokens = 120 WHERE id IN (25, 26) RETURNING id, member_name, token_count, total_tokens, reward_amount`
  );
  console.log('Updated total_tokens:', JSON.stringify(res2.rows, null, 2));

  // Verify final state
  const verify = await pool.query(
    `SELECT id, session_code, course_code, training_date, member_name, member_phone, token_count, total_tokens, reward_amount, session_budget, status
     FROM training_logs WHERE id IN (25, 26) ORDER BY id`
  );
  console.log('\nFinal state:');
  console.log(JSON.stringify(verify.rows, null, 2));

  await pool.end();
}
main().catch(e => { console.error(e); process.exit(1); });
