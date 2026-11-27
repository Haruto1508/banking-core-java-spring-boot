package com.banking.core.payment.service;

import com.banking.core.auth.domain.enums.Role;
import com.banking.core.common.dto.PageResponse;
import com.banking.core.payment.api.dto.request.CreatePaymentRequest;
import com.banking.core.payment.api.dto.request.RefundPaymentRequest;
import com.banking.core.payment.api.dto.response.PaymentResponse;
import com.banking.core.payment.domain.enums.PaymentStatus;
import org.springframework.data.domain.Pageable;

import java.util.UUID;

/**
 * Service interface for payment processing, refunds, and payment history queries.
 */
public interface PaymentService {

    /**
     * Initiates and processes a payment from a source account to a merchant account.
     * Supports idempotency via Idempotency-Key header.
     *
     * @param request         payment details
     * @param idempotencyKey  optional idempotency key for safe retries
     * @param requesterUserId authenticated user ID
     * @param requesterRole   role of the authenticated user
     * @return completed payment details
     */
    PaymentResponse processPayment(
            CreatePaymentRequest request,
            String idempotencyKey,
            UUID requesterUserId,
            Role requesterRole);

    /**
     * Refunds a COMPLETED payment by reversing its underlying transaction.
     * Only ADMIN or STAFF may perform refunds.
     *
     * @param paymentId   payment UUID to refund
     * @param request     refund audit reason
     * @param adminUserId authenticated ADMIN/STAFF user ID
     * @return updated payment details with status REFUNDED
     */
    PaymentResponse refundPayment(UUID paymentId, RefundPaymentRequest request, UUID adminUserId);

    /**
     * Retrieves a single payment by UUID with IDOR protection for CUSTOMER role.
     *
     * @param paymentId       payment UUID
     * @param requesterUserId authenticated user ID
     * @param requesterRole   role of the authenticated user
     * @return payment details
     */
    PaymentResponse getPaymentById(UUID paymentId, UUID requesterUserId, Role requesterRole);

    /**
     * Queries paginated payment history for a source account with optional status filter.
     *
     * @param sourceAccountId payer account UUID
     * @param status          optional status filter
     * @param pageable        pagination parameters
     * @param requesterUserId authenticated user ID
     * @param requesterRole   role of the authenticated user
     * @return paginated payment history
     */
    PageResponse<PaymentResponse> getPaymentHistory(
            UUID sourceAccountId,
            PaymentStatus status,
            Pageable pageable,
            UUID requesterUserId,
            Role requesterRole);
}
