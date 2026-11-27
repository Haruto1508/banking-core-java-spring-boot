package com.banking.core.common.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.Instant;

/**
 * Standard API response wrapper for all REST endpoints with i18n support.
 *
 * @param <T> Payload data type
 */
@Getter
@Builder
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor(access = AccessLevel.PRIVATE)
@JsonInclude(JsonInclude.Include.NON_NULL)
public class ApiResponse<T> {

    private boolean success;
    private String messageKey;
    private String message;
    private T data;
    @Builder.Default
    private Instant timestamp = Instant.now();

    public static <T> ApiResponse<T> success(T data) {
        return ApiResponse.<T>builder()
                .success(true)
                .messageKey("api.success.operation_completed")
                .message("Operation completed successfully")
                .data(data)
                .timestamp(Instant.now())
                .build();
    }

    public static <T> ApiResponse<T> success(String message, T data) {
        return ApiResponse.<T>builder()
                .success(true)
                .messageKey("api.success.operation_completed")
                .message(message)
                .data(data)
                .timestamp(Instant.now())
                .build();
    }

    public static <T> ApiResponse<T> success(String messageKey, String message, T data) {
        return ApiResponse.<T>builder()
                .success(true)
                .messageKey(messageKey)
                .message(message)
                .data(data)
                .timestamp(Instant.now())
                .build();
    }
}
