package com.banking.core.notification.api.controller;

import com.banking.core.auth.security.BankingUserDetails;
import com.banking.core.common.dto.ApiResponse;
import com.banking.core.common.dto.PageResponse;
import com.banking.core.notification.api.dto.response.NotificationResponse;
import com.banking.core.notification.service.NotificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * REST controller for querying user notification history.
 * Base path: /api/v1/notifications
 */
@RestController
@RequestMapping("/api/v1/notifications")
@RequiredArgsConstructor
public class NotificationController {

    private final NotificationService notificationService;

    /**
     * Retrieves paginated notification history for the currently authenticated user.
     */
    @GetMapping("/me")
    @PreAuthorize("isAuthenticated()")
    public ApiResponse<PageResponse<NotificationResponse>> getMyNotifications(
            @PageableDefault(size = 20) Pageable pageable,
            @AuthenticationPrincipal BankingUserDetails currentUser) {

        PageResponse<NotificationResponse> notifications = notificationService.getMyNotifications(
                currentUser.getUserId(), pageable);
        return ApiResponse.success(notifications);
    }
}
