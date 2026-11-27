package com.banking.core.integration;

import com.banking.core.CoreBankingApplication;
import com.banking.core.account.api.dto.request.OpenAccountRequest;
import com.banking.core.account.domain.enums.AccountType;
import com.banking.core.auth.api.dto.request.RegisterRequest;
import com.banking.core.auth.domain.entity.User;
import com.banking.core.auth.domain.enums.Role;
import com.banking.core.auth.domain.enums.UserStatus;
import com.banking.core.auth.domain.repository.UserRepository;
import com.banking.core.auth.security.JwtTokenProvider;
import com.banking.core.customer.api.dto.request.CreateCustomerRequest;
import com.banking.core.payment.api.dto.request.CreatePaymentRequest;
import com.banking.core.payment.api.dto.request.RefundPaymentRequest;
import com.banking.core.payment.domain.enums.PaymentMethod;
import com.banking.core.transaction.api.dto.request.DepositRequest;
import com.banking.core.transaction.api.dto.request.TransferRequest;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.math.BigDecimal;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * End-to-end MockMvc integration test covering Transaction, Payment,
 * Reconciliation, Notification, and Audit modules over HTTP with real JWTs.
 */
@SpringBootTest(classes = CoreBankingApplication.class)
@AutoConfigureMockMvc
@ActiveProfiles("test")
@DisplayName("Transaction, Payment, Audit & Notification E2E API Integration Tests")
class TransactionPaymentAuditNotificationIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private JwtTokenProvider jwtTokenProvider;

    @Test
    @DisplayName("Full E2E flow: Deposit -> Idempotent Transfer -> Payment -> Refund -> Reconcile -> Notifications & Audit Logs")
    void fullEndToEndFinancialFlow_shouldWorkAcrossAllModules() throws Exception {
        String suffix = UUID.randomUUID().toString().substring(0, 8);

        // 1. Setup users: Alice (CUSTOMER), Merchant (CUSTOMER), Staff, Admin
        String aliceToken = registerCustomerAndGetToken("alice_e2e_" + suffix, "alice_e2e_" + suffix + "@test.com");
        String merchantToken = registerCustomerAndGetToken("merch_e2e_" + suffix, "merch_e2e_" + suffix + "@test.com");

        User staff = userRepository.save(User.builder()
                .username("staff_e2e_" + suffix)
                .email("staff_e2e_" + suffix + "@test.com")
                .passwordHash(passwordEncoder.encode("Staff@12345!"))
                .role(Role.STAFF)
                .status(UserStatus.ACTIVE)
                .build());
        String staffToken = jwtTokenProvider.generateAccessToken(staff);

        User admin = userRepository.save(User.builder()
                .username("admin_e2e_" + suffix)
                .email("admin_e2e_" + suffix + "@test.com")
                .passwordHash(passwordEncoder.encode("Admin@12345!"))
                .role(Role.ADMIN)
                .status(UserStatus.ACTIVE)
                .build());
        String adminToken = jwtTokenProvider.generateAccessToken(admin);

        // 2. Create Customer profiles & Accounts
        UUID aliceCustomerId = createCustomer(aliceToken, "Alice E2E", "E2E-A-" + suffix, "alice_e2e_" + suffix + "@test.com");
        UUID merchantCustomerId = createCustomer(merchantToken, "Merchant E2E", "E2E-M-" + suffix, "merch_e2e_" + suffix + "@test.com");

        UUID aliceAccountId = openAccount(aliceToken, aliceCustomerId);
        UUID merchantAccountId = openAccount(merchantToken, merchantCustomerId);

        // 3. Deposit: CUSTOMER is forbidden (403); STAFF succeeds (201)
        DepositRequest depositReq = new DepositRequest(aliceAccountId, new BigDecimal("2000000"), "VND", "Initial teller deposit");
        mockMvc.perform(post("/api/v1/transactions/deposit")
                        .header("Authorization", "Bearer " + aliceToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(depositReq)))
                .andExpect(status().isForbidden());

        mockMvc.perform(post("/api/v1/transactions/deposit")
                        .header("Authorization", "Bearer " + staffToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(depositReq)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.transactionType").value("DEPOSIT"))
                .andExpect(jsonPath("$.data.status").value("SUCCESS"));

        // 4. Transfer 500,000 VND with Idempotency-Key + retry check
        String transferIdempKey = "E2E-TXN-" + suffix;
        TransferRequest transferReq = new TransferRequest(
                aliceAccountId, merchantAccountId, new BigDecimal("500000"), "VND", "E2E Transfer");

        MvcResult txn1 = mockMvc.perform(post("/api/v1/transactions/transfer")
                        .header("Authorization", "Bearer " + aliceToken)
                        .header("Idempotency-Key", transferIdempKey)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(transferReq)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.status").value("SUCCESS"))
                .andReturn();

        MvcResult txn2 = mockMvc.perform(post("/api/v1/transactions/transfer")
                        .header("Authorization", "Bearer " + aliceToken)
                        .header("Idempotency-Key", transferIdempKey)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(transferReq)))
                .andExpect(status().isCreated())
                .andReturn();

        String ref1 = objectMapper.readTree(txn1.getResponse().getContentAsString()).get("data").get("transactionRef").asText();
        String ref2 = objectMapper.readTree(txn2.getResponse().getContentAsString()).get("data").get("transactionRef").asText();
        assertThat(ref2).isEqualTo(ref1);

        // 5. Payment: Alice pays Merchant 300,000 VND via QR_CODE
        CreatePaymentRequest paymentReq = new CreatePaymentRequest(
                aliceAccountId, merchantAccountId, new BigDecimal("300000"), "VND",
                PaymentMethod.QR_CODE, "Coffee order #101");

        MvcResult payResult = mockMvc.perform(post("/api/v1/payments")
                        .header("Authorization", "Bearer " + aliceToken)
                        .header("Idempotency-Key", "E2E-PAY-" + suffix)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(paymentReq)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.status").value("COMPLETED"))
                .andReturn();

        String paymentId = objectMapper.readTree(payResult.getResponse().getContentAsString())
                .get("data").get("id").asText();

        // 6. Refund Payment as STAFF (300,000 VND returned to Alice)
        mockMvc.perform(post("/api/v1/payments/{id}/refund", paymentId)
                        .header("Authorization", "Bearer " + staffToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new RefundPaymentRequest("Order cancelled"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("REFUNDED"));

        // 7. Verify final balances via Reconciliation API (ADMIN):
        // Alice: 2,000,000 - 500,000 - 300,000 + 300,000 = 1,500,000 VND
        // Merchant: 500,000 + 300,000 - 300,000 = 500,000 VND
        mockMvc.perform(get("/api/v1/reconciliation/accounts/{id}", aliceAccountId)
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.accountBalance").value(1500000.0))
                .andExpect(jsonPath("$.data.ledgerBalance").value(1500000.0))
                .andExpect(jsonPath("$.data.balanced").value(true));

        mockMvc.perform(get("/api/v1/reconciliation/accounts/{id}", merchantAccountId)
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.accountBalance").value(500000.0))
                .andExpect(jsonPath("$.data.ledgerBalance").value(500000.0))
                .andExpect(jsonPath("$.data.balanced").value(true));

        // 8. Verify post-commit @Async Notifications were created for Alice
        Thread.sleep(300);
        mockMvc.perform(get("/api/v1/notifications/me")
                        .header("Authorization", "Bearer " + aliceToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.totalElements").value(org.hamcrest.Matchers.greaterThanOrEqualTo(2)));

        // 9. Verify Audit Logs are accessible by ADMIN and forbidden for CUSTOMER
        mockMvc.perform(get("/api/v1/audit-logs/resource/ACCOUNT/{id}", aliceAccountId)
                        .header("Authorization", "Bearer " + aliceToken))
                .andExpect(status().isForbidden());

        mockMvc.perform(get("/api/v1/audit-logs/resource/ACCOUNT/{id}", aliceAccountId)
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.totalElements").value(org.hamcrest.Matchers.greaterThanOrEqualTo(1)));
    }

    private String registerCustomerAndGetToken(String username, String email) throws Exception {
        RegisterRequest reg = new RegisterRequest(username, email, "StrongPass@123");
        MvcResult result = mockMvc.perform(post("/api/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(reg)))
                .andExpect(status().isCreated())
                .andReturn();
        JsonNode json = objectMapper.readTree(result.getResponse().getContentAsString());
        return json.get("data").get("accessToken").asText();
    }

    private UUID createCustomer(String token, String fullName, String identityNumber, String email) throws Exception {
        CreateCustomerRequest req = new CreateCustomerRequest(
                null, fullName, identityNumber, "0901234567", email);
        MvcResult result = mockMvc.perform(post("/api/v1/customers")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isCreated())
                .andReturn();
        return UUID.fromString(objectMapper.readTree(result.getResponse().getContentAsString())
                .get("data").get("id").asText());
    }

    private UUID openAccount(String token, UUID customerId) throws Exception {
        OpenAccountRequest req = new OpenAccountRequest(customerId.toString(), AccountType.CURRENT, "VND");
        MvcResult result = mockMvc.perform(post("/api/v1/accounts")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isCreated())
                .andReturn();
        return UUID.fromString(objectMapper.readTree(result.getResponse().getContentAsString())
                .get("data").get("id").asText());
    }
}
