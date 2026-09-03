const { Pool } = require('pg');
const pool = new Pool({ user: 'postgres', password: '1111222267', host: 'localhost', port: 5433, database: 'postgismap' });
pool.query("SELECT * FROM events LIMIT 5").then(res => { console.log(res.rows); pool.end(); }).catch(err => console.error(err));
