package com.banking.gateway;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

/**
 * Entry point for the Core Banking Edge API Gateway (Spring Cloud Gateway).
 * Acts as the single external entry point for Frontend and mobile clients,
 * routing traffic to the Core Banking Modular Monolith.
 */
@SpringBootApplication
public class GatewayApplication {

    public static void main(String[] args) {
        SpringApplication.run(GatewayApplication.class, args);
    }
}
