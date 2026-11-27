package com.banking.core.payment.api.controller;

import com.banking.core.auth.security.BankingUserDetails;
import com.banking.core.common.dto.ApiResponse;
import com.banking.core.common.dto.PageResponse;
import com.banking.core.payment.api.dto.request.CreatePaymentRequest;
import com.banking.core.payment.api.dto.request.RefundPaymentRequest;
import com.banking.core.payment.api.dto.response.PaymentResponse;
import com.banking.core.payment.domain.enums.PaymentStatus;
import com.banking.core.payment.service.PaymentService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

/**
 * REST controller for payment processing, refunds, and payment history.
 * Base path: /api/v1/payments
 */
@RestController
@RequestMapping("/api/v1/payments")
@RequiredArgsConstructor
public class PaymentController {

    private final PaymentService paymentService;

    /**
     * Initiates and processes a payment from a customer account to a merchant account.
     * Supports Idempotency-Key header to safely handle retries without duplicate charges.
     */
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("isAuthenticated()")
    public ApiResponse<PaymentResponse> processPayment(
            @Valid @RequestBody CreatePaymentRequest request,
            @RequestHeader(value = "Idempotency-Key", required = false) String idempotencyKey,
            @AuthenticationPrincipal BankingUserDetails currentUser) {

        PaymentResponse response = paymentService.processPayment(
                request, idempotencyKey, currentUser.getUserId(), currentUser.getRole());
        return ApiResponse.success("Payment processed successfully", response);
    }

    /**
     * Refunds a COMPLETED payment. Only ADMIN or STAFF may perform refunds.
     */
    @PostMapping("/{paymentId}/refund")
    @ResponseStatus(HttpStatus.OK)
    @PreAuthorize("hasAnyRole('ADMIN', 'STAFF')")
    public ApiResponse<PaymentResponse> refundPayment(
            @PathVariable UUID paymentId,
            @Valid @RequestBody RefundPaymentRequest request,
            @AuthenticationPrincipal BankingUserDetails currentUser) {

        PaymentResponse response = paymentService.refundPayment(paymentId, request, currentUser.getUserId());
        return ApiResponse.success("Payment refunded successfully", response);
    }

    /**
     * Retrieves details of a single payment. CUSTOMER role may only view their own payments.
     */
    @GetMapping("/{paymentId}")
    @PreAuthorize("isAuthenticated()")
    public ApiResponse<PaymentResponse> getPaymentById(
            @PathVariable UUID paymentId,
            @AuthenticationPrincipal BankingUserDetails currentUser) {

        PaymentResponse response = paymentService.getPaymentById(
                paymentId, currentUser.getUserId(), currentUser.getRole());
        return ApiResponse.success(response);
    }

    /**
     * Queries paginated payment history for a paying account with optional status filter.
     * CUSTOMER role may only query their own accounts.
     */
    @GetMapping("/account/{accountId}")
    @PreAuthorize("isAuthenticated()")
    public ApiResponse<PageResponse<PaymentResponse>> getPaymentHistory(
            @PathVariable UUID accountId,
            @RequestParam(required = false) PaymentStatus status,
            @PageableDefault(size = 20) Pageable pageable,
            @AuthenticationPrincipal BankingUserDetails currentUser) {

        PageResponse<PaymentResponse> history = paymentService.getPaymentHistory(
                accountId, status, pageable, currentUser.getUserId(), currentUser.getRole());
        return ApiResponse.success(history);
    }
}
