package com.banking.core.security;

import com.banking.core.common.dto.ErrorResponse;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.time.Duration;
import java.time.Instant;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;

/**
 * Fixed-window rate limiting filter for sensitive authentication and financial endpoints.
 * <p>
 * Uses Redis atomic counters when {@code banking.rate-limit.redis-enabled=true} and a
 * StringRedisTemplate bean is present; otherwise falls back to a thread-safe in-memory
 * window map so single-node deployments and tests work out of the box.
 */
@Component
public class RateLimitingFilter extends OncePerRequestFilter {

    private static final Logger log = LoggerFactory.getLogger(RateLimitingFilter.class);
    private static final long WINDOW_SECONDS = 60L;

    private static final Map<String, Integer> ENDPOINT_LIMITS = Map.of(
            "/api/v1/auth/login", 10,
            "/api/v1/auth/register", 5,
            "/api/v1/transactions/transfer", 30
    );

    private final ObjectMapper objectMapper;
    private final StringRedisTemplate redisTemplate;
    private final boolean enabled;
    private final boolean redisEnabled;
    private final ConcurrentHashMap<String, WindowCounter> inMemoryWindows = new ConcurrentHashMap<>();

    public RateLimitingFilter(
            ObjectMapper objectMapper,
            @Autowired(required = false) StringRedisTemplate redisTemplate,
            @Value("${banking.rate-limit.enabled:true}") boolean enabled,
            @Value("${banking.rate-limit.redis-enabled:false}") boolean redisEnabled) {
        this.objectMapper = objectMapper;
        this.redisTemplate = redisTemplate;
        this.enabled = enabled;
        this.redisEnabled = redisEnabled;
    }

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain) throws ServletException, IOException {

        if (!enabled || !"POST".equalsIgnoreCase(request.getMethod())) {
            filterChain.doFilter(request, response);
            return;
        }

        String path = request.getRequestURI();
        Integer limit = ENDPOINT_LIMITS.get(path);
        if (limit == null) {
            filterChain.doFilter(request, response);
            return;
        }

        String clientIp = extractClientIp(request);
        String key = "ratelimit:" + path + ":" + clientIp;

        if (!isAllowed(key, limit)) {
            log.warn("Rate limit exceeded for ip={} path={} limit={}/{}s", clientIp, path, limit, WINDOW_SECONDS);
            writeTooManyRequestsResponse(response, path);
            return;
        }

        filterChain.doFilter(request, response);
    }

    /**
     * Checks and increments the counter for the given rate-limit key.
     *
     * @param key   composite key (endpoint + client IP)
     * @param limit maximum allowed requests per 60-second window
     * @return true if request is within quota, false if rate-limited
     */
    boolean isAllowed(String key, int limit) {
        if (redisEnabled && redisTemplate != null) {
            try {
                Long count = redisTemplate.opsForValue().increment(key);
                if (count != null && count == 1L) {
                    redisTemplate.expire(key, Duration.ofSeconds(WINDOW_SECONDS));
                }
                return count != null && count <= limit;
            } catch (Exception ex) {
                log.warn("Redis rate limit check failed ({}); falling back to in-memory counter", ex.getMessage());
            }
        }

        long currentEpochWindow = Instant.now().getEpochSecond() / WINDOW_SECONDS;
        WindowCounter counter = inMemoryWindows.compute(key, (k, existing) -> {
            if (existing == null || existing.windowId != currentEpochWindow) {
                return new WindowCounter(currentEpochWindow);
            }
            return existing;
        });

        return counter.count.incrementAndGet() <= limit;
    }

    private void writeTooManyRequestsResponse(HttpServletResponse response, String path) throws IOException {
        response.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
        response.setHeader("Retry-After", String.valueOf(WINDOW_SECONDS));
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);

        ErrorResponse error = ErrorResponse.builder()
                .errorCode("ERR_SEC_429")
                .message("Too many requests. Please retry after " + WINDOW_SECONDS + " seconds.")
                .path(path)
                .timestamp(Instant.now())
                .build();

        response.getWriter().write(objectMapper.writeValueAsString(error));
    }

    private String extractClientIp(HttpServletRequest request) {
        String forwarded = request.getHeader("X-Forwarded-For");
        if (forwarded != null && !forwarded.isBlank()) {
            return forwarded.split(",")[0].trim();
        }
        return request.getRemoteAddr() != null ? request.getRemoteAddr() : "unknown";
    }

    private static final class WindowCounter {
        final long windowId;
        final AtomicInteger count = new AtomicInteger(0);

        WindowCounter(long windowId) {
            this.windowId = windowId;
        }
    }
}
