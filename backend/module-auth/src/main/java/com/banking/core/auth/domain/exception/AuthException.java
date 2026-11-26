package com.banking.core.auth.domain.exception;

import com.banking.core.common.exception.BankingException;
import com.banking.core.common.exception.ErrorCode;

/**
 * Exception thrown for authentication and authorization domain failures.
 */
public class AuthException extends BankingException {

    public AuthException(ErrorCode errorCode) {
        super(errorCode);
    }

    public AuthException(ErrorCode errorCode, String customMessage) {
        super(errorCode, customMessage);
    }
}
