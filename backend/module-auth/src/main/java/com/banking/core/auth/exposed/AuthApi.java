package com.banking.core.auth.exposed;

import java.util.Optional;
import java.util.UUID;

/**
 * Public API exposed by module-auth for other modules in the Modular Monolith.
 */
public interface AuthApi {

    Optional<AuthUserDto> findUserById(UUID userId);

    boolean existsById(UUID userId);

    Optional<UUID> getCurrentAuthenticatedUserId();
}
