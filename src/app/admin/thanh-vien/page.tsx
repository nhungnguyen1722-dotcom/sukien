import pool from '@/lib/db';
import { ensureMemberSchema, UNIFIED_TEAM_NAME_SQL, UNIFIED_TITLE_SQL } from '@/lib/memberTeams';
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
  teams: Array<{ id: number; name: string }>;
}> {
  try {
    await ensureMemberSchema();
    const [membersRes, statsRes, referrersRes, teamsRes] = await Promise.all([
      pool.query(`
        SELECT 
          u.id,
          u.full_name,
          u.phone,
          u.email,
          u.avatar_url,
          u.identity_card,
          u.bank_account,
          u.role,
          u.classification,
          ${UNIFIED_TITLE_SQL} AS title,
          u.team_id,
          ${UNIFIED_TEAM_NAME_SQL} AS team_name,
          u.ref_code,
          u.referrer_id,
          u.referral_group,
          u.source,
          u.join_date,
          u.status,
          COALESCE(
            u.is_team_leader_eligible,
            EXISTS(
              SELECT 1 FROM teamlead_members tm
              WHERE (tm.member_id = u.id OR (NULLIF(REGEXP_REPLACE(tm.member_phone, '[^0-9]', '', 'g'), '') IS NOT NULL AND REGEXP_REPLACE(tm.member_phone, '[^0-9]', '', 'g') = REGEXP_REPLACE(u.phone, '[^0-9]', '', 'g')))
                AND (tm.include_30 = TRUE OR EXISTS(SELECT 1 FROM teamlead_member_teams tmt WHERE tmt.member_id = tm.id))
            ),
            FALSE
          ) AS is_team_leader_eligible,
          u.invite_count,
          u.guest_count,
          u.notes,
          u.created_at,
          u.updated_at,
          r.full_name AS referrer_name,
          r.phone AS referrer_phone,
          COALESCE(cnt.contract_count, 0)::int AS contract_count,
          COALESCE(cnt.total_contract_value, 0)::float8 AS total_contract_value,
          COALESCE(cnt.total_commission, 0)::float8 AS total_commission,
          COALESCE(tx.paid_amount, 0)::float8 AS total_paid_amount,
          COALESCE(tx.pending_amount, 0)::float8 AS total_pending_amount
        FROM users u
        LEFT JOIN users r ON u.referrer_id = r.id
        LEFT JOIN teams t ON u.team_id = t.id
        LEFT JOIN (
          SELECT 
            closer_id,
            COUNT(*)::int AS contract_count,
            SUM(value)::float8 AS total_contract_value,
            SUM(COALESCE(closer_fee, 0))::float8 AS total_commission
          FROM contracts
          WHERE closer_id IS NOT NULL
          GROUP BY closer_id
        ) cnt ON cnt.closer_id = u.id
        LEFT JOIN (
          SELECT 
            beneficiary_user_id,
            SUM(CASE WHEN status IN ('Đã chi', 'Đã thanh toán', 'Đã thực hiện') THEN COALESCE(actual_expense, proposed_amount, 0) ELSE 0 END)::float8 AS paid_amount,
            SUM(CASE WHEN status IN ('Chờ duyệt', 'Đã duyệt') THEN COALESCE(proposed_amount, 0) ELSE 0 END)::float8 AS pending_amount
          FROM transaction_logs
          WHERE beneficiary_user_id IS NOT NULL
          GROUP BY beneficiary_user_id
        ) tx ON tx.beneficiary_user_id = u.id
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
      pool.query(`SELECT id, name FROM teams WHERE NULLIF(BTRIM(name), '') IS NOT NULL ORDER BY name ASC`),
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
      teams: teamsRes.rows,
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
