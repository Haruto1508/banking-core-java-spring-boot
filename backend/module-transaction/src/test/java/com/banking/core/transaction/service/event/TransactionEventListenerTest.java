package com.banking.core.transaction.service.event;

import com.banking.core.notification.exposed.NotificationApi;
import com.banking.core.notification.exposed.TransactionEventPayload;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.kafka.core.KafkaTemplate;

import java.math.BigDecimal;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;

@ExtendWith(MockitoExtension.class)
@DisplayName("TransactionEventListener Unit Tests")
class TransactionEventListenerTest {

    @Mock
    private NotificationApi notificationApi;

    @Mock
    private KafkaTemplate<String, String> kafkaTemplate;

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Test
    @DisplayName("onTransactionCommitted: should publish JSON to Kafka when kafkaEnabled=true")
    void onTransactionCommitted_shouldPublishToKafkaWhenEnabled() {
        TransactionEventListener listener = new TransactionEventListener(
                notificationApi, objectMapper, kafkaTemplate, true, "banking.transaction.events");

        TransactionEventPayload payload = new TransactionEventPayload(
                UUID.randomUUID(), "TXN-20261127-100001", UUID.randomUUID(),
                "user@test.com", "TRANSFER_CREDITED", new BigDecimal("500000"), "VND");

        listener.onTransactionCommitted(payload);

        verify(kafkaTemplate).send(eq("banking.transaction.events"), eq("TXN-20261127-100001"), anyString());
        verifyNoInteractions(notificationApi);
    }

    @Test
    @DisplayName("onTransactionCommitted: should call NotificationApi directly when kafkaEnabled=false")
    void onTransactionCommitted_shouldCallNotificationApiDirectlyWhenKafkaDisabled() {
        TransactionEventListener listener = new TransactionEventListener(
                notificationApi, objectMapper, kafkaTemplate, false, "banking.transaction.events");

        UUID userId = UUID.randomUUID();
        TransactionEventPayload payload = new TransactionEventPayload(
                UUID.randomUUID(), "TXN-20261127-100002", userId,
                "user@test.com", "DEPOSIT_COMPLETED", new BigDecimal("1000000"), "VND");

        listener.onTransactionCommitted(payload);

        verify(notificationApi).sendEmailNotification(
                eq(userId), eq("user@test.com"), eq("DEPOSIT_COMPLETED"),
                anyString(), anyString(), eq("TXN-20261127-100002"));
        verifyNoInteractions(kafkaTemplate);
    }
}
