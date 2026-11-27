package com.banking.core.transaction.service.event;

import com.banking.core.notification.exposed.NotificationApi;
import com.banking.core.notification.exposed.TransactionEventPayload;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

/**
 * Listens for committed transaction events and dispatches notifications
 * either via Apache Kafka (when enabled) or directly via NotificationApi.
 * <p>
 * Runs strictly AFTER_COMMIT so rolled-back transactions never trigger alerts.
 */
@Component
public class TransactionEventListener {

    private static final Logger log = LoggerFactory.getLogger(TransactionEventListener.class);

    private final NotificationApi notificationApi;
    private final ObjectMapper objectMapper;
    private final KafkaTemplate<String, String> kafkaTemplate;
    private final boolean kafkaEnabled;
    private final String transactionEventsTopic;

    public TransactionEventListener(
            NotificationApi notificationApi,
            ObjectMapper objectMapper,
            @Autowired(required = false) KafkaTemplate<String, String> kafkaTemplate,
            @Value("${banking.kafka.enabled:false}") boolean kafkaEnabled,
            @Value("${banking.kafka.topics.transaction-events:banking.transaction.events}") String transactionEventsTopic) {
        this.notificationApi = notificationApi;
        this.objectMapper = objectMapper;
        this.kafkaTemplate = kafkaTemplate;
        this.kafkaEnabled = kafkaEnabled;
        this.transactionEventsTopic = transactionEventsTopic;
    }

    /**
     * Publishes the committed transaction event to Kafka if enabled,
     * or dispatches directly through NotificationApi in single-process mode.
     *
     * @param payload committed transaction event payload
     */
    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onTransactionCommitted(TransactionEventPayload payload) {
        if (kafkaEnabled && kafkaTemplate != null) {
            try {
                String json = objectMapper.writeValueAsString(payload);
                kafkaTemplate.send(transactionEventsTopic, payload.transactionRef(), json);
                log.info("Published Kafka transaction event ref={} topic={}",
                        payload.transactionRef(), transactionEventsTopic);
                return;
            } catch (JsonProcessingException ex) {
                log.error("Failed to serialize transaction event ref={}; falling back to direct notification",
                        payload.transactionRef(), ex);
            }
        }

        String subject = String.format("Banking Alert: %s (%s)", payload.eventType(), payload.transactionRef());
        String content = String.format(
                "Your transaction %s for amount %s %s has been processed.",
                payload.transactionRef(), payload.amount(), payload.currency());

        notificationApi.sendEmailNotification(
                payload.recipientUserId(),
                payload.recipientEmail(),
                payload.eventType(),
                subject,
                content,
                payload.transactionRef()
        );
    }
}
