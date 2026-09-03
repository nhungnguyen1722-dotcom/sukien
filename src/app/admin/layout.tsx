import AdminSidebar from '@/components/admin/AdminSidebar';
import pool from '@/lib/db';

export const revalidate = 0;

async function getAdminName(): Promise<string> {
  try {
    const result = await pool.query(
      `SELECT full_name FROM users WHERE role = 'Admin' LIMIT 1`
    );
    if (result.rows.length > 0) {
      return result.rows[0].full_name;
    }
  } catch (error) {
    console.error('Failed to fetch admin name:', error);
  }
  return 'Nhung Nguyễn';
}

export default async function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const adminName = await getAdminName();

  return (
    <div className="flex min-h-screen bg-[#f8fafc]">
      <AdminSidebar adminName={adminName} />
      <main className="flex-1 ml-[260px] overflow-y-auto min-h-screen">
        {children}
      </main>
    </div>
  );
}
