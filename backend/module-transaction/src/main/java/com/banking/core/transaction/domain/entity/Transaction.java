package com.banking.core.transaction.domain.entity;

import com.banking.core.common.domain.BaseAuditEntity;
import com.banking.core.common.exception.ErrorCode;
import com.banking.core.transaction.domain.enums.TransactionStatus;
import com.banking.core.transaction.domain.enums.TransactionType;
import com.banking.core.transaction.domain.exception.TransactionException;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.UUID;

/**
 * Financial transaction record.
 * <p>
 * Represents a Deposit, Withdrawal, Internal Transfer, or Reversal.
 * Account references (sourceAccountId, targetAccountId) are plain UUIDs
 * to preserve module boundaries.
 */
@Entity
@Table(name = "transactions")
@Getter
@Builder
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor(access = AccessLevel.PRIVATE)
public class Transaction extends BaseAuditEntity {

    @Column(name = "transaction_ref", nullable = false, unique = true, length = 64)
    private String transactionRef;

    @Column(name = "idempotency_key", unique = true, length = 128)
    private String idempotencyKey;

    /** Debited account UUID (null for DEPOSIT where System Vault is debited). */
    @Column(name = "source_account_id")
    private UUID sourceAccountId;

    /** Credited account UUID (null for WITHDRAWAL where System Vault is credited). */
    @Column(name = "target_account_id")
    private UUID targetAccountId;

    @Enumerated(EnumType.STRING)
    @Column(name = "transaction_type", nullable = false, length = 30)
    private TransactionType transactionType;

    @Column(name = "amount", nullable = false, precision = 19, scale = 4)
    private BigDecimal amount;

    @Column(name = "currency", nullable = false, length = 3)
    private String currency;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 30)
    @Builder.Default
    private TransactionStatus status = TransactionStatus.PENDING;

    @Column(name = "failure_reason", length = 255)
    private String failureReason;

    @Column(name = "description")
    private String description;

    /**
     * Transitions the transaction to PROCESSING.
     */
    public void markProcessing() {
        this.status = TransactionStatus.PROCESSING;
    }

    /**
     * Marks the transaction as successfully committed.
     */
    public void markSuccess() {
        this.status = TransactionStatus.SUCCESS;
    }

    /**
     * Marks the transaction as failed with a human-readable reason.
     *
     * @param reason failure explanation
     */
    public void markFailed(String reason) {
        this.status = TransactionStatus.FAILED;
        this.failureReason = reason;
    }

    /**
     * Marks a SUCCESS transaction as REVERSED.
     * Throws TransactionException if it was already reversed or never succeeded.
     */
    public void markReversed() {
        if (this.status == TransactionStatus.REVERSED) {
            throw new TransactionException(ErrorCode.TRANSACTION_ALREADY_REVERSED);
        }
        if (this.status != TransactionStatus.SUCCESS) {
            throw new TransactionException(ErrorCode.INVALID_REQUEST_PAYLOAD,
                    "Only SUCCESS transactions can be reversed; current status: " + this.status);
        }
        this.status = TransactionStatus.REVERSED;
    }
}
