package com.banking.core.transaction.service.impl;

import com.banking.core.transaction.api.dto.response.TransactionResponse;
import com.banking.core.transaction.domain.entity.Transaction;
import com.banking.core.transaction.exposed.TransactionSummaryDto;

/**
 * Package-private mapping helper shared by TransactionServiceImpl,
 * TransactionQueryServiceImpl, and TransactionApiImpl.
 */
final class TransactionMapper {

    private TransactionMapper() {
    }

    static TransactionResponse toResponse(Transaction txn) {
        return new TransactionResponse(
                txn.getId(),
                txn.getTransactionRef(),
                txn.getIdempotencyKey(),
                txn.getSourceAccountId(),
                txn.getTargetAccountId(),
                txn.getTransactionType(),
                txn.getAmount(),
                txn.getCurrency(),
                txn.getStatus(),
                txn.getFailureReason(),
                txn.getDescription(),
                txn.getCreatedAt(),
                txn.getUpdatedAt()
        );
    }

    static TransactionSummaryDto toSummary(Transaction txn) {
        return new TransactionSummaryDto(
                txn.getId(),
                txn.getTransactionRef(),
                txn.getSourceAccountId(),
                txn.getTargetAccountId(),
                txn.getTransactionType(),
                txn.getAmount(),
                txn.getCurrency(),
                txn.getStatus(),
                txn.getCreatedAt()
        );
    }

    static TransactionSummaryDto toSummary(TransactionResponse res) {
        return new TransactionSummaryDto(
                res.id(),
                res.transactionRef(),
                res.sourceAccountId(),
                res.targetAccountId(),
                res.transactionType(),
                res.amount(),
                res.currency(),
                res.status(),
                res.createdAt()
        );
    }
}
