package com.banking.core.transaction.api.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * Request payload for reversing a committed financial transaction.
 *
 * @param reason mandatory audit reason for the reversal
 */
public record ReverseTransactionRequest(

        @NotBlank(message = "Reversal reason must not be blank")
        @Size(max = 255, message = "Reason must not exceed 255 characters")
        String reason

) {}
