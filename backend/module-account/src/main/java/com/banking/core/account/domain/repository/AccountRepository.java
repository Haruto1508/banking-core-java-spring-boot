package com.banking.core.account.domain.repository;

import com.banking.core.account.domain.entity.Account;
import com.banking.core.account.domain.enums.AccountStatus;
import jakarta.persistence.LockModeType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * JPA repository for Account entities.
 */
public interface AccountRepository extends JpaRepository<Account, UUID> {

    /**
     * Finds an account by account number.
     *
     * @param accountNumber unique account number string
     * @return optional matching account
     */
    Optional<Account> findByAccountNumber(String accountNumber);

    /**
     * Returns all accounts ordered by creation date descending with pagination.
     */
    Page<Account> findAllByOrderByCreatedAtDesc(Pageable pageable);

    /**
     * Returns accounts filtered by status ordered by creation date descending with pagination.
     */
    Page<Account> findByStatusOrderByCreatedAtDesc(AccountStatus status, Pageable pageable);

    /**
     * Finds all accounts belonging to a specific customer.
     *
     * @param customerId customer UUID
     * @return list of accounts for the customer
     */
    List<Account> findByCustomerId(UUID customerId);

    /**
     * Finds all accounts for a customer filtered by status.
     *
     * @param customerId customer UUID
     * @param status     desired account status
     * @return filtered account list
     */
    List<Account> findByCustomerIdAndStatus(UUID customerId, AccountStatus status);

    /**
     * Acquires a database-level exclusive lock on the account row (PESSIMISTIC_WRITE).
     * Used by TransactionService to prevent concurrent balance corruption.
     *
     * @param id account UUID
     * @return optional locked account
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT a FROM Account a WHERE a.id = :id")
    Optional<Account> findByIdWithPessimisticLock(@Param("id") UUID id);

    /**
     * Checks whether an account with the given account number already exists.
     *
     * @param accountNumber account number to check
     * @return true if at least one account has this number
     */
    boolean existsByAccountNumber(String accountNumber);
}
