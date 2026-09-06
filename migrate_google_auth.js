const { Pool } = require('pg');
const { getDatabaseConfig } = require('./db-config');

const pool = new Pool(getDatabaseConfig());

async function migrate() {
  try {
    console.log("Checking and updating database schema for Google Auth...");
    
    // Check if table users exists
    const tableCheck = await pool.query(
      "SELECT table_name FROM information_schema.tables WHERE table_name = 'users'"
    );
    
    if (tableCheck.rows.length === 0) {
      console.log("Creating users table...");
      await pool.query(`
        CREATE TABLE users (
            id SERIAL PRIMARY KEY,
            full_name VARCHAR(255) NOT NULL,
            phone VARCHAR(50) UNIQUE,
            email VARCHAR(255) UNIQUE,
            password VARCHAR(255),
            google_id VARCHAR(255) UNIQUE,
            avatar_url VARCHAR(500),
            identity_card VARCHAR(50),
            bank_account VARCHAR(100),
            role VARCHAR(50) DEFAULT 'Nhân viên',
            classification VARCHAR(50),
            title VARCHAR(100),
            team_id INT,
            ref_code VARCHAR(100) UNIQUE,
            referrer_id INT,
            referral_group VARCHAR(100),
            source VARCHAR(255),
            join_date DATE,
            status VARCHAR(50) DEFAULT 'Đang hoạt động',
            is_team_leader_eligible BOOLEAN DEFAULT FALSE,
            invite_count INT DEFAULT 0,
            guest_count INT DEFAULT 0,
            notes TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);
    } else {
      // Get existing columns
      const colRes = await pool.query(
        "SELECT column_name FROM information_schema.columns WHERE table_name = 'users'"
      );
      const existingCols = colRes.rows.map(r => r.column_name.toLowerCase());
      console.log("Existing columns:", existingCols);

      // 1. Add google_id column if not exists
      if (!existingCols.includes('google_id')) {
        console.log("Adding google_id column...");
        await pool.query("ALTER TABLE users ADD COLUMN google_id VARCHAR(255) UNIQUE;");
      }
      
      // 2. Add avatar_url column if not exists
      if (!existingCols.includes('avatar_url')) {
        console.log("Adding avatar_url column...");
        await pool.query("ALTER TABLE users ADD COLUMN avatar_url VARCHAR(500);");
      }

      // 3. Drop NOT NULL constraint on phone if needed
      try {
        await pool.query("ALTER TABLE users ALTER COLUMN phone DROP NOT NULL;");
        console.log("Dropped NOT NULL on phone (if present).");
      } catch (e) {
        console.log("Note on phone drop NOT NULL:", e.message);
      }

      // 4. Ensure unique constraint on email
      try {
        await pool.query("ALTER TABLE users ADD CONSTRAINT unique_users_email UNIQUE (email);");
        console.log("Added UNIQUE constraint on email.");
      } catch (e) {
        console.log("Note on email unique constraint:", e.message);
      }
    }

    console.log("Migration successful!");
    
    const res = await pool.query(
      "SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name = 'users' ORDER BY ordinal_position"
    );
    console.log("Current users columns:", res.rows.map(r => `${r.column_name} (${r.data_type}, nullable: ${r.is_nullable})`));
  } catch (err) {
    console.error("Migration error:", err);
  } finally {
    await pool.end();
  }
}

migrate();
