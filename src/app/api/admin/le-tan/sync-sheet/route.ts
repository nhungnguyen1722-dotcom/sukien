import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { sendToGoogleSheet } from '@/lib/googleSheetWebhook';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { eventId } = body;

    let query = `
      SELECT 
        r.guest_code,
        r.guest_name,
        r.guest_phone,
        r.guest_email,
        COALESCE(r.source, 'Lễ tân nhập') AS source,
        COALESCE(u.full_name, r.referrer_group, '') AS sale_name,
        COALESCE(r.attendance_status, 'Đã đăng ký') AS attendance_status,
        r.notes,
        e.name AS event_name,
        e.event_date::text AS event_date
      FROM event_registrations r
      LEFT JOIN users u ON r.referrer_id = u.id
      LEFT JOIN events e ON r.event_id = e.id
      WHERE 1=1
    `;

    const params: (string | number)[] = [];
    if (eventId) {
      params.push(parseInt(eventId, 10));
      query += ` AND r.event_id = $${params.length}`;
    }

    query += ` ORDER BY r.id ASC`;

    const result = await pool.query(query, params);
    const rows = result.rows;

    if (rows.length === 0) {
      return NextResponse.json({ message: 'Không có dữ liệu để đồng bộ', count: 0 });
    }

    let successCount = 0;
    for (const row of rows) {
      const ok = await sendToGoogleSheet({
        guest_code: row.guest_code,
        guest_name: row.guest_name,
        guest_phone: row.guest_phone,
        guest_email: row.guest_email,
        event_name: row.event_name,
        event_date: row.event_date,
        sale_name: row.sale_name,
        source: row.source,
        attendance_status: row.attendance_status,
        notes: row.notes,
      });
      if (ok) successCount++;
    }

    return NextResponse.json({
      message: `Đã đồng bộ ${successCount}/${rows.length} bản ghi lên Google Sheet thành công!`,
      total: rows.length,
      successCount,
    });
  } catch (error) {
    console.error('Failed batch sync to Google Sheet:', error);
    return NextResponse.json(
      { error: 'Lỗi khi đồng bộ dữ liệu sang Google Sheet' },
      { status: 500 }
    );
  }
}
