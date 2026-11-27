package com.banking.core.ledger.domain.repository;

import com.banking.core.ledger.domain.entity.LedgerJournal;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

/**
 * Repository for immutable LedgerJournal records.
 * Only insert and read operations are used.
 */
public interface LedgerJournalRepository extends JpaRepository<LedgerJournal, UUID> {

    /**
     * Finds the journal associated with a specific transaction ID.
     *
     * @param transactionId UUID of the triggering transaction
     * @return optional matching journal
     */
    Optional<LedgerJournal> findByTransactionId(UUID transactionId);

    /**
     * Checks whether a reversal journal already exists for the given original journal.
     *
     * @param originalJournalId UUID of the original journal
     * @return true if already reversed
     */
    boolean existsByOriginalJournalId(UUID originalJournalId);
}
