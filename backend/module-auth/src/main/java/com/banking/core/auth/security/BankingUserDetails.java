package com.banking.core.auth.security;

import com.banking.core.auth.domain.entity.User;
import com.banking.core.auth.domain.enums.Role;
import com.banking.core.auth.domain.enums.UserStatus;
import lombok.Getter;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.UUID;

/**
 * Custom Spring Security UserDetails implementation wrapping our User domain entity.
 */
@Getter
public class BankingUserDetails implements UserDetails {

    private final UUID userId;
    private final String username;
    private final String email;
    private final String password;
    private final Role role;
    private final UserStatus status;
    private final boolean accountNonLocked;
    private final Collection<? extends GrantedAuthority> authorities;

    public BankingUserDetails(User user) {
        this.userId = user.getId();
        this.username = user.getUsername();
        this.email = user.getEmail();
        this.password = user.getPasswordHash();
        this.role = user.getRole();
        this.status = user.getStatus();
        this.accountNonLocked = !user.isCurrentlyLocked(Instant.now());
        this.authorities = List.of(new SimpleGrantedAuthority("ROLE_" + user.getRole().name()));
    }

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return authorities;
    }

    @Override
    public String getPassword() {
        return password;
    }

    @Override
    public String getUsername() {
        return username;
    }

    @Override
    public boolean isAccountNonExpired() {
        return true;
    }

    @Override
    public boolean isAccountNonLocked() {
        return accountNonLocked;
    }

    @Override
    public boolean isCredentialsNonExpired() {
        return true;
    }

    @Override
    public boolean isEnabled() {
        return status != UserStatus.DISABLED;
    }
}
