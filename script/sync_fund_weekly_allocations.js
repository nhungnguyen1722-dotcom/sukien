const { Pool } = require('pg');
const { getDatabaseConfig } = require('./db-config');

const pool = new Pool(getDatabaseConfig());

async function run() {
  const funds = [
    { key: 'direct_sale', source: 'Sale trực tiếp - Pro sale (Nguồn khách)', rate: 0.06 },
    { key: 'tribute_connection', source: 'Tri ân kết nối sale trực tiếp', rate: 0.01 },
    { key: 'tribute_support', source: 'Tri ân hỗ trợ sale', rate: 0.005 },
    { key: 'tribute_referral', source: 'Tri ân giới thiệu', rate: 0.0 },
    { key: 'event_close', source: 'Quỹ Sự kiện & Chốt hợp đồng', rate: 0.005 },
    { key: 'customer_care', source: 'Quỹ Chăm sóc khách hàng', rate: 0.002 },
    { key: 'training', source: 'Quỹ Đào tạo Chuyên môn & Kỹ năng', rate: 0.003 },
    { key: 'incentive', source: 'Quỹ Thi đua & Chương trình thúc đẩy', rate: 0.008 },
    { key: 'travel', source: 'Chi phí Công tác phí', rate: 0.003 },
    { key: 'operations', source: 'Quỹ Vận hành', rate: 0.022 },
    { key: 'support_kt', source: 'BP hỗ trợ KT', rate: 0.001 },
    { key: 'support_cn', source: 'BP hỗ trợ CN', rate: 0.002 },
    { key: 'leader', source: 'Leader team - giám đốc Kd', rate: 0.029 }
  ];

  for (const f of funds) {
    const exists = await pool.query(
      'SELECT id FROM fund_weekly_allocations WHERE period_code = $1 AND fund_key = $2',
      ['2026-10-W2', f.key]
    );
    if (!exists.rows.length) {
      await pool.query(
        `INSERT INTO fund_weekly_allocations (
          period_code, period_month, period_label, period_start, period_end, fund_key, fund_source,
          allocation_rate, requested_amount, source_sheet, allocated_amount, paid_amount, remaining_amount
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
        [
          '2026-10-W2', '2026-10', 'Tuần 2 · 10–16/10', '2026-10-10', '2026-10-16',
          f.key, f.source, f.rate, Math.round(45000000 * f.rate), 'Chính sách phân bổ 15%',
          Math.round(45000000 * f.rate), 0, Math.round(45000000 * f.rate)
        ]
      );
    } else {
      await pool.query(
        `UPDATE fund_weekly_allocations
         SET requested_amount = $1, allocated_amount = $2, remaining_amount = $3
         WHERE id = $4`,
        [
          Math.round(45000000 * f.rate),
          Math.round(45000000 * f.rate),
          Math.round(45000000 * f.rate),
          exists.rows[0].id
        ]
      );
    }
  }

  console.log('2026-10-W2 fund weekly allocations synced successfully');
  pool.end();
}

run().catch((err) => {
  console.error(err);
  pool.end();
});
