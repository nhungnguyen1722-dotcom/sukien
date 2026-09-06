import pool from '@/lib/db';
import ContractManagement, { Contract, Stats, UserOption } from '@/components/admin/ContractManagement';

export const revalidate = 0;

async function getContractsData(): Promise<{
  contracts: Contract[];
  stats: Stats;
  users: UserOption[];
  closers: UserOption[];
}> {
  try {
    const [contractsRes, statsRes, closersRes, usersRes] = await Promise.all([
      pool.query(`
        SELECT 
          c.*,
          u_closer.full_name as closer_name,
          u_referrer.full_name as referrer_name,
          u_supporter.full_name as supporter_name
        FROM contracts c
        LEFT JOIN users u_closer ON c.closer_id = u_closer.id
        LEFT JOIN users u_referrer ON c.referrer_id = u_referrer.id
        LEFT JOIN users u_supporter ON c.supporter_id = u_supporter.id
        ORDER BY c.contract_date DESC, c.id DESC
      `),
      pool.query(`
        SELECT 
          COUNT(*)::int AS total_contracts,
          COALESCE(SUM(value), 0)::numeric AS total_value,
          COALESCE(SUM(COALESCE(closer_fee, 0) + COALESCE(referrer_fee, 0) + COALESCE(supporter_fee, 0)), 0)::numeric AS total_commission,
          COUNT(CASE WHEN status = 'Đã duyệt' THEN 1 END)::int AS approved_contracts
        FROM contracts
      `),
      pool.query(`
        SELECT DISTINCT u.id, u.full_name 
        FROM contracts c
        JOIN users u ON c.closer_id = u.id
        ORDER BY u.full_name ASC
      `),
      pool.query(`SELECT id, full_name, phone FROM users WHERE status != 'Tạm khóa' ORDER BY full_name ASC`),
    ]);

    const statsRow = statsRes.rows[0] || {
      total_contracts: 0,
      total_value: 0,
      total_commission: 0,
      approved_contracts: 0,
    };

    const contracts = contractsRes.rows.map(row => ({
      ...row,
      contract_date: row.contract_date ? new Date(row.contract_date).toISOString().split('T')[0] : '',
      created_at: row.created_at ? new Date(row.created_at).toISOString() : '',
    }));

    return {
      contracts,
      stats: {
        totalContracts: statsRow.total_contracts,
        totalValue: Number(statsRow.total_value),
        totalCommission: Number(statsRow.total_commission),
        approvedContracts: statsRow.approved_contracts,
      },
      closers: closersRes.rows,
      users: usersRes.rows,
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
      },
      closers: [],
      users: [],
    };
  }
}

export default async function NhatKyHopDongPage() {
  const data = await getContractsData();

  return (
    <ContractManagement
      initialContracts={data.contracts}
      initialStats={data.stats}
      initialUsers={data.users}
      initialClosers={data.closers}
    />
  );
}
