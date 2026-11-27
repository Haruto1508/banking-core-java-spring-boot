package com.banking.core.transaction.domain.repository;

import com.banking.core.transaction.domain.entity.Transaction;
import com.banking.core.transaction.domain.enums.TransactionStatus;
import com.banking.core.transaction.domain.enums.TransactionType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;
import java.util.UUID;

/**
 * JPA repository for Transaction entities.
 */
public interface TransactionRepository extends JpaRepository<Transaction, UUID> {

    /**
     * Finds a transaction by its unique human-readable reference.
     *
     * @param transactionRef transaction reference code
     * @return optional transaction
     */
    Optional<Transaction> findByTransactionRef(String transactionRef);

    /**
     * Finds a transaction by its idempotency key.
     *
     * @param idempotencyKey client-supplied idempotency key
     * @return optional transaction
     */
    Optional<Transaction> findByIdempotencyKey(String idempotencyKey);

    /**
     * Checks if a transaction reference already exists.
     *
     * @param transactionRef reference string
     * @return true if exists
     */
    boolean existsByTransactionRef(String transactionRef);

    /**
     * Queries paginated transaction history for an account (as either source or target),
     * with optional status and type filters.
     *
     * @param accountId account UUID
     * @param type      optional TransactionType filter
     * @param status    optional TransactionStatus filter
     * @param pageable  pagination parameters
     * @return page of matching transactions
     */
    @Query("""
            SELECT t FROM Transaction t
            WHERE (t.sourceAccountId = :accountId OR t.targetAccountId = :accountId)
              AND (:type IS NULL OR t.transactionType = :type)
              AND (:status IS NULL OR t.status = :status)
            ORDER BY t.createdAt DESC
            """)
    Page<Transaction> findHistoryByAccountId(
            @Param("accountId") UUID accountId,
            @Param("type") TransactionType type,
            @Param("status") TransactionStatus status,
            Pageable pageable);
}
