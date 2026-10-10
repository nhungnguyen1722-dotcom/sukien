import pool from '@/lib/db';
import OperationsFundReport from '@/components/admin/OperationsFundReport';
import type { TransactionLog, WeeklyAllocation } from '@/components/admin/TransactionLogManagement';

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

type ContractFundBasis = {
  contract_date: string;
  allocation_base: number;
};

async function getOperationsFundData() {
  const [logsResult, contractsResult, allocationsResult] = await Promise.all([
    pool.query(`
      SELECT id, request_code, request_date::text AS request_date, fund_source, detail_content,
        requester_name, beneficiary_name, beneficiary_phone, beneficiary_bank_account, beneficiary_bank_name,
        proposed_amount::float8 AS proposed_amount, status,
        actual_expense::float8 AS actual_expense, payment_date::text AS payment_date,
        source_contract_id, expense_type
      FROM transaction_logs
      ORDER BY request_date DESC NULLS LAST, id DESC
    `),
    pool.query(`
      SELECT contract_date::text AS contract_date,
        COALESCE(allocated_value, value, 0)::float8 AS allocation_base
      FROM contracts
      WHERE contract_date IS NOT NULL
      ORDER BY contract_date DESC, id DESC
    `),
    pool.query(`
      SELECT period_code, period_month, period_label, period_start::text AS period_start,
        period_end::text AS period_end, fund_key, fund_source,
        allocation_rate::float8 AS allocation_rate,
        requested_amount::float8 AS requested_amount, source_sheet
      FROM fund_weekly_allocations
      ORDER BY period_start, id
    `),
  ]);

  return {
    logs: logsResult.rows as TransactionLog[],
    contracts: contractsResult.rows as ContractFundBasis[],
    allocations: allocationsResult.rows as WeeklyAllocation[],
  };
}

export default async function OperationsFundPage() {
  const data = await getOperationsFundData();
  const latestFundMonth = data.allocations
    .filter((row) => row.fund_key === 'operations' || row.fund_key === 'support_kt' || row.fund_key === 'support_cn')
    .map((row) => row.period_month)
    .filter(Boolean)
    .sort()
    .at(-1);
  return <OperationsFundReport {...data} initialMonth={latestFundMonth || getCurrentMonth()} />;
}
