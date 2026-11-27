package com.banking.core.account.api.dto.response;

import com.banking.core.account.domain.enums.AccountStatus;
import com.banking.core.account.domain.enums.AccountType;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

/**
 * Response DTO returned for account-related API endpoints.
 *
 * @param id            account UUID
 * @param customerId    owning customer UUID (null for SYSTEM accounts)
 * @param accountNumber human-readable account number
 * @param accountType   SAVINGS / CURRENT / SYSTEM
 * @param currency      ISO-4217 currency code
 * @param balance       current available balance
 * @param status        ACTIVE / FROZEN / CLOSED
 * @param createdAt     account opening timestamp
 * @param updatedAt     last modification timestamp
 */
public record AccountResponse(
        UUID id,
        UUID customerId,
        String accountNumber,
        AccountType accountType,
        String currency,
        BigDecimal balance,
        AccountStatus status,
        Instant createdAt,
        Instant updatedAt
) {}
