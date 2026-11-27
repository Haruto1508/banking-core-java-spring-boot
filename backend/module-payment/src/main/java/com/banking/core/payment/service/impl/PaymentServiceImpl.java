package com.banking.core.payment.service.impl;

import com.banking.core.account.exposed.AccountApi;
import com.banking.core.account.exposed.AccountSummaryDto;
import com.banking.core.auth.domain.enums.Role;
import com.banking.core.common.dto.PageResponse;
import com.banking.core.common.exception.ErrorCode;
import com.banking.core.common.exception.ResourceNotFoundException;
import com.banking.core.customer.exposed.CustomerApi;
import com.banking.core.customer.exposed.CustomerSummaryDto;
import com.banking.core.payment.api.dto.request.CreatePaymentRequest;
import com.banking.core.payment.api.dto.request.RefundPaymentRequest;
import com.banking.core.payment.api.dto.response.PaymentResponse;
import com.banking.core.payment.domain.entity.Payment;
import com.banking.core.payment.domain.enums.PaymentStatus;
import com.banking.core.payment.domain.exception.PaymentException;
import com.banking.core.payment.domain.repository.PaymentRepository;
import com.banking.core.payment.service.PaymentService;
import com.banking.core.transaction.exposed.TransactionApi;
import com.banking.core.transaction.exposed.TransactionSummaryDto;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.Optional;
import java.util.UUID;

/**
 * Implementation of PaymentService.
 * Orchestrates payment lifecycle while delegating core fund movement to TransactionApi.
 */
@Service
@RequiredArgsConstructor
public class PaymentServiceImpl implements PaymentService {

    private static final Logger log = LoggerFactory.getLogger(PaymentServiceImpl.class);
    private static final SecureRandom RANDOM_GENERATOR = new SecureRandom();
    private static final DateTimeFormatter PAY_DATE_FORMAT = DateTimeFormatter.ofPattern("yyyyMMdd");

    private final PaymentRepository paymentRepository;
    private final AccountApi accountApi;
    private final CustomerApi customerApi;
    private final TransactionApi transactionApi;

    /**
     * Creates a payment order and executes the underlying transfer via TransactionApi.
     * Enforces idempotency if an idempotencyKey is provided, and enforces IDOR protection
     * so CUSTOMER users can only pay from their own accounts.
     */
    @Override
    @Transactional
    public PaymentResponse processPayment(
            CreatePaymentRequest request,
            String idempotencyKey,
            UUID requesterUserId,
            Role requesterRole) {

        if (idempotencyKey != null && !idempotencyKey.isBlank()) {
            Optional<Payment> existingPayment = paymentRepository.findByIdempotencyKey(idempotencyKey);
            if (existingPayment.isPresent()) {
                log.info("Returning existing idempotent payment for key={}", idempotencyKey);
                return mapToResponse(existingPayment.get());
            }
        }

        if (request.sourceAccountId().equals(request.merchantAccountId())) {
            throw new PaymentException(ErrorCode.SAME_ACCOUNT_TRANSFER,
                    "Source account and merchant account must be different");
        }

        // Verify ownership if caller has CUSTOMER role
        AccountSummaryDto sourceAccount = accountApi.findAccountById(request.sourceAccountId())
                .orElseThrow(() -> new ResourceNotFoundException(
                        ErrorCode.ACCOUNT_NOT_FOUND, "Source account not found: " + request.sourceAccountId()));

        if (requesterRole == Role.CUSTOMER) {
            verifyAccountOwnershipForCustomer(sourceAccount, requesterUserId);
        }

        String paymentReference = generateUniquePaymentRef();
        String normalizedCurrency = request.currency().toUpperCase();

        Payment payment = Payment.builder()
                .paymentRef(paymentReference)
                .idempotencyKey((idempotencyKey != null && !idempotencyKey.isBlank()) ? idempotencyKey : null)
                .sourceAccountId(request.sourceAccountId())
                .merchantAccountId(request.merchantAccountId())
                .amount(request.amount())
                .currency(normalizedCurrency)
                .paymentMethod(request.paymentMethod())
                .status(PaymentStatus.PENDING)
                .description(request.description() != null ? request.description() : "Merchant Payment")
                .build();

        Payment savedPayment = paymentRepository.save(payment);

        // Execute the underlying transfer through TransactionApi
        String txnIdempotencyKey = (idempotencyKey != null && !idempotencyKey.isBlank())
                ? "PAY-" + idempotencyKey
                : null;

        TransactionSummaryDto transactionSummary = transactionApi.executeInternalTransfer(
                request.sourceAccountId(),
                request.merchantAccountId(),
                request.amount(),
                normalizedCurrency,
                "Payment " + paymentReference + ": " + savedPayment.getDescription(),
                txnIdempotencyKey
        );

        savedPayment.markCompleted(transactionSummary.id());
        Payment completedPayment = paymentRepository.save(savedPayment);

        log.info("Payment completed successfully: paymentRef={}, txnId={}",
                paymentReference, transactionSummary.id());

        return mapToResponse(completedPayment);
    }

    /**
     * Refunds a COMPLETED payment by reversing its underlying transaction in TransactionApi.
     */
    @Override
    @Transactional
    public PaymentResponse refundPayment(UUID paymentId, RefundPaymentRequest request, UUID staffUserId) {
        Payment payment = paymentRepository.findById(paymentId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        ErrorCode.RESOURCE_NOT_FOUND, "Payment not found: " + paymentId));

        if (payment.getStatus() != PaymentStatus.COMPLETED || payment.getTransactionId() == null) {
            throw new PaymentException(ErrorCode.INVALID_REQUEST_PAYLOAD,
                    "Only COMPLETED payments with a valid transaction can be refunded");
        }

        // Reverse the underlying financial transaction
        transactionApi.reverseTransaction(payment.getTransactionId(), "Payment refund: " + request.reason());

        payment.markRefunded();
        Payment refundedPayment = paymentRepository.save(payment);

        log.info("Payment refunded successfully: paymentRef={}, staffUserId={}",
                refundedPayment.getPaymentRef(), staffUserId);

        return mapToResponse(refundedPayment);
    }

    /**
     * Retrieves payment details by ID with IDOR check for CUSTOMER role.
     */
    @Override
    @Transactional(readOnly = true)
    public PaymentResponse getPaymentById(UUID paymentId, UUID requesterUserId, Role requesterRole) {
        Payment payment = paymentRepository.findById(paymentId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        ErrorCode.RESOURCE_NOT_FOUND, "Payment not found: " + paymentId));

        if (requesterRole == Role.CUSTOMER) {
            AccountSummaryDto sourceAccount = accountApi.findAccountById(payment.getSourceAccountId())
                    .orElseThrow(() -> new ResourceNotFoundException(ErrorCode.ACCOUNT_NOT_FOUND, "Source account not found"));
            verifyAccountOwnershipForCustomer(sourceAccount, requesterUserId);
        }

        return mapToResponse(payment);
    }

    /**
     * Queries paginated payment history for a given source account.
     */
    @Override
    @Transactional(readOnly = true)
    public PageResponse<PaymentResponse> getPaymentHistory(
            UUID sourceAccountId,
            PaymentStatus status,
            Pageable pageable,
            UUID requesterUserId,
            Role requesterRole) {

        AccountSummaryDto sourceAccount = accountApi.findAccountById(sourceAccountId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        ErrorCode.ACCOUNT_NOT_FOUND, "Account not found: " + sourceAccountId));

        if (requesterRole == Role.CUSTOMER) {
            verifyAccountOwnershipForCustomer(sourceAccount, requesterUserId);
        }

        Page<Payment> paymentPage = (status == null)
                ? paymentRepository.findBySourceAccountIdOrderByCreatedAtDesc(sourceAccountId, pageable)
                : paymentRepository.findBySourceAccountIdAndStatusOrderByCreatedAtDesc(sourceAccountId, status, pageable);

        return PageResponse.from(paymentPage.map(this::mapToResponse));
    }

    // =========================================================================
    // Private helpers
    // =========================================================================

    private void verifyAccountOwnershipForCustomer(AccountSummaryDto account, UUID requesterUserId) {
        CustomerSummaryDto ownCustomer = customerApi.findCustomerByUserId(requesterUserId)
                .orElseThrow(() -> new AccessDeniedException("No customer profile linked to current user"));
        if (!ownCustomer.id().equals(account.customerId())) {
            throw new AccessDeniedException("Customers can only operate on their own payments/accounts");
        }
    }

    private String generateUniquePaymentRef() {
        String datePart = LocalDate.now().format(PAY_DATE_FORMAT);
        for (int attempt = 0; attempt < 5; attempt++) {
            int randomSuffix = 100000 + RANDOM_GENERATOR.nextInt(900000);
            String candidate = "PAY-" + datePart + "-" + randomSuffix;
            if (!paymentRepository.existsByPaymentRef(candidate)) {
                return candidate;
            }
        }
        return "PAY-" + datePart + "-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
    }

    private PaymentResponse mapToResponse(Payment payment) {
        return new PaymentResponse(
                payment.getId(),
                payment.getPaymentRef(),
                payment.getIdempotencyKey(),
                payment.getSourceAccountId(),
                payment.getMerchantAccountId(),
                payment.getTransactionId(),
                payment.getAmount(),
                payment.getCurrency(),
                payment.getPaymentMethod(),
                payment.getStatus(),
                payment.getDescription(),
                payment.getCreatedAt(),
                payment.getUpdatedAt()
        );
    }
}
