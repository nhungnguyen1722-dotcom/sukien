import { NextRequest } from 'next/server';
import pool from '@/lib/db';

export const dynamic = 'force-dynamic';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET: Lấy thông tin chi tiết của một thành viên
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const memberId = parseInt(id);

    if (isNaN(memberId)) {
      return Response.json({ error: 'ID thành viên không hợp lệ' }, { status: 400 });
    }

    const result = await pool.query(
      `SELECT 
        u.*,
        r.full_name AS referrer_name
      FROM users u
      LEFT JOIN users r ON u.referrer_id = r.id
      WHERE u.id = $1`,
      [memberId]
    );

    if (result.rows.length === 0) {
      return Response.json({ error: 'Không tìm thấy thành viên' }, { status: 404 });
    }

    return Response.json({ member: result.rows[0] });
  } catch (error) {
    console.error('Failed to get member:', error);
    return Response.json({ error: 'Lỗi khi lấy thông tin thành viên' }, { status: 500 });
  }
}

// PUT: Cập nhật thông tin thành viên
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const memberId = parseInt(id);

    if (isNaN(memberId)) {
      return Response.json({ error: 'ID thành viên không hợp lệ' }, { status: 400 });
    }

    const body = await request.json();
    const {
      full_name,
      phone,
      referral_group,
      ref_code,
      role,
      classification,
      title,
      referrer_id,
      source,
      join_date,
      guest_count,
      email,
      bank_account,
      identity_card,
      status,
      notes,
      is_team_leader_eligible,
    } = body;

    if (!full_name || !full_name.trim()) {
      return Response.json({ error: 'Họ và tên là bắt buộc' }, { status: 400 });
    }

    if (!phone || !phone.trim()) {
      return Response.json({ error: 'Số điện thoại là bắt buộc' }, { status: 400 });
    }

    // Kiểm tra trùng SĐT với user khác
    const existingPhone = await pool.query(
      'SELECT id FROM users WHERE phone = $1 AND id != $2',
      [phone.trim(), memberId]
    );
    if (existingPhone.rows.length > 0) {
      return Response.json({ error: 'Số điện thoại này đã được sử dụng bởi thành viên khác' }, { status: 409 });
    }

    // Kiểm tra trùng email với user khác nếu có nhập
    if (email && email.trim()) {
      const existingEmail = await pool.query(
        'SELECT id FROM users WHERE email = $1 AND id != $2',
        [email.trim(), memberId]
      );
      if (existingEmail.rows.length > 0) {
        return Response.json({ error: 'Email này đã được sử dụng bởi thành viên khác' }, { status: 409 });
      }
    }

    const result = await pool.query(
      `UPDATE users
       SET 
        full_name = $1,
        phone = $2,
        email = $3,
        identity_card = $4,
        bank_account = $5,
        role = $6,
        classification = $7,
        title = $8,
        ref_code = $9,
        referrer_id = $10,
        referral_group = $11,
        source = $12,
        join_date = $13,
        status = $14,
        is_team_leader_eligible = $15,
        guest_count = $16,
        notes = $17,
        updated_at = CURRENT_TIMESTAMP
       WHERE id = $18
       RETURNING *`,
      [
        full_name.trim(),
        phone.trim(),
        email ? email.trim() : null,
        identity_card ? identity_card.trim() : null,
        bank_account ? bank_account.trim() : null,
        role || 'Khác',
        classification || 'Nhân sự',
        title || 'Thành viên',
        ref_code ? ref_code.trim() : null,
        referrer_id ? parseInt(referrer_id) : null,
        referral_group || 'Khách vãng lai',
        source ? source.trim() : null,
        join_date ? join_date : null,
        status || 'Hoạt động',
        !!is_team_leader_eligible,
        guest_count !== undefined && guest_count !== '' ? parseInt(guest_count) : 0,
        notes ? notes.trim() : null,
        memberId,
      ]
    );

    if (result.rows.length === 0) {
      return Response.json({ error: 'Không tìm thấy thành viên để cập nhật' }, { status: 404 });
    }

    return Response.json({ member: result.rows[0] });
  } catch (error) {
    console.error('Failed to update member:', error);
    return Response.json({ error: 'Có lỗi xảy ra khi cập nhật thông tin thành viên' }, { status: 500 });
  }
}

// DELETE: Xóa thành viên
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const memberId = parseInt(id);

    if (isNaN(memberId)) {
      return Response.json({ error: 'ID thành viên không hợp lệ' }, { status: 400 });
    }

    // Set null referrer_id cho các thành viên có người giới thiệu là member này
    await pool.query('UPDATE users SET referrer_id = NULL WHERE referrer_id = $1', [memberId]);
    await pool.query('UPDATE teams SET leader_id = NULL WHERE leader_id = $1', [memberId]);

    const result = await pool.query('DELETE FROM users WHERE id = $1 RETURNING id', [memberId]);

    if (result.rows.length === 0) {
      return Response.json({ error: 'Không tìm thấy thành viên để xóa' }, { status: 404 });
    }

    return Response.json({ success: true, message: 'Đã xóa thành viên thành công' });
  } catch (error) {
    console.error('Failed to delete member:', error);
    return Response.json({ error: 'Có lỗi xảy ra khi xóa thành viên' }, { status: 500 });
  }
}
