import React, { useEffect, useState } from 'react';
import {
  ArrowLeftRight,
  CheckCircle2,
  Clock,
  QrCode,
  Search,
  Send,
  ShieldCheck,
  UserCheck,
  Zap,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { accountApi, transactionApi } from '../api/bankingApi';
import { extractErrorMessage } from '../api/client';
import type { BankAccount, TransactionRecord } from '../types/banking';
import { formatCurrency, formatDateTime, generateIdempotencyKey } from '../utils/format';
import { VietQRModal } from '../components/VietQRModal';

const QUICK_AMOUNTS = [50_000, 100_000, 200_000, 500_000, 1_000_000, 2_000_000];

const FREQUENT_BENEFICIARIES = [
  { name: 'Nguyễn Văn A', account: 'ACC-DEMO-001', bank: 'NovaBank', initial: 'A' },
  { name: 'Trần Thị B', account: 'ACC-DEMO-002', bank: 'NovaBank', initial: 'B' },
];

export const TransferPage: React.FC = () => {
  const { customer, user } = useAuth();
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [sourceAccountId, setSourceAccountId] = useState('');
  const [targetInput, setTargetInput] = useState('');
  const [resolvedAccount, setResolvedAccount] = useState<BankAccount | null>(null);
  const [resolving, setResolving] = useState(false);
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<TransactionRecord | null>(null);
  const [showQrModal, setShowQrModal] = useState(false);

  const loadAccounts = async () => {
    if (!customer?.id) return;
    try {
      const res = await accountApi.getByCustomer(customer.id);
      const active = res.data.data.filter((a) => a.status === 'ACTIVE');
      setAccounts(active);
      if (active.length > 0 && !sourceAccountId) setSourceAccountId(active[0].id);
    } catch { /* noop */ }
  };

  useEffect(() => { loadAccounts(); }, [customer?.id]);

  const selectedSource = accounts.find((a) => a.id === sourceAccountId);

  const handleLookup = async (inputVal: string) => {
    const trimmed = inputVal.trim();
    if (!trimmed) { setResolvedAccount(null); return; }
    setResolving(true);
    setError(null);
    try {
      if (trimmed.startsWith('ACC-') || trimmed.startsWith('SYS-')) {
        const res = await accountApi.lookupByNumber(trimmed);
        setResolvedAccount(res.data.data);
      } else if (trimmed.length === 36 && trimmed.includes('-')) {
        const res = await accountApi.getById(trimmed);
        setResolvedAccount(res.data.data);
      } else {
        const res = await accountApi.lookupByNumber(trimmed);
        setResolvedAccount(res.data.data);
      }
    } catch { setResolvedAccount(null); } finally { setResolving(false); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSource) return;
    const finalTargetId = resolvedAccount ? resolvedAccount.id : targetInput.trim();
    if (!finalTargetId) { setError('Vui lòng nhập số tài khoản người nhận hợp lệ.'); return; }
    setError(null);
    setSubmitting(true);
    try {
      const res = await transactionApi.transfer(
        { sourceAccountId, targetAccountId: finalTargetId, amount: Number(amount), currency: selectedSource.currency, description: description.trim() || 'Chuyển tiền nội bộ 24/7' },
        generateIdempotencyKey('TRF')
      );
      setReceipt(res.data.data);
      setAmount(''); setDescription(''); setTargetInput(''); setResolvedAccount(null);
      await loadAccounts();
    } catch (err) { setError(extractErrorMessage(err)); } finally { setSubmitting(false); }
  };

  if (receipt) {
    return (
      <div className="max-w-lg mx-auto">
        <div className="rounded-3xl bg-slate-900 border border-slate-800 p-8 text-center">
          <div className="h-16 w-16 rounded-full bg-emerald-500/15 border-2 border-emerald-500/30 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="h-9 w-9 text-emerald-400" />
          </div>
          <span className="inline-block px-3 py-1 rounded-full bg-emerald-500/15 text-emerald-400 text-xs font-semibold mb-3 border border-emerald-500/20">
            ✓ Napas 24/7 — Thành Công
          </span>
          <h2 className="text-xl font-extrabold text-white mb-1">Chuyển tiền hoàn tất</h2>
          <p className="text-4xl font-black tabular-nums text-emerald-400 my-4">
            {formatCurrency(Number(receipt.amount), receipt.currency)}
          </p>
          <div className="rounded-2xl bg-slate-800/60 border border-slate-700 p-4 text-left space-y-3 my-5">
            {[
              { label: 'Mã giao dịch', value: receipt.transactionRef, mono: true },
              { label: 'Trạng thái', value: receipt.status },
              { label: 'Nội dung', value: receipt.description || '—' },
              { label: 'Thời gian', value: formatDateTime(receipt.createdAt) },
            ].map(({ label, value, mono }) => (
              <div key={label} className="flex justify-between gap-2 text-xs">
                <span className="text-slate-400">{label}</span>
                <span className={`font-semibold text-slate-200 text-right ${mono ? 'font-mono' : ''}`}>{value}</span>
              </div>
            ))}
          </div>
          <button onClick={() => setReceipt(null)}
            className="w-full py-3.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-sm font-bold cursor-pointer transition-colors">
            Thực hiện giao dịch mới
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-white">Chuyển tiền 24/7</h1>
          <p className="text-xs text-slate-400 mt-0.5">Chuyển theo số tài khoản hoặc quét mã VietQR SePay</p>
        </div>
        {selectedSource && (
          <button onClick={() => setShowQrModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/20 text-emerald-400 text-xs font-bold cursor-pointer transition-colors">
            <QrCode className="h-4 w-4" />
            <span>QR của tôi</span>
          </button>
        )}
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { icon: Zap, label: 'Tức thời', desc: 'Napas 24/7', color: 'text-emerald-400 bg-emerald-500/10' },
          { icon: ShieldCheck, label: 'Bảo mật', desc: 'JWT + OTP', color: 'text-indigo-400 bg-indigo-500/10' },
          { icon: Clock, label: 'Phí', desc: 'Miễn phí', color: 'text-amber-400 bg-amber-500/10' },
        ].map(({ icon: Icon, label, desc, color }) => (
          <div key={label} className="rounded-2xl bg-slate-900 border border-slate-800 p-3 flex items-center gap-2.5">
            <div className={`h-8 w-8 rounded-xl flex items-center justify-center shrink-0 ${color}`}>
              <Icon className="h-4 w-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-200">{label}</div>
              <div className="text-[10px] text-slate-500">{desc}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Desktop: 2-col layout */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        {/* Transfer Form */}
        <div className="lg:col-span-3 bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 space-y-4">
          <div className="flex items-center gap-2 mb-1">
            <div className="h-8 w-8 rounded-xl bg-emerald-500/15 flex items-center justify-center">
              <ArrowLeftRight className="h-4 w-4 text-emerald-400" />
            </div>
            <h2 className="text-sm font-bold text-white">Thông tin chuyển tiền</h2>
          </div>

          {error && (
            <div className="rounded-xl bg-rose-500/10 border border-rose-500/20 px-4 py-3 text-xs text-rose-400">{error}</div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Source Account */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">Tài khoản trích tiền</label>
              <select value={sourceAccountId} onChange={(e) => setSourceAccountId(e.target.value)} required
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500">
                {accounts.length === 0 ? (
                  <option value="">Không có tài khoản ACTIVE</option>
                ) : accounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.accountNumber} ({acc.accountType}) — {formatCurrency(Number(acc.balance), acc.currency)}
                  </option>
                ))}
              </select>
              {selectedSource && (
                <div className="mt-1.5 text-[11px] text-slate-500">
                  Số dư khả dụng: <span className="font-bold text-emerald-400 tabular-nums">{formatCurrency(Number(selectedSource.balance), selectedSource.currency)}</span>
                </div>
              )}
            </div>

            {/* Target Account */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-slate-400">Số tài khoản người nhận</label>
                {resolving && <span className="text-[11px] text-emerald-400 animate-pulse">Đang xác thực...</span>}
              </div>
              <div className="relative">
                <input type="text" required value={targetInput}
                  onChange={(e) => { setTargetInput(e.target.value); handleLookup(e.target.value); }}
                  placeholder="Nhập số tài khoản (ví dụ: ACC-DEMO-001)"
                  className="w-full pl-3.5 pr-10 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-sm text-white font-mono placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                <button type="button" onClick={() => handleLookup(targetInput)}
                  className="absolute right-2.5 top-2.5 p-1 text-slate-500 hover:text-emerald-400 cursor-pointer">
                  <Search className="h-4 w-4" />
                </button>
              </div>
              {resolvedAccount && (
                <div className="mt-2 p-3 rounded-2xl bg-emerald-500/8 border border-emerald-500/20 flex items-center gap-2.5">
                  <div className="h-8 w-8 rounded-xl bg-emerald-500 text-white flex items-center justify-center font-bold text-sm shrink-0">
                    <UserCheck className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-emerald-300">Tài khoản hợp lệ: {resolvedAccount.accountNumber}</div>
                    <div className="text-[10px] text-emerald-500">{resolvedAccount.accountType} · {resolvedAccount.currency} · {resolvedAccount.status}</div>
                  </div>
                  <span className="ml-auto text-emerald-400 font-bold text-xs">✓</span>
                </div>
              )}
            </div>

            {/* Amount */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">Số tiền chuyển</label>
              <div className="relative">
                <input type="number" required min="1" step="any" value={amount} onChange={(e) => setAmount(e.target.value)}
                  placeholder="500,000"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-sm text-white tabular-nums focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                <span className="absolute right-3.5 top-2.5 text-xs font-bold text-emerald-400">{selectedSource?.currency || 'VND'}</span>
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                {QUICK_AMOUNTS.map((val) => (
                  <button key={val} type="button" onClick={() => setAmount(String(val))}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer tabular-nums ${amount === String(val) ? 'bg-emerald-500 text-slate-950' : 'bg-slate-800 hover:bg-slate-700 text-slate-300'}`}>
                    {formatCurrency(val, selectedSource?.currency || 'VND')}
                  </button>
                ))}
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">Nội dung chuyển tiền</label>
              <input type="text" value={description} onChange={(e) => setDescription(e.target.value)}
                placeholder="Chuyển tiền mua sắm / SePay thanh toán"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500" />
            </div>

            <button type="submit" disabled={submitting || accounts.length === 0}
              className="w-full py-3.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 text-sm font-bold flex items-center justify-center gap-2 cursor-pointer transition-all shadow-lg shadow-emerald-500/20">
              <Send className="h-4 w-4" />
              {submitting ? 'Đang xác thực giao dịch...' : 'Tiếp tục chuyển tiền'}
            </button>
          </form>
        </div>

        {/* Right Panel: Frequent Beneficiaries + Tips */}
        <div className="lg:col-span-2 space-y-4">
          {/* Frequent Beneficiaries */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5">
            <h2 className="text-sm font-bold text-white mb-3">Người thụ hưởng thường gặp</h2>
            <div className="space-y-2">
              {FREQUENT_BENEFICIARIES.map((b) => (
                <button key={b.account} type="button"
                  onClick={() => { setTargetInput(b.account); handleLookup(b.account); }}
                  className="w-full flex items-center gap-3 p-3 rounded-2xl bg-slate-800/60 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 cursor-pointer transition-colors text-left">
                  <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center text-white font-bold text-sm shrink-0">
                    {b.initial}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-semibold text-slate-200">{b.name}</div>
                    <div className="text-[10px] text-slate-500 font-mono">{b.account} · {b.bank}</div>
                  </div>
                </button>
              ))}
              <div className="p-3 rounded-2xl border border-dashed border-slate-700 text-center text-[11px] text-slate-500">
                Danh sách người thụ hưởng sẽ được cập nhật sau khi bạn chuyển tiền
              </div>
            </div>
          </div>

          {/* Transfer Tips */}
          <div className="bg-gradient-to-br from-indigo-900/50 to-slate-900 border border-indigo-800/30 rounded-3xl p-5">
            <h2 className="text-sm font-bold text-white mb-3">Lưu ý chuyển tiền</h2>
            <ul className="space-y-2.5 text-xs text-slate-400">
              {[
                'Kiểm tra kỹ số tài khoản và tên người nhận trước khi xác nhận',
                'Giao dịch Napas 24/7 xử lý tức thời, không hoàn lại sau khi thành công',
                'Hạn mức chuyển tiền tối đa trong ngày: 500.000.000 VNĐ',
                'Mô tả giao dịch hiển thị trên sao kê của người nhận',
              ].map((tip, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-emerald-500 font-bold shrink-0">·</span>
                  <span>{tip}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {selectedSource && (
        <VietQRModal
          isOpen={showQrModal}
          onClose={() => setShowQrModal(false)}
          accountNumber={selectedSource.accountNumber}
          accountHolderName={customer?.fullName || user?.username || 'CHU TAI KHOAN'}
          bankName="MBBank (MB)"
        />
      )}
    </div>
  );
};
