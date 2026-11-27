package com.banking.core.notification.service.impl;

import com.banking.core.common.dto.PageResponse;
import com.banking.core.notification.api.dto.response.NotificationResponse;
import com.banking.core.notification.domain.entity.Notification;
import com.banking.core.notification.domain.enums.NotificationChannel;
import com.banking.core.notification.domain.enums.NotificationStatus;
import com.banking.core.notification.domain.repository.NotificationRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("NotificationServiceImpl Unit Tests")
class NotificationServiceImplTest {

    @Mock
    private NotificationRepository notificationRepository;

    @InjectMocks
    private NotificationServiceImpl notificationService;

    @InjectMocks
    private NotificationApiImpl notificationApi;

    @Test
    @DisplayName("sendEmailNotification: should save SENT notification record")
    void sendEmailNotification_shouldSaveSentRecord() {
        UUID userId = UUID.randomUUID();
        when(notificationRepository.save(any(Notification.class))).thenAnswer(inv -> inv.getArgument(0));

        notificationApi.sendEmailNotification(
                userId,
                "customer@example.com",
                "TRANSFER_COMPLETED",
                "Transfer Alert",
                "Your transfer of 100,000 VND succeeded.",
                "TXN-20250101-123456"
        );

        ArgumentCaptor<Notification> captor = ArgumentCaptor.forClass(Notification.class);
        verify(notificationRepository).save(captor.capture());

        Notification saved = captor.getValue();
        assertThat(saved.getStatus()).isEqualTo(NotificationStatus.SENT);
        assertThat(saved.getChannel()).isEqualTo(NotificationChannel.EMAIL);
        assertThat(saved.getRecipientEmail()).isEqualTo("customer@example.com");
        assertThat(saved.getSentAt()).isNotNull();
    }

    @Test
    @DisplayName("getMyNotifications: should return paginated notifications for user")
    void getMyNotifications_shouldReturnPaginatedResults() {
        UUID userId = UUID.randomUUID();
        Notification notification = Notification.builder()
                .id(UUID.randomUUID())
                .recipientUserId(userId)
                .recipientEmail("user@example.com")
                .channel(NotificationChannel.EMAIL)
                .eventType("DEPOSIT_COMPLETED")
                .subject("Deposit Received")
                .content("500,000 VND deposited")
                .status(NotificationStatus.SENT)
                .referenceId("TXN-1")
                .sentAt(Instant.now())
                .createdAt(Instant.now())
                .build();

        Page<Notification> page = new PageImpl<>(List.of(notification));
        when(notificationRepository.findByRecipientUserIdOrderByCreatedAtDesc(eq(userId), any()))
                .thenReturn(page);

        PageResponse<NotificationResponse> response = notificationService.getMyNotifications(
                userId, PageRequest.of(0, 10));

        assertThat(response.getContent()).hasSize(1);
        assertThat(response.getContent().get(0).eventType()).isEqualTo("DEPOSIT_COMPLETED");
    }
}
