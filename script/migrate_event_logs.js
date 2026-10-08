const { Pool } = require('pg');
const { getDatabaseConfig } = require('./db-config');

const pool = new Pool(getDatabaseConfig());

async function main() {
  try {
    // 1. Create table event_logs
    await pool.query(`
      CREATE TABLE IF NOT EXISTS event_logs (
        id SERIAL PRIMARY KEY,
        event_id INT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
        event_code VARCHAR(100),
        event_date DATE,
        title VARCHAR(255),
        location VARCHAR(255),
        total_attendees INT DEFAULT 0,
        food_guests_count INT DEFAULT 0,
        staff_remuneration DECIMAL(12, 2) DEFAULT 0,
        tea_break_cost DECIMAL(12, 2) DEFAULT 0,
        total_cost DECIMAL(12, 2) DEFAULT 0,
        status VARCHAR(50) DEFAULT 'Kế hoạch',
        updater_name VARCHAR(255) DEFAULT 'Vũ Thị Cúc',
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('Table event_logs created successfully.');

    // 2. Add columns to event_attachments
    try {
      await pool.query(`ALTER TABLE event_attachments ADD COLUMN file_size VARCHAR(50)`);
    } catch (e) {
      // column may exist
    }
    try {
      await pool.query(`ALTER TABLE event_attachments ADD COLUMN uploaded_by VARCHAR(255) DEFAULT 'Admin'`);
    } catch (e) {
      // column may exist
    }
    console.log('Table event_attachments columns ready.');

    // 3. Populate initial event_logs for events if empty
    const logsCount = await pool.query('SELECT count(*) FROM event_logs');
    if (parseInt(logsCount.rows[0].count) === 0) {
      const eventsRes = await pool.query('SELECT * FROM events ORDER BY id ASC');
      for (const ev of eventsRes.rows) {
        const eventCode = ev.code || `ST${String(ev.id).padStart(3, '0')}`;
        const staffRemuneration = (parseFloat(ev.mc_fee || 0) + parseFloat(ev.speaker_fee || 0) + parseFloat(ev.support_fee || 0) + parseFloat(ev.closer_fee || 0)) || 4500000;
        const teaBreakCost = parseFloat(ev.tea_break_fee || 0) || (ev.expected_guests ? ev.expected_guests * 50000 : 350000);
        const totalCost = staffRemuneration + teaBreakCost;
        const totalAttendees = ev.expected_guests || 8;
        const foodGuestsCount = Math.max(1, Math.floor(totalAttendees * 0.3));

        await pool.query(`
          INSERT INTO event_logs (
            event_id, event_code, event_date, title, location, total_attendees, food_guests_count,
            staff_remuneration, tea_break_cost, total_cost, status, updater_name, notes
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        `, [
          ev.id,
          eventCode,
          ev.event_date,
          ev.name,
          ev.location || 'P. Đại Mỗ',
          totalAttendees,
          foodGuestsCount,
          staffRemuneration,
          teaBreakCost,
          totalCost,
          ev.status || 'Kế hoạch',
          'Vũ Thị Cúc',
          ev.notes || 'Nhật ký chi phí và tiến độ tổ chức sự kiện'
        ]);
      }
      console.log('Seeded event_logs for existing events.');
    }

    // 4. Also seed sample attachments if empty
    const attachCount = await pool.query('SELECT count(*) FROM event_attachments');
    if (parseInt(attachCount.rows[0].count) === 0) {
      const sampleEvents = await pool.query('SELECT id, name FROM events LIMIT 5');
      for (const ev of sampleEvents.rows) {
        await pool.query(`
          INSERT INTO event_attachments (event_id, file_name, file_url, file_type, file_size, uploaded_by)
          VALUES 
          ($1, $2, $3, $4, $5, $6),
          ($1, $7, $8, $9, $10, $11)
        `, [
          ev.id,
          `Kế_hoạch_tổ_chức_${ev.id}.pdf`,
          `#`,
          'PDF Document',
          '2.4 MB',
          'Vũ Thị Cúc',
          `Slide_thuyết_trình_${ev.id}.pptx`,
          `#`,
          'Presentation',
          '5.8 MB',
          'Nguyễn Tuấn'
        ]);
      }
      console.log('Seeded event_attachments.');
    }

    console.log('Migration completed successfully!');
  } catch (error) {
    console.error('Error in migration:', error);
  } finally {
    await pool.end();
  }
}

main();
