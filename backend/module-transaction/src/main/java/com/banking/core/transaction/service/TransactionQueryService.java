package com.banking.core.transaction.service;

import com.banking.core.auth.domain.enums.Role;
import com.banking.core.common.dto.PageResponse;
import com.banking.core.transaction.api.dto.response.TransactionResponse;
import com.banking.core.transaction.domain.enums.TransactionStatus;
import com.banking.core.transaction.domain.enums.TransactionType;
import org.springframework.data.domain.Pageable;

import java.util.UUID;

/**
 * Read-only query service for retrieving transaction details and paginated history.
 * Separated from {@link TransactionService} commands following lightweight CQRS.
 */
public interface TransactionQueryService {

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
