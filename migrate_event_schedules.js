const { getDatabaseConfig } = require('./db-config');
const { Pool } = require('pg');

async function migrate() {
  const pool = new Pool(getDatabaseConfig());
  try {
    console.log('Creating event_schedules table...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS event_schedules (
        id SERIAL PRIMARY KEY,
        event_id INT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
        time VARCHAR(100) NOT NULL,
        title VARCHAR(255) NOT NULL,
        speaker VARCHAR(255),
        description TEXT,
        order_num INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('Table event_schedules created successfully.');

    // Seed default schedules for event 1 if empty
    const check = await pool.query('SELECT COUNT(*) FROM event_schedules WHERE event_id = 1');
    if (parseInt(check.rows[0].count, 10) === 0) {
      console.log('Seeding initial schedules for event 1...');
      const defaultSchedules = [
        { time: '08:00 - 08:30', title: 'Đón tiếp đại biểu & Check-in', speaker: 'Ban Lễ tân', description: 'Đón khách tại sảnh, cấp phát tài liệu hội thảo và thẻ đeo.', order_num: 1 },
        { time: '08:30 - 09:00', title: 'Khai mạc & Tuyên bố lý do', speaker: 'MC sự kiện', description: 'Giới thiệu ban tổ chức, đại biểu và mục đích buổi hội thảo.', order_num: 2 },
        { time: '09:00 - 10:30', title: 'Phiên thuyết trình & Chuyên đề chính', speaker: 'Nguyễn Văn A (Diễn giả)', description: 'Chia sẻ chiến lược và giải pháp tối ưu hóa hiệu quả vận hành doanh nghiệp.', order_num: 3 },
        { time: '10:30 - 11:15', title: 'Tọa đàm Q&A & Giao lưu kết nối', speaker: 'Hội đồng chuyên gia', description: 'Giải đáp thắc mắc của khách tham dự và trao đổi trực tiếp.', order_num: 4 },
        { time: '11:15 - 12:00', title: 'Chốt sự kiện & Tiệc trà Tea Break', speaker: 'Trần Văn Mạnh', description: 'Đăng ký nhận ưu đãi, thưởng thức tiệc trà và kết nối giao thương.', order_num: 5 },
      ];

      for (const s of defaultSchedules) {
        await pool.query(`
          INSERT INTO event_schedules (event_id, time, title, speaker, description, order_num)
          VALUES ($1, $2, $3, $4, $5, $6)
        `, [1, s.time, s.title, s.speaker, s.description, s.order_num]);
      }
      console.log('Default schedules seeded.');
    }
  } catch (err) {
    console.error('Migration error:', err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

migrate();
