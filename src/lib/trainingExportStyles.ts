import ExcelJS from 'exceljs';

export const COLOR_TITLE_NAVY = 'FF1F497D'; // #1F497D - Xanh đậm tiêu đề chính
export const COLOR_HEADER_BLUE = 'FF2F5597'; // #2F5597 - Xanh đậm tiêu đề cột
export const COLOR_MEMBER_GREEN = 'FFD9EAD3'; // #D9EAD3 - Xanh nhạt tên người tham gia
export const COLOR_YELLOW_HIGHLIGHT = 'FFFFFF00'; // #FFFF00 - Vàng highlight tổng kết
export const COLOR_TOKEN_RATE_BG = 'FFFFF2CC'; // #FFF2CC - Vàng nhạt ô giá trị 1 token
export const COLOR_BORDER = 'FFB0B0B0';

export const thinBorder: Partial<ExcelJS.Borders> = {
  top: { style: 'thin', color: { argb: COLOR_BORDER } },
  left: { style: 'thin', color: { argb: COLOR_BORDER } },
  bottom: { style: 'thin', color: { argb: COLOR_BORDER } },
  right: { style: 'thin', color: { argb: COLOR_BORDER } },
};

export interface TrainingLogItem {
  id?: number;
  session_code: string;
  session_name?: string;
  training_date?: string;
  member_phone?: string;
  member_name: string;
  token_count: number;
  session_budget: number;
  total_tokens: number;
  reward_amount: number;
  status: string;
}

export interface TrainingCourseItem {
  course_code: string;
  course_name: string;
  training_type: string;
  token_value: number;
  budget: number;
}

export const DEFAULT_TRAINING_COURSES: TrainingCourseItem[] = [
  {
    course_code: 'TR001',
    course_name: 'Đào tạo Prosale mới  ',
    training_type: 'Offline',
    token_value: 120,
    budget: 600000,
  },
  {
    course_code: 'TR002',
    course_name: 'Đào tạo prosale mới ',
    training_type: 'Online',
    token_value: 100,
    budget: 500000,
  },
  {
    course_code: 'TR003',
    course_name: 'ĐT Chuyên sâu – Buổi 1 (Nguồn vốn)',
    training_type: 'Online',
    token_value: 50,
    budget: 250000,
  },
  {
    course_code: 'TR004',
    course_name: 'ĐT chuyên sâu – Buổi 2 (Lữ hành)',
    training_type: 'Online',
    token_value: 50,
    budget: 250000,
  },
  {
    course_code: 'TR005',
    course_name: 'ĐT chuyển sâu – Buổi 3 (Welink)',
    training_type: 'Online',
    token_value: 50,
    budget: 250000,
  },
  {
    course_code: 'TR006',
    course_name: 'ĐT Mô hình Welink ',
    training_type: 'Offline',
    token_value: 100,
    budget: 500000,
  },
];

function formatDateDisplay(dStr?: string): string {
  if (!dStr) return '';
  const dateObj = new Date(dStr);
  if (isNaN(dateObj.getTime())) {
    // If string is already DD/MM/YYYY
    if (dStr.includes('/')) return dStr;
    return dStr;
  }
  const day = String(dateObj.getDate()).padStart(2, '0');
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const year = dateObj.getFullYear();
  return `${day}/${month}/${year}`;
}

export function createStyledTrainingSheet(
  workbook: ExcelJS.Workbook,
  logs: TrainingLogItem[],
  courses: TrainingCourseItem[] = DEFAULT_TRAINING_COURSES
): ExcelJS.Worksheet {
  const ws = workbook.addWorksheet('7. Lịch Đào tạo', {
    views: [{ showGridLines: true }],
  });

  // 1. Column Widths khớp file mẫu Tong-hop-DNTT-T9-T10.xlsx
  ws.columns = [
    { key: 'colA', width: 6 },     // A: STT
    { key: 'colB', width: 14 },    // B: Mã khoá học
    { key: 'colC', width: 16 },    // C: Ngày
    { key: 'colD', width: 18 },    // D: Mã Thành viên (SDT)
    { key: 'colE', width: 22 },    // E: Họ Tên người tham gia
    { key: 'colF', width: 11 },    // F: Số Token
    { key: 'colG', width: 25 },    // G: Ngân sách Buổi học (VND)
    { key: 'colH', width: 16 },    // H: Tổng Token Buổi
    { key: 'colI', width: 24 },    // I: Thù lao thực nhận (VND)
    { key: 'colJ', width: 14 },    // J: Trạng thái
    { key: 'colK', width: 22 },    // K: Thực chi hợp lệ (VND)
    { key: 'colL', width: 16 },    // L: Ngày đào tạo
    { key: 'colM', width: 4 },     // M: Spacer
    { key: 'colN', width: 4 },     // N: Spacer
    { key: 'colO', width: 14 },    // O: Mã Buổi học
    { key: 'colP', width: 36 },    // P: Tên khoá học (Nội dung đào tạo)
    { key: 'colQ', width: 14 },    // Q: Hình thức đào tạo
    { key: 'colR', width: 10 },    // R: Giá trị token
    { key: 'colS', width: 18 },    // S: Ngân sách (VND)
    { key: 'colT', width: 16 },    // T: Giá trị 1 token
    { key: 'colU', width: 10 },    // U: 5000
  ];

  // 2. Dòng 1: Tiêu đề Băng rôn (Navy Blue: #1F497D)
  ws.mergeCells('B1:L1');
  const b1 = ws.getCell('B1');
  b1.value = 'DANH SÁCH THAM GIA ĐÀO TẠO & THÙ LAO THEO TOKEN THỰC NHẬN';
  b1.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_TITLE_NAVY } };
  b1.font = { name: 'Quattrocento Sans', size: 13, bold: true, color: { argb: 'FFFFFFFF' } };
  b1.alignment = { horizontal: 'center', vertical: 'middle' };

  ws.mergeCells('O1:S1');
  const o1 = ws.getCell('O1');
  o1.value = 'DANH MỤC BUỔI ĐÀO TẠO & NGÂN SÁCH CỐ ĐỊNH';
  o1.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_TITLE_NAVY } };
  o1.font = { name: 'Quattrocento Sans', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
  o1.alignment = { horizontal: 'center', vertical: 'middle' };

  const t1 = ws.getCell('T1');
  t1.value = 'Giá trị 1 token';
  t1.font = { name: 'Calibri', size: 10, italic: true };
  t1.alignment = { vertical: 'middle', horizontal: 'center' };

  const u1 = ws.getCell('U1');
  u1.value = 5000;
  u1.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_TOKEN_RATE_BG } };
  u1.font = { name: 'Calibri', size: 10, bold: true };
  u1.alignment = { vertical: 'middle', horizontal: 'center' };
  u1.numFmt = '#,##0';

  ws.getRow(1).height = 36;

  // 3. Dòng 2: Tiêu đề Cột (Steel Navy: #2F5597)
  const headersTable1 = [
    { col: 'A', text: 'STT' },
    { col: 'B', text: 'Mã khoá học' },
    { col: 'C', text: 'Ngày' },
    { col: 'D', text: 'Mã Thành viên (SDT)' },
    { col: 'E', text: 'Họ Tên người tham gia' },
    { col: 'F', text: 'Số Token' },
    { col: 'G', text: 'Ngân sách Buổi học (VND)' },
    { col: 'H', text: 'Tổng Token Buổi' },
    { col: 'I', text: 'Thù lao thực nhận (VND)' },
    { col: 'J', text: 'Trạng thái' },
    { col: 'K', text: 'Thực chi hợp lệ (VND)' },
    { col: 'L', text: 'Ngày đào tạo' },
  ];

  const headersTable2 = [
    { col: 'O', text: 'Mã Buổi học' },
    { col: 'P', text: 'Tên khoá học\n(Nội dung đào tạo)' },
    { col: 'Q', text: 'HÌnh thức\nđào tạo' },
    { col: 'R', text: 'Giá trị\ntoken' },
    { col: 'S', text: 'Ngân sách \n(VND)' },
  ];

  [...headersTable1, ...headersTable2].forEach((h) => {
    const c = ws.getCell(`${h.col}2`);
    c.value = h.text;
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_HEADER_BLUE } };
    c.font = { name: 'Quattrocento Sans', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
    c.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    c.border = thinBorder;
  });

  ws.getRow(2).height = 32;

  // 4. Dòng 3: Dòng Highlight Tổng kết (Yellow #FFFF00)
  const yellowCols = ['E', 'G', 'I'];
  yellowCols.forEach((col) => {
    const c = ws.getCell(`${col}3`);
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_YELLOW_HIGHLIGHT } };
    c.border = thinBorder;
  });

  // Table 2 Summary Row 3: Count, Total Token, Total Budget
  const totalCourses = courses.length;
  const totalTokens = courses.reduce((sum, c) => sum + (Number(c.token_value) || 0), 0);
  const totalBudget = courses.reduce((sum, c) => sum + (Number(c.budget) || 0), 0);

  const o3 = ws.getCell('O3');
  o3.value = totalCourses;
  o3.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_YELLOW_HIGHLIGHT } };
  o3.font = { name: 'Quattrocento Sans', size: 10, bold: true };
  o3.alignment = { horizontal: 'center', vertical: 'middle' };
  o3.border = thinBorder;

  const r3 = ws.getCell('R3');
  r3.value = totalTokens;
  r3.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_YELLOW_HIGHLIGHT } };
  r3.font = { name: 'Quattrocento Sans', size: 10, bold: true };
  r3.alignment = { horizontal: 'center', vertical: 'middle' };
  r3.border = thinBorder;

  const s3 = ws.getCell('S3');
  s3.value = totalBudget;
  s3.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_YELLOW_HIGHLIGHT } };
  s3.font = { name: 'Quattrocento Sans', size: 10, bold: true };
  s3.alignment = { horizontal: 'right', vertical: 'middle' };
  s3.numFmt = '#,##0" đ"';
  s3.border = thinBorder;

  ws.getRow(3).height = 22;

  // 5. Nạp dữ liệu vào Table 2 (Danh mục buổi đào tạo: O4..S...)
  courses.forEach((crs, idx) => {
    const rIdx = 4 + idx;
    const r = ws.getRow(rIdx);
    r.height = 24;

    const cellO = ws.getCell(`O${rIdx}`);
    cellO.value = crs.course_code;
    cellO.font = { name: 'Quattrocento Sans', size: 10, bold: true };
    cellO.alignment = { horizontal: 'center', vertical: 'middle' };
    cellO.border = thinBorder;

    const cellP = ws.getCell(`P${rIdx}`);
    cellP.value = crs.course_name;
    cellP.font = { name: 'Quattrocento Sans', size: 10 };
    cellP.alignment = { horizontal: 'left', vertical: 'middle' };
    cellP.border = thinBorder;

    const cellQ = ws.getCell(`Q${rIdx}`);
    cellQ.value = crs.training_type;
    cellQ.font = { name: 'Quattrocento Sans', size: 10 };
    cellQ.alignment = { horizontal: 'left', vertical: 'middle' };
    cellQ.border = thinBorder;

    const cellR = ws.getCell(`R${rIdx}`);
    cellR.value = Number(crs.token_value) || 0;
    cellR.font = { name: 'Quattrocento Sans', size: 10 };
    cellR.alignment = { horizontal: 'center', vertical: 'middle' };
    cellR.border = thinBorder;

    const cellS = ws.getCell(`S${rIdx}`);
    cellS.value = Number(crs.budget) || 0;
    cellS.font = { name: 'Quattrocento Sans', size: 10, bold: true };
    cellS.alignment = { horizontal: 'right', vertical: 'middle' };
    cellS.numFmt = '#,##0" đ"';
    cellS.border = thinBorder;
  });

  // 6. Nạp dữ liệu vào Table 1 (Danh sách tham gia đào tạo: A4..M...)
  const rowCount = Math.max(logs.length, 10); // Đảm bảo tối thiểu 10 dòng như file mẫu
  for (let idx = 0; idx < rowCount; idx++) {
    const rIdx = 4 + idx;
    const log = logs[idx];
    const r = ws.getRow(rIdx);
    if (!r.height) r.height = 24;

    if (log) {
      const dateText = formatDateDisplay(log.training_date);

      // A: STT
      const cellA = ws.getCell(`A${rIdx}`);
      cellA.value = idx + 1;
      cellA.font = { name: 'Quattrocento Sans', size: 10 };
      cellA.alignment = { horizontal: 'center', vertical: 'middle' };
      cellA.border = thinBorder;

      // B: Mã khoá học
      const cellB = ws.getCell(`B${rIdx}`);
      cellB.value = log.session_code;
      cellB.font = { name: 'Quattrocento Sans', size: 10, bold: true };
      cellB.alignment = { horizontal: 'center', vertical: 'middle' };
      cellB.border = thinBorder;

      // C: Ngày
      const cellC = ws.getCell(`C${rIdx}`);
      cellC.value = dateText;
      cellC.font = { name: 'Nunito', size: 10 };
      cellC.alignment = { horizontal: 'center', vertical: 'middle' };
      cellC.border = thinBorder;

      // D: Mã Thành viên (SDT)
      const cellD = ws.getCell(`D${rIdx}`);
      cellD.value = log.member_phone || '';
      cellD.font = { name: 'Nunito', size: 10 };
      cellD.alignment = { horizontal: 'center', vertical: 'middle' };
      cellD.border = thinBorder;

      // E: Họ Tên người tham gia (Soft Green #D9EAD3)
      const cellE = ws.getCell(`E${rIdx}`);
      cellE.value = log.member_name;
      cellE.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_MEMBER_GREEN } };
      cellE.font = { name: 'Quattrocento Sans', size: 10, bold: true };
      cellE.alignment = { horizontal: 'left', vertical: 'middle' };
      cellE.border = thinBorder;

      // F: Số Token
      const cellF = ws.getCell(`F${rIdx}`);
      cellF.value = Number(log.token_count) || 0;
      cellF.font = { name: 'Quattrocento Sans', size: 10, bold: true };
      cellF.alignment = { horizontal: 'center', vertical: 'middle' };
      cellF.border = thinBorder;

      // G: Ngân sách Buổi học (VND)
      const cellG = ws.getCell(`G${rIdx}`);
      cellG.value = Number(log.session_budget) || 0;
      cellG.font = { name: 'Quattrocento Sans', size: 10 };
      cellG.alignment = { horizontal: 'right', vertical: 'middle' };
      cellG.numFmt = '#,##0" đ"';
      cellG.border = thinBorder;

      // H: Tổng Token Buổi
      const cellH = ws.getCell(`H${rIdx}`);
      cellH.value = Number(log.total_tokens) || 0;
      cellH.font = { name: 'Quattrocento Sans', size: 10 };
      cellH.alignment = { horizontal: 'center', vertical: 'middle' };
      cellH.border = thinBorder;

      // I: Thù lao thực nhận (VND)
      const cellI = ws.getCell(`I${rIdx}`);
      cellI.value = Number(log.reward_amount) || 0;
      cellI.font = { name: 'Quattrocento Sans', size: 10, bold: true };
      cellI.alignment = { horizontal: 'right', vertical: 'middle' };
      cellI.numFmt = '#,##0" đ"';
      cellI.border = thinBorder;

      // J: Trạng thái
      const cellJ = ws.getCell(`J${rIdx}`);
      cellJ.value = log.status || 'Đã duyệt';
      cellJ.font = { name: 'Quattrocento Sans', size: 10 };
      cellJ.alignment = { horizontal: 'center', vertical: 'middle' };
      cellJ.border = thinBorder;

      // K: Thực chi hợp lệ (VND)
      const cellK = ws.getCell(`K${rIdx}`);
      const validPayout = log.status === 'Đã duyệt' ? Number(log.reward_amount) || 0 : 0;
      cellK.value = {
        formula: `IF(J${rIdx}="Đã duyệt", I${rIdx}, 0)`,
        result: validPayout,
      };
      cellK.font = { name: 'Quattrocento Sans', size: 10, bold: true };
      cellK.alignment = { horizontal: 'right', vertical: 'middle' };
      cellK.numFmt = '#,##0" đ"';
      cellK.border = thinBorder;

      // L: Ngày đào tạo
      const cellL = ws.getCell(`L${rIdx}`);
      cellL.value = dateText;
      cellL.font = { name: 'Nunito', size: 10 };
      cellL.alignment = { horizontal: 'center', vertical: 'middle' };
      cellL.border = thinBorder;
    } else {
      // Dòng trống với công thức như file mẫu
      ['A', 'B', 'C', 'D', 'F', 'G', 'H', 'I', 'J', 'K', 'M'].forEach((col) => {
        const c = ws.getCell(`${col}${rIdx}`);
        c.border = thinBorder;
      });

      const cellE = ws.getCell(`E${rIdx}`);
      cellE.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_MEMBER_GREEN } };
      cellE.border = thinBorder;

      const cellL = ws.getCell(`L${rIdx}`);
      cellL.value = {
        formula: `IF(K${rIdx}="Đã duyệt", I${rIdx}, 0)`,
        result: 0,
      };
      cellL.font = { name: 'Quattrocento Sans', size: 10 };
      cellL.alignment = { horizontal: 'right', vertical: 'middle' };
      cellL.numFmt = '#,##0" đ"';
      cellL.border = thinBorder;
    }
  }

  return ws;
}
