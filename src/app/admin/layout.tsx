import { cookies } from 'next/headers';
import AdminSidebar from '@/components/admin/AdminSidebar';
import pool from '@/lib/db';
import { safeDecodeURI } from '@/lib/authUtils';

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
  const cookieStore = await cookies();
  const rawRole = cookieStore.get('user_role')?.value;
  const rawName = cookieStore.get('user_name')?.value;
  const currentRole = rawRole ? safeDecodeURI(rawRole) : undefined;
  const currentName = rawName ? safeDecodeURI(rawName) : await getAdminName();

  return (
    <div className="flex min-h-screen bg-[#f8fafc]">
      <AdminSidebar adminName={currentName} adminRole={currentRole} />
      <main className="flex-1 ml-0 md:ml-[260px] pt-12 md:pt-0 overflow-y-auto min-h-screen">
        {children}
      </main>
    </div>
  );
}
