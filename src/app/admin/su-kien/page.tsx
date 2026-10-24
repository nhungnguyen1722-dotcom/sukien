import pool from '@/lib/db';
import EventManagement, {
  Event,
  Stats,
  ManagerOption,
} from '@/components/admin/EventManagement';

export const revalidate = 0;

async function getInitialData(): Promise<{
  events: Event[];
  stats: Stats;
  managers: ManagerOption[];
}> {
  try {
    const [eventsRes, statsRes, managersRes] = await Promise.all([
      pool.query(`
        SELECT 
          e.*,
          m.full_name as manager_name,
          (COALESCE(registrations.registration_count, 0) + COALESCE(in_charge.in_charge_count, 0))::int AS registration_count,
          COALESCE(in_charge.user_ids, ARRAY[]::integer[]) AS in_charge_user_ids
        FROM events e
        LEFT JOIN users m ON e.manager_id = m.id
        LEFT JOIN (
          SELECT event_id, COUNT(*)::int AS registration_count
          FROM event_registrations
          GROUP BY event_id
        ) registrations ON registrations.event_id = e.id
        LEFT JOIN (
          SELECT event_id, COUNT(*)::int AS in_charge_count,
            ARRAY_AGG(user_id) FILTER (WHERE user_id IS NOT NULL) AS user_ids
          FROM event_in_charge
          GROUP BY event_id
        ) in_charge ON in_charge.event_id = e.id
        ORDER BY 
          CASE 
            WHEN e.status IN ('Đang thực hiện', 'Đang diễn ra') THEN 1 
            WHEN e.status = 'Sắp diễn ra' THEN 2 
            ELSE 3 
          END ASC, 
          CASE 
            WHEN e.status IN ('Đang thực hiện', 'Đang diễn ra', 'Sắp diễn ra') THEN e.event_date 
          END ASC,
          CASE 
            WHEN e.status NOT IN ('Đang thực hiện', 'Đang diễn ra', 'Sắp diễn ra') THEN e.event_date 
          END DESC,
          e.id DESC
      `),
      pool.query(`
        SELECT 
          COUNT(*)::int AS total_events,
          COUNT(CASE WHEN status = 'Sắp diễn ra' THEN 1 END)::int AS upcoming_events,
          ((SELECT COUNT(*)::int FROM event_registrations) + (SELECT COUNT(*)::int FROM event_in_charge))::int AS total_guests,
          COALESCE(SUM(COALESCE(mc_fee, 0) + COALESCE(speaker_fee, 0) + COALESCE(support_fee, 0) + COALESCE(closer_fee, 0) + COALESCE(tea_break_fee, 0)), 0)::numeric AS total_cost
        FROM events
      `),
      pool.query(`SELECT id, full_name, role FROM users ORDER BY full_name ASC`),
    ]);

    const statsRow = statsRes.rows[0] || {
      total_events: 0,
      upcoming_events: 0,
      total_guests: 0,
      total_cost: 0,
    };

    return {
      events: eventsRes.rows.map((row) => ({
        ...row,
        status: row.status === 'Đang thực hiện' ? 'Đang diễn ra' : row.status,
        event_date: row.event_date ? new Date(row.event_date).toISOString() : null,
        created_at: row.created_at ? new Date(row.created_at).toISOString() : null,
        updated_at: row.updated_at ? new Date(row.updated_at).toISOString() : null,
      })),
      stats: {
        totalEvents: statsRow.total_events,
        upcomingEvents: statsRow.upcoming_events,
        totalGuests: statsRow.total_guests,
        totalCost: Number(statsRow.total_cost),
      },
      managers: managersRes.rows,
    };
  } catch (error) {
    console.error('Failed to fetch initial event data:', error);
    return {
      events: [],
      stats: { totalEvents: 0, upcomingEvents: 0, totalGuests: 0, totalCost: 0 },
      managers: [],
    };
  }
}

export default async function SuKienPage() {
  const { events, stats, managers } = await getInitialData();

  return (
    <EventManagement
      initialEvents={events}
      initialStats={stats}
      initialManagers={managers}
    />
  );
}
