const { Pool } = require('pg');
const { loadEnvConfig } = require('@next/env');

loadEnvConfig(process.cwd());

const connectionString = process.env.NEON_CONN_STRING;
if (!connectionString) {
  throw new Error('NEON_CONN_STRING is required in the environment.');
}

const sourcePool = new Pool({
  connectionString,
  connectionTimeoutMillis: 30000,
});

const targetPool = new Pool({
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 5433),
  database: process.env.DB_NAME || 'postgismap',
  connectionTimeoutMillis: 10000,
});

function quoteIdentifier(value) {
  return `"${value.replace(/"/g, '""')}"`;
}

async function importContracts() {
  let sourceClient;
  let targetClient;
  let transactionOpen = false;

  try {
    sourceClient = await sourcePool.connect();
    targetClient = await targetPool.connect();

    const [sourceTable, targetTable] = await Promise.all([
      sourceClient.query(
        "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'contracts' AND table_type = 'BASE TABLE'"
      ),
      targetClient.query(
        "SELECT column_name, is_nullable, column_default FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'contracts' ORDER BY ordinal_position"
      ),
    ]);

    if (!sourceTable.rows.length || !targetTable.rows.length) {
      throw new Error('The contracts table is missing from the source or target database.');
    }

    const [sourceColumns, sourceRows] = await Promise.all([
      sourceClient.query(
        "SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'contracts' ORDER BY ordinal_position"
      ),
      sourceClient.query('SELECT * FROM contracts ORDER BY id'),
    ]);
    const sourceColumnNames = sourceColumns.rows.map((row) => row.column_name);
    const targetColumnNames = new Set(targetTable.rows.map((row) => row.column_name));
    const sharedColumns = sourceColumnNames.filter((column) => targetColumnNames.has(column));

    if (!sharedColumns.includes('id')) {
      throw new Error('The contracts table must have a shared id column.');
    }

    const requiredTargetOnlyColumns = targetTable.rows.filter(
      (column) => !sourceColumnNames.includes(column.column_name)
        && column.is_nullable === 'NO'
        && column.column_default == null
    );
    if (requiredTargetOnlyColumns.length) {
      throw new Error('The target has required contract columns that the source cannot provide.');
    }

    const updateColumns = sharedColumns.filter((column) => column !== 'id');
    const updateSql = updateColumns.length
      ? `UPDATE contracts SET ${updateColumns.map((column, index) => `${quoteIdentifier(column)} = $${index + 1}`).join(', ')} WHERE id = $${updateColumns.length + 1}`
      : null;
    const insertSql = `INSERT INTO contracts (${sharedColumns.map(quoteIdentifier).join(', ')}) VALUES (${sharedColumns.map((_, index) => `$${index + 1}`).join(', ')})`;

    await targetClient.query('BEGIN');
    transactionOpen = true;

    let updated = 0;
    let inserted = 0;
    for (const row of sourceRows.rows) {
      const values = sharedColumns.map((column) => row[column]);
      const updateValues = updateColumns.map((column) => row[column]);
      const result = updateSql
        ? await targetClient.query(updateSql, [...updateValues, row.id])
        : { rowCount: 0 };

      if (result.rowCount) {
        updated += 1;
      } else {
        await targetClient.query(insertSql, values);
        inserted += 1;
      }
    }

    const sequenceResult = await targetClient.query(
      "SELECT pg_get_serial_sequence('public.contracts', 'id') AS sequence_name"
    );
    const sequenceName = sequenceResult.rows[0]?.sequence_name;
    if (sequenceName && sourceRows.rows.length) {
      await targetClient.query(
        'SELECT setval($1::regclass, (SELECT MAX(id) FROM contracts), true)',
        [sequenceName]
      );
    }

    await targetClient.query('COMMIT');
    transactionOpen = false;

    const [sourceCount, targetCount] = await Promise.all([
      sourceClient.query('SELECT COUNT(*)::int AS count FROM contracts'),
      targetClient.query('SELECT COUNT(*)::int AS count FROM contracts'),
    ]);

    console.log(JSON.stringify({
      sourceContracts: sourceCount.rows[0].count,
      targetContracts: targetCount.rows[0].count,
      inserted,
      refreshed: updated,
      targetOnlyColumnsPreserved: targetTable.rows
        .map((column) => column.column_name)
        .filter((column) => !sourceColumnNames.includes(column)),
    }));
  } catch (error) {
    if (transactionOpen && targetClient) {
      await targetClient.query('ROLLBACK').catch(() => {});
    }
    throw error;
  } finally {
    sourceClient?.release();
    targetClient?.release();
    await Promise.all([sourcePool.end(), targetPool.end()]);
  }
}

importContracts().catch((error) => {
  console.error(`Contract import failed (${error.code || 'ERROR'}). Check the database configuration and schema.`);
  process.exitCode = 1;
});
