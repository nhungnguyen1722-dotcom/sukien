import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { fullName, phone, email, password } = body;

    if (!fullName || !fullName.trim()) {
      return NextResponse.json(
        { error: 'Vui lòng nhập họ và tên' },
        { status: 400 }
      );
    }

    if (!phone && !email) {
      return NextResponse.json(
        { error: 'Vui lòng nhập số điện thoại hoặc email' },
        { status: 400 }
      );
    }

    const cleanName = fullName.trim();
    const cleanPhone = phone ? phone.trim().replace(/\s+/g, '') : null;
    const cleanEmail = email ? email.trim().toLowerCase() : null;
    const cleanPassword = password ? password.trim() : (cleanPhone || '123456');

    // Check if user already exists
    if (cleanPhone) {
      const phoneCheck = await pool.query(
        'SELECT id FROM users WHERE phone = $1 LIMIT 1',
        [cleanPhone]
      );
      if (phoneCheck.rows.length > 0) {
        return NextResponse.json(
          { error: 'Số điện thoại này đã được đăng ký tài khoản' },
          { status: 400 }
        );
      }
    }

    if (cleanEmail) {
      const emailCheck = await pool.query(
        'SELECT id FROM users WHERE LOWER(email) = LOWER($1) LIMIT 1',
        [cleanEmail]
      );
      if (emailCheck.rows.length > 0) {
        return NextResponse.json(
          { error: 'Email này đã được đăng ký tài khoản' },
          { status: 400 }
        );
      }
    }

    // Insert new member user
    const insertRes = await pool.query(
      `INSERT INTO users (
        full_name,
        phone,
        email,
        password,
        role,
        classification,
        status,
        join_date
      ) VALUES ($1, $2, $3, $4, 'Thành viên', 'Thành viên', 'Đang hoạt động', CURRENT_DATE)
      RETURNING id, full_name, phone, email, role, status`,
      [cleanName, cleanPhone, cleanEmail, cleanPassword]
    );

    const newUser = insertRes.rows[0];

    // According to Item 8: After member registration -> redirect to homepage (/)
    const redirectTo = '/';

    const response = NextResponse.json({
      success: true,
      message: 'Đăng ký tài khoản thành công',
      user: newUser,
      role: newUser.role,
      redirectTo,
    });

    response.cookies.set('user_role', 'Thành viên', { path: '/' });
    response.cookies.set('user_name', encodeURIComponent(newUser.full_name || ''), { path: '/' });
    response.cookies.set('user_email', encodeURIComponent(newUser.email || ''), { path: '/' });
    if (newUser.phone) {
      response.cookies.set('user_phone', encodeURIComponent(newUser.phone), { path: '/' });
    }
    response.cookies.set('user_id', String(newUser.id), { path: '/' });

    return response;
  } catch (error: any) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'Đã có lỗi xảy ra trong quá trình đăng ký: ' + (error.message || '') },
      { status: 500 }
    );
  }
}
