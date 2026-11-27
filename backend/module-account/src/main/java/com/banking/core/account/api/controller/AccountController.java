package com.banking.core.account.api.controller;

import com.banking.core.account.api.dto.request.OpenAccountRequest;
import com.banking.core.account.api.dto.response.AccountResponse;
import com.banking.core.account.service.AccountService;
import com.banking.core.auth.security.BankingUserDetails;
import com.banking.core.common.dto.ApiResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

/**
 * REST controller for bank account management endpoints.
 * Base path: /api/v1/accounts
 */
@RestController
@RequestMapping("/api/v1/accounts")
@RequiredArgsConstructor
public class AccountController {

    private final AccountService accountService;

    /**
     * Opens a new SAVINGS or CURRENT bank account for a customer.
     * Accessible by all roles; CUSTOMER role may only open accounts for themselves.
     */
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("isAuthenticated()")
    public ApiResponse<AccountResponse> openAccount(
            @Valid @RequestBody OpenAccountRequest request,
            @AuthenticationPrincipal BankingUserDetails currentUser) {

        AccountResponse response = accountService.openAccount(
                request, currentUser.getUserId(), currentUser.getRole());
        return ApiResponse.success("Account opened successfully", response);
    }

    /**
     * Retrieves full account details by account UUID.
     * CUSTOMER role can only view their own accounts.
     */
    @GetMapping("/{accountId}")
    @PreAuthorize("isAuthenticated()")
    public ApiResponse<AccountResponse> getAccountById(
            @PathVariable UUID accountId,
            @AuthenticationPrincipal BankingUserDetails currentUser) {

        AccountResponse response = accountService.getAccountById(
                accountId, currentUser.getUserId(), currentUser.getRole());
        return ApiResponse.success(response);
    }

    /**
     * Lists all accounts belonging to a specific customer.
     * CUSTOMER role can only list their own accounts.
     */
    @GetMapping("/customer/{customerId}")
    @PreAuthorize("isAuthenticated()")
    public ApiResponse<List<AccountResponse>> getAccountsByCustomer(
            @PathVariable UUID customerId,
            @AuthenticationPrincipal BankingUserDetails currentUser) {

        List<AccountResponse> accounts = accountService.getAccountsByCustomer(
                customerId, currentUser.getUserId(), currentUser.getRole());
        return ApiResponse.success(accounts);
    }

    /**
     * Returns the current balance of an account.
     * CUSTOMER role can only check their own account balance.
     */
    @GetMapping("/{accountId}/balance")
    @PreAuthorize("isAuthenticated()")
    public ApiResponse<AccountResponse> getBalance(
            @PathVariable UUID accountId,
            @AuthenticationPrincipal BankingUserDetails currentUser) {

        AccountResponse response = accountService.getBalance(
                accountId, currentUser.getUserId(), currentUser.getRole());
        return ApiResponse.success(response);
    }

    /**
     * Resolves bank account details by human-readable account number.
     * Used for beneficiary / recipient lookup during money transfers and QR checkout.
     */
    @GetMapping("/lookup/{accountNumber}")
    @PreAuthorize("isAuthenticated()")
    public ApiResponse<AccountResponse> lookupByAccountNumber(@PathVariable String accountNumber) {
        AccountResponse response = accountService.lookupByAccountNumber(accountNumber);
        return ApiResponse.success("Account found", response);
    }

    /**
     * Freezes an ACTIVE account. Only ADMIN and STAFF may freeze accounts.
     */
    @PatchMapping("/{accountId}/freeze")
    @PreAuthorize("hasAnyRole('ADMIN', 'STAFF')")
    public ApiResponse<AccountResponse> freezeAccount(@PathVariable UUID accountId) {
        AccountResponse response = accountService.freezeAccount(accountId);
        return ApiResponse.success("Account frozen successfully", response);
    }

    /**
     * Unfreezes a FROZEN account. Only ADMIN and STAFF may unfreeze accounts.
     */
    @PatchMapping("/{accountId}/unfreeze")
    @PreAuthorize("hasAnyRole('ADMIN', 'STAFF')")
    public ApiResponse<AccountResponse> unfreezeAccount(@PathVariable UUID accountId) {
        AccountResponse response = accountService.unfreezeAccount(accountId);
        return ApiResponse.success("Account unfrozen successfully", response);
    }

    /**
     * Permanently closes an account. Balance must be zero. Only ADMIN may close accounts.
     */
    @PatchMapping("/{accountId}/close")
    @PreAuthorize("hasRole('ADMIN')")
    public ApiResponse<AccountResponse> closeAccount(@PathVariable UUID accountId) {
        AccountResponse response = accountService.closeAccount(accountId);
        return ApiResponse.success("Account closed successfully", response);
    }

    /**
     * Lists all bank accounts with optional status filter and pagination.
     * Accessible by ADMIN and STAFF roles.
     */
    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'STAFF')")
    public ApiResponse<Page<AccountResponse>> getAllAccounts(
            @RequestParam(value = "page", defaultValue = "0") int page,
            @RequestParam(value = "size", defaultValue = "50") int size,
            @RequestParam(value = "status", required = false) String status) {

        PageRequest pageRequest = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));
        Page<AccountResponse> result = accountService.getAllAccounts(status, pageRequest);
        return ApiResponse.success("Accounts retrieved successfully", result);
    }
}
