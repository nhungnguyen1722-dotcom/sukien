import { NextRequest } from 'next/server';
import path from 'node:path';
import fs from 'node:fs';
import * as XLSX from 'xlsx';
import ExcelJS from 'exceljs';
import pool from '@/lib/db';
import { loadSeptemberContractDistributions, resolveWorkbookPath, WorkbookBeneficiary } from '@/lib/contractDistributionWorkbooks';
import { sanitizeVietnameseText } from '@/lib/nameSanitizer';
import { getMonthWeekRange } from '@/lib/weekRanges';
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

const MANUAL_PAID_FUND_KEYS = new Set(['event_close', 'customer_care', 'training', 'incentive', 'travel']);
const FUND_SOURCE_BY_KEY: Record<string, string> = {
  direct_sale: 'Sale trực tiếp - Pro sale (Nguồn khách)',
  tribute_connection: 'Tri ân kết nối sale trực tiếp',
  tribute_support: 'Tri ân hỗ trợ sale',
  event_close: 'Quỹ Sự kiện & Chốt hợp đồng',
  customer_care: 'Quỹ Chăm sóc khách hàng',
  training: 'Quỹ Đào tạo Chuyên môn & Kỹ năng',
  incentive: 'Quỹ Thi đua & Chương trình thúc đẩy',
  travel: 'Chi phí Công tác phí',
  operations: 'Quỹ Vận hành',
  support_kt: 'BP hỗ trợ KT',
  support_cn: 'BP hỗ trợ CN',
  leader: 'Leader team - giám đốc Kd',
};

function normalizeFundSource(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[đĐ]/g, 'd').trim().toLocaleLowerCase('vi');
}

function dbFundKey(fundKey: string) {
  return fundKey === 'leader_70' || fundKey === 'leader_30' ? 'leader' : fundKey;
}

function allocationRowsForFund<T extends { fund_key: string; fund_source?: string | null }>(rows: T[], fundKey: string) {
  const key = dbFundKey(fundKey);
  const source = FUND_SOURCE_BY_KEY[key];
  const normalizedSource = source ? normalizeFundSource(source) : '';
  return rows.filter((row) => row.fund_key === key || (normalizedSource && normalizeFundSource(row.fund_source || '') === normalizedSource));
}

function paidFromLogs(logs: Array<{ fund_source: string | null; amount: number | string }>, fundKey: string) {
  const source = FUND_SOURCE_BY_KEY[dbFundKey(fundKey)];
  const normalizedSource = source ? normalizeFundSource(source) : '';
  return logs
    .filter((log) => normalizedSource && normalizeFundSource(log.fund_source || '') === normalizedSource)
    .reduce((sum, log) => sum + Number(log.amount || 0), 0);
}

function monthlyPaidFromAllocations(
  rows: Array<{ fund_key: string; fund_source?: string | null; period_code: string; paid_amount: number | string | null }>,
  fundKey: string,
) {
  const records = allocationRowsForFund(rows, fundKey);
  const monthlyRecord = records.find((row) => row.period_code.endsWith('-MONTH'));
  if (Number(monthlyRecord?.paid_amount || 0) > 0) return Number(monthlyRecord?.paid_amount || 0);
  const weeklyRecords = records.filter((row) => !row.period_code.endsWith('-MONTH'));
  if (weeklyRecords.some((row) => Number(row.paid_amount || 0) > 0)) {
    return weeklyRecords.reduce((sum, row) => sum + Number(row.paid_amount || 0), 0);
  }
  return null;
}

function formatDateDMY(value: string) {
  const [year, month, day] = value.slice(0, 10).split('-');
  return `${day}/${month}/${year}`;
}

function periodRangeForExport(periodCode: string, fallbackMonth: string) {
  const match = periodCode.match(/(\d{4}-\d{2})-W([1-5])/i);
  if (match) return getMonthWeekRange(match[1], Number(match[2]));
  const weekMatch = periodCode.match(/W([1-5])|TUAN([1-5])/i);
  const monthMatch = periodCode.match(/(\d{4}-\d{2})|T(\d{1,2})/i);
  const month = monthMatch?.[1] || (monthMatch?.[2] ? `2026-${monthMatch[2].padStart(2, '0')}` : fallbackMonth);
  return weekMatch ? getMonthWeekRange(month, Number(weekMatch[1] || weekMatch[2])) : getMonthWeekRange(month);
}

async function loadPaidLogs(start: string, endExclusive: string) {
  const result = await pool.query(
    `SELECT fund_source, COALESCE(actual_expense, proposed_amount, 0)::float8 AS amount
     FROM transaction_logs
     WHERE status IN ('Đã chi', 'Đã thanh toán', 'Đã thực hiện')
       AND COALESCE(payment_date::date, request_date::date) >= $1::date
       AND COALESCE(payment_date::date, request_date::date) < $2::date`,
    [start, endExclusive],
  );
  return result.rows as Array<{ fund_source: string | null; amount: number | string }>;
}

function parseWeeklySheetFromFile(filePath: string | null | undefined, sheetName: string, weekLabel: string): WeeklyReportData | null {
  try {
    if (!filePath || !fs.existsSync(filePath)) return null;
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

function normalizeMemberHeaderName(value: string): string {
  return sanitizeVietnameseText(value)
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/\s+/g, ' ');
}

async function addMemberBankDetailsToWeeklyHeaders(data: WeeklyReportData): Promise<WeeklyReportData> {
  const columns = data.beneficiaryColumns || [];
  const hasDetail = (value?: string) => Boolean(value?.trim() && !['—', '-', 'n/a'].includes(value.trim().toLowerCase()));
  if (!data.contractRows?.length || !columns.some((person) => !hasDetail(person.bankAccount) || !hasDetail(person.bankName))) return data;

  const membersRes = await pool.query(`
    SELECT full_name, bank_account, bank_name
    FROM users
    WHERE full_name IS NOT NULL
      AND (NULLIF(BTRIM(bank_account), '') IS NOT NULL OR NULLIF(BTRIM(bank_name), '') IS NOT NULL)
  `);
  const detailsByName = new Map<string, { bankAccount: string; bankName: string }>();
  for (const row of membersRes.rows) {
    const key = normalizeMemberHeaderName(String(row.full_name || ''));
    if (!key) continue;
    const existing = detailsByName.get(key) || { bankAccount: '', bankName: '' };
    detailsByName.set(key, {
      bankAccount: existing.bankAccount || String(row.bank_account || '').trim(),
      bankName: existing.bankName || String(row.bank_name || '').trim(),
    });
  }

  return {
    ...data,
    beneficiaryColumns: columns.map((person) => {
      const details = detailsByName.get(normalizeMemberHeaderName(person.name));
      return {
        ...person,
        bankAccount: hasDetail(person.bankAccount) ? person.bankAccount : details?.bankAccount || '',
        bankName: hasDetail(person.bankName) ? person.bankName : details?.bankName || '',
      };
    }),
  };
}

function parseMonthlySheetFromFile(filePath: string | null | undefined, sheetName: string, month: string): MonthlyReportData | null {
  try {
    if (!filePath || !fs.existsSync(filePath)) return null;
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

    const monthRange = getMonthWeekRange(month);
    return {
      month,
      startDate: formatDateDMY(monthRange.start),
      endDate: formatDateDMY(monthRange.endInclusive),
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

async function getContractsAndMembers(start: string, endExclusive: string) {
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
      WHERE c.contract_date >= $1::date AND c.contract_date < $2::date
      ORDER BY c.contract_date DESC NULLS LAST, c.id DESC
    `, [start, endExclusive]),
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
      // September 2026 totals, including weeks 3–5, must come from contract records in Neon.
      if (month !== '2026-09' && (month.includes('09') || month.includes('-9'))) {
        const monthFilePath = resolveWorkbookPath('DN_thanh_toan_HH_T9_T10.xlsx');
        if (monthFilePath) {
          monthlyData = parseMonthlySheetFromFile(monthFilePath, 'Chốt quỹ t9 (1.9-2.10)', month);
        }
      }

      if (!monthlyData) {
        // Tạo dữ liệu tháng động từ database
        const monthRange = getMonthWeekRange(month);
        const { databaseContracts, memberNames } = await getContractsAndMembers(monthRange.start, monthRange.endExclusive);
        const { contracts } = loadSeptemberContractDistributions(databaseContracts, memberNames);
        let monthContracts = contracts.filter((c) => (
          c.contract_date >= monthRange.start && c.contract_date <= monthRange.endInclusive
        ));

        if (monthContracts.length === 0) {
          const rawMonthContracts = databaseContracts.filter((c) => (
            c.contract_date && c.contract_date >= monthRange.start && c.contract_date <= monthRange.endInclusive
          ));
          monthContracts = rawMonthContracts.map((c) => {
            const beneficiaries: WorkbookBeneficiary[] = [];
            if (c.closer_name && c.closer_fee > 0) {
              beneficiaries.push({
                name: c.closer_name,
                amount: Math.round(c.closer_fee),
                lines: [{ source: 'Hoa hồng Sale trực tiếp - Pro sale (6%)', amount: Math.round(c.closer_fee), calculation: `${Math.round(c.closer_fee).toLocaleString('vi-VN')} đ` }],
              });
            }
            if (c.referrer_name && c.referrer_fee > 0) {
              beneficiaries.push({
                name: c.referrer_name,
                amount: Math.round(c.referrer_fee),
                lines: [{ source: 'Hoa hồng Người giới thiệu (1%)', amount: Math.round(c.referrer_fee), calculation: `${Math.round(c.referrer_fee).toLocaleString('vi-VN')} đ` }],
              });
            }
            if (c.supporter_name && c.supporter_fee > 0) {
              beneficiaries.push({
                name: c.supporter_name,
                amount: Math.round(c.supporter_fee),
                lines: [{ source: 'Hoa hồng Người hỗ trợ (0,5%)', amount: Math.round(c.supporter_fee), calculation: `${Math.round(c.supporter_fee).toLocaleString('vi-VN')} đ` }],
              });
            }
            return {
              id: c.id,
              contract_code: c.contract_code,
              contract_date: c.contract_date,
              customer_name: c.customer_name,
              value: Number(c.value || 0),
              allocated_value: Number(c.allocated_value || c.value || 0),
              team_name: c.team_name,
              closer_name: c.closer_name,
              closer_phone: c.closer_phone,
              closer_fee: Number(c.closer_fee || 0),
              referrer_name: c.referrer_name,
              referrer_phone: c.referrer_phone,
              referrer_fee: Number(c.referrer_fee || 0),
              supporter_name: c.supporter_name,
              supporter_phone: c.supporter_phone,
              supporter_fee: Number(c.supporter_fee || 0),
              status: c.status,
              source_period_code: '',
              source_excel_row: 0,
              source_sheet: 'Database',
              source_beneficiaries: beneficiaries,
              unallocated_pool: Math.round(Number(c.allocated_value || c.value || 0) * 0.15),
              distributed_commission: beneficiaries.reduce((s, b) => s + b.amount, 0),
              remaining_fund: Math.round(Number(c.allocated_value || c.value || 0) * 0.15) - beneficiaries.reduce((s, b) => s + b.amount, 0),
            };
          });
        }

        const totalMonthRevenue = monthContracts.reduce((sum, c) => sum + (c.allocated_value || c.value || 0), 0);

        const [fundAllocationsRes, paidLogs] = await Promise.all([
          pool.query(
          `SELECT period_code, fund_key, fund_source, COALESCE(paid_amount, 0)::float8 AS paid_amount
           FROM fund_weekly_allocations 
           WHERE period_month = $1`,
          [month]
          ),
          loadPaidLogs(monthRange.start, monthRange.endExclusive),
        ]);
        const allocations = fundAllocationsRes.rows as Array<{
          period_code: string;
          fund_key: string;
          fund_source: string | null;
          paid_amount: number | string | null;
        }>;

        let sumAllocated = 0;
        let sumSpent = 0;
        const funds: WeeklyFundRow[] = [];

        for (const item of STANDARD_RATES) {
          const allocated = Math.round(totalMonthRevenue * item.rate);
          const sourceKey = dbFundKey(item.key);
          const allocationPaid = monthlyPaidFromAllocations(allocations, sourceKey);
          let spent = 0;
          if (item.key === 'leader_70') {
            spent = Math.round(Number(allocationPaid ?? paidFromLogs(paidLogs, 'leader')) * 0.7);
          } else if (item.key === 'leader_30') {
            spent = Math.round(Number(allocationPaid ?? paidFromLogs(paidLogs, 'leader')) * 0.3);
          } else {
            spent = allocationPaid !== null
              ? allocationPaid
              : MANUAL_PAID_FUND_KEYS.has(item.key) ? 0 : paidFromLogs(paidLogs, item.key);
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
          startDate: formatDateDMY(monthRange.start),
          endDate: formatDateDMY(monthRange.endInclusive),
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
      // Keep September weeks 3–5 on the database-generated export path.
      const isDatabaseOnlySeptemberWeek = /^2026-09-W[345]$/i.test(periodCode);
      const isDatabaseOnlyOctoberWeekOne = /^2026-10-W1$/i.test(periodCode);
      if (!isDatabaseOnlySeptemberWeek && !isDatabaseOnlyOctoberWeekOne && pUpper.includes('10') && (pUpper.includes('W1') || pUpper.includes('TUAN1') || pUpper.endsWith('-1') || pUpper.endsWith('_1'))) {
        const filePath = resolveWorkbookPath('DN_thanh_toan_HH_Tuan1_T10.xlsx');
        sheetTitle = 'DNTT HH tuần 1 T10';
        if (filePath) weeklyData = parseWeeklySheetFromFile(filePath, sheetTitle, 'tuần 1 tháng 10');
      } else if (!isDatabaseOnlySeptemberWeek && !isDatabaseOnlyOctoberWeekOne && pUpper.includes('09') && (pUpper.includes('W5') || pUpper.includes('TUAN5') || pUpper.endsWith('-5') || pUpper.endsWith('_5'))) {
        const filePath = resolveWorkbookPath('DN_thanh_toan_HH_Tuan5_T9.xlsx');
        sheetTitle = 'DNTT tuần 5 T9';
        if (filePath) weeklyData = parseWeeklySheetFromFile(filePath, sheetTitle, 'tuần 5 tháng 9');
      } else if (!isDatabaseOnlySeptemberWeek && !isDatabaseOnlyOctoberWeekOne && pUpper.includes('09') && (pUpper.includes('W4') || pUpper.includes('TUAN4') || pUpper.endsWith('-4') || pUpper.endsWith('_4'))) {
        const filePath = resolveWorkbookPath('DN_thanh_toan_HH_Tuan4_T9.xlsx');
        sheetTitle = 'DNTT HH tuần 4 T9';
        if (filePath) weeklyData = parseWeeklySheetFromFile(filePath, sheetTitle, 'tuần 4 tháng 9');
      } else if (!isDatabaseOnlySeptemberWeek && !isDatabaseOnlyOctoberWeekOne && pUpper.includes('09') && (pUpper.includes('W3') || pUpper.includes('TUAN3') || pUpper.endsWith('-3') || pUpper.endsWith('_3'))) {
        const filePath = resolveWorkbookPath('DN_thanh_toan_HH_Tuan3_T9.xlsx');
        sheetTitle = 'DN thanh toán HH tuần 3 T9';
        if (filePath) weeklyData = parseWeeklySheetFromFile(filePath, sheetTitle, 'tuần 3 tháng 9');
      }

      if (!weeklyData) {
        // Tạo dữ liệu tuần động từ database
        const weekRange = periodRangeForExport(periodCode, month);
        const { databaseContracts, memberNames } = await getContractsAndMembers(weekRange.start, weekRange.endExclusive);
        const { contracts } = loadSeptemberContractDistributions(databaseContracts, memberNames);
        let weekContracts = contracts.filter((c) => c.source_period_code === periodCode);

        if (weekContracts.length === 0) {
          const rawWeekContracts = databaseContracts.filter((c) => c.contract_date && c.contract_date >= weekRange.start && c.contract_date < weekRange.endExclusive);
          weekContracts = rawWeekContracts.map((c) => {
            const beneficiaries: WorkbookBeneficiary[] = [];
            if (c.closer_name && c.closer_fee > 0) {
              beneficiaries.push({ name: c.closer_name, amount: Math.round(c.closer_fee), lines: [{ source: 'Hoa hồng Sale trực tiếp - Pro sale (6%)', amount: Math.round(c.closer_fee), calculation: `${Math.round(c.closer_fee).toLocaleString('vi-VN')} đ` }] });
            }
            if (c.referrer_name && c.referrer_fee > 0) {
              beneficiaries.push({ name: c.referrer_name, amount: Math.round(c.referrer_fee), lines: [{ source: 'Hoa hồng Người giới thiệu (1%)', amount: Math.round(c.referrer_fee), calculation: `${Math.round(c.referrer_fee).toLocaleString('vi-VN')} đ` }] });
            }
            if (c.supporter_name && c.supporter_fee > 0) {
              beneficiaries.push({ name: c.supporter_name, amount: Math.round(c.supporter_fee), lines: [{ source: 'Hoa hồng Người hỗ trợ (0,5%)', amount: Math.round(c.supporter_fee), calculation: `${Math.round(c.supporter_fee).toLocaleString('vi-VN')} đ` }] });
            }
            return {
              id: c.id,
              contract_code: c.contract_code,
              contract_date: c.contract_date,
              customer_name: c.customer_name,
              value: Number(c.value || 0),
              allocated_value: Number(c.allocated_value || c.value || 0),
              team_name: c.team_name,
              closer_name: c.closer_name,
              closer_phone: c.closer_phone,
              closer_fee: Number(c.closer_fee || 0),
              referrer_name: c.referrer_name,
              referrer_phone: c.referrer_phone,
              referrer_fee: Number(c.referrer_fee || 0),
              supporter_name: c.supporter_name,
              supporter_phone: c.supporter_phone,
              supporter_fee: Number(c.supporter_fee || 0),
              status: c.status,
              source_period_code: periodCode,
              source_excel_row: 0,
              source_sheet: 'Database',
              source_beneficiaries: beneficiaries,
              unallocated_pool: Math.round(Number(c.allocated_value || c.value || 0) * 0.15),
              distributed_commission: beneficiaries.reduce((s, b) => s + b.amount, 0),
              remaining_fund: Math.round(Number(c.allocated_value || c.value || 0) * 0.15) - beneficiaries.reduce((s, b) => s + b.amount, 0),
            };
          });
        }

        const totalWeekRevenue = weekContracts.reduce((sum, c) => sum + (c.allocated_value || c.value || 0), 0);

        const [weeklyFundRes, paidLogs] = await Promise.all([
          pool.query(
          `SELECT fund_key, fund_source, COALESCE(paid_amount, 0)::float8 AS paid_amount
           FROM fund_weekly_allocations 
           WHERE period_code = $1`,
          [periodCode]
          ),
          loadPaidLogs(weekRange.start, weekRange.endExclusive),
        ]);
        const allocations = weeklyFundRes.rows as Array<{
          fund_key: string;
          fund_source: string | null;
          paid_amount: number | string | null;
        }>;

        let sumAllocated = 0;
        let sumSpent = 0;
        const funds: WeeklyFundRow[] = [];
        const WEEK_RATES = STANDARD_RATES.filter((item) => item.key !== 'leader_70' && item.key !== 'leader_30');
        WEEK_RATES.push({ key: 'leader', name: 'Leader team - giám đốc Kd (2,9%)', rate: 0.029 });

        for (const item of WEEK_RATES) {
          const allocated = Math.round(totalWeekRevenue * item.rate);
          const allocation = allocationRowsForFund(allocations, item.key)[0];
          const paidAmount = Number(allocation?.paid_amount || 0);
          const spent = MANUAL_PAID_FUND_KEYS.has(item.key)
            ? paidAmount
            : paidAmount > 0 ? paidAmount : paidFromLogs(paidLogs, item.key);
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

      weeklyData = await addMemberBankDetailsToWeeklyHeaders(weeklyData);
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
