import { NextRequest, NextResponse } from 'next/server';
import type { PoolClient } from 'pg';
import pool from '@/lib/db';
import { DEFAULT_TRAINING_TOKEN_RATE, normalizeTrainingTokenRate } from '@/lib/trainingTokenRate';

async function getTrainingTokenRate(client?: PoolClient) {
  const query = "SELECT value FROM system_settings WHERE key = 'training_token_rate' LIMIT 1";
  const result = client ? await client.query(query) : await pool.query(query);
  return normalizeTrainingTokenRate(result.rows[0]?.value ?? DEFAULT_TRAINING_TOKEN_RATE);
}

export async function GET(req: NextRequest) {
  try {
    const tokenRate = await getTrainingTokenRate();
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
        COALESCE(training_logs.reward_amount, training_logs.token_count * $1) AS reward_amount,
        training_logs.status,
        training_logs.approver,
        TO_CHAR(training_logs.training_date, 'YYYY-MM-DD') AS training_date,
        training_logs.created_at
      FROM training_logs
      LEFT JOIN training_courses AS course ON course.course_code = training_logs.course_code
      WHERE 1=1
    `;
    const params: any[] = [tokenRate];

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
      COALESCE(SUM(CASE WHEN status = 'Đã duyệt' THEN COALESCE(reward_amount, token_count * $1) ELSE 0 END), 0)::float8 AS total_rewards
      FROM training_logs
    `, [tokenRate]);
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
    const tokenRate = await getTrainingTokenRate(client);
    const {
      course_code,
      training_date,
      approver = '',
      status = 'Chờ duyệt',
    } = body;

    // Support multi-participant: body.participants is an array
    const participants: Array<{ member_name: string; member_phone: string; token_count: number; reward_amount: number }> =
      Array.isArray(body.participants) && body.participants.length > 0
        ? body.participants
        : [{
            member_name: body.member_name || '',
            member_phone: body.member_phone || '',
            token_count: Number(body.token_count) || 0,
            reward_amount: (body.reward_amount !== undefined && body.reward_amount !== null && !isNaN(Number(body.reward_amount)))
              ? Number(body.reward_amount)
              : (Number(body.token_count) || 0) * tokenRate,
          }];

    for (let i = 0; i < participants.length; i++) {
      const p = participants[i];
      if (!p.member_name || !String(p.member_name).trim()) {
        return NextResponse.json(
          { success: false, message: `Vui lòng nhập họ tên nhân sự (dòng ${i + 1})` },
          { status: 400 }
        );
      }
      const tCount = Number(p.token_count);
      if (!Number.isInteger(tCount) || tCount <= 0) {
        return NextResponse.json(
          { success: false, message: `Số token phải là số nguyên lớn hơn 0 (dòng ${i + 1})` },
          { status: 400 }
        );
      }
    }

    const courseCode = String(course_code || '').trim().toUpperCase();
    if (!courseCode) {
      return NextResponse.json({ success: false, message: 'Vui lòng chọn khóa học từ danh mục.' }, { status: 400 });
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
      `SELECT course_code, course_name, token_value, budget FROM training_courses WHERE course_code = $1`,
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
        WHERE session_code ~ '^(TR|MB)[0-9]+$'
      `);
      sessionCode = `MB${String(nextCode.rows[0].next_code).padStart(3, '0')}`;
    }

    const current = await client.query(
      `SELECT COALESCE(SUM(token_count), 0)::float8 AS total_tokens
       FROM training_logs WHERE course_code = $1 AND training_date = $2::date`,
      [courseCode, trainingDate]
    );
    const addedTokens = participants.reduce((sum, p) => sum + Number(p.token_count), 0);
    const newTotalTokens = Number(current.rows[0]?.total_tokens || 0) + addedTokens;
    if (newTotalTokens > Number(course.token_value)) {
      await client.query('ROLLBACK');
      return NextResponse.json({
        success: false,
        message: `Tổng token buổi học vượt định mức ${Number(course.token_value)} Token của khóa học.`,
      }, { status: 400 });
    }
    const sessionBudget = Number(course.budget);

    const insertedRows: any[] = [];
    for (const p of participants) {
      const tCount = Number(p.token_count);
      const reward = (p.reward_amount !== undefined && p.reward_amount !== null && !isNaN(Number(p.reward_amount)))
        ? Number(p.reward_amount)
        : tCount * tokenRate;
      const insertRes = await client.query(
        `INSERT INTO training_logs (
          session_code, course_code, session_name, member_phone, member_name, role,
          token_tier, token_count, session_budget, total_tokens, reward_amount,
          approver, status, training_date
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        RETURNING *`,
        [
          sessionCode, course.course_code, course.course_name,
          String(p.member_phone || '').trim(), String(p.member_name).trim(),
          '', '', tCount, sessionBudget, newTotalTokens, reward,
          approver, status, trainingDate,
        ]
      );
      insertedRows.push(insertRes.rows[0]);
    }

    await client.query(
      `UPDATE training_logs
       SET total_tokens = $1, session_budget = $2
       WHERE course_code = $3 AND training_date = $4::date`,
       [newTotalTokens, sessionBudget, courseCode, trainingDate]
    );
    await client.query('COMMIT');

    return NextResponse.json({ success: true, log: insertedRows[0], logs: insertedRows, session_code: sessionCode });
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
    const tokenRate = await getTrainingTokenRate();

    if (body.action === 'update_session' || (body.participants && Array.isArray(body.participants))) {
      const {
        course_code,
        training_date,
        approver = '',
        status = 'Chờ duyệt',
        old_course_code,
        old_training_date,
        old_session_code,
        session_code,
        participants,
      } = body;

      const courseCode = String(course_code || '').trim().toUpperCase();
      if (!courseCode) {
        return NextResponse.json({ success: false, message: 'Vui lòng chọn khóa học.' }, { status: 400 });
      }
      const trainingDate = String(training_date || '');
      const parsedTrainingDate = new Date(`${trainingDate}T00:00:00Z`);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(trainingDate)
        || Number.isNaN(parsedTrainingDate.getTime())
        || parsedTrainingDate.toISOString().slice(0, 10) !== trainingDate) {
        return NextResponse.json({ success: false, message: 'Ngày đào tạo không hợp lệ.' }, { status: 400 });
      }
      if (!Array.isArray(participants) || participants.length === 0 || participants.some((participant: any) =>
        !String(participant.member_name || '').trim()
        || !Number.isInteger(Number(participant.token_count))
        || Number(participant.token_count) <= 0
      )) {
        return NextResponse.json({ success: false, message: 'Vui lòng nhập nhân sự và số Token hợp lệ cho từng dòng.' }, { status: 400 });
      }

      client = await pool.connect();
      await client.query('BEGIN');
      transactionStarted = true;
      await client.query('SELECT pg_advisory_xact_lock($1, $2)', [20261014, 7]);

      const courseRes = await client.query(
        'SELECT course_code, course_name, token_value, budget FROM training_courses WHERE course_code = $1',
        [courseCode]
      );
      const course = courseRes.rows[0];
      if (!course) {
        await client.query('ROLLBACK');
        transactionStarted = false;
        return NextResponse.json({ success: false, message: 'Khóa học không tồn tại.' }, { status: 400 });
      }

      const targetOldCode = old_course_code || courseCode;
      const targetOldDate = old_training_date || training_date;
      const targetOldSession = old_session_code || session_code || targetOldCode;
      const existingTargetTokensResult = await client.query(
        `SELECT COALESCE(SUM(token_count), 0)::float8 AS total_tokens
         FROM training_logs
         WHERE course_code = $1 AND training_date = $2::date AND session_code <> $3`,
        [courseCode, trainingDate, targetOldSession]
      );
      const participantTokens = participants.reduce((sum: number, participant: any) => sum + Number(participant.token_count), 0);
      const totalTokens = Number(existingTargetTokensResult.rows[0]?.total_tokens || 0) + participantTokens;
      if (totalTokens > Number(course.token_value)) {
        await client.query('ROLLBACK');
        transactionStarted = false;
        return NextResponse.json({
          success: false,
          message: `Tổng token buổi học vượt định mức ${Number(course.token_value)} Token của khóa học.`,
        }, { status: 400 });
      }

      const targetSession = await client.query(
        `SELECT session_code FROM training_logs
         WHERE course_code = $1 AND training_date = $2::date AND session_code <> $3
         ORDER BY id LIMIT 1`,
        [courseCode, trainingDate, targetOldSession]
      );
      await client.query(
        `DELETE FROM training_logs 
         WHERE (course_code = $1 OR session_code = $2) AND training_date = $3::date`,
        [targetOldCode, targetOldSession, targetOldDate]
      );

      const sessionCodeFinal = targetSession.rows[0]?.session_code || session_code || targetOldSession;
      const sessionBudget = Number(course.budget);

      const insertedRows = [];
      for (const p of participants) {
        const tCount = Number(p.token_count);
        const reward = (p.reward_amount !== undefined && p.reward_amount !== null && !isNaN(Number(p.reward_amount)))
          ? Number(p.reward_amount)
          : tCount * tokenRate;
        const ins = await client.query(
          `INSERT INTO training_logs (
            session_code, course_code, session_name, member_phone, member_name, role,
            token_tier, token_count, session_budget, total_tokens, reward_amount,
            approver, status, training_date
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
          RETURNING *`,
          [
            sessionCodeFinal, course.course_code, course.course_name,
            String(p.member_phone || '').trim(), String(p.member_name).trim(),
            '', '', tCount, sessionBudget, totalTokens, reward,
            approver, status, training_date
          ]
        );
        insertedRows.push(ins.rows[0]);
      }

      await client.query(
        `UPDATE training_logs SET total_tokens = $1, session_budget = $2
         WHERE course_code = $3 AND training_date = $4::date`,
        [totalTokens, sessionBudget, courseCode, trainingDate]
      );

      if (targetOldCode !== courseCode || String(targetOldDate) !== trainingDate) {
        const oldTotals = await client.query(
          `SELECT COALESCE(SUM(token_count), 0)::float8 AS total_tokens
           FROM training_logs WHERE course_code = $1 AND training_date = $2::date`,
          [targetOldCode, targetOldDate]
        );
        const oldCourse = await client.query('SELECT budget FROM training_courses WHERE course_code = $1', [targetOldCode]);
        await client.query(
          `UPDATE training_logs SET total_tokens = $1, session_budget = $2
           WHERE course_code = $3 AND training_date = $4::date`,
          [Number(oldTotals.rows[0]?.total_tokens || 0), Number(oldCourse.rows[0]?.budget || 0), targetOldCode, targetOldDate]
        );
      }

      await client.query('COMMIT');
      transactionStarted = false;
      return NextResponse.json({ success: true, logs: insertedRows });
    }

    const { id, status, approver } = body;

    if (Array.isArray(body.ids)) {
      const logIds = [...new Set<number>((body.ids as unknown[]).map((value) => Number(value)))].filter((value) => Number.isInteger(value) && value > 0);
      if (logIds.length === 0 || !['Đã duyệt', 'Chờ duyệt'].includes(status)) {
        return NextResponse.json({ success: false, message: 'Missing training log IDs or approval status.' }, { status: 400 });
      }

      const updated = await pool.query(
        `UPDATE training_logs SET status = $1 WHERE id = ANY($2::int[]) RETURNING id, status`,
        [status, logIds]
      );
      return NextResponse.json({ success: true, logs: updated.rows });
    }

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
        `SELECT course_code, course_name, token_value, budget FROM training_courses WHERE course_code = $1`,
        [courseCode]
      );
      if (!courseResult.rows[0]) {
        await client.query('ROLLBACK');
        transactionStarted = false;
        return NextResponse.json({ success: false, message: 'Khóa học không tồn tại trong danh mục.' }, { status: 400 });
      }
      const course = courseResult.rows[0];
      const otherSessionTokens = await client.query(
        `SELECT COALESCE(SUM(token_count), 0)::float8 AS total_tokens
         FROM training_logs WHERE course_code = $1 AND training_date = $2::date AND id <> $3`,
        [courseCode, trainingDate, logId]
      );
      if (Number(otherSessionTokens.rows[0]?.total_tokens || 0) + tokenCount > Number(course.token_value)) {
        await client.query('ROLLBACK');
        transactionStarted = false;
        return NextResponse.json({
          success: false,
          message: `Tổng token buổi học vượt định mức ${Number(course.token_value)} Token của khóa học.`,
        }, { status: 400 });
      }
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
          FROM training_logs WHERE session_code ~ '^(TR|MB)[0-9]+$'
        `);
        sessionCode = `MB${String(nextCode.rows[0].next_code).padStart(3, '0')}`;
      }

      const rewardAmount = (body.reward_amount !== undefined && body.reward_amount !== null && !isNaN(Number(body.reward_amount)))
        ? Number(body.reward_amount)
        : tokenCount * tokenRate;

      await client.query(
        `UPDATE training_logs
         SET session_code = $1, course_code = $2, session_name = $3, member_name = $4, member_phone = $5,
             token_count = $6, reward_amount = $7, approver = $8, status = $9, training_date = $10::date
         WHERE id = $11`,
        [
          sessionCode,
          course.course_code,
          course.course_name,
          memberName,
          String(body.member_phone || '').trim(),
          tokenCount,
          rewardAmount,
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
        const sessionBudget = budgetResult.rows[0] ? Number(budgetResult.rows[0].budget) : totalTokens * tokenRate;
        await client.query(
          `UPDATE training_logs
           SET total_tokens = $1, session_budget = $2
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
    const tokenRate = await getTrainingTokenRate(client);
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    const idsParam = searchParams.get('ids');

    if (idsParam) {
      const ids = idsParam.split(',').map(Number).filter((n) => Number.isInteger(n) && n > 0);
      if (ids.length > 0) {
        await client.query('DELETE FROM training_logs WHERE id = ANY($1::int[])', [ids]);
        return NextResponse.json({ success: true, deleted: ids.length });
      }
    }

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
      const sessionBudget = course.rows[0] ? Number(course.rows[0].budget) : totalTokens * tokenRate;
      await client.query(
        `UPDATE training_logs
         SET total_tokens = $1, session_budget = $2
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
