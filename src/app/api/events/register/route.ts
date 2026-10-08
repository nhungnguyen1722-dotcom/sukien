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
    const cleanName = fullName.trim().replace(/\s+/g, ' ');
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

    // Kiểm tra trùng lặp người đăng ký trong cùng 1 sự kiện:
    // 1) Khác tên, trùng Số Điện thoại người trước -> KHÔNG được đăng ký tiếp tục trong sự kiện đó
    // 2) Trùng cả tên, trùng cả Số Điện thoại người trước -> KHÔNG được đăng ký tiếp tục trong sự kiện đó
    const duplicatePhoneCheck = await pool.query(
      `SELECT 
         id, 
         guest_code, 
         guest_name, 
         guest_phone, 
         guest_email, 
         attendance_status, 
         is_food_approved 
       FROM event_registrations 
       WHERE event_id = $1 
         AND (
           REGEXP_REPLACE(guest_phone, '[^0-9]', '', 'g') = REGEXP_REPLACE($2, '[^0-9]', '', 'g')
           OR (
             LENGTH(REGEXP_REPLACE(guest_phone, '[^0-9]', '', 'g')) >= 9 
             AND LENGTH(REGEXP_REPLACE($2, '[^0-9]', '', 'g')) >= 9 
             AND RIGHT(REGEXP_REPLACE(guest_phone, '[^0-9]', '', 'g'), 9) = RIGHT(REGEXP_REPLACE($2, '[^0-9]', '', 'g'), 9)
           )
         )
       ORDER BY 
         CASE WHEN LOWER(TRIM(guest_name)) = LOWER(TRIM($3)) THEN 0 ELSE 1 END ASC,
         id ASC
       LIMIT 1`,
      [parsedEventId, cleanPhone, cleanName]
    );

    if (duplicatePhoneCheck.rows.length > 0) {
      const existingReg = duplicatePhoneCheck.rows[0];
      const existingGuestName = (existingReg.guest_name || '').trim();
      const isSameName = existingGuestName.toLowerCase() === cleanName.toLowerCase();

      if (isSameName) {
        // Trường hợp 2: Người đăng ký lần 2 trở đi trùng cả tên, trùng cả điện thoại
        return NextResponse.json(
          {
            success: false,
            isDuplicate: true,
            duplicateType: 'SAME_NAME_SAME_PHONE',
            error: `Bạn đã đăng ký sự kiện này rồi (${cleanName} - ${cleanPhone}). Trong 1 sự kiện, mỗi người chỉ được đăng ký 1 lần.`,
            registration: {
              id: existingReg.id,
              guestCode: existingReg.guest_code,
              guestName: existingReg.guest_name,
              guestPhone: existingReg.guest_phone,
              guestEmail: existingReg.guest_email,
              attendanceStatus: existingReg.attendance_status,
              isFoodApproved: existingReg.is_food_approved,
              eventName: event.name,
              eventDate: event.event_date,
              eventLocation: event.location,
            },
          },
          { status: 400 }
        );
      } else {
        // Trường hợp 1: Người đăng ký lần 2 trở đi khác tên, trùng Số Điện thoại người trước
        return NextResponse.json(
          {
            success: false,
            isDuplicate: true,
            duplicateType: 'DIFFERENT_NAME_SAME_PHONE',
            error: `Số điện thoại ${cleanPhone} đã được đăng ký bởi khách hàng "${existingGuestName}" trong sự kiện "${event.name}". Trong 1 sự kiện, mỗi số điện thoại chỉ được đăng ký 1 lần.`,
          },
          { status: 400 }
        );
      }
    }

    // 2. Tìm người giới thiệu (nếu có)
    let referrerId: number | null = null;
    let referrerGroup: string | null = null;
    if (referrer && String(referrer).trim()) {
      const refStr = String(referrer).trim();
      const codeMatch = refStr.match(/N_[0-9A-Za-z_-]+/);
      const extractedCode = codeMatch ? codeMatch[0] : null;

      const refSearch = await pool.query(
        `SELECT id, full_name, ref_code FROM users 
         WHERE ref_code = $1 
            OR ($2::text IS NOT NULL AND ref_code = $2)
            OR phone = $1 
            OR full_name ILIKE $1 
            OR email ILIKE $1 
         LIMIT 1`,
        [refStr, extractedCode]
      );
      if (refSearch.rows.length > 0) {
        referrerId = refSearch.rows[0].id;
        referrerGroup = refSearch.rows[0].full_name;
      } else {
        const refNum = parseInt(refStr, 10);
        if (!isNaN(refNum)) {
          const refCheck = await pool.query('SELECT id, full_name FROM users WHERE id = $1', [refNum]);
          if (refCheck.rows.length > 0) {
            referrerId = refCheck.rows[0].id;
            referrerGroup = refCheck.rows[0].full_name;
          } else {
            referrerGroup = refStr;
          }
        } else {
          referrerGroup = refStr;
        }
      }
    }

    // 3. Quy tắc hop-thoai-6.txt:
    // Tự động kiểm tra hoặc tạo tài khoản cho khách bằng số điện thoại (username = SĐT, password = SĐT)
    let userId: number | null = null;
    const existingUserRes = await pool.query(
      'SELECT id, full_name, phone, role, ref_code FROM users WHERE phone = $1 LIMIT 1',
      [cleanPhone]
    );

    let userRole = 'Thành viên';
    let userRefCode = '';

    if (existingUserRes.rows.length > 0) {
      userId = existingUserRes.rows[0].id;
      userRole = existingUserRes.rows[0].role || 'Thành viên';
      userRefCode = existingUserRes.rows[0].ref_code || (cleanPhone ? `N_${cleanPhone}` : `N_${Date.now()}`);
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
      const generatedRefCode = cleanPhone ? `N_${cleanPhone}` : `N_${Date.now()}`;
      userRefCode = generatedRefCode;
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
          join_date,
          ref_code
        ) VALUES ($1, $2, $3, $4, 'Thành viên', 'Thành viên', $5, $6, 'Đang hoạt động', CURRENT_DATE, $7)
        RETURNING id, ref_code, role`,
        [
          cleanName,
          cleanPhone,
          cleanEmail,
          cleanPhone, // Mật khẩu mặc định bằng SĐT
          referrerId,
          referrerGroup,
          generatedRefCode,
        ]
      );
      if (newUserRes.rows.length > 0) {
        userId = newUserRes.rows[0].id;
        userRole = newUserRes.rows[0].role || 'Thành viên';
      }
    }

    // 4. Sinh mã đăng ký check-in (Guest Code)
    const randomSuffix = Math.floor(100000 + Math.random() * 900000);
    const guestCode = `QR-${parsedEventId}-${randomSuffix}`;

    // Trạng thái: nếu là sự kiện đang diễn ra hôm nay thì chuyển sang check-in tham dự
    const attendanceStatus = isTodayCheckin ? 'Đã check-in' : 'Đã đăng ký';

    // 5. Lưu vào event_registrations (Mục 10 - Checkbox Suất ăn tiệc trà)
    const isFoodApproved = body.has_tea_break !== undefined
      ? (body.has_tea_break === true || body.has_tea_break === 'true' || body.has_tea_break === 1 || body.has_tea_break === '1')
      : (body.is_food_approved !== undefined
          ? (body.is_food_approved === true || body.is_food_approved === 'true' || body.is_food_approved === 1 || body.is_food_approved === '1')
          : true);

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
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'Trang chủ Web', $12, CURRENT_TIMESTAMP, $13)
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
        isFoodApproved,
        cleanNotes,
        isTodayCheckin ? new Date() : null,
      ]
    );

    const registration = regRes.rows[0];

    // Ghi nhận lời mời vào bảng invitations nếu có người giới thiệu (Mục 6 & 13)
    if (referrerId) {
      try {
        const invCheck = await pool.query(
          `SELECT id FROM invitations WHERE inviter_id = $1 AND (invitee_phone = $2 OR (invitee_email IS NOT NULL AND invitee_email = $3)) LIMIT 1`,
          [referrerId, cleanPhone, cleanEmail]
        );
        if (invCheck.rows.length === 0) {
          await pool.query(
            `INSERT INTO invitations (inviter_id, invitee_name, invitee_email, invitee_phone, status, reward_points, created_at)
             VALUES ($1, $2, $3, $4, 'Thành công', 10, CURRENT_TIMESTAMP)`,
            [referrerId, cleanName, cleanEmail || `${cleanPhone}@guest.local`, cleanPhone]
          );
        }
      } catch (err) {
        console.error('Error recording invitation:', err);
      }
    }

    // Cập nhật số lượng khách dự kiến cho sự kiện đồng bộ chính xác với số người đăng ký thực tế
    await pool.query(
      `UPDATE events 
       SET expected_guests = (SELECT COUNT(*)::int FROM event_registrations WHERE event_id = $1) 
       WHERE id = $1`,
      [parsedEventId]
    );

    const finalRole = userRole || 'Thành viên';
    const finalRefCode = userRefCode || (cleanPhone ? `N_${cleanPhone}` : `N_${Date.now()}`);

    const response = NextResponse.json({
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
        isFoodApproved: registration.is_food_approved,
        eventName: event.name,
        eventDate: event.event_date,
        eventLocation: event.location,
      },
      user: {
        id: userId,
        phone: cleanPhone,
        fullName: cleanName,
        email: cleanEmail,
        role: finalRole,
        ref_code: finalRefCode,
      },
      role: finalRole,
      ref_code: finalRefCode,
    });

    // Tự động đăng nhập người dùng & Lưu cookie persistent (1 năm) trên thiết bị PC & Mobile (Mục 13)
    const cookieOptions = {
      path: '/',
      maxAge: 365 * 24 * 60 * 60, // Persistent 1 năm
      sameSite: 'lax' as const,
    };
    response.cookies.set('user_role', finalRole, cookieOptions);
    response.cookies.set('user_name', encodeURIComponent(cleanName), cookieOptions);
    response.cookies.set('user_email', encodeURIComponent(cleanEmail || ''), cookieOptions);
    response.cookies.set('user_phone', encodeURIComponent(cleanPhone), cookieOptions);
    if (userId) {
      response.cookies.set('user_id', String(userId), cookieOptions);
    }
    response.cookies.set('user_ref_code', finalRefCode, cookieOptions);
    response.cookies.set('ref_code', finalRefCode, cookieOptions);
    response.cookies.set('user_ref', finalRefCode, cookieOptions);

    return response;
  } catch (error: any) {
    console.error('Lỗi khi đăng ký sự kiện:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Lỗi xử lý đăng ký' },
      { status: 500 }
    );
  }
}
