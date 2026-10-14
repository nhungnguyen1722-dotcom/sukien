import { NextRequest, NextResponse } from 'next/server';
import type { PoolClient } from 'pg';
import pool from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || 'all';
    const date = searchParams.get('date') || '';

    let query = `
      SELECT 
        training_logs.id,
        training_logs.session_code,
        training_logs.course_code,
        COALESCE(course.course_name, training_logs.session_name) AS session_name,
        training_logs.member_phone,
        training_logs.member_name,
        training_logs.token_count,
        training_logs.session_budget,
        training_logs.total_tokens,
        training_logs.token_count * 5000 AS reward_amount,
        training_logs.status,
        training_logs.approver,
        TO_CHAR(training_logs.training_date, 'YYYY-MM-DD') AS training_date,
        training_logs.created_at
      FROM training_logs
      LEFT JOIN training_courses AS course ON course.course_code = training_logs.course_code
      WHERE 1=1
    `;
    const params: any[] = [];

    if (search.trim()) {
      params.push(`%${search.trim().toLowerCase()}%`);
      query += ` AND (
        LOWER(training_logs.course_code) LIKE $${params.length} OR
        LOWER(training_logs.session_code) LIKE $${params.length} OR
        LOWER(training_logs.member_name) LIKE $${params.length} OR
        training_logs.member_phone LIKE $${params.length} OR
        LOWER(COALESCE(course.course_name, training_logs.session_name, '')) LIKE $${params.length}
      )`;
    }

    if (status !== 'all') {
      params.push(status);
      query += ` AND training_logs.status = $${params.length}`;
    }

    if (date) {
      params.push(date);
      query += ` AND training_logs.training_date = $${params.length}`;
    }

    query += ` ORDER BY training_logs.training_date DESC, training_logs.session_code ASC, training_logs.id ASC`;

    const res = await pool.query(query, params);

    // Compute stats
    const statsRes = await pool.query(`
      SELECT COUNT(DISTINCT (session_code, training_date))::int AS total_sessions,
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
      member_phone,
      member_name,
      course_code,
      token_count,
      training_date,
      approver = '',
      status = 'Chờ duyệt',
    } = body;

    if (!member_name || !String(member_name).trim()) {
      return NextResponse.json(
        { success: false, message: 'Vui lòng chọn họ tên nhân sự' },
        { status: 400 }
      );
    }
    const courseCode = String(course_code || '').trim().toUpperCase();
    if (!courseCode) {
      return NextResponse.json({ success: false, message: 'Vui lòng chọn khóa học từ danh mục.' }, { status: 400 });
    }

    const tCount = Number(token_count);
    if (!Number.isInteger(tCount) || tCount <= 0) {
      return NextResponse.json({ success: false, message: 'Số token phải là số nguyên lớn hơn 0' }, { status: 400 });
    }
    if (!['Đã duyệt', 'Chờ duyệt'].includes(status)) {
      return NextResponse.json({ success: false, message: 'Trạng thái duyệt không hợp lệ.' }, { status: 400 });
    }
    const trainingDate = training_date || new Date().toISOString().slice(0, 10);
    const parsedTrainingDate = new Date(`${trainingDate}T00:00:00Z`);
    if (typeof trainingDate !== 'string'
      || !/^\d{4}-\d{2}-\d{2}$/.test(trainingDate)
      || Number.isNaN(parsedTrainingDate.getTime())
      || parsedTrainingDate.toISOString().slice(0, 10) !== trainingDate) {
      return NextResponse.json({ success: false, message: 'Ngày đào tạo không hợp lệ' }, { status: 400 });
    }

    await client.query('BEGIN');
    await client.query('SELECT pg_advisory_xact_lock($1, $2)', [20261014, 7]);
    const courseResult = await client.query(
      `SELECT course_code, course_name, budget FROM training_courses WHERE course_code = $1`,
      [courseCode]
    );
    if (!courseResult.rows[0]) {
      await client.query('ROLLBACK');
      return NextResponse.json({ success: false, message: 'Khóa học không tồn tại trong danh mục.' }, { status: 400 });
    }
    const course = courseResult.rows[0];
    const existingSession = await client.query(
      `SELECT session_code FROM training_logs
       WHERE course_code = $1 AND training_date = $2::date ORDER BY id LIMIT 1`,
      [courseCode, trainingDate]
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
       FROM training_logs WHERE course_code = $1 AND training_date = $2::date`,
      [courseCode, trainingDate]
    );
    const newTotalTokens = Number(current.rows[0]?.total_tokens || 0) + tCount;
    const sessionBudget = Number(course.budget);
    const reward = tCount * 5000;

    const insertRes = await client.query(
      `
      INSERT INTO training_logs (
        session_code, course_code, session_name, member_phone, member_name, role,
        token_tier, token_count, session_budget, total_tokens, reward_amount,
        approver, status, training_date
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING *
    `,
      [
        sessionCode,
        course.course_code,
        course.course_name,
        member_phone || '',
        String(member_name).trim(),
        '',
        '',
        tCount,
        sessionBudget,
        newTotalTokens,
        reward,
        approver,
        status,
        trainingDate,
      ]
    );

    await client.query(
      `UPDATE training_logs
       SET total_tokens = $1, session_budget = $2, reward_amount = token_count * 5000
       WHERE course_code = $3 AND training_date = $4::date`,
       [newTotalTokens, sessionBudget, courseCode, trainingDate]
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
  let client: PoolClient | undefined;
  let transactionStarted = false;
  try {
    const body = await req.json();
    const { id, status, approver } = body;

    const logId = Number(id);
    if (!Number.isInteger(logId) || logId <= 0) {
      return NextResponse.json({ success: false, message: 'Thiếu ID' }, { status: 400 });
    }
    if (status !== undefined && !['Đã duyệt', 'Chờ duyệt'].includes(status)) {
      return NextResponse.json({ success: false, message: 'Trạng thái duyệt không hợp lệ.' }, { status: 400 });
    }

    if (body.course_code !== undefined || body.token_count !== undefined || body.training_date !== undefined) {
      const memberName = String(body.member_name || '').trim();
      const courseCode = String(body.course_code || '').trim().toUpperCase();
      const tokenCount = Number(body.token_count);
      const trainingDate = String(body.training_date || '');
      const parsedTrainingDate = new Date(`${trainingDate}T00:00:00Z`);
      if (!memberName) {
        return NextResponse.json({ success: false, message: 'Vui lòng nhập họ tên nhân sự' }, { status: 400 });
      }
      if (!courseCode) {
        return NextResponse.json({ success: false, message: 'Vui lòng chọn khóa học từ danh mục.' }, { status: 400 });
      }
      if (!Number.isInteger(tokenCount) || tokenCount <= 0) {
        return NextResponse.json({ success: false, message: 'Số token phải là số nguyên lớn hơn 0' }, { status: 400 });
      }
      if (!/^\d{4}-\d{2}-\d{2}$/.test(trainingDate)
        || Number.isNaN(parsedTrainingDate.getTime())
        || parsedTrainingDate.toISOString().slice(0, 10) !== trainingDate) {
        return NextResponse.json({ success: false, message: 'Ngày đào tạo không hợp lệ' }, { status: 400 });
      }

      client = await pool.connect();
      await client.query('BEGIN');
      transactionStarted = true;
      await client.query('SELECT pg_advisory_xact_lock($1, $2)', [20261014, 7]);
      const selected = await client.query(
        `SELECT session_code, course_code, training_date::text AS training_date, status
         FROM training_logs WHERE id = $1 FOR UPDATE`,
        [logId]
      );
      if (!selected.rows[0]) {
        await client.query('ROLLBACK');
        transactionStarted = false;
        return NextResponse.json({ success: false, message: 'Không tìm thấy lượt đào tạo' }, { status: 404 });
      }

      const oldSessionCode = selected.rows[0].session_code;
      const oldCourseCode = selected.rows[0].course_code;
      const oldTrainingDate = selected.rows[0].training_date;
      const courseResult = await client.query(
        `SELECT course_code, course_name, budget FROM training_courses WHERE course_code = $1`,
        [courseCode]
      );
      if (!courseResult.rows[0]) {
        await client.query('ROLLBACK');
        transactionStarted = false;
        return NextResponse.json({ success: false, message: 'Khóa học không tồn tại trong danh mục.' }, { status: 400 });
      }
      const course = courseResult.rows[0];
      const targetSession = await client.query(
        `SELECT session_code FROM training_logs
         WHERE course_code = $1 AND training_date = $2::date AND id <> $3 ORDER BY id LIMIT 1`,
        [courseCode, trainingDate, logId]
      );
      let sessionCode = targetSession.rows[0]?.session_code;
      if (!sessionCode && oldCourseCode === courseCode && oldTrainingDate === trainingDate) {
        sessionCode = oldSessionCode;
      }
      if (!sessionCode) {
        const nextCode = await client.query(`
          SELECT COALESCE(MAX(NULLIF(REGEXP_REPLACE(session_code, '[^0-9]', '', 'g'), '')::integer), 0) + 1 AS next_code
          FROM training_logs WHERE session_code ~ '^TR[0-9]+$'
        `);
        sessionCode = `TR${String(nextCode.rows[0].next_code).padStart(3, '0')}`;
      }

      await client.query(
        `UPDATE training_logs
         SET session_code = $1, course_code = $2, session_name = $3, member_name = $4, member_phone = $5,
             token_count = $6, reward_amount = $6 * 5000, approver = $7, status = $8, training_date = $9::date
         WHERE id = $10`,
        [
          sessionCode,
          course.course_code,
          course.course_name,
          memberName,
          String(body.member_phone || '').trim(),
          tokenCount,
          String(body.approver || '').trim(),
          status === undefined ? selected.rows[0].status : status,
          trainingDate,
          logId,
        ]
      );

      const affectedSessions = new Map([
        [`${oldCourseCode || ''}\u0000${oldTrainingDate}`, { courseCode: oldCourseCode, date: oldTrainingDate }],
        [`${courseCode}\u0000${trainingDate}`, { courseCode, date: trainingDate }],
      ]);
      for (const { courseCode: affectedCourseCode, date: affectedDate } of affectedSessions.values()) {
        const totals = await client.query(
          `SELECT COALESCE(SUM(token_count), 0)::float8 AS total_tokens
           FROM training_logs WHERE course_code IS NOT DISTINCT FROM $1 AND training_date = $2::date`,
          [affectedCourseCode, affectedDate]
        );
        const totalTokens = Number(totals.rows[0]?.total_tokens || 0);
        const budgetResult = affectedCourseCode
          ? await client.query(`SELECT budget FROM training_courses WHERE course_code = $1`, [affectedCourseCode])
          : { rows: [] };
        const sessionBudget = budgetResult.rows[0] ? Number(budgetResult.rows[0].budget) : totalTokens * 5000;
        await client.query(
          `UPDATE training_logs
           SET total_tokens = $1, session_budget = $2, reward_amount = token_count * 5000
           WHERE course_code IS NOT DISTINCT FROM $3 AND training_date = $4::date`,
          [totalTokens, sessionBudget, affectedCourseCode, affectedDate]
        );
      }

      const updated = await client.query(
        `SELECT log.id, log.session_code, log.course_code,
                COALESCE(course.course_name, log.session_name) AS session_name,
                log.member_phone, log.member_name, log.token_count, log.session_budget,
                log.total_tokens, log.reward_amount, log.status, log.approver,
                TO_CHAR(log.training_date, 'YYYY-MM-DD') AS training_date
         FROM training_logs AS log
         LEFT JOIN training_courses AS course ON course.course_code = log.course_code
         WHERE log.id = $1`,
        [logId]
      );
      await client.query('COMMIT');
      transactionStarted = false;
      return NextResponse.json({ success: true, log: updated.rows[0] });
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

    values.push(logId);
    const q = `UPDATE training_logs SET ${updates.join(', ')} WHERE id = $${values.length} RETURNING *`;
    const res = await pool.query(q, values);

    if (!res.rows[0]) {
      return NextResponse.json({ success: false, message: 'Không tìm thấy lượt đào tạo' }, { status: 404 });
    }
    return NextResponse.json({ success: true, log: res.rows[0] });
  } catch (error: any) {
    if (transactionStarted && client) await client.query('ROLLBACK');
    console.error('Error updating training log:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  } finally {
    client?.release();
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
      `SELECT session_code, course_code, training_date::text AS training_date
       FROM training_logs WHERE id = $1 FOR UPDATE`,
      [id]
    );
    if (!selected.rows[0]) {
      await client.query('ROLLBACK');
      return NextResponse.json({ success: false, message: 'Không tìm thấy lượt đào tạo' }, { status: 404 });
    }
    await client.query('DELETE FROM training_logs WHERE id = $1', [id]);
    if (selected.rows[0].training_date) {
      const { course_code, training_date } = selected.rows[0];
      const session = await client.query(
        `SELECT COALESCE(SUM(token_count), 0)::float8 AS total_tokens
         FROM training_logs WHERE course_code IS NOT DISTINCT FROM $1 AND training_date = $2::date`,
        [course_code, training_date]
      );
      const totalTokens = Number(session.rows[0]?.total_tokens || 0);
      const course = course_code
        ? await client.query(`SELECT budget FROM training_courses WHERE course_code = $1`, [course_code])
        : { rows: [] };
      const sessionBudget = course.rows[0] ? Number(course.rows[0].budget) : totalTokens * 5000;
      await client.query(
        `UPDATE training_logs
         SET total_tokens = $1, session_budget = $2, reward_amount = token_count * 5000
         WHERE course_code IS NOT DISTINCT FROM $3 AND training_date = $4::date`,
        [totalTokens, sessionBudget, course_code, training_date]
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
