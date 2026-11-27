# module-payment

## Tổng quan

**module-payment** quản lý các nghiệp vụ thanh toán hóa đơn / thương mại điện tử / QR Code trong hệ thống Core Banking.

Module này đóng vai trò lớp điều phối thanh toán (Payment Orchestrator) — tạo đơn thanh toán, kiểm tra quyền sở hữu tài khoản, và ủy thác toàn bộ quá trình chuyển tiền & ghi sổ kép (Double-entry Ledger) cho `module-transaction` thông qua `TransactionApi`.

---

## Trạng thái thanh toán (PaymentStatus)

| Trạng thái   | Mô tả                                                              |
|--------------|--------------------------------------------------------------------|
| `PENDING`    | Đơn thanh toán vừa được tạo, chờ xử lý                             |
| `COMPLETED`  | Thanh toán thành công, đã gắn `transactionId`                      |
| `FAILED`     | Thanh toán thất bại (ví dụ: không đủ số dư, tài khoản bị khóa)     |
| `REFUNDED`   | Đã hoàn tiền (đã thực hiện giao dịch đảo ngược trên Ledger)        |

---

## Phương thức thanh toán (PaymentMethod)

- `INTERNAL_ACCOUNT`: Thanh toán trực tiếp từ tài khoản nội bộ
- `BILL_PAYMENT`: Thanh toán hóa đơn (điện, nước, viễn thông)
- `QR_CODE`: Thanh toán quét mã QR

---

## API Endpoints

| Method | Endpoint                          | Quyền truy cập             | Chức năng                         |
|--------|-----------------------------------|----------------------------|-----------------------------------|
| `POST` | `/api/v1/payments`                | Tất cả (authenticated)     | Tạo & xử lý thanh toán            |
| `POST` | `/api/v1/payments/{id}/refund`    | ADMIN, STAFF               | Hoàn tiền thanh toán              |
| `GET`  | `/api/v1/payments/{id}`           | Tất cả (IDOR protected)    | Xem chi tiết thanh toán           |
| `GET`  | `/api/v1/payments/account/{aid}`  | Tất cả (IDOR protected)    | Lịch sử thanh toán theo tài khoản |

---

## Các chức năng chi tiết

### 1. Tạo & Xử lý thanh toán (`processPayment`)
- Hỗ trợ header `Idempotency-Key` để chống trừ tiền trùng khi retry.
- Kiểm tra tài khoản nguồn và tài khoản người bán (merchant) phải khác nhau.
- Bảo vệ IDOR: người dùng role `CUSTOMER` chỉ được thanh toán từ tài khoản của chính mình.
- Gọi `TransactionApi.executeInternalTransfer` để thực hiện trừ tiền và ghi sổ kép.
- Cập nhật trạng thái thanh toán thành `COMPLETED` và lưu `transactionId`.

### 2. Hoàn tiền (`refundPayment`)
- Chỉ áp dụng cho thanh toán ở trạng thái `COMPLETED`.
- Chỉ `ADMIN` hoặc `STAFF` có quyền thực hiện hoàn tiền.
- Gọi `TransactionApi.reverseTransaction` để hoàn trả tiền và ghi bút toán đảo trong Ledger.
- Cập nhật trạng thái thanh toán thành `REFUNDED`.

### 3. Xem chi tiết & Lịch sử thanh toán (`getPaymentById`, `getPaymentHistory`)
- Hỗ trợ phân trang và lọc theo trạng thái (`status`).
- Kiểm tra quyền sở hữu tài khoản đối với role `CUSTOMER`.
