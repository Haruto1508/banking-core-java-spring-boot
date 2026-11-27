# module-notification

## Tổng quan

**module-notification** chịu trách nhiệm gửi thông báo (Email, SMS, In-App) và lưu trữ lịch sử thông báo cho người dùng khi có các sự kiện tài chính quan trọng (nạp tiền, rút tiền, chuyển khoản, cảnh báo bảo mật).

Ở giai đoạn MVP, module cung cấp:
- **Mock Email Provider** (ghi log mô phỏng gửi mail và lưu trạng thái `SENT` vào DB).
- **Kafka Consumer** (`NotificationKafkaConsumer`) lắng nghe sự kiện từ topic `banking.transaction.events`.

---

## API Endpoints

| Method | Endpoint                  | Quyền truy cập         | Chức năng                               |
|--------|---------------------------|------------------------|-----------------------------------------|
| `GET`  | `/api/v1/notifications/me` | Tất cả (authenticated) | Xem danh sách thông báo của bản thân    |

---

## Cross-module API (`NotificationApi`)

| Method                  | Mô tả                                                    |
|-------------------------|----------------------------------------------------------|
| `sendEmailNotification` | Gửi thông báo qua mock email provider và lưu vào database |

---

## Kafka Integration

- Consumer lắng nghe `TransactionEventPayload` dạng JSON trên topic `${banking.kafka.topics.transaction-events:banking.transaction.events}`.
- Mặc định `banking.kafka.enabled=false` ở môi trường local/test để có thể chạy unit/integration test mà không cần Kafka broker đang bật. Khi chạy bằng Docker Compose, đặt `KAFKA_ENABLED=true`.
