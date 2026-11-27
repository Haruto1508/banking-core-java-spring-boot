package com.banking.core.customer.api.dto.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.util.UUID;

/**
 * Request payload for creating a new customer profile (CIF).
 */
public record CreateCustomerRequest(
        UUID userId,

        @NotBlank(message = "Full name is required")
        @Size(min = 2, max = 150, message = "Full name must be between 2 and 150 characters")
        String fullName,

        @NotBlank(message = "Identity number is required")
        @Size(min = 5, max = 50, message = "Identity number must be between 5 and 50 characters")
        String identityNumber,

        @NotBlank(message = "Phone number is required")
        @Pattern(regexp = "^[+]?[0-9\\-\\s]{7,20}$", message = "Phone number format is invalid")
        String phoneNumber,

        @NotBlank(message = "Email is required")
        @Email(message = "Email must be valid")
        @Size(max = 100, message = "Email must not exceed 100 characters")
        String email
) {
}
