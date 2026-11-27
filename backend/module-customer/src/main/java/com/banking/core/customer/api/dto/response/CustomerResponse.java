package com.banking.core.customer.api.dto.response;

import com.banking.core.customer.domain.enums.CustomerStatus;

import java.time.Instant;
import java.util.UUID;

/**
 * Response DTO representing full customer profile details.
 */
public record CustomerResponse(
        UUID id,
        UUID userId,
        String customerNumber,
        String fullName,
        String identityNumber,
        String phoneNumber,
        String email,
        CustomerStatus status,
        Instant createdAt,
        Instant updatedAt
) {
}
