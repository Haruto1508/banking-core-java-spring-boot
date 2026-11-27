package com.banking.core.transaction.domain.enums;

/**
 * Processing state of an Idempotency-Key record.
 * <p>
 * IN_PROGRESS – a request with this key is currently executing; concurrent duplicates receive 409 Conflict
 * COMPLETED   – finished; subsequent retries return the cached response without re-executing
 * FAILED      – execution failed with a non-retryable error; subsequent retries may be handled accordingly
 */
public enum IdempotencyStatus {
    IN_PROGRESS,
    COMPLETED,
    FAILED
}
