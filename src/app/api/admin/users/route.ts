import { NextRequest } from 'next/server';
import pool from '@/lib/db';

// GET: Lấy danh sách tài khoản admin
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get('search') || '';

    let query = `
      SELECT id, full_name, email, role, status, created_at
      FROM users
      WHERE email IS NOT NULL AND email != ''
        AND role IN ('Admin', 'Nhân viên')
    `;
    const params: string[] = [];

    if (search) {
      params.push(`%${search}%`);
      query += ` AND (full_name ILIKE $${params.length} OR email ILIKE $${params.length})`;
    }

    query += ' ORDER BY id ASC';

    const result = await pool.query(query, params);

    return Response.json({ users: result.rows });
  } catch (error) {
    console.error('Failed to fetch users:', error);
    return Response.json({ error: 'Failed to fetch users' }, { status: 500 });
  }
}

// POST: Tạo tài khoản mới
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { full_name, email, role, status } = body;

    if (!full_name || !email) {
      return Response.json({ error: 'Họ tên và email là bắt buộc' }, { status: 400 });
    }

    // Check email đã tồn tại
    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      return Response.json({ error: 'Email đã tồn tại trong hệ thống' }, { status: 409 });
    }

    // Tạo phone giả (vì phone là NOT NULL UNIQUE trong schema)
    const phone = `auto_${Date.now()}`;

    const result = await pool.query(
      `INSERT INTO users (full_name, phone, email, role, status)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, full_name, email, role, status, created_at`,
      [full_name, phone, email, role || 'Nhân viên', status || 'Đang hoạt động']
    );

    return Response.json({ user: result.rows[0] }, { status: 201 });
  } catch (error) {
    console.error('Failed to create user:', error);
    return Response.json({ error: 'Failed to create user' }, { status: 500 });
  }
}
