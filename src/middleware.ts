import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(req: NextRequest) {
  // Get role from cookie (set during login)
  const role = req.cookies.get('user_role')?.value?.toLowerCase() || '';
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

  // If user is not logged in (no role), redirect to home
  if (!role) {
    url.pathname = '/';
    return NextResponse.redirect(url);
  }

  // Admin can access everything under /admin
  if (role.includes('admin')) {
    return NextResponse.next();
  }

  // Reception (Lễ tân) can only access /admin/le-tan
  if (role.includes('lễ tân') || role.includes('le tan') || role.includes('reception')) {
    if (url.pathname.startsWith('/admin/le-tan')) {
      return NextResponse.next();
    }
    // otherwise redirect to home
    url.pathname = '/';
    return NextResponse.redirect(url);
  }

  // All other roles (members, etc.) should not access any admin routes
  url.pathname = '/';
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ['/admin/:path*'],
};
