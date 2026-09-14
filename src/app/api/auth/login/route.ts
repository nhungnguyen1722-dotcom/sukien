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

    // Phân quyền chuyển hướng & lưu cookie:
    // - Lễ tân -> /admin/le-tan
    // - Admin & các tài khoản Mục 1 (MC, Nhân sự, Nhân viên, Diễn giả, Khác, Phụng sự, Chốt sự kiện...) -> /admin
    const userRole = (user.role || '').trim();
    const lowerRole = userRole.toLowerCase();
    const isAdmin = lowerRole.includes('admin') || lowerRole.includes('quản trị');
    const isReception = lowerRole.includes('lễ tân') || lowerRole.includes('le tan') || lowerRole.includes('reception');

    let redirectTo = '/admin';
    if (isReception) {
      redirectTo = '/admin/le-tan';
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

    const cookieRole = user.role || (isAdmin ? 'Admin' : isReception ? 'Lễ tân' : 'Thành viên');
    const cookieOptions = {
      path: '/',
      maxAge: 365 * 24 * 60 * 60, // Lưu cookie persistent 1 năm
      sameSite: 'lax' as const,
    };
    response.cookies.set('user_role', cookieRole, cookieOptions);
    response.cookies.set('user_name', encodeURIComponent(user.full_name || ''), cookieOptions);
    response.cookies.set('user_email', encodeURIComponent(user.email || ''), cookieOptions);
    response.cookies.set('user_phone', encodeURIComponent(user.phone || ''), cookieOptions);
    response.cookies.set('user_id', String(user.id), cookieOptions);
    return response;
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Đã có lỗi xảy ra trong quá trình đăng nhập' },
      { status: 500 }
    );
  }
}
