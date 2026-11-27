package com.banking.core.audit.service.impl;

import com.banking.core.audit.domain.entity.AuditLog;
import com.banking.core.audit.domain.repository.AuditLogRepository;
import com.banking.core.audit.exposed.AuditApi;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.regex.Pattern;

/**
 * Dedicated cross-module facade implementing {@link AuditApi}.
 * Records immutable audit trail events with automatic redaction of sensitive keys.
 */
@Service
@RequiredArgsConstructor
public class AuditApiImpl implements AuditApi {

    private static final Logger log = LoggerFactory.getLogger(AuditApiImpl.class);

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

    private String sanitizeMetadata(String metadata) {
        if (metadata == null || metadata.isBlank()) {
            return metadata;
        }
        return SENSITIVE_PATTERN.matcher(metadata).replaceAll("$1=[REDACTED]");
    }
}
