package com.banking.core.notification.kafka;

import com.banking.core.notification.exposed.NotificationApi;
import com.banking.core.notification.exposed.TransactionEventPayload;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;

/**
 * Kafka consumer listening for transaction completion events.
 * <p>
 * Controlled by {@code banking.kafka.enabled} (defaults to false in local/test profiles
 * so integration tests run without requiring a live Kafka broker).
 */
@Component
@RequiredArgsConstructor
public class NotificationKafkaConsumer {

    private static final Logger log = LoggerFactory.getLogger(NotificationKafkaConsumer.class);

    private final NotificationApi notificationApi;
    private final ObjectMapper objectMapper;

    /**
     * Consumes JSON-serialized TransactionEventPayload messages from Kafka
     * and dispatches email notifications to the recipient.
     *
     * @param messagePayload raw JSON message from Kafka topic
     */
    @KafkaListener(
            topics = "${banking.kafka.topics.transaction-events:banking.transaction.events}",
            groupId = "${spring.kafka.consumer.group-id:banking-notification-group}",
            autoStartup = "${banking.kafka.enabled:false}"
    )
    public void consumeTransactionEvent(String messagePayload) {
        log.info("Received Kafka transaction event payload");
        try {
            TransactionEventPayload event = objectMapper.readValue(messagePayload, TransactionEventPayload.class);

            String subject = String.format("Banking Alert: %s (%s)", event.eventType(), event.transactionRef());
            String content = String.format(
                    "Your transaction %s for amount %s %s has been processed.",
                    event.transactionRef(), event.amount(), event.currency());

            notificationApi.sendEmailNotification(
                    event.recipientUserId(),
                    event.recipientEmail(),
                    event.eventType(),
                    subject,
                    content,
                    event.transactionRef()
            );
        } catch (JsonProcessingException ex) {
            log.error("Failed to deserialize Kafka transaction event: {}", ex.getMessage());
        }
    }
}
