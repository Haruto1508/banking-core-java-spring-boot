package com.banking.core.transaction.service.impl;

import com.banking.core.account.exposed.AccountApi;
import com.banking.core.account.exposed.AccountSummaryDto;
import com.banking.core.auth.domain.enums.Role;
import com.banking.core.common.dto.PageResponse;
import com.banking.core.common.exception.ErrorCode;
import com.banking.core.common.exception.ResourceNotFoundException;
import com.banking.core.customer.exposed.CustomerApi;
import com.banking.core.customer.exposed.CustomerSummaryDto;
import com.banking.core.transaction.api.dto.response.TransactionResponse;
import com.banking.core.transaction.domain.entity.Transaction;
import com.banking.core.transaction.domain.enums.TransactionStatus;
import com.banking.core.transaction.domain.enums.TransactionType;
import com.banking.core.transaction.domain.repository.TransactionRepository;
import com.banking.core.transaction.service.TransactionQueryService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

/**
 * Read-only query implementation of {@link TransactionQueryService}.
 */
@Service
@RequiredArgsConstructor
public class TransactionQueryServiceImpl implements TransactionQueryService {

    private final TransactionRepository transactionRepository;
    private final AccountApi accountApi;
    private final CustomerApi customerApi;

    /**
     * Fetches a single transaction by UUID with IDOR check for CUSTOMER role.
     */
    @Override
    @Transactional(readOnly = true)
    public TransactionResponse getTransactionById(UUID transactionId, UUID requesterUserId, Role requesterRole) {
        Transaction transaction = transactionRepository.findById(transactionId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        ErrorCode.RESOURCE_NOT_FOUND, "Transaction not found: " + transactionId));

        if (requesterRole == Role.CUSTOMER) {
            verifyTransactionAccessForCustomer(transaction, requesterUserId);
        }

        return TransactionMapper.toResponse(transaction);
    }

    /**
     * Queries paginated transaction history for an account with IDOR check for CUSTOMER role.
     */
    @Override
    @Transactional(readOnly = true)
    public PageResponse<TransactionResponse> getTransactionHistory(
            UUID accountId,
            TransactionType type,
            TransactionStatus status,
            Pageable pageable,
            UUID requesterUserId,
            Role requesterRole) {

        AccountSummaryDto account = accountApi.findAccountById(accountId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        ErrorCode.ACCOUNT_NOT_FOUND, "Account not found: " + accountId));

        if (requesterRole == Role.CUSTOMER) {
            verifyAccountOwnershipForCustomer(account, requesterUserId);
        }

        Page<TransactionResponse> page = transactionRepository
                .findHistoryByAccountId(accountId, type, status, pageable)
                .map(TransactionMapper::toResponse);

        return PageResponse.from(page);
    }

    private void verifyAccountOwnershipForCustomer(AccountSummaryDto account, UUID requesterUserId) {
        CustomerSummaryDto ownCustomer = customerApi.findCustomerByUserId(requesterUserId)
                .orElseThrow(() -> new AccessDeniedException("No customer profile linked to current user"));
        if (!ownCustomer.id().equals(account.customerId())) {
            throw new AccessDeniedException("Customers can only operate on their own accounts");
        }
    }

    private void verifyTransactionAccessForCustomer(Transaction transaction, UUID requesterUserId) {
        CustomerSummaryDto ownCustomer = customerApi.findCustomerByUserId(requesterUserId)
                .orElseThrow(() -> new AccessDeniedException("No customer profile linked to current user"));

        boolean ownsSource = transaction.getSourceAccountId() != null &&
                accountApi.findAccountById(transaction.getSourceAccountId())
                        .map(acc -> ownCustomer.id().equals(acc.customerId()))
                        .orElse(false);

        boolean ownsTarget = transaction.getTargetAccountId() != null &&
                accountApi.findAccountById(transaction.getTargetAccountId())
                        .map(acc -> ownCustomer.id().equals(acc.customerId()))
                        .orElse(false);

        if (!ownsSource && !ownsTarget) {
            throw new AccessDeniedException("Customers can only view their own transactions");
        }
    }
}
