# module-transaction

## Tổng quan

**module-transaction** là trái tim xử lý giao dịch tài chính của hệ thống Core Banking, đảm bảo:
- **ACID Transaction Boundary** với Spring `@Transactional`.
- **Deadlock Prevention** bằng Deterministic Lock Ordering (`min(UUID)` trước `max(UUID)`).
- **Idempotency** chống trùng lặp giao dịch khi client retry.
- **Double-entry Ledger** đồng bộ 100% với `module-ledger`.

---

## API Endpoints

| Method | Endpoint                                   | Quyền truy cập         | Chức năng                           |
|--------|--------------------------------------------|------------------------|-------------------------------------|
| `POST` | `/api/v1/transactions/deposit`             | ADMIN, STAFF           | Nạp tiền tại quầy (Deposit)         |
| `POST` | `/api/v1/transactions/withdraw`            | ADMIN, STAFF           | Rút tiền tại quầy (Withdrawal)      |
| `POST` | `/api/v1/transactions/transfer`            | Authenticated (IDOR)   | Chuyển khoản nội bộ (hỗ trợ Idempotency-Key) |
| `POST` | `/api/v1/transactions/{id}/reverse`        | ADMIN                  | Đảo giao dịch (Reversal)            |
| `GET`  | `/api/v1/transactions/{id}`                | Authenticated (IDOR)   | Xem chi tiết giao dịch              |
| `GET`  | `/api/v1/transactions/account/{accountId}` | Authenticated (IDOR)   | Lịch sử giao dịch có phân trang     |

---

## Các chức năng chi tiết

### 1. Deposit (`deposit`)
- Chỉ STAFF/ADMIN thực hiện (mô phỏng giao dịch tại quầy).
- Cộng tiền vào tài khoản khách hàng (`AccountApi.creditAccount`).
- Ghi nhận bút toán kép: `DEBIT System Vault` / `CREDIT Customer Account`.

### 2. Withdrawal (`withdraw`)
- Chỉ STAFF/ADMIN thực hiện.
- Kiểm tra số dư và trạng thái tài khoản trước khi trừ tiền (`AccountApi.debitAccount`).
- Ghi nhận bút toán kép: `DEBIT Customer Account` / `CREDIT System Vault`.

### 3. Internal Fund Transfer (`transfer`)
- Kiểm tra **Idempotency-Key** thông qua `IdempotencyService`:
  - Nếu key đã `COMPLETED` với cùng payload SHA-256 → trả về kết quả cached, không trừ tiền lần 2.
  - Nếu key đã `COMPLETED` nhưng khác payload → ném lỗi `IDEMPOTENCY_PAYLOAD_MISMATCH` (422).
  - Nếu key đang `IN_PROGRESS` → ném lỗi `IDEMPOTENCY_CONFLICT` (409).
- Kiểm tra IDOR: `CUSTOMER` chỉ được chuyển tiền từ tài khoản của chính mình.
- Kiểm tra cùng loại tiền tệ (`CURRENCY_MISMATCH`).
- **Chống Deadlock**: Gọi `AccountApi.lockAccountsInOrder(sourceId, targetId)` để khóa 2 row theo thứ tự UUID tăng dần.
- Trừ tiền nguồn, cộng tiền đích, ghi nhận bút toán kép `DEBIT source` / `CREDIT target`.

### 4. Reversal (`reverse`)
- Chỉ `ADMIN` thực hiện trên giao dịch có trạng thái `SUCCESS`.
- Đánh dấu giao dịch gốc thành `REVERSED` (không thể đảo 2 lần).
- Hoàn tiền ngược lại các tài khoản và tạo giao dịch `REVERSAL` mới.
- Ghi nhận bút toán đảo (flip DEBIT ↔ CREDIT) trong `module-ledger`.
