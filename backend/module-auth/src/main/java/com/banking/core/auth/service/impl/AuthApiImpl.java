package com.banking.core.auth.service.impl;

import com.banking.core.auth.domain.repository.UserRepository;
import com.banking.core.auth.exposed.AuthApi;
import com.banking.core.auth.exposed.AuthUserDto;
import com.banking.core.auth.security.BankingUserDetails;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;
import java.util.UUID;

/**
 * Dedicated cross-module facade implementing {@link AuthApi}.
 * Exposes read-only user identity lookup and security context utilities to other modules.
 */
@Service
@RequiredArgsConstructor
public class AuthApiImpl implements AuthApi {

    private final UserRepository userRepository;

    /**
     * Looks up a user summary DTO by UUID for cross-module verification.
     */
    @Override
    @Transactional(readOnly = true)
    public Optional<AuthUserDto> findUserById(UUID userId) {
        return userRepository.findById(userId)
                .map(u -> new AuthUserDto(u.getId(), u.getUsername(), u.getEmail(), u.getRole(), u.getStatus()));
    }

    /**
     * Checks whether a user account exists for the given UUID.
     */
    @Override
    @Transactional(readOnly = true)
    public boolean existsById(UUID userId) {
        return userRepository.existsById(userId);
    }

    /**
     * Extracts the currently authenticated user ID from the Spring SecurityContext.
     */
    @Override
    public Optional<UUID> getCurrentAuthenticatedUserId() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication != null && authentication.getPrincipal() instanceof BankingUserDetails details) {
            return Optional.of(details.getUserId());
        }
        return Optional.empty();
    }
}
