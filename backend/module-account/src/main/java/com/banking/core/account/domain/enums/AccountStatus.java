package com.banking.core.account.domain.enums;

/**
 * Lifecycle status of a bank account.
 * <p>
 * ACTIVE  – normal operating state; all transactions allowed
 * FROZEN  – all debits and credits blocked (admin/compliance hold)
 * CLOSED  – permanently inactive; no transactions permitted
 */
public enum AccountStatus {
    ACTIVE,
    FROZEN,
    CLOSED
}
