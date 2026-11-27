package com.banking.core.transaction.service.impl;

import com.banking.core.account.domain.enums.AccountStatus;
import com.banking.core.account.domain.enums.AccountType;
import com.banking.core.account.exposed.AccountApi;
import com.banking.core.account.exposed.AccountSummaryDto;
import com.banking.core.audit.exposed.AuditApi;
import com.banking.core.auth.domain.enums.Role;
import com.banking.core.common.constant.BankingConstants;
import com.banking.core.common.exception.ErrorCode;
import com.banking.core.customer.domain.enums.CustomerStatus;
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
import com.banking.core.transaction.service.IdempotencyService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.transaction.support.TransactionCallback;
import org.springframework.transaction.support.TransactionTemplate;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("TransactionServiceImpl Unit Tests")
class TransactionServiceImplTest {

    @Mock
    private TransactionRepository transactionRepository;

    @Mock
    private AccountApi accountApi;

    @Mock
    private CustomerApi customerApi;

    @Mock
    private LedgerApi ledgerApi;

    @Mock
    private IdempotencyService idempotencyService;

    @Mock
    private TransactionTemplate transactionTemplate;

    @Mock
    private AuditApi auditApi;

    @Mock
    private ApplicationEventPublisher eventPublisher;

    @InjectMocks
    private TransactionServiceImpl transactionService;

    private UUID vaultId;
    private UUID sourceAccountId;
    private UUID targetAccountId;
    private UUID customerId;
    private UUID userId;
    private AccountSummaryDto vaultAccount;
    private AccountSummaryDto sourceAccount;
    private AccountSummaryDto targetAccount;

    @BeforeEach
    void setUp() {
        vaultId = BankingConstants.SYSTEM_VAULT_ACCOUNT_ID;
        sourceAccountId = UUID.randomUUID();
        targetAccountId = UUID.randomUUID();
        customerId = UUID.randomUUID();
        userId = UUID.randomUUID();

        vaultAccount = new AccountSummaryDto(
                vaultId, BankingConstants.SYSTEM_VAULT_ACCOUNT_NUMBER, null,
                AccountType.SYSTEM, "USD", new BigDecimal("1000000000.0000"), AccountStatus.ACTIVE);

        sourceAccount = new AccountSummaryDto(
                sourceAccountId, "ACC-20250101-100001", customerId,
                AccountType.CURRENT, "VND", new BigDecimal("5000000.0000"), AccountStatus.ACTIVE);

        targetAccount = new AccountSummaryDto(
                targetAccountId, "ACC-20250101-100002", UUID.randomUUID(),
                AccountType.SAVINGS, "VND", new BigDecimal("1000000.0000"), AccountStatus.ACTIVE);

        lenient().when(transactionTemplate.execute(any())).thenAnswer(inv -> {
            TransactionCallback<?> callback = inv.getArgument(0);
            return callback.doInTransaction(mock(org.springframework.transaction.TransactionStatus.class));
        });
    }

    @Test
    @DisplayName("deposit: should credit customer account and record DEPOSIT journal")
    void deposit_shouldCreditAndRecordJournal() {
        DepositRequest request = new DepositRequest(targetAccountId, new BigDecimal("500000"), "VND", "Cash deposit");
        when(accountApi.findAccountByNumber(BankingConstants.SYSTEM_VAULT_ACCOUNT_NUMBER))
                .thenReturn(Optional.of(vaultAccount));
        when(transactionRepository.existsByTransactionRef(anyString())).thenReturn(false);
        when(transactionRepository.save(any(Transaction.class))).thenAnswer(inv -> {
            Transaction t = inv.getArgument(0);
            setEntityId(t, UUID.randomUUID());
            return t;
        });

        TransactionResponse response = transactionService.deposit(request, UUID.randomUUID());

        assertThat(response.transactionType()).isEqualTo(TransactionType.DEPOSIT);
        assertThat(response.status()).isEqualTo(TransactionStatus.SUCCESS);
        assertThat(response.amount()).isEqualByComparingTo("500000.0000");

        verify(accountApi).creditAccount(targetAccountId, new BigDecimal("500000.0000"), "VND");
        verify(ledgerApi).recordDepositJournal(any(), eq(targetAccountId), eq(vaultId),
                eq(new BigDecimal("500000.0000")), eq("VND"));
    }

    @Test
    @DisplayName("withdraw: should debit customer account and record WITHDRAWAL journal")
    void withdraw_shouldDebitAndRecordJournal() {
        WithdrawalRequest request = new WithdrawalRequest(sourceAccountId, new BigDecimal("200000"), "VND", "ATM");
        when(accountApi.findAccountByNumber(BankingConstants.SYSTEM_VAULT_ACCOUNT_NUMBER))
                .thenReturn(Optional.of(vaultAccount));
        when(transactionRepository.existsByTransactionRef(anyString())).thenReturn(false);
        when(transactionRepository.save(any(Transaction.class))).thenAnswer(inv -> {
            Transaction t = inv.getArgument(0);
            setEntityId(t, UUID.randomUUID());
            return t;
        });

        TransactionResponse response = transactionService.withdraw(request, UUID.randomUUID());

        assertThat(response.transactionType()).isEqualTo(TransactionType.WITHDRAWAL);
        assertThat(response.status()).isEqualTo(TransactionStatus.SUCCESS);
        verify(accountApi).debitAccount(sourceAccountId, new BigDecimal("200000.0000"), "VND");
        verify(ledgerApi).recordWithdrawalJournal(any(), eq(sourceAccountId), eq(vaultId),
                eq(new BigDecimal("200000.0000")), eq("VND"));
    }

    @Test
    @DisplayName("transfer: should lock accounts in order, debit source, credit target, and post journal")
    void transfer_shouldExecuteAtomically() {
        TransferRequest request = new TransferRequest(
                sourceAccountId, targetAccountId, new BigDecimal("100000"), "VND", "Lunch");

        when(idempotencyService.acquireOrReturnCached(eq("key-1"), anyString(), eq(request)))
                .thenReturn(Optional.empty());
        when(accountApi.findAccountById(sourceAccountId)).thenReturn(Optional.of(sourceAccount));
        when(accountApi.findAccountById(targetAccountId)).thenReturn(Optional.of(targetAccount));
        when(customerApi.findCustomerByUserId(userId)).thenReturn(Optional.of(
                new CustomerSummaryDto(customerId, userId, "CIF-1", "Alice", "a@b.com", CustomerStatus.ACTIVE)));
        when(transactionRepository.existsByTransactionRef(anyString())).thenReturn(false);
        when(transactionRepository.save(any(Transaction.class))).thenAnswer(inv -> {
            Transaction t = inv.getArgument(0);
            setEntityId(t, UUID.randomUUID());
            return t;
        });

        TransactionResponse response = transactionService.transfer(request, "key-1", userId, Role.CUSTOMER);

        assertThat(response.transactionType()).isEqualTo(TransactionType.TRANSFER);
        assertThat(response.status()).isEqualTo(TransactionStatus.SUCCESS);

        verify(accountApi).lockAccountsInOrder(sourceAccountId, targetAccountId);
        verify(accountApi).debitAccount(sourceAccountId, new BigDecimal("100000.0000"), "VND");
        verify(accountApi).creditAccount(targetAccountId, new BigDecimal("100000.0000"), "VND");
        verify(ledgerApi).recordTransferJournal(any(), eq(sourceAccountId), eq(targetAccountId),
                eq(new BigDecimal("100000.0000")), eq("VND"));
        verify(idempotencyService).markCompleted(eq("key-1"), any(), eq(201));
    }

    @Test
    @DisplayName("transfer: should return cached response on duplicate Idempotency-Key without executing transfer")
    void transfer_shouldReturnCachedResponseOnRetry() {
        TransferRequest request = new TransferRequest(
                sourceAccountId, targetAccountId, new BigDecimal("100000"), "VND", "Lunch");
        TransactionResponse cached = new TransactionResponse(
                UUID.randomUUID(), "TXN-20250101-123456", "key-1",
                sourceAccountId, targetAccountId, TransactionType.TRANSFER,
                new BigDecimal("100000.0000"), "VND", TransactionStatus.SUCCESS,
                null, "Lunch", Instant.now(), Instant.now());

        when(idempotencyService.acquireOrReturnCached(eq("key-1"), anyString(), eq(request)))
                .thenReturn(Optional.of(cached));

        TransactionResponse result = transactionService.transfer(request, "key-1", userId, Role.CUSTOMER);

        assertThat(result).isEqualTo(cached);
        verifyNoInteractions(accountApi, ledgerApi, transactionRepository);
    }

    @Test
    @DisplayName("transfer: should reject same-account transfer")
    void transfer_shouldRejectSameAccount() {
        TransferRequest request = new TransferRequest(
                sourceAccountId, sourceAccountId, new BigDecimal("100000"), "VND", "Self");

        when(idempotencyService.acquireOrReturnCached(any(), anyString(), any())).thenReturn(Optional.empty());

        assertThatThrownBy(() -> transactionService.transfer(request, "key-2", userId, Role.ADMIN))
                .isInstanceOf(TransactionException.class)
                .hasFieldOrPropertyWithValue("errorCode", ErrorCode.SAME_ACCOUNT_TRANSFER);
    }

    @Test
    @DisplayName("transfer: should block CUSTOMER transferring from someone else's account (IDOR)")
    void transfer_shouldBlockIdorForCustomer() {
        UUID anotherUserId = UUID.randomUUID();
        UUID anotherCustomerId = UUID.randomUUID();
        TransferRequest request = new TransferRequest(
                sourceAccountId, targetAccountId, new BigDecimal("100000"), "VND", "Hack");

        when(idempotencyService.acquireOrReturnCached(any(), anyString(), any())).thenReturn(Optional.empty());
        when(accountApi.findAccountById(sourceAccountId)).thenReturn(Optional.of(sourceAccount));
        when(accountApi.findAccountById(targetAccountId)).thenReturn(Optional.of(targetAccount));
        when(customerApi.findCustomerByUserId(anotherUserId)).thenReturn(Optional.of(
                new CustomerSummaryDto(anotherCustomerId, anotherUserId, "CIF-2", "Bob", "b@b.com", CustomerStatus.ACTIVE)));

        assertThatThrownBy(() -> transactionService.transfer(request, "key-3", anotherUserId, Role.CUSTOMER))
                .isInstanceOf(AccessDeniedException.class);
        verify(accountApi, never()).debitAccount(any(), any(), any());
    }

    @Test
    @DisplayName("reverse: should mark original REVERSED, flip funds, and post reversal journal")
    void reverse_shouldFlipFundsAndPostReversalJournal() {
        UUID originalId = UUID.randomUUID();
        Transaction original = Transaction.builder()
                .transactionRef("TXN-20250101-111111")
                .sourceAccountId(sourceAccountId)
                .targetAccountId(targetAccountId)
                .transactionType(TransactionType.TRANSFER)
                .amount(new BigDecimal("100000.0000"))
                .currency("VND")
                .status(TransactionStatus.SUCCESS)
                .build();
        setEntityId(original, originalId);

        when(transactionRepository.findById(originalId)).thenReturn(Optional.of(original));
        when(transactionRepository.existsByTransactionRef(anyString())).thenReturn(false);
        when(transactionRepository.save(any(Transaction.class))).thenAnswer(inv -> {
            Transaction t = inv.getArgument(0);
            if (t.getId() == null) setEntityId(t, UUID.randomUUID());
            return t;
        });

        TransactionResponse reversal = transactionService.reverse(
                originalId, new ReverseTransactionRequest("Mistaken transfer"), UUID.randomUUID());

        assertThat(original.getStatus()).isEqualTo(TransactionStatus.REVERSED);
        assertThat(reversal.transactionType()).isEqualTo(TransactionType.REVERSAL);
        verify(accountApi).debitAccount(targetAccountId, new BigDecimal("100000.0000"), "VND");
        verify(accountApi).creditAccount(sourceAccountId, new BigDecimal("100000.0000"), "VND");
        verify(ledgerApi).recordReversalJournalByTransactionId(eq(originalId), any());
    }

    private void setEntityId(Transaction txn, UUID id) {
        try {
            var field = com.banking.core.common.domain.BaseAuditEntity.class.getDeclaredField("id");
            field.setAccessible(true);
            field.set(txn, id);
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
    }
}
