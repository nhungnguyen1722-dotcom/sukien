const { Pool } = require('pg');
const { getDatabaseConfig } = require('./db-config');
const pool = new Pool(getDatabaseConfig());

async function run() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Update teamlead_periods id = 5 (October Week 1)
    await client.query(`
      UPDATE teamlead_periods
      SET fund_rate = 0.029,
          total_sales = 750000000,
          gross_fund = 21750000,
          fund_30 = 6525000,
          fund_70 = 15225000,
          is_locked = TRUE,
          is_imported = TRUE,
          source_file = 'Tong-hop-DNTT-T9-T10.xlsx'
      WHERE id = 5
    `);

    // Delete old wrong rows
    await client.query(`DELETE FROM teamlead_payout_rows WHERE period_id = 5`);

    // The 19 assignments from Excel Tong-hop-DNTT-T9-T10.xlsx
    const rows = [
      { name: 'Vũ Thị Cúc', phone: '0889225989', team: 'Thịnh Vượng', role: 'Giám đốc', e30: true, e70: true, sales: 0, p30: 1087500, p70: 0 },
      { name: 'Vũ Thị Cúc', phone: '0889225989', team: 'Happy', role: 'Giám đốc', e30: false, e70: true, sales: 90000000, p30: 0, p70: 913500 },
      { name: 'Phạm Thị Hương', phone: '0947876133', team: 'Thịnh Vượng', role: 'Giám đốc', e30: true, e70: true, sales: 0, p30: 1087500, p70: 0 },
      { name: 'Nguyễn Hùng Vĩ', phone: '0326894993', team: 'Thành Công', role: 'Giám đốc', e30: true, e70: true, sales: 80000000, p30: 1087500, p70: 1624000 },
      { name: 'Nguyễn Hùng Vĩ', phone: '0326894993', team: 'Hải Đăng Vàng', role: 'Giám đốc', e30: false, e70: true, sales: 0, p30: 0, p70: 0 },
      { name: 'Nguyễn Hùng Vĩ', phone: '0326894993', team: 'Lộc Phát', role: 'Giám đốc', e30: false, e70: true, sales: 0, p30: 0, p70: 0 },
      { name: 'Nguyễn Hùng Vĩ', phone: '0326894993', team: 'Biệt đội Kim Cương', role: 'Giám đốc', e30: false, e70: true, sales: 0, p30: 0, p70: 0 },
      { name: 'Vũ Hùng Vỹ', phone: '0984065555', team: 'Ong Vàng', role: 'Trưởng phòng', e30: true, e70: true, sales: 580000000, p30: 1087500, p70: 1177400 },
      { name: 'Diệp Thị Huế', phone: '0915095848', team: 'Ong Vàng', role: 'Trưởng phòng', e30: true, e70: true, sales: 580000000, p30: 1087500, p70: 1177400 },
      { name: 'Phạm Minh Tuấn', phone: '0768635148', team: 'Ong Vàng', role: 'Phó Giám đốc', e30: false, e70: true, sales: 580000000, p30: 0, p70: 3532200 },
      { name: 'Nguyễn Hùng Vĩ', phone: '0326894993', team: 'Ong Vàng', role: 'Giám đốc', e30: false, e70: true, sales: 580000000, p30: 0, p70: 5887000 },
      { name: 'Nguyễn Hùng Vĩ', phone: '0326894993', team: 'Kiến Vàng', role: 'Giám đốc', e30: false, e70: true, sales: 0, p30: 0, p70: 0 },
      { name: 'Phượng Ngọc Thu', phone: '0969881698', team: 'Lộc Phát', role: 'Trưởng phòng', e30: false, e70: true, sales: 0, p30: 0, p70: 0 },
      { name: 'Phượng Ngọc Thu', phone: '0969881698', team: 'Kiến Vàng', role: 'Trưởng phòng', e30: false, e70: true, sales: 0, p30: 0, p70: 0 },
      { name: 'Cung Thu Hà', phone: '0965759559', team: 'Kiến Vàng', role: 'Trưởng phòng', e30: false, e70: true, sales: 0, p30: 0, p70: 0 },
      { name: 'Dương Hồng Phương', phone: '0979345229', team: 'Biệt đội Kim Cương', role: 'Trưởng phòng', e30: false, e70: true, sales: 0, p30: 0, p70: 0 },
      { name: 'Nguyễn Đức Vĩnh', phone: '0984398568', team: 'Happy', role: 'Phó Giám đốc', e30: false, e70: true, sales: 90000000, p30: 0, p70: 548100 },
      { name: 'Hoàng Thị Chích', phone: '0384081272', team: 'Happy', role: 'Trưởng phòng', e30: true, e70: true, sales: 90000000, p30: 1087500, p70: 365400 },
      { name: 'Nguyễn Minh Châu', phone: '0349791507', team: 'Happy', role: 'Trưởng phòng', e30: false, e70: false, sales: 90000000, p30: 0, p70: 0 },
    ];

    for (const r of rows) {
      const memRes = await client.query(`SELECT id FROM teamlead_members WHERE month = '2026-10-01' AND member_phone = $1 LIMIT 1`, [r.phone]);
      const teamRes = await client.query(`SELECT id FROM teamlead_teams WHERE LOWER(BTRIM(name)) = LOWER(BTRIM($1)) LIMIT 1`, [r.team]);
      const memId = memRes.rows[0]?.id || null;
      const teamId = teamRes.rows[0]?.id || null;

      let mtId = null;
      if (memId && teamId) {
        const mtRes = await client.query(`SELECT id FROM teamlead_member_teams WHERE member_id = $1 AND team_id = $2 LIMIT 1`, [memId, teamId]);
        mtId = mtRes.rows[0]?.id || null;
      }

      await client.query(`
        INSERT INTO teamlead_payout_rows (
          period_id, membership_id, member_team_id, member_name, member_phone,
          team_id, team_name, role, eligible_30, eligible_70, sales_basis,
          payout_30, payout_70, total_amount
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      `, [5, memId, mtId, r.name, r.phone, teamId, r.team, r.role, r.e30, r.e70, r.sales, r.p30, r.p70, r.p70]);
    }

    await client.query('COMMIT');
    console.log('Period 5 updated successfully with exact Excel data!');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error:', err);
  } finally {
    client.release();
    pool.end();
  }
}

run();
