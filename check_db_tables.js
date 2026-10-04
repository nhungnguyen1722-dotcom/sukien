const { Pool } = require('pg');
const { getDatabaseConfig } = require('./db-config');
const pool = new Pool(getDatabaseConfig());

async function check() {
  try {
    const res = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `);
    console.log('Tables:');
    for (const r of res.rows) {
      if (['geography_columns', 'geometry_columns', 'pointcloud_columns', 'pointcloud_formats', 'raster_columns', 'raster_overviews', 'spatial_ref_sys'].includes(r.table_name)) continue;
      const countRes = await pool.query('SELECT count(*) FROM "' + r.table_name + '"');
      console.log('  ' + r.table_name + ': ' + countRes.rows[0].count);
    }
  } catch (err) {
    console.error('Error:', err);
  } finally {
    pool.end();
  }
}
check();
