package com.banking.core.customer.api.dto.request;

import com.banking.core.customer.domain.enums.CustomerStatus;
import jakarta.validation.constraints.NotNull;

/**
 * Request payload for changing a customer's lifecycle status.
 */
public record UpdateCustomerStatusRequest(
        @NotNull(message = "Target customer status is required")
        CustomerStatus status
) {
}
