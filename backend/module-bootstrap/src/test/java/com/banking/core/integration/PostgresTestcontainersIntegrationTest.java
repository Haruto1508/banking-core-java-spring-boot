package com.banking.core.integration;

import com.banking.core.CoreBankingApplication;
import com.banking.core.account.api.dto.request.OpenAccountRequest;
import com.banking.core.account.api.dto.response.AccountResponse;
import com.banking.core.account.domain.enums.AccountType;
import com.banking.core.account.exposed.AccountApi;
import com.banking.core.account.service.AccountService;
import com.banking.core.auth.domain.enums.Role;
import com.banking.core.customer.api.dto.request.CreateCustomerRequest;
import com.banking.core.customer.api.dto.response.CustomerResponse;
import com.banking.core.customer.service.CustomerService;
import com.banking.core.ledger.exposed.LedgerApi;
import com.banking.core.transaction.api.dto.request.DepositRequest;
import com.banking.core.transaction.api.dto.request.TransferRequest;
import com.banking.core.transaction.service.TransactionService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.math.BigDecimal;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Real PostgreSQL 16 integration test using Testcontainers.
 * Verifies Flyway migrations (V1..V4) and end-to-end ACID transfer + ledger reconciliation
 * against an actual PostgreSQL database engine.
 * <p>
 * Automatically skipped if Docker is not available in the local environment.
 */
@Testcontainers(disabledWithoutDocker = true)
@SpringBootTest(classes = CoreBankingApplication.class)
@ActiveProfiles("test")
@DisplayName("PostgreSQL 16 Testcontainers End-to-End Integration Test")
class PostgresTestcontainersIntegrationTest {

    @Container
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16-alpine")
            .withDatabaseName("core_banking_test")
            .withUsername("test_user")
            .withPassword("test_pass");

    @DynamicPropertySource
    static void configureDatasource(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", postgres::getJdbcUrl);
        registry.add("spring.datasource.username", postgres::getUsername);
        registry.add("spring.datasource.password", postgres::getPassword);
        registry.add("spring.datasource.driver-class-name", () -> "org.postgresql.Driver");
        registry.add("spring.jpa.properties.hibernate.dialect", () -> "org.hibernate.dialect.PostgreSQLDialect");
        registry.add("spring.flyway.enabled", () -> "true");
    }

    @Autowired
    private CustomerService customerService;

    @Autowired
    private AccountService accountService;

    @Autowired
    private TransactionService transactionService;

    @Autowired
    private AccountApi accountApi;

    @Autowired
    private LedgerApi ledgerApi;

    @Test
    @DisplayName("Should execute Flyway migrations and maintain ACID + Ledger balance on real PostgreSQL 16")
    void fullFlowOnPostgres_shouldMaintainFinancialInvariants() {
        UUID adminId = UUID.randomUUID();

        CustomerResponse customer = customerService.createCustomer(
                new CreateCustomerRequest(null, "PG Test User", "PG-ID-001", "0909123456", "pg@test.com"),
                adminId, Role.ADMIN);

        AccountResponse accA = accountService.openAccount(
                new OpenAccountRequest(customer.id().toString(), AccountType.CURRENT, "VND"),
                adminId, Role.ADMIN);
        AccountResponse accB = accountService.openAccount(
                new OpenAccountRequest(customer.id().toString(), AccountType.SAVINGS, "VND"),
                adminId, Role.ADMIN);

        transactionService.deposit(new DepositRequest(accA.id(), new BigDecimal("2000000"), "VND", "PG Deposit"), adminId);
        transactionService.transfer(
                new TransferRequest(accA.id(), accB.id(), new BigDecimal("750000"), "VND", "PG Transfer"),
                "PG-IDEMP-001", adminId, Role.ADMIN);

        BigDecimal balA = accountApi.findAccountById(accA.id()).orElseThrow().balance();
        BigDecimal balB = accountApi.findAccountById(accB.id()).orElseThrow().balance();

        assertThat(balA).isEqualByComparingTo("1250000.0000");
        assertThat(balB).isEqualByComparingTo("750000.0000");
        assertThat(ledgerApi.calculateLedgerBalance(accA.id())).isEqualByComparingTo(balA);
        assertThat(ledgerApi.calculateLedgerBalance(accB.id())).isEqualByComparingTo(balB);
    }
}
