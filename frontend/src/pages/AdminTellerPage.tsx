import React, { useState } from 'react';
import { CheckCircle2, Scale, ShieldAlert } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { accountApi, reconciliationApi, transactionApi } from '../api/bankingApi';
import { extractErrorMessage } from '../api/client';
import type { ReconciliationReport } from '../types/banking';
import { formatCurrency } from '../utils/format';

export const AdminTellerPage: React.FC = () => {
  const { user } = useAuth();
  const [accountId, setAccountId] = useState('');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('VND');
  const [description, setDescription] = useState('');
  const [reconcileReport, setReconcileReport] = useState<ReconciliationReport | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const runAction = async (fn: () => Promise<void>) => {
    setError(null);
    setMessage(null);
    setLoading(true);
    try {
      await fn();
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Quầy Giao Dịch Viên & Quản Trị</h1>
        <p className="text-xs sm:text-sm text-slate-500">
          Vai trò hiện tại: <span className="font-semibold text-slate-800">{user?.role}</span> • Nạp/rút tiền mặt, phong tỏa và đối soát sổ cái
        </p>
      </div>

      {error && (
        <div className="rounded-xl bg-rose-50 border border-rose-200 px-4 py-3 text-xs sm:text-sm text-rose-700">
          {error}
        </div>
      )}
      {message && (
        <div className="rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3 text-xs sm:text-sm text-emerald-700 flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{message}</span>
        </div>
      )}

      <div className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-6 space-y-4 shadow-xs">
        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1.5">Target Account UUID</label>
          <input
            type="text"
            value={accountId}
            onChange={(e) => setAccountId(e.target.value)}
            placeholder="Nhập UUID tài khoản cần thao tác"
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-mono"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-slate-700 mb-1.5">Số tiền (Nạp / Rút)</label>
            <input
              type="number"
              min="1"
              step="any"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="1000000"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm tabular-nums"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">Tiền tệ</label>
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm bg-white"
            >
              <option value="VND">VND</option>
              <option value="USD">USD</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1.5">Ghi chú giao dịch viên</label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Nộp tiền mặt tại quầy"
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm"
          />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2">
          <button
            type="button"
            disabled={loading || !accountId || !amount}
            onClick={() =>
              runAction(async () => {
                const res = await transactionApi.deposit({
                  accountId: accountId.trim(),
                  amount: Number(amount),
                  currency,
                  description: description || 'Teller Deposit',
                });
                setMessage(`Nạp tiền thành công: ${res.data.data.transactionRef}`);
              })
            }
            className="py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-semibold cursor-pointer"
          >
            Nạp tiền
          </button>

          <button
            type="button"
            disabled={loading || !accountId || !amount}
            onClick={() =>
              runAction(async () => {
                const res = await transactionApi.withdraw({
                  accountId: accountId.trim(),
                  amount: Number(amount),
                  currency,
                  description: description || 'Teller Withdrawal',
                });
                setMessage(`Rút tiền thành công: ${res.data.data.transactionRef}`);
              })
            }
            className="py-2.5 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white text-xs font-semibold cursor-pointer"
          >
            Rút tiền
          </button>

          <button
            type="button"
            disabled={loading || !accountId}
            onClick={() =>
              runAction(async () => {
                await accountApi.freeze(accountId.trim());
                setMessage('Đã phong tỏa (FROZEN) tài khoản.');
              })
            }
            className="py-2.5 px-3 rounded-xl bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white text-xs font-semibold inline-flex items-center justify-center gap-1 cursor-pointer"
          >
            <ShieldAlert className="h-3.5 w-3.5" />
            Phong tỏa
          </button>

          <button
            type="button"
            disabled={loading || !accountId}
            onClick={() =>
              runAction(async () => {
                await accountApi.unfreeze(accountId.trim());
                setMessage('Đã mở phong tỏa (ACTIVE) tài khoản.');
              })
            }
            className="py-2.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 disabled:opacity-50 text-slate-800 text-xs font-semibold cursor-pointer"
          >
            Mở khóa
          </button>
        </div>

        {user?.role === 'ADMIN' && (
          <div className="pt-3 border-t border-slate-100">
            <button
              type="button"
              disabled={loading || !accountId}
              onClick={() =>
                runAction(async () => {
                  const res = await reconciliationApi.reconcileAccount(accountId.trim());
                  setReconcileReport(res.data.data);
                })
              }
              className="w-full py-2.5 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-800 text-xs font-semibold inline-flex items-center justify-center gap-2 cursor-pointer"
            >
              <Scale className="h-4 w-4" />
              Đối soát số dư với Sổ cái (Double-Entry Reconciliation)
            </button>
          </div>
        )}
      </div>

      {reconcileReport && (
        <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs space-y-2 text-xs sm:text-sm">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-slate-900">
              Kết quả đối soát: {reconcileReport.accountNumber}
            </span>
            <span
              className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                reconcileReport.balanced
                  ? 'bg-emerald-100 text-emerald-700'
                  : 'bg-rose-100 text-rose-700'
              }`}
            >
              {reconcileReport.balanced ? 'BALANCED (KHỚP 100%)' : 'UNBALANCED'}
            </span>
          </div>
          <div className="flex justify-between text-slate-600">
            <span>Số dư Account:</span>
            <span className="font-mono font-semibold">
              {formatCurrency(reconcileReport.accountBalance, reconcileReport.currency)}
            </span>
          </div>
          <div className="flex justify-between text-slate-600">
            <span>Tổng Sổ cái (CREDIT - DEBIT):</span>
            <span className="font-mono font-semibold">
              {formatCurrency(reconcileReport.ledgerBalance, reconcileReport.currency)}
            </span>
          </div>
          <div className="flex justify-between text-slate-600">
            <span>Chênh lệch (Discrepancy):</span>
            <span className="font-mono font-semibold">{reconcileReport.discrepancy}</span>
          </div>
        </div>
      )}
    </div>
  );
};
