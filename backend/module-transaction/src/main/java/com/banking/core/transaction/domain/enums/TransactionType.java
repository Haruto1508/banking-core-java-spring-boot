package com.banking.core.transaction.domain.enums;

/**
 * Type of financial transaction.
 * <p>
 * DEPOSIT    – cash/teller deposit into a customer account
 * WITHDRAWAL – cash/teller withdrawal from a customer account
 * TRANSFER   – internal transfer between two bank accounts
 * REVERSAL   – offsetting transaction created to reverse a previously successful transaction
 */
public enum TransactionType {
    DEPOSIT,
    WITHDRAWAL,
    TRANSFER,
    REVERSAL
}
