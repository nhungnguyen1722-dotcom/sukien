import { NextRequest, NextResponse } from 'next/server';
import type { PoolClient } from 'pg';
import pool from '@/lib/db';

const APPROVAL_LOCK_KEY = [219001, 1];

function isDuplicateError(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === '23505';
}

function isReferencedCourseError(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === '23503';
}

export async function POST(req: NextRequest) {
  let client: PoolClient | undefined;
  let transactionStarted = false;
  try {
    const body = await req.json();
    const courseName = String(body.course_name || '').trim();
    const trainingType = String(body.training_type || '').trim();
    const tokenValue = Number(body.token_value);
    const budget = Number(body.budget);

    if (!courseName || courseName.length > 255) {
      return NextResponse.json({ success: false, message: 'Tên khóa học không hợp lệ.' }, { status: 400 });
    }
    if (!['Online', 'Offline'].includes(trainingType)) {
      return NextResponse.json({ success: false, message: 'Hình thức đào tạo không hợp lệ.' }, { status: 400 });
    }
    if (!Number.isInteger(tokenValue) || tokenValue <= 0 || !Number.isFinite(budget) || budget < 0) {
      return NextResponse.json({ success: false, message: 'Token phải là số nguyên dương và ngân sách không được âm.' }, { status: 400 });
    }

    client = await pool.connect();
    await client.query('BEGIN');
    transactionStarted = true;
    await client.query('SELECT pg_advisory_xact_lock($1, $2)', APPROVAL_LOCK_KEY);
    const sequenceResult = await client.query(
      `SELECT COALESCE(MAX(substring(upper(course_code) from '^TR([0-9]+)$')::integer), 0) + 1 AS next_number
       FROM training_courses
       WHERE upper(course_code) ~ '^TR[0-9]+$'`
    );
    const courseCode = `TR${String(sequenceResult.rows[0].next_number).padStart(3, '0')}`;
    const result = await client.query(
      `INSERT INTO training_courses (course_code, course_name, training_type, token_value, budget)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, course_code, course_name, training_type, token_value, budget`,
      [courseCode, courseName, trainingType, tokenValue, budget]
    );
    const course = result.rows[0];
    await client.query('COMMIT');
    transactionStarted = false;

    return NextResponse.json({
      success: true,
      course: {
        ...course,
        token_value: Number(course.token_value),
        budget: Number(course.budget),
      },
    }, { status: 201 });
  } catch (error) {
    if (client && transactionStarted) {
      try {
        await client.query('ROLLBACK');
      } catch (rollbackError) {
        console.error('Error rolling back training course creation:', rollbackError);
      }
      transactionStarted = false;
    }
    if (isDuplicateError(error)) {
      return NextResponse.json({ success: false, message: 'Không thể cấp mã khóa học tiếp theo do bị trùng. Vui lòng thử lại.' }, { status: 409 });
    }
    console.error('Error creating training course:', error);
    return NextResponse.json({ success: false, message: 'Không thể thêm khóa học do lỗi máy chủ.' }, { status: 500 });
  } finally {
    client?.release();
  }
}

export async function PUT(req: NextRequest) {
  let client: PoolClient | undefined;
  let transactionStarted = false;
  try {
    const body = await req.json();
    const courseCode = String(body.course_code || '').trim().toUpperCase();
    const courseName = String(body.course_name || '').trim();
    const trainingType = String(body.training_type || '').trim();
    const tokenValue = Number(body.token_value);
    const budget = Number(body.budget);

    if (!/^[A-Z0-9_-]{1,50}$/.test(courseCode)) {
      return NextResponse.json({ success: false, message: 'Mã khóa học không hợp lệ.' }, { status: 400 });
    }
    if (!courseName || courseName.length > 255) {
      return NextResponse.json({ success: false, message: 'Tên khóa học không hợp lệ.' }, { status: 400 });
    }
    if (!['Online', 'Offline'].includes(trainingType)) {
      return NextResponse.json({ success: false, message: 'Hình thức đào tạo không hợp lệ.' }, { status: 400 });
    }
    if (!Number.isInteger(tokenValue) || tokenValue <= 0 || !Number.isFinite(budget) || budget < 0) {
      return NextResponse.json({ success: false, message: 'Token phải là số nguyên dương và ngân sách không được âm.' }, { status: 400 });
    }

    client = await pool.connect();
    await client.query('BEGIN');
    transactionStarted = true;
    await client.query('SELECT pg_advisory_xact_lock($1, $2)', APPROVAL_LOCK_KEY);
    const result = await client.query(
      `UPDATE training_courses
       SET course_name = $1, training_type = $2, token_value = $3, budget = $4
       WHERE course_code = $5
       RETURNING id, course_code, course_name, training_type, token_value, budget`,
      [courseName, trainingType, tokenValue, budget, courseCode]
    );
    if (!result.rows[0]) {
      await client.query('ROLLBACK');
      transactionStarted = false;
      return NextResponse.json({ success: false, message: 'Không tìm thấy khóa học.' }, { status: 404 });
    }
    await client.query(
      'UPDATE training_logs SET session_budget = $1 WHERE course_code = $2',
      [budget, courseCode]
    );
    await client.query('COMMIT');
    transactionStarted = false;
    const course = result.rows[0];

    return NextResponse.json({
      success: true,
      course: {
        ...course,
        token_value: Number(course.token_value),
        budget: Number(course.budget),
      },
    });
  } catch (error) {
    if (client && transactionStarted) {
      try {
        await client.query('ROLLBACK');
      } catch (rollbackError) {
        console.error('Error rolling back training course update:', rollbackError);
      }
    }
    console.error('Error updating training course:', error);
    return NextResponse.json({ success: false, message: 'Không thể cập nhật khóa học do lỗi máy chủ.' }, { status: 500 });
  } finally {
    client?.release();
  }
}

export async function DELETE(req: NextRequest) {
  let client: PoolClient | undefined;
  let transactionStarted = false;
  try {
    const courseCode = new URL(req.url).searchParams.get('course_code')?.trim().toUpperCase();
    if (!courseCode || !/^[A-Z0-9_-]{1,50}$/.test(courseCode)) {
      return NextResponse.json({ success: false, message: 'Mã khóa học không hợp lệ.' }, { status: 400 });
    }

    client = await pool.connect();
    await client.query('BEGIN');
    transactionStarted = true;
    await client.query('SELECT pg_advisory_xact_lock($1, $2)', APPROVAL_LOCK_KEY);
    const references = await client.query(
      'SELECT EXISTS (SELECT 1 FROM training_logs WHERE course_code = $1) AS is_referenced',
      [courseCode]
    );
    if (references.rows[0].is_referenced) {
      await client.query('ROLLBACK');
      transactionStarted = false;
      return NextResponse.json({
        success: false,
        message: 'Không thể xóa khóa học đã được sử dụng trong nhật ký đào tạo.',
      }, { status: 409 });
    }
    const result = await client.query(
      'DELETE FROM training_courses WHERE course_code = $1 RETURNING course_code',
      [courseCode]
    );
    if (!result.rows[0]) {
      await client.query('ROLLBACK');
      transactionStarted = false;
      return NextResponse.json({ success: false, message: 'Không tìm thấy khóa học.' }, { status: 404 });
    }
    await client.query('COMMIT');
    transactionStarted = false;
    return NextResponse.json({ success: true, course_code: courseCode });
  } catch (error) {
    if (client && transactionStarted) {
      try {
        await client.query('ROLLBACK');
      } catch (rollbackError) {
        console.error('Error rolling back training course deletion:', rollbackError);
      }
    }
    if (isReferencedCourseError(error)) {
      return NextResponse.json({
        success: false,
        message: 'Không thể xóa khóa học đã được sử dụng trong nhật ký đào tạo.',
      }, { status: 409 });
    }
    console.error('Error deleting training course:', error);
    return NextResponse.json({ success: false, message: 'Không thể xóa khóa học do lỗi máy chủ.' }, { status: 500 });
  } finally {
    client?.release();
  }
}
