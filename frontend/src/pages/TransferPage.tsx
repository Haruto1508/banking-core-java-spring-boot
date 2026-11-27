import React, { useEffect, useState } from 'react';
import { ArrowRight, CheckCircle2, Send } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { accountApi, transactionApi } from '../api/bankingApi';
import { extractErrorMessage } from '../api/client';
import type { BankAccount, TransactionRecord } from '../types/banking';
import { formatCurrency, formatDateTime, generateIdempotencyKey } from '../utils/format';

export const TransferPage: React.FC = () => {
  const { customer } = useAuth();
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [sourceAccountId, setSourceAccountId] = useState('');
  const [targetAccountId, setTargetAccountId] = useState('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<TransactionRecord | null>(null);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSource) return;

    setError(null);
    setSubmitting(true);
    try {
      const idempotencyKey = generateIdempotencyKey('TRF');
      const res = await transactionApi.transfer(
        {
          sourceAccountId,
          targetAccountId: targetAccountId.trim(),
          amount: Number(amount),
          currency: selectedSource.currency,
          description: description.trim() || 'Chuyển tiền nội bộ',
        },
        idempotencyKey
      );
      setReceipt(res.data.data);
      setAmount('');
      setDescription('');
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
        <div className="h-14 w-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 className="h-8 w-8" />
        </div>
        <h2 className="text-xl font-bold text-slate-900">Chuyển tiền thành công</h2>
        <p className="text-3xl font-bold text-emerald-600 tabular-nums my-3">
          {formatCurrency(Number(receipt.amount), receipt.currency)}
        </p>

        <div className="rounded-2xl bg-slate-50 border border-slate-200 p-4 text-left text-xs sm:text-sm space-y-2.5 my-5">
          <div className="flex justify-between gap-2">
            <span className="text-slate-500">Mã giao dịch</span>
            <span className="font-mono font-semibold text-slate-900">{receipt.transactionRef}</span>
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
            <span className="text-slate-500">Thời gian</span>
            <span className="text-slate-800">{formatDateTime(receipt.createdAt)}</span>
          </div>
        </div>

        <button
          onClick={() => setReceipt(null)}
          className="w-full py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold cursor-pointer"
        >
          Thực hiện giao dịch mới
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto">
      <div className="mb-5">
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Chuyển tiền nội bộ</h1>
        <p className="text-xs sm:text-sm text-slate-500">
          Giao dịch tức thời, bảo vệ chống trùng lặp bằng Idempotency-Key
        </p>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-7 shadow-xs">
        {error && (
          <div className="mb-4 rounded-xl bg-rose-50 border border-rose-200 px-4 py-3 text-xs sm:text-sm text-rose-700">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">Tài khoản nguồn</label>
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
                    {acc.accountNumber} ({acc.accountType}) —{' '}
                    {formatCurrency(Number(acc.balance), acc.currency)}
                  </option>
                ))
              )}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">
              Account UUID người nhận
            </label>
            <input
              type="text"
              required
              value={targetAccountId}
              onChange={(e) => setTargetAccountId(e.target.value)}
              placeholder="Ví dụ: 550e8400-e29b-41d4-a716-446655440000"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">
              Số tiền ({selectedSource?.currency || 'VND'})
            </label>
            <input
              type="number"
              required
              min="1"
              step="any"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="100000"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-base font-semibold tabular-nums focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            {selectedSource?.currency === 'VND' && (
              <div className="flex flex-wrap gap-2 mt-2">
                {[50000, 100000, 500000, 1000000].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setAmount(String(preset))}
                    className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-xs font-medium text-slate-700 cursor-pointer"
                  >
                    {formatCurrency(preset, 'VND')}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">Nội dung chuyển khoản</label>
            <input
              type="text"
              maxLength={255}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Thanh toán tiền ăn trưa"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <button
            type="submit"
            disabled={submitting || !sourceAccountId}
            className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-semibold text-sm flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            <Send className="h-4 w-4" />
            <span>{submitting ? 'Đang xử lý giao dịch...' : 'Xác nhận chuyển tiền'}</span>
            <ArrowRight className="h-4 w-4" />
          </button>
        </form>
      </div>
    </div>
  );
};
