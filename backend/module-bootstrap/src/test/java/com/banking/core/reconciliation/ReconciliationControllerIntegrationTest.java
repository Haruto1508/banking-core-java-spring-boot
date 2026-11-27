package com.banking.core.reconciliation;

import com.banking.core.CoreBankingApplication;
import com.banking.core.account.api.dto.request.OpenAccountRequest;
import com.banking.core.account.api.dto.response.AccountResponse;
import com.banking.core.account.domain.enums.AccountType;
import com.banking.core.account.service.AccountService;
import com.banking.core.auth.domain.enums.Role;
import com.banking.core.customer.api.dto.request.CreateCustomerRequest;
import com.banking.core.customer.api.dto.response.CustomerResponse;
import com.banking.core.customer.service.CustomerService;
import com.banking.core.transaction.api.dto.request.DepositRequest;
import com.banking.core.transaction.service.TransactionService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.util.UUID;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest(classes = CoreBankingApplication.class)
@AutoConfigureMockMvc
@ActiveProfiles("test")
@DisplayName("ReconciliationController Integration Tests")
class ReconciliationControllerIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private CustomerService customerService;

    @Autowired
    private AccountService accountService;

    @Autowired
    private TransactionService transactionService;

    @Test
    @WithMockUser(roles = "ADMIN")
    @DisplayName("GET /api/v1/reconciliation/accounts/{id}: ADMIN should get balanced=true after deposit")
    void reconcileAccount_shouldReturnBalancedForAdmin() throws Exception {
        UUID adminId = UUID.randomUUID();
        String seed = UUID.randomUUID().toString().substring(0, 8);

        CustomerResponse customer = customerService.createCustomer(
                new CreateCustomerRequest(null, "Recon User", "RECON-" + seed, "0901112233", "recon" + seed + "@test.com"),
                adminId, Role.ADMIN);
        AccountResponse account = accountService.openAccount(
                new OpenAccountRequest(customer.id().toString(), AccountType.CURRENT, "VND"),
                adminId, Role.ADMIN);
        transactionService.deposit(
                new DepositRequest(account.id(), new BigDecimal("500000"), "VND", "Recon deposit"),
                adminId);

        mockMvc.perform(get("/api/v1/reconciliation/accounts/{accountId}", account.id()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.accountId").value(account.id().toString()))
                .andExpect(jsonPath("$.data.accountBalance").value(500000.0))
                .andExpect(jsonPath("$.data.ledgerBalance").value(500000.0))
                .andExpect(jsonPath("$.data.discrepancy").value(0.0))
                .andExpect(jsonPath("$.data.balanced").value(true));
    }

    @Test
    @WithMockUser(roles = "CUSTOMER")
    @DisplayName("GET /api/v1/reconciliation/accounts/{id}: CUSTOMER should receive 403 Forbidden")
    void reconcileAccount_shouldForbidCustomer() throws Exception {
        mockMvc.perform(get("/api/v1/reconciliation/accounts/{accountId}", UUID.randomUUID()))
                .andExpect(status().isForbidden());
    }
}
