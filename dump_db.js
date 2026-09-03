const { Pool } = require('pg');
const fs = require('fs');

const pool = new Pool({
  user: 'postgres',
  password: '1111222267',
  host: 'localhost',
  port: 5433,
  database: 'postgismap',
});

// Skip PostGIS system tables
const SKIP_TABLES = ['spatial_ref_sys', 'pointcloud_formats'];

async function dumpDatabase() {
  const client = await pool.connect();
  let output = '';
  const log = (text) => { output += text + '\n'; };
  
  try {
    const tablesRes = await client.query(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `);
    
    const allTables = tablesRes.rows.map(r => r.table_name);
    const appTables = allTables.filter(t => !SKIP_TABLES.includes(t));
    
    log('# Database Dump: postgismap');
    log(`> Exported at: ${new Date().toISOString()}`);
    log(`> Total tables: ${allTables.length} (showing ${appTables.length} app tables, skipping PostGIS system tables)`);
    log('');
    log('## Table Summary');
    log('');
    log('| # | Table Name | Row Count |');
    log('|---|-----------|-----------|');
    
    const tableData = [];
    for (let i = 0; i < appTables.length; i++) {
      const tableName = appTables[i];
      const countRes = await client.query(`SELECT COUNT(*) as count FROM "${tableName}"`);
      const count = parseInt(countRes.rows[0].count);
      log(`| ${i+1} | ${tableName} | ${count} |`);
      tableData.push({ name: tableName, count });
    }
    
    log('');
    log('---');
    
    for (const table of tableData) {
      log('');
      log(`## Table: \`${table.name}\` (${table.count} rows)`);
      log('');
      
      if (table.count === 0) {
        log('*(empty table)*');
        continue;
      }
      
      const dataRes = await client.query(`SELECT * FROM "${table.name}" ORDER BY 1`);
      const columns = Object.keys(dataRes.rows[0]);
      
      log('| ' + columns.join(' | ') + ' |');
      log('| ' + columns.map(() => '---').join(' | ') + ' |');
      
      for (const row of dataRes.rows) {
        const values = columns.map(col => {
          let val = row[col];
          if (val === null) return '*null*';
          if (val instanceof Date) return val.toISOString();
          if (typeof val === 'object') return JSON.stringify(val);
          return String(val).replace(/\|/g, '\\|').replace(/\n/g, ' ');
        });
        log('| ' + values.join(' | ') + ' |');
      }
    }
    
    const outputPath = process.argv[2];
    fs.writeFileSync(outputPath, output, 'utf8');
    console.log(`Done! Written to: ${outputPath}`);
    tableData.forEach(t => console.log(`  - ${t.name}: ${t.count} rows`));
    
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    client.release();
    await pool.end();
  }
}

dumpDatabase();
