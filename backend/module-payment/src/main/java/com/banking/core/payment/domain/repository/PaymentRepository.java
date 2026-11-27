package com.banking.core.payment.domain.repository;

import com.banking.core.payment.domain.entity.Payment;
import com.banking.core.payment.domain.enums.PaymentStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

/**
 * JPA repository for Payment entities.
 */
public interface PaymentRepository extends JpaRepository<Payment, UUID> {

    /**
     * Finds a payment by its unique reference code.
     *
     * @param paymentRef payment reference string
     * @return optional payment
     */
    Optional<Payment> findByPaymentRef(String paymentRef);

    /**
     * Finds a payment by its idempotency key.
     *
     * @param idempotencyKey client-supplied idempotency key
     * @return optional payment
     */
    Optional<Payment> findByIdempotencyKey(String idempotencyKey);

    /**
     * Checks if a payment reference already exists.
     *
     * @param paymentRef reference string
     * @return true if exists
     */
    boolean existsByPaymentRef(String paymentRef);

    /**
     * Finds paginated payment history for a paying account.
     *
     * @param sourceAccountId payer account UUID
     * @param pageable        pagination settings
     * @return page of payments
     */
    Page<Payment> findBySourceAccountIdOrderByCreatedAtDesc(UUID sourceAccountId, Pageable pageable);

    /**
     * Finds paginated payment history for a paying account filtered by status.
     *
     * @param sourceAccountId payer account UUID
     * @param status          payment status filter
     * @param pageable        pagination settings
     * @return page of payments
     */
    Page<Payment> findBySourceAccountIdAndStatusOrderByCreatedAtDesc(
            UUID sourceAccountId, PaymentStatus status, Pageable pageable);
}
