package com.banking.core.customer.exposed;

import com.banking.core.customer.domain.enums.CustomerStatus;

import java.util.UUID;

/**
 * Public DTO representing customer summary exposed to other modules (e.g., module-account).
 */
public record CustomerSummaryDto(
        UUID id,
        UUID userId,
        String customerNumber,
        String fullName,
        String email,
        CustomerStatus status
) {
}
