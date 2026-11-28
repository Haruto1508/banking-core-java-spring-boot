-- V6: Seed Teller Desk customer, counter account, and core banking system vaults

-- 1. Seed Customer Profile for Teller Desk
INSERT INTO customers (id, user_id, customer_number, full_name, identity_number, phone_number, email, status, created_at, updated_at)
VALUES (
    '20000000-0000-0000-0000-000000000002',
    '10000000-0000-0000-0000-000000000002',
    'CIF-TELLER-001',
    'Quay Giao Dich & Thu Ngan',
    '001200000002',
    '+84909999888',
    'teller@bankingcore.internal',
    'ACTIVE',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
)
ON CONFLICT (customer_number) DO NOTHING;

-- 2. Seed Primary Counter Desk Account for Teller
INSERT INTO accounts (id, customer_id, account_number, account_type, currency, balance, status, version, created_at, updated_at)
VALUES (
    '30000000-0000-0000-0000-000000000002',
    '20000000-0000-0000-0000-000000000002',
    'ACC-TELLER-001',
    'CURRENT',
    'VND',
    100000000.0000,
    'ACTIVE',
    0,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
)
ON CONFLICT (account_number) DO NOTHING;

-- 3. Seed Core Banking System Vault Accounts
INSERT INTO accounts (id, customer_id, account_number, account_type, currency, balance, status, version, created_at, updated_at)
VALUES
    ('00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000', 'SYS-CASH-VAULT-001', 'SYSTEM', 'VND', 5000000000.0000, 'ACTIVE', 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('00000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000000', 'SYS-FEE-INCOME-001', 'SYSTEM', 'VND', 125000000.0000, 'ACTIVE', 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('00000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000000', 'SYS-INTEREST-EXPENSE-001', 'SYSTEM', 'VND', 85000000.0000, 'ACTIVE', 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('00000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000000', 'SYS-SEPAY-SETTLEMENT-001', 'SYSTEM', 'VND', 250000000.0000, 'ACTIVE', 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (account_number) DO NOTHING;
