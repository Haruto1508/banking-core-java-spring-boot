# `module-customer` — Customer Management Module

## 1. Tổng Quan
`module-customer` quản lý hồ sơ khách hàng (CIF - Customer Information File) trong hệ thống Core Banking. Đây là module nền tảng mà các module khác như `module-account` và `module-transaction` phụ thuộc để xác minh khách hàng có hợp lệ và đang hoạt động trước khi thực hiện giao dịch tài chính.

Module chỉ giao tiếp ra ngoài qua `CustomerApi` (interface công khai), không để lộ Entity hoặc Repository nội bộ.

---

## 2. Chức Năng & Cách Hoạt Động

### 2.1. Tạo hồ sơ khách hàng (`POST /api/v1/customers`)
- **Làm gì:** Tạo mới hồ sơ KYC khách hàng và sinh số CIF duy nhất.
- **Hoạt động:**
  1. Kiểm tra `identityNumber` chưa tồn tại (tránh đăng ký trùng).
  2. Nếu `CUSTOMER` tự tạo: gắn `userId` của chính họ.
  3. Nếu `STAFF`/`ADMIN` tạo: có thể gắn `userId` tùy chọn hoặc để trống (khách tại quầy chưa có tài khoản hệ thống).
  4. Sinh số CIF theo format `CIF-YYYYMMDD-XXXXXX`.
  5. Lưu với trạng thái mặc định `ACTIVE`.

### 2.2. Xem hồ sơ của chính mình (`GET /api/v1/customers/me`)
- **Làm gì:** Trả về hồ sơ khách hàng liên kết với user đang đăng nhập.
- **Hoạt động:** Tìm customer theo `userId` từ Security Context.

### 2.3. Xem hồ sơ theo ID (`GET /api/v1/customers/{customerId}`)
- **Làm gì:** Trả về thông tin đầy đủ của một khách hàng.
- **Kiểm soát quyền:**
  - `CUSTOMER`: Chỉ được xem hồ sơ của chính mình (kiểm tra `customer.userId == requesterUserId`).
  - `STAFF`/`ADMIN`: Xem được tất cả.

### 2.4. Tìm kiếm khách hàng (`GET /api/v1/customers?keyword=&status=`)
- **Làm gì:** Tìm kiếm danh sách khách hàng với lọc và phân trang. Chỉ `STAFF`/`ADMIN`.
- **Hoạt động:** JPQL `LIKE` trên các trường `fullName`, `customerNumber`, `identityNumber`, `email`, `phoneNumber`.

### 2.5. Cập nhật thông tin liên hệ (`PUT /api/v1/customers/{customerId}`)
- **Làm gì:** Cập nhật `fullName`, `phoneNumber`, `email`.
- **Hạn chế:** Không được đổi `identityNumber` hay `customerNumber`.
- **Kiểm soát quyền:** `CUSTOMER` chỉ sửa hồ sơ của chính mình.

### 2.6. Thay đổi trạng thái khách hàng (`PATCH /api/v1/customers/{customerId}/status`)
- **Làm gì:** Chuyển trạng thái giữa `ACTIVE`, `SUSPENDED`, `CLOSED`. Chỉ `STAFF`/`ADMIN`.
- **Quy tắc nghiệp vụ:** Hồ sơ `CLOSED` không thể mở lại.

---

## 3. Public API (`exposed`)
Module cung cấp `CustomerApi` cho các module khác:

| Method | Mô tả |
|--------|-------|
| `findCustomerById(UUID)` | Truy vấn tóm tắt khách hàng theo customer ID |
| `findCustomerByUserId(UUID)` | Truy vấn tóm tắt khách hàng theo user ID |
| `isCustomerActive(UUID)` | Kiểm tra khách hàng tồn tại và đang ACTIVE |

---

## 4. Quy Tắc Nghiệp Vụ
- Mỗi `identityNumber` chỉ được đăng ký một lần duy nhất.
- Mỗi `userId` chỉ có thể liên kết với tối đa một hồ sơ khách hàng.
- Chỉ khách hàng `ACTIVE` mới có thể mở tài khoản ngân hàng (rule bắt buộc bởi `module-account`).
