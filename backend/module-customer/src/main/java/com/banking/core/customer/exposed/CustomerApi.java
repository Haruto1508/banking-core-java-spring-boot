package com.banking.core.customer.exposed;

import java.util.Optional;
import java.util.UUID;

/**
 * Public API exposed by module-customer for cross-module communication.
 */
public interface CustomerApi {

    /**
     * Retrieves a customer summary by customer ID.
     *
     * @param customerId customer UUID
     * @return optional customer summary
     */
    Optional<CustomerSummaryDto> findCustomerById(UUID customerId);

    /**
     * Retrieves a customer summary by linked authentication user ID.
     *
     * @param userId user UUID
     * @return optional customer summary
     */
    Optional<CustomerSummaryDto> findCustomerByUserId(UUID userId);

    /**
     * Verifies whether a customer exists and is in ACTIVE status.
     *
     * @param customerId customer UUID
     * @return true if customer exists and is ACTIVE
     */
    boolean isCustomerActive(UUID customerId);
}
