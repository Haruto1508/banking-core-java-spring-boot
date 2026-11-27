import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  ArrowDownLeft,
  ArrowLeftRight,
  ArrowUpRight,
  BarChart3,
  Check,
  ChevronRight,
  Copy,
  CreditCard,
  Eye,
  EyeOff,
  Gift,
  QrCode,
  Radio,
  ShieldCheck,
  Sparkles,
  Store,
  TrendingUp,
  Wallet,
  Zap,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { accountApi, transactionApi } from '../api/bankingApi';
import type { BankAccount, TransactionRecord } from '../types/banking';
import { formatCurrency, formatDateTime } from '../utils/format';
import { VietQRModal } from '../components/VietQRModal';

export const DashboardPage: React.FC = () => {
  const { user, customer } = useAuth();
  const { t } = useTranslation();

  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [recentTransactions, setRecentTransactions] = useState<TransactionRecord[]>([]);
  const [hideBalance, setHideBalance] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedAccForQr, setSelectedAccForQr] = useState<BankAccount | null>(null);
  const [activeAccIdx, setActiveAccIdx] = useState(0);

  const QUICK_ACTIONS = [
    { to: '/transfer', icon: ArrowLeftRight, labelKey: 'quickActions.transfer', color: 'from-sky-500 to-blue-600', shadow: 'shadow-sky-500/20' },
    { to: '/seller', icon: Store, labelKey: 'nav.sellerHub', color: 'from-emerald-500 to-teal-600', shadow: 'shadow-emerald-500/20' },
    { to: '/sepay', icon: Radio, labelKey: 'quickActions.sepay', color: 'from-blue-600 to-indigo-600', shadow: 'shadow-blue-500/20' },
    { to: '/payments', icon: QrCode, labelKey: 'quickActions.payments', color: 'from-cyan-500 to-teal-500', shadow: 'shadow-cyan-500/20' },
    { to: '/accounts', icon: CreditCard, labelKey: 'quickActions.accounts', color: 'from-indigo-500 to-violet-600', shadow: 'shadow-indigo-500/20' },
  ];

  const SERVICES = [
    { icon: Zap, labelKey: 'services.electricity', color: 'bg-amber-50 text-amber-600 border border-amber-200/80' },
    { icon: Wallet, labelKey: 'services.water', color: 'bg-sky-50 text-sky-600 border border-sky-200/80' },
    { icon: Gift, labelKey: 'services.rewards', color: 'bg-rose-50 text-rose-600 border border-rose-200/80' },
    { icon: ShieldCheck, labelKey: 'services.insurance', color: 'bg-emerald-50 text-emerald-600 border border-emerald-200/80' },
    { icon: BarChart3, labelKey: 'services.invest', color: 'bg-purple-50 text-purple-600 border border-purple-200/80' },
    { icon: TrendingUp, labelKey: 'services.savings', color: 'bg-blue-50 text-blue-600 border border-blue-200/80' },
  ];

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        if (customer?.id) {
          const accRes = await accountApi.getByCustomer(customer.id);
          const accList = accRes.data.data;
          setAccounts(accList);
          if (accList.length > 0) {
            const txRes = await transactionApi.getHistory(accList[0].id, { page: 0, size: 8 });
            setRecentTransactions(txRes.data.data.content);
          }
        }
      } catch { /* noop */ } finally { setLoading(false); }
    };
    loadData();
  }, [customer?.id]);

  const primaryAcc = accounts[activeAccIdx] ?? accounts[0];
  const totalVnd = accounts.filter(a => a.currency === 'VND' && a.status !== 'CLOSED').reduce((s, a) => s + Number(a.balance), 0);
  const totalUsd = accounts.filter(a => a.currency === 'USD' && a.status !== 'CLOSED').reduce((s, a) => s + Number(a.balance), 0);

  const copyText = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(text);
    setTimeout(() => setCopiedId(null), 1500);
  };

  return (
    <div className="space-y-6">
      {/* ─── Greeting Row ─── */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-xs font-semibold text-emerald-600">{t('common.systemActive')}</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 leading-tight">
            {t('dashboard.greeting')}, {customer?.fullName?.split(' ').slice(-1)[0] || user?.username} 👋
          </h1>
          <p className="text-xs text-slate-500 mt-0.5 font-medium">
            {customer ? `${t('dashboard.cif')}: ${customer.customerNumber}` : t('dashboard.welcome')}
          </p>
        </div>
        <button
          onClick={() => accounts[0] && setSelectedAccForQr(accounts[0])}
          className="shrink-0 h-11 w-11 rounded-2xl bg-white hover:bg-sky-50 text-sky-600 flex items-center justify-center transition-colors cursor-pointer border border-sky-200/90 shadow-xs"
          title={t('dashboard.myQrBtn')}
        >
          <QrCode className="h-5 w-5" />
        </button>
      </div>

      {/* ─── KYC Onboarding Alert ─── */}
      {!loading && !customer && user?.role === 'CUSTOMER' && (
        <div className="rounded-2xl bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 p-4 flex items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center shrink-0">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <div className="text-sm font-bold text-amber-950">{t('dashboard.kycBannerTitle')}</div>
              <div className="text-xs text-amber-700/90">{t('dashboard.kycBannerDesc')}</div>
            </div>
          </div>
          <Link
            to="/profile"
            className="shrink-0 px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold transition-colors cursor-pointer shadow-xs"
          >
            {t('dashboard.doNow')}
          </Link>
        </div>
      )}

      {/* ─── DESKTOP: 3-col Hero Layout ─── */}
      <div className="hidden lg:grid lg:grid-cols-3 lg:gap-6">
        {/* Col 1-2: Balance Hero Card */}
        <div className="lg:col-span-2 space-y-5">
          {/* Main Card with Vibrant Sky Blue / Ocean Gradient */}
          <div className="relative rounded-3xl bg-gradient-to-br from-sky-500 via-blue-600 to-indigo-700 p-6 sm:p-7 text-white overflow-hidden shadow-xl shadow-sky-500/15 card-glow">
            <div className="absolute top-0 right-0 w-80 h-80 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-cyan-400/20 rounded-full blur-3xl translate-y-1/2 -translate-x-1/3 pointer-events-none" />

            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-bold text-sky-100 uppercase tracking-wider">
                  {t('dashboard.totalBalance')}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setHideBalance(!hideBalance)}
                    className="p-1.5 rounded-lg bg-white/15 hover:bg-white/25 text-white transition-colors cursor-pointer"
                  >
                    {hideBalance ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/20 text-white border border-white/30 backdrop-blur">
                    {t('common.live')}
                  </span>
                </div>
              </div>

              <div className="mb-2">
                {loading ? (
                  <div className="h-11 w-52 rounded-xl bg-white/20 animate-pulse" />
                ) : (
                  <div className="text-4xl font-black tabular-nums tracking-tight">
                    {hideBalance ? '••••••••' : totalVnd > 0 ? formatCurrency(totalVnd, 'VND') : formatCurrency(totalUsd, 'USD')}
                  </div>
                )}
              </div>

              {totalUsd > 0 && !hideBalance && (
                <div className="text-xs text-sky-100 tabular-nums mb-4">
                  {t('dashboard.foreignCurrency')}: <span className="font-bold text-white">{formatCurrency(totalUsd, 'USD')}</span>
                </div>
              )}

              {/* Quick Action Tiles */}
              <div className="grid grid-cols-4 gap-3 pt-5 border-t border-white/20">
                {QUICK_ACTIONS.map(({ to, icon: Icon, labelKey }) => (
                  <Link
                    key={to}
                    to={to}
                    className="flex flex-col items-center gap-2 py-3 px-2 rounded-2xl bg-white/15 hover:bg-white/25 transition-all group cursor-pointer backdrop-blur-xs"
                  >
                    <div className="h-10 w-10 rounded-xl bg-white text-sky-600 flex items-center justify-center shadow-md group-hover:scale-105 transition-transform">
                      <Icon className="h-5 w-5" />
                    </div>
                    <span className="text-[11px] font-bold text-white text-center leading-tight">
                      {t(labelKey)}
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          </div>

          {/* Account Cards Row */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-extrabold text-slate-800">{t('dashboard.myAccounts')}</h2>
              <Link to="/accounts" className="text-xs font-bold text-sky-600 hover:text-sky-700 flex items-center gap-1">
                {t('common.all')} <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-3.5">
              {loading ? (
                [0, 1].map(i => <div key={i} className="h-28 rounded-2xl skeleton" />)
              ) : accounts.length === 0 ? (
                <div className="col-span-2 rounded-2xl border border-dashed border-sky-200 bg-sky-50/40 p-6 text-center text-xs text-slate-500">
                  {t('dashboard.noAccounts')}{' '}
                  <Link to="/accounts" className="text-sky-600 font-bold hover:underline">
                    {t('dashboard.openNow')} →
                  </Link>
                </div>
              ) : (
                accounts.map((acc, i) => {
                  const isSelected = i === activeAccIdx;
                  return (
                    <div
                      key={acc.id}
                      onClick={() => setActiveAccIdx(i)}
                      className={`relative rounded-2xl p-4 border transition-all cursor-pointer ${isSelected
                        ? 'bg-gradient-to-br from-sky-500 to-blue-600 text-white border-sky-500 shadow-md shadow-sky-500/20'
                        : 'bg-white border-sky-100 hover:border-sky-300 text-slate-800 shadow-xs'
                        }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className={`text-[10px] font-bold uppercase ${isSelected ? 'text-sky-100' : 'text-slate-500'}`}>
                          {t(`accountTypes.${acc.accountType}`)}
                        </span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${isSelected ? 'bg-white/20 text-white' : 'bg-sky-50 text-sky-700 border border-sky-200/60'}`}>
                          {acc.currency}
                        </span>
                      </div>
                      <div className={`text-lg font-black tabular-nums ${isSelected ? 'text-white' : 'text-slate-900'}`}>
                        {hideBalance ? '••••••' : formatCurrency(Number(acc.balance), acc.currency)}
                      </div>
                      <div className="flex items-center justify-between mt-2">
                        <span className={`text-[11px] font-mono ${isSelected ? 'text-sky-100' : 'text-slate-500'}`}>
                          {acc.accountNumber}
                        </span>
                        <button
                          onClick={(e) => { e.stopPropagation(); copyText(acc.accountNumber); }}
                          className="cursor-pointer p-0.5"
                        >
                          {copiedId === acc.accountNumber ? (
                            <Check className={`h-3.5 w-3.5 ${isSelected ? 'text-white' : 'text-emerald-600'}`} />
                          ) : (
                            <Copy className={`h-3.5 w-3.5 ${isSelected ? 'text-sky-100' : 'text-slate-400'}`} />
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Col 3: Services + Recent Transactions */}
        <div className="space-y-5">
          {/* Quick Services */}
          <div className="bg-white border border-sky-100 rounded-3xl p-5 shadow-xs">
            <h2 className="text-sm font-extrabold text-slate-800 mb-3.5">{t('dashboard.quickServices')}</h2>
            <div className="grid grid-cols-3 gap-2.5">
              {SERVICES.map(({ icon: Icon, labelKey, color }) => (
                <Link
                  key={labelKey}
                  to="/payments"
                  className="flex flex-col items-center gap-2 p-2.5 rounded-2xl hover:bg-sky-50/70 transition-colors cursor-pointer group"
                >
                  <div className={`h-11 w-11 rounded-2xl ${color} flex items-center justify-center transition-transform group-hover:scale-105 shadow-xs`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <span className="text-[11px] font-semibold text-slate-700 text-center leading-tight">
                    {t(labelKey)}
                  </span>
                </Link>
              ))}
            </div>
          </div>

          {/* Recent Transactions */}
          <div className="bg-white border border-sky-100 rounded-3xl p-5 shadow-xs">
            <div className="flex items-center justify-between mb-3.5">
              <h2 className="text-sm font-extrabold text-slate-800">{t('dashboard.recentTransactions')}</h2>
              <Link to="/sepay" className="text-xs text-sky-600 hover:text-sky-700 font-bold flex items-center gap-1">
                {t('common.all')} <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            </div>
            <div className="space-y-1 divide-y divide-sky-50">
              {loading ? (
                [0, 1, 2].map(i => <div key={i} className="h-14 rounded-xl skeleton mb-2" />)
              ) : recentTransactions.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400 font-medium">
                  {t('dashboard.noTransactions')}
                </div>
              ) : (
                recentTransactions.slice(0, 5).map(tx => {
                  const isIn = tx.transactionType === 'DEPOSIT' || tx.targetAccountId === primaryAcc?.id;
                  return (
                    <div key={tx.id} className="flex items-center justify-between py-2.5 px-1 hover:bg-sky-50/50 rounded-xl transition-colors">
                      <div className="flex items-center gap-3">
                        <div className={`h-8 w-8 rounded-xl flex items-center justify-center shrink-0 ${isIn ? 'bg-emerald-50 text-emerald-600 border border-emerald-200/60' : 'bg-rose-50 text-rose-600 border border-rose-200/60'}`}>
                          {isIn ? <ArrowDownLeft className="h-4 w-4" /> : <ArrowUpRight className="h-4 w-4" />}
                        </div>
                        <div>
                          <div className="text-xs font-bold text-slate-800 leading-tight truncate max-w-[120px]">
                            {tx.description || tx.transactionType}
                          </div>
                          <div className="text-[10px] text-slate-400 mt-0.5">{formatDateTime(tx.createdAt)}</div>
                        </div>
                      </div>
                      <div className={`text-xs font-bold tabular-nums ${isIn ? 'text-emerald-600' : 'text-slate-800'}`}>
                        {isIn ? '+' : '-'}{formatCurrency(Number(tx.amount), tx.currency)}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ─── MOBILE: Stacked Layout ─── */}
      <div className="lg:hidden space-y-4">
        {/* Mobile Balance Card */}
        <div className="relative rounded-3xl bg-gradient-to-br from-sky-500 via-blue-600 to-indigo-700 p-5 text-white shadow-xl shadow-sky-500/15 overflow-hidden card-glow">
          <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none" />
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-3">
              <div>
                <span className="text-[11px] text-sky-100 font-semibold">{t('dashboard.totalBalance')}</span>
                {primaryAcc && <div className="text-[10px] text-sky-200 font-mono">{primaryAcc.accountNumber}</div>}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setHideBalance(!hideBalance)}
                  className="p-1.5 rounded-xl bg-white/15 text-white cursor-pointer"
                >
                  {hideBalance ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
                {primaryAcc && (
                  <button
                    onClick={() => setSelectedAccForQr(primaryAcc)}
                    className="p-1.5 rounded-xl bg-white/20 text-white cursor-pointer"
                  >
                    <QrCode className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>

            {loading ? (
              <div className="h-9 w-40 rounded-xl bg-white/20 animate-pulse mb-3" />
            ) : (
              <div className="text-3xl font-black tabular-nums mb-3">
                {hideBalance ? '•••••••' : totalVnd > 0 ? formatCurrency(totalVnd, 'VND') : formatCurrency(totalUsd, 'USD')}
              </div>
            )}

            {/* Mobile Quick Action Buttons */}
            <div className="grid grid-cols-4 gap-2 pt-3 border-t border-white/20">
              {QUICK_ACTIONS.map(({ to, icon: Icon, labelKey }) => (
                <Link key={to} to={to} className="flex flex-col items-center gap-1.5 cursor-pointer">
                  <div className="h-11 w-11 rounded-2xl bg-white text-sky-600 flex items-center justify-center shadow-md">
                    <Icon className="h-5 w-5" />
                  </div>
                  <span className="text-[10px] font-bold text-white text-center leading-tight">
                    {t(labelKey)}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* Mobile Account Cards Horizontal Scroll */}
        {accounts.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-sm font-extrabold text-slate-800">{t('dashboard.myAccounts')}</h2>
              <Link to="/accounts" className="text-xs text-sky-600 font-bold">{t('common.manage')}</Link>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-1 -mx-1 px-1 no-scrollbar">
              {accounts.map((acc, i) => (
                <div
                  key={acc.id}
                  className={`shrink-0 w-60 rounded-2xl p-4 border transition-all ${i === 0
                    ? 'bg-gradient-to-br from-sky-500 to-blue-600 text-white border-sky-500 shadow-md shadow-sky-500/20'
                    : 'bg-white border-sky-100 text-slate-800 shadow-xs'
                    }`}
                >
                  <div className="flex justify-between mb-2">
                    <span className={`text-[10px] font-bold ${i === 0 ? 'text-sky-100' : 'text-slate-500'}`}>
                      {t(`accountTypes.${acc.accountType}`)}
                    </span>
                    <span className={`text-[10px] font-bold ${i === 0 ? 'text-sky-100' : 'text-sky-600'}`}>
                      {acc.currency}
                    </span>
                  </div>
                  <div className={`text-base font-black tabular-nums mb-2 ${i === 0 ? 'text-white' : 'text-slate-900'}`}>
                    {hideBalance ? '••••••' : formatCurrency(Number(acc.balance), acc.currency)}
                  </div>
                  <div className={`text-[10px] font-mono ${i === 0 ? 'text-sky-100' : 'text-slate-500'}`}>
                    {acc.accountNumber}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Mobile Services Grid */}
        <div className="bg-white border border-sky-100 rounded-3xl p-4 shadow-xs">
          <h2 className="text-sm font-extrabold text-slate-800 mb-3">{t('dashboard.quickServices')}</h2>
          <div className="grid grid-cols-6 gap-2">
            {SERVICES.map(({ icon: Icon, labelKey, color }) => (
              <Link key={labelKey} to="/payments" className="flex flex-col items-center gap-1.5 cursor-pointer">
                <div className={`h-10 w-10 rounded-xl ${color} flex items-center justify-center shadow-2xs`}>
                  <Icon className="h-4.5 w-4.5" />
                </div>
                <span className="text-[9px] font-bold text-slate-600 text-center leading-tight">
                  {t(labelKey)}
                </span>
              </Link>
            ))}
          </div>
        </div>

        {/* Mobile Transaction Feed */}
        <div className="bg-white border border-sky-100 rounded-3xl overflow-hidden shadow-xs">
          <div className="flex items-center justify-between p-4 border-b border-sky-100">
            <h2 className="text-sm font-extrabold text-slate-800">{t('dashboard.balanceMovements')}</h2>
            <Link to="/sepay" className="text-xs text-sky-600 font-bold flex items-center gap-1">
              {t('common.all')} <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <div className="divide-y divide-sky-50">
            {loading ? (
              [0, 1, 2].map(i => <div key={i} className="h-16 mx-4 my-2 rounded-xl skeleton" />)
            ) : recentTransactions.length === 0 ? (
              <div className="py-10 text-center text-xs text-slate-400 font-medium">
                {t('dashboard.noTransactions')}
              </div>
            ) : (
              recentTransactions.slice(0, 6).map(tx => {
                const isIn = tx.transactionType === 'DEPOSIT' || tx.targetAccountId === primaryAcc?.id;
                return (
                  <div key={tx.id} className="flex items-center justify-between px-4 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 ${isIn ? 'bg-emerald-50 text-emerald-600 border border-emerald-200/60' : 'bg-rose-50 text-rose-600 border border-rose-200/60'}`}>
                        {isIn ? <ArrowDownLeft className="h-4.5 w-4.5" /> : <ArrowUpRight className="h-4.5 w-4.5" />}
                      </div>
                      <div>
                        <div className="text-sm font-bold text-slate-800 leading-tight">
                          {tx.description || tx.transactionType}
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5">{formatDateTime(tx.createdAt)}</div>
                      </div>
                    </div>
                    <div className={`text-sm font-bold tabular-nums ${isIn ? 'text-emerald-600' : 'text-slate-800'}`}>
                      {isIn ? '+' : '-'}{formatCurrency(Number(tx.amount), tx.currency)}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Mobile Security Banner */}
        <div className="rounded-3xl bg-gradient-to-r from-sky-50 to-blue-50 border border-sky-200 p-4 flex items-center gap-3.5 shadow-xs">
          <div className="h-11 w-11 rounded-2xl bg-sky-500 text-white flex items-center justify-center shrink-0 shadow-md shadow-sky-500/20">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <div className="flex-1">
            <div className="text-xs font-bold text-slate-900">{t('dashboard.securityBannerTitle')}</div>
            <div className="text-[11px] text-slate-600 mt-0.5">{t('dashboard.securityBannerDesc')}</div>
          </div>
        </div>
      </div>

      {/* VietQR Modal */}
      {selectedAccForQr && (
        <VietQRModal
          isOpen={!!selectedAccForQr}
          onClose={() => setSelectedAccForQr(null)}
          accountNumber={selectedAccForQr.accountNumber}
          accountHolderName={customer?.fullName || user?.username || 'CHU TAI KHOAN'}
          bankName="MBBank (MB)"
        />
      )}
    </div>
  );
};
