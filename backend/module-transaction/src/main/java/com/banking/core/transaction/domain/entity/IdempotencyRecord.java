package com.banking.core.transaction.domain.entity;

import com.banking.core.transaction.domain.enums.IdempotencyStatus;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.Instant;

/**
 * Stores idempotency keys for critical financial endpoints.
 * <p>
 * Guarantees that retrying a request with the same Idempotency-Key and same
 * payload returns the original response without duplicating financial postings.
 */
@Entity
@Table(name = "idempotency_records")
@Getter
@Builder
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor(access = AccessLevel.PRIVATE)
public class IdempotencyRecord {

    @Id
    @Column(name = "idempotency_key", nullable = false, length = 128)
    private String idempotencyKey;

    @Column(name = "endpoint", nullable = false, length = 255)
    private String endpoint;

    @Column(name = "payload_hash", nullable = false, length = 64)
    private String payloadHash;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 30)
    private IdempotencyStatus status;

    @Column(name = "response_body", columnDefinition = "TEXT")
    private String responseBody;

    @Column(name = "response_status")
    private Integer responseStatus;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "expires_at", nullable = false)
    private Instant expiresAt;

    /**
     * Marks this idempotency record as COMPLETED and caches the serialized JSON response.
     *
     * @param serializedResponse JSON body returned to the client
     * @param httpStatus         HTTP status code (e.g. 200 or 201)
     */
    public void complete(String serializedResponse, int httpStatus) {
        this.status = IdempotencyStatus.COMPLETED;
        this.responseBody = serializedResponse;
        this.responseStatus = httpStatus;
    }

    /**
     * Marks this idempotency record as FAILED.
     *
     * @param httpStatus HTTP error status code
     */
    public void fail(int httpStatus) {
        this.status = IdempotencyStatus.FAILED;
        this.responseStatus = httpStatus;
    }
}
