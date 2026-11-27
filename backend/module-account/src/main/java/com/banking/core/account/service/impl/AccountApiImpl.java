package com.banking.core.account.service.impl;

import com.banking.core.account.domain.entity.Account;
import com.banking.core.account.domain.exception.AccountException;
import com.banking.core.account.domain.repository.AccountRepository;
import com.banking.core.account.exposed.AccountApi;
import com.banking.core.account.exposed.AccountSummaryDto;
import com.banking.core.common.exception.ErrorCode;
import com.banking.core.common.exception.InsufficientBalanceException;
import com.banking.core.common.exception.ResourceNotFoundException;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.Optional;
import java.util.UUID;

/**
 * Dedicated cross-module facade implementing {@link AccountApi}.
 * Provides trusted internal account lookups, pessimistic locking, and balance mutations
 * for module-transaction and module-payment.
 */
@Service
@RequiredArgsConstructor
public class AccountApiImpl implements AccountApi {

    private static final Logger log = LoggerFactory.getLogger(AccountApiImpl.class);

    private final AccountRepository accountRepository;

    /**
     * Cross-module: looks up an account summary by UUID without access restrictions.
     */
    @Override
    @Transactional(readOnly = true)
    public Optional<AccountSummaryDto> findAccountById(UUID accountId) {
        return accountRepository.findById(accountId).map(this::mapToAccountSummary);
    }

    /**
     * Cross-module: looks up an account summary by account number.
     */
    @Override
    @Transactional(readOnly = true)
    public Optional<AccountSummaryDto> findAccountByNumber(String accountNumber) {
        return accountRepository.findByAccountNumber(accountNumber).map(this::mapToAccountSummary);
    }

    /**
     * Cross-module: applies a debit to the account using a pessimistic write lock.
     * Must be called within an existing @Transactional boundary.
     *
     * @throws AccountException             if account is not found, frozen, or closed
     * @throws InsufficientBalanceException if balance is too low
     */
    @Override
    @Transactional
    public void debitAccount(UUID accountId, BigDecimal amount, String currency) {
        Account account = accountRepository.findByIdWithPessimisticLock(accountId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        ErrorCode.ACCOUNT_NOT_FOUND, "Account not found for debit: " + accountId));

        validateCurrencyMatch(account, currency);
        account.debit(amount);
        accountRepository.save(account);
        log.debug("Debited account id={} amount={} {}", accountId, amount, currency);
    }

    /**
     * Cross-module: applies a credit to the account using a pessimistic write lock.
     * Must be called within an existing @Transactional boundary.
     *
     * @throws AccountException if account is not found, frozen, or closed
     */
    @Override
    @Transactional
    public void creditAccount(UUID accountId, BigDecimal amount, String currency) {
        Account account = accountRepository.findByIdWithPessimisticLock(accountId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        ErrorCode.ACCOUNT_NOT_FOUND, "Account not found for credit: " + accountId));

        validateCurrencyMatch(account, currency);
        account.credit(amount);
        accountRepository.save(account);
        log.debug("Credited account id={} amount={} {}", accountId, amount, currency);
    }

    /**
     * Cross-module: acquires pessimistic write locks on two accounts in deterministic
     * UUID order to prevent deadlocks when concurrent transfers happen in opposite directions.
     */
    @Override
    @Transactional
    public void lockAccountsInOrder(UUID accountIdA, UUID accountIdB) {
        UUID firstId = accountIdA.compareTo(accountIdB) <= 0 ? accountIdA : accountIdB;
        UUID secondId = accountIdA.compareTo(accountIdB) <= 0 ? accountIdB : accountIdA;

        accountRepository.findByIdWithPessimisticLock(firstId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        ErrorCode.ACCOUNT_NOT_FOUND, "Account not found: " + firstId));

        if (!firstId.equals(secondId)) {
            accountRepository.findByIdWithPessimisticLock(secondId)
                    .orElseThrow(() -> new ResourceNotFoundException(
                            ErrorCode.ACCOUNT_NOT_FOUND, "Account not found: " + secondId));
        }
    }

    /**
     * Cross-module: checks whether an account is active.
     */
    @Override
    @Transactional(readOnly = true)
    public boolean isAccountActive(UUID accountId) {
        return accountRepository.findById(accountId)
                .map(Account::isActive)
                .orElse(false);
    }

    private void validateCurrencyMatch(Account account, String requestedCurrency) {
        if (!account.getCurrency().equalsIgnoreCase(requestedCurrency)) {
            throw new AccountException(ErrorCode.CURRENCY_MISMATCH,
                    "Account currency " + account.getCurrency() +
                    " does not match requested currency " + requestedCurrency);
        }
    }

    private AccountSummaryDto mapToAccountSummary(Account account) {
        return new AccountSummaryDto(
                account.getId(),
                account.getAccountNumber(),
                account.getCustomerId(),
                account.getAccountType(),
                account.getCurrency(),
                account.getBalance(),
                account.getStatus()
        );
    }
}
