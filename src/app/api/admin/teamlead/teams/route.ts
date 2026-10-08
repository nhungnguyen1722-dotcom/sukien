import { NextRequest } from 'next/server';
import pool from '@/lib/db';
import { ensureTeamLeadSchema, isTeamLeadAdmin } from '@/lib/teamlead';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  if (!isTeamLeadAdmin(request)) return Response.json({ success: false, error: 'Không có quyền truy cập.' }, { status: 403 });
  try {
    await ensureTeamLeadSchema();
    const result = await pool.query(`SELECT id, name FROM teamlead_teams ORDER BY name`);
    return Response.json({ success: true, teams: result.rows.map((row) => ({ id: Number(row.id), name: row.name })) });
  } catch (error: any) {
    console.error('Error loading TeamLead teams:', error);
    return Response.json({ success: false, error: error.message || 'Không thể tải danh sách đội nhóm.' }, { status: 500 });
  }
}
