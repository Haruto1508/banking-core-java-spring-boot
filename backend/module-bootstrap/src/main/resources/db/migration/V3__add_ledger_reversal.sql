-- V3: Add reversal journal reference to ledger_journals

-- Support reversal journal traceability on ledger_journals
ALTER TABLE ledger_journals
    ADD COLUMN original_journal_id UUID NULL REFERENCES ledger_journals(id);

CREATE INDEX idx_ledger_journals_original_id ON ledger_journals(original_journal_id);
