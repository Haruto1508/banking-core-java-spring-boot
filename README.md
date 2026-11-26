# Core Banking System

> A high-reliability Core Banking System simulation built with **Java 21**, **Spring Boot 3**, **PostgreSQL**, **Redis**, and **Apache Kafka**, following **Modular Monolith** and **Domain-Driven Design (DDD)** principles.

---

## 🏛️ Architecture Overview

The backend is engineered as a **Modular Monolith** to guarantee **ACID transaction guarantees** and **Double-Entry Bookkeeping (Sổ cái kế toán kép)** on a single PostgreSQL engine while strictly decoupling modules via public APIs:

```
BankingCore/
├── backend/
│   ├── module-common/        # Base DTOs, ErrorCodes, Domain Exceptions, Money Precision rules
│   ├── module-auth/          # Spring Security 6, JWT, Refresh Token Rotation, Account Locking, RBAC
│   ├── module-customer/      # Customer lifecycle & KYC
│   ├── module-account/       # Savings & Current accounts, balance management
│   ├── module-transaction/   # Transfer, Deposit, Withdrawal, Pessimistic Locking & Idempotency
│   ├── module-ledger/        # Double-entry Bookkeeping engine (Debit = Credit invariant)
│   ├── module-payment/       # Payment requests & Refunds
│   ├── module-notification/  # Kafka event consumer & notification history
│   ├── module-audit/         # Structured audit trail
│   └── module-bootstrap/     # Main Application, Flyway migrations, Actuator & OpenAPI
│
├── frontend/                 # (Upcoming frontend web app)
├── docker-compose.yml        # PostgreSQL 16, Redis 7, Kafka (KRaft mode)
└── README.md
```

---

## 🛠️ Technology Stack

- **Language:** Java 21 LTS
- **Framework:** Spring Boot 3.3.5
- **Security:** Spring Security 6, Stateless JWT (JJWT 0.12.6), BCrypt (factor 12)
- **Database:** PostgreSQL 16, Flyway Database Migration
- **Caching & Messaging:** Redis 7, Apache Kafka (KRaft mode)
- **Testing:** JUnit 5, Mockito, Testcontainers, MockMvc
- **Build Tool:** Gradle 8.10.2 (Multi-module)

---

## 🚀 Getting Started

### 1. Prerequisites
- Java 21+
- Docker & Docker Compose

### 2. Start Infrastructure Services
```bash
docker compose up -d
```
This starts:
- **PostgreSQL 16** on port `5432` (`core_banking`)
- **Redis 7** on port `6379`
- **Apache Kafka** on port `9092`

### 3. Build & Run Tests
```bash
cd backend
./gradlew test
```

### 4. Run the Application
```bash
cd backend
./gradlew :module-bootstrap:bootRun
```

### 5. API Documentation (Swagger)
- **Swagger UI:** `http://localhost:8080/swagger-ui.html`
- **OpenAPI JSON:** `http://localhost:8080/v3/api-docs`
- **Health Check:** `http://localhost:8080/api/v1/health`

---

## 📋 Current Progress

- [x] **Phase 1:** Requirements Analysis & Business Rules Specification
- [x] **Phase 2:** System Architecture, ERD & Sequence Design
- [x] **Phase 3:** Gradle Multi-Module, Docker Compose, Flyway, Baseline Setup
- [x] **Phase 4 - Auth:** Module Authentication & RBAC (JWT, Refresh Token Rotation, Locking)
- [ ] **Phase 4 - Customer:** Customer Management & KYC
- [ ] **Phase 4 - Account:** Account Management & Balance tracking
- [ ] **Phase 4 - Ledger:** Double-Entry Bookkeeping Engine
- [ ] **Phase 4 - Transaction:** Financial Transfers with Concurrency Control
