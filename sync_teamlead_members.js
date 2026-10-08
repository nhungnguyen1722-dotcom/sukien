const XLSX = require('xlsx');
const path = require('node:path');
const { Pool } = require('pg');
const { getDatabaseConfig } = require('./db-config');

const workbookPath = path.resolve(__dirname, 'imagedata', 'Tong-hop-DNTT-T9.xlsx');
const pool = new Pool(getDatabaseConfig());

function phoneDigits(value) {
  return String(value ?? '').replace(/\D/g, '');
}

function phoneKey(value) {
  const digits = phoneDigits(value);
  return digits.startsWith('84') && digits.length >= 11 ? '0' + digits.slice(2) : digits;
}

function compactPhone(value) {
  return String(value ?? '').trim().replace(/\s/g, '');
}

function nameKey(value) {
  return String(value ?? '')
    .trim()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[đĐ]/g, (letter) => letter === 'Đ' ? 'D' : 'd')
    .toLocaleLowerCase('vi-VN')
    .replace(/[^a-z0-9]+/g, '');
}

function cleanTitle(value) {
  const title = String(value ?? '').trim();
  return title || null;
}

function readMembers() {
  const workbook = XLSX.readFile(workbookPath);
  const sheetName = workbook.SheetNames[3];
  if (!sheetName || !sheetName.toUpperCase().includes('TEAMLEAD')) {
    throw new Error('The expected TEAMLEAD copy is not the fourth sheet in the workbook.');
  }

  const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1, defval: '' });
  const entries = rows
    .map((row) => ({
      rowNumber: Number(row[0]),
      phone: phoneKey(row[1]),
      name: String(row[2] ?? '').trim(),
      team: String(row[3] ?? '').trim(),
      title: cleanTitle(row[6]),
    }))
    .filter((entry) => Number.isInteger(entry.rowNumber) && entry.rowNumber >= 1 && entry.rowNumber <= 45);

  if (entries.length !== 45 || entries.some((entry) => !entry.phone || !entry.name)) {
    throw new Error('Expected 45 complete member rows with names and phone numbers.');
  }

  const grouped = new Map();
  for (const entry of entries) {
    const existing = grouped.get(entry.phone) || { phone: entry.phone, names: new Set(), teams: new Set(), titles: new Set(), rows: [] };
    existing.names.add(entry.name);
    if (entry.team) existing.teams.add(entry.team);
    if (entry.title) existing.titles.add(entry.title);
    existing.rows.push(entry.rowNumber);
    grouped.set(entry.phone, existing);
  }

  for (const member of grouped.values()) {
    if (member.names.size !== 1 || member.titles.size > 1) {
      throw new Error('Conflicting names or titles for phone ' + member.phone + ' in rows ' + member.rows.join(', '));
    }
    member.name = [...member.names][0];
    member.title = member.titles.size ? [...member.titles][0] : null;
    member.teams = [...member.teams];
  }

  return { entries, members: [...grouped.values()] };
}

async function main() {
  const { entries, members } = readMembers();
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const teamNames = [...new Set(members.flatMap((member) => member.teams))];
    for (const teamName of teamNames) {
      await client.query(
        'INSERT INTO teams (name) SELECT $1::varchar WHERE NOT EXISTS (' +
          'SELECT 1 FROM teams WHERE lower(trim(name)) = lower(trim($1::varchar))' +
        ')',
        [teamName]
      );
    }

    const teamResult = await client.query('SELECT id, name FROM teams');
    const teamsByName = new Map(teamResult.rows.map((team) => [nameKey(team.name), team.id]));
    const usersResult = await client.query('SELECT id, full_name, phone FROM users');
    const users = usersResult.rows;
    const usedUserIds = new Set();
    const plan = [];

    for (const member of members) {
      const normalizedMatches = users.filter((user) => phoneKey(user.phone) === member.phone);
      const directMatches = normalizedMatches.filter((user) => compactPhone(user.phone) === member.phone);
      let existingUsers = [];
      let matchedBy = 'new';

      if (directMatches.length > 1) {
        const namedMatches = directMatches.filter((user) => nameKey(user.full_name) === nameKey(member.name));
        if (namedMatches.length !== directMatches.length) {
          throw new Error('Multiple exact phone records with conflicting names found for ' + member.phone);
        }
        existingUsers = namedMatches;
        matchedBy = 'phone';
      } else if (directMatches.length === 1) {
        const namedMatches = normalizedMatches.filter((user) => nameKey(user.full_name) === nameKey(member.name));
        existingUsers = namedMatches.length > 0 ? namedMatches : directMatches;
        matchedBy = 'phone';
      } else if (normalizedMatches.length === 1) {
        existingUsers = normalizedMatches;
        matchedBy = 'normalized phone';
      } else if (normalizedMatches.length > 1) {
        const namedMatches = normalizedMatches.filter((user) => nameKey(user.full_name) === nameKey(member.name));
        if (!namedMatches.length) throw new Error('Ambiguous phone records found for ' + member.phone);
        existingUsers = namedMatches;
        matchedBy = 'normalized phone';
      } else {
        const nameMatches = users.filter((user) => nameKey(user.full_name) === nameKey(member.name));
        if (nameMatches.length === 1 && !usedUserIds.has(nameMatches[0].id)) {
          existingUsers = nameMatches;
          matchedBy = 'unique name';
        }
      }

      if (existingUsers.some((user) => usedUserIds.has(user.id))) {
        throw new Error('The same existing user was matched to more than one source phone: ' + member.phone);
      }
      for (const user of existingUsers) usedUserIds.add(user.id);

      const teamIds = member.teams.map((teamName) => {
        const teamId = teamsByName.get(nameKey(teamName));
        if (!teamId) throw new Error('Could not resolve team: ' + teamName);
        return teamId;
      });
      plan.push({ member, existingUsers, matchedBy, teamIds });
    }

    let updated = 0;
    let updatedRecords = 0;
    let created = 0;
    let matchedByPhone = 0;
    let matchedByName = 0;

    for (const item of plan) {
      const { member, existingUsers, matchedBy, teamIds } = item;

      if (existingUsers.length) {
        updated += 1;
        if (matchedBy === 'unique name') matchedByName += 1;
        else matchedByPhone += 1;
        for (const existing of existingUsers) {
          const canonicalizePhone = compactPhone(existing.phone) === member.phone || matchedBy === 'unique name';
          await client.query(
            'UPDATE users SET full_name = $1, phone = CASE WHEN $2 THEN $3 ELSE phone END, title = $4, team_id = $5, updated_at = CURRENT_TIMESTAMP ' +
              'WHERE id = $6',
            [member.name, canonicalizePhone, member.phone, member.title, teamIds[0] ?? null, existing.id]
          );
          await client.query('DELETE FROM user_teams WHERE user_id = $1', [existing.id]);
          for (const teamId of teamIds) {
            await client.query('INSERT INTO user_teams (user_id, team_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [existing.id, teamId]);
          }
          updatedRecords += 1;
        }
      } else {
        const result = await client.query(
          'INSERT INTO users (full_name, phone, role, classification, title, ref_code, referral_group, status, team_id) ' +
            'VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id',
          [member.name, member.phone, 'Khác', 'Nhân sự', member.title, 'N_' + member.phone, 'Khách vãng lai', 'Đang hoạt động', teamIds[0] ?? null]
        );
        const userId = result.rows[0].id;
        created += 1;
        await client.query('DELETE FROM user_teams WHERE user_id = $1', [userId]);
        for (const teamId of teamIds) {
          await client.query('INSERT INTO user_teams (user_id, team_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [userId, teamId]);
        }
      }
    }

    await client.query('COMMIT');
    console.log('Source rows checked: ' + entries.length);
    console.log('Unique phone records processed: ' + members.length);
    console.log('Existing users updated: ' + updated + ' (' + matchedByPhone + ' by phone, ' + matchedByName + ' by unique name)');
    console.log('Existing user records synchronized: ' + updatedRecords);
    console.log('New users added: ' + created);
    console.log('Teams assigned from source: ' + teamNames.length);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((error) => {
  console.error('TeamLead member sync failed:', error.message);
  process.exitCode = 1;
});
