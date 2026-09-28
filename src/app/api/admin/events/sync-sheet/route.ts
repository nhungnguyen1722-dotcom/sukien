import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { sendToGoogleSheet } from '@/lib/googleSheetWebhook';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const query = `
      SELECT 
        e.id,
        e.name AS event_name,
        e.event_date::text AS event_date,
        e.location,
        e.expected_guests,
        m.full_name AS manager_name,
        e.status,
        e.approval_status,
        (COALESCE(e.mc_fee, 0) + COALESCE(e.speaker_fee, 0) + COALESCE(e.support_fee, 0) + COALESCE(e.closer_fee, 0) + COALESCE(e.tea_break_fee, 0)) AS total_cost,
        e.notes
      FROM events e
      LEFT JOIN users m ON e.manager_id = m.id
      ORDER BY e.id DESC
    `;

    const result = await pool.query(query);
    const rows = result.rows;

    if (rows.length === 0) {
      return NextResponse.json({ message: 'Không có dữ liệu sự kiện để đồng bộ', count: 0 });
    }

    const items = rows.map((row) => ({
      event_id: row.id,
      event_name: row.event_name,
      event_date: row.event_date ? row.event_date.substring(0, 10) : '',
      location: row.location || '',
      expected_guests: row.expected_guests || 0,
      manager_name: row.manager_name || '',
      status: row.status || 'Kế hoạch',
      approval_status: row.approval_status || 'Chờ duyệt',
      total_cost: Number(row.total_cost) || 0,
      notes: row.notes || '',
    }));

    const ok = await sendToGoogleSheet({
      type: 'events_batch',
      items: items,
    });

    return NextResponse.json({
      message: ok
        ? `Đã đồng bộ toàn bộ ${items.length} sự kiện lên Google Sheet thành công!`
        : 'Lỗi khi đồng bộ sự kiện sang Google Sheet',
      total: items.length,
      successCount: ok ? items.length : 0,
    });
  } catch (error) {
    console.error('Failed to sync events to Google Sheet:', error);
    return NextResponse.json(
      { error: 'Lỗi khi đồng bộ dữ liệu sự kiện sang Google Sheet' },
      { status: 500 }
    );
  }
}
