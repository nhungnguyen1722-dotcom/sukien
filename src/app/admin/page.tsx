import pool from '@/lib/db';
import AdminDashboard, {
  DashboardStats,
  UpcomingEvent,
  ActivityStats,
} from '@/components/admin/AdminDashboard';

export const revalidate = 0;

async function getDashboardStats(): Promise<DashboardStats> {
  try {
    const [totalRes, upcomingRes, guestsRes, costRes] = await Promise.all([
      pool.query(`SELECT COUNT(*)::int AS count FROM events`),
      pool.query(
        `SELECT COUNT(*)::int AS count FROM events WHERE event_date >= '2026-09-01' AND (status = 'Kế hoạch' OR status = 'Sắp diễn ra')`
      ),
      pool.query(`SELECT COUNT(*)::int AS count FROM event_registrations`),
      pool.query(
        `SELECT COALESCE(SUM(fee), 0)::numeric AS total FROM events`
      ),
    ]);

    return {
      totalEvents: totalRes.rows[0].count || 0,
      upcomingEvents: upcomingRes.rows[0].count || 0,
      totalGuests: guestsRes.rows[0].count || 0,
      totalExpectedCost: parseFloat(costRes.rows[0].total) || 0,
    };
  } catch (error) {
    console.error('Failed to fetch dashboard stats:', error);
    return { totalEvents: 0, upcomingEvents: 0, totalGuests: 0, totalExpectedCost: 0 };
  }
}

async function getUpcomingEvents(): Promise<UpcomingEvent[]> {
  try {
    const result = await pool.query(`
      SELECT id, name, location, event_date
      FROM events
      ORDER BY event_date DESC, id ASC
      LIMIT 5
    `);
    return result.rows.map((row) => ({
      ...row,
      event_date: row.event_date ? new Date(row.event_date).toISOString() : '',
    }));
  } catch (error) {
    console.error('Failed to fetch upcoming events:', error);
    return [];
  }
}

async function getActivityStats(): Promise<ActivityStats> {
  try {
    const [eventsRes, salesRes, membersRes, registrationsRes] = await Promise.all([
      pool.query(`SELECT COUNT(*)::int AS count FROM events`),
      pool.query(
        `SELECT COUNT(*)::int AS count FROM users WHERE role IN ('Sale', 'Pro Sale', 'Người mời')`
      ),
      pool.query(`SELECT COUNT(*)::int AS count FROM users`),
      pool.query(`SELECT COUNT(*)::int AS count FROM event_registrations`),
    ]);

    return {
      totalEvents: eventsRes.rows[0].count || 0,
      newSales: salesRes.rows[0].count || 0,
      totalMembers: membersRes.rows[0].count || 0,
      registeredGuests: registrationsRes.rows[0].count || 0,
    };
  } catch (error) {
    console.error('Failed to fetch activity stats:', error);
    return { totalEvents: 0, newSales: 0, totalMembers: 0, registeredGuests: 0 };
  }
}

export default async function AdminPage() {
  const [stats, upcomingEvents, activity] = await Promise.all([
    getDashboardStats(),
    getUpcomingEvents(),
    getActivityStats(),
  ]);

  return (
    <AdminDashboard
      stats={stats}
      upcomingEvents={upcomingEvents}
      activity={activity}
    />
  );
}
