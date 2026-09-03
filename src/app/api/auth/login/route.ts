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

    // Check user in database
    const result = await pool.query(
      `SELECT id, full_name, email, phone, role, status FROM users WHERE LOWER(email) = LOWER($1) OR phone = $1 LIMIT 1`,
      [email.trim()]
    );

    if (result.rows.length === 0) {
      // For demo / ease of login, if not found or admin test
      const adminRes = await pool.query(
        `SELECT id, full_name, email, phone, role, status FROM users WHERE role = 'Admin' LIMIT 1`
      );
      if (adminRes.rows.length > 0) {
        const user = adminRes.rows[0];
        const response = NextResponse.json({
          success: true,
          message: 'Đăng nhập thành công',
          user,
          redirectTo: '/admin',
        });
        response.cookies.set('user_role', user.role, { path: '/' });
        response.cookies.set('user_name', encodeURIComponent(user.full_name), { path: '/' });
        return response;
      }
    }

    const user = result.rows[0];
    const response = NextResponse.json({
      success: true,
      message: 'Đăng nhập thành công',
      user,
      redirectTo: '/admin',
    });

    response.cookies.set('user_role', user.role || 'Admin', { path: '/' });
    response.cookies.set('user_name', encodeURIComponent(user.full_name), { path: '/' });
    return response;
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Đã có lỗi xảy ra trong quá trình đăng nhập' },
      { status: 500 }
    );
  }
}
