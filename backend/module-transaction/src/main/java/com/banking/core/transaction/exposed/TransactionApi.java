package com.banking.core.transaction.exposed;

import java.math.BigDecimal;
import java.util.Optional;
import java.util.UUID;

/**
 * Public cross-module API for the Transaction module.
 * <p>
 * Used by module-payment to execute financial transfers and reversals
 * without accessing TransactionRepository directly.
 */
public interface TransactionApi {

    /**
     * Looks up a transaction summary by its UUID.
     *
     * @param transactionId transaction UUID
     * @return optional transaction summary
     */
    Optional<TransactionSummaryDto> findTransactionById(UUID transactionId);

    /**
     * Executes an internal transfer between two accounts on behalf of another module (e.g. Payment).
     *
     * @param sourceAccountId debited account UUID
     * @param targetAccountId credited account UUID
     * @param amount          transfer amount
     * @param currency        ISO-4217 currency code
     * @param description     memo for transaction and ledger
     * @param idempotencyKey  unique idempotency key (optional)
     * @return committed transaction summary
     */
    TransactionSummaryDto executeInternalTransfer(
            UUID sourceAccountId,
            UUID targetAccountId,
            BigDecimal amount,
            String currency,
            String description,
            String idempotencyKey);

    /**
     * Reverses a committed transaction and posts offsetting ledger entries.
     *
     * @param originalTransactionId UUID of the transaction to reverse
     * @param reason                audit reason for reversal
     * @return summary of the newly created reversal transaction
     */
    TransactionSummaryDto reverseTransaction(UUID originalTransactionId, String reason);
}
