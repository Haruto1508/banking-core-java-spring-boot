package com.banking.core.payment.domain.exception;

import com.banking.core.common.exception.BankingException;
import com.banking.core.common.exception.ErrorCode;

/**
 * Domain exception for the Payment module.
 */
public class PaymentException extends BankingException {

    public PaymentException(ErrorCode errorCode, String message) {
        super(errorCode, message);
    }

    public PaymentException(ErrorCode errorCode) {
        super(errorCode, errorCode.getDefaultMessage());
    }
}
