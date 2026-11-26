package com.banking.core.auth.api.dto.response;

import com.banking.core.auth.domain.enums.Role;
import com.banking.core.auth.domain.enums.UserStatus;

import java.util.UUID;

/**
 * Public user profile returned in authentication responses (never exposes password hash).
 */
public record UserProfileResponse(
        UUID id,
        String username,
        String email,
        Role role,
        UserStatus status
) {
}
