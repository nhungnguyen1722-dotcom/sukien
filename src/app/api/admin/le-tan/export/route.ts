import ExcelJS from 'exceljs';
import { NextRequest } from 'next/server';
import pool from '@/lib/db';

export const dynamic = 'force-dynamic';

type ReceptionGuest = {
  guest_name: string;
  guest_phone: string | null;
  sale_name: string;
  attendance_status: string;
  business_unit: string;
  notes: string | null;
};

const headers = ['STT', 'Họ và tên khách', 'SĐT', 'Người mời (Sale)', 'Tình trạng', 'Khối / Ban', 'Ghi chú'];

function isCapitalUnit(businessUnit: string) {
  const normalized = businessUnit.trim().toLocaleLowerCase('vi-VN');
  return normalized === 'bnv' || normalized.includes('nguồn vốn') || normalized.includes('nguon von');
}

const DARK_BLUE_ARGB = 'FF1E3A8A'; // Màu xanh đậm nổi bật

function addGuestSheet(
  workbook: ExcelJS.Workbook,
  sheetName: string,
  eventName: string,
  eventDate: string | null,
  guests: ReceptionGuest[],
  sheetTitle: string,
  unitLabel: string,
) {
  const sheet = workbook.addWorksheet(sheetName, {
    views: [{ state: 'frozen', ySplit: 4 }],
    pageSetup: {
      paperSize: 9, // Khổ A4
      orientation: 'portrait',
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      margins: {
        left: 0.4,
        right: 0.4,
        top: 0.5,
        bottom: 0.5,
        header: 0.3,
        footer: 0.3,
      },
      printTitlesRow: '4:4',
    },
  });

  sheet.columns = [
    { width: 6 },
    { width: 25 },
    { width: 16 },
    { width: 23 },
    { width: 16 },
    { width: 22 },
    { width: 28 },
  ];

  // Tiêu đề bảng màu xanh đậm nổi bật
  sheet.mergeCells('A1:G1');
  const title = sheet.getCell('A1');
  title.value = sheetTitle.toUpperCase();
  title.font = { bold: true, size: 14, color: { argb: 'FFFFFFFF' } };
  title.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: DARK_BLUE_ARGB } };
  title.alignment = { horizontal: 'center', vertical: 'middle' };
  sheet.getRow(1).height = 28;

  sheet.mergeCells('A2:G2');
  const event = sheet.getCell('A2');
  event.value = `Sự kiện: ${eventName}${eventDate ? ` • Ngày: ${eventDate.slice(0, 10)}` : ''}`;
  event.font = { italic: true, bold: true, size: 11, color: { argb: DARK_BLUE_ARGB } };
  event.alignment = { horizontal: 'left', vertical: 'middle' };
  sheet.getRow(2).height = 20;

  sheet.getRow(3).height = 6; // Hàng đệm

  // Hàng tiêu đề cột - màu xanh đậm nổi bật, chữ trắng in đậm
  const headerRow = sheet.getRow(4);
  headerRow.values = headers;
  headerRow.height = 26;
  headerRow.eachCell((cell) => {
    cell.font = { bold: true, size: 11, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: DARK_BLUE_ARGB } };
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      bottom: { style: 'medium', color: { argb: 'FFFFFFFF' } },
      right: { style: 'thin', color: { argb: 'FFCBD5E1' } },
    };
  });

  if (!guests.length) {
    sheet.mergeCells('A5:G5');
    const emptyCell = sheet.getCell('A5');
    emptyCell.value = 'Chưa có khách mời trong danh sách này.';
    emptyCell.alignment = { horizontal: 'center', vertical: 'middle' };
    emptyCell.font = { italic: true, color: { argb: 'FF64748B' } };
    sheet.getRow(5).height = 24;
    return;
  }

  guests.forEach((guest, index) => {
    const row = sheet.addRow([
      index + 1,
      guest.guest_name,
      guest.guest_phone || '—',
      guest.sale_name || 'Khách vãng lai',
      guest.attendance_status,
      unitLabel,
      guest.notes || '',
    ]);
    row.height = 22;
    row.eachCell((cell, colNumber) => {
      cell.alignment = { vertical: 'middle', wrapText: true };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      };
      if (index % 2 === 1) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
      }
      if (colNumber === 1 || colNumber === 3 || colNumber === 5 || colNumber === 6) {
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
      }
    });
  });

  sheet.autoFilter = { from: 'A4', to: `G${guests.length + 4}` };
}

export async function GET(request: NextRequest) {
  try {
    const eventId = Number(request.nextUrl.searchParams.get('eventId'));
    if (!Number.isInteger(eventId) || eventId <= 0) {
      return Response.json({ error: 'Sự kiện không hợp lệ.' }, { status: 400 });
    }

    const [eventResult, registrationsResult] = await Promise.all([
      pool.query('SELECT id, name, event_date::text AS event_date FROM events WHERE id = $1', [eventId]),
      pool.query(
        `
          SELECT
            r.guest_name,
            r.guest_phone,
            COALESCE(u.full_name, r.referrer_group, '') AS sale_name,
            COALESCE(r.attendance_status, 'Đã đăng ký') AS attendance_status,
            COALESCE(NULLIF(BTRIM(r.business_unit), ''), 'Khối kinh doanh') AS business_unit,
            r.notes
          FROM event_registrations r
          LEFT JOIN users u ON u.id = r.referrer_id
          WHERE r.event_id = $1
          ORDER BY r.id ASC
        `,
        [eventId],
      ),
    ]);

    const event = eventResult.rows[0];
    if (!event) {
      return Response.json({ error: 'Không tìm thấy sự kiện.' }, { status: 404 });
    }

    const guests = registrationsResult.rows as ReceptionGuest[];
    const capitalGuests = guests.filter((guest) => isCapitalUnit(guest.business_unit));
    const businessGuests = guests.filter((guest) => !isCapitalUnit(guest.business_unit));

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Nghiêng Complex';
    workbook.created = new Date();
    addGuestSheet(
      workbook,
      'Khách mời Ban nguồn vốn 314',
      event.name,
      event.event_date,
      capitalGuests,
      'Danh sách khách mời Ban nguồn vốn 314',
      'Ban nguồn vốn 314',
    );
    addGuestSheet(
      workbook,
      'Khách mời Khối kinh doanh',
      event.name,
      event.event_date,
      businessGuests,
      'Danh sách khách mời Khối kinh doanh',
      'Khối kinh doanh',
    );

    const buffer = await workbook.xlsx.writeBuffer();
    const fileName = `Danh-sach-khach-moi-${eventId}.xlsx`;
    return new Response(new Uint8Array(buffer) as unknown as BodyInit, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${fileName}"; filename*=UTF-8''${encodeURIComponent(fileName)}`,
        'Cache-Control': 'no-store, must-revalidate',
      },
    });
  } catch (error) {
    console.error('Failed to export reception registrations:', error);
    return Response.json({ error: 'Không thể xuất file Excel.' }, { status: 500 });
  }
}
