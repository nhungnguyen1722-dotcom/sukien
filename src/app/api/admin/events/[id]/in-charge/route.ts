import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

export const dynamic = 'force-dynamic';

interface RouteProps {
  params: Promise<{ id: string }>;
}

// GET: Lấy danh sách người phụ trách của sự kiện
export async function GET(request: NextRequest, { params }: RouteProps) {
  try {
    const { id } = await params;
    const eventId = parseInt(id, 10);
    if (isNaN(eventId)) {
      return NextResponse.json({ error: 'Mã sự kiện không hợp lệ' }, { status: 400 });
    }

    const res = await pool.query(
      `SELECT id, event_id, user_id, full_name, position, phone, email, avatar, roles, status, created_at
       FROM event_in_charge
       WHERE event_id = $1
       ORDER BY id ASC`,
      [eventId]
    );

    return NextResponse.json({ inChargePersons: res.rows });
  } catch (error) {
    console.error('Error fetching in-charge persons:', error);
    return NextResponse.json({ error: 'Lỗi máy chủ khi lấy người phụ trách' }, { status: 500 });
  }
}

// POST: Thêm hoặc đăng ký làm người phụ trách
export async function POST(request: NextRequest, { params }: RouteProps) {
  try {
    const { id } = await params;
    const eventId = parseInt(id, 10);
    if (isNaN(eventId)) {
      return NextResponse.json({ error: 'Mã sự kiện không hợp lệ' }, { status: 400 });
    }

    const body = await request.json();
    const {
      user_id,
      full_name,
      position = 'Thành viên',
      phone,
      email,
      avatar = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
      roles = ['Diễn giả'],
      status = 'Chờ duyệt', // Mặc định thành viên đăng ký là Chờ duyệt, admin có thể gửi 'Đã duyệt'
    } = body;

    if (!full_name || !full_name.trim()) {
      return NextResponse.json({ error: 'Vui lòng nhập họ và tên' }, { status: 400 });
    }

    const res = await pool.query(
      `INSERT INTO event_in_charge (
        event_id, user_id, full_name, position, phone, email, avatar, roles, status, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      RETURNING *`,
      [
        eventId,
        user_id ? parseInt(user_id, 10) : null,
        full_name.trim(),
        position.trim(),
        phone?.trim() || null,
        email?.trim() || null,
        avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
        Array.isArray(roles) ? roles : [roles],
        status,
      ]
    );

    return NextResponse.json({ success: true, person: res.rows[0] });
  } catch (error) {
    console.error('Error adding in-charge person:', error);
    return NextResponse.json({ error: 'Lỗi máy chủ khi thêm người phụ trách' }, { status: 500 });
  }
}

// PATCH: Cập nhật thông tin hoặc duyệt người phụ trách
export async function PATCH(request: NextRequest, { params }: RouteProps) {
  try {
    const { id } = await params;
    const eventId = parseInt(id, 10);
    const body = await request.json();
    const { personId, status, full_name, position, phone, email, roles } = body;

    if (!personId) {
      return NextResponse.json({ error: 'Thiếu mã người phụ trách' }, { status: 400 });
    }

    const updates: string[] = ['updated_at = CURRENT_TIMESTAMP'];
    const values: any[] = [];

    if (status) {
      values.push(status);
      updates.push(`status = $${values.length}`);
    }
    if (full_name) {
      values.push(full_name.trim());
      updates.push(`full_name = $${values.length}`);
    }
    if (position) {
      values.push(position.trim());
      updates.push(`position = $${values.length}`);
    }
    if (phone !== undefined) {
      values.push(phone?.trim() || null);
      updates.push(`phone = $${values.length}`);
    }
    if (email !== undefined) {
      values.push(email?.trim() || null);
      updates.push(`email = $${values.length}`);
    }
    if (roles !== undefined && Array.isArray(roles)) {
      values.push(roles);
      updates.push(`roles = $${values.length}`);
    }

    values.push(personId);
    values.push(eventId);

    const query = `
      UPDATE event_in_charge 
      SET ${updates.join(', ')}
      WHERE id = $${values.length - 1} AND event_id = $${values.length}
      RETURNING *
    `;

    const res = await pool.query(query, values);
    if (res.rows.length === 0) {
      return NextResponse.json({ error: 'Không tìm thấy người phụ trách' }, { status: 404 });
    }

    return NextResponse.json({ success: true, person: res.rows[0] });
  } catch (error) {
    console.error('Error updating in-charge person:', error);
    return NextResponse.json({ error: 'Lỗi máy chủ khi cập nhật người phụ trách' }, { status: 500 });
  }
}

// DELETE: Xóa người phụ trách
export async function DELETE(request: NextRequest, { params }: RouteProps) {
  try {
    const { id } = await params;
    const eventId = parseInt(id, 10);
    const { searchParams } = new URL(request.url);
    const personId = searchParams.get('personId');

    if (!personId) {
      return NextResponse.json({ error: 'Thiếu mã người phụ trách' }, { status: 400 });
    }

    await pool.query(
      'DELETE FROM event_in_charge WHERE id = $1 AND event_id = $2',
      [parseInt(personId, 10), eventId]
    );

    return NextResponse.json({ success: true, message: 'Đã xóa người phụ trách' });
  } catch (error) {
    console.error('Error deleting in-charge person:', error);
    return NextResponse.json({ error: 'Lỗi máy chủ khi xóa người phụ trách' }, { status: 500 });
  }
}
