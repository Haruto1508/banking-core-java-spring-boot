package com.banking.core.ledger.domain.enums;

/**
 * Double-entry bookkeeping entry type.
 * <p>
 * DEBIT  – increases asset/expense accounts; decreases liability/equity/revenue
 * CREDIT – increases liability/equity/revenue accounts; decreases asset/expense
 * <p>
 * In this simplified banking ledger:
 * - Depositing money into a customer account → DEBIT customer account, CREDIT vault
 * - Withdrawing money → DEBIT vault, CREDIT customer account
 * - Transferring → DEBIT source account, CREDIT target account
 */
public enum EntryType {
    DEBIT,
    CREDIT
}
