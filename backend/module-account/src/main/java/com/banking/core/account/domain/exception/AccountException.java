package com.banking.core.account.domain.exception;

import com.banking.core.common.exception.BankingException;
import com.banking.core.common.exception.ErrorCode;

/**
 * Domain-specific exception for the Account module.
 */
public class AccountException extends BankingException {

    public AccountException(ErrorCode errorCode, String message) {
        super(errorCode, message);
    }

    public AccountException(ErrorCode errorCode) {
        super(errorCode, errorCode.name());
    }
}
