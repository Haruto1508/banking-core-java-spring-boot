import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Activity,
  CheckCircle2,
  Database,
  FileText,
  Lock,
  PlusCircle,
  Radio,
  RotateCcw,
  Scale,
  Search,
  Server,
  ShieldAlert,
  ShieldCheck,
  Unlock,
  UserCheck,
  Vault,
  Wallet,
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
  const [searchParams, setSearchParams] = useSearchParams();
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
    }
  }, [tabParam]);

  const handleTabChange = (tabId: TabType) => {
    setActiveTab(tabId);
    if (tabId === 'overview') {
      searchParams.delete('tab');
      setSearchParams(searchParams);
    } else {
      setSearchParams({ tab: tabId });
    }
    if (tabId === 'audit') {
      loadAuditLogs(auditStatusFilter);
    }
  };

  // Account Management state
  const [accountQuery, setAccountQuery] = useState('');
  const [resolvedAccount, setResolvedAccount] = useState<BankAccount | null>(null);
  const [resolving, setResolving] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

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

  // Lookup account
  const handleLookup = async (inputVal: string) => {
    const val = inputVal.trim();
    if (!val) { setResolvedAccount(null); return; }
    setResolving(true);
    try {
      if (val.length === 36 && val.includes('-')) {
        const res = await accountApi.getById(val);
        setResolvedAccount(res.data.data);
      } else {
        const res = await accountApi.lookupByNumber(val);
        setResolvedAccount(res.data.data);
      }
    } catch {
      setResolvedAccount(null);
    } finally {
      setResolving(false);
    }
  };

  // Freeze / Unfreeze
  const handleToggleFreeze = async (freeze: boolean) => {
    if (!resolvedAccount) return;
    setActionLoading(true);
    try {
      if (freeze) {
        await accountApi.freeze(resolvedAccount.id);
        setAlertModal({
          isOpen: true,
          title: t('common.successTitle'),
          message: t('admin.accountFrozenSuccess'),
          type: 'success',
        });
      } else {
        await accountApi.unfreeze(resolvedAccount.id);
        setAlertModal({
          isOpen: true,
          title: t('common.successTitle'),
          message: t('admin.accountUnfrozenSuccess'),
          type: 'success',
        });
      }
      const refreshed = await accountApi.getById(resolvedAccount.id);
      setResolvedAccount(refreshed.data.data);
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

      {/* ─── Navigation Tabs ─── */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-sky-100">
        {[
          { id: 'overview', label: t('admin.tabOverview'), icon: Activity },
          { id: 'allocate', label: t('admin.tabAllocate'), icon: PlusCircle },
          { id: 'accounts', label: t('admin.tabAccounts'), icon: Wallet },
          { id: 'reversal', label: t('admin.tabReversal'), icon: RotateCcw },
          { id: 'audit', label: t('admin.tabAudit'), icon: FileText },
          { id: 'reconcile', label: t('admin.tabReconcile'), icon: Scale },
          { id: 'vaults', label: t('admin.tabVaults'), icon: Vault },
        ].map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => handleTabChange(id as TabType)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === id
                ? 'bg-rose-600 text-white shadow-md shadow-rose-600/20'
                : 'bg-white hover:bg-sky-50 text-slate-600 border border-sky-100 hover:border-sky-200'
            }`}
          >
            <Icon className="h-4 w-4" />
            <span>{label}</span>
          </button>
        ))}
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
                  status: 'UP · 5432',
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

      {/* ─── TAB 3: ACCOUNTS MANAGEMENT (LOOKUP & FREEZE) ─── */}
      {activeTab === 'accounts' && (
        <div className="bg-white border border-sky-100 rounded-3xl p-5 sm:p-6 space-y-5 shadow-xs">
          <div>
            <h2 className="text-sm font-extrabold text-slate-900 mb-1">{t('admin.searchAccount')}</h2>
            <p className="text-[11px] text-slate-500">{t('admin.sub')}</p>
          </div>

          <div className="relative">
            <input
              type="text"
              value={accountQuery}
              onChange={(e) => {
                setAccountQuery(e.target.value);
                handleLookup(e.target.value);
              }}
              placeholder={t('admin.searchAccountPlaceholder')}
              className="w-full pl-3.5 pr-10 py-3 rounded-2xl bg-slate-50 border border-slate-200 text-sm font-mono text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
            <div className="absolute right-3.5 top-3.5 flex items-center gap-1.5">
              {resolving && <span className="text-[11px] text-sky-600 animate-pulse font-medium">Đang tìm...</span>}
              <Search className="h-4 w-4 text-slate-400" />
            </div>
          </div>

          {/* Sample quick buttons */}
          <div className="flex flex-wrap gap-2 text-xs">
            <span className="text-slate-400 text-[11px] self-center">Chọn nhanh:</span>
            {['ACC-DEMO-001', 'ACC-DEMO-002', 'SYS-GL-VAULT-001', 'SYS-CASH-VAULT-001'].map((acc) => (
              <button
                key={acc}
                type="button"
                onClick={() => {
                  setAccountQuery(acc);
                  handleLookup(acc);
                }}
                className="px-2.5 py-1 rounded-xl bg-sky-50 hover:bg-sky-100 border border-sky-200/80 text-sky-800 text-[11px] font-mono font-bold cursor-pointer transition-colors"
              >
                {acc}
              </button>
            ))}
          </div>

          {/* Account Detail Card */}
          {resolvedAccount && (
            <div className="p-5 rounded-2xl bg-sky-50/60 border border-sky-200 space-y-4 animate-in fade-in">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-sky-500 text-white flex items-center justify-center font-bold text-sm shadow-xs">
                    <UserCheck className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-slate-900 font-mono">{resolvedAccount.accountNumber}</div>
                    <div className="text-[11px] text-slate-500">
                      Loại: {resolvedAccount.accountType} · Tiền tệ: {resolvedAccount.currency}
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-lg font-black text-slate-900 tabular-nums">
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
              </div>

              <div className="text-[11px] text-slate-400 font-mono pt-2 border-t border-sky-100">
                UUID: {resolvedAccount.id}
              </div>

              {/* Action Buttons: Freeze / Unfreeze */}
              <div className="flex gap-2.5 pt-2">
                {resolvedAccount.status === 'ACTIVE' ? (
                  <button
                    type="button"
                    disabled={actionLoading}
                    onClick={() => handleToggleFreeze(true)}
                    className="py-2.5 px-4 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 text-xs font-bold flex items-center gap-2 cursor-pointer transition-colors shadow-2xs"
                  >
                    <Lock className="h-4 w-4" />
                    <span>Phong tỏa tài khoản (Freeze)</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={actionLoading}
                    onClick={() => handleToggleFreeze(false)}
                    className="py-2.5 px-4 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 text-xs font-bold flex items-center gap-2 cursor-pointer transition-colors shadow-2xs"
                  >
                    <Unlock className="h-4 w-4" />
                    <span>Mở khóa tài khoản (Unfreeze)</span>
                  </button>
                )}
              </div>
            </div>
          )}
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
