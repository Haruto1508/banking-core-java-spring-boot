package com.banking.core.customer.domain.repository;

import com.banking.core.customer.domain.entity.Customer;
import com.banking.core.customer.domain.enums.CustomerStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;
import java.util.UUID;

/**
 * Repository for Customer persistence and search queries.
 */
public interface CustomerRepository extends JpaRepository<Customer, UUID> {

    /**
     * Finds a customer profile linked to a specific authentication user ID.
     *
     * @param userId authentication user UUID
     * @return optional customer entity
     */
    Optional<Customer> findByUserId(UUID userId);

    /**
     * Finds a customer profile by its unique CIF customer number.
     *
     * @param customerNumber unique customer number
     * @return optional customer entity
     */
    Optional<Customer> findByCustomerNumber(String customerNumber);

    /**
     * Checks whether a customer with the given government identity number already exists.
     *
     * @param identityNumber national ID or passport number
     * @return true if exists
     */
    boolean existsByIdentityNumber(String identityNumber);

    /**
     * Checks whether an authentication user is already linked to a customer profile.
     *
     * @param userId authentication user UUID
     * @return true if linked
     */
    boolean existsByUserId(UUID userId);

    /**
     * Searches customers with optional keyword matching (name, CIF, identity, email, phone) and status filter.
     *
     * @param keyword  optional search text
     * @param status   optional customer status filter
     * @param pageable pagination and sorting configuration
     * @return paginated matching customers
     */
    @Query("""
            SELECT c FROM Customer c
            WHERE (:status IS NULL OR c.status = :status)
              AND (:keyword IS NULL OR :keyword = ''
                   OR LOWER(c.fullName) LIKE LOWER(CONCAT('%', :keyword, '%'))
                   OR LOWER(c.customerNumber) LIKE LOWER(CONCAT('%', :keyword, '%'))
                   OR LOWER(c.identityNumber) LIKE LOWER(CONCAT('%', :keyword, '%'))
                   OR LOWER(c.email) LIKE LOWER(CONCAT('%', :keyword, '%'))
                   OR LOWER(c.phoneNumber) LIKE LOWER(CONCAT('%', :keyword, '%')))
            """)
    Page<Customer> searchCustomers(
            @Param("keyword") String keyword,
            @Param("status") CustomerStatus status,
            Pageable pageable
    );
}
