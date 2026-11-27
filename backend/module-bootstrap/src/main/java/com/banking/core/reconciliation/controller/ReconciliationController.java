package com.banking.core.reconciliation.controller;

import com.banking.core.account.exposed.AccountApi;
import com.banking.core.account.exposed.AccountSummaryDto;
import com.banking.core.common.dto.ApiResponse;
import com.banking.core.common.exception.ErrorCode;
import com.banking.core.common.exception.ResourceNotFoundException;
import com.banking.core.ledger.exposed.LedgerApi;
import com.banking.core.reconciliation.dto.ReconciliationResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

/**
 * Administrative endpoint for reconciling an account's stored balance
 * against its immutable double-entry ledger history.
 * Base path: /api/v1/reconciliation
 */
@RestController
@RequestMapping("/api/v1/reconciliation")
@RequiredArgsConstructor
public class ReconciliationController {

    private final AccountApi accountApi;
    private final LedgerApi ledgerApi;

    /**
     * Compares the account's current balance against SUM(CREDIT) - SUM(DEBIT) in the ledger.
     * Restricted to ADMIN role.
     *
     * @param accountId account UUID to reconcile
     * @return reconciliation report showing whether the account is balanced
     */
    @GetMapping("/accounts/{accountId}")
    @PreAuthorize("hasRole('ADMIN')")
    public ApiResponse<ReconciliationResponse> reconcileAccount(@PathVariable UUID accountId) {
        AccountSummaryDto account = accountApi.findAccountById(accountId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        ErrorCode.ACCOUNT_NOT_FOUND, "Account not found: " + accountId));

        BigDecimal ledgerBalance = ledgerApi.calculateLedgerBalance(accountId);
        BigDecimal discrepancy = account.balance().subtract(ledgerBalance);
        boolean isBalanced = discrepancy.compareTo(BigDecimal.ZERO) == 0;

        ReconciliationResponse response = new ReconciliationResponse(
                account.id(),
                account.accountNumber(),
                account.currency(),
                account.balance(),
                ledgerBalance,
                discrepancy,
                isBalanced,
                Instant.now()
        );

        return ApiResponse.success("Reconciliation completed", response);
    }
}
