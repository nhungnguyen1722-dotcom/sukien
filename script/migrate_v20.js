const { Client } = require('pg');
const { getDatabaseConfig } = require('./db-config.js');

async function migrate() {
  const client = new Client(getDatabaseConfig());
  await client.connect();
  console.log('Connected to PostgreSQL database');

  try {
    // 1. Chuyển toàn bộ sự kiện 'Kế hoạch' thành 'Sắp diễn ra'
    const updateKeHoach = await client.query(`
      UPDATE events 
      SET status = 'Sắp diễn ra', updated_at = CURRENT_TIMESTAMP
      WHERE status = 'Kế hoạch';
    `);
    console.log(`1. Converted ${updateKeHoach.rowCount} events from 'Kế hoạch' to 'Sắp diễn ra'`);

    // 2. Chuẩn hóa trạng thái: nếu event_date < CURRENT_DATE và chưa hoàn thành -> Đã diễn ra
    const updatePastEvents = await client.query(`
      UPDATE events
      SET status = 'Đã diễn ra', updated_at = CURRENT_TIMESTAMP
      WHERE event_date < CURRENT_DATE 
        AND status NOT IN ('Đã diễn ra', 'Đã hoàn thành');
    `);
    console.log(`2. Updated ${updatePastEvents.rowCount} past events to 'Đã diễn ra'`);

    // 3. Đồng bộ expected_guests của tất cả sự kiện bằng số lượng thực tế từ event_registrations
    const syncGuests = await client.query(`
      UPDATE events e
      SET expected_guests = COALESCE((
        SELECT COUNT(*)::int 
        FROM event_registrations r 
        WHERE r.event_id = e.id
      ), 0),
      updated_at = CURRENT_TIMESTAMP;
    `);
    console.log(`3. Synced expected_guests for all events (${syncGuests.rowCount} events)`);

    // 4. Kiểm tra và đảm bảo bảng event_in_charge có cột status 'Đã duyệt' / 'Chờ duyệt' và is_food_approved
    await client.query(`ALTER TABLE event_in_charge ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'Đã duyệt';`);
    await client.query(`ALTER TABLE event_in_charge ADD COLUMN IF NOT EXISTS is_food_approved BOOLEAN DEFAULT TRUE;`);
    console.log(`4. Verified status and is_food_approved in event_in_charge`);

    // 5. Kiểm tra kết quả trạng thái sự kiện
    const statusCounts = await client.query(`
      SELECT status, count(*) 
      FROM events 
      GROUP BY status 
      ORDER BY status;
    `);
    console.log('\nFinal event status distribution:');
    console.table(statusCounts.rows);

    console.log('\nMigration v20 completed successfully!');
  } catch (error) {
    console.error('Migration v20 failed:', error);
    throw error;
  } finally {
    await client.end();
  }
}

migrate().catch(console.error);
