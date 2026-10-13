import { NextRequest } from 'next/server';
import ExcelJS from 'exceljs';
import pool from '@/lib/db';
import { getTeamLeadAllocation, isTeamLeadAdmin, parseMonth } from '@/lib/teamlead';

export const dynamic = 'force-dynamic';

const DARK_BLUE_ARGB = 'FF1E3A8A'; // Xanh Navy đậm chuẩn Nghiêng Complex
const HEADER_FILL_ARGB = 'FF1E3A8A';
const ZEBRA_FILL_ARGB = 'FFF8FAFC';
const HIGHLIGHT_GOLD_ARGB = 'FFFEF3C7';
const HIGHLIGHT_TOTAL_ARGB = 'FFE0E7FF';

const thinBorder: Partial<ExcelJS.Borders> = {
  top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
  left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
  bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } },
  right: { style: 'thin', color: { argb: 'FFCBD5E1' } },
};

function normalizeName(val?: string | null): string {
  return (val || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/gi, 'd')
    .replace(/\s+/g, ' ');
}

function normalizePhone(val?: string | null): string {
  return (val || '').replace(/\D/g, '');
}

interface MasterPerson {
  name: string;
  phone: string;
  bankAccount: string;
  bankName: string;
  teamName: string;
  saleCommission: number;
  teamLeadBonus: number;
  operationsBonus: number;
  eventTrainingBonus: number;
  totalAmount: number;
  note: string;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const month = searchParams.get('month') || '2026-10';
    const parsed = parseMonth(month) || '2026-10-01';
    const targetMonth = parsed.slice(0, 7);

    // 1. Lấy thông tin tài khoản ngân hàng từ users
    const usersRes = await pool.query(`
      SELECT u.id, u.full_name, u.phone, u.bank_account, u.bank_name,
             COALESCE(t.name, u.team_name, '') AS team_name
      FROM users u
      LEFT JOIN teams t ON u.team_id = t.id
      ORDER BY u.full_name ASC
    `);

    const usersByPhone = new Map<string, any>();
    const usersByName = new Map<string, any>();
    for (const u of usersRes.rows) {
      const p = normalizePhone(u.phone);
      if (p) usersByPhone.set(p, u);
      const n = normalizeName(u.full_name);
      if (n) usersByName.set(n, u);
    }

    // 2. Lấy dữ liệu Quỹ TeamLead (toàn tháng weekNo = 0)
    let teamLeadRows: any[] = [];
    try {
      const allocation = await getTeamLeadAllocation(parsed, 0, pool);
      teamLeadRows = allocation?.rows || [];
    } catch (err) {
      console.warn('Could not fetch teamlead allocation for month:', parsed, err);
    }

    // 3. Lấy dữ liệu Hợp đồng & Hoa hồng sale trực tiếp
    const contractsRes = await pool.query(
      `
      SELECT c.id, c.contract_code, c.contract_date::text AS contract_date, c.customer_name,
        c.value::float8 AS value,
        COALESCE(c.allocated_value, c.value, 0)::float8 AS allocated_value,
        c.contract_type, c.team_name,
        c.closer_name, c.closer_phone, COALESCE(c.closer_fee, 0)::float8 AS closer_fee,
        c.referrer_name, c.referrer_phone, COALESCE(c.referrer_fee, 0)::float8 AS referrer_fee,
        c.supporter_name, c.supporter_phone, COALESCE(c.supporter_fee, 0)::float8 AS supporter_fee,
        c.status
      FROM contracts c
      WHERE c.contract_date IS NOT NULL AND c.contract_date::text LIKE $1 || '%'
      ORDER BY c.contract_date ASC, c.id ASC
      `,
      [targetMonth]
    );
    const contracts = contractsRes.rows;

    // 4. Lấy dữ liệu Quỹ Vận hành & Ban hỗ trợ (từ transaction_logs)
    const logsRes = await pool.query(
      `
      SELECT tl.id, tl.request_code, tl.request_date::text AS request_date, tl.fund_source, tl.detail_content,
        tl.beneficiary_name, tl.beneficiary_phone, tl.beneficiary_bank_account, tl.beneficiary_bank_name,
        COALESCE(tl.actual_expense, tl.proposed_amount, 0)::float8 AS amount,
        tl.status, tl.payment_date::text AS payment_date
      FROM transaction_logs tl
      WHERE (
        tl.payment_date::text LIKE $1 || '%' 
        OR (tl.payment_date IS NULL AND tl.request_date::text LIKE $1 || '%')
      )
      ORDER BY tl.id ASC
      `,
      [targetMonth]
    );
    const logs = logsRes.rows;

    // 5. Lấy dữ liệu Thù lao Đào tạo & Sự kiện (fund_event_expenses)
    const eventExpensesRes = await pool.query(
      `
      SELECT event_code, event_date::text AS event_date, COALESCE(beneficiary_phone, '') AS beneficiary_phone,
        beneficiary_name, expense_role, proposed_amount::float8 AS proposed_amount, status
      FROM fund_event_expenses
      WHERE event_date::text LIKE $1 || '%'
      ORDER BY event_date ASC, id ASC
      `,
      [targetMonth]
    );
    const eventExpenses = eventExpensesRes.rows;

    // =========================================================================
    // 6. TỔNG HỢP DANH SÁCH NHÂN SỰ NHẬN TIỀN (MASTER MAP)
    // =========================================================================
    const masterMap = new Map<string, MasterPerson>();

    function getOrCreatePerson(rawName: string, rawPhone?: string | null): MasterPerson {
      const pPhone = normalizePhone(rawPhone);
      const pName = normalizeName(rawName);
      const key = pPhone || pName;

      if (!masterMap.has(key)) {
        // Tìm thông tin ngân hàng trong users
        const matchedUser = (pPhone && usersByPhone.get(pPhone)) || usersByName.get(pName);
        masterMap.set(key, {
          name: rawName?.trim() || matchedUser?.full_name || '—',
          phone: rawPhone?.trim() || matchedUser?.phone || '',
          bankAccount: matchedUser?.bank_account || '',
          bankName: matchedUser?.bank_name || '',
          teamName: matchedUser?.team_name || '',
          saleCommission: 0,
          teamLeadBonus: 0,
          operationsBonus: 0,
          eventTrainingBonus: 0,
          totalAmount: 0,
          note: '',
        });
      }

      const p = masterMap.get(key)!;
      if (!p.bankAccount && rawPhone) {
        const matched = usersByPhone.get(pPhone);
        if (matched?.bank_account) {
          p.bankAccount = matched.bank_account;
          p.bankName = matched.bank_name || p.bankName;
        }
      }
      return p;
    }

    // Gộp Hoa hồng Sale & Hợp đồng
    for (const c of contracts) {
      if (c.closer_name && c.closer_fee > 0) {
        const p = getOrCreatePerson(c.closer_name, c.closer_phone);
        p.saleCommission += c.closer_fee;
        if (c.team_name && !p.teamName) p.teamName = c.team_name;
      }
      if (c.referrer_name && c.referrer_fee > 0) {
        const p = getOrCreatePerson(c.referrer_name, c.referrer_phone);
        p.saleCommission += c.referrer_fee;
      }
      if (c.supporter_name && c.supporter_fee > 0) {
        const p = getOrCreatePerson(c.supporter_name, c.supporter_phone);
        p.saleCommission += c.supporter_fee;
      }
    }

    // Gộp Quỹ TeamLeader (70% + 30%)
    for (const r of teamLeadRows) {
      const totalBonus = Number(r.total || (Number(r.payout30 || 0) + Number(r.payout70 || 0)));
      if (totalBonus > 0 && r.memberName) {
        const p = getOrCreatePerson(r.memberName, r.memberPhone);
        p.teamLeadBonus += totalBonus;
        if (r.teamName && !p.teamName) p.teamName = r.teamName;
        if (r.role && !p.note.includes(r.role)) {
          p.note = p.note ? `${p.note}, ${r.role}` : r.role;
        }
      }
    }

    // Gộp Quỹ Vận hành & Ban hỗ trợ
    for (const log of logs) {
      if (log.amount > 0 && log.beneficiary_name) {
        const p = getOrCreatePerson(log.beneficiary_name, log.beneficiary_phone);
        p.operationsBonus += log.amount;
        if (log.beneficiary_bank_account && !p.bankAccount) {
          p.bankAccount = log.beneficiary_bank_account;
          p.bankName = log.beneficiary_bank_name || p.bankName;
        }
        if (log.fund_source && !p.note.includes(log.fund_source)) {
          p.note = p.note ? `${p.note} · ${log.fund_source}` : log.fund_source;
        }
      }
    }

    // Gộp Thù lao Đào tạo & Sự kiện
    for (const exp of eventExpenses) {
      if (exp.proposed_amount > 0 && exp.beneficiary_name) {
        const p = getOrCreatePerson(exp.beneficiary_name, exp.beneficiary_phone);
        p.eventTrainingBonus += exp.proposed_amount;
        if (exp.expense_role && !p.note.includes(exp.expense_role)) {
          p.note = p.note ? `${p.note} · ${exp.expense_role}` : exp.expense_role;
        }
      }
    }

    // Tính tổng thực nhận cho từng người
    const masterList: MasterPerson[] = Array.from(masterMap.values()).map((p) => {
      p.totalAmount = p.saleCommission + p.teamLeadBonus + p.operationsBonus + p.eventTrainingBonus;
      return p;
    }).filter((p) => p.totalAmount > 0);

    // Sắp xếp tổng tiền nhận từ cao xuống thấp
    masterList.sort((a, b) => b.totalAmount - a.totalAmount);

    // =========================================================================
    // 7. XÂY DỰNG WORKBOOK EXCEL ĐA SHEET VỚI EXCELJS
    // =========================================================================
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Nghiêng Complex';
    workbook.created = new Date();

    // -------------------------------------------------------------------------
    // SHEET 1: TỔNG HỢP CHI TRẢ TẤT CẢ QUỸ (Dành cho Kế toán Vân copy MB Bank)
    // -------------------------------------------------------------------------
    const s1 = workbook.addWorksheet('TỔNG HỢP TẤT CẢ CÁC QUỸ', {
      views: [{ state: 'frozen', ySplit: 5 }],
      pageSetup: {
        paperSize: 9,
        orientation: 'landscape',
        fitToPage: true,
        fitToWidth: 1,
        fitToHeight: 0,
      },
    });

    s1.columns = [
      { width: 6 },  // A: STT
      { width: 25 }, // B: Họ và tên
      { width: 15 }, // C: SĐT
      { width: 18 }, // D: Số tài khoản
      { width: 18 }, // E: Ngân hàng
      { width: 22 }, // F: TỔNG THỰC NHẬN (VND)
      { width: 20 }, // G: 1. Hoa hồng Sale
      { width: 20 }, // H: 2. Quỹ TeamLead
      { width: 20 }, // I: 3. Ban hỗ trợ & VH
      { width: 20 }, // J: 4. Đào tạo / SK
      { width: 28 }, // K: Ghi chú / Đội nhóm
    ];

    // Banner Tiêu đề A1:K1
    s1.mergeCells('A1:K1');
    const titleCell = s1.getCell('A1');
    titleCell.value = `BÁO CÁO TỔNG HỢP CHI TRẢ TẤT CẢ CÁC QUỸ — THÁNG ${targetMonth}`;
    titleCell.font = { bold: true, size: 14, color: { argb: 'FFFFFFFF' } };
    titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: DARK_BLUE_ARGB } };
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    s1.getRow(1).height = 32;

    // Subtitle A2:K2
    s1.mergeCells('A2:K2');
    const subCell = s1.getCell('A2');
    subCell.value = `Công ty Cổ phần Tập đoàn Nghiêng Complex • Cụm cột B–F chuẩn hoá để copy lập lệnh chuyển khoản hàng loạt MB Bank • Ngày xuất: ${new Date().toLocaleDateString('vi-VN')}`;
    subCell.font = { italic: true, size: 10, color: { argb: 'FF475569' } };
    subCell.alignment = { horizontal: 'center', vertical: 'middle' };
    s1.getRow(2).height = 20;

    s1.getRow(3).height = 8; // Row đệm

    // Hàng tiêu đề nhóm cột (Row 4)
    s1.mergeCells('B4:F4');
    const mbGroupCell = s1.getCell('B4');
    mbGroupCell.value = '★ CỤM CHUYỂN KHOẢN MB BANK (LIỀN KỀ COPY 1 CHẠM)';
    mbGroupCell.font = { bold: true, size: 10, color: { argb: 'FF1E3A8A' } };
    mbGroupCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E7FF' } };
    mbGroupCell.alignment = { horizontal: 'center', vertical: 'middle' };

    s1.mergeCells('G4:J4');
    const fundGroupCell = s1.getCell('G4');
    fundGroupCell.value = 'CHI TIẾT PHÂN RÃ THEO TỪNG NGUỒN QUỸ ĐƯỢC HƯỞNG';
    fundGroupCell.font = { bold: true, size: 10, color: { argb: 'FF065F46' } };
    fundGroupCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD1FAE5' } };
    fundGroupCell.alignment = { horizontal: 'center', vertical: 'middle' };

    s1.getRow(4).height = 22;

    // Hàng tiêu đề cột chi tiết (Row 5)
    const headerRow5 = s1.getRow(5);
    headerRow5.values = [
      'STT',
      'Họ và tên người nhận',
      'Số điện thoại',
      'Số tài khoản',
      'Ngân hàng',
      'TỔNG THỰC NHẬN (VND)',
      '1. Hoa hồng Sale & HĐ',
      '2. Thù lao TeamLead',
      '3. Ban hỗ trợ & VH',
      '4. Đào tạo & Sự kiện',
      'Ghi chú / Chức danh / Đội',
    ];
    headerRow5.height = 28;
    headerRow5.eachCell((cell, colNumber) => {
      cell.font = { bold: true, size: 10, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: HEADER_FILL_ARGB } };
      cell.alignment = { horizontal: colNumber === 1 || colNumber === 3 || colNumber === 4 ? 'center' : colNumber >= 6 && colNumber <= 10 ? 'right' : 'left', vertical: 'middle', wrapText: true };
      cell.border = thinBorder;
    });

    // Dữ liệu từng người nhận
    let rowIndex = 6;
    for (let i = 0; i < masterList.length; i++) {
      const p = masterList[i];
      const row = s1.getRow(rowIndex);
      row.values = [
        i + 1,
        p.name,
        p.phone || '—',
        p.bankAccount || '—',
        p.bankName || '—',
        p.totalAmount,
        p.saleCommission || 0,
        p.teamLeadBonus || 0,
        p.operationsBonus || 0,
        p.eventTrainingBonus || 0,
        p.teamName ? `Đội ${p.teamName}${p.note ? ` · ${p.note}` : ''}` : p.note || '—',
      ];
      row.height = 22;

      row.eachCell((cell, colNumber) => {
        cell.border = thinBorder;
        cell.font = { size: 10 };
        if (i % 2 === 1) {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: ZEBRA_FILL_ARGB } };
        }
        if (colNumber === 1 || colNumber === 3 || colNumber === 4) {
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
        } else if (colNumber >= 6 && colNumber <= 10) {
          cell.alignment = { horizontal: 'right', vertical: 'middle' };
          cell.numFmt = '#,##0';
        } else {
          cell.alignment = { horizontal: 'left', vertical: 'middle' };
        }
        // Nổi bật cột TỔNG THỰC NHẬN
        if (colNumber === 6) {
          cell.font = { bold: true, size: 10, color: { argb: 'FF1E3A8A' } };
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: HIGHLIGHT_TOTAL_ARGB } };
        }
      });
      rowIndex++;
    }

    // Dòng TỔNG CỘNG
    const totalRow = s1.getRow(rowIndex);
    const sumTotal = masterList.reduce((s, p) => s + p.totalAmount, 0);
    const sumSale = masterList.reduce((s, p) => s + p.saleCommission, 0);
    const sumTeamLead = masterList.reduce((s, p) => s + p.teamLeadBonus, 0);
    const sumOps = masterList.reduce((s, p) => s + p.operationsBonus, 0);
    const sumEvent = masterList.reduce((s, p) => s + p.eventTrainingBonus, 0);

    totalRow.values = [
      '',
      `TỔNG CỘNG (${masterList.length} nhân sự)`,
      '',
      '',
      '',
      sumTotal,
      sumSale,
      sumTeamLead,
      sumOps,
      sumEvent,
      '',
    ];
    totalRow.height = 28;
    totalRow.eachCell((cell, colNumber) => {
      cell.font = { bold: true, size: 11, color: { argb: 'FF0F172A' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: HIGHLIGHT_GOLD_ARGB } };
      cell.border = thinBorder;
      if (colNumber >= 6 && colNumber <= 10) {
        cell.alignment = { horizontal: 'right', vertical: 'middle' };
        cell.numFmt = '#,##0';
      } else {
        cell.alignment = { horizontal: 'left', vertical: 'middle' };
      }
    });

    // Khu vực chữ ký duyệt dưới cùng
    rowIndex += 3;
    s1.getRow(rowIndex).values = ['', 'NGƯỜI LẬP BÁO CÁO', '', '', 'KẾ TOÁN TRƯỞNG', '', '', '', 'GIÁM ĐỐC PHÊ DUYỆT'];
    s1.getRow(rowIndex).height = 20;
    for (const c of [2, 5, 9]) {
      const cell = s1.getRow(rowIndex).getCell(c);
      cell.font = { bold: true, size: 10, color: { argb: 'FF1E293B' } };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
    }

    rowIndex++;
    s1.getRow(rowIndex).values = ['', '(Ký, ghi rõ họ tên)', '', '', '(Ký, ghi rõ họ tên)', '', '', '', '(Ký, đóng dấu)'];
    s1.getRow(rowIndex).height = 18;
    for (const c of [2, 5, 9]) {
      const cell = s1.getRow(rowIndex).getCell(c);
      cell.font = { italic: true, size: 9, color: { argb: 'FF64748B' } };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
    }

    // -------------------------------------------------------------------------
    // SHEET 2: CHI TIẾT HOA HỒNG SALE & HỢP ĐỒNG
    // -------------------------------------------------------------------------
    const s2 = workbook.addWorksheet('1. Hoa hồng Sale & Hợp đồng', {
      views: [{ state: 'frozen', ySplit: 3 }],
    });
    s2.columns = [
      { width: 6 },  // STT
      { width: 14 }, // Mã HĐ
      { width: 14 }, // Ngày ký
      { width: 24 }, // Khách hàng
      { width: 18 }, // Giá trị HĐ
      { width: 18 }, // Giá trị phân bổ
      { width: 18 }, // Đội nhóm
      { width: 22 }, // Closer (Sale chính)
      { width: 16 }, // Phí Closer
      { width: 22 }, // Người giới thiệu
      { width: 16 }, // Phí Giới thiệu
      { width: 22 }, // Người hỗ trợ
      { width: 16 }, // Phí Hỗ trợ
      { width: 14 }, // Trạng thái
    ];

    s2.mergeCells('A1:N1');
    s2.getCell('A1').value = `DANH SÁCH HỢP ĐỒNG & PHÂN BỔ HOA HỒNG — THÁNG ${targetMonth}`;
    s2.getCell('A1').font = { bold: true, size: 13, color: { argb: 'FFFFFFFF' } };
    s2.getCell('A1').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: DARK_BLUE_ARGB } };
    s2.getCell('A1').alignment = { horizontal: 'center', vertical: 'middle' };
    s2.getRow(1).height = 28;

    s2.getRow(3).values = [
      'STT', 'Mã HĐ', 'Ngày ký', 'Khách hàng', 'Giá trị HĐ', 'Giá trị phân bổ', 'Đội nhóm',
      'Closer (Sale chính)', 'Phí Closer', 'Người giới thiệu', 'Phí Giới thiệu', 'Người hỗ trợ', 'Phí Hỗ trợ', 'Trạng thái'
    ];
    s2.getRow(3).height = 24;
    s2.getRow(3).eachCell((cell, col) => {
      cell.font = { bold: true, size: 9, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: HEADER_FILL_ARGB } };
      cell.alignment = { horizontal: col === 1 || col === 2 || col === 3 || col === 14 ? 'center' : col === 5 || col === 6 || col === 9 || col === 11 || col === 13 ? 'right' : 'left', vertical: 'middle' };
      cell.border = thinBorder;
    });

    let s2Idx = 4;
    for (let i = 0; i < contracts.length; i++) {
      const c = contracts[i];
      const r = s2.getRow(s2Idx++);
      r.values = [
        i + 1,
        c.contract_code || `HĐ #${c.id}`,
        c.contract_date || '—',
        c.customer_name || '—',
        c.value || 0,
        c.allocated_value || 0,
        c.team_name || '—',
        c.closer_name || '—',
        c.closer_fee || 0,
        c.referrer_name || '—',
        c.referrer_fee || 0,
        c.supporter_name || '—',
        c.supporter_fee || 0,
        c.status || '—',
      ];
      r.height = 20;
      r.eachCell((cell, col) => {
        cell.border = thinBorder;
        cell.font = { size: 9 };
        if (col === 5 || col === 6 || col === 9 || col === 11 || col === 13) {
          cell.alignment = { horizontal: 'right', vertical: 'middle' };
          cell.numFmt = '#,##0';
        } else if (col === 1 || col === 2 || col === 3 || col === 14) {
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
        }
      });
    }

    // -------------------------------------------------------------------------
    // SHEET 3: CHI TIẾT PHÂN BỔ QUỸ TEAMLEADER
    // -------------------------------------------------------------------------
    const s3 = workbook.addWorksheet('2. Phân bổ Quỹ TeamLead', {
      views: [{ state: 'frozen', ySplit: 3 }],
    });
    s3.columns = [
      { width: 6 },  // STT
      { width: 24 }, // Thành viên
      { width: 16 }, // SĐT
      { width: 18 }, // Đội nhóm
      { width: 18 }, // Chức danh
      { width: 18 }, // Doanh số đội
      { width: 18 }, // Tiền Quỹ 70%
      { width: 18 }, // Tiền Quỹ 30%
      { width: 22 }, // TỔNG NHẬN KỲ
    ];

    s3.mergeCells('A1:I1');
    s3.getCell('A1').value = `CHI TIẾT PHÂN BỔ QUỸ TEAMLEAD (70% & 30%) — THÁNG ${targetMonth}`;
    s3.getCell('A1').font = { bold: true, size: 13, color: { argb: 'FFFFFFFF' } };
    s3.getCell('A1').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: DARK_BLUE_ARGB } };
    s3.getCell('A1').alignment = { horizontal: 'center', vertical: 'middle' };
    s3.getRow(1).height = 28;

    s3.getRow(3).values = [
      'STT', 'Thành viên', 'Số điện thoại', 'Đội nhóm', 'Chức danh', 'Doanh số đội cơ sở', 'Tiền Quỹ 70%', 'Tiền Quỹ 30%', 'TỔNG THỰC NHẬN'
    ];
    s3.getRow(3).height = 24;
    s3.getRow(3).eachCell((cell, col) => {
      cell.font = { bold: true, size: 9, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: HEADER_FILL_ARGB } };
      cell.alignment = { horizontal: col === 1 || col === 3 ? 'center' : col >= 6 ? 'right' : 'left', vertical: 'middle' };
      cell.border = thinBorder;
    });

    let s3Idx = 4;
    for (let i = 0; i < teamLeadRows.length; i++) {
      const r = teamLeadRows[i];
      const row = s3.getRow(s3Idx++);
      const rowTotal = Number(r.total || (Number(r.payout30 || 0) + Number(r.payout70 || 0)));
      row.values = [
        i + 1,
        r.memberName || '—',
        r.memberPhone || '—',
        r.teamName || 'Chưa gán đội',
        r.role || 'Thành viên',
        Number(r.salesBasis || 0),
        Number(r.payout70 || 0),
        Number(r.payout30 || 0),
        rowTotal,
      ];
      row.height = 20;
      row.eachCell((cell, col) => {
        cell.border = thinBorder;
        cell.font = { size: 9 };
        if (col >= 6) {
          cell.alignment = { horizontal: 'right', vertical: 'middle' };
          cell.numFmt = '#,##0';
        } else if (col === 1 || col === 3) {
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
        }
      });
    }

    // -------------------------------------------------------------------------
    // SHEET 4: CHI TIẾT QUỸ VẬN HÀNH & BAN HỖ TRỢ
    // -------------------------------------------------------------------------
    const s4 = workbook.addWorksheet('3. Ban hỗ trợ & Vận hành', {
      views: [{ state: 'frozen', ySplit: 3 }],
    });
    s4.columns = [
      { width: 6 },  // STT
      { width: 14 }, // Mã phiếu
      { width: 14 }, // Ngày chi
      { width: 22 }, // Loại quỹ
      { width: 28 }, // Nội dung chi tiết
      { width: 24 }, // Người thụ hưởng
      { width: 16 }, // SĐT
      { width: 18 }, // Số tài khoản
      { width: 18 }, // Ngân hàng
      { width: 20 }, // Số tiền (VND)
      { width: 14 }, // Trạng thái
    ];

    s4.mergeCells('A1:K1');
    s4.getCell('A1').value = `NHẬT KÝ CHI GIẢI NGÂN BAN HỖ TRỢ & VẬN HÀNH — THÁNG ${targetMonth}`;
    s4.getCell('A1').font = { bold: true, size: 13, color: { argb: 'FFFFFFFF' } };
    s4.getCell('A1').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: DARK_BLUE_ARGB } };
    s4.getCell('A1').alignment = { horizontal: 'center', vertical: 'middle' };
    s4.getRow(1).height = 28;

    s4.getRow(3).values = [
      'STT', 'Mã phiếu', 'Ngày chi', 'Nguồn quỹ', 'Hạng mục / Nội dung chi',
      'Người thụ hưởng', 'Số điện thoại', 'Số tài khoản', 'Ngân hàng', 'Số tiền (VND)', 'Trạng thái'
    ];
    s4.getRow(3).height = 24;
    s4.getRow(3).eachCell((cell, col) => {
      cell.font = { bold: true, size: 9, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: HEADER_FILL_ARGB } };
      cell.alignment = { horizontal: col === 1 || col === 2 || col === 3 || col === 7 || col === 11 ? 'center' : col === 10 ? 'right' : 'left', vertical: 'middle' };
      cell.border = thinBorder;
    });

    let s4Idx = 4;
    for (let i = 0; i < logs.length; i++) {
      const l = logs[i];
      const r = s4.getRow(s4Idx++);
      r.values = [
        i + 1,
        l.request_code || `YC #${l.id}`,
        l.payment_date || l.request_date || '—',
        l.fund_source || 'Quỹ Vận hành',
        l.detail_content || '—',
        l.beneficiary_name || '—',
        l.beneficiary_phone || '—',
        l.beneficiary_bank_account || '—',
        l.beneficiary_bank_name || '—',
        Number(l.amount || 0),
        l.status || '—',
      ];
      r.height = 20;
      r.eachCell((cell, col) => {
        cell.border = thinBorder;
        cell.font = { size: 9 };
        if (col === 10) {
          cell.alignment = { horizontal: 'right', vertical: 'middle' };
          cell.numFmt = '#,##0';
        } else if (col === 1 || col === 2 || col === 3 || col === 7 || col === 11) {
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
        }
      });
    }

    // Xuất file Buffer trả về Client
    const buffer = await workbook.xlsx.writeBuffer();
    const fileName = `Bao-cao-tong-hop-tat-ca-cac-quy-Thang-${targetMonth}.xlsx`;

    return new Response(new Uint8Array(buffer) as unknown as BodyInit, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${fileName}"; filename*=UTF-8''${encodeURIComponent(fileName)}`,
        'Cache-Control': 'no-store, must-revalidate',
      },
    });
  } catch (error) {
    console.error('Failed to export all funds report:', error);
    return Response.json({ error: 'Không thể xuất báo cáo tổng hợp tất cả các quỹ.' }, { status: 500 });
  }
}
