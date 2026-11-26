package com.banking.core.auth.service.impl;

import com.banking.core.auth.api.dto.request.LoginRequest;
import com.banking.core.auth.api.dto.request.LogoutRequest;
import com.banking.core.auth.api.dto.request.RefreshTokenRequest;
import com.banking.core.auth.api.dto.request.RegisterRequest;
import com.banking.core.auth.api.dto.response.AuthResponse;
import com.banking.core.auth.api.dto.response.UserProfileResponse;
import com.banking.core.auth.domain.entity.RefreshToken;
import com.banking.core.auth.domain.entity.User;
import com.banking.core.auth.domain.enums.Role;
import com.banking.core.auth.domain.enums.UserStatus;
import com.banking.core.auth.domain.exception.AuthException;
import com.banking.core.auth.domain.repository.RefreshTokenRepository;
import com.banking.core.auth.domain.repository.UserRepository;
import com.banking.core.auth.exposed.AuthApi;
import com.banking.core.auth.exposed.AuthUserDto;
import com.banking.core.auth.security.BankingUserDetails;
import com.banking.core.auth.security.JwtProperties;
import com.banking.core.auth.security.JwtTokenProvider;
import com.banking.core.auth.service.AuthService;
import com.banking.core.common.exception.ErrorCode;
import com.banking.core.common.exception.ResourceNotFoundException;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import java.util.Base64;
import java.util.HexFormat;
import java.util.Optional;
import java.util.UUID;

/**
 * Implementation of AuthService and public AuthApi for the Modular Monolith.
 */
@Service
@RequiredArgsConstructor
public class AuthServiceImpl implements AuthService, AuthApi {

    private static final Logger log = LoggerFactory.getLogger(AuthServiceImpl.class);
    private static final SecureRandom SECURE_RANDOM = new SecureRandom();

    private final UserRepository userRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider jwtTokenProvider;
    private final JwtProperties jwtProperties;

    @Override
    @Transactional
    public AuthResponse register(RegisterRequest request) {
        if (userRepository.existsByUsername(request.username())) {
            throw new AuthException(ErrorCode.USER_ALREADY_EXISTS, "Username is already taken");
        }
        if (userRepository.existsByEmail(request.email())) {
            throw new AuthException(ErrorCode.USER_ALREADY_EXISTS, "Email is already registered");
        }

        // Public self-registration always assigns CUSTOMER role to prevent privilege escalation
        User user = User.builder()
                .username(request.username().trim())
                .email(request.email().trim().toLowerCase())
                .passwordHash(passwordEncoder.encode(request.password()))
                .role(Role.CUSTOMER)
                .status(UserStatus.ACTIVE)
                .build();

        User savedUser = userRepository.save(user);
        log.info("Registered new customer user with id={} and username={}", savedUser.getId(), savedUser.getUsername());

        return issueTokens(savedUser);
    }

    @Override
    @Transactional(noRollbackFor = AuthException.class)
    public AuthResponse login(LoginRequest request) {
        Instant now = Instant.now();

        User user = userRepository.findByUsernameOrEmail(request.usernameOrEmail(), request.usernameOrEmail())
                .orElseThrow(() -> new AuthException(ErrorCode.INVALID_CREDENTIALS));

        if (user.getStatus() == UserStatus.DISABLED) {
            throw new AuthException(ErrorCode.ACCESS_DENIED, "User account is disabled");
        }

        if (user.isCurrentlyLocked(now)) {
            log.warn("Blocked login attempt for locked user id={}", user.getId());
            throw new AuthException(ErrorCode.ACCOUNT_LOCKED);
        }

        if (!passwordEncoder.matches(request.password(), user.getPasswordHash())) {
            int maxAttempts = jwtProperties.getLogin().getMaxFailedAttempts();
            Duration lockDuration = Duration.ofMinutes(jwtProperties.getLogin().getLockDurationMinutes());
            user.recordFailedLogin(maxAttempts, lockDuration, now);
            userRepository.save(user);

            if (user.getStatus() == UserStatus.LOCKED) {
                log.warn("User id={} locked after {} failed attempts", user.getId(), maxAttempts);
                throw new AuthException(ErrorCode.ACCOUNT_LOCKED);
            }
            throw new AuthException(ErrorCode.INVALID_CREDENTIALS);
        }

        user.resetFailedLogins();
        userRepository.save(user);
        log.info("User id={} authenticated successfully", user.getId());

        return issueTokens(user);
    }

    @Override
    @Transactional(noRollbackFor = AuthException.class)
    public AuthResponse refreshToken(RefreshTokenRequest request) {
        Instant now = Instant.now();
        String tokenHash = hashToken(request.refreshToken());

        RefreshToken existingToken = refreshTokenRepository.findByTokenHash(tokenHash)
                .orElseThrow(() -> new AuthException(ErrorCode.INVALID_TOKEN));

        // Reuse detection: if a revoked token is presented, revoke all user sessions immediately
        if (existingToken.isRevoked()) {
            log.warn("Revoked refresh token reuse detected for user id={}. Revoking all sessions.", existingToken.getUserId());
            refreshTokenRepository.revokeAllByUserId(existingToken.getUserId());
            throw new AuthException(ErrorCode.INVALID_TOKEN, "Refresh token was already revoked");
        }

        if (existingToken.isExpired(now)) {
            existingToken.revoke();
            refreshTokenRepository.save(existingToken);
            throw new AuthException(ErrorCode.INVALID_TOKEN, "Refresh token has expired");
        }

        User user = userRepository.findById(existingToken.getUserId())
                .orElseThrow(() -> new ResourceNotFoundException(ErrorCode.USER_NOT_FOUND, "User not found"));

        if (user.getStatus() != UserStatus.ACTIVE) {
            throw new AuthException(ErrorCode.ACCESS_DENIED, "User account is not active");
        }

        // Rotate refresh token: revoke old one and issue a fresh pair
        existingToken.revoke();
        refreshTokenRepository.save(existingToken);

        return issueTokens(user);
    }

    @Override
    @Transactional
    public void logout(LogoutRequest request) {
        String tokenHash = hashToken(request.refreshToken());
        refreshTokenRepository.findByTokenHash(tokenHash).ifPresent(token -> {
            token.revoke();
            refreshTokenRepository.save(token);
            log.info("Revoked refresh token for user id={}", token.getUserId());
        });
    }

    @Override
    @Transactional(readOnly = true)
    public UserProfileResponse getCurrentUserProfile(UUID userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException(ErrorCode.USER_NOT_FOUND, "User not found"));
        return toProfileResponse(user);
    }

    @Override
    @Transactional
    public void unlockUser(UUID userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException(ErrorCode.USER_NOT_FOUND, "User not found"));
        user.unlock();
        userRepository.save(user);
        log.info("Administratively unlocked user id={}", userId);
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<AuthUserDto> findUserById(UUID userId) {
        return userRepository.findById(userId)
                .map(u -> new AuthUserDto(u.getId(), u.getUsername(), u.getEmail(), u.getRole(), u.getStatus()));
    }

    @Override
    @Transactional(readOnly = true)
    public boolean existsById(UUID userId) {
        return userRepository.existsById(userId);
    }

    @Override
    public Optional<UUID> getCurrentAuthenticatedUserId() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication != null && authentication.getPrincipal() instanceof BankingUserDetails details) {
            return Optional.of(details.getUserId());
        }
        return Optional.empty();
    }

    private AuthResponse issueTokens(User user) {
        String accessToken = jwtTokenProvider.generateAccessToken(user);
        String rawRefreshToken = generateOpaqueRefreshToken();
        Instant expiresAt = Instant.now().plusMillis(jwtProperties.getJwt().getRefreshTokenExpirationMs());

        RefreshToken refreshToken = RefreshToken.builder()
                .userId(user.getId())
                .tokenHash(hashToken(rawRefreshToken))
                .expiresAt(expiresAt)
                .revoked(false)
                .build();
        refreshTokenRepository.save(refreshToken);

        return AuthResponse.of(
                accessToken,
                rawRefreshToken,
                jwtTokenProvider.getAccessTokenExpirationSeconds(),
                toProfileResponse(user)
        );
    }

    private UserProfileResponse toProfileResponse(User user) {
        return new UserProfileResponse(
                user.getId(),
                user.getUsername(),
                user.getEmail(),
                user.getRole(),
                user.getStatus()
        );
    }

    private String generateOpaqueRefreshToken() {
        byte[] bytes = new byte[48];
        SECURE_RANDOM.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    private String hashToken(String rawToken) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hashed = digest.digest(rawToken.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hashed);
        } catch (NoSuchAlgorithmException ex) {
            throw new IllegalStateException("SHA-256 algorithm not available", ex);
        }
    }
}
