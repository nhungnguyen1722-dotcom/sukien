import pool from '@/lib/db';
import { MEMBER_TEAM_OPTIONS } from '@/lib/teamOptions';

let schemaPromise: Promise<void> | null = null;

export const UNIFIED_TEAM_NAME_SQL = `
  COALESCE(
    NULLIF(BTRIM(u.team_name), ''),
    (
      SELECT STRING_AGG(DISTINCT tt.name, ', ')
      FROM teamlead_members tm
      JOIN teamlead_member_teams tmt ON tm.id = tmt.member_id
      JOIN teamlead_teams tt ON tmt.team_id = tt.id
      WHERE (tm.member_id = u.id OR (NULLIF(REGEXP_REPLACE(tm.member_phone, '[^0-9]', '', 'g'), '') IS NOT NULL AND REGEXP_REPLACE(tm.member_phone, '[^0-9]', '', 'g') = REGEXP_REPLACE(u.phone, '[^0-9]', '', 'g')))
        AND NULLIF(BTRIM(tt.name), '') IS NOT NULL
        AND tt.name NOT LIKE '%?%'
    ),
    t.name
  )
`;

export const UNIFIED_TITLE_SQL = `
  COALESCE(
    CASE WHEN u.title IS NOT NULL AND u.title != 'Thành viên' AND BTRIM(u.title) != '' THEN u.title ELSE NULL END,
    (
      SELECT tmt.role
      FROM teamlead_members tm
      JOIN teamlead_member_teams tmt ON tm.id = tmt.member_id
      WHERE (tm.member_id = u.id OR (NULLIF(REGEXP_REPLACE(tm.member_phone, '[^0-9]', '', 'g'), '') IS NOT NULL AND REGEXP_REPLACE(tm.member_phone, '[^0-9]', '', 'g') = REGEXP_REPLACE(u.phone, '[^0-9]', '', 'g')))
      ORDER BY CASE tmt.role WHEN 'Giám đốc' THEN 1 WHEN 'Phó Giám đốc' THEN 2 WHEN 'Trưởng phòng' THEN 3 ELSE 4 END
      LIMIT 1
    ),
    u.title,
    'Thành viên'
  )
`;

export async function ensureMemberSchema(): Promise<void> {
  if (!schemaPromise) {
    schemaPromise = (async () => {
      try {
        const colRes = await pool.query(
          "SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'team_name'"
        );
        if (colRes.rows.length === 0) {
          await pool.query('ALTER TABLE users ADD COLUMN team_name TEXT');
        }

        const buRes = await pool.query(
          "SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'business_unit'"
        );
        if (buRes.rows.length === 0) {
          await pool.query("ALTER TABLE users ADD COLUMN business_unit VARCHAR(100) DEFAULT 'Khối kinh doanh'");
        }

        // Clean up any corrupted names with question marks in teams and teamlead_teams
        await pool.query("DELETE FROM teams WHERE name LIKE '%?%'");
        await pool.query("DELETE FROM teamlead_teams WHERE name LIKE '%?%'");

        // Sync teams between `teams` and `teamlead_teams`
        const tlTeams = await pool.query("SELECT name FROM teamlead_teams WHERE NULLIF(BTRIM(name), '') IS NOT NULL");
        for (const row of tlTeams.rows) {
          const existing = await pool.query('SELECT id FROM teams WHERE LOWER(BTRIM(name)) = LOWER(BTRIM($1))', [row.name]);
          if (!existing.rows.length) {
            await pool.query('INSERT INTO teams (name) VALUES ($1)', [row.name]);
          }
        }

        const standardTeams = await pool.query("SELECT name FROM teams WHERE NULLIF(BTRIM(name), '') IS NOT NULL");
        for (const row of standardTeams.rows) {
          const existing = await pool.query('SELECT id FROM teamlead_teams WHERE LOWER(BTRIM(name)) = LOWER(BTRIM($1))', [row.name]);
          if (!existing.rows.length) {
            await pool.query('INSERT INTO teamlead_teams (name) VALUES ($1)', [row.name]);
          }
        }

        // Link teamlead_members.member_id with users.id
        await pool.query(`
          UPDATE teamlead_members tm
          SET member_id = u.id
          FROM users u
          WHERE (tm.member_id IS NULL OR tm.member_id != u.id)
            AND (
              (NULLIF(REGEXP_REPLACE(tm.member_phone, '[^0-9]', '', 'g'), '') IS NOT NULL
               AND REGEXP_REPLACE(tm.member_phone, '[^0-9]', '', 'g') = REGEXP_REPLACE(u.phone, '[^0-9]', '', 'g'))
              OR LOWER(BTRIM(tm.member_name)) = LOWER(BTRIM(u.full_name))
            )
        `);

        // Populate users.team_name from teams table if null
        await pool.query(`
          UPDATE users u
          SET team_name = t.name
          FROM teams t
          WHERE u.team_id = t.id AND (u.team_name IS NULL OR BTRIM(u.team_name) = '')
        `);

        // Sync existing teamlead roster data to users
        await syncTeamLeadToUsers();
      } catch (err) {
        console.error('ensureMemberSchema error:', err);
      }
    })();
  }
  return schemaPromise;
}

export async function resolveMemberTeamId(teamName: unknown): Promise<number | null> {
  const raw = typeof teamName === 'string' ? teamName.trim() : '';
  if (!raw) return null;

  // Split multiple teams (comma-separated) and take the primary (first) team to resolve a team_id
  const firstName = raw.split(',')[0].trim();
  if (!firstName) return null;

  const existing = await pool.query(
    'SELECT id FROM teams WHERE LOWER(BTRIM(name)) = LOWER(BTRIM($1)) ORDER BY id LIMIT 1',
    [firstName]
  );
  if (existing.rows.length) return Number(existing.rows[0].id);

  if ((MEMBER_TEAM_OPTIONS as readonly string[]).includes(firstName)) {
    const inserted = await pool.query('INSERT INTO teams (name) VALUES ($1) RETURNING id', [firstName]);
    // Also mirror to teamlead_teams
    try {
      await pool.query('INSERT INTO teamlead_teams (name) VALUES ($1)', [firstName]);
    } catch {
      // ignore unique conflict
    }
    return Number(inserted.rows[0].id);
  }

  return null;
}

/**
 * Đồng bộ dữ liệu từ phân hệ TeamLead sang bảng users (Thành viên).
 * Cập nhật team_name, team_id, title và is_team_leader_eligible cho từng user.
 */
export async function syncTeamLeadToUsers(monthFilter?: string): Promise<void> {
  try {
    const query = `
      SELECT 
        COALESCE(tm.member_id, u.id) AS user_id,
        STRING_AGG(DISTINCT tt.name, ', ') AS team_names,
        ARRAY_AGG(DISTINCT tmt.role) AS roles,
        BOOL_OR(tm.include_30) AS include_30
      FROM teamlead_members tm
      JOIN teamlead_member_teams tmt ON tm.id = tmt.member_id
      JOIN teamlead_teams tt ON tmt.team_id = tt.id
      LEFT JOIN users u ON tm.member_id = u.id OR (
        NULLIF(REGEXP_REPLACE(tm.member_phone, '[^0-9]', '', 'g'), '') IS NOT NULL 
        AND REGEXP_REPLACE(tm.member_phone, '[^0-9]', '', 'g') = REGEXP_REPLACE(u.phone, '[^0-9]', '', 'g')
      )
      WHERE COALESCE(tm.member_id, u.id) IS NOT NULL
        ${monthFilter ? 'AND tm.month = $1' : ''}
        AND NULLIF(BTRIM(tt.name), '') IS NOT NULL
        AND tt.name NOT LIKE '%?%'
      GROUP BY COALESCE(tm.member_id, u.id)
    `;
    const params = monthFilter ? [monthFilter] : [];
    const res = await pool.query(query, params);

    for (const row of res.rows) {
      const userId = Number(row.user_id);
      if (!userId) continue;

      const teamNames = row.team_names || '';
      const roles = row.roles || [];
      let role: string | null = null;
      if (roles.includes('Giám đốc')) role = 'Giám đốc';
      else if (roles.includes('Phó Giám đốc')) role = 'Phó Giám đốc';
      else if (roles.includes('Trưởng phòng')) role = 'Trưởng phòng';

      const firstTeam = teamNames.split(',')[0]?.trim();
      let teamId: number | null = null;
      if (firstTeam) {
        const teamRes = await pool.query(
          'SELECT id FROM teams WHERE LOWER(BTRIM(name)) = LOWER(BTRIM($1)) LIMIT 1',
          [firstTeam]
        );
        if (teamRes.rows.length) teamId = Number(teamRes.rows[0].id);
      }

      await pool.query(
        `UPDATE users
         SET 
           team_name = CASE 
             WHEN NULLIF(BTRIM(team_name), '') IS NULL THEN $1 
             ELSE team_name 
           END,
           team_id = COALESCE(team_id, $2),
           title = CASE 
             WHEN (title IS NULL OR title = 'Thành viên' OR BTRIM(title) = '') AND $3::text IS NOT NULL THEN $3 
             ELSE title 
           END,
           is_team_leader_eligible = TRUE,
           updated_at = CURRENT_TIMESTAMP
         WHERE id = $4`,
        [teamNames, teamId, role, userId]
      );
    }
  } catch (err) {
    console.error('syncTeamLeadToUsers error:', err);
  }
}

/**
 * Đồng bộ dữ liệu của 1 thành viên khi được tạo hoặc chỉnh sửa ở trang /admin/thanh-vien
 * sang phân hệ TeamLead (teamlead_members, teamlead_member_teams).
 */
export async function syncUserToTeamLead(userId: number): Promise<void> {
  try {
    const userRes = await pool.query(
      `SELECT id, full_name, phone, team_name, title, is_team_leader_eligible 
       FROM users WHERE id = $1`,
      [userId]
    );
    if (!userRes.rows.length) return;
    const user = userRes.rows[0];

    // Lấy các tháng đang hoạt động trong TeamLead hoặc tháng hiện tại
    const monthsRes = await pool.query(`
      SELECT DISTINCT month::text AS month FROM teamlead_periods
      UNION
      SELECT DISTINCT month::text AS month FROM teamlead_members
      UNION
      SELECT DATE_TRUNC('month', CURRENT_DATE)::text AS month
      ORDER BY month DESC
      LIMIT 3
    `);
    const months = monthsRes.rows.map((r) => r.month.slice(0, 10));

    const rawTeamName = typeof user.team_name === 'string' ? user.team_name : '';
    const teamNames = rawTeamName
      .split(',')
      .map((s: string) => s.trim())
      .filter(Boolean);

    const isEligible = Boolean(user.is_team_leader_eligible) || teamNames.length > 0;
    const hasTeamLeadTitle = ['Giám đốc', 'Phó Giám đốc', 'Trưởng phòng', 'Chủ tịch'].includes(String(user.title || '').trim());
    const role = ['Giám đốc', 'Phó Giám đốc', 'Trưởng phòng'].includes(user.title)
      ? user.title
      : 'Trưởng phòng';

    for (const month of months) {
      if (!hasTeamLeadTitle && !isEligible) {
        // Nếu không có đội nhóm và không đủ điều kiện, có thể bỏ qua hoặc giữ nguyên
        continue;
      }

      // Upsert vào teamlead_members
      let memberId: number;
      const existingMember = await pool.query(
        `SELECT id, include_30 FROM teamlead_members
         WHERE month = $1 AND (member_id = $2 OR member_phone = $3) 
         LIMIT 1`,
        [month, user.id, user.phone]
      );

      if (existingMember.rows.length) {
        memberId = Number(existingMember.rows[0].id);
        await pool.query(
          `UPDATE teamlead_members 
           SET member_id = $1, member_name = $2, member_phone = $3, include_30 = $4 
           WHERE id = $5`,
          [user.id, user.full_name, user.phone, isEligible || Boolean(existingMember.rows[0].include_30), memberId]
        );
      } else {
        const inserted = await pool.query(
          `INSERT INTO teamlead_members (month, member_id, member_name, member_phone, include_30)
           VALUES ($1, $2, $3, $4, $5) RETURNING id`,
          [month, user.id, user.full_name, user.phone, isEligible]
        );
        memberId = Number(inserted.rows[0].id);
      }

      // Đồng bộ các đội nhóm vào teamlead_member_teams
      const currentTeamIds: number[] = [];
      for (const tName of teamNames) {
        // Tìm hoặc tạo teamlead_teams
        const tlTeamRes = await pool.query(
          'SELECT id FROM teamlead_teams WHERE LOWER(BTRIM(name)) = LOWER(BTRIM($1)) LIMIT 1',
          [tName]
        );
        let teamId: number;
        if (!tlTeamRes.rows.length) {
          const insertedTeam = await pool.query(
            'INSERT INTO teamlead_teams (name) VALUES ($1) RETURNING id',
            [tName]
          );
          teamId = Number(insertedTeam.rows[0].id);
          // Mirror to teams table
          try {
            await pool.query('INSERT INTO teams (name) VALUES ($1)', [tName]);
          } catch {}
        } else {
          teamId = Number(tlTeamRes.rows[0].id);
        }
        currentTeamIds.push(teamId);

        // Upsert teamlead_member_teams
        const existingMT = await pool.query(
          'SELECT id FROM teamlead_member_teams WHERE member_id = $1 AND team_id = $2 LIMIT 1',
          [memberId, teamId]
        );
        if (existingMT.rows.length) {
          await pool.query(
            'UPDATE teamlead_member_teams SET role = $1, include_70 = TRUE WHERE id = $2',
            [role, existingMT.rows[0].id]
          );
        } else {
          await pool.query(
            'INSERT INTO teamlead_member_teams (member_id, team_id, role, include_70) VALUES ($1, $2, $3, TRUE)',
            [memberId, teamId, role]
          );
        }
      }

      if (isEligible) {
        // Chỉ sửa liên kết đội khi quyền TeamLead hoặc đội nhóm được chọn.
        if (currentTeamIds.length > 0) {
          await pool.query(
            `DELETE FROM teamlead_member_teams
             WHERE member_id = $1 AND NOT (team_id = ANY($2::int[]))`,
            [memberId, currentTeamIds]
          );
        } else {
          await pool.query(
            'DELETE FROM teamlead_member_teams WHERE member_id = $1',
            [memberId]
          );
        }
      }
    }
  } catch (err) {
    console.error('syncUserToTeamLead error:', err);
  }
}

/**
 * Chạy đồng bộ toàn diện hai chiều
 */
export async function syncAllMemberAndTeamLeadData(): Promise<void> {
  await ensureMemberSchema();
  await syncTeamLeadToUsers();
}
