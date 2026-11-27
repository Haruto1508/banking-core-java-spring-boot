package com.banking.core.customer.service.impl;

import com.banking.core.customer.domain.entity.Customer;
import com.banking.core.customer.domain.repository.CustomerRepository;
import com.banking.core.customer.exposed.CustomerApi;
import com.banking.core.customer.exposed.CustomerSummaryDto;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;
import java.util.UUID;

/**
 * Dedicated cross-module facade implementing {@link CustomerApi}.
 * Provides trusted internal customer lookup and status checks to other modules
 * (e.g. Account, Transaction, Payment) without exposing REST-layer IDOR logic.
 */
@Service
@RequiredArgsConstructor
public class CustomerApiImpl implements CustomerApi {

    private final CustomerRepository customerRepository;

    /**
     * Retrieves a compact customer summary DTO by customer UUID.
     */
    @Override
    @Transactional(readOnly = true)
    public Optional<CustomerSummaryDto> findCustomerById(UUID customerId) {
        return customerRepository.findById(customerId).map(this::mapToCustomerSummary);
    }

    /**
     * Retrieves a compact customer summary DTO by linked user UUID.
     */
    @Override
    @Transactional(readOnly = true)
    public Optional<CustomerSummaryDto> findCustomerByUserId(UUID userId) {
        return customerRepository.findByUserId(userId).map(this::mapToCustomerSummary);
    }

    /**
     * Checks whether a customer profile exists and is in ACTIVE status.
     */
    @Override
    @Transactional(readOnly = true)
    public boolean isCustomerActive(UUID customerId) {
        return customerRepository.findById(customerId)
                .map(Customer::isActive)
                .orElse(false);
    }

    private CustomerSummaryDto mapToCustomerSummary(Customer customer) {
        return new CustomerSummaryDto(
                customer.getId(),
                customer.getUserId(),
                customer.getCustomerNumber(),
                customer.getFullName(),
                customer.getEmail(),
                customer.getStatus()
        );
    }
}
