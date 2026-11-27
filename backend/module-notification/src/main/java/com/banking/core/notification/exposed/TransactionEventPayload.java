package com.banking.core.notification.exposed;

import java.math.BigDecimal;
import java.util.UUID;

/**
 * Event payload published to Kafka when a financial transaction is committed.
 *
 * @param transactionId   committed transaction UUID
 * @param transactionRef  human-readable reference
 * @param recipientUserId user UUID to notify
 * @param recipientEmail  email address to notify
 * @param eventType       e.g. "TRANSFER_COMPLETED", "DEPOSIT_COMPLETED"
 * @param amount          transaction amount
 * @param currency        ISO-4217 currency code
 */
public record TransactionEventPayload(
        UUID transactionId,
        String transactionRef,
        UUID recipientUserId,
        String recipientEmail,
        String eventType,
        BigDecimal amount,
        String currency
) {}
