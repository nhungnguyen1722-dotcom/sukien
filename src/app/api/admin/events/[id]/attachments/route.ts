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

// GET: Lấy danh sách tệp đính kèm
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
      `SELECT * FROM event_attachments WHERE event_id = $1 ORDER BY id DESC`,
      [eventId]
    );

    return NextResponse.json({
      attachments: result.rows.map(row => ({
        ...row,
        created_at: row.created_at ? new Date(row.created_at).toISOString() : null,
      }))
    });
  } catch (error) {
    console.error('Failed to get attachments:', error);
    return NextResponse.json({ error: 'Lỗi khi tải tệp đính kèm' }, { status: 500 });
  }
}

// POST: Thêm tệp đính kèm mới
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
      file_name,
      file_url = '#',
      file_type = 'Tài liệu',
      file_size = '1.2 MB',
      uploaded_by = 'Admin',
    } = body;

    if (!file_name || !file_name.trim()) {
      return NextResponse.json({ error: 'Tên tệp là bắt buộc' }, { status: 400 });
    }

    const result = await pool.query(
      `INSERT INTO event_attachments (event_id, file_name, file_url, file_type, file_size, uploaded_by)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        eventId,
        file_name.trim(),
        file_url.trim() || '#',
        file_type.trim() || 'Tài liệu',
        file_size.trim() || '1.0 MB',
        uploaded_by.trim() || 'Admin',
      ]
    );

    return NextResponse.json({
      attachment: result.rows[0],
      message: 'Thêm tệp đính kèm thành công',
    }, { status: 201 });
  } catch (error) {
    console.error('Failed to add attachment:', error);
    return NextResponse.json({ error: 'Lỗi khi lưu tệp đính kèm' }, { status: 500 });
  }
}

// DELETE: Xóa tệp đính kèm
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const attachId = searchParams.get('attachmentId');

    if (!attachId) {
      return NextResponse.json({ error: 'Thiếu attachmentId' }, { status: 400 });
    }

    const result = await pool.query('DELETE FROM event_attachments WHERE id = $1 RETURNING id', [parseInt(attachId, 10)]);

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Không tìm thấy tệp đính kèm' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Xóa tệp thành công', id: result.rows[0].id });
  } catch (error) {
    console.error('Failed to delete attachment:', error);
    return NextResponse.json({ error: 'Lỗi khi xóa tệp đính kèm' }, { status: 500 });
  }
}
