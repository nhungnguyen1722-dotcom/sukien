import pool from '@/lib/db';
import AccountManagement from '@/components/admin/AccountManagement';

export const revalidate = 0;

export type UserAccount = {
  id: number;
  full_name: string;
  email: string;
  role: string;
  status: string;
  created_at: string;
};

async function getAdminUsers(): Promise<UserAccount[]> {
  try {
    const result = await pool.query(`
      SELECT id, full_name, email, role, status, created_at
      FROM users
      WHERE email IS NOT NULL AND email != ''
        AND role IN ('Admin', 'Nhân viên')
      ORDER BY id ASC
    `);

    return result.rows.map(row => ({
      ...row,
      created_at: row.created_at ? new Date(row.created_at).toISOString() : '',
    }));
  } catch (error) {
    console.error('Failed to fetch admin users:', error);
    return [];
  }
}

export default async function TaiKhoanPage() {
  const users = await getAdminUsers();

  return <AccountManagement initialUsers={users} />;
}
