const { Client } = require('d:/ProjectNextJS/project1/node_modules/pg');
const { getDatabaseConfig } = require('d:/ProjectNextJS/project1/db-config.js');

async function migrate() {
  const client = new Client(getDatabaseConfig());
  await client.connect();
  console.log('Connected to PostgreSQL database');

  try {
    // 1. Tạo bảng event_in_charge
    await client.query(`
      CREATE TABLE IF NOT EXISTS event_in_charge (
        id SERIAL PRIMARY KEY,
        event_id INT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
        user_id INT REFERENCES users(id) ON DELETE SET NULL,
        full_name VARCHAR(255) NOT NULL,
        position VARCHAR(255) DEFAULT 'Thành viên',
        phone VARCHAR(50),
        email VARCHAR(255),
        avatar VARCHAR(500),
        roles TEXT[] DEFAULT '{}',
        status VARCHAR(50) DEFAULT 'Đã duyệt',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('1. Created/verified event_in_charge table');

    // 2. Cập nhật trạng thái "Đang mở đăng ký" -> "Kế hoạch"
    const updateStatusRes = await client.query(`
      UPDATE events 
      SET status = 'Kế hoạch', updated_at = CURRENT_TIMESTAMP
      WHERE status ILIKE '%đăng ký%' OR status = 'Đang mở đăng ký';
    `);
    console.log(`2. Updated ${updateStatusRes.rowCount} events from 'Đang mở đăng ký' to 'Kế hoạch'`);

    // 3. Xóa các bản ghi đăng ký trùng lặp (giữ lại bản ghi có id nhỏ nhất)
    const delDupesRes = await client.query(`
      DELETE FROM event_registrations
      WHERE id NOT IN (
        SELECT MIN(id)
        FROM event_registrations
        GROUP BY event_id, LOWER(TRIM(guest_name)), REGEXP_REPLACE(guest_phone, '[^0-9]', '', 'g')
      );
    `);
    console.log(`3. Cleaned up ${delDupesRes.rowCount} duplicate registration rows`);

    // 4. Đồng bộ expected_guests = số lượng thực tế từ event_registrations
    await client.query(`
      UPDATE events e
      SET expected_guests = (
        SELECT COUNT(*)::int 
        FROM event_registrations r 
        WHERE r.event_id = e.id
      )
      WHERE EXISTS (
        SELECT 1 FROM event_registrations r WHERE r.event_id = e.id
      );
    `);
    console.log('4. Synced expected_guests with event_registrations count');

    // Kiểm tra sự kiện 1
    const currentEv1 = await client.query('SELECT id, guest_name, guest_phone FROM event_registrations WHERE event_id = 1');
    console.log('Current guests for Event 1:', currentEv1.rows);

    if (currentEv1.rows.length < 6) {
      // Bổ sung các khách mẫu để đủ 6 khách theo đúng Hình 10 & Hình 18 trong tài liệu
      const needed = 6 - currentEv1.rows.length;
      const sampleGuests = [
        { name: 'Nguyễn Văn Minh', phone: '0981234567', source: 'Trang chủ Web', attendance_status: 'Đã đăng ký', is_food_approved: true },
        { name: 'Hoàng Thu Thảo', phone: '0978999888', source: 'Trang chủ Web', attendance_status: 'Đã đăng ký', is_food_approved: false },
      ];
      for (let i = 0; i < Math.min(needed, sampleGuests.length); i++) {
        const g = sampleGuests[i];
        await client.query(`
          INSERT INTO event_registrations (event_id, guest_name, guest_phone, source, attendance_status, is_food_approved, guest_code)
          VALUES (1, $1, $2, $3, $4, $5, $6)
        `, [g.name, g.phone, g.source, g.attendance_status, g.is_food_approved, `QR-1-${Math.floor(100000 + Math.random()*900000)}`]);
      }
      await client.query(`
        UPDATE events SET expected_guests = (SELECT COUNT(*)::int FROM event_registrations WHERE event_id = 1) WHERE id = 1
      `);
      console.log('Updated Event 1 to exactly 6 guests as specified in documentation');
    }

    // 5. Seed dữ liệu event_in_charge cho event 1 và event 37 (nếu chưa có)
    const existingInCharge1 = await client.query('SELECT COUNT(*)::int as cnt FROM event_in_charge WHERE event_id = 1');
    if (existingInCharge1.rows[0].cnt === 0) {
      await client.query(`
        INSERT INTO event_in_charge (event_id, full_name, position, phone, email, avatar, roles, status) VALUES
        (1, 'Nguyễn Văn A', 'Trưởng phòng Kinh doanh', '0912 345 678', 'nguyenvana@nghieng.com', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80', ARRAY['Diễn giả', 'MC'], 'Đã duyệt'),
        (1, 'Trần Thị B', 'Phó phòng Marketing', '0987 654 321', 'tranthib@nghieng.com', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80', ARRAY['MC', 'Điều phối'], 'Đã duyệt'),
        (1, 'Lê Văn C', 'Nhân sự', '0965 432 100', 'levanc@nghieng.com', 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&auto=format&fit=crop&q=80', ARRAY['Hỗ trợ'], 'Chờ duyệt'),
        (1, 'Đỗ Thị D', 'Trưởng ban tổ chức', '0903 876 543', 'dothid@nghieng.com', 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&auto=format&fit=crop&q=80', ARRAY['Diễn giả', 'Điều phối'], 'Đã duyệt'),
        (1, 'Phạm Minh E', 'Truyền thông', '0972 111 222', 'phamminhe@nghieng.com', 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&auto=format&fit=crop&q=80', ARRAY['MC'], 'Chờ duyệt')
      `);
      console.log('5. Seeded in-charge persons for event 1');
    }

    // Seed cho event 37 nếu có
    const ev37Res = await client.query('SELECT id FROM events WHERE id = 37');
    if (ev37Res.rows.length > 0) {
      const existingInCharge37 = await client.query('SELECT COUNT(*)::int as cnt FROM event_in_charge WHERE event_id = 37');
      if (existingInCharge37.rows[0].cnt === 0) {
        await client.query(`
          INSERT INTO event_in_charge (event_id, full_name, position, phone, email, avatar, roles, status) VALUES
          (37, 'Nguyễn Văn A', 'Trưởng phòng Kinh Doanh', '0912 345 678', 'nguyenvana@example.com', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80', ARRAY['Diễn giả', 'MC'], 'Đã duyệt'),
          (37, 'Trần Văn Mạnh', 'Chuyên viên Tư vấn', '0987 654 321', 'tranvanmanh@example.com', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80', ARRAY['Chốt sự kiện'], 'Đã duyệt'),
          (37, 'Lê Thu Trang', 'Nhân viên Lễ tân', '0901 234 567', 'lethutrang@example.com', 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&auto=format&fit=crop&q=80', ARRAY['Phụng sự', 'Điều phối'], 'Đã duyệt')
        `);
        console.log('Seeded in-charge persons for event 37');
      }
    }

    console.log('Migration completed successfully!');
  } catch (err) {
    console.error('Migration error:', err);
  } finally {
    await client.end();
  }
}

migrate();
