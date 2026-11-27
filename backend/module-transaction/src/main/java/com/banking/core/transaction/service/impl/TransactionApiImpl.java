package com.banking.core.transaction.service.impl;

import com.banking.core.auth.domain.enums.Role;
import com.banking.core.transaction.api.dto.request.ReverseTransactionRequest;
import com.banking.core.transaction.api.dto.response.TransactionResponse;
import com.banking.core.transaction.domain.repository.TransactionRepository;
import com.banking.core.transaction.exposed.TransactionApi;
import com.banking.core.transaction.exposed.TransactionSummaryDto;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.Optional;
import java.util.UUID;

/**
 * Dedicated cross-module facade implementing {@link TransactionApi}.
 * Used by module-payment to execute internal transfers and reversals without
 * touching TransactionRepository or REST-layer idempotency.
 */
@Service
@RequiredArgsConstructor
public class TransactionApiImpl implements TransactionApi {

    private final TransactionRepository transactionRepository;
    private final TransactionServiceImpl transactionCommandService;

    /**
     * Cross-module: looks up a transaction summary by UUID.
     */
    @Override
    @Transactional(readOnly = true)
    public Optional<TransactionSummaryDto> findTransactionById(UUID transactionId) {
        return transactionRepository.findById(transactionId).map(TransactionMapper::toSummary);
    }

    /**
     * Cross-module: executes an internal transfer on behalf of another module (e.g. Payment).
     */
    @Override
    @Transactional
    public TransactionSummaryDto executeInternalTransfer(
            UUID sourceAccountId,
            UUID targetAccountId,
            BigDecimal amount,
            String currency,
            String description,
            String idempotencyKey) {

        TransactionResponse response = transactionCommandService.executeTransferCore(
                sourceAccountId, targetAccountId, amount, currency, description,
                idempotencyKey, null, Role.ADMIN);

        return TransactionMapper.toSummary(response);
    }

    /**
     * Cross-module: reverses a transaction on behalf of another module (e.g. Payment Refund).
     */
    @Override
    @Transactional
    public TransactionSummaryDto reverseTransaction(UUID originalTransactionId, String reason) {
        TransactionResponse response = transactionCommandService.reverse(
                originalTransactionId, new ReverseTransactionRequest(reason), null);

        return TransactionMapper.toSummary(response);
    }
}
