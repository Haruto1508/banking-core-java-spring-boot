package com.banking.core.common.exception;

/**
 * Thrown when a requested resource (Account, Customer, Transaction, etc.) is not found.
 */
public class ResourceNotFoundException extends BankingException {

    public ResourceNotFoundException(String message) {
        super(ErrorCode.RESOURCE_NOT_FOUND, message);
    }

    public ResourceNotFoundException(ErrorCode errorCode, String message) {
        super(errorCode, message);
    }
}
