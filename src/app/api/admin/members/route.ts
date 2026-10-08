import { NextRequest } from 'next/server';
import pool from '@/lib/db';
import { resolveMemberTeamId, ensureMemberSchema, syncUserToTeamLead, UNIFIED_TEAM_NAME_SQL, UNIFIED_TITLE_SQL } from '@/lib/memberTeams';

export const dynamic = 'force-dynamic';

// GET: Lấy danh sách thành viên, thống kê và danh sách người giới thiệu
export async function GET(request: NextRequest) {
  try {
    await ensureMemberSchema();
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
        u.avatar_url,
        u.identity_card,
        u.bank_account,
        u.role,
        u.classification,
        ${UNIFIED_TITLE_SQL} AS title,
        u.team_id,
        ${UNIFIED_TEAM_NAME_SQL} AS team_name,
        u.ref_code,
        u.referrer_id,
        u.referral_group,
        u.source,
        u.join_date,
        u.status,
        COALESCE(
          u.is_team_leader_eligible,
          EXISTS(
            SELECT 1 FROM teamlead_members tm
            WHERE (tm.member_id = u.id OR (NULLIF(REGEXP_REPLACE(tm.member_phone, '[^0-9]', '', 'g'), '') IS NOT NULL AND REGEXP_REPLACE(tm.member_phone, '[^0-9]', '', 'g') = REGEXP_REPLACE(u.phone, '[^0-9]', '', 'g')))
              AND (tm.include_30 = TRUE OR EXISTS(SELECT 1 FROM teamlead_member_teams tmt WHERE tmt.member_id = tm.id))
          ),
          FALSE
        ) AS is_team_leader_eligible,
        u.invite_count,
        u.guest_count,
        u.notes,
        u.created_at,
        u.updated_at,
        r.full_name AS referrer_name,
        r.phone AS referrer_phone,
        COALESCE(cnt.contract_count, 0)::int AS contract_count,
        COALESCE(cnt.total_contract_value, 0)::float8 AS total_contract_value,
        COALESCE(cnt.total_commission, 0)::float8 AS total_commission,
        COALESCE(tx.paid_amount, 0)::float8 AS total_paid_amount,
        COALESCE(tx.pending_amount, 0)::float8 AS total_pending_amount
      FROM users u
      LEFT JOIN users r ON u.referrer_id = r.id
      LEFT JOIN teams t ON u.team_id = t.id
      LEFT JOIN (
        SELECT 
          closer_id,
          COUNT(*)::int AS contract_count,
          SUM(value)::float8 AS total_contract_value,
          SUM(COALESCE(closer_fee, 0))::float8 AS total_commission
        FROM contracts
        WHERE closer_id IS NOT NULL
        GROUP BY closer_id
      ) cnt ON cnt.closer_id = u.id
      LEFT JOIN (
        SELECT 
          beneficiary_user_id,
          SUM(CASE WHEN status IN ('Đã chi', 'Đã thanh toán', 'Đã thực hiện') THEN COALESCE(actual_expense, proposed_amount, 0) ELSE 0 END)::float8 AS paid_amount,
          SUM(CASE WHEN status IN ('Chờ duyệt', 'Đã duyệt') THEN COALESCE(proposed_amount, 0) ELSE 0 END)::float8 AS pending_amount
        FROM transaction_logs
        WHERE beneficiary_user_id IS NOT NULL
        GROUP BY beneficiary_user_id
      ) tx ON tx.beneficiary_user_id = u.id
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
        OR u.team_name ILIKE $${params.length}
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
      team_name,
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
      avatar_url,
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

    await ensureMemberSchema();
    const teamId = await resolveMemberTeamId(team_name);
    const normalizedTeamName = typeof team_name === 'string' && team_name.trim() ? team_name.trim() : null;
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
        team_id,
        team_name,
        ref_code,
        referrer_id,
        referral_group,
        source,
        join_date,
        status,
        is_team_leader_eligible,
        guest_count,
        notes,
        avatar_url
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
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
        teamId,
        normalizedTeamName,
        ref_code && ref_code.trim() ? ref_code.trim() : (phone ? `N_${phone.trim()}` : null),
        referrer_id ? parseInt(referrer_id) : null,
        referral_group || 'Khách vãng lai',
        source ? source.trim() : null,
        join_date ? join_date : null,
        status || 'Hoạt động',
        !!is_team_leader_eligible,
        guest_count !== undefined && guest_count !== '' ? parseInt(guest_count) : 0,
        notes ? notes.trim() : null,
        avatar_url ? avatar_url.trim() : null,
      ]
    );

    const insertedUser = result.rows[0];

    // Đồng bộ sang phân hệ TeamLead
    try {
      await syncUserToTeamLead(insertedUser.id);
    } catch (syncErr) {
      console.error('Failed to sync new user to TeamLead:', syncErr);
    }

    return Response.json({ member: insertedUser }, { status: 201 });
  } catch (error) {
    console.error('Failed to create member:', error);
    return Response.json({ error: 'Có lỗi xảy ra khi tạo thành viên mới' }, { status: 500 });
  }
}
