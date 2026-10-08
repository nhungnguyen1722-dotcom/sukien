import pool from '@/lib/db';
import MemberManagement, {
  Member,
  Stats,
  ReferrerOption,
} from '@/components/admin/MemberManagement';

export const revalidate = 0;

async function getInitialData(): Promise<{
  members: Member[];
  stats: Stats;
  referrers: ReferrerOption[];
  teams: string[];
}> {
  try {
    const [membersRes, statsRes, referrersRes, teamsRes] = await Promise.all([
      pool.query(`
        SELECT 
          u.id,
          u.full_name,
          u.phone,
          u.email,
          u.identity_card,
          u.bank_account,
          u.role,
          u.classification,
          u.title,
          u.team_id,
          COALESCE(member_team.team_names, ARRAY_REMOVE(ARRAY[t.name], NULL)) AS team_names,
          COALESCE(array_to_string(member_team.team_names, ', '), t.name) AS team_name,
          u.ref_code,
          u.referrer_id,
          u.referral_group,
          u.source,
          u.join_date,
          u.status,
          u.is_team_leader_eligible,
          u.invite_count,
          u.guest_count,
          u.notes,
          u.created_at,
          u.updated_at,
          r.full_name AS referrer_name,
          r.phone AS referrer_phone
        FROM users u
        LEFT JOIN teams t ON t.id = u.team_id
        LEFT JOIN LATERAL (
          SELECT array_agg(member_team.name ORDER BY member_team.name) AS team_names
          FROM user_teams ut
          JOIN teams member_team ON member_team.id = ut.team_id
          WHERE ut.user_id = u.id
        ) member_team ON TRUE
        LEFT JOIN users r ON u.referrer_id = r.id
        ORDER BY u.id ASC
      `),
      pool.query(`
        SELECT 
          COUNT(*)::int AS total_members,
          COUNT(CASE WHEN status IN ('Đang hoạt động', 'Hoạt động') THEN 1 END)::int AS active_members,
          COUNT(CASE WHEN created_at >= date_trunc('month', CURRENT_DATE) OR join_date >= date_trunc('month', CURRENT_DATE) THEN 1 END)::int AS new_members,
          COUNT(CASE WHEN status NOT IN ('Đang hoạt động', 'Hoạt động') OR status = 'Không hoạt động' OR status = 'Tạm khóa' THEN 1 END)::int AS inactive_members
        FROM users
      `),
      pool.query(`SELECT id, full_name, phone, ref_code FROM users ORDER BY full_name ASC`),
      pool.query('SELECT name FROM teams ORDER BY name ASC'),
    ]);

    const statsRow = statsRes.rows[0] || {
      total_members: 0,
      active_members: 0,
      new_members: 0,
      inactive_members: 0,
    };

    return {
      members: membersRes.rows.map((row) => ({
        ...row,
        team_names: row.team_names || [],
        join_date: row.join_date ? new Date(row.join_date).toISOString() : null,
        created_at: row.created_at ? new Date(row.created_at).toISOString() : null,
        updated_at: row.updated_at ? new Date(row.updated_at).toISOString() : null,
      })),
      stats: {
        totalMembers: statsRow.total_members,
        activeMembers: statsRow.active_members,
        newMembers: statsRow.new_members,
        inactiveMembers: statsRow.inactive_members,
      },
      referrers: referrersRes.rows,
      teams: teamsRes.rows.map((row) => row.name),
    };
  } catch (error) {
    console.error('Failed to fetch initial member data:', error);
    return {
      members: [],
      stats: { totalMembers: 0, activeMembers: 0, newMembers: 0, inactiveMembers: 0 },
      referrers: [],
      teams: [],
    };
  }
}

export default async function ThanhVienPage() {
  const { members, stats, referrers, teams } = await getInitialData();

  return (
    <MemberManagement
      initialMembers={members}
      initialStats={stats}
      initialReferrers={referrers}
      initialTeams={teams}
    />
  );
}
