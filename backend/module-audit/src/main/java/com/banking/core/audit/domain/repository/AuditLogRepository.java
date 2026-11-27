package com.banking.core.audit.domain.repository;

import com.banking.core.audit.domain.entity.AuditLog;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

/**
 * JPA repository for AuditLog entity. Insert-only and read-only.
 */
public interface AuditLogRepository extends JpaRepository<AuditLog, UUID> {

    /**
     * Queries paginated audit logs for a specific actor.
     *
     * @param actorId  actor identifier
     * @param pageable pagination settings
     * @return page of audit log entries
     */
    Page<AuditLog> findByActorIdOrderByCreatedAtDesc(String actorId, Pageable pageable);

    /**
     * Queries paginated audit logs for a specific resource.
     *
     * @param resourceType type of resource (e.g. "ACCOUNT", "TRANSACTION")
     * @param resourceId   UUID or identifier of the resource
     * @param pageable     pagination settings
     * @return page of audit log entries
     */
    Page<AuditLog> findByResourceTypeAndResourceIdOrderByCreatedAtDesc(
            String resourceType, String resourceId, Pageable pageable);
}
