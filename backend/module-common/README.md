# module-common

## Tổng quan

**module-common** là module dùng chung (shared kernel) cho toàn bộ 9 module còn lại trong kiến trúc Modular Monolith. Module này không chứa nghiệp vụ cụ thể của từng domain mà chỉ cung cấp các chuẩn chung về dữ liệu, xử lý lỗi và độ chính xác tài chính.

---

## Các thành phần chính

### 1. Financial Precision (`BankingConstants`)
- `FINANCIAL_SCALE = 4`: Mọi giá trị tiền tệ đều dùng `BigDecimal` với 4 chữ số thập phân.
- `FINANCIAL_ROUNDING = RoundingMode.HALF_EVEN`: Chuẩn Banker's Rounding.
- `SYSTEM_VAULT_ACCOUNT_NUMBER = "SYS-GL-VAULT-001"` và `SYSTEM_VAULT_ACCOUNT_ID`: Tài khoản két sắt trung tâm dùng cho bút toán kép khi Nạp/Rút tiền mặt.

### 2. Base Audit Entity (`BaseAuditEntity`)
- Lớp cha cho hầu hết các entity trong hệ thống.
- Cung cấp khóa chính `UUID` (tự sinh trước khi persist) và hai cột `created_at`, `updated_at`.

### 3. Standard API Response (`ApiResponse`, `PageResponse`, `ErrorResponse`)
- `ApiResponse<T>`: Chuẩn hóa JSON trả về cho mọi endpoint thành công (`success`, `message`, `data`, `timestamp`).
- `PageResponse<T>`: Chuẩn hóa dữ liệu phân trang (`content`, `page`, `size`, `totalElements`, `totalPages`, `last`).
- `ErrorResponse`: Chuẩn hóa JSON lỗi (`code`, `message`, `status`, `path`, `timestamp`, `fieldErrors`).

### 4. Centralized Exceptions & Error Codes
- `ErrorCode`: Enum quy định mã lỗi chuẩn (`ERR_GEN_*`, `ERR_AUTH_*`, `ERR_CUS_*`, `ERR_ACC_*`, `ERR_TXN_*`, `ERR_LDG_*`) kèm `HttpStatus`.
- `BankingException` (lớp gốc) và các exception chuyên biệt:
  - `ResourceNotFoundException` (404)
  - `InsufficientBalanceException` (422)
  - `InvalidAccountStateException` (422)
  - `ConflictException` (409)
