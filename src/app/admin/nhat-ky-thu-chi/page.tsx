import pool from '@/lib/db';
import TransactionLogManagement, {
  EventFundExpense,
  EventItemRecord,
  FundContract,
  TransactionLog,
  TransactionMember,
  WeeklyAllocation,
} from '@/components/admin/TransactionLogManagement';
import { loadSeptemberContractDistributions } from '@/lib/contractDistributionWorkbooks';
import { SELECT_TRANSACTION_LOGS } from '@/lib/transactionLogs';
import { ensureMemberSchema, UNIFIED_TEAM_NAME_SQL, UNIFIED_TITLE_SQL } from '@/lib/memberTeams';
import { ensureOperationsFundBeneficiaries } from '@/lib/operationsFundBeneficiaries';
import { sanitizeVietnameseText } from '@/lib/nameSanitizer';

export const revalidate = 0;

function getCurrentMonth() {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
  }).formatToParts(new Date());
  const year = parts.find((part) => part.type === 'year')?.value;
  const month = parts.find((part) => part.type === 'month')?.value;
  return year && month ? `${year}-${month}` : new Date().toISOString().slice(0, 7);
}

async function getTransactionsData() {
  await Promise.all([ensureMemberSchema(), ensureOperationsFundBeneficiaries()]);
  const [logsRes, weeklyRes, contractsRes, eventExpensesRes, membersRes, eventsRes] = await Promise.all([
    pool.query(`${SELECT_TRANSACTION_LOGS} ORDER BY request_date DESC NULLS LAST, id DESC`),
    pool.query(`
      SELECT period_code, period_month, period_label, period_start::text AS period_start,
        period_end::text AS period_end, fund_key, fund_source,
        allocation_rate::float8 AS allocation_rate,
        requested_amount::float8 AS requested_amount, source_sheet
      FROM fund_weekly_allocations
      ORDER BY period_start, id
    `),
    pool.query(`
      SELECT 
        c.id, 
        c.contract_code, 
        c.contract_date::text AS contract_date, 
        c.customer_name,
        c.value::float8 AS value,
        COALESCE(c.contract_type, '') AS contract_type,
        COALESCE(NULLIF(BTRIM(c.team_name), ''), '') AS team_name,
        CASE
          WHEN UPPER(TRIM(COALESCE(c.contract_type, ''))) IN ('BĐS', 'BDS', 'BẤT ĐỘNG SẢN', 'BAT DONG SAN')
            THEN ROUND((COALESCE(c.value, 0) * 4.0) / 15.0)
          WHEN UPPER(TRIM(COALESCE(c.contract_type, ''))) IN ('2 NĂM', '2 NAM')
            OR LOWER(TRIM(COALESCE(c.contract_type, ''))) LIKE '%2 n_m%'
            OR LOWER(TRIM(COALESCE(c.contract_type, ''))) = '2 nam'
            OR LOWER(TRIM(COALESCE(c.contract_type, ''))) = '2 năm'
            THEN ROUND(COALESCE(c.value, 0) * 0.70)
          ELSE COALESCE(c.allocated_value, c.value, 0)
        END::float8 AS allocated_value,
        CASE 
          WHEN c.closer_name = 'Nguy?n H?ng V?' THEN 'Nguyễn Hùng Vĩ'
          WHEN c.closer_name LIKE '%?%' AND u_closer.full_name IS NOT NULL THEN u_closer.full_name
          ELSE COALESCE(NULLIF(BTRIM(c.closer_name), ''), u_closer.full_name, '')
        END AS closer_name,
        COALESCE(NULLIF(BTRIM(c.closer_phone), ''), u_closer.phone, '') AS closer_phone,
        COALESCE(c.closer_fee, 0)::float8 AS closer_fee,
        CASE 
          WHEN c.referrer_name = 'Chu Th? L??ng' THEN 'Chu Thị Lương'
          WHEN c.referrer_name LIKE '%?%' AND u_referrer.full_name IS NOT NULL THEN u_referrer.full_name
          ELSE COALESCE(NULLIF(BTRIM(c.referrer_name), ''), u_referrer.full_name, '')
        END AS referrer_name,
        COALESCE(NULLIF(BTRIM(c.referrer_phone), ''), u_referrer.phone, '') AS referrer_phone,
        COALESCE(c.referrer_fee, 0)::float8 AS referrer_fee,
        CASE 
          WHEN c.supporter_name = 'V? Th? C?c' THEN 'Vũ Thị Cúc'
          WHEN c.supporter_name = 'Nguy?n H?ng V?' THEN 'Nguyễn Hùng Vĩ'
          WHEN c.supporter_name LIKE '%?%' AND u_supporter.full_name IS NOT NULL THEN u_supporter.full_name
          ELSE COALESCE(NULLIF(BTRIM(c.supporter_name), ''), u_supporter.full_name, '')
        END AS supporter_name,
        COALESCE(NULLIF(BTRIM(c.supporter_phone), ''), u_supporter.phone, '') AS supporter_phone,
        COALESCE(c.supporter_fee, 0)::float8 AS supporter_fee,
        CASE WHEN c.status = 'Ch? duy?t' THEN 'Chờ duyệt' ELSE COALESCE(c.status, '') END AS status,
        COALESCE(ops_beneficiaries.recipients, '[]'::jsonb) AS operations_fund_beneficiaries
      FROM contracts c
      LEFT JOIN users u_closer ON c.closer_id = u_closer.id
      LEFT JOIN users u_referrer ON c.referrer_id = u_referrer.id
      LEFT JOIN users u_supporter ON c.supporter_id = u_supporter.id
      LEFT JOIN LATERAL (
        SELECT jsonb_agg(jsonb_build_object(
          'department', effective.department,
          'full_name', effective.full_name,
          'phone', effective.phone,
          'bank_account', effective.bank_account,
          'bank_name', effective.bank_name
        ) ORDER BY effective.department_key) AS recipients
        FROM (
          SELECT DISTINCT ON (department_key)
            department_key, department, full_name, phone, bank_account, bank_name
          FROM operations_fund_beneficiaries
          WHERE effective_from <= c.contract_date
          ORDER BY department_key, effective_from DESC, id DESC
        ) effective
      ) ops_beneficiaries ON TRUE
      ORDER BY c.contract_date, c.id
    `),
    pool.query(`
      SELECT event_code, event_date::text AS event_date, COALESCE(beneficiary_phone, '') AS beneficiary_phone,
        beneficiary_name, expense_role, proposed_amount::float8 AS proposed_amount, status
      FROM fund_event_expenses
      ORDER BY event_date, event_code, id
    `),
    pool.query(`
      SELECT 
        u.id, 
        u.full_name, 
        u.phone, 
        u.bank_account,
        u.bank_name,
        ${UNIFIED_TITLE_SQL} AS title,
        ${UNIFIED_TEAM_NAME_SQL} AS team_name
      FROM users u
      LEFT JOIN teams t ON u.team_id = t.id
      WHERE u.status IS DISTINCT FROM 'Tạm khóa'
      ORDER BY u.full_name ASC
    `),
    pool.query(`
      SELECT id, code, name, event_date::text AS event_date, location, status
      FROM events
      ORDER BY event_date DESC
    `),
  ]);

  const logs = logsRes.rows.map((row) => ({
    ...row,
    requester_name: sanitizeVietnameseText(row.requester_name),
    approver_name: sanitizeVietnameseText(row.approver_name),
    beneficiary_name: sanitizeVietnameseText(row.beneficiary_name),
    detail_content: sanitizeVietnameseText(row.detail_content),
    status: sanitizeVietnameseText(row.status),
  })) as TransactionLog[];
  const contracts = contractsRes.rows.map((row) => ({
    ...row,
    customer_name: sanitizeVietnameseText(row.customer_name),
    closer_name: sanitizeVietnameseText(row.closer_name),
    referrer_name: sanitizeVietnameseText(row.referrer_name),
    supporter_name: sanitizeVietnameseText(row.supporter_name),
    team_name: sanitizeVietnameseText(row.team_name),
    status: sanitizeVietnameseText(row.status),
  })) as FundContract[];
  const members = membersRes.rows.map((row) => ({
    ...row,
    full_name: sanitizeVietnameseText(row.full_name),
  })) as TransactionMember[];
  const workbookDistributions = loadSeptemberContractDistributions(
    contracts,
    members.map((member) => member.full_name),
  );
  const workbookContracts = workbookDistributions.contracts.map((contract) => ({
    ...contract,
    customer_name: sanitizeVietnameseText(contract.customer_name),
    closer_name: sanitizeVietnameseText(contract.closer_name),
    referrer_name: sanitizeVietnameseText(contract.referrer_name),
    supporter_name: sanitizeVietnameseText(contract.supporter_name),
    team_name: sanitizeVietnameseText(contract.team_name),
    status: sanitizeVietnameseText(contract.status),
    source_beneficiaries: contract.source_beneficiaries?.map((person) => ({
      ...person,
      name: sanitizeVietnameseText(person.name),
    })),
  }));
  const eventExpenses = eventExpensesRes.rows.map((row) => ({
    ...row,
    beneficiary_name: sanitizeVietnameseText(row.beneficiary_name),
    status: sanitizeVietnameseText(row.status),
  })) as EventFundExpense[];
  const events = eventsRes.rows.map((row) => ({
    ...row,
    name: sanitizeVietnameseText(row.name),
    location: sanitizeVietnameseText(row.location),
  })) as EventItemRecord[];

  return {
    logs,
    weeklyAllocations: weeklyRes.rows as WeeklyAllocation[],
    contracts,
    workbookContracts,
    workbookWarnings: workbookDistributions.warningsByPeriod,
    eventExpenses,
    events,
    members,
  };
}

export default async function NhatKyThuChiPage() {
  const data = await getTransactionsData();
  return (
    <TransactionLogManagement
      initialLogs={data.logs}
      initialMembers={data.members}
      weeklyAllocations={data.weeklyAllocations}
      contracts={data.contracts}
      workbookContracts={data.workbookContracts}
      workbookWarnings={data.workbookWarnings}
      eventExpenses={data.eventExpenses}
      events={data.events}
      currentMonth={getCurrentMonth()}
    />
  );
}
