package com.banking.core.payment.domain.enums;

/**
 * Lifecycle status of a payment request.
 * <p>
 * PENDING   – payment created, awaiting execution
 * COMPLETED – underlying transfer succeeded
 * FAILED    – payment execution aborted (e.g. insufficient balance)
 * REFUNDED  – payment reversed back to the source account
 */
public enum PaymentStatus {
    PENDING,
    COMPLETED,
    FAILED,
    REFUNDED
}
