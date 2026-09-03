const fs = require('fs');
const { Client } = require('pg');

const client = new Client({
  user: 'postgres',
  password: '1111222267',
  host: 'localhost',
  port: 5433,
  database: 'postgismap',
});

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
