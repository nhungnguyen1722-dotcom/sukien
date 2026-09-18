import pool from '@/lib/db';
import TransactionLogManagement, { TransactionLog } from '@/components/admin/TransactionLogManagement';

export const revalidate = 0;

const DEFAULT_FUNDS: Record<string, { percent: number; total: number; color: string }> = {
  'Quỹ Chăm sóc khách hàng': { percent: 35, total: 52500000, color: '#2563eb' },
  'Quỹ Sự kiện & Chốt HĐ': { percent: 20, total: 30000000, color: '#ec4899' },
  'Quỹ Đào tạo Kỹ năng': { percent: 15, total: 22500000, color: '#8b5cf6' },
  'Quỹ Thi đua & Thúc đẩy': { percent: 10, total: 15000000, color: '#f59e0b' },
  'Quỹ Công tác phí': { percent: 10, total: 15000000, color: '#10b981' },
  'Quỹ Vận hành gián tiếp': { percent: 10, total: 15000000, color: '#06b6d4' },
};

async function getTransactionsData() {
  try {
    const [logsRes, statsRes] = await Promise.all([
      pool.query(`
        SELECT 
          id, request_code, request_date, fund_source, detail_content,
          requester_id, requester_name, approver_id, approver_name,
          beneficiary_name, proposed_amount, available_balance,
          fund_alert, status, actual_expense, receipt_url, created_at
        FROM transaction_logs
        ORDER BY request_date DESC, id DESC
      `),
      pool.query(`
        SELECT 
          fund_source,
          COALESCE(SUM(CASE WHEN status = 'Đã duyệt' THEN proposed_amount ELSE 0 END), 0)::numeric as used_amount
        FROM transaction_logs
        GROUP BY fund_source
      `),
    ]);

    const fundMap: Record<string, any> = {};
    let totalUsed = 0;

    Object.keys(DEFAULT_FUNDS).forEach((k) => {
      fundMap[k] = {
        name: k,
        percent: DEFAULT_FUNDS[k].percent,
        total: DEFAULT_FUNDS[k].total,
        used: 0,
        color: DEFAULT_FUNDS[k].color,
      };
    });

    statsRes.rows.forEach((r) => {
      const key = Object.keys(DEFAULT_FUNDS).find(
        (k) => k.toLowerCase().includes(r.fund_source.toLowerCase()) || r.fund_source.toLowerCase().includes(k.toLowerCase())
      ) || r.fund_source;
      const amt = Number(r.used_amount || 0);
      if (fundMap[key]) {
        fundMap[key].used += amt;
      }
      totalUsed += amt;
    });

    const totalBudget = 150000000;
    const remaining = Math.max(0, totalBudget - totalUsed);

    const logs: TransactionLog[] = logsRes.rows.map((row) => ({
      ...row,
      proposed_amount: Number(row.proposed_amount || 0),
      available_balance: Number(row.available_balance || 0),
      actual_expense: Number(row.actual_expense || 0),
      request_date: row.request_date ? new Date(row.request_date).toISOString().split('T')[0] : '',
    }));

    return {
      logs,
      stats: {
        totalBudget,
        totalUsed,
        totalRemaining: remaining,
        fundMap,
      },
    };
  } catch (error) {
    console.error('Error fetching transaction logs:', error);
    return {
      logs: [],
      stats: {
        totalBudget: 150000000,
        totalUsed: 0,
        totalRemaining: 150000000,
        fundMap: {},
      },
    };
  }
}

export default async function NhatKyThuChiPage() {
  const data = await getTransactionsData();

  return (
    <TransactionLogManagement
      initialLogs={data.logs}
      initialStats={data.stats}
    />
  );
}
