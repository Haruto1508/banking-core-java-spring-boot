package com.banking.gateway.controller;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import reactor.core.publisher.Mono;

import java.time.Instant;
import java.util.Map;

/**
 * Exposes gateway-level health and routing metadata.
 */
@RestController
@RequestMapping("/gateway")
public class GatewayHealthController {

    private final String coreBankingUrl;

    public GatewayHealthController(@Value("${CORE_BANKING_URL:http://localhost:8080}") String coreBankingUrl) {
        this.coreBankingUrl = coreBankingUrl;
    }

    /**
     * Returns the liveness status of the Edge API Gateway and its configured downstream Core URL.
     */
    @GetMapping("/health")
    public Mono<Map<String, Object>> health() {
        return Mono.just(Map.of(
                "service", "core-banking-gateway",
                "status", "UP",
                "coreBankingUrl", coreBankingUrl,
                "timestamp", Instant.now().toString()
        ));
    }
}
