package com.banking.core.transaction.api.controller;

import com.banking.core.auth.security.BankingUserDetails;
import com.banking.core.common.dto.ApiResponse;
import com.banking.core.common.dto.PageResponse;
import com.banking.core.transaction.api.dto.request.DepositRequest;
import com.banking.core.transaction.api.dto.request.ReverseTransactionRequest;
import com.banking.core.transaction.api.dto.request.TransferRequest;
import com.banking.core.transaction.api.dto.request.WithdrawalRequest;
import com.banking.core.transaction.api.dto.response.TransactionResponse;
import com.banking.core.transaction.domain.enums.TransactionStatus;
import com.banking.core.transaction.domain.enums.TransactionType;
import com.banking.core.transaction.service.TransactionService;
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
 * REST controller for financial transactions: Deposit, Withdrawal, Transfer, Reversal, and History.
 * Base path: /api/v1/transactions
 */
@RestController
@RequestMapping("/api/v1/transactions")
@RequiredArgsConstructor
public class TransactionController {

    private final TransactionService transactionService;

    /**
     * Teller cash deposit into a customer account. Only STAFF and ADMIN may perform deposits.
     */
    @PostMapping("/deposit")
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasAnyRole('STAFF', 'ADMIN')")
    public ApiResponse<TransactionResponse> deposit(
            @Valid @RequestBody DepositRequest request,
            @AuthenticationPrincipal BankingUserDetails currentUser) {

        TransactionResponse response = transactionService.deposit(request, currentUser.getUserId());
        return ApiResponse.success("Deposit completed successfully", response);
    }

    /**
     * Teller cash withdrawal from a customer account. Only STAFF and ADMIN may perform withdrawals.
     */
    @PostMapping("/withdraw")
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasAnyRole('STAFF', 'ADMIN')")
    public ApiResponse<TransactionResponse> withdraw(
            @Valid @RequestBody WithdrawalRequest request,
            @AuthenticationPrincipal BankingUserDetails currentUser) {

        TransactionResponse response = transactionService.withdraw(request, currentUser.getUserId());
        return ApiResponse.success("Withdrawal completed successfully", response);
    }

    /**
     * Internal fund transfer between two bank accounts.
     * Supports Idempotency-Key header for safe retries without duplicate postings.
     */
    @PostMapping("/transfer")
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("isAuthenticated()")
    public ApiResponse<TransactionResponse> transfer(
            @Valid @RequestBody TransferRequest request,
            @RequestHeader(value = "Idempotency-Key", required = false) String idempotencyKey,
            @AuthenticationPrincipal BankingUserDetails currentUser) {

        TransactionResponse response = transactionService.transfer(
                request, idempotencyKey, currentUser.getUserId(), currentUser.getRole());
        return ApiResponse.success("Transfer completed successfully", response);
    }

    /**
     * Reverses a committed SUCCESS transaction. Only ADMIN may perform reversals.
     */
    @PostMapping("/{transactionId}/reverse")
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasRole('ADMIN')")
    public ApiResponse<TransactionResponse> reverseTransaction(
            @PathVariable UUID transactionId,
            @Valid @RequestBody ReverseTransactionRequest request,
            @AuthenticationPrincipal BankingUserDetails currentUser) {

        TransactionResponse response = transactionService.reverse(transactionId, request, currentUser.getUserId());
        return ApiResponse.success("Transaction reversed successfully", response);
    }

    /**
     * Retrieves details of a single transaction. CUSTOMER role may only view their own transactions.
     */
    @GetMapping("/{transactionId}")
    @PreAuthorize("isAuthenticated()")
    public ApiResponse<TransactionResponse> getTransactionById(
            @PathVariable UUID transactionId,
            @AuthenticationPrincipal BankingUserDetails currentUser) {

        TransactionResponse response = transactionService.getTransactionById(
                transactionId, currentUser.getUserId(), currentUser.getRole());
        return ApiResponse.success(response);
    }

    /**
     * Queries paginated transaction history for an account with optional type and status filters.
     * CUSTOMER role may only query accounts they own.
     */
    @GetMapping("/account/{accountId}")
    @PreAuthorize("isAuthenticated()")
    public ApiResponse<PageResponse<TransactionResponse>> getTransactionHistory(
            @PathVariable UUID accountId,
            @RequestParam(required = false) TransactionType type,
            @RequestParam(required = false) TransactionStatus status,
            @PageableDefault(size = 20) Pageable pageable,
            @AuthenticationPrincipal BankingUserDetails currentUser) {

        PageResponse<TransactionResponse> history = transactionService.getTransactionHistory(
                accountId, type, status, pageable, currentUser.getUserId(), currentUser.getRole());
        return ApiResponse.success(history);
    }
}
