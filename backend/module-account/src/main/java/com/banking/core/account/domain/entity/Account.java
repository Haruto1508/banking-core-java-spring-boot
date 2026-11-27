package com.banking.core.account.domain.entity;

import com.banking.core.account.domain.enums.AccountStatus;
import com.banking.core.account.domain.enums.AccountType;
import com.banking.core.account.domain.exception.AccountException;
import com.banking.core.common.domain.BaseAuditEntity;
import com.banking.core.common.exception.ErrorCode;
import com.banking.core.common.exception.InsufficientBalanceException;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.UUID;

/**
 * Bank account entity.
 * <p>
 * Holds the current balance for a customer's SAVINGS or CURRENT account,
 * or for the internal SYSTEM vault account.
 * <p>
 * Balance is stored as NUMERIC(19,4) in PostgreSQL.
 * All debit/credit mutations go through the domain methods on this class
 * to enforce business invariants (non-negative balance, correct status).
 */
@Entity
@Table(name = "accounts")
@Getter
@Builder
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor(access = AccessLevel.PRIVATE)
public class Account extends BaseAuditEntity {

    /** Customer who owns this account. NULL for SYSTEM-type accounts. */
    @Column(name = "customer_id")
    private UUID customerId;

    /**
     * Human-readable account number (e.g. "ACC-20250101-123456").
     * Unique across the entire accounts table.
     */
    @Column(name = "account_number", nullable = false, unique = true, length = 34)
    private String accountNumber;

    /** Product type: SAVINGS, CURRENT, or SYSTEM. */
    @Enumerated(EnumType.STRING)
    @Column(name = "account_type", nullable = false, length = 20)
    private AccountType accountType;

    /** ISO-4217 currency code (e.g. "VND", "USD"). */
    @Column(name = "currency", nullable = false, length = 3)
    private String currency;

    /**
     * Current available balance.
     * Must always be >= 0 for customer accounts.
     */
    @Column(name = "balance", nullable = false, precision = 19, scale = 4)
    @Builder.Default
    private BigDecimal balance = BigDecimal.ZERO;

    /** Lifecycle status of the account. */
    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    @Builder.Default
    private AccountStatus status = AccountStatus.ACTIVE;

    /**
     * JPA optimistic-lock version counter.
     * Automatically incremented on every UPDATE by Hibernate.
     */
    @Version
    @Column(name = "version", nullable = false)
    @Builder.Default
    private Long version = 0L;

    // -------------------------------------------------------------------------
    // Business domain methods
    // -------------------------------------------------------------------------

    /**
     * Checks whether the account is currently active.
     *
     * @return true if status is ACTIVE
     */
    public boolean isActive() {
        return this.status == AccountStatus.ACTIVE;
    }

    /**
     * Reduces the account balance by the given amount (a withdrawal or transfer debit).
     * <p>
     * Preconditions:
     * - Account must be ACTIVE.
     * - Amount must be positive.
     * - Resulting balance must remain >= 0.
     *
     * @param amount positive debit amount in the account's currency
     * @throws AccountException            if account is not ACTIVE
     * @throws InsufficientBalanceException if balance would drop below zero
     */
    public void debit(BigDecimal amount) {
        assertActive("debit");

        BigDecimal newBalance = this.balance.subtract(amount);
        if (newBalance.compareTo(BigDecimal.ZERO) < 0) {
            throw new InsufficientBalanceException(
                    "Insufficient balance on account " + this.accountNumber +
                    ": available=" + this.balance + ", requested=" + amount);
        }
        this.balance = newBalance;
    }

    /**
     * Increases the account balance by the given amount (a deposit or transfer credit).
     * <p>
     * Preconditions:
     * - Account must be ACTIVE.
     * - Amount must be positive.
     *
     * @param amount positive credit amount in the account's currency
     * @throws AccountException if account is not ACTIVE
     */
    public void credit(BigDecimal amount) {
        assertActive("credit");
        this.balance = this.balance.add(amount);
    }

    /**
     * Freezes an ACTIVE account, blocking all future transactions.
     * A CLOSED account cannot be frozen.
     *
     * @throws AccountException if the account is not ACTIVE
     */
    public void freeze() {
        if (this.status != AccountStatus.ACTIVE) {
            throw new AccountException(ErrorCode.ACCOUNT_CLOSED,
                    "Only an ACTIVE account can be frozen; current status: " + this.status);
        }
        this.status = AccountStatus.FROZEN;
    }

    /**
     * Re-activates a FROZEN account.
     *
     * @throws AccountException if the account is not FROZEN
     */
    public void unfreeze() {
        if (this.status != AccountStatus.FROZEN) {
            throw new AccountException(ErrorCode.ACCOUNT_CLOSED,
                    "Only a FROZEN account can be unfrozen; current status: " + this.status);
        }
        this.status = AccountStatus.ACTIVE;
    }

    /**
     * Permanently closes the account.
     * <p>
     * Preconditions:
     * - Account must not already be CLOSED.
     * - Balance must be exactly zero (no remaining funds).
     *
     * @throws AccountException if the account is already CLOSED or has remaining balance
     */
    public void close() {
        if (this.status == AccountStatus.CLOSED) {
            throw new AccountException(ErrorCode.ACCOUNT_CLOSED, "Account is already closed");
        }
        if (this.balance.compareTo(BigDecimal.ZERO) != 0) {
            throw new AccountException(ErrorCode.ACCOUNT_HAS_REMAINING_BALANCE,
                    "Account balance must be zero before closing; current balance: " + this.balance);
        }
        this.status = AccountStatus.CLOSED;
    }

    // -------------------------------------------------------------------------
    // Private helpers
    // -------------------------------------------------------------------------

    /**
     * Asserts that the account is ACTIVE before any financial operation.
     *
     * @param operation name of the caller (for error messages)
     * @throws AccountException if account is FROZEN or CLOSED
     */
    private void assertActive(String operation) {
        switch (this.status) {
            case FROZEN -> throw new AccountException(ErrorCode.ACCOUNT_FROZEN,
                    "Cannot " + operation + " a FROZEN account: " + this.accountNumber);
            case CLOSED -> throw new AccountException(ErrorCode.ACCOUNT_CLOSED,
                    "Cannot " + operation + " a CLOSED account: " + this.accountNumber);
            default -> { /* ACTIVE — proceed */ }
        }
    }
}
