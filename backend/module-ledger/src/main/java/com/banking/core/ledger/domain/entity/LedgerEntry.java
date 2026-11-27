package com.banking.core.ledger.domain.entity;

import com.banking.core.ledger.domain.enums.EntryType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

/**
 * A single debit or credit line within a LedgerJournal.
 * <p>
 * LedgerEntry records are IMMUTABLE once inserted.
 * No UPDATE or DELETE operations are ever performed on existing entries.
 * <p>
 * The double-entry invariant: for every LedgerJournal,
 * SUM(amount WHERE entry_type = 'DEBIT') == SUM(amount WHERE entry_type = 'CREDIT').
 */
@Entity
@Table(name = "ledger_entries")
@Getter
@Builder
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor(access = AccessLevel.PRIVATE)
public class LedgerEntry {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    /**
     * The parent journal that groups this entry with its counterpart.
     * Foreign key to ledger_journals.id — stored as plain UUID for immutability.
     */
    @Column(name = "journal_id", nullable = false, updatable = false)
    private UUID journalId;

    /**
     * The bank account affected by this entry (references accounts.id).
     * No JPA join — only UUID reference to avoid cross-module coupling.
     */
    @Column(name = "account_id", nullable = false, updatable = false)
    private UUID accountId;

    /** Whether this line is a DEBIT or CREDIT. */
    @Enumerated(EnumType.STRING)
    @Column(name = "entry_type", nullable = false, length = 10, updatable = false)
    private EntryType entryType;

    /**
     * The monetary amount of this entry.
     * Always positive; the entryType (DEBIT/CREDIT) determines the direction.
     * Stored as NUMERIC(19,4).
     */
    @Column(name = "amount", nullable = false, precision = 19, scale = 4, updatable = false)
    private BigDecimal amount;

    /** ISO-4217 currency code matching the account's currency. */
    @Column(name = "currency", nullable = false, length = 3, updatable = false)
    private String currency;

    /** Creation timestamp matching DB schema. */
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;
}
