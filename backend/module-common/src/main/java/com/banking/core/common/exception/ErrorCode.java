package com.banking.core.common.exception;

import lombok.Getter;
import org.springframework.http.HttpStatus;

/**
 * Standard business error codes with associated HTTP status and localized message keys.
 */
@Getter
public enum ErrorCode {

    // General & Validation
    INTERNAL_SERVER_ERROR("ERR_GEN_001", "error.general.internal_server", "An unexpected error occurred", HttpStatus.INTERNAL_SERVER_ERROR),
    INVALID_REQUEST_PAYLOAD("ERR_GEN_002", "error.general.invalid_payload", "Invalid request payload", HttpStatus.BAD_REQUEST),
    VALIDATION_FAILED("ERR_GEN_003", "error.general.validation_failed", "Validation failed for request fields", HttpStatus.BAD_REQUEST),
    RESOURCE_NOT_FOUND("ERR_GEN_004", "error.general.resource_not_found", "Requested resource was not found", HttpStatus.NOT_FOUND),

    // Authentication & Authorization
    UNAUTHORIZED("ERR_AUTH_001", "error.auth.unauthorized", "Full authentication is required", HttpStatus.UNAUTHORIZED),
    ACCESS_DENIED("ERR_AUTH_002", "error.auth.access_denied", "Access is denied for this action", HttpStatus.FORBIDDEN),
    ACCOUNT_LOCKED("ERR_AUTH_003", "error.auth.account_locked", "User account is locked due to multiple failed login attempts", HttpStatus.FORBIDDEN),
    INVALID_CREDENTIALS("ERR_AUTH_004", "error.auth.invalid_credentials", "Invalid username or password", HttpStatus.UNAUTHORIZED),
    USER_ALREADY_EXISTS("ERR_AUTH_005", "error.auth.user_already_exists", "Username or email is already registered", HttpStatus.CONFLICT),
    INVALID_TOKEN("ERR_AUTH_006", "error.auth.invalid_token", "Token is invalid, expired, or has been revoked", HttpStatus.UNAUTHORIZED),
    USER_NOT_FOUND("ERR_AUTH_007", "error.auth.user_not_found", "User account not found", HttpStatus.NOT_FOUND),

    // Account & Customer
    CUSTOMER_ALREADY_EXISTS("ERR_CUS_001", "error.customer.already_exists", "Customer already exists with given identity number or email", HttpStatus.CONFLICT),
    CUSTOMER_NOT_FOUND("ERR_CUS_002", "error.customer.not_found", "Customer profile not found", HttpStatus.NOT_FOUND),
    CUSTOMER_ALREADY_LINKED("ERR_CUS_003", "error.customer.already_linked", "User already has an associated customer profile", HttpStatus.CONFLICT),
    CUSTOMER_INVALID_STATUS("ERR_CUS_004", "error.customer.invalid_status", "Customer is not in a valid status for this operation", HttpStatus.UNPROCESSABLE_ENTITY),
    ACCOUNT_NOT_FOUND("ERR_ACC_001", "error.account.not_found", "Bank account not found", HttpStatus.NOT_FOUND),
    ACCOUNT_FROZEN("ERR_ACC_002", "error.account.frozen", "Bank account is frozen and cannot process debit transactions", HttpStatus.UNPROCESSABLE_ENTITY),
    ACCOUNT_CLOSED("ERR_ACC_003", "error.account.closed", "Bank account is closed", HttpStatus.UNPROCESSABLE_ENTITY),
    ACCOUNT_HAS_REMAINING_BALANCE("ERR_ACC_004", "error.account.has_remaining_balance", "Account cannot be closed because it still has remaining balance", HttpStatus.UNPROCESSABLE_ENTITY),

    // Financial & Transaction
    INSUFFICIENT_BALANCE("ERR_TXN_001", "error.transaction.insufficient_balance", "Insufficient available balance to complete the transaction", HttpStatus.UNPROCESSABLE_ENTITY),
    CURRENCY_MISMATCH("ERR_TXN_002", "error.transaction.currency_mismatch", "Source and target accounts must share the same currency", HttpStatus.BAD_REQUEST),
    INVALID_TRANSACTION_AMOUNT("ERR_TXN_003", "error.transaction.invalid_amount", "Transaction amount must be strictly greater than zero", HttpStatus.BAD_REQUEST),
    SAME_ACCOUNT_TRANSFER("ERR_TXN_004", "error.transaction.same_account", "Source and target accounts must be different", HttpStatus.BAD_REQUEST),
    IDEMPOTENCY_CONFLICT("ERR_TXN_005", "error.transaction.idempotency_conflict", "Concurrent request with the same Idempotency-Key is already in progress", HttpStatus.CONFLICT),
    IDEMPOTENCY_PAYLOAD_MISMATCH("ERR_TXN_006", "error.transaction.idempotency_payload_mismatch", "Idempotency key was previously used with a different payload", HttpStatus.UNPROCESSABLE_ENTITY),

    // Ledger & Payment
    LEDGER_UNBALANCED("ERR_LDG_001", "error.ledger.unbalanced", "Double-entry violation: Total debits must equal total credits", HttpStatus.INTERNAL_SERVER_ERROR),
    TRANSACTION_ALREADY_REVERSED("ERR_TXN_007", "error.transaction.already_reversed", "Transaction has already been reversed", HttpStatus.UNPROCESSABLE_ENTITY),
    PAYMENT_FAILED("ERR_PAY_001", "error.payment.failed", "Payment operation failed", HttpStatus.BAD_REQUEST),
    PAYMENT_NOT_FOUND("ERR_PAY_002", "error.payment.not_found", "Payment record not found", HttpStatus.NOT_FOUND);

    private final String code;
    private final String messageKey;
    private final String defaultMessage;
    private final HttpStatus httpStatus;

    ErrorCode(String code, String messageKey, String defaultMessage, HttpStatus httpStatus) {
        this.code = code;
        this.messageKey = messageKey;
        this.defaultMessage = defaultMessage;
        this.httpStatus = httpStatus;
    }

    ErrorCode(String code, String defaultMessage, HttpStatus httpStatus) {
        this.code = code;
        this.messageKey = "error." + code.toLowerCase().replace('_', '.');
        this.defaultMessage = defaultMessage;
        this.httpStatus = httpStatus;
    }
}
