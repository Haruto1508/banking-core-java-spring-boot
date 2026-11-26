package com.banking.core.auth.api.dto.request;

import jakarta.validation.constraints.NotBlank;

/**
 * Request payload for user authentication.
 */
public record LoginRequest(
        @NotBlank(message = "Username or email is required")
        String usernameOrEmail,

        @NotBlank(message = "Password is required")
        String password
) {
}
