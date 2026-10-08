const { Pool } = require('pg');
const { getDatabaseConfig } = require('./db-config');

const pool = new Pool(getDatabaseConfig());

async function main() {
  try {
    await pool.query(
      'CREATE TABLE IF NOT EXISTS teamlead_fund_splits (' +
        "fund_month CHAR(7) PRIMARY KEY CHECK (fund_month ~ '^[0-9]{4}-(0[1-9]|1[0-2])$'), " +
        'leader_percent SMALLINT NOT NULL CHECK (leader_percent IN (30, 70)), ' +
        'updated_by VARCHAR(255), ' +
        'updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP' +
      ')'
    );
    console.log('TeamLead fund split settings table is ready.');
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error('TeamLead fund migration failed:', error.message);
  process.exitCode = 1;
});
