-- Reset báº£ng
TRUNCATE TABLE invitations, event_registrations, event_organizer_roles, contracts, events, users, teams CASCADE;
ALTER SEQUENCE users_id_seq RESTART WITH 1;
ALTER SEQUENCE events_id_seq RESTART WITH 1;
ALTER SEQUENCE invitations_id_seq RESTART WITH 1;
ALTER SEQUENCE event_registrations_id_seq RESTART WITH 1;

-- 1. Insert Users (Gá»™p ThÃ nh viÃªn vÃ  TÃ i khoáº£n Admin)
INSERT INTO users (full_name, phone, email, role, status) VALUES
('Nhung Nguyá»…n', '0000000001', 'nhungnguyen1722@gmail.com', 'Admin', 'Äang hoáº¡t Ä‘á»™ng'),
('Nguyá»…n Tuáº¥n', '0000000002', 'tuan161022@gmail.com', 'NhÃ¢n viÃªn', 'Äang hoáº¡t Ä‘á»™ng'),
('Nguyá»…n VÄƒn An', '0901234567', 'an.nguyen@nghiengcomplex.vn', 'MC', 'Äang hoáº¡t Ä‘á»™ng'),
('Tráº§n Thá»‹ BÃ¬nh', '0902345678', 'binh.tran@nghiengcomplex.vn', 'Thuyáº¿t trÃ¬nh', 'Äang hoáº¡t Ä‘á»™ng'),
('LÃª HoÃ ng CÆ°á»ng', '0903456789', 'cuong.le@nghiengcomplex.vn', 'Chá»‘t sá»± kiá»‡n', 'Äang hoáº¡t Ä‘á»™ng'),
('Pháº¡m Thá»‹ Dung', '0904567890', 'dung.pham@nghiengcomplex.vn', 'Phá»¥ng sá»±', 'Äang hoáº¡t Ä‘á»™ng'),
('HoÃ ng VÄƒn Em', '0905678901', 'em.hoang@nghiengcomplex.vn', 'Kinh doanh', 'Äang hoáº¡t Ä‘á»™ng'),
('Äá»— Thá»‹ PhÆ°Æ¡ng', '0906789012', 'phuong.do@nghiengcomplex.vn', 'Team Leader', 'Äang hoáº¡t Ä‘á»™ng');

-- 2. Insert Events
INSERT INTO events (name, event_date, location, expected_guests, status, approval_status, fee, mc_fee, speaker_fee, support_fee, closer_fee, tea_break_fee) VALUES
('Sá»± kiá»‡n 1', '2026-09-02', '-', 0, 'Káº¿ hoáº¡ch', 'ÄÃ£ duyá»‡t', 10000000, 2000000, 3000000, 1000000, 2000000, 2000000),
('Há»™i nghá»‹ khÃ¡ch hÃ ng HÃ  ÄÃ´ng', '2026-08-15', 'HÃ  ÄÃ´ng', 5, 'Káº¿ hoáº¡ch', 'Chá» duyá»‡t', 15000000, 3000000, 5000000, 2000000, 3000000, 2000000),
('Tiá»‡c trÃ  káº¿t ná»‘i', '2026-08-15', 'VÄƒn phÃ²ng Nghiêng Complex', 1, 'Káº¿ hoáº¡ch', 'Chá» duyá»‡t', 8420000, 1500000, 2500000, 1000000, 1500000, 1920000),
('Sá»± kiá»‡n VÄ©nh PhÃºc káº¿t ná»‘i', '2026-08-08', 'VÄ©nh PhÃºc', 7, 'ÄÃ£ hoÃ n thÃ nh', 'ÄÃ£ duyá»‡t', 12000000, 2000000, 4000000, 2000000, 2000000, 2000000),
('Sá»± kiá»‡n Äáº¡i Má»— ra quÃ¢n', '2026-08-01', 'P. Äáº¡i Má»—', 8, 'ÄÃ£ hoÃ n thÃ nh', 'ÄÃ£ duyá»‡t', 24000000, 4000000, 8000000, 3000000, 5000000, 4000000),
('Há»™i tháº£o chuyÃªn Ä‘á» Marketing', '2024-06-28', 'Trung tÃ¢m há»™i nghá»‹ Quá»‘c Gia', 120, 'Äang thá»±c hiá»‡n', 'ÄÃ£ duyá»‡t', 0, 0, 0, 0, 0, 0),
('Gáº·p gá»¡ Ä‘á»‘i tÃ¡c chiáº¿n lÆ°á»£c', '2024-06-20', 'NhÃ  hÃ ng Sen TÃ¢y Há»“', 20, 'ÄÃ£ hoÃ n thÃ nh', 'ÄÃ£ duyá»‡t', 0, 0, 0, 0, 0, 0),
('Workshop Ká»¹ nÄƒng bÃ¡n hÃ ng', '2024-06-15', 'PhÃ²ng Ä‘Ã o táº¡o 2', 30, 'ÄÃ£ hoÃ n thÃ nh', 'ÄÃ£ duyá»‡t', 0, 0, 0, 0, 0, 0),
('Tiá»‡c trÃ  káº¿t ná»‘i Ä‘á»‘i tÃ¡c', '2024-06-08', 'VÄƒn phÃ²ng Nghiêng Complex', 25, 'ÄÃ£ hoÃ n thÃ nh', 'ÄÃ£ duyá»‡t', 0, 0, 0, 0, 0, 0),
('Networking Doanh nhÃ¢n tráº»', '2024-06-01', 'CafÃ© The Vista', 50, 'ÄÃ£ hoÃ n thÃ nh', 'ÄÃ£ duyá»‡t', 0, 0, 0, 0, 0, 0),
('Há»™i tháº£o Káº¿t ná»‘i doanh nghiá»‡p thÃ¡ng 5/2024', '2024-05-25', 'Trung tÃ¢m há»™i nghá»‹ Quá»‘c Gia', 100, 'ÄÃ£ hoÃ n thÃ nh', 'ÄÃ£ duyá»‡t', 0, 0, 0, 0, 0, 0);

-- 3. Insert Event Registrations (KhÃ¡ch má»i Ä‘Äƒng kÃ½)
INSERT INTO event_registrations (event_id, guest_name, guest_phone, guest_email, company_address, attendance_status) VALUES
(2, 'Tráº§n Quá»‘c Tuáº¥n', '0912345678', 'quoctuan@gmail.com', 'HÃ  ÄÃ´ng, HÃ  Ná»™i', 'Má»›i Ä‘Äƒng kÃ½'),
(3, 'LÃª Thá»‹ Mai', '0923456789', 'thimai@gmail.com', 'Nam Tá»« LiÃªm, HÃ  Ná»™i', 'Má»›i Ä‘Äƒng kÃ½'),
(4, 'Pháº¡m HÃ¹ng CÆ°á»ng', '0934567890', 'hungcuong@gmail.com', 'VÄ©nh PhÃºc', 'ÄÃ£ check-in');

-- 4. Insert Invitations (GÃ¡n táº¡m cho Admin ID = 1)
INSERT INTO invitations (inviter_id, invitee_name, invitee_email, created_at, status, reward_points) VALUES
(1, 'Nguyá»…n VÄƒn An', 'nguyenvanan@gmail.com', '2026-08-19', 'ÄÃ£ tham gia', 1),
(1, 'Tráº§n Thá»‹ BÃ¬nh', 'tranthibinh@gmail.com', '2026-08-20', 'ÄÃ£ tham gia', 1),
(1, 'LÃª VÄƒn CÆ°á»ng', 'levancuong@gmail.com', '2026-08-21', 'Äang chá»', 0),
(1, 'Pháº¡m Thá»‹ Äá»“ng', 'phamthidong@gmail.com', '2026-08-22', 'Äang chá»', 0),
(1, 'VÅ© Thá»‹ Giang', 'vuthigiang@gmail.com', '2026-08-23', 'Tá»« chá»‘i', 0),
(1, 'HoÃ ng VÄƒn Nam', 'hoangvannam@gmail.com', '2026-08-24', 'ÄÃ£ tham gia', 1),
(1, 'Äá»— Thá»‹ Há»“ng', 'dothihong@gmail.com', '2026-08-25', 'Äang chá»', 0),
(1, 'NgÃ´ VÄƒn Kháº£i', 'ngovankhai@gmail.com', '2026-08-26', 'ÄÃ£ tham gia', 1),
(1, 'Mai Thá»‹ Lan', 'maithilan@gmail.com', '2026-08-27', 'Äang chá»', 0),
(1, 'Phan VÄƒn Long', 'phanvanlong@gmail.com', '2026-08-28', 'ÄÃ£ tham gia', 1);


