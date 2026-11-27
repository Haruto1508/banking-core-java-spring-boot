package com.banking.core.payment.api.dto.request;

import com.banking.core.payment.domain.enums.PaymentMethod;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.util.UUID;

/**
 * Request payload for creating and executing a payment.
 *
 * @param sourceAccountId   payer's bank account UUID
 * @param merchantAccountId merchant/biller's bank account UUID
 * @param amount            payment amount (strictly greater than zero)
 * @param currency          3-letter ISO-4217 currency code
 * @param paymentMethod     payment channel (INTERNAL_ACCOUNT, BILL_PAYMENT, QR_CODE)
 * @param description       optional payment note or bill reference
 */
public record CreatePaymentRequest(

        @NotNull(message = "Source account ID must not be null")
        UUID sourceAccountId,

        @NotNull(message = "Merchant account ID must not be null")
        UUID merchantAccountId,

        @NotNull(message = "Amount must not be null")
        @DecimalMin(value = "0.0001", message = "Amount must be strictly greater than zero")
        BigDecimal amount,

        @NotBlank(message = "Currency must not be blank")
        @Size(min = 3, max = 3, message = "Currency must be a 3-letter ISO-4217 code")
        @Pattern(regexp = "[A-Z]{3}", message = "Currency must consist of 3 uppercase letters")
        String currency,

        @NotNull(message = "Payment method must not be null")
        PaymentMethod paymentMethod,

        @Size(max = 255, message = "Description must not exceed 255 characters")
        String description

) {}
