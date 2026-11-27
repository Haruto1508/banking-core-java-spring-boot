package com.banking.core.audit.domain.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.UUID;

/**
 * Immutable audit trail record capturing sensitive operations and user activities.
 * Never stores passwords, JWT tokens, or sensitive PII secrets.
 */
@Entity
@Table(name = "audit_logs")
@Getter
@Builder
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor(access = AccessLevel.PRIVATE)
public class AuditLog {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @Column(name = "actor_id", nullable = false, length = 100, updatable = false)
    private String actorId;

    @Column(name = "actor_role", nullable = false, length = 50, updatable = false)
    private String actorRole;

    @Column(name = "action", nullable = false, length = 100, updatable = false)
    private String action;

    @Column(name = "resource_type", nullable = false, length = 100, updatable = false)
    private String resourceType;

    @Column(name = "resource_id", nullable = false, length = 100, updatable = false)
    private String resourceId;

    @Column(name = "ip_address", length = 50, updatable = false)
    private String ipAddress;

    @Column(name = "status", nullable = false, length = 30, updatable = false)
    private String status;

    @Column(name = "metadata", columnDefinition = "TEXT", updatable = false)
    private String metadata;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;
}
