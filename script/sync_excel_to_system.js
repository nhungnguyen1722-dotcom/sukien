/**
 * Script tự động trích xuất dữ liệu từ các tệp Excel trong imagedata
 * và đồng bộ lên Database (cả Neon Cloud và PostgreSQL Local)
 * Nguồn:
 * 1. Tong-hop-DNTT-T9-T10.xlsx (các tab: "5. DS Hợp đồng", "DN thanh toán HH tuần 3 T9", "DNTT HH tuần 4 T9", "DNTT tuần 5 T9")
 * 2. DN_thanh_toan_HH_Tuan3_T9.xlsx
 * 3. DN_thanh_toan_HH_Tuan4_T9.xlsx
 * 4. DN_thanh_toan_HH_Tuan5_T9.xlsx
 */

const path = require('path');
const fs = require('fs');
const XLSX = require('xlsx');
const { Pool } = require('pg');
const { loadEnvConfig } = require('@next/env');

const projectRoot = path.resolve(__dirname, '..');
loadEnvConfig(projectRoot);

const excelDir = path.join(projectRoot, 'imagedata');

const STANDARD_RATES = {
  direct_sale: 0.06,
  tribute_connection: 0.01,
  tribute_support: 0.005,
  tribute_referral: 0.0,
  event_close: 0.005,
  customer_care: 0.002,
  training: 0.003,
  incentive: 0.008,
  travel: 0.003,
  leader: 0.029,
  operations: 0.022,
  support_kt: 0.001,
  support_cn: 0.002
};

const FUND_SOURCE_NAMES = {
  direct_sale: 'Sale trực tiếp - Pro sale (Nguồn khách)',
  tribute_connection: 'Tri ân kết nối sale trực tiếp',
  tribute_support: 'Tri ân hỗ trợ sale',
  tribute_referral: 'Tri ân giới thiệu',
  event_close: 'Quỹ Sự kiện & Chốt hợp đồng',
  customer_care: 'Quỹ Chăm sóc khách hàng',
  training: 'Quỹ Đào tạo Chuyên môn & Kỹ năng',
  incentive: 'Quỹ Thi đua & Chương trình thúc đẩy',
  travel: 'Chi phí Công tác phí',
  leader: 'Leader team - giám đốc Kd',
  operations: 'Quỹ Vận hành',
  support_kt: 'BP hỗ trợ KT',
  support_cn: 'BP hỗ trợ CN'
};

function normalizeText(txt) {
  return String(txt || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[đĐ]/g, 'd')
    .trim()
    .toLowerCase();
}

function resolveFundKey(rawName) {
  const norm = normalizeText(rawName);
  // Ưu tiên kiểm tra cụm từ đặc thù trước
  if (norm.includes('ket noi')) return 'tribute_connection';
  if (norm.includes('ho tro sale')) return 'tribute_support';
  if (norm.includes('gioi thieu')) return 'tribute_referral';
  if (norm.includes('sale truc tiep') || norm.includes('pro sale')) return 'direct_sale';
  if (norm.includes('su kien')) return 'event_close';
  if (norm.includes('cham soc') || norm.includes('cskh')) return 'customer_care';
  if (norm.includes('dao tao')) return 'training';
  if (norm.includes('thi dua')) return 'incentive';
  if (norm.includes('cong tac phi')) return 'travel';
  if (norm.includes('leader')) return 'leader';
  if (norm.includes('van hanh')) return 'operations';
  if (norm.includes('ho tro kt') || norm.includes('bp ho tro kt')) return 'support_kt';
  if (norm.includes('ho tro cn') || norm.includes('bp ho tro cn')) return 'support_cn';
  return null;
}

function parseMoney(val) {
  if (typeof val === 'number') return Math.round(val);
  const digits = String(val || '').replace(/[^\d.-]/g, '');
  const num = Number(digits);
  return Number.isFinite(num) ? Math.round(num) : 0;
}

function extractWeeklyAllocationHeader(sheet) {
  const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });
  const rows = [];
  const foundKeys = new Set();
  
  let startIdx = data.findIndex(r => r && r[0] && normalizeText(r[0]).includes('sale truc tiep'));
  if (startIdx < 0) startIdx = 6;

  for (let r = startIdx; r < Math.min(startIdx + 15, data.length); r++) {
    const row = data[r];
    if (!row || !row[0]) continue;
    const name = String(row[0]).trim();
    const norm = normalizeText(name);
    if (norm.startsWith('tong quy') || norm.startsWith('tong q') || norm === 'tong quy') break;

    const fundKey = resolveFundKey(name);
    if (!fundKey || foundKeys.has(fundKey)) continue;

    foundKeys.add(fundKey);
    let rate = STANDARD_RATES[fundKey] || 0;
    if (row[4] !== undefined && typeof row[4] === 'number') {
      rate = row[4] > 1 ? row[4] / 100 : row[4];
    }
    const requestedAmount = parseMoney(row[6]);

    rows.push({
      fund_key: fundKey,
      fund_source: FUND_SOURCE_NAMES[fundKey] || name,
      allocation_rate: rate,
      requested_amount: requestedAmount
    });
  }

  // Đảm bảo đủ 13 loại quỹ
  for (const [key, stdRate] of Object.entries(STANDARD_RATES)) {
    if (!foundKeys.has(key)) {
      rows.push({
        fund_key: key,
        fund_source: FUND_SOURCE_NAMES[key] || key,
        allocation_rate: stdRate,
        requested_amount: 0
      });
    }
  }

  return rows;
}

async function syncToDatabase(dbName, poolConfig, weeklyData) {
  console.log(`\n======================================================`);
  console.log(`BẮT ĐẦU ĐỒNG BỘ DỮ LIỆU LÊN: ${dbName}`);
  console.log(`======================================================`);

  const pool = new Pool(poolConfig);

  try {
    for (const w of weeklyData) {
      console.log(`\nĐồng bộ ${w.period_code} (${w.sheetName}) - ${w.rows.length} loại quỹ:`);

      for (const f of w.rows) {
        const exists = await pool.query(
          'SELECT id FROM fund_weekly_allocations WHERE period_code = $1 AND fund_key = $2',
          [w.period_code, f.fund_key]
        );

        if (exists.rows.length) {
          await pool.query(
            `UPDATE fund_weekly_allocations
             SET allocation_rate = $1, requested_amount = $2, source_sheet = $3,
                 period_label = $4, period_start = $5, period_end = $6, fund_source = $7
             WHERE id = $8`,
            [f.allocation_rate, f.requested_amount, w.sheetName, w.period_label, w.period_start, w.period_end, f.fund_source, exists.rows[0].id]
          );
        } else {
          await pool.query(
            `INSERT INTO fund_weekly_allocations (
               period_code, period_month, period_label, period_start, period_end,
               fund_key, fund_source, allocation_rate, requested_amount, source_sheet
             ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
            [
              w.period_code, w.period_month, w.period_label, w.period_start, w.period_end,
              f.fund_key, f.fund_source, f.allocation_rate, f.requested_amount, w.sheetName
            ]
          );
        }
        console.log(`  ✓ ${f.fund_key.padEnd(20)}: ${(f.allocation_rate * 100).toFixed(1).padStart(4)}% | Đề nghị chi: ${f.requested_amount.toLocaleString('vi-VN').padStart(12)} đ`);
      }
    }

    const contractsRes = await pool.query('SELECT COUNT(*) as count FROM contracts');
    console.log(`\nTổng số hợp đồng hiện hữu trong [${dbName}]: ${contractsRes.rows[0].count} hợp đồng.`);
    console.log(`=> ĐỒNG BỘ THÀNH CÔNG CHO [${dbName}]!`);
  } catch (err) {
    console.error(`Lỗi khi đồng bộ [${dbName}]:`, err);
  } finally {
    await pool.end();
  }
}

async function run() {
  const mainWbPath = path.join(excelDir, 'Tong-hop-DNTT-T9-T10.xlsx');
  if (!fs.existsSync(mainWbPath)) {
    throw new Error(`Không tìm thấy file: ${mainWbPath}`);
  }
  console.log('Đang đọc file Excel...');
  const mainWb = XLSX.readFile(mainWbPath);

  const weeklyDefinitions = [
    {
      period_code: '2026-09-W3',
      period_month: '2026-09',
      period_label: 'Tuần 3 · 15–18/09',
      period_start: '2026-09-15',
      period_end: '2026-09-18',
      sheetName: 'DN thanh toán HH tuần 3 T9'
    },
    {
      period_code: '2026-09-W4',
      period_month: '2026-09',
      period_label: 'Tuần 4 · 19–23/09',
      period_start: '2026-09-19',
      period_end: '2026-09-23',
      sheetName: 'DNTT HH tuần 4 T9'
    },
    {
      period_code: '2026-09-W5',
      period_month: '2026-09',
      period_label: 'Tuần 5 · 26/09–03/10',
      period_start: '2026-09-26',
      period_end: '2026-10-02',
      sheetName: 'DNTT tuần 5 T9'
    }
  ];

  const weeklyData = [];
  for (const def of weeklyDefinitions) {
    const sheet = mainWb.Sheets[def.sheetName];
    if (sheet) {
      const rows = extractWeeklyAllocationHeader(sheet);
      weeklyData.push({ ...def, rows });
    }
  }

  const neonConfig = {
    connectionString: process.env.DATABASE_URL || process.env.NEON_CONN_STRING,
    ssl: { rejectUnauthorized: false }
  };

  const localConfig = {
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '1111222267',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5433', 10),
    database: process.env.DB_NAME || 'postgismap'
  };

  await syncToDatabase('Neon Cloud Database', neonConfig, weeklyData);
  await syncToDatabase('PostgreSQL Local (postgismap:5433)', localConfig, weeklyData);
}

run();
