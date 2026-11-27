package com.banking.core.transaction.service.impl;

import com.banking.core.account.exposed.AccountApi;
import com.banking.core.account.exposed.AccountSummaryDto;
import com.banking.core.audit.exposed.AuditApi;
import com.banking.core.auth.domain.enums.Role;
import com.banking.core.common.constant.BankingConstants;
import com.banking.core.common.exception.ErrorCode;
import com.banking.core.common.exception.ResourceNotFoundException;
import com.banking.core.customer.exposed.CustomerApi;
import com.banking.core.customer.exposed.CustomerSummaryDto;
import com.banking.core.ledger.exposed.LedgerApi;
import com.banking.core.notification.exposed.TransactionEventPayload;
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
import com.banking.core.transaction.service.IdempotencyService;
import com.banking.core.transaction.service.TransactionService;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.ApplicationEventPublisher;
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
 * Command processing engine implementing {@link TransactionService}.
 * <p>
 * Guarantees ACID properties, deadlock-free pessimistic locking, idempotency,
 * and synchronized double-entry ledger postings.
 * Read-only queries live in {@link TransactionQueryServiceImpl} and cross-module
 * contracts live in {@link TransactionApiImpl}.
 */
@Service
@RequiredArgsConstructor
public class TransactionServiceImpl implements TransactionService {

    private static final Logger log = LoggerFactory.getLogger(TransactionServiceImpl.class);
    private static final SecureRandom RANDOM_GENERATOR = new SecureRandom();
    private static final DateTimeFormatter TXN_DATE_FORMAT = DateTimeFormatter.ofPattern("yyyyMMdd");

    private final TransactionRepository transactionRepository;
    private final AccountApi accountApi;
    private final CustomerApi customerApi;
    private final LedgerApi ledgerApi;
    private final IdempotencyService idempotencyService;
    private final TransactionTemplate transactionTemplate;
    private final AuditApi auditApi;
    private final ApplicationEventPublisher eventPublisher;

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
        auditApi.recordAuditLog(
                staffUserId != null ? staffUserId.toString() : "SYSTEM", "STAFF_OR_ADMIN",
                "DEPOSIT", "TRANSACTION", savedTxn.getId().toString(), null, "SUCCESS",
                "ref=" + savedTxn.getTransactionRef() + ", amount=" + normalizedAmount + " " + normalizedCurrency);
        publishTransactionEvent(request.accountId(), savedTxn, "DEPOSIT_COMPLETED");

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
        auditApi.recordAuditLog(
                staffUserId != null ? staffUserId.toString() : "SYSTEM", "STAFF_OR_ADMIN",
                "WITHDRAWAL", "TRANSACTION", savedTxn.getId().toString(), null, "SUCCESS",
                "ref=" + savedTxn.getTransactionRef() + ", amount=" + normalizedAmount + " " + normalizedCurrency);
        publishTransactionEvent(request.accountId(), savedTxn, "WITHDRAWAL_COMPLETED");

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
        auditApi.recordAuditLog(
                adminUserId != null ? adminUserId.toString() : "SYSTEM", "ADMIN",
                "TRANSACTION_REVERSAL", "TRANSACTION", savedReversal.getId().toString(), null, "SUCCESS",
                "reversedOriginalRef=" + original.getTransactionRef() + ", reason=" + request.reason());

        return mapToResponse(savedReversal);
    }

    // =========================================================================
    // Package-private & Private helpers
    // =========================================================================

    TransactionResponse executeTransferCore(
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
        auditApi.recordAuditLog(
                requesterUserId != null ? requesterUserId.toString() : "SYSTEM",
                requesterRole != null ? requesterRole.name() : "SYSTEM",
                "TRANSFER", "TRANSACTION", savedTxn.getId().toString(), null, "SUCCESS",
                "ref=" + savedTxn.getTransactionRef() + ", amount=" + normalizedAmount + " " + normalizedCurrency);
        publishTransactionEvent(sourceAccountId, savedTxn, "TRANSFER_DEBITED");
        publishTransactionEvent(targetAccountId, savedTxn, "TRANSFER_CREDITED");

        return mapToResponse(savedTxn);
    }

    private void publishTransactionEvent(UUID accountId, Transaction txn, String eventType) {
        accountApi.findAccountById(accountId)
                .map(AccountSummaryDto::customerId)
                .filter(customerId -> customerId != null)
                .flatMap(customerApi::findCustomerById)
                .ifPresent(customer -> eventPublisher.publishEvent(new TransactionEventPayload(
                        txn.getId(),
                        txn.getTransactionRef(),
                        customer.userId(),
                        customer.email(),
                        eventType,
                        txn.getAmount(),
                        txn.getCurrency()
                )));
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
        return TransactionMapper.toResponse(txn);
    }
}
