-- V7: Seed secondary VND current account for demo_user to enable domestic VietQR & bill payments
INSERT INTO accounts (id, customer_id, account_number, account_type, currency, balance, status, version, created_at, updated_at)
VALUES (
    '30000000-0000-0000-0000-000000000004',
    '20000000-0000-0000-0000-000000000003',
    'ACC-DEMO-VND-001',
    'CURRENT',
    'VND',
    100000000.0000,
    'ACTIVE',
    0,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
)
ON CONFLICT (account_number) DO NOTHING;
