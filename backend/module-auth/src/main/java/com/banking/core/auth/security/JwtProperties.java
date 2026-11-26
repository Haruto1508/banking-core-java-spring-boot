package com.banking.core.auth.security;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

/**
 * Configuration properties for JWT token generation and login locking policies.
 */
@Getter
@Setter
@Component
@ConfigurationProperties(prefix = "banking.security")
public class JwtProperties {

    private Jwt jwt = new Jwt();
    private Login login = new Login();

    @Getter
    @Setter
    public static class Jwt {
        private String secretKey;
        private long accessTokenExpirationMs = 900_000L;      // 15 minutes
        private long refreshTokenExpirationMs = 604_800_000L; // 7 days
    }

    @Getter
    @Setter
    public static class Login {
        private int maxFailedAttempts = 5;
        private long lockDurationMinutes = 15;
    }
}
