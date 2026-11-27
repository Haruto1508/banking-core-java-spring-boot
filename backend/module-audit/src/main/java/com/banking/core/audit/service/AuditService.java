package com.banking.core.audit.service;

import com.banking.core.audit.api.dto.response.AuditLogResponse;
import com.banking.core.common.dto.PageResponse;
import org.springframework.data.domain.Pageable;

/**
 * Service interface for querying audit trail logs (ADMIN only).
 */
public interface AuditService {

    /**
     * Queries paginated audit logs for a specific actor.
     *
     * @param actorId  actor identifier
     * @param pageable pagination settings
     * @return paginated audit logs
     */
    PageResponse<AuditLogResponse> getAuditLogsByActor(String actorId, Pageable pageable);

    /**
     * Queries paginated audit logs for a specific resource.
     *
     * @param resourceType resource type (e.g. "ACCOUNT", "TRANSACTION")
     * @param resourceId   resource ID
     * @param pageable     pagination settings
     * @return paginated audit logs
     */
    PageResponse<AuditLogResponse> getAuditLogsByResource(String resourceType, String resourceId, Pageable pageable);
}
