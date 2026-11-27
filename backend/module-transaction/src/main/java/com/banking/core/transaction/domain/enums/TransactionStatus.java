package com.banking.core.transaction.domain.enums;

/**
 * Lifecycle state of a financial transaction.
 * <p>
 * PENDING    – initial record created before execution
 * PROCESSING – actively executing debits/credits
 * SUCCESS    – fully committed and recorded in the double-entry ledger
 * FAILED     – rejected due to validation, insufficient balance, or system error
 * REVERSED   – originally succeeded, subsequently offset by a REVERSAL transaction
 */
public enum TransactionStatus {
    PENDING,
    PROCESSING,
    SUCCESS,
    FAILED,
    REVERSED
}
