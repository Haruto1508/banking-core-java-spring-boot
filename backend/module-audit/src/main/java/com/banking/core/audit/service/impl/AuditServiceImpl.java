package com.banking.core.audit.service.impl;

import com.banking.core.audit.api.dto.response.AuditLogResponse;
import com.banking.core.audit.domain.entity.AuditLog;
import com.banking.core.audit.domain.repository.AuditLogRepository;
import com.banking.core.audit.exposed.AuditApi;
import com.banking.core.audit.service.AuditService;
import com.banking.core.common.dto.PageResponse;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.regex.Pattern;

/**
 * Implementation of AuditService and cross-module AuditApi.
 * <p>
 * Uses REQUIRES_NEW propagation so audit trail entries are persisted
 * even if the calling business transaction rolls back (e.g., failed attempts).
 */
@Service
@RequiredArgsConstructor
public class AuditServiceImpl implements AuditService, AuditApi {

    private static final Logger log = LoggerFactory.getLogger(AuditServiceImpl.class);

    // Regex to mask accidental sensitive key-value pairs in metadata
    private static final Pattern SENSITIVE_PATTERN = Pattern.compile(
            "(?i)(password|token|secret|pin|cvv)\\s*[:=]\\s*[^,\\s}]+",
            Pattern.CASE_INSENSITIVE);

    private final AuditLogRepository auditLogRepository;

    /**
     * Cross-module: records an immutable audit event within the caller's transaction
     * (or starts a new one if none exists) to avoid connection pool starvation under concurrency.
     * Masks any accidental sensitive keys in metadata before persisting.
     */
    @Override
    @Transactional(propagation = Propagation.REQUIRED)
    public void recordAuditLog(
            String actorId,
            String actorRole,
            String action,
            String resourceType,
            String resourceId,
            String ipAddress,
            String status,
            String metadata) {

        String sanitizedMetadata = sanitizeMetadata(metadata);

        AuditLog entry = AuditLog.builder()
                .actorId(actorId != null ? actorId : "SYSTEM")
                .actorRole(actorRole != null ? actorRole : "SYSTEM")
                .action(action)
                .resourceType(resourceType)
                .resourceId(resourceId)
                .ipAddress(ipAddress)
                .status(status)
                .metadata(sanitizedMetadata)
                .createdAt(Instant.now())
                .build();

        auditLogRepository.save(entry);
        log.debug("Audit logged: actor={} action={} resource={}/{} status={}",
                entry.getActorId(), action, resourceType, resourceId, status);
    }

    /**
     * Queries paginated audit logs for a specific actor.
     */
    @Override
    @Transactional(readOnly = true)
    public PageResponse<AuditLogResponse> getAuditLogsByActor(String actorId, Pageable pageable) {
        Page<AuditLogResponse> page = auditLogRepository
                .findByActorIdOrderByCreatedAtDesc(actorId, pageable)
                .map(this::mapToResponse);
        return PageResponse.from(page);
    }

    /**
     * Queries paginated audit logs for a specific resource.
     */
    @Override
    @Transactional(readOnly = true)
    public PageResponse<AuditLogResponse> getAuditLogsByResource(
            String resourceType, String resourceId, Pageable pageable) {
        Page<AuditLogResponse> page = auditLogRepository
                .findByResourceTypeAndResourceIdOrderByCreatedAtDesc(resourceType, resourceId, pageable)
                .map(this::mapToResponse);
        return PageResponse.from(page);
    }

    private String sanitizeMetadata(String metadata) {
        if (metadata == null || metadata.isBlank()) {
            return metadata;
        }
        return SENSITIVE_PATTERN.matcher(metadata).replaceAll("$1=[REDACTED]");
    }

    private AuditLogResponse mapToResponse(AuditLog logEntity) {
        return new AuditLogResponse(
                logEntity.getId(),
                logEntity.getActorId(),
                logEntity.getActorRole(),
                logEntity.getAction(),
                logEntity.getResourceType(),
                logEntity.getResourceId(),
                logEntity.getIpAddress(),
                logEntity.getStatus(),
                logEntity.getMetadata(),
                logEntity.getCreatedAt()
        );
    }
}
