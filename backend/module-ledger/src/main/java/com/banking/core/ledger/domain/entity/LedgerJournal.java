package com.banking.core.ledger.domain.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.UUID;

/**
 * A LedgerJournal groups a balanced set of LedgerEntry records for one financial event.
 * <p>
 * Journals are IMMUTABLE once posted:
 * - No UPDATE or DELETE is ever performed on a posted journal.
 * - Corrections are made by posting a reversal journal (new record).
 * <p>
 * Each journal maps to exactly one Transaction (transactionId).
 */
@Entity
@Table(name = "ledger_journals")
@Getter
@Builder
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor(access = AccessLevel.PRIVATE)
public class LedgerJournal {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    /**
     * Human-readable unique journal reference (e.g. "JRN-20250101-123456").
     */
    @Column(name = "journal_ref", nullable = false, unique = true, length = 64, updatable = false)
    private String journalRef;

    /**
     * UUID of the Transaction that triggered this journal.
     * Stored as a plain UUID column — no JPA @ManyToOne across modules.
     */
    @Column(name = "transaction_id", nullable = false, updatable = false)
    private UUID transactionId;

    /**
     * If this is a reversal journal, this field points to the original journal ID.
     * NULL for non-reversal journals.
     */
    @Column(name = "original_journal_id", updatable = false)
    private UUID originalJournalId;

    /**
     * Human-readable description of the financial event (e.g. "DEPOSIT 500,000 VND").
     */
    @Column(name = "description", nullable = false, length = 255, updatable = false)
    private String description;

    /**
     * Wall-clock timestamp when this journal was posted to the ledger.
     * Set once at creation; never updated.
     */
    @Column(name = "posted_at", nullable = false, updatable = false)
    private Instant postedAt;

    /**
     * Creation timestamp matching DB schema.
     */
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;
}
