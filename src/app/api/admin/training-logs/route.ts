import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || 'all';
    const date = searchParams.get('date') || '';

    let query = `
      SELECT 
        id,
        session_code,
        session_name,
        member_phone,
        member_name,
        token_count,
        session_budget,
        total_tokens,
        token_count * 5000 AS reward_amount,
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
    const statsRes = await pool.query(`
      SELECT COUNT(DISTINCT session_code)::int AS total_sessions,
        COUNT(DISTINCT COALESCE(NULLIF(member_phone, ''), member_name))::int AS total_members,
        COALESCE(SUM(token_count), 0)::float8 AS total_tokens,
        COALESCE(SUM(CASE WHEN status = 'Đã duyệt' THEN token_count * 5000 ELSE 0 END), 0)::float8 AS total_rewards
      FROM training_logs
    `);
    const stats = statsRes.rows[0] || {};

    return NextResponse.json({
      success: true,
      logs: res.rows.map((row) => ({
        ...row,
        token_count: Number(row.token_count || 0),
        session_budget: Number(row.session_budget || 0),
        total_tokens: Number(row.total_tokens || 0),
        reward_amount: Number(row.reward_amount || 0),
      })),
      stats: {
        totalSessions: Number(stats.total_sessions || 0),
        totalMembers: Number(stats.total_members || 0),
        totalTokens: Number(stats.total_tokens || 0),
        totalRewards: Number(stats.total_rewards || 0),
      },
    });
  } catch (error: any) {
    console.error('Error fetching training logs:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const client = await pool.connect();
  try {
    const body = await req.json();
    const {
      session_name,
      member_phone,
      member_name,
      token_count,
      training_date,
      approver = '',
    } = body;

    if (!member_name || !String(member_name).trim()) {
      return NextResponse.json(
        { success: false, message: 'Vui lòng chọn họ tên nhân sự' },
        { status: 400 }
      );
    }

    const tCount = Number(token_count);
    if (!Number.isInteger(tCount) || tCount <= 0) {
      return NextResponse.json({ success: false, message: 'Số token phải là số nguyên lớn hơn 0' }, { status: 400 });
    }
    const trainingDate = training_date || new Date().toISOString().slice(0, 10);

    await client.query('BEGIN');
    await client.query('SELECT pg_advisory_xact_lock($1, $2)', [20261014, 7]);
    const existingSession = await client.query(
      `SELECT session_code FROM training_logs WHERE training_date = $1::date ORDER BY id LIMIT 1`,
      [trainingDate]
    );
    let sessionCode = existingSession.rows[0]?.session_code;
    if (!sessionCode) {
      const nextCode = await client.query(`
        SELECT COALESCE(MAX(NULLIF(REGEXP_REPLACE(session_code, '[^0-9]', '', 'g'), '')::integer), 0) + 1 AS next_code
        FROM training_logs
        WHERE session_code ~ '^TR[0-9]+$'
      `);
      sessionCode = `TR${String(nextCode.rows[0].next_code).padStart(3, '0')}`;
    }

    const current = await client.query(
      `SELECT COALESCE(SUM(token_count), 0)::float8 AS total_tokens
       FROM training_logs WHERE session_code = $1 AND training_date = $2::date`,
      [sessionCode, trainingDate]
    );
    const newTotalTokens = Number(current.rows[0]?.total_tokens || 0) + tCount;
    const sessionBudget = newTotalTokens * 5000;
    const reward = tCount * 5000;

    const insertRes = await client.query(
      `
      INSERT INTO training_logs (
        session_code, session_name, member_phone, member_name, role,
        token_tier, token_count, session_budget, total_tokens, reward_amount,
        approver, status, training_date
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *
    `,
      [
        sessionCode,
        session_name || `Buổi đào tạo ${sessionCode}`,
        member_phone || '',
        String(member_name).trim(),
        '',
        '',
        tCount,
        sessionBudget,
        newTotalTokens,
        reward,
        approver,
        'Đã duyệt',
        trainingDate,
      ]
    );

    await client.query(
      `UPDATE training_logs
       SET total_tokens = $1, session_budget = $2, reward_amount = token_count * 5000
       WHERE session_code = $3 AND training_date = $4::date`,
      [newTotalTokens, sessionBudget, sessionCode, trainingDate]
    );
    await client.query('COMMIT');

    return NextResponse.json({ success: true, log: insertRes.rows[0], session_code: sessionCode });
  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('Error adding training log:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  } finally {
    client.release();
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, status, approver } = body;

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
  const client = await pool.connect();
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ success: false, message: 'Thiếu ID' }, { status: 400 });
    }

    await client.query('BEGIN');
    const selected = await client.query(
      `SELECT session_code, training_date::text AS training_date FROM training_logs WHERE id = $1 FOR UPDATE`,
      [id]
    );
    await client.query('DELETE FROM training_logs WHERE id = $1', [id]);
    if (selected.rows[0]?.training_date) {
      const { session_code, training_date } = selected.rows[0];
      const session = await client.query(
        `SELECT COALESCE(SUM(token_count), 0)::float8 AS total_tokens
         FROM training_logs WHERE session_code = $1 AND training_date = $2::date`,
        [session_code, training_date]
      );
      const totalTokens = Number(session.rows[0]?.total_tokens || 0);
      await client.query(
        `UPDATE training_logs
         SET total_tokens = $1, session_budget = $2, reward_amount = token_count * 5000
         WHERE session_code = $3 AND training_date = $4::date`,
        [totalTokens, totalTokens * 5000, session_code, training_date]
      );
    }
    await client.query('COMMIT');
    return NextResponse.json({ success: true });
  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('Error deleting training log:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  } finally {
    client.release();
  }
}
