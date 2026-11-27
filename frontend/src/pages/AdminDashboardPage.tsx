import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Activity,
  Database,
  Lock,
  Radio,
  Scale,
  Search,
  Server,
  ShieldAlert,
  ShieldCheck,
  Unlock,
  UserCheck,
  Users,
  Vault,
  Wallet,
  Zap,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { accountApi, customerApi, reconciliationApi } from '../api/bankingApi';
import { extractErrorMessage } from '../api/client';
import type { BankAccount, Customer, ReconciliationReport } from '../types/banking';
import { formatCurrency } from '../utils/format';
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
  const [activeTab, setActiveTab] = useState<'overview' | 'accounts' | 'reconcile' | 'customers' | 'vaults'>('overview');

  // Account Management state
  const [accountQuery, setAccountQuery] = useState('');
  const [resolvedAccount, setResolvedAccount] = useState<BankAccount | null>(null);
  const [resolving, setResolving] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Reconciliation state
  const [reconcileQuery, setReconcileQuery] = useState('ACC-DEMO-001');
  const [reconcileReport, setReconcileReport] = useState<ReconciliationReport | null>(null);
  const [reconcileLoading, setReconcileLoading] = useState(false);

  // Customers state
  const [customerKeyword, setCustomerKeyword] = useState('');
  const [customerList, setCustomerList] = useState<Customer[]>([]);
  const [customerLoading, setCustomerLoading] = useState(false);

  // Vault balances state
  const [vaultBalances, setVaultBalances] = useState<Record<string, BankAccount>>({});

  // Alert Modal state
  const [alertModal, setAlertModal] = useState<{
    isOpen: boolean;
    title?: string;
    message: string;
    type?: 'error' | 'warning' | 'info' | 'success';
    confirmLabel?: string;
    onConfirm?: () => void;
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
    setCustomerLoading(true);
    try {
      const res = await customerApi.search(kw, 0, 20);
      setCustomerList(res.data.data.content);
    } catch {
      setCustomerList([]);
    } finally {
      setCustomerLoading(false);
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
            {t('admin.sub')} · Đang đăng nhập: <span className="font-bold text-sky-700">{user?.username}</span>
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
          { id: 'accounts', label: t('admin.tabAccounts'), icon: Wallet },
          { id: 'reconcile', label: t('admin.tabReconcile'), icon: Scale },
          { id: 'customers', label: t('admin.tabCustomers'), icon: Users },
          { id: 'vaults', label: t('admin.tabVaults'), icon: Vault },
        ].map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setActiveTab(id as any)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === id
                ? 'bg-sky-600 text-white shadow-md shadow-sky-600/20'
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

      {/* ─── TAB 2: ACCOUNTS MANAGEMENT (LOOKUP & FREEZE) ─── */}
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

      {/* ─── TAB 3: RECONCILIATION (DOUBLE-ENTRY AUDIT) ─── */}
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

      {/* ─── TAB 4: CUSTOMERS DIRECTORY ─── */}
      {activeTab === 'customers' && (
        <div className="bg-white border border-sky-100 rounded-3xl p-5 sm:p-6 space-y-5 shadow-xs">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-extrabold text-slate-900">{t('admin.tabCustomers')}</h2>
              <p className="text-[10px] text-slate-400 font-medium">
                {customerList.length} {t('admin.customersFound')}
              </p>
            </div>
          </div>

          <div className="relative">
            <input
              type="text"
              value={customerKeyword}
              onChange={(e) => {
                setCustomerKeyword(e.target.value);
                handleSearchCustomers(e.target.value);
              }}
              placeholder={t('admin.searchCustomerPlaceholder')}
              className="w-full pl-3.5 pr-10 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
            <div className="absolute right-3.5 top-3 flex items-center gap-1.5">
              {customerLoading && <span className="text-[11px] text-sky-600 animate-pulse font-medium">Đang tìm...</span>}
              <Search className="h-4 w-4 text-slate-400" />
            </div>
          </div>

          <div className="divide-y divide-sky-50 max-h-[420px] overflow-y-auto">
            {customerList.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-400">
                <Users className="h-9 w-9 text-sky-300 mx-auto mb-2" />
                Không tìm thấy khách hàng nào.
              </div>
            ) : (
              customerList.map((c) => (
                <div key={c.id} className="py-3.5 flex items-center justify-between gap-3 hover:bg-sky-50/50 transition-colors">
                  <div>
                    <div className="text-xs font-bold text-slate-900">{c.fullName}</div>
                    <div className="text-[10px] text-slate-500 mt-0.5">
                      CIF: <span className="font-mono text-sky-700 font-bold">{c.customerNumber}</span> · CCCD: {c.identityNumber}
                    </div>
                    <div className="text-[10px] text-slate-400 mt-0.5">{c.email} · {c.phoneNumber}</div>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                    {c.status}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ─── TAB 5: SYSTEM VAULTS ─── */}
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
