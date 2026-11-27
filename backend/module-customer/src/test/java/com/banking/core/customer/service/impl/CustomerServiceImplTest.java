package com.banking.core.customer.service.impl;

import com.banking.core.auth.domain.enums.Role;
import com.banking.core.auth.exposed.AuthApi;
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
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class CustomerServiceImplTest {

    @Mock
    private CustomerRepository customerRepository;

    @Mock
    private AuthApi authApi;

    private CustomerServiceImpl customerService;

    @BeforeEach
    void setUp() {
        customerService = new CustomerServiceImpl(customerRepository, authApi);
    }

    @Test
    @DisplayName("CUSTOMER role creating profile should auto-link their own userId")
    void createCustomer_customerRole_linksOwnUserId() {
        UUID ownUserId = UUID.randomUUID();
        CreateCustomerRequest request = new CreateCustomerRequest(
                null, "Nguyen Van A", "079123456789", "0901234567", "nva@email.com"
        );

        when(customerRepository.existsByIdentityNumber("079123456789")).thenReturn(false);
        when(customerRepository.existsByUserId(ownUserId)).thenReturn(false);
        when(customerRepository.save(any(Customer.class))).thenAnswer(inv -> {
            Customer c = inv.getArgument(0);
            c.setId(UUID.randomUUID());
            return c;
        });

        CustomerResponse result = customerService.createCustomer(request, ownUserId, Role.CUSTOMER);

        ArgumentCaptor<Customer> captor = ArgumentCaptor.forClass(Customer.class);
        verify(customerRepository).save(captor.capture());

        assertThat(captor.getValue().getUserId()).isEqualTo(ownUserId);
        assertThat(result.email()).isEqualTo("nva@email.com");
        assertThat(result.status()).isEqualTo(CustomerStatus.ACTIVE);
    }

    @Test
    @DisplayName("Creating customer with duplicate identity number should throw CUSTOMER_ALREADY_EXISTS")
    void createCustomer_duplicateIdentity_throws() {
        CreateCustomerRequest request = new CreateCustomerRequest(
                null, "Tran Thi B", "079999999999", "0912345678", "ttb@email.com"
        );
        when(customerRepository.existsByIdentityNumber("079999999999")).thenReturn(true);

        assertThatThrownBy(() -> customerService.createCustomer(request, UUID.randomUUID(), Role.STAFF))
                .isInstanceOf(CustomerException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.CUSTOMER_ALREADY_EXISTS);
    }

    @Test
    @DisplayName("getCustomerById with non-existent ID should throw CUSTOMER_NOT_FOUND")
    void getCustomerById_notFound_throws() {
        UUID missingId = UUID.randomUUID();
        when(customerRepository.findById(missingId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> customerService.getCustomerById(missingId, UUID.randomUUID(), Role.ADMIN))
                .isInstanceOf(ResourceNotFoundException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.CUSTOMER_NOT_FOUND);
    }

    @Test
    @DisplayName("updateCustomerStatus to CLOSED should persist status change")
    void updateCustomerStatus_toClosed_success() {
        UUID customerId = UUID.randomUUID();
        Customer existingCustomer = Customer.builder()
                .customerNumber("CIF-20260101-100001")
                .fullName("Le Van C")
                .identityNumber("012345678901")
                .phoneNumber("0909876543")
                .email("lvc@email.com")
                .status(CustomerStatus.ACTIVE)
                .build();
        existingCustomer.setId(customerId);

        when(customerRepository.findById(customerId)).thenReturn(Optional.of(existingCustomer));
        when(customerRepository.save(any(Customer.class))).thenAnswer(inv -> inv.getArgument(0));

        UpdateCustomerStatusRequest request = new UpdateCustomerStatusRequest(CustomerStatus.CLOSED);
        CustomerResponse result = customerService.updateCustomerStatus(customerId, request);

        assertThat(result.status()).isEqualTo(CustomerStatus.CLOSED);
    }

    @Test
    @DisplayName("updateCustomer on CLOSED customer should throw CUSTOMER_INVALID_STATUS")
    void updateCustomer_closedStatus_throws() {
        UUID customerId = UUID.randomUUID();
        UUID requesterId = UUID.randomUUID();
        Customer closedCustomer = Customer.builder()
                .customerNumber("CIF-20260101-100002")
                .fullName("Pham D")
                .identityNumber("099999999901")
                .phoneNumber("0908888888")
                .email("pd@email.com")
                .userId(requesterId)
                .status(CustomerStatus.CLOSED)
                .build();
        closedCustomer.setId(customerId);

        when(customerRepository.findById(customerId)).thenReturn(Optional.of(closedCustomer));

        assertThatThrownBy(() -> customerService.updateCustomer(
                customerId,
                new UpdateCustomerRequest("New Name", "0987654321", "new@email.com"),
                requesterId,
                Role.STAFF
        ))
                .isInstanceOf(CustomerException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.CUSTOMER_INVALID_STATUS);
    }
}
