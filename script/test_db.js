const { Pool } = require('pg');
const { getDatabaseConfig } = require('./db-config');

const pool = new Pool(getDatabaseConfig());
pool.query("SELECT * FROM events LIMIT 5").then(res => { console.log(res.rows); pool.end(); }).catch(err => console.error(err));
