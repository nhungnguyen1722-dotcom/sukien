import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

export const dynamic = 'force-dynamic';

async function resolveEventId(idParam: string): Promise<number | null> {
  const parsed = parseInt(idParam, 10);
  if (!isNaN(parsed)) return parsed;
  if (idParam === '6a9254fd7194452499f20df3') return 2;
  if (idParam === '6a0fddfa6b74280edb94560e') return 1;
  const res = await pool.query('SELECT id FROM events WHERE code = $1 LIMIT 1', [idParam]);
  return res.rows.length > 0 ? res.rows[0].id : null;
}

// GET: Lấy danh sách nhật ký của sự kiện
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

    const result = await pool.query(
      `SELECT * FROM event_logs WHERE event_id = $1 ORDER BY id DESC`,
      [eventId]
    );

    return NextResponse.json({
      logs: result.rows.map(row => ({
        ...row,
        event_date: row.event_date ? new Date(row.event_date).toISOString() : null,
        created_at: row.created_at ? new Date(row.created_at).toISOString() : null,
        updated_at: row.updated_at ? new Date(row.updated_at).toISOString() : null,
      }))
    });
  } catch (error) {
    console.error('Failed to get event logs:', error);
    return NextResponse.json({ error: 'Lỗi khi tải nhật ký sự kiện' }, { status: 500 });
  }
}

// POST: Thêm bản ghi nhật ký mới
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
    const {
      event_code,
      event_date,
      title,
      location,
      total_attendees = 0,
      food_guests_count = 0,
      staff_remuneration = 0,
      tea_break_cost = 0,
      total_cost = 0,
      status = 'Kế hoạch',
      updater_name = 'Vũ Thị Cúc',
      notes = '',
    } = body;

    const computedTotalCost = total_cost || (parseFloat(staff_remuneration) + parseFloat(tea_break_cost));

    const result = await pool.query(
      `INSERT INTO event_logs (
        event_id, event_code, event_date, title, location, total_attendees, food_guests_count,
        staff_remuneration, tea_break_cost, total_cost, status, updater_name, notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *`,
      [
        eventId,
        event_code || `ST${String(eventId).padStart(3, '0')}`,
        event_date || new Date(),
        title?.trim() || 'Nhật ký sự kiện',
        location?.trim() || 'P. Đại Mỗ',
        parseInt(total_attendees, 10) || 0,
        parseInt(food_guests_count, 10) || 0,
        parseFloat(staff_remuneration) || 0,
        parseFloat(tea_break_cost) || 0,
        parseFloat(computedTotalCost) || 0,
        status || 'Kế hoạch',
        updater_name?.trim() || 'Vũ Thị Cúc',
        notes?.trim() || null,
      ]
    );

    return NextResponse.json({
      log: result.rows[0],
      message: 'Thêm bản ghi nhật ký thành công',
    }, { status: 201 });
  } catch (error) {
    console.error('Failed to create event log:', error);
    return NextResponse.json({ error: 'Lỗi khi tạo bản ghi nhật ký' }, { status: 500 });
  }
}

// DELETE: Xóa bản ghi nhật ký
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const logId = searchParams.get('logId');

    if (!logId) {
      return NextResponse.json({ error: 'Thiếu logId' }, { status: 400 });
    }

    const result = await pool.query('DELETE FROM event_logs WHERE id = $1 RETURNING id', [parseInt(logId, 10)]);

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Không tìm thấy bản ghi' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Xóa bản ghi thành công', id: result.rows[0].id });
  } catch (error) {
    console.error('Failed to delete log:', error);
    return NextResponse.json({ error: 'Lỗi khi xóa bản ghi nhật ký' }, { status: 500 });
  }
}
