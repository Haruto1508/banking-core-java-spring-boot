package com.banking.core.audit.api.controller;

import com.banking.core.audit.api.dto.response.AuditLogResponse;
import com.banking.core.audit.service.AuditService;
import com.banking.core.common.dto.ApiResponse;
import com.banking.core.common.dto.PageResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

/**
 * REST controller for querying audit logs.
 * Restricted strictly to ADMIN role.
 * Base path: /api/v1/audit-logs
 */
@RestController
@RequestMapping("/api/v1/audit-logs")
@RequiredArgsConstructor
public class AuditController {

    private final AuditService auditService;

    /**
     * Queries paginated audit logs for a specific actor. Only ADMIN may access.
     */
    @GetMapping("/actor/{actorId}")
    @PreAuthorize("hasRole('ADMIN')")
    public ApiResponse<PageResponse<AuditLogResponse>> getAuditLogsByActor(
            @PathVariable String actorId,
            @PageableDefault(size = 20) Pageable pageable) {

        PageResponse<AuditLogResponse> logs = auditService.getAuditLogsByActor(actorId, pageable);
        return ApiResponse.success(logs);
    }

    /**
     * Queries paginated audit logs for a specific resource. Only ADMIN may access.
     */
    @GetMapping("/resource/{resourceType}/{resourceId}")
    @PreAuthorize("hasRole('ADMIN')")
    public ApiResponse<PageResponse<AuditLogResponse>> getAuditLogsByResource(
            @PathVariable String resourceType,
            @PathVariable String resourceId,
            @PageableDefault(size = 20) Pageable pageable) {

        PageResponse<AuditLogResponse> logs = auditService.getAuditLogsByResource(
                resourceType, resourceId, pageable);
        return ApiResponse.success(logs);
    }

    /**
     * Queries all paginated audit logs across the bank. Restricted strictly to ADMIN role.
     */
    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ApiResponse<PageResponse<AuditLogResponse>> getAllAuditLogs(
            @RequestParam(required = false) String status,
            @PageableDefault(size = 20) Pageable pageable) {

        PageResponse<AuditLogResponse> logs = auditService.getAllAuditLogs(status, pageable);
        return ApiResponse.success(logs);
    }
}
