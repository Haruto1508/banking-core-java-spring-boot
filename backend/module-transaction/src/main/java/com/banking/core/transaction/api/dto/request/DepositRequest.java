package com.banking.core.transaction.api.dto.request;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.util.UUID;

/**
 * Request payload for teller cash deposit into a customer bank account.
 *
 * @param accountId   target customer account UUID
 * @param amount      deposit amount (strictly greater than zero)
 * @param currency    3-letter ISO-4217 currency code
 * @param description optional teller note
 */
public record DepositRequest(

        @NotNull(message = "Account ID must not be null")
        UUID accountId,

        @NotNull(message = "Amount must not be null")
        @DecimalMin(value = "0.0001", message = "Amount must be strictly greater than zero")
        BigDecimal amount,

        @NotBlank(message = "Currency must not be blank")
        @Size(min = 3, max = 3, message = "Currency must be a 3-letter ISO-4217 code")
        @Pattern(regexp = "[A-Z]{3}", message = "Currency must consist of 3 uppercase letters")
        String currency,

        @Size(max = 255, message = "Description must not exceed 255 characters")
        String description

) {}
