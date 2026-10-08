import pool from '@/lib/db';
import { ensureTeamLeadSchema } from '@/lib/teamlead';
import { ensureMemberSchema, UNIFIED_TEAM_NAME_SQL } from '@/lib/memberTeams';
import { sanitizeVietnameseText } from '@/lib/nameSanitizer';

import ContractManagement, { Contract, Stats, TeamOption, UserOption } from '@/components/admin/ContractManagement';

export const revalidate = 0;

async function getContractsData(year: number): Promise<{
  contracts: Contract[];
  stats: Stats;
  users: UserOption[];
  closers: UserOption[];
  teams: TeamOption[];
}> {
  try {
    await ensureTeamLeadSchema();
    await ensureMemberSchema();
    const [contractsRes, statsRes, closersRes, usersRes, teamsRes] = await Promise.all([
      pool.query(`
        SELECT 
          c.id,
          c.contract_code,
          c.contract_date,
          c.contract_date::text AS contract_date_text,
          c.customer_name,
          c.customer_phone,
          c.customer_address,
          c.value,
          c.closer_id,
          CASE 
            WHEN c.closer_name = 'Nguy?n H?ng V?' THEN 'Nguyễn Hùng Vĩ'
            WHEN c.closer_name LIKE '%?%' AND u_closer.full_name IS NOT NULL THEN u_closer.full_name
            ELSE COALESCE(NULLIF(BTRIM(c.closer_name), ''), u_closer.full_name)
          END as closer_name,
          COALESCE(NULLIF(BTRIM(c.closer_phone), ''), u_closer.phone) as closer_phone,
          c.referrer_id,
          CASE 
            WHEN c.referrer_name = 'Chu Th? L??ng' THEN 'Chu Thị Lương'
            WHEN c.referrer_name LIKE '%?%' AND u_referrer.full_name IS NOT NULL THEN u_referrer.full_name
            ELSE COALESCE(NULLIF(BTRIM(c.referrer_name), ''), u_referrer.full_name)
          END as referrer_name,
          COALESCE(NULLIF(BTRIM(c.referrer_phone), ''), u_referrer.phone) as referrer_phone,
          c.supporter_id,
          CASE 
            WHEN c.supporter_name = 'V? Th? C?c' THEN 'Vũ Thị Cúc'
            WHEN c.supporter_name = 'Nguy?n H?ng V?' THEN 'Nguyễn Hùng Vĩ'
            WHEN c.supporter_name LIKE '%?%' AND u_supporter.full_name IS NOT NULL THEN u_supporter.full_name
            ELSE COALESCE(NULLIF(BTRIM(c.supporter_name), ''), u_supporter.full_name)
          END as supporter_name,
          COALESCE(NULLIF(BTRIM(c.supporter_phone), ''), u_supporter.phone) as supporter_phone,
          c.team_name,
          c.contract_type,
          c.closer_fee,
          c.referrer_fee,
          c.supporter_fee,
          CASE WHEN c.status = 'Ch? duy?t' THEN 'Chờ duyệt' ELSE c.status END as status,
          c.created_at
        FROM contracts c
        LEFT JOIN users u_closer ON c.closer_id = u_closer.id
        LEFT JOIN users u_referrer ON c.referrer_id = u_referrer.id
        LEFT JOIN users u_supporter ON c.supporter_id = u_supporter.id
        WHERE EXTRACT(YEAR FROM c.contract_date) = $1
        ORDER BY c.contract_date DESC, c.id DESC
      `, [year]),
      pool.query(`
        SELECT 
          COUNT(*)::int AS total_contracts,
          COALESCE(SUM(value), 0)::numeric AS total_value,
          COALESCE(SUM(COALESCE(closer_fee, 0) + COALESCE(referrer_fee, 0) + COALESCE(supporter_fee, 0)), 0)::numeric AS total_commission,
          COUNT(CASE WHEN status IN ('Đã duyệt', 'Da duyệt', 'Da duy?t') THEN 1 END)::int AS approved_contracts,
          COALESCE(SUM(COALESCE(allocated_value, value)), 0)::numeric AS allocation_base
        FROM contracts
        WHERE EXTRACT(YEAR FROM contract_date) = $1
      `, [year]),
      pool.query(`
        SELECT DISTINCT u.id, u.full_name 
        FROM contracts c
        JOIN users u ON c.closer_id = u.id
        WHERE EXTRACT(YEAR FROM c.contract_date) = $1
        ORDER BY u.full_name ASC
      `, [year]),
      pool.query(`
        SELECT 
          u.id, 
          u.full_name, 
          u.phone, 
          u.referrer_id,
          r.full_name AS referrer_name,
          r.phone AS referrer_phone,
          u.referral_group,
          ${UNIFIED_TEAM_NAME_SQL} AS team_name
        FROM users u
        LEFT JOIN users r ON u.referrer_id = r.id
        LEFT JOIN teams t ON u.team_id = t.id
        WHERE u.status != 'Tạm khóa'
        ORDER BY u.full_name ASC
      `),
      pool.query(`
        SELECT id, BTRIM(name) AS name
        FROM teamlead_teams
        WHERE NULLIF(BTRIM(name), '') IS NOT NULL
          AND name NOT LIKE '%?%'
        ORDER BY name ASC
      `),
    ]);

    const statsRow = statsRes.rows[0] || {
      total_contracts: 0,
      total_value: 0,
      total_commission: 0,
      approved_contracts: 0,
      allocation_base: 0,
    };

    const contracts = contractsRes.rows.map(row => ({
      ...row,
      closer_name: sanitizeVietnameseText(row.closer_name),
      referrer_name: sanitizeVietnameseText(row.referrer_name),
      supporter_name: sanitizeVietnameseText(row.supporter_name),
      status: sanitizeVietnameseText(row.status),
      contract_date: row.contract_date_text || '',
      created_at: row.created_at ? new Date(row.created_at).toISOString() : '',
    }));

    return {
      contracts,
      stats: {
        totalContracts: statsRow.total_contracts,
        totalValue: Number(statsRow.total_value),
        totalCommission: Number(statsRow.total_commission),
        approvedContracts: Number(statsRow.approved_contracts),
        allocationBase: Number(statsRow.allocation_base),
      },
      closers: closersRes.rows,
      users: usersRes.rows,
      teams: teamsRes.rows,
    };
  } catch (error) {
    console.error('Failed to fetch contracts data:', error);
    return {
      contracts: [],
      stats: {
        totalContracts: 0,
        totalValue: 0,
        totalCommission: 0,
        approvedContracts: 0,
        allocationBase: 0,
      },
      closers: [],
      users: [],
      teams: [],
    };
  }
}

export default async function NhatKyHopDongPage() {
  const currentYearParts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Bangkok',
    year: 'numeric',
  }).formatToParts(new Date());
  const currentYear = Number(currentYearParts.find((part) => part.type === 'year')?.value);
  const data = await getContractsData(currentYear);

  return (
    <ContractManagement
      initialContracts={data.contracts}
      initialStats={data.stats}
      initialUsers={data.users}
      initialClosers={data.closers}
      initialTeams={data.teams}
      currentYear={currentYear}
    />
  );
}
