package com.banking.core.account.domain.enums;

/**
 * Type of bank account.
 * <p>
 * SAVINGS – interest-bearing savings account
 * CURRENT – demand deposit / current account for everyday transactions
 * SYSTEM  – internal GL accounts (e.g. the System Vault used for Deposit/Withdrawal bookkeeping)
 */
public enum AccountType {
    SAVINGS,
    CURRENT,
    SYSTEM
}
