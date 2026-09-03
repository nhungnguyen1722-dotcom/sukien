import { notFound } from 'next/navigation';
import pool from '@/lib/db';
import EventDetail, {
  EventData,
  Registration,
  EventLog,
  Attachment,
  ManagerOption,
} from '@/components/admin/EventDetail';

export const revalidate = 0;

interface PageProps {
  params: Promise<{ id: string }>;
}

async function resolveEventId(idParam: string): Promise<number | null> {
  const parsed = parseInt(idParam, 10);
  if (!isNaN(parsed)) return parsed;
  if (idParam === '6a9254fd7194452499f20df3') return 2; // "Hội nghị khách hàng Hà Đông"
  if (idParam === '6a0fddfa6b74280edb94560e') return 1; // "Sự kiện 1"

  const codeRes = await pool.query('SELECT id FROM events WHERE code = $1 LIMIT 1', [idParam]);
  if (codeRes.rows.length > 0) return codeRes.rows[0].id;

  const firstRes = await pool.query('SELECT id FROM events ORDER BY id ASC LIMIT 1');
  return firstRes.rows.length > 0 ? firstRes.rows[0].id : null;
}

export default async function AdminEventDetailPage({ params }: PageProps) {
  const { id } = await params;
  const eventId = await resolveEventId(id);

  if (!eventId) {
    notFound();
  }

  try {
    const [eventRes, regRes, logsRes, attachRes, managersRes] = await Promise.all([
      pool.query(
        `
        SELECT 
          e.*,
          m.full_name AS manager_name,
          m.phone AS manager_phone,
          m.email AS manager_email,
          ab.full_name AS approved_by_name
        FROM events e
        LEFT JOIN users m ON e.manager_id = m.id
        LEFT JOIN users ab ON e.approved_by = ab.id
        WHERE e.id = $1
      `,
        [eventId]
      ),
      pool.query(
        `
        SELECT 
          r.*,
          u.full_name AS referrer_name,
          u.phone AS referrer_phone
        FROM event_registrations r
        LEFT JOIN users u ON r.referrer_id = u.id
        WHERE r.event_id = $1
        ORDER BY r.id DESC
      `,
        [eventId]
      ),
      pool.query(
        `
        SELECT *
        FROM event_logs
        WHERE event_id = $1
        ORDER BY id DESC
      `,
        [eventId]
      ),
      pool.query(
        `
        SELECT *
        FROM event_attachments
        WHERE event_id = $1
        ORDER BY id DESC
      `,
        [eventId]
      ),
      pool.query(`SELECT id, full_name, role FROM users ORDER BY full_name ASC`),
    ]);

    if (eventRes.rows.length === 0) {
      notFound();
    }

    const row = eventRes.rows[0];
    const event: EventData = {
      ...row,
      event_date: row.event_date ? new Date(row.event_date).toISOString() : null,
      approved_at: row.approved_at ? new Date(row.approved_at).toISOString() : null,
      created_at: row.created_at ? new Date(row.created_at).toISOString() : null,
      updated_at: row.updated_at ? new Date(row.updated_at).toISOString() : null,
    };

    const registrations: Registration[] = regRes.rows.map((r) => ({
      ...r,
      registered_at: r.registered_at ? new Date(r.registered_at).toISOString() : null,
      checkin_at: r.checkin_at ? new Date(r.checkin_at).toISOString() : null,
    }));

    const logs: EventLog[] = logsRes.rows.map((l) => ({
      ...l,
      event_date: l.event_date ? new Date(l.event_date).toISOString() : null,
      created_at: l.created_at ? new Date(l.created_at).toISOString() : null,
      updated_at: l.updated_at ? new Date(l.updated_at).toISOString() : null,
    }));

    const attachments: Attachment[] = attachRes.rows.map((a) => ({
      ...a,
      created_at: a.created_at ? new Date(a.created_at).toISOString() : null,
    }));

    const managers: ManagerOption[] = managersRes.rows;

    return (
      <EventDetail
        initialEvent={event}
        initialRegistrations={registrations}
        initialLogs={logs}
        initialAttachments={attachments}
        managers={managers}
      />
    );
  } catch (error) {
    console.error('Failed to load event detail page:', error);
    notFound();
  }
}
