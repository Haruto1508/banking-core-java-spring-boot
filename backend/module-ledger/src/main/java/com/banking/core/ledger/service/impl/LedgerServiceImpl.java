package com.banking.core.ledger.service.impl;

import com.banking.core.common.exception.ErrorCode;
import com.banking.core.common.exception.ResourceNotFoundException;
import com.banking.core.ledger.domain.entity.LedgerEntry;
import com.banking.core.ledger.domain.entity.LedgerJournal;
import com.banking.core.ledger.domain.enums.EntryType;
import com.banking.core.ledger.domain.exception.LedgerException;
import com.banking.core.ledger.domain.repository.LedgerEntryRepository;
import com.banking.core.ledger.domain.repository.LedgerJournalRepository;
import com.banking.core.ledger.exposed.LedgerApi;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/**
 * Implementation of the LedgerApi — the double-entry bookkeeping engine.
 * <p>
 * Core invariant enforced before every commit:
 *   SUM(DEBIT amounts) == SUM(CREDIT amounts) in each journal.
 * <p>
 * All journal and entry records are IMMUTABLE once inserted.
 * No UPDATE or DELETE is ever performed on ledger data.
 */
@Service
@RequiredArgsConstructor
public class LedgerServiceImpl implements LedgerApi {

    private static final Logger log = LoggerFactory.getLogger(LedgerServiceImpl.class);

    private final LedgerJournalRepository journalRepository;
    private final LedgerEntryRepository entryRepository;

    // =========================================================================
    // Public LedgerApi methods
    // =========================================================================

    /**
     * Records a DEPOSIT journal:
     *   DEBIT  vault account  (bank receives funds)
     *   CREDIT customer account (customer balance increases)
     */
    @Override
    @Transactional
    public void recordDepositJournal(
            UUID transactionId,
            UUID customerAccountId,
            UUID vaultAccountId,
            BigDecimal amount,
            String currency) {

        String description = String.format("DEPOSIT %.4f %s to account %s", amount, currency, customerAccountId);

        LedgerJournal journal = saveJournal(transactionId, null, description);

        List<LedgerEntry> entries = List.of(
                buildEntry(journal.getId(), vaultAccountId,    EntryType.DEBIT,  amount, currency),
                buildEntry(journal.getId(), customerAccountId, EntryType.CREDIT, amount, currency)
        );

        saveEntriesWithBalanceCheck(journal.getId(), entries);
        log.info("Posted DEPOSIT journal id={} txn={}", journal.getId(), transactionId);
    }

    /**
     * Records a WITHDRAWAL journal:
     *   DEBIT  customer account (customer balance decreases)
     *   CREDIT vault account    (bank pays out)
     */
    @Override
    @Transactional
    public void recordWithdrawalJournal(
            UUID transactionId,
            UUID customerAccountId,
            UUID vaultAccountId,
            BigDecimal amount,
            String currency) {

        String description = String.format("WITHDRAWAL %.4f %s from account %s", amount, currency, customerAccountId);

        LedgerJournal journal = saveJournal(transactionId, null, description);

        List<LedgerEntry> entries = List.of(
                buildEntry(journal.getId(), customerAccountId, EntryType.DEBIT,  amount, currency),
                buildEntry(journal.getId(), vaultAccountId,    EntryType.CREDIT, amount, currency)
        );

        saveEntriesWithBalanceCheck(journal.getId(), entries);
        log.info("Posted WITHDRAWAL journal id={} txn={}", journal.getId(), transactionId);
    }

    /**
     * Records a TRANSFER journal:
     *   DEBIT  source account (sender's balance decreases)
     *   CREDIT target account (recipient's balance increases)
     */
    @Override
    @Transactional
    public void recordTransferJournal(
            UUID transactionId,
            UUID sourceAccountId,
            UUID targetAccountId,
            BigDecimal amount,
            String currency) {

        String description = String.format(
                "TRANSFER %.4f %s from account %s to account %s",
                amount, currency, sourceAccountId, targetAccountId);

        LedgerJournal journal = saveJournal(transactionId, null, description);

        List<LedgerEntry> entries = List.of(
                buildEntry(journal.getId(), sourceAccountId, EntryType.DEBIT,  amount, currency),
                buildEntry(journal.getId(), targetAccountId, EntryType.CREDIT, amount, currency)
        );

        saveEntriesWithBalanceCheck(journal.getId(), entries);
        log.info("Posted TRANSFER journal id={} txn={}", journal.getId(), transactionId);
    }

    /**
     * Records a REVERSAL journal that mirrors all entries of the original journal
     * with their DEBIT/CREDIT types flipped.
     * <p>
     * This restores account balances to their pre-transaction state without
     * altering any existing immutable records.
     */
    @Override
    @Transactional
    public void recordReversalJournal(UUID originalJournalId, UUID reversalTransactionId) {
        LedgerJournal originalJournal = journalRepository.findById(originalJournalId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        ErrorCode.RESOURCE_NOT_FOUND,
                        "Original ledger journal not found: " + originalJournalId));

        List<LedgerEntry> originalEntries = entryRepository.findByJournalId(originalJournalId);
        if (originalEntries.isEmpty()) {
            throw new LedgerException(ErrorCode.LEDGER_UNBALANCED,
                    "Original journal has no entries: " + originalJournalId);
        }

        String description = "REVERSAL of journal " + originalJournalId + " (" + originalJournal.getDescription() + ")";
        LedgerJournal reversalJournal = saveJournal(reversalTransactionId, originalJournalId, description);

        // Flip DEBIT ↔ CREDIT for each original entry
        List<LedgerEntry> reversalEntries = new ArrayList<>();
        for (LedgerEntry original : originalEntries) {
            EntryType flippedType = original.getEntryType() == EntryType.DEBIT
                    ? EntryType.CREDIT
                    : EntryType.DEBIT;
            reversalEntries.add(buildEntry(
                    reversalJournal.getId(),
                    original.getAccountId(),
                    flippedType,
                    original.getAmount(),
                    original.getCurrency()
            ));
        }

        saveEntriesWithBalanceCheck(reversalJournal.getId(), reversalEntries);
        log.info("Posted REVERSAL journal id={} reversing originalJournal={}", reversalJournal.getId(), originalJournalId);
    }

    /**
     * Looks up the original journal by transaction ID and records a reversal journal.
     */
    @Override
    @Transactional
    public void recordReversalJournalByTransactionId(UUID originalTransactionId, UUID reversalTransactionId) {
        LedgerJournal originalJournal = journalRepository.findByTransactionId(originalTransactionId)
                .stream()
                .filter(j -> j.getOriginalJournalId() == null)
                .findFirst()
                .orElseThrow(() -> new ResourceNotFoundException(
                        ErrorCode.RESOURCE_NOT_FOUND,
                        "Original ledger journal not found for transaction: " + originalTransactionId));
        recordReversalJournal(originalJournal.getId(), reversalTransactionId);
    }

    /**
     * Calculates the net balance of an account from its ledger history.
     * Net = SUM(CREDIT) - SUM(DEBIT).
     * Used for reconciliation only; not shown to end-users.
     */
    @Override
    @Transactional(readOnly = true)
    public BigDecimal calculateLedgerBalance(UUID accountId) {
        BigDecimal totalCredits = entryRepository.sumAmountByAccountIdAndEntryType(accountId, EntryType.CREDIT);
        BigDecimal totalDebits  = entryRepository.sumAmountByAccountIdAndEntryType(accountId, EntryType.DEBIT);
        // Both methods return at least 0 due to COALESCE in the query
        return totalCredits.subtract(totalDebits);
    }

    // =========================================================================
    // Private helpers
    // =========================================================================

    /**
     * Persists a new LedgerJournal record with a unique journal reference.
     */
    private LedgerJournal saveJournal(UUID transactionId, UUID originalJournalId, String description) {
        Instant now = Instant.now();
        String journalRef = "JRN-" + UUID.randomUUID().toString().substring(0, 18).toUpperCase();
        LedgerJournal journal = LedgerJournal.builder()
                .journalRef(journalRef)
                .transactionId(transactionId)
                .originalJournalId(originalJournalId)
                .description(description)
                .postedAt(now)
                .createdAt(now)
                .build();
        return journalRepository.save(journal);
    }

    /**
     * Builds an unsaved LedgerEntry for the given parameters.
     */
    private LedgerEntry buildEntry(
            UUID journalId, UUID accountId, EntryType entryType, BigDecimal amount, String currency) {
        return LedgerEntry.builder()
                .journalId(journalId)
                .accountId(accountId)
                .entryType(entryType)
                .amount(amount)
                .currency(currency)
                .createdAt(Instant.now())
                .build();
    }

    /**
     * Validates double-entry balance invariant, then persists all entries atomically.
     * Throws LedgerException if SUM(DEBIT) != SUM(CREDIT).
     *
     * @param journalId journal UUID (for logging)
     * @param entries   list of entries to validate and save
     */
    private void saveEntriesWithBalanceCheck(UUID journalId, List<LedgerEntry> entries) {
        BigDecimal totalDebits  = BigDecimal.ZERO;
        BigDecimal totalCredits = BigDecimal.ZERO;

        for (LedgerEntry entry : entries) {
            if (entry.getEntryType() == EntryType.DEBIT) {
                totalDebits = totalDebits.add(entry.getAmount());
            } else {
                totalCredits = totalCredits.add(entry.getAmount());
            }
        }

        if (totalDebits.compareTo(totalCredits) != 0) {
            throw new LedgerException(ErrorCode.LEDGER_UNBALANCED,
                    String.format("Journal %s is unbalanced: DEBIT=%s, CREDIT=%s",
                            journalId, totalDebits, totalCredits));
        }

        entryRepository.saveAll(entries);
        log.debug("Saved {} balanced entries for journal id={}", entries.size(), journalId);
    }
}
