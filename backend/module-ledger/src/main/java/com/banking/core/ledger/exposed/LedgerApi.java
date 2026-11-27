package com.banking.core.ledger.exposed;

import java.math.BigDecimal;
import java.util.UUID;

/**
 * Public API interface for the Ledger module.
 * <p>
 * All financial postings to the double-entry ledger must go through this interface.
 * No other module should access LedgerJournalRepository or LedgerEntryRepository directly.
 */
public interface LedgerApi {

    /**
     * Records a double-entry journal for a DEPOSIT transaction.
     * <p>
     * Posting convention:
     *   DEBIT  → System Vault account  (bank receives funds)
     *   CREDIT → Customer account      (customer's balance increases)
     *
     * @param transactionId   UUID of the transaction this journal belongs to
     * @param customerAccountId UUID of the customer's bank account
     * @param vaultAccountId    UUID of the System Vault GL account
     * @param amount            positive deposit amount
     * @param currency          ISO-4217 currency code (must match both accounts)
     */
    void recordDepositJournal(
            UUID transactionId,
            UUID customerAccountId,
            UUID vaultAccountId,
            BigDecimal amount,
            String currency);

    /**
     * Records a double-entry journal for a WITHDRAWAL transaction.
     * <p>
     * Posting convention:
     *   DEBIT  → Customer account      (customer's balance decreases)
     *   CREDIT → System Vault account  (bank pays out funds)
     *
     * @param transactionId   UUID of the transaction this journal belongs to
     * @param customerAccountId UUID of the customer's bank account
     * @param vaultAccountId    UUID of the System Vault GL account
     * @param amount            positive withdrawal amount
     * @param currency          ISO-4217 currency code
     */
    void recordWithdrawalJournal(
            UUID transactionId,
            UUID customerAccountId,
            UUID vaultAccountId,
            BigDecimal amount,
            String currency);

    /**
     * Records a double-entry journal for an internal TRANSFER transaction.
     * <p>
     * Posting convention:
     *   DEBIT  → Source account   (source balance decreases)
     *   CREDIT → Target account   (target balance increases)
     *
     * @param transactionId  UUID of the transaction this journal belongs to
     * @param sourceAccountId UUID of the sending account
     * @param targetAccountId UUID of the receiving account
     * @param amount          positive transfer amount
     * @param currency        ISO-4217 currency code (same currency transfers only)
     */
    void recordTransferJournal(
            UUID transactionId,
            UUID sourceAccountId,
            UUID targetAccountId,
            BigDecimal amount,
            String currency);

    /**
     * Records a reversal journal that offsets all entries of the original journal.
     * <p>
     * Each entry in the original journal is mirrored with its type flipped
     * (DEBIT becomes CREDIT and vice versa), restoring account balances
     * to their pre-transaction state.
     *
     * @param originalJournalId UUID of the journal to reverse
     * @param reversalTransactionId UUID of the new reversal transaction
     */
    void recordReversalJournal(UUID originalJournalId, UUID reversalTransactionId);

    /**
     * Records a reversal journal by looking up the original journal associated with the given transaction.
     *
     * @param originalTransactionId UUID of the original transaction to reverse
     * @param reversalTransactionId UUID of the new reversal transaction
     */
    void recordReversalJournalByTransactionId(UUID originalTransactionId, UUID reversalTransactionId);

    /**
     * Calculates the net balance of an account from ledger entries.
     * <p>
     * Net balance = SUM(CREDIT amounts) - SUM(DEBIT amounts).
     * Used for reconciliation: comparing this value against the stored account balance.
     *
     * @param accountId account UUID
     * @return computed balance from the full ledger history for this account
     */
    BigDecimal calculateLedgerBalance(UUID accountId);
}
