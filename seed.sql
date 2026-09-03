-- Reset bảng
TRUNCATE TABLE invitations, event_registrations, event_organizer_roles, contracts, events, users, teams CASCADE;
ALTER SEQUENCE users_id_seq RESTART WITH 1;
ALTER SEQUENCE events_id_seq RESTART WITH 1;
ALTER SEQUENCE invitations_id_seq RESTART WITH 1;
ALTER SEQUENCE event_registrations_id_seq RESTART WITH 1;

-- 1. Insert Users (Gộp Thành viên và Tài khoản Admin)
INSERT INTO users (full_name, phone, email, role, status) VALUES
('Nhung Nguyễn', '0000000001', 'nhungnguyen1722@gmail.com', 'Admin', 'Đang hoạt động'),
('Nguyễn Tuấn', '0000000002', 'tuan161022@gmail.com', 'Nhân viên', 'Đang hoạt động'),
('Nguyễn Văn An', '0901234567', 'an.nguyen@welink.vn', 'MC', 'Đang hoạt động'),
('Trần Thị Bình', '0902345678', 'binh.tran@welink.vn', 'Thuyết trình', 'Đang hoạt động'),
('Lê Hoàng Cường', '0903456789', 'cuong.le@welink.vn', 'Chốt sự kiện', 'Đang hoạt động'),
('Phạm Thị Dung', '0904567890', 'dung.pham@welink.vn', 'Phụng sự', 'Đang hoạt động'),
('Hoàng Văn Em', '0905678901', 'em.hoang@welink.vn', 'Kinh doanh', 'Đang hoạt động'),
('Đỗ Thị Phương', '0906789012', 'phuong.do@welink.vn', 'Team Leader', 'Đang hoạt động');

-- 2. Insert Events
INSERT INTO events (name, event_date, location, expected_guests, status, approval_status, fee, mc_fee, speaker_fee, support_fee, closer_fee, tea_break_fee) VALUES
('Sự kiện 1', '2026-09-02', '-', 0, 'Kế hoạch', 'Đã duyệt', 10000000, 2000000, 3000000, 1000000, 2000000, 2000000),
('Hội nghị khách hàng Hà Đông', '2026-08-15', 'Hà Đông', 5, 'Kế hoạch', 'Chờ duyệt', 15000000, 3000000, 5000000, 2000000, 3000000, 2000000),
('Tiệc trà kết nối', '2026-08-15', 'Văn phòng WeLink', 1, 'Kế hoạch', 'Chờ duyệt', 8420000, 1500000, 2500000, 1000000, 1500000, 1920000),
('Sự kiện Vĩnh Phúc kết nối', '2026-08-08', 'Vĩnh Phúc', 7, 'Đã hoàn thành', 'Đã duyệt', 12000000, 2000000, 4000000, 2000000, 2000000, 2000000),
('Sự kiện Đại Mỗ ra quân', '2026-08-01', 'P. Đại Mỗ', 8, 'Đã hoàn thành', 'Đã duyệt', 24000000, 4000000, 8000000, 3000000, 5000000, 4000000),
('Hội thảo chuyên đề Marketing', '2024-06-28', 'Trung tâm hội nghị Quốc Gia', 120, 'Đang thực hiện', 'Đã duyệt', 0, 0, 0, 0, 0, 0),
('Gặp gỡ đối tác chiến lược', '2024-06-20', 'Nhà hàng Sen Tây Hồ', 20, 'Đã hoàn thành', 'Đã duyệt', 0, 0, 0, 0, 0, 0),
('Workshop Kỹ năng bán hàng', '2024-06-15', 'Phòng đào tạo 2', 30, 'Đã hoàn thành', 'Đã duyệt', 0, 0, 0, 0, 0, 0),
('Tiệc trà kết nối đối tác', '2024-06-08', 'Văn phòng WeLink', 25, 'Đã hoàn thành', 'Đã duyệt', 0, 0, 0, 0, 0, 0),
('Networking Doanh nhân trẻ', '2024-06-01', 'Café The Vista', 50, 'Đã hoàn thành', 'Đã duyệt', 0, 0, 0, 0, 0, 0),
('Hội thảo Kết nối doanh nghiệp tháng 5/2024', '2024-05-25', 'Trung tâm hội nghị Quốc Gia', 100, 'Đã hoàn thành', 'Đã duyệt', 0, 0, 0, 0, 0, 0);

-- 3. Insert Event Registrations (Khách mời đăng ký)
INSERT INTO event_registrations (event_id, guest_name, guest_phone, guest_email, company_address, attendance_status) VALUES
(2, 'Trần Quốc Tuấn', '0912345678', 'quoctuan@gmail.com', 'Hà Đông, Hà Nội', 'Mới đăng ký'),
(3, 'Lê Thị Mai', '0923456789', 'thimai@gmail.com', 'Nam Từ Liêm, Hà Nội', 'Mới đăng ký'),
(4, 'Phạm Hùng Cường', '0934567890', 'hungcuong@gmail.com', 'Vĩnh Phúc', 'Đã check-in');

-- 4. Insert Invitations (Gán tạm cho Admin ID = 1)
INSERT INTO invitations (inviter_id, invitee_name, invitee_email, created_at, status, reward_points) VALUES
(1, 'Nguyễn Văn An', 'nguyenvanan@gmail.com', '2026-08-19', 'Đã tham gia', 1),
(1, 'Trần Thị Bình', 'tranthibinh@gmail.com', '2026-08-20', 'Đã tham gia', 1),
(1, 'Lê Văn Cường', 'levancuong@gmail.com', '2026-08-21', 'Đang chờ', 0),
(1, 'Phạm Thị Đồng', 'phamthidong@gmail.com', '2026-08-22', 'Đang chờ', 0),
(1, 'Vũ Thị Giang', 'vuthigiang@gmail.com', '2026-08-23', 'Từ chối', 0),
(1, 'Hoàng Văn Nam', 'hoangvannam@gmail.com', '2026-08-24', 'Đã tham gia', 1),
(1, 'Đỗ Thị Hồng', 'dothihong@gmail.com', '2026-08-25', 'Đang chờ', 0),
(1, 'Ngô Văn Khải', 'ngovankhai@gmail.com', '2026-08-26', 'Đã tham gia', 1),
(1, 'Mai Thị Lan', 'maithilan@gmail.com', '2026-08-27', 'Đang chờ', 0),
(1, 'Phan Văn Long', 'phanvanlong@gmail.com', '2026-08-28', 'Đã tham gia', 1);
