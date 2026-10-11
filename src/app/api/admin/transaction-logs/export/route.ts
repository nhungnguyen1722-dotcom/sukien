import { NextRequest } from 'next/server';
import path from 'node:path';
import fs from 'node:fs';
import * as XLSX from 'xlsx';
import ExcelJS from 'exceljs';
import pool from '@/lib/db';
import { loadSeptemberContractDistributions } from '@/lib/contractDistributionWorkbooks';
import { sanitizeVietnameseText } from '@/lib/nameSanitizer';
import {
  createStyledWeeklySheet,
  createStyledMonthlySheet,
  WeeklyReportData,
  MonthlyReportData,
  WeeklyFundRow,
  WeeklyContractMatrixRow,
  MonthlyRecipientRow,
  WeeklyPersonMatrixData,
  STANDARD_RATES,
  formatRateText,
} from '@/lib/excelExportStyles';

export const dynamic = 'force-dynamic';

function parseWeeklySheetFromFile(filePath: string, sheetName: string, weekLabel: string): WeeklyReportData | null {
  try {
    if (!fs.existsSync(filePath)) return null;
    const fileBuffer = fs.readFileSync(filePath);
    const wb = XLSX.read(fileBuffer, { type: 'buffer', cellDates: false });
    const sheet = wb.Sheets[sheetName];
    if (!sheet) return null;

    const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: '' });

    // 1. Tìm dòng Doanh số HĐ (100%)
    const salesRowIdx = rows.findIndex((r) => r.some((c) => String(c).includes('Doanh số HĐ')));
    if (salesRowIdx < 0) return null;
    const salesRow = rows[salesRowIdx];
    const salesBase = Number(salesRow.find((c) => typeof c === 'number' && c > 1000000)) || 0;

    // 2. Tìm dòng Tổng qũy của bảng 1
    const totalFundIdx = rows.findIndex((r, i) => i > salesRowIdx && r.some((c) => String(c).trim().toLowerCase().startsWith('tổng q')));
    if (totalFundIdx < 0) return null;
    const totalFundRow = rows[totalFundIdx];

    const funds: WeeklyFundRow[] = [];
    for (let r = salesRowIdx + 1; r < totalFundIdx; r++) {
      const row = rows[r];
      if (!row[0]) continue;
      const rateVal = typeof row[4] === 'number' ? row[4] : 0;
      funds.push({
        name: String(row[0]).trim(),
        rate: rateVal,
        rateText: formatRateText(rateVal),
        allocated: Number(row[5]) || 0,
        spent: Number(row[6]) || 0,
        remaining: Number(row[7]) || 0,
      });
    }

    // 3. Tìm Person Matrix ("Họ tên/Hợp đồng") nếu có (như Tuần 1 T10 và Tuần 5 T9)
    const personHeaderIdx = rows.findIndex((r) => r.some((c) => String(c).toLowerCase().includes('họ tên/hợp đồng') || String(c).toLowerCase().includes('họ tên / hợp đồng')));
    let personMatrix: WeeklyPersonMatrixData | null = null;

    if (personHeaderIdx >= 0) {
      const pHeaderRow = rows[personHeaderIdx];
      const startCol = pHeaderRow.findIndex((c) => String(c).toLowerCase().includes('họ tên'));
      const headers: { colIdx: number; text: string }[] = [];
      for (let c = startCol; c < pHeaderRow.length; c++) {
        const val = String(pHeaderRow[c] || '').trim();
        if (val) headers.push({ colIdx: c, text: val });
      }

      const pRows = [];
      const pSummaries = [];

      for (let r = personHeaderIdx + 1; r < rows.length; r++) {
        const row = rows[r];
        const firstCell = String(row[startCol] || '').trim();
        if (!firstCell) continue;

        if (firstCell.toLowerCase().startsWith('tổng quỹ') || firstCell.toLowerCase().startsWith('tổng hoa hồng') || firstCell.toLowerCase().startsWith('tổng')) {
          pSummaries.push({
            label: firstCell,
            values: headers.slice(1).map((h) => Number(row[h.colIdx]) || 0),
          });
          continue;
        }

        if (firstCell.toLowerCase().includes('người lập') || firstCell.toLowerCase().includes('chủ tịch') || firstCell.toLowerCase().includes('giám đốc')) {
          break;
        }

        const amounts = headers.slice(1, -1).map((h) => {
          const v = row[h.colIdx];
          if (typeof v === 'number') return v;
          if (typeof v === 'string' && v.trim() !== '') {
            const parsed = Number(v.replace(/[^0-9.-]+/g, ''));
            return isNaN(parsed) ? null : parsed;
          }
          return null;
        });
        const lastH = headers[headers.length - 1];
        const totalSpent = Number(row[lastH.colIdx]) || 0;

        pRows.push({
          info: firstCell,
          amounts,
          totalSpent,
        });
      }

      personMatrix = {
        titleColumn: headers[0].text,
        columns: headers.slice(1, -1).map((h) => h.text),
        totalColumn: headers[headers.length - 1].text,
        rows: pRows,
        summaries: pSummaries,
      };
    }

    // 4. Tìm Contract Matrix (Row chứa "STT" và "Hợp đồng")
    let contractRows: WeeklyContractMatrixRow[] = [];
    let beneficiaryColumns: { name: string; bankAccount?: string; bankName?: string }[] = [];
    let beneficiaryTotals: number[] = [];
    let matrixTotalPool = 0;
    let matrixTotalDistributed = 0;
    let matrixTotalRemaining = 0;

    const sttHeaderIdx = rows.findIndex((r) => r.some((c) => String(c).trim() === 'STT') && r.some((c) => String(c).toLowerCase().includes('hợp đồng')));
    if (sttHeaderIdx >= 0) {
      const sHeaderRow = rows[sttHeaderIdx];
      const poolIdx = sHeaderRow.findIndex((c) => String(c).includes('Tổng quỹ chưa chia'));
      const endBenCol = poolIdx > 0 ? poolIdx : sHeaderRow.length;

      beneficiaryColumns = sHeaderRow.slice(2, endBenCol).map((c) => {
        const parts = String(c).split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
        return {
          name: parts[0] || '',
          bankAccount: (parts[1] || '').replace(/^STK:\s*/i, '').trim(),
          bankName: parts[2] || '',
        };
      });

      const matrixTotalIdx = rows.findIndex((r, i) => i > sttHeaderIdx && String(r[0]).trim() === 'Tổng');
      const limit = matrixTotalIdx > 0 ? matrixTotalIdx : (personHeaderIdx > sttHeaderIdx ? personHeaderIdx : rows.length);
      for (let r = sttHeaderIdx + 1; r < limit; r++) {
        const row = rows[r];
        if (!row[0] && !row[1]) continue;
        if (String(row[0]).trim().toLowerCase().includes('người lập')) break;
        contractRows.push({
          stt: row[0] as number | string,
          contractDesc: String(row[1] || '').trim(),
          beneficiaryAmounts: row.slice(2, endBenCol).map((v) => (typeof v === 'number' ? v : null)),
          unallocatedPool: poolIdx > 0 ? (Number(row[poolIdx]) || 0) : 0,
          distributedCommission: poolIdx > 0 ? (Number(row[poolIdx + 1]) || 0) : 0,
          remainingFund: poolIdx > 0 ? (Number(row[poolIdx + 2]) || 0) : 0,
        });
      }

      const matrixTotalRow = matrixTotalIdx > 0 ? rows[matrixTotalIdx] : [];
      beneficiaryTotals = matrixTotalRow.slice(2, endBenCol).map((v) => Number(v) || 0);
      if (poolIdx > 0) {
        matrixTotalPool = Number(matrixTotalRow[poolIdx]) || 0;
        matrixTotalDistributed = Number(matrixTotalRow[poolIdx + 1]) || 0;
        matrixTotalRemaining = Number(matrixTotalRow[poolIdx + 2]) || 0;
      }
    }



    return {
      periodCode: '',
      weekLabel,
      salesBase,
      funds,
      totalAllocated: Number(totalFundRow[5]) || 0,
      totalSpent: Number(totalFundRow[6]) || 0,
      totalRemaining: Number(totalFundRow[7]) || 0,
      personMatrix,
      beneficiaryColumns,
      contractRows,
      beneficiaryTotals,
      matrixTotalPool,
      matrixTotalDistributed,
      matrixTotalRemaining,
    };
  } catch (err) {
    console.warn(`Error parsing weekly file ${filePath}:`, err);
    return null;
  }
}

function parseMonthlySheetFromFile(filePath: string, sheetName: string, month: string): MonthlyReportData | null {
  try {
    if (!fs.existsSync(filePath)) return null;
    const fileBuffer = fs.readFileSync(filePath);
    const wb = XLSX.read(fileBuffer, { type: 'buffer', cellDates: false });
    const sheet = wb.Sheets[sheetName];
    if (!sheet) return null;

    const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: '' });

    const salesRowIdx = rows.findIndex((r) => r.some((c) => String(c).includes('Doanh số HĐ')));
    if (salesRowIdx < 0) return null;
    const salesRow = rows[salesRowIdx];
    const salesBase = Number(salesRow.find((c) => typeof c === 'number' && c > 1000000)) || 0;

    const totalFundIdx = rows.findIndex((r, i) => i > salesRowIdx && r.some((c) => String(c).trim().toLowerCase().startsWith('tổng q')));
    if (totalFundIdx < 0) return null;
    const totalFundRow = rows[totalFundIdx];

    const funds: WeeklyFundRow[] = [];
    for (let r = salesRowIdx + 1; r < totalFundIdx; r++) {
      const row = rows[r];
      if (!row[0]) continue;
      const rateVal = typeof row[4] === 'number' ? row[4] : 0;
      funds.push({
        name: String(row[0]).trim(),
        rate: rateVal,
        rateText: formatRateText(rateVal),
        allocated: Number(row[5]) || 0,
        spent: Number(row[6]) || 0,
        remaining: Number(row[7]) || 0,
      });
    }

    const recHeaderIdx = rows.findIndex((r) => r.some((c) => String(c).includes('Mã Người nhận')));
    const recipients: MonthlyRecipientRow[] = [];
    if (recHeaderIdx >= 0) {
      for (let r = recHeaderIdx + 1; r < rows.length; r++) {
        const row = rows[r];
        const stt = typeof row[0] === 'number' ? row[0] : parseInt(String(row[0]), 10);
        if (!isNaN(stt) && stt > 0 && (row[2] || row[5] || row[7])) {
          recipients.push({
            stt,
            code: String(row[1] || '').trim(),
            info: String(row[2] || '').trim(),
            details: String(row[5] || '').trim(),
            totalAmount: Number(row[7]) || 0,
          });
        }
      }
    }

    return {
      month,
      startDate: '01/09/2026',
      endDate: '02/10/2026',
      salesBase,
      funds,
      totalAllocated: Number(totalFundRow[5]) || 0,
      totalSpent: Number(totalFundRow[6]) || 0,
      totalRemaining: Number(totalFundRow[7]) || 0,
      recipients,
    };
  } catch (err) {
    console.warn(`Error parsing monthly file ${filePath}:`, err);
    return null;
  }
}

async function getContractsAndMembers() {
  const [contractsRes, membersRes] = await Promise.all([
    pool.query(`
      SELECT
        c.id, c.contract_code, c.contract_date::text AS contract_date,
        c.customer_name, c.value, c.allocated_value,
        c.closer_id, c.closer_name, c.closer_phone, c.closer_fee,
        c.referrer_id, c.referrer_name, c.referrer_phone, c.referrer_fee,
        c.supporter_id, c.supporter_name, c.supporter_phone, c.supporter_fee,
        c.status, c.team_name
      FROM contracts c
      ORDER BY c.contract_date DESC NULLS LAST, c.id DESC
    `),
    pool.query(`
      SELECT u.id, u.full_name, u.phone, u.bank_account
      FROM users u
      ORDER BY u.full_name ASC
    `),
  ]);

  const databaseContracts = contractsRes.rows.map((row) => ({
    ...row,
    customer_name: sanitizeVietnameseText(row.customer_name),
    closer_name: sanitizeVietnameseText(row.closer_name),
    referrer_name: sanitizeVietnameseText(row.referrer_name),
    supporter_name: sanitizeVietnameseText(row.supporter_name),
    team_name: sanitizeVietnameseText(row.team_name),
    status: sanitizeVietnameseText(row.status),
  }));

  const memberNames = membersRes.rows.map((row) => sanitizeVietnameseText(row.full_name));

  return { databaseContracts, memberNames };
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const month = searchParams.get('month') || '2026-09';
    const periodCode = searchParams.get('period_code') || 'MONTH_OVERVIEW';

    const pCodeNorm = (periodCode || '').trim().toLowerCase();
    const isMonthOverview =
      !periodCode ||
      pCodeNorm === 'month_overview' ||
      pCodeNorm === '__month_overview__' ||
      pCodeNorm === 'all' ||
      pCodeNorm.includes('month') ||
      pCodeNorm.endsWith('-month');

    const workbook = new ExcelJS.Workbook();
    let exportFileName = '';

    if (isMonthOverview) {
      // ======================================================================
      // BÁO CÁO THÁNG (Cả tháng) - Chuẩn màu sắc tab "Chốt quỹ t9 (1.9-2.10)"
      // ======================================================================
      exportFileName = `Bao-cao-chot-quy-thang-${month}.xlsx`;

      let monthlyData: MonthlyReportData | null = null;
      if (month === '2026-09' || month.includes('09') || month.includes('-9')) {
        const monthFilePath = path.join(process.cwd(), 'imagedata', 'DN_thanh_toan_HH_T9_T10.xlsx');
        monthlyData = parseMonthlySheetFromFile(monthFilePath, 'Chốt quỹ t9 (1.9-2.10)', month);
      }

      if (!monthlyData) {
        // Tạo dữ liệu tháng động từ database
        const { databaseContracts, memberNames } = await getContractsAndMembers();
        const { contracts } = loadSeptemberContractDistributions(databaseContracts, memberNames);
        const monthContracts = contracts.filter((c) => c.contract_date.startsWith(month));
        const totalMonthRevenue = monthContracts.reduce((sum, c) => sum + (c.allocated_value || c.value || 0), 0);

        const fundAllocationsRes = await pool.query(
          `SELECT fund_key, SUM(requested_amount) as total_requested 
           FROM fund_weekly_allocations 
           WHERE period_month = $1 
           GROUP BY fund_key`,
          [month]
        );
        const requestedByFund: Record<string, number> = {};
        for (const row of fundAllocationsRes.rows) {
          requestedByFund[row.fund_key] = Number(row.total_requested || 0);
        }

        let sumAllocated = 0;
        let sumSpent = 0;
        const funds: WeeklyFundRow[] = [];

        for (const item of STANDARD_RATES) {
          const allocated = Math.round(totalMonthRevenue * item.rate);
          let spent = 0;
          if (item.key === 'leader_70') {
            spent = Math.round((requestedByFund['leader'] || 0) * 0.7);
          } else if (item.key === 'leader_30') {
            spent = Math.round((requestedByFund['leader'] || 0) * 0.3);
          } else {
            spent = requestedByFund[item.key] !== undefined ? requestedByFund[item.key] : allocated;
          }
          const remaining = allocated - spent;
          sumAllocated += allocated;
          sumSpent += spent;

          funds.push({
            name: item.name,
            rate: item.rate,
            allocated,
            spent,
            remaining,
          });
        }

        const personMap = new Map<string, {
          name: string;
          phone: string;
          bankAccount: string;
          bankName: string;
          lines: string[];
          totalAmount: number;
        }>();

        for (const contract of monthContracts) {
          for (const b of contract.source_beneficiaries || []) {
            const key = b.name.trim();
            if (!personMap.has(key)) {
              personMap.set(key, {
                name: b.name,
                phone: '',
                bankAccount: b.bank_account || '',
                bankName: b.bank_name || '',
                lines: [],
                totalAmount: 0,
              });
            }
            const p = personMap.get(key)!;
            p.totalAmount += b.amount;
            if (b.lines && b.lines.length) {
              for (const l of b.lines) {
                p.lines.push(`- ${l.source}: ${l.calculation}`);
              }
            } else {
              p.lines.push(`- Hoa hồng phân bổ: ${b.amount.toLocaleString('vi-VN')} đ`);
            }
          }
        }

        const recipients: MonthlyRecipientRow[] = [];
        let stt = 1;
        for (const [, p] of personMap) {
          const info = `${p.name}\nSTK: ${p.bankAccount || '—'}\n${p.bankName || '—'}`;
          const details = Array.from(new Set(p.lines)).join('\n');
          recipients.push({
            stt: stt++,
            code: p.phone || '—',
            info,
            details,
            totalAmount: p.totalAmount,
          });
        }

        monthlyData = {
          month,
          startDate: `01/${month.slice(5)}/${month.slice(0, 4)}`,
          endDate: `31/${month.slice(5)}/${month.slice(0, 4)}`,
          salesBase: totalMonthRevenue,
          funds,
          totalAllocated: sumAllocated,
          totalSpent: sumSpent,
          totalRemaining: sumAllocated - sumSpent,
          recipients,
        };
      }

      createStyledMonthlySheet(workbook, monthlyData, `Chốt quỹ tháng ${parseInt(month.slice(5), 10)}`);
    } else {
      // ======================================================================
      // BÁO CÁO TUẦN (Tuần cụ thể) - Chuẩn màu sắc tab "DNTT HH tuần 4 T9"
      // ======================================================================
      exportFileName = `DNTT-hoa-hong-${periodCode}.xlsx`;

      let weeklyData: WeeklyReportData | null = null;
      let sheetTitle = 'DNTT tuần';

      const pUpper = periodCode.toUpperCase().replace(/\s+/g, '');
      if (pUpper.includes('10') && (pUpper.includes('W1') || pUpper.includes('TUAN1') || pUpper.endsWith('-1') || pUpper.endsWith('_1'))) {
        const filePath = path.join(process.cwd(), 'imagedata', 'DN_thanh_toan_HH_Tuan1_T10.xlsx');
        sheetTitle = 'DNTT HH tuần 1 T10';
        weeklyData = parseWeeklySheetFromFile(filePath, sheetTitle, 'tuần 1 tháng 10');
      } else if (pUpper.includes('09') && (pUpper.includes('W5') || pUpper.includes('TUAN5') || pUpper.endsWith('-5') || pUpper.endsWith('_5'))) {
        const filePath = path.join(process.cwd(), 'imagedata', 'DN_thanh_toan_HH_Tuan5_T9.xlsx');
        sheetTitle = 'DNTT tuần 5 T9';
        weeklyData = parseWeeklySheetFromFile(filePath, sheetTitle, 'tuần 5 tháng 9');
      } else if (pUpper.includes('09') && (pUpper.includes('W4') || pUpper.includes('TUAN4') || pUpper.endsWith('-4') || pUpper.endsWith('_4'))) {
        const filePath = path.join(process.cwd(), 'imagedata', 'DN_thanh_toan_HH_Tuan4_T9.xlsx');
        sheetTitle = 'DNTT HH tuần 4 T9';
        weeklyData = parseWeeklySheetFromFile(filePath, sheetTitle, 'tuần 4 tháng 9');
      } else if (pUpper.includes('09') && (pUpper.includes('W3') || pUpper.includes('TUAN3') || pUpper.endsWith('-3') || pUpper.endsWith('_3'))) {
        const filePath = path.join(process.cwd(), 'imagedata', 'DN_thanh_toan_HH_Tuan3_T9.xlsx');
        sheetTitle = 'DN thanh toán HH tuần 3 T9';
        weeklyData = parseWeeklySheetFromFile(filePath, sheetTitle, 'tuần 3 tháng 9');
      }

      if (!weeklyData) {
        // Tạo dữ liệu tuần động từ database
        const { databaseContracts, memberNames } = await getContractsAndMembers();
        const { contracts } = loadSeptemberContractDistributions(databaseContracts, memberNames);
        const weekContracts = contracts.filter((c) => c.source_period_code === periodCode);
        const totalWeekRevenue = weekContracts.reduce((sum, c) => sum + (c.allocated_value || c.value || 0), 0);

        const weeklyFundRes = await pool.query(
          `SELECT fund_key, requested_amount 
           FROM fund_weekly_allocations 
           WHERE period_code = $1`,
          [periodCode]
        );
        const requestedByFund: Record<string, number> = {};
        for (const row of weeklyFundRes.rows) {
          requestedByFund[row.fund_key] = Number(row.requested_amount || 0);
        }

        let sumAllocated = 0;
        let sumSpent = 0;
        const funds: WeeklyFundRow[] = [];
        const WEEK_RATES = STANDARD_RATES.filter((item) => item.key !== 'leader_70' && item.key !== 'leader_30');
        WEEK_RATES.push({ key: 'leader', name: 'Leader team - giám đốc Kd (2,9%)', rate: 0.029 });

        for (const item of WEEK_RATES) {
          const allocated = Math.round(totalWeekRevenue * item.rate);
          const spent = requestedByFund[item.key] !== undefined ? requestedByFund[item.key] : allocated;
          const remaining = allocated - spent;
          sumAllocated += allocated;
          sumSpent += spent;

          funds.push({
            name: item.name,
            rate: item.rate,
            allocated,
            spent,
            remaining,
          });
        }

        const beneficiaryColumns: { name: string; bankAccount?: string; bankName?: string }[] = [];
        const seenRecipients = new Set<string>();

        for (const contract of weekContracts) {
          for (const b of contract.source_beneficiaries || []) {
            const key = b.name.trim();
            if (!seenRecipients.has(key)) {
              seenRecipients.add(key);
              beneficiaryColumns.push({
                name: b.name,
                bankAccount: b.bank_account || '',
                bankName: b.bank_name || '',
              });
            }
          }
        }

        const contractRows: WeeklyContractMatrixRow[] = [];
        const beneficiaryTotals = new Array(beneficiaryColumns.length).fill(0);
        let matrixTotalPool = 0;
        let matrixTotalDistributed = 0;
        let matrixTotalRemaining = 0;

        weekContracts.forEach((contract, idx) => {
          const contractDesc = `Ngày ${contract.contract_date}\nKH: ${contract.customer_name}\nGiá trị: ${Number(contract.allocated_value || contract.value).toLocaleString('vi-VN')} đ`;
          const benMap = new Map((contract.source_beneficiaries || []).map((b) => [b.name.trim(), b.amount]));
          let contractTotalShared = 0;

          const beneficiaryAmounts = beneficiaryColumns.map((r, rIdx) => {
            const amt = benMap.get(r.name.trim()) || 0;
            beneficiaryTotals[rIdx] += amt;
            contractTotalShared += amt;
            return amt > 0 ? amt : null;
          });

          const pool15 = Math.round((contract.allocated_value || contract.value) * 0.15);
          const rem = pool15 - contractTotalShared;

          matrixTotalPool += pool15;
          matrixTotalDistributed += contractTotalShared;
          matrixTotalRemaining += rem;

          contractRows.push({
            stt: idx + 1,
            contractDesc,
            beneficiaryAmounts,
            unallocatedPool: pool15,
            distributedCommission: contractTotalShared,
            remainingFund: rem,
          });
        });

        weeklyData = {
          periodCode,
          weekLabel: periodCode,
          salesBase: totalWeekRevenue,
          funds,
          totalAllocated: sumAllocated,
          totalSpent: sumSpent,
          totalRemaining: sumAllocated - sumSpent,
          personMatrix: null,
          beneficiaryColumns,
          contractRows,
          beneficiaryTotals,
          matrixTotalPool,
          matrixTotalDistributed,
          matrixTotalRemaining,
        };
      }

      createStyledWeeklySheet(workbook, weeklyData, sheetTitle);
    }

    const buffer = await workbook.xlsx.writeBuffer();
    const body = new Uint8Array(buffer);

    return new Response(body as unknown as BodyInit, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${exportFileName}"; filename*=UTF-8''${encodeURIComponent(exportFileName)}`,
        'Cache-Control': 'no-store, must-revalidate',
      },
    });
  } catch (error: any) {
    console.error('Error generating transaction log export:', error);
    return Response.json(
      { success: false, error: error.message || 'Không thể xuất báo cáo Excel.' },
      { status: 500 }
    );
  }
}
