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
      return NextResponse.json(
        { error: 'Tài khoản không tồn tại hoặc thông tin đăng nhập không chính xác' },
        { status: 404 }
      );
    }

    // Determine redirect destination according to Item 8:
    // - ONLY Admin accounts -> /admin
    // - Lễ tân -> /admin/le-tan
    // - Member / Vãng lai / Khách mời / All other roles -> /
    const userRole = (user.role || '').trim();
    const lowerRole = userRole.toLowerCase();
    const isAdmin = lowerRole.includes('admin') || lowerRole.includes('quản trị');
    const isReception = lowerRole.includes('lễ tân') || lowerRole.includes('le tan') || lowerRole.includes('reception');

    let redirectTo = '/';
    if (isAdmin) {
      redirectTo = '/admin';
    } else if (isReception) {
      redirectTo = '/admin/le-tan';
    } else {
      redirectTo = '/';
    }

    const response = NextResponse.json({
      success: true,
      message: 'Đăng nhập thành công',
      user: {
        id: user.id,
        full_name: user.full_name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        status: user.status,
      },
      role: user.role,
      isAdmin,
      isReception,
      redirectTo,
    });

    const cookieRole = isAdmin ? 'Admin' : isReception ? 'Lễ tân' : 'Thành viên';
    response.cookies.set('user_role', cookieRole, { path: '/' });
    response.cookies.set('user_name', encodeURIComponent(user.full_name || ''), { path: '/' });
    response.cookies.set('user_email', encodeURIComponent(user.email || ''), { path: '/' });
    response.cookies.set('user_phone', encodeURIComponent(user.phone || ''), { path: '/' });
    response.cookies.set('user_id', String(user.id), { path: '/' });
    return response;
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Đã có lỗi xảy ra trong quá trình đăng nhập' },
      { status: 500 }
    );
  }
}
