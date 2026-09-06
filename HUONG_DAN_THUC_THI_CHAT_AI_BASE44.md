# HƯỚNG DẪN & BỘ PROMPT THỰC THI CHAT AI CHO BASE44
*(Dành cho dự án Base44: https://nghieng-budget-flow.base44.app/)*

Tài liệu này được biên soạn chuẩn hóa theo đúng yêu cầu tại **Mục 9 của tài liệu `Yeu_cau_cap_nhat_logo_Nghieng_Complex_v3.docx`**. Các prompt bên dưới được thiết kế chuyên biệt để gửi trực tiếp vào khung Chat AI của Base44 (`https://app.base44.com/apps`), đảm bảo tuân thủ nguyên tắc không làm thay đổi dữ liệu lịch sử, không tạo trùng lặp trang và chuẩn xác 100% theo giao diện tham chiếu.

---

## NGUYÊN TẮC THỰC THI CHAT AI TRÊN BASE44
1. **Phạm vi chỉnh sửa**: Ưu tiên chỉnh sửa trực tiếp trên component/trang hiện tại, không tạo component trùng lặp hoặc thêm trang thừa.
2. **Bảo toàn dữ liệu lịch sử (Immutability / Snapshotting)**: Các cấu hình mới (như 5 trường giá cố định của sự kiện, hoa hồng hợp đồng) chỉ áp dụng cho dữ liệu được tạo mới sau thời điểm cấu hình; tuyệt đối không tính toán lại hoặc ghi đè dữ liệu cũ.
3. **Một nguồn dữ liệu dùng chung (Single Source of Truth)**: Logo hệ thống và giá trị cấu hình mặc định được quản lý tập trung từ Setting. Khi cập nhật tại Setting, toàn bộ hệ thống tự động nhận giá trị mới.
4. **Kiểm tra nghiệm thu sau mỗi prompt**: Xác minh giao diện, nút bấm, modal, phân quyền và dữ liệu liên quan.

---

## BỘ PROMPT CHUẨN HÓA CHO TỪNG MỤC

### 📌 Prompt 1: Cập nhật Logo Header trang Public (Mục 1 - Hình 1)
```text
Hãy cập nhật Header của giao diện Public (trang chủ và các trang công khai):
1. Vị trí: Khu vực Logo ở góc trên bên trái Header (hiện đang hiển thị chữ "N" màu xanh và "Nghiêng Complex").
2. Yêu cầu: Thay thế toàn bộ cụm logo hiện tại bằng file ảnh logo chính thức "logo-nghieng.png".
3. Thiết kế: Giữ nguyên bố cục, chiều cao Header, lề và vị trí; hiển thị logo vừa vặn (object-contain), sắc nét.
4. Các thành phần khác: Giữ nguyên menu "Sự kiện", nút "Đăng nhập" và chân trang (Footer).
5. Không làm thay đổi bất kỳ tính năng hoặc giao diện nào khác ngoài Header Public.
```

---

### 📌 Prompt 2: Cập nhật Logo trong Giao diện Admin (Mục 2 - Hình 2)
```text
Hãy cập nhật Logo trong Sidebar của giao diện Admin:
1. Vị trí: Góc trên bên trái của Sidebar Admin (hiện đang hiển thị icon khối vuông "W" và chữ "WeLink").
2. Yêu cầu: Thay thế toàn bộ cụm Logo WeLink bằng Logo chính thức của Nghiêng Complex từ file "logo-nghieng.png".
3. Thiết kế: Hiển thị logo trên nền phù hợp để nổi bật trên nền tối (#0f172a) của Sidebar Admin, giữ nguyên kích thước bố cục sidebar.
4. Giữ nguyên toàn bộ các menu điều hướng, thông tin tài khoản và nút đăng xuất ở chân sidebar.
```

---

### 📌 Prompt 3: Xây dựng Trang Quản Lý Cài Đặt (Setting) & Quản Lý Logo (Mục 3)
```text
Hãy bổ sung tính năng Cài đặt (Setting) để quản lý Logo toàn hệ thống trong giao diện Admin:
1. Điều hướng: Thêm menu "Thiết lập" / "Cài đặt" vào Sidebar Admin với icon Settings, dẫn đến trang quản trị cấu hình hệ thống.
2. Quyền hạn: Chỉ tài khoản Admin mới được phép truy cập và thực hiện thay đổi.
3. Chức năng Quản lý Logo:
   - Hiển thị logo hiện tại đang được áp dụng trên hệ thống.
   - Cung cấp nút và khung kéo thả/chọn tệp từ máy tính để tải lên logo mới (hỗ trợ PNG, JPG, SVG, WebP).
   - Có khu vực xem trước (Preview) logo mới trước khi xác nhận lưu (mô phỏng trên cả nền sáng và nền tối).
   - Có nút "Cập nhật Logo" để lưu thay đổi.
   - Có nút "Khôi phục mặc định" để quay về logo gốc logo-nghieng.png khi cần.
4. Nguyên tắc đồng bộ: Logo được quản lý từ một nguồn dữ liệu cấu hình tập trung. Khi Admin cập nhật logo tại đây, Logo mới phải tự động áp dụng ngay lập tức trên toàn hệ thống: Header Public, Sidebar Admin và ảnh mặc định sự kiện mà không cần sửa thủ công từng trang.
5. Lưu trữ lâu dài: Logo tùy chỉnh phải được lưu bền vững trong cơ sở dữ liệu, không bị mất khi tải lại trang, đăng xuất hoặc đăng nhập lại.
```

---

### 📌 Prompt 4: Hiển thị Logo Nghiêng mặc định cho bài viết chưa có ảnh (Mục 4 - Hình 3 & 4)
```text
Hãy cập nhật cơ chế hiển thị hình ảnh cho bài viết/sự kiện tại Public:
1. Trang cần cập nhật: Trang danh sách sự kiện (Trang chủ) và Trang chi tiết sự kiện (/su-kien/:id).
2. Quy tắc xử lý hình ảnh:
   - Nếu bài viết/sự kiện ĐÃ CÓ ẢNH riêng: Ưu tiên hiển thị đúng ảnh của bài viết/sự kiện đó.
   - Nếu bài viết/sự kiện CHƯA CÓ ẢNH (trống, null): Không để trống khu vực ảnh và không chỉ hiển thị icon lịch mặc định. Thay vào đó, tự động lấy Logo Nghiêng Complex (hoặc logo đang kích hoạt trong hệ thống) làm ảnh đại diện mặc định.
3. Thiết kế: Hiển thị ảnh logo đại diện cân đối, trang nhã, đúng tỉ lệ khung hình (card danh sách trang chủ và banner lớn đầu trang chi tiết sự kiện).
4. Tính đồng bộ: Khi Admin cập nhật Logo mới trong trang Setting, ảnh đại diện mặc định của các bài viết chưa có ảnh cũng tự động cập nhật theo logo mới.
```

---

### 📌 Prompt 5: Điều chỉnh hiển thị trường form Thành viên (Mục 5 - Hình 5, 6, 7, 8)
```text
Tại trang Quản lý Thành viên (/admin/thanh-vien), hãy điều chỉnh cách hiển thị các trường dữ liệu trong Form:
1. Thao tác click nút "Thêm mới" (Thêm thành viên mới):
   - Ẩn hoàn toàn 3 trường: "Email", "Số tài khoản" và "Căn cước công dân". Người dùng không nhìn thấy và không cần nhập 3 trường này khi tạo mới.
   - Các trường khác (Họ tên, SĐT, Nhóm người mời, Mã mời, Vai trò, Phân loại, Chức danh, Người giới thiệu, Nguồn, Ngày tham gia, Số lần làm khách, Trạng thái) giữ nguyên.
2. Thao tác click biểu tượng "Sửa" (Cột Thao tác trong bảng thành viên):
   - Hiển thị đầy đủ 3 trường: "Email", "Số tài khoản" và "Căn cước công dân" kèm theo dữ liệu đã lưu để Admin có thể xem và chỉnh sửa thông tin.
3. Bảo toàn dữ liệu:
   - Không xóa 3 trường này khỏi cơ sở dữ liệu.
   - Dữ liệu Email, Số tài khoản, CCCD của tất cả thành viên hiện tại trong hệ thống phải được giữ nguyên vẹn 100%.
```

---

### 📌 Prompt 6: Chức năng Cập nhật 5 trường cố định cho sự kiện mới (Mục 6 - Hình 9 & 10)
```text
Tại trang Quản lý sự kiện (/admin/su-kien), bổ sung chức năng thiết lập mức giá cho 5 trường cố định:
1. Giao diện:
   - Thêm nút "Cập nhật giá 5 trường cố định" (nằm cạnh nút "Tạo sự kiện mới").
   - Thêm thông báo "Quy tắc chi phí tiệc trà: Khách mời đã được công ty chi trả phí tiệc trà quá 5 lần, từ lần thứ 6 trở đi khách sẽ tự trả phí." phía trên thanh lọc.
2. Khi click nút "Cập nhật giá 5 trường cố định", mở bảng/drawer "CẬP NHẬT 5 TRƯỜNG CỐ ĐỊNH" gồm:
   - Thù lao phụng sự (mặc định: 200.000 VNĐ)
   - Thù lao MC (mặc định: 200.000 VNĐ)
   - Thù lao thuyết trình (mặc định: 300.000 VNĐ)
   - Chốt sự kiện (mặc định: 200.000 VNĐ)
   - Chi phí tiệc trà (50đ, TD hỗ trợ) (mặc định: 1.250.000 VNĐ)
   - Khung lưu ý quan trọng về quy tắc chi trả tiệc trà.
   - Nút "Hủy" và nút "Lưu cập nhật".
3. Quy tắc dữ liệu sống còn:
   - Khi Admin thay đổi giá của 5 trường này, giá trị mới CHỈ ÁP DỤNG cho các sự kiện ĐƯỢC TẠO MỚI sau thời điểm cập nhật.
   - Tuyệt đối KHÔNG tính lại, không cập nhật ngược và không ghi đè chi phí của các sự kiện đã được tạo trong quá khứ.
```

---

### 📌 Prompt 7: Cố định 5 trường giá khi Tạo sự kiện mới (Mục 7 - Hình 11 & 12)
```text
Tại trang Quản lý sự kiện (/admin/su-kien), hoàn thiện luồng Tạo sự kiện mới:
1. Khi Admin click vào nút "Tạo sự kiện", mở popup tạo sự kiện.
2. Tại khu vực "5 trường giá cố định (chỉ áp dụng sự kiện mới)":
   - Tự động hiển thị đúng 5 giá trị hiện hành từ bảng 5 trường cố định (Giá MC, Giá Thuyết trình, Giá Phụng sự, Giá Chốt sự kiện, Giá Tiệc trà).
   - Trạng thái input: Cả 5 trường phải ở trạng thái KHÔNG CHO PHÉP CHỈNH SỬA (disabled / read-only), có nền mờ nhẹ, ngăn không cho người dùng gõ, sửa, xóa hoặc thay đổi giá trị thủ công trong popup này.
3. Khi Admin nhấn "Lưu" sự kiện:
   - Hệ thống snapshot (chụp lại) đúng 5 giá trị cố định tại thời điểm tạo và lưu độc lập vào bản ghi của sự kiện mới.
   - Các sự kiện đã tồn tại trước đó không bị thay đổi bất kỳ số liệu nào.
```

---

### 📌 Prompt 8: Thiết kế Giao diện & Nghiệp vụ Trang Nhật ký hợp đồng (Mục 8 - Hình 13)
```text
Hãy xây dựng trang "Nhật ký hợp đồng" trong giao diện Admin theo đúng 100% thiết kế tham chiếu Hình 13:
1. Điều hướng: Thêm menu "Nhật ký hợp đồng" (icon file spreadsheet) vào Sidebar Admin.
2. Tiêu đề: "Nhật ký hợp đồng" - Mô tả: "Quản lý hợp đồng, doanh số chốt và phân bổ hoa hồng" kèm nút "+ Thêm hợp đồng".
3. 4 Thẻ thống kê (Cards):
   - Tổng hợp đồng (icon văn bản xanh, hiển thị số lượng HĐ)
   - Tổng giá trị hợp đồng (icon tiền xu xanh lá, định dạng VNĐ)
   - Tổng hoa hồng (icon bàn tay nhận tiền cam, định dạng VNĐ)
   - Đã duyệt (icon khiên bảo mật tím, hiển thị số lượng HĐ đã duyệt)
   * Toàn bộ số liệu trên các thẻ phải được tính tự động từ dữ liệu hợp đồng thực tế.
4. Thanh công cụ tìm kiếm và lọc:
   - Ô tìm kiếm: "Tìm mã hợp đồng, khách hàng..."
   - Lọc Trạng thái (Tất cả, Đã duyệt, Chờ duyệt, Từ chối)
   - Lọc Người chốt (Tất cả và danh sách người chốt)
   - Lọc khoảng thời gian: Từ ngày - Đến ngày
   - Nút "Làm mới" và nút "Xuất Excel" (hỗ trợ xuất file CSV tương thích Excel).
5. Bảng Danh sách Hợp đồng gồm 14 cột chuẩn:
   - STT | Mã hợp đồng | Ngày ký | Tên khách hàng | Giá trị hợp đồng | Người chốt | Người giới thiệu | Người hỗ trợ | Thù lao người chốt (6%) | Thù lao người giới thiệu (1%) | Thù lao người hỗ trợ (0,5%) | Trạng thái (badge màu) | Hợp đồng (link "Xem file") | Thao tác (Xem, Sửa, Xóa).
6. Khung "Phân tích phân bổ ngân sách hợp đồng (15%)" ở góc dưới bên phải:
   - Bảng phân bổ gồm:
     + Sale trực tiếp - Pro sale (6%): Thù lao cho người chốt hợp đồng
     + Tri ân kết nối sale trực tiếp (1%): Thù lao cho người giới thiệu
     + Tri ân hỗ trợ sale (0,5%): Thù lao cho người hỗ trợ
     + Quỹ Sự kiện & Chốt hợp đồng (0,5%): Quỹ dùng cho sự kiện & chốt hợp đồng
     + Tổng cộng (8%): Tổng thù lao và quỹ
   * Các số tiền trong khung này tự động tính toán theo tỷ lệ từ Tổng giá trị hợp đồng.
7. Modal Thêm mới / Sửa hợp đồng:
   - Cho phép nhập Mã HĐ, Ngày ký, Tên khách hàng, Giá trị HĐ, chọn Người chốt, Người GT, Người hỗ trợ, Trạng thái, Ghi chú.
   - Tự động tính toán trước số tiền hoa hồng 6%, 1%, 0.5% khi người dùng nhập giá trị hợp đồng.
```

---

## BÁO CÁO NGHIỆM THU HOÀN TẤT
- Toàn bộ 9 mục đã được định nghĩa chi tiết với đầy đủ bối cảnh, trường dữ liệu, giao diện và quy tắc nghiệp vụ.
- Đảm bảo tính nhất quán giữa hệ thống Next.js hiện tại và môi trường Base44.
