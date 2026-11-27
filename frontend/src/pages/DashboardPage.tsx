import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
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
  TrendingUp,
  Wallet,
  Zap,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { accountApi, transactionApi } from '../api/bankingApi';
import type { BankAccount, TransactionRecord } from '../types/banking';
import { formatCurrency, formatDateTime } from '../utils/format';
import { VietQRModal } from '../components/VietQRModal';

const QUICK_ACTIONS = [
  { to: '/transfer', icon: ArrowLeftRight, label: 'Chuyển tiền', color: 'from-emerald-500 to-teal-500', shadow: 'shadow-emerald-500/20' },
  { to: '/sepay', icon: Radio, label: 'SePay QR', color: 'from-indigo-500 to-purple-600', shadow: 'shadow-indigo-500/20' },
  { to: '/payments', icon: QrCode, label: 'Thanh toán', color: 'from-orange-500 to-amber-500', shadow: 'shadow-orange-500/20' },
  { to: '/accounts', icon: CreditCard, label: 'Tài khoản', color: 'from-sky-500 to-blue-600', shadow: 'shadow-sky-500/20' },
];

const SERVICES = [
  { icon: Zap, label: 'Điện', color: 'bg-amber-100 text-amber-700' },
  { icon: Wallet, label: 'Nước', color: 'bg-sky-100 text-sky-700' },
  { icon: Gift, label: 'Thưởng', color: 'bg-rose-100 text-rose-700' },
  { icon: ShieldCheck, label: 'Bảo hiểm', color: 'bg-emerald-100 text-emerald-700' },
  { icon: BarChart3, label: 'Đầu tư', color: 'bg-purple-100 text-purple-700' },
  { icon: TrendingUp, label: 'Tiết kiệm', color: 'bg-teal-100 text-teal-700' },
];

export const DashboardPage: React.FC = () => {
  const { user, customer } = useAuth();
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [recentTransactions, setRecentTransactions] = useState<TransactionRecord[]>([]);
  const [hideBalance, setHideBalance] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedAccForQr, setSelectedAccForQr] = useState<BankAccount | null>(null);
  const [activeAccIdx, setActiveAccIdx] = useState(0);

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
            <span className="text-xs font-semibold text-emerald-400">Hệ thống đang hoạt động tốt</span>
          </div>
          <h1 className="text-lg sm:text-2xl font-extrabold text-white leading-tight">
            Xin chào, {customer?.fullName?.split(' ').slice(-1)[0] || user?.username} 👋
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            {customer ? `CIF: ${customer.customerNumber}` : 'Chào mừng đến với NovaBank'}
          </p>
        </div>
        <button onClick={() => accounts[0] && setSelectedAccForQr(accounts[0])} className="shrink-0 h-11 w-11 rounded-2xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 flex items-center justify-center transition-colors cursor-pointer border border-emerald-500/20" title="Mã QR của tôi">
          <QrCode className="h-5 w-5" />
        </button>
      </div>

      {/* ─── KYC Onboarding Alert ─── */}
      {!loading && !customer && user?.role === 'CUSTOMER' && (
        <div className="rounded-2xl bg-gradient-to-r from-amber-500/15 to-orange-500/10 border border-amber-500/20 p-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Sparkles className="h-5 w-5 text-amber-400 shrink-0" />
            <div>
              <div className="text-sm font-bold text-amber-200">Hoàn tất KYC để kích hoạt dịch vụ</div>
              <div className="text-xs text-amber-400/80">Tạo hồ sơ CIF để mở tài khoản ngân hàng và VietQR</div>
            </div>
          </div>
          <Link to="/profile" className="shrink-0 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition-colors cursor-pointer">
            Làm ngay
          </Link>
        </div>
      )}

      {/* ─── DESKTOP: 3-col hero layout ─── */}
      <div className="hidden lg:grid lg:grid-cols-3 lg:gap-6">

        {/* Col 1-2: Balance Hero Card */}
        <div className="lg:col-span-2 space-y-4">
          {/* Balance Card */}
          <div className="relative rounded-3xl bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950 border border-slate-800 p-6 overflow-hidden card-glow">
            <div className="absolute top-0 right-0 w-72 h-72 bg-emerald-500/8 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none"></div>
            <div className="absolute bottom-0 left-0 w-56 h-56 bg-indigo-600/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/3 pointer-events-none"></div>

            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Tổng tài sản khả dụng</span>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => setHideBalance(!hideBalance)} className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 transition-colors cursor-pointer">
                    {hideBalance ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                  <span className="text-[10px] font-mono px-2 py-1 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">LIVE</span>
                </div>
              </div>

              <div className="mb-1">
                {loading ? (
                  <div className="h-10 w-48 rounded-xl skeleton"></div>
                ) : (
                  <div className="text-4xl font-black tabular-nums text-white tracking-tight">
                    {hideBalance ? '••••••••' : totalVnd > 0 ? formatCurrency(totalVnd, 'VND') : formatCurrency(totalUsd, 'USD')}
                  </div>
                )}
              </div>
              {totalUsd > 0 && !hideBalance && (
                <div className="text-sm text-slate-400 tabular-nums mb-4">
                  Ngoại tệ: <span className="text-emerald-400 font-semibold">{formatCurrency(totalUsd, 'USD')}</span>
                </div>
              )}

              {/* Quick Actions */}
              <div className="grid grid-cols-4 gap-3 pt-4 border-t border-white/5">
                {QUICK_ACTIONS.map(({ to, icon: Icon, label, color, shadow }) => (
                  <Link key={to} to={to} className="flex flex-col items-center gap-2.5 py-3 rounded-2xl bg-white/5 hover:bg-white/10 transition-all group cursor-pointer">
                    <div className={`h-10 w-10 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center shadow-md ${shadow} group-hover:scale-105 transition-transform`}>
                      <Icon className="h-5 w-5 text-white" />
                    </div>
                    <span className="text-[11px] font-semibold text-slate-300 text-center">{label}</span>
                  </Link>
                ))}
              </div>
            </div>
          </div>

          {/* Account Cards Row */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold text-slate-200">Tài khoản của bạn</h2>
              <Link to="/accounts" className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 flex items-center gap-1">Xem tất cả <ChevronRight className="h-3.5 w-3.5" /></Link>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {loading ? [0,1].map(i => <div key={i} className="h-28 rounded-2xl skeleton"></div>) :
                accounts.length === 0 ? (
                  <div className="col-span-2 rounded-2xl border border-dashed border-slate-700 p-6 text-center text-xs text-slate-500">Chưa có tài khoản. <Link to="/accounts" className="text-emerald-400 font-semibold">Mở tài khoản ngay →</Link></div>
                ) : accounts.map((acc, i) => (
                  <div key={acc.id} className={`relative rounded-2xl p-4 border transition-all cursor-pointer ${i === activeAccIdx ? 'bg-emerald-500 border-emerald-400 shadow-lg shadow-emerald-500/20' : 'bg-slate-900 border-slate-800 hover:border-slate-600'}`} onClick={() => setActiveAccIdx(i)}>
                    <div className="flex items-center justify-between mb-2">
                      <span className={`text-[10px] font-bold uppercase ${i === activeAccIdx ? 'text-emerald-100' : 'text-slate-400'}`}>{acc.accountType}</span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${i === activeAccIdx ? 'bg-white/20 text-white' : 'bg-slate-800 text-slate-400'}`}>{acc.currency}</span>
                    </div>
                    <div className={`text-lg font-extrabold tabular-nums ${i === activeAccIdx ? 'text-white' : 'text-slate-100'}`}>
                      {hideBalance ? '••••••' : formatCurrency(Number(acc.balance), acc.currency)}
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <span className={`text-[10px] font-mono ${i === activeAccIdx ? 'text-emerald-100' : 'text-slate-500'}`}>{acc.accountNumber}</span>
                      <button onClick={(e) => { e.stopPropagation(); copyText(acc.accountNumber); }} className="cursor-pointer">
                        {copiedId === acc.accountNumber ? <Check className="h-3 w-3 text-white" /> : <Copy className={`h-3 w-3 ${i === activeAccIdx ? 'text-emerald-100' : 'text-slate-500'}`} />}
                      </button>
                    </div>
                  </div>
                ))
              }
            </div>
          </div>
        </div>

        {/* Col 3: Services + Transactions */}
        <div className="space-y-4">
          {/* Quick Services */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5">
            <h2 className="text-sm font-bold text-slate-200 mb-4">Dịch vụ nhanh</h2>
            <div className="grid grid-cols-3 gap-3">
              {SERVICES.map(({ icon: Icon, label, color }) => (
                <Link key={label} to="/payments" className="flex flex-col items-center gap-2 p-3 rounded-2xl hover:bg-slate-800 transition-colors cursor-pointer">
                  <div className={`h-10 w-10 rounded-xl ${color} flex items-center justify-center`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <span className="text-[10px] font-semibold text-slate-300 text-center">{label}</span>
                </Link>
              ))}
            </div>
          </div>

          {/* Recent Transactions */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 flex-1">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold text-slate-200">Giao dịch gần đây</h2>
              <Link to="/sepay" className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold flex items-center gap-1">Tất cả <ChevronRight className="h-3.5 w-3.5" /></Link>
            </div>
            <div className="space-y-1">
              {loading ? [0,1,2].map(i => <div key={i} className="h-14 rounded-xl skeleton mb-2"></div>) :
                recentTransactions.length === 0 ? (
                  <div className="py-8 text-center text-xs text-slate-500">Chưa có giao dịch nào</div>
                ) : recentTransactions.slice(0, 5).map(tx => {
                  const isIn = tx.transactionType === 'DEPOSIT' || tx.targetAccountId === primaryAcc?.id;
                  return (
                    <div key={tx.id} className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-800/60 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className={`h-8 w-8 rounded-xl flex items-center justify-center shrink-0 ${isIn ? 'bg-emerald-500/15 text-emerald-400' : 'bg-rose-500/15 text-rose-400'}`}>
                          {isIn ? <ArrowDownLeft className="h-4 w-4" /> : <ArrowUpRight className="h-4 w-4" />}
                        </div>
                        <div>
                          <div className="text-xs font-semibold text-slate-200 leading-tight truncate max-w-[120px]">{tx.description || tx.transactionType}</div>
                          <div className="text-[10px] text-slate-500">{formatDateTime(tx.createdAt)}</div>
                        </div>
                      </div>
                      <div className={`text-xs font-bold tabular-nums ${isIn ? 'text-emerald-400' : 'text-slate-300'}`}>
                        {isIn ? '+' : '-'}{formatCurrency(Number(tx.amount), tx.currency)}
                      </div>
                    </div>
                  );
                })
              }
            </div>
          </div>
        </div>
      </div>

      {/* ─── MOBILE: Stacked layout ─── */}
      <div className="lg:hidden space-y-4">

        {/* Mobile Balance Card (Swipeable feel) */}
        <div className="relative rounded-3xl bg-gradient-to-br from-slate-900 to-indigo-950 border border-slate-800 p-5 overflow-hidden card-glow">
          <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none"></div>
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-3">
              <div>
                <span className="text-[11px] text-slate-400 font-medium">Tổng số dư</span>
                {primaryAcc && <div className="text-[10px] text-slate-500 font-mono">{primaryAcc.accountNumber}</div>}
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => setHideBalance(!hideBalance)} className="p-1.5 rounded-xl bg-white/5 text-slate-400 cursor-pointer">
                  {hideBalance ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
                {primaryAcc && (
                  <button onClick={() => setSelectedAccForQr(primaryAcc)} className="p-1.5 rounded-xl bg-emerald-500/15 text-emerald-400 cursor-pointer">
                    <QrCode className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
            {loading ? <div className="h-9 w-40 rounded-xl skeleton mb-3"></div> : (
              <div className="text-3xl font-black tabular-nums text-white mb-3">
                {hideBalance ? '•••••••' : totalVnd > 0 ? formatCurrency(totalVnd, 'VND') : formatCurrency(totalUsd, 'USD')}
              </div>
            )}

            {/* Mobile quick actions */}
            <div className="grid grid-cols-4 gap-2">
              {QUICK_ACTIONS.map(({ to, icon: Icon, label, color }) => (
                <Link key={to} to={to} className="flex flex-col items-center gap-1.5 cursor-pointer">
                  <div className={`h-11 w-11 rounded-2xl bg-gradient-to-br ${color} flex items-center justify-center`}>
                    <Icon className="h-5 w-5 text-white" />
                  </div>
                  <span className="text-[10px] font-semibold text-slate-300 text-center leading-tight">{label}</span>
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* Mobile Account Cards horizontal scroll */}
        {accounts.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-sm font-bold text-slate-200">Tài khoản</h2>
              <Link to="/accounts" className="text-xs text-emerald-400 font-semibold">Quản lý</Link>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-1 -mx-1 px-1 no-scrollbar">
              {accounts.map((acc, i) => (
                <div key={acc.id} className={`shrink-0 w-56 rounded-2xl p-4 border ${i === 0 ? 'bg-emerald-500 border-emerald-400' : 'bg-slate-900 border-slate-800'}`}>
                  <div className="flex justify-between mb-2">
                    <span className={`text-[10px] font-bold ${i === 0 ? 'text-emerald-100' : 'text-slate-400'}`}>{acc.accountType}</span>
                    <span className={`text-[10px] font-bold ${i === 0 ? 'text-emerald-100' : 'text-slate-500'}`}>{acc.currency}</span>
                  </div>
                  <div className={`text-base font-extrabold tabular-nums mb-2 ${i === 0 ? 'text-white' : 'text-slate-100'}`}>
                    {hideBalance ? '••••••' : formatCurrency(Number(acc.balance), acc.currency)}
                  </div>
                  <div className={`text-[10px] font-mono ${i === 0 ? 'text-emerald-100' : 'text-slate-500'}`}>{acc.accountNumber}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Mobile Services Grid */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4">
          <h2 className="text-sm font-bold text-slate-200 mb-3">Dịch vụ nhanh</h2>
          <div className="grid grid-cols-6 gap-2">
            {SERVICES.map(({ icon: Icon, label, color }) => (
              <Link key={label} to="/payments" className="flex flex-col items-center gap-1.5 cursor-pointer">
                <div className={`h-10 w-10 rounded-xl ${color} flex items-center justify-center`}>
                  <Icon className="h-5 w-5" />
                </div>
                <span className="text-[9px] font-semibold text-slate-400 text-center">{label}</span>
              </Link>
            ))}
          </div>
        </div>

        {/* Mobile Transaction Feed */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b border-slate-800">
            <h2 className="text-sm font-bold text-slate-200">Biến động số dư</h2>
            <Link to="/sepay" className="text-xs text-indigo-400 font-semibold flex items-center gap-1">Xem thêm <ChevronRight className="h-3.5 w-3.5" /></Link>
          </div>
          <div className="divide-y divide-slate-800/60">
            {loading ? [0,1,2].map(i => <div key={i} className="h-16 mx-4 my-2 rounded-xl skeleton"></div>) :
              recentTransactions.length === 0 ? (
                <div className="py-10 text-center text-xs text-slate-500">Chưa có giao dịch nào</div>
              ) : recentTransactions.slice(0, 6).map(tx => {
                const isIn = tx.transactionType === 'DEPOSIT' || tx.targetAccountId === primaryAcc?.id;
                return (
                  <div key={tx.id} className="flex items-center justify-between px-4 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 ${isIn ? 'bg-emerald-500/15 text-emerald-400' : 'bg-rose-500/15 text-rose-400'}`}>
                        {isIn ? <ArrowDownLeft className="h-4.5 w-4.5" /> : <ArrowUpRight className="h-4.5 w-4.5" />}
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-slate-200 leading-tight">{tx.description || tx.transactionType}</div>
                        <div className="text-[11px] text-slate-500 mt-0.5">{formatDateTime(tx.createdAt)}</div>
                      </div>
                    </div>
                    <div className={`text-sm font-bold tabular-nums ${isIn ? 'text-emerald-400' : 'text-slate-300'}`}>
                      {isIn ? '+' : '-'}{formatCurrency(Number(tx.amount), tx.currency)}
                    </div>
                  </div>
                );
              })
            }
          </div>
        </div>

        {/* Mobile Security/Promo Banner */}
        <div className="rounded-3xl bg-gradient-to-r from-indigo-900 via-purple-900 to-indigo-900 border border-indigo-800/50 p-5 flex items-center gap-4">
          <div className="h-12 w-12 rounded-2xl bg-white/10 flex items-center justify-center shrink-0">
            <ShieldCheck className="h-6 w-6 text-indigo-300" />
          </div>
          <div className="flex-1">
            <div className="text-sm font-bold text-white">Bảo mật 2 lớp JWT + Rate Limiting</div>
            <div className="text-xs text-indigo-300 mt-0.5">Tài khoản của bạn được bảo vệ bởi Refresh Token Rotation và chống DDoS tự động</div>
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
