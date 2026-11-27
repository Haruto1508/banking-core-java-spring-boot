package com.banking.core.config;

import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Contact;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.security.SecurityRequirement;
import io.swagger.v3.oas.models.security.SecurityScheme;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * OpenAPI / Swagger UI configuration with global JWT Bearer authentication support.
 */
@Configuration
public class OpenApiConfig {

    private static final String SECURITY_SCHEME_NAME = "bearerAuth";

    @Bean
    public OpenAPI coreBankingOpenAPI() {
        return new OpenAPI()
                .info(new Info()
                        .title("Core Banking System API")
                        .version("1.0.0")
                        .description("Modular Monolith Core Banking System with Double-Entry Bookkeeping, " +
                                "Pessimistic Locking, Idempotency, and RBAC Security.")
                        .contact(new Contact().name("Core Banking Engineering")))
                .addSecurityItem(new SecurityRequirement().addList(SECURITY_SCHEME_NAME))
                .components(new Components()
                        .addSecuritySchemes(SECURITY_SCHEME_NAME, new SecurityScheme()
                                .name(SECURITY_SCHEME_NAME)
                                .type(SecurityScheme.Type.HTTP)
                                .scheme("bearer")
                                .bearerFormat("JWT")
                                .description("Paste your JWT Access Token here (without 'Bearer ' prefix)")));
    }
}
