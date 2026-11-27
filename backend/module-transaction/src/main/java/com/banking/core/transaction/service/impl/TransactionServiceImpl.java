package com.banking.core.transaction.service.impl;

import com.banking.core.account.exposed.AccountApi;
import com.banking.core.account.exposed.AccountSummaryDto;
import com.banking.core.auth.domain.enums.Role;
import com.banking.core.common.constant.BankingConstants;
import com.banking.core.common.dto.PageResponse;
import com.banking.core.common.exception.ErrorCode;
import com.banking.core.common.exception.ResourceNotFoundException;
import com.banking.core.customer.exposed.CustomerApi;
import com.banking.core.customer.exposed.CustomerSummaryDto;
import com.banking.core.ledger.exposed.LedgerApi;
import com.banking.core.transaction.api.dto.request.DepositRequest;
import com.banking.core.transaction.api.dto.request.ReverseTransactionRequest;
import com.banking.core.transaction.api.dto.request.TransferRequest;
import com.banking.core.transaction.api.dto.request.WithdrawalRequest;
import com.banking.core.transaction.api.dto.response.TransactionResponse;
import com.banking.core.transaction.domain.entity.Transaction;
import com.banking.core.transaction.domain.enums.TransactionStatus;
import com.banking.core.transaction.domain.enums.TransactionType;
import com.banking.core.transaction.domain.exception.TransactionException;
import com.banking.core.transaction.domain.repository.TransactionRepository;
import com.banking.core.transaction.exposed.TransactionApi;
import com.banking.core.transaction.exposed.TransactionSummaryDto;
import com.banking.core.transaction.service.IdempotencyService;
import com.banking.core.transaction.service.TransactionService;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;

import java.math.BigDecimal;
import java.security.SecureRandom;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.Optional;
import java.util.UUID;

/**
 * Core transaction processing engine implementing TransactionService and TransactionApi.
 * <p>
 * Guarantees ACID properties, deadlock-free pessimistic locking, idempotency,
 * and synchronized double-entry ledger postings.
 */
@Service
@RequiredArgsConstructor
public class TransactionServiceImpl implements TransactionService, TransactionApi {

    private static final Logger log = LoggerFactory.getLogger(TransactionServiceImpl.class);
    private static final SecureRandom RANDOM_GENERATOR = new SecureRandom();
    private static final DateTimeFormatter TXN_DATE_FORMAT = DateTimeFormatter.ofPattern("yyyyMMdd");

    private final TransactionRepository transactionRepository;
    private final AccountApi accountApi;
    private final CustomerApi customerApi;
    private final LedgerApi ledgerApi;
    private final IdempotencyService idempotencyService;
    private final TransactionTemplate transactionTemplate;

    // =========================================================================
    // TransactionService — called by TransactionController
    // =========================================================================

    /**
     * Executes a teller cash deposit into a customer account.
     * Credits the customer account and records a balanced DEPOSIT journal against the System Vault.
     */
    @Override
    @Transactional
    public TransactionResponse deposit(DepositRequest request, UUID staffUserId) {
        BigDecimal normalizedAmount = normalizeAndValidateAmount(request.amount());
        String normalizedCurrency = request.currency().toUpperCase();

        AccountSummaryDto vaultAccount = resolveSystemVaultAccount();

        // Credit the customer account (acquires pessimistic write lock & validates status/currency)
        accountApi.creditAccount(request.accountId(), normalizedAmount, normalizedCurrency);

        Transaction transaction = Transaction.builder()
                .transactionRef(generateUniqueTransactionRef())
                .targetAccountId(request.accountId())
                .transactionType(TransactionType.DEPOSIT)
                .amount(normalizedAmount)
                .currency(normalizedCurrency)
                .status(TransactionStatus.SUCCESS)
                .description(request.description())
                .build();

        Transaction savedTxn = transactionRepository.save(transaction);

        // Post balanced double-entry journal: DEBIT vault, CREDIT customer
        ledgerApi.recordDepositJournal(
                savedTxn.getId(),
                request.accountId(),
                vaultAccount.id(),
                normalizedAmount,
                normalizedCurrency);

        log.info("DEPOSIT committed ref={} account={} amount={} {} staff={}",
                savedTxn.getTransactionRef(), request.accountId(), normalizedAmount, normalizedCurrency, staffUserId);

        return mapToResponse(savedTxn);
    }

    /**
     * Executes a teller cash withdrawal from a customer account.
     * Debits the customer account and records a balanced WITHDRAWAL journal against the System Vault.
     */
    @Override
    @Transactional
    public TransactionResponse withdraw(WithdrawalRequest request, UUID staffUserId) {
        BigDecimal normalizedAmount = normalizeAndValidateAmount(request.amount());
        String normalizedCurrency = request.currency().toUpperCase();

        AccountSummaryDto vaultAccount = resolveSystemVaultAccount();

        // Debit the customer account (acquires pessimistic write lock & validates balance/status/currency)
        accountApi.debitAccount(request.accountId(), normalizedAmount, normalizedCurrency);

        Transaction transaction = Transaction.builder()
                .transactionRef(generateUniqueTransactionRef())
                .sourceAccountId(request.accountId())
                .transactionType(TransactionType.WITHDRAWAL)
                .amount(normalizedAmount)
                .currency(normalizedCurrency)
                .status(TransactionStatus.SUCCESS)
                .description(request.description())
                .build();

        Transaction savedTxn = transactionRepository.save(transaction);

        // Post balanced double-entry journal: DEBIT customer, CREDIT vault
        ledgerApi.recordWithdrawalJournal(
                savedTxn.getId(),
                request.accountId(),
                vaultAccount.id(),
                normalizedAmount,
                normalizedCurrency);

        log.info("WITHDRAWAL committed ref={} account={} amount={} {} staff={}",
                savedTxn.getTransactionRef(), request.accountId(), normalizedAmount, normalizedCurrency, staffUserId);

        return mapToResponse(savedTxn);
    }

    /**
     * Executes an internal fund transfer between two accounts with idempotency support
     * and deterministic lock ordering to prevent deadlocks.
     * <p>
     * Intentionally NOT annotated with @Transactional at this outer level so that
     * IdempotencyService (REQUIRES_NEW) and the core transfer transaction never hold
     * two JDBC connections simultaneously, preventing HikariCP pool starvation under concurrency.
     */
    @Override
    public TransactionResponse transfer(
            TransferRequest request,
            String idempotencyKey,
            UUID requesterUserId,
            Role requesterRole) {

        // 1. Check Idempotency-Key (acquires and releases its own short DB connection)
        Optional<TransactionResponse> cachedResponse = idempotencyService.acquireOrReturnCached(
                idempotencyKey, "/api/v1/transactions/transfer", request);
        if (cachedResponse.isPresent()) {
            return cachedResponse.get();
        }

        try {
            // 2. Execute debit, credit, and ledger posting inside a single atomic DB transaction
            TransactionResponse response = transactionTemplate.execute(status -> executeTransferCore(
                    request.sourceAccountId(),
                    request.targetAccountId(),
                    request.amount(),
                    request.currency(),
                    request.description(),
                    idempotencyKey,
                    requesterUserId,
                    requesterRole));

            // 3. Cache completed idempotent response
            idempotencyService.markCompleted(idempotencyKey, response, 201);
            return response;
        } catch (RuntimeException ex) {
            idempotencyService.markFailed(idempotencyKey, 422);
            throw ex;
        }
    }

    /**
     * Reverses a committed SUCCESS transaction by flipping account movements
     * and posting an offsetting reversal journal in the ledger.
     */
    @Override
    @Transactional
    public TransactionResponse reverse(UUID transactionId, ReverseTransactionRequest request, UUID adminUserId) {
        Transaction original = transactionRepository.findById(transactionId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        ErrorCode.RESOURCE_NOT_FOUND, "Transaction not found: " + transactionId));

        if (original.getTransactionType() == TransactionType.REVERSAL) {
            throw new TransactionException(ErrorCode.INVALID_REQUEST_PAYLOAD,
                    "Cannot reverse a reversal transaction");
        }

        // Transitions original status from SUCCESS -> REVERSED (throws if already reversed or failed)
        original.markReversed();
        transactionRepository.save(original);

        BigDecimal amount = original.getAmount();
        String currency = original.getCurrency();

        // Reverse account balance movements based on original transaction type
        switch (original.getTransactionType()) {
            case TRANSFER -> {
                accountApi.lockAccountsInOrder(original.getTargetAccountId(), original.getSourceAccountId());
                accountApi.debitAccount(original.getTargetAccountId(), amount, currency);
                accountApi.creditAccount(original.getSourceAccountId(), amount, currency);
            }
            case DEPOSIT -> accountApi.debitAccount(original.getTargetAccountId(), amount, currency);
            case WITHDRAWAL -> accountApi.creditAccount(original.getSourceAccountId(), amount, currency);
            default -> throw new TransactionException(ErrorCode.INVALID_REQUEST_PAYLOAD,
                    "Unsupported transaction type for reversal: " + original.getTransactionType());
        }

        Transaction reversalTxn = Transaction.builder()
                .transactionRef(generateUniqueTransactionRef())
                .sourceAccountId(original.getTargetAccountId())
                .targetAccountId(original.getSourceAccountId())
                .transactionType(TransactionType.REVERSAL)
                .amount(amount)
                .currency(currency)
                .status(TransactionStatus.SUCCESS)
                .description("Reversal of " + original.getTransactionRef() + ": " + request.reason())
                .build();

        Transaction savedReversal = transactionRepository.save(reversalTxn);

        // Post offsetting double-entry reversal journal
        ledgerApi.recordReversalJournalByTransactionId(original.getId(), savedReversal.getId());

        log.info("REVERSAL committed ref={} originalRef={} admin={}",
                savedReversal.getTransactionRef(), original.getTransactionRef(), adminUserId);

        return mapToResponse(savedReversal);
    }

    /**
     * Fetches a single transaction by UUID with IDOR check for CUSTOMER role.
     */
    @Override
    @Transactional(readOnly = true)
    public TransactionResponse getTransactionById(UUID transactionId, UUID requesterUserId, Role requesterRole) {
        Transaction transaction = transactionRepository.findById(transactionId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        ErrorCode.RESOURCE_NOT_FOUND, "Transaction not found: " + transactionId));

        if (requesterRole == Role.CUSTOMER) {
            verifyTransactionAccessForCustomer(transaction, requesterUserId);
        }

        return mapToResponse(transaction);
    }

    /**
     * Queries paginated transaction history for an account with IDOR check for CUSTOMER role.
     */
    @Override
    @Transactional(readOnly = true)
    public PageResponse<TransactionResponse> getTransactionHistory(
            UUID accountId,
            TransactionType type,
            TransactionStatus status,
            Pageable pageable,
            UUID requesterUserId,
            Role requesterRole) {

        AccountSummaryDto account = accountApi.findAccountById(accountId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        ErrorCode.ACCOUNT_NOT_FOUND, "Account not found: " + accountId));

        if (requesterRole == Role.CUSTOMER) {
            verifyAccountOwnershipForCustomer(account, requesterUserId);
        }

        Page<TransactionResponse> page = transactionRepository
                .findHistoryByAccountId(accountId, type, status, pageable)
                .map(this::mapToResponse);

        return PageResponse.from(page);
    }

    // =========================================================================
    // TransactionApi — cross-module interface
    // =========================================================================

    /**
     * Cross-module: looks up a transaction summary by UUID.
     */
    @Override
    @Transactional(readOnly = true)
    public Optional<TransactionSummaryDto> findTransactionById(UUID transactionId) {
        return transactionRepository.findById(transactionId).map(this::mapToSummary);
    }

    /**
     * Cross-module: executes an internal transfer on behalf of another module (e.g. Payment).
     */
    @Override
    @Transactional
    public TransactionSummaryDto executeInternalTransfer(
            UUID sourceAccountId,
            UUID targetAccountId,
            BigDecimal amount,
            String currency,
            String description,
            String idempotencyKey) {

        TransactionResponse response = executeTransferCore(
                sourceAccountId, targetAccountId, amount, currency, description,
                idempotencyKey, null, Role.ADMIN);

        return new TransactionSummaryDto(
                response.id(),
                response.transactionRef(),
                response.sourceAccountId(),
                response.targetAccountId(),
                response.transactionType(),
                response.amount(),
                response.currency(),
                response.status(),
                response.createdAt()
        );
    }

    /**
     * Cross-module: reverses a transaction on behalf of another module (e.g. Payment Refund).
     */
    @Override
    @Transactional
    public TransactionSummaryDto reverseTransaction(UUID originalTransactionId, String reason) {
        TransactionResponse response = reverse(
                originalTransactionId, new ReverseTransactionRequest(reason), null);

        return new TransactionSummaryDto(
                response.id(),
                response.transactionRef(),
                response.sourceAccountId(),
                response.targetAccountId(),
                response.transactionType(),
                response.amount(),
                response.currency(),
                response.status(),
                response.createdAt()
        );
    }

    // =========================================================================
    // Private helpers
    // =========================================================================

    private TransactionResponse executeTransferCore(
            UUID sourceAccountId,
            UUID targetAccountId,
            BigDecimal amount,
            String currency,
            String description,
            String idempotencyKey,
            UUID requesterUserId,
            Role requesterRole) {

        if (sourceAccountId.equals(targetAccountId)) {
            throw new TransactionException(ErrorCode.SAME_ACCOUNT_TRANSFER);
        }

        BigDecimal normalizedAmount = normalizeAndValidateAmount(amount);
        String normalizedCurrency = currency.toUpperCase();

        // Deadlock prevention & L1 cache consistency:
        // Acquire pessimistic write locks in deterministic UUID order BEFORE loading entities
        // so Hibernate loads the latest committed version and balance into the persistence context.
        accountApi.lockAccountsInOrder(sourceAccountId, targetAccountId);

        AccountSummaryDto sourceAccount = accountApi.findAccountById(sourceAccountId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        ErrorCode.ACCOUNT_NOT_FOUND, "Source account not found: " + sourceAccountId));

        AccountSummaryDto targetAccount = accountApi.findAccountById(targetAccountId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        ErrorCode.ACCOUNT_NOT_FOUND, "Target account not found: " + targetAccountId));

        // IDOR protection: CUSTOMER may only transfer out of their own account
        if (requesterRole == Role.CUSTOMER) {
            verifyAccountOwnershipForCustomer(sourceAccount, requesterUserId);
        }

        // Enforce same-currency transfer invariant
        if (!sourceAccount.currency().equalsIgnoreCase(targetAccount.currency())
                || !sourceAccount.currency().equalsIgnoreCase(normalizedCurrency)) {
            throw new TransactionException(ErrorCode.CURRENCY_MISMATCH);
        }

        accountApi.debitAccount(sourceAccountId, normalizedAmount, normalizedCurrency);
        accountApi.creditAccount(targetAccountId, normalizedAmount, normalizedCurrency);

        Transaction transaction = Transaction.builder()
                .transactionRef(generateUniqueTransactionRef())
                .idempotencyKey(idempotencyKey)
                .sourceAccountId(sourceAccountId)
                .targetAccountId(targetAccountId)
                .transactionType(TransactionType.TRANSFER)
                .amount(normalizedAmount)
                .currency(normalizedCurrency)
                .status(TransactionStatus.SUCCESS)
                .description(description)
                .build();

        Transaction savedTxn = transactionRepository.save(transaction);

        // Post balanced double-entry journal: DEBIT source, CREDIT target
        ledgerApi.recordTransferJournal(
                savedTxn.getId(),
                sourceAccountId,
                targetAccountId,
                normalizedAmount,
                normalizedCurrency);

        log.info("TRANSFER committed ref={} from={} to={} amount={} {}",
                savedTxn.getTransactionRef(), sourceAccountId, targetAccountId, normalizedAmount, normalizedCurrency);

        return mapToResponse(savedTxn);
    }

    private BigDecimal normalizeAndValidateAmount(BigDecimal amount) {
        if (amount == null || amount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new TransactionException(ErrorCode.INVALID_TRANSACTION_AMOUNT);
        }
        return amount.setScale(BankingConstants.FINANCIAL_SCALE, BankingConstants.FINANCIAL_ROUNDING);
    }

    private AccountSummaryDto resolveSystemVaultAccount() {
        return accountApi.findAccountByNumber(BankingConstants.SYSTEM_VAULT_ACCOUNT_NUMBER)
                .orElseThrow(() -> new TransactionException(
                        ErrorCode.INTERNAL_SERVER_ERROR,
                        "System Vault account (" + BankingConstants.SYSTEM_VAULT_ACCOUNT_NUMBER + ") is not configured"));
    }

    private void verifyAccountOwnershipForCustomer(AccountSummaryDto account, UUID requesterUserId) {
        CustomerSummaryDto ownCustomer = customerApi.findCustomerByUserId(requesterUserId)
                .orElseThrow(() -> new AccessDeniedException("No customer profile linked to current user"));
        if (!ownCustomer.id().equals(account.customerId())) {
            throw new AccessDeniedException("Customers can only operate on their own accounts");
        }
    }

    private void verifyTransactionAccessForCustomer(Transaction transaction, UUID requesterUserId) {
        CustomerSummaryDto ownCustomer = customerApi.findCustomerByUserId(requesterUserId)
                .orElseThrow(() -> new AccessDeniedException("No customer profile linked to current user"));

        boolean ownsSource = transaction.getSourceAccountId() != null &&
                accountApi.findAccountById(transaction.getSourceAccountId())
                        .map(acc -> ownCustomer.id().equals(acc.customerId()))
                        .orElse(false);

        boolean ownsTarget = transaction.getTargetAccountId() != null &&
                accountApi.findAccountById(transaction.getTargetAccountId())
                        .map(acc -> ownCustomer.id().equals(acc.customerId()))
                        .orElse(false);

        if (!ownsSource && !ownsTarget) {
            throw new AccessDeniedException("Customers can only view their own transactions");
        }
    }

    private String generateUniqueTransactionRef() {
        String datePart = LocalDate.now().format(TXN_DATE_FORMAT);
        for (int attempt = 0; attempt < 5; attempt++) {
            int randomSuffix = 100000 + RANDOM_GENERATOR.nextInt(900000);
            String candidate = "TXN-" + datePart + "-" + randomSuffix;
            if (!transactionRepository.existsByTransactionRef(candidate)) {
                return candidate;
            }
        }
        throw new TransactionException(ErrorCode.INTERNAL_SERVER_ERROR,
                "Could not generate a unique transaction reference");
    }

    private TransactionResponse mapToResponse(Transaction txn) {
        return new TransactionResponse(
                txn.getId(),
                txn.getTransactionRef(),
                txn.getIdempotencyKey(),
                txn.getSourceAccountId(),
                txn.getTargetAccountId(),
                txn.getTransactionType(),
                txn.getAmount(),
                txn.getCurrency(),
                txn.getStatus(),
                txn.getFailureReason(),
                txn.getDescription(),
                txn.getCreatedAt(),
                txn.getUpdatedAt()
        );
    }

    private TransactionSummaryDto mapToSummary(Transaction txn) {
        return new TransactionSummaryDto(
                txn.getId(),
                txn.getTransactionRef(),
                txn.getSourceAccountId(),
                txn.getTargetAccountId(),
                txn.getTransactionType(),
                txn.getAmount(),
                txn.getCurrency(),
                txn.getStatus(),
                txn.getCreatedAt()
        );
    }
}
