import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(req: NextRequest) {
  // Get role from cookie (set during login)
  const rawRole = req.cookies.get('user_role')?.value || '';
  const role = decodeURIComponent(rawRole).toLowerCase();
  const url = req.nextUrl.clone();

  // Paths that require admin privileges
  const adminPath = url.pathname.startsWith('/admin');
  // Allow public access to login, register, etc.
  const publicPaths = ['/login', '/register', '/api'];

  const isPublic = publicPaths.some((p) => url.pathname.startsWith(p));

  if (!adminPath || isPublic) {
    // Not an admin page or is public – let it through
    return NextResponse.next();
  }

  // If user is not logged in (no role), redirect to login
  if (!role) {
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  // 1. Admin accounts have full access to all /admin/* routes
  if (role === 'admin' || role.includes('admin') || role.includes('quản trị') || role.includes('quan tri')) {
    return NextResponse.next();
  }

  // 2. Reception (Lễ tân) can only access /admin/le-tan
  if (role.includes('lễ tân') || role.includes('le tan') || role.includes('reception')) {
    if (url.pathname.startsWith('/admin/le-tan')) {
      return NextResponse.next();
    }
    url.pathname = '/admin/le-tan';
    return NextResponse.redirect(url);
  }

  // 3. Non-admin roles (MC, Nhân sự, Nhân viên, Diễn giả, Khác, Phụng sự, Chốt sự kiện, Thành viên, ...)
  // Tài liệu Mục 1: Các tài khoản thuộc các nhóm: MC, Nhân sự, Nhân viên, Diễn giả, Khác, Phụng sự, Chốt sự kiện
  // được phép truy cập và xem các chức năng: Trang tổng quát, Admin Sự kiện, Chi tiết sự kiện, Mời bạn bè, Trang Danh sách khách hàng.
  const isAllowedForNonAdmin =
    url.pathname === '/admin' ||
    url.pathname === '/admin/' ||
    url.pathname.startsWith('/admin/su-kien') ||
    url.pathname.startsWith('/admin/nguoi-moi') ||
    url.pathname.startsWith('/admin/moi-ban-be');

  if (isAllowedForNonAdmin) {
    return NextResponse.next();
  }

  // If non-admin tries to access other restricted admin routes (e.g., /admin/tai-khoan, /admin/thanh-vien, /admin/thiet-lap, /admin/nhat-ky-hop-dong),
  // redirect them to /admin so they stay within their permitted views
  url.pathname = '/admin';
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ['/admin/:path*'],
};
