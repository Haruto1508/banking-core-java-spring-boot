import { apiClient } from './client';
import type {
  ApiResponse,
  AuthResponse,
  BankAccount,
  Customer,
  NotificationRecord,
  PageResponse,
  PaymentMethod,
  PaymentRecord,
  ReconciliationReport,
  TransactionRecord,
  TransactionStatus,
  TransactionType,
  AccountType,
  UserProfile,
} from '../types/banking';

export const authApi = {
  login: (usernameOrEmail: string, password: string) =>
    apiClient.post<ApiResponse<AuthResponse>>('/auth/login', { usernameOrEmail, password }),

  register: (username: string, email: string, password: string) =>
    apiClient.post<ApiResponse<AuthResponse>>('/auth/register', { username, email, password }),

  logout: (refreshToken: string) =>
    apiClient.post<ApiResponse<void>>('/auth/logout', { refreshToken }),

  me: () => apiClient.get<ApiResponse<UserProfile>>('/auth/me'),
};

export const customerApi = {
  getMe: () => apiClient.get<ApiResponse<Customer>>('/customers/me'),

  create: (payload: {
    userId?: string | null;
    fullName: string;
    identityNumber: string;
    phoneNumber: string;
    email: string;
  }) => apiClient.post<ApiResponse<Customer>>('/customers', payload),

  update: (id: string, payload: { fullName: string; phoneNumber: string; email: string }) =>
    apiClient.put<ApiResponse<Customer>>(`/customers/${id}`, payload),

  search: (keyword = '', page = 0, size = 20) =>
    apiClient.get<ApiResponse<PageResponse<Customer>>>('/customers', {
      params: { keyword: keyword || undefined, page, size },
    }),
};

export const accountApi = {
  open: (customerId: string, accountType: AccountType, currency: string) =>
    apiClient.post<ApiResponse<BankAccount>>('/accounts', { customerId, accountType, currency }),

  getByCustomer: (customerId: string) =>
    apiClient.get<ApiResponse<BankAccount[]>>(`/accounts/customer/${customerId}`),

  getById: (accountId: string) =>
    apiClient.get<ApiResponse<BankAccount>>(`/accounts/${accountId}`),

  freeze: (accountId: string) =>
    apiClient.patch<ApiResponse<BankAccount>>(`/accounts/${accountId}/freeze`),

  unfreeze: (accountId: string) =>
    apiClient.patch<ApiResponse<BankAccount>>(`/accounts/${accountId}/unfreeze`),

  close: (accountId: string) =>
    apiClient.patch<ApiResponse<BankAccount>>(`/accounts/${accountId}/close`),
};

export const transactionApi = {
  transfer: (
    payload: {
      sourceAccountId: string;
      targetAccountId: string;
      amount: number;
      currency: string;
      description?: string;
    },
    idempotencyKey: string
  ) =>
    apiClient.post<ApiResponse<TransactionRecord>>('/transactions/transfer', payload, {
      headers: { 'Idempotency-Key': idempotencyKey },
    }),

  deposit: (payload: { accountId: string; amount: number; currency: string; description?: string }) =>
    apiClient.post<ApiResponse<TransactionRecord>>('/transactions/deposit', payload),

  withdraw: (payload: { accountId: string; amount: number; currency: string; description?: string }) =>
    apiClient.post<ApiResponse<TransactionRecord>>('/transactions/withdraw', payload),

  getHistory: (
    accountId: string,
    params?: { type?: TransactionType; status?: TransactionStatus; page?: number; size?: number }
  ) =>
    apiClient.get<ApiResponse<PageResponse<TransactionRecord>>>(`/transactions/account/${accountId}`, {
      params,
    }),
};

export const paymentApi = {
  create: (
    payload: {
      sourceAccountId: string;
      merchantAccountId: string;
      amount: number;
      currency: string;
      paymentMethod: PaymentMethod;
      description?: string;
    },
    idempotencyKey: string
  ) =>
    apiClient.post<ApiResponse<PaymentRecord>>('/payments', payload, {
      headers: { 'Idempotency-Key': idempotencyKey },
    }),

  getHistory: (accountId: string, page = 0, size = 10) =>
    apiClient.get<ApiResponse<PageResponse<PaymentRecord>>>(`/payments/account/${accountId}`, {
      params: { page, size },
    }),

  refund: (paymentId: string, reason: string) =>
    apiClient.post<ApiResponse<PaymentRecord>>(`/payments/${paymentId}/refund`, { reason }),
};

export const notificationApi = {
  getMyNotifications: (page = 0, size = 20) =>
    apiClient.get<ApiResponse<PageResponse<NotificationRecord>>>('/notifications/me', {
      params: { page, size },
    }),
};

export const reconciliationApi = {
  reconcileAccount: (accountId: string) =>
    apiClient.get<ApiResponse<ReconciliationReport>>(`/reconciliation/accounts/${accountId}`),
};
