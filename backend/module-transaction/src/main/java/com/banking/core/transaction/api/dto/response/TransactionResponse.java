package com.banking.core.transaction.api.dto.response;

import com.banking.core.transaction.domain.enums.TransactionStatus;
import com.banking.core.transaction.domain.enums.TransactionType;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

/**
 * Response DTO returned for transaction operations and queries.
 *
 * @param id              transaction UUID
 * @param transactionRef  human-readable unique reference (e.g. TXN-...)
 * @param idempotencyKey  client-provided idempotency key (nullable)
 * @param sourceAccountId debited account UUID (null for DEPOSIT)
 * @param targetAccountId credited account UUID (null for WITHDRAWAL)
 * @param transactionType DEPOSIT / WITHDRAWAL / TRANSFER / REVERSAL
 * @param amount          transaction amount
 * @param currency        ISO-4217 currency code
 * @param status          PENDING / PROCESSING / SUCCESS / FAILED / REVERSED
 * @param failureReason   error description if status is FAILED
 * @param description     optional transaction memo
 * @param createdAt       creation timestamp
 * @param updatedAt       last update timestamp
 */
public record TransactionResponse(
        UUID id,
        String transactionRef,
        String idempotencyKey,
        UUID sourceAccountId,
        UUID targetAccountId,
        TransactionType transactionType,
        BigDecimal amount,
        String currency,
        TransactionStatus status,
        String failureReason,
        String description,
        Instant createdAt,
        Instant updatedAt
) {}
