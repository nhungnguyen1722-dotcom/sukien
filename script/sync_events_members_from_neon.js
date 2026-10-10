/* eslint-disable @typescript-eslint/no-require-imports */
// Synchronizes the member roster and the complete event graph from Neon to the
// database used by this source tree. It deliberately never deletes local rows.
// Run without flags to inspect changes; pass --apply to write in one transaction.
const path = require('path');
const { Pool } = require('pg');
const { loadEnvConfig } = require('@next/env');

const projectRoot = path.resolve(__dirname, '..');
loadEnvConfig(projectRoot);

const APPLY = process.argv.includes('--apply');
const TABLES = [
  { name: 'teams', deferredColumns: ['leader_id'] },
  { name: 'users', deferredColumns: ['team_id', 'referrer_id'] },
  { name: 'events', deferredColumns: [] },
  { name: 'event_attachments', deferredColumns: [] },
  { name: 'event_in_charge', deferredColumns: [] },
  { name: 'event_logs', deferredColumns: [] },
  { name: 'event_organizer_roles', deferredColumns: [] },
  { name: 'event_registrations', deferredColumns: [] },
  { name: 'event_schedules', deferredColumns: [] },
];

function quoteIdentifier(value) {
  return `"${value.replaceAll('"', '""')}"`;
}

function localConfig() {
  return {
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD,
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 5433),
    database: process.env.DB_NAME || 'postgismap',
  };
}

function neonConfig() {
  if (!process.env.NEON_CONN_STRING) {
    throw new Error('NEON_CONN_STRING is required in .env.local.');
  }

  return {
    connectionString: process.env.NEON_CONN_STRING,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 30_000,
  };
}

async function tableExists(pool, tableName) {
  const result = await pool.query(
    `SELECT 1
     FROM information_schema.tables
     WHERE table_schema = 'public' AND table_name = $1 AND table_type = 'BASE TABLE'`,
    [tableName]
  );
  return result.rows.length > 0;
}

async function getColumns(pool, tableName) {
  const result = await pool.query(
    `SELECT column_name, is_nullable, column_default
     FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = $1
     ORDER BY ordinal_position`,
    [tableName]
  );
  return result.rows;
}

async function getSingleColumnUniqueColumns(pool, tableName) {
  const result = await pool.query(
    `SELECT attribute.attname AS column_name
     FROM pg_index index_def
     JOIN pg_class relation ON relation.oid = index_def.indrelid
     JOIN pg_namespace namespace ON namespace.oid = relation.relnamespace
     JOIN pg_attribute attribute
       ON attribute.attrelid = relation.oid
       AND attribute.attnum = index_def.indkey[0]
     WHERE namespace.nspname = 'public'
       AND relation.relname = $1
       AND index_def.indisunique
       AND array_length(index_def.indkey, 1) = 1`,
    [tableName]
  );
  return result.rows.map((row) => row.column_name);
}

function stableValue(value) {
  if (value === null || value === undefined) return value;
  if (value instanceof Date) return value.toISOString();
  if (Buffer.isBuffer(value)) return value.toString('hex');
  if (Array.isArray(value)) return value.map(stableValue);
  if (typeof value === 'object') {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stableValue(value[key])]));
  }
  return value;
}

function rowsDiffer(sourceRow, targetRow, columns) {
  return columns.some((column) => (
    JSON.stringify(stableValue(sourceRow[column])) !== JSON.stringify(stableValue(targetRow[column]))
  ));
}

async function buildTablePlan(sourcePool, targetPool, definition) {
  const { name } = definition;
  const [sourceExists, targetExists] = await Promise.all([
    tableExists(sourcePool, name),
    tableExists(targetPool, name),
  ]);

  if (!sourceExists || !targetExists) {
    throw new Error(`Table ${name} is missing from the ${!sourceExists ? 'Neon source' : 'local target'} database.`);
  }

  const [sourceColumns, targetColumns] = await Promise.all([
    getColumns(sourcePool, name),
    getColumns(targetPool, name),
  ]);
  const sourceColumnNames = sourceColumns.map((column) => column.column_name);
  const targetColumnNames = new Set(targetColumns.map((column) => column.column_name));
  const sharedColumns = sourceColumnNames.filter((column) => targetColumnNames.has(column));
  const requiredTargetOnlyColumns = targetColumns.filter((column) => (
    !sourceColumnNames.includes(column.column_name)
    && column.is_nullable === 'NO'
    && column.column_default === null
  ));

  if (!sharedColumns.includes('id')) {
    throw new Error(`Table ${name} does not have a shared id column.`);
  }
  if (requiredTargetOnlyColumns.length) {
    throw new Error(
      `Table ${name} has required local-only columns: ${requiredTargetOnlyColumns.map((column) => column.column_name).join(', ')}`
    );
  }

  const rowsResult = await sourcePool.query(`SELECT * FROM ${quoteIdentifier(name)} ORDER BY id`);
  const targetRowsResult = await targetPool.query(
    `SELECT ${sharedColumns.map(quoteIdentifier).join(', ')} FROM ${quoteIdentifier(name)} ORDER BY id`
  );
  const targetById = new Map(targetRowsResult.rows.map((row) => [Number(row.id), row]));
  const insertedIds = [];
  const changedIds = [];
  for (const row of rowsResult.rows) {
    const targetRow = targetById.get(Number(row.id));
    if (!targetRow) {
      insertedIds.push(Number(row.id));
    } else if (rowsDiffer(row, targetRow, sharedColumns)) {
      changedIds.push(Number(row.id));
    }
  }

  const uniqueColumns = (await getSingleColumnUniqueColumns(targetPool, name))
    .filter((column) => column !== 'id' && sharedColumns.includes(column));
  const conflicts = [];
  for (const uniqueColumn of uniqueColumns) {
    const localByValue = new Map();
    for (const row of targetRowsResult.rows) {
      if (row[uniqueColumn] !== null && row[uniqueColumn] !== undefined) {
        localByValue.set(String(row[uniqueColumn]), Number(row.id));
      }
    }
    for (const row of rowsResult.rows) {
      const value = row[uniqueColumn];
      const localId = value === null || value === undefined ? undefined : localByValue.get(String(value));
      if (localId !== undefined && localId !== Number(row.id)) {
        conflicts.push(`${uniqueColumn} (${String(value).slice(0, 80)}) maps to local id ${localId}, Neon id ${row.id}`);
      }
    }
  }

  return {
    ...definition,
    sourceRows: rowsResult.rows,
    sourceCount: rowsResult.rows.length,
    targetCount: targetRowsResult.rows.length,
    targetById,
    sharedColumns,
    insertedIds,
    changedIds,
    conflicts,
  };
}

function statementColumns(plan, includeDeferred) {
  return plan.sharedColumns.filter((column) => (
    column !== 'id' && (includeDeferred || !plan.deferredColumns.includes(column))
  ));
}

async function mergeTable(targetClient, plan) {
  const updateColumns = statementColumns(plan, false);
  const insertColumns = ['id', ...updateColumns];
  const updateSql = updateColumns.length
    ? `UPDATE ${quoteIdentifier(plan.name)} SET ${updateColumns.map((column, index) => `${quoteIdentifier(column)} = $${index + 1}`).join(', ')} WHERE id = $${updateColumns.length + 1}`
    : null;
  const insertSql = `INSERT INTO ${quoteIdentifier(plan.name)} (${insertColumns.map(quoteIdentifier).join(', ')}) VALUES (${insertColumns.map((_, index) => `$${index + 1}`).join(', ')})`;
  let inserted = 0;
  let refreshed = 0;

  for (const row of plan.sourceRows) {
    const targetRow = plan.targetById.get(Number(row.id));
    if (targetRow) {
      if (rowsDiffer(row, targetRow, plan.sharedColumns)) {
        if (updateSql) {
          await targetClient.query(updateSql, [...updateColumns.map((column) => row[column]), row.id]);
        }
        refreshed += 1;
      }
    } else {
      await targetClient.query(insertSql, insertColumns.map((column) => row[column]));
      inserted += 1;
    }
  }

  return { inserted, refreshed };
}

async function applyDeferredColumns(targetClient, plan) {
  const deferred = plan.deferredColumns.filter((column) => plan.sharedColumns.includes(column));
  if (!deferred.length) return;

  const sql = `UPDATE ${quoteIdentifier(plan.name)} SET ${deferred.map((column, index) => `${quoteIdentifier(column)} = $${index + 1}`).join(', ')} WHERE id = $${deferred.length + 1}`;
  for (const row of plan.sourceRows) {
    await targetClient.query(sql, [...deferred.map((column) => row[column]), row.id]);
  }
}

async function resetSequence(targetClient, tableName) {
  const result = await targetClient.query(
    'SELECT pg_get_serial_sequence($1, $2) AS sequence_name',
    [`public.${tableName}`, 'id']
  );
  const sequenceName = result.rows[0]?.sequence_name;
  if (!sequenceName) return;

  await targetClient.query(
    `SELECT setval(
       $1::regclass,
       GREATEST(COALESCE((SELECT MAX(id) FROM ${quoteIdentifier(tableName)}), 1), 1),
       (SELECT COUNT(*) > 0 FROM ${quoteIdentifier(tableName)})
     )`,
    [sequenceName]
  );
}

async function verifyTable(targetClient, plan) {
  const result = await targetClient.query(
    `SELECT ${plan.sharedColumns.map(quoteIdentifier).join(', ')} FROM ${quoteIdentifier(plan.name)}`
  );
  const targetById = new Map(result.rows.map((row) => [Number(row.id), row]));
  const mismatch = plan.sourceRows.find((row) => {
    const targetRow = targetById.get(Number(row.id));
    return !targetRow || rowsDiffer(row, targetRow, plan.sharedColumns);
  });
  if (mismatch) {
    throw new Error(`Verification failed for ${plan.name} id ${mismatch.id}.`);
  }
}

async function main() {
  const sourcePool = new Pool(neonConfig());
  const targetPool = new Pool(localConfig());
  let targetClient;

  try {
    const plans = [];
    for (const definition of TABLES) {
      plans.push(await buildTablePlan(sourcePool, targetPool, definition));
    }

    console.log(`Mode: ${APPLY ? 'APPLY (transactional upsert; no deletes)' : 'DRY RUN (no writes)'}`);
    for (const plan of plans) {
      console.log(
        `${plan.name}: Neon ${plan.sourceCount}, local ${plan.targetCount}, `
        + `new ${plan.insertedIds.length}, changed ${plan.changedIds.length}, local-only ${Math.max(0, plan.targetCount - plan.sourceCount + plan.insertedIds.length)}`
      );
    }

    const conflicts = plans.flatMap((plan) => plan.conflicts.map((conflict) => `${plan.name}.${conflict}`));
    if (conflicts.length) {
      throw new Error(`Stopped before writing because unique values conflict:\n- ${conflicts.join('\n- ')}`);
    }
    if (!APPLY) {
      console.log('Dry run complete. Re-run with --apply to synchronize these rows.');
      return;
    }

    targetClient = await targetPool.connect();
    await targetClient.query('BEGIN');
    for (const plan of plans) {
      const result = await mergeTable(targetClient, plan);
      console.log(`${plan.name}: inserted ${result.inserted}, refreshed ${result.refreshed}.`);
    }
    // Restore the user/team references after all rows that they can reference exist.
    await applyDeferredColumns(targetClient, plans.find((plan) => plan.name === 'users'));
    await applyDeferredColumns(targetClient, plans.find((plan) => plan.name === 'teams'));
    for (const plan of plans) {
      await resetSequence(targetClient, plan.name);
      await verifyTable(targetClient, plan);
    }
    await targetClient.query('COMMIT');
    console.log('Synchronization completed and source rows were verified on the local database.');
  } catch (error) {
    if (targetClient) await targetClient.query('ROLLBACK').catch(() => {});
    throw error;
  } finally {
    targetClient?.release();
    await Promise.allSettled([sourcePool.end(), targetPool.end()]);
  }
}

main().catch((error) => {
  console.error(`Synchronization failed: ${error instanceof Error ? error.message : error}`);
  process.exitCode = 1;
});
