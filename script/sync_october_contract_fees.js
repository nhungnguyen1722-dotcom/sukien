const { Pool } = require('pg');
const { getDatabaseConfig } = require('./db-config');

const pool = new Pool(getDatabaseConfig());

async function run() {
  await pool.query(`UPDATE contracts SET closer_fee = 600000, referrer_fee = 100000, supporter_fee = 50000 WHERE id IN (38, 39, 40, 41)`);
  await pool.query(`UPDATE contracts SET closer_fee = 6000000, referrer_fee = 1000000, supporter_fee = 500000, supporter_name = 'Diệp Thị Huế', supporter_phone = '0915095848' WHERE id = 42`);
  await pool.query(`UPDATE contracts SET closer_fee = 25800000, referrer_fee = 4300000, supporter_fee = 2150000 WHERE id = 43`);
  await pool.query(`UPDATE contracts SET closer_id = 405, closer_name = 'Nguyễn Thị Loan', closer_phone = '0912415469', closer_fee = 2400000, referrer_id = 109, referrer_name = 'Hoàng Thị Chích', referrer_phone = '0384081272', referrer_fee = 400000, supporter_id = 109, supporter_name = 'Hoàng Thị Chích', supporter_phone = '0384081272', supporter_fee = 200000 WHERE id = 32`);
  console.log('October contract fees and beneficiaries updated successfully.');
  pool.end();
}

run().catch((err) => {
  console.error(err);
  pool.end();
});
