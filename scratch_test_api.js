const { Pool } = require('pg');
const pool = new Pool({
  user: 'postgres',
  password: '1111222267',
  host: 'localhost',
  port: 5433,
  database: 'postgismap',
});

async function verify() {
  console.log('--- 1. Kiểm tra danh sách thành viên ---');
  const res = await pool.query(`
    SELECT u.id, u.full_name, u.phone, u.role, u.classification, u.title, u.guest_count, u.referral_group, u.status
    FROM users u
    ORDER BY u.id ASC
  `);
  console.log(`Tìm thấy ${res.rows.length} thành viên:`);
  console.table(res.rows);

  console.log('\n--- 2. Kiểm tra thống kê 4 cards ---');
  const statsRes = await pool.query(`
    SELECT 
      COUNT(*)::int AS total_members,
      COUNT(CASE WHEN status IN ('Đang hoạt động', 'Hoạt động') THEN 1 END)::int AS active_members,
      COUNT(CASE WHEN created_at >= date_trunc('month', CURRENT_DATE) OR join_date >= date_trunc('month', CURRENT_DATE) THEN 1 END)::int AS new_members,
      COUNT(CASE WHEN status NOT IN ('Đang hoạt động', 'Hoạt động') OR status = 'Không hoạt động' OR status = 'Tạm khóa' THEN 1 END)::int AS inactive_members
    FROM users
  `);
  console.log(statsRes.rows[0]);

  console.log('\n--- 3. Thử nghiệm INSERT thành viên mới ---');
  const testPhone = '0999888777';
  await pool.query('DELETE FROM users WHERE phone = $1', [testPhone]);
  const insertRes = await pool.query(`
    INSERT INTO users (full_name, phone, role, classification, title, referral_group, status, guest_count)
    VALUES ('Thành Viên Test', $1, 'Kinh doanh', 'Sale', 'Thành viên', 'Khách vãng lai', 'Hoạt động', 2)
    RETURNING *
  `, [testPhone]);
  console.log('Đã tạo user test:', insertRes.rows[0].id, insertRes.rows[0].full_name);

  console.log('\n--- 4. Thử nghiệm UPDATE thành viên test ---');
  const updateRes = await pool.query(`
    UPDATE users SET full_name = 'Thành Viên Test (Đã cập nhật)', email = 'test@welink.vn', identity_card = '001200001234'
    WHERE id = $1 RETURNING *
  `, [insertRes.rows[0].id]);
  console.log('Đã cập nhật:', updateRes.rows[0].full_name, updateRes.rows[0].email, updateRes.rows[0].identity_card);

  console.log('\n--- 5. Thử nghiệm DELETE thành viên test ---');
  const deleteRes = await pool.query('DELETE FROM users WHERE id = $1 RETURNING id', [insertRes.rows[0].id]);
  console.log('Đã xóa thành công user ID:', deleteRes.rows[0].id);

  console.log('\n✅ TẤT CẢ CÁC BƯỚC KIỂM TRA ĐỀU THÀNH CÔNG!');
  await pool.end();
}

verify().catch((err) => {
  console.error('Lỗi kiểm tra:', err);
  process.exit(1);
});
