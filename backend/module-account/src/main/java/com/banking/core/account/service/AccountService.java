package com.banking.core.account.service;

import com.banking.core.account.api.dto.request.OpenAccountRequest;
import com.banking.core.account.api.dto.request.UpdateAccountStatusRequest;
import com.banking.core.account.api.dto.response.AccountResponse;
import com.banking.core.auth.domain.enums.Role;

import java.util.List;
import java.util.UUID;

/**
 * Internal service interface for bank account management.
 * <p>
 * Controllers call only this interface; they must not call AccountRepository directly.
 */
public interface AccountService {

    /**
     * Opens a new bank account for the specified customer.
     * <p>
     * - Customer must be ACTIVE.
     * - STAFF and ADMIN can open accounts for any customer.
     * - CUSTOMER role can only open an account linked to their own customer profile.
     *
     * @param request         account open request (customerId, accountType, currency)
     * @param requesterUserId authenticated user ID making the request
     * @param requesterRole   role of the authenticated user
     * @return created account details
     */
    AccountResponse openAccount(OpenAccountRequest request, UUID requesterUserId, Role requesterRole);

    /**
     * Returns full account details by account UUID.
     * <p>
     * CUSTOMER role can only view their own accounts (IDOR protection).
     *
     * @param accountId       account UUID
     * @param requesterUserId authenticated user ID
     * @param requesterRole   role of the authenticated user
     * @return account details DTO
     */
    AccountResponse getAccountById(UUID accountId, UUID requesterUserId, Role requesterRole);

    /**
     * Returns all accounts belonging to a specific customer.
     * <p>
     * CUSTOMER role can only list their own accounts.
     *
     * @param customerId      customer UUID
     * @param requesterUserId authenticated user ID
     * @param requesterRole   role of the authenticated user
     * @return list of account DTOs
     */
    List<AccountResponse> getAccountsByCustomer(UUID customerId, UUID requesterUserId, Role requesterRole);

    /**
     * Returns current account balance details.
     * <p>
     * CUSTOMER role can only query their own accounts.
     *
     * @param accountId       account UUID
     * @param requesterUserId authenticated user ID
     * @param requesterRole   role of the authenticated user
     * @return account DTO containing the current balance
     */
    AccountResponse getBalance(UUID accountId, UUID requesterUserId, Role requesterRole);

    /**
     * Freezes an ACTIVE account.
     * <p>
     * Only ADMIN or STAFF can freeze accounts.
     *
     * @param accountId account UUID to freeze
     * @return updated account DTO
     */
    AccountResponse freezeAccount(UUID accountId);

    /**
     * Unfreezes a FROZEN account, restoring ACTIVE status.
     * <p>
     * Only ADMIN or STAFF can unfreeze accounts.
     *
     * @param accountId account UUID to unfreeze
     * @return updated account DTO
     */
    AccountResponse unfreezeAccount(UUID accountId);

    /**
     * Permanently closes an account.
     * <p>
     * - Account balance must be exactly 0.
     * - Only ADMIN can close accounts.
     *
     * @param accountId account UUID to close
     * @return updated account DTO
     */
    AccountResponse closeAccount(UUID accountId);
}
