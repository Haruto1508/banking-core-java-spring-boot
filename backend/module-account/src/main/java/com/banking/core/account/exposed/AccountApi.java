package com.banking.core.account.exposed;

import java.math.BigDecimal;
import java.util.Optional;
import java.util.UUID;

/**
 * Public API interface for the Account module.
 * <p>
 * Other modules (Transaction, Ledger) MUST use only this interface.
 * They must NOT access AccountRepository or Account entity directly.
 */
public interface AccountApi {

    /**
     * Returns a compact account summary by account ID.
     *
     * @param accountId account UUID
     * @return optional summary DTO
     */
    Optional<AccountSummaryDto> findAccountById(UUID accountId);

    /**
     * Returns a compact account summary by account number.
     *
     * @param accountNumber human-readable account number
     * @return optional summary DTO
     */
    Optional<AccountSummaryDto> findAccountByNumber(String accountNumber);

    /**
     * Applies a debit to the specified account inside the caller's existing transaction.
     * <p>
     * This method acquires a pessimistic write lock on the account row.
     * The caller's @Transactional boundary controls commit/rollback.
     *
     * @param accountId account UUID to debit
     * @param amount    positive amount to subtract from the balance
     * @param currency  ISO-4217 code; must match the account's currency
     * @throws com.banking.core.common.exception.InsufficientBalanceException if balance is insufficient
     * @throws com.banking.core.account.domain.exception.AccountException      if account is frozen or closed
     */
    void debitAccount(UUID accountId, BigDecimal amount, String currency);

    /**
     * Applies a credit to the specified account inside the caller's existing transaction.
     * <p>
     * This method acquires a pessimistic write lock on the account row.
     *
     * @param accountId account UUID to credit
     * @param amount    positive amount to add to the balance
     * @param currency  ISO-4217 code; must match the account's currency
     * @throws com.banking.core.account.domain.exception.AccountException if account is frozen or closed
     */
    void creditAccount(UUID accountId, BigDecimal amount, String currency);

    /**
     * Acquires pessimistic write locks on two accounts in deterministic UUID order
     * (smaller UUID first) to prevent database deadlocks during concurrent transfers.
     * Must be called within an active {@code @Transactional} boundary.
     *
     * @param accountIdA first account UUID
     * @param accountIdB second account UUID
     */
    void lockAccountsInOrder(UUID accountIdA, UUID accountIdB);

    /**
     * Checks whether the given account exists and is ACTIVE.
     *
     * @param accountId account UUID
     * @return true if account exists and status is ACTIVE
     */
    boolean isAccountActive(UUID accountId);
}
