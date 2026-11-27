package com.banking.core.audit.exposed;

/**
 * Public cross-module API for recording audit trail events.
 * <p>
 * Security constraint: callers MUST NEVER include raw passwords, JWT tokens,
 * PINs, or CVV numbers in the metadata parameter.
 */
public interface AuditApi {

    /**
     * Records an immutable audit event in the database.
     *
     * @param actorId      ID of the user or system performing the action
     * @param actorRole    role of the actor (ADMIN, STAFF, CUSTOMER, SYSTEM)
     * @param action       action name (e.g. "TRANSFER_FUNDS", "FREEZE_ACCOUNT")
     * @param resourceType resource type affected (e.g. "ACCOUNT", "TRANSACTION")
     * @param resourceId   identifier of the affected resource
     * @param ipAddress    originating client IP address (nullable)
     * @param status       outcome ("SUCCESS" or "FAILURE")
     * @param metadata     non-sensitive contextual details
     */
    void recordAuditLog(
            String actorId,
            String actorRole,
            String action,
            String resourceType,
            String resourceId,
            String ipAddress,
            String status,
            String metadata);
}
