import { NextRequest } from 'next/server';
import pool from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || '';
    const manager_id = searchParams.get('manager_id') || '';

    let query = `
      SELECT 
        e.*,
        m.full_name as manager_name
      FROM events e
      LEFT JOIN users m ON e.manager_id = m.id
      WHERE 1=1
    `;
    const params: (string | number)[] = [];

    if (search.trim()) {
      params.push(`%${search.trim()}%`);
      query += ` AND e.name ILIKE $${params.length}`;
    }

    if (status) {
      params.push(status);
      query += ` AND e.status = $${params.length}`;
    }

    if (manager_id) {
      params.push(manager_id);
      query += ` AND e.manager_id = $${params.length}`;
    }

    query += ' ORDER BY e.id DESC';

    const [eventsRes, statsRes, managersRes] = await Promise.all([
      pool.query(query, params),
      pool.query(`
        SELECT 
          COUNT(*)::int AS total_events,
          COUNT(CASE WHEN status = 'Kế hoạch' THEN 1 END)::int AS upcoming_events,
          COALESCE(SUM(expected_guests), 0)::int AS total_guests,
          COALESCE(SUM(COALESCE(mc_fee, 0) + COALESCE(speaker_fee, 0) + COALESCE(support_fee, 0) + COALESCE(closer_fee, 0) + COALESCE(tea_break_fee, 0)), 0)::numeric AS total_cost
        FROM events
      `),
      pool.query(`SELECT id, full_name FROM users ORDER BY full_name ASC`),
    ]);

    const statsRow = statsRes.rows[0] || {
      total_events: 0,
      upcoming_events: 0,
      total_guests: 0,
      total_cost: 0,
    };

    return Response.json({
      events: eventsRes.rows,
      stats: {
        totalEvents: statsRow.total_events,
        upcomingEvents: statsRow.upcoming_events,
        totalGuests: statsRow.total_guests,
        totalCost: Number(statsRow.total_cost),
      },
      managers: managersRes.rows,
    });
  } catch (error) {
    console.error('Failed to fetch events:', error);
    return Response.json({ error: 'Lỗi khi lấy danh sách sự kiện' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      name,
      event_date,
      expected_guests,
      location,
      manager_id,
      status,
      mc_fee,
      speaker_fee,
      support_fee,
      closer_fee,
      tea_break_fee,
      notes,
    } = body;

    if (!name || !name.trim()) {
      return Response.json({ error: 'Tên sự kiện là bắt buộc' }, { status: 400 });
    }

    if (!event_date) {
      return Response.json({ error: 'Ngày tổ chức là bắt buộc' }, { status: 400 });
    }

    const result = await pool.query(
      `INSERT INTO events (
        name,
        event_date,
        expected_guests,
        location,
        manager_id,
        status,
        mc_fee,
        speaker_fee,
        support_fee,
        closer_fee,
        tea_break_fee,
        notes,
        approval_status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'Chờ duyệt')
      RETURNING *`,
      [
        name.trim(),
        event_date,
        expected_guests ? parseInt(expected_guests) : 0,
        location ? location.trim() : null,
        manager_id ? parseInt(manager_id) : null,
        status || 'Kế hoạch',
        mc_fee ? parseFloat(mc_fee) : 0,
        speaker_fee ? parseFloat(speaker_fee) : 0,
        support_fee ? parseFloat(support_fee) : 0,
        closer_fee ? parseFloat(closer_fee) : 0,
        tea_break_fee ? parseFloat(tea_break_fee) : 0,
        notes ? notes.trim() : null,
      ]
    );

    return Response.json({ event: result.rows[0] }, { status: 201 });
  } catch (error) {
    console.error('Failed to create event:', error);
    return Response.json({ error: 'Có lỗi xảy ra khi tạo sự kiện mới' }, { status: 500 });
  }
}
