import { NextRequest } from 'next/server';
import ExcelJS from 'exceljs';
import { getTeamLeadAllocation, isTeamLeadAdmin, parseMonth } from '@/lib/teamlead';

export const dynamic = 'force-dynamic';

interface MasterRosterItem {
  stt: number;
  phone: string;
  name: string;
  team: string;
  default30: boolean;
  default70: boolean;
  role: string;
  rate: number | null;
}

const MASTER_ROSTER: MasterRosterItem[] = [
  { stt: 1, phone: '0889225989', name: 'Vũ Thị Cúc', team: 'Thịnh Vượng', default30: true, default70: true, role: 'Giám đốc', rate: 0.5 },
  { stt: 2, phone: '0889225989', name: 'Vũ Thị Cúc', team: 'Happy', default30: false, default70: true, role: 'Giám đốc', rate: 0.5 },
  { stt: 3, phone: '0947876133', name: 'Phạm Thị Hương', team: 'Thịnh Vượng', default30: true, default70: true, role: 'Giám đốc', rate: 0.5 },
  { stt: 4, phone: '0972008333', name: 'Chu Thị Lương', team: 'Thành Công', default30: false, default70: false, role: 'Thành viên', rate: null },
  { stt: 5, phone: '0326894993', name: 'Nguyễn Hùng Vĩ', team: 'Thành Công', default30: true, default70: true, role: 'Giám đốc', rate: 0.5 },
  { stt: 6, phone: '0326894993', name: 'Nguyễn Hùng Vĩ', team: 'Hải Đăng Vàng', default30: false, default70: true, role: 'Giám đốc', rate: 0.5 },
  { stt: 7, phone: '0326894993', name: 'Nguyễn Hùng Vĩ', team: 'Lộc Phát', default30: false, default70: true, role: 'Giám đốc', rate: 0.5 },
  { stt: 8, phone: '0326894993', name: 'Nguyễn Hùng Vĩ', team: 'Biệt đội Kim Cương', default30: false, default70: true, role: 'Giám đốc', rate: 0.5 },
  { stt: 9, phone: '0984065555', name: 'Vũ Hùng Vỹ', team: 'Ong Vàng', default30: true, default70: true, role: 'Trưởng phòng', rate: 0.2 },
  { stt: 10, phone: '0915095848', name: 'Diệp Thị Huế', team: 'Ong Vàng', default30: true, default70: true, role: 'Trưởng phòng', rate: 0.2 },
  { stt: 11, phone: '0768635148', name: 'Phạm Minh Tuấn', team: 'Ong Vàng', default30: true, default70: true, role: 'P. Giám đốc', rate: 0.3 },
  { stt: 12, phone: '0326894993', name: 'Nguyễn Hùng Vĩ', team: 'Ong Vàng', default30: false, default70: true, role: 'Giám đốc', rate: 0.5 },
  { stt: 13, phone: '0326894993', name: 'Nguyễn Hùng Vĩ', team: 'Kiến Vàng', default30: false, default70: true, role: 'Giám đốc', rate: 0.5 },
  { stt: 14, phone: '0978400289', name: 'Lương Hồng Hải', team: 'Hải Đăng Vàng', default30: false, default70: false, role: 'Thành viên', rate: null },
  { stt: 15, phone: '0904555254', name: 'Trần Thị Thanh Hương', team: 'Hải Đăng Vàng', default30: false, default70: false, role: 'Thành viên', rate: null },
  { stt: 16, phone: '0856108703', name: 'Trần Thị Minh Thu', team: 'Hải Đăng Vàng', default30: false, default70: false, role: 'Thành viên', rate: null },
  { stt: 17, phone: '0886265813', name: 'Lê Thị Thanh Huyền', team: 'Hải Đăng Vàng', default30: false, default70: false, role: 'Thành viên', rate: null },
  { stt: 18, phone: '0812790496', name: 'Nguyễn Thị Quỳnh Anh', team: 'Thành Công', default30: false, default70: false, role: 'Thành viên', rate: null },
  { stt: 19, phone: '0936446922', name: 'Phạm Thị Tuyết', team: 'Thành Công', default30: false, default70: false, role: 'Thành viên', rate: null },
  { stt: 20, phone: '0969881698', name: 'Phượng Ngọc Thu', team: 'Lộc Phát', default30: true, default70: true, role: 'Trưởng phòng', rate: 0.2 },
  { stt: 21, phone: '0969881698', name: 'Phượng Ngọc Thu', team: 'Kiến Vàng', default30: false, default70: true, role: 'Trưởng phòng', rate: 0.2 },
  { stt: 22, phone: '0385213858', name: 'Lê Thị Chanh', team: 'Lộc Phát', default30: false, default70: false, role: 'Thành viên', rate: null },
  { stt: 23, phone: '0965759559', name: 'Cung Thu Hà', team: 'Kiến Vàng', default30: true, default70: true, role: 'Trưởng phòng', rate: 0.2 },
  { stt: 24, phone: '0972624075', name: 'Nguyễn Thị Liên', team: 'Kiến Vàng', default30: false, default70: false, role: 'Thành viên', rate: null },
  { stt: 25, phone: '0329685009', name: 'Trần Thị Thanh Hương', team: 'Kiến Vàng', default30: false, default70: false, role: 'Thành viên', rate: null },
  { stt: 26, phone: '0979345229', name: 'Dương Hồng Phương', team: 'Biệt đội Kim Cương', default30: true, default70: true, role: 'Trưởng phòng', rate: 0.2 },
  { stt: 27, phone: '0913527524', name: 'Ngô Quang Trung', team: 'Biệt đội Kim Cương', default30: false, default70: false, role: 'Thành viên', rate: null },
  { stt: 28, phone: '0902276528', name: 'Nguyễn Thị Nga', team: 'Biệt đội Kim Cương', default30: false, default70: false, role: 'Thành viên', rate: null },
  { stt: 29, phone: '0915023899', name: 'Nguyễn Văn Ngọ', team: 'Ong Vàng', default30: false, default70: false, role: 'Thành viên', rate: null },
  { stt: 30, phone: '0373360136', name: 'Nguyễn Thị Hà', team: 'Ong Vàng', default30: false, default70: false, role: 'Thành viên', rate: null },
  { stt: 31, phone: '0915026767', name: 'Hoàng Văn Nhật', team: 'Ong Vàng', default30: false, default70: false, role: 'Thành viên', rate: null },
  { stt: 32, phone: '0913073619', name: 'Phạm Vinh Quang', team: 'Ong Vàng', default30: false, default70: false, role: 'Thành viên', rate: null },
  { stt: 33, phone: '0912137909', name: 'Phạm Thùy Lan', team: 'Ong Vàng', default30: false, default70: false, role: 'Thành viên', rate: null },
  { stt: 34, phone: '0399868786', name: 'Nguyễn Thị Hương', team: 'Ong Vàng', default30: false, default70: false, role: 'Thành viên', rate: null },
  { stt: 35, phone: '0949492658', name: 'Đào Thị Hòa', team: 'Ong Vàng', default30: false, default70: false, role: 'Thành viên', rate: null },
  { stt: 36, phone: '096 2240952', name: 'Trần Thị Hồng Vân', team: 'Ong Vàng', default30: false, default70: false, role: 'Thành viên', rate: null },
  { stt: 37, phone: '0382658688', name: 'Nguyễn Thị Xuân', team: 'Ong Vàng', default30: false, default70: false, role: 'Thành viên', rate: null },
  { stt: 38, phone: '0984398568', name: 'Nguyễn Đức Vĩnh', team: 'Happy', default30: false, default70: true, role: 'P. Giám đốc', rate: 0.3 },
  { stt: 39, phone: '0384081272', name: 'Hoàng Thị Chích', team: 'Happy', default30: true, default70: true, role: 'Trưởng phòng', rate: 0.2 },
  { stt: 40, phone: '0912415469', name: 'Nguyễn Thị Loan', team: 'Happy', default30: false, default70: false, role: 'Thành viên', rate: null },
  { stt: 41, phone: '0349791507', name: 'Nguyễn Minh Châu', team: 'Happy', default30: false, default70: false, role: 'Thành viên', rate: null },
  { stt: 42, phone: '0943167088', name: 'Nguyễn Văn Hà', team: 'Happy', default30: false, default70: false, role: 'Thành viên', rate: null },
  { stt: 43, phone: '0343781580', name: 'Nguyễn Đăng An', team: '', default30: false, default70: false, role: '', rate: null },
  { stt: 44, phone: '000006', name: 'Nguyễn Thị Hương Thảo', team: '', default30: false, default70: false, role: '', rate: null },
  { stt: 45, phone: '000007', name: 'Đinh Văn Bắc', team: '', default30: false, default70: false, role: '', rate: null },
];

const thinBorder: Partial<ExcelJS.Borders> = {
  top: { style: 'thin', color: { argb: 'FFD0D7DE' } },
  left: { style: 'thin', color: { argb: 'FFD0D7DE' } },
  bottom: { style: 'thin', color: { argb: 'FFD0D7DE' } },
  right: { style: 'thin', color: { argb: 'FFD0D7DE' } },
};

function normalizeText(val?: string | null): string {
  return (val || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/\s+/g, ' ');
}

function normalizePhone(val?: string | null): string {
  return (val || '').replace(/\D/g, '');
}

function findMatchingAllocationRow(
  allocationRows: any[],
  item: { phone: string; name: string; team: string }
) {
  const itemPhone = normalizePhone(item.phone);
  const itemName = normalizeText(item.name);
  const itemTeam = normalizeText(item.team);

  // 1. Try matching phone + team
  if (itemPhone) {
    const match = allocationRows.find((r) => {
      const rPhone = normalizePhone(r.memberPhone);
      const rTeam = normalizeText(r.teamName);
      return rPhone === itemPhone && (!itemTeam || !rTeam || rTeam === itemTeam);
    });
    if (match) return match;
  }

  // 2. Try matching name + team
  return allocationRows.find((r) => {
    const rName = normalizeText(r.memberName);
    const rTeam = normalizeText(r.teamName);
    return rName === itemName && (!itemTeam || !rTeam || rTeam === itemTeam);
  });
}

function applyRoleStyle(cell: ExcelJS.Cell, roleName: string) {
  const norm = normalizeText(roleName);
  if (norm.includes('giam doc') && !norm.includes('pho') && !norm.includes('p.')) {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFCE5CD' } };
    cell.font = { name: 'Arial', size: 9, bold: true, color: { argb: 'FF783F04' } };
  } else if (norm.includes('pho giam doc') || norm.includes('p. giam doc')) {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9EAD3' } };
    cell.font = { name: 'Arial', size: 9, bold: true, color: { argb: 'FF274E13' } };
  } else if (norm.includes('truong phong')) {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFC9DAF8' } };
    cell.font = { name: 'Arial', size: 9, bold: true, color: { argb: 'FF1155CC' } };
  } else if (norm.includes('thanh vien')) {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF4CCCC' } };
    cell.font = { name: 'Arial', size: 9, color: { argb: 'FF990000' } };
  } else {
    cell.font = { name: 'Arial', size: 9 };
  }
}

export async function GET(request: NextRequest) {
  if (!isTeamLeadAdmin(request)) {
    const referer = request.headers.get('referer') || '';
    if (!referer.includes('/admin/')) {
      return Response.json({ success: false, error: 'Không có quyền truy cập.' }, { status: 403 });
    }
  }

  const params = new URL(request.url).searchParams;
  const month = parseMonth(params.get('month'));
  const weekNo = Number(params.get('week') || 0);
  if (!month || !Number.isInteger(weekNo) || weekNo < 0 || weekNo > 5) {
    return Response.json({ success: false, error: 'Tháng hoặc tuần không hợp lệ.' }, { status: 400 });
  }

  try {
    const monthKey = month.slice(0, 7);
    const monthNumber = parseInt(monthKey.slice(5, 7), 10);

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Bản sao của TEAMLEAD', {
      views: [{ showGridLines: true }],
    });

    const isMonthExport = weekNo === 0;

    // Determine weeks to display
    const weeksToExport = isMonthExport
      ? (monthKey === '2026-09' ? [3, 4, 5] : [1, 2, 3, 4, 5])
      : [weekNo];

    // Fetch allocations
    const monthAllocation = isMonthExport ? await getTeamLeadAllocation(month, 0) : null;
    const weekAllocations: Record<number, Awaited<ReturnType<typeof getTeamLeadAllocation>>> = {};
    for (const w of weeksToExport) {
      weekAllocations[w] = await getTeamLeadAllocation(month, w);
    }

    const primaryAllocation = isMonthExport ? monthAllocation! : weekAllocations[weekNo];

    // 1. Setup Column Definitions
    const baseCols = [
      { key: 'stt', width: 6 },
      { key: 'phone', width: 14 },
      { key: 'name', width: 24 },
      { key: 'team', width: 20 },
      { key: 'chk30', width: 11 },
      { key: 'chk70', width: 11 },
      { key: 'role', width: 15 },
      { key: 'rate', width: 8 },
    ];

    const allCols = [...baseCols];
    if (isMonthExport) {
      allCols.push(
        { key: 'm_total', width: 16 },
        { key: 'm_c30', width: 14 },
        { key: 'm_c70', width: 18 }
      );
    }
    for (const w of weeksToExport) {
      allCols.push(
        { key: `w${w}_total`, width: 16 },
        { key: `w${w}_c30`, width: 14 },
        { key: `w${w}_c70`, width: 18 }
      );
    }
    sheet.columns = allCols;

    const totalColumns = allCols.length;

    // 2. Row 1: Top Summaries
    const r1 = sheet.getRow(1);
    r1.height = 20;
    if (isMonthExport) {
      r1.getCell(9).value = 'Tổng Tháng';
      r1.getCell(9).font = { name: 'Arial', size: 9, bold: true, color: { argb: 'FF1F497D' } };
      r1.getCell(10).value = monthAllocation!.meta.fund30;
      r1.getCell(10).numFmt = '#,##0 "đ"';
      r1.getCell(10).font = { name: 'Arial', size: 9, bold: true };
      r1.getCell(11).value = monthAllocation!.meta.fund70;
      r1.getCell(11).numFmt = '#,##0 "đ"';
      r1.getCell(11).font = { name: 'Arial', size: 9, bold: true };

      let colOffset = 12;
      for (const w of weeksToExport) {
        const wMeta = weekAllocations[w]?.meta;
        r1.getCell(colOffset).value = 0;
        r1.getCell(colOffset).numFmt = '#,##0 "đ"';
        r1.getCell(colOffset + 1).value = wMeta?.fund30 || 0;
        r1.getCell(colOffset + 1).numFmt = '#,##0 "đ"';
        r1.getCell(colOffset + 1).font = { name: 'Arial', size: 9, bold: true };
        r1.getCell(colOffset + 2).value = wMeta?.fund70 || 0;
        r1.getCell(colOffset + 2).numFmt = '#,##0 "đ"';
        r1.getCell(colOffset + 2).font = { name: 'Arial', size: 9, bold: true };
        colOffset += 3;
      }
    } else {
      const wMeta = weekAllocations[weekNo]?.meta;
      r1.getCell(9).value = 0;
      r1.getCell(9).numFmt = '#,##0 "đ"';
      r1.getCell(10).value = wMeta?.fund30 || 0;
      r1.getCell(10).numFmt = '#,##0 "đ"';
      r1.getCell(10).font = { name: 'Arial', size: 9, bold: true };
      r1.getCell(11).value = wMeta?.fund70 || 0;
      r1.getCell(11).numFmt = '#,##0 "đ"';
      r1.getCell(11).font = { name: 'Arial', size: 9, bold: true };
    }

    // 3. Row 2: "Tổng giá trị HĐ" & contract totals
    const r2 = sheet.getRow(2);
    r2.height = 22;
    r2.getCell(5).value = 'Tổng giá trị HĐ';
    r2.getCell(5).font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FF1F497D' } };

    if (isMonthExport) {
      r2.getCell(9).value = monthAllocation!.meta.totalSales;
      r2.getCell(9).numFmt = '#,##0 "đ"';
      r2.getCell(9).font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FF1F497D' } };
      r2.getCell(10).value = monthAllocation!.meta.fund30;
      r2.getCell(10).numFmt = '#,##0 "đ"';
      r2.getCell(10).font = { name: 'Arial', size: 9, bold: true };
      r2.getCell(11).value = monthAllocation!.meta.fund70;
      r2.getCell(11).numFmt = '#,##0 "đ"';
      r2.getCell(11).font = { name: 'Arial', size: 9, bold: true };

      let colOffset = 12;
      for (const w of weeksToExport) {
        const wMeta = weekAllocations[w]?.meta;
        r2.getCell(colOffset).value = wMeta?.totalSales || 0;
        r2.getCell(colOffset).numFmt = '#,##0 "đ"';
        r2.getCell(colOffset).font = { name: 'Arial', size: 9, bold: true };
        r2.getCell(colOffset + 1).value = wMeta?.fund30 || 0;
        r2.getCell(colOffset + 1).numFmt = '#,##0 "đ"';
        r2.getCell(colOffset + 1).font = { name: 'Arial', size: 9, bold: true };
        r2.getCell(colOffset + 2).value = wMeta?.fund70 || 0;
        r2.getCell(colOffset + 2).numFmt = '#,##0 "đ"';
        r2.getCell(colOffset + 2).font = { name: 'Arial', size: 9, bold: true };
        colOffset += 3;
      }
    } else {
      const wMeta = weekAllocations[weekNo]?.meta;
      r2.getCell(9).value = wMeta?.totalSales || 0;
      r2.getCell(9).numFmt = '#,##0 "đ"';
      r2.getCell(9).font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FF1F497D' } };
      r2.getCell(10).value = wMeta?.fund30 || 0;
      r2.getCell(10).numFmt = '#,##0 "đ"';
      r2.getCell(10).font = { name: 'Arial', size: 9, bold: true };
      r2.getCell(11).value = wMeta?.fund70 || 0;
      r2.getCell(11).numFmt = '#,##0 "đ"';
      r2.getCell(11).font = { name: 'Arial', size: 9, bold: true };
    }

    // 4. Row 3: THÁNG & Week Header Blocks
    const r3 = sheet.getRow(3);
    r3.height = 24;
    r3.getCell(5).value = 'THÁNG';
    r3.getCell(5).font = { name: 'Arial', size: 10, bold: true };
    r3.getCell(7).value = monthNumber;
    r3.getCell(7).font = { name: 'Arial', size: 10, bold: true };
    r3.getCell(7).alignment = { horizontal: 'center', vertical: 'middle' };

    const fundRate = primaryAllocation.meta.fundRate || 0.029;
    r3.getCell(9).value = fundRate;
    r3.getCell(9).numFmt = '0.0%';
    r3.getCell(9).alignment = { horizontal: 'center', vertical: 'middle' };

    if (isMonthExport) {
      let colOffset = 12;
      for (const w of weeksToExport) {
        sheet.mergeCells(3, colOffset, 3, colOffset + 2);
        const wCell = sheet.getCell(3, colOffset);
        wCell.value = `Tuần ${w}`;
        wCell.font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
        wCell.alignment = { horizontal: 'center', vertical: 'middle' };
        wCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF6D9EEB' } };
        wCell.border = thinBorder;
        colOffset += 3;
      }
    } else {
      sheet.mergeCells(3, 9, 3, 11);
      const wCell = sheet.getCell(3, 9);
      wCell.value = `Tuần ${weekNo}`;
      wCell.font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
      wCell.alignment = { horizontal: 'center', vertical: 'middle' };
      wCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF6D9EEB' } };
      wCell.border = thinBorder;
    }

    // 5. Row 4: Column Header Labels
    const r4 = sheet.getRow(4);
    r4.height = 36;
    const baseHeaders = [
      'STT',
      'SĐT',
      'Tên',
      'TEAM',
      'Chia\nđều\n30%',
      'Chia/\nh.quả\n70%',
      'Chức vụ',
      '%',
    ];

    for (let i = 0; i < baseHeaders.length; i++) {
      r4.getCell(i + 1).value = baseHeaders[i];
    }

    let headerColIdx = 9;
    if (isMonthExport) {
      r4.getCell(headerColIdx).value = 'Tổng tháng';
      r4.getCell(headerColIdx + 1).value = 'Chia đều';
      r4.getCell(headerColIdx + 2).value = 'Chia theo\nhiệu quả';
      headerColIdx += 3;
    }

    for (const w of weeksToExport) {
      r4.getCell(headerColIdx).value = 'Tổng';
      r4.getCell(headerColIdx + 1).value = 'Chia đều';
      r4.getCell(headerColIdx + 2).value = 'Chia theo\nhiệu quả';
      headerColIdx += 3;
    }

    for (let c = 1; c <= totalColumns; c++) {
      const cell = r4.getCell(c);
      cell.font = { name: 'Arial', size: 9, bold: true, color: { argb: 'FF1F2937' } };
      cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFA4C2F4' } };
      cell.border = thinBorder;
    }

    // 6. Row 5: Allocation Split Percentages (100%, 30%, 70%)
    const r5 = sheet.getRow(5);
    r5.height = 20;

    let splitColIdx = 9;
    if (isMonthExport) {
      r5.getCell(splitColIdx).value = 1; r5.getCell(splitColIdx).numFmt = '0%';
      r5.getCell(splitColIdx + 1).value = 0.3; r5.getCell(splitColIdx + 1).numFmt = '0%';
      r5.getCell(splitColIdx + 2).value = 0.7; r5.getCell(splitColIdx + 2).numFmt = '0%';
      for (let k = 0; k < 3; k++) {
        const c = r5.getCell(splitColIdx + k);
        c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' } };
        c.alignment = { horizontal: 'center', vertical: 'middle' };
        c.font = { name: 'Arial', size: 9, bold: true };
        c.border = thinBorder;
      }
      splitColIdx += 3;
    }

    for (let i = 0; i < weeksToExport.length; i++) {
      r5.getCell(splitColIdx).value = 1; r5.getCell(splitColIdx).numFmt = '0%';
      r5.getCell(splitColIdx + 1).value = 0.3; r5.getCell(splitColIdx + 1).numFmt = '0%';
      r5.getCell(splitColIdx + 2).value = 0.7; r5.getCell(splitColIdx + 2).numFmt = '0%';
      for (let k = 0; k < 3; k++) {
        const c = r5.getCell(splitColIdx + k);
        c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' } };
        c.alignment = { horizontal: 'center', vertical: 'middle' };
        c.font = { name: 'Arial', size: 9, bold: true };
        c.border = thinBorder;
      }
      splitColIdx += 3;
    }

    // 7. Compile Member Roster & Data Rows
    const matchedRosterRowIds = new Set<string>();
    const rosterList = [...MASTER_ROSTER];

    // Check if allocation has any new members not in master roster
    const primaryRows = primaryAllocation.rows || [];
    for (const allocRow of primaryRows) {
      const match = findMatchingAllocationRow(MASTER_ROSTER, {
        phone: allocRow.memberPhone,
        name: allocRow.memberName,
        team: allocRow.teamName,
      });
      if (!match) {
        rosterList.push({
          stt: rosterList.length + 1,
          phone: allocRow.memberPhone || '',
          name: allocRow.memberName,
          team: allocRow.teamName || '',
          default30: allocRow.eligible30,
          default70: allocRow.eligible70,
          role: allocRow.role || 'Thành viên',
          rate: allocRow.role?.includes('Giám đốc') && !allocRow.role.includes('Phó') && !allocRow.role.includes('P.')
            ? 0.5
            : allocRow.role?.includes('Phó Giám đốc') || allocRow.role?.includes('P. Giám đốc')
              ? 0.3
              : allocRow.role?.includes('Trưởng phòng')
                ? 0.2
                : null,
        });
      }
    }

    // 8. Populate Data Rows starting from Row 6
    let currentRowIdx = 6;
    for (const m of rosterList) {
      const row = sheet.getRow(currentRowIdx);
      row.height = 22;

      // Col A: STT
      row.getCell(1).value = m.stt;
      row.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };

      // Col B: SĐT
      row.getCell(2).value = m.phone;
      row.getCell(2).alignment = { horizontal: 'center', vertical: 'middle' };
      row.getCell(2).numFmt = '@';

      // Find primary allocation match
      const primaryMatch = findMatchingAllocationRow(primaryRows, m);

      // Col C: Tên
      row.getCell(3).value = m.name;
      const isLeader = ['Giám đốc', 'Phó Giám đốc', 'P. Giám đốc', 'Trưởng phòng'].some((r) =>
        (primaryMatch?.role || m.role || '').includes(r)
      );
      row.getCell(3).font = {
        name: 'Arial',
        size: 10,
        bold: isLeader,
        color: isLeader ? { argb: 'FFCC0000' } : { argb: 'FF1F2937' },
      };
      row.getCell(3).alignment = { horizontal: 'left', vertical: 'middle' };

      // Col D: TEAM
      row.getCell(4).value = primaryMatch?.teamName || m.team || '';
      row.getCell(4).alignment = { horizontal: 'left', vertical: 'middle' };

      // Col E: Checkbox Chia đều 30%
      const isEligible30 = primaryMatch ? primaryMatch.eligible30 : m.default30;
      const cell30 = row.getCell(5);
      cell30.value = isEligible30 ? '☑' : '☐';
      cell30.alignment = { horizontal: 'center', vertical: 'middle' };
      cell30.font = {
        name: 'Arial',
        size: 12,
        bold: true,
        color: isEligible30 ? { argb: 'FF1E40AF' } : { argb: 'FF9CA3AF' },
      };
      cell30.dataValidation = {
        type: 'list',
        allowBlank: true,
        formulae: ['"☑,☐"'],
      };

      // Col F: Checkbox Chia h.quả 70%
      const isEligible70 = primaryMatch ? primaryMatch.eligible70 : m.default70;
      const cell70 = row.getCell(6);
      cell70.value = isEligible70 ? '☑' : '☐';
      cell70.alignment = { horizontal: 'center', vertical: 'middle' };
      cell70.font = {
        name: 'Arial',
        size: 12,
        bold: true,
        color: isEligible70 ? { argb: 'FF1E40AF' } : { argb: 'FF9CA3AF' },
      };
      cell70.dataValidation = {
        type: 'list',
        allowBlank: true,
        formulae: ['"☑,☐"'],
      };

      // Col G: Chức vụ
      const currentRole = primaryMatch?.role || m.role || '';
      const rCell = row.getCell(7);
      rCell.value = currentRole;
      rCell.alignment = { horizontal: 'center', vertical: 'middle' };
      applyRoleStyle(rCell, currentRole);

      // Col H: % Tỷ lệ
      const rateCell = row.getCell(8);
      const computedRate = currentRole.includes('Giám đốc') && !currentRole.includes('Phó') && !currentRole.includes('P.')
        ? 0.5
        : currentRole.includes('Phó Giám đốc') || currentRole.includes('P. Giám đốc')
          ? 0.3
          : currentRole.includes('Trưởng phòng')
            ? 0.2
            : m.rate;
      if (computedRate !== null && computedRate !== undefined && computedRate > 0) {
        rateCell.value = computedRate;
        rateCell.numFmt = '0%';
      } else {
        rateCell.value = '';
      }
      rateCell.alignment = { horizontal: 'center', vertical: 'middle' };

      // Money Columns
      let moneyColIdx = 9;

      // If Month Export, fill Month Summary (Cols 9, 10, 11)
      if (isMonthExport) {
        const mSales = primaryMatch?.salesBasis || 0;
        const mP30 = primaryMatch?.payout30 || 0;
        const mP70 = primaryMatch?.payout70 || 0;

        row.getCell(moneyColIdx).value = mSales;
        row.getCell(moneyColIdx).numFmt = '#,##0 "đ"';
        row.getCell(moneyColIdx).alignment = { horizontal: 'right', vertical: 'middle' };

        row.getCell(moneyColIdx + 1).value = mP30;
        row.getCell(moneyColIdx + 1).numFmt = '#,##0 "đ"';
        row.getCell(moneyColIdx + 1).alignment = { horizontal: 'right', vertical: 'middle' };

        row.getCell(moneyColIdx + 2).value = mP70;
        row.getCell(moneyColIdx + 2).numFmt = '#,##0 "đ"';
        row.getCell(moneyColIdx + 2).alignment = { horizontal: 'right', vertical: 'middle' };

        moneyColIdx += 3;
      }

      // Fill Each Week Block
      for (const w of weeksToExport) {
        const wRows = weekAllocations[w]?.rows || [];
        const wMatch = findMatchingAllocationRow(wRows, m);

        const wSales = wMatch?.salesBasis || 0;
        const wP30 = wMatch?.payout30 || 0;
        const wP70 = wMatch?.payout70 || 0;

        row.getCell(moneyColIdx).value = wSales;
        row.getCell(moneyColIdx).numFmt = '#,##0 "đ"';
        row.getCell(moneyColIdx).alignment = { horizontal: 'right', vertical: 'middle' };

        row.getCell(moneyColIdx + 1).value = wP30;
        row.getCell(moneyColIdx + 1).numFmt = '#,##0 "đ"';
        row.getCell(moneyColIdx + 1).alignment = { horizontal: 'right', vertical: 'middle' };

        row.getCell(moneyColIdx + 2).value = wP70;
        row.getCell(moneyColIdx + 2).numFmt = '#,##0 "đ"';
        row.getCell(moneyColIdx + 2).alignment = { horizontal: 'right', vertical: 'middle' };

        moneyColIdx += 3;
      }

      // Add borders
      for (let c = 1; c <= totalColumns; c++) {
        row.getCell(c).border = thinBorder;
      }

      currentRowIdx++;
    }

    // 9. Bottom Summary Row ("Tổng cộng")
    const totalRow = sheet.getRow(currentRowIdx);
    totalRow.height = 24;
    sheet.mergeCells(currentRowIdx, 1, currentRowIdx, 8);
    const sumLabelCell = sheet.getCell(currentRowIdx, 1);
    sumLabelCell.value = 'Tổng cộng';
    sumLabelCell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FF1F497D' } };
    sumLabelCell.alignment = { horizontal: 'center', vertical: 'middle' };

    for (let c = 9; c <= totalColumns; c++) {
      const colLetter = sheet.getColumn(c).letter;
      const sumCell = totalRow.getCell(c);
      sumCell.value = {
        formula: `SUM(${colLetter}6:${colLetter}${currentRowIdx - 1})`,
      };
      sumCell.numFmt = '#,##0 "đ"';
      sumCell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FF1F497D' } };
      sumCell.alignment = { horizontal: 'right', vertical: 'middle' };
      sumCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
      sumCell.border = thinBorder;
    }
    for (let c = 1; c <= 8; c++) {
      totalRow.getCell(c).border = thinBorder;
      totalRow.getCell(c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
    }

    // Generate buffer
    const buffer = await workbook.xlsx.writeBuffer();
    const fileName = isMonthExport
      ? `Tong-hop-TEAMLEAD-${monthKey}.xlsx`
      : `TEAMLEAD-${monthKey}-tuan-${weekNo}.xlsx`;

    return new Response(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (error: any) {
    console.error('Error exporting TeamLead allocation:', error);
    return Response.json({ success: false, error: error.message || 'Không thể xuất Excel.' }, { status: 500 });
  }
}
