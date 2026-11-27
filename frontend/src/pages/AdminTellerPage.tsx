import React, { useState } from 'react';
import {
  ArrowDownLeft,
  ArrowUpRight,
  CheckCircle2,
  Lock,
  Scale,
  Search,
  ShieldAlert,
  Unlock,
  UserCheck,
  Wallet,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { accountApi, reconciliationApi, transactionApi } from '../api/bankingApi';
import { extractErrorMessage } from '../api/client';
import type { BankAccount, ReconciliationReport } from '../types/banking';
import { formatCurrency } from '../utils/format';

const QUICK_DEPOSIT_AMOUNTS = [500_000, 1_000_000, 2_000_000, 5_000_000, 10_000_000];

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
    if (!val) { setResolvedAccount(null); return; }
    setResolving(true); setError(null);
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
    } catch { setResolvedAccount(null); } finally { setResolving(false); }
  };

  const getTargetAccountId = (): string => resolvedAccount ? resolvedAccount.id : accountInput.trim();

  const runAction = async (fn: () => Promise<void>) => {
    setError(null); setMessage(null); setLoading(true);
    try {
      await fn();
      if (resolvedAccount) {
        const refreshed = await accountApi.getById(resolvedAccount.id);
        setResolvedAccount(refreshed.data.data);
      }
    } catch (err) { setError(extractErrorMessage(err)); } finally { setLoading(false); }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-white">Quầy Giao Dịch Viên & Quản Trị</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Quyền hiện tại: <span className="font-bold text-emerald-400">{user?.role}</span> · Nộp tiền mặt, Rút tiền quầy, Phong tỏa & Đối soát
          </p>
        </div>
        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-500/15 border border-amber-500/20 text-amber-400 text-xs font-semibold self-start sm:self-auto">
          <ShieldAlert className="h-3.5 w-3.5" />
          Core Bank Admin Portal
        </div>
      </div>

      {/* Alert Row */}
      {error && <div className="rounded-2xl bg-rose-500/10 border border-rose-500/20 px-4 py-3 text-xs text-rose-400">{error}</div>}
      {message && (
        <div className="rounded-2xl bg-emerald-500/10 border border-emerald-500/20 px-4 py-3 text-xs text-emerald-400 flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{message}</span>
        </div>
      )}

      {/* Desktop 2-col | Mobile stacked */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        {/* Account Lookup + Cash Operations */}
        <div className="lg:col-span-3 bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 space-y-5">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-xl bg-emerald-500/15 flex items-center justify-center">
              <Wallet className="h-4 w-4 text-emerald-400" />
            </div>
            <h2 className="text-sm font-bold text-white">Tra cứu & Thao tác tài khoản</h2>
          </div>

          {/* Account Lookup */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-400">Số tài khoản hoặc UUID</label>
              {resolving && <span className="text-[11px] text-emerald-400 animate-pulse">Đang tra cứu...</span>}
            </div>
            <div className="relative">
              <input type="text" value={accountInput}
                onChange={(e) => { setAccountInput(e.target.value); handleResolveAccount(e.target.value); }}
                placeholder="ACC-DEMO-001 hoặc UUID"
                className="w-full pl-3.5 pr-10 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-sm text-white font-mono placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500" />
              <Search className="h-4 w-4 text-slate-500 absolute right-3 top-2.5" />
            </div>

            {resolvedAccount && (
              <div className="mt-3 p-4 rounded-2xl bg-slate-800/60 border border-slate-700 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-xl bg-emerald-500 text-white flex items-center justify-center shrink-0">
                      <UserCheck className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white">{resolvedAccount.accountNumber}</div>
                      <div className="text-[10px] text-slate-400">{resolvedAccount.accountType} · {resolvedAccount.currency}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-base font-black text-white tabular-nums">{formatCurrency(Number(resolvedAccount.balance), resolvedAccount.currency)}</div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                      resolvedAccount.status === 'ACTIVE' ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20' :
                      resolvedAccount.status === 'FROZEN' ? 'bg-amber-500/15 text-amber-400 border-amber-500/20' :
                      'bg-rose-500/15 text-rose-400 border-rose-500/20'
                    }`}>{resolvedAccount.status}</span>
                  </div>
                </div>
                <div className="text-[10px] text-slate-600 font-mono pt-1 border-t border-slate-700">UUID: {resolvedAccount.id}</div>
              </div>
            )}
          </div>

          {/* Amount Input */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div className="sm:col-span-3">
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">Số tiền mặt (Nộp / Rút)</label>
              <input type="number" min="1" step="any" value={amount} onChange={(e) => setAmount(e.target.value)}
                placeholder="1,000,000"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-sm text-white tabular-nums focus:outline-none focus:ring-2 focus:ring-emerald-500" />
              <div className="flex flex-wrap gap-1.5 mt-2">
                {QUICK_DEPOSIT_AMOUNTS.map((val) => (
                  <button key={val} type="button" onClick={() => setAmount(String(val))}
                    className={`px-2 py-1 rounded-lg text-[10px] font-semibold cursor-pointer transition-colors tabular-nums ${amount === String(val) ? 'bg-emerald-500 text-slate-950' : 'bg-slate-800 hover:bg-slate-700 text-slate-400'}`}>
                    {(val / 1_000_000).toFixed(1)}M
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">Tiền tệ</label>
              <select value={currency} onChange={(e) => setCurrency(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500">
                <option value="VND">VND</option>
                <option value="USD">USD</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1.5">Ghi chú giao dịch viên</label>
            <input type="text" value={description} onChange={(e) => setDescription(e.target.value)}
              placeholder="Nộp tiền mặt tại quầy giao dịch"
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500" />
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <button type="button" disabled={loading || !getTargetAccountId() || !amount}
              onClick={() => runAction(async () => {
                const res = await transactionApi.deposit({ accountId: getTargetAccountId(), amount: Number(amount), currency, description: description || 'Teller Deposit' });
                setMessage(`Nạp tiền thành công! Mã: ${res.data.data.transactionRef}`);
                setAmount('');
              })}
              className="py-3 px-2 rounded-2xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-500/20">
              <ArrowDownLeft className="h-3.5 w-3.5" />
              Nạp tiền
            </button>

            <button type="button" disabled={loading || !getTargetAccountId() || !amount}
              onClick={() => runAction(async () => {
                const res = await transactionApi.withdraw({ accountId: getTargetAccountId(), amount: Number(amount), currency, description: description || 'Teller Withdrawal' });
                setMessage(`Rút tiền thành công! Mã: ${res.data.data.transactionRef}`);
                setAmount('');
              })}
              className="py-3 px-2 rounded-2xl bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-white text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-1.5">
              <ArrowUpRight className="h-3.5 w-3.5" />
              Rút tiền
            </button>

            <button type="button" disabled={loading || !getTargetAccountId()}
              onClick={() => runAction(async () => {
                await accountApi.freeze(getTargetAccountId());
                setMessage('Đã phong tỏa (FROZEN) tài khoản thành công.');
              })}
              className="py-3 px-2 rounded-2xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/20 disabled:opacity-50 text-amber-400 text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-1.5">
              <Lock className="h-3.5 w-3.5" />
              Phong tỏa
            </button>

            <button type="button" disabled={loading || !getTargetAccountId()}
              onClick={() => runAction(async () => {
                await accountApi.unfreeze(getTargetAccountId());
                setMessage('Đã mở khóa (ACTIVE) tài khoản thành công.');
              })}
              className="py-3 px-2 rounded-2xl bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-300 text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-1.5 border border-slate-700">
              <Unlock className="h-3.5 w-3.5" />
              Mở khóa
            </button>
          </div>
        </div>

        {/* Reconciliation Panel */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 space-y-4">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-xl bg-indigo-500/15 flex items-center justify-center">
                <Scale className="h-4 w-4 text-indigo-400" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-white">Đối Soát Sổ Cái Kép</h2>
                <p className="text-[10px] text-slate-500">Double-Entry Ledger Reconciliation</p>
              </div>
            </div>

            <p className="text-xs text-slate-400">Kiểm tra tính toàn vẹn: Số dư tài khoản == Tổng Nợ (Debit) - Tổng Có (Credit) từ journal entries.</p>

            <button type="button" disabled={loading || !getTargetAccountId()}
              onClick={() => runAction(async () => {
                const res = await reconciliationApi.reconcileAccount(getTargetAccountId());
                setReconcileReport(res.data.data);
              })}
              className="w-full py-3 rounded-2xl bg-indigo-500/15 hover:bg-indigo-500/25 border border-indigo-500/20 disabled:opacity-50 text-indigo-400 text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-2">
              <Scale className="h-4 w-4" />
              Thực hiện đối soát tức thời
            </button>

            {reconcileReport && (
              <div className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700 space-y-3">
                <div className="text-xs font-bold text-white mb-2">Kết quả đối soát</div>
                {[
                  { label: 'Tài khoản', value: reconcileReport.accountNumber, mono: true },
                  { label: 'Số dư bảng Accounts', value: formatCurrency(reconcileReport.accountBalance, reconcileReport.currency) },
                  { label: 'Số dư từ Ledger Journals', value: formatCurrency(reconcileReport.ledgerBalance, reconcileReport.currency) },
                ].map(({ label, value, mono }) => (
                  <div key={label} className="flex justify-between gap-2 text-xs">
                    <span className="text-slate-400">{label}</span>
                    <span className={`font-semibold text-slate-200 ${mono ? 'font-mono' : 'tabular-nums'}`}>{value}</span>
                  </div>
                ))}
                <div className="pt-2 border-t border-slate-700 flex justify-between gap-2 text-xs">
                  <span className="text-slate-400">Chênh lệch (Discrepancy)</span>
                  <span className={`font-mono font-bold ${reconcileReport.discrepancy === 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {reconcileReport.discrepancy === 0 ? '0.0000 ✓ KHỚP' : String(reconcileReport.discrepancy)}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Quick Ref Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Tài khoản mẫu hệ thống</h3>
            <div className="space-y-2 text-xs font-mono text-slate-500">
              {[
                { label: 'Demo User', acc: 'ACC-DEMO-001' },
                { label: 'Teller', acc: 'ACC-DEMO-002' },
                { label: 'GL Vault', acc: 'SYS-GL-VAULT-001' },
              ].map(({ label, acc }) => (
                <div key={acc} className="flex justify-between items-center p-2 rounded-xl bg-slate-800 cursor-pointer hover:bg-slate-700 transition-colors"
                  onClick={() => { setAccountInput(acc); handleResolveAccount(acc); }}>
                  <span className="text-slate-400">{label}</span>
                  <span className="text-emerald-400">{acc}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
