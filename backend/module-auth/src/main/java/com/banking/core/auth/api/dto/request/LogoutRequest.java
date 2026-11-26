package com.banking.core.auth.api.dto.request;

import jakarta.validation.constraints.NotBlank;

/**
 * Request payload for revoking a refresh token on logout.
 */
public record LogoutRequest(
        @NotBlank(message = "Refresh token is required")
        String refreshToken
) {
}
