package com.banking.core.common.exception;

import com.banking.core.common.dto.ErrorResponse;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.MessageSource;
import org.springframework.context.NoSuchMessageException;
import org.springframework.context.i18n.LocaleContextHolder;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.time.Instant;
import java.util.HashMap;
import java.util.Locale;
import java.util.Map;

/**
 * Global exception handler providing centralized translation of domain exceptions
 * into standardized API error responses with i18n support.
 */
@RestControllerAdvice
@RequiredArgsConstructor
public class GlobalExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);
    private final MessageSource messageSource;

    @ExceptionHandler(BankingException.class)
    public ResponseEntity<ErrorResponse> handleBankingException(BankingException ex, HttpServletRequest request) {
        log.warn("Business domain exception [{}]: {}", ex.getErrorCode().getCode(), ex.getMessage());

        Locale locale = LocaleContextHolder.getLocale();
        String messageKey = ex.getErrorCode().getMessageKey();
        String localizedMessage;
        try {
            localizedMessage = messageSource.getMessage(messageKey, null, ex.getMessage(), locale);
        } catch (NoSuchMessageException e) {
            localizedMessage = ex.getMessage();
        }

        ErrorResponse response = ErrorResponse.builder()
                .errorCode(ex.getErrorCode().getCode())
                .messageKey(messageKey)
                .message(localizedMessage)
                .path(request.getRequestURI())
                .timestamp(Instant.now())
                .build();

        return ResponseEntity.status(ex.getErrorCode().getHttpStatus()).body(response);
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ErrorResponse> handleValidationException(MethodArgumentNotValidException ex, HttpServletRequest request) {
        Locale locale = LocaleContextHolder.getLocale();
        Map<String, String> fieldErrors = new HashMap<>();
        for (FieldError fieldError : ex.getBindingResult().getFieldErrors()) {
            fieldErrors.put(fieldError.getField(), fieldError.getDefaultMessage());
        }

        String messageKey = ErrorCode.VALIDATION_FAILED.getMessageKey();
        String localizedMessage;
        try {
            localizedMessage = messageSource.getMessage(messageKey, null, ErrorCode.VALIDATION_FAILED.getDefaultMessage(), locale);
        } catch (NoSuchMessageException e) {
            localizedMessage = "Request validation failed";
        }

        ErrorResponse response = ErrorResponse.builder()
                .errorCode(ErrorCode.VALIDATION_FAILED.getCode())
                .messageKey(messageKey)
                .message(localizedMessage)
                .path(request.getRequestURI())
                .validationErrors(fieldErrors)
                .timestamp(Instant.now())
                .build();

        return ResponseEntity.status(ErrorCode.VALIDATION_FAILED.getHttpStatus()).body(response);
    }

    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<ErrorResponse> handleAccessDeniedException(AccessDeniedException ex, HttpServletRequest request) {
        log.warn("Access denied on path {}: {}", request.getRequestURI(), ex.getMessage());

        Locale locale = LocaleContextHolder.getLocale();
        String messageKey = ErrorCode.ACCESS_DENIED.getMessageKey();
        String localizedMessage;
        try {
            localizedMessage = messageSource.getMessage(messageKey, null, ErrorCode.ACCESS_DENIED.getDefaultMessage(), locale);
        } catch (NoSuchMessageException e) {
            localizedMessage = ErrorCode.ACCESS_DENIED.getDefaultMessage();
        }

        ErrorResponse response = ErrorResponse.builder()
                .errorCode(ErrorCode.ACCESS_DENIED.getCode())
                .messageKey(messageKey)
                .message(localizedMessage)
                .path(request.getRequestURI())
                .timestamp(Instant.now())
                .build();

        return ResponseEntity.status(ErrorCode.ACCESS_DENIED.getHttpStatus()).body(response);
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorResponse> handleUnhandledException(Exception ex, HttpServletRequest request) {
        log.error("Unhandled internal server exception on path {}: ", request.getRequestURI(), ex);

        Locale locale = LocaleContextHolder.getLocale();
        String messageKey = ErrorCode.INTERNAL_SERVER_ERROR.getMessageKey();
        String localizedMessage;
        try {
            localizedMessage = messageSource.getMessage(messageKey, null, ErrorCode.INTERNAL_SERVER_ERROR.getDefaultMessage(), locale);
        } catch (NoSuchMessageException e) {
            localizedMessage = "An unexpected error occurred. Please contact support.";
        }

        ErrorResponse response = ErrorResponse.builder()
                .errorCode(ErrorCode.INTERNAL_SERVER_ERROR.getCode())
                .messageKey(messageKey)
                .message(localizedMessage)
                .path(request.getRequestURI())
                .timestamp(Instant.now())
                .build();

        return ResponseEntity.status(ErrorCode.INTERNAL_SERVER_ERROR.getHttpStatus()).body(response);
    }
}
