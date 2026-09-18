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

  // 2. Reception (Lễ tân) - Tài liệu Mục 6:
  // Được xem các trang: Trang tổng quát, Admin Sự kiện, Chi tiết sự kiện, Mời bạn bè, Danh sách khách hàng, và Lễ tân
  if (role.includes('lễ tân') || role.includes('le tan') || role.includes('reception')) {
    const isAllowedForReception =
      url.pathname === '/admin' ||
      url.pathname === '/admin/' ||
      url.pathname.startsWith('/admin/su-kien') ||
      url.pathname.startsWith('/admin/nguoi-moi') ||
      url.pathname.startsWith('/admin/moi-ban-be') ||
      url.pathname.startsWith('/admin/le-tan');

    if (isAllowedForReception) {
      return NextResponse.next();
    }
    url.pathname = '/admin/le-tan';
    return NextResponse.redirect(url);
  }

  // 3. Non-admin roles (MC, Nhân sự, Nhân viên, Diễn giả, Khác, Phụng sự, Chốt sự kiện, ...)
  // Tài liệu Mục 6: Các tài khoản này KHÔNG được xem /admin/le-tan
  // được phép truy cập: Trang tổng quát, Admin Sự kiện, Chi tiết sự kiện, Mời bạn bè, Trang Danh sách khách hàng.
  const isAllowedForNonAdmin =
    url.pathname === '/admin' ||
    url.pathname === '/admin/' ||
    url.pathname.startsWith('/admin/su-kien') ||
    url.pathname.startsWith('/admin/nguoi-moi') ||
    url.pathname.startsWith('/admin/moi-ban-be');

  if (isAllowedForNonAdmin) {
    return NextResponse.next();
  }

  // If non-admin tries to access restricted routes (or /admin/le-tan), redirect to /admin
  url.pathname = '/admin';
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ['/admin/:path*'],
};
