package com.banking.core.notification.service.impl;

import com.banking.core.common.dto.PageResponse;
import com.banking.core.notification.api.dto.response.NotificationResponse;
import com.banking.core.notification.domain.entity.Notification;
import com.banking.core.notification.domain.enums.NotificationChannel;
import com.banking.core.notification.domain.enums.NotificationStatus;
import com.banking.core.notification.domain.repository.NotificationRepository;
import com.banking.core.notification.exposed.NotificationApi;
import com.banking.core.notification.service.NotificationService;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.UUID;

/**
 * Implementation of NotificationService and public NotificationApi.
 * Uses a mock email provider to simulate asynchronous transaction alerts
 * and stores notification history in PostgreSQL.
 */
@Service
@RequiredArgsConstructor
public class NotificationServiceImpl implements NotificationService, NotificationApi {

    private static final Logger log = LoggerFactory.getLogger(NotificationServiceImpl.class);

    private final NotificationRepository notificationRepository;

    /**
     * Cross-module API: dispatches an email notification via the mock provider
     * and persists the notification record.
     */
    @Override
    @Transactional
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
            // Mock Email Provider simulation
            log.info("[MOCK EMAIL DISPATCH] To={} | Subject='{}' | Ref={} | Body='{}'",
                    recipientEmail, subject, referenceId, content);

            notification.markSent();
        } catch (Exception ex) {
            log.error("Failed to dispatch notification to={}: {}", recipientEmail, ex.getMessage());
            notification.markFailed();
        }

        notificationRepository.save(notification);
    }

    /**
     * Queries paginated notification history for a specific user.
     */
    @Override
    @Transactional(readOnly = true)
    public PageResponse<NotificationResponse> getMyNotifications(UUID userId, Pageable pageable) {
        Page<NotificationResponse> page = notificationRepository
                .findByRecipientUserIdOrderByCreatedAtDesc(userId, pageable)
                .map(this::mapToResponse);
        return PageResponse.from(page);
    }

    private NotificationResponse mapToResponse(Notification entity) {
        return new NotificationResponse(
                entity.getId(),
                entity.getRecipientUserId(),
                entity.getRecipientEmail(),
                entity.getChannel(),
                entity.getEventType(),
                entity.getSubject(),
                entity.getContent(),
                entity.getStatus(),
                entity.getReferenceId(),
                entity.getSentAt(),
                entity.getCreatedAt()
        );
    }
}
