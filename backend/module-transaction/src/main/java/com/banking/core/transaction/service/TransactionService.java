package com.banking.core.transaction.service;

import com.banking.core.auth.domain.enums.Role;
import com.banking.core.common.dto.PageResponse;
import com.banking.core.transaction.api.dto.request.DepositRequest;
import com.banking.core.transaction.api.dto.request.ReverseTransactionRequest;
import com.banking.core.transaction.api.dto.request.TransferRequest;
import com.banking.core.transaction.api.dto.request.WithdrawalRequest;
import com.banking.core.transaction.api.dto.response.TransactionResponse;
import com.banking.core.transaction.domain.enums.TransactionStatus;
import com.banking.core.transaction.domain.enums.TransactionType;
import org.springframework.data.domain.Pageable;

import java.util.UUID;

/**
 * Service interface for core financial transactions:
 * Deposit, Withdrawal, Internal Fund Transfer, Reversal, and History.
 */
public interface TransactionService {

    /**
     * Credits a customer account from the System Vault (teller deposit).
     * Only STAFF or ADMIN may perform this operation.
     *
     * @param request     deposit payload
     * @param staffUserId authenticated staff/admin user ID
     * @return committed transaction details
     */
    TransactionResponse deposit(DepositRequest request, UUID staffUserId);

    /**
     * Debits a customer account into the System Vault (teller withdrawal).
     * Only STAFF or ADMIN may perform this operation.
     *
     * @param request     withdrawal payload
     * @param staffUserId authenticated staff/admin user ID
     * @return committed transaction details
     */
    TransactionResponse withdraw(WithdrawalRequest request, UUID staffUserId);

    /**
     * Executes an internal fund transfer between two bank accounts.
     * Supports Idempotency-Key to safely handle client retries and prevent duplicates.
     * Uses deterministic lock ordering to prevent deadlocks on concurrent transfers.
     *
     * @param request         transfer payload
     * @param idempotencyKey  optional Idempotency-Key header value
     * @param requesterUserId authenticated user ID
     * @param requesterRole   role of the authenticated user
     * @return committed (or cached idempotent) transaction details
     */
    TransactionResponse transfer(
            TransferRequest request,
            String idempotencyKey,
            UUID requesterUserId,
            Role requesterRole);

    /**
     * Reverses a previously committed SUCCESS transaction by flipping account movements
     * and posting an offsetting reversal journal in the ledger.
     * Only ADMIN may perform this operation.
     *
     * @param transactionId UUID of the transaction to reverse
     * @param request       reversal reason
     * @param adminUserId   authenticated ADMIN user ID
     * @return details of the newly created REVERSAL transaction
     */
    TransactionResponse reverse(UUID transactionId, ReverseTransactionRequest request, UUID adminUserId);

    /**
     * Retrieves a single transaction by its UUID with IDOR protection for CUSTOMER role.
     *
     * @param transactionId   transaction UUID
     * @param requesterUserId authenticated user ID
     * @param requesterRole   role of the authenticated user
     * @return transaction details
     */
    TransactionResponse getTransactionById(UUID transactionId, UUID requesterUserId, Role requesterRole);

    /**
     * Retrieves paginated transaction history for a specific account with optional filters.
     * CUSTOMER role may only query accounts they own.
     *
     * @param accountId       account UUID
     * @param type            optional transaction type filter
     * @param status          optional transaction status filter
     * @param pageable        pagination parameters
     * @param requesterUserId authenticated user ID
     * @param requesterRole   role of the authenticated user
     * @return paginated transaction history
     */
    PageResponse<TransactionResponse> getTransactionHistory(
            UUID accountId,
            TransactionType type,
            TransactionStatus status,
            Pageable pageable,
            UUID requesterUserId,
            Role requesterRole);
}
