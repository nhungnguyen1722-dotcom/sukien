import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

export const dynamic = 'force-dynamic';

// GET: Lấy danh sách lời mời và thống kê
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || '';
    const inviterId = searchParams.get('inviterId');

    let query = `
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
      WHERE 1=1
    `;

    const params: (string | number)[] = [];

    if (inviterId) {
      params.push(parseInt(inviterId, 10));
      query += ` AND i.inviter_id = $${params.length}`;
    }

    if (status && status !== 'all') {
      params.push(status);
      query += ` AND i.status = $${params.length}`;
    }

    if (search.trim()) {
      params.push(`%${search.trim()}%`);
      query += ` AND (i.invitee_name ILIKE $${params.length} OR i.invitee_email ILIKE $${params.length} OR i.invitee_phone ILIKE $${params.length})`;
    }

    query += ` ORDER BY i.id ASC`;

    const [listRes, statsRes] = await Promise.all([
      pool.query(query, params),
      pool.query(`
        SELECT 
          COUNT(*)::int AS total_invites,
          COUNT(CASE WHEN status = 'Đã tham gia' THEN 1 END)::int AS joined_count,
          COUNT(CASE WHEN status = 'Đang chờ' THEN 1 END)::int AS pending_count,
          COUNT(CASE WHEN status = 'Từ chối' THEN 1 END)::int AS rejected_count,
          COALESCE(SUM(CASE WHEN status = 'Đã tham gia' THEN COALESCE(reward_points, 1) ELSE 0 END), 0)::int AS total_rewards
        FROM invitations
      `),
    ]);

    const stats = statsRes.rows[0] || {
      total_invites: 0,
      joined_count: 0,
      pending_count: 0,
      rejected_count: 0,
      total_rewards: 0,
    };

    return NextResponse.json({
      invitations: listRes.rows.map((row) => ({
        ...row,
        created_at: row.created_at ? new Date(row.created_at).toISOString() : null,
        updated_at: row.updated_at ? new Date(row.updated_at).toISOString() : null,
      })),
      stats: {
        totalInvites: stats.total_invites,
        joinedCount: stats.joined_count,
        pendingCount: stats.pending_count,
        rejectedCount: stats.rejected_count,
        totalRewards: stats.total_rewards,
      },
    });
  } catch (error) {
    console.error('Failed to fetch invitations:', error);
    return NextResponse.json(
      { error: 'Lỗi khi lấy danh sách lời mời' },
      { status: 500 }
    );
  }
}

// POST: Gửi lời mời mới qua email
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      invitee_name,
      invitee_email,
      invitee_phone,
      inviter_id = 1, // Default Admin
      status = 'Đang chờ',
      reward_points = 0,
    } = body;

    if (!invitee_email || !invitee_email.trim()) {
      return NextResponse.json(
        { error: 'Vui lòng nhập địa chỉ email bạn bè' },
        { status: 400 }
      );
    }

    // Email regex validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(invitee_email.trim())) {
      return NextResponse.json(
        { error: 'Địa chỉ email không hợp lệ' },
        { status: 400 }
      );
    }

    const insertResult = await pool.query(
      `
      INSERT INTO invitations (
        inviter_id,
        invitee_name,
        invitee_email,
        invitee_phone,
        status,
        reward_points,
        created_at,
        updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      RETURNING *
      `,
      [
        parseInt(inviter_id, 10),
        invitee_name?.trim() || null,
        invitee_email.trim().toLowerCase(),
        invitee_phone?.trim() || null,
        status,
        reward_points,
      ]
    );

    const newInvite = insertResult.rows[0];

    // Fetch inviter info
    const inviterRes = await pool.query(
      'SELECT full_name, ref_code FROM users WHERE id = $1',
      [newInvite.inviter_id]
    );
    const inviter = inviterRes.rows[0] || {};

    return NextResponse.json(
      {
        invitation: {
          ...newInvite,
          inviter_name: inviter.full_name || 'Admin',
          inviter_ref_code: inviter.ref_code || 'REF_CUC12',
          created_at: newInvite.created_at
            ? new Date(newInvite.created_at).toISOString()
            : null,
          updated_at: newInvite.updated_at
            ? new Date(newInvite.updated_at).toISOString()
            : null,
        },
        message: 'Gửi lời mời thành công!',
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Failed to create invitation:', error);
    return NextResponse.json(
      { error: 'Lỗi khi tạo lời mời mới' },
      { status: 500 }
    );
  }
}
