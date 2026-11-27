package com.banking.core.payment.domain.entity;

import com.banking.core.common.domain.BaseAuditEntity;
import com.banking.core.common.exception.ErrorCode;
import com.banking.core.payment.domain.enums.PaymentMethod;
import com.banking.core.payment.domain.enums.PaymentStatus;
import com.banking.core.payment.domain.exception.PaymentException;
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
 * Payment entity representing a merchant/bill payment request and its execution state.
 * <p>
 * Account and Transaction references are stored as plain UUIDs to preserve
 * strict module boundaries.
 */
@Entity
@Table(name = "payments")
@Getter
@Builder
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor(access = AccessLevel.PRIVATE)
public class Payment extends BaseAuditEntity {

    @Column(name = "payment_ref", nullable = false, unique = true, length = 64)
    private String paymentRef;

    @Column(name = "idempotency_key", unique = true, length = 128)
    private String idempotencyKey;

    @Column(name = "source_account_id", nullable = false)
    private UUID sourceAccountId;

    @Column(name = "merchant_account_id", nullable = false)
    private UUID merchantAccountId;

    @Column(name = "transaction_id")
    private UUID transactionId;

    @Column(name = "amount", nullable = false, precision = 19, scale = 4)
    private BigDecimal amount;

    @Column(name = "currency", nullable = false, length = 3)
    private String currency;

    @Enumerated(EnumType.STRING)
    @Column(name = "payment_method", nullable = false, length = 30)
    private PaymentMethod paymentMethod;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 30)
    @Builder.Default
    private PaymentStatus status = PaymentStatus.PENDING;

    @Column(name = "description", length = 255)
    private String description;

    /**
     * Marks this payment as COMPLETED and links the committed financial transaction ID.
     *
     * @param transactionId committed transaction UUID
     */
    public void markCompleted(UUID transactionId) {
        if (this.status != PaymentStatus.PENDING) {
            throw new PaymentException(ErrorCode.INVALID_REQUEST_PAYLOAD,
                    "Only PENDING payments can be completed; current status: " + this.status);
        }
        this.transactionId = transactionId;
        this.status = PaymentStatus.COMPLETED;
    }

    /**
     * Marks this payment as FAILED.
     */
    public void markFailed() {
        this.status = PaymentStatus.FAILED;
    }

    /**
     * Marks a COMPLETED payment as REFUNDED.
     */
    public void markRefunded() {
        if (this.status != PaymentStatus.COMPLETED) {
            throw new PaymentException(ErrorCode.INVALID_REQUEST_PAYLOAD,
                    "Only COMPLETED payments can be refunded; current status: " + this.status);
        }
        this.status = PaymentStatus.REFUNDED;
    }
}
