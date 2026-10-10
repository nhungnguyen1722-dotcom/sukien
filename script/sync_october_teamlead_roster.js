const { Pool } = require('pg');
const { getDatabaseConfig } = require('./db-config');
const pool = new Pool(getDatabaseConfig());

async function syncRoster() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Update include_30 on teamlead_members for 2026-10-01
    // Only the 6 legitimate members get include_30 = true
    const eligiblePhones = [
      '0889225989', // Vũ Thị Cúc
      '0947876133', // Phạm Thị Hương
      '0326894993', // Nguyễn Hùng Vĩ
      '0984065555', // Vũ Hùng Vỹ
      '0915095848', // Diệp Thị Huế
      '0384081272', // Hoàng Thị Chích
    ];

    await client.query(`
      UPDATE teamlead_members 
      SET include_30 = (member_phone = ANY($1::varchar[]))
      WHERE month = '2026-10-01'
    `, [eligiblePhones]);

    // 2. Ensure Nguyễn Minh Châu exists in teamlead_members and teamlead_member_teams for Happy
    // Find or create member record for Nguyễn Minh Châu (0349791507)
    let nmcMember = await client.query(`
      SELECT id FROM teamlead_members WHERE month = '2026-10-01' AND member_phone = '0349791507' LIMIT 1
    `);
    let nmcMemberId;
    if (!nmcMember.rows.length) {
      const userRes = await client.query(`SELECT id, full_name, phone FROM users WHERE phone = '0349791507' LIMIT 1`);
      const user = userRes.rows[0];
      const inserted = await client.query(`
        INSERT INTO teamlead_members (month, member_id, member_name, member_phone, include_30)
        VALUES ('2026-10-01', $1, $2, '0349791507', FALSE)
        RETURNING id
      `, [user ? user.id : null, user ? user.full_name : 'Nguyễn Minh Châu']);
      nmcMemberId = inserted.rows[0].id;
    } else {
      nmcMemberId = nmcMember.rows[0].id;
    }

    // Get Happy team id
    const happyTeamRes = await client.query(`SELECT id FROM teamlead_teams WHERE LOWER(BTRIM(name)) = 'happy' LIMIT 1`);
    if (happyTeamRes.rows.length) {
      const happyTeamId = happyTeamRes.rows[0].id;
      const mtExists = await client.query(`
        SELECT id FROM teamlead_member_teams WHERE member_id = $1 AND team_id = $2 LIMIT 1
      `, [nmcMemberId, happyTeamId]);
      if (!mtExists.rows.length) {
        await client.query(`
          INSERT INTO teamlead_member_teams (member_id, team_id, role, include_70)
          VALUES ($1, $2, 'Trưởng phòng', FALSE)
        `, [nmcMemberId, happyTeamId]);
      } else {
        await client.query(`
          UPDATE teamlead_member_teams SET role = 'Trưởng phòng', include_70 = FALSE WHERE id = $1
        `, [mtExists.rows[0].id]);
      }
    }

    await client.query('COMMIT');
    console.log('October roster synced successfully with Excel Tong-hop-DNTT-T9-T10.xlsx.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error syncing roster:', err);
  } finally {
    client.release();
    pool.end();
  }
}

syncRoster();
