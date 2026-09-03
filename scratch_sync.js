const { Pool } = require('pg');
const pool = new Pool({
  user: 'postgres',
  password: '1111222267',
  host: 'localhost',
  port: 5433,
  database: 'postgismap',
});

async function main() {
  const sampleUsers = [
    { full_name: 'Nguyễn Văn An', phone: '0901234567', email: 'an.nguyen@welink.vn', role: 'MC', status: 'Hoạt động' },
    { full_name: 'Trần Thị Bình', phone: '0902345678', email: 'binh.tran@welink.vn', role: 'Thuyết trình', status: 'Hoạt động' },
    { full_name: 'Lê Hoàng Cường', phone: '0903456789', email: 'cuong.le@welink.vn', role: 'Chốt sự kiện', status: 'Hoạt động' },
    { full_name: 'Phạm Thị Dung', phone: '0904567890', email: 'dung.pham@welink.vn', role: 'Phụng sự', status: 'Hoạt động' },
    { full_name: 'Hoàng Văn Em', phone: '0905678901', email: 'em.hoang@welink.vn', role: 'Kinh doanh', status: 'Hoạt động' },
    { full_name: 'Đỗ Thị Phương', phone: '0906789012', email: 'phuong.do@welink.vn', role: 'Team Leader', status: 'Hoạt động' },
    { full_name: 'Vũ Kế Toán', phone: '0907890123', email: 'ketoan.vu@welink.vn', role: 'Kế toán', status: 'Hoạt động' },
    { full_name: 'Bùi Công Nghệ', phone: '0908901234', email: 'congnghe.bui@welink.vn', role: 'Công nghệ', status: 'Hoạt động' },
  ];

  for (const u of sampleUsers) {
    const existing = await pool.query('SELECT id FROM users WHERE phone = $1', [u.phone]);
    if (existing.rows.length === 0) {
      await pool.query(
        'INSERT INTO users (full_name, phone, email, role, status) VALUES ($1, $2, $3, $4, $5)',
        [u.full_name, u.phone, u.email, u.role, u.status]
      );
      console.log(`Inserted user: ${u.full_name}`);
    } else {
      console.log(`User exists: ${u.full_name}`);
    }
  }

  const all = await pool.query('SELECT id, full_name, phone, role, status FROM users ORDER BY id ASC');
  console.log('Total users in DB:', all.rows.length);
  console.table(all.rows);

  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
