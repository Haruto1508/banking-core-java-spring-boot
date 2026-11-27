package com.banking.core.notification.service.impl;

import com.banking.core.notification.domain.entity.Notification;
import com.banking.core.notification.domain.enums.NotificationChannel;
import com.banking.core.notification.domain.enums.NotificationStatus;
import com.banking.core.notification.domain.repository.NotificationRepository;
import com.banking.core.notification.exposed.NotificationApi;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.UUID;

/**
 * Dedicated cross-module facade implementing {@link NotificationApi}.
 * Dispatches notifications via a mock email provider and persists notification history.
 */
@Service
@RequiredArgsConstructor
public class NotificationApiImpl implements NotificationApi {

    private static final Logger log = LoggerFactory.getLogger(NotificationApiImpl.class);

    private final NotificationRepository notificationRepository;

    /**
     * Cross-module API: dispatches an email notification via the mock provider
     * and persists the notification record in a fresh transaction (safe for AFTER_COMMIT listeners).
     */
    @Override
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void sendEmailNotification(
            UUID recipientUserId,
            String recipientEmail,
            String eventType,
            String subject,
            String content,
            String referenceId) {

        Notification notification = Notification.builder()
                .recipientUserId(recipientUserId)
                .recipientEmail(recipientEmail)
                .channel(NotificationChannel.EMAIL)
                .eventType(eventType)
                .subject(subject)
                .content(content)
                .status(NotificationStatus.PENDING)
                .referenceId(referenceId)
                .createdAt(Instant.now())
                .build();

        try {
            log.info("[MOCK EMAIL DISPATCH] To={} | Subject='{}' | Ref={} | Body='{}'",
                    recipientEmail, subject, referenceId, content);

            notification.markSent();
        } catch (Exception ex) {
            log.error("Failed to dispatch notification to={}: {}", recipientEmail, ex.getMessage());
            notification.markFailed();
        }

        notificationRepository.save(notification);
    }
}
