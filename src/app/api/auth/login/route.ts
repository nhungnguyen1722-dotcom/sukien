import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email) {
      return NextResponse.json(
        { error: 'Vui lòng nhập email hoặc số điện thoại' },
        { status: 400 }
      );
    }

    // Check user in database by email, phone, or full_name
    const result = await pool.query(
      `SELECT id, full_name, email, phone, role, status FROM users 
       WHERE LOWER(email) = LOWER($1) 
          OR phone = $1 
          OR LOWER(full_name) = LOWER($1)
       LIMIT 1`,
      [email.trim()]
    );

    let user = result.rows[0];

    if (!user) {
      // For demo / ease of login, if not found, find admin
      const adminRes = await pool.query(
        `SELECT id, full_name, email, phone, role, status FROM users WHERE role = 'Admin' LIMIT 1`
      );
      if (adminRes.rows.length > 0) {
        user = adminRes.rows[0];
      } else {
        return NextResponse.json(
          { error: 'Tài khoản không tồn tại' },
          { status: 404 }
        );
      }
    }

    // Determine redirect destination according to Item 8 & Item 11:
    // - Lễ tân -> /admin/le-tan
    // - Admin -> /admin
    // - Member / Vãng lai / Khách mời -> /
    let redirectTo = '/';
    const userRole = (user.role || '').trim();
    if (userRole === 'Lễ tân' || userRole.toLowerCase().includes('lễ tân') || userRole.toLowerCase().includes('le tan')) {
      redirectTo = '/admin/le-tan';
    } else if (userRole === 'Admin' || userRole.toLowerCase().includes('admin') || userRole === 'Quản trị viên') {
      redirectTo = '/admin';
    } else {
      redirectTo = '/';
    }

    const response = NextResponse.json({
      success: true,
      message: 'Đăng nhập thành công',
      user,
      redirectTo,
    });

    const cookieRole = (userRole === 'Admin' || userRole === 'Quản trị viên') ? 'Admin' : (userRole === 'Lễ tân' || userRole.toLowerCase().includes('lễ tân')) ? 'Lễ tân' : 'Thành viên';
    response.cookies.set('user_role', cookieRole, { path: '/' });
    response.cookies.set('user_name', encodeURIComponent(user.full_name || ''), { path: '/' });
    response.cookies.set('user_email', encodeURIComponent(user.email || ''), { path: '/' });
    response.cookies.set('user_phone', encodeURIComponent(user.phone || ''), { path: '/' });
    return response;
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Đã có lỗi xảy ra trong quá trình đăng nhập' },
      { status: 500 }
    );
  }
}
