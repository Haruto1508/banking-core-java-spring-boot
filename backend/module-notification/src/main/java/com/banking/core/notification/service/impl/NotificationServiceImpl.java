package com.banking.core.notification.service.impl;

import com.banking.core.common.dto.PageResponse;
import com.banking.core.notification.api.dto.response.NotificationResponse;
import com.banking.core.notification.domain.entity.Notification;
import com.banking.core.notification.domain.repository.NotificationRepository;
import com.banking.core.notification.service.NotificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

/**
 * Implementation of {@link NotificationService} for querying user notification history.
 */
@Service
@RequiredArgsConstructor
public class NotificationServiceImpl implements NotificationService {

    private final NotificationRepository notificationRepository;

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
