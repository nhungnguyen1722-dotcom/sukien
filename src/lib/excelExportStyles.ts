import ExcelJS from 'exceljs';

export const COLOR_PRIMARY_BLUE = 'FF5B9BD5'; // #5B9BD5 - Tiêu đề chính bảng phân bổ/quyết toán
export const COLOR_HEADER_BLUE = 'FF8EB0E8';  // #8EB0E8 - Tiêu đề các cột dữ liệu
export const COLOR_RED_TEXT = 'FFFF0000';     // #FF0000 - Chữ màu đỏ cho số tiền 0 đ
export const COLOR_BORDER = 'FFB0B0B0';       // Viền ô mỏng

export const thinBorder: Partial<ExcelJS.Borders> = {
  top: { style: 'thin', color: { argb: COLOR_BORDER } },
  left: { style: 'thin', color: { argb: COLOR_BORDER } },
  bottom: { style: 'thin', color: { argb: COLOR_BORDER } },
  right: { style: 'thin', color: { argb: COLOR_BORDER } },
};

export const primaryHeaderFill: ExcelJS.Fill = {
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: COLOR_PRIMARY_BLUE },
};

export const columnHeaderFill: ExcelJS.Fill = {
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: COLOR_HEADER_BLUE },
};

export const STANDARD_RATES = [
  { key: 'direct_sale', name: 'Sale trực tiếp - Pro sale (Nguồn khách) (6%)', rate: 0.06 },
  { key: 'tribute_connection', name: 'Tri ân kết nối sale trực tiếp (1%)', rate: 0.01 },
  { key: 'tribute_support', name: 'Tri ân hỗ trợ sale (0,5%)', rate: 0.005 },
  { key: 'event_close', name: 'Quỹ Sự kiện & Chốt hợp đồng (0,5%)', rate: 0.005 },
  { key: 'customer_care', name: 'Quỹ Chăm sóc khách hàng (0,2%)', rate: 0.002 },
  { key: 'training', name: 'Quỹ Đào tạo Chuyên môn & Kỹ năng (0,3%)', rate: 0.003 },
  { key: 'incentive', name: 'Quỹ Thi đua & Chương trình thúc đẩy (0,8%)', rate: 0.008 },
  { key: 'travel', name: 'Chi phí Công tác phí (0,3%)', rate: 0.003 },
  { key: 'leader_70', name: 'Leader team - giám đốc Kd (2,9%)-70%', rate: 0.0203 },
  { key: 'leader_30', name: 'Leader team - giám đốc Kd (2,9%)-30%', rate: 0.0087 },
  { key: 'operations', name: 'Quỹ Vận hành (2,2%)', rate: 0.022 },
  { key: 'support_kt', name: 'Bộ phận hỗ trợ KT (0,1%)', rate: 0.001 },
  { key: 'support_cn', name: 'Bộ phận hỗ trợ CN (0,2)', rate: 0.002 },
];

export function formatVND(value: number): string {
  if (value === 0) return '0 đ';
  return Math.round(value).toLocaleString('vi-VN') + ' đ';
}

export function formatRateText(rate: number): string {
  const percent = rate * 100;
  if (Number.isInteger(percent)) {
    return `${percent}%`;
  }
  return percent.toFixed(2).replace('.', ',') + '%';
}

export interface WeeklyFundRow {
  name: string;
  rate: number;
  rateText?: string;
  allocated: number;
  spent: number;
  remaining: number;
}

export interface WeeklyContractMatrixRow {
  stt: number | string;
  contractDesc: string;
  beneficiaryAmounts: (number | null)[];
  unallocatedPool: number;
  distributedCommission: number;
  remainingFund: number;
}

export interface WeeklyReportData {
  periodCode: string;
  weekLabel: string;
  salesBase: number;
  funds: WeeklyFundRow[];
  totalAllocated: number;
  totalSpent: number;
  totalRemaining: number;
  beneficiaryColumns: { name: string; bankAccount?: string; bankName?: string }[];
  contractRows: WeeklyContractMatrixRow[];
  beneficiaryTotals: number[];
  matrixTotalPool: number;
  matrixTotalDistributed: number;
  matrixTotalRemaining: number;
}

export function createStyledWeeklySheet(workbook: ExcelJS.Workbook, data: WeeklyReportData, sheetName: string) {
  const ws = workbook.addWorksheet(sheetName, {
    views: [{ showGridLines: true }],
  });

  // Cấu hình chiều rộng các cột
  const cols: Partial<ExcelJS.Column>[] = [
    { width: 6 },  // A: STT
    { width: 36 }, // B: Hợp đồng / Tên quỹ
  ];
  for (let i = 0; i < data.beneficiaryColumns.length; i++) {
    cols.push({ width: 22 });
  }
  cols.push(
    { width: 24 }, // Tổng quỹ chưa chia (15%)
    { width: 22 }, // Tổng hoa hồng chia
    { width: 20 }, // Tổng quỹ còn lại
  );
  ws.columns = cols;

  // 1. Tiêu đề công ty
  ws.getCell('A1').value = 'CÔNG TY CỔ PHẦN TẬP ĐOÀN NGHIÊNG COMPLEX';
  ws.getCell('A1').font = { name: 'Arial', size: 10, bold: true };
  ws.getCell('A2').value = 'ML 6-24 Vinhomes Greenbay, Đường Lương Thế Vinh, Đại Mỗ, Hà Nội';
  ws.getCell('A2').font = { name: 'Arial', size: 9 };

  // 2. ĐỀ NGHỊ THANH TOÁN
  ws.mergeCells('A4:H4');
  const cellA4 = ws.getCell('A4');
  cellA4.value = 'ĐỀ NGHỊ THANH TOÁN';
  cellA4.font = { name: 'Arial', size: 14, bold: true };
  cellA4.alignment = { horizontal: 'center', vertical: 'middle' };

  // 3. Tiêu đề chính bảng 1 (MÀU XANH ĐẬM #5B9BD5)
  ws.mergeCells('A5:H5');
  const cellA5 = ws.getCell('A5');
  cellA5.value = `Phân bổ hoa hồng và thù lao ${data.weekLabel}`;
  cellA5.font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FF000000' } };
  cellA5.fill = primaryHeaderFill;
  cellA5.alignment = { horizontal: 'center', vertical: 'middle' };
  cellA5.border = thinBorder;
  ws.getRow(5).height = 24;

  // 4. Tiêu đề các cột bảng 1 (MÀU XANH DỊU #8EB0E8)
  ws.mergeCells('A6:D6');
  ws.getCell('A6').value = 'Doanh số HĐ (100%)';
  ws.getCell('E6').value = 'Tỷ lệ';
  ws.getCell('F6').value = formatVND(data.salesBase);
  ws.getCell('G6').value = 'Tổng chi quỹ';
  ws.getCell('H6').value = 'Còn lại quỹ';

  for (let c = 1; c <= 8; c++) {
    const cell = ws.getRow(6).getCell(c);
    cell.fill = columnHeaderFill;
    cell.font = { name: 'Arial', size: 10, bold: true };
    cell.alignment = { horizontal: c === 6 ? 'right' : 'center', vertical: 'middle' };
    cell.border = thinBorder;
  }
  ws.getRow(6).height = 22;

  // 5. Dòng dữ liệu 12 quỹ
  let currentRow = 7;
  for (const fund of data.funds) {
    ws.mergeCells(`A${currentRow}:D${currentRow}`);
    const nameCell = ws.getCell(`A${currentRow}`);
    nameCell.value = fund.name;
    nameCell.font = { name: 'Arial', size: 10 };
    nameCell.alignment = { horizontal: 'left', vertical: 'middle' };
    nameCell.border = thinBorder;

    const rateCell = ws.getCell(`E${currentRow}`);
    rateCell.value = fund.rateText || formatRateText(fund.rate);
    rateCell.font = { name: 'Arial', size: 10 };
    rateCell.alignment = { horizontal: 'center', vertical: 'middle' };
    rateCell.border = thinBorder;

    const allocCell = ws.getCell(`F${currentRow}`);
    allocCell.value = formatVND(fund.allocated);
    allocCell.font = { name: 'Arial', size: 10 };
    allocCell.alignment = { horizontal: 'right', vertical: 'middle' };
    allocCell.border = thinBorder;

    const spentCell = ws.getCell(`G${currentRow}`);
    spentCell.value = formatVND(fund.spent);
    spentCell.font = {
      name: 'Arial',
      size: 10,
      color: { argb: fund.spent === 0 ? COLOR_RED_TEXT : 'FF000000' },
    };
    spentCell.alignment = { horizontal: 'right', vertical: 'middle' };
    spentCell.border = thinBorder;

    const remCell = ws.getCell(`H${currentRow}`);
    remCell.value = formatVND(fund.remaining);
    remCell.font = {
      name: 'Arial',
      size: 10,
      color: { argb: fund.remaining === 0 ? COLOR_RED_TEXT : 'FF000000' },
    };
    remCell.alignment = { horizontal: 'right', vertical: 'middle' };
    remCell.border = thinBorder;

    for (let c = 1; c <= 8; c++) {
      ws.getRow(currentRow).getCell(c).border = thinBorder;
    }
    ws.getRow(currentRow).height = 20;
    currentRow++;
  }

  // 6. Dòng Tổng quỹ
  ws.mergeCells(`A${currentRow}:E${currentRow}`);
  const totalLabel = ws.getCell(`A${currentRow}`);
  totalLabel.value = 'Tổng qũy';
  totalLabel.font = { name: 'Arial', size: 10, bold: true };
  totalLabel.alignment = { horizontal: 'center', vertical: 'middle' };

  const totalAlloc = ws.getCell(`F${currentRow}`);
  totalAlloc.value = formatVND(data.totalAllocated);
  totalAlloc.font = { name: 'Arial', size: 10, bold: true };
  totalAlloc.alignment = { horizontal: 'right', vertical: 'middle' };

  const totalSpent = ws.getCell(`G${currentRow}`);
  totalSpent.value = formatVND(data.totalSpent);
  totalSpent.font = { name: 'Arial', size: 10, bold: true };
  totalSpent.alignment = { horizontal: 'right', vertical: 'middle' };

  const totalRem = ws.getCell(`H${currentRow}`);
  totalRem.value = formatVND(data.totalRemaining);
  totalRem.font = { name: 'Arial', size: 10, bold: true };
  totalRem.alignment = { horizontal: 'right', vertical: 'middle' };

  for (let c = 1; c <= 8; c++) {
    ws.getRow(currentRow).getCell(c).border = thinBorder;
  }
  ws.getRow(currentRow).height = 22;
  currentRow++;

  // 7. Chữ ký ban giám đốc (Khối 1)
  currentRow++;
  ws.mergeCells(`A${currentRow}:C${currentRow}`);
  ws.getCell(`A${currentRow}`).value = 'NGƯỜI LẬP';
  ws.getCell(`A${currentRow}`).font = { name: 'Arial', size: 10, bold: true };
  ws.getCell(`A${currentRow}`).alignment = { horizontal: 'center', vertical: 'middle' };

  ws.mergeCells(`D${currentRow}:F${currentRow}`);
  ws.getCell(`D${currentRow}`).value = 'PHÓ CHỦ TỊCH';
  ws.getCell(`D${currentRow}`).font = { name: 'Arial', size: 10, bold: true };
  ws.getCell(`D${currentRow}`).alignment = { horizontal: 'center', vertical: 'middle' };

  ws.mergeCells(`G${currentRow}:H${currentRow}`);
  ws.getCell(`G${currentRow}`).value = 'TỔNG GIÁM ĐỐC';
  ws.getCell(`G${currentRow}`).font = { name: 'Arial', size: 10, bold: true };
  ws.getCell(`G${currentRow}`).alignment = { horizontal: 'center', vertical: 'middle' };

  currentRow += 5;
  ws.mergeCells(`A${currentRow}:C${currentRow}`);
  ws.getCell(`A${currentRow}`).value = 'Vũ Thị Cúc';
  ws.getCell(`A${currentRow}`).font = { name: 'Arial', size: 10 };
  ws.getCell(`A${currentRow}`).alignment = { horizontal: 'center', vertical: 'middle' };

  ws.mergeCells(`D${currentRow}:F${currentRow}`);
  ws.getCell(`D${currentRow}`).value = 'Nguyễn Thị Thương Hiếu';
  ws.getCell(`D${currentRow}`).font = { name: 'Arial', size: 10 };
  ws.getCell(`D${currentRow}`).alignment = { horizontal: 'center', vertical: 'middle' };

  ws.mergeCells(`G${currentRow}:H${currentRow}`);
  ws.getCell(`G${currentRow}`).value = 'Nguyễn Thị Hương Thảo';
  ws.getCell(`G${currentRow}`).font = { name: 'Arial', size: 10 };
  ws.getCell(`G${currentRow}`).alignment = { horizontal: 'center', vertical: 'middle' };

  // ==========================================================================
  // BẢNG 2: MA TRẬN HỢP ĐỒNG & NHÂN SỰ THỤ HƯỞNG (Dòng 30)
  // ==========================================================================
  currentRow = 30;
  const matrixHeaders = ['STT', 'Hợp đồng'];
  for (const b of data.beneficiaryColumns) {
    const parts = [b.name];
    if (b.bankAccount) {
      const cleanAcc = b.bankAccount.replace(/^STK:\s*/i, '').trim();
      parts.push(`STK: ${cleanAcc}`);
    }
    if (b.bankName) parts.push(b.bankName);
    matrixHeaders.push(parts.join('\n'));
  }
  matrixHeaders.push('Tổng quỹ chưa chia (15%)', 'Tổng hoa hồng chia', 'Tổng quỹ còn lại');

  const matrixHeaderRow = ws.getRow(currentRow);
  matrixHeaderRow.height = 46;
  for (let c = 0; c < matrixHeaders.length; c++) {
    const cell = matrixHeaderRow.getCell(c + 1);
    cell.value = matrixHeaders[c];
    cell.fill = columnHeaderFill; // MÀU XANH DỊU #8EB0E8
    cell.font = { name: 'Arial', size: 10, bold: true };
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cell.border = thinBorder;
  }

  // Dòng hợp đồng
  currentRow++;
  for (const row of data.contractRows) {
    const r = ws.getRow(currentRow);
    r.height = 48;

    const cellStt = r.getCell(1);
    cellStt.value = row.stt;
    cellStt.alignment = { horizontal: 'center', vertical: 'middle' };
    cellStt.border = thinBorder;

    const cellDesc = r.getCell(2);
    cellDesc.value = row.contractDesc;
    cellDesc.alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };
    cellDesc.font = { name: 'Arial', size: 9 };
    cellDesc.border = thinBorder;

    let colIdx = 3;
    for (const amt of row.beneficiaryAmounts) {
      const cellAmt = r.getCell(colIdx);
      cellAmt.value = amt ? formatVND(amt) : '';
      cellAmt.alignment = { horizontal: 'right', vertical: 'middle' };
      cellAmt.font = { name: 'Arial', size: 10 };
      cellAmt.border = thinBorder;
      colIdx++;
    }

    const cellPool = r.getCell(colIdx++);
    cellPool.value = formatVND(row.unallocatedPool);
    cellPool.alignment = { horizontal: 'right', vertical: 'middle' };
    cellPool.border = thinBorder;

    const cellDist = r.getCell(colIdx++);
    cellDist.value = formatVND(row.distributedCommission);
    cellDist.alignment = { horizontal: 'right', vertical: 'middle' };
    cellDist.border = thinBorder;

    const cellRem = r.getCell(colIdx);
    cellRem.value = formatVND(row.remainingFund);
    cellRem.alignment = { horizontal: 'right', vertical: 'middle' };
    cellRem.border = thinBorder;

    currentRow++;
  }

  // Dòng Tổng ma trận
  const totalRow = ws.getRow(currentRow);
  totalRow.height = 24;
  totalRow.getCell(1).value = 'Tổng';
  totalRow.getCell(1).font = { name: 'Arial', size: 10, bold: true };
  totalRow.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
  totalRow.getCell(1).border = thinBorder;

  totalRow.getCell(2).value = formatVND(data.salesBase);
  totalRow.getCell(2).font = { name: 'Arial', size: 10, bold: true };
  totalRow.getCell(2).alignment = { horizontal: 'right', vertical: 'middle' };
  totalRow.getCell(2).border = thinBorder;

  let totCol = 3;
  for (const bTot of data.beneficiaryTotals) {
    const c = totalRow.getCell(totCol);
    c.value = formatVND(bTot);
    c.font = { name: 'Arial', size: 10, bold: true };
    c.alignment = { horizontal: 'right', vertical: 'middle' };
    c.border = thinBorder;
    totCol++;
  }

  const cPool = totalRow.getCell(totCol++);
  cPool.value = formatVND(data.matrixTotalPool);
  cPool.font = { name: 'Arial', size: 10, bold: true };
  cPool.alignment = { horizontal: 'right', vertical: 'middle' };
  cPool.border = thinBorder;

  const cDist = totalRow.getCell(totCol++);
  cDist.value = formatVND(data.matrixTotalDistributed);
  cDist.font = { name: 'Arial', size: 10, bold: true };
  cDist.alignment = { horizontal: 'right', vertical: 'middle' };
  cDist.border = thinBorder;

  const cRem = totalRow.getCell(totCol);
  cRem.value = formatVND(data.matrixTotalRemaining);
  cRem.font = { name: 'Arial', size: 10, bold: true };
  cRem.alignment = { horizontal: 'right', vertical: 'middle' };
  cRem.border = thinBorder;

  // Chữ ký dưới cùng bảng ma trận
  currentRow += 2;
  ws.mergeCells(`A${currentRow}:B${currentRow}`);
  ws.getCell(`A${currentRow}`).value = 'NGƯỜI LẬP';
  ws.getCell(`A${currentRow}`).font = { name: 'Arial', size: 10, bold: true };
  ws.getCell(`A${currentRow}`).alignment = { horizontal: 'center', vertical: 'middle' };

  ws.mergeCells(`I${currentRow}:L${currentRow}`);
  ws.getCell(`I${currentRow}`).value = 'PHÓ CHỦ TỊCH';
  ws.getCell(`I${currentRow}`).font = { name: 'Arial', size: 10, bold: true };
  ws.getCell(`I${currentRow}`).alignment = { horizontal: 'center', vertical: 'middle' };

  const lastColIdx = matrixHeaders.length;
  const tgCol1 = Math.max(1, lastColIdx - 2);
  const tgCol2 = lastColIdx;
  const colLetter1 = ws.getColumn(tgCol1).letter;
  const colLetter2 = ws.getColumn(tgCol2).letter;
  ws.mergeCells(`${colLetter1}${currentRow}:${colLetter2}${currentRow}`);
  ws.getCell(`${colLetter1}${currentRow}`).value = 'TỔNG GIÁM ĐỐC';
  ws.getCell(`${colLetter1}${currentRow}`).font = { name: 'Arial', size: 10, bold: true };
  ws.getCell(`${colLetter1}${currentRow}`).alignment = { horizontal: 'center', vertical: 'middle' };

  currentRow += 5;
  ws.mergeCells(`A${currentRow}:B${currentRow}`);
  ws.getCell(`A${currentRow}`).value = 'Vũ Thị Cúc';
  ws.getCell(`A${currentRow}`).font = { name: 'Arial', size: 10 };
  ws.getCell(`A${currentRow}`).alignment = { horizontal: 'center', vertical: 'middle' };

  ws.mergeCells(`I${currentRow}:L${currentRow}`);
  ws.getCell(`I${currentRow}`).value = 'Nguyễn Thị Thương Hiếu';
  ws.getCell(`I${currentRow}`).font = { name: 'Arial', size: 10 };
  ws.getCell(`I${currentRow}`).alignment = { horizontal: 'center', vertical: 'middle' };

  ws.mergeCells(`${colLetter1}${currentRow}:${colLetter2}${currentRow}`);
  ws.getCell(`${colLetter1}${currentRow}`).value = 'Nguyễn Thị Hương Thảo';
  ws.getCell(`${colLetter1}${currentRow}`).font = { name: 'Arial', size: 10 };
  ws.getCell(`${colLetter1}${currentRow}`).alignment = { horizontal: 'center', vertical: 'middle' };
}

export interface MonthlyRecipientRow {
  stt: number;
  code: string;
  info: string;
  details: string;
  totalAmount: number;
}

export interface MonthlyReportData {
  month: string;
  startDate: string;
  endDate: string;
  salesBase: number;
  funds: WeeklyFundRow[];
  totalAllocated: number;
  totalSpent: number;
  totalRemaining: number;
  recipients: MonthlyRecipientRow[];
}

export function createStyledMonthlySheet(workbook: ExcelJS.Workbook, data: MonthlyReportData, sheetName: string) {
  const ws = workbook.addWorksheet(sheetName, {
    views: [{ showGridLines: true }],
  });

  ws.columns = [
    { width: 6 },  // A: STT
    { width: 16 }, // B: Mã Người nhận
    { width: 28 }, // C: Thông tin người nhận
    { width: 8 },  // D: (Merged C:D)
    { width: 14 }, // E: Tỷ lệ / (Merged E:G)
    { width: 22 }, // F: Doanh số
    { width: 22 }, // G: Tổng chi quỹ
    { width: 20 }, // H: Còn lại quỹ / Tổng tiền
    { width: 12 }, // I
    { width: 12 }, // J
    { width: 14 }, // K
  ];

  // 1. Tiêu đề công ty & Ngày tháng
  ws.getCell('A1').value = 'CÔNG TY CỔ PHẦN TẬP ĐOÀN NGHIÊNG COMPLEX';
  ws.getCell('A1').font = { name: 'Arial', size: 10, bold: true };
  ws.getCell('A2').value = 'ML 6-24 Vinhomes Greenbay, Đường Lương Thế Vinh, Đại Mỗ, Hà Nội';
  ws.getCell('A2').font = { name: 'Arial', size: 9 };

  ws.getCell('J1').value = 'Từ ngày';
  ws.getCell('J1').font = { name: 'Arial', size: 10 };
  ws.getCell('K1').value = data.startDate;
  ws.getCell('K1').font = { name: 'Arial', size: 10 };

  ws.getCell('J2').value = 'Tới ngày';
  ws.getCell('J2').font = { name: 'Arial', size: 10 };
  ws.getCell('K2').value = data.endDate;
  ws.getCell('K2').font = { name: 'Arial', size: 10 };

  // 2. Tiêu đề bảng quyết toán (MÀU XANH ĐẬM #5B9BD5)
  ws.mergeCells('A4:H4');
  const cellA4 = ws.getCell('A4');
  cellA4.value = `Quyết toán Quỹ tháng ${parseInt(data.month.slice(5), 10)}`;
  cellA4.font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FF000000' } };
  cellA4.fill = primaryHeaderFill;
  cellA4.alignment = { horizontal: 'center', vertical: 'middle' };
  cellA4.border = thinBorder;
  ws.getRow(4).height = 24;

  // 3. Tiêu đề các cột bảng 1 (MÀU XANH DỊU #8EB0E8)
  ws.mergeCells('A6:D6');
  ws.getCell('A6').value = 'Doanh số HĐ (100%)';
  ws.getCell('E6').value = 'Tỷ lệ';
  ws.getCell('F6').value = formatVND(data.salesBase);
  ws.getCell('G6').value = 'Tổng chi quỹ';
  ws.getCell('H6').value = 'Còn lại quỹ';

  for (let c = 1; c <= 8; c++) {
    const cell = ws.getRow(6).getCell(c);
    cell.fill = columnHeaderFill;
    cell.font = { name: 'Arial', size: 10, bold: true };
    cell.alignment = { horizontal: c === 6 ? 'right' : 'center', vertical: 'middle' };
    cell.border = thinBorder;
  }
  ws.getRow(6).height = 22;

  // 4. Dòng dữ liệu 13 quỹ
  let currentRow = 7;
  for (const fund of data.funds) {
    ws.mergeCells(`A${currentRow}:D${currentRow}`);
    const nameCell = ws.getCell(`A${currentRow}`);
    nameCell.value = fund.name;
    nameCell.font = { name: 'Arial', size: 10 };
    nameCell.alignment = { horizontal: 'left', vertical: 'middle' };
    nameCell.border = thinBorder;

    const rateCell = ws.getCell(`E${currentRow}`);
    rateCell.value = fund.rateText || formatRateText(fund.rate);
    rateCell.font = { name: 'Arial', size: 10 };
    rateCell.alignment = { horizontal: 'center', vertical: 'middle' };
    rateCell.border = thinBorder;

    const allocCell = ws.getCell(`F${currentRow}`);
    allocCell.value = formatVND(fund.allocated);
    allocCell.font = { name: 'Arial', size: 10 };
    allocCell.alignment = { horizontal: 'right', vertical: 'middle' };
    allocCell.border = thinBorder;

    const spentCell = ws.getCell(`G${currentRow}`);
    spentCell.value = formatVND(fund.spent);
    spentCell.font = {
      name: 'Arial',
      size: 10,
      color: { argb: fund.spent === 0 ? COLOR_RED_TEXT : 'FF000000' },
    };
    spentCell.alignment = { horizontal: 'right', vertical: 'middle' };
    spentCell.border = thinBorder;

    const remCell = ws.getCell(`H${currentRow}`);
    remCell.value = formatVND(fund.remaining);
    remCell.font = {
      name: 'Arial',
      size: 10,
      color: { argb: fund.remaining === 0 ? COLOR_RED_TEXT : 'FF000000' },
    };
    remCell.alignment = { horizontal: 'right', vertical: 'middle' };
    remCell.border = thinBorder;

    for (let c = 1; c <= 8; c++) {
      ws.getRow(currentRow).getCell(c).border = thinBorder;
    }
    ws.getRow(currentRow).height = 20;
    currentRow++;
  }

  // 5. Dòng Tổng quỹ
  ws.mergeCells(`A${currentRow}:E${currentRow}`);
  const totalLabel = ws.getCell(`A${currentRow}`);
  totalLabel.value = 'Tổng qũy';
  totalLabel.font = { name: 'Arial', size: 10, bold: true };
  totalLabel.alignment = { horizontal: 'center', vertical: 'middle' };

  const totalAlloc = ws.getCell(`F${currentRow}`);
  totalAlloc.value = formatVND(data.totalAllocated);
  totalAlloc.font = { name: 'Arial', size: 10, bold: true };
  totalAlloc.alignment = { horizontal: 'right', vertical: 'middle' };

  const totalSpent = ws.getCell(`G${currentRow}`);
  totalSpent.value = formatVND(data.totalSpent);
  totalSpent.font = { name: 'Arial', size: 10, bold: true };
  totalSpent.alignment = { horizontal: 'right', vertical: 'middle' };

  const totalRem = ws.getCell(`H${currentRow}`);
  totalRem.value = formatVND(data.totalRemaining);
  totalRem.font = { name: 'Arial', size: 10, bold: true };
  totalRem.alignment = { horizontal: 'right', vertical: 'middle' };

  for (let c = 1; c <= 8; c++) {
    ws.getRow(currentRow).getCell(c).border = thinBorder;
  }
  ws.getRow(currentRow).height = 22;

  // ==========================================================================
  // BẢNG 2: TỔNG HỢP THU CHI THEO TỪNG NGƯỜI NHẬN (Dòng 22)
  // ==========================================================================
  currentRow = 22;
  ws.getCell(`A${currentRow}`).value = 'STT';
  ws.getCell(`B${currentRow}`).value = 'Mã Người nhận';
  ws.mergeCells(`C${currentRow}:D${currentRow}`);
  ws.getCell(`C${currentRow}`).value = 'Thông tin người nhận';
  ws.mergeCells(`E${currentRow}:G${currentRow}`);
  ws.getCell(`E${currentRow}`).value = 'Chi tiết nội dung nhận';
  ws.getCell(`H${currentRow}`).value = 'Tổng tiền';

  for (let c = 1; c <= 8; c++) {
    const cell = ws.getRow(currentRow).getCell(c);
    cell.fill = columnHeaderFill; // MÀU XANH DỊU #8EB0E8
    cell.font = { name: 'Arial', size: 10, bold: true };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.border = thinBorder;
  }
  ws.getRow(currentRow).height = 24;

  // Các dòng người nhận
  currentRow++;
  for (const rec of data.recipients) {
    const r = ws.getRow(currentRow);
    r.height = Math.max(36, (rec.details.split('\n').length * 16));

    const cellStt = r.getCell(1);
    cellStt.value = rec.stt;
    cellStt.alignment = { horizontal: 'center', vertical: 'middle' };
    cellStt.border = thinBorder;

    const cellCode = r.getCell(2);
    cellCode.value = rec.code;
    cellCode.alignment = { horizontal: 'center', vertical: 'middle' };
    cellCode.border = thinBorder;

    ws.mergeCells(`C${currentRow}:D${currentRow}`);
    const cellInfo = ws.getCell(`C${currentRow}`);
    cellInfo.value = rec.info;
    cellInfo.alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };
    cellInfo.font = { name: 'Arial', size: 10 };

    ws.mergeCells(`E${currentRow}:G${currentRow}`);
    const cellDetails = ws.getCell(`E${currentRow}`);
    cellDetails.value = rec.details;
    cellDetails.alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };
    cellDetails.font = { name: 'Arial', size: 9 };

    const cellTotal = r.getCell(8);
    cellTotal.value = formatVND(rec.totalAmount);
    cellTotal.alignment = { horizontal: 'right', vertical: 'middle' };
    cellTotal.font = { name: 'Arial', size: 10, bold: true };

    for (let c = 1; c <= 8; c++) {
      r.getCell(c).border = thinBorder;
    }

    currentRow++;
  }

  // Chữ ký ban giám đốc bảng quyết toán tháng
  currentRow += 2;
  ws.mergeCells(`A${currentRow}:B${currentRow}`);
  ws.getCell(`A${currentRow}`).value = 'NGƯỜI LẬP';
  ws.getCell(`A${currentRow}`).font = { name: 'Arial', size: 10, bold: true };
  ws.getCell(`A${currentRow}`).alignment = { horizontal: 'center', vertical: 'middle' };

  ws.mergeCells(`C${currentRow}:E${currentRow}`);
  ws.getCell(`C${currentRow}`).value = 'PHÓ CHỦ TỊCH';
  ws.getCell(`C${currentRow}`).font = { name: 'Arial', size: 10, bold: true };
  ws.getCell(`C${currentRow}`).alignment = { horizontal: 'center', vertical: 'middle' };

  ws.mergeCells(`F${currentRow}:H${currentRow}`);
  ws.getCell(`F${currentRow}`).value = 'TỔNG GIÁM ĐỐC';
  ws.getCell(`F${currentRow}`).font = { name: 'Arial', size: 10, bold: true };
  ws.getCell(`F${currentRow}`).alignment = { horizontal: 'center', vertical: 'middle' };

  currentRow += 5;
  ws.mergeCells(`A${currentRow}:B${currentRow}`);
  ws.getCell(`A${currentRow}`).value = 'Vũ Thị Cúc';
  ws.getCell(`A${currentRow}`).font = { name: 'Arial', size: 10 };
  ws.getCell(`A${currentRow}`).alignment = { horizontal: 'center', vertical: 'middle' };

  ws.mergeCells(`C${currentRow}:E${currentRow}`);
  ws.getCell(`C${currentRow}`).value = 'Nguyễn Thị Thương Hiếu';
  ws.getCell(`C${currentRow}`).font = { name: 'Arial', size: 10 };
  ws.getCell(`C${currentRow}`).alignment = { horizontal: 'center', vertical: 'middle' };

  ws.mergeCells(`F${currentRow}:H${currentRow}`);
  ws.getCell(`F${currentRow}`).value = 'Nguyễn Thị Hương Thảo';
  ws.getCell(`F${currentRow}`).font = { name: 'Arial', size: 10 };
  ws.getCell(`F${currentRow}`).alignment = { horizontal: 'center', vertical: 'middle' };
}
