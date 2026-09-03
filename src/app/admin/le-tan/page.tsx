import pool from '@/lib/db';
import ReceptionManagement, {
  EventItem,
  SaleUser,
  RegistrationItem,
} from '@/components/admin/ReceptionManagement';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

async function getInitialReceptionData(): Promise<{
  events: EventItem[];
  sales: SaleUser[];
  registrations: RegistrationItem[];
  defaultEventId?: number;
}> {
  try {
    // 1. Fetch events
    const eventsRes = await pool.query(
      `SELECT id, name, event_date::text AS event_date, location FROM events ORDER BY id ASC`
    );

    const events: EventItem[] = eventsRes.rows.map((row) => ({
      id: row.id,
      name: row.name,
      event_date: row.event_date,
      location: row.location,
    }));

    // Find "Sự kiện 1" or default to first event
    const defaultEvent =
      events.find((e) => e.name.toLowerCase().includes('sự kiện 1')) || events[0];
    const defaultEventId = defaultEvent?.id;

    // 2. Fetch sales / users
    const salesRes = await pool.query(
      `SELECT id, full_name, phone, role, classification, ref_code 
       FROM users 
       ORDER BY full_name ASC`
    );

    const sales: SaleUser[] = salesRes.rows;

    // 3. Fetch registrations for default event
    let registrations: RegistrationItem[] = [];
    if (defaultEventId) {
      const regsRes = await pool.query(
        `
        SELECT 
          r.id,
          r.event_id,
          r.guest_code,
          r.guest_name,
          r.guest_phone,
          r.guest_email,
          r.company_address,
          COALESCE(r.guest_role, 'MC') AS guest_role,
          COALESCE(r.source, 'Lễ tân nhập') AS source,
          r.referrer_id,
          COALESCE(u.full_name, r.referrer_group, '') AS sale_name,
          u.phone AS sale_phone,
          COALESCE(r.attendance_status, 'Đã đăng ký') AS attendance_status,
          r.notes,
          r.registered_at,
          r.created_at,
          e.name AS event_name,
          e.event_date::text AS event_date,
          e.location AS event_location
        FROM event_registrations r
        LEFT JOIN users u ON r.referrer_id = u.id
        LEFT JOIN events e ON r.event_id = e.id
        WHERE r.event_id = $1
        ORDER BY r.id DESC
        `,
        [defaultEventId]
      );

      registrations = regsRes.rows.map((row) => ({
        ...row,
        event_date: row.event_date,
        created_at: row.created_at ? new Date(row.created_at).toISOString() : null,
      }));
    }

    return {
      events,
      sales,
      registrations,
      defaultEventId,
    };
  } catch (error) {
    console.error('Failed to load initial reception data:', error);
    return {
      events: [],
      sales: [],
      registrations: [],
    };
  }
}

export default async function ReceptionPage() {
  const { events, sales, registrations, defaultEventId } =
    await getInitialReceptionData();

  return (
    <ReceptionManagement
      initialEvents={events}
      initialSales={sales}
      initialRegistrations={registrations}
      defaultEventId={defaultEventId}
    />
  );
}
