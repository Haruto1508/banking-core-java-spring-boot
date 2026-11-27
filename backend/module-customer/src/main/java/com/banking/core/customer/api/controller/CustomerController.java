package com.banking.core.customer.api.controller;

import com.banking.core.auth.domain.enums.Role;
import com.banking.core.auth.security.BankingUserDetails;
import com.banking.core.common.dto.ApiResponse;
import com.banking.core.common.dto.PageResponse;
import com.banking.core.customer.api.dto.request.CreateCustomerRequest;
import com.banking.core.customer.api.dto.request.UpdateCustomerRequest;
import com.banking.core.customer.api.dto.request.UpdateCustomerStatusRequest;
import com.banking.core.customer.api.dto.response.CustomerResponse;
import com.banking.core.customer.domain.enums.CustomerStatus;
import com.banking.core.customer.service.CustomerService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

/**
 * REST controller for customer onboarding, retrieval, search, and lifecycle operations.
 */
@RestController
@RequestMapping("/api/v1/customers")
@RequiredArgsConstructor
public class CustomerController {

    private final CustomerService customerService;

    /**
     * Creates a new customer profile.
     * STAFF/ADMIN can link a profile to any user. CUSTOMER links to their own account.
     */
    @PostMapping
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<CustomerResponse>> createCustomer(
            @Valid @RequestBody CreateCustomerRequest request,
            @AuthenticationPrincipal BankingUserDetails currentUser) {

        CustomerResponse response = customerService.createCustomer(
                request,
                currentUser.getUserId(),
                currentUser.getRole()
        );
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Customer profile created", response));
    }

    /**
     * Returns the customer profile linked to the currently authenticated user.
     */
    @GetMapping("/me")
    @PreAuthorize("hasRole('CUSTOMER')")
    public ResponseEntity<ApiResponse<CustomerResponse>> getMyProfile(
            @AuthenticationPrincipal BankingUserDetails currentUser) {

        CustomerResponse response = customerService.getMyCustomerProfile(currentUser.getUserId());
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    /**
     * Returns full customer profile by ID. CUSTOMER may only view their own profile.
     */
    @GetMapping("/{customerId}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<CustomerResponse>> getCustomerById(
            @PathVariable("customerId") UUID customerId,
            @AuthenticationPrincipal BankingUserDetails currentUser) {

        CustomerResponse response = customerService.getCustomerById(
                customerId,
                currentUser.getUserId(),
                currentUser.getRole()
        );
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    /**
     * Searches customers by keyword and optional status. STAFF and ADMIN only.
     */
    @GetMapping
    @PreAuthorize("hasAnyRole('STAFF', 'ADMIN')")
    public ResponseEntity<ApiResponse<PageResponse<CustomerResponse>>> searchCustomers(
            @RequestParam(value = "keyword", required = false) String keyword,
            @RequestParam(value = "status", required = false) CustomerStatus status,
            @RequestParam(value = "page", defaultValue = "0") int page,
            @RequestParam(value = "size", defaultValue = "20") int size,
            @RequestParam(value = "sort", defaultValue = "createdAt") String sort) {

        PageRequest pageRequest = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, sort));
        PageResponse<CustomerResponse> result = customerService.searchCustomers(keyword, status, pageRequest);
        return ResponseEntity.ok(ApiResponse.success(result));
    }

    /**
     * Updates mutable customer contact info. CUSTOMER may only update their own profile.
     */
    @PutMapping("/{customerId}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<CustomerResponse>> updateCustomer(
            @PathVariable("customerId") UUID customerId,
            @Valid @RequestBody UpdateCustomerRequest request,
            @AuthenticationPrincipal BankingUserDetails currentUser) {

        CustomerResponse response = customerService.updateCustomer(
                customerId,
                request,
                currentUser.getUserId(),
                currentUser.getRole()
        );
        return ResponseEntity.ok(ApiResponse.success("Customer profile updated", response));
    }

    /**
     * Changes customer lifecycle status. STAFF and ADMIN only.
     */
    @PatchMapping("/{customerId}/status")
    @PreAuthorize("hasAnyRole('STAFF', 'ADMIN')")
    public ResponseEntity<ApiResponse<CustomerResponse>> updateStatus(
            @PathVariable("customerId") UUID customerId,
            @Valid @RequestBody UpdateCustomerStatusRequest request) {

        CustomerResponse response = customerService.updateCustomerStatus(customerId, request);
        return ResponseEntity.ok(ApiResponse.success("Customer status updated", response));
    }
}
