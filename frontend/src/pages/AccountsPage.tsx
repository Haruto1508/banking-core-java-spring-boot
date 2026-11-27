import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ArrowDownLeft,
  ArrowUpRight,
  CheckCircle2,
  Copy,
  CreditCard,
  Eye,
  EyeOff,
  Plus,
  QrCode,
  RefreshCw,
  TrendingUp,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { accountApi, transactionApi } from '../api/bankingApi';
import { extractErrorMessage } from '../api/client';
import type { AccountType, BankAccount, TransactionRecord } from '../types/banking';
import { formatCurrency, formatDateTime } from '../utils/format';
import { VietQRModal } from '../components/VietQRModal';

const STATUS_COLOR: Record<string, string> = {
  ACTIVE: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  FROZEN: 'bg-amber-50 text-amber-700 border-amber-200',
  CLOSED: 'bg-rose-50 text-rose-700 border-rose-200',
};

export const AccountsPage: React.FC = () => {
  const { customer } = useAuth();
  const { t } = useTranslation();
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [transactions, setTransactions] = useState<TransactionRecord[]>([]);
  const [txLoading, setTxLoading] = useState(false);
  const [newType, setNewType] = useState<AccountType>('CURRENT');
  const [newCurrency, setNewCurrency] = useState('VND');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedAccForQr, setSelectedAccForQr] = useState<BankAccount | null>(null);
  const [hideBalance, setHideBalance] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadAccounts = async () => {
    if (!customer?.id) return;
    try {
      setLoading(true);
      const res = await accountApi.getByCustomer(customer.id);
      const list = res.data.data;
      setAccounts(list);
      if (list.length > 0 && !selectedAccountId) setSelectedAccountId(list[0].id);
    } catch { /* noop */ } finally { setLoading(false); }
  };

  const loadHistory = async (accountId: string) => {
    if (!accountId) return;
    setTxLoading(true);
    try {
      const res = await transactionApi.getHistory(accountId, { page: 0, size: 20 });
      setTransactions(res.data.data.content);
    } catch {
      setTransactions([]);
    } finally {
      setTxLoading(false);
    }
  };

  useEffect(() => { loadAccounts(); }, [customer?.id]);
  useEffect(() => { if (selectedAccountId) loadHistory(selectedAccountId); }, [selectedAccountId]);

  const handleOpenAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customer?.id) {
      setError(t('accounts.kycRequired'));
      return;
    }
    setError(null);
    setCreating(true);
    try {
      const res = await accountApi.open(customer.id, newType, newCurrency);
      await loadAccounts();
      setSelectedAccountId(res.data.data.id);
      setShowForm(false);
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setCreating(false);
    }
  };

  const copyText = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(text);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const activeAccount = accounts.find((a) => a.id === selectedAccountId);
  const totalBalance = accounts.filter(a => a.status !== 'CLOSED' && a.currency === 'VND').reduce((s, a) => s + Number(a.balance), 0);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 leading-tight">{t('accounts.title')}</h1>
          <p className="text-xs text-slate-500 mt-0.5">{t('accounts.desc')}</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white text-xs font-bold transition-all cursor-pointer shadow-md shadow-sky-500/20"
        >
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">{t('accounts.openNew')}</span>
        </button>
      </div>

      {/* Total Balance Summary Card */}
      <div className="relative rounded-3xl overflow-hidden bg-white border border-sky-100 p-5 sm:p-6 shadow-xs card-glow">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
              {t('dashboard.totalBalance')}
            </div>
            {loading ? (
              <div className="h-9 w-44 rounded-xl skeleton" />
            ) : (
              <div className="text-3xl font-black tabular-nums text-slate-900 flex items-center gap-3">
                {hideBalance ? '•••••••••' : formatCurrency(totalBalance, 'VND')}
                <button
                  onClick={() => setHideBalance(!hideBalance)}
                  className="p-1.5 rounded-lg bg-sky-50 hover:bg-sky-100 text-sky-600 cursor-pointer transition-colors"
                >
                  {hideBalance ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            )}
            <div className="flex items-center gap-2 mt-2">
              <TrendingUp className="h-3.5 w-3.5 text-sky-600" />
              <span className="text-xs text-sky-600 font-bold">
                {accounts.filter(a => a.status === 'ACTIVE').length} {t('accounts.activeAccountsCount')}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {activeAccount && (
              <button
                onClick={() => setSelectedAccForQr(activeAccount)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-sky-50 hover:bg-sky-100 border border-sky-200 text-sky-700 text-xs font-bold cursor-pointer transition-colors"
              >
                <QrCode className="h-4 w-4" />
                <span>{t('common.vietqr')}</span>
              </button>
            )}
            <button
              onClick={() => loadHistory(selectedAccountId)}
              className="p-2.5 rounded-2xl bg-slate-50 hover:bg-slate-100 text-slate-600 cursor-pointer transition-colors border border-slate-200"
              title={t('common.refresh')}
            >
              <RefreshCw className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Open Account Form (Collapsible) */}
      {showForm && (
        <form onSubmit={handleOpenAccount} className="bg-white border border-sky-100 rounded-3xl p-5 space-y-4 shadow-xs">
          <h2 className="text-sm font-bold text-slate-900">{t('accounts.openNewTitle')}</h2>
          {error && (
            <div className="rounded-xl bg-rose-50 border border-rose-200 px-4 py-3 text-xs text-rose-700">{error}</div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1.5">{t('accounts.accountType')}</label>
              <select
                value={newType}
                onChange={(e) => setNewType(e.target.value as AccountType)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500"
              >
                <option value="CURRENT">{t('accounts.currentDesc')}</option>
                <option value="SAVINGS">{t('accounts.savingsDesc')}</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">{t('common.currency')}</label>
              <select
                value={newCurrency}
                onChange={(e) => setNewCurrency(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500"
              >
                <option value="VND">VND (Việt Nam Đồng)</option>
                <option value="USD">USD (Đô la Mỹ)</option>
              </select>
            </div>
          </div>
          <div className="flex gap-3">
            <button
              type="submit"
              disabled={creating}
              className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white text-sm font-bold inline-flex items-center justify-center gap-2 cursor-pointer transition-colors shadow-xs"
            >
              <Plus className="h-4 w-4" />
              {creating ? t('accounts.opening') : t('accounts.confirmOpen')}
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold cursor-pointer transition-colors"
            >
              {t('common.cancel')}
            </button>
          </div>
        </form>
      )}

      {/* Desktop: 2-col | Mobile: stacked */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        {/* Account Cards Column */}
        <div className="lg:col-span-2 space-y-3">
          <h2 className="text-sm font-extrabold text-slate-800">{t('accounts.accountList')}</h2>
          {loading ? (
            [0, 1].map(i => <div key={i} className="h-28 rounded-2xl skeleton" />)
          ) : accounts.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-sky-200 bg-sky-50/40 p-8 text-center">
              <CreditCard className="h-8 w-8 text-sky-400 mx-auto mb-2" />
              <p className="text-xs text-slate-500">
                {t('dashboard.noAccounts')}{' '}
                <button onClick={() => setShowForm(true)} className="text-sky-600 font-bold hover:underline">
                  {t('accounts.openNew')}
                </button>
              </p>
            </div>
          ) : (
            accounts.map((acc) => {
              const isSelected = acc.id === selectedAccountId;
              return (
                <button
                  key={acc.id}
                  type="button"
                  onClick={() => setSelectedAccountId(acc.id)}
                  className={`w-full text-left rounded-2xl p-4 border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-gradient-to-br from-sky-500 to-blue-600 text-white border-sky-500 shadow-md shadow-sky-500/20'
                      : 'bg-white border-sky-100 hover:border-sky-300 text-slate-800 shadow-xs'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span
                      className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${
                        isSelected
                          ? 'bg-white/20 text-white border-white/30'
                          : STATUS_COLOR[acc.status] || 'bg-slate-100 text-slate-600 border-slate-200'
                      }`}
                    >
                      {t(`status.${acc.status}`)}
                    </span>
                    <span className={`text-[10px] font-bold ${isSelected ? 'text-sky-100' : 'text-slate-500'}`}>
                      {t(`accountTypes.${acc.accountType}`)} · {acc.currency}
                    </span>
                  </div>
                  <div className={`text-lg font-black tabular-nums mb-2 ${isSelected ? 'text-white' : 'text-slate-900'}`}>
                    {hideBalance ? '••••••' : formatCurrency(Number(acc.balance), acc.currency)}
                  </div>
                  <div className="flex items-center justify-between">
                    <span className={`text-[11px] font-mono ${isSelected ? 'text-sky-100' : 'text-slate-500'}`}>
                      {acc.accountNumber}
                    </span>
                    <button
                      onClick={(e) => { e.stopPropagation(); copyText(acc.accountNumber); }}
                      className="cursor-pointer p-1"
                    >
                      {copiedId === acc.accountNumber ? (
                        <CheckCircle2 className={`h-3.5 w-3.5 ${isSelected ? 'text-white' : 'text-emerald-600'}`} />
                      ) : (
                        <Copy className={`h-3.5 w-3.5 ${isSelected ? 'text-sky-100' : 'text-slate-400'}`} />
                      )}
                    </button>
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Transaction Statement Column */}
        <div className="lg:col-span-3 bg-white border border-sky-100 rounded-3xl overflow-hidden shadow-xs">
          <div className="flex items-center justify-between p-4 border-b border-sky-100">
            <div>
              <h2 className="text-sm font-extrabold text-slate-900">{t('accounts.statement')}</h2>
              <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                {activeAccount?.accountNumber || t('accounts.selectAccountHint')}
              </p>
            </div>
            <button
              onClick={() => selectedAccountId && loadHistory(selectedAccountId)}
              className="p-2 rounded-xl bg-sky-50 hover:bg-sky-100 text-sky-600 cursor-pointer transition-colors"
              title={t('common.refresh')}
            >
              <RefreshCw className="h-4 w-4" />
            </button>
          </div>

          <div className="divide-y divide-sky-50 max-h-[600px] overflow-y-auto">
            {txLoading ? (
              [0, 1, 2, 3].map(i => <div key={i} className="h-16 mx-4 my-2 rounded-xl skeleton" />)
            ) : transactions.length === 0 ? (
              <div className="py-16 text-center">
                <div className="h-12 w-12 rounded-2xl bg-sky-50 text-sky-500 flex items-center justify-center mx-auto mb-3">
                  <ArrowUpRight className="h-6 w-6" />
                </div>
                <p className="text-xs text-slate-400">{t('accounts.noStatement')}</p>
              </div>
            ) : (
              transactions.map((tx) => {
                const isCredit = tx.transactionType === 'DEPOSIT' || tx.targetAccountId === selectedAccountId;
                return (
                  <div key={tx.id} className="flex items-center justify-between px-4 py-3.5 hover:bg-sky-50/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div
                        className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 border ${
                          isCredit
                            ? 'bg-emerald-50 text-emerald-600 border-emerald-200/60'
                            : 'bg-rose-50 text-rose-600 border-rose-200/60'
                        }`}
                      >
                        {isCredit ? <ArrowDownLeft className="h-4 w-4" /> : <ArrowUpRight className="h-4 w-4" />}
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-800 leading-tight">
                          {tx.description || tx.transactionType}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                          {tx.transactionRef} · {formatDateTime(tx.createdAt)}
                        </div>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className={`text-sm font-black tabular-nums ${isCredit ? 'text-emerald-600' : 'text-slate-800'}`}>
                        {isCredit ? '+' : '-'}{formatCurrency(Number(tx.amount), tx.currency)}
                      </div>
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full border ${
                          tx.status === 'SUCCESS'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-slate-100 text-slate-600 border-slate-200'
                        }`}
                      >
                        {t(`status.${tx.status}`)}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {selectedAccForQr && (
        <VietQRModal
          isOpen={!!selectedAccForQr}
          onClose={() => setSelectedAccForQr(null)}
          accountNumber={selectedAccForQr.accountNumber}
          accountHolderName={customer?.fullName || 'CHU TAI KHOAN'}
          bankName="MBBank (MB)"
        />
      )}
    </div>
  );
};
