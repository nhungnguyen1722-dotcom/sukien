const fs = require('fs');
const { Client } = require('pg');
const { getDatabaseConfig } = require('./db-config');

const client = new Client(getDatabaseConfig());

async function runSQL() {
  try {
    await client.connect();
    const sql = fs.readFileSync('schema.sql', 'utf8');
    await client.query(sql);
    console.log('Tables created successfully!');
  } catch (err) {
    console.error('Error executing SQL:', err);
  } finally {
    await client.end();
  }
}

runSQL();
