import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export const dynamic = 'force-dynamic';

/**
 * GET /api/cron/update-event-status
 * 
 * Tự động cập nhật trạng thái sự kiện:
 * - "Sắp diễn ra" → "Đang diễn ra" khi đến giờ bắt đầu
 * - "Sắp diễn ra" / "Đang diễn ra" / "Đang thực hiện" → "Đã diễn ra" khi qua giờ kết thúc
 * 
 * So sánh theo múi giờ Việt Nam (Asia/Ho_Chi_Minh, UTC+7).
 */
export async function GET() {
  try {
    // Lấy thời gian hiện tại theo múi giờ Việt Nam
    const nowVN = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Ho_Chi_Minh' }));

    // 1. Cập nhật sự kiện đã kết thúc → "Đã diễn ra"
    //    So sánh event_date + end_time với thời gian thực
    const endedResult = await pool.query(`
      UPDATE events
      SET status = 'Đã diễn ra', updated_at = NOW()
      WHERE status IN ('Sắp diễn ra', 'Đang diễn ra', 'Đang thực hiện')
        AND event_date IS NOT NULL
        AND end_time IS NOT NULL
        AND (event_date + end_time::interval) < ($1::timestamptz AT TIME ZONE 'Asia/Ho_Chi_Minh')
      RETURNING id, name, status
    `, [nowVN.toISOString()]);

    // 2. Cập nhật sự kiện đang diễn ra (đã bắt đầu nhưng chưa kết thúc) → "Đang diễn ra"
    const ongoingResult = await pool.query(`
      UPDATE events
      SET status = 'Đang diễn ra', updated_at = NOW()
      WHERE status = 'Sắp diễn ra'
        AND event_date IS NOT NULL
        AND start_time IS NOT NULL
        AND (event_date + start_time::interval) <= ($1::timestamptz AT TIME ZONE 'Asia/Ho_Chi_Minh')
        AND (
          end_time IS NULL 
          OR (event_date + end_time::interval) >= ($1::timestamptz AT TIME ZONE 'Asia/Ho_Chi_Minh')
        )
      RETURNING id, name, status
    `, [nowVN.toISOString()]);

    return NextResponse.json({
      success: true,
      message: 'Cập nhật trạng thái sự kiện thành công',
      timestamp: nowVN.toISOString(),
      ended: endedResult.rows.map(r => ({ id: r.id, name: r.name })),
      ongoing: ongoingResult.rows.map(r => ({ id: r.id, name: r.name })),
      endedCount: endedResult.rowCount,
      ongoingCount: ongoingResult.rowCount,
    });
  } catch (error) {
    console.error('Cron update event status error:', error);
    return NextResponse.json(
      { error: 'Lỗi khi cập nhật trạng thái sự kiện' },
      { status: 500 }
    );
  }
}
