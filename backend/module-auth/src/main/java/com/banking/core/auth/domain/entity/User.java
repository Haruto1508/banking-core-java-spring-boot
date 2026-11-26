package com.banking.core.auth.domain.entity;

import com.banking.core.auth.domain.enums.Role;
import com.banking.core.auth.domain.enums.UserStatus;
import com.banking.core.common.domain.BaseAuditEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.Duration;
import java.time.Instant;

/**
 * User entity representing authentication credentials, RBAC role, and lock state.
 */
@Entity
@Table(name = "users")
@Getter
@Builder
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor(access = AccessLevel.PRIVATE)
public class User extends BaseAuditEntity {

    @Column(name = "username", nullable = false, unique = true, length = 50)
    private String username;

    @Column(name = "email", nullable = false, unique = true, length = 100)
    private String email;

    @Column(name = "password_hash", nullable = false)
    private String passwordHash;

    @Enumerated(EnumType.STRING)
    @Column(name = "role", nullable = false, length = 30)
    private Role role;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 30)
    @Builder.Default
    private UserStatus status = UserStatus.ACTIVE;

    @Column(name = "failed_login_attempts", nullable = false)
    @Builder.Default
    private int failedLoginAttempts = 0;

    @Column(name = "locked_until")
    private Instant lockedUntil;

    /**
     * Checks whether the user account is currently locked.
     *
     * @param now current timestamp
     * @return true if locked and lock period has not expired
     */
    public boolean isCurrentlyLocked(Instant now) {
        if (this.status == UserStatus.LOCKED) {
            if (this.lockedUntil == null) {
                return true;
            }
            return now.isBefore(this.lockedUntil);
        }
        return false;
    }

    /**
     * Records a failed login attempt and locks the account if threshold is reached.
     *
     * @param maxAttempts  maximum allowed failed attempts
     * @param lockDuration duration to lock the account
     * @param now          current timestamp
     */
    public void recordFailedLogin(int maxAttempts, Duration lockDuration, Instant now) {
        this.failedLoginAttempts++;
        if (this.failedLoginAttempts >= maxAttempts) {
            this.status = UserStatus.LOCKED;
            this.lockedUntil = now.plus(lockDuration);
        }
    }

    /**
     * Resets failed login counters and restores ACTIVE status if lock expired.
     */
    public void resetFailedLogins() {
        this.failedLoginAttempts = 0;
        this.lockedUntil = null;
        if (this.status == UserStatus.LOCKED) {
            this.status = UserStatus.ACTIVE;
        }
    }

    /**
     * Administratively unlocks a locked user account.
     */
    public void unlock() {
        this.failedLoginAttempts = 0;
        this.lockedUntil = null;
        if (this.status == UserStatus.LOCKED) {
            this.status = UserStatus.ACTIVE;
        }
    }
}
