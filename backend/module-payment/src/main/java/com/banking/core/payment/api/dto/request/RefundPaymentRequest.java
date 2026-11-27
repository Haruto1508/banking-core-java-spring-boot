package com.banking.core.payment.api.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * Request payload for refunding a completed payment.
 *
 * @param reason mandatory audit reason for the refund
 */
public record RefundPaymentRequest(

        @NotBlank(message = "Refund reason must not be blank")
        @Size(max = 255, message = "Reason must not exceed 255 characters")
        String reason

) {}
