package com.banking.gateway;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.reactive.AutoConfigureWebTestClient;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.web.reactive.server.WebTestClient;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@AutoConfigureWebTestClient
@DisplayName("GatewayApplication Integration Tests")
class GatewayApplicationTests {

    @Autowired
    private WebTestClient webTestClient;

    @Test
    @DisplayName("GET /gateway/health: should return UP status and configured coreBankingUrl")
    void gatewayHealth_shouldReturnUp() {
        webTestClient.get()
                .uri("/gateway/health")
                .exchange()
                .expectStatus().isOk()
                .expectBody()
                .jsonPath("$.service").isEqualTo("core-banking-gateway")
                .jsonPath("$.status").isEqualTo("UP")
                .jsonPath("$.coreBankingUrl").exists();
    }
}
