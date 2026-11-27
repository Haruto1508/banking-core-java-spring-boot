package com.banking.core.payment.api.dto.response;

import com.banking.core.payment.domain.enums.PaymentMethod;
import com.banking.core.payment.domain.enums.PaymentStatus;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

/**
 * Response DTO returned for payment operations and queries.
 *
 * @param id                payment UUID
 * @param paymentRef        unique payment reference (e.g. PAY-...)
 * @param idempotencyKey    client-supplied idempotency key (nullable)
 * @param sourceAccountId   payer's account UUID
 * @param merchantAccountId merchant's account UUID
 * @param transactionId     underlying financial transaction UUID (nullable if FAILED)
 * @param amount            payment amount
 * @param currency          ISO-4217 currency code
 * @param paymentMethod     payment channel
 * @param status            PENDING / COMPLETED / FAILED / REFUNDED
 * @param description       optional payment description
 * @param createdAt         creation timestamp
 * @param updatedAt         last update timestamp
 */
public record PaymentResponse(
        UUID id,
        String paymentRef,
        String idempotencyKey,
        UUID sourceAccountId,
        UUID merchantAccountId,
        UUID transactionId,
        BigDecimal amount,
        String currency,
        PaymentMethod paymentMethod,
        PaymentStatus status,
        String description,
        Instant createdAt,
        Instant updatedAt
) {}
