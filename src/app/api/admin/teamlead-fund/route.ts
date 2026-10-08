import { NextRequest } from 'next/server';
import pool from '@/lib/db';
import { safeDecodeURI } from '@/lib/authUtils';

export const dynamic = 'force-dynamic';

function isAdmin(request: NextRequest) {
  const role = safeDecodeURI(request.cookies.get('user_role')?.value).toLocaleLowerCase('vi-VN');
  return role.includes('admin') || role.includes('quản trị') || role.includes('quan tri');
}

function validMonth(month: string) {
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(month);
}

export async function GET(request: NextRequest) {
  if (!isAdmin(request)) {
    return Response.json({ error: 'Chỉ tài khoản Admin mới được xem tỷ lệ phân bổ quỹ TeamLead' }, { status: 403 });
  }

  const month = request.nextUrl.searchParams.get('month') || '';
  if (!validMonth(month)) {
    return Response.json({ error: 'Tháng không hợp lệ' }, { status: 400 });
  }

  try {
    const result = await pool.query(
      'SELECT leader_percent, updated_by, updated_at::text AS updated_at FROM teamlead_fund_splits WHERE fund_month = $1',
      [month]
    );
    const saved = result.rows[0];
    return Response.json({
      month,
      leader_percent: saved?.leader_percent === 70 ? 70 : 30,
      is_saved: Boolean(saved),
      updated_by: saved?.updated_by || null,
      updated_at: saved?.updated_at || null,
    });
  } catch (error) {
    console.error('Failed to read TeamLead fund split:', error);
    return Response.json({ error: 'Không thể tải tỷ lệ phân bổ quỹ TeamLead' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  if (!isAdmin(request)) {
    return Response.json({ error: 'Chỉ tài khoản Admin mới được lưu tỷ lệ phân bổ quỹ TeamLead' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const month = String(body.month || '');
    const leaderPercent = Number(body.leader_percent);
    if (!validMonth(month) || ![30, 70].includes(leaderPercent)) {
      return Response.json({ error: 'Chọn tháng hợp lệ và tỷ lệ 30% hoặc 70%' }, { status: 400 });
    }

    const updatedBy = safeDecodeURI(request.cookies.get('user_name')?.value) || null;
    const result = await pool.query(
      `INSERT INTO teamlead_fund_splits (fund_month, leader_percent, updated_by, updated_at)
       VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
       ON CONFLICT (fund_month) DO UPDATE
       SET leader_percent = EXCLUDED.leader_percent,
           updated_by = EXCLUDED.updated_by,
           updated_at = CURRENT_TIMESTAMP
       RETURNING leader_percent, updated_by, updated_at::text AS updated_at`,
      [month, leaderPercent, updatedBy]
    );

    return Response.json({ month, ...result.rows[0] });
  } catch (error) {
    console.error('Failed to save TeamLead fund split:', error);
    return Response.json({ error: 'Không thể lưu tỷ lệ phân bổ quỹ TeamLead' }, { status: 500 });
  }
}
