package com.banking.core.account.api.dto.request;

import com.banking.core.account.domain.enums.AccountType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/**
 * Request payload for opening a new bank account.
 *
 * @param customerId    UUID string of the owning customer
 * @param accountType   SAVINGS or CURRENT (SYSTEM is reserved)
 * @param currency      ISO-4217 currency code, e.g. "VND" or "USD"
 */
public record OpenAccountRequest(

        @NotBlank(message = "Customer ID must not be blank")
        String customerId,

        @NotNull(message = "Account type must not be null")
        AccountType accountType,

        @NotBlank(message = "Currency must not be blank")
        @Size(min = 3, max = 3, message = "Currency must be a 3-letter ISO-4217 code")
        @Pattern(regexp = "[A-Z]{3}", message = "Currency must consist of 3 uppercase letters")
        String currency

) {}
