const { Pool } = require('pg');
const { getDatabaseConfig } = require('./db-config');

const pool = new Pool(getDatabaseConfig());

async function seedEvents() {
  try {
    // Lấy 1 manager hợp lệ (nếu có)
    const userRes = await pool.query('SELECT id FROM users LIMIT 1');
    const managerId = userRes.rows.length > 0 ? userRes.rows[0].id : null;

    const eventsData = [
      {
        name: 'Hội nghị khách hàng đầu năm 2025',
        event_date: '2025-01-15',
        expected_guests: 50,
        location: 'Khách sạn Daewoo, Hà Nội',
        status: 'Đã hoàn thành',
      },
      {
        name: 'Workshop Kỹ năng bán hàng BĐS 2025',
        event_date: '2025-03-10',
        expected_guests: 30,
        location: 'Văn phòng WeLink',
        status: 'Đã hoàn thành',
      },
      {
        name: 'Tiệc trà kết nối nhà đầu tư Q1',
        event_date: '2025-04-20',
        expected_guests: 40,
        location: 'Nhà hàng Sen Tây Hồ',
        status: 'Đã hoàn thành',
      },
      {
        name: 'Hội thảo: Cơ hội đầu tư vùng ven',
        event_date: '2025-05-25',
        expected_guests: 100,
        location: 'Trung tâm Hội nghị Quốc gia',
        status: 'Đã hoàn thành',
      },
      {
        name: 'Gặp gỡ đối tác chiến lược',
        event_date: '2025-06-12',
        expected_guests: 20,
        location: 'JW Marriott Hanoi',
        status: 'Đã hoàn thành',
      },
      {
        name: 'Lễ ra quân dự án Eco Park',
        event_date: '2025-08-08',
        expected_guests: 150,
        location: 'KĐT Ecopark',
        status: 'Đã hoàn thành',
      },
      {
        name: 'Đào tạo Sales K2',
        event_date: '2025-09-05',
        expected_guests: 35,
        location: 'Phòng đào tạo WeLink',
        status: 'Đã hoàn thành',
      },
      {
        name: 'Sự kiện tri ân khách hàng',
        event_date: '2025-10-20',
        expected_guests: 80,
        location: 'Trống Đồng Palace',
        status: 'Đã hoàn thành',
      },
      {
        name: 'Networking Doanh nhân trẻ',
        event_date: '2025-11-15',
        expected_guests: 60,
        location: 'Café The Vista',
        status: 'Đã hoàn thành',
      },
      {
        name: 'Gala Dinner Tổng kết 2025',
        event_date: '2025-12-25',
        expected_guests: 200,
        location: 'Khách sạn InterContinental',
        status: 'Đã hoàn thành',
      }
    ];

    for (const event of eventsData) {
      // Random fees
      const mc_fee = Math.floor(Math.random() * 5 + 1) * 1000000;
      const speaker_fee = Math.floor(Math.random() * 5 + 2) * 1000000;
      const support_fee = Math.floor(Math.random() * 2 + 1) * 500000;
      const closer_fee = Math.floor(Math.random() * 5 + 3) * 1000000;
      const tea_break_fee = event.expected_guests * 50000;

      await pool.query(
        `INSERT INTO events (
          name, event_date, expected_guests, location, manager_id, status, approval_status,
          mc_fee, speaker_fee, support_fee, closer_fee, tea_break_fee, notes
        ) VALUES ($1, $2, $3, $4, $5, $6, 'Đã duyệt', $7, $8, $9, $10, $11, 'Sự kiện đã hoàn thành tốt đẹp')`,
        [
          event.name,
          event.event_date,
          event.expected_guests,
          event.location,
          managerId,
          event.status,
          mc_fee,
          speaker_fee,
          support_fee,
          closer_fee,
          tea_break_fee,
        ]
      );
    }

    console.log('Đã tạo thành công 10 sự kiện cũ trong năm 2025.');
  } catch (error) {
    console.error('Lỗi khi tạo dữ liệu:', error);
  } finally {
    pool.end();
  }
}

seedEvents();
