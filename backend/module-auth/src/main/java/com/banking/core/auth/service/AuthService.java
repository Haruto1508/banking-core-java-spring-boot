package com.banking.core.auth.service;

import com.banking.core.auth.api.dto.request.LoginRequest;
import com.banking.core.auth.api.dto.request.LogoutRequest;
import com.banking.core.auth.api.dto.request.RefreshTokenRequest;
import com.banking.core.auth.api.dto.request.RegisterRequest;
import com.banking.core.auth.api.dto.response.AuthResponse;
import com.banking.core.auth.api.dto.response.UserProfileResponse;

import java.util.UUID;

/**
 * Service interface for authentication, token lifecycle, and account lock management.
 */
public interface AuthService {

    AuthResponse register(RegisterRequest request);

    AuthResponse login(LoginRequest request);

    AuthResponse refreshToken(RefreshTokenRequest request);

    void logout(LogoutRequest request);

    UserProfileResponse getCurrentUserProfile(UUID userId);

    void unlockUser(UUID userId);
}
