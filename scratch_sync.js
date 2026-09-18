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
    { full_name: 'Nguyá»…n VÄƒn An', phone: '0901234567', email: 'an.nguyen@nghiengcomplex.vn', role: 'MC', status: 'Hoáº¡t Ä‘á»™ng' },
    { full_name: 'Tráº§n Thá»‹ BÃ¬nh', phone: '0902345678', email: 'binh.tran@nghiengcomplex.vn', role: 'Thuyáº¿t trÃ¬nh', status: 'Hoáº¡t Ä‘á»™ng' },
    { full_name: 'LÃª HoÃ ng CÆ°á»ng', phone: '0903456789', email: 'cuong.le@nghiengcomplex.vn', role: 'Chá»‘t sá»± kiá»‡n', status: 'Hoáº¡t Ä‘á»™ng' },
    { full_name: 'Pháº¡m Thá»‹ Dung', phone: '0904567890', email: 'dung.pham@nghiengcomplex.vn', role: 'Phá»¥ng sá»±', status: 'Hoáº¡t Ä‘á»™ng' },
    { full_name: 'HoÃ ng VÄƒn Em', phone: '0905678901', email: 'em.hoang@nghiengcomplex.vn', role: 'Kinh doanh', status: 'Hoáº¡t Ä‘á»™ng' },
    { full_name: 'Äá»— Thá»‹ PhÆ°Æ¡ng', phone: '0906789012', email: 'phuong.do@nghiengcomplex.vn', role: 'Team Leader', status: 'Hoáº¡t Ä‘á»™ng' },
    { full_name: 'VÅ© Káº¿ ToÃ¡n', phone: '0907890123', email: 'ketoan.vu@nghiengcomplex.vn', role: 'Káº¿ toÃ¡n', status: 'Hoáº¡t Ä‘á»™ng' },
    { full_name: 'BÃ¹i CÃ´ng Nghá»‡', phone: '0908901234', email: 'congnghe.bui@nghiengcomplex.vn', role: 'CÃ´ng nghá»‡', status: 'Hoáº¡t Ä‘á»™ng' },
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

