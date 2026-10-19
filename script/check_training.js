const { Pool } = require('pg');
const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_Gy2mBY4leKgb@ep-snowy-forest-ax0u3mls-pooler.c-4.us-east-2.aws.neon.tech/neondb?sslmode=require',
  ssl: { rejectUnauthorized: false }
});

async function main() {
  const { rows } = await pool.query(
    `SELECT id, session_code, course_code, training_date, member_name, member_phone, token_count, total_tokens, reward_amount, session_budget, status
     FROM training_logs ORDER BY training_date DESC, id DESC`
  );
  console.log(JSON.stringify(rows, null, 2));
  await pool.end();
}
main().catch(e => { console.error(e); process.exit(1); });
