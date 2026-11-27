package com.banking.core.transaction.exposed;

import com.banking.core.transaction.domain.enums.TransactionStatus;
import com.banking.core.transaction.domain.enums.TransactionType;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

/**
 * Compact cross-module DTO representing a financial transaction.
 * Used by module-payment and other modules without exposing internal entities.
 *
 * @param id              transaction UUID
 * @param transactionRef  unique reference string
 * @param sourceAccountId debited account UUID
 * @param targetAccountId credited account UUID
 * @param transactionType DEPOSIT / WITHDRAWAL / TRANSFER / REVERSAL
 * @param amount          transaction amount
 * @param currency        ISO-4217 currency code
 * @param status          transaction lifecycle status
 * @param createdAt       creation timestamp
 */
public record TransactionSummaryDto(
        UUID id,
        String transactionRef,
        UUID sourceAccountId,
        UUID targetAccountId,
        TransactionType transactionType,
        BigDecimal amount,
        String currency,
        TransactionStatus status,
        Instant createdAt
) {}
