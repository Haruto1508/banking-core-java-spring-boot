package com.banking.core.common.exception;

import lombok.Getter;

/**
 * Base abstract runtime exception for all business domain errors.
 */
@Getter
public abstract class BankingException extends RuntimeException {

    private final ErrorCode errorCode;

    protected BankingException(ErrorCode errorCode) {
        super(errorCode.getDefaultMessage());
        this.errorCode = errorCode;
    }

    protected BankingException(ErrorCode errorCode, String customMessage) {
        super(customMessage);
        this.errorCode = errorCode;
    }

    protected BankingException(ErrorCode errorCode, String customMessage, Throwable cause) {
        super(customMessage, cause);
        this.errorCode = errorCode;
    }
}
