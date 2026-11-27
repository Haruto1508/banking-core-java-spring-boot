# NovaBank Core — Digital Banking Frontend (`frontend/`)

## Tổng quan

Giao diện Web & Mobile-responsive được xây dựng bằng **React 19 + TypeScript + Vite + Tailwind CSS v4**, kết nối trực tiếp tới **Edge API Gateway (`http://localhost:8081/api/v1`)**.

## Tính năng chính

- **Responsive Design (Web + Mobile App Feel):** Sidebar trên desktop (`md+`) và Bottom Navigation Bar cố định trên màn hình điện thoại (`< md`).
- **Xác thực & Bảo mật:** Đăng ký, Đăng nhập JWT, tự động xoay vòng Refresh Token (`POST /api/v1/auth/refresh`) khi Access Token hết hạn.
- **Dashboard Tổng quan:** Thẻ tổng số dư (ẩn/hiện số dư), các thao tác nhanh, danh sách tài khoản kèm nút sao chép Account UUID, biến động thông báo.
- **Chuyển tiền nội bộ & Thanh toán QR/Hóa đơn:** Tự động gắn `Idempotency-Key` chống giao dịch trùng, hiển thị biên lai giao dịch.
- **Quản lý Tài khoản & Sao kê:** Mở tài khoản `CURRENT`/`SAVINGS` (`VND`/`USD`), xem lịch sử giao dịch theo tài khoản.
- **Quầy Teller & Admin:** Nạp/rút tiền mặt tại quầy, phong tỏa/mở khóa tài khoản, và đối soát sổ cái kép (`GET /api/v1/reconciliation/accounts/{id}`).

## Chạy ở môi trường Dev

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```
Mặc định chạy tại `http://localhost:5173`.
