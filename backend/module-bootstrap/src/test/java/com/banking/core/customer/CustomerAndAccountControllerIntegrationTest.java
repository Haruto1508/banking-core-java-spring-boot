package com.banking.core.customer;

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
import com.banking.core.customer.api.dto.request.UpdateCustomerRequest;
import com.banking.core.customer.api.dto.request.UpdateCustomerStatusRequest;
import com.banking.core.customer.domain.enums.CustomerStatus;
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

import java.util.UUID;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Full-stack MockMvc integration tests for CustomerController and AccountController,
 * verifying JWT authentication, RBAC, IDOR protection, and account lifecycle transitions.
 */
@SpringBootTest(classes = CoreBankingApplication.class)
@AutoConfigureMockMvc
@ActiveProfiles("test")
@DisplayName("Customer & Account API Integration Tests")
class CustomerAndAccountControllerIntegrationTest {

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
    @DisplayName("Full Customer & Account lifecycle with RBAC and IDOR protection")
    void customerAndAccountLifecycle_shouldEnforceRbacAndIdor() throws Exception {
        String suffix = UUID.randomUUID().toString().substring(0, 8);

        // 1. Register Alice and Bob as CUSTOMERs
        String aliceToken = registerCustomerAndGetToken("alice_" + suffix, "alice_" + suffix + "@test.com");
        String bobToken = registerCustomerAndGetToken("bob_" + suffix, "bob_" + suffix + "@test.com");

        // 2. Create an ADMIN user and generate JWT
        User admin = userRepository.save(User.builder()
                .username("admin_" + suffix)
                .email("admin_" + suffix + "@test.com")
                .passwordHash(passwordEncoder.encode("Admin@12345!"))
                .role(Role.ADMIN)
                .status(UserStatus.ACTIVE)
                .build());
        String adminToken = jwtTokenProvider.generateAccessToken(admin);

        // 3. Alice creates her Customer profile
        CreateCustomerRequest createCustomerReq = new CreateCustomerRequest(
                null, "Alice Nguyen", "ID-" + suffix, "0901234567", "alice_" + suffix + "@test.com");

        MvcResult customerResult = mockMvc.perform(post("/api/v1/customers")
                        .header("Authorization", "Bearer " + aliceToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(createCustomerReq)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.status").value("ACTIVE"))
                .andReturn();

        String aliceCustomerId = objectMapper.readTree(customerResult.getResponse().getContentAsString())
                .get("data").get("id").asText();

        // 4. Alice fetches her own profile via /me
        mockMvc.perform(get("/api/v1/customers/me")
                        .header("Authorization", "Bearer " + aliceToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.id").value(aliceCustomerId));

        // 5. IDOR Check: Bob (CUSTOMER) tries to view Alice's customer profile -> 403 Forbidden
        mockMvc.perform(get("/api/v1/customers/{id}", aliceCustomerId)
                        .header("Authorization", "Bearer " + bobToken))
                .andExpect(status().isForbidden());

        // 6. Alice updates her contact info
        UpdateCustomerRequest updateReq = new UpdateCustomerRequest(
                "Alice Nguyen Updated", "0909998888", "alice_new_" + suffix + "@test.com");
        mockMvc.perform(put("/api/v1/customers/{id}", aliceCustomerId)
                        .header("Authorization", "Bearer " + aliceToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(updateReq)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.fullName").value("Alice Nguyen Updated"));

        // 7. ADMIN searches customers & transitions status
        mockMvc.perform(get("/api/v1/customers?keyword=Alice")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.content").isArray());

        mockMvc.perform(patch("/api/v1/customers/{id}/status", aliceCustomerId)
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new UpdateCustomerStatusRequest(CustomerStatus.SUSPENDED))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("SUSPENDED"));

        mockMvc.perform(patch("/api/v1/customers/{id}/status", aliceCustomerId)
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new UpdateCustomerStatusRequest(CustomerStatus.ACTIVE))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("ACTIVE"));

        // 8. Alice opens a CURRENT VND bank account
        OpenAccountRequest openAccReq = new OpenAccountRequest(aliceCustomerId, AccountType.CURRENT, "VND");
        MvcResult accResult = mockMvc.perform(post("/api/v1/accounts")
                        .header("Authorization", "Bearer " + aliceToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(openAccReq)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.status").value("ACTIVE"))
                .andExpect(jsonPath("$.data.balance").value(0.0))
                .andReturn();

        String aliceAccountId = objectMapper.readTree(accResult.getResponse().getContentAsString())
                .get("data").get("id").asText();

        // 9. IDOR Check: Bob tries to read Alice's account -> 403 Forbidden
        mockMvc.perform(get("/api/v1/accounts/{id}", aliceAccountId)
                        .header("Authorization", "Bearer " + bobToken))
                .andExpect(status().isForbidden());

        // 10. RBAC Check: Alice tries to freeze her own account -> 403 Forbidden
        mockMvc.perform(patch("/api/v1/accounts/{id}/freeze", aliceAccountId)
                        .header("Authorization", "Bearer " + aliceToken))
                .andExpect(status().isForbidden());

        // 11. ADMIN freezes, unfreezes, and closes Alice's zero-balance account
        mockMvc.perform(patch("/api/v1/accounts/{id}/freeze", aliceAccountId)
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("FROZEN"));

        mockMvc.perform(patch("/api/v1/accounts/{id}/unfreeze", aliceAccountId)
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("ACTIVE"));

        mockMvc.perform(patch("/api/v1/accounts/{id}/close", aliceAccountId)
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("CLOSED"));
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
}
