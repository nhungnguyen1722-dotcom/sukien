const { Pool } = require('pg');
const { getDatabaseConfig } = require('./db-config');

async function migrateTrainingCourseLinks() {
  const localConfig = process.argv.includes('--local')
    ? {
        host: process.env.DB_HOST || 'localhost',
        port: Number(process.env.DB_PORT || 5432),
        database: process.env.DB_NAME || 'postgismap',
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD,
      }
    : getDatabaseConfig();
  const pool = new Pool(localConfig);
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    await client.query(`
      ALTER TABLE training_logs
      ADD COLUMN IF NOT EXISTS course_code VARCHAR(50)
    `);
    const backfill = await client.query(`
      UPDATE training_logs AS log
      SET course_code = course.course_code
      FROM training_courses AS course
      WHERE log.course_code IS NULL
        AND log.session_code = course.course_code
    `);
    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS training_courses_course_code_uidx
      ON training_courses (course_code)
    `);
    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conname = 'training_logs_course_code_fkey'
            AND conrelid = 'training_logs'::regclass
        ) THEN
          ALTER TABLE training_logs
          ADD CONSTRAINT training_logs_course_code_fkey
          FOREIGN KEY (course_code)
          REFERENCES training_courses (course_code)
          ON UPDATE CASCADE
          ON DELETE RESTRICT;
        END IF;
      END
      $$;
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS training_logs_course_date_idx
      ON training_logs (course_code, training_date)
    `);
    const unmatched = await client.query(`
      SELECT COUNT(*)::int AS count
      FROM training_logs
      WHERE course_code IS NULL
    `);
    await client.query('COMMIT');
    console.log(`Linked ${backfill.rowCount} existing training log(s) to their exact course code.`);
    console.log(`${unmatched.rows[0].count} legacy log(s) still need a course selection.`);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

migrateTrainingCourseLinks().catch((error) => {
  console.error('Failed to migrate training course links:', error);
  process.exitCode = 1;
});
