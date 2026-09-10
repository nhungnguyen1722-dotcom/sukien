import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { sendToGoogleSheet } from '@/lib/googleSheetWebhook';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const query = `
      SELECT 
        u.id,
        u.full_name,
        u.phone,
        u.email,
        u.role,
        u.title,
        u.ref_code,
        u.referral_group,
        r.full_name AS referrer_name,
        u.source,
        u.join_date::text AS join_date,
        u.status,
        u.notes
      FROM users u
      LEFT JOIN users r ON u.referrer_id = r.id
      ORDER BY u.id DESC
    `;

    const result = await pool.query(query);
    const rows = result.rows;

    if (rows.length === 0) {
      return NextResponse.json({ message: 'Không có dữ liệu thành viên để đồng bộ', count: 0 });
    }

    const membersList = rows.map((row) => ({
      member_id: row.id,
      full_name: row.full_name,
      phone: row.phone,
      email: row.email || '',
      role: row.role || 'Khác',
      title: row.title || 'Thành viên',
      ref_code: row.ref_code || '',
      referral_group: row.referral_group || 'Khách vãng lai',
      referrer_name: row.referrer_name || '',
      source: row.source || '',
      join_date: row.join_date ? row.join_date.substring(0, 10) : '',
      status: row.status || 'Hoạt động',
      notes: row.notes || '',
    }));

    // 1. Thử gửi dạng batch (nhanh, đồng bộ toàn bộ bảng 1 lần)
    const batchOk = await sendToGoogleSheet({
      type: 'members_batch',
      items: membersList,
      total: membersList.length,
    });

    if (batchOk) {
      return NextResponse.json({
        message: `Đã đồng bộ ${membersList.length}/${rows.length} thành viên lên Google Sheet thành công!`,
        total: rows.length,
        successCount: membersList.length,
      });
    }

    // 2. Dự phòng: gửi từng dòng nếu Webhook chỉ nhận lẻ
    let successCount = 0;
    for (const member of membersList) {
      const ok = await sendToGoogleSheet({
        type: 'member',
        ...member,
      });
      if (ok) successCount++;
    }

    return NextResponse.json({
      message: `Đã đồng bộ ${successCount}/${rows.length} thành viên lên Google Sheet thành công!`,
      total: rows.length,
      successCount,
    });
  } catch (error) {
    console.error('Failed to sync members to Google Sheet:', error);
    return NextResponse.json(
      { error: 'Lỗi khi đồng bộ dữ liệu thành viên sang Google Sheet' },
      { status: 500 }
    );
  }
}
