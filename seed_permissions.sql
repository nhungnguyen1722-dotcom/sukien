-- Thêm tài khoản Vũ Thị Cúc (Admin, full quyền)
-- Kiểm tra email trước khi insert
DO $$
DECLARE
    v_user_id INT;
BEGIN
    -- Check xem user đã tồn tại chưa
    SELECT id INTO v_user_id FROM users WHERE email = 'vuthicuc@gmail.com';
    
    IF v_user_id IS NULL THEN
        INSERT INTO users (full_name, phone, email, role, status)
        VALUES ('Vũ Thị Cúc', '0909999888', 'vuthicuc@gmail.com', 'Admin', 'Đang hoạt động')
        RETURNING id INTO v_user_id;
    END IF;

    -- Gán quyền đầy đủ cho Vũ Thị Cúc
    IF v_user_id IS NOT NULL THEN
        INSERT INTO permissions (user_id, module, can_view, can_create, can_edit, can_delete) VALUES
        (v_user_id, 'Tổng quan', TRUE, TRUE, TRUE, TRUE),
        (v_user_id, 'Sự kiện', TRUE, TRUE, TRUE, TRUE),
        (v_user_id, 'Thành viên', TRUE, TRUE, TRUE, TRUE),
        (v_user_id, 'Người mới', TRUE, TRUE, TRUE, TRUE),
        (v_user_id, 'Lễ tân', TRUE, TRUE, TRUE, TRUE),
        (v_user_id, 'Mời bạn bè', TRUE, TRUE, TRUE, TRUE),
        (v_user_id, 'Tài khoản', TRUE, TRUE, TRUE, TRUE)
        ON CONFLICT (user_id, module) DO UPDATE SET
            can_view = TRUE, can_create = TRUE, can_edit = TRUE, can_delete = TRUE;
    END IF;
END $$;

-- Gán quyền đầy đủ cho Nhung Nguyễn (Admin hiện tại)
DO $$
DECLARE
    v_user_id INT;
BEGIN
    SELECT id INTO v_user_id FROM users WHERE email = 'nhungnguyen1722@gmail.com';
    IF v_user_id IS NOT NULL THEN
        INSERT INTO permissions (user_id, module, can_view, can_create, can_edit, can_delete) VALUES
        (v_user_id, 'Tổng quan', TRUE, TRUE, TRUE, TRUE),
        (v_user_id, 'Sự kiện', TRUE, TRUE, TRUE, TRUE),
        (v_user_id, 'Thành viên', TRUE, TRUE, TRUE, TRUE),
        (v_user_id, 'Người mới', TRUE, TRUE, TRUE, TRUE),
        (v_user_id, 'Lễ tân', TRUE, TRUE, TRUE, TRUE),
        (v_user_id, 'Mời bạn bè', TRUE, TRUE, TRUE, TRUE),
        (v_user_id, 'Tài khoản', TRUE, TRUE, TRUE, TRUE)
        ON CONFLICT (user_id, module) DO UPDATE SET
            can_view = TRUE, can_create = TRUE, can_edit = TRUE, can_delete = TRUE;
    END IF;
END $$;
