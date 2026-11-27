package com.banking.core.transaction.domain.repository;

import com.banking.core.transaction.domain.entity.IdempotencyRecord;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;

/**
 * JPA repository for IdempotencyRecord entities.
 */
public interface IdempotencyRepository extends JpaRepository<IdempotencyRecord, String> {

    /**
     * Removes expired idempotency records to prevent unbounded table growth.
     *
     * @param now current UTC timestamp
     * @return number of deleted records
     */
    @Modifying
    @Query("DELETE FROM IdempotencyRecord r WHERE r.expiresAt < :now")
    int deleteExpiredRecords(@Param("now") Instant now);
}
