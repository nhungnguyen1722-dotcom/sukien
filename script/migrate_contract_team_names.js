const { Client } = require('pg');
const { getDatabaseConfig } = require('./db-config');

const canonicalTeams = [
  'Kiến Vàng',
  'Ong Vàng',
  'Lộc Phát',
  'Thành Công',
  'Biệt đội Kim Cương',
  'Happy',
];

async function migrate() {
  const client = new Client(getDatabaseConfig());
  let step = 'connect';
  await client.connect();
  try {
    step = 'begin';
    await client.query('BEGIN');
    step = 'replace corrupted label';
    const corrupted = await client.query(
      `UPDATE contracts
       SET team_name = $1, updated_at = CURRENT_TIMESTAMP
       WHERE BTRIM(team_name) = $2
       RETURNING id`,
      ['Thành Công', 'Th?nh C?ng']
    );

    for (const team of canonicalTeams) {
      step = `normalize ${team}`;
      await client.query(
        `UPDATE contracts
         SET team_name = $1, updated_at = CURRENT_TIMESTAMP
         WHERE LOWER(BTRIM(team_name)) = LOWER(BTRIM($2))
           AND team_name IS DISTINCT FROM $3`,
        [team, team, team]
      );
    }

    step = 'validate team values';
    const invalid = await client.query(
      `SELECT BTRIM(COALESCE(team_name, '')) AS team_name, COUNT(*)::int AS records
       FROM contracts
       WHERE team_name IS NULL OR BTRIM(team_name) = ''
          OR BTRIM(team_name) NOT IN ($1, $2, $3, $4, $5, $6)
       GROUP BY BTRIM(COALESCE(team_name, ''))`,
      canonicalTeams
    );
    if (invalid.rowCount) {
      throw new Error(`Unrecognized contract team values remain: ${JSON.stringify(invalid.rows)}`);
    }

    step = 'summarize';
    const summary = await client.query(
      `SELECT BTRIM(team_name) AS team_name, COUNT(*)::int AS records
       FROM contracts
       GROUP BY BTRIM(team_name)
       ORDER BY team_name`
    );
    step = 'commit';
    await client.query('COMMIT');
    console.log(`Normalized ${corrupted.rowCount || 0} corrupted contract team values.`);
    console.log(`Validated ${summary.rows.reduce((total, row) => total + row.records, 0)} contracts against the six team options.`);
    for (const row of summary.rows) console.log(`${row.team_name}: ${row.records}`);
  } catch (error) {
    await client.query('ROLLBACK');
    error.migrationStep = step;
    throw error;
  } finally {
    await client.end();
  }
}

migrate().catch((error) => {
  console.error(`Contract team normalization failed at ${error.migrationStep}:`, error.message);
  process.exitCode = 1;
});
