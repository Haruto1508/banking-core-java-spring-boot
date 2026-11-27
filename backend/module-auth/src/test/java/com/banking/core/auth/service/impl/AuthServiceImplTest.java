package com.banking.core.auth.service.impl;

import com.banking.core.audit.exposed.AuditApi;
import com.banking.core.auth.api.dto.request.LoginRequest;
import com.banking.core.auth.api.dto.request.RefreshTokenRequest;
import com.banking.core.auth.api.dto.request.RegisterRequest;
import com.banking.core.auth.api.dto.response.AuthResponse;
import com.banking.core.auth.domain.entity.RefreshToken;
import com.banking.core.auth.domain.entity.User;
import com.banking.core.auth.domain.enums.Role;
import com.banking.core.auth.domain.enums.UserStatus;
import com.banking.core.auth.domain.exception.AuthException;
import com.banking.core.auth.domain.repository.RefreshTokenRepository;
import com.banking.core.auth.domain.repository.UserRepository;
import com.banking.core.auth.security.JwtProperties;
import com.banking.core.auth.security.JwtTokenProvider;
import com.banking.core.common.exception.ErrorCode;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AuthServiceImplTest {

    @Mock
    private UserRepository userRepository;
    @Mock
    private RefreshTokenRepository refreshTokenRepository;
    @Mock
    private PasswordEncoder passwordEncoder;
    @Mock
    private JwtTokenProvider jwtTokenProvider;
    @Mock
    private AuditApi auditApi;

    private JwtProperties jwtProperties;
    private AuthServiceImpl authService;

    @BeforeEach
    void setUp() {
        jwtProperties = new JwtProperties();
        jwtProperties.getJwt().setSecretKey("404E635266556A586E3272357538782F413F4428472B4B6250645367566B5970");
        jwtProperties.getJwt().setAccessTokenExpirationMs(900_000L);
        jwtProperties.getJwt().setRefreshTokenExpirationMs(604_800_000L);
        jwtProperties.getLogin().setMaxFailedAttempts(5);
        jwtProperties.getLogin().setLockDurationMinutes(15);

        authService = new AuthServiceImpl(
                userRepository,
                refreshTokenRepository,
                passwordEncoder,
                jwtTokenProvider,
                jwtProperties,
                auditApi
        );
    }

    @Test
    @DisplayName("Should register new customer user with hashed password and issue tokens")
    void register_success() {
        RegisterRequest request = new RegisterRequest("john_doe", "john@example.com", "StrongPass123!");
        when(userRepository.existsByUsername("john_doe")).thenReturn(false);
        when(userRepository.existsByEmail("john@example.com")).thenReturn(false);
        when(passwordEncoder.encode("StrongPass123!")).thenReturn("hashed_pw");
        when(jwtTokenProvider.generateAccessToken(any(User.class))).thenReturn("access_jwt");
        when(jwtTokenProvider.getAccessTokenExpirationSeconds()).thenReturn(900L);
        when(userRepository.save(any(User.class))).thenAnswer(inv -> {
            User u = inv.getArgument(0);
            u.setId(UUID.randomUUID());
            return u;
        });

        AuthResponse response = authService.register(request);

        assertThat(response.accessToken()).isEqualTo("access_jwt");
        assertThat(response.refreshToken()).isNotBlank();
        assertThat(response.user().role()).isEqualTo(Role.CUSTOMER);

        ArgumentCaptor<User> userCaptor = ArgumentCaptor.forClass(User.class);
        verify(userRepository).save(userCaptor.capture());
        assertThat(userCaptor.getValue().getPasswordHash()).isEqualTo("hashed_pw");
        verify(refreshTokenRepository).save(any(RefreshToken.class));
    }

    @Test
    @DisplayName("Should throw USER_ALREADY_EXISTS when username is taken")
    void register_duplicateUsername_throws() {
        RegisterRequest request = new RegisterRequest("existing", "new@example.com", "StrongPass123!");
        when(userRepository.existsByUsername("existing")).thenReturn(true);

        assertThatThrownBy(() -> authService.register(request))
                .isInstanceOf(AuthException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.USER_ALREADY_EXISTS);
    }

    @Test
    @DisplayName("Should lock account after reaching max failed login attempts")
    void login_maxFailedAttempts_locksAccount() {
        User user = User.builder()
                .username("john_doe")
                .email("john@example.com")
                .passwordHash("hashed_pw")
                .role(Role.CUSTOMER)
                .status(UserStatus.ACTIVE)
                .failedLoginAttempts(4)
                .build();
        user.setId(UUID.randomUUID());

        when(userRepository.findByUsernameOrEmail("john_doe", "john_doe")).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("wrong_pw", "hashed_pw")).thenReturn(false);

        LoginRequest request = new LoginRequest("john_doe", "wrong_pw");

        assertThatThrownBy(() -> authService.login(request))
                .isInstanceOf(AuthException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.ACCOUNT_LOCKED);

        assertThat(user.getStatus()).isEqualTo(UserStatus.LOCKED);
        assertThat(user.getFailedLoginAttempts()).isEqualTo(5);
        assertThat(user.getLockedUntil()).isAfter(Instant.now());
        verify(userRepository).save(user);
    }

    @Test
    @DisplayName("Should revoke all user refresh tokens when a revoked refresh token is reused")
    void refreshToken_reusedRevokedToken_revokesAllUserTokens() {
        UUID userId = UUID.randomUUID();
        RefreshToken revokedToken = RefreshToken.builder()
                .userId(userId)
                .tokenHash("some_hash")
                .expiresAt(Instant.now().plusSeconds(3600))
                .revoked(true)
                .build();

        when(refreshTokenRepository.findByTokenHash(anyString())).thenReturn(Optional.of(revokedToken));

        assertThatThrownBy(() -> authService.refreshToken(new RefreshTokenRequest("raw_token")))
                .isInstanceOf(AuthException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.INVALID_TOKEN);

        verify(refreshTokenRepository).revokeAllByUserId(userId);
    }
}
