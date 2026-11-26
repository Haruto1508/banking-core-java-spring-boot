package com.banking.core.common.exception;

/**
 * Thrown when an account is in an invalid state for an operation (e.g. FROZEN, CLOSED).
 */
public class InvalidAccountStateException extends BankingException {

    public InvalidAccountStateException(ErrorCode errorCode, String message) {
        super(errorCode, message);
    }
}
