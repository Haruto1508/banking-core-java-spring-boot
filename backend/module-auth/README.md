# `module-auth` — Authentication & RBAC Module

## 1. Module Overview
`module-auth` chịu trách nhiệm toàn bộ việc xác thực danh tính (Authentication), quản lý phiên đăng nhập (JWT Access Token + Refresh Token), bảo mật mật khẩu, khóa tài khoản tự động và phân quyền dựa trên vai trò (Role-Based Access Control - RBAC) trong hệ thống Core Banking.

Module này là ranh giới bảo mật đầu tiên cho mọi API và cung cấp `AuthApi` công khai để các module khác (`module-customer`, `module-account`, `module-transaction`) truy vấn thông tin user đang đăng nhập mà không phụ thuộc vào Entity hay Repository nội bộ.

---

## 2. Chức Năng & Cách Hoạt Động

### 2.1. Đăng ký tài khoản (`POST /api/v1/auth/register`)
- **Làm gì:** Tạo tài khoản đăng nhập mới cho khách hàng.
- **Hoạt động như thế nào:**
  1. Kiểm tra `username` và `email` chưa tồn tại trong bảng `users`.
  2. Mã hóa mật khẩu bằng `BCryptPasswordEncoder(12)`.
  3. Mặc định gán role `CUSTOMER` (chặn leo thang đặc quyền `ADMIN`/`STAFF` từ API công khai).
  4. Lưu user và phát hành cặp Access Token + Refresh Token.

### 2.2. Đăng nhập & Khóa tài khoản (`POST /api/v1/auth/login`)
- **Làm gì:** Xác thực người dùng và bảo vệ tài khoản trước tấn công dò mật khẩu (Brute-force).
- **Hoạt động như thế nào:**
  1. Tìm user theo `username` hoặc `email`.
  2. Kiểm tra trạng thái `DISABLED` hoặc đang bị `LOCKED` (kiểm tra `locked_until > now`).
  3. So khớp mật khẩu với BCrypt hash.
  4. **Nếu sai mật khẩu:** Tăng `failed_login_attempts`. Khi đạt ngưỡng (mặc định 5 lần), chuyển trạng thái sang `LOCKED` trong 15 phút (`noRollbackFor = AuthException.class` để đảm bảo bộ đếm vẫn lưu xuống DB).
  5. **Nếu đúng:** Reset `failed_login_attempts = 0` và cấp JWT Access Token + Opaque Refresh Token (băm SHA-256 trước khi lưu DB).

### 2.3. Làm mới Token (`POST /api/v1/auth/refresh`)
- **Làm gì:** Cấp Access Token mới khi Access Token cũ hết hạn mà không cần đăng nhập lại.
- **Hoạt động như thế nào (Refresh Token Rotation + Reuse Detection):**
  1. Hash Refresh Token gửi lên bằng SHA-256 để tra cứu trong bảng `refresh_tokens`.
  2. Nếu token đã bị `revoked = true` nhưng vẫn bị gửi lại $\rightarrow$ **Phát hiện đánh cắp token** $\rightarrow$ Thu hồi toàn bộ Refresh Token của user đó (`revokeAllByUserId`).
  3. Nếu token hợp lệ và còn hạn: đánh dấu token cũ `revoked = true` và cấp cặp token mới.

### 2.4. Đăng xuất (`POST /api/v1/auth/logout`)
- **Làm gì:** Hủy hiệu lực phiên đăng nhập của thiết bị hiện tại.
- **Hoạt động như thế nào:** Đánh dấu `revoked = true` cho Refresh Token tương ứng trong database.

### 2.5. Xem thông tin User hiện tại (`GET /api/v1/auth/me`)
- **Làm gì:** Trả về `UserProfileResponse` của người dùng đang đăng nhập từ `SecurityContextHolder`.

### 2.6. Mở khóa tài khoản (`POST /api/v1/auth/users/{userId}/unlock`)
- **Làm gì:** Cho phép `ADMIN` mở khóa thủ công tài khoản bị lock trước khi hết thời gian chờ.
- **Hoạt động như thế nào:** Bảo vệ bằng `@PreAuthorize("hasRole('ADMIN')")`, reset `failed_login_attempts = 0`, xóa `locked_until` và đưa trạng thái về `ACTIVE`.

---

## 3. Public API (`exposed`)
- `AuthApi`:
  - `findUserById(UUID userId)`
  - `existsById(UUID userId)`
  - `getCurrentAuthenticatedUserId()`
