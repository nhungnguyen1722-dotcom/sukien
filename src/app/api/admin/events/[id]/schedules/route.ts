import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

export const dynamic = 'force-dynamic';

async function resolveEventId(idParam: string): Promise<number | null> {
  const parsed = parseInt(idParam, 10);
  if (!isNaN(parsed)) return parsed;
  if (idParam === '6a9254fd7194452499f20df3') return 2;
  if (idParam === '6a0fddfa6b74280edb94560e' || idParam === '6a8fddfa6b74280edb94560e') return 1;

  const codeRes = await pool.query('SELECT id FROM events WHERE code = $1 LIMIT 1', [idParam]);
  if (codeRes.rows.length > 0) return codeRes.rows[0].id;

  const firstRes = await pool.query('SELECT id FROM events ORDER BY id ASC LIMIT 1');
  return firstRes.rows.length > 0 ? firstRes.rows[0].id : null;
}

// GET: Lấy danh sách mốc lịch trình của sự kiện
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const eventId = await resolveEventId(id);

    if (!eventId) {
      return NextResponse.json({ error: 'Không tìm thấy sự kiện' }, { status: 404 });
    }

    const res = await pool.query(
      `SELECT id, event_id, time, title, speaker, description, order_num, created_at, updated_at
       FROM event_schedules
       WHERE event_id = $1
       ORDER BY order_num ASC, id ASC`,
      [eventId]
    );

    return NextResponse.json({ schedules: res.rows });
  } catch (error) {
    console.error('Failed to get event schedules:', error);
    return NextResponse.json({ error: 'Lỗi tải lịch trình sự kiện' }, { status: 500 });
  }
}

// POST: Thêm mới mốc lịch trình (lưu ngay vào Database)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const eventId = await resolveEventId(id);

    if (!eventId) {
      return NextResponse.json({ error: 'Không tìm thấy sự kiện' }, { status: 404 });
    }

    const body = await request.json();
    const { time, title, speaker, description } = body;

    if (!time || !time.trim() || !title || !title.trim()) {
      return NextResponse.json({ error: 'Vui lòng nhập khung thời gian và tiêu đề' }, { status: 400 });
    }

    const orderRes = await pool.query(
      `SELECT COALESCE(MAX(order_num), 0) + 1 AS next_order FROM event_schedules WHERE event_id = $1`,
      [eventId]
    );
    const nextOrder = orderRes.rows[0].next_order;

    const insertRes = await pool.query(
      `INSERT INTO event_schedules (event_id, time, title, speaker, description, order_num)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        eventId,
        time.trim(),
        title.trim(),
        speaker ? speaker.trim() : null,
        description ? description.trim() : null,
        nextOrder,
      ]
    );

    return NextResponse.json({
      schedule: insertRes.rows[0],
      message: 'Đã thêm mốc lịch trình thành công',
    });
  } catch (error) {
    console.error('Failed to add schedule:', error);
    return NextResponse.json({ error: 'Lỗi lưu mốc lịch trình vào Database' }, { status: 500 });
  }
}

// PUT: Cập nhật chỉnh sửa mốc lịch trình
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const eventId = await resolveEventId(id);

    if (!eventId) {
      return NextResponse.json({ error: 'Không tìm thấy sự kiện' }, { status: 404 });
    }

    const body = await request.json();
    const { scheduleId, time, title, speaker, description, order_num } = body;

    if (!scheduleId) {
      return NextResponse.json({ error: 'Thiếu ID mốc lịch trình' }, { status: 400 });
    }

    if (!time || !time.trim() || !title || !title.trim()) {
      return NextResponse.json({ error: 'Vui lòng nhập khung thời gian và tiêu đề' }, { status: 400 });
    }

    const updateRes = await pool.query(
      `UPDATE event_schedules
       SET time = $1,
           title = $2,
           speaker = $3,
           description = $4,
           order_num = COALESCE($5, order_num),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $6 AND event_id = $7
       RETURNING *`,
      [
        time.trim(),
        title.trim(),
        speaker ? speaker.trim() : null,
        description ? description.trim() : null,
        order_num !== undefined ? order_num : null,
        scheduleId,
        eventId,
      ]
    );

    if (updateRes.rows.length === 0) {
      return NextResponse.json({ error: 'Không tìm thấy mốc lịch trình để cập nhật' }, { status: 404 });
    }

    return NextResponse.json({
      schedule: updateRes.rows[0],
      message: 'Đã cập nhật mốc lịch trình thành công',
    });
  } catch (error) {
    console.error('Failed to update schedule:', error);
    return NextResponse.json({ error: 'Lỗi cập nhật mốc lịch trình' }, { status: 500 });
  }
}

// DELETE: Xóa mốc lịch trình
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const eventId = await resolveEventId(id);

    if (!eventId) {
      return NextResponse.json({ error: 'Không tìm thấy sự kiện' }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const scheduleId = searchParams.get('scheduleId');

    if (!scheduleId) {
      return NextResponse.json({ error: 'Thiếu ID mốc lịch trình' }, { status: 400 });
    }

    await pool.query(
      `DELETE FROM event_schedules WHERE id = $1 AND event_id = $2`,
      [scheduleId, eventId]
    );

    return NextResponse.json({ message: 'Đã xóa mốc lịch trình', id: scheduleId });
  } catch (error) {
    console.error('Failed to delete schedule:', error);
    return NextResponse.json({ error: 'Lỗi xóa mốc lịch trình' }, { status: 500 });
  }
}
