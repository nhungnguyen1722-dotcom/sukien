import { NextRequest } from 'next/server';
import pool from '@/lib/db';
import { ensureTeamLeadSchema } from '@/lib/teamlead';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await ensureTeamLeadSchema();
    const result = await pool.query(`
      SELECT MIN(id)::int AS id, MIN(BTRIM(name)) AS name
      FROM (
        SELECT id, BTRIM(name) AS name FROM teams
        UNION ALL
        SELECT -(ROW_NUMBER() OVER (ORDER BY team_name))::int AS id, BTRIM(team_name) AS name
        FROM (SELECT DISTINCT team_name FROM contracts WHERE NULLIF(BTRIM(team_name), '') IS NOT NULL) existing
        UNION ALL
        SELECT (-2000000000 - ROW_NUMBER() OVER (ORDER BY name))::int AS id, BTRIM(name) AS name
        FROM (SELECT DISTINCT name FROM teamlead_teams WHERE NULLIF(BTRIM(name), '') IS NOT NULL) teamlead_existing
      ) all_teams
      GROUP BY LOWER(BTRIM(name))
      ORDER BY name ASC
    `);
    return Response.json({ teams: result.rows });
  } catch (error) {
    console.error('Failed to load teams:', error);
    return Response.json({ error: 'Không thể tải danh sách đội nhóm' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    if (!name) return Response.json({ error: 'Tên đội nhóm là bắt buộc' }, { status: 400 });
    if (name.length > 255) return Response.json({ error: 'Tên đội nhóm không được vượt quá 255 ký tự' }, { status: 400 });

    const existing = await pool.query('SELECT id, name FROM teams WHERE LOWER(BTRIM(name)) = LOWER(BTRIM($1)) LIMIT 1', [name]);
    let team = existing.rows[0];
    if (!team) {
      const inserted = await pool.query('INSERT INTO teams (name) VALUES ($1) RETURNING id, name', [name]);
      team = inserted.rows[0];
    }

    await ensureTeamLeadSchema();
    const teamLeadExisting = await pool.query(
      'SELECT 1 FROM teamlead_teams WHERE LOWER(BTRIM(name)) = LOWER(BTRIM($1)) LIMIT 1',
      [team.name]
    );
    if (!teamLeadExisting.rows.length) {
      try {
        await pool.query('INSERT INTO teamlead_teams (name) VALUES ($1)', [team.name]);
      } catch (error: any) {
        if (error.code !== '23505') throw error;
      }
    }

    return Response.json({ team: { id: Number(team.id), name: team.name } }, { status: existing.rows.length ? 200 : 201 });
  } catch (error: any) {
    console.error('Failed to create team:', error);
    if (error.code === '23505') return Response.json({ error: 'Đội nhóm này đã tồn tại' }, { status: 409 });
    return Response.json({ error: 'Không thể tạo đội nhóm' }, { status: 500 });
  }
}

