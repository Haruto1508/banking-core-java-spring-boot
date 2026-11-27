package com.banking.core.payment.service.impl;

import com.banking.core.account.domain.enums.AccountStatus;
import com.banking.core.account.domain.enums.AccountType;
import com.banking.core.account.exposed.AccountApi;
import com.banking.core.account.exposed.AccountSummaryDto;
import com.banking.core.audit.exposed.AuditApi;
import com.banking.core.auth.domain.enums.Role;
import com.banking.core.customer.domain.enums.CustomerStatus;
import com.banking.core.customer.exposed.CustomerApi;
import com.banking.core.customer.exposed.CustomerSummaryDto;
import com.banking.core.payment.api.dto.request.CreatePaymentRequest;
import com.banking.core.payment.api.dto.request.RefundPaymentRequest;
import com.banking.core.payment.api.dto.response.PaymentResponse;
import com.banking.core.payment.domain.entity.Payment;
import com.banking.core.payment.domain.enums.PaymentMethod;
import com.banking.core.payment.domain.enums.PaymentStatus;
import com.banking.core.payment.domain.exception.PaymentException;
import com.banking.core.payment.domain.repository.PaymentRepository;
import com.banking.core.transaction.domain.enums.TransactionStatus;
import com.banking.core.transaction.domain.enums.TransactionType;
import com.banking.core.transaction.exposed.TransactionApi;
import com.banking.core.transaction.exposed.TransactionSummaryDto;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("PaymentServiceImpl Unit Tests")
class PaymentServiceImplTest {

    @Mock
    private PaymentRepository paymentRepository;

    @Mock
    private AccountApi accountApi;

    @Mock
    private CustomerApi customerApi;

    @Mock
    private TransactionApi transactionApi;

    @Mock
    private AuditApi auditApi;

    @InjectMocks
    private PaymentServiceImpl paymentService;

    private UUID sourceAccountId;
    private UUID merchantAccountId;
    private UUID customerId;
    private UUID userId;
    private AccountSummaryDto sourceAccount;

    @BeforeEach
    void setUp() {
        sourceAccountId = UUID.randomUUID();
        merchantAccountId = UUID.randomUUID();
        customerId = UUID.randomUUID();
        userId = UUID.randomUUID();

        sourceAccount = new AccountSummaryDto(
                sourceAccountId, "ACC-20250101-100001", customerId,
                AccountType.CURRENT, "VND", new BigDecimal("5000000.0000"), AccountStatus.ACTIVE);
    }

    @Test
    @DisplayName("processPayment: should execute transfer via TransactionApi and mark payment COMPLETED")
    void processPayment_shouldCompleteSuccessfully() {
        CreatePaymentRequest request = new CreatePaymentRequest(
                sourceAccountId, merchantAccountId, new BigDecimal("250000"), "VND",
                PaymentMethod.QR_CODE, "Coffee shop payment");

        CustomerSummaryDto customerSummary = new CustomerSummaryDto(
                customerId, userId, "CIF-1001", "Alice", "alice@example.com", CustomerStatus.ACTIVE);

        UUID txnId = UUID.randomUUID();
        TransactionSummaryDto txnSummary = new TransactionSummaryDto(
                txnId, "TXN-20250101-111111", sourceAccountId, merchantAccountId,
                TransactionType.TRANSFER, new BigDecimal("250000.0000"), "VND",
                TransactionStatus.SUCCESS, Instant.now());

        when(paymentRepository.findByIdempotencyKey("idem-pay-1")).thenReturn(Optional.empty());
        when(accountApi.findAccountById(sourceAccountId)).thenReturn(Optional.of(sourceAccount));
        when(customerApi.findCustomerByUserId(userId)).thenReturn(Optional.of(customerSummary));
        when(paymentRepository.existsByPaymentRef(anyString())).thenReturn(false);
        when(paymentRepository.save(any(Payment.class))).thenAnswer(inv -> {
            Payment p = inv.getArgument(0);
            if (p.getId() == null) {
                setPaymentId(p, UUID.randomUUID());
            }
            return p;
        });
        when(transactionApi.executeInternalTransfer(any(), any(), any(), anyString(), anyString(), anyString()))
                .thenReturn(txnSummary);

        PaymentResponse response = paymentService.processPayment(request, "idem-pay-1", userId, Role.CUSTOMER);

        assertThat(response.status()).isEqualTo(PaymentStatus.COMPLETED);
        assertThat(response.transactionId()).isEqualTo(txnId);
        verify(transactionApi).executeInternalTransfer(
                eq(sourceAccountId), eq(merchantAccountId), eq(new BigDecimal("250000")),
                eq("VND"), anyString(), eq("PAY-idem-pay-1"));
    }

    @Test
    @DisplayName("processPayment: should reject payment when source and merchant accounts are identical")
    void processPayment_shouldRejectSameAccount() {
        CreatePaymentRequest request = new CreatePaymentRequest(
                sourceAccountId, sourceAccountId, new BigDecimal("100000"), "VND",
                PaymentMethod.BILL_PAYMENT, "Invalid self payment");

        assertThatThrownBy(() -> paymentService.processPayment(request, null, userId, Role.ADMIN))
                .isInstanceOf(PaymentException.class);
        verify(transactionApi, never()).executeInternalTransfer(any(), any(), any(), any(), any(), any());
    }

    @Test
    @DisplayName("refundPayment: should reverse transaction and mark payment REFUNDED")
    void refundPayment_shouldReverseTransactionAndMarkRefunded() {
        UUID paymentId = UUID.randomUUID();
        UUID txnId = UUID.randomUUID();
        Payment completedPayment = Payment.builder()
                .paymentRef("PAY-20250101-123456")
                .sourceAccountId(sourceAccountId)
                .merchantAccountId(merchantAccountId)
                .transactionId(txnId)
                .amount(new BigDecimal("250000.0000"))
                .currency("VND")
                .paymentMethod(PaymentMethod.QR_CODE)
                .status(PaymentStatus.COMPLETED)
                .description("Merchant order")
                .build();
        setPaymentId(completedPayment, paymentId);

        when(paymentRepository.findById(paymentId)).thenReturn(Optional.of(completedPayment));
        when(paymentRepository.save(any(Payment.class))).thenAnswer(inv -> inv.getArgument(0));

        PaymentResponse response = paymentService.refundPayment(
                paymentId, new RefundPaymentRequest("Customer returned item"), UUID.randomUUID());

        assertThat(response.status()).isEqualTo(PaymentStatus.REFUNDED);
        verify(transactionApi).reverseTransaction(eq(txnId), contains("Customer returned item"));
    }

    private void setPaymentId(Payment payment, UUID id) {
        try {
            var field = com.banking.core.common.domain.BaseAuditEntity.class.getDeclaredField("id");
            field.setAccessible(true);
            field.set(payment, id);
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
    }
}
