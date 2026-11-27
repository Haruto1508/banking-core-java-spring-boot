package com.banking.core.ledger.domain.repository;

import com.banking.core.ledger.domain.entity.LedgerEntry;
import com.banking.core.ledger.domain.enums.EntryType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

/**
 * Repository for immutable LedgerEntry records.
 * Only insert and read/aggregate queries are permitted.
 */
public interface LedgerEntryRepository extends JpaRepository<LedgerEntry, UUID> {

    /**
     * Returns all entries belonging to a specific journal.
     *
     * @param journalId journal UUID
     * @return list of entries in the journal
     */
    List<LedgerEntry> findByJournalId(UUID journalId);

    /**
     * Returns all ledger entries for a specific bank account.
     *
     * @param accountId account UUID
     * @return list of ledger entries affecting this account
     */
    List<LedgerEntry> findByAccountId(UUID accountId);

    /**
     * Computes the total amount for a given account and entry type (DEBIT or CREDIT).
     * Used for balance reconciliation against the account's stored balance.
     *
     * @param accountId account UUID
     * @param entryType DEBIT or CREDIT
     * @return sum of amounts, or ZERO if no entries exist
     */
    @Query("SELECT COALESCE(SUM(e.amount), 0) FROM LedgerEntry e WHERE e.accountId = :accountId AND e.entryType = :entryType")
    BigDecimal sumAmountByAccountIdAndEntryType(
            @Param("accountId") UUID accountId,
            @Param("entryType") EntryType entryType);
}
