import { NextRequest } from 'next/server';
import pool from '@/lib/db';
import { ensureTeamLeadSchema, getTeamLeadRoster, isTeamLeadAdmin, parseMonth } from '@/lib/teamlead';
import { ensureMemberSchema, syncTeamLeadToUsers } from '@/lib/memberTeams';

export const dynamic = 'force-dynamic';


function unauthorized() {
  return Response.json({ success: false, error: 'Bạn cần quyền quản trị để sử dụng phân hệ TeamLead.' }, { status: 403 });
}

export async function GET(request: NextRequest) {
  if (!isTeamLeadAdmin(request)) return unauthorized();
  const month = parseMonth(new URL(request.url).searchParams.get('month'));
  if (!month) return Response.json({ success: false, error: 'Tháng không hợp lệ.' }, { status: 400 });
  const weekNo = Number(new URL(request.url).searchParams.get('week') || 0);
  if (!Number.isInteger(weekNo) || weekNo < 0 || weekNo > 5) {
    return Response.json({ success: false, error: 'Tuần phải từ 1 đến 5.' }, { status: 400 });
  }
  try {
    const data = await getTeamLeadRoster(month, weekNo);
    return Response.json({ success: true, ...data });
  } catch (error: any) {
    console.error('Error loading TeamLead roster:', error);
    return Response.json({ success: false, error: error.message || 'Không thể tải danh sách TeamLead.' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  if (!isTeamLeadAdmin(request)) return unauthorized();
  let body: any;
  try {
    body = await request.json();
  } catch {
    return Response.json({ success: false, error: 'Dữ liệu gửi lên không hợp lệ.' }, { status: 400 });
  }

  try {
    await ensureTeamLeadSchema();
    if (body.action === 'create-team') {
      const name = typeof body.name === 'string' ? body.name.trim() : '';
      if (!name) return Response.json({ success: false, error: 'Tên đội nhóm không được để trống.' }, { status: 400 });
      if (name.length > 160) return Response.json({ success: false, error: 'Tên đội nhóm tối đa 160 ký tự.' }, { status: 400 });
      let team = (await pool.query(
        `SELECT id, name FROM teamlead_teams WHERE LOWER(BTRIM(name)) = LOWER(BTRIM($1)) LIMIT 1`,
        [name]
      )).rows[0];
      if (!team) {
        try {
          const result = await pool.query(`INSERT INTO teamlead_teams (name) VALUES ($1) RETURNING id, name`, [name]);
          team = result.rows[0];
        } catch (error: any) {
          if (error.code !== '23505') throw error;
          team = (await pool.query(
            `SELECT id, name FROM teamlead_teams WHERE LOWER(BTRIM(name)) = LOWER(BTRIM($1)) LIMIT 1`,
            [name]
          )).rows[0];
        }
      }
      return Response.json({ success: true, team: { id: Number(team.id), name: team.name } });
    }

    const month = parseMonth(body.month);
    if (!month) return Response.json({ success: false, error: 'Tháng không hợp lệ.' }, { status: 400 });

    if (body.action === 'clone-month') {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const targetLocked = await client.query(`SELECT 1 FROM teamlead_periods WHERE month=$1 AND is_locked=TRUE LIMIT 1`, [month]);
        if (targetLocked.rows.length) {
          await client.query('ROLLBACK');
          return Response.json({ success: false, error: 'Tháng này đã có kỳ khóa, không thể tạo danh sách kế thừa.' }, { status: 409 });
        }
        const exists = await client.query(`SELECT id FROM teamlead_members WHERE month = $1 LIMIT 1`, [month]);
        if (exists.rows.length) {
          await client.query('ROLLBACK');
          return Response.json({ success: false, error: 'Tháng này đã có danh sách TeamLead.' }, { status: 409 });
        }
        const previous = new Date(`${month}T00:00:00.000Z`);
        previous.setUTCMonth(previous.getUTCMonth() - 1);
        const previousMonth = previous.toISOString().slice(0, 10);
        const previousRoster = await client.query(
          `SELECT m.id, m.member_id, m.member_name, m.member_phone, m.include_30,
             mt.team_id, mt.role, mt.include_70, t.name AS team_name
           FROM teamlead_members m
           LEFT JOIN teamlead_member_teams mt ON mt.member_id = m.id
           LEFT JOIN teamlead_teams t ON t.id = mt.team_id
           WHERE m.month = $1 ORDER BY m.id, mt.id`,
          [previousMonth]
        );
        if (!previousRoster.rows.length) {
          await client.query('ROLLBACK');
          return Response.json({ success: false, error: 'Tháng trước chưa có danh sách để kế thừa.' }, { status: 404 });
        }
        const memberIds = new Map<number, number>();
        for (const row of previousRoster.rows) {
          const previousId = Number(row.id);
          let targetId = memberIds.get(previousId);
          if (!targetId) {
            const inserted = await client.query(
              `INSERT INTO teamlead_members (month, member_id, member_name, member_phone, include_30)
               VALUES ($1,$2,$3,$4,$5) RETURNING id`,
              [month, row.member_id, row.member_name, row.member_phone, row.include_30]
            );
            targetId = Number(inserted.rows[0].id);
            memberIds.set(previousId, targetId);
          }
          if (row.team_id) {
            await client.query(
              `INSERT INTO teamlead_member_teams (member_id, team_id, role, include_70)
               VALUES ($1,$2,$3,$4)`,
              [targetId, row.team_id, row.role, row.include_70]
            );
          }
        }
        await client.query('COMMIT');
        return Response.json({ success: true, copiedMembers: memberIds.size });
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    }

    if (body.action === 'set-eligibility') {
      const membershipId = Number(body.membershipId);
      const memberTeamId = Number(body.memberTeamId);
      const weekNo = Number(body.weekNo);
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const lockedMonth = await client.query(`SELECT is_locked FROM teamlead_periods WHERE month = $1 AND week_no = 0`, [month]);
        const lockedWeek = weekNo > 0
          ? await client.query(`SELECT is_locked FROM teamlead_periods WHERE month = $1 AND week_no = $2`, [month, weekNo])
          : { rows: [] };
        if (((body.include30 !== undefined || (body.include70 !== undefined && weekNo === 0)) && lockedMonth.rows[0]?.is_locked)
          || (weekNo > 0 && lockedWeek.rows[0]?.is_locked)) {
          await client.query('ROLLBACK');
          return Response.json({ success: false, error: 'Kỳ đã chốt nên không thể thay đổi quyền hưởng quỹ.' }, { status: 409 });
        }
        if (body.include30 !== undefined) {
          const updated = await client.query(
            `UPDATE teamlead_members SET include_30 = $3 WHERE id = $1 AND month = $2 RETURNING id`,
            [membershipId, month, Boolean(body.include30)]
          );
          if (!updated.rows.length) {
            await client.query('ROLLBACK');
            return Response.json({ success: false, error: 'Không tìm thấy thành viên trong tháng.' }, { status: 404 });
          }
        }
        if (body.include70 !== undefined) {
          const memberTeam = await client.query(
            `SELECT mt.id, mt.include_70 FROM teamlead_member_teams mt
             JOIN teamlead_members m ON m.id = mt.member_id
             WHERE mt.id = $1 AND m.month = $2`,
            [memberTeamId, month]
          );
          if (!memberTeam.rows.length) {
            await client.query('ROLLBACK');
            return Response.json({ success: false, error: 'Không tìm thấy đội nhóm của thành viên.' }, { status: 404 });
          }
          if (weekNo === 0) {
            await client.query(`UPDATE teamlead_member_teams SET include_70 = $2 WHERE id = $1`, [memberTeamId, Boolean(body.include70)]);
          } else if (Number.isInteger(weekNo) && weekNo >= 1 && weekNo <= 5) {
            const existingEligibility = await client.query(
              `SELECT 1 FROM teamlead_week_eligibility WHERE member_team_id=$1 AND week_no=$2`,
              [memberTeamId, weekNo]
            );
            if (existingEligibility.rows.length) {
              await client.query(
                `UPDATE teamlead_week_eligibility SET include_70=$3, updated_at=NOW() WHERE member_team_id=$1 AND week_no=$2`,
                [memberTeamId, weekNo, Boolean(body.include70)]
              );
            } else {
              await client.query(
                `INSERT INTO teamlead_week_eligibility (member_team_id, week_no, include_70) VALUES ($1,$2,$3)`,
                [memberTeamId, weekNo, Boolean(body.include70)]
              );
            }
          } else {
            await client.query('ROLLBACK');
            return Response.json({ success: false, error: 'Tuần không hợp lệ.' }, { status: 400 });
          }
        }
        await client.query('COMMIT');
        try {
          await syncTeamLeadToUsers(month);
        } catch (syncErr) {
          console.error('Failed to sync TeamLead to users:', syncErr);
        }
        return Response.json({ success: true });
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    }

    if (body.action === 'save-roster') {
      if (!Array.isArray(body.roster)) return Response.json({ success: false, error: 'Danh sách thành viên không hợp lệ.' }, { status: 400 });
      const weekNo = Number(body.weekNo || 0);
      if (!Number.isInteger(weekNo) || weekNo < 0 || weekNo > 5) {
        return Response.json({ success: false, error: 'Tuần không hợp lệ.' }, { status: 400 });
      }
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const lockedMonth = await client.query(`SELECT is_locked FROM teamlead_periods WHERE month = $1 AND week_no = 0`, [month]);
        if (lockedMonth.rows[0]?.is_locked) {
          await client.query('ROLLBACK');
          return Response.json({ success: false, error: 'Danh sách tháng đã chốt, không thể chỉnh sửa.' }, { status: 409 });
        }
        if (weekNo > 0) {
          const lockedWeek = await client.query(`SELECT is_locked FROM teamlead_periods WHERE month = $1 AND week_no = $2`, [month, weekNo]);
          if (lockedWeek.rows[0]?.is_locked) {
            await client.query('ROLLBACK');
            return Response.json({ success: false, error: 'Tuần đã chốt, không thể thay đổi danh sách hưởng quỹ.' }, { status: 409 });
          }
        }
        const submittedIds = new Set<number>();
        const userIds = Array.from(new Set(body.roster.map((row: any) => Number(row.userId)).filter((id: number) => Number.isInteger(id) && id > 0)));
        const usersResult = userIds.length
          ? await client.query(`SELECT id, full_name, phone FROM users WHERE id = ANY($1::int[])`, [userIds])
          : { rows: [] };
        const userById = new Map(usersResult.rows.map((row: any) => [Number(row.id), row]));
        const teamIds = Array.from(new Set(body.roster.flatMap((row: any) => Array.isArray(row.teams) ? row.teams.map((team: any) => Number(team.teamId)) : [])
          .filter((id: number) => Number.isInteger(id) && id > 0)));
        const teamsResult = teamIds.length
          ? await client.query(`SELECT id FROM teamlead_teams WHERE id = ANY($1::int[])`, [teamIds])
          : { rows: [] };
        const validTeamIds = new Set(teamsResult.rows.map((row: any) => Number(row.id)));

        for (const input of body.roster) {
          const userId = Number(input.userId);
          const user = userById.get(userId) as any;
          let memberName = user?.full_name;
          let memberPhone = user ? String(user.phone || `USER:${user.id}`).trim() : '';
          let membershipId = 0;
          if (!user) {
            const existing = await client.query(
              `SELECT id, member_name, member_phone FROM teamlead_members WHERE id = $1 AND month = $2 FOR UPDATE`,
              [Number(input.membershipId), month]
            );
            if (!existing.rows.length) {
              await client.query('ROLLBACK');
              return Response.json({ success: false, error: 'Một thành viên không còn trong danh sách thành viên chung.' }, { status: 400 });
            }
            membershipId = Number(existing.rows[0].id);
            memberName = existing.rows[0].member_name;
            memberPhone = existing.rows[0].member_phone;
            const updated = await client.query(
              `UPDATE teamlead_members SET member_name=$3, include_30=$4 WHERE id=$1 AND month=$2 RETURNING id`,
              [membershipId, month, memberName, Boolean(input.include30)]
            );
            membershipId = Number(updated.rows[0].id);
          } else {
            const existingMember = await client.query(
              `SELECT id FROM teamlead_members WHERE month=$1 AND member_phone=$2 LIMIT 1`,
              [month, memberPhone]
            );
            if (existingMember.rows.length) {
              membershipId = Number(existingMember.rows[0].id);
              await client.query(
                `UPDATE teamlead_members SET member_id=$3, member_name=$4, include_30=$5 WHERE id=$1 AND month=$2`,
                [membershipId, month, user.id, user.full_name, Boolean(input.include30)]
              );
            } else {
              const memberResult = await client.query(
                `INSERT INTO teamlead_members (month, member_id, member_name, member_phone, include_30)
                 VALUES ($1,$2,$3,$4,$5) RETURNING id`,
                [month, user.id, user.full_name, memberPhone, Boolean(input.include30)]
              );
              membershipId = Number(memberResult.rows[0].id);
            }
          }
          submittedIds.add(membershipId);
          const requestedTeams = Array.isArray(input.teams) ? input.teams : [];
          const requestedTeamIds = new Set<number>();
          for (const team of requestedTeams) {
            const teamId = Number(team.teamId);
            if (!validTeamIds.has(teamId) || requestedTeamIds.has(teamId)) continue;
            requestedTeamIds.add(teamId);
            const role = typeof team.role === 'string' && ['Giám đốc', 'Phó Giám đốc', 'Trưởng phòng'].includes(team.role)
              ? team.role
              : 'Trưởng phòng';
            const include70Default = team.include70Default === undefined
              ? Boolean(team.include70)
              : Boolean(team.include70Default);
            const existingMemberTeam = await client.query(
              `SELECT id FROM teamlead_member_teams WHERE member_id=$1 AND team_id=$2 LIMIT 1`,
              [membershipId, teamId]
            );
            let memberTeamId: number;
            if (existingMemberTeam.rows.length) {
              memberTeamId = Number(existingMemberTeam.rows[0].id);
              await client.query(
                `UPDATE teamlead_member_teams SET role=$3, include_70=$4 WHERE id=$1 AND member_id=$2`,
                [memberTeamId, membershipId, role, include70Default]
              );
            } else {
              const memberTeamResult = await client.query(
                `INSERT INTO teamlead_member_teams (member_id, team_id, role, include_70) VALUES ($1,$2,$3,$4) RETURNING id`,
                [membershipId, teamId, role, include70Default]
              );
              memberTeamId = Number(memberTeamResult.rows[0].id);
            }
            const weeklyEligibility = team.eligible70 === undefined ? team.include70 : team.eligible70;
            if (weekNo > 0 && weeklyEligibility !== undefined) {
              const existingEligibility = await client.query(
                `SELECT 1 FROM teamlead_week_eligibility WHERE member_team_id=$1 AND week_no=$2`,
                [memberTeamId, weekNo]
              );
              if (existingEligibility.rows.length) {
                await client.query(
                  `UPDATE teamlead_week_eligibility SET include_70=$3, updated_at=NOW() WHERE member_team_id=$1 AND week_no=$2`,
                  [memberTeamId, weekNo, Boolean(weeklyEligibility)]
                );
              } else {
                await client.query(
                  `INSERT INTO teamlead_week_eligibility (member_team_id, week_no, include_70) VALUES ($1,$2,$3)`,
                  [memberTeamId, weekNo, Boolean(weeklyEligibility)]
                );
              }
            }
          }
          await client.query(
            `DELETE FROM teamlead_member_teams WHERE member_id = $1 AND NOT (team_id = ANY($2::int[]))`,
            [membershipId, Array.from(requestedTeamIds)]
          );
        }
        const previous = await client.query(`SELECT id FROM teamlead_members WHERE month = $1`, [month]);
        const removed = previous.rows.map((row: any) => Number(row.id)).filter((id: number) => !submittedIds.has(id));
        if (removed.length) await client.query(`DELETE FROM teamlead_members WHERE id = ANY($1::int[])`, [removed]);
        await client.query('COMMIT');
        try {
          await syncTeamLeadToUsers(month);
        } catch (syncErr) {
          console.error('Failed to sync TeamLead to users:', syncErr);
        }
        return Response.json({ success: true, savedMembers: submittedIds.size });
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    }

    return Response.json({ success: false, error: 'Thao tác không được hỗ trợ.' }, { status: 400 });
  } catch (error: any) {
    console.error('Error saving TeamLead data:', error);
    if (error.code === '23505') return Response.json({ success: false, error: 'Dữ liệu bị trùng.' }, { status: 409 });
    return Response.json({ success: false, error: error.message || 'Không thể lưu dữ liệu TeamLead.' }, { status: 500 });
  }
}
