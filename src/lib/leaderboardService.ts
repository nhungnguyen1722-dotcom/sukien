import pool from '@/lib/db';
import { sanitizeVietnameseText } from '@/lib/nameSanitizer';
import { UNIFIED_TEAM_NAME_SQL, UNIFIED_TITLE_SQL, ensureMemberSchema } from '@/lib/memberTeams';

export interface LeaderboardMember {
  rank: number;
  userId: number | null;
  name: string;
  phone: string;
  avatarUrl: string | null;
  team: string;
  title: string;
  revenue: number;
  allocatedRevenue: number;
  commission: number;
  contractCount: number;
  bonusThiDua: number;
  bonusKpi: number;
  promotionEvaluation: string;
  continuousMonthsCount: number;
  isDirectorEligible: boolean;
  isManagerEligible: boolean;
  monthlyHistory?: { month: string; revenue: number; commission: number; contracts: number }[];
}

export interface LeaderboardTeam {
  rank: number;
  teamName: string;
  revenue: number;
  contractCount: number;
  memberCount: number;
  bonusThiDua: number;
  bonusKpi: number;
}

export interface LeaderboardData {
  month: string;
  mode: 'month' | 'cumulative3';
  startDate: string;
  endDate: string;
  members: LeaderboardMember[];
  top3Members: LeaderboardMember[];
  teams: LeaderboardTeam[];
  top3Teams: LeaderboardTeam[];
  summary: {
    totalRevenue: number;
    totalCommission: number;
    totalContracts: number;
    totalMembers: number;
  };
}

export function getMonthDateRange(monthStr: string): { start: string; end: string } {
  // If month is 2026-09, business cutoff was 2026-09-01 to 2026-10-02
  if (monthStr === '2026-09') {
    return { start: '2026-09-01', end: '2026-10-02' };
  }
  // If month is 2026-10, business start was 2026-10-03 to 2026-10-31
  if (monthStr === '2026-10') {
    return { start: '2026-10-03', end: '2026-10-31' };
  }

  const [yearStr, monthNumStr] = monthStr.split('-');
  const year = parseInt(yearStr, 10);
  const monthNum = parseInt(monthNumStr, 10);
  const start = `${monthStr}-01`;
  const lastDay = new Date(year, monthNum, 0).getDate();
  const end = `${monthStr}-${String(lastDay).padStart(2, '0')}`;
  return { start, end };
}

export function getPreviousMonths(monthStr: string, count: number): string[] {
  const result: string[] = [];
  const [yearStr, monthNumStr] = monthStr.split('-');
  let curYear = parseInt(yearStr, 10);
  let curMonth = parseInt(monthNumStr, 10);

  for (let i = 0; i < count; i++) {
    result.push(`${curYear}-${String(curMonth).padStart(2, '0')}`);
    curMonth -= 1;
    if (curMonth === 0) {
      curMonth = 12;
      curYear -= 1;
    }
  }
  return result;
}

export async function getLeaderboardData(
  selectedMonth: string = '2026-10',
  mode: 'month' | 'cumulative3' = 'month',
  customStartDate?: string,
  customEndDate?: string
): Promise<LeaderboardData> {
  await ensureMemberSchema();

  // Determine months to inspect
  const targetMonths = mode === 'cumulative3' ? getPreviousMonths(selectedMonth, 3) : [selectedMonth];

  let effectiveStart: string;
  let effectiveEnd: string;

  if (customStartDate && customEndDate) {
    effectiveStart = customStartDate;
    effectiveEnd = customEndDate;
  } else if (mode === 'cumulative3') {
    const oldestMonth = targetMonths[targetMonths.length - 1];
    effectiveStart = getMonthDateRange(oldestMonth).start;
    effectiveEnd = getMonthDateRange(selectedMonth).end;
  } else {
    const range = getMonthDateRange(selectedMonth);
    effectiveStart = range.start;
    effectiveEnd = range.end;
  }

  // 1. Fetch contracts in range
  const contractsRes = await pool.query(`
    SELECT 
      c.id,
      c.contract_code,
      c.contract_date::text AS contract_date,
      TO_CHAR(c.contract_date, 'YYYY-MM') AS contract_month,
      COALESCE(c.customer_name, '') AS customer_name,
      c.value::float8 AS value,
      CASE
        WHEN UPPER(TRIM(COALESCE(c.contract_type, ''))) IN ('BĐS', 'BDS', 'BẤT ĐỘNG SẢN', 'BAT DONG SAN')
          THEN ROUND((COALESCE(c.value, 0) * 4.0) / 15.0)
        ELSE COALESCE(c.value, 0)
      END::float8 AS allocated_value,
      COALESCE(NULLIF(BTRIM(c.closer_name), ''), '') AS closer_name,
      COALESCE(NULLIF(BTRIM(c.closer_phone), ''), '') AS closer_phone,
      COALESCE(c.closer_fee, 0)::float8 AS closer_fee,
      COALESCE(NULLIF(BTRIM(c.referrer_name), ''), '') AS referrer_name,
      COALESCE(NULLIF(BTRIM(c.referrer_phone), ''), '') AS referrer_phone,
      COALESCE(c.referrer_fee, 0)::float8 AS referrer_fee,
      COALESCE(NULLIF(BTRIM(c.supporter_name), ''), '') AS supporter_name,
      COALESCE(NULLIF(BTRIM(c.supporter_phone), ''), '') AS supporter_phone,
      COALESCE(c.supporter_fee, 0)::float8 AS supporter_fee,
      COALESCE(NULLIF(BTRIM(c.team_name), ''), 'Chưa gán đội') AS team_name
    FROM contracts c
    WHERE c.contract_date::date >= $1::date AND c.contract_date::date <= $2::date
    ORDER BY c.contract_date ASC, c.id ASC
  `, [effectiveStart, effectiveEnd]);

  // Also fetch all-time or last 6 months contracts for historical continuous performance evaluation
  const historyStart = getMonthDateRange(getPreviousMonths(selectedMonth, 4)[3] || '2026-06').start;
  const historyContractsRes = await pool.query(`
    SELECT 
      c.id,
      c.contract_date::text AS contract_date,
      TO_CHAR(c.contract_date, 'YYYY-MM') AS contract_month,
      c.value::float8 AS value,
      COALESCE(NULLIF(BTRIM(c.closer_name), ''), '') AS closer_name,
      COALESCE(NULLIF(BTRIM(c.closer_phone), ''), '') AS closer_phone,
      COALESCE(c.closer_fee, 0)::float8 AS closer_fee,
      COALESCE(NULLIF(BTRIM(c.referrer_name), ''), '') AS referrer_name,
      COALESCE(NULLIF(BTRIM(c.referrer_phone), ''), '') AS referrer_phone,
      COALESCE(c.referrer_fee, 0)::float8 AS referrer_fee,
      COALESCE(NULLIF(BTRIM(c.supporter_name), ''), '') AS supporter_name,
      COALESCE(NULLIF(BTRIM(c.supporter_phone), ''), '') AS supporter_phone,
      COALESCE(c.supporter_fee, 0)::float8 AS supporter_fee
    FROM contracts c
    WHERE c.contract_date::date >= $1::date AND c.contract_date::date <= $2::date
  `, [historyStart, effectiveEnd]);

  // 2. Fetch users to map avatars, titles, teams
  const usersRes = await pool.query(`
    SELECT 
      u.id,
      u.full_name,
      u.phone,
      u.avatar_url,
      ${UNIFIED_TITLE_SQL} AS title,
      ${UNIFIED_TEAM_NAME_SQL} AS team_name
    FROM users u
    LEFT JOIN teams t ON u.team_id = t.id
    WHERE u.status IS DISTINCT FROM 'Tạm khóa'
  `);

  const userMapByPhone = new Map<string, { id: number; full_name: string; phone: string; avatar_url: string | null; title: string; team_name: string }>();
  const userMapByName = new Map<string, { id: number; full_name: string; phone: string; avatar_url: string | null; title: string; team_name: string }>();

  for (const u of usersRes.rows) {
    const cleanName = sanitizeVietnameseText(u.full_name);
    const cleanPhone = (u.phone || '').trim().replace(/\s+/g, '');
    const userObj = {
      id: u.id,
      full_name: cleanName,
      phone: cleanPhone,
      avatar_url: u.avatar_url || null,
      title: u.title || 'Thành viên',
      team_name: u.team_name || 'Ong Vàng',
    };
    if (cleanPhone) userMapByPhone.set(cleanPhone, userObj);
    if (cleanName) userMapByName.set(cleanName.toLowerCase(), userObj);
  }

  // Calculate monthly sales per person for continuity checks
  const personMonthSales = new Map<string, Map<string, number>>();
  for (const c of historyContractsRes.rows) {
    const closerName = sanitizeVietnameseText(c.closer_name);
    const closerPhone = (c.closer_phone || '').trim().replace(/\s+/g, '');
    const key = closerPhone || closerName.toLowerCase();
    if (!key) continue;

    // Use business month cutoff if 2026-09/10
    const dStr = c.contract_date.slice(0, 10);
    const m = dStr <= '2026-10-02' ? '2026-09' : dStr.slice(0, 7);

    if (!personMonthSales.has(key)) personMonthSales.set(key, new Map());
    const mSales = personMonthSales.get(key)!;
    mSales.set(m, (mSales.get(m) || 0) + Number(c.value || 0));
  }

  // 3. Aggregate Member Metrics for current effective period
  interface MemberAgg {
    name: string;
    phone: string;
    team: string;
    revenue: number;
    allocatedRevenue: number;
    closerFee: number;
    referrerFee: number;
    supporterFee: number;
    contractIds: Set<number>;
    monthlyBreakdown: Map<string, { revenue: number; commission: number; contracts: number }>;
  }

  const memberAggs = new Map<string, MemberAgg>();

  function getOrCreateAgg(name: string, phone: string, team: string): MemberAgg {
    const cleanName = sanitizeVietnameseText(name);
    const cleanPhone = (phone || '').trim().replace(/\s+/g, '');
    const key = cleanPhone || cleanName.toLowerCase();

    if (!memberAggs.has(key)) {
      memberAggs.set(key, {
        name: cleanName,
        phone: cleanPhone,
        team: team || 'Chưa gán đội',
        revenue: 0,
        allocatedRevenue: 0,
        closerFee: 0,
        referrerFee: 0,
        supporterFee: 0,
        contractIds: new Set(),
        monthlyBreakdown: new Map(),
      });
    }
    const existing = memberAggs.get(key)!;
    if (team && (!existing.team || existing.team === 'Chưa gán đội')) {
      existing.team = team;
    }
    return existing;
  }

  // Aggregate by contract
  for (const c of contractsRes.rows) {
    const rawVal = Number(c.value || 0);
    const allocVal = Number(c.allocated_value || 0);
    const cId = c.id;
    const dStr = c.contract_date.slice(0, 10);
    const m = dStr <= '2026-10-02' ? '2026-09' : dStr.slice(0, 7);

    // Closer (Direct Sale)
    if (c.closer_name) {
      const agg = getOrCreateAgg(c.closer_name, c.closer_phone, c.team_name);
      agg.revenue += rawVal;
      agg.allocatedRevenue += allocVal;
      agg.closerFee += Number(c.closer_fee || 0);
      agg.contractIds.add(cId);

      if (!agg.monthlyBreakdown.has(m)) agg.monthlyBreakdown.set(m, { revenue: 0, commission: 0, contracts: 0 });
      const mb = agg.monthlyBreakdown.get(m)!;
      mb.revenue += rawVal;
      mb.commission += Number(c.closer_fee || 0);
      mb.contracts += 1;
    }

    // Referrer (Connection)
    if (c.referrer_name) {
      const agg = getOrCreateAgg(c.referrer_name, c.referrer_phone, '');
      agg.referrerFee += Number(c.referrer_fee || 0);
      agg.contractIds.add(cId);

      if (!agg.monthlyBreakdown.has(m)) agg.monthlyBreakdown.set(m, { revenue: 0, commission: 0, contracts: 0 });
      const mb = agg.monthlyBreakdown.get(m)!;
      mb.commission += Number(c.referrer_fee || 0);
    }

    // Supporter (Support)
    if (c.supporter_name) {
      const agg = getOrCreateAgg(c.supporter_name, c.supporter_phone, '');
      agg.supporterFee += Number(c.supporter_fee || 0);
      agg.contractIds.add(cId);

      if (!agg.monthlyBreakdown.has(m)) agg.monthlyBreakdown.set(m, { revenue: 0, commission: 0, contracts: 0 });
      const mb = agg.monthlyBreakdown.get(m)!;
      mb.commission += Number(c.supporter_fee || 0);
    }
  }

  // 4. Transform into LeaderboardMember list & calculate promotions
  const memberList: LeaderboardMember[] = Array.from(memberAggs.values()).map((agg) => {
    const key = agg.phone || agg.name.toLowerCase();
    const user = (agg.phone && userMapByPhone.get(agg.phone)) || userMapByName.get(agg.name.toLowerCase());
    const finalTeam = user?.team_name || agg.team || 'Ong Vàng';
    const finalTitle = user?.title || 'Thành viên';
    const avatarUrl = user?.avatar_url || null;
    const totalCommission = Math.round(agg.closerFee + agg.referrerFee + agg.supporterFee);

    // Continuity calculation (check continuous months of sales)
    const historyMonths = getPreviousMonths(selectedMonth, 3);
    const mHistory = personMonthSales.get(key) || new Map();
    let consecutiveHighMonths = 0;
    for (const hm of historyMonths) {
      const mRev = mHistory.get(hm) || 0;
      if (mRev >= 50000000) { // Sales milestone >= 50M/month considered active
        consecutiveHighMonths++;
      }
    }

    // KPI and Competition Bonuses:
    // Thưởng KPI cá nhân: >= 1 tỷ -> 2.000.000 đ, >= 500 triệu -> 1.000.000 đ, dưới 500tr -> 0 đ
    let bonusKpi = 0;
    if (agg.revenue >= 1000000000) {
      bonusKpi = 2000000;
    } else if (agg.revenue >= 500000000) {
      bonusKpi = 1000000;
    }

    // Promotion evaluation
    // If maintained 3 consecutive months with strong performance
    const isDirectorEligible = (consecutiveHighMonths >= 3 && agg.revenue >= 1000000000) || agg.revenue >= 1500000000;
    const isManagerEligible = (consecutiveHighMonths >= 2 && agg.revenue >= 500000000) || agg.revenue >= 500000000;

    let promotionEvaluation = 'Thành viên';
    if (consecutiveHighMonths >= 3 && agg.revenue >= 500000000) {
      promotionEvaluation = '✓ Duy trì 3 tháng liên tục - Đạt chuẩn Giám đốc KD';
    } else if (isDirectorEligible) {
      promotionEvaluation = 'Đạt chuẩn Giám đốc KD';
    } else if (isManagerEligible) {
      promotionEvaluation = 'Đạt chuẩn Quản lý';
    } else if (agg.revenue >= 100000000) {
      promotionEvaluation = 'Tiềm năng thăng hạng';
    } else if (agg.revenue > 0) {
      promotionEvaluation = 'Thành viên tích cực';
    }

    const monthlyHistoryArr = historyMonths.map((hm) => ({
      month: hm,
      revenue: mHistory.get(hm) || 0,
      commission: 0,
      contracts: 0,
    }));

    return {
      rank: 0, // will assign after sorting
      userId: user?.id || null,
      name: agg.name,
      phone: agg.phone,
      avatarUrl,
      team: finalTeam,
      title: finalTitle,
      revenue: agg.revenue,
      allocatedRevenue: agg.allocatedRevenue,
      commission: totalCommission,
      contractCount: agg.contractIds.size,
      bonusThiDua: 0, // Top 1 will get 5.000.000 đ
      bonusKpi,
      promotionEvaluation,
      continuousMonthsCount: consecutiveHighMonths,
      isDirectorEligible,
      isManagerEligible,
      monthlyHistory: monthlyHistoryArr,
    };
  });

  // Sort by revenue desc, then commission desc, then contracts desc
  memberList.sort((a, b) => b.revenue - a.revenue || b.commission - a.commission || b.contractCount - a.contractCount);

  // Assign ranks & competition bonuses
  memberList.forEach((m, idx) => {
    m.rank = idx + 1;
    // Thưởng thi đua (Dự kiến): Top 1 = 5.000.000 đ
    if (m.rank === 1 && m.revenue > 0) {
      m.bonusThiDua = 5000000;
    }
  });

  // 5. Aggregate Teams
  const teamAggs = new Map<string, { revenue: number; contractCount: number; members: Set<string> }>();

  // Ensure default teams are present even with 0 sales
  const DEFAULT_TEAMS = ['Ong Vàng', 'Kiến Vàng', 'Happy', 'Lộc Phát', 'Thành Công', 'Biệt đội Kim Cương', 'Thịnh Vượng', 'Hải Đăng Vàng'];
  for (const t of DEFAULT_TEAMS) {
    teamAggs.set(t, { revenue: 0, contractCount: 0, members: new Set() });
  }

  for (const c of contractsRes.rows) {
    const rawVal = Number(c.value || 0);
    const tName = c.team_name || 'Chưa gán đội';
    if (!teamAggs.has(tName)) teamAggs.set(tName, { revenue: 0, contractCount: 0, members: new Set() });
    const ta = teamAggs.get(tName)!;
    ta.revenue += rawVal;
    ta.contractCount += 1;
    if (c.closer_name) ta.members.add(c.closer_name);
  }

  const teamList: LeaderboardTeam[] = Array.from(teamAggs.entries())
    .map(([teamName, data]) => {
      // Thưởng KPI nhóm: Doanh số >= 1.5 tỷ -> 1.000.000 đ
      const bonusKpi = data.revenue >= 1500000000 ? 1000000 : 0;
      return {
        rank: 0,
        teamName,
        revenue: data.revenue,
        contractCount: data.contractCount,
        memberCount: data.members.size,
        bonusThiDua: 0,
        bonusKpi,
      };
    })
    .sort((a, b) => b.revenue - a.revenue || b.contractCount - a.contractCount);

  teamList.forEach((t, idx) => {
    t.rank = idx + 1;
    // Thưởng thi đua nhóm: Top 1 Team = 10.000.000 đ
    if (t.rank === 1 && t.revenue > 0) {
      t.bonusThiDua = 10000000;
    }
  });

  const totalRevenue = memberList.reduce((sum, m) => sum + m.revenue, 0);
  const totalCommission = memberList.reduce((sum, m) => sum + m.commission, 0);
  const totalContracts = contractsRes.rows.length;

  return {
    month: selectedMonth,
    mode,
    startDate: effectiveStart,
    endDate: effectiveEnd,
    members: memberList,
    top3Members: memberList.slice(0, 3),
    teams: teamList,
    top3Teams: teamList.slice(0, 3),
    summary: {
      totalRevenue,
      totalCommission,
      totalContracts,
      totalMembers: memberList.length,
    },
  };
}
