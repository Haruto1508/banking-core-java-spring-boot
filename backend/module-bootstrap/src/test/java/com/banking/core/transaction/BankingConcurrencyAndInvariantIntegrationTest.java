package com.banking.core.transaction;

import com.banking.core.CoreBankingApplication;
import com.banking.core.CoreBankingApplication;
import com.banking.core.account.api.dto.request.OpenAccountRequest;
import com.banking.core.account.api.dto.response.AccountResponse;
import com.banking.core.account.domain.enums.AccountType;
import com.banking.core.account.exposed.AccountApi;
import com.banking.core.account.exposed.AccountSummaryDto;
import com.banking.core.account.service.AccountService;
import com.banking.core.auth.domain.enums.Role;
import com.banking.core.common.exception.ErrorCode;
import com.banking.core.common.exception.InsufficientBalanceException;
import com.banking.core.customer.api.dto.request.CreateCustomerRequest;
import com.banking.core.customer.api.dto.response.CustomerResponse;
import com.banking.core.customer.service.CustomerService;
import com.banking.core.ledger.exposed.LedgerApi;
import com.banking.core.transaction.api.dto.request.DepositRequest;
import com.banking.core.transaction.api.dto.request.TransferRequest;
import com.banking.core.transaction.api.dto.request.WithdrawalRequest;
import com.banking.core.transaction.api.dto.response.TransactionResponse;
import com.banking.core.transaction.domain.exception.TransactionException;
import com.banking.core.transaction.service.TransactionService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.atomic.AtomicInteger;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Integration tests proving concurrency safety (Pessimistic Locking, Deadlock Prevention,
 * Idempotency) and financial invariants (Double-Entry Ledger consistency, non-negative balance).
 */
@SpringBootTest(classes = CoreBankingApplication.class)
@ActiveProfiles("test")
@DisplayName("Banking Concurrency & Financial Invariant Integration Tests")
class BankingConcurrencyAndInvariantIntegrationTest {

    @Autowired
    private CustomerService customerService;

    @Autowired
    private AccountService accountService;

    @Autowired
    private TransactionService transactionService;

    @Autowired
    private AccountApi accountApi;

    @Autowired
    private LedgerApi ledgerApi;

    @Test
    @DisplayName("Concurrent transfers (20 threads): total balance and double-entry ledger must match")
    void concurrentTransfers_shouldPreserveTotalBalanceAndLedgerInvariant() throws Exception {
        UUID staffId = UUID.randomUUID();
        AccountResponse accountA = createCustomerAndAccount("CONC-A-" + UUID.randomUUID(), new BigDecimal("10000000.0000"), staffId);
        AccountResponse accountB = createCustomerAndAccount("CONC-B-" + UUID.randomUUID(), BigDecimal.ZERO, staffId);

        int threadCount = 20;
        BigDecimal transferAmount = new BigDecimal("100000.0000");
        ExecutorService executor = Executors.newFixedThreadPool(threadCount);
        CountDownLatch readyLatch = new CountDownLatch(threadCount);
        CountDownLatch startLatch = new CountDownLatch(1);
        List<Future<Boolean>> futures = new ArrayList<>();

        for (int i = 0; i < threadCount; i++) {
            final int idx = i;
            futures.add(executor.submit(() -> {
                readyLatch.countDown();
                startLatch.await();
                TransferRequest req = new TransferRequest(
                        accountA.id(), accountB.id(), transferAmount, "VND", "Concurrent transfer #" + idx);
                transactionService.transfer(req, "CONC-KEY-" + UUID.randomUUID(), staffId, Role.ADMIN);
                return true;
            }));
        }

        readyLatch.await();
        startLatch.countDown();

        int successes = 0;
        for (Future<Boolean> f : futures) {
            if (Boolean.TRUE.equals(f.get())) {
                successes++;
            }
        }
        executor.shutdown();

        assertThat(successes).isEqualTo(20);

        AccountSummaryDto finalA = accountApi.findAccountById(accountA.id()).orElseThrow();
        AccountSummaryDto finalB = accountApi.findAccountById(accountB.id()).orElseThrow();

        // Expected: A = 8,000,000, B = 2,000,000
        assertThat(finalA.balance()).isEqualByComparingTo(new BigDecimal("8000000.0000"));
        assertThat(finalB.balance()).isEqualByComparingTo(new BigDecimal("2000000.0000"));

        // Financial invariant: stored balance == sum(CREDIT) - sum(DEBIT) in ledger
        assertThat(ledgerApi.calculateLedgerBalance(accountA.id())).isEqualByComparingTo(finalA.balance());
        assertThat(ledgerApi.calculateLedgerBalance(accountB.id())).isEqualByComparingTo(finalB.balance());
    }

    @Test
    @DisplayName("Concurrent withdrawals: must prevent negative balance when funds are exhausted")
    void concurrentWithdrawals_shouldPreventNegativeBalance() throws Exception {
        UUID staffId = UUID.randomUUID();
        AccountResponse account = createCustomerAndAccount("CONC-WD-" + UUID.randomUUID(), new BigDecimal("1000000.0000"), staffId);

        int threadCount = 10;
        BigDecimal withdrawAmount = new BigDecimal("200000.0000");
        ExecutorService executor = Executors.newFixedThreadPool(threadCount);
        CountDownLatch readyLatch = new CountDownLatch(threadCount);
        CountDownLatch startLatch = new CountDownLatch(1);
        AtomicInteger successCount = new AtomicInteger(0);
        AtomicInteger insufficientCount = new AtomicInteger(0);

        List<Future<?>> futures = new ArrayList<>();
        for (int i = 0; i < threadCount; i++) {
            futures.add(executor.submit(() -> {
                readyLatch.countDown();
                try {
                    startLatch.await();
                    transactionService.withdraw(
                            new WithdrawalRequest(account.id(), withdrawAmount, "VND", "Concurrent withdrawal"),
                            staffId);
                    successCount.incrementAndGet();
                } catch (InsufficientBalanceException ex) {
                    insufficientCount.incrementAndGet();
                } catch (InterruptedException ex) {
                    Thread.currentThread().interrupt();
                }
            }));
        }

        readyLatch.await();
        startLatch.countDown();
        for (Future<?> f : futures) {
            f.get();
        }
        executor.shutdown();

        // 1,000,000 / 200,000 = 5 successful withdrawals, 5 rejected
        assertThat(successCount.get()).isEqualTo(5);
        assertThat(insufficientCount.get()).isEqualTo(5);

        AccountSummaryDto finalAcc = accountApi.findAccountById(account.id()).orElseThrow();
        assertThat(finalAcc.balance()).isEqualByComparingTo(BigDecimal.ZERO);
        assertThat(ledgerApi.calculateLedgerBalance(account.id())).isEqualByComparingTo(BigDecimal.ZERO);
    }

    @Test
    @DisplayName("Bidirectional concurrent transfers (A<->B): deterministic lock ordering prevents deadlocks")
    void bidirectionalConcurrentTransfers_shouldNotDeadlock() throws Exception {
        UUID staffId = UUID.randomUUID();
        AccountResponse accountX = createCustomerAndAccount("DEADLOCK-X-" + UUID.randomUUID(), new BigDecimal("5000000.0000"), staffId);
        AccountResponse accountY = createCustomerAndAccount("DEADLOCK-Y-" + UUID.randomUUID(), new BigDecimal("5000000.0000"), staffId);

        int pairs = 10; // 10 X->Y and 10 Y->X concurrently
        ExecutorService executor = Executors.newFixedThreadPool(pairs * 2);
        CountDownLatch readyLatch = new CountDownLatch(pairs * 2);
        CountDownLatch startLatch = new CountDownLatch(1);
        List<Future<Boolean>> futures = new ArrayList<>();

        for (int i = 0; i < pairs; i++) {
            futures.add(executor.submit(() -> {
                readyLatch.countDown();
                startLatch.await();
                transactionService.transfer(
                        new TransferRequest(accountX.id(), accountY.id(), new BigDecimal("50000.0000"), "VND", "X->Y"),
                        "DL-XY-" + UUID.randomUUID(), staffId, Role.ADMIN);
                return true;
            }));
            futures.add(executor.submit(() -> {
                readyLatch.countDown();
                startLatch.await();
                transactionService.transfer(
                        new TransferRequest(accountY.id(), accountX.id(), new BigDecimal("50000.0000"), "VND", "Y->X"),
                        "DL-YX-" + UUID.randomUUID(), staffId, Role.ADMIN);
                return true;
            }));
        }

        readyLatch.await();
        startLatch.countDown();
        for (Future<Boolean> f : futures) {
            assertThat(f.get()).isTrue();
        }
        executor.shutdown();

        AccountSummaryDto finalX = accountApi.findAccountById(accountX.id()).orElseThrow();
        AccountSummaryDto finalY = accountApi.findAccountById(accountY.id()).orElseThrow();

        // Both balances should be 5,000,000 and total = 10,000,000
        assertThat(finalX.balance().add(finalY.balance())).isEqualByComparingTo(new BigDecimal("10000000.0000"));
        assertThat(ledgerApi.calculateLedgerBalance(accountX.id())).isEqualByComparingTo(finalX.balance());
        assertThat(ledgerApi.calculateLedgerBalance(accountY.id())).isEqualByComparingTo(finalY.balance());
    }

    @Test
    @DisplayName("Idempotency: retrying with same key returns cached response; different payload throws mismatch")
    void idempotency_shouldPreventDuplicatePostingAndRejectPayloadMismatch() {
        UUID staffId = UUID.randomUUID();
        AccountResponse accountA = createCustomerAndAccount("IDEMP-A-" + UUID.randomUUID(), new BigDecimal("1000000.0000"), staffId);
        AccountResponse accountB = createCustomerAndAccount("IDEMP-B-" + UUID.randomUUID(), BigDecimal.ZERO, staffId);

        String idempotencyKey = "IDEMP-TEST-" + UUID.randomUUID();
        TransferRequest req = new TransferRequest(
                accountA.id(), accountB.id(), new BigDecimal("250000.0000"), "VND", "Idempotent transfer");

        // First execution
        TransactionResponse first = transactionService.transfer(req, idempotencyKey, staffId, Role.ADMIN);
        // Retry with same key & same payload
        TransactionResponse retry = transactionService.transfer(req, idempotencyKey, staffId, Role.ADMIN);

        assertThat(retry.id()).isEqualTo(first.id());
        assertThat(retry.transactionRef()).isEqualTo(first.transactionRef());

        // Balance must be debited only ONCE
        AccountSummaryDto finalA = accountApi.findAccountById(accountA.id()).orElseThrow();
        assertThat(finalA.balance()).isEqualByComparingTo(new BigDecimal("750000.0000"));

        // Retry with same key but DIFFERENT amount -> must throw IDEMPOTENCY_PAYLOAD_MISMATCH
        TransferRequest tamperedReq = new TransferRequest(
                accountA.id(), accountB.id(), new BigDecimal("999999.0000"), "VND", "Tampered transfer");

        assertThatThrownBy(() -> transactionService.transfer(tamperedReq, idempotencyKey, staffId, Role.ADMIN))
                .isInstanceOf(TransactionException.class)
                .extracting(e -> ((TransactionException) e).getErrorCode())
                .isEqualTo(ErrorCode.IDEMPOTENCY_PAYLOAD_MISMATCH);
    }

    // =========================================================================
    // Helper
    // =========================================================================

    private AccountResponse createCustomerAndAccount(String identitySeed, BigDecimal initialDeposit, UUID staffId) {
        CustomerResponse customer = customerService.createCustomer(
                new CreateCustomerRequest(
                        null,
                        "Test Customer " + identitySeed,
                        identitySeed,
                        "090" + Math.abs(identitySeed.hashCode() % 10000000),
                        identitySeed.toLowerCase() + "@test.com"),
                staffId,
                Role.ADMIN);

        AccountResponse account = accountService.openAccount(
                new OpenAccountRequest(customer.id().toString(), AccountType.CURRENT, "VND"),
                staffId,
                Role.ADMIN);

        if (initialDeposit.compareTo(BigDecimal.ZERO) > 0) {
            transactionService.deposit(
                    new DepositRequest(account.id(), initialDeposit, "VND", "Initial seed deposit"),
                    staffId);
        }

        return account;
    }
}
