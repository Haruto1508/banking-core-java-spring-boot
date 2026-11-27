package com.banking.core.notification.service;

import com.banking.core.common.dto.PageResponse;
import com.banking.core.notification.api.dto.response.NotificationResponse;
import org.springframework.data.domain.Pageable;

import java.util.UUID;

/**
 * Service interface for querying notification history.
 */
public interface NotificationService {

    /**
     * Retrieves paginated notification history for the authenticated user.
     *
     * @param userId   user UUID
     * @param pageable pagination parameters
     * @return paginated notifications
     */
    PageResponse<NotificationResponse> getMyNotifications(UUID userId, Pageable pageable);
}
