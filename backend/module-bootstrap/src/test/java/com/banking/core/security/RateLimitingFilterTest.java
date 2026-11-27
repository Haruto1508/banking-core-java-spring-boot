package com.banking.core.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import jakarta.servlet.FilterChain;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;

@DisplayName("RateLimitingFilter Unit Tests")
class RateLimitingFilterTest {

    private final ObjectMapper objectMapper = new ObjectMapper().registerModule(new JavaTimeModule());

    @Test
    @DisplayName("Should allow requests within quota and return 429 once limit is exceeded")
    void shouldEnforceRateLimitOnLoginEndpoint() throws Exception {
        RateLimitingFilter filter = new RateLimitingFilter(objectMapper, null, true, false);
        FilterChain chain = mock(FilterChain.class);

        // Login limit is 10 per 60s
        for (int i = 0; i < 10; i++) {
            MockHttpServletRequest req = new MockHttpServletRequest("POST", "/api/v1/auth/login");
            req.setRemoteAddr("192.168.1.50");
            MockHttpServletResponse res = new MockHttpServletResponse();

            filter.doFilter(req, res, chain);
            assertThat(res.getStatus()).isEqualTo(200);
        }
        verify(chain, times(10)).doFilter(any(), any());

        // 11th request must be blocked with 429 Too Many Requests
        MockHttpServletRequest blockedReq = new MockHttpServletRequest("POST", "/api/v1/auth/login");
        blockedReq.setRemoteAddr("192.168.1.50");
        MockHttpServletResponse blockedRes = new MockHttpServletResponse();

        filter.doFilter(blockedReq, blockedRes, chain);

        assertThat(blockedRes.getStatus()).isEqualTo(429);
        assertThat(blockedRes.getHeader("Retry-After")).isEqualTo("60");
        assertThat(blockedRes.getContentAsString()).contains("ERR_SEC_429");
        verify(chain, times(10)).doFilter(any(), any());
    }

    @Test
    @DisplayName("Should not rate-limit non-sensitive GET endpoints")
    void shouldSkipNonSensitiveEndpoints() throws Exception {
        RateLimitingFilter filter = new RateLimitingFilter(objectMapper, null, true, false);
        FilterChain chain = mock(FilterChain.class);

        for (int i = 0; i < 20; i++) {
            MockHttpServletRequest req = new MockHttpServletRequest("GET", "/api/v1/health");
            MockHttpServletResponse res = new MockHttpServletResponse();
            filter.doFilter(req, res, chain);
            assertThat(res.getStatus()).isEqualTo(200);
        }

        verify(chain, times(20)).doFilter(any(), any());
    }
}
