# module-ledger

## Tổng quan

**module-ledger** triển khai hệ thống **kế toán kép (Double-Entry Bookkeeping)** cho Core Banking System.

Mọi giao dịch tài chính (nạp tiền, rút tiền, chuyển khoản, đảo giao dịch) đều phải ghi nhận một `LedgerJournal` với các dòng `LedgerEntry` cân bằng tuyệt đối.

---

## Nguyên tắc bất biến (Financial Invariants)

1. **Tổng DEBIT = Tổng CREDIT** trong mỗi `LedgerJournal`. Nếu vi phạm, hệ thống ném `LedgerException(LEDGER_UNBALANCED)` và rollback transaction.
2. **Bất biến (Immutable):** Không có phép `UPDATE` hay `DELETE` trên `ledger_journals` và `ledger_entries`.
3. **Đảo giao dịch (Reversal):** Để hủy bỏ một giao dịch đã ghi sổ, tạo một **reversal journal mới** đảo ngược `DEBIT ↔ CREDIT` của từng bút toán gốc.

---

## Quy ước hạch toán

| Loại giao dịch | DEBIT (Nợ)               | CREDIT (Có)              |
|----------------|--------------------------|--------------------------|
| **DEPOSIT**    | System Vault (`SYS-GL-VAULT-001`) | Tài khoản khách hàng |
| **WITHDRAWAL** | Tài khoản khách hàng     | System Vault (`SYS-GL-VAULT-001`) |
| **TRANSFER**   | Tài khoản nguồn          | Tài khoản đích           |
| **REVERSAL**   | Đảo ngược DEBIT ↔ CREDIT từ journal gốc | Đảo ngược CREDIT ↔ DEBIT |

---

## Cross-module API (`LedgerApi`)

| Method                    | Mô tả                                              |
|---------------------------|----------------------------------------------------|
| `recordDepositJournal`    | Ghi bút toán nạp tiền (DEBIT Vault, CREDIT Account) |
| `recordWithdrawalJournal` | Ghi bút toán rút tiền (DEBIT Account, CREDIT Vault) |
| `recordTransferJournal`   | Ghi bút toán chuyển khoản nội bộ                   |
| `recordReversalJournal`   | Tạo bút toán đảo từ journal gốc                    |
| `calculateLedgerBalance`  | Tính số dư ròng `SUM(CREDIT) - SUM(DEBIT)` để đối soát |

---

## Package Structure

```
module-ledger/
└── src/main/java/com/banking/core/ledger/
    ├── domain/
    │   ├── entity/LedgerJournal.java
    │   ├── entity/LedgerEntry.java
    │   ├── enums/EntryType.java
    │   ├── exception/LedgerException.java
    │   └── repository/
    │       ├── LedgerJournalRepository.java
    │       └── LedgerEntryRepository.java
    ├── exposed/
    │   └── LedgerApi.java
    └── service/
        └── impl/LedgerServiceImpl.java
```
