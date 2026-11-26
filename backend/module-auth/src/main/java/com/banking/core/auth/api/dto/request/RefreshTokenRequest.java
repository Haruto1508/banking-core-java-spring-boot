package com.banking.core.auth.api.dto.request;

import jakarta.validation.constraints.NotBlank;

/**
 * Request payload for refreshing an expired access token.
 */
public record RefreshTokenRequest(
        @NotBlank(message = "Refresh token is required")
        String refreshToken
) {
}
