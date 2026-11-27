package com.banking.core.customer.domain.exception;

import com.banking.core.common.exception.BankingException;
import com.banking.core.common.exception.ErrorCode;

/**
 * Domain exception thrown for customer management and KYC rule violations.
 */
public class CustomerException extends BankingException {

    /**
     * Creates a CustomerException with the default message of the given ErrorCode.
     *
     * @param errorCode standardized domain error code
     */
    public CustomerException(ErrorCode errorCode) {
        super(errorCode);
    }

    /**
     * Creates a CustomerException with a custom detail message.
     *
     * @param errorCode     standardized domain error code
     * @param customMessage specific error explanation
     */
    public CustomerException(ErrorCode errorCode, String customMessage) {
        super(errorCode, customMessage);
    }
}
