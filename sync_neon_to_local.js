const { Pool } = require('pg');

const remoteUrl = 'postgresql://neondb_owner:npg_Gy2mBY4leKgb@ep-snowy-forest-ax0u3mls-pooler.c-4.us-east-2.aws.neon.tech/neondb?sslmode=require';

const remotePool = new Pool({
  connectionString: remoteUrl,
  ssl: { rejectUnauthorized: false },
});

const localPool = new Pool({
  user: 'postgres',
  password: '1111222267',
  host: 'localhost',
  port: 5433,
  database: 'postgismap',
});

// Proper insertion order: Parents first, children later
const TABLE_ORDER = [
  'system_settings',
  'teams',
  'users',
  'events',
  'event_logs',
  'event_attachments',
  'event_in_charge',
  'event_registrations',
  'event_organizer_roles',
  'event_schedules',
  'invitations',
  'contracts',
  'lucky_wheels',
  'lucky_wheel_spins',
  'permissions',
  'training_logs',
  'transaction_logs',
  'table_tinh',
  'spatial_ref_sys',
];

async function sync() {
  console.log('=== STEP 1: Fetching all remote tables ===');
  const allRemoteTablesRes = await remotePool.query(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
    ORDER BY table_name
  `);
  const allRemoteTables = allRemoteTablesRes.rows.map(r => r.table_name);

  // Combine TABLE_ORDER and any remaining tables
  const syncOrder = [
    ...TABLE_ORDER.filter(t => allRemoteTables.includes(t)),
    ...allRemoteTables.filter(t => !TABLE_ORDER.includes(t)),
  ];

  // Convert json/jsonb columns in local lucky_wheels to text if needed
  try {
    await localPool.query(`ALTER TABLE "lucky_wheels" ALTER COLUMN "slices_json" TYPE TEXT`);
  } catch (e) {
    // Ignore
  }

  // STEP 2: Clear local tables in REVERSE order
  console.log('\n=== STEP 2: Clearing local tables (Reverse Order) ===');
  for (const tableName of [...syncOrder].reverse()) {
    try {
      await localPool.query(`DELETE FROM "${tableName}"`);
      console.log(`Cleared local table "${tableName}"`);
    } catch (err) {
      console.warn(`Could not clear table "${tableName}": ${err.message}`);
    }
  }

  // STEP 3: Sync each table in forward order
  console.log('\n=== STEP 3: Syncing tables and data (Parent First) ===');
  for (const tableName of syncOrder) {
    console.log(`\n>>> Processing table: ${tableName}`);

    // Get column metadata from remote
    const colRes = await remotePool.query(`
      SELECT column_name, data_type, udt_name, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = $1
      ORDER BY ordinal_position
    `, [tableName]);

    const columns = colRes.rows.map(c => c.column_name);

    // Ensure local table exists and has all columns
    const localTableCheck = await localPool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = $1
    `, [tableName]);

    if (localTableCheck.rows.length === 0) {
      const colDefs = colRes.rows.map(c => {
        let typeStr = c.data_type;
        if (c.data_type === 'USER-DEFINED' || c.udt_name === 'geometry') typeStr = 'TEXT';
        else if (c.data_type === 'ARRAY') typeStr = 'TEXT[]';
        else if (c.data_type === 'character varying') typeStr = 'VARCHAR';
        else if (c.data_type === 'json' || c.data_type === 'jsonb') typeStr = 'TEXT';
        return `"${c.column_name}" ${typeStr}`;
      });
      await localPool.query(`CREATE TABLE "${tableName}" (${colDefs.join(', ')})`);
      console.log(`Created table "${tableName}" in local database.`);
    } else {
      const localColRes = await localPool.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = $1
      `, [tableName]);
      const localCols = new Map(localColRes.rows.map(c => [c.column_name, c.data_type]));

      for (const col of colRes.rows) {
        if (!localCols.has(col.column_name)) {
          let typeStr = col.data_type;
          if (col.data_type === 'USER-DEFINED' || col.udt_name === 'geometry') typeStr = 'TEXT';
          else if (col.data_type === 'character varying') typeStr = 'VARCHAR';
          else if (col.data_type === 'json' || col.data_type === 'jsonb') typeStr = 'TEXT';
          else if (col.data_type === 'ARRAY') typeStr = 'TEXT[]';
          console.log(`Adding missing column "${col.column_name}" (${typeStr}) to local "${tableName}"`);
          try {
            await localPool.query(`ALTER TABLE "${tableName}" ADD COLUMN "${col.column_name}" ${typeStr}`);
          } catch (e) {
            console.warn(`Could not add column ${col.column_name}:`, e.message);
          }
        }
      }
    }

    // Fetch remote rows
    const dataRes = await remotePool.query(`SELECT * FROM "${tableName}"`);
    console.log(`Remote has ${dataRes.rows.length} rows.`);

    if (dataRes.rows.length > 0) {
      const colList = columns.map(c => `"${c}"`).join(', ');

      for (const row of dataRes.rows) {
        const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');
        const values = columns.map(col => {
          const val = row[col];
          if (val === null || val === undefined) return null;
          if (Array.isArray(val)) {
            return val;
          }
          if (typeof val === 'object' && !(val instanceof Date)) {
            return JSON.stringify(val);
          }
          return val;
        });

        const insertQuery = `INSERT INTO "${tableName}" (${colList}) VALUES (${placeholders})`;
        try {
          await localPool.query(insertQuery, values);
        } catch (insertErr) {
          console.error(`Error inserting row into ${tableName}:`, insertErr.message);
        }
      }
      console.log(`Successfully inserted ${dataRes.rows.length} rows into local "${tableName}".`);
    }

    // Update sequence
    if (columns.includes('id')) {
      try {
        const maxIdRes = await localPool.query(`SELECT COALESCE(MAX(id), 0) AS max_id FROM "${tableName}"`);
        const maxId = parseInt(maxIdRes.rows[0].max_id, 10);
        const seqRes = await localPool.query(`
          SELECT pg_get_serial_sequence('"' || $1 || '"', 'id') AS seq
        `, [tableName]);
        if (seqRes.rows[0]?.seq) {
          await localPool.query(`SELECT setval($1, $2, true)`, [seqRes.rows[0].seq, Math.max(1, maxId)]);
          console.log(`Updated sequence for "${tableName}" to ${maxId}`);
        }
      } catch (seqErr) {
        // Ignore sequence error
      }
    }
  }

  console.log('\n=== FINAL VERIFICATION: Row counts comparison ===');
  let allMatched = true;
  for (const tableName of syncOrder) {
    const localCount = await localPool.query(`SELECT count(*) FROM "${tableName}"`);
    const remoteCount = await remotePool.query(`SELECT count(*) FROM "${tableName}"`);
    const rCount = parseInt(remoteCount.rows[0].count, 10);
    const lCount = parseInt(localCount.rows[0].count, 10);
    const match = rCount === lCount ? '✓ OK' : '✗ MISMATCH';
    if (rCount !== lCount) allMatched = false;
    console.log(`Table: ${tableName.padEnd(25)} -> Remote: ${String(rCount).padStart(5)} | Local: ${String(lCount).padStart(5)} | ${match}`);
  }

  if (allMatched) {
    console.log('\n🎉 ALL TABLES SYNCED 100% PERFECTLY!');
  } else {
    console.log('\n⚠️ Some tables have discrepancies. Please review above.');
  }
}

sync()
  .catch(err => {
    console.error('Fatal Sync Error:', err);
  })
  .finally(async () => {
    await remotePool.end();
    await localPool.end();
  });
