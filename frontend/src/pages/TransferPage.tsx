import React, { useEffect, useState } from 'react';
import {
  CheckCircle2,
  QrCode,
  Search,
  Send,
  UserCheck,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { accountApi, transactionApi } from '../api/bankingApi';
import { extractErrorMessage } from '../api/client';
import type { BankAccount, TransactionRecord } from '../types/banking';
import { formatCurrency, formatDateTime, generateIdempotencyKey } from '../utils/format';
import { VietQRModal } from '../components/VietQRModal';

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
      const activeAccounts = res.data.data.filter((a) => a.status === 'ACTIVE');
      setAccounts(activeAccounts);
      if (activeAccounts.length > 0 && !sourceAccountId) {
        setSourceAccountId(activeAccounts[0].id);
      }
    } catch {
      // Handled gracefully
    }
  };

  useEffect(() => {
    loadAccounts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customer?.id]);

  const selectedSource = accounts.find((a) => a.id === sourceAccountId);

  // Auto-resolve account number or UUID
  const handleLookup = async (inputVal: string) => {
    const trimmed = inputVal.trim();
    if (!trimmed) {
      setResolvedAccount(null);
      return;
    }

    setResolving(true);
    setError(null);
    try {
      // Try resolving by account number first (e.g. ACC-DEMO-001 or SYS-GL-VAULT-001)
      if (trimmed.startsWith('ACC-') || trimmed.startsWith('SYS-')) {
        const res = await accountApi.lookupByNumber(trimmed);
        setResolvedAccount(res.data.data);
      } else if (trimmed.length === 36 && trimmed.includes('-')) {
        // Looks like UUID
        const res = await accountApi.getById(trimmed);
        setResolvedAccount(res.data.data);
      } else {
        // Fallback try lookup by number
        const res = await accountApi.lookupByNumber(trimmed);
        setResolvedAccount(res.data.data);
      }
    } catch {
      setResolvedAccount(null);
    } finally {
      setResolving(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSource) return;

    const finalTargetId = resolvedAccount ? resolvedAccount.id : targetInput.trim();
    if (!finalTargetId) {
      setError('Vui lòng nhập số tài khoản hoặc UUID người nhận hợp lệ.');
      return;
    }

    setError(null);
    setSubmitting(true);
    try {
      const idempotencyKey = generateIdempotencyKey('TRF');
      const res = await transactionApi.transfer(
        {
          sourceAccountId,
          targetAccountId: finalTargetId,
          amount: Number(amount),
          currency: selectedSource.currency,
          description: description.trim() || 'Chuyển tiền nội bộ 24/7',
        },
        idempotencyKey
      );
      setReceipt(res.data.data);
      setAmount('');
      setDescription('');
      setTargetInput('');
      setResolvedAccount(null);
      await loadAccounts();
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  if (receipt) {
    return (
      <div className="max-w-lg mx-auto bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm text-center">
        <div className="h-16 w-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-4 animate-bounce">
          <CheckCircle2 className="h-10 w-10" />
        </div>
        <span className="inline-block px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold mb-2">
          Giao dịch Napas 24/7 Thành Công
        </span>
        <h2 className="text-xl sm:text-2xl font-bold text-slate-900">Chuyển tiền hoàn tất</h2>
        <p className="text-3xl sm:text-4xl font-extrabold text-emerald-600 tabular-nums my-3">
          {formatCurrency(Number(receipt.amount), receipt.currency)}
        </p>

        <div className="rounded-2xl bg-slate-50 border border-slate-200/80 p-4 text-left text-xs sm:text-sm space-y-2.5 my-5">
          <div className="flex justify-between gap-2">
            <span className="text-slate-500">Mã giao dịch</span>
            <span className="font-mono font-bold text-slate-900">{receipt.transactionRef}</span>
          </div>
          <div className="flex justify-between gap-2">
            <span className="text-slate-500">Trạng thái</span>
            <span className="font-semibold text-emerald-600">{receipt.status}</span>
          </div>
          <div className="flex justify-between gap-2">
            <span className="text-slate-500">Nội dung</span>
            <span className="text-slate-800 text-right">{receipt.description || '—'}</span>
          </div>
          <div className="flex justify-between gap-2">
            <span className="text-slate-500">Thời gian ghi sổ</span>
            <span className="text-slate-800">{formatDateTime(receipt.createdAt)}</span>
          </div>
        </div>

        <button
          onClick={() => setReceipt(null)}
          className="w-full py-3 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold cursor-pointer transition-colors shadow-sm"
        >
          Thực hiện giao dịch mới
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Chuyển tiền 24/7</h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Hỗ trợ chuyển bằng Số tài khoản (ACC-...) hoặc Quét mã VietQR SePay
          </p>
        </div>
        {selectedSource && (
          <button
            onClick={() => setShowQrModal(true)}
            className="px-3.5 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <QrCode className="h-4 w-4" />
            <span>Mã QR của tôi</span>
          </button>
        )}
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-7 shadow-xs">
        {error && (
          <div className="mb-4 rounded-xl bg-rose-50 border border-rose-200 px-4 py-3 text-xs sm:text-sm text-rose-700">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Tài khoản trích tiền</label>
            <select
              value={sourceAccountId}
              onChange={(e) => setSourceAccountId(e.target.value)}
              required
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              {accounts.length === 0 ? (
                <option value="">Không có tài khoản ACTIVE</option>
              ) : (
                accounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.accountNumber} ({acc.accountType}) — {formatCurrency(Number(acc.balance), acc.currency)}
                  </option>
                ))
              )}
            </select>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-slate-700">
                Tài khoản người nhận (Số tài khoản hoặc UUID)
              </label>
              {resolving && <span className="text-[11px] text-emerald-600 animate-pulse">Đang tìm tài khoản...</span>}
            </div>

            <div className="relative">
              <input
                type="text"
                required
                value={targetInput}
                onChange={(e) => {
                  setTargetInput(e.target.value);
                  handleLookup(e.target.value);
                }}
                placeholder="Nhập số tài khoản (ví dụ ACC-DEMO-001 hoặc UUID)"
                className="w-full pl-3.5 pr-10 py-2.5 rounded-xl border border-slate-200 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <button
                type="button"
                onClick={() => handleLookup(targetInput)}
                className="absolute right-2 top-2 p-1 text-slate-400 hover:text-emerald-600 rounded cursor-pointer"
                title="Tra cứu"
              >
                <Search className="h-4 w-4" />
              </button>
            </div>

            {/* Resolved Beneficiary Card */}
            {resolvedAccount && (
              <div className="mt-2 p-3 rounded-2xl bg-emerald-50/80 border border-emerald-200 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2.5">
                  <div className="h-8 w-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold">
                    <UserCheck className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="font-bold text-emerald-950">
                      Tài khoản hợp lệ: {resolvedAccount.accountNumber}
                    </div>
                    <div className="text-[11px] text-emerald-700">
                      Loại: {resolvedAccount.accountType} • Tiền tệ: {resolvedAccount.currency} • Trạng thái: {resolvedAccount.status}
                    </div>
                  </div>
                </div>
                <span className="text-emerald-700 font-bold">✓ Xác thực</span>
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Số tiền chuyển</label>
            <div className="relative">
              <input
                type="number"
                required
                min="1"
                step="any"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="500000"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <span className="absolute right-3.5 top-2.5 text-xs font-bold text-slate-400">
                {selectedSource?.currency || 'VND'}
              </span>
            </div>

            {/* Quick Amount Chips */}
            <div className="flex flex-wrap gap-2 mt-2">
              {[50000, 100000, 200000, 500000, 1000000, 2000000].map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setAmount(String(val))}
                  className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-[11px] font-medium text-slate-700 transition-colors cursor-pointer tabular-nums"
                >
                  {formatCurrency(val, selectedSource?.currency || 'VND')}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Nội dung chuyển tiền</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Chuyển tiền mua sắm / SePay thanh toán"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={submitting || accounts.length === 0}
              className="w-full py-3.5 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm hover:shadow"
            >
              <Send className="h-4 w-4" />
              <span>{submitting ? 'Đang xác thực giao dịch...' : 'Tiếp tục chuyển tiền'}</span>
            </button>
          </div>
        </form>
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
