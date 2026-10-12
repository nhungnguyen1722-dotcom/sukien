const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_Gy2mBY4leKgb@ep-snowy-forest-ax0u3mls-pooler.c-4.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require',
  ssl: { rejectUnauthorized: false }
});

async function main() {
  const cols = await pool.query(`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'transaction_logs'
    ORDER BY ordinal_position;
  `);
  console.log('Columns in transaction_logs:');
  cols.rows.forEach(r => console.log(`  - ${r.column_name}: ${r.data_type}`));

  const tables = await pool.query(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public'
    ORDER BY table_name;
  `);
  console.log('\nTables in database:');
  console.log(tables.rows.map(r => r.table_name).join(', '));

  await pool.end();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
