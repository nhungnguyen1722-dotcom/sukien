/* eslint-disable @typescript-eslint/no-require-imports */
const path = require('path');
const { Pool } = require('pg');
const { loadEnvConfig } = require('@next/env');

const projectRoot = path.resolve(__dirname, '..');
loadEnvConfig(projectRoot);

const APPLY = process.argv.includes('--apply');
const SYSTEM_TABLES = new Set([
  'spatial_ref_sys',
  'pointcloud_formats',
  'geometry_columns',
  'geography_columns',
  'raster_columns',
  'raster_overviews',
]);
const PROTECTED_EVENT_TABLES = new Set([
  'events',
  'event_attachments',
  'event_in_charge',
  'event_logs',
  'event_organizer_roles',
  'event_registrations',
  'event_schedules',
]);

function quoteIdentifier(value) {
  return `"${value.replaceAll('"', '""')}"`;
}

function isProtectedEventTable(tableName) {
  return PROTECTED_EVENT_TABLES.has(tableName) || tableName.startsWith('event_');
}

function normalizeTeamName(name) {
  return String(name || '').trim().toLocaleLowerCase('vi-VN');
}

function getLocalConfig() {
  return {
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD,
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 5433),
    database: process.env.DB_NAME || 'postgismap',
  };
}

function getNeonConfig() {
  if (!process.env.NEON_CONN_STRING) {
    throw new Error('NEON_CONN_STRING is required. Keep it in .env.local; do not commit it.');
  }
  return {
    connectionString: process.env.NEON_CONN_STRING,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 30_000,
  };
}

async function getTables(pool) {
  const result = await pool.query(`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    ORDER BY table_name
  `);
  return result.rows.map((row) => row.table_name).filter((tableName) => !SYSTEM_TABLES.has(tableName));
}

async function getColumns(pool, tableName) {
  const result = await pool.query(`
    SELECT column_name, udt_name, is_nullable, column_default, is_identity
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = $1
    ORDER BY ordinal_position
  `, [tableName]);
  return result.rows;
}

async function getPrimaryKey(pool, tableName) {
  const result = await pool.query(`
    SELECT kcu.column_name
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    WHERE tc.table_schema = 'public'
      AND tc.table_name = $1
      AND tc.constraint_type = 'PRIMARY KEY'
    ORDER BY kcu.ordinal_position
  `, [tableName]);
  return result.rows.map((row) => row.column_name);
}

async function getRowCount(pool, tableName) {
  const result = await pool.query(`SELECT COUNT(*)::int AS count FROM ${quoteIdentifier(tableName)}`);
  return result.rows[0].count;
}

async function getTeamLeadTeamRows(pool) {
  const result = await pool.query('SELECT id, name FROM teamlead_teams ORDER BY id');
  return result.rows;
}

async function getTeamLeadTeamIdMap(localPool, neonPool) {
  const [localTeams, neonTeams] = await Promise.all([
    getTeamLeadTeamRows(localPool),
    getTeamLeadTeamRows(neonPool),
  ]);
  const neonByName = new Map(neonTeams.map((team) => [normalizeTeamName(team.name), Number(team.id)]));
  const neonIds = new Set(neonTeams.map((team) => Number(team.id)));
  const idMap = new Map();
  let matchedByName = 0;
  for (const team of localTeams) {
    const localId = Number(team.id);
    const matchedId = neonByName.get(normalizeTeamName(team.name));
    if (matchedId !== undefined) {
      idMap.set(localId, matchedId);
      matchedByName += 1;
    } else if (neonIds.has(localId)) {
      idMap.set(localId, localId);
    } else {
      idMap.set(localId, localId);
    }
  }
  return { idMap, localTeams, neonTeams, matchedByName };
}

async function mergeTeamLeadTeams(localPool, neonClient) {
  const localTeams = await getTeamLeadTeamRows(localPool);
  const neonTeams = await getTeamLeadTeamRows(neonClient);
  const neonByName = new Map(neonTeams.map((team) => [normalizeTeamName(team.name), team]));
  const neonById = new Map(neonTeams.map((team) => [Number(team.id), team]));
  const idMap = new Map();
  let mergedRows = 0;

  for (const localTeam of localTeams) {
    const localId = Number(localTeam.id);
    const matchingName = neonByName.get(normalizeTeamName(localTeam.name));
    if (matchingName) {
      idMap.set(localId, Number(matchingName.id));
      continue;
    }
    const matchingId = neonById.get(localId);
    if (matchingId) {
      await neonClient.query('UPDATE teamlead_teams SET name = $1 WHERE id = $2', [localTeam.name, localId]);
    } else {
      await neonClient.query('INSERT INTO teamlead_teams (id, name) VALUES ($1, $2)', [localId, localTeam.name]);
    }
    const mergedTeam = { id: localId, name: localTeam.name };
    neonByName.set(normalizeTeamName(mergedTeam.name), mergedTeam);
    neonById.set(localId, mergedTeam);
    idMap.set(localId, localId);
    mergedRows += 1;
  }
  return { idMap, mergedRows };
}

async function getForeignKeysToProtectedTables(pool, tableNames) {
  if (!tableNames.length) return [];
  const result = await pool.query(`
    SELECT
      child.relname AS table_name,
      parent.relname AS referenced_table,
      array_agg(child_attribute.attname ORDER BY source_columns.ordinality) AS source_columns,
      array_agg(parent_attribute.attname ORDER BY source_columns.ordinality) AS referenced_columns
    FROM pg_constraint fk
    JOIN pg_class child ON child.oid = fk.conrelid
    JOIN pg_namespace child_schema ON child_schema.oid = child.relnamespace
    JOIN pg_class parent ON parent.oid = fk.confrelid
    JOIN unnest(fk.conkey) WITH ORDINALITY source_columns(attribute_number, ordinality) ON TRUE
    JOIN unnest(fk.confkey) WITH ORDINALITY target_columns(attribute_number, ordinality)
      ON target_columns.ordinality = source_columns.ordinality
    JOIN pg_attribute child_attribute
      ON child_attribute.attrelid = child.oid AND child_attribute.attnum = source_columns.attribute_number
    JOIN pg_attribute parent_attribute
      ON parent_attribute.attrelid = parent.oid AND parent_attribute.attnum = target_columns.attribute_number
    WHERE fk.contype = 'f'
      AND child_schema.nspname = 'public'
      AND child.relname = ANY($1::text[])
    GROUP BY child.relname, parent.relname, fk.oid
  `, [tableNames]);
  return result.rows.filter((row) => isProtectedEventTable(row.referenced_table));
}

async function assertProtectedForeignKeysAreValid(localPool, neonPool, foreignKeys) {
  for (const foreignKey of foreignKeys) {
    if (foreignKey.source_columns.length !== 1 || foreignKey.referenced_columns.length !== 1) {
      throw new Error(`Cannot safely sync ${foreignKey.table_name}: it has a composite foreign key to protected table ${foreignKey.referenced_table}.`);
    }
    const sourceColumn = foreignKey.source_columns[0];
    const referencedColumn = foreignKey.referenced_columns[0];
    const sourceValues = await localPool.query(`
      SELECT DISTINCT ${quoteIdentifier(sourceColumn)}::text AS value
      FROM ${quoteIdentifier(foreignKey.table_name)}
      WHERE ${quoteIdentifier(sourceColumn)} IS NOT NULL
    `);
    const targetValues = await neonPool.query(`
      SELECT ${quoteIdentifier(referencedColumn)}::text AS value
      FROM ${quoteIdentifier(foreignKey.referenced_table)}
    `);
    const targetSet = new Set(targetValues.rows.map((row) => row.value));
    const missingValues = sourceValues.rows
      .map((row) => row.value)
      .filter((value) => !targetSet.has(value));
    if (missingValues.length) {
      throw new Error(
        `Stopped before writing: ${foreignKey.table_name}.${sourceColumn} references ${missingValues.length} protected ${foreignKey.referenced_table} record(s) not present on Neon.`
      );
    }
  }
}

function topologicalSort(tableNames, foreignKeys) {
  const allowed = new Set(tableNames);
  const dependencies = new Map(tableNames.map((tableName) => [tableName, new Set()]));
  for (const foreignKey of foreignKeys) {
    if (allowed.has(foreignKey.table_name) && allowed.has(foreignKey.referenced_table)) {
      dependencies.get(foreignKey.table_name).add(foreignKey.referenced_table);
    }
  }
  const pending = new Set(tableNames);
  const result = [];
  while (pending.size) {
    const next = Array.from(pending).filter((tableName) => (
      Array.from(dependencies.get(tableName)).every((dependency) => !pending.has(dependency))
    )).sort();
    if (!next.length) {
      result.push(...Array.from(pending).sort());
      break;
    }
    for (const tableName of next) {
      pending.delete(tableName);
      result.push(tableName);
    }
  }
  return result;
}

async function getAllForeignKeys(pool, tableNames) {
  if (!tableNames.length) return [];
  const result = await pool.query(`
    SELECT child.relname AS table_name, parent.relname AS referenced_table
    FROM pg_constraint fk
    JOIN pg_class child ON child.oid = fk.conrelid
    JOIN pg_namespace child_schema ON child_schema.oid = child.relnamespace
    JOIN pg_class parent ON parent.oid = fk.confrelid
    WHERE fk.contype = 'f'
      AND child_schema.nspname = 'public'
      AND child.relname = ANY($1::text[])
  `, [tableNames]);
  return result.rows;
}

function getInsertExpression(column, parameterIndex) {
  if (column.udt_name === 'geometry') {
    return `ST_GeomFromEWKB($${parameterIndex}::bytea)`;
  }
  return `$${parameterIndex}`;
}

async function upsertTable(localPool, neonClient, table, teamIdMap) {
  const sourceColumns = table.columns;
  const columnNames = sourceColumns.map((column) => column.column_name);
  const selectColumns = sourceColumns.map((column) => (
    column.udt_name === 'geometry'
      ? `ST_AsEWKB(${quoteIdentifier(column.column_name)}) AS ${quoteIdentifier(column.column_name)}`
      : quoteIdentifier(column.column_name)
  ));
  const sourceRows = await localPool.query(`SELECT ${selectColumns.join(', ')} FROM ${quoteIdentifier(table.name)}`);
  if (!sourceRows.rows.length) return 0;

  const quotedColumns = columnNames.map(quoteIdentifier).join(', ');
  const quotedPrimaryKey = table.primaryKey.map(quoteIdentifier).join(', ');
  const updatableColumns = columnNames.filter((columnName) => !table.primaryKey.includes(columnName));
  const conflictAction = updatableColumns.length
    ? `DO UPDATE SET ${updatableColumns.map((columnName) => `${quoteIdentifier(columnName)} = EXCLUDED.${quoteIdentifier(columnName)}`).join(', ')}`
    : 'DO NOTHING';
  const hasIdentityColumn = sourceColumns.some((column) => column.is_identity === 'YES');
  const insertPrefix = `
    INSERT INTO ${quoteIdentifier(table.name)} (${quotedColumns})
    ${hasIdentityColumn ? 'OVERRIDING SYSTEM VALUE' : ''}
    VALUES
  `;
  const batchSize = 250;
  for (let start = 0; start < sourceRows.rows.length; start += batchSize) {
    const batch = sourceRows.rows.slice(start, start + batchSize);
    const values = [];
    const rowsSql = batch.map((row) => {
      const placeholders = sourceColumns.map((column) => {
        const rawValue = row[column.column_name];
        const value = teamIdMap
          && column.column_name === 'team_id'
          && ['teamlead_member_teams', 'teamlead_payout_rows'].includes(table.name)
          && rawValue !== null
          ? teamIdMap.get(Number(rawValue)) ?? rawValue
          : rawValue;
        values.push(value);
        return getInsertExpression(column, values.length);
      });
      return `(${placeholders.join(', ')})`;
    });
    await neonClient.query(`${insertPrefix} ${rowsSql.join(', ')} ON CONFLICT (${quotedPrimaryKey}) ${conflictAction}`, values);
  }
  return sourceRows.rows.length;
}

async function updateSequences(neonClient, tables) {
  for (const table of tables) {
    const serialColumns = table.columns.filter((column) => (
      column.column_default && column.column_default.includes('nextval(')
    ));
    for (const column of serialColumns) {
      const sequence = await neonClient.query('SELECT pg_get_serial_sequence($1, $2) AS name', [table.name, column.column_name]);
      const sequenceName = sequence.rows[0].name;
      if (!sequenceName) continue;
      await neonClient.query(`
        SELECT setval(
          $1::regclass,
          GREATEST(COALESCE((SELECT MAX(${quoteIdentifier(column.column_name)}) FROM ${quoteIdentifier(table.name)}), 1), 1),
          (SELECT COUNT(*) > 0 FROM ${quoteIdentifier(table.name)})
        )
      `, [sequenceName]);
    }
  }
}

async function main() {
  const localPool = new Pool(getLocalConfig());
  const neonPool = new Pool(getNeonConfig());
  let neonClient;
  try {
    const [localTables, neonTables] = await Promise.all([getTables(localPool), getTables(neonPool)]);
    const neonTableSet = new Set(neonTables);
    const protectedTables = neonTables.filter(isProtectedEventTable).sort();
    const sourceOnlyTables = localTables.filter((tableName) => !neonTableSet.has(tableName) && !isProtectedEventTable(tableName));
    const candidates = localTables.filter((tableName) => (
      neonTableSet.has(tableName) && !isProtectedEventTable(tableName) && tableName !== 'teamlead_teams'
    ));

    const [protectedBefore, tables, teamLeadTeamMap] = await Promise.all([
      Promise.all(protectedTables.map(async (tableName) => [tableName, await getRowCount(neonPool, tableName)])),
      Promise.all(candidates.map(async (tableName) => {
        const [localColumns, neonColumns, primaryKey] = await Promise.all([
          getColumns(localPool, tableName),
          getColumns(neonPool, tableName),
          getPrimaryKey(neonPool, tableName),
        ]);
        const neonColumnNames = new Set(neonColumns.map((column) => column.column_name));
        const sharedColumns = localColumns.filter((column) => neonColumnNames.has(column.column_name));
        const missingRequiredColumns = neonColumns.filter((column) => (
          !localColumns.some((localColumn) => localColumn.column_name === column.column_name)
          && column.is_nullable === 'NO'
          && !column.column_default
          && column.is_identity !== 'YES'
        ));
        return {
          name: tableName,
          columns: sharedColumns,
          primaryKey,
          missingRequiredColumns: missingRequiredColumns.map((column) => column.column_name),
          localCount: await getRowCount(localPool, tableName),
          neonCount: await getRowCount(neonPool, tableName),
        };
      })),
      getTeamLeadTeamIdMap(localPool, neonPool),
    ]);

    const unsafeTables = tables.filter((table) => (
      !table.primaryKey.length || !table.columns.length || table.missingRequiredColumns.length
    ));
    if (unsafeTables.length) {
      const details = unsafeTables.map((table) => `${table.name} (${!table.primaryKey.length ? 'missing primary key' : table.missingRequiredColumns.length ? `missing required column(s): ${table.missingRequiredColumns.join(', ')}` : 'no shared columns'})`);
      throw new Error(`Stopped before writing because these tables cannot be safely merged: ${details.join('; ')}`);
    }

    const tableNames = tables.map((table) => table.name);
    const protectedForeignKeys = await getForeignKeysToProtectedTables(neonPool, tableNames);
    await assertProtectedForeignKeysAreValid(localPool, neonPool, protectedForeignKeys);
    const syncOrder = topologicalSort(tableNames, await getAllForeignKeys(neonPool, tableNames));
    const byName = new Map(tables.map((table) => [table.name, table]));
    const orderedTables = syncOrder.map((tableName) => byName.get(tableName));

    console.log(`Mode: ${APPLY ? 'APPLY (upsert only)' : 'DRY RUN (no data changes)'}`);
    console.log(`Protected event tables: ${protectedTables.join(', ') || '(none found)'}`);
    console.log(`- teamlead_teams: local ${teamLeadTeamMap.localTeams.length}, Neon before ${teamLeadTeamMap.neonTeams.length}; ${teamLeadTeamMap.matchedByName} team(s) will map by name.`);
    if (sourceOnlyTables.length) console.log(`Skipped because missing on Neon: ${sourceOnlyTables.join(', ')}`);
    console.log('Tables to merge (local → Neon; no deletes):');
    for (const table of orderedTables) {
      console.log(`- ${table.name}: local ${table.localCount}, Neon before ${table.neonCount}`);
    }

    if (!APPLY) {
      console.log('Dry run complete. Re-run with --apply to perform the protected merge.');
      return;
    }

    neonClient = await neonPool.connect();
    await neonClient.query('BEGIN');
    await neonClient.query('SET CONSTRAINTS ALL DEFERRED');
    const { idMap: teamIdMap, mergedRows: mergedTeams } = await mergeTeamLeadTeams(localPool, neonClient);
    console.log(`Merged teamlead_teams: ${mergedTeams} source row(s); reused existing Neon IDs for duplicate names.`);
    for (const table of orderedTables) {
      const count = await upsertTable(localPool, neonClient, table, teamIdMap);
      console.log(`Merged ${table.name}: ${count} source row(s).`);
    }
    await updateSequences(neonClient, orderedTables);
    const protectedAfter = await Promise.all(protectedTables.map(async (tableName) => [tableName, await getRowCount(neonClient, tableName)]));
    for (const [tableName, before] of protectedBefore) {
      const after = protectedAfter.find(([name]) => name === tableName)[1];
      if (before !== after) {
        throw new Error(`Protected event table ${tableName} changed from ${before} to ${after}; rolling back.`);
      }
    }
    await neonClient.query('COMMIT');
    console.log('Safe merge completed. Protected event tables were unchanged.');
  } catch (error) {
    if (neonClient) {
      try {
        await neonClient.query('ROLLBACK');
      } catch {
        // The original error is more useful than a rollback error.
      }
    }
    console.error('Sync stopped:', error instanceof Error ? error.message : error);
    process.exitCode = 1;
  } finally {
    neonClient?.release();
    await Promise.allSettled([localPool.end(), neonPool.end()]);
  }
}

void main();
