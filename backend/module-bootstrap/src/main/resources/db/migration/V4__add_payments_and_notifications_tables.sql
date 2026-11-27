-- =============================================================================
-- V4: Add payments (module-payment) and notifications (module-notification)
-- =============================================================================

-- 1. Payments Table
CREATE TABLE payments (
    id UUID PRIMARY KEY,
    payment_ref VARCHAR(64) NOT NULL UNIQUE,
    idempotency_key VARCHAR(128) NULL UNIQUE,
    source_account_id UUID NOT NULL,
    merchant_account_id UUID NOT NULL,
    transaction_id UUID NULL,
    amount NUMERIC(19, 4) NOT NULL,
    currency VARCHAR(3) NOT NULL,
    payment_method VARCHAR(30) NOT NULL,
    status VARCHAR(30) NOT NULL,
    failure_reason VARCHAR(255) NULL,
    description VARCHAR(255) NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_payments_amount_positive CHECK (amount > 0),
    CONSTRAINT chk_payments_diff_accounts CHECK (source_account_id <> merchant_account_id),
    CONSTRAINT chk_payments_status CHECK (status IN ('PENDING', 'COMPLETED', 'FAILED', 'REFUNDED'))
);

CREATE INDEX idx_payments_source_account ON payments(source_account_id);
CREATE INDEX idx_payments_merchant_account ON payments(merchant_account_id);
CREATE INDEX idx_payments_status ON payments(status);

-- 2. Notifications Table
CREATE TABLE notifications (
    id UUID PRIMARY KEY,
    recipient_user_id UUID NULL,
    recipient_email VARCHAR(150) NOT NULL,
    channel VARCHAR(20) NOT NULL,
    event_type VARCHAR(50) NOT NULL,
    subject VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    status VARCHAR(20) NOT NULL,
    reference_id VARCHAR(100) NULL,
    sent_at TIMESTAMP WITH TIME ZONE NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_notifications_channel CHECK (channel IN ('EMAIL', 'SMS', 'IN_APP')),
    CONSTRAINT chk_notifications_status CHECK (status IN ('PENDING', 'SENT', 'FAILED'))
);

CREATE INDEX idx_notifications_recipient ON notifications(recipient_user_id);
CREATE INDEX idx_notifications_status ON notifications(status);
CREATE INDEX idx_notifications_created_at ON notifications(created_at);
