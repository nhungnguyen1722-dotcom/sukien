import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

export const dynamic = 'force-dynamic';

// GET: Lấy danh sách khách mời đã nhập theo sự kiện hoặc tìm kiếm
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const eventId = searchParams.get('eventId');
    const search = searchParams.get('search') || '';

    let query = `
      SELECT 
        r.id,
        r.event_id,
        r.guest_code,
        r.guest_name,
        r.guest_phone,
        r.guest_email,
        r.company_address,
        COALESCE(r.guest_role, 'MC') AS guest_role,
        COALESCE(r.source, 'Lễ tân nhập') AS source,
        r.referrer_id,
        COALESCE(u.full_name, r.referrer_group, '') AS sale_name,
        u.phone AS sale_phone,
        COALESCE(r.attendance_status, 'Đã đăng ký') AS attendance_status,
        r.notes,
        r.registered_at,
        r.created_at,
        e.name AS event_name,
        e.event_date::text AS event_date,
        e.location AS event_location
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

    if (search.trim()) {
      params.push(`%${search.trim()}%`);
      query += ` AND (r.guest_name ILIKE $${params.length} OR r.guest_phone ILIKE $${params.length} OR r.guest_code ILIKE $${params.length})`;
    }

    query += ` ORDER BY r.id DESC`;

    const result = await pool.query(query, params);

    return NextResponse.json({
      registrations: result.rows.map(row => ({
        ...row,
        event_date: row.event_date,
        created_at: row.created_at ? new Date(row.created_at).toISOString() : null,
      }))
    });
  } catch (error) {
    console.error('Failed to fetch registrations:', error);
    return NextResponse.json(
      { error: 'Lỗi khi lấy danh sách khách mời' },
      { status: 500 }
    );
  }
}

// POST: Thêm khách mời mới từ lễ tân
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      event_id,
      guest_code,
      guest_name,
      guest_phone,
      referrer_id,
      guest_role = 'MC',
      source = 'Lễ tân nhập',
      attendance_status = 'Đã đăng ký',
      notes = '',
    } = body;

    if (!event_id) {
      return NextResponse.json(
        { error: 'Vui lòng chọn sự kiện' },
        { status: 400 }
      );
    }

    if (!guest_name || !guest_name.trim()) {
      return NextResponse.json(
        { error: 'Vui lòng nhập họ tên khách' },
        { status: 400 }
      );
    }

    // Duplicate check: Kiểm tra trùng SĐT và trùng cả tên + SĐT cho sự kiện
    if (guest_phone && guest_phone.trim()) {
      const cleanPhone = guest_phone.trim();
      const cleanName = guest_name.trim();

      // 1. Kiểm tra cả số điện thoại và cả tên trùng
      const exactDupe = await pool.query(
        `SELECT id, guest_name FROM event_registrations 
         WHERE event_id = $1 AND LOWER(TRIM(guest_name)) = LOWER(TRIM($2)) AND TRIM(guest_phone) = TRIM($3) 
         LIMIT 1`,
        [parseInt(event_id, 10), cleanName, cleanPhone]
      );
      if (exactDupe.rows.length > 0) {
        return NextResponse.json(
          { error: `Cả số điện thoại và cả tên của người sau (${cleanName} - ${cleanPhone}) trùng với người trước thì không cho cập nhật dữ liệu.` },
          { status: 409 }
        );
      }

      // 2. Kiểm tra số điện thoại trùng
      const phoneDupe = await pool.query(
        `SELECT id, guest_name FROM event_registrations 
         WHERE event_id = $1 AND TRIM(guest_phone) = TRIM($2) 
         LIMIT 1`,
        [parseInt(event_id, 10), cleanPhone]
      );
      if (phoneDupe.rows.length > 0) {
        return NextResponse.json(
          { error: `Có số điện thoại ${cleanPhone} của người sau trùng với "${phoneDupe.rows[0].guest_name}" thì không cho cập nhật dữ liệu.` },
          { status: 409 }
        );
      }
    }

    const insertResult = await pool.query(
      `
      INSERT INTO event_registrations (
        event_id,
        guest_code,
        guest_name,
        guest_phone,
        referrer_id,
        guest_role,
        source,
        attendance_status,
        notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING id, event_id, guest_code, guest_name, guest_phone, referrer_id, guest_role, source, attendance_status, notes, created_at
      `,
      [
        parseInt(event_id, 10),
        guest_code?.trim() || null,
        guest_name.trim(),
        guest_phone?.trim() || null,
        referrer_id ? parseInt(referrer_id, 10) : null,
        guest_role || 'MC',
        source || 'Lễ tân nhập',
        attendance_status || 'Đã đăng ký',
        notes?.trim() || null,
      ]
    );

    const newReg = insertResult.rows[0];

    // Fetch joined sale info & event info for Google Sheet sync
    let saleName = '';
    if (newReg.referrer_id) {
      const userRes = await pool.query('SELECT full_name FROM users WHERE id = $1', [newReg.referrer_id]);
      if (userRes.rows.length > 0) {
        saleName = userRes.rows[0].full_name;
      }
    }

    let eventName = '';
    let eventDate = '';
    if (newReg.event_id) {
      const eventRes = await pool.query('SELECT name, event_date::text FROM events WHERE id = $1', [newReg.event_id]);
      if (eventRes.rows.length > 0) {
        eventName = eventRes.rows[0].name;
        eventDate = eventRes.rows[0].event_date;
      }
    }

    // Trigger async sync to Google Sheet (non-blocking)
    import('@/lib/googleSheetWebhook').then(({ sendToGoogleSheet }) => {
      sendToGoogleSheet({
        guest_code: newReg.guest_code,
        guest_name: newReg.guest_name,
        guest_phone: newReg.guest_phone,
        event_name: eventName,
        event_date: eventDate,
        sale_name: saleName,
        source: newReg.source,
        attendance_status: newReg.attendance_status,
        notes: newReg.notes,
      }).catch((err) => console.error('Google Sheet background sync error:', err));
    });


    // Sync expected_guests to actual registration count
    await pool.query(
      `UPDATE events SET expected_guests = (SELECT COUNT(*) FROM event_registrations WHERE event_id = $1) WHERE id = $1`,
      [parseInt(event_id, 10)]
    );

    return NextResponse.json(
      {
        registration: {
          ...newReg,
          sale_name: saleName,
          created_at: newReg.created_at ? new Date(newReg.created_at).toISOString() : null,
        },
        message: 'Thêm khách mời thành công',
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Failed to create registration:', error);
    return NextResponse.json(
      { error: 'Lỗi khi tạo khách mời mới' },
      { status: 500 }
    );
  }
}

// PATCH: Cập nhật trạng thái hoặc thông tin khách mời
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, attendance_status, guest_role, notes, is_food_approved, guest_name, guest_phone } = body;

    if (!id) {
      return NextResponse.json({ error: 'Thiếu ID khách mời' }, { status: 400 });
    }

    if (guest_phone && guest_phone.trim()) {
      const cleanPhone = guest_phone.trim();
      const currentRec = await pool.query('SELECT event_id, guest_name FROM event_registrations WHERE id = $1', [id]);
      if (currentRec.rows.length > 0) {
        const evId = currentRec.rows[0].event_id;
        const targetName = (guest_name ? guest_name.trim() : currentRec.rows[0].guest_name) || '';
        
        // Check exact match
        const exactDupe = await pool.query(
          `SELECT id FROM event_registrations 
           WHERE event_id = $1 AND id != $2 AND LOWER(TRIM(guest_name)) = LOWER(TRIM($3)) AND TRIM(guest_phone) = TRIM($4) LIMIT 1`,
          [evId, id, targetName, cleanPhone]
        );
        if (exactDupe.rows.length > 0) {
          return NextResponse.json(
            { error: `Cả số điện thoại và tên của người sau trùng với người trước thì không cho cập nhật dữ liệu.` },
            { status: 409 }
          );
        }

        // Check phone match
        const phoneDupe = await pool.query(
          `SELECT id, guest_name FROM event_registrations 
           WHERE event_id = $1 AND id != $2 AND TRIM(guest_phone) = TRIM($3) LIMIT 1`,
          [evId, id, cleanPhone]
        );
        if (phoneDupe.rows.length > 0) {
          return NextResponse.json(
            { error: `Có số điện thoại ${cleanPhone} của người sau trùng với "${phoneDupe.rows[0].guest_name}" thì không cho cập nhật dữ liệu.` },
            { status: 409 }
          );
        }
      }
    }

    const updates: string[] = [];
    const params: (string | number | boolean)[] = [id];

    if (guest_name !== undefined) {
      params.push(guest_name.trim());
      updates.push(`guest_name = $${params.length}`);
    }

    if (guest_phone !== undefined) {
      params.push(guest_phone.trim());
      updates.push(`guest_phone = $${params.length}`);
    }

    if (attendance_status !== undefined) {
      params.push(attendance_status);
      updates.push(`attendance_status = $${params.length}`);
      if (attendance_status === 'Đã check-in') {
        updates.push(`checkin_at = CURRENT_TIMESTAMP`);
      }
    }

    if (guest_role !== undefined) {
      params.push(guest_role);
      updates.push(`guest_role = $${params.length}`);
    }

    if (is_food_approved !== undefined) {
      params.push(Boolean(is_food_approved));
      updates.push(`is_food_approved = $${params.length}`);
    }

    if (notes !== undefined) {
      params.push(notes);
      updates.push(`notes = $${params.length}`);
    }

    if (updates.length === 0) {
      return NextResponse.json({ error: 'Không có dữ liệu cập nhật' }, { status: 400 });
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);

    const query = `
      UPDATE event_registrations
      SET ${updates.join(', ')}
      WHERE id = $1
      RETURNING *
    `;

    const result = await pool.query(query, params);

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Không tìm thấy khách mời' }, { status: 404 });
    }

    return NextResponse.json({
      registration: result.rows[0],
      message: 'Cập nhật thành công'
    });
  } catch (error) {
    console.error('Failed to update registration:', error);
    return NextResponse.json({ error: 'Lỗi khi cập nhật' }, { status: 500 });
  }
}

// DELETE: Xóa khách mời
export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Thiếu ID khách mời' }, { status: 400 });
    }

    const result = await pool.query('DELETE FROM event_registrations WHERE id = $1 RETURNING id', [parseInt(id, 10)]);

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Không tìm thấy bản ghi để xóa' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Xóa khách mời thành công', id: result.rows[0].id });
  } catch (error) {
    console.error('Failed to delete registration:', error);
    return NextResponse.json({ error: 'Lỗi khi xóa khách mời' }, { status: 500 });
  }
}
