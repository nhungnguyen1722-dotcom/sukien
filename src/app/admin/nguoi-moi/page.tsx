import { cookies } from 'next/headers';
import pool from '@/lib/db';
import CustomerManagement, { CustomerInvite, InviterGroup } from '@/components/admin/CustomerManagement';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const metadata = {
  title: 'Danh sách khách hàng | NGHIÊNG Complex Admin',
  description: 'Quản lý khách hàng và phân cấp người mời theo vai trò tài khoản.',
};

export default async function NguoiMoiPage() {
  const cookieStore = await cookies();
  const cookieRole = cookieStore.get('user_role')?.value || 'Admin';
  const cookieId = cookieStore.get('user_id')?.value;
  const cookiePhone = cookieStore.get('user_phone')?.value;
  const cookieName = cookieStore.get('user_name')?.value;

  const isAdmin = cookieRole === 'Admin' || !cookieRole;

  let currentUserId: number | null = null;
  if (cookieId) currentUserId = parseInt(cookieId, 10);

  // If not admin and user id not from cookie, look up user by phone or name
  if (!isAdmin && !currentUserId && (cookiePhone || cookieName)) {
    try {
      const uRes = await pool.query(
        cookiePhone
          ? 'SELECT id FROM users WHERE phone = $1 LIMIT 1'
          : 'SELECT id FROM users WHERE full_name ILIKE $1 LIMIT 1',
        [cookiePhone || cookieName]
      );
      if (uRes.rows.length > 0) currentUserId = uRes.rows[0].id;
    } catch {
      // Ignore
    }
  }

  let customers: CustomerInvite[] = [];
  let inviters: InviterGroup[] = [];

  try {
    if (isAdmin) {
      // Admin sees ALL customers with hierarchical inviter info
      const [custRes, invRes] = await Promise.all([
        pool.query(`
          SELECT 
            i.id,
            i.inviter_id,
            i.invitee_name,
            i.invitee_email,
            i.invitee_phone,
            COALESCE(i.status, 'Đang chờ') AS status,
            COALESCE(i.reward_points, 0) AS reward_points,
            i.created_at,
            u.full_name AS inviter_name,
            u.role AS inviter_role,
            u.ref_code AS inviter_ref_code
          FROM invitations i
          LEFT JOIN users u ON i.inviter_id = u.id
          ORDER BY COALESCE(u.full_name, 'ZZZ') ASC, i.id DESC
        `),
        pool.query(`
          SELECT 
            u.id, 
            u.full_name, 
            u.role,
            COUNT(i.id)::int AS count
          FROM users u
          INNER JOIN invitations i ON i.inviter_id = u.id
          GROUP BY u.id, u.full_name, u.role
          ORDER BY u.full_name ASC
        `),
      ]);

      customers = custRes.rows.map((row) => ({
        ...row,
        created_at: row.created_at ? new Date(row.created_at).toISOString() : null,
      }));

      inviters = invRes.rows;
    } else {
      // Non-admin sees ONLY customers invited by self
      const custRes = await pool.query(
        `
        SELECT 
          i.id,
          i.inviter_id,
          i.invitee_name,
          i.invitee_email,
          i.invitee_phone,
          COALESCE(i.status, 'Đang chờ') AS status,
          COALESCE(i.reward_points, 0) AS reward_points,
          i.created_at,
          u.full_name AS inviter_name,
          u.role AS inviter_role,
          u.ref_code AS inviter_ref_code
        FROM invitations i
        LEFT JOIN users u ON i.inviter_id = u.id
        WHERE i.inviter_id = $1
        ORDER BY i.id DESC
      `,
        [currentUserId || 0]
      );

      customers = custRes.rows.map((row) => ({
        ...row,
        created_at: row.created_at ? new Date(row.created_at).toISOString() : null,
      }));
    }
  } catch (err) {
    console.error('Failed to load customers for /admin/nguoi-moi:', err);
  }

  return (
    <CustomerManagement
      isAdmin={isAdmin}
      currentUser={{
        id: currentUserId || undefined,
        name: cookieName ? decodeURIComponent(cookieName) : undefined,
        role: cookieRole,
        phone: cookiePhone,
      }}
      initialCustomers={customers}
      inviters={inviters}
    />
  );
}
