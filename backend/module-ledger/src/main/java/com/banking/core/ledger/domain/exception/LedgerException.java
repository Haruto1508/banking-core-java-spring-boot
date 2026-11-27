package com.banking.core.ledger.domain.exception;

import com.banking.core.common.exception.BankingException;
import com.banking.core.common.exception.ErrorCode;

/**
 * Domain exception for the Ledger module (e.g. unbalanced journal entries).
 */
public class LedgerException extends BankingException {

    public LedgerException(ErrorCode errorCode, String message) {
        super(errorCode, message);
    }
}
