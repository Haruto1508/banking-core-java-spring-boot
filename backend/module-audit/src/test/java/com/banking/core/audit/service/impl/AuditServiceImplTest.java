package com.banking.core.audit.service.impl;

import com.banking.core.audit.domain.entity.AuditLog;
import com.banking.core.audit.domain.repository.AuditLogRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
@DisplayName("AuditServiceImpl Unit Tests")
class AuditServiceImplTest {

    @Mock
    private AuditLogRepository auditLogRepository;

    @InjectMocks
    private AuditServiceImpl auditService;

    @Test
    @DisplayName("recordAuditLog: should persist audit log and redact sensitive fields in metadata")
    void recordAuditLog_shouldRedactSensitiveMetadata() {
        // Act
        auditService.recordAuditLog(
                "user-123",
                "CUSTOMER",
                "LOGIN_ATTEMPT",
                "USER",
                "user-123",
                "127.0.0.1",
                "FAILURE",
                "username=john, password=mySecretPassword123, token=eyJhbGciOi..."
        );

        // Assert
        ArgumentCaptor<AuditLog> captor = ArgumentCaptor.forClass(AuditLog.class);
        verify(auditLogRepository).save(captor.capture());

        AuditLog saved = captor.getValue();
        assertThat(saved.getMetadata()).doesNotContain("mySecretPassword123");
        assertThat(saved.getMetadata()).doesNotContain("eyJhbGciOi");
        assertThat(saved.getMetadata()).contains("[REDACTED]");
    }
}
