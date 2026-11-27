package com.banking.core.transaction.domain.exception;

import com.banking.core.common.exception.BankingException;
import com.banking.core.common.exception.ErrorCode;

/**
 * Domain exception for the Transaction module.
 */
public class TransactionException extends BankingException {

    public TransactionException(ErrorCode errorCode, String message) {
        super(errorCode, message);
    }

    public TransactionException(ErrorCode errorCode) {
        super(errorCode, errorCode.getDefaultMessage());
    }
}
