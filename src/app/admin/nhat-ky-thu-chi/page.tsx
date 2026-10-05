import pool from '@/lib/db';
import TransactionLogManagement, {
  EventFundExpense,
  FundContract,
  TransactionLog,
  WeeklyAllocation,
} from '@/components/admin/TransactionLogManagement';

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
  const [logsRes, weeklyRes, contractsRes, eventExpensesRes] = await Promise.all([
    pool.query(`
      SELECT id, request_code, request_date::text AS request_date, fund_source, detail_content,
        requester_id, requester_name, requester_phone, approver_id, approver_name, approver_phone,
        beneficiary_name, beneficiary_phone, proposed_amount::float8 AS proposed_amount,
        available_balance::float8 AS available_balance, fund_alert, status,
        actual_expense::float8 AS actual_expense, receipt_url,
        approval_date::text AS approval_date, payment_date::text AS payment_date, source_complete
      FROM transaction_logs
      ORDER BY request_date DESC NULLS LAST, id DESC
    `),
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
        value::float8 AS value, allocated_value::float8 AS allocated_value,
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
  ]);

  return {
    logs: logsRes.rows as TransactionLog[],
    weeklyAllocations: weeklyRes.rows as WeeklyAllocation[],
    contracts: contractsRes.rows as FundContract[],
    eventExpenses: eventExpensesRes.rows as EventFundExpense[],
  };
}

export default async function NhatKyThuChiPage() {
  const data = await getTransactionsData();
  return (
    <TransactionLogManagement
      initialLogs={data.logs}
      weeklyAllocations={data.weeklyAllocations}
      contracts={data.contracts}
      eventExpenses={data.eventExpenses}
      currentMonth={getCurrentMonth()}
    />
  );
}
