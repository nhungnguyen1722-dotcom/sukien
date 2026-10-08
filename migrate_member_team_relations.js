const { Pool } = require('pg');
const { getDatabaseConfig } = require('./db-config');

const pool = new Pool(getDatabaseConfig());

async function main() {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    await client.query(
      'CREATE TABLE IF NOT EXISTS user_teams (' +
        'user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE, ' +
        'team_id INTEGER NOT NULL REFERENCES teams(id) ON DELETE CASCADE, ' +
        'created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, ' +
        'PRIMARY KEY (user_id, team_id)' +
      ')'
    );
    await client.query('CREATE INDEX IF NOT EXISTS idx_user_teams_team_id ON user_teams(team_id)');
    await client.query(
      'INSERT INTO user_teams (user_id, team_id) ' +
        'SELECT id, team_id FROM users WHERE team_id IS NOT NULL ' +
        'ON CONFLICT (user_id, team_id) DO NOTHING'
    );
    await client.query('COMMIT');
    console.log('Member team relation table is ready; legacy team assignments were preserved.');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((error) => {
  console.error('Member team migration failed:', error.message);
  process.exitCode = 1;
});
