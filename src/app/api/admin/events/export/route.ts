import ExcelJS from 'exceljs';
import pool from '@/lib/db';

export const dynamic = 'force-dynamic';

const BLUE = 'FF1F4E79';
const LIGHT_BLUE = 'FFD9EAF7';
const BORDER = 'FFB8C7D5';
const CURRENCY_FORMAT = '#,##0 "đ"';

const headers = [
  'Mã Sự kiện',
  'Ngày tổ chức',
  'Tên Sự kiện / Tiệc trà',
  'Địa điểm',
  'Tổng người tham gia',
  'Số lượng Khách mời tham gia',
  'Số lượng Khách mời đăng ký ăn tiệc trà',
  'Số lượng Khách mời không ăn',
  'Tổng thù lao nhân sự (VND)',
  'Tổng Chi phí Tiệc trà (Cty)',
  'Tổng chi phí Sự kiện (VND)',
  'Trạng thái',
];

export async function GET() {
  try {
    const result = await pool.query(`
      WITH guest_counts AS (
        SELECT
          event_id,
          COUNT(*) FILTER (
            WHERE checkin_at IS NOT NULL
              AND COALESCE(attendance_status, '') NOT IN ('Đã hủy', 'Hủy', 'Từ chối')
          )::int AS attended_guests,
          COUNT(*) FILTER (
            WHERE checkin_at IS NOT NULL
              AND COALESCE(attendance_status, '') NOT IN ('Đã hủy', 'Hủy', 'Từ chối')
              AND COALESCE(is_food_approved, FALSE) = TRUE
          )::int AS food_guests
        FROM event_registrations
        GROUP BY event_id
      ),
      staff_counts AS (
        SELECT
          event_id,
          COUNT(*) FILTER (WHERE COALESCE(status, '') NOT IN ('Đã hủy', 'Hủy', 'Từ chối'))::int AS active_staff
        FROM event_in_charge
        GROUP BY event_id
      )
      SELECT
        COALESCE(NULLIF(BTRIM(e.code), ''), 'SK' || LPAD(e.id::text, 4, '0')) AS event_code,
        COALESCE(latest_log.event_date::date, e.event_date::date)::text AS event_date,
        e.name AS event_name,
        COALESCE(e.location, '') AS location,
        CASE WHEN latest_log.id IS NOT NULL THEN COALESCE(latest_log.total_attendees, 0)
          ELSE COALESCE(guest_counts.attended_guests, 0) + COALESCE(staff_counts.active_staff, 0)
        END::int AS total_attendees,
        CASE WHEN latest_log.id IS NOT NULL
          THEN GREATEST(COALESCE(latest_log.total_attendees, 0) - COALESCE(staff_counts.active_staff, 0), 0)
          ELSE COALESCE(guest_counts.attended_guests, 0)
        END::int AS attended_guests,
        CASE WHEN latest_log.id IS NOT NULL
          THEN LEAST(COALESCE(latest_log.food_guests_count, 0),
            GREATEST(COALESCE(latest_log.total_attendees, 0) - COALESCE(staff_counts.active_staff, 0), 0))
          ELSE COALESCE(guest_counts.food_guests, 0)
        END::int AS food_guests,
        CASE WHEN latest_log.id IS NOT NULL
          THEN GREATEST(
            COALESCE(latest_log.total_attendees, 0) - COALESCE(staff_counts.active_staff, 0)
              - COALESCE(latest_log.food_guests_count, 0), 0
          )
          ELSE GREATEST(COALESCE(guest_counts.attended_guests, 0) - COALESCE(guest_counts.food_guests, 0), 0)
        END::int AS guests_without_food,
        CASE WHEN latest_log.id IS NOT NULL THEN COALESCE(latest_log.staff_remuneration, 0)
          ELSE COALESCE(e.mc_fee, 0) + COALESCE(e.speaker_fee, 0) + COALESCE(e.support_fee, 0) + COALESCE(e.closer_fee, 0)
        END::float8 AS staff_remuneration,
        CASE WHEN latest_log.id IS NOT NULL THEN COALESCE(latest_log.tea_break_cost, 0)
          ELSE COALESCE(e.tea_break_fee, 0)
        END::float8 AS tea_break_cost,
        CASE WHEN latest_log.id IS NOT NULL THEN COALESCE(latest_log.total_cost, 0)
          ELSE COALESCE(e.mc_fee, 0) + COALESCE(e.speaker_fee, 0) + COALESCE(e.support_fee, 0)
            + COALESCE(e.closer_fee, 0) + COALESCE(e.tea_break_fee, 0)
        END::float8 AS total_cost,
        COALESCE(NULLIF(latest_log.status, ''), e.status, '') AS status
      FROM events e
      LEFT JOIN guest_counts ON guest_counts.event_id = e.id
      LEFT JOIN staff_counts ON staff_counts.event_id = e.id
      LEFT JOIN LATERAL (
        SELECT id, event_date, total_attendees, food_guests_count, staff_remuneration,
          tea_break_cost, total_cost, status
        FROM event_logs
        WHERE event_id = e.id
        ORDER BY created_at DESC NULLS LAST, id DESC
        LIMIT 1
      ) latest_log ON TRUE
      ORDER BY e.event_date ASC NULLS LAST, e.id ASC
    `);

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Nghiêng Complex';
    workbook.created = new Date();
    const sheet = workbook.addWorksheet('Nhật ký sự kiện', {
      views: [{ state: 'frozen', ySplit: 3 }],
      pageSetup: { orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
    });
    sheet.columns = [
      { width: 14 }, { width: 16 }, { width: 32 }, { width: 38 },
      { width: 16 }, { width: 22 }, { width: 28 }, { width: 20 },
      { width: 23 }, { width: 24 }, { width: 24 }, { width: 18 },
    ];

    sheet.mergeCells('A1:L1');
    const title = sheet.getCell('A1');
    title.value = 'NHẬT KÝ QUẢN LÝ SỰ KIỆN & CHI PHÍ';
    title.font = { name: 'Arial', size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
    title.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BLUE } };
    title.alignment = { horizontal: 'center', vertical: 'middle' };
    sheet.getRow(1).height = 30;

    const total = result.rows.reduce((sum, row) => ({
      attendees: sum.attendees + Number(row.total_attendees || 0),
      guests: sum.guests + Number(row.attended_guests || 0),
      food: sum.food + Number(row.food_guests || 0),
      noFood: sum.noFood + Number(row.guests_without_food || 0),
      staff: sum.staff + Number(row.staff_remuneration || 0),
      tea: sum.tea + Number(row.tea_break_cost || 0),
      cost: sum.cost + Number(row.total_cost || 0),
    }), { attendees: 0, guests: 0, food: 0, noFood: 0, staff: 0, tea: 0, cost: 0 });
    const summary = sheet.getRow(2);
    summary.values = ['TỔNG CỘNG', null, `${result.rows.length} sự kiện`, null, total.attendees, total.guests, total.food, total.noFood, total.staff, total.tea, total.cost, null];
    summary.height = 24;
    summary.eachCell((cell) => {
      cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: BLUE } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: LIGHT_BLUE } };
      cell.border = { bottom: { style: 'thin', color: { argb: BORDER } } };
      cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    });

    const header = sheet.getRow(3);
    header.values = headers;
    header.height = 42;
    header.eachCell((cell) => {
      cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BLUE } };
      cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      cell.border = {
        top: { style: 'thin', color: { argb: BORDER } },
        left: { style: 'thin', color: { argb: BORDER } },
        bottom: { style: 'thin', color: { argb: BORDER } },
        right: { style: 'thin', color: { argb: BORDER } },
      };
    });

    for (const row of result.rows) {
      const excelRow = sheet.addRow([
        row.event_code,
        row.event_date ? new Date(`${String(row.event_date).slice(0, 10)}T00:00:00`) : null,
        row.event_name,
        row.location,
        Number(row.total_attendees || 0),
        Number(row.attended_guests || 0),
        Number(row.food_guests || 0),
        Number(row.guests_without_food || 0),
        Number(row.staff_remuneration || 0),
        Number(row.tea_break_cost || 0),
        Number(row.total_cost || 0),
        row.status,
      ]);
      excelRow.height = 32;
      excelRow.eachCell((cell, column) => {
        cell.font = { name: 'Arial', size: 10 };
        cell.alignment = { vertical: 'middle', horizontal: column >= 5 && column <= 11 ? 'right' : 'left', wrapText: true };
        cell.border = {
          top: { style: 'thin', color: { argb: BORDER } },
          left: { style: 'thin', color: { argb: BORDER } },
          bottom: { style: 'thin', color: { argb: BORDER } },
          right: { style: 'thin', color: { argb: BORDER } },
        };
        if (column === 2) {
          cell.numFmt = 'dd/mm/yyyy';
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
        } else if (column >= 5 && column <= 8) {
          cell.numFmt = '#,##0';
        } else if (column >= 9 && column <= 11) {
          cell.numFmt = CURRENCY_FORMAT;
        }
      });
    }

    for (const column of [5, 6, 7, 8, 9, 10, 11]) {
      sheet.getRow(2).getCell(column).numFmt = column >= 9 ? CURRENCY_FORMAT : '#,##0';
    }
    sheet.autoFilter = { from: 'A3', to: `L${Math.max(3, result.rows.length + 3)}` };

    const buffer = await workbook.xlsx.writeBuffer();
    const fileName = `Nhat-ky-quan-ly-su-kien-${new Date().toISOString().slice(0, 10)}.xlsx`;
    return new Response(new Uint8Array(buffer) as unknown as BodyInit, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'Cache-Control': 'no-store, must-revalidate',
      },
    });
  } catch (error) {
    console.error('Failed to export event log workbook:', error);
    return Response.json({ error: 'Không thể xuất file nhật ký sự kiện.' }, { status: 500 });
  }
}
