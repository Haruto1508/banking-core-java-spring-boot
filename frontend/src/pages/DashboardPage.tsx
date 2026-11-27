import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowDownLeft,
  ArrowLeftRight,
  ArrowUpRight,
  Check,
  Copy,
  CreditCard,
  Eye,
  EyeOff,
  QrCode,
  Radio,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { accountApi, transactionApi } from '../api/bankingApi';
import type { BankAccount, TransactionRecord } from '../types/banking';
import { formatCurrency, formatDateTime } from '../utils/format';
import { VietQRModal } from '../components/VietQRModal';

export const DashboardPage: React.FC = () => {
  const { user, customer } = useAuth();
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [recentTransactions, setRecentTransactions] = useState<TransactionRecord[]>([]);
  const [hideBalance, setHideBalance] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedAccForQr, setSelectedAccForQr] = useState<BankAccount | null>(null);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        if (customer?.id) {
          const accRes = await accountApi.getByCustomer(customer.id);
          const accList = accRes.data.data;
          setAccounts(accList);

          if (accList.length > 0) {
            // Load transactions for primary account
            const txRes = await transactionApi.getHistory(accList[0].id, { page: 0, size: 5 });
            setRecentTransactions(txRes.data.data.content);
          }
        }
      } catch {
        // Handled gracefully in empty state
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [customer?.id]);

  const totalVnd = accounts
    .filter((a) => a.currency === 'VND' && a.status !== 'CLOSED')
    .reduce((sum, a) => sum + Number(a.balance), 0);

  const totalUsd = accounts
    .filter((a) => a.currency === 'USD' && a.status !== 'CLOSED')
    .reduce((sum, a) => sum + Number(a.balance), 0);

  const primaryAccount = accounts[0];

  const copyText = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(text);
    setTimeout(() => setCopiedId(null), 1500);
  };

  return (
    <div className="space-y-6">
      {/* Top Welcome Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[11px] font-semibold mb-1">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
            Hệ thống thanh toán trực tuyến SePay 24/7
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Xin chào, {customer?.fullName || user?.username}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            {customer ? `Mã định danh CIF: ${customer.customerNumber}` : 'Chào mừng bạn đến với NovaBank'}
          </p>
        </div>

        {primaryAccount && (
          <button
            onClick={() => setSelectedAccForQr(primaryAccount)}
            className="self-start sm:self-auto px-4 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold flex items-center gap-2 shadow-sm transition-all cursor-pointer"
          >
            <QrCode className="h-4 w-4" />
            <span>Mã VietQR Nhận Tiền</span>
          </button>
        )}
      </div>

      {/* Onboarding Alert if Customer Profile Missing */}
      {!loading && !customer && user?.role === 'CUSTOMER' && (
        <div className="rounded-3xl bg-amber-50 border border-amber-200 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <Sparkles className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <div className="text-sm font-semibold text-amber-900">
                Hoàn tất hồ sơ định danh (KYC) để kích hoạt tài khoản
              </div>
              <div className="text-xs text-amber-700 mt-0.5">
                Bạn cần tạo hồ sơ khách hàng (CIF) trước khi mở tài khoản thanh toán hoặc kích hoạt cổng VietQR.
              </div>
            </div>
          </div>
          <Link
            to="/profile"
            className="inline-flex items-center justify-center px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold shrink-0 cursor-pointer"
          >
            Tạo hồ sơ ngay
          </Link>
        </div>
      )}

      {/* Hero Balance Card - SePay Inspired High Tech Design */}
      <div className="rounded-3xl bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 text-white p-6 sm:p-8 shadow-xl border border-slate-800/80 relative overflow-hidden">
        {/* Decorative glowing gradient backdrop */}
        <div className="absolute -right-20 -top-20 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute -left-20 -bottom-20 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative z-10">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase tracking-wider text-slate-400 font-semibold">
                Tổng số dư khả dụng
              </span>
              <button
                onClick={() => setHideBalance(!hideBalance)}
                className="p-1 rounded-lg text-slate-400 hover:text-white transition-colors cursor-pointer"
                title="Ẩn / Hiện số dư"
              >
                {hideBalance ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <span className="text-[11px] font-mono px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-semibold">
              Live Real-Time
            </span>
          </div>

          <div className="text-3xl sm:text-5xl font-extrabold tracking-tight tabular-nums mb-3">
            {hideBalance
              ? '•••••••• ₫'
              : totalVnd > 0 || totalUsd === 0
              ? formatCurrency(totalVnd, 'VND')
              : formatCurrency(totalUsd, 'USD')}
          </div>

          {totalUsd > 0 && !hideBalance && (
            <div className="text-sm text-slate-400 tabular-nums font-mono mb-6">
              Tài khoản ngoại tệ: <span className="text-emerald-400 font-semibold">{formatCurrency(totalUsd, 'USD')}</span>
            </div>
          )}

          {/* Quick Actions Bar */}
          <div className="grid grid-cols-4 gap-2 sm:gap-3 mt-4 pt-4 border-t border-slate-800">
            <Link
              to="/transfer"
              className="flex flex-col items-center gap-2 py-3 px-2 rounded-2xl bg-white/5 hover:bg-white/10 text-slate-200 hover:text-white transition-all text-center group cursor-pointer"
            >
              <div className="h-10 w-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                <ArrowLeftRight className="h-5 w-5" />
              </div>
              <span className="text-[11px] sm:text-xs font-semibold">Chuyển tiền</span>
            </Link>

            <Link
              to="/sepay"
              className="flex flex-col items-center gap-2 py-3 px-2 rounded-2xl bg-white/5 hover:bg-white/10 text-slate-200 hover:text-white transition-all text-center group cursor-pointer"
            >
              <div className="h-10 w-10 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                <Radio className="h-5 w-5" />
              </div>
              <span className="text-[11px] sm:text-xs font-semibold">SePay QR</span>
            </Link>

            <Link
              to="/payments"
              className="flex flex-col items-center gap-2 py-3 px-2 rounded-2xl bg-white/5 hover:bg-white/10 text-slate-200 hover:text-white transition-all text-center group cursor-pointer"
            >
              <div className="h-10 w-10 rounded-xl bg-teal-500/20 text-teal-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                <QrCode className="h-5 w-5" />
              </div>
              <span className="text-[11px] sm:text-xs font-semibold">Thanh toán</span>
            </Link>

            <Link
              to="/accounts"
              className="flex flex-col items-center gap-2 py-3 px-2 rounded-2xl bg-white/5 hover:bg-white/10 text-slate-200 hover:text-white transition-all text-center group cursor-pointer"
            >
              <div className="h-10 w-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                <CreditCard className="h-5 w-5" />
              </div>
              <span className="text-[11px] sm:text-xs font-semibold">Tài khoản</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Main Grid: My Accounts & Recent Transactions Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Accounts List */}
        <div className="lg:col-span-1 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900">Danh sách tài khoản</h2>
            <Link to="/accounts" className="text-xs font-semibold text-emerald-600 hover:underline">
              Quản lý ({accounts.length})
            </Link>
          </div>

          <div className="space-y-2.5">
            {accounts.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 p-6 text-center text-xs text-slate-400">
                Chưa có tài khoản nào được mở.
              </div>
            ) : (
              accounts.map((acc) => (
                <div
                  key={acc.id}
                  className="rounded-2xl bg-white border border-slate-200/90 p-4 shadow-xs hover:border-emerald-300 transition-all flex flex-col justify-between gap-3"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-500">
                      {acc.accountType} • {acc.currency}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        acc.status === 'ACTIVE'
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-amber-50 text-amber-700'
                      }`}
                    >
                      {acc.status}
                    </span>
                  </div>

                  <div className="text-xl font-bold text-slate-900 tabular-nums">
                    {hideBalance ? '••••••••' : formatCurrency(Number(acc.balance), acc.currency)}
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                    <div className="flex items-center gap-1.5 font-mono text-slate-600">
                      <span>{acc.accountNumber}</span>
                      <button
                        onClick={() => copyText(acc.accountNumber)}
                        className="text-slate-400 hover:text-emerald-600 cursor-pointer"
                        title="Sao chép số tài khoản"
                      >
                        {copiedId === acc.accountNumber ? (
                          <Check className="h-3.5 w-3.5 text-emerald-600" />
                        ) : (
                          <Copy className="h-3.5 w-3.5" />
                        )}
                      </button>
                    </div>

                    <button
                      onClick={() => setSelectedAccForQr(acc)}
                      className="text-emerald-600 hover:text-emerald-700 font-semibold inline-flex items-center gap-1 cursor-pointer"
                    >
                      <QrCode className="h-3.5 w-3.5" />
                      QR
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Live Transaction Feed */}
        <div className="lg:col-span-2 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900">Biến động số dư gần đây</h2>
            <Link to="/sepay" className="text-xs font-semibold text-indigo-600 hover:underline">
              Cổng SePay Webhook →
            </Link>
          </div>

          <div className="bg-white rounded-3xl border border-slate-200/90 p-4 sm:p-5 shadow-xs space-y-2">
            {recentTransactions.length === 0 ? (
              <div className="text-center py-10 text-slate-400 text-xs">
                Chưa có phát sinh biến động nào gần đây.
              </div>
            ) : (
              recentTransactions.map((tx) => {
                const isIncoming = tx.transactionType === 'DEPOSIT' || tx.targetAccountId === primaryAccount?.id;
                return (
                  <div
                    key={tx.id}
                    className="flex items-center justify-between p-3 rounded-2xl hover:bg-slate-50 transition-colors border border-slate-100 text-xs"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 ${
                          isIncoming ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
                        }`}
                      >
                        {isIncoming ? <ArrowDownLeft className="h-5 w-5" /> : <ArrowUpRight className="h-5 w-5" />}
                      </div>
                      <div>
                        <div className="font-semibold text-slate-900">
                          {tx.description || `${tx.transactionType} ${tx.transactionRef}`}
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                          {tx.transactionRef} • {formatDateTime(tx.createdAt)}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div
                        className={`font-bold tabular-nums text-sm ${
                          isIncoming ? 'text-emerald-600' : 'text-slate-900'
                        }`}
                      >
                        {isIncoming ? '+' : '-'} {formatCurrency(Number(tx.amount), tx.currency)}
                      </div>
                      <span className="text-[10px] text-slate-400 font-medium">
                        {tx.status}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
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
