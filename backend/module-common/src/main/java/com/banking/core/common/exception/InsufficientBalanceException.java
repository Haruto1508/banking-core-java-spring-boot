package com.banking.core.common.exception;

/**
 * Thrown when an account does not have sufficient balance to perform a debit or withdrawal.
 */
public class InsufficientBalanceException extends BankingException {

    public InsufficientBalanceException(String message) {
        super(ErrorCode.INSUFFICIENT_BALANCE, message);
    }
}
