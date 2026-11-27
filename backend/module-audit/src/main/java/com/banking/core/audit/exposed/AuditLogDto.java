package com.banking.core.audit.exposed;

import java.time.Instant;
import java.util.UUID;

/**
 * DTO representing an audit log entry returned to administrative callers.
 */
public record AuditLogDto(
        UUID id,
        String actorId,
        String actorRole,
        String action,
        String resourceType,
        String resourceId,
        String ipAddress,
        String status,
        String metadata,
        Instant createdAt
) {}
