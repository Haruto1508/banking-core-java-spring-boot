package com.banking.core.notification.domain.repository;

import com.banking.core.notification.domain.entity.Notification;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

/**
 * JPA repository for Notification entities.
 */
public interface NotificationRepository extends JpaRepository<Notification, UUID> {

    /**
     * Finds paginated notifications for a specific user ordered by newest first.
     *
     * @param recipientUserId user UUID
     * @param pageable        pagination settings
     * @return page of notifications
     */
    Page<Notification> findByRecipientUserIdOrderByCreatedAtDesc(UUID recipientUserId, Pageable pageable);
}
