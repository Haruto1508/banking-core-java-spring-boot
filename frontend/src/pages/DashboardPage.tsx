import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeftRight,
  Bell,
  Check,
  Copy,
  CreditCard,
  Eye,
  EyeOff,
  Plus,
  QrCode,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { accountApi, notificationApi } from '../api/bankingApi';
import type { BankAccount, NotificationRecord } from '../types/banking';
import { formatCurrency, formatDateTime } from '../utils/format';

export const DashboardPage: React.FC = () => {
  const { user, customer } = useAuth();
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [notifications, setNotifications] = useState<NotificationRecord[]>([]);
  const [hideBalance, setHideBalance] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        if (customer?.id) {
          const accRes = await accountApi.getByCustomer(customer.id);
          setAccounts(accRes.data.data);
        }
        const notifRes = await notificationApi.getMyNotifications(0, 4);
        setNotifications(notifRes.data.data.content);
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

  const copyText = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(text);
    setTimeout(() => setCopiedId(null), 1500);
  };

  return (
    <div className="space-y-6">
      {/* Greeting */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
            Xin chào, {customer?.fullName || user?.username}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            {customer ? `Mã khách hàng: ${customer.customerNumber}` : 'Chào mừng đến với NovaBank Digital'}
          </p>
        </div>
      </div>

      {/* Onboarding Alert if Customer Profile Missing */}
      {!loading && !customer && user?.role === 'CUSTOMER' && (
        <div className="rounded-2xl bg-amber-50 border border-amber-200 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <Sparkles className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <div className="text-sm font-semibold text-amber-900">
                Hoàn tất hồ sơ định danh (KYC) để mở tài khoản
              </div>
              <div className="text-xs text-amber-700 mt-0.5">
                Bạn cần tạo hồ sơ khách hàng (CIF) trước khi mở tài khoản thanh toán hoặc tiết kiệm.
              </div>
            </div>
          </div>
          <Link
            to="/profile"
            className="inline-flex items-center justify-center px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold shrink-0"
          >
            Tạo hồ sơ ngay
          </Link>
        </div>
      )}

      {/* Hero Total Balance Card */}
      <div className="rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-900 text-white p-6 sm:p-7 shadow-lg">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs uppercase tracking-wider text-slate-300 font-medium">
            Tổng số dư khả dụng (VND)
          </span>
          <button
            onClick={() => setHideBalance(!hideBalance)}
            className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition-colors cursor-pointer"
            aria-label="Ẩn/hiện số dư"
          >
            {hideBalance ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>

        <div className="text-3xl sm:text-4xl font-bold tracking-tight tabular-nums mb-6">
          {hideBalance ? '•••••••• ₫' : formatCurrency(totalVnd, 'VND')}
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-4 gap-2 sm:gap-3">
          <Link
            to="/transfer"
            className="flex flex-col items-center gap-1.5 py-2.5 px-2 rounded-2xl bg-white/10 hover:bg-white/20 transition-colors text-center"
          >
            <ArrowLeftRight className="h-5 w-5 text-emerald-300" />
            <span className="text-[11px] sm:text-xs font-medium">Chuyển tiền</span>
          </Link>
          <Link
            to="/payments"
            className="flex flex-col items-center gap-1.5 py-2.5 px-2 rounded-2xl bg-white/10 hover:bg-white/20 transition-colors text-center"
          >
            <QrCode className="h-5 w-5 text-emerald-300" />
            <span className="text-[11px] sm:text-xs font-medium">Thanh toán</span>
          </Link>
          <Link
            to="/accounts"
            className="flex flex-col items-center gap-1.5 py-2.5 px-2 rounded-2xl bg-white/10 hover:bg-white/20 transition-colors text-center"
          >
            <Plus className="h-5 w-5 text-emerald-300" />
            <span className="text-[11px] sm:text-xs font-medium">Mở TK</span>
          </Link>
          <Link
            to="/accounts"
            className="flex flex-col items-center gap-1.5 py-2.5 px-2 rounded-2xl bg-white/10 hover:bg-white/20 transition-colors text-center"
          >
            <CreditCard className="h-5 w-5 text-emerald-300" />
            <span className="text-[11px] sm:text-xs font-medium">Lịch sử</span>
          </Link>
        </div>
      </div>

      {/* Accounts Section */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold text-slate-900">Tài khoản của bạn</h2>
          <Link to="/accounts" className="text-xs font-semibold text-emerald-600 hover:underline">
            Xem tất cả
          </Link>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[1, 2].map((i) => (
              <div key={i} className="h-28 rounded-2xl bg-slate-200/70 animate-pulse" />
            ))}
          </div>
        ) : accounts.length === 0 ? (
          <div className="rounded-2xl bg-white border border-slate-200 p-6 text-center text-sm text-slate-500">
            Bạn chưa có tài khoản ngân hàng nào.{' '}
            <Link to="/accounts" className="text-emerald-600 font-semibold hover:underline">
              Mở tài khoản ngay
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {accounts.map((acc) => (
              <div
                key={acc.id}
                className="rounded-2xl bg-white border border-slate-200 p-4 shadow-xs hover:shadow-sm transition-shadow"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700">
                    {acc.accountType} • {acc.currency}
                  </span>
                  <span
                    className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                      acc.status === 'ACTIVE'
                        ? 'bg-emerald-50 text-emerald-700'
                        : acc.status === 'FROZEN'
                        ? 'bg-amber-50 text-amber-700'
                        : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {acc.status}
                  </span>
                </div>

                <div className="text-xl font-bold text-slate-900 tabular-nums mb-2">
                  {hideBalance ? '••••••••' : formatCurrency(Number(acc.balance), acc.currency)}
                </div>

                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span className="font-mono">{acc.accountNumber}</span>
                  <button
                    onClick={() => copyText(acc.id)}
                    className="inline-flex items-center gap-1 text-slate-600 hover:text-emerald-600 font-medium cursor-pointer"
                    title="Sao chép Account UUID để nhận tiền"
                  >
                    {copiedId === acc.id ? (
                      <>
                        <Check className="h-3.5 w-3.5 text-emerald-600" />
                        <span className="text-emerald-600">Đã chép ID</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5" />
                        <span>Chép ID</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent Notifications */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold text-slate-900">Biến động & Thông báo gần đây</h2>
          <Link to="/notifications" className="text-xs font-semibold text-emerald-600 hover:underline">
            Tất cả
          </Link>
        </div>

        <div className="rounded-2xl bg-white border border-slate-200 divide-y divide-slate-100">
          {notifications.length === 0 ? (
            <div className="p-5 text-center text-xs sm:text-sm text-slate-500">
              Chưa có thông báo giao dịch nào.
            </div>
          ) : (
            notifications.map((n) => (
              <div key={n.id} className="p-4 flex items-start gap-3">
                <div className="h-8 w-8 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                  <Bell className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium text-slate-900 truncate">{n.subject}</div>
                  <div className="text-xs text-slate-500 mt-0.5 line-clamp-2">{n.content}</div>
                  <div className="text-[11px] text-slate-400 mt-1">{formatDateTime(n.createdAt)}</div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
