import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const eventId = body.eventId || body.event_id;
    const fullName = body.fullName || body.guest_name;
    const phone = body.phone || body.guest_phone;
    const email = body.email || body.guest_email;
    const company = body.company || body.company_address;
    const referrer = body.referrer || body.referrer_name;
    const notes = body.notes;
    const isTodayCheckin = body.isTodayCheckin;

    if (!eventId) {
      return NextResponse.json(
        { success: false, error: 'Thiếu mã sự kiện' },
        { status: 400 }
      );
    }

    if (!fullName || !fullName.trim()) {
      return NextResponse.json(
        { success: false, error: 'Vui lòng nhập họ và tên' },
        { status: 400 }
      );
    }

    if (!phone || !phone.trim()) {
      return NextResponse.json(
        { success: false, error: 'Vui lòng nhập số điện thoại' },
        { status: 400 }
      );
    }

    const cleanPhone = phone.trim().replace(/\s+/g, '');
    const cleanName = fullName.trim();
    const cleanEmail = email?.trim() || null;
    const cleanCompany = company?.trim() || null;
    const cleanNotes = notes?.trim() || null;
    const parsedEventId = parseInt(eventId, 10);

    // 1. Kiểm tra sự kiện tồn tại
    const eventRes = await pool.query('SELECT id, name, event_date, location FROM events WHERE id = $1', [parsedEventId]);
    if (eventRes.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Sự kiện không tồn tại' },
        { status: 404 }
      );
    }
    const event = eventRes.rows[0];

    // Kiểm tra trùng lặp theo Yêu cầu 4: Cùng Tên VÀ cùng Số điện thoại trong cùng 1 sự kiện
    const duplicateCheck = await pool.query(
      `SELECT id FROM event_registrations 
       WHERE event_id = $1 
         AND LOWER(TRIM(guest_name)) = LOWER(TRIM($2)) 
         AND REGEXP_REPLACE(guest_phone, '[^0-9]', '', 'g') = REGEXP_REPLACE($3, '[^0-9]', '', 'g')
       LIMIT 1`,
      [parsedEventId, cleanName, cleanPhone]
    );

    if (duplicateCheck.rows.length > 0) {
      return NextResponse.json(
        {
          success: false,
          isDuplicate: true,
          error: `Bạn đã đăng ký rồi: ${cleanName} - ${cleanPhone} cho sự kiện ${event.name}`,
        },
        { status: 400 }
      );
    }

    // 2. Tìm người giới thiệu (nếu có)
    let referrerId: number | null = null;
    let referrerGroup: string | null = null;
    if (referrer && String(referrer).trim()) {
      const refStr = String(referrer).trim();
      const refNum = parseInt(refStr, 10);
      if (!isNaN(refNum)) {
        const refCheck = await pool.query('SELECT id, full_name FROM users WHERE id = $1', [refNum]);
        if (refCheck.rows.length > 0) {
          referrerId = refCheck.rows[0].id;
        } else {
          referrerGroup = refStr;
        }
      } else {
        const refSearch = await pool.query(
          'SELECT id FROM users WHERE full_name ILIKE $1 OR phone = $2 LIMIT 1',
          [refStr, refStr]
        );
        if (refSearch.rows.length > 0) {
          referrerId = refSearch.rows[0].id;
        } else {
          referrerGroup = refStr;
        }
      }
    }

    // 3. Quy tắc hop-thoai-6.txt:
    // Tự động kiểm tra hoặc tạo tài khoản cho khách bằng số điện thoại (username = SĐT, password = SĐT)
    let userId: number | null = null;
    const existingUserRes = await pool.query(
      'SELECT id, full_name, phone, role FROM users WHERE phone = $1 LIMIT 1',
      [cleanPhone]
    );

    if (existingUserRes.rows.length > 0) {
      userId = existingUserRes.rows[0].id;
      // Cập nhật thông tin nếu cần
      if (cleanEmail || referrerId) {
        await pool.query(
          `UPDATE users 
           SET email = COALESCE($1, email),
               referrer_id = COALESCE($2, referrer_id),
               updated_at = CURRENT_TIMESTAMP
           WHERE id = $3`,
          [cleanEmail, referrerId, userId]
        );
      }
    } else {
      // Tạo mới tài khoản với SĐT và mật khẩu là SĐT
      const newUserRes = await pool.query(
        `INSERT INTO users (
          full_name,
          phone,
          email,
          password,
          role,
          classification,
          referrer_id,
          referral_group,
          status,
          join_date
        ) VALUES ($1, $2, $3, $4, 'Khách mời', 'Khách mời', $5, $6, 'Đang hoạt động', CURRENT_DATE)
        RETURNING id`,
        [
          cleanName,
          cleanPhone,
          cleanEmail,
          cleanPhone, // Mật khẩu mặc định bằng SĐT
          referrerId,
          referrerGroup,
        ]
      );
      if (newUserRes.rows.length > 0) {
        userId = newUserRes.rows[0].id;
      }
    }

    // 4. Sinh mã đăng ký check-in (Guest Code)
    const randomSuffix = Math.floor(100000 + Math.random() * 900000);
    const guestCode = `QR-${parsedEventId}-${randomSuffix}`;

    // Trạng thái: nếu là sự kiện đang diễn ra hôm nay thì chuyển sang check-in tham dự
    const attendanceStatus = isTodayCheckin ? 'Đã check-in' : 'Đã đăng ký';

    // 5. Lưu vào event_registrations
    // Theo hop-thoai-6: Mặc định ăn hết (is_food_approved = true)
    const regRes = await pool.query(
      `INSERT INTO event_registrations (
        event_id,
        user_id,
        guest_code,
        guest_name,
        guest_phone,
        guest_email,
        company_address,
        referrer_id,
        referrer_group,
        attendance_status,
        is_food_approved,
        source,
        notes,
        registered_at,
        checkin_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, TRUE, 'Trang chủ Web', $11, CURRENT_TIMESTAMP, $12)
      RETURNING *`,
      [
        parsedEventId,
        userId,
        guestCode,
        cleanName,
        cleanPhone,
        cleanEmail,
        cleanCompany,
        referrerId,
        referrerGroup,
        attendanceStatus,
        cleanNotes,
        isTodayCheckin ? new Date() : null,
      ]
    );

    const registration = regRes.rows[0];

    // Cập nhật số lượng khách dự kiến cho sự kiện đồng bộ chính xác với số người đăng ký thực tế
    await pool.query(
      `UPDATE events 
       SET expected_guests = (SELECT COUNT(*)::int FROM event_registrations WHERE event_id = $1) 
       WHERE id = $1`,
      [parsedEventId]
    );

    return NextResponse.json({
      success: true,
      message: isTodayCheckin
        ? 'Check-in tham dự sự kiện thành công!'
        : 'Đăng ký tham dự sự kiện thành công!',
      registration: {
        id: registration.id,
        guestCode: registration.guest_code,
        guestName: registration.guest_name,
        guestPhone: registration.guest_phone,
        guestEmail: registration.guest_email,
        attendanceStatus: registration.attendance_status,
        eventName: event.name,
        eventDate: event.event_date,
        eventLocation: event.location,
      },
      user: {
        id: userId,
        phone: cleanPhone,
        fullName: cleanName,
      }
    });
  } catch (error: any) {
    console.error('Lỗi khi đăng ký sự kiện:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Lỗi xử lý đăng ký' },
      { status: 500 }
    );
  }
}
