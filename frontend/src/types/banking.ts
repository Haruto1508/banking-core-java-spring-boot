export type Role = 'ADMIN' | 'STAFF' | 'CUSTOMER';
export type UserStatus = 'ACTIVE' | 'LOCKED' | 'DISABLED';
export type CustomerStatus = 'ACTIVE' | 'SUSPENDED' | 'CLOSED';
export type AccountType = 'SAVINGS' | 'CURRENT' | 'SYSTEM';
export type AccountStatus = 'ACTIVE' | 'FROZEN' | 'CLOSED';
export type TransactionType = 'DEPOSIT' | 'WITHDRAWAL' | 'TRANSFER' | 'REVERSAL';
export type TransactionStatus = 'PENDING' | 'PROCESSING' | 'SUCCESS' | 'FAILED' | 'REVERSED';
export type PaymentMethod = 'INTERNAL_ACCOUNT' | 'BILL_PAYMENT' | 'QR_CODE';
export type PaymentStatus = 'PENDING' | 'COMPLETED' | 'FAILED' | 'REFUNDED';

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
  timestamp: string;
}

export interface PageResponse<T> {
  content: T[];
  pageNumber: number;
  pageSize: number;
  totalElements: number;
  totalPages: number;
  last: boolean;
}

export interface UserProfile {
  id: string;
  username: string;
  email: string;
  role: Role;
  status: UserStatus;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresInSeconds: number;
  user: UserProfile;
}

export interface Customer {
  id: string;
  userId: string | null;
  customerNumber: string;
  fullName: string;
  identityNumber: string;
  phoneNumber: string;
  email: string;
  status: CustomerStatus;
  createdAt: string;
  updatedAt: string;
}

export interface BankAccount {
  id: string;
  customerId: string;
  accountNumber: string;
  accountType: AccountType;
  currency: string;
  balance: number;
  status: AccountStatus;
  createdAt: string;
  updatedAt: string;
}

export interface TransactionRecord {
  id: string;
  transactionRef: string;
  idempotencyKey?: string;
  sourceAccountId: string | null;
  targetAccountId: string | null;
  transactionType: TransactionType;
  amount: number;
  currency: string;
  status: TransactionStatus;
  failureReason?: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PaymentRecord {
  id: string;
  paymentRef: string;
  idempotencyKey?: string;
  sourceAccountId: string;
  merchantAccountId: string;
  transactionId?: string;
  amount: number;
  currency: string;
  paymentMethod: PaymentMethod;
  status: PaymentStatus;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationRecord {
  id: string;
  recipientUserId: string;
  recipientEmail: string;
  channel: 'EMAIL' | 'SMS' | 'IN_APP';
  eventType: string;
  subject: string;
  content: string;
  status: 'PENDING' | 'SENT' | 'FAILED';
  referenceId?: string;
  sentAt?: string;
  createdAt: string;
}

export interface ReconciliationReport {
  accountId: string;
  accountNumber: string;
  currency: string;
  accountBalance: number;
  ledgerBalance: number;
  discrepancy: number;
  balanced: boolean;
  checkedAt: string;
}

export interface AuditLogRecord {
  id: string;
  actorId: string;
  actorRole: string;
  action: string;
  resourceType: string;
  resourceId: string;
  ipAddress?: string;
  status: string;
  metadata?: string;
  createdAt: string;
}
