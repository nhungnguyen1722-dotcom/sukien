const fs = require('fs');
const path = require('path');
const { Client } = require('pg');
const XLSX = require('xlsx');
const { getDatabaseConfig } = require('./db-config');

const root = path.resolve(__dirname, '..');
const imageDir = path.join(root, 'imagedata');
const month = '2026-09-01';
const defaultRate = 0.029;
const sourceFiles = {
  month: 'TEAMLEAD_Tuan3_4_5_Thang9.xlsx',
  weeks: [
    { weekNo: 3, aliases: ['TTEAMLEAD_Tuan3.xlsx', 'TEAMLEAD_Tuan3.xlsx'] },
    { weekNo: 4, aliases: ['TTEAMLEAD_Tuan4.xlsx', 'TEAMLEAD_Tuan4.xlsx'] },
    { weekNo: 5, aliases: ['TTEAMLEAD_Tuan5.xlsx', 'TEAMLEAD_Tuan5.xlsx'] },
  ],
};

function readSheet(fileName) {
  const workbook = XLSX.readFile(path.join(imageDir, fileName));
  const worksheet = workbook.Sheets[workbook.SheetNames[0]];
  return XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
}

function bool(value) {
  return value === true || value === 1 || String(value).toLowerCase() === 'true';
}

function number(value) {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function clean(value) {
  return String(value || '').trim();
}

function roleName(value) {
  const role = clean(value);
  const lower = role.toLocaleLowerCase('vi-VN');
  if (lower.startsWith('p.') || lower.includes('phó')) return 'Phó Giám đốc';
  if (lower.includes('giám đốc')) return 'Giám đốc';
  if (lower.includes('trưởng phòng')) return 'Trưởng phòng';
  return role;
}

function rowsFromSheet(rows, weekNo) {
  const result = [];
  for (const row of rows.slice(5)) {
    const phone = clean(row[1]);
    const name = clean(row[2]);
    if (!phone || !name) continue;
    const team = clean(row[3]);
    if (!team && !bool(row[4]) && !bool(row[5])) continue;
    if (weekNo === 0) {
      result.push({
        name,
        phone,
        team,
        role: roleName(row[6]),
        eligible30: bool(row[4]),
        eligible70: bool(row[5]),
        salesBasis: number(row[8]),
        payout30: number(row[9]),
        payout70: number(row[10]),
        total: number(row[9]) + number(row[10]),
      });
    } else if (weekNo === 3) {
      result.push({
        name,
        phone,
        team,
        role: roleName(row[6]),
        eligible30: bool(row[4]),
        eligible70: bool(row[5]),
        salesBasis: number(row[11]),
        payout30: number(row[12]),
        payout70: number(row[13]),
        total: number(row[13]),
      });
    } else {
      result.push({
        name,
        phone,
        team,
        role: roleName(row[13]),
        eligible30: bool(row[11]),
        eligible70: bool(row[12]),
        salesBasis: number(row[15]),
        payout30: number(row[16]),
        payout70: number(row[17]),
        total: number(row[17]),
      });
    }
  }
  return result;
}

async function ensureSchema(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS teamlead_teams (
      id SERIAL PRIMARY KEY, name VARCHAR(160) NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    DO $$ BEGIN CREATE UNIQUE INDEX teamlead_teams_name_ci_idx ON teamlead_teams (LOWER(BTRIM(name))); EXCEPTION WHEN duplicate_table THEN NULL; END $$;
    CREATE TABLE IF NOT EXISTS teamlead_members (
      id SERIAL PRIMARY KEY, month DATE NOT NULL, member_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      member_name VARCHAR(255) NOT NULL, member_phone VARCHAR(60) NOT NULL, include_30 BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), UNIQUE (month, member_phone)
    );
    CREATE TABLE IF NOT EXISTS teamlead_member_teams (
      id SERIAL PRIMARY KEY, member_id INTEGER NOT NULL REFERENCES teamlead_members(id) ON DELETE CASCADE,
      team_id INTEGER NOT NULL REFERENCES teamlead_teams(id) ON DELETE RESTRICT,
      role VARCHAR(80) NOT NULL DEFAULT 'Trưởng phòng', include_70 BOOLEAN NOT NULL DEFAULT TRUE, UNIQUE (member_id, team_id)
    );
    CREATE TABLE IF NOT EXISTS teamlead_week_eligibility (
      member_team_id INTEGER NOT NULL REFERENCES teamlead_member_teams(id) ON DELETE CASCADE,
      week_no SMALLINT NOT NULL CHECK (week_no BETWEEN 1 AND 5), include_70 BOOLEAN NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), PRIMARY KEY (member_team_id, week_no)
    );
    CREATE TABLE IF NOT EXISTS teamlead_periods (
      id SERIAL PRIMARY KEY, month DATE NOT NULL, week_no SMALLINT NOT NULL DEFAULT 0 CHECK (week_no BETWEEN 0 AND 5),
      fund_rate NUMERIC(8,5) NOT NULL DEFAULT 0.029 CHECK (fund_rate >= 0 AND fund_rate <= 1),
      total_sales NUMERIC(18,2) NOT NULL DEFAULT 0, gross_fund NUMERIC(18,2) NOT NULL DEFAULT 0,
      fund_30 NUMERIC(18,2) NOT NULL DEFAULT 0, fund_70 NUMERIC(18,2) NOT NULL DEFAULT 0,
      is_locked BOOLEAN NOT NULL DEFAULT FALSE, locked_at TIMESTAMPTZ, is_imported BOOLEAN NOT NULL DEFAULT FALSE,
      source_file TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), UNIQUE (month, week_no)
    );
    CREATE TABLE IF NOT EXISTS teamlead_payout_rows (
      id SERIAL PRIMARY KEY, period_id INTEGER NOT NULL REFERENCES teamlead_periods(id) ON DELETE CASCADE,
      membership_id INTEGER REFERENCES teamlead_members(id) ON DELETE SET NULL,
      member_team_id INTEGER REFERENCES teamlead_member_teams(id) ON DELETE SET NULL,
      member_name VARCHAR(255) NOT NULL, member_phone VARCHAR(60) NOT NULL,
      team_id INTEGER REFERENCES teamlead_teams(id) ON DELETE SET NULL, team_name VARCHAR(160) NOT NULL DEFAULT '',
      role VARCHAR(80) NOT NULL DEFAULT '', eligible_30 BOOLEAN NOT NULL DEFAULT FALSE, eligible_70 BOOLEAN NOT NULL DEFAULT FALSE,
      sales_basis NUMERIC(18,2) NOT NULL DEFAULT 0, payout_30 NUMERIC(18,2) NOT NULL DEFAULT 0,
      payout_70 NUMERIC(18,2) NOT NULL DEFAULT 0, total_amount NUMERIC(18,2) NOT NULL DEFAULT 0,
      UNIQUE (period_id, member_phone, team_name)
    );
    DO $$ BEGIN CREATE INDEX teamlead_members_month_idx ON teamlead_members(month); EXCEPTION WHEN duplicate_table THEN NULL; END $$;
    DO $$ BEGIN CREATE INDEX teamlead_payout_rows_period_idx ON teamlead_payout_rows(period_id); EXCEPTION WHEN duplicate_table THEN NULL; END $$;
  `);
}

async function findOrCreateTeam(client, name) {
  if (!name) return null;
  let result = await client.query(`SELECT id FROM teamlead_teams WHERE LOWER(BTRIM(name))=LOWER(BTRIM($1)) LIMIT 1`, [name]);
  if (!result.rows.length) {
    try {
      await client.query(`INSERT INTO teamlead_teams(name) VALUES ($1)`, [name]);
    } catch (error) {
      if (error.code !== '23505') throw error;
    }
    result = await client.query(`SELECT id FROM teamlead_teams WHERE LOWER(BTRIM(name))=LOWER(BTRIM($1)) LIMIT 1`, [name]);
  }
  return Number(result.rows[0].id);
}

async function findUserId(client, phone) {
  const result = await client.query(`SELECT id FROM users WHERE phone = $1 LIMIT 1`, [phone]);
  return result.rows[0]?.id ? Number(result.rows[0].id) : null;
}

async function upsertMemberAndTeam(client, row, monthRoster) {
  const userId = await findUserId(client, row.phone);
  const existingMember = await client.query(`SELECT id, include_30 FROM teamlead_members WHERE month=$1 AND member_phone=$2 LIMIT 1`, [month, row.phone]);
  let membershipId;
  if (existingMember.rows.length) {
    membershipId = Number(existingMember.rows[0].id);
    const include30 = monthRoster ? row.eligible30 : (Boolean(existingMember.rows[0].include_30) || row.eligible30);
    await client.query(
      `UPDATE teamlead_members SET member_id=COALESCE($3,member_id), member_name=$4, include_30=$5 WHERE id=$1 AND month=$2`,
      [membershipId, month, userId, row.name, include30]
    );
  } else {
    const memberResult = await client.query(
      `INSERT INTO teamlead_members (month, member_id, member_name, member_phone, include_30) VALUES ($1,$2,$3,$4,$5) RETURNING id`,
      [month, userId, row.name, row.phone, row.eligible30]
    );
    membershipId = Number(memberResult.rows[0].id);
  }
  let teamId = null;
  let memberTeamId = null;
  if (row.team) {
    teamId = await findOrCreateTeam(client, row.team);
    const existingTeam = await client.query(`SELECT id FROM teamlead_member_teams WHERE member_id=$1 AND team_id=$2 LIMIT 1`, [membershipId, teamId]);
    if (existingTeam.rows.length) {
      memberTeamId = Number(existingTeam.rows[0].id);
      if (monthRoster) {
        await client.query(`UPDATE teamlead_member_teams SET role=$2, include_70=$3 WHERE id=$1`, [memberTeamId, row.role || 'Trưởng phòng', row.eligible70]);
      }
    } else {
      const teamResult = await client.query(
        `INSERT INTO teamlead_member_teams (member_id, team_id, role, include_70) VALUES ($1,$2,$3,$4) RETURNING id`,
        [membershipId, teamId, row.role || 'Trưởng phòng', row.eligible70]
      );
      memberTeamId = Number(teamResult.rows[0].id);
    }
  }
  return { membershipId, memberTeamId, teamId };
}

async function setWeekEligibility(client, memberTeamId, weekNo, eligible70) {
  if (!memberTeamId) return;
  const existing = await client.query(`SELECT 1 FROM teamlead_week_eligibility WHERE member_team_id=$1 AND week_no=$2`, [memberTeamId, weekNo]);
  if (existing.rows.length) {
    await client.query(`UPDATE teamlead_week_eligibility SET include_70=$3, updated_at=NOW() WHERE member_team_id=$1 AND week_no=$2`, [memberTeamId, weekNo, eligible70]);
  } else {
    await client.query(`INSERT INTO teamlead_week_eligibility (member_team_id, week_no, include_70) VALUES ($1,$2,$3)`, [memberTeamId, weekNo, eligible70]);
  }
}

async function savePeriod(client, period) {
  const prior = await client.query(`SELECT id, is_locked, is_imported FROM teamlead_periods WHERE month=$1 AND week_no=$2 FOR UPDATE`, [month, period.weekNo]);
  if (prior.rows[0] && prior.rows[0].is_locked && !prior.rows[0].is_imported) {
    throw new Error(`Kỳ ${period.weekNo || 'tháng'} đã được khóa thủ công; không ghi đè dữ liệu.`);
  }
  let periodId;
  if (prior.rows.length) {
    periodId = Number(prior.rows[0].id);
    await client.query(
      `UPDATE teamlead_periods SET fund_rate=$2, total_sales=$3, gross_fund=$4, fund_30=$5, fund_70=$6,
         is_locked=TRUE, locked_at=COALESCE(locked_at,NOW()), is_imported=TRUE, source_file=$7 WHERE id=$1`,
      [periodId, defaultRate, period.totalSales, period.grossFund, period.fund30, period.fund70, period.sourceFile]
    );
  } else {
    const inserted = await client.query(
      `INSERT INTO teamlead_periods (month, week_no, fund_rate, total_sales, gross_fund, fund_30, fund_70, is_locked, locked_at, is_imported, source_file)
       VALUES ($1,$2,$3,$4,$5,$6,$7,TRUE,NOW(),TRUE,$8) RETURNING id`,
      [month, period.weekNo, defaultRate, period.totalSales, period.grossFund, period.fund30, period.fund70, period.sourceFile]
    );
    periodId = Number(inserted.rows[0].id);
  }
  await client.query(`DELETE FROM teamlead_payout_rows WHERE period_id = $1`, [periodId]);
  for (const row of period.rows) {
    const refs = await upsertMemberAndTeam(client, row, false);
    if (period.weekNo) await setWeekEligibility(client, refs.memberTeamId, period.weekNo, row.eligible70);
    await client.query(
      `INSERT INTO teamlead_payout_rows (period_id, membership_id, member_team_id, member_name, member_phone, team_id, team_name,
        role, eligible_30, eligible_70, sales_basis, payout_30, payout_70, total_amount)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`,
      [periodId, refs.membershipId, refs.memberTeamId, row.name, row.phone, refs.teamId, row.team, row.role,
        row.eligible30, row.eligible70, row.salesBasis, row.payout30, row.payout70, row.total]
    );
  }
}

async function run() {
  const client = new Client(getDatabaseConfig());
  await client.connect();
  try {
    const monthPath = path.join(imageDir, sourceFiles.month);
    if (!fs.existsSync(monthPath)) throw new Error(`Không tìm thấy workbook: ${sourceFiles.month}`);
    const monthSheet = readSheet(sourceFiles.month);
    const monthRows = rowsFromSheet(monthSheet, 0);
    const monthTotals = monthSheet[1] || [];
    const monthSales = number((monthSheet[2] || [])[8]);
    const monthFund30 = number(monthTotals[9]);
    const monthFund70 = number(monthTotals[10]);

    const weekly = sourceFiles.weeks.map((source) => {
      const fileName = source.aliases.find((candidate) => fs.existsSync(path.join(imageDir, candidate)));
      if (!fileName) throw new Error(`Không tìm thấy workbook tuần ${source.weekNo}: ${source.aliases.join(' hoặc ')}`);
      const sheet = readSheet(fileName);
      const rows = rowsFromSheet(sheet, source.weekNo);
      const summary = sheet[1] || [];
      const baseRow = sheet[2] || [];
      const salesColumn = source.weekNo === 3 ? 11 : 15;
      const fundColumn30 = source.weekNo === 3 ? 12 : 16;
      const fundColumn70 = source.weekNo === 3 ? 13 : 17;
      const totalSales = number(baseRow[salesColumn]);
      const fund30 = number(summary[fundColumn30]);
      const fund70 = number(summary[fundColumn70]);
      return {
        weekNo: source.weekNo,
        sourceFile: fileName,
        rows,
        totalSales,
        grossFund: Math.round(totalSales * defaultRate),
        fund30,
        fund70,
      };
    });

    await client.query('BEGIN');
    await ensureSchema(client);
    const legacyTeams = await client.query(`SELECT DISTINCT BTRIM(team_name) AS name FROM contracts WHERE NULLIF(BTRIM(team_name), '') IS NOT NULL`);
    for (const row of legacyTeams.rows) await findOrCreateTeam(client, row.name);

    // Build the month roster first so weekly snapshots can link to stable roster rows.
    const monthlyEligibility = new Map();
    for (const row of monthRows) monthlyEligibility.set(row.phone, Boolean(monthlyEligibility.get(row.phone) || row.eligible30));
    const rosterRows = monthRows.map((row) => ({ ...row, eligible30: monthlyEligibility.get(row.phone) }));
    for (const row of rosterRows) await upsertMemberAndTeam(client, row, true);
    for (const period of weekly) {
      for (const row of period.rows) await upsertMemberAndTeam(client, row, false);
    }

    await savePeriod(client, {
      weekNo: 0,
      sourceFile: sourceFiles.month,
      rows: monthRows,
      totalSales: monthSales,
      grossFund: Math.round(monthSales * defaultRate),
      fund30: monthFund30,
      fund70: monthFund70,
    });
    for (const period of weekly) await savePeriod(client, period);
    await client.query('COMMIT');
    console.log(`Imported ${monthRows.length} month rows and ${weekly.map((item) => `${item.rows.length} rows for week ${item.weekNo}`).join(', ')} for ${month}.`);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    await client.end();
  }
}

run().catch((error) => {
  console.error('TeamLead seed failed:', error);
  process.exitCode = 1;
});
