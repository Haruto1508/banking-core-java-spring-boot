package com.banking.core.customer.service;

import com.banking.core.auth.domain.enums.Role;
import com.banking.core.common.dto.PageResponse;
import com.banking.core.customer.api.dto.request.CreateCustomerRequest;
import com.banking.core.customer.api.dto.request.UpdateCustomerRequest;
import com.banking.core.customer.api.dto.request.UpdateCustomerStatusRequest;
import com.banking.core.customer.api.dto.response.CustomerResponse;
import com.banking.core.customer.domain.enums.CustomerStatus;
import org.springframework.data.domain.Pageable;

import java.util.UUID;

/**
 * Application service interface for customer onboarding, retrieval, search, and lifecycle management.
 */
public interface CustomerService {

    /**
     * Creates a new customer profile after validating identity uniqueness and user linkage.
     *
     * @param request          customer creation details
     * @param requesterUserId  authenticated user ID
     * @param requesterRole    authenticated user role
     * @return created customer profile
     */
    CustomerResponse createCustomer(CreateCustomerRequest request, UUID requesterUserId, Role requesterRole);

    /**
     * Retrieves a customer profile by ID, enforcing ownership checks for CUSTOMER role.
     *
     * @param customerId       target customer UUID
     * @param requesterUserId  authenticated user ID
     * @param requesterRole    authenticated user role
     * @return customer profile details
     */
    CustomerResponse getCustomerById(UUID customerId, UUID requesterUserId, Role requesterRole);

    /**
     * Retrieves the customer profile linked to the currently authenticated user.
     *
     * @param requesterUserId authenticated user ID
     * @return customer profile details
     */
    CustomerResponse getMyCustomerProfile(UUID requesterUserId);

    /**
     * Updates mutable customer information (name, phone, email), enforcing ownership checks.
     *
     * @param customerId       target customer UUID
     * @param request          updated contact details
     * @param requesterUserId  authenticated user ID
     * @param requesterRole    authenticated user role
     * @return updated customer profile
     */
    CustomerResponse updateCustomer(
            UUID customerId,
            UpdateCustomerRequest request,
            UUID requesterUserId,
            Role requesterRole
    );

    /**
     * Searches customers by optional keyword and status with pagination.
     *
     * @param keyword  search text matching name, CIF, identity, email, or phone
     * @param status   optional status filter
     * @param pageable pagination and sorting parameters
     * @return paginated customer responses
     */
    PageResponse<CustomerResponse> searchCustomers(String keyword, CustomerStatus status, Pageable pageable);

    /**
     * Updates a customer's lifecycle status (ACTIVE, SUSPENDED, CLOSED).
     *
     * @param customerId target customer UUID
     * @param request    new status payload
     * @return updated customer profile
     */
    CustomerResponse updateCustomerStatus(UUID customerId, UpdateCustomerStatusRequest request);
}
