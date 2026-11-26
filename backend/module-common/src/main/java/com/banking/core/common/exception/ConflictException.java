package com.banking.core.common.exception;

/**
 * Thrown when an operation is attempted with conflicting states or keys (e.g., Idempotency conflict).
 */
public class ConflictException extends BankingException {

    public ConflictException(ErrorCode errorCode, String message) {
        super(errorCode, message);
    }
}
