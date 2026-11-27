package com.banking.core.account.service.impl;

import com.banking.core.account.api.dto.request.OpenAccountRequest;
import com.banking.core.account.api.dto.response.AccountResponse;
import com.banking.core.account.domain.entity.Account;
import com.banking.core.account.domain.enums.AccountStatus;
import com.banking.core.account.domain.enums.AccountType;
import com.banking.core.account.domain.exception.AccountException;
import com.banking.core.account.domain.repository.AccountRepository;
import com.banking.core.account.exposed.AccountApi;
import com.banking.core.account.exposed.AccountSummaryDto;
import com.banking.core.account.service.AccountService;
import com.banking.core.auth.domain.enums.Role;
import com.banking.core.common.exception.ErrorCode;
import com.banking.core.common.exception.InsufficientBalanceException;
import com.banking.core.common.exception.ResourceNotFoundException;
import com.banking.core.customer.exposed.CustomerApi;
import com.banking.core.customer.exposed.CustomerSummaryDto;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.security.SecureRandom;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Implementation of AccountService and the public AccountApi cross-module interface.
 */
@Service
@RequiredArgsConstructor
public class AccountServiceImpl implements AccountService, AccountApi {

    private static final Logger log = LoggerFactory.getLogger(AccountServiceImpl.class);
    private static final SecureRandom RANDOM_GENERATOR = new SecureRandom();
    private static final DateTimeFormatter ACC_DATE_FORMAT = DateTimeFormatter.ofPattern("yyyyMMdd");

    private final AccountRepository accountRepository;
    private final CustomerApi customerApi;

    // =========================================================================
    // AccountService — called by AccountController
    // =========================================================================

    /**
     * Opens a new bank account after verifying that the customer exists and is ACTIVE.
     * Generates a unique account number in the format "ACC-YYYYMMDD-NNNNNN".
     */
    @Override
    @Transactional
    public AccountResponse openAccount(OpenAccountRequest request, UUID requesterUserId, Role requesterRole) {
        UUID customerId = UUID.fromString(request.customerId());

        // Verify customer exists and is ACTIVE
        CustomerSummaryDto customerSummary = customerApi.findCustomerById(customerId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        ErrorCode.CUSTOMER_NOT_FOUND, "Customer not found: " + customerId));

        if (!customerApi.isCustomerActive(customerId)) {
            throw new AccountException(ErrorCode.CUSTOMER_INVALID_STATUS,
                    "Cannot open an account for an inactive customer");
        }

        // IDOR: CUSTOMER role can only open an account for themselves
        verifyAccountOwnershipIfCustomerRole(customerSummary, requesterUserId, requesterRole);

        // SYSTEM account type is reserved for internal use
        if (request.accountType() == AccountType.SYSTEM) {
            throw new AccountException(ErrorCode.INVALID_REQUEST_PAYLOAD,
                    "Account type SYSTEM is reserved and cannot be opened via this endpoint");
        }

        String accountNumber = generateUniqueAccountNumber();
        String normalizedCurrency = request.currency().toUpperCase();

        Account newAccount = Account.builder()
                .customerId(customerId)
                .accountNumber(accountNumber)
                .accountType(request.accountType())
                .currency(normalizedCurrency)
                .balance(BigDecimal.ZERO)
                .status(AccountStatus.ACTIVE)
                .build();

        Account savedAccount = accountRepository.save(newAccount);
        log.info("Opened account id={} number={} for customer={}", savedAccount.getId(), accountNumber, customerId);

        return mapToAccountResponse(savedAccount);
    }

    /**
     * Retrieves account details by ID with CUSTOMER role IDOR check.
     */
    @Override
    @Transactional(readOnly = true)
    public AccountResponse getAccountById(UUID accountId, UUID requesterUserId, Role requesterRole) {
        Account account = findAccountOrThrow(accountId);
        verifyAccountAccessIfCustomerRole(account, requesterUserId, requesterRole);
        return mapToAccountResponse(account);
    }

    /**
     * Lists all accounts for a customer; CUSTOMER role may only view their own.
     */
    @Override
    @Transactional(readOnly = true)
    public List<AccountResponse> getAccountsByCustomer(UUID customerId, UUID requesterUserId, Role requesterRole) {
        if (requesterRole == Role.CUSTOMER) {
            // Resolve the customer linked to the authenticated user
            CustomerSummaryDto ownCustomer = customerApi.findCustomerByUserId(requesterUserId)
                    .orElseThrow(() -> new ResourceNotFoundException(
                            ErrorCode.CUSTOMER_NOT_FOUND, "No customer profile linked to current user"));
            if (!ownCustomer.id().equals(customerId)) {
                throw new AccessDeniedException("Customers can only view their own accounts");
            }
        }

        return accountRepository.findByCustomerId(customerId)
                .stream()
                .filter(a -> a.getAccountType() != AccountType.SYSTEM)
                .map(this::mapToAccountResponse)
                .collect(Collectors.toList());
    }

    /**
     * Returns the balance for an account; delegates to getAccountById for access control.
     */
    @Override
    @Transactional(readOnly = true)
    public AccountResponse getBalance(UUID accountId, UUID requesterUserId, Role requesterRole) {
        return getAccountById(accountId, requesterUserId, requesterRole);
    }

    /**
     * Freezes an ACTIVE account. Only ADMIN/STAFF should call this endpoint.
     */
    @Override
    @Transactional
    public AccountResponse freezeAccount(UUID accountId) {
        Account account = findAccountOrThrow(accountId);
        account.freeze();
        Account updated = accountRepository.save(account);
        log.info("Froze account id={}", accountId);
        return mapToAccountResponse(updated);
    }

    /**
     * Unfreezes a FROZEN account. Only ADMIN/STAFF should call this endpoint.
     */
    @Override
    @Transactional
    public AccountResponse unfreezeAccount(UUID accountId) {
        Account account = findAccountOrThrow(accountId);
        account.unfreeze();
        Account updated = accountRepository.save(account);
        log.info("Unfroze account id={}", accountId);
        return mapToAccountResponse(updated);
    }

    /**
     * Permanently closes an account; balance must be zero before closing.
     */
    @Override
    @Transactional
    public AccountResponse closeAccount(UUID accountId) {
        Account account = findAccountOrThrow(accountId);
        account.close();
        Account updated = accountRepository.save(account);
        log.info("Closed account id={}", accountId);
        return mapToAccountResponse(updated);
    }

    // =========================================================================
    // AccountApi — called by other modules (TransactionService, LedgerService)
    // =========================================================================

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

    // =========================================================================
    // Private helpers
    // =========================================================================

    /**
     * Loads an account by ID or throws ResourceNotFoundException.
     */
    private Account findAccountOrThrow(UUID accountId) {
        return accountRepository.findById(accountId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        ErrorCode.ACCOUNT_NOT_FOUND, "Account not found: " + accountId));
    }

    /**
     * Enforces IDOR check: a CUSTOMER may only open/view accounts they own.
     */
    private void verifyAccountOwnershipIfCustomerRole(
            CustomerSummaryDto customer, UUID requesterUserId, Role requesterRole) {
        if (requesterRole == Role.CUSTOMER) {
            if (customer.userId() == null || !customer.userId().equals(requesterUserId)) {
                throw new AccessDeniedException("Customers can only open accounts for themselves");
            }
        }
    }

    /**
     * Enforces IDOR check: a CUSTOMER may only access their own accounts.
     * Resolves the customer linked to the authenticated user and compares customer IDs.
     */
    private void verifyAccountAccessIfCustomerRole(Account account, UUID requesterUserId, Role requesterRole) {
        if (requesterRole == Role.CUSTOMER) {
            CustomerSummaryDto ownCustomer = customerApi.findCustomerByUserId(requesterUserId)
                    .orElseThrow(() -> new AccessDeniedException("No customer profile linked to current user"));
            if (!ownCustomer.id().equals(account.getCustomerId())) {
                throw new AccessDeniedException("Customers can only access their own accounts");
            }
        }
    }

    /**
     * Validates that the given currency code matches the account's currency.
     * Prevents cross-currency debits/credits.
     */
    private void validateCurrencyMatch(Account account, String requestedCurrency) {
        if (!account.getCurrency().equalsIgnoreCase(requestedCurrency)) {
            throw new AccountException(ErrorCode.CURRENCY_MISMATCH,
                    "Account currency " + account.getCurrency() +
                    " does not match requested currency " + requestedCurrency);
        }
    }

    /**
     * Generates a unique account number in format "ACC-YYYYMMDD-NNNNNN".
     * Retries up to 5 times in the unlikely event of a collision.
     */
    private String generateUniqueAccountNumber() {
        String datePart = LocalDate.now().format(ACC_DATE_FORMAT);
        for (int attempt = 0; attempt < 5; attempt++) {
            int randomSuffix = 100000 + RANDOM_GENERATOR.nextInt(900000);
            String candidate = "ACC-" + datePart + "-" + randomSuffix;
            if (!accountRepository.existsByAccountNumber(candidate)) {
                return candidate;
            }
        }
        throw new AccountException(ErrorCode.INTERNAL_SERVER_ERROR,
                "Could not generate a unique account number after 5 attempts");
    }

    /**
     * Maps an Account entity to the full AccountResponse DTO.
     */
    private AccountResponse mapToAccountResponse(Account account) {
        return new AccountResponse(
                account.getId(),
                account.getCustomerId(),
                account.getAccountNumber(),
                account.getAccountType(),
                account.getCurrency(),
                account.getBalance(),
                account.getStatus(),
                account.getCreatedAt(),
                account.getUpdatedAt()
        );
    }

    /**
     * Maps an Account entity to the cross-module AccountSummaryDto.
     */
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
