import { cookies } from 'next/headers';
import pool from '@/lib/db';
import InviteManagement, {
  Invitation,
  InviteStats,
  CurrentUser,
} from '@/components/admin/InviteManagement';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

async function getInitialInviteData(): Promise<{
  invitations: Invitation[];
  stats: InviteStats;
  currentUser: CurrentUser;
  upcomingEvents: { id: number; name: string; event_date: string | null; status: string }[];
}> {
  try {
    const cookieStore = await cookies();
    const cookieUserId = cookieStore.get('user_id')?.value;
    const cookiePhone = cookieStore.get('user_phone')?.value;

    const [invitesRes, statsRes, userRes, eventsRes] = await Promise.all([
      pool.query(`
        SELECT 
          i.id,
          i.inviter_id,
          i.invitee_name,
          i.invitee_email,
          i.invitee_phone,
          COALESCE(i.status, 'Đang chờ') AS status,
          COALESCE(i.reward_points, 0) AS reward_points,
          i.created_at,
          i.updated_at,
          u.full_name AS inviter_name,
          u.ref_code AS inviter_ref_code
        FROM invitations i
        LEFT JOIN users u ON i.inviter_id = u.id
        ORDER BY i.id ASC
      `),
      pool.query(`
        SELECT 
          COUNT(*)::int AS total_invites,
          COUNT(CASE WHEN status = 'Đã tham gia' THEN 1 END)::int AS joined_count,
          COUNT(CASE WHEN status = 'Đang chờ' THEN 1 END)::int AS pending_count,
          COUNT(CASE WHEN status = 'Từ chối' THEN 1 END)::int AS rejected_count,
          COALESCE(SUM(CASE WHEN status = 'Đã tham gia' THEN COALESCE(reward_points, 1) ELSE 0 END), 0)::int AS total_rewards
        FROM invitations
      `),
      pool.query(
        cookieUserId
          ? `SELECT id, full_name, email, COALESCE(ref_code, 'N_0000000001') AS ref_code FROM users WHERE id = $1 LIMIT 1`
          : cookiePhone
          ? `SELECT id, full_name, email, COALESCE(ref_code, 'N_0000000001') AS ref_code FROM users WHERE phone = $1 LIMIT 1`
          : `SELECT id, full_name, email, COALESCE(ref_code, 'N_0000000001') AS ref_code 
             FROM users 
             WHERE ref_code = 'REF_CUC12' OR role = 'Admin' OR id = 1
             ORDER BY (CASE WHEN ref_code = 'REF_CUC12' THEN 1 ELSE 2 END) ASC, id ASC
             LIMIT 1`,
        cookieUserId ? [parseInt(cookieUserId, 10)] : cookiePhone ? [cookiePhone] : []
      ),
      pool.query(`
        SELECT id, name, event_date, status
        FROM events
        WHERE status IN ('Sắp diễn ra', 'Đang thực hiện', 'Đang diễn ra')
        ORDER BY (CASE WHEN status = 'Sắp diễn ra' THEN 1 ELSE 2 END), event_date ASC
      `),
    ]);

    const statsRow = statsRes.rows[0] || {
      total_invites: 0,
      joined_count: 0,
      pending_count: 0,
      rejected_count: 0,
      total_rewards: 0,
    };

    const adminUser = userRes.rows[0] || {
      id: 1,
      full_name: 'Nhung Nguyễn',
      email: 'nhungnguyen1722@gmail.com',
      ref_code: 'N_0000000001',
    };

    return {
      invitations: invitesRes.rows.map((row) => ({
        ...row,
        created_at: row.created_at ? new Date(row.created_at).toISOString() : null,
        updated_at: row.updated_at ? new Date(row.updated_at).toISOString() : null,
      })),
      stats: {
        totalInvites: statsRow.total_invites,
        joinedCount: statsRow.joined_count,
        pendingCount: statsRow.pending_count,
        rejectedCount: statsRow.rejected_count,
        totalRewards: statsRow.total_rewards,
      },
      currentUser: {
        id: adminUser.id,
        full_name: adminUser.full_name,
        email: adminUser.email,
        ref_code: adminUser.ref_code || 'N_0000000001',
      },
      upcomingEvents: eventsRes.rows.map((ev) => ({
        id: ev.id,
        name: ev.name,
        event_date: ev.event_date ? new Date(ev.event_date).toISOString() : null,
        status: ev.status,
      })),
    };
  } catch (error) {
    console.error('Failed to load initial invite data:', error);
    return {
      invitations: [],
      stats: {
        totalInvites: 0,
        joinedCount: 0,
        pendingCount: 0,
        rejectedCount: 0,
        totalRewards: 0,
      },
      currentUser: {
        id: 1,
        full_name: 'Nhung Nguyễn',
        ref_code: 'N_0000000001',
      },
      upcomingEvents: [],
    };
  }
}

export default async function MoiBanBePage() {
  const { invitations, stats, currentUser, upcomingEvents } = await getInitialInviteData();

  return (
    <InviteManagement
      initialInvitations={invitations}
      initialStats={stats}
      currentUser={currentUser}
      upcomingEvents={upcomingEvents}
    />
  );
}
