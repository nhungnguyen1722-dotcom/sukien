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
          (SELECT COUNT(*)::int FROM event_registrations WHERE event_id = e.id) as registration_count
        FROM events e
        LEFT JOIN users m ON e.manager_id = m.id
        ORDER BY e.id DESC
      `),
      pool.query(`
        SELECT 
          COUNT(*)::int AS total_events,
          COUNT(CASE WHEN status = 'Kế hoạch' THEN 1 END)::int AS upcoming_events,
          COALESCE(SUM(expected_guests), 0)::int AS total_guests,
          COALESCE(SUM(COALESCE(mc_fee, 0) + COALESCE(speaker_fee, 0) + COALESCE(support_fee, 0) + COALESCE(closer_fee, 0) + COALESCE(tea_break_fee, 0)), 0)::numeric AS total_cost
        FROM events
      `),
      pool.query(`SELECT id, full_name FROM users ORDER BY full_name ASC`),
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
