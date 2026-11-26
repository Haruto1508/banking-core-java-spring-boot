package com.banking.core.common.constant;

import java.math.BigDecimal;
import java.math.RoundingMode;

/**
 * Core constants enforcing financial precision rules across the entire system.
 */
public final class BankingConstants {

    private BankingConstants() {
        // Prevent instantiation
    }

    /**
     * Standard scale for financial amounts stored in database (4 decimal places).
     * Prevents truncation errors in multi-step transactions and fee computations.
     */
    public static final int FINANCIAL_SCALE = 4;

    /**
     * Banker's rounding (Half-Even) is the industry standard for financial rounding.
     */
    public static final RoundingMode FINANCIAL_ROUNDING = RoundingMode.HALF_EVEN;

    /**
     * Zero constant in standard scale.
     */
    public static final BigDecimal ZERO_AMOUNT = BigDecimal.ZERO.setScale(FINANCIAL_SCALE, FINANCIAL_ROUNDING);

    /**
     * Supported default currencies.
     */
    public static final String DEFAULT_CURRENCY_USD = "USD";
    public static final String DEFAULT_CURRENCY_VND = "VND";

    /**
     * Ledger special system account identifier for cash/vault operations.
     */
    public static final String SYSTEM_VAULT_ACCOUNT_NUMBER = "SYS-GL-VAULT-001";
}
