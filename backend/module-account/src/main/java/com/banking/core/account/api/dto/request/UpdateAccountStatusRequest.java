package com.banking.core.account.api.dto.request;

import com.banking.core.account.domain.enums.AccountStatus;
import jakarta.validation.constraints.NotNull;

/**
 * Request payload for changing an account's status (FREEZE, UNFREEZE, CLOSE).
 *
 * @param status target status to transition the account to
 */
public record UpdateAccountStatusRequest(

        @NotNull(message = "Target status must not be null")
        AccountStatus status

) {}
