package com.banking.core.customer.service.impl;

import com.banking.core.auth.domain.enums.Role;
import com.banking.core.auth.exposed.AuthApi;
import com.banking.core.common.dto.PageResponse;
import com.banking.core.common.exception.ErrorCode;
import com.banking.core.common.exception.ResourceNotFoundException;
import com.banking.core.customer.api.dto.request.CreateCustomerRequest;
import com.banking.core.customer.api.dto.request.UpdateCustomerRequest;
import com.banking.core.customer.api.dto.request.UpdateCustomerStatusRequest;
import com.banking.core.customer.api.dto.response.CustomerResponse;
import com.banking.core.customer.domain.entity.Customer;
import com.banking.core.customer.domain.enums.CustomerStatus;
import com.banking.core.customer.domain.exception.CustomerException;
import com.banking.core.customer.domain.repository.CustomerRepository;
import com.banking.core.customer.service.CustomerService;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.Optional;
import java.util.UUID;

/**
 * Implementation of CustomerService handling customer onboarding, profile updates, and search.
 */
@Service
@RequiredArgsConstructor
public class CustomerServiceImpl implements CustomerService {

    private static final Logger log = LoggerFactory.getLogger(CustomerServiceImpl.class);
    private static final SecureRandom RANDOM_GENERATOR = new SecureRandom();
    private static final DateTimeFormatter CIF_DATE_FORMAT = DateTimeFormatter.ofPattern("yyyyMMdd");

    private final CustomerRepository customerRepository;
    private final AuthApi authApi;

    /**
     * Validates identity uniqueness, resolves user linkage based on requester role,
     * generates a unique CIF number, and persists the customer profile.
     */
    @Override
    @Transactional
    public CustomerResponse createCustomer(CreateCustomerRequest request, UUID requesterUserId, Role requesterRole) {
        String normalizedIdentity = request.identityNumber().trim();
        if (customerRepository.existsByIdentityNumber(normalizedIdentity)) {
            throw new CustomerException(ErrorCode.CUSTOMER_ALREADY_EXISTS, "Identity number is already registered");
        }

        UUID targetUserId = resolveTargetUserId(request.userId(), requesterUserId, requesterRole);
        if (targetUserId != null && customerRepository.existsByUserId(targetUserId)) {
            throw new CustomerException(ErrorCode.CUSTOMER_ALREADY_LINKED);
        }

        String generatedCifNumber = generateUniqueCustomerNumber();

        Customer newCustomer = Customer.builder()
                .userId(targetUserId)
                .customerNumber(generatedCifNumber)
                .fullName(request.fullName().trim())
                .identityNumber(normalizedIdentity)
                .phoneNumber(request.phoneNumber().trim())
                .email(request.email().trim().toLowerCase())
                .status(CustomerStatus.ACTIVE)
                .build();

        Customer savedCustomer = customerRepository.save(newCustomer);
        log.info("Created customer profile id={} cif={}", savedCustomer.getId(), savedCustomer.getCustomerNumber());

        return mapToCustomerResponse(savedCustomer);
    }

    /**
     * Fetches a customer by ID after verifying ownership when caller has CUSTOMER role.
     */
    @Override
    @Transactional(readOnly = true)
    public CustomerResponse getCustomerById(UUID customerId, UUID requesterUserId, Role requesterRole) {
        Customer existingCustomer = findCustomerEntityOrThrow(customerId);
        verifyOwnershipIfCustomerRole(existingCustomer, requesterUserId, requesterRole);
        return mapToCustomerResponse(existingCustomer);
    }

    /**
     * Fetches the customer profile associated with the authenticated user ID.
     */
    @Override
    @Transactional(readOnly = true)
    public CustomerResponse getMyCustomerProfile(UUID requesterUserId) {
        Customer linkedCustomer = customerRepository.findByUserId(requesterUserId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        ErrorCode.CUSTOMER_NOT_FOUND,
                        "No customer profile is linked to the current user"
                ));
        return mapToCustomerResponse(linkedCustomer);
    }

    /**
     * Updates mutable contact fields (fullName, phoneNumber, email) after ownership verification.
     */
    @Override
    @Transactional
    public CustomerResponse updateCustomer(
            UUID customerId,
            UpdateCustomerRequest request,
            UUID requesterUserId,
            Role requesterRole) {
        Customer existingCustomer = findCustomerEntityOrThrow(customerId);
        verifyOwnershipIfCustomerRole(existingCustomer, requesterUserId, requesterRole);

        existingCustomer.updateContactInfo(
                request.fullName().trim(),
                request.phoneNumber().trim(),
                request.email().trim().toLowerCase()
        );

        Customer updatedCustomer = customerRepository.save(existingCustomer);
        log.info("Updated customer profile id={}", updatedCustomer.getId());

        return mapToCustomerResponse(updatedCustomer);
    }

    /**
     * Searches customer profiles using optional keyword and status filters with pagination.
     */
    @Override
    @Transactional(readOnly = true)
    public PageResponse<CustomerResponse> searchCustomers(String keyword, CustomerStatus status, Pageable pageable) {
        String trimmedKeyword = keyword != null ? keyword.trim() : null;
        Page<CustomerResponse> customerPage = customerRepository
                .searchCustomers(trimmedKeyword, status, pageable)
                .map(this::mapToCustomerResponse);
        return PageResponse.from(customerPage);
    }

    /**
     * Transitions a customer profile to a new status (ACTIVE, SUSPENDED, CLOSED).
     */
    @Override
    @Transactional
    public CustomerResponse updateCustomerStatus(UUID customerId, UpdateCustomerStatusRequest request) {
        Customer existingCustomer = findCustomerEntityOrThrow(customerId);
        existingCustomer.changeStatus(request.status());

        Customer updatedCustomer = customerRepository.save(existingCustomer);
        log.info("Changed customer id={} status to {}", updatedCustomer.getId(), updatedCustomer.getStatus());

        return mapToCustomerResponse(updatedCustomer);
    }

    private UUID resolveTargetUserId(UUID requestedUserId, UUID requesterUserId, Role requesterRole) {
        if (requesterRole == Role.CUSTOMER) {
            return requesterUserId;
        }
        if (requestedUserId != null && !authApi.existsById(requestedUserId)) {
            throw new ResourceNotFoundException(ErrorCode.USER_NOT_FOUND, "Linked user account does not exist");
        }
        return requestedUserId;
    }

    private void verifyOwnershipIfCustomerRole(Customer customer, UUID requesterUserId, Role requesterRole) {
        if (requesterRole == Role.CUSTOMER) {
            if (customer.getUserId() == null || !customer.getUserId().equals(requesterUserId)) {
                throw new AccessDeniedException("Customers can only access or modify their own profile");
            }
        }
    }

    private Customer findCustomerEntityOrThrow(UUID customerId) {
        return customerRepository.findById(customerId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        ErrorCode.CUSTOMER_NOT_FOUND, "Customer not found with id: " + customerId));
    }

    private String generateUniqueCustomerNumber() {
        String datePart = LocalDate.now().format(CIF_DATE_FORMAT);
        int randomSuffix = 100000 + RANDOM_GENERATOR.nextInt(900000);
        return "CIF-" + datePart + "-" + randomSuffix;
    }

    private CustomerResponse mapToCustomerResponse(Customer customer) {
        return new CustomerResponse(
                customer.getId(),
                customer.getUserId(),
                customer.getCustomerNumber(),
                customer.getFullName(),
                customer.getIdentityNumber(),
                customer.getPhoneNumber(),
                customer.getEmail(),
                customer.getStatus(),
                customer.getCreatedAt(),
                customer.getUpdatedAt()
        );
    }
}
