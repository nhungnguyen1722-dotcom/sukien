import type { NextRequest } from 'next/server';
import pool from '@/lib/db';

export const TEAMLEAD_DEFAULT_RATE = 0.029;
export const TEAMLEAD_ROLE_ORDER = ['Giám đốc', 'Phó Giám đốc', 'Trưởng phòng'] as const;
const TEAMLEAD_ROLE_BASIS = [50, 30, 20];

let schemaPromise: Promise<void> | null = null;

export async function ensureTeamLeadSchema() {
  if (!schemaPromise) {
    schemaPromise = (async () => {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        await client.query(`
          CREATE TABLE IF NOT EXISTS teamlead_teams (
            id SERIAL PRIMARY KEY,
            name VARCHAR(160) NOT NULL,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
          )
        `);
        await client.query(`DO $$ BEGIN CREATE UNIQUE INDEX teamlead_teams_name_ci_idx ON teamlead_teams (LOWER(BTRIM(name))); EXCEPTION WHEN duplicate_table THEN NULL; END $$`);
        for (const name of ['Kiến Vàng', 'Ong Vàng', 'Lộc Phát', 'Thành Công', 'Biệt đội Kim Cương', 'Happy']) {
          await client.query(
            `INSERT INTO teamlead_teams (name)
             SELECT $1::varchar(160)
             WHERE NOT EXISTS (
               SELECT 1 FROM teamlead_teams WHERE LOWER(BTRIM(name)) = LOWER(BTRIM($1::varchar(160)))
             )`,
            [name]
          );
        }
        await client.query(`
          CREATE TABLE IF NOT EXISTS teamlead_members (
            id SERIAL PRIMARY KEY,
            month DATE NOT NULL,
            member_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
            member_name VARCHAR(255) NOT NULL,
            member_phone VARCHAR(60) NOT NULL,
            include_30 BOOLEAN NOT NULL DEFAULT FALSE,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            UNIQUE (month, member_phone)
          )
        `);
        await client.query(`
          CREATE TABLE IF NOT EXISTS teamlead_member_teams (
            id SERIAL PRIMARY KEY,
            member_id INTEGER NOT NULL REFERENCES teamlead_members(id) ON DELETE CASCADE,
            team_id INTEGER NOT NULL REFERENCES teamlead_teams(id) ON DELETE RESTRICT,
            role VARCHAR(80) NOT NULL DEFAULT 'Trưởng phòng',
            include_70 BOOLEAN NOT NULL DEFAULT TRUE,
            UNIQUE (member_id, team_id)
          )
        `);
        await client.query(`
          CREATE TABLE IF NOT EXISTS teamlead_week_eligibility (
            member_team_id INTEGER NOT NULL REFERENCES teamlead_member_teams(id) ON DELETE CASCADE,
            week_no SMALLINT NOT NULL CHECK (week_no BETWEEN 1 AND 5),
            include_70 BOOLEAN NOT NULL,
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            PRIMARY KEY (member_team_id, week_no)
          )
        `);
        await client.query(`
          CREATE TABLE IF NOT EXISTS teamlead_periods (
            id SERIAL PRIMARY KEY,
            month DATE NOT NULL,
            week_no SMALLINT NOT NULL DEFAULT 0 CHECK (week_no BETWEEN 0 AND 5),
            fund_rate NUMERIC(8,5) NOT NULL DEFAULT 0.029 CHECK (fund_rate >= 0 AND fund_rate <= 1),
            total_sales NUMERIC(18,2) NOT NULL DEFAULT 0,
            gross_fund NUMERIC(18,2) NOT NULL DEFAULT 0,
            fund_30 NUMERIC(18,2) NOT NULL DEFAULT 0,
            fund_70 NUMERIC(18,2) NOT NULL DEFAULT 0,
            is_locked BOOLEAN NOT NULL DEFAULT FALSE,
            locked_at TIMESTAMPTZ,
            is_imported BOOLEAN NOT NULL DEFAULT FALSE,
            source_file TEXT,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            UNIQUE (month, week_no)
          )
        `);
        await client.query(`
          CREATE TABLE IF NOT EXISTS teamlead_payout_rows (
            id SERIAL PRIMARY KEY,
            period_id INTEGER NOT NULL REFERENCES teamlead_periods(id) ON DELETE CASCADE,
            membership_id INTEGER REFERENCES teamlead_members(id) ON DELETE SET NULL,
            member_team_id INTEGER REFERENCES teamlead_member_teams(id) ON DELETE SET NULL,
            member_name VARCHAR(255) NOT NULL,
            member_phone VARCHAR(60) NOT NULL,
            team_id INTEGER REFERENCES teamlead_teams(id) ON DELETE SET NULL,
            team_name VARCHAR(160) NOT NULL DEFAULT '',
            role VARCHAR(80) NOT NULL DEFAULT '',
            eligible_30 BOOLEAN NOT NULL DEFAULT FALSE,
            eligible_70 BOOLEAN NOT NULL DEFAULT FALSE,
            sales_basis NUMERIC(18,2) NOT NULL DEFAULT 0,
            payout_30 NUMERIC(18,2) NOT NULL DEFAULT 0,
            payout_70 NUMERIC(18,2) NOT NULL DEFAULT 0,
            total_amount NUMERIC(18,2) NOT NULL DEFAULT 0,
            UNIQUE (period_id, member_phone, team_name)
          )
        `);
        await client.query(`DO $$ BEGIN CREATE INDEX teamlead_members_month_idx ON teamlead_members(month); EXCEPTION WHEN duplicate_table THEN NULL; END $$`);
        await client.query(`DO $$ BEGIN CREATE INDEX teamlead_payout_rows_period_idx ON teamlead_payout_rows(period_id); EXCEPTION WHEN duplicate_table THEN NULL; END $$`);
        // Bring existing contract team labels into the shared TeamLead list once.
        const legacyTeams = await client.query(`
          SELECT DISTINCT BTRIM(team_name) AS name
          FROM contracts
          WHERE NULLIF(BTRIM(team_name), '') IS NOT NULL
        `);
        for (const row of legacyTeams.rows) {
          const exists = await client.query(`SELECT 1 FROM teamlead_teams WHERE LOWER(BTRIM(name))=LOWER(BTRIM($1)) LIMIT 1`, [row.name]);
          if (!exists.rows.length) {
            try {
              await client.query(`INSERT INTO teamlead_teams (name) VALUES ($1)`, [row.name]);
            } catch (error: any) {
              if (error.code !== '23505') throw error;
            }
          }
        }
        await client.query('COMMIT');
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    })().catch((error) => {
      schemaPromise = null;
      throw error;
    });
  }
  return schemaPromise;
}

export function isTeamLeadAdmin(request: NextRequest) {
  let role = request.cookies.get('user_role')?.value || '';
  try {
    role = decodeURIComponent(role);
  } catch {
    // A malformed role cookie is treated as an ordinary non-admin role.
  }
  role = role.toLowerCase();
  return role === 'admin' || role.includes('admin') || role.includes('quản trị') || role.includes('quan tri');
}

export function getCurrentMonth(): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
  }).formatToParts(new Date());
  const year = parts.find((part) => part.type === 'year')?.value;
  const month = parts.find((part) => part.type === 'month')?.value;
  return year && month ? `${year}-${month}` : new Date().toISOString().slice(0, 7);
}

export function getCurrentWeekNo(): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Ho_Chi_Minh',
    day: 'numeric',
  }).formatToParts(new Date());
  const day = Number(parts.find((part) => part.type === 'day')?.value || new Date().getDate());
  return Math.min(5, Math.max(1, Math.ceil(day / 7)));
}

export function parseMonth(value: string | null | undefined) {
  if (!value || !/^\d{4}-\d{2}$/.test(value)) return null;
  const [year, month] = value.split('-').map(Number);
  if (month < 1 || month > 12 || year < 2000 || year > 2200) return null;
  return `${value}-01`;
}

export function monthKey(value: string | Date) {
  if (typeof value === 'string' && /^\d{4}-\d{2}/.test(value)) {
    return value.slice(0, 7);
  }
  const date = value instanceof Date ? value : new Date(value);
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
  }).formatToParts(date);
  const year = parts.find((part) => part.type === 'year')?.value;
  const month = parts.find((part) => part.type === 'month')?.value;
  return year && month ? `${year}-${month}` : date.toISOString().slice(0, 7);
}

function monthBounds(month: string) {
  const start = new Date(`${month}T00:00:00.000Z`);
  const end = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 1));
  return { start: month, end: end.toISOString().slice(0, 10) };
}

function periodBounds(month: string, weekNo: number) {
  const bounds = monthBounds(month);
  if (!weekNo) return bounds;
  const [year, monthNumber] = month.slice(0, 7).split('-').map(Number);
  const startDay = (weekNo - 1) * 7 + 1;
  const endDay = Math.min(weekNo * 7 + 1, new Date(Date.UTC(year, monthNumber, 0)).getUTCDate() + 1);
  const start = new Date(Date.UTC(year, monthNumber - 1, startDay)).toISOString().slice(0, 10);
  const end = new Date(Date.UTC(year, monthNumber - 1, endDay)).toISOString().slice(0, 10);
  return { start, end };
}

function getWeekNo(contractDate: string) {
  const day = new Date(`${contractDate.slice(0, 10)}T00:00:00.000Z`).getUTCDate();
  return Math.min(5, Math.ceil(day / 7));
}

function amount(value: unknown) {
  const number = Number(value || 0);
  return Number.isFinite(number) ? Math.round(number) : 0;
}

function splitEvenly(total: number, count: number) {
  if (!count) return [];
  const base = Math.floor(total / count);
  let remainder = total - base * count;
  return Array.from({ length: count }, () => {
    const extra = remainder > 0 ? 1 : 0;
    remainder -= extra;
    return base + extra;
  });
}

function canonicalRole(role: string) {
  const normalized = role.trim().toLocaleLowerCase('vi-VN');
  if (normalized.includes('giám đốc') && (normalized.startsWith('p.') || normalized.includes('phó'))) return 'Phó Giám đốc';
  if (normalized.includes('giám đốc')) return 'Giám đốc';
  if (normalized.includes('trưởng phòng')) return 'Trưởng phòng';
  return '';
}

type RosterMember = {
  membershipId: number;
  userId: number | null;
  name: string;
  phone: string;
  include30: boolean;
  teams: Array<{
    memberTeamId: number;
    teamId: number;
    teamName: string;
    role: string;
    include70Default: boolean;
    include70: boolean;
  }>;
};

type AllocationRow = {
  membershipId: number | null;
  memberId: number | null;
  memberTeamId: number | null;
  memberName: string;
  memberPhone: string;
  teamId: number | null;
  teamName: string;
  role: string;
  eligible30: boolean;
  eligible70: boolean;
  salesBasis: number;
  payout30: number;
  payout70: number;
  total: number;
};

async function loadRoster(month: string, weekNo = 0, db: typeof pool = pool): Promise<RosterMember[]> {
  const result = await db.query(
    `
      SELECT m.id AS membership_id, m.member_id AS user_id, m.member_name, m.member_phone, m.include_30,
        mt.id AS member_team_id, mt.team_id, t.name AS team_name, mt.role, mt.include_70 AS include_70_default,
        we.include_70 AS include_70_week
      FROM teamlead_members m
      LEFT JOIN teamlead_member_teams mt ON mt.member_id = m.id
      LEFT JOIN teamlead_teams t ON t.id = mt.team_id
      LEFT JOIN teamlead_week_eligibility we ON we.member_team_id = mt.id AND we.week_no = $2
      WHERE m.month = $1
      ORDER BY m.member_name, t.name
    `,
    [month, weekNo]
  );
  const byId = new Map<number, RosterMember>();
  for (const row of result.rows) {
    const id = Number(row.membership_id);
    let member = byId.get(id);
    if (!member) {
      member = {
        membershipId: id,
        userId: row.user_id === null ? null : Number(row.user_id),
        name: row.member_name,
        phone: row.member_phone,
        include30: Boolean(row.include_30),
        teams: [],
      };
      byId.set(id, member);
    }
    if (row.member_team_id !== null) {
      member.teams.push({
        memberTeamId: Number(row.member_team_id),
        teamId: Number(row.team_id),
        teamName: row.team_name,
        role: row.role,
        include70Default: Boolean(row.include_70_default),
        include70: row.include_70_week === null ? Boolean(row.include_70_default) : Boolean(row.include_70_week),
      });
    }
  }
  return Array.from(byId.values());
}

async function loadContracts(month: string, db: typeof pool = pool) {
  const { start, end } = monthBounds(month);
  const result = await db.query(
    `
      SELECT id, contract_code, customer_name, contract_date::text AS contract_date,
        COALESCE(value, 0)::float8 AS value, BTRIM(COALESCE(team_name, '')) AS team_name,
        COALESCE(contract_type, '') AS contract_type
      FROM contracts
      WHERE contract_date >= $1::date AND contract_date < $2::date
      ORDER BY contract_date, id
    `,
    [start, end]
  );
  return result.rows.map((row) => ({ ...row, id: Number(row.id), value: amount(row.value), team_name: row.team_name || '' }));
}

function rowFor(member: RosterMember, team?: RosterMember['teams'][number]): AllocationRow {
  return {
    membershipId: member.membershipId,
    memberId: member.userId,
    memberTeamId: team?.memberTeamId ?? null,
    memberName: member.name,
    memberPhone: member.phone,
    teamId: team?.teamId ?? null,
    teamName: team?.teamName ?? '',
    role: team?.role ?? '',
    eligible30: member.include30,
    eligible70: team?.include70 ?? false,
    salesBasis: 0,
    payout30: 0,
    payout70: 0,
    total: 0,
  };
}

function teamSalesFor(contracts: Awaited<ReturnType<typeof loadContracts>>, weekNo: number) {
  const sales = new Map<string, number>();
  for (const contract of contracts) {
    if (weekNo && getWeekNo(contract.contract_date) !== weekNo) continue;
    if (!contract.team_name) continue;
    sales.set(contract.team_name.toLocaleLowerCase('vi-VN'), (sales.get(contract.team_name.toLocaleLowerCase('vi-VN')) || 0) + contract.value);
  }
  return sales;
}

function distributeRolePool(
  poolAmount: number,
  candidates: Array<{ memberTeamId: number; role: string }>
) {
  const amounts = new Map<number, number>();
  if (!poolAmount || !candidates.length) return amounts;
  const groups = new Map<string, Array<{ memberTeamId: number; role: string }>>();
  for (const candidate of candidates) {
    const role = canonicalRole(candidate.role);
    if (!role) continue;
    groups.set(role, [...(groups.get(role) || []), candidate]);
  }
  if (!groups.size) return amounts;
  const groupWeights = new Map<string, number>();
  TEAMLEAD_ROLE_ORDER.forEach((role, index) => {
    let target = role;
    if (!groups.has(role)) {
      const active = TEAMLEAD_ROLE_ORDER
        .filter((candidate) => groups.has(candidate))
        .sort((a, b) => {
          const distanceA = Math.abs(TEAMLEAD_ROLE_ORDER.indexOf(a) - index);
          const distanceB = Math.abs(TEAMLEAD_ROLE_ORDER.indexOf(b) - index);
          return distanceA - distanceB || TEAMLEAD_ROLE_ORDER.indexOf(a) - TEAMLEAD_ROLE_ORDER.indexOf(b);
        });
      target = active[0];
    }
    groupWeights.set(target, (groupWeights.get(target) || 0) + TEAMLEAD_ROLE_BASIS[index]);
  });
  const weightedGroups = Array.from(groupWeights.entries());
  let distributedGroups = 0;
  for (let groupIndex = 0; groupIndex < weightedGroups.length; groupIndex += 1) {
    const [role, weight] = weightedGroups[groupIndex];
    const groupAmount = groupIndex === weightedGroups.length - 1
      ? poolAmount - distributedGroups
      : Math.floor((poolAmount * weight) / 100);
    distributedGroups += groupAmount;
    const people = groups.get(role) || [];
    splitEvenly(groupAmount, people.length).forEach((share, personIndex) => {
      const memberTeamId = people[personIndex].memberTeamId;
      amounts.set(memberTeamId, (amounts.get(memberTeamId) || 0) + share);
    });
  }
  return amounts;
}

async function readLockedPeriod(month: string, weekNo: number, db: typeof pool = pool) {
  const periodResult = await db.query(
    `SELECT * FROM teamlead_periods WHERE month = $1 AND week_no = $2 AND is_locked = TRUE LIMIT 1`,
    [month, weekNo]
  );
  if (!periodResult.rows.length) return null;
  const period = periodResult.rows[0];
  const rowResult = await db.query(
    `SELECT * FROM teamlead_payout_rows WHERE period_id = $1 ORDER BY member_name, team_name`,
    [period.id]
  );
  return {
    period,
    rows: rowResult.rows.map((row) => ({
      membershipId: row.membership_id === null ? null : Number(row.membership_id),
      memberId: null,
      memberTeamId: row.member_team_id === null ? null : Number(row.member_team_id),
      memberName: row.member_name,
      memberPhone: row.member_phone,
      teamId: row.team_id === null ? null : Number(row.team_id),
      teamName: row.team_name || '',
      role: row.role || '',
      eligible30: Boolean(row.eligible_30),
      eligible70: Boolean(row.eligible_70),
      salesBasis: amount(row.sales_basis),
      payout30: amount(row.payout_30),
      payout70: amount(row.payout_70),
      total: amount(row.total_amount),
    })),
  };
}

function allocationMeta(rows: AllocationRow[], totalSales: number, rate: number, fund30: number, fund70: number, period: any) {
  const total30 = rows.reduce((sum, row) => sum + row.payout30, 0);
  const total70 = rows.reduce((sum, row) => sum + row.payout70, 0);
  return {
    rows,
    meta: {
      totalSales,
      fundRate: rate,
      grossFund: amount(totalSales * rate),
      fund30,
      fund70,
      paid30: total30,
      paid70: total70,
      locked: Boolean(period?.is_locked),
      imported: Boolean(period?.is_imported),
      lockedAt: period?.locked_at || null,
      sourceFile: period?.source_file || null,
    },
  };
}

async function calculateWeekRows(
  month: string,
  weekNo: number,
  rate: number,
  monthlyFund30: number,
  contracts: Awaited<ReturnType<typeof loadContracts>>,
  roster: RosterMember[],
  db: typeof pool = pool
) {
  const locked = await readLockedPeriod(month, weekNo, db);
  if (locked) return locked.rows;
  const weekContracts = contracts.filter((contract) => getWeekNo(contract.contract_date) === weekNo);
  const weekSales = teamSalesFor(weekContracts, 0);
  const totalSales = weekContracts.reduce((sum, contract) => sum + contract.value, 0);
  const grossFund = amount(totalSales * rate);
  const fund70 = amount(grossFund * 0.7);
  const teamTotal = Array.from(weekSales.values()).reduce((sum, value) => sum + value, 0);
  const teamPools = new Map<string, number>();
  let assignedPool = 0;
  const teamEntries = Array.from(weekSales.entries());
  teamEntries.forEach(([key, sales], index) => {
    const teamPool = index === teamEntries.length - 1
      ? fund70 - assignedPool
      : teamTotal ? Math.floor((fund70 * sales) / teamTotal) : 0;
    assignedPool += teamPool;
    teamPools.set(key, teamPool);
  });

  const payouts = new Map<number, number>();
  const salesByTeam = new Map<string, number>();
  for (const member of roster) {
    for (const team of member.teams) {
      const key = team.teamName.toLocaleLowerCase('vi-VN');
      salesByTeam.set(key, weekSales.get(key) || 0);
    }
  }
  for (const [teamKey, teamPool] of teamPools) {
    const candidates = roster.flatMap((member) => member.teams
      .filter((team) => team.teamName.toLocaleLowerCase('vi-VN') === teamKey && team.include70)
      .map((team) => ({ memberTeamId: team.memberTeamId, role: team.role })));
    for (const [memberTeamId, payout] of distributeRolePool(teamPool, candidates)) payouts.set(memberTeamId, payout);
  }

  const rows = roster.flatMap((member) => {
    const outputTeams = member.teams.length ? member.teams : [undefined];
    return outputTeams.map((team) => {
      const row = rowFor(member, team);
      const key = team?.teamName.toLocaleLowerCase('vi-VN') || '';
      row.salesBasis = team ? salesByTeam.get(key) || 0 : 0;
      row.payout70 = team ? payouts.get(team.memberTeamId) || 0 : 0;
      return row;
    });
  });

  const monthlyMembers = roster.filter((member) => member.include30).sort((a, b) => a.name.localeCompare(b.name, 'vi'));
  const monthlyShares = splitEvenly(monthlyFund30, monthlyMembers.length);
  const shareByMember = new Map(monthlyMembers.map((member, index) => [member.membershipId, monthlyShares[index]]));
  const seen30 = new Set<number>();
  for (const row of rows) {
    if (row.eligible30 && row.membershipId !== null && !seen30.has(row.membershipId)) {
      row.payout30 = shareByMember.get(row.membershipId) || 0;
      seen30.add(row.membershipId);
    }
    row.total = row.payout70;
  }
  return rows;
}

export async function getTeamLeadAllocation(month: string, weekNo: number, db: typeof pool = pool, rateOverride?: number) {
  await ensureTeamLeadSchema();
  const locked = await readLockedPeriod(month, weekNo, db);
  if (locked) {
    const period = locked.period;
    return allocationMeta(
      locked.rows,
      amount(period.total_sales),
      Number(period.fund_rate),
      amount(period.fund_30),
      amount(period.fund_70),
      period
    );
  }

  const contracts = await loadContracts(month, db);
  const roster = await loadRoster(month, weekNo, db);
  const monthPeriodResult = await db.query(`SELECT * FROM teamlead_periods WHERE month = $1 AND week_no = 0 LIMIT 1`, [month]);
  const selectedPeriodResult = weekNo
    ? await db.query(`SELECT * FROM teamlead_periods WHERE month = $1 AND week_no = $2 LIMIT 1`, [month, weekNo])
    : monthPeriodResult;
  const monthPeriod = monthPeriodResult.rows[0] || null;
  const selectedPeriod = selectedPeriodResult.rows[0] || null;
  const rate = Number(rateOverride ?? selectedPeriod?.fund_rate ?? monthPeriod?.fund_rate ?? TEAMLEAD_DEFAULT_RATE);
  const monthSales = contracts.reduce((sum, contract) => sum + contract.value, 0);
  const monthGross = amount(monthSales * rate);
  const monthlyFund30 = amount(monthGross * 0.3);
  const monthlyFund70 = amount(monthGross * 0.7);

  if (weekNo) {
    const rows = await calculateWeekRows(month, weekNo, rate, monthlyFund30, contracts, roster, db);
    const weekBounds = periodBounds(month, weekNo);
    const weekSales = contracts
      .filter((contract) => contract.contract_date >= weekBounds.start && contract.contract_date < weekBounds.end)
      .reduce((sum, contract) => sum + contract.value, 0);
    return allocationMeta(rows, weekSales, rate, monthlyFund30, amount(amount(weekSales * rate) * 0.7), null);
  }

  const rows = roster.flatMap((member) => (member.teams.length ? member.teams : [undefined]).map((team) => rowFor(member, team)));
  const monthMembers = roster.filter((member) => member.include30).sort((a, b) => a.name.localeCompare(b.name, 'vi'));
  const monthShares = splitEvenly(monthlyFund30, monthMembers.length);
  const monthShareByMember = new Map(monthMembers.map((member, index) => [member.membershipId, monthShares[index]]));
  const used30 = new Set<number>();
  for (const row of rows) {
    if (row.eligible30 && row.membershipId !== null && !used30.has(row.membershipId)) {
      row.payout30 = monthShareByMember.get(row.membershipId) || 0;
      used30.add(row.membershipId);
    }
  }
  for (let week = 1; week <= 5; week += 1) {
    const weekRows = await calculateWeekRows(month, week, rate, monthlyFund30, contracts, await loadRoster(month, week, db), db);
    const weekPayouts = new Map<string, number>();
    for (const row of weekRows) {
      if (!row.memberTeamId) continue;
      const key = String(row.memberTeamId);
      weekPayouts.set(key, (weekPayouts.get(key) || 0) + row.payout70);
    }
    for (const row of rows) {
      if (row.memberTeamId) row.payout70 += weekPayouts.get(String(row.memberTeamId)) || 0;
    }
  }
  for (const row of rows) row.total = row.payout30 + row.payout70;
  const monthlyLocked = await readLockedPeriod(month, 0, db);
  if (monthlyLocked) {
    return allocationMeta(
      monthlyLocked.rows,
      amount(monthlyLocked.period.total_sales),
      Number(monthlyLocked.period.fund_rate),
      amount(monthlyLocked.period.fund_30),
      amount(monthlyLocked.period.fund_70),
      monthlyLocked.period
    );
  }
  return allocationMeta(rows, monthSales, rate, monthlyFund30, monthlyFund70, monthPeriod);
}

export async function getTeamLeadContractBreakdown(month: string, contractId: number, db: typeof pool = pool) {
  await ensureTeamLeadSchema();
  const result = await db.query(
    `SELECT id, contract_code, customer_name, contract_date::text AS contract_date,
      COALESCE(value, 0)::float8 AS value, BTRIM(COALESCE(team_name, '')) AS team_name
     FROM contracts WHERE id = $1`,
    [contractId]
  );
  if (!result.rows.length) return null;
  const contract = result.rows[0];
  const contractMonth = `${monthKey(contract.contract_date)}-01`;
  const weekNo = getWeekNo(contract.contract_date);
  const roster = await loadRoster(contractMonth, weekNo, db);
  const membershipResult = await db.query(`SELECT fund_rate FROM teamlead_periods WHERE month = $1 AND week_no = $2 LIMIT 1`, [contractMonth, weekNo]);
  const monthRateResult = await db.query(`SELECT fund_rate FROM teamlead_periods WHERE month = $1 AND week_no = 0 LIMIT 1`, [contractMonth]);
  const rate = Number(membershipResult.rows[0]?.fund_rate || monthRateResult.rows[0]?.fund_rate || TEAMLEAD_DEFAULT_RATE);
  const teamKey = String(contract.team_name || '').trim().toLocaleLowerCase('vi-VN');
  const teamMembers = roster.flatMap((member) => member.teams
    .filter((team) => team.teamName.toLocaleLowerCase('vi-VN') === teamKey && team.include70)
    .map((team) => ({ membershipId: member.membershipId, memberTeamId: team.memberTeamId, memberName: member.name, memberPhone: member.phone, teamName: team.teamName, role: team.role })));
  const individualFund = amount(Number(contract.value) * rate * 0.7);
  const lockedWeek = await readLockedPeriod(contractMonth, weekNo, db);
  const teamSnapshot = lockedWeek?.rows.filter((row) => row.teamName.toLocaleLowerCase('vi-VN') === teamKey && row.eligible70 && row.payout70 > 0) || [];
  const snapshotTotal = teamSnapshot.reduce((sum, row) => sum + row.payout70, 0);
  let allocations70: Array<{ memberName: string; memberPhone: string; teamName: string; role: string; payout: number }>;
  if (snapshotTotal > 0) {
    allocations70 = [];
    let distributed = 0;
    teamSnapshot.forEach((row, index) => {
      const share = index === teamSnapshot.length - 1
        ? individualFund - distributed
        : Math.floor((individualFund * row.payout70) / snapshotTotal);
      distributed += share;
      allocations70.push({ memberName: row.memberName, memberPhone: row.memberPhone, teamName: row.teamName, role: row.role, payout: share });
    });
  } else {
    const shares = distributeRolePool(individualFund, teamMembers.map((member) => ({ memberTeamId: member.memberTeamId, role: member.role })));
    allocations70 = teamMembers.map((member) => ({
      memberName: member.memberName,
      memberPhone: member.memberPhone,
      teamName: member.teamName,
      role: member.role,
      payout: shares.get(member.memberTeamId) || 0,
    }));
  }
  const monthly = await getTeamLeadAllocation(contractMonth, 0, db);
  return {
    contract: {
      id: Number(contract.id),
      contractCode: contract.contract_code,
      customerName: contract.customer_name,
      contractDate: contract.contract_date,
      value: amount(contract.value),
      teamName: contract.team_name || '',
      weekNo,
    },
    fundRate: rate,
    allocations70,
    allocations30: monthly.rows
      .filter((row) => row.eligible30 && row.payout30 > 0)
      .map((row) => ({ memberName: row.memberName, memberPhone: row.memberPhone, payout: row.payout30 })),
  };
}

export async function getTeamLeadReports(month: string, db: typeof pool = pool) {
  await ensureTeamLeadSchema();
  const { start, end } = monthBounds(month);
  const [periodsResult, contractsResult, allocation] = await Promise.all([
    db.query(`SELECT * FROM teamlead_periods WHERE month = $1 ORDER BY week_no`, [month]),
    db.query(
      `SELECT id, contract_code, customer_name, contract_date::text AS contract_date,
        COALESCE(value, 0)::float8 AS value, BTRIM(COALESCE(team_name, '')) AS team_name,
        COALESCE(contract_type, '') AS contract_type
       FROM contracts WHERE contract_date >= $1::date AND contract_date < $2::date
       ORDER BY contract_date, id`,
      [start, end]
    ),
    getTeamLeadAllocation(month, 0, db),
  ]);
  return {
    periods: periodsResult.rows.map((period) => ({
      month: monthKey(period.month),
      weekNo: Number(period.week_no),
      isLocked: Boolean(period.is_locked),
      isImported: Boolean(period.is_imported),
      lockedAt: period.locked_at || null,
      sourceFile: period.source_file || null,
      totalSales: amount(period.total_sales),
      grossFund: amount(period.gross_fund),
      fund30: amount(period.fund_30),
      fund70: amount(period.fund_70),
      fundRate: Number(period.fund_rate),
    })),
    contracts: contractsResult.rows.map((row) => ({
      ...row,
      id: Number(row.id),
      value: amount(row.value),
      weekNo: getWeekNo(row.contract_date),
    })),
    monthPayouts: allocation.rows,
  };
}

export async function lockTeamLeadPeriod(month: string, weekNo: number, fundRate: number) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const existingPeriod = await client.query(
      `SELECT * FROM teamlead_periods WHERE month=$1 AND week_no=$2 FOR UPDATE`,
      [month, weekNo]
    );
    let period: any;
    if (existingPeriod.rows.length) {
      period = existingPeriod.rows[0];
      if (!period.is_locked) {
        const updated = await client.query(
          `UPDATE teamlead_periods SET fund_rate=$3 WHERE id=$1 AND month=$2 RETURNING *`,
          [period.id, month, fundRate]
        );
        period = updated.rows[0];
      }
    } else {
      const inserted = await client.query(
        `INSERT INTO teamlead_periods (month, week_no, fund_rate) VALUES ($1,$2,$3) RETURNING *`,
        [month, weekNo, fundRate]
      );
      period = inserted.rows[0];
    }
    if (period.is_locked) {
      await client.query('ROLLBACK');
      return { error: 'Kỳ này đã chốt và đang ở chế độ chỉ đọc.' };
    }
    const allocation = await getTeamLeadAllocation(month, weekNo, client as any);
    const lockedAt = new Date().toISOString();
    await client.query(`DELETE FROM teamlead_payout_rows WHERE period_id = $1`, [period.id]);
    for (const row of allocation.rows) {
      await client.query(
        `INSERT INTO teamlead_payout_rows (
          period_id, membership_id, member_team_id, member_name, member_phone, team_id, team_name, role,
          eligible_30, eligible_70, sales_basis, payout_30, payout_70, total_amount
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`,
        [period.id, row.membershipId, row.memberTeamId, row.memberName, row.memberPhone, row.teamId, row.teamName, row.role,
          row.eligible30, row.eligible70, row.salesBasis, row.payout30, row.payout70, weekNo ? row.payout70 : row.total]
      );
    }
    const totalSales = allocation.meta.totalSales;
    const grossFund = amount(totalSales * fundRate);
    await client.query(
      `UPDATE teamlead_periods SET fund_rate = $2, total_sales = $3, gross_fund = $4, fund_30 = $5, fund_70 = $6,
         is_locked = TRUE, locked_at = $7 WHERE id = $1`,
      [period.id, fundRate, totalSales, grossFund, allocation.meta.fund30, allocation.meta.fund70, lockedAt]
    );
    await client.query('COMMIT');
    return { periodId: Number(period.id), lockedAt };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function saveImportedPeriod(input: {
  month: string;
  weekNo: number;
  sourceFile: string;
  fundRate: number;
  totalSales: number;
  grossFund: number;
  fund30: number;
  fund70: number;
  rows: Array<{
    memberName: string;
    memberPhone: string;
    teamName: string;
    role: string;
    eligible30: boolean;
    eligible70: boolean;
    salesBasis: number;
    payout30: number;
    payout70: number;
    total: number;
  }>;
}, db: typeof pool = pool) {
  const prior = await db.query(`SELECT id FROM teamlead_periods WHERE month=$1 AND week_no=$2 LIMIT 1`, [input.month, input.weekNo]);
  let periodId: number;
  if (prior.rows.length) {
    periodId = Number(prior.rows[0].id);
    await db.query(
      `UPDATE teamlead_periods SET fund_rate=$2, total_sales=$3, gross_fund=$4, fund_30=$5, fund_70=$6,
         is_locked=TRUE, locked_at=COALESCE(locked_at,NOW()), is_imported=TRUE, source_file=$7 WHERE id=$1`,
      [periodId, input.fundRate, input.totalSales, input.grossFund, input.fund30, input.fund70, input.sourceFile]
    );
  } else {
    const inserted = await db.query(
      `INSERT INTO teamlead_periods (month, week_no, fund_rate, total_sales, gross_fund, fund_30, fund_70, is_locked, locked_at, is_imported, source_file)
       VALUES ($1,$2,$3,$4,$5,$6,$7,TRUE,NOW(),TRUE,$8) RETURNING id`,
      [input.month, input.weekNo, input.fundRate, input.totalSales, input.grossFund, input.fund30, input.fund70, input.sourceFile]
    );
    periodId = Number(inserted.rows[0].id);
  }
  await db.query(`DELETE FROM teamlead_payout_rows WHERE period_id = $1`, [periodId]);
  for (const row of input.rows) {
    const membershipResult = await db.query(
      `SELECT m.id AS membership_id, mt.id AS member_team_id, t.id AS team_id
       FROM teamlead_members m
       JOIN teamlead_member_teams mt ON mt.member_id = m.id
       JOIN teamlead_teams t ON t.id = mt.team_id AND LOWER(BTRIM(t.name)) = LOWER(BTRIM($3))
       WHERE m.month = $1 AND m.member_phone = $2 LIMIT 1`,
      [input.month, row.memberPhone, row.teamName]
    );
    const membership = membershipResult.rows[0];
    await db.query(
      `INSERT INTO teamlead_payout_rows (period_id, membership_id, member_team_id, member_name, member_phone, team_id, team_name, role,
        eligible_30, eligible_70, sales_basis, payout_30, payout_70, total_amount)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`,
      [periodId, membership?.membership_id || null, membership?.member_team_id || null, row.memberName, row.memberPhone,
        membership?.team_id || null, row.teamName, row.role, row.eligible30, row.eligible70, row.salesBasis,
        row.payout30, row.payout70, row.total]
    );
  }
  return periodId;
}

export async function getTeamLeadRoster(month: string, weekNo = 0) {
  await ensureTeamLeadSchema();
  const [roster, teamsResult, usersResult, periodsResult] = await Promise.all([
    loadRoster(month, weekNo),
    pool.query(`SELECT id, name FROM teamlead_teams ORDER BY name`),
    pool.query(`SELECT id, full_name, phone, team_name, title FROM users WHERE COALESCE(status, '') <> 'Tạm khóa' ORDER BY full_name`),
    pool.query(`SELECT week_no, is_locked, is_imported FROM teamlead_periods WHERE month = $1`, [month]),
  ]);
  return {
    roster,
    teams: teamsResult.rows.map((row) => ({ id: Number(row.id), name: row.name })),
    users: usersResult.rows.map((row) => ({
      id: Number(row.id),
      name: row.full_name,
      phone: row.phone || '',
      team_name: row.team_name || '',
      title: row.title || '',
    })),
    periods: periodsResult.rows.map((row) => ({ weekNo: Number(row.week_no), locked: Boolean(row.is_locked), imported: Boolean(row.is_imported) })),
  };
}

export async function getLatestImportedTeamLeadPeriod(month?: string) {
  await ensureTeamLeadSchema();
  const normalizedMonth = month ? (month.length === 7 ? `${month}-01` : month) : undefined;
  const result = await pool.query(
    `SELECT month, week_no FROM teamlead_periods
     WHERE is_imported = TRUE ${normalizedMonth ? 'AND month = $1' : ''}
     ORDER BY month DESC, week_no DESC LIMIT 1`,
    normalizedMonth ? [normalizedMonth] : []
  );
  if (!result.rows.length) return null;
  return {
    month: monthKey(result.rows[0].month),
    weekNo: Number(result.rows[0].week_no),
  };
}
