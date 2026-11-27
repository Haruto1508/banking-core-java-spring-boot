# module-bootstrap

## Tổng quan

**module-bootstrap** là module khởi chạy (entrypoint) của toàn bộ hệ thống Core Banking System. Đây là nơi tập trung cấu hình Spring Boot, Flyway database migrations, Swagger/OpenAPI, Global Exception Handling, và tích hợp tất cả các business modules thành một Modular Monolith thống nhất.

---

## Các thành phần chính

### 1. Application Entrypoint (`CoreBankingApplication`)
- `@SpringBootApplication(scanBasePackages = "com.banking.core")`: Quét toàn bộ bean từ cả 10 modules.
- `@EnableJpaAuditing`: Kích hoạt tự động cập nhật audit timestamps.

### 2. Global Exception Handling (`GlobalExceptionHandler`)
- `@RestControllerAdvice`: Bắt và chuẩn hóa mọi exception thành `ErrorResponse` JSON thống nhất:
  - `BankingException` → HTTP status theo `ErrorCode`
  - `MethodArgumentNotValidException` → 400 Bad Request kèm chi tiết lỗi từng field
  - `AccessDeniedException` → 403 Forbidden (xử lý trước khi bị catch-all)
  - `Exception` → 500 Internal Server Error (ẩn chi tiết stacktrace khỏi client)

### 3. Database Migrations (Flyway)
Quản lý toàn bộ schema PostgreSQL tại `src/main/resources/db/migration/`:
- `V1__init_schema.sql`: Tạo các bảng cốt lõi (`users`, `customers`, `accounts`, `transactions`, `ledger_journals`, `ledger_entries`, `idempotency_records`, `audit_logs`) và seed tài khoản `SYS-GL-VAULT-001`.
- `V2__add_refresh_tokens_table.sql`: Tạo bảng `refresh_tokens` phục vụ JWT refresh & revocation.
- `V3__add_ledger_reversal.sql`: Bổ sung cột `original_journal_id` hỗ trợ truy vết bút toán đảo.
- `V4__add_payments_and_notifications_tables.sql`: Tạo bảng `payments` và `notifications`.

### 4. Configuration (`application.yml`, `application-dev.yml`, `application-test.yml`)
- Hỗ trợ đọc biến môi trường từ file `.env` (`spring.config.import: optional:file:.env[.properties]`).
- `hibernate.ddl-auto: validate`: Đảm bảo JPA entities khớp 100% với Flyway SQL schema.

### 5. Integration & Concurrency Tests
Chứa các bài test toàn hệ thống (end-to-end, concurrency transfer tests, double-entry ledger invariant tests).
