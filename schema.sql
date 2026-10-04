-- Kích hoạt extension pgcrypto để dùng UUID (nếu cần)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Bảng teams (Nhóm)
CREATE TABLE IF NOT EXISTS teams (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    leader_id INT, -- Sẽ add foreign key sau khi tạo bảng users
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Bảng users (Thành viên / Tài khoản)
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    full_name VARCHAR(255) NOT NULL,
    phone VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255),
    password VARCHAR(255),
    identity_card VARCHAR(50),
    bank_account VARCHAR(100),
    role VARCHAR(50) DEFAULT 'Nhân viên', -- Admin, Quản trị viên, Nhân viên, Lễ tân
    classification VARCHAR(50), -- Nhân sự, Khách mời, CTV, Sale, Pro Sale
    title VARCHAR(100), -- Giám đốc, Phó Giám đốc, Trưởng phòng
    team_id INT REFERENCES teams(id) ON DELETE SET NULL,
    ref_code VARCHAR(100) UNIQUE,
    referrer_id INT REFERENCES users(id) ON DELETE SET NULL,
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

-- Cập nhật khóa ngoại leader_id cho teams
ALTER TABLE teams 
ADD CONSTRAINT fk_teams_leader 
FOREIGN KEY (leader_id) REFERENCES users(id) ON DELETE SET NULL;

-- 3. Bảng events (Sự kiện)
CREATE TABLE IF NOT EXISTS events (
    id SERIAL PRIMARY KEY,
    code VARCHAR(100) UNIQUE,
    name VARCHAR(255) NOT NULL,
    short_description TEXT,
    detail_description TEXT,
    event_date DATE NOT NULL,
    start_time TIME,
    end_time TIME,
    location VARCHAR(255),
    event_format VARCHAR(100), -- Trực tiếp, Online
    fee DECIMAL(12, 2) DEFAULT 0,
    registration_deadline TIMESTAMP,
    expected_guests INT DEFAULT 0,
    event_type VARCHAR(100),
    manager_id INT REFERENCES users(id) ON DELETE SET NULL,
    creator_id INT REFERENCES users(id) ON DELETE SET NULL,
    status VARCHAR(50) DEFAULT 'Sắp diễn ra', -- Sắp diễn ra, Đang mở đăng ký, Đang diễn ra, Đã diễn ra
    approval_status VARCHAR(50) DEFAULT 'Chờ duyệt', -- Chờ duyệt, Đã duyệt, Từ chối
    approved_by INT REFERENCES users(id) ON DELETE SET NULL,
    approved_at TIMESTAMP,
    approval_notes TEXT,
    -- 5 trường cố định
    mc_fee DECIMAL(12, 2) DEFAULT 0,
    speaker_fee DECIMAL(12, 2) DEFAULT 0,
    support_fee DECIMAL(12, 2) DEFAULT 0,
    closer_fee DECIMAL(12, 2) DEFAULT 0,
    tea_break_fee DECIMAL(12, 2) DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. Bảng event_registrations (Đăng ký tham dự)
CREATE TABLE IF NOT EXISTS event_registrations (
    id SERIAL PRIMARY KEY,
    event_id INT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    user_id INT REFERENCES users(id) ON DELETE SET NULL,
    guest_name VARCHAR(255),
    guest_phone VARCHAR(50),
    guest_email VARCHAR(255),
    company_address VARCHAR(255),
    source VARCHAR(255),
    referrer_id INT REFERENCES users(id) ON DELETE SET NULL,
    referrer_group VARCHAR(100),
    attendance_status VARCHAR(50) DEFAULT 'Mới đăng ký', -- Mới đăng ký, Đã check-in, Đã tham dự, Vắng mặt
    is_food_approved BOOLEAN DEFAULT TRUE,
    food_approved_by INT REFERENCES users(id) ON DELETE SET NULL,
    notes TEXT,
    registered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    checkin_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. Bảng event_organizer_roles (Vai trò BTC & Nhật ký sự kiện)
CREATE TABLE IF NOT EXISTS event_organizer_roles (
    id SERIAL PRIMARY KEY,
    event_id INT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role_type VARCHAR(100), -- MC, Thuyết trình, Phụng sự, Người chốt
    remuneration_amount DECIMAL(12, 2) DEFAULT 0,
    updater_id INT REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 6. Bảng invitations (Lời mời bạn bè)
CREATE TABLE IF NOT EXISTS invitations (
    id SERIAL PRIMARY KEY,
    inviter_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    invitee_name VARCHAR(255),
    invitee_email VARCHAR(255),
    invitee_phone VARCHAR(50),
    status VARCHAR(50) DEFAULT 'Đang chờ', -- Đang chờ, Đã tham gia
    reward_points INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 7. Bảng contracts (Hợp đồng)
CREATE TABLE IF NOT EXISTS contracts (
    id SERIAL PRIMARY KEY,
    contract_code VARCHAR(100) UNIQUE,
    contract_date DATE,
    customer_name VARCHAR(255),
    value DECIMAL(15, 2) DEFAULT 0,
    allocated_value DECIMAL(15, 2),
    seller_id INT REFERENCES users(id) ON DELETE SET NULL,
    referrer_id INT REFERENCES users(id) ON DELETE SET NULL,
    closer_id INT REFERENCES users(id) ON DELETE SET NULL,
    supporter_id INT REFERENCES users(id) ON DELETE SET NULL,
    event_id INT REFERENCES events(id) ON DELETE SET NULL,
    closer_name VARCHAR(255),
    closer_phone VARCHAR(50),
    referrer_name VARCHAR(255),
    referrer_phone VARCHAR(50),
    supporter_name VARCHAR(255),
    supporter_phone VARCHAR(50),
    closer_fee DECIMAL(15, 3) DEFAULT 0,
    referrer_fee DECIMAL(15, 3) DEFAULT 0,
    supporter_fee DECIMAL(15, 3) DEFAULT 0,
    status VARCHAR(50) DEFAULT 'Chờ duyệt',
    team_name VARCHAR(255),
    contract_type VARCHAR(100),
    approved_date DATE,
    file_url VARCHAR(500),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 8. Bảng event_attachments (Tệp đính kèm sự kiện)
CREATE TABLE IF NOT EXISTS event_attachments (
    id SERIAL PRIMARY KEY,
    event_id INT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    file_url VARCHAR(500) NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_type VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 9. Nhật ký đề xuất thu chi và báo cáo phân bổ quỹ theo kỳ.
CREATE TABLE IF NOT EXISTS transaction_logs (
    id SERIAL PRIMARY KEY,
    request_code VARCHAR(50) NOT NULL,
    request_date DATE,
    fund_source VARCHAR(150) NOT NULL,
    detail_content TEXT NOT NULL DEFAULT '',
    requester_id VARCHAR(50),
    requester_name VARCHAR(255) NOT NULL DEFAULT '',
    requester_phone VARCHAR(32),
    approver_id VARCHAR(50),
    approver_name VARCHAR(255) NOT NULL DEFAULT '',
    approver_phone VARCHAR(32),
    beneficiary_name VARCHAR(255) NOT NULL DEFAULT '',
    beneficiary_phone VARCHAR(32),
    proposed_amount NUMERIC(18, 2),
    available_balance NUMERIC(18, 2),
    fund_alert VARCHAR(100) NOT NULL DEFAULT 'Chưa đối soát',
    status VARCHAR(40) NOT NULL DEFAULT 'Chờ duyệt',
    actual_expense NUMERIC(18, 2) NOT NULL DEFAULT 0,
    receipt_url TEXT,
    approval_date DATE,
    payment_date DATE,
    source_row INTEGER,
    source_complete BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS fund_weekly_allocations (
    id SERIAL PRIMARY KEY,
    period_code VARCHAR(32) NOT NULL,
    period_month VARCHAR(7) NOT NULL,
    period_label VARCHAR(80) NOT NULL,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    fund_key VARCHAR(48) NOT NULL,
    fund_source VARCHAR(120) NOT NULL,
    allocation_rate NUMERIC(7, 5) NOT NULL DEFAULT 0,
    requested_amount NUMERIC(18, 2) NOT NULL DEFAULT 0,
    source_sheet VARCHAR(80) NOT NULL,
    CONSTRAINT fund_weekly_allocations_period_fund_unique UNIQUE (period_code, fund_key)
);

CREATE TABLE IF NOT EXISTS fund_event_expenses (
    id SERIAL PRIMARY KEY,
    source_sheet VARCHAR(80) NOT NULL,
    source_row INTEGER NOT NULL,
    event_code VARCHAR(32) NOT NULL,
    event_date DATE NOT NULL,
    beneficiary_phone VARCHAR(32),
    beneficiary_name VARCHAR(120) NOT NULL,
    expense_role VARCHAR(120) NOT NULL,
    proposed_amount NUMERIC(18, 2) NOT NULL DEFAULT 0,
    status VARCHAR(40) NOT NULL DEFAULT 'Chờ duyệt',
    CONSTRAINT fund_event_expenses_source_unique UNIQUE (source_sheet, source_row)
);
