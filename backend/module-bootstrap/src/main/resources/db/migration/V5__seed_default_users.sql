-- Seed initial users for testing and administration
-- Password for all seeded accounts is: Banking@123
-- BCrypt hash with 10 rounds: $2a$10$wBskv2QJm3O64u2uV7g69ekX03g7Rvyy6bI0XgZt1Nq1o/eYgQoG6

INSERT INTO users (id, username, email, password_hash, role, status, failed_login_attempts, created_at, updated_at)
VALUES 
    ('10000000-0000-0000-0000-000000000001', 'admin', 'admin@bankingcore.internal', '$2a$10$wBskv2QJm3O64u2uV7g69ekX03g7Rvyy6bI0XgZt1Nq1o/eYgQoG6', 'ADMIN', 'ACTIVE', 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('10000000-0000-0000-0000-000000000002', 'teller', 'teller@bankingcore.internal', '$2a$10$wBskv2QJm3O64u2uV7g69ekX03g7Rvyy6bI0XgZt1Nq1o/eYgQoG6', 'STAFF', 'ACTIVE', 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('10000000-0000-0000-0000-000000000003', 'demo_user', 'demouser@bankingcore.internal', '$2a$10$wBskv2QJm3O64u2uV7g69ekX03g7Rvyy6bI0XgZt1Nq1o/eYgQoG6', 'CUSTOMER', 'ACTIVE', 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (username) DO NOTHING;

-- Seed customer profile for demo_user
INSERT INTO customers (id, user_id, customer_number, full_name, identity_number, phone_number, email, status, created_at, updated_at)
VALUES 
    ('20000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000003', 'CIF-DEMO-001', 'Nguyen Van A', '001200000001', '+84901234567', 'demouser@bankingcore.internal', 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (customer_number) DO NOTHING;

-- Seed bank account for demo_user with 50,000.0000 USD initial balance
INSERT INTO accounts (id, customer_id, account_number, account_type, currency, balance, status, version, created_at, updated_at)
VALUES 
    ('30000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000003', 'ACC-DEMO-001', 'CURRENT', 'USD', 50000.0000, 'ACTIVE', 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (account_number) DO NOTHING;
