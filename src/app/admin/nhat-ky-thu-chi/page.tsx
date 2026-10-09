import pool from '@/lib/db';
import TransactionLogManagement, {
  EventFundExpense,
  FundContract,
  TransactionLog,
  TransactionMember,
  WeeklyAllocation,
} from '@/components/admin/TransactionLogManagement';
import { loadSeptemberContractDistributions } from '@/lib/contractDistributionWorkbooks';
import { SELECT_TRANSACTION_LOGS } from '@/lib/transactionLogs';
import { ensureMemberSchema, UNIFIED_TEAM_NAME_SQL, UNIFIED_TITLE_SQL } from '@/lib/memberTeams';
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
  await ensureMemberSchema();
  const [logsRes, weeklyRes, contractsRes, eventExpensesRes, membersRes] = await Promise.all([
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
      SELECT id, contract_code, contract_date::text AS contract_date, customer_name,
        value::float8 AS value,
        CASE
          WHEN contract_date >= DATE '2026-10-01' AND contract_date < DATE '2026-11-01'
            THEN COALESCE(NULLIF(allocated_value, 0), value, 0)
          ELSE COALESCE(allocated_value, 0)
        END::float8 AS allocated_value,
        COALESCE(closer_name, '') AS closer_name, COALESCE(closer_phone, '') AS closer_phone,
        COALESCE(closer_fee, 0)::float8 AS closer_fee,
        COALESCE(referrer_name, '') AS referrer_name, COALESCE(referrer_phone, '') AS referrer_phone,
        COALESCE(referrer_fee, 0)::float8 AS referrer_fee,
        COALESCE(supporter_name, '') AS supporter_name, COALESCE(supporter_phone, '') AS supporter_phone,
        COALESCE(supporter_fee, 0)::float8 AS supporter_fee, COALESCE(status, '') AS status
      FROM contracts
      ORDER BY contract_date, id
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
        ${UNIFIED_TITLE_SQL} AS title,
        ${UNIFIED_TEAM_NAME_SQL} AS team_name
      FROM users u
      LEFT JOIN teams t ON u.team_id = t.id
      WHERE u.status IS DISTINCT FROM 'Tạm khóa'
      ORDER BY u.full_name ASC
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

  return {
    logs,
    weeklyAllocations: weeklyRes.rows as WeeklyAllocation[],
    contracts,
    workbookContracts,
    workbookWarnings: workbookDistributions.warningsByPeriod,
    eventExpenses,
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
      currentMonth={getCurrentMonth()}
    />
  );
}
