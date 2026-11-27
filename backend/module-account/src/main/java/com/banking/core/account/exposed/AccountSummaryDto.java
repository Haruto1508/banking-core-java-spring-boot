package com.banking.core.account.exposed;

import com.banking.core.account.domain.enums.AccountStatus;
import com.banking.core.account.domain.enums.AccountType;

import java.math.BigDecimal;
import java.util.UUID;

/**
 * Cross-module DTO that exposes a compact account summary.
 * Shared with module-transaction and module-ledger so they can reference
 * accounts without importing internal entities.
 *
 * @param id            account UUID (primary key)
 * @param accountNumber human-readable account number
 * @param customerId    owning customer UUID (null for SYSTEM accounts)
 * @param accountType   SAVINGS / CURRENT / SYSTEM
 * @param currency      ISO-4217 code, e.g. "VND"
 * @param balance       current available balance (BigDecimal, 4 decimal places)
 * @param status        ACTIVE / FROZEN / CLOSED
 */
public record AccountSummaryDto(
        UUID id,
        String accountNumber,
        UUID customerId,
        AccountType accountType,
        String currency,
        BigDecimal balance,
        AccountStatus status
) {}
