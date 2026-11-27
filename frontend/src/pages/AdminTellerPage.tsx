import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation();
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
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 leading-tight">{t('teller.title')}</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {t('teller.desc')} <span className="font-bold text-sky-700">{user?.role}</span> · {t('teller.roleDesc')}
          </p>
        </div>
        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-sky-50 border border-sky-200 text-sky-700 text-xs font-bold self-start sm:self-auto shadow-xs">
          <ShieldAlert className="h-3.5 w-3.5 text-sky-600" />
          {t('teller.adminBadge')}
        </div>
      </div>

      {/* Alert Row */}
      {error && <div className="rounded-2xl bg-rose-50 border border-rose-200 px-4 py-3 text-xs text-rose-700 font-medium">{error}</div>}
      {message && (
        <div className="rounded-2xl bg-emerald-50 border border-emerald-200 px-4 py-3 text-xs text-emerald-700 font-bold flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{message}</span>
        </div>
      )}

      {/* Desktop 2-col | Mobile Stacked */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        {/* Account Lookup + Cash Operations */}
        <div className="lg:col-span-3 bg-white border border-sky-100 rounded-3xl p-5 sm:p-6 space-y-5 shadow-xs">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-xl bg-sky-50 text-sky-600 border border-sky-200/80 flex items-center justify-center">
              <Wallet className="h-4 w-4" />
            </div>
            <h2 className="text-sm font-extrabold text-slate-900">{t('teller.lookupTitle')}</h2>
          </div>

          {/* Account Lookup */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-slate-700">{t('teller.lookupLabel')}</label>
              {resolving && <span className="text-[11px] text-sky-600 animate-pulse font-medium">{t('teller.resolving')}</span>}
            </div>
            <div className="relative">
              <input
                type="text"
                value={accountInput}
                onChange={(e) => { setAccountInput(e.target.value); handleResolveAccount(e.target.value); }}
                placeholder="ACC-DEMO-001 / UUID"
                className="w-full pl-3.5 pr-10 py-2.5 rounded-xl bg-white border border-slate-200 text-sm text-slate-800 font-mono placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
              <Search className="h-4 w-4 text-slate-400 absolute right-3 top-2.5" />
            </div>

            {resolvedAccount && (
              <div className="mt-3 p-4 rounded-2xl bg-sky-50/70 border border-sky-200 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="h-8 w-8 rounded-xl bg-sky-500 text-white flex items-center justify-center shrink-0 shadow-xs">
                      <UserCheck className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-900">{resolvedAccount.accountNumber}</div>
                      <div className="text-[10px] text-slate-500">{t(`accountTypes.${resolvedAccount.accountType}`)} · {resolvedAccount.currency}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-base font-black text-slate-900 tabular-nums">
                      {formatCurrency(Number(resolvedAccount.balance), resolvedAccount.currency)}
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                      resolvedAccount.status === 'ACTIVE'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : resolvedAccount.status === 'FROZEN'
                        ? 'bg-amber-50 text-amber-700 border-amber-200'
                        : 'bg-rose-50 text-rose-700 border-rose-200'
                    }`}>
                      {t(`status.${resolvedAccount.status}`)}
                    </span>
                  </div>
                </div>
                <div className="text-[10px] text-slate-400 font-mono pt-1 border-t border-sky-100">
                  UUID: {resolvedAccount.id}
                </div>
              </div>
            )}
          </div>

          {/* Amount Input */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div className="sm:col-span-3">
              <label className="block text-xs font-bold text-slate-700 mb-1.5">{t('teller.cashAmount')}</label>
              <input
                type="number"
                min="1"
                step="any"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="1,000,000"
                className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 text-sm font-bold text-slate-800 tabular-nums focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
              <div className="flex flex-wrap gap-1.5 mt-2">
                {QUICK_DEPOSIT_AMOUNTS.map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setAmount(String(val))}
                    className={`px-2 py-1 rounded-lg text-[10px] font-bold cursor-pointer transition-colors tabular-nums ${
                      amount === String(val)
                        ? 'bg-sky-600 text-white shadow-xs'
                        : 'bg-sky-50 hover:bg-sky-100 text-sky-800 border border-sky-100'
                    }`}
                  >
                    {(val / 1_000_000).toFixed(1)}M
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">{t('common.currency')}</label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500"
              >
                <option value="VND">VND</option>
                <option value="USD">USD</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">{t('teller.tellerNote')}</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Nộp tiền mặt tại quầy giao dịch"
              className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <button
              type="button"
              disabled={loading || !getTargetAccountId() || !amount}
              onClick={() => runAction(async () => {
                const res = await transactionApi.deposit({
                  accountId: getTargetAccountId(),
                  amount: Number(amount),
                  currency,
                  description: description || 'Teller Deposit',
                });
                setMessage(t('teller.depositSuccess', { ref: res.data.data.transactionRef }));
                setAmount('');
              })}
              className="py-3 px-2 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 disabled:opacity-50 text-white text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-md shadow-emerald-500/15"
            >
              <ArrowDownLeft className="h-3.5 w-3.5" />
              {t('teller.depositBtn')}
            </button>

            <button
              type="button"
              disabled={loading || !getTargetAccountId() || !amount}
              onClick={() => runAction(async () => {
                const res = await transactionApi.withdraw({
                  accountId: getTargetAccountId(),
                  amount: Number(amount),
                  currency,
                  description: description || 'Teller Withdrawal',
                });
                setMessage(t('teller.withdrawSuccess', { ref: res.data.data.transactionRef }));
                setAmount('');
              })}
              className="py-3 px-2 rounded-2xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 disabled:opacity-50 text-white text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-md shadow-sky-500/15"
            >
              <ArrowUpRight className="h-3.5 w-3.5" />
              {t('teller.withdrawBtn')}
            </button>

            <button
              type="button"
              disabled={loading || !getTargetAccountId()}
              onClick={() => runAction(async () => {
                await accountApi.freeze(getTargetAccountId());
                setMessage(t('teller.freezeSuccess'));
              })}
              className="py-3 px-2 rounded-2xl bg-amber-50 hover:bg-amber-100 border border-amber-200 disabled:opacity-50 text-amber-700 text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-1.5"
            >
              <Lock className="h-3.5 w-3.5" />
              {t('teller.freezeBtn')}
            </button>

            <button
              type="button"
              disabled={loading || !getTargetAccountId()}
              onClick={() => runAction(async () => {
                await accountApi.unfreeze(getTargetAccountId());
                setMessage(t('teller.unfreezeSuccess'));
              })}
              className="py-3 px-2 rounded-2xl bg-slate-50 hover:bg-slate-100 disabled:opacity-50 text-slate-700 text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-1.5 border border-slate-200"
            >
              <Unlock className="h-3.5 w-3.5" />
              {t('teller.unfreezeBtn')}
            </button>
          </div>
        </div>

        {/* Reconciliation Panel */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white border border-sky-100 rounded-3xl p-5 sm:p-6 space-y-4 shadow-xs">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-200/80 flex items-center justify-center">
                <Scale className="h-4 w-4" />
              </div>
              <div>
                <h2 className="text-sm font-extrabold text-slate-900">{t('teller.reconcileTitle')}</h2>
                <p className="text-[10px] text-slate-400 font-medium">{t('teller.reconcileSub')}</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">{t('teller.reconcileDesc')}</p>

            <button
              type="button"
              disabled={loading || !getTargetAccountId()}
              onClick={() => runAction(async () => {
                const res = await reconciliationApi.reconcileAccount(getTargetAccountId());
                setReconcileReport(res.data.data);
              })}
              className="w-full py-3 rounded-2xl bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 disabled:opacity-50 text-indigo-700 text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-2 shadow-2xs"
            >
              <Scale className="h-4 w-4" />
              {t('teller.reconcileBtn')}
            </button>

            {reconcileReport && (
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
                <div className="text-xs font-bold text-slate-900 mb-2">{t('teller.reconcileResult')}</div>
                {[
                  { label: t('teller.lookupLabel'), value: reconcileReport.accountNumber, mono: true },
                  { label: t('teller.accountBalance'), value: formatCurrency(reconcileReport.accountBalance, reconcileReport.currency) },
                  { label: t('teller.ledgerBalance'), value: formatCurrency(reconcileReport.ledgerBalance, reconcileReport.currency) },
                ].map(({ label, value, mono }) => (
                  <div key={label} className="flex justify-between gap-2 text-xs">
                    <span className="text-slate-500">{label}</span>
                    <span className={`font-bold text-slate-800 ${mono ? 'font-mono' : 'tabular-nums'}`}>{value}</span>
                  </div>
                ))}
                <div className="pt-2 border-t border-slate-200 flex justify-between gap-2 text-xs">
                  <span className="text-slate-500">{t('teller.discrepancy')}</span>
                  <span className={`font-mono font-bold ${reconcileReport.discrepancy === 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {reconcileReport.discrepancy === 0 ? t('teller.discrepancyZero') : String(reconcileReport.discrepancy)}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Sample Accounts */}
          <div className="bg-sky-50/50 border border-sky-100 rounded-3xl p-5 shadow-xs">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">{t('teller.sampleAccounts')}</h3>
            <div className="space-y-2 text-xs font-mono">
              {[
                { label: 'Demo User', acc: 'ACC-DEMO-001' },
                { label: 'Teller', acc: 'ACC-DEMO-002' },
                { label: 'GL Vault', acc: 'SYS-GL-VAULT-001' },
              ].map(({ label, acc }) => (
                <div
                  key={acc}
                  className="flex justify-between items-center p-2.5 rounded-xl bg-white border border-sky-100 hover:border-sky-300 cursor-pointer transition-colors shadow-2xs"
                  onClick={() => { setAccountInput(acc); handleResolveAccount(acc); }}
                >
                  <span className="text-slate-600 font-sans font-medium">{label}</span>
                  <span className="text-sky-700 font-bold">{acc}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
