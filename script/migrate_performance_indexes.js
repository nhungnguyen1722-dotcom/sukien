const { Pool } = require('pg');
const { getDatabaseConfig } = require('./db-config');

const pool = new Pool(getDatabaseConfig());

async function main() {
  try {
    console.log('Adding performance indexes...');
    const queries = [
      'CREATE INDEX IF NOT EXISTS idx_event_registrations_event_id ON event_registrations (event_id)',
      'CREATE INDEX IF NOT EXISTS idx_event_registrations_referrer_id ON event_registrations (referrer_id)',
      'CREATE INDEX IF NOT EXISTS idx_event_in_charge_event_id ON event_in_charge (event_id)',
      'CREATE INDEX IF NOT EXISTS idx_event_logs_event_id ON event_logs (event_id)',
      'CREATE INDEX IF NOT EXISTS idx_event_attachments_event_id ON event_attachments (event_id)',
      'CREATE INDEX IF NOT EXISTS idx_event_schedules_event_id ON event_schedules (event_id)',
      'CREATE INDEX IF NOT EXISTS idx_contracts_contract_date ON contracts (contract_date)',
      'CREATE INDEX IF NOT EXISTS idx_contracts_closer_id ON contracts (closer_id)',
      'CREATE INDEX IF NOT EXISTS idx_contracts_referrer_id ON contracts (referrer_id)',
      'CREATE INDEX IF NOT EXISTS idx_transaction_logs_request_date ON transaction_logs (request_date)',
      'CREATE INDEX IF NOT EXISTS idx_transaction_logs_source_contract ON transaction_logs (source_contract_id)',
      'CREATE INDEX IF NOT EXISTS idx_fund_weekly_allocations_period ON fund_weekly_allocations (period_month, period_start, period_end)',
      'CREATE INDEX IF NOT EXISTS idx_users_full_name ON users (full_name)',
      'CREATE INDEX IF NOT EXISTS idx_users_phone ON users (phone)',
      `CREATE INDEX IF NOT EXISTS idx_users_normalized_phone ON users ((REGEXP_REPLACE(COALESCE(phone, ''), '[^0-9]', '', 'g')))`,
      'CREATE INDEX IF NOT EXISTS idx_users_normalized_full_name ON users ((LOWER(BTRIM(full_name))))',
      'CREATE INDEX IF NOT EXISTS idx_transaction_logs_beneficiary_user ON transaction_logs (beneficiary_user_id)',
      'CREATE INDEX IF NOT EXISTS idx_transaction_logs_request_date_id ON transaction_logs (request_date DESC, id DESC)',
      'CREATE INDEX IF NOT EXISTS idx_fund_event_expenses_event_date ON fund_event_expenses (event_date)',
      'CREATE INDEX IF NOT EXISTS idx_teamlead_member_teams_lookup ON teamlead_member_teams (team_id, member_id)'
    ];

    for (const q of queries) {
      await pool.query(q);
      console.log(`Executed: ${q}`);
    }

    console.log('All performance indexes successfully created.');
  } catch (err) {
    console.error('Index creation failed:', err);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

main();
