# module-audit

## Tổng quan

**module-audit** ghi lại toàn bộ nhật ký kiểm toán (Audit Trail) cho các thao tác nhạy cảm và giao dịch tài chính trong hệ thống ngân hàng lõi.

Mọi bản ghi audit đều **bất biến (immutable)** — chỉ thêm mới (insert-only), không sửa hoặc xóa.

---

## API Endpoints

| Method | Endpoint                                                 | Quyền truy cập | Chức năng                              |
|--------|----------------------------------------------------------|----------------|----------------------------------------|
| `GET`  | `/api/v1/audit-logs/actor/{actorId}`                     | ADMIN          | Xem lịch sử thao tác theo người dùng   |
| `GET`  | `/api/v1/audit-logs/resource/{resourceType}/{resourceId}`| ADMIN          | Xem lịch sử thao tác theo tài nguyên   |

---

## Cross-module API (`AuditApi`)

| Method           | Mô tả                                                               |
|------------------|---------------------------------------------------------------------|
| `recordAuditLog` | Ghi log với `REQUIRES_NEW` transaction — lưu ngay cả khi rollback   |

---

## Bảo mật (Security & Compliance)

> [!IMPORTANT]
> - Không bao giờ lưu mật khẩu, JWT token, mã PIN hay CVV vào bảng `audit_logs`.
> - `AuditServiceImpl` tích hợp bộ lọc regex tự động thay thế các trường nhạy cảm trong `metadata` thành `[REDACTED]`.
> - Chỉ role `ADMIN` mới có quyền truy vấn endpoint audit logs.
