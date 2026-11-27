package com.banking.core.notification.exposed;

import java.util.UUID;

/**
 * Public cross-module API for dispatching banking notifications.
 */
public interface NotificationApi {

    /**
     * Sends an email notification (via mock provider) and persists its history record.
     *
     * @param recipientUserId target user UUID (nullable)
     * @param recipientEmail  recipient email address
     * @param eventType       event category (e.g. "TRANSACTION_COMPLETED", "ACCOUNT_FROZEN")
     * @param subject         notification subject line
     * @param content         notification body text
     * @param referenceId     related business entity reference (e.g. transactionRef)
     */
    void sendEmailNotification(
            UUID recipientUserId,
            String recipientEmail,
            String eventType,
            String subject,
            String content,
            String referenceId);
}
