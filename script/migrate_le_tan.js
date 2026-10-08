const { Client } = require('pg');
const { getDatabaseConfig } = require('./db-config');

const client = new Client(getDatabaseConfig());

async function run() {
  await client.connect();
  console.log('Connected to DB');

  // Check columns
  const colsRes = await client.query(`
    SELECT column_name 
    FROM information_schema.columns 
    WHERE table_name = 'event_registrations'
  `);
  const existingCols = colsRes.rows.map(r => r.column_name);

  if (!existingCols.includes('guest_code')) {
    await client.query('ALTER TABLE event_registrations ADD COLUMN guest_code VARCHAR(100)');
    console.log('Added guest_code column');
  }

  if (!existingCols.includes('guest_role')) {
    await client.query("ALTER TABLE event_registrations ADD COLUMN guest_role VARCHAR(100) DEFAULT 'MC'");
    console.log('Added guest_role column');
  }

  // Check if Event 1 exists
  const event1 = await client.query("SELECT id FROM events WHERE name = 'Sự kiện 1' LIMIT 1");
  let eventId = event1.rows[0]?.id;
  if (!eventId) {
    const newEvent = await client.query(`
      INSERT INTO events (name, event_date, location, expected_guests, status, approval_status)
      VALUES ('Sự kiện 1', '2026-09-02', '-', 0, 'Kế hoạch', 'Đã duyệt')
      RETURNING id
    `);
    eventId = newEvent.rows[0].id;
  }

  // Ensure the 2 mockup guests exist for Event 1
  const existingRegs = await client.query(
    'SELECT id, guest_name FROM event_registrations WHERE event_id = $1',
    [eventId]
  );

  const guestNames = existingRegs.rows.map(r => r.guest_name);
  if (!guestNames.includes('vavavav')) {
    await client.query(`
      INSERT INTO event_registrations (event_id, guest_name, guest_phone, guest_role, source, attendance_status)
      VALUES ($1, 'vavavav', '37337373', 'MC', 'QR', 'Đã đăng ký')
    `, [eventId]);
  }
  if (!guestNames.includes('Lê Anh Tâm')) {
    await client.query(`
      INSERT INTO event_registrations (event_id, guest_name, guest_phone, guest_role, source, attendance_status)
      VALUES ($1, 'Lê Anh Tâm', '0343781582', 'MC', 'QR', 'Đã đăng ký')
    `, [eventId]);
  }

  const check = await client.query('SELECT id, guest_code, guest_name, guest_phone, guest_role, source, attendance_status FROM event_registrations WHERE event_id = $1', [eventId]);
  console.log('Registrations for event 1 (Sự kiện 1):', check.rows);

  await client.end();
}

run().catch(console.error);
