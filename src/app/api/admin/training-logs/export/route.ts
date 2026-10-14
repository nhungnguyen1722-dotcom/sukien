import { NextRequest } from 'next/server';
import ExcelJS from 'exceljs';
import pool from '@/lib/db';
import {
  createStyledTrainingSheet,
  DEFAULT_TRAINING_COURSES,
  TrainingCourseItem,
  TrainingLogItem,
} from '@/lib/trainingExportStyles';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || 'all';
    const date = searchParams.get('date') || '';

    // 1. Lấy danh sách nhật ký đào tạo
    let query = `
      SELECT 
        id,
        session_code,
        course_code,
        session_name,
        member_phone,
        member_name,
        token_count,
        session_budget,
        total_tokens,
        reward_amount,
        status,
        TO_CHAR(training_date, 'YYYY-MM-DD') AS training_date
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

    query += ` ORDER BY training_date ASC, course_code ASC, id ASC`;

    const logsRes = await pool.query(query, params);
    const logs: TrainingLogItem[] = logsRes.rows.map((r) => ({
      ...r,
      token_count: Number(r.token_count || 0),
      session_budget: Number(r.session_budget || 0),
      total_tokens: Number(r.total_tokens || 0),
      reward_amount: Number(r.reward_amount ?? (Number(r.token_count || 0) * 5000)),
    }));

    // 2. Lấy danh mục buổi học
    let courses: TrainingCourseItem[] = DEFAULT_TRAINING_COURSES;
    try {
      const coursesRes = await pool.query(`
        SELECT course_code, course_name, training_type, token_value, budget
        FROM training_courses
        ORDER BY course_code ASC
      `);
      if (coursesRes.rows.length > 0) {
        courses = coursesRes.rows.map((c) => ({
          course_code: c.course_code,
          course_name: c.course_name,
          training_type: c.training_type,
          token_value: Number(c.token_value || 0),
          budget: Number(c.budget || 0),
        }));
      }
    } catch (e) {
      console.warn('Lấy danh mục training_courses không thành công, dùng mặc định:', e);
    }

    // 3. Tạo Workbook Excel
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Hệ thống Quản lý Welink';
    workbook.lastModifiedBy = 'Hệ thống Quản lý Welink';
    workbook.created = new Date();
    workbook.modified = new Date();

    createStyledTrainingSheet(workbook, logs, courses);

    const buffer = await workbook.xlsx.writeBuffer();
    const exportFileName = `Tong-hop-Lich-Dao-tao-${new Date().toISOString().split('T')[0]}.xlsx`;

    return new Response(buffer as unknown as BodyInit, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${exportFileName}"; filename*=UTF-8''${encodeURIComponent(exportFileName)}`,
        'Cache-Control': 'no-store, must-revalidate',
      },
    });
  } catch (error: any) {
    console.error('Error generating training logs Excel export:', error);
    return Response.json(
      { success: false, error: error.message || 'Không thể xuất báo cáo Excel.' },
      { status: 500 }
    );
  }
}
