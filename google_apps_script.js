/**
 * GOOGLE APPS SCRIPT ĐỒNG BỘ DỮ LIỆU SỰ KIỆN & THÀNH VIÊN
 * Hướng dẫn cài đặt vào Google Sheet: https://docs.google.com/spreadsheets/d/1Z6i0o0DIETLHKrm5SxviwpO5_de6ZoouJlddKiwauJo/edit?gid=0#gid=0
 * 
 * BƯỚC 1: Mở Google Sheet trên bằng tài khoản nhungnguyen1722@gmail.com
 * BƯỚC 2: Trên thanh menu, chọn: Tiện ích mở rộng (Extensions) -> Apps Script
 * BƯỚC 3: Xóa hết mã cũ trong file Code.gs và dán toàn bộ đoạn mã bên dưới vào.
 * BƯỚC 4: Bấm nút "Lưu" (biểu tượng đĩa mềm 💾).
 * BƯỚC 5: Bấm nút "Triển khai" (Deploy) -> "Quản lý bản triển khai" (hoặc "Triển khai mới" -> New deployment).
 *         - Loại triển khai: Ứng dụng web (Web app)
 *         - Mô tả: "Đồng bộ thành viên và sự kiện"
 *         - Thực thi dưới dạng (Execute as): "Tôi" (nhungnguyen1722@gmail.com)
 *         - Ai có quyền truy cập (Who has access): "Bất kỳ ai" (Anyone)
 * BƯỚC 6: Bấm "Triển khai" (Deploy) -> Cấp quyền truy cập nếu Google hỏi.
 * BƯỚC 7: Copy đường dẫn URL Ứng dụng web (kết thúc bằng /exec) và dán vào file .env.local:
 *         GOOGLE_SHEET_WEBHOOK_URL="URL_VỪA_COPY"
 */

function doGet(e) {
  return ContentService.createTextOutput(JSON.stringify({
    status: 'success',
    message: 'Google Sheet Webhook đang hoạt động bình thường!',
    time: new Date().toISOString()
  })).setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  try {
    var contents = e.postData ? e.postData.contents : '';
    if (!contents) {
      return ContentService.createTextOutput(JSON.stringify({
        status: 'error',
        message: 'No post data'
      })).setMimeType(ContentService.MimeType.JSON);
    }

    var data = JSON.parse(contents);
    var ss = SpreadsheetApp.getActiveSpreadsheet();

    // 1. ĐỒNG BỘ DANH SÁCH THÀNH VIÊN (Mục 7)
    if (data.type === 'members_batch' && Array.isArray(data.items)) {
      var sheet = getOrCreateSheet(ss, 'Thành viên', [
        'ID', 'Họ và tên', 'Số điện thoại', 'Email', 'Vai trò', 'Chức danh',
        'Nhóm người mới', 'Mã giới thiệu', 'Người giới thiệu', 'Nguồn',
        'Ngày tham gia', 'Trạng thái', 'Ghi chú', 'Thời gian đồng bộ'
      ]);

      // Xóa dữ liệu cũ từ dòng 2 trở đi để cập nhật mới nhất
      var lastRow = sheet.getLastRow();
      if (lastRow > 1) {
        sheet.getRange(2, 1, lastRow - 1, 14).clearContent();
      }

      var now = Utilities.formatDate(new Date(), 'Asia/Ho_Chi_Minh', 'dd/MM/yyyy HH:mm:ss');
      var rows = data.items.map(function(m) {
        return [
          m.member_id || m.id || '',
          m.full_name || '',
          m.phone ? "'" + m.phone : '',
          m.email || '',
          m.role || '',
          m.title || '',
          m.referral_group || '',
          m.ref_code || '',
          m.referrer_name || '',
          m.source || '',
          m.join_date || '',
          m.status || '',
          m.notes || '',
          now
        ];
      });

      if (rows.length > 0) {
        sheet.getRange(2, 1, rows.length, 14).setValues(rows);
      }

      return ContentService.createTextOutput(JSON.stringify({
        status: 'success',
        type: 'members_batch',
        count: rows.length
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // 1.2 ĐỒNG BỘ 1 THÀNH VIÊN LẺ
    if (data.type === 'member') {
      var sheet = getOrCreateSheet(ss, 'Thành viên', [
        'ID', 'Họ và tên', 'Số điện thoại', 'Email', 'Vai trò', 'Chức danh',
        'Nhóm người mới', 'Mã giới thiệu', 'Người giới thiệu', 'Nguồn',
        'Ngày tham gia', 'Trạng thái', 'Ghi chú', 'Thời gian đồng bộ'
      ]);

      var now = Utilities.formatDate(new Date(), 'Asia/Ho_Chi_Minh', 'dd/MM/yyyy HH:mm:ss');
      sheet.appendRow([
        data.member_id || data.id || '',
        data.full_name || '',
        data.phone ? "'" + data.phone : '',
        data.email || '',
        data.role || '',
        data.title || '',
        data.referral_group || '',
        data.ref_code || '',
        data.referrer_name || '',
        data.source || '',
        data.join_date || '',
        data.status || '',
        data.notes || '',
        now
      ]);

      return ContentService.createTextOutput(JSON.stringify({
        status: 'success',
        type: 'member'
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // 2. ĐỒNG BỘ SỰ KIỆN
    if (data.type === 'event') {
      var sheet = getOrCreateSheet(ss, 'Sự kiện', [
        'ID', 'Tên sự kiện', 'Ngày tổ chức', 'Địa điểm', 'Số khách dự kiến',
        'Người quản lý', 'Trạng thái', 'Trạng thái duyệt', 'Tổng chi phí', 'Ghi chú', 'Thời gian đồng bộ'
      ]);

      var now = Utilities.formatDate(new Date(), 'Asia/Ho_Chi_Minh', 'dd/MM/yyyy HH:mm:ss');
      sheet.appendRow([
        data.event_id || '',
        data.event_name || '',
        data.event_date || '',
        data.location || '',
        data.expected_guests || 0,
        data.manager_name || '',
        data.status || '',
        data.approval_status || '',
        data.total_cost || 0,
        data.notes || '',
        now
      ]);

      return ContentService.createTextOutput(JSON.stringify({
        status: 'success',
        type: 'event'
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // 3. ĐỒNG BỘ LỄ TÂN / KHÁCH THAM DỰ
    if (data.guest_name || data.attendance_status) {
      var sheet = getOrCreateSheet(ss, 'Lễ tân', [
        'Mã khách', 'Họ và tên', 'Số điện thoại', 'Email', 'Tên sự kiện',
        'Ngày sự kiện', 'Người mời/Sale', 'Nguồn', 'Tình trạng', 'Ghi chú', 'Thời gian đồng bộ'
      ]);

      var now = Utilities.formatDate(new Date(), 'Asia/Ho_Chi_Minh', 'dd/MM/yyyy HH:mm:ss');
      sheet.appendRow([
        data.guest_code || '',
        data.guest_name || '',
        data.guest_phone ? "'" + data.guest_phone : '',
        data.guest_email || '',
        data.event_name || '',
        data.event_date || '',
        data.sale_name || '',
        data.source || '',
        data.attendance_status || '',
        data.notes || '',
        now
      ]);

      return ContentService.createTextOutput(JSON.stringify({
        status: 'success',
        type: 'registration'
      })).setMimeType(ContentService.MimeType.JSON);
    }

    return ContentService.createTextOutput(JSON.stringify({
      status: 'success',
      message: 'Data received'
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      status: 'error',
      message: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function getOrCreateSheet(ss, name, headers) {
  var sheet = ss.getSheetByName(name);
  if (!sheet) {
    // Nếu có Trang tính1 đang trống, đổi tên thành name
    var defaultSheet = ss.getSheetByName('Trang tính1') || ss.getSheetByName('Sheet1');
    if (defaultSheet && defaultSheet.getLastRow() === 0) {
      defaultSheet.setName(name);
      sheet = defaultSheet;
    } else {
      sheet = ss.insertSheet(name);
    }
  }

  // Nếu sheet chưa có header dòng 1, tạo header với style đẹp
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(headers);
    var headerRange = sheet.getRange(1, 1, 1, headers.length);
    headerRange.setBackground('#2563eb');
    headerRange.setFontColor('#ffffff');
    headerRange.setFontWeight('bold');
    sheet.setFrozenRows(1);
    for (var i = 1; i <= headers.length; i++) {
      sheet.autoResizeColumn(i);
    }
  }
  return sheet;
}
