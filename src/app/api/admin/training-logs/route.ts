import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || '';
    const role = searchParams.get('role') || 'all';
    const status = searchParams.get('status') || 'all';
    const date = searchParams.get('date') || '';

    let query = `
      SELECT 
        id,
        session_code,
        session_name,
        member_phone,
        member_name,
        role,
        token_tier,
        token_count,
        session_budget,
        total_tokens,
        reward_amount,
        approver,
        status,
        TO_CHAR(training_date, 'YYYY-MM-DD') AS training_date,
        created_at
      FROM training_logs
      WHERE 1=1
    `;
    const params: any[] = [];

    if (search.trim()) {
      params.push(`%${search.trim().toLowerCase()}%`);
      query += ` AND (
        LOWER(session_code) LIKE $${params.length} OR
        LOWER(member_name) LIKE $${params.length} OR
        member_phone LIKE $${params.length} OR
        LOWER(COALESCE(session_name, '')) LIKE $${params.length}
      )`;
    }

    if (role !== 'all') {
      params.push(role);
      query += ` AND role = $${params.length}`;
    }

    if (status !== 'all') {
      params.push(status);
      query += ` AND status = $${params.length}`;
    }

    if (date) {
      params.push(date);
      query += ` AND training_date = $${params.length}`;
    }

    query += ` ORDER BY training_date DESC, session_code ASC, id ASC`;

    const res = await pool.query(query, params);

    // Compute stats
    const allRows = (await pool.query(`SELECT role, token_count, reward_amount, status, session_code, member_phone FROM training_logs`)).rows;
    const uniqueSessions = new Set(allRows.map((r) => r.session_code)).size;
    const uniqueMembers = new Set(allRows.map((r) => r.member_phone || r.member_name)).size;
    const totalTokens = allRows.reduce((acc, r) => acc + (parseFloat(r.token_count) || 0), 0);
    const totalRewards = allRows
      .filter((r) => r.status === 'Đã duyệt')
      .reduce((acc, r) => acc + (parseFloat(r.reward_amount) || 0), 0);

    // Role breakdown
    const roleStats: Record<string, number> = {
      'Giảng viên': 0,
      'Trợ giảng': 0,
      'Học viên xuất sắc': 0,
      'Học viên': 0,
    };
    allRows.forEach((r) => {
      const rRole = r.role || 'Học viên';
      if (roleStats[rRole] !== undefined) {
        roleStats[rRole] += parseFloat(r.reward_amount) || 0;
      }
    });

    return NextResponse.json({
      success: true,
      logs: res.rows,
      stats: {
        totalSessions: uniqueSessions,
        totalMembers: uniqueMembers,
        totalTokens,
        totalRewards,
        roleStats,
      },
    });
  } catch (error: any) {
    console.error('Error fetching training logs:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      session_code,
      session_name,
      member_phone,
      member_name,
      role,
      token_tier,
      token_count,
      session_budget,
      training_date,
      approver = 'Chị Cúc',
      status = 'Đã duyệt',
    } = body;

    if (!session_code || !member_name) {
      return NextResponse.json(
        { success: false, message: 'Vui lòng cung cấp mã buổi học và họ tên nhân sự' },
        { status: 400 }
      );
    }

    const tCount = parseFloat(token_count) || (token_tier === 'Hạng A' ? 10 : token_tier === 'Hạng B' ? 5 : token_tier === 'Hạng C' ? 3 : 1);
    const budget = parseFloat(session_budget) || 3000000;

    // Check current tokens of this session
    const curRes = await pool.query(
      `SELECT token_count FROM training_logs WHERE session_code = $1`,
      [session_code]
    );
    const existingTokens = curRes.rows.reduce((acc, r) => acc + (parseFloat(r.token_count) || 0), 0);
    const newTotalTokens = existingTokens + tCount;

    // Recalculate reward for this item
    const reward = (budget * tCount) / (newTotalTokens || 1);

    const insertRes = await pool.query(
      `
      INSERT INTO training_logs (
        session_code, session_name, member_phone, member_name, role,
        token_tier, token_count, session_budget, total_tokens, reward_amount,
        approver, status, training_date
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *
    `,
      [
        session_code.toUpperCase(),
        session_name || `Buổi đào tạo ${session_code}`,
        member_phone || '',
        member_name,
        role || 'Giảng viên',
        token_tier || 'Hạng A',
        tCount,
        budget,
        newTotalTokens,
        reward,
        approver,
        status,
        training_date || new Date().toISOString().split('T')[0],
      ]
    );

    // Update existing records in the session with updated total_tokens and recalculated rewards
    if (curRes.rows.length > 0) {
      await pool.query(
        `
        UPDATE training_logs 
        SET 
          total_tokens = $1,
          reward_amount = (session_budget * token_count) / $1
        WHERE session_code = $2
      `,
        [newTotalTokens, session_code.toUpperCase()]
      );
    }

    return NextResponse.json({ success: true, log: insertRes.rows[0] });
  } catch (error: any) {
    console.error('Error adding training log:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, status, approver, role, token_tier, token_count } = body;

    if (!id) {
      return NextResponse.json({ success: false, message: 'Thiếu ID' }, { status: 400 });
    }

    const updates: string[] = [];
    const values: any[] = [];

    if (status !== undefined) {
      values.push(status);
      updates.push(`status = $${values.length}`);
    }
    if (approver !== undefined) {
      values.push(approver);
      updates.push(`approver = $${values.length}`);
    }
    if (role !== undefined) {
      values.push(role);
      updates.push(`role = $${values.length}`);
    }
    if (token_tier !== undefined) {
      values.push(token_tier);
      updates.push(`token_tier = $${values.length}`);
    }
    if (token_count !== undefined) {
      values.push(token_count);
      updates.push(`token_count = $${values.length}`);
    }

    if (updates.length === 0) {
      return NextResponse.json({ success: true });
    }

    values.push(id);
    const q = `UPDATE training_logs SET ${updates.join(', ')} WHERE id = $${values.length} RETURNING *`;
    const res = await pool.query(q, values);

    return NextResponse.json({ success: true, log: res.rows[0] });
  } catch (error: any) {
    console.error('Error updating training log:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ success: false, message: 'Thiếu ID' }, { status: 400 });
    }

    await pool.query('DELETE FROM training_logs WHERE id = $1', [id]);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting training log:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
