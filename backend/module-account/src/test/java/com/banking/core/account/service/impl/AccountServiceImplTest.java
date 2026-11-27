package com.banking.core.account.service.impl;

import com.banking.core.account.api.dto.request.OpenAccountRequest;
import com.banking.core.account.api.dto.response.AccountResponse;
import com.banking.core.account.domain.entity.Account;
import com.banking.core.account.domain.enums.AccountStatus;
import com.banking.core.account.domain.enums.AccountType;
import com.banking.core.account.domain.exception.AccountException;
import com.banking.core.account.domain.repository.AccountRepository;
import com.banking.core.auth.domain.enums.Role;
import com.banking.core.common.exception.ErrorCode;
import com.banking.core.common.exception.ResourceNotFoundException;
import com.banking.core.customer.exposed.CustomerApi;
import com.banking.core.customer.exposed.CustomerSummaryDto;
import com.banking.core.customer.domain.enums.CustomerStatus;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("AccountServiceImpl Unit Tests")
class AccountServiceImplTest {

    @Mock
    private AccountRepository accountRepository;

    @Mock
    private CustomerApi customerApi;

    @InjectMocks
    private AccountServiceImpl accountService;

    private UUID customerId;
    private UUID userId;
    private CustomerSummaryDto activeCustomer;

    @BeforeEach
    void setUp() {
        customerId = UUID.randomUUID();
        userId = UUID.randomUUID();
        activeCustomer = new CustomerSummaryDto(
                customerId, userId, "CIF-20250101-123456", "John Doe", "john@example.com",
                CustomerStatus.ACTIVE);
    }

    // =========================================================================
    // openAccount
    // =========================================================================

    @Test
    @DisplayName("openAccount: should create a SAVINGS account for an ACTIVE customer")
    void openAccount_shouldCreateAccountForActiveCustomer() {
        // Arrange
        OpenAccountRequest request = new OpenAccountRequest(customerId.toString(), AccountType.SAVINGS, "VND");
        when(customerApi.findCustomerById(customerId)).thenReturn(Optional.of(activeCustomer));
        when(customerApi.isCustomerActive(customerId)).thenReturn(true);
        when(accountRepository.existsByAccountNumber(anyString())).thenReturn(false);
        when(accountRepository.save(any(Account.class))).thenAnswer(inv -> {
            Account a = inv.getArgument(0);
            setAccountId(a, UUID.randomUUID());
            return a;
        });

        // Act
        AccountResponse response = accountService.openAccount(request, userId, Role.STAFF);

        // Assert
        assertThat(response.accountType()).isEqualTo(AccountType.SAVINGS);
        assertThat(response.currency()).isEqualTo("VND");
        assertThat(response.status()).isEqualTo(AccountStatus.ACTIVE);
        assertThat(response.balance()).isEqualByComparingTo(BigDecimal.ZERO);
        verify(accountRepository).save(any(Account.class));
    }

    @Test
    @DisplayName("openAccount: should throw when customer is not found")
    void openAccount_shouldThrowWhenCustomerNotFound() {
        // Arrange
        OpenAccountRequest request = new OpenAccountRequest(customerId.toString(), AccountType.SAVINGS, "VND");
        when(customerApi.findCustomerById(customerId)).thenReturn(Optional.empty());

        // Act & Assert
        assertThatThrownBy(() -> accountService.openAccount(request, userId, Role.ADMIN))
                .isInstanceOf(ResourceNotFoundException.class);
        verify(accountRepository, never()).save(any());
    }

    @Test
    @DisplayName("openAccount: should throw when customer is inactive")
    void openAccount_shouldThrowWhenCustomerInactive() {
        // Arrange
        OpenAccountRequest request = new OpenAccountRequest(customerId.toString(), AccountType.CURRENT, "USD");
        when(customerApi.findCustomerById(customerId)).thenReturn(Optional.of(activeCustomer));
        when(customerApi.isCustomerActive(customerId)).thenReturn(false);

        // Act & Assert
        assertThatThrownBy(() -> accountService.openAccount(request, userId, Role.STAFF))
                .isInstanceOf(AccountException.class)
                .hasMessageContaining("inactive");
        verify(accountRepository, never()).save(any());
    }

    @Test
    @DisplayName("openAccount: should reject SYSTEM account type from API")
    void openAccount_shouldRejectSystemAccountType() {
        // Arrange
        OpenAccountRequest request = new OpenAccountRequest(customerId.toString(), AccountType.SYSTEM, "VND");
        when(customerApi.findCustomerById(customerId)).thenReturn(Optional.of(activeCustomer));
        when(customerApi.isCustomerActive(customerId)).thenReturn(true);

        // Act & Assert
        assertThatThrownBy(() -> accountService.openAccount(request, userId, Role.ADMIN))
                .isInstanceOf(AccountException.class)
                .hasMessageContaining("SYSTEM");
        verify(accountRepository, never()).save(any());
    }

    // =========================================================================
    // getAccountById
    // =========================================================================

    @Test
    @DisplayName("getAccountById: should return account for ADMIN")
    void getAccountById_shouldReturnAccountForAdmin() {
        // Arrange
        UUID accountId = UUID.randomUUID();
        Account account = buildActiveAccount(accountId, customerId, "VND");
        when(accountRepository.findById(accountId)).thenReturn(Optional.of(account));

        // Act
        AccountResponse response = accountService.getAccountById(accountId, userId, Role.ADMIN);

        // Assert
        assertThat(response.id()).isEqualTo(accountId);
        assertThat(response.status()).isEqualTo(AccountStatus.ACTIVE);
    }

    @Test
    @DisplayName("getAccountById: should throw when account not found")
    void getAccountById_shouldThrowWhenNotFound() {
        // Arrange
        UUID accountId = UUID.randomUUID();
        when(accountRepository.findById(accountId)).thenReturn(Optional.empty());

        // Act & Assert
        assertThatThrownBy(() -> accountService.getAccountById(accountId, userId, Role.ADMIN))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    // =========================================================================
    // freeze / unfreeze / close
    // =========================================================================

    @Test
    @DisplayName("freezeAccount: should transition ACTIVE → FROZEN")
    void freezeAccount_shouldFreezeActiveAccount() {
        // Arrange
        UUID accountId = UUID.randomUUID();
        Account account = buildActiveAccount(accountId, customerId, "VND");
        when(accountRepository.findById(accountId)).thenReturn(Optional.of(account));
        when(accountRepository.save(account)).thenReturn(account);

        // Act
        AccountResponse response = accountService.freezeAccount(accountId);

        // Assert
        assertThat(response.status()).isEqualTo(AccountStatus.FROZEN);
    }

    @Test
    @DisplayName("unfreezeAccount: should transition FROZEN → ACTIVE")
    void unfreezeAccount_shouldUnfreezeAccount() {
        // Arrange
        UUID accountId = UUID.randomUUID();
        Account account = buildFrozenAccount(accountId, customerId, "VND");
        when(accountRepository.findById(accountId)).thenReturn(Optional.of(account));
        when(accountRepository.save(account)).thenReturn(account);

        // Act
        AccountResponse response = accountService.unfreezeAccount(accountId);

        // Assert
        assertThat(response.status()).isEqualTo(AccountStatus.ACTIVE);
    }

    @Test
    @DisplayName("closeAccount: should close account with zero balance")
    void closeAccount_shouldCloseZeroBalanceAccount() {
        // Arrange
        UUID accountId = UUID.randomUUID();
        Account account = buildActiveAccount(accountId, customerId, "VND");
        when(accountRepository.findById(accountId)).thenReturn(Optional.of(account));
        when(accountRepository.save(account)).thenReturn(account);

        // Act
        AccountResponse response = accountService.closeAccount(accountId);

        // Assert
        assertThat(response.status()).isEqualTo(AccountStatus.CLOSED);
    }

    @Test
    @DisplayName("closeAccount: should throw when balance is not zero")
    void closeAccount_shouldThrowWhenBalanceNotZero() {
        // Arrange
        UUID accountId = UUID.randomUUID();
        Account account = buildAccountWithBalance(accountId, customerId, "VND", new BigDecimal("1000.0000"));
        when(accountRepository.findById(accountId)).thenReturn(Optional.of(account));

        // Act & Assert
        assertThatThrownBy(() -> accountService.closeAccount(accountId))
                .isInstanceOf(AccountException.class);
    }

    // =========================================================================
    // Helpers
    // =========================================================================

    private Account buildActiveAccount(UUID id, UUID custId, String currency) {
        Account account = Account.builder()
                .customerId(custId)
                .accountNumber("ACC-20250101-100001")
                .accountType(AccountType.SAVINGS)
                .currency(currency)
                .balance(BigDecimal.ZERO)
                .status(AccountStatus.ACTIVE)
                .build();
        setAccountId(account, id);
        return account;
    }

    private Account buildFrozenAccount(UUID id, UUID custId, String currency) {
        Account account = Account.builder()
                .customerId(custId)
                .accountNumber("ACC-20250101-100002")
                .accountType(AccountType.SAVINGS)
                .currency(currency)
                .balance(BigDecimal.ZERO)
                .status(AccountStatus.FROZEN)
                .build();
        setAccountId(account, id);
        return account;
    }

    private Account buildAccountWithBalance(UUID id, UUID custId, String currency, BigDecimal balance) {
        Account account = Account.builder()
                .customerId(custId)
                .accountNumber("ACC-20250101-100003")
                .accountType(AccountType.SAVINGS)
                .currency(currency)
                .balance(balance)
                .status(AccountStatus.ACTIVE)
                .build();
        setAccountId(account, id);
        return account;
    }

    private void setAccountId(Account account, UUID id) {
        try {
            var field = com.banking.core.common.domain.BaseAuditEntity.class.getDeclaredField("id");
            field.setAccessible(true);
            field.set(account, id);
        } catch (Exception e) {
            throw new RuntimeException("Failed to set account id via reflection", e);
        }
    }
}
