# Core Banking Edge API Gateway (`gateway/`)

## Tổng quan

**gateway** là **Edge Microservice** sử dụng **Spring Cloud Gateway (WebFlux)**, đóng vai trò cổng giao tiếp duy nhất cho Frontend Web App và Mobile Clients trước khi đi vào **Core Banking Modular Monolith (`backend/`)**.

---

## Vai trò trong kiến trúc Hybrid

- **Single Entry Point (Cổng duy nhất):** Định tuyến toàn bộ `/api/v1/**` về Core Banking (`CORE_BANKING_URL`, mặc định `http://localhost:8080`).
- **Centralized CORS:** Cấu hình CORS tập trung cho Frontend (`http://localhost:5173`, `http://localhost:3000`).
- **Distributed Tracing:** `CorrelationIdFilter` tự động sinh hoặc truyền tiếp header `X-Correlation-Id` xuyên suốt từ Gateway xuống Core Banking và trả về client, kèm log latency (ms).
- **Gateway Health:** `GET /gateway/health` trả về trạng thái sống của Gateway.

---

## Chạy Gateway

```bash
cd gateway
cp .env.example .env
./gradlew bootRun
```

Mặc định Gateway lắng nghe tại cổng **`8081`** và chuyển tiếp sang Core Banking tại **`8080`**.
