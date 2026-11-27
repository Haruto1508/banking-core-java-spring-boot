package com.banking.core.notification.api.dto.response;

import com.banking.core.notification.domain.enums.NotificationChannel;
import com.banking.core.notification.domain.enums.NotificationStatus;

import java.time.Instant;
import java.util.UUID;

/**
 * Response DTO representing a notification record.
 */
public record NotificationResponse(
        UUID id,
        UUID recipientUserId,
        String recipientEmail,
        NotificationChannel channel,
        String eventType,
        String subject,
        String content,
        NotificationStatus status,
        String referenceId,
        Instant sentAt,
        Instant createdAt
) {}
