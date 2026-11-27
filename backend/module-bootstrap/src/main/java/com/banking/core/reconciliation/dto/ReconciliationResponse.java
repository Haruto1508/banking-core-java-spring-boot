package com.banking.core.reconciliation.dto;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

/**
 * Response DTO for account-to-ledger reconciliation checks.
 *
 * @param accountId      target bank account UUID
 * @param accountNumber  human-readable account number
 * @param currency       ISO-4217 currency code
 * @param accountBalance current stored balance on the Account entity
 * @param ledgerBalance  net balance computed from immutable LedgerEntry records (CREDIT - DEBIT)
 * @param discrepancy    accountBalance - ledgerBalance (must be 0.0000 for a healthy ledger)
 * @param balanced       true when discrepancy is zero
 * @param checkedAt      timestamp when reconciliation was executed
 */
public record ReconciliationResponse(
        UUID accountId,
        String accountNumber,
        String currency,
        BigDecimal accountBalance,
        BigDecimal ledgerBalance,
        BigDecimal discrepancy,
        boolean balanced,
        Instant checkedAt
) {}
