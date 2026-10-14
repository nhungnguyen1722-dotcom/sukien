const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

// Read DATABASE_URL from .env.local if available
let connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  try {
    const envPath = path.resolve(__dirname, '..', '.env.local');
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, 'utf8');
      const m = content.match(/DATABASE_URL="?([^"\r\n]+)"?/);
      if (m) connectionString = m[1];
    }
  } catch (e) {
    console.warn('Could not read .env.local:', e.message);
  }
}

if (!connectionString) {
  connectionString = "postgresql://neondb_owner:npg_Gy2mBY4leKgb@ep-snowy-forest-ax0u3mls-pooler.c-4.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require";
}

const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false }
});

const COURSES = [
  {
    course_code: 'TR001',
    course_name: 'Đào tạo Prosale mới',
    training_type: 'Offline',
    token_value: 120,
    budget: 600000,
  },
  {
    course_code: 'TR002',
    course_name: 'Đào tạo prosale mới',
    training_type: 'Online',
    token_value: 100,
    budget: 500000,
  },
  {
    course_code: 'TR003',
    course_name: 'ĐT Chuyên sâu - Buổi 1 (Nguồn vốn)',
    training_type: 'Online',
    token_value: 50,
    budget: 250000,
  },
  {
    course_code: 'TR004',
    course_name: 'ĐT Chuyên sâu - Buổi 2 (Lữ hành)',
    training_type: 'Online',
    token_value: 50,
    budget: 250000,
  },
  {
    course_code: 'TR005',
    course_name: 'ĐT Chuyên sâu - Buổi 3 (Welink)',
    training_type: 'Online',
    token_value: 50,
    budget: 250000,
  },
  {
    course_code: 'TR006',
    course_name: 'ĐT Mô hình Welink',
    training_type: 'Offline',
    token_value: 100,
    budget: 500000,
  },
];

const LOGS = [
  {
    session_code: 'TR001',
    course_code: 'TR001',
    session_name: 'Đào tạo Prosale mới',
    training_date: '2026-09-15',
    member_phone: '0889225989',
    member_name: 'Vũ Thị Cúc',
    role: 'Giảng viên',
    token_tier: 'Hạng A',
    token_count: 60,
    session_budget: 600000,
    total_tokens: 120,
    reward_amount: 300000,
    approver: 'Tổng điều hành',
    status: 'Đã duyệt',
  },
  {
    session_code: 'TR001',
    course_code: 'TR001',
    session_name: 'Đào tạo Prosale mới',
    training_date: '2026-09-15',
    member_phone: '0947876133',
    member_name: 'Phạm Thị Hương',
    role: 'Giảng viên',
    token_tier: 'Hạng A',
    token_count: 60,
    session_budget: 600000,
    total_tokens: 120,
    reward_amount: 300000,
    approver: 'Tổng điều hành',
    status: 'Đã duyệt',
  },
  {
    session_code: 'TR002',
    course_code: 'TR002',
    session_name: 'Đào tạo prosale mới',
    training_date: '2026-09-17',
    member_phone: '0889225989',
    member_name: 'Vũ Thị Cúc',
    role: 'Giảng viên',
    token_tier: 'Hạng A',
    token_count: 50,
    session_budget: 500000,
    total_tokens: 100,
    reward_amount: 250000,
    approver: 'Tổng điều hành',
    status: 'Đã duyệt',
  },
  {
    session_code: 'TR002',
    course_code: 'TR002',
    session_name: 'Đào tạo prosale mới',
    training_date: '2026-09-17',
    member_phone: '0947876133',
    member_name: 'Phạm Thị Hương',
    role: 'Giảng viên',
    token_tier: 'Hạng A',
    token_count: 50,
    session_budget: 500000,
    total_tokens: 100,
    reward_amount: 250000,
    approver: 'Tổng điều hành',
    status: 'Đã duyệt',
  },
  {
    session_code: 'TR003',
    course_code: 'TR003',
    session_name: 'ĐT Chuyên sâu – Buổi 1 (Nguồn vốn)',
    training_date: '2026-09-26',
    member_phone: '0889225989',
    member_name: 'Vũ Thị Cúc',
    role: 'Giảng viên',
    token_tier: 'Hạng A',
    token_count: 50,
    session_budget: 250000,
    total_tokens: 50,
    reward_amount: 250000,
    approver: 'Tổng điều hành',
    status: 'Đã duyệt',
  },
  {
    session_code: 'TR006',
    course_code: 'TR006',
    session_name: 'ĐT Mô hình Welink',
    training_date: '2026-10-01',
    member_phone: '000007',
    member_name: 'Đinh Văn Bắc',
    role: 'Giảng viên',
    token_tier: 'Hạng A',
    token_count: 100,
    session_budget: 500000,
    total_tokens: 100,
    reward_amount: 500000,
    approver: 'Tổng điều hành',
    status: 'Đã duyệt',
  },
];

async function migrateAndSeed() {
  console.log('--- BẮT ĐẦU ĐỒNG BỘ CƠ SỞ DỮ LIỆU ĐÀO TẠO (NEON POSTGRESQL) ---');

  // 1. Tạo bảng training_courses nếu chưa tồn tại
  await pool.query(`
    CREATE TABLE IF NOT EXISTS training_courses (
      id SERIAL PRIMARY KEY,
      course_code VARCHAR(50) UNIQUE NOT NULL,
      course_name VARCHAR(255) NOT NULL,
      training_type VARCHAR(50) NOT NULL DEFAULT 'Online',
      token_value NUMERIC NOT NULL DEFAULT 50,
      budget NUMERIC NOT NULL DEFAULT 250000,
      created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
    );
  `);
  console.log('✓ Đã kiểm tra/khởi tạo bảng training_courses.');

  // 2. Seed/Upsert dữ liệu danh mục buổi học
  for (const c of COURSES) {
    await pool.query(
      `
      INSERT INTO training_courses (course_code, course_name, training_type, token_value, budget)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (course_code) 
      DO UPDATE SET 
        course_name = EXCLUDED.course_name,
        training_type = EXCLUDED.training_type,
        token_value = EXCLUDED.token_value,
        budget = EXCLUDED.budget;
    `,
      [c.course_code, c.course_name, c.training_type, c.token_value, c.budget]
    );
  }
  console.log(`✓ Đã nạp thành công ${COURSES.length} buổi học vào training_courses.`);

  // 3. Kiểm tra bảng training_logs
  await pool.query(`
    CREATE TABLE IF NOT EXISTS training_logs (
      id SERIAL PRIMARY KEY,
      session_code VARCHAR(50) NOT NULL,
      course_code VARCHAR(50) REFERENCES training_courses (course_code) ON UPDATE CASCADE ON DELETE RESTRICT,
      session_name VARCHAR(255),
      member_phone VARCHAR(50),
      member_name VARCHAR(255) NOT NULL,
      role VARCHAR(100) NOT NULL,
      token_tier VARCHAR(50) NOT NULL,
      token_count NUMERIC DEFAULT 1 NOT NULL,
      session_budget NUMERIC DEFAULT 0 NOT NULL,
      total_tokens NUMERIC DEFAULT 1 NOT NULL,
      reward_amount NUMERIC DEFAULT 0 NOT NULL,
      approver VARCHAR(100) DEFAULT 'Tổng điều hành',
      status VARCHAR(50) DEFAULT 'Đã duyệt',
      training_date DATE,
      created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
    );
  `);
  await pool.query(`
    ALTER TABLE training_logs
    ADD COLUMN IF NOT EXISTS course_code VARCHAR(50)
  `);
  console.log('✓ Đã kiểm tra cấu trúc bảng training_logs.');

  // 4. Xóa dữ liệu mẫu cũ (nếu có dữ liệu test không thuộc danh sách thực tế)
  // Xóa sạch để nạp chính xác dữ liệu theo file mẫu Tong-hop-DNTT-T9-T10.xlsx
  await pool.query('TRUNCATE TABLE training_logs RESTART IDENTITY CASCADE');

  for (const log of LOGS) {
    await pool.query(
      `
      INSERT INTO training_logs (
        session_code, course_code, session_name, member_phone, member_name, role,
        token_tier, token_count, session_budget, total_tokens, reward_amount,
        approver, status, training_date
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
    `,
      [
        log.session_code,
        log.course_code,
        log.session_name,
        log.member_phone,
        log.member_name,
        log.role,
        log.token_tier,
        log.token_count,
        log.session_budget,
        log.total_tokens,
        log.reward_amount,
        log.approver,
        log.status,
        log.training_date,
      ]
    );
  }
  console.log(`✓ Đã nạp thành công ${LOGS.length} bản ghi nhật ký đào tạo vào training_logs.`);

  // 5. Kiểm tra kết quả
  const countCourses = await pool.query('SELECT COUNT(*) FROM training_courses');
  const countLogs = await pool.query('SELECT COUNT(*) FROM training_logs');
  console.log(`\n=== TỔNG KẾT ĐỒNG BỘ ===`);
  console.log(`- training_courses: ${countCourses.rows[0].count} buổi học`);
  console.log(`- training_logs: ${countLogs.rows[0].count} lượt tham gia`);

  await pool.end();
  console.log('--- HOÀN TẤT ĐỒNG BỘ CƠ SỞ DỮ LIỆU NEON ---');
}

migrateAndSeed().catch((err) => {
  console.error('Lỗi khi đồng bộ DB:', err);
  process.exit(1);
});
