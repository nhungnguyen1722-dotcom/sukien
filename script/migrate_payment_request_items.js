const { Client } = require('pg');

const DATABASE_URL = process.env.DATABASE_URL || "postgresql://neondb_owner:npg_Gy2mBY4leKgb@ep-snowy-forest-ax0u3mls-pooler.c-4.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require";

async function run() {
  const client = new Client({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  await client.connect();
  console.log('Connected to Neon PostgreSQL.');
  await client.query('BEGIN');

  try {
    // 1. Add columns to transaction_logs if not exists
    console.log('Ensuring columns on transaction_logs...');
    await client.query(`
      ALTER TABLE transaction_logs 
      ADD COLUMN IF NOT EXISTS items JSONB DEFAULT '[]'::jsonb;
    `);

    await client.query(`
      ALTER TABLE transaction_logs 
      ADD COLUMN IF NOT EXISTS note TEXT;
    `);

    // 2. Create transaction_log_items table if not exists
    console.log('Creating transaction_log_items table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS transaction_log_items (
        id SERIAL PRIMARY KEY,
        transaction_log_id INTEGER REFERENCES transaction_logs(id) ON DELETE CASCADE,
        item_order INTEGER DEFAULT 1,
        title VARCHAR(255) NOT NULL,
        subtitle VARCHAR(255),
        fund_source VARCHAR(255),
        beneficiary_name VARCHAR(255),
        beneficiary_phone VARCHAR(50),
        beneficiary_bank_account VARCHAR(255),
        beneficiary_bank_name VARCHAR(255),
        beneficiary_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        amount NUMERIC(15, 2) NOT NULL DEFAULT 0,
        note TEXT,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_transaction_log_items_log_id 
      ON transaction_log_items (transaction_log_id);
    `);

    // 3. Backfill existing transaction_logs without items
    console.log('Backfilling existing transaction logs with single-item default...');
    const existingLogs = await client.query(`
      SELECT id, detail_content, fund_source, beneficiary_name, beneficiary_phone,
             beneficiary_bank_account, beneficiary_bank_name, beneficiary_user_id,
             proposed_amount
      FROM transaction_logs
      WHERE items IS NULL OR items = '[]'::jsonb
    `);

    console.log(`Found ${existingLogs.rows.length} logs needing initial item backfill.`);
    for (const log of existingLogs.rows) {
      if (log.proposed_amount && Number(log.proposed_amount) > 0) {
        const item = {
          order: 1,
          title: log.detail_content || 'Khoản chi phí đề xuất',
          subtitle: '',
          fund_source: log.fund_source || '',
          beneficiary_name: log.beneficiary_name || '',
          beneficiary_phone: log.beneficiary_phone || null,
          beneficiary_bank_account: log.beneficiary_bank_account || null,
          beneficiary_bank_name: log.beneficiary_bank_name || null,
          beneficiary_user_id: log.beneficiary_user_id || null,
          amount: Number(log.proposed_amount),
          note: ''
        };

        await client.query(
          `UPDATE transaction_logs SET items = $1 WHERE id = $2`,
          [JSON.stringify([item]), log.id]
        );

        // Check if items table already has record
        const itemExists = await client.query(
          `SELECT 1 FROM transaction_log_items WHERE transaction_log_id = $1 LIMIT 1`,
          [log.id]
        );
        if (!itemExists.rows.length) {
          await client.query(
            `INSERT INTO transaction_log_items (
              transaction_log_id, item_order, title, subtitle, fund_source,
              beneficiary_name, beneficiary_phone, beneficiary_bank_account,
              beneficiary_bank_name, beneficiary_user_id, amount
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
            [
              log.id, 1, item.title, item.subtitle, item.fund_source,
              item.beneficiary_name, item.beneficiary_phone, item.beneficiary_bank_account,
              item.beneficiary_bank_name, item.beneficiary_user_id, item.amount
            ]
          );
        }
      }
    }

    await client.query('COMMIT');
    console.log('Migration completed successfully!');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

run();
