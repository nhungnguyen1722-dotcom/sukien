import pool from '@/lib/db';
import { getTeamLeadAllocation, parseMonth } from '@/lib/teamlead';

export interface MasterPerson {
  name: string;
  phone: string;
  bankAccount: string;
  bankName: string;
  teamName: string;
  saleCommission: number;
  teamLeadBonus: number;
  operationsBonus: number;
  eventTrainingBonus: number;
  totalAmount: number;
  note: string;
}

export interface ContractItem {
  id: number;
  contract_code: string;
  contract_date: string;
  customer_name: string;
  value: number;
  allocated_value: number;
  contract_type: string;
  team_name: string;
  closer_name: string;
  closer_phone: string;
  closer_fee: number;
  referrer_name: string;
  referrer_phone: string;
  referrer_fee: number;
  supporter_name: string;
  supporter_phone: string;
  supporter_fee: number;
  status: string;
}

export interface TeamLeadBonusItem {
  memberName: string;
  memberPhone: string;
  role: string;
  teamName: string;
  payout70: number;
  payout30: number;
  total: number;
}

export interface OperationLogItem {
  id: number;
  request_code: string;
  request_date: string;
  payment_date: string;
  fund_source: string;
  detail_content: string;
  beneficiary_name: string;
  beneficiary_phone: string;
  beneficiary_bank_account: string;
  beneficiary_bank_name: string;
  amount: number;
  status: string;
}

export interface AllFundsReportData {
  targetMonth: string;
  masterList: MasterPerson[];
  contracts: ContractItem[];
  teamLeadRows: TeamLeadBonusItem[];
  logs: OperationLogItem[];
  eventExpenses: any[];
  summary: {
    totalAmount: number;
    sumSale: number;
    sumTeamLead: number;
    sumOps: number;
    sumEvent: number;
    personCount: number;
    contractCount: number;
    teamLeadCount: number;
    logCount: number;
  };
}

function normalizeName(val?: string | null): string {
  return (val || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/gi, 'd')
    .replace(/\s+/g, ' ');
}

function normalizePhone(val?: string | null): string {
  return (val || '').replace(/\D/g, '');
}

export async function getAllFundsReportData(inputMonth?: string | null): Promise<AllFundsReportData> {
  const month = inputMonth || '2026-10';
  const parsed = parseMonth(month) || '2026-10-01';
  const targetMonth = parsed.slice(0, 7);

  // 1. Lấy thông tin tài khoản ngân hàng từ users
  const usersRes = await pool.query(`
    SELECT u.id, u.full_name, u.phone, u.bank_account, u.bank_name,
           COALESCE(t.name, u.team_name, '') AS team_name
    FROM users u
    LEFT JOIN teams t ON u.team_id = t.id
    ORDER BY u.full_name ASC
  `);

  const usersByPhone = new Map<string, any>();
  const usersByName = new Map<string, any>();
  for (const u of usersRes.rows) {
    const p = normalizePhone(u.phone);
    if (p) usersByPhone.set(p, u);
    const n = normalizeName(u.full_name);
    if (n) usersByName.set(n, u);
  }

  // 2. Lấy dữ liệu Quỹ TeamLead (toàn tháng weekNo = 0)
  let rawTeamLeadRows: any[] = [];
  try {
    const allocation = await getTeamLeadAllocation(parsed, 0, pool);
    rawTeamLeadRows = allocation?.rows || [];
  } catch (err) {
    console.error('Could not fetch teamlead allocation for month:', parsed, err);
  }

  const teamLeadRows: TeamLeadBonusItem[] = rawTeamLeadRows.map((r: any) => ({
    memberName: r.memberName || '',
    memberPhone: r.memberPhone || '',
    role: r.role || '',
    teamName: r.teamName || '',
    payout70: Number(r.payout70 || 0),
    payout30: Number(r.payout30 || 0),
    total: Number(r.total || (Number(r.payout30 || 0) + Number(r.payout70 || 0))),
  }));

  // 3. Lấy dữ liệu Hợp đồng & Hoa hồng sale trực tiếp
  const contractsRes = await pool.query(
    `
    SELECT c.id, c.contract_code, c.contract_date::text AS contract_date, c.customer_name,
      c.value::float8 AS value,
      COALESCE(c.allocated_value, c.value, 0)::float8 AS allocated_value,
      c.contract_type, c.team_name,
      c.closer_name, c.closer_phone, COALESCE(c.closer_fee, 0)::float8 AS closer_fee,
      c.referrer_name, c.referrer_phone, COALESCE(c.referrer_fee, 0)::float8 AS referrer_fee,
      c.supporter_name, c.supporter_phone, COALESCE(c.supporter_fee, 0)::float8 AS supporter_fee,
      c.status
    FROM contracts c
    WHERE c.contract_date IS NOT NULL AND c.contract_date::text LIKE $1 || '%'
    ORDER BY c.contract_date ASC, c.id ASC
    `,
    [targetMonth]
  );
  const contracts: ContractItem[] = contractsRes.rows;

  // 4. Lấy dữ liệu Quỹ Vận hành & Ban hỗ trợ (từ transaction_logs)
  const logsRes = await pool.query(
    `
    SELECT tl.id, tl.request_code, tl.request_date::text AS request_date, tl.fund_source, tl.detail_content,
      tl.beneficiary_name, tl.beneficiary_phone, tl.beneficiary_bank_account, tl.beneficiary_bank_name,
      COALESCE(tl.actual_expense, tl.proposed_amount, 0)::float8 AS amount,
      tl.status, tl.payment_date::text AS payment_date
    FROM transaction_logs tl
    WHERE (
      tl.payment_date::text LIKE $1 || '%' 
      OR (tl.payment_date IS NULL AND tl.request_date::text LIKE $1 || '%')
    )
    ORDER BY tl.id ASC
    `,
    [targetMonth]
  );
  const logs: OperationLogItem[] = logsRes.rows;

  // 5. Lấy dữ liệu Thù lao Đào tạo & Sự kiện (fund_event_expenses)
  const eventExpensesRes = await pool.query(
    `
    SELECT event_code, event_date::text AS event_date, COALESCE(beneficiary_phone, '') AS beneficiary_phone,
      beneficiary_name, expense_role, proposed_amount::float8 AS proposed_amount, status
    FROM fund_event_expenses
    WHERE event_date::text LIKE $1 || '%'
    ORDER BY event_date ASC, id ASC
    `,
    [targetMonth]
  );
  const eventExpenses = eventExpensesRes.rows;

  // 6. Tổng hợp Master Map
  const masterMap = new Map<string, MasterPerson>();

  function getOrCreatePerson(rawName: string, rawPhone?: string | null): MasterPerson {
    const pPhone = normalizePhone(rawPhone);
    const pName = normalizeName(rawName);
    const key = pPhone || pName;

    if (!masterMap.has(key)) {
      const matchedUser = (pPhone && usersByPhone.get(pPhone)) || usersByName.get(pName);
      masterMap.set(key, {
        name: rawName?.trim() || matchedUser?.full_name || '—',
        phone: rawPhone?.trim() || matchedUser?.phone || '',
        bankAccount: matchedUser?.bank_account || '',
        bankName: matchedUser?.bank_name || '',
        teamName: matchedUser?.team_name || '',
        saleCommission: 0,
        teamLeadBonus: 0,
        operationsBonus: 0,
        eventTrainingBonus: 0,
        totalAmount: 0,
        note: '',
      });
    }

    const p = masterMap.get(key)!;
    if (!p.bankAccount && rawPhone) {
      const matched = usersByPhone.get(pPhone);
      if (matched?.bank_account) {
        p.bankAccount = matched.bank_account;
        p.bankName = matched.bank_name || p.bankName;
      }
    }
    return p;
  }

  // Gộp Hoa hồng Sale
  for (const c of contracts) {
    if (c.closer_name && c.closer_fee > 0) {
      const p = getOrCreatePerson(c.closer_name, c.closer_phone);
      p.saleCommission += c.closer_fee;
      if (c.team_name && !p.teamName) p.teamName = c.team_name;
    }
    if (c.referrer_name && c.referrer_fee > 0) {
      const p = getOrCreatePerson(c.referrer_name, c.referrer_phone);
      p.saleCommission += c.referrer_fee;
    }
    if (c.supporter_name && c.supporter_fee > 0) {
      const p = getOrCreatePerson(c.supporter_name, c.supporter_phone);
      p.saleCommission += c.supporter_fee;
    }
  }

  // Gộp Quỹ TeamLeader
  for (const r of teamLeadRows) {
    if (r.total > 0 && r.memberName) {
      const p = getOrCreatePerson(r.memberName, r.memberPhone);
      p.teamLeadBonus += r.total;
      if (r.teamName && !p.teamName) p.teamName = r.teamName;
      if (r.role && !p.note.includes(r.role)) {
        p.note = p.note ? `${p.note}, ${r.role}` : r.role;
      }
    }
  }

  // Gộp Quỹ Vận hành & Ban hỗ trợ
  for (const log of logs) {
    if (log.amount > 0 && log.beneficiary_name) {
      const p = getOrCreatePerson(log.beneficiary_name, log.beneficiary_phone);
      p.operationsBonus += log.amount;
      if (log.beneficiary_bank_account && !p.bankAccount) {
        p.bankAccount = log.beneficiary_bank_account;
        p.bankName = log.beneficiary_bank_name || p.bankName;
      }
      if (log.fund_source && !p.note.includes(log.fund_source)) {
        p.note = p.note ? `${p.note} · ${log.fund_source}` : log.fund_source;
      }
    }
  }

  // Gộp Thù lao Đào tạo & Sự kiện
  for (const exp of eventExpenses) {
    if (exp.proposed_amount > 0 && exp.beneficiary_name) {
      const p = getOrCreatePerson(exp.beneficiary_name, exp.beneficiary_phone);
      p.eventTrainingBonus += exp.proposed_amount;
      if (exp.expense_role && !p.note.includes(exp.expense_role)) {
        p.note = p.note ? `${p.note} · ${exp.expense_role}` : exp.expense_role;
      }
    }
  }

  // Tính tổng thực nhận cho từng người
  const masterList: MasterPerson[] = Array.from(masterMap.values())
    .map((p) => {
      p.totalAmount = p.saleCommission + p.teamLeadBonus + p.operationsBonus + p.eventTrainingBonus;
      return p;
    })
    .filter((p) => p.totalAmount > 0);

  masterList.sort((a, b) => b.totalAmount - a.totalAmount);

  const sumTotal = masterList.reduce((s, p) => s + p.totalAmount, 0);
  const sumSale = masterList.reduce((s, p) => s + p.saleCommission, 0);
  const sumTeamLead = masterList.reduce((s, p) => s + p.teamLeadBonus, 0);
  const sumOps = masterList.reduce((s, p) => s + p.operationsBonus, 0);
  const sumEvent = masterList.reduce((s, p) => s + p.eventTrainingBonus, 0);

  return {
    targetMonth,
    masterList,
    contracts,
    teamLeadRows,
    logs,
    eventExpenses,
    summary: {
      totalAmount: sumTotal,
      sumSale,
      sumTeamLead,
      sumOps,
      sumEvent,
      personCount: masterList.length,
      contractCount: contracts.length,
      teamLeadCount: teamLeadRows.length,
      logCount: logs.length,
    },
  };
}
