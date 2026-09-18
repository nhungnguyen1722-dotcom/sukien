const { Pool } = require('pg');
const pool = new Pool({
  user: 'postgres',
  password: '1111222267',
  host: 'localhost',
  port: 5433,
  database: 'postgismap',
});

async function verify() {
  console.log('--- 1. Kiá»ƒm tra danh sÃ¡ch thÃ nh viÃªn ---');
  const res = await pool.query(`
    SELECT u.id, u.full_name, u.phone, u.role, u.classification, u.title, u.guest_count, u.referral_group, u.status
    FROM users u
    ORDER BY u.id ASC
  `);
  console.log(`TÃ¬m tháº¥y ${res.rows.length} thÃ nh viÃªn:`);
  console.table(res.rows);

  console.log('\n--- 2. Kiá»ƒm tra thá»‘ng kÃª 4 cards ---');
  const statsRes = await pool.query(`
    SELECT 
      COUNT(*)::int AS total_members,
      COUNT(CASE WHEN status IN ('Äang hoáº¡t Ä‘á»™ng', 'Hoáº¡t Ä‘á»™ng') THEN 1 END)::int AS active_members,
      COUNT(CASE WHEN created_at >= date_trunc('month', CURRENT_DATE) OR join_date >= date_trunc('month', CURRENT_DATE) THEN 1 END)::int AS new_members,
      COUNT(CASE WHEN status NOT IN ('Äang hoáº¡t Ä‘á»™ng', 'Hoáº¡t Ä‘á»™ng') OR status = 'KhÃ´ng hoáº¡t Ä‘á»™ng' OR status = 'Táº¡m khÃ³a' THEN 1 END)::int AS inactive_members
    FROM users
  `);
  console.log(statsRes.rows[0]);

  console.log('\n--- 3. Thá»­ nghiá»‡m INSERT thÃ nh viÃªn má»›i ---');
  const testPhone = '0999888777';
  await pool.query('DELETE FROM users WHERE phone = $1', [testPhone]);
  const insertRes = await pool.query(`
    INSERT INTO users (full_name, phone, role, classification, title, referral_group, status, guest_count)
    VALUES ('ThÃ nh ViÃªn Test', $1, 'Kinh doanh', 'Sale', 'ThÃ nh viÃªn', 'KhÃ¡ch vÃ£ng lai', 'Hoáº¡t Ä‘á»™ng', 2)
    RETURNING *
  `, [testPhone]);
  console.log('ÄÃ£ táº¡o user test:', insertRes.rows[0].id, insertRes.rows[0].full_name);

  console.log('\n--- 4. Thá»­ nghiá»‡m UPDATE thÃ nh viÃªn test ---');
  const updateRes = await pool.query(`
    UPDATE users SET full_name = 'ThÃ nh ViÃªn Test (ÄÃ£ cáº­p nháº­t)', email = 'test@nghiengcomplex.vn', identity_card = '001200001234'
    WHERE id = $1 RETURNING *
  `, [insertRes.rows[0].id]);
  console.log('ÄÃ£ cáº­p nháº­t:', updateRes.rows[0].full_name, updateRes.rows[0].email, updateRes.rows[0].identity_card);

  console.log('\n--- 5. Thá»­ nghiá»‡m DELETE thÃ nh viÃªn test ---');
  const deleteRes = await pool.query('DELETE FROM users WHERE id = $1 RETURNING id', [insertRes.rows[0].id]);
  console.log('ÄÃ£ xÃ³a thÃ nh cÃ´ng user ID:', deleteRes.rows[0].id);

  console.log('\nâœ… Táº¤T Cáº¢ CÃC BÆ¯á»šC KIá»‚M TRA Äá»€U THÃ€NH CÃ”NG!');
  await pool.end();
}

verify().catch((err) => {
  console.error('Lá»—i kiá»ƒm tra:', err);
  process.exit(1);
});

