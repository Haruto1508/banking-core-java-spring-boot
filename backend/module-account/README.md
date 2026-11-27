# module-account

## Tổng quan

**module-account** quản lý tài khoản ngân hàng (Bank Account) trong hệ thống Core Banking.

Mỗi tài khoản thuộc về một khách hàng (Customer), có số dư bằng `BigDecimal` (NUMERIC 19,4), loại tài khoản và trạng thái lifecycle.

---

## Loại tài khoản

| Loại        | Mô tả                                        |
|-------------|----------------------------------------------|
| `SAVINGS`   | Tài khoản tiết kiệm, có lãi suất             |
| `CURRENT`   | Tài khoản thanh toán (demand deposit)        |
| `SYSTEM`    | Tài khoản nội bộ (Vault GL — dành riêng hệ thống) |

---

## Trạng thái tài khoản

| Trạng thái | Mô tả                                   | Cho phép giao dịch |
|------------|-----------------------------------------|--------------------|
| `ACTIVE`   | Tài khoản hoạt động bình thường         | ✅ Yes              |
| `FROZEN`   | Bị phong tỏa (compliance/admin hold)    | ❌ No               |
| `CLOSED`   | Đã đóng vĩnh viễn                       | ❌ No               |

---

## API Endpoints

| Method   | Endpoint                              | Quyền truy cập             | Chức năng                        |
|----------|---------------------------------------|----------------------------|----------------------------------|
| `POST`   | `/api/v1/accounts`                    | Tất cả (authenticated)     | Mở tài khoản mới                 |
| `GET`    | `/api/v1/accounts/{id}`               | Tất cả (IDOR protected)    | Lấy chi tiết tài khoản           |
| `GET`    | `/api/v1/accounts/customer/{cid}`     | Tất cả (IDOR protected)    | Lấy danh sách tài khoản          |
| `GET`    | `/api/v1/accounts/{id}/balance`       | Tất cả (IDOR protected)    | Lấy số dư tài khoản              |
| `PATCH`  | `/api/v1/accounts/{id}/freeze`        | ADMIN, STAFF               | Phong tỏa tài khoản              |
| `PATCH`  | `/api/v1/accounts/{id}/unfreeze`      | ADMIN, STAFF               | Mở phong tỏa tài khoản           |
| `PATCH`  | `/api/v1/accounts/{id}/close`         | ADMIN                      | Đóng tài khoản vĩnh viễn         |

---

## Các chức năng chi tiết

### 1. Mở tài khoản (`openAccount`)
- Kiểm tra khách hàng tồn tại và đang ACTIVE.
- CUSTOMER chỉ được mở tài khoản cho chính mình (IDOR).
- Sinh số tài khoản duy nhất: `ACC-YYYYMMDD-NNNNNN`.
- Số dư ban đầu = 0.
- Không cho phép tạo tài khoản loại SYSTEM qua API.

### 2. Lấy thông tin tài khoản (`getAccountById`)
- CUSTOMER chỉ xem được tài khoản của mình.
- STAFF/ADMIN xem được tất cả tài khoản.

### 3. Danh sách tài khoản theo khách hàng (`getAccountsByCustomer`)
- Lọc bỏ tài khoản SYSTEM khỏi kết quả.
- CUSTOMER chỉ xem được tài khoản của chính mình.

### 4. Phong tỏa tài khoản (`freezeAccount`)
- Chỉ áp dụng cho tài khoản ACTIVE.
- Sau khi phong tỏa, mọi giao dịch nạp/rút/chuyển đều bị từ chối.

### 5. Mở phong tỏa (`unfreezeAccount`)
- Chỉ áp dụng cho tài khoản FROZEN.
- Khôi phục trạng thái ACTIVE.

### 6. Đóng tài khoản (`closeAccount`)
- Số dư phải bằng 0 trước khi đóng.
- Trạng thái CLOSED là vĩnh viễn — không thể mở lại.

---

## Cross-module API (AccountApi)

Các module khác (Transaction, Ledger) giao tiếp qua interface `AccountApi`:

| Method              | Mô tả                                               |
|---------------------|-----------------------------------------------------|
| `findAccountById`   | Lấy AccountSummaryDto theo UUID                     |
| `findAccountByNumber` | Lấy AccountSummaryDto theo số tài khoản           |
| `debitAccount`      | Trừ tiền (sử dụng pessimistic lock)                 |
| `creditAccount`     | Cộng tiền (sử dụng pessimistic lock)                |
| `isAccountActive`   | Kiểm tra trạng thái ACTIVE                          |

---

## Concurrency Control

- **Pessimistic Locking** (`SELECT ... FOR UPDATE`) được dùng trong `debitAccount` và `creditAccount`.
- **Optimistic Locking** (`@Version`) trên entity `Account` phát hiện xung đột khi nhiều threads cùng sửa một row.
- Thứ tự lock xác định (deterministic lock ordering) được thực hiện ở **module-transaction** để tránh deadlock.

---

## Quy tắc nghiệp vụ quan trọng

> [!IMPORTANT]
> - Số dư tài khoản KHÔNG bao giờ được âm (checked trong `Account.debit()`).
> - Không dùng `float` hay `double` — chỉ dùng `BigDecimal` với scale 4.
> - Tài khoản FROZEN chặn **cả** debit lẫn credit.
> - Tài khoản CLOSED là vĩnh viễn — không có cơ chế mở lại.

---

## Package Structure

```
module-account/
└── src/main/java/com/banking/core/account/
    ├── api/
    │   ├── controller/AccountController.java
    │   └── dto/
    │       ├── request/OpenAccountRequest.java
    │       ├── request/UpdateAccountStatusRequest.java
    │       └── response/AccountResponse.java
    ├── domain/
    │   ├── entity/Account.java
    │   ├── enums/AccountType.java
    │   ├── enums/AccountStatus.java
    │   ├── exception/AccountException.java
    │   └── repository/AccountRepository.java
    ├── exposed/
    │   ├── AccountApi.java          ← cross-module interface
    │   └── AccountSummaryDto.java   ← cross-module DTO
    └── service/
        ├── AccountService.java
        └── impl/AccountServiceImpl.java
```
