package com.banking.core.audit.service.impl;

import com.banking.core.audit.api.dto.response.AuditLogResponse;
import com.banking.core.audit.domain.entity.AuditLog;
import com.banking.core.audit.domain.repository.AuditLogRepository;
import com.banking.core.audit.service.AuditService;
import com.banking.core.common.dto.PageResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Implementation of {@link AuditService} for querying immutable audit logs.
 */
@Service
@RequiredArgsConstructor
public class AuditServiceImpl implements AuditService {

    private final AuditLogRepository auditLogRepository;

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

    @Override
    @Transactional(readOnly = true)
    public PageResponse<AuditLogResponse> getAllAuditLogs(String status, Pageable pageable) {
        Page<AuditLog> page = (status != null && !status.isBlank())
                ? auditLogRepository.findByStatusOrderByCreatedAtDesc(status.toUpperCase(), pageable)
                : auditLogRepository.findAllByOrderByCreatedAtDesc(pageable);
        return PageResponse.from(page.map(this::mapToResponse));
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
