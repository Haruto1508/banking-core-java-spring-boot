package com.banking.core.ledger.service.impl;

import com.banking.core.common.exception.ResourceNotFoundException;
import com.banking.core.ledger.domain.entity.LedgerEntry;
import com.banking.core.ledger.domain.entity.LedgerJournal;
import com.banking.core.ledger.domain.enums.EntryType;
import com.banking.core.ledger.domain.exception.LedgerException;
import com.banking.core.ledger.domain.repository.LedgerEntryRepository;
import com.banking.core.ledger.domain.repository.LedgerJournalRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("LedgerServiceImpl Unit Tests")
class LedgerServiceImplTest {

    @Mock
    private LedgerJournalRepository journalRepository;

    @Mock
    private LedgerEntryRepository entryRepository;

    @InjectMocks
    private LedgerServiceImpl ledgerService;

    @Test
    @DisplayName("recordDepositJournal: should post balanced DEBIT vault + CREDIT customer entries")
    @SuppressWarnings("unchecked")
    void recordDepositJournal_shouldPostBalancedEntries() {
        // Arrange
        UUID txnId = UUID.randomUUID();
        UUID customerAccountId = UUID.randomUUID();
        UUID vaultAccountId = UUID.randomUUID();
        BigDecimal amount = new BigDecimal("500000.0000");

        when(journalRepository.save(any(LedgerJournal.class))).thenAnswer(inv -> {
            LedgerJournal j = inv.getArgument(0);
            return LedgerJournal.builder()
                    .id(UUID.randomUUID())
                    .transactionId(j.getTransactionId())
                    .description(j.getDescription())
                    .postedAt(j.getPostedAt())
                    .build();
        });

        // Act
        ledgerService.recordDepositJournal(txnId, customerAccountId, vaultAccountId, amount, "VND");

        // Assert
        ArgumentCaptor<List<LedgerEntry>> entriesCaptor = ArgumentCaptor.forClass(List.class);
        verify(entryRepository).saveAll(entriesCaptor.capture());

        List<LedgerEntry> saved = entriesCaptor.getValue();
        assertThat(saved).hasSize(2);

        BigDecimal totalDebit = saved.stream()
                .filter(e -> e.getEntryType() == EntryType.DEBIT)
                .map(LedgerEntry::getAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal totalCredit = saved.stream()
                .filter(e -> e.getEntryType() == EntryType.CREDIT)
                .map(LedgerEntry::getAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        assertThat(totalDebit).isEqualByComparingTo(totalCredit);
        assertThat(totalDebit).isEqualByComparingTo(amount);
    }

    @Test
    @DisplayName("recordTransferJournal: should post DEBIT source + CREDIT target with equal amounts")
    @SuppressWarnings("unchecked")
    void recordTransferJournal_shouldPostBalancedEntries() {
        // Arrange
        UUID txnId = UUID.randomUUID();
        UUID sourceId = UUID.randomUUID();
        UUID targetId = UUID.randomUUID();
        BigDecimal amount = new BigDecimal("100.5000");

        when(journalRepository.save(any(LedgerJournal.class))).thenAnswer(inv -> {
            LedgerJournal j = inv.getArgument(0);
            return LedgerJournal.builder()
                    .id(UUID.randomUUID())
                    .transactionId(j.getTransactionId())
                    .description(j.getDescription())
                    .postedAt(j.getPostedAt())
                    .build();
        });

        // Act
        ledgerService.recordTransferJournal(txnId, sourceId, targetId, amount, "USD");

        // Assert
        ArgumentCaptor<List<LedgerEntry>> entriesCaptor = ArgumentCaptor.forClass(List.class);
        verify(entryRepository).saveAll(entriesCaptor.capture());

        List<LedgerEntry> saved = entriesCaptor.getValue();
        assertThat(saved).hasSize(2);
        assertThat(saved.stream().filter(e -> e.getAccountId().equals(sourceId) && e.getEntryType() == EntryType.DEBIT)).hasSize(1);
        assertThat(saved.stream().filter(e -> e.getAccountId().equals(targetId) && e.getEntryType() == EntryType.CREDIT)).hasSize(1);
    }

    @Test
    @DisplayName("recordReversalJournal: should flip DEBIT↔CREDIT for all original entries")
    @SuppressWarnings("unchecked")
    void recordReversalJournal_shouldFlipEntryTypes() {
        // Arrange
        UUID originalJournalId = UUID.randomUUID();
        UUID reversalTxnId = UUID.randomUUID();
        UUID sourceId = UUID.randomUUID();
        UUID targetId = UUID.randomUUID();
        BigDecimal amount = new BigDecimal("250.0000");

        LedgerJournal originalJournal = LedgerJournal.builder()
                .id(originalJournalId)
                .transactionId(UUID.randomUUID())
                .description("TRANSFER")
                .postedAt(Instant.now())
                .build();

        List<LedgerEntry> originalEntries = List.of(
                LedgerEntry.builder().id(UUID.randomUUID()).journalId(originalJournalId).accountId(sourceId).entryType(EntryType.DEBIT).amount(amount).currency("USD").build(),
                LedgerEntry.builder().id(UUID.randomUUID()).journalId(originalJournalId).accountId(targetId).entryType(EntryType.CREDIT).amount(amount).currency("USD").build()
        );

        when(journalRepository.findById(originalJournalId)).thenReturn(Optional.of(originalJournal));
        when(entryRepository.findByJournalId(originalJournalId)).thenReturn(originalEntries);
        when(journalRepository.save(any(LedgerJournal.class))).thenAnswer(inv -> {
            LedgerJournal j = inv.getArgument(0);
            return LedgerJournal.builder()
                    .id(UUID.randomUUID())
                    .transactionId(j.getTransactionId())
                    .originalJournalId(j.getOriginalJournalId())
                    .description(j.getDescription())
                    .postedAt(j.getPostedAt())
                    .build();
        });

        // Act
        ledgerService.recordReversalJournal(originalJournalId, reversalTxnId);

        // Assert
        ArgumentCaptor<List<LedgerEntry>> entriesCaptor = ArgumentCaptor.forClass(List.class);
        verify(entryRepository).saveAll(entriesCaptor.capture());

        List<LedgerEntry> reversed = entriesCaptor.getValue();
        assertThat(reversed).hasSize(2);
        // Source was DEBIT -> must now be CREDIT
        assertThat(reversed.stream().filter(e -> e.getAccountId().equals(sourceId) && e.getEntryType() == EntryType.CREDIT)).hasSize(1);
        // Target was CREDIT -> must now be DEBIT
        assertThat(reversed.stream().filter(e -> e.getAccountId().equals(targetId) && e.getEntryType() == EntryType.DEBIT)).hasSize(1);
    }

    @Test
    @DisplayName("recordReversalJournal: should throw when original journal is missing")
    void recordReversalJournal_shouldThrowWhenOriginalNotFound() {
        UUID missingId = UUID.randomUUID();
        when(journalRepository.findById(missingId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> ledgerService.recordReversalJournal(missingId, UUID.randomUUID()))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    @DisplayName("calculateLedgerBalance: should compute CREDIT minus DEBIT")
    void calculateLedgerBalance_shouldReturnNetBalance() {
        UUID accountId = UUID.randomUUID();
        when(entryRepository.sumAmountByAccountIdAndEntryType(accountId, EntryType.CREDIT))
                .thenReturn(new BigDecimal("1000.0000"));
        when(entryRepository.sumAmountByAccountIdAndEntryType(accountId, EntryType.DEBIT))
                .thenReturn(new BigDecimal("350.0000"));

        BigDecimal balance = ledgerService.calculateLedgerBalance(accountId);

        assertThat(balance).isEqualByComparingTo(new BigDecimal("650.0000"));
    }
}
