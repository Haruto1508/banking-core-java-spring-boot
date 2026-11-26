package com.banking.core.auth.exposed;

import com.banking.core.auth.domain.enums.Role;
import com.banking.core.auth.domain.enums.UserStatus;

import java.util.UUID;

/**
 * Public DTO representing authenticated user summary exposed to other modules.
 */
public record AuthUserDto(
        UUID id,
        String username,
        String email,
        Role role,
        UserStatus status
) {
}
