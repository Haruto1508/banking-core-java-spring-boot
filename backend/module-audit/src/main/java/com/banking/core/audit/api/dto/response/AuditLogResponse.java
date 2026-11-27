package com.banking.core.audit.api.dto.response;

import java.time.Instant;
import java.util.UUID;

/**
 * Response DTO for querying audit logs.
 */
public record AuditLogResponse(
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
