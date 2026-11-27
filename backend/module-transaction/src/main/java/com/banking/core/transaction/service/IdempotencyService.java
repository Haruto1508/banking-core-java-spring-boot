package com.banking.core.transaction.service;

import com.banking.core.common.exception.ErrorCode;
import com.banking.core.transaction.api.dto.response.TransactionResponse;
import com.banking.core.transaction.domain.entity.IdempotencyRecord;
import com.banking.core.transaction.domain.enums.IdempotencyStatus;
import com.banking.core.transaction.domain.exception.TransactionException;
import com.banking.core.transaction.domain.repository.IdempotencyRepository;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Duration;
import java.time.Instant;
import java.util.HexFormat;
import java.util.Optional;

/**
 * Manages Idempotency-Key verification, locking, and response caching
 * for critical financial endpoints.
 * <p>
 * Uses REQUIRES_NEW propagation so lock records are committed immediately
 * and visible to concurrent duplicate requests.
 */
@Service
@RequiredArgsConstructor
public class IdempotencyService {

    private static final Logger log = LoggerFactory.getLogger(IdempotencyService.class);
    private static final Duration DEFAULT_TTL = Duration.ofHours(24);

    private final IdempotencyRepository idempotencyRepository;
    private final ObjectMapper objectMapper;

    /**
     * Checks an idempotency key and acquires an IN_PROGRESS lock if this is a new request.
     *
     * @param idempotencyKey client-supplied key (if null/blank, returns empty without locking)
     * @param endpoint       API endpoint path for audit context
     * @param payload        request DTO to hash and verify against future retries
     * @return Optional containing cached TransactionResponse if already completed; empty if caller should execute
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public Optional<TransactionResponse> acquireOrReturnCached(
            String idempotencyKey, String endpoint, Object payload) {

        if (idempotencyKey == null || idempotencyKey.isBlank()) {
            return Optional.empty();
        }

        String payloadHash = computeSha256Hash(payload);
        Optional<IdempotencyRecord> existingOpt = idempotencyRepository.findById(idempotencyKey);

        if (existingOpt.isPresent()) {
            IdempotencyRecord existing = existingOpt.get();

            // If expired, purge and allow re-acquisition
            if (existing.getExpiresAt().isBefore(Instant.now())) {
                idempotencyRepository.delete(existing);
                idempotencyRepository.flush();
            } else {
                return handleExistingRecord(existing, payloadHash);
            }
        }

        // Attempt to insert a new IN_PROGRESS lock record
        Instant now = Instant.now();
        IdempotencyRecord newRecord = IdempotencyRecord.builder()
                .idempotencyKey(idempotencyKey)
                .endpoint(endpoint)
                .payloadHash(payloadHash)
                .status(IdempotencyStatus.IN_PROGRESS)
                .createdAt(now)
                .expiresAt(now.plus(DEFAULT_TTL))
                .build();

        try {
            idempotencyRepository.saveAndFlush(newRecord);
        } catch (DataIntegrityViolationException ex) {
            // Another concurrent thread inserted the same key milliseconds earlier
            throw new TransactionException(ErrorCode.IDEMPOTENCY_CONFLICT,
                    "Concurrent request with the same Idempotency-Key is already in progress");
        }

        return Optional.empty();
    }

    /**
     * Marks an idempotency key as COMPLETED and caches the serialized response.
     *
     * @param idempotencyKey client-supplied key
     * @param response       transaction response DTO to cache
     * @param httpStatus     HTTP status code (e.g. 201)
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void markCompleted(String idempotencyKey, TransactionResponse response, int httpStatus) {
        if (idempotencyKey == null || idempotencyKey.isBlank()) {
            return;
        }
        idempotencyRepository.findById(idempotencyKey).ifPresent(record -> {
            String json = serializeResponse(response);
            record.complete(json, httpStatus);
            idempotencyRepository.save(record);
        });
    }

    /**
     * Marks an idempotency key as FAILED when transaction execution aborts.
     *
     * @param idempotencyKey client-supplied key
     * @param httpStatus     HTTP error status code
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void markFailed(String idempotencyKey, int httpStatus) {
        if (idempotencyKey == null || idempotencyKey.isBlank()) {
            return;
        }
        idempotencyRepository.findById(idempotencyKey).ifPresent(record -> {
            record.fail(httpStatus);
            idempotencyRepository.save(record);
        });
    }

    // =========================================================================
    // Private helpers
    // =========================================================================

    private Optional<TransactionResponse> handleExistingRecord(IdempotencyRecord existing, String incomingHash) {
        if (!existing.getPayloadHash().equals(incomingHash)) {
            throw new TransactionException(ErrorCode.IDEMPOTENCY_PAYLOAD_MISMATCH);
        }

        return switch (existing.getStatus()) {
            case IN_PROGRESS -> throw new TransactionException(ErrorCode.IDEMPOTENCY_CONFLICT);
            case COMPLETED -> {
                log.info("Returning cached idempotent response for key={}", existing.getIdempotencyKey());
                yield Optional.of(deserializeResponse(existing.getResponseBody()));
            }
            case FAILED -> {
                // Allow retry of a previously failed request with the exact same payload
                idempotencyRepository.delete(existing);
                idempotencyRepository.flush();
                yield Optional.empty();
            }
        };
    }

    private String computeSha256Hash(Object payload) {
        try {
            String json = objectMapper.writeValueAsString(payload);
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hashBytes = digest.digest(json.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hashBytes);
        } catch (JsonProcessingException | NoSuchAlgorithmException e) {
            throw new TransactionException(ErrorCode.INTERNAL_SERVER_ERROR,
                    "Failed to compute payload hash for idempotency check");
        }
    }

    private String serializeResponse(TransactionResponse response) {
        try {
            return objectMapper.writeValueAsString(response);
        } catch (JsonProcessingException e) {
            throw new TransactionException(ErrorCode.INTERNAL_SERVER_ERROR,
                    "Failed to serialize idempotent response");
        }
    }

    private TransactionResponse deserializeResponse(String json) {
        try {
            return objectMapper.readValue(json, TransactionResponse.class);
        } catch (JsonProcessingException e) {
            throw new TransactionException(ErrorCode.INTERNAL_SERVER_ERROR,
                    "Failed to deserialize cached idempotent response");
        }
    }
}
