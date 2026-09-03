import { NextRequest } from 'next/server';
import pool from '@/lib/db';

export const dynamic = 'force-dynamic';

// GET: Lấy danh sách thành viên, thống kê và danh sách người giới thiệu
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get('search') || '';
    const role = searchParams.get('role') || '';
    const status = searchParams.get('status') || '';
    const classification = searchParams.get('classification') || '';

    // Lọc thành viên
    let query = `
      SELECT 
        u.id,
        u.full_name,
        u.phone,
        u.email,
        u.identity_card,
        u.bank_account,
        u.role,
        u.classification,
        u.title,
        u.team_id,
        u.ref_code,
        u.referrer_id,
        u.referral_group,
        u.source,
        u.join_date,
        u.status,
        u.is_team_leader_eligible,
        u.invite_count,
        u.guest_count,
        u.notes,
        u.created_at,
        u.updated_at,
        r.full_name AS referrer_name
      FROM users u
      LEFT JOIN users r ON u.referrer_id = r.id
      WHERE 1=1
    `;
    const params: (string | number)[] = [];

    if (search.trim()) {
      params.push(`%${search.trim()}%`);
      query += ` AND (
        u.full_name ILIKE $${params.length} 
        OR u.phone ILIKE $${params.length} 
        OR u.email ILIKE $${params.length}
        OR u.ref_code ILIKE $${params.length}
        OR u.role ILIKE $${params.length}
      )`;
    }

    if (role) {
      params.push(role);
      query += ` AND u.role = $${params.length}`;
    }

    if (status) {
      params.push(status);
      query += ` AND u.status = $${params.length}`;
    }

    if (classification) {
      params.push(classification);
      query += ` AND u.classification = $${params.length}`;
    }

    query += ' ORDER BY u.id ASC';

    const [membersRes, statsRes, referrersRes] = await Promise.all([
      pool.query(query, params),
      pool.query(`
        SELECT 
          COUNT(*)::int AS total_members,
          COUNT(CASE WHEN status IN ('Đang hoạt động', 'Hoạt động') THEN 1 END)::int AS active_members,
          COUNT(CASE WHEN created_at >= date_trunc('month', CURRENT_DATE) OR join_date >= date_trunc('month', CURRENT_DATE) THEN 1 END)::int AS new_members,
          COUNT(CASE WHEN status NOT IN ('Đang hoạt động', 'Hoạt động') OR status = 'Không hoạt động' OR status = 'Tạm khóa' THEN 1 END)::int AS inactive_members
        FROM users
      `),
      pool.query(`SELECT id, full_name, phone, ref_code FROM users ORDER BY full_name ASC`),
    ]);

    const statsRow = statsRes.rows[0] || {
      total_members: 0,
      active_members: 0,
      new_members: 0,
      inactive_members: 0,
    };

    return Response.json({
      members: membersRes.rows,
      stats: {
        totalMembers: statsRow.total_members,
        activeMembers: statsRow.active_members,
        newMembers: statsRow.new_members,
        inactiveMembers: statsRow.inactive_members,
      },
      referrers: referrersRes.rows,
    });
  } catch (error) {
    console.error('Failed to fetch members:', error);
    return Response.json({ error: 'Lỗi khi lấy danh sách thành viên' }, { status: 500 });
  }
}

// POST: Thêm mới thành viên
export async function POST(request: NextRequest) {
  try {
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

    // Kiểm tra trùng SĐT
    const existingPhone = await pool.query('SELECT id FROM users WHERE phone = $1', [phone.trim()]);
    if (existingPhone.rows.length > 0) {
      return Response.json({ error: 'Số điện thoại này đã tồn tại trong hệ thống' }, { status: 409 });
    }

    // Kiểm tra trùng email nếu có nhập
    if (email && email.trim()) {
      const existingEmail = await pool.query('SELECT id FROM users WHERE email = $1', [email.trim()]);
      if (existingEmail.rows.length > 0) {
        return Response.json({ error: 'Email này đã tồn tại trong hệ thống' }, { status: 409 });
      }
    }

    const result = await pool.query(
      `INSERT INTO users (
        full_name,
        phone,
        email,
        identity_card,
        bank_account,
        role,
        classification,
        title,
        ref_code,
        referrer_id,
        referral_group,
        source,
        join_date,
        status,
        is_team_leader_eligible,
        guest_count,
        notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
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
      ]
    );

    return Response.json({ member: result.rows[0] }, { status: 201 });
  } catch (error) {
    console.error('Failed to create member:', error);
    return Response.json({ error: 'Có lỗi xảy ra khi tạo thành viên mới' }, { status: 500 });
  }
}
