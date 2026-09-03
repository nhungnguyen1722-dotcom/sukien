import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

export const dynamic = 'force-dynamic';

// GET: Lấy chi tiết một lời mời
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const result = await pool.query(
      `
      SELECT 
        i.id,
        i.inviter_id,
        i.invitee_name,
        i.invitee_email,
        i.invitee_phone,
        COALESCE(i.status, 'Đang chờ') AS status,
        COALESCE(i.reward_points, 0) AS reward_points,
        i.created_at,
        i.updated_at,
        u.full_name AS inviter_name,
        u.ref_code AS inviter_ref_code
      FROM invitations i
      LEFT JOIN users u ON i.inviter_id = u.id
      WHERE i.id = $1
      `,
      [parseInt(id, 10)]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Không tìm thấy lời mời' },
        { status: 404 }
      );
    }

    const row = result.rows[0];
    return NextResponse.json({
      invitation: {
        ...row,
        created_at: row.created_at ? new Date(row.created_at).toISOString() : null,
        updated_at: row.updated_at ? new Date(row.updated_at).toISOString() : null,
      },
    });
  } catch (error) {
    console.error('Failed to get invitation detail:', error);
    return NextResponse.json(
      { error: 'Lỗi khi lấy thông tin lời mời' },
      { status: 500 }
    );
  }
}

// PATCH: Cập nhật thông tin / trạng thái lời mời
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { status, reward_points, invitee_name, invitee_email, invitee_phone } = body;

    const updates: string[] = [];
    const values: (string | number | null)[] = [parseInt(id, 10)];

    if (status !== undefined) {
      values.push(status);
      updates.push(`status = $${values.length}`);
      // If status changed to 'Đã tham gia' and reward_points not explicitly set, set reward_points = 1
      if (status === 'Đã tham gia' && reward_points === undefined) {
        values.push(1);
        updates.push(`reward_points = $${values.length}`);
      } else if (status !== 'Đã tham gia' && reward_points === undefined) {
        values.push(0);
        updates.push(`reward_points = $${values.length}`);
      }
    }

    if (reward_points !== undefined) {
      values.push(reward_points);
      updates.push(`reward_points = $${values.length}`);
    }

    if (invitee_name !== undefined) {
      values.push(invitee_name);
      updates.push(`invitee_name = $${values.length}`);
    }

    if (invitee_email !== undefined) {
      values.push(invitee_email);
      updates.push(`invitee_email = $${values.length}`);
    }

    if (invitee_phone !== undefined) {
      values.push(invitee_phone);
      updates.push(`invitee_phone = $${values.length}`);
    }

    if (updates.length === 0) {
      return NextResponse.json(
        { error: 'Không có thông tin cần cập nhật' },
        { status: 400 }
      );
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);

    const query = `
      UPDATE invitations
      SET ${updates.join(', ')}
      WHERE id = $1
      RETURNING *
    `;

    const result = await pool.query(query, values);

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Không tìm thấy lời mời để cập nhật' },
        { status: 404 }
      );
    }

    const updated = result.rows[0];

    return NextResponse.json({
      invitation: {
        ...updated,
        created_at: updated.created_at ? new Date(updated.created_at).toISOString() : null,
        updated_at: updated.updated_at ? new Date(updated.updated_at).toISOString() : null,
      },
      message: 'Cập nhật lời mời thành công!',
    });
  } catch (error) {
    console.error('Failed to update invitation:', error);
    return NextResponse.json(
      { error: 'Lỗi khi cập nhật lời mời' },
      { status: 500 }
    );
  }
}

// POST: Gửi nhắc nhở (Remind)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const result = await pool.query(
      `SELECT * FROM invitations WHERE id = $1`,
      [parseInt(id, 10)]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Không tìm thấy lời mời' },
        { status: 404 }
      );
    }

    const invitation = result.rows[0];

    // Update updated_at timestamp to indicate reminder was sent
    await pool.query(
      `UPDATE invitations SET updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
      [invitation.id]
    );

    return NextResponse.json({
      message: `Đã gửi email nhắc nhở thành công tới ${invitation.invitee_email}!`,
      invitation: {
        ...invitation,
        updated_at: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Failed to send reminder:', error);
    return NextResponse.json(
      { error: 'Lỗi khi gửi email nhắc nhở' },
      { status: 500 }
    );
  }
}

// DELETE: Xóa lời mời
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const result = await pool.query(
      `DELETE FROM invitations WHERE id = $1 RETURNING id`,
      [parseInt(id, 10)]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Không tìm thấy lời mời để xóa' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      message: 'Xóa lời mời thành công',
      id: result.rows[0].id,
    });
  } catch (error) {
    console.error('Failed to delete invitation:', error);
    return NextResponse.json(
      { error: 'Lỗi khi xóa lời mời' },
      { status: 500 }
    );
  }
}
