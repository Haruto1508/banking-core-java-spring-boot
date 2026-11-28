import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  CheckCircle2,
  Database,
  Lock,
  PlusCircle,
  Radio,
  RotateCcw,
  RotateCw,
  Scale,
  Search,
  Server,
  ShieldAlert,
  ShieldCheck,
  Unlock,
  UserCheck,
  X,
  Zap,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { accountApi, auditApi, customerApi, reconciliationApi, transactionApi } from '../api/bankingApi';
import { extractErrorMessage } from '../api/client';
import type { AccountType, AuditLogRecord, BankAccount, Customer, ReconciliationReport } from '../types/banking';
import { formatCurrency, formatDateTime } from '../utils/format';
import { AlertModal } from '../components/AlertModal';

const SYSTEM_VAULTS = [
  { acc: 'SYS-GL-VAULT-001', name: 'Kho Quỹ Dự Trữ Chung (GL Vault)', desc: 'Tài khoản cân bằng tài sản toàn hệ thống core banking', currency: 'USD' },
  { acc: 'SYS-CASH-VAULT-001', name: 'Kho Tiền Mặt Quầy Teller', desc: 'Quỹ tiền mặt phục vụ giao dịch nạp/rút tại quầy giao dịch', currency: 'VND' },
  { acc: 'SYS-FEE-INCOME-001', name: 'Thu Phí Dịch Vụ & Tiện Ích', desc: 'Ghi nhận doanh thu phí chuyển tiền và thanh toán hóa đơn', currency: 'VND' },
  { acc: 'SYS-INTEREST-EXPENSE-001', name: 'Chi Phí Lãi Tiết Kiệm', desc: 'Tài khoản nguồn chi trả lãi suất định kỳ cho khách hàng', currency: 'VND' },
  { acc: 'SYS-SEPAY-SETTLEMENT-001', name: 'Đối Soát Bù Trừ Cổng SePay', desc: 'Tài khoản thanh toán bù trừ tự động Napas247 SePay Hub', currency: 'VND' },
];

export const AdminDashboardPage: React.FC = () => {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const validTabs = ['overview', 'allocate', 'accounts', 'reversal', 'audit', 'reconcile', 'vaults'] as const;
  type TabType = typeof validTabs[number];

  const tabParam = searchParams.get('tab') as TabType | null;
  const initialTab: TabType = tabParam && validTabs.includes(tabParam) ? tabParam : 'overview';
  const [activeTab, setActiveTab] = useState<TabType>(initialTab);

  useEffect(() => {
    if (tabParam && validTabs.includes(tabParam)) {
      setActiveTab(tabParam);
      if (tabParam === 'audit') {
        loadAuditLogs(auditStatusFilter);
      }
      if (tabParam === 'accounts') {
        loadAllAccounts(accountStatusFilter);
      }
    }
  }, [tabParam]);

  // Account Management state
  const [resolvedAccount, setResolvedAccount] = useState<BankAccount | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // All Accounts list state
  const [accountList, setAccountList] = useState<BankAccount[]>([]);
  const [accountListLoading, setAccountListLoading] = useState(false);
  const [accountStatusFilter, setAccountStatusFilter] = useState('');
  const [accountSearchText, setAccountSearchText] = useState('');

  // Allocation (Cấp phát tài khoản) state
  const [allocateCustomerId, setAllocateCustomerId] = useState('');
  const [allocateType, setAllocateType] = useState<AccountType>('CURRENT');
  const [allocateCurrency, setAllocateCurrency] = useState('VND');
  const [allocating, setAllocating] = useState(false);
  const [newlyAllocatedAccount, setNewlyAllocatedAccount] = useState<BankAccount | null>(null);

  // Control & Reversal (Hoàn tác giao dịch) state
  const [reverseTxId, setReverseTxId] = useState('');
  const [reverseReason, setReverseReason] = useState('');
  const [reversing, setReversing] = useState(false);

  // Audit Logs & Errors state
  const [auditLogs, setAuditLogs] = useState<AuditLogRecord[]>([]);
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditStatusFilter, setAuditStatusFilter] = useState<string>('');

  // Reconciliation state
  const [reconcileQuery, setReconcileQuery] = useState('ACC-DEMO-001');
  const [reconcileReport, setReconcileReport] = useState<ReconciliationReport | null>(null);
  const [reconcileLoading, setReconcileLoading] = useState(false);

  // Customers state
  const [customerList, setCustomerList] = useState<Customer[]>([]);

  // Vault balances state
  const [vaultBalances, setVaultBalances] = useState<Record<string, BankAccount>>({});

  // Alert Modal state
  const [alertModal, setAlertModal] = useState<{
    isOpen: boolean;
    title?: string;
    message: string;
    type?: 'error' | 'warning' | 'info' | 'success';
  }>({
    isOpen: false,
    title: '',
    message: '',
    type: 'error',
  });

  // Freeze / Unfreeze
  const handleToggleFreeze = async (freeze: boolean, targetAccount?: BankAccount) => {
    const acc = targetAccount || resolvedAccount;
    if (!acc) return;
    setActionLoading(true);
    try {
      if (freeze) {
        await accountApi.freeze(acc.id);
        setAlertModal({
          isOpen: true,
          title: t('common.successTitle'),
          message: t('admin.accountFrozenSuccess'),
          type: 'success',
        });
      } else {
        await accountApi.unfreeze(acc.id);
        setAlertModal({
          isOpen: true,
          title: t('common.successTitle'),
          message: t('admin.accountUnfrozenSuccess'),
          type: 'success',
        });
      }
      const refreshed = await accountApi.getById(acc.id);
      setResolvedAccount(refreshed.data.data);
      await loadAllAccounts(accountStatusFilter);
    } catch (err) {
      setAlertModal({
        isOpen: true,
        title: t('common.errorTitle'),
        message: extractErrorMessage(err),
        type: 'error',
      });
    } finally {
      setActionLoading(false);
    }
  };

  // Close account permanently
  const handleCloseAccount = async (targetAccount?: BankAccount) => {
    const acc = targetAccount || resolvedAccount;
    if (!acc) return;
    setActionLoading(true);
    try {
      await accountApi.close(acc.id);
      setAlertModal({
        isOpen: true,
        title: t('common.successTitle'),
        message: `Đã đóng tài khoản ${acc.accountNumber} thành công!`,
        type: 'success',
      });
      const refreshed = await accountApi.getById(acc.id);
      setResolvedAccount(refreshed.data.data);
      await loadAllAccounts(accountStatusFilter);
    } catch (err) {
      setAlertModal({
        isOpen: true,
        title: t('common.errorTitle'),
        message: extractErrorMessage(err),
        type: 'error',
      });
    } finally {
      setActionLoading(false);
    }
  };

  // Load All Accounts with status filter
  const loadAllAccounts = async (status = '') => {
    setAccountListLoading(true);
    try {
      const res = await accountApi.getAll(0, 100, status);
      setAccountList(res.data.data.content);
    } catch {
      setAccountList([]);
    } finally {
      setAccountListLoading(false);
    }
  };

  // Cấp phát tài khoản mới (Account Allocation)
  const handleAllocateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!allocateCustomerId) {
      setAlertModal({
        isOpen: true,
        title: t('common.warningTitle'),
        message: 'Vui lòng chọn khách hàng cần cấp phát tài khoản.',
        type: 'warning',
      });
      return;
    }
    setAllocating(true);
    setNewlyAllocatedAccount(null);
    try {
      const res = await accountApi.open(allocateCustomerId, allocateType, allocateCurrency);
      setNewlyAllocatedAccount(res.data.data);
      setAlertModal({
        isOpen: true,
        title: t('common.successTitle'),
        message: t('admin.allocateSuccess', { acc: res.data.data.accountNumber }),
        type: 'success',
      });
    } catch (err) {
      setAlertModal({
        isOpen: true,
        title: t('common.errorTitle'),
        message: extractErrorMessage(err),
        type: 'error',
      });
    } finally {
      setAllocating(false);
    }
  };

  // Hoàn tác giao dịch kiểm soát (Transaction Reversal)
  const handleReverseTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    const txId = reverseTxId.trim();
    if (!txId) {
      setAlertModal({
        isOpen: true,
        title: t('common.warningTitle'),
        message: 'Vui lòng nhập Transaction ID cần hoàn tác.',
        type: 'warning',
      });
      return;
    }
    setReversing(true);
    try {
      await transactionApi.reverse(txId, reverseReason.trim() || 'Admin manual reversal');
      setAlertModal({
        isOpen: true,
        title: t('common.successTitle'),
        message: t('admin.reverseSuccess'),
        type: 'success',
      });
      setReverseTxId('');
      setReverseReason('');
      await loadAuditLogs(auditStatusFilter);
    } catch (err) {
      setAlertModal({
        isOpen: true,
        title: t('common.errorTitle'),
        message: extractErrorMessage(err),
        type: 'error',
      });
    } finally {
      setReversing(false);
    }
  };

  // Load Audit Logs & Errors
  const loadAuditLogs = async (statusFilter = '') => {
    setAuditLoading(true);
    try {
      const res = await auditApi.getAllLogs(0, 50, statusFilter);
      setAuditLogs(res.data.data.content);
    } catch {
      setAuditLogs([]);
    } finally {
      setAuditLoading(false);
    }
  };

  // Reconcile
  const handleReconcile = async (accIdOrNum: string) => {
    const trimmed = accIdOrNum.trim();
    if (!trimmed) return;
    setReconcileLoading(true);
    try {
      let targetId = trimmed;
      if (!trimmed.includes('-') || trimmed.startsWith('ACC-') || trimmed.startsWith('SYS-')) {
        const accRes = await accountApi.lookupByNumber(trimmed);
        targetId = accRes.data.data.id;
      }
      const res = await reconciliationApi.reconcileAccount(targetId);
      setReconcileReport(res.data.data);
    } catch (err) {
      setAlertModal({
        isOpen: true,
        title: t('common.errorTitle'),
        message: extractErrorMessage(err),
        type: 'error',
      });
    } finally {
      setReconcileLoading(false);
    }
  };

  // Load Customers
  const handleSearchCustomers = async (kw = '') => {
    try {
      const res = await customerApi.search(kw, 0, 50);
      setCustomerList(res.data.data.content);
      if (res.data.data.content.length > 0 && !allocateCustomerId) {
        setAllocateCustomerId(res.data.data.content[0].id);
      }
    } catch {
      setCustomerList([]);
    }
  };

  // Load Vaults
  const loadVaults = async () => {
    const results: Record<string, BankAccount> = {};
    for (const v of SYSTEM_VAULTS) {
      try {
        const res = await accountApi.lookupByNumber(v.acc);
        results[v.acc] = res.data.data;
      } catch { /* noop */ }
    }
    setVaultBalances(results);
  };

  useEffect(() => {
    handleSearchCustomers('');
    loadVaults();
    loadAuditLogs('');
    loadAllAccounts('');
  }, []);

  return (
    <div className="space-y-6">
      {/* ─── Hero Header ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold shadow-2xs">
              <ShieldAlert className="h-3.5 w-3.5 text-rose-600" />
              {t('admin.badge')}
            </span>
            <span className="text-xs text-slate-400 font-mono">SPRING-BOOT-3.3 · JAVA-21</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 leading-tight">
            {t('admin.title')}
          </h1>
          <p className="text-xs text-slate-500 mt-0.5 max-w-xl">
            {t('admin.sub')} · Đang kiểm soát bởi: <span className="font-bold text-sky-700">{user?.username}</span>
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <div className="px-3.5 py-2 rounded-2xl bg-white border border-sky-100 shadow-xs flex items-center gap-2 text-xs font-bold text-slate-700">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>Cluster Healthy (5/5 Services)</span>
          </div>
        </div>
      </div>

      {/* ─── TAB 1: OVERVIEW & SYSTEM HEALTH ─── */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Ecosystem Services Health Grid */}
          <div>
            <h2 className="text-sm font-extrabold text-slate-900 mb-3">{t('admin.systemHealth')}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {[
                {
                  title: t('admin.coreEngine'),
                  sub: t('admin.coreEngineDesc'),
                  status: 'UP · 8080',
                  icon: Server,
                  color: 'from-sky-500 to-blue-600',
                  badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
                },
                {
                  title: t('admin.apiGateway'),
                  sub: t('admin.apiGatewayDesc'),
                  status: 'UP · 8081',
                  icon: ShieldCheck,
                  color: 'from-blue-600 to-indigo-600',
                  badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
                },
                {
                  title: t('admin.kafkaStream'),
                  sub: t('admin.kafkaStreamDesc'),
                  status: 'UP · 9092',
                  icon: Radio,
                  color: 'from-indigo-500 to-purple-600',
                  badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
                },
                {
                  title: t('admin.redisCache'),
                  sub: t('admin.redisCacheDesc'),
                  status: 'UP · 6379',
                  icon: Zap,
                  color: 'from-rose-500 to-pink-600',
                  badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
                },
                {
                  title: t('admin.postgresDb'),
                  sub: t('admin.postgresDbDesc'),
                  status: 'UP · 5433',
                  icon: Database,
                  color: 'from-teal-500 to-emerald-600',
                  badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
                },
              ].map(({ title, sub, status, icon: Icon, color, badge }) => (
                <div key={title} className="p-4 rounded-3xl bg-white border border-sky-100 shadow-xs flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className={`h-11 w-11 rounded-2xl bg-gradient-to-br ${color} text-white flex items-center justify-center shrink-0 shadow-md`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-900">{title}</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">{sub}</div>
                    </div>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-1 rounded-xl border ${badge}`}>
                    {status}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="rounded-3xl bg-white border border-sky-100 p-5 shadow-xs">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">{t('admin.totalAccounts')}</span>
              <div className="text-2xl font-black text-slate-900 mt-2 font-mono">1,240</div>
              <div className="text-[10px] text-emerald-600 font-bold mt-1">✓ 100% Khớp số dư sổ cái kép</div>
            </div>
            <div className="rounded-3xl bg-white border border-sky-100 p-5 shadow-xs">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">{t('admin.totalBalance')}</span>
              <div className="text-2xl font-black text-sky-600 mt-2 tabular-nums">12,500,000,000 VNĐ</div>
              <div className="text-[10px] text-slate-500 mt-1">+ $50,000.00 USD ngoại tệ</div>
            </div>
            <div className="rounded-3xl bg-white border border-sky-100 p-5 shadow-xs">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">{t('admin.activeUsers')}</span>
              <div className="text-2xl font-black text-slate-900 mt-2 font-mono">3 / 3 Seeded</div>
              <div className="text-[10px] text-slate-500 mt-1">ADMIN, STAFF, CUSTOMER</div>
            </div>
          </div>
        </div>
      )}

      {/* ─── TAB 2: CẤP PHÁT TÀI KHOẢN (ACCOUNT ALLOCATION) ─── */}
      {activeTab === 'allocate' && (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <div className="lg:col-span-3 bg-white border border-sky-100 rounded-3xl p-6 space-y-5 shadow-xs">
            <div className="flex items-center gap-3 border-b border-sky-50 pb-3">
              <div className="h-10 w-10 rounded-2xl bg-sky-50 text-sky-600 border border-sky-200 flex items-center justify-center">
                <PlusCircle className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-sm font-extrabold text-slate-900">{t('admin.allocateTitle')}</h2>
                <p className="text-[11px] text-slate-400 font-medium">{t('admin.allocateSub')}</p>
              </div>
            </div>

            <form onSubmit={handleAllocateAccount} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">{t('admin.selectCustomer')}</label>
                <select
                  value={allocateCustomerId}
                  onChange={(e) => setAllocateCustomerId(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500 cursor-pointer"
                >
                  {customerList.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.fullName} — CIF: {c.customerNumber} ({c.identityNumber})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">{t('admin.accountType')}</label>
                  <select
                    value={allocateType}
                    onChange={(e) => setAllocateType(e.target.value as AccountType)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500 cursor-pointer"
                  >
                    <option value="CURRENT">CURRENT — Tài khoản thanh toán Napas</option>
                    <option value="SAVINGS">SAVINGS — Tài khoản tiết kiệm định kỳ</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">{t('common.currency')}</label>
                  <select
                    value={allocateCurrency}
                    onChange={(e) => setAllocateCurrency(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500 cursor-pointer"
                  >
                    <option value="VND">VND — Đồng Việt Nam</option>
                    <option value="USD">USD — US Dollar</option>
                  </select>
                </div>
              </div>

              <button
                type="submit"
                disabled={allocating || !allocateCustomerId}
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 disabled:opacity-50 text-white text-sm font-bold flex items-center justify-center gap-2 cursor-pointer transition-all shadow-md shadow-sky-500/20"
              >
                <PlusCircle className="h-4 w-4" />
                <span>{allocating ? t('admin.allocating') : t('admin.allocateBtn')}</span>
              </button>
            </form>

            {newlyAllocatedAccount && (
              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 space-y-2 animate-in fade-in">
                <div className="flex items-center gap-2 text-xs font-bold text-emerald-800">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  <span>Cấp phát tài khoản thành công!</span>
                </div>
                <div className="text-sm font-mono font-black text-slate-900">
                  Số tài khoản: {newlyAllocatedAccount.accountNumber}
                </div>
                <div className="text-[11px] text-emerald-700 font-medium">
                  Loại: {newlyAllocatedAccount.accountType} · Tiền tệ: {newlyAllocatedAccount.currency} · Trạng thái: {newlyAllocatedAccount.status}
                </div>
              </div>
            )}
          </div>

          <div className="lg:col-span-2 bg-sky-50/60 border border-sky-100 rounded-3xl p-6 space-y-3.5 shadow-xs">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Quy định Cấp phát Tài khoản</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Theo quy chuẩn Ngân hàng Nhà nước và PCI-DSS:
            </p>
            <ul className="text-xs text-slate-600 space-y-2 list-disc pl-4">
              <li>Mỗi khách hàng phải hoàn tất định danh KYC trước khi được cấp phát tài khoản thanh toán.</li>
              <li>Số tài khoản được sinh tự động theo chuẩn Napas247 đảm bảo tính duy nhất toàn quốc.</li>
              <li>Tài khoản cấp phát ban đầu có trạng thái <strong>ACTIVE</strong> và số dư 0.00.</li>
            </ul>
          </div>
        </div>
      )}

      {/* ─── TAB 3: ACCOUNTS MANAGEMENT (ALL ACCOUNTS LIST & CONTROL) ─── */}
      {activeTab === 'accounts' && (
        <div className="space-y-5">
          {/* Header & Controls Bar */}
          <div className="bg-white border border-sky-100 rounded-3xl p-5 sm:p-6 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-base sm:text-lg font-black text-slate-900 leading-tight">
                  Quản Lý & Kiểm Soát Danh Sách Tài Khoản Toàn Hệ Thống
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Theo dõi danh sách toàn bộ tài khoản khách hàng và tài khoản kho quỹ GL, hỗ trợ phong tỏa, mở khóa và tất toán.
                </p>
              </div>

              <button
                type="button"
                onClick={() => loadAllAccounts(accountStatusFilter)}
                disabled={accountListLoading}
                className="self-start sm:self-auto flex items-center gap-2 px-3.5 py-2 rounded-xl bg-sky-50 hover:bg-sky-100 border border-sky-200 text-sky-800 text-xs font-bold transition-colors cursor-pointer shadow-2xs"
              >
                <RotateCw className={`h-4 w-4 ${accountListLoading ? 'animate-spin text-sky-600' : ''}`} />
                <span>Làm mới danh sách</span>
              </button>
            </div>

            {/* Filter and Search Bar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2 border-t border-slate-100">
              <div className="relative flex-1">
                <input
                  type="text"
                  value={accountSearchText}
                  onChange={(e) => setAccountSearchText(e.target.value)}
                  placeholder="Tìm theo số tài khoản, mã CIF, ID tài khoản..."
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-mono text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
                <Search className="h-4 w-4 text-slate-400 absolute left-3 top-3" />
                {accountSearchText && (
                  <button
                    type="button"
                    onClick={() => setAccountSearchText('')}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 text-xs cursor-pointer"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              {/* Status Filter Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
                {[
                  { id: '', label: 'Tất cả' },
                  { id: 'ACTIVE', label: 'Đang hoạt động' },
                  { id: 'FROZEN', label: 'Bị phong tỏa' },
                  { id: 'CLOSED', label: 'Đã đóng' },
                ].map(({ id, label }) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => {
                      setAccountStatusFilter(id);
                      loadAllAccounts(id);
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                      accountStatusFilter === id
                        ? 'bg-rose-600 text-white shadow-2xs'
                        : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200/80'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Selected Account Inspection & Action Card */}
          {resolvedAccount && (
            <div className="p-5 rounded-3xl bg-white border-2 border-rose-200 shadow-md space-y-4 animate-in fade-in">
              <div className="flex items-center justify-between border-b border-rose-100 pb-3">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-2xl bg-gradient-to-tr from-rose-500 to-indigo-600 text-white flex items-center justify-center font-bold text-sm shadow-xs">
                    <UserCheck className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm sm:text-base font-black text-slate-900 font-mono">
                        {resolvedAccount.accountNumber}
                      </span>
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-700 uppercase">
                        {resolvedAccount.accountType}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                      UUID: {resolvedAccount.id} · Tiền tệ: {resolvedAccount.currency}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <div className="text-lg sm:text-xl font-black text-slate-900 tabular-nums">
                      {formatCurrency(Number(resolvedAccount.balance), resolvedAccount.currency)}
                    </div>
                    <span
                      className={`inline-block mt-0.5 text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                        resolvedAccount.status === 'ACTIVE'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : resolvedAccount.status === 'FROZEN'
                          ? 'bg-amber-50 text-amber-700 border-amber-200'
                          : 'bg-rose-50 text-rose-700 border-rose-200'
                      }`}
                    >
                      {resolvedAccount.status}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => setResolvedAccount(null)}
                    className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600 cursor-pointer transition-colors"
                    title="Đóng panel chi tiết"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>

              {/* Action Buttons: Freeze / Unfreeze / Close */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                <div className="flex flex-wrap items-center gap-2.5">
                  {resolvedAccount.status === 'ACTIVE' && (
                    <button
                      type="button"
                      disabled={actionLoading}
                      onClick={() => handleToggleFreeze(true)}
                      className="py-2.5 px-4 rounded-xl bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-800 text-xs font-bold flex items-center gap-2 cursor-pointer transition-colors shadow-2xs"
                    >
                      <Lock className="h-4 w-4" />
                      <span>Phong tỏa tài khoản (Freeze)</span>
                    </button>
                  )}

                  {resolvedAccount.status === 'FROZEN' && (
                    <button
                      type="button"
                      disabled={actionLoading}
                      onClick={() => handleToggleFreeze(false)}
                      className="py-2.5 px-4 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2 cursor-pointer transition-colors shadow-2xs"
                    >
                      <Unlock className="h-4 w-4" />
                      <span>Mở khóa tài khoản (Unfreeze)</span>
                    </button>
                  )}

                  {resolvedAccount.status !== 'CLOSED' && Number(resolvedAccount.balance) === 0 && (
                    <button
                      type="button"
                      disabled={actionLoading}
                      onClick={() => handleCloseAccount()}
                      className="py-2.5 px-4 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 text-xs font-bold flex items-center gap-2 cursor-pointer transition-colors shadow-2xs"
                    >
                      <X className="h-4 w-4" />
                      <span>Đóng tài khoản vĩnh viễn (Close)</span>
                    </button>
                  )}
                </div>

                <div className="text-[11px] text-slate-400">
                  {resolvedAccount.status === 'ACTIVE'
                    ? 'Tài khoản đang sẵn sàng nhận và gửi tiền.'
                    : resolvedAccount.status === 'FROZEN'
                    ? 'Tài khoản đang bị đóng băng tạm thời, không thể giao dịch.'
                    : 'Tài khoản đã đóng tất toán vĩnh viễn.'}
                </div>
              </div>
            </div>
          )}

          {/* Full Table of Accounts */}
          <div className="bg-white border border-sky-100 rounded-3xl overflow-hidden shadow-xs">
            <div className="px-5 py-3.5 border-b border-sky-50 flex items-center justify-between bg-sky-50/40">
              <div className="text-xs font-bold text-slate-700">
                Danh sách tài khoản ({accountList.filter((acc) => {
                  if (accountSearchText.trim()) {
                    const q = accountSearchText.toLowerCase();
                    const matchesNum = acc.accountNumber.toLowerCase().includes(q);
                    const matchesId = acc.id.toLowerCase().includes(q);
                    const matchesCust = acc.customerId ? acc.customerId.toLowerCase().includes(q) : false;
                    return matchesNum || matchesId || matchesCust;
                  }
                  return true;
                }).length} / {accountList.length} tài khoản)
              </div>
              <div className="text-[11px] text-slate-400 font-mono">
                CORE-BANKING · ACCOUNTS-LEDGER
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-sky-100 bg-slate-50/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="py-3 px-4">Số tài khoản</th>
                    <th className="py-3 px-4">Loại SP</th>
                    <th className="py-3 px-4">Chủ sở hữu / Khách hàng</th>
                    <th className="py-3 px-4 text-right">Số dư khả dụng</th>
                    <th className="py-3 px-4 text-center">Trạng thái</th>
                    <th className="py-3 px-4">Ngày mở</th>
                    <th className="py-3 px-4 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-sans">
                  {accountListLoading ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-400">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <RotateCw className="h-6 w-6 animate-spin text-rose-500" />
                          <span className="text-xs font-medium">Đang tải danh sách tài khoản từ hệ thống...</span>
                        </div>
                      </td>
                    </tr>
                  ) : accountList
                      .filter((acc) => {
                        if (accountSearchText.trim()) {
                          const q = accountSearchText.toLowerCase();
                          const matchesNum = acc.accountNumber.toLowerCase().includes(q);
                          const matchesId = acc.id.toLowerCase().includes(q);
                          const matchesCust = acc.customerId ? acc.customerId.toLowerCase().includes(q) : false;
                          return matchesNum || matchesId || matchesCust;
                        }
                        return true;
                      })
                      .length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-10 text-center text-slate-400 text-xs">
                        Không tìm thấy tài khoản nào phù hợp với điều kiện tìm kiếm.
                      </td>
                    </tr>
                  ) : (
                    accountList
                      .filter((acc) => {
                        if (accountSearchText.trim()) {
                          const q = accountSearchText.toLowerCase();
                          const matchesNum = acc.accountNumber.toLowerCase().includes(q);
                          const matchesId = acc.id.toLowerCase().includes(q);
                          const matchesCust = acc.customerId ? acc.customerId.toLowerCase().includes(q) : false;
                          return matchesNum || matchesId || matchesCust;
                        }
                        return true;
                      })
                      .map((acc) => {
                        const isSelected = resolvedAccount?.id === acc.id;
                        return (
                          <tr
                            key={acc.id}
                            className={`hover:bg-sky-50/50 transition-colors ${
                              isSelected ? 'bg-rose-50/40 font-semibold' : ''
                            }`}
                          >
                            <td className="py-3 px-4 font-mono font-bold text-slate-900">
                              <button
                                type="button"
                                onClick={() => setResolvedAccount(acc)}
                                className="hover:text-rose-600 transition-colors cursor-pointer text-left font-mono"
                              >
                                {acc.accountNumber}
                              </button>
                            </td>
                            <td className="py-3 px-4">
                              <span
                                className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${
                                  acc.accountType === 'SYSTEM'
                                    ? 'bg-purple-50 text-purple-700 border border-purple-200'
                                    : acc.accountType === 'SAVINGS'
                                    ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                    : 'bg-slate-100 text-slate-700'
                                }`}
                              >
                                {acc.accountType}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-slate-600 font-mono text-[11px]">
                              {acc.customerId ? (
                                <span title={acc.customerId}>
                                  {customerList.find((c) => c.id === acc.customerId)?.fullName ||
                                    acc.customerId.substring(0, 13) + '...'}
                                </span>
                              ) : (
                                <span className="text-purple-600 font-bold">Kho quỹ Hệ thống GL</span>
                              )}
                            </td>
                            <td className="py-3 px-4 text-right font-black text-slate-900 font-mono tabular-nums">
                              {formatCurrency(Number(acc.balance), acc.currency)}
                            </td>
                            <td className="py-3 px-4 text-center">
                              <span
                                className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                                  acc.status === 'ACTIVE'
                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                    : acc.status === 'FROZEN'
                                    ? 'bg-amber-50 text-amber-700 border-amber-200'
                                    : 'bg-rose-50 text-rose-700 border-rose-200'
                                }`}
                              >
                                {acc.status}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-slate-500 text-[11px] whitespace-nowrap">
                              {formatDateTime(acc.createdAt)}
                            </td>
                            <td className="py-3 px-4 text-right whitespace-nowrap">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => setResolvedAccount(acc)}
                                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold cursor-pointer transition-colors ${
                                    isSelected
                                      ? 'bg-rose-600 text-white shadow-2xs'
                                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                                  }`}
                                >
                                  {isSelected ? 'Đang chọn' : 'Quản lý'}
                                </button>

                                {acc.status === 'ACTIVE' && (
                                  <button
                                    type="button"
                                    disabled={actionLoading}
                                    onClick={() => handleToggleFreeze(true, acc)}
                                    className="p-1 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 cursor-pointer transition-colors"
                                    title="Khóa tài khoản"
                                  >
                                    <Lock className="h-3.5 w-3.5" />
                                  </button>
                                )}

                                {acc.status === 'FROZEN' && (
                                  <button
                                    type="button"
                                    disabled={actionLoading}
                                    onClick={() => handleToggleFreeze(false, acc)}
                                    className="p-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 cursor-pointer transition-colors"
                                    title="Mở khóa tài khoản"
                                  >
                                    <Unlock className="h-3.5 w-3.5" />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ─── TAB 4: KIỂM SOÁT & HOÀN TÁC GIAO DỊCH (REVERSALS) ─── */}
      {activeTab === 'reversal' && (
        <div className="max-w-2xl bg-white border border-sky-100 rounded-3xl p-6 space-y-5 shadow-xs">
          <div className="flex items-center gap-3 border-b border-sky-50 pb-3">
            <div className="h-10 w-10 rounded-2xl bg-rose-50 text-rose-600 border border-rose-200 flex items-center justify-center">
              <RotateCcw className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-sm font-extrabold text-slate-900">{t('admin.reversalTitle')}</h2>
              <p className="text-[11px] text-slate-400 font-medium">{t('admin.reversalSub')}</p>
            </div>
          </div>

          <form onSubmit={handleReverseTransaction} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Mã Giao Dịch Cần Huỷ (Transaction ID)</label>
              <input
                type="text"
                required
                value={reverseTxId}
                onChange={(e) => setReverseTxId(e.target.value)}
                placeholder={t('admin.txIdPlaceholder')}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm font-mono text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-rose-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">{t('admin.reversalReason')}</label>
              <input
                type="text"
                required
                value={reverseReason}
                onChange={(e) => setReverseReason(e.target.value)}
                placeholder={t('admin.reversalReasonPlaceholder')}
                className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500"
              />
            </div>

            <button
              type="submit"
              disabled={reversing}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-400 hover:to-pink-500 disabled:opacity-50 text-white text-sm font-bold flex items-center justify-center gap-2 cursor-pointer transition-all shadow-md shadow-rose-500/20"
            >
              <RotateCcw className="h-4 w-4" />
              <span>{reversing ? t('admin.reversing') : t('admin.reverseBtn')}</span>
            </button>
          </form>
        </div>
      )}

      {/* ─── TAB 5: XEM LOG & LỖI HỆ THỐNG (AUDIT LOGS & ERRORS) ─── */}
      {activeTab === 'audit' && (
        <div className="bg-white border border-sky-100 rounded-3xl p-5 sm:p-6 space-y-5 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-extrabold text-slate-900">{t('admin.tabAudit')}</h2>
              <p className="text-[10px] text-slate-400 font-medium">
                Ghi nhận các hoạt động truy cập, giao dịch và cảnh báo lỗi bất thường
              </p>
            </div>

            {/* Filter Buttons */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => { setAuditStatusFilter(''); loadAuditLogs(''); }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer border ${
                  auditStatusFilter === '' ? 'bg-slate-900 text-white' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                }`}
              >
                {t('admin.filterAll')}
              </button>
              <button
                type="button"
                onClick={() => { setAuditStatusFilter('FAILED'); loadAuditLogs('FAILED'); }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer border ${
                  auditStatusFilter === 'FAILED' ? 'bg-rose-600 text-white border-rose-600' : 'bg-rose-50 text-rose-700 border-rose-200'
                }`}
              >
                {t('admin.filterFailed')}
              </button>
              <button
                type="button"
                onClick={() => { setAuditStatusFilter('SUCCESS'); loadAuditLogs('SUCCESS'); }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer border ${
                  auditStatusFilter === 'SUCCESS' ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                }`}
              >
                {t('admin.filterSuccess')}
              </button>
            </div>
          </div>

          {/* Audit Logs Table */}
          <div className="border border-slate-100 rounded-2xl overflow-hidden">
            <div className="overflow-x-auto max-h-[500px]">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-100 sticky top-0">
                  <tr>
                    <th className="p-3 font-semibold">{t('admin.timeCol')}</th>
                    <th className="p-3 font-semibold">{t('admin.actorCol')}</th>
                    <th className="p-3 font-semibold">{t('admin.actionCol')}</th>
                    <th className="p-3 font-semibold">{t('admin.resourceCol')}</th>
                    <th className="p-3 font-semibold">{t('admin.statusCol')}</th>
                    <th className="p-3 font-semibold">{t('admin.detailsCol')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono">
                  {auditLoading ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-slate-400">Đang tải nhật ký kiểm toán...</td>
                    </tr>
                  ) : auditLogs.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-slate-400">Không có nhật ký nào phù hợp bộ lọc.</td>
                    </tr>
                  ) : (
                    auditLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="p-3 text-[11px] text-slate-500 whitespace-nowrap">
                          {formatDateTime(log.createdAt)}
                        </td>
                        <td className="p-3 whitespace-nowrap">
                          <span className="font-bold text-slate-800">{log.actorRole}</span>
                          <span className="text-[10px] text-slate-400 block truncate max-w-[120px]">{log.actorId}</span>
                        </td>
                        <td className="p-3 whitespace-nowrap font-bold text-sky-800">
                          {log.action}
                        </td>
                        <td className="p-3 whitespace-nowrap text-slate-600 text-[11px]">
                          {log.resourceType}: <span className="font-bold">{log.resourceId}</span>
                        </td>
                        <td className="p-3 whitespace-nowrap">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                            log.status === 'SUCCESS'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-rose-50 text-rose-700 border-rose-200'
                          }`}>
                            {log.status}
                          </span>
                        </td>
                        <td className="p-3 text-[10px] text-slate-500 font-sans max-w-xs truncate">
                          {log.metadata || log.ipAddress || '—'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ─── TAB 6: RECONCILIATION (DOUBLE-ENTRY AUDIT) ─── */}
      {activeTab === 'reconcile' && (
        <div className="bg-white border border-sky-100 rounded-3xl p-5 sm:p-6 space-y-5 shadow-xs">
          <div>
            <h2 className="text-sm font-extrabold text-slate-900 mb-1">{t('teller.reconcileTitle')}</h2>
            <p className="text-[11px] text-slate-500">{t('teller.reconcileDesc')}</p>
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              value={reconcileQuery}
              onChange={(e) => setReconcileQuery(e.target.value)}
              placeholder="ACC-DEMO-001"
              className="flex-1 px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm font-mono text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
            <button
              type="button"
              disabled={reconcileLoading}
              onClick={() => handleReconcile(reconcileQuery)}
              className="py-2.5 px-4 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500 text-white text-xs font-bold flex items-center gap-2 shadow-md shadow-indigo-500/20 cursor-pointer"
            >
              <Scale className="h-4 w-4" />
              <span>{reconcileLoading ? 'Đang đối soát...' : t('teller.reconcileBtn')}</span>
            </button>
          </div>

          {reconcileReport && (
            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
              <div className="text-xs font-bold text-slate-900 mb-2">{t('teller.reconcileResult')}</div>
              {[
                { label: t('teller.lookupLabel'), value: reconcileReport.accountNumber, mono: true },
                { label: t('teller.accountBalance'), value: formatCurrency(reconcileReport.accountBalance, reconcileReport.currency) },
                { label: t('teller.ledgerBalance'), value: formatCurrency(reconcileReport.ledgerBalance, reconcileReport.currency) },
              ].map(({ label, value, mono }) => (
                <div key={label} className="flex justify-between gap-2 text-xs">
                  <span className="text-slate-500">{label}</span>
                  <span className={`font-bold text-slate-800 ${mono ? 'font-mono' : 'tabular-nums'}`}>{value}</span>
                </div>
              ))}
              <div className="pt-2 border-t border-slate-200 flex justify-between gap-2 text-xs">
                <span className="text-slate-500">{t('teller.discrepancy')}</span>
                <span className={`font-mono font-bold ${reconcileReport.discrepancy === 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {reconcileReport.discrepancy === 0 ? t('teller.discrepancyZero') : String(reconcileReport.discrepancy)}
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─── TAB 7: SYSTEM VAULTS ─── */}
      {activeTab === 'vaults' && (
        <div className="bg-white border border-sky-100 rounded-3xl p-5 sm:p-6 space-y-4 shadow-xs">
          <div>
            <h2 className="text-sm font-extrabold text-slate-900">{t('admin.glVaultsTitle')}</h2>
            <p className="text-[11px] text-slate-500">Các tài khoản hệ thống chịu trách nhiệm cân đối dòng tiền và thu chi ngân hàng</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {SYSTEM_VAULTS.map((vault) => {
              const liveAcc = vaultBalances[vault.acc];
              return (
                <div key={vault.acc} className="p-4 rounded-2xl bg-sky-50/40 border border-sky-100 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-bold text-sky-800">{vault.acc}</span>
                    <span className="text-xs font-bold text-slate-900">
                      {liveAcc ? formatCurrency(Number(liveAcc.balance), liveAcc.currency) : `0.00 ${vault.currency}`}
                    </span>
                  </div>
                  <div className="text-xs font-bold text-slate-800">{vault.name}</div>
                  <div className="text-[11px] text-slate-500">{vault.desc}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Alert Modal */}
      <AlertModal
        isOpen={alertModal.isOpen}
        onClose={() => setAlertModal((prev) => ({ ...prev, isOpen: false }))}
        title={alertModal.title}
        message={alertModal.message}
        type={alertModal.type}
      />
    </div>
  );
};
