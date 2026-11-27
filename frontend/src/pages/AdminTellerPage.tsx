import React, { useState } from 'react';
import {
  CheckCircle2,
  Lock,
  Scale,
  ShieldAlert,
  Unlock,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { accountApi, reconciliationApi, transactionApi } from '../api/bankingApi';
import { extractErrorMessage } from '../api/client';
import type { BankAccount, ReconciliationReport } from '../types/banking';
import { formatCurrency } from '../utils/format';

export const AdminTellerPage: React.FC = () => {
  const { user } = useAuth();
  const [accountInput, setAccountInput] = useState('');
  const [resolvedAccount, setResolvedAccount] = useState<BankAccount | null>(null);
  const [resolving, setResolving] = useState(false);
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('VND');
  const [description, setDescription] = useState('');
  const [reconcileReport, setReconcileReport] = useState<ReconciliationReport | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleResolveAccount = async (inputVal: string) => {
    const val = inputVal.trim();
    if (!val) {
      setResolvedAccount(null);
      return;
    }
    setResolving(true);
    setError(null);
    try {
      if (val.startsWith('ACC-') || val.startsWith('SYS-')) {
        const res = await accountApi.lookupByNumber(val);
        setResolvedAccount(res.data.data);
      } else if (val.length === 36 && val.includes('-')) {
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

  const getTargetAccountId = (): string => {
    if (resolvedAccount) return resolvedAccount.id;
    return accountInput.trim();
  };

  const runAction = async (fn: () => Promise<void>) => {
    setError(null);
    setMessage(null);
    setLoading(true);
    try {
      await fn();
      if (resolvedAccount) {
        // Refresh account details
        const refreshed = await accountApi.getById(resolvedAccount.id);
        setResolvedAccount(refreshed.data.data);
      }
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Quầy Giao Dịch Viên & Quản Trị</h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Quyền hiện tại: <span className="font-semibold text-slate-800">{user?.role}</span> • Nộp tiền mặt, Rút tiền quầy, Phong tỏa & Đối soát
          </p>
        </div>
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900 text-white text-xs font-semibold self-start sm:self-auto">
          <ShieldAlert className="h-3.5 w-3.5 text-amber-400" />
          <span>Core Bank Admin Portal</span>
        </div>
      </div>

      {error && (
        <div className="rounded-2xl bg-rose-50 border border-rose-200 px-4 py-3 text-xs sm:text-sm text-rose-700">
          {error}
        </div>
      )}
      {message && (
        <div className="rounded-2xl bg-emerald-50 border border-emerald-200 px-4 py-3 text-xs sm:text-sm text-emerald-800 flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
          <span>{message}</span>
        </div>
      )}

      {/* Account lookup & operations */}
      <div className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-7 space-y-4 shadow-xs">
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-xs font-semibold text-slate-700">
              Số tài khoản hoặc UUID khách hàng
            </label>
            {resolving && <span className="text-[11px] text-emerald-600 animate-pulse">Đang tra cứu...</span>}
          </div>
          <input
            type="text"
            value={accountInput}
            onChange={(e) => {
              setAccountInput(e.target.value);
              handleResolveAccount(e.target.value);
            }}
            placeholder="ACC-DEMO-001 hoặc 30000000-0000-0000-0000-000000000003"
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />

          {resolvedAccount && (
            <div className="mt-2.5 p-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs flex items-center justify-between">
              <div>
                <div className="font-bold text-slate-900">
                  {resolvedAccount.accountNumber} ({resolvedAccount.accountType})
                </div>
                <div className="text-[11px] text-slate-500 font-mono">
                  UUID: {resolvedAccount.id} • Trạng thái: <span className="font-semibold text-emerald-600">{resolvedAccount.status}</span>
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm font-extrabold text-slate-900 tabular-nums">
                  {formatCurrency(Number(resolvedAccount.balance), resolvedAccount.currency)}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Số tiền mặt (Nộp / Rút)</label>
            <input
              type="number"
              min="1"
              step="any"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="1000000"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Tiền tệ</label>
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
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">Ghi chú giao dịch viên</label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Nộp tiền mặt tại quầy giao dịch"
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm"
          />
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2">
          <button
            type="button"
            disabled={loading || !getTargetAccountId() || !amount}
            onClick={() =>
              runAction(async () => {
                const res = await transactionApi.deposit({
                  accountId: getTargetAccountId(),
                  amount: Number(amount),
                  currency,
                  description: description || 'Teller Deposit',
                });
                setMessage(`Nạp tiền thành công! Mã giao dịch: ${res.data.data.transactionRef}`);
                setAmount('');
              })
            }
            className="py-3 px-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold transition-colors cursor-pointer shadow-xs"
          >
            Nạp tiền mặt
          </button>

          <button
            type="button"
            disabled={loading || !getTargetAccountId() || !amount}
            onClick={() =>
              runAction(async () => {
                const res = await transactionApi.withdraw({
                  accountId: getTargetAccountId(),
                  amount: Number(amount),
                  currency,
                  description: description || 'Teller Withdrawal',
                });
                setMessage(`Rút tiền thành công! Mã giao dịch: ${res.data.data.transactionRef}`);
                setAmount('');
              })
            }
            className="py-3 px-3 rounded-2xl bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white text-xs font-bold transition-colors cursor-pointer shadow-xs"
          >
            Rút tiền mặt
          </button>

          <button
            type="button"
            disabled={loading || !getTargetAccountId()}
            onClick={() =>
              runAction(async () => {
                await accountApi.freeze(getTargetAccountId());
                setMessage('Đã phong tỏa (FROZEN) tài khoản thành công.');
              })
            }
            className="py-3 px-3 rounded-2xl bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-1"
          >
            <Lock className="h-3.5 w-3.5" />
            Phong tỏa
          </button>

          <button
            type="button"
            disabled={loading || !getTargetAccountId()}
            onClick={() =>
              runAction(async () => {
                await accountApi.unfreeze(getTargetAccountId());
                setMessage('Đã mở khóa (ACTIVE) tài khoản thành công.');
              })
            }
            className="py-3 px-3 rounded-2xl bg-slate-100 hover:bg-slate-200 disabled:opacity-50 text-slate-800 text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-1"
          >
            <Unlock className="h-3.5 w-3.5" />
            Mở khóa
          </button>
        </div>
      </div>

      {/* Double-Entry Ledger Reconciliation */}
      <div className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-7 space-y-4 shadow-xs">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <Scale className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900">Đối Soát Sổ Cái Kép (Double-Entry Ledger)</h2>
            <p className="text-xs text-slate-500">
              Kiểm tra tính toàn vẹn: Số dư tài khoản == Tổng Nợ (Debit) - Tổng Có (Credit)
            </p>
          </div>
        </div>

        <button
          type="button"
          disabled={loading || !getTargetAccountId()}
          onClick={() =>
            runAction(async () => {
              const res = await reconciliationApi.reconcileAccount(getTargetAccountId());
              setReconcileReport(res.data.data);
            })
          }
          className="w-full py-3 px-4 rounded-2xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-2"
        >
          <Scale className="h-4 w-4" />
          <span>Thực hiện đối soát tức thời</span>
        </button>

        {reconcileReport && (
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs space-y-2">
            <div className="flex justify-between">
              <span className="text-slate-500">Tài khoản:</span>
              <span className="font-mono font-bold text-slate-800">{reconcileReport.accountNumber}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Số dư bảng Accounts:</span>
              <span className="font-bold tabular-nums text-slate-900">
                {formatCurrency(reconcileReport.accountBalance, reconcileReport.currency)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Số dư tính từ Ledger Journals:</span>
              <span className="font-bold tabular-nums text-slate-900">
                {formatCurrency(reconcileReport.ledgerBalance, reconcileReport.currency)}
              </span>
            </div>
            <div className="flex justify-between pt-2 border-t border-slate-200">
              <span className="text-slate-500">Chênh lệch (Discrepancy):</span>
              <span
                className={`font-mono font-bold ${
                  reconcileReport.discrepancy === 0 ? 'text-emerald-600' : 'text-rose-600'
                }`}
              >
                {reconcileReport.discrepancy === 0 ? '0.0000 (KHỚP HOÀN TOÀN)' : reconcileReport.discrepancy}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
