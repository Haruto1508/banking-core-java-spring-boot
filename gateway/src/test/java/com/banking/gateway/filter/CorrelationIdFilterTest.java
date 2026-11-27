package com.banking.gateway.filter;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.cloud.gateway.filter.GatewayFilterChain;
import org.springframework.mock.http.server.reactive.MockServerHttpRequest;
import org.springframework.mock.web.server.MockServerWebExchange;
import reactor.core.publisher.Mono;
import reactor.test.StepVerifier;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

@DisplayName("CorrelationIdFilter Unit Tests")
class CorrelationIdFilterTest {

    private final CorrelationIdFilter filter = new CorrelationIdFilter();

    @Test
    @DisplayName("Should generate X-Correlation-Id when missing from incoming request")
    void shouldGenerateCorrelationIdWhenMissing() {
        MockServerHttpRequest request = MockServerHttpRequest.get("/api/v1/accounts").build();
        MockServerWebExchange exchange = MockServerWebExchange.from(request);

        GatewayFilterChain chain = mock(GatewayFilterChain.class);
        when(chain.filter(any())).thenAnswer(inv -> Mono.empty());

        StepVerifier.create(filter.filter(exchange, chain))
                .verifyComplete();

        String responseCorrelationId = exchange.getResponse().getHeaders()
                .getFirst(CorrelationIdFilter.CORRELATION_ID_HEADER);
        assertThat(responseCorrelationId).isNotBlank();
    }

    @Test
    @DisplayName("Should preserve existing X-Correlation-Id header")
    void shouldPreserveIncomingCorrelationId() {
        String customId = "trace-12345-abc";
        MockServerHttpRequest request = MockServerHttpRequest.get("/api/v1/accounts")
                .header(CorrelationIdFilter.CORRELATION_ID_HEADER, customId)
                .build();
        MockServerWebExchange exchange = MockServerWebExchange.from(request);

        GatewayFilterChain chain = mock(GatewayFilterChain.class);
        when(chain.filter(any())).thenAnswer(inv -> Mono.empty());

        StepVerifier.create(filter.filter(exchange, chain))
                .verifyComplete();

        String responseCorrelationId = exchange.getResponse().getHeaders()
                .getFirst(CorrelationIdFilter.CORRELATION_ID_HEADER);
        assertThat(responseCorrelationId).isEqualTo(customId);
    }
}
