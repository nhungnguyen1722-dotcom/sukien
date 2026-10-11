import { NextRequest, NextResponse } from 'next/server';
import path from 'node:path';
import fs from 'node:fs';
import * as XLSX from 'xlsx';
import pool from '@/lib/db';
import { loadSeptemberContractDistributions } from '@/lib/contractDistributionWorkbooks';
import { sanitizeVietnameseText } from '@/lib/nameSanitizer';

export const dynamic = 'force-dynamic';

const STANDARD_RATES = [
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

function formatVND(value: number): string {
  return Math.round(value).toLocaleString('vi-VN') + ' đ';
}

function tryReadExactSheet(fileName: string, sheetName: string): XLSX.WorkSheet | null {
  try {
    const filePath = path.join(process.cwd(), 'imagedata', fileName);
    if (!fs.existsSync(filePath)) return null;
    const fileBuffer = fs.readFileSync(filePath);
    const wb = XLSX.read(fileBuffer, { type: 'buffer', cellDates: false });
    if (wb.Sheets[sheetName]) {
      return wb.Sheets[sheetName];
    }
  } catch (err) {
    console.warn(`Could not read ${sheetName} from ${fileName}:`, err);
  }
  return null;
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

    const isMonthOverview = !periodCode || periodCode === 'MONTH_OVERVIEW' || periodCode === 'ALL' || periodCode.endsWith('-MONTH');

    const workbook = XLSX.utils.book_new();
    let exportFileName = '';

    if (isMonthOverview) {
      // BÁO CÁO THÁNG (Cả tháng)
      exportFileName = `Bao-cao-chot-quy-thang-${month}.xlsx`;

      // Ưu tiên trích xuất từ file nguồn mẫu nếu là tháng 9
      let sheet: XLSX.WorkSheet | null = null;
      if (month === '2026-09') {
        sheet = tryReadExactSheet('DN_thanh_toan_HH_T9_T10.xlsx', 'Chốt quỹ t9 (1.9-2.10)')
          || tryReadExactSheet('Tong-hop-DNTT-T9-T10.xlsx', 'Chốt quỹ t9 (1.9-2.10)');
      }

      if (sheet) {
        XLSX.utils.book_append_sheet(workbook, sheet, 'Chốt quỹ t9 (1.9-2.10)');
      } else {
        // Tạo bảng tổng hợp tháng động theo đúng cấu trúc Chốt quỹ tháng
        const { databaseContracts, memberNames } = await getContractsAndMembers();
        const { contracts } = loadSeptemberContractDistributions(databaseContracts, memberNames);
        const monthContracts = contracts.filter((c) => c.contract_date.startsWith(month));
        const totalMonthRevenue = monthContracts.reduce((sum, c) => sum + (c.allocated_value || c.value || 0), 0);

        // Lấy dữ liệu đề nghị chi theo quỹ từ database
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

        const aoa: any[][] = [
          ['CÔNG TY CỔ PHẦN TẬP ĐOÀN NGHIÊNG COMPLEX\nML 6-24 Vinhomes Greenbay, Đường Lương Thế Vinh, Đại Mỗ, Hà Nội', null, null, null, null, null, null, null, null, 'Từ ngày', `${month}-01`],
          [null, null, null, null, null, null, null, null, null, 'Tới ngày', `${month}-31`],
          [],
          [`Quyết toán Quỹ tháng ${parseInt(month.slice(5), 10)}`],
          [],
          ['Doanh số HĐ (100%)', null, null, null, null, totalMonthRevenue, 'Tổng chi quỹ', 'Còn lại quỹ'],
        ];

        let sumAllocated = 0;
        let sumSpent = 0;

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

          aoa.push([
            item.name,
            null,
            null,
            null,
            item.rate,
            allocated,
            spent,
            remaining,
          ]);
        }

        aoa.push([
          'Tổng qũy',
          null,
          null,
          null,
          null,
          sumAllocated,
          sumSpent,
          sumAllocated - sumSpent,
        ]);
        aoa.push([]);

        // Bảng tổng hợp thu chi theo từng người nhận
        aoa.push(['STT', 'Mã Người nhận', 'Thông tin người nhận', null, null, 'Chi tiết nội dung nhận', null, 'Tổng tiền']);

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
                p.lines.push(`- ${l.source}: ${formatVND(l.amount)}`);
              }
            } else {
              p.lines.push(`- Hoa hồng phân bổ: ${formatVND(b.amount)}`);
            }
          }
        }

        let stt = 1;
        for (const [, p] of personMap) {
          const info = `${p.name}\nSTK: ${p.bankAccount || '—'}\n${p.bankName || '—'}`;
          const details = Array.from(new Set(p.lines)).join('\n');
          aoa.push([stt++, p.phone || '—', info, null, null, details, null, p.totalAmount]);
        }

        const dynamicSheet = XLSX.utils.aoa_to_sheet(aoa);
        dynamicSheet['!cols'] = [
          { wch: 8 },
          { wch: 16 },
          { wch: 32 },
          { wch: 8 },
          { wch: 10 },
          { wch: 45 },
          { wch: 16 },
          { wch: 16 },
        ];
        XLSX.utils.book_append_sheet(workbook, dynamicSheet, `Chốt quỹ tháng ${parseInt(month.slice(5), 10)}`);
      }
    } else {
      // BÁO CÁO TUẦN (Tuần cụ thể)
      exportFileName = `DNTT-hoa-hong-${periodCode}.xlsx`;

      let sheet: XLSX.WorkSheet | null = null;
      if (periodCode === '2026-09-W4') {
        sheet = tryReadExactSheet('DN_thanh_toan_HH_Tuan4_T9.xlsx', 'DNTT HH tuần 4 T9')
          || tryReadExactSheet('Tong-hop-DNTT-T9-T10.xlsx', 'DNTT HH tuần 4 T9');
      } else if (periodCode === '2026-09-W3') {
        sheet = tryReadExactSheet('DN_thanh_toan_HH_Tuan3_T9.xlsx', 'DN thanh toán HH tuần 3 T9')
          || tryReadExactSheet('Tong-hop-DNTT-T9-T10.xlsx', 'DN thanh toán HH tuần 3 T9');
      } else if (periodCode === '2026-09-W5') {
        sheet = tryReadExactSheet('DN_thanh_toan_HH_Tuan5_T9.xlsx', 'DNTT tuần 5 T9')
          || tryReadExactSheet('Tong-hop-DNTT-T9-T10.xlsx', 'DNTT tuần 5 T9');
      } else if (periodCode === '2026-10-W1') {
        sheet = tryReadExactSheet('DN_thanh_toan_HH_Tuan1_T10.xlsx', 'DNTT HH tuần 1 T10')
          || tryReadExactSheet('Tong-hop-DNTT-T9-T10.xlsx', 'DNTT HH tuần 1 T10');
      }

      if (sheet) {
        const sheetName = periodCode === '2026-09-W4' ? 'DNTT HH tuần 4 T9'
          : periodCode === '2026-09-W3' ? 'DN thanh toán HH tuần 3 T9'
          : periodCode === '2026-09-W5' ? 'DNTT tuần 5 T9'
          : 'DNTT tuần';
        XLSX.utils.book_append_sheet(workbook, sheet, sheetName);
      } else {
        // Tạo bảng tuần động theo đúng cấu trúc DNTT HH tuần
        const { databaseContracts, memberNames } = await getContractsAndMembers();
        const { contracts } = loadSeptemberContractDistributions(databaseContracts, memberNames);
        const weekContracts = contracts.filter((c) => c.source_period_code === periodCode);
        const totalWeekRevenue = weekContracts.reduce((sum, c) => sum + (c.allocated_value || c.value || 0), 0);

        // Lấy đề nghị chi tuần từ database
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

        const aoa: any[][] = [
          ['CÔNG TY CỔ PHẦN TẬP ĐOÀN NGHIÊNG COMPLEX\nML 6-24 Vinhomes Greenbay, Đường Lương Thế Vinh, Đại Mỗ, Hà Nội'],
          [],
          ['ĐỀ NGHỊ THANH TOÁN'],
          [],
          [`Phân bổ hoa hồng và thù lao ${periodCode}`],
          ['Doanh số HĐ (100%)', null, null, null, 'Tỷ lệ', totalWeekRevenue, 'Tổng chi quỹ', 'Còn lại quỹ'],
        ];

        let sumAllocated = 0;
        let sumSpent = 0;
        const WEEK_RATES = STANDARD_RATES.filter((item) => item.key !== 'leader_70' && item.key !== 'leader_30');
        // Thêm leader (2.9%)
        WEEK_RATES.push({ key: 'leader', name: 'Leader team - giám đốc Kd (2,9%)', rate: 0.029 });

        for (const item of WEEK_RATES) {
          const allocated = Math.round(totalWeekRevenue * item.rate);
          const spent = requestedByFund[item.key] !== undefined ? requestedByFund[item.key] : allocated;
          const remaining = allocated - spent;
          sumAllocated += allocated;
          sumSpent += spent;

          aoa.push([
            item.name,
            null,
            null,
            null,
            item.rate,
            allocated,
            spent,
            remaining,
          ]);
        }

        aoa.push([
          'Tổng qũy',
          null,
          null,
          null,
          null,
          sumAllocated,
          sumSpent,
          sumAllocated - sumSpent,
        ]);
        aoa.push([]);
        aoa.push(['                   NGƯỜI LẬP                                                PHÓ CHỦ TỊCH                                               TỔNG GIÁM ĐỐC ']);
        aoa.push([]);
        aoa.push(['                   Vũ Thị Cúc                                             Nguyễn Thị Thương Hiếu                                  Nguyễn Thị Hương Thảo']);
        aoa.push([]);

        // Bảng ma trận hợp đồng & người nhận
        const recipientList: { name: string; bankAccount: string; bankName: string }[] = [];
        const seenRecipients = new Set<string>();

        for (const contract of weekContracts) {
          for (const b of contract.source_beneficiaries || []) {
            const key = b.name.trim();
            if (!seenRecipients.has(key)) {
              seenRecipients.add(key);
              recipientList.push({
                name: b.name,
                bankAccount: b.bank_account || '',
                bankName: b.bank_name || '',
              });
            }
          }
        }

        const matrixHeader: any[] = ['STT', 'Hợp đồng'];
        for (const r of recipientList) {
          matrixHeader.push(`${r.name}\nSTK: ${r.bankAccount || '—'}\n${r.bankName || '—'}`);
        }
        matrixHeader.push('Tổng quỹ chưa chia (15%)', 'Tổng hoa hồng chia', 'Tổng quỹ còn lại');
        aoa.push(matrixHeader);

        const colTotals = new Array(recipientList.length).fill(0);
        let totalPool15 = 0;
        let totalDistributed = 0;
        let totalRemaining = 0;

        weekContracts.forEach((contract, idx) => {
          const contractDesc = `Ngày ${contract.contract_date}\nKH: ${contract.customer_name}\nGiá trị: ${formatVND(contract.allocated_value || contract.value)}`;
          const row: any[] = [idx + 1, contractDesc];

          const benMap = new Map((contract.source_beneficiaries || []).map((b) => [b.name.trim(), b.amount]));
          let contractTotalShared = 0;

          recipientList.forEach((r, rIdx) => {
            const amt = benMap.get(r.name.trim()) || 0;
            row.push(amt > 0 ? amt : null);
            colTotals[rIdx] += amt;
            contractTotalShared += amt;
          });

          const pool15 = Math.round((contract.allocated_value || contract.value) * 0.15);
          const rem = pool15 - contractTotalShared;

          totalPool15 += pool15;
          totalDistributed += contractTotalShared;
          totalRemaining += rem;

          row.push(pool15, contractTotalShared, rem);
          aoa.push(row);
        });

        // Dòng tổng cộng ma trận
        const summaryRow: any[] = ['Tổng', totalWeekRevenue];
        for (const cTot of colTotals) {
          summaryRow.push(cTot);
        }
        summaryRow.push(totalPool15, totalDistributed, totalRemaining);
        aoa.push(summaryRow);

        aoa.push([]);
        aoa.push(['NGƯỜI LẬP', null, null, null, null, null, null, null, 'PHÓ CHỦ TỊCH', null, null, null, null, null, null, 'TỔNG GIÁM ĐỐC']);
        aoa.push(['Vũ Thị Cúc', null, null, null, null, null, null, null, 'Nguyễn Thị Thương Hiếu', null, null, null, null, null, null, 'Nguyễn Thị Hương Thảo']);

        const dynamicSheet = XLSX.utils.aoa_to_sheet(aoa);
        XLSX.utils.book_append_sheet(workbook, dynamicSheet, `DNTT ${periodCode}`);
      }
    }

    const bytes = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
    const body = new Uint8Array(bytes.buffer, bytes.byteOffset, bytes.byteLength);

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
    return NextResponse.json(
      { success: false, error: error.message || 'Không thể xuất báo cáo Excel.' },
      { status: 500 }
    );
  }
}
