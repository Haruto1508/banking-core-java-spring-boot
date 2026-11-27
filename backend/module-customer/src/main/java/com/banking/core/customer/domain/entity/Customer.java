package com.banking.core.customer.domain.entity;

import com.banking.core.common.domain.BaseAuditEntity;
import com.banking.core.common.exception.ErrorCode;
import com.banking.core.customer.domain.enums.CustomerStatus;
import com.banking.core.customer.domain.exception.CustomerException;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.util.UUID;

/**
 * Customer entity representing a bank's CIF (Customer Information File) profile.
 */
@Entity
@Table(name = "customers")
@Getter
@Builder
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor(access = AccessLevel.PRIVATE)
public class Customer extends BaseAuditEntity {

    @Column(name = "user_id")
    private UUID userId;

    @Column(name = "customer_number", nullable = false, unique = true, length = 30)
    private String customerNumber;

    @Column(name = "full_name", nullable = false, length = 150)
    private String fullName;

    @Column(name = "identity_number", nullable = false, unique = true, length = 50)
    private String identityNumber;

    @Column(name = "phone_number", nullable = false, length = 30)
    private String phoneNumber;

    @Column(name = "email", nullable = false, length = 100)
    private String email;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 30)
    @Builder.Default
    private CustomerStatus status = CustomerStatus.ACTIVE;

    /**
     * Checks whether the customer profile is currently active.
     *
     * @return true if status is ACTIVE
     */
    public boolean isActive() {
        return this.status == CustomerStatus.ACTIVE;
    }

    /**
     * Updates mutable contact information for an active or suspended customer.
     * Closed customers cannot be modified.
     *
     * @param updatedFullName    new full name
     * @param updatedPhoneNumber new phone number
     * @param updatedEmail       new email address
     */
    public void updateContactInfo(String updatedFullName, String updatedPhoneNumber, String updatedEmail) {
        if (this.status == CustomerStatus.CLOSED) {
            throw new CustomerException(ErrorCode.CUSTOMER_INVALID_STATUS, "Cannot update a closed customer profile");
        }
        this.fullName = updatedFullName;
        this.phoneNumber = updatedPhoneNumber;
        this.email = updatedEmail;
    }

    /**
     * Transitions the customer profile to a new lifecycle status.
     * Once closed, a customer profile cannot be reopened.
     *
     * @param targetStatus target CustomerStatus
     */
    public void changeStatus(CustomerStatus targetStatus) {
        if (this.status == CustomerStatus.CLOSED && targetStatus != CustomerStatus.CLOSED) {
            throw new CustomerException(ErrorCode.CUSTOMER_INVALID_STATUS, "Closed customer profile cannot be reopened");
        }
        this.status = targetStatus;
    }
}
