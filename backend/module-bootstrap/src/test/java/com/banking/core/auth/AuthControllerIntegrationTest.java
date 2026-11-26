package com.banking.core.auth;

import com.banking.core.auth.api.dto.request.LoginRequest;
import com.banking.core.auth.api.dto.request.LogoutRequest;
import com.banking.core.auth.api.dto.request.RefreshTokenRequest;
import com.banking.core.auth.api.dto.request.RegisterRequest;
import com.banking.core.auth.domain.entity.User;
import com.banking.core.auth.domain.enums.Role;
import com.banking.core.auth.domain.enums.UserStatus;
import com.banking.core.auth.domain.repository.UserRepository;
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

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class AuthControllerIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Test
    @DisplayName("Full Auth Lifecycle: Register -> Me -> Refresh -> Reuse Detection -> Logout")
    void fullAuthLifecycle() throws Exception {
        // 1. Register
        RegisterRequest registerReq = new RegisterRequest("alice_bank", "alice@banking.com", "SecurePass123!");
        MvcResult regResult = mockMvc.perform(post("/api/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(registerReq)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.accessToken").isNotEmpty())
                .andExpect(jsonPath("$.data.refreshToken").isNotEmpty())
                .andExpect(jsonPath("$.data.user.role").value("CUSTOMER"))
                .andReturn();

        JsonNode regData = objectMapper.readTree(regResult.getResponse().getContentAsString()).get("data");
        String accessToken = regData.get("accessToken").asText();
        String refreshToken1 = regData.get("refreshToken").asText();

        // 2. Access protected /me without token -> 401
        mockMvc.perform(get("/api/v1/auth/me"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.errorCode").value("ERR_AUTH_001"));

        // 3. Access protected /me with valid Bearer token -> 200
        mockMvc.perform(get("/api/v1/auth/me")
                        .header("Authorization", "Bearer " + accessToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.username").value("alice_bank"));

        // 4. Refresh token rotation -> issues new tokens
        MvcResult refreshResult = mockMvc.perform(post("/api/v1/auth/refresh")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new RefreshTokenRequest(refreshToken1))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.accessToken").isNotEmpty())
                .andExpect(jsonPath("$.data.refreshToken").isNotEmpty())
                .andReturn();

        String refreshToken2 = objectMapper.readTree(refreshResult.getResponse().getContentAsString())
                .get("data").get("refreshToken").asText();
        assertThat(refreshToken2).isNotEqualTo(refreshToken1);

        // 5. Reuse old refreshToken1 -> 401 and revokes refreshToken2 as well!
        mockMvc.perform(post("/api/v1/auth/refresh")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new RefreshTokenRequest(refreshToken1))))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.errorCode").value("ERR_AUTH_006"));

        // 6. Verify refreshToken2 was also invalidated due to reuse detection
        mockMvc.perform(post("/api/v1/auth/refresh")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new RefreshTokenRequest(refreshToken2))))
                .andExpect(status().isUnauthorized());

        // 7. Login & Logout
        MvcResult loginResult = mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new LoginRequest("alice_bank", "SecurePass123!"))))
                .andExpect(status().isOk())
                .andReturn();

        JsonNode loginData = objectMapper.readTree(loginResult.getResponse().getContentAsString()).get("data");
        String loginAccessToken = loginData.get("accessToken").asText();
        String loginRefreshToken = loginData.get("refreshToken").asText();

        mockMvc.perform(post("/api/v1/auth/logout")
                        .header("Authorization", "Bearer " + loginAccessToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new LogoutRequest(loginRefreshToken))))
                .andExpect(status().isOk());

        mockMvc.perform(post("/api/v1/auth/refresh")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new RefreshTokenRequest(loginRefreshToken))))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("Account Locking & RBAC: 5 failed logins lock account; only ADMIN can unlock")
    void accountLockingAndAdminUnlock() throws Exception {
        // Seed customer and admin users directly
        User customer = userRepository.save(User.builder()
                .username("bob_locked")
                .email("bob@banking.com")
                .passwordHash(passwordEncoder.encode("CorrectPass123!"))
                .role(Role.CUSTOMER)
                .status(UserStatus.ACTIVE)
                .build());

        userRepository.save(User.builder()
                .username("admin_user")
                .email("admin@banking.com")
                .passwordHash(passwordEncoder.encode("AdminPass123!"))
                .role(Role.ADMIN)
                .status(UserStatus.ACTIVE)
                .build());

        // 4 failed attempts -> 401 INVALID_CREDENTIALS
        LoginRequest badLogin = new LoginRequest("bob_locked", "WrongPass");
        for (int i = 0; i < 4; i++) {
            mockMvc.perform(post("/api/v1/auth/login")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(badLogin)))
                    .andExpect(status().isUnauthorized())
                    .andExpect(jsonPath("$.errorCode").value("ERR_AUTH_004"));
        }

        // 5th failed attempt -> 403 ACCOUNT_LOCKED
        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(badLogin)))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.errorCode").value("ERR_AUTH_003"));

        // Even with correct password, locked account cannot login
        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new LoginRequest("bob_locked", "CorrectPass123!"))))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.errorCode").value("ERR_AUTH_003"));

        // Login as ADMIN
        MvcResult adminLogin = mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new LoginRequest("admin_user", "AdminPass123!"))))
                .andExpect(status().isOk())
                .andReturn();
        String adminToken = objectMapper.readTree(adminLogin.getResponse().getContentAsString())
                .get("data").get("accessToken").asText();

        // Unlock bob_locked as ADMIN -> 200 OK
        mockMvc.perform(post("/api/v1/auth/users/" + customer.getId() + "/unlock")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk());

        // Now bob_locked can login with correct password -> 200 OK
        MvcResult bobLogin = mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new LoginRequest("bob_locked", "CorrectPass123!"))))
                .andExpect(status().isOk())
                .andReturn();
        String bobToken = objectMapper.readTree(bobLogin.getResponse().getContentAsString())
                .get("data").get("accessToken").asText();

        // RBAC check: CUSTOMER cannot call ADMIN unlock endpoint -> 403 ACCESS_DENIED
        mockMvc.perform(post("/api/v1/auth/users/" + customer.getId() + "/unlock")
                        .header("Authorization", "Bearer " + bobToken))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.errorCode").value("ERR_AUTH_002"));
    }
}
