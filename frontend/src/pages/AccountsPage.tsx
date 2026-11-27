import React, { useEffect, useState } from 'react';
import { ArrowDownLeft, ArrowUpRight, Plus, RefreshCw } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { accountApi, transactionApi } from '../api/bankingApi';
import { extractErrorMessage } from '../api/client';
import type { AccountType, BankAccount, TransactionRecord } from '../types/banking';
import { formatCurrency, formatDateTime } from '../utils/format';

export const AccountsPage: React.FC = () => {
  const { customer } = useAuth();
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [transactions, setTransactions] = useState<TransactionRecord[]>([]);
  const [newType, setNewType] = useState<AccountType>('CURRENT');
  const [newCurrency, setNewCurrency] = useState('VND');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadAccounts = async () => {
    if (!customer?.id) return;
    try {
      const res = await accountApi.getByCustomer(customer.id);
      const list = res.data.data;
      setAccounts(list);
      if (list.length > 0 && !selectedAccountId) {
        setSelectedAccountId(list[0].id);
      }
    } catch {
      // Ignore
    }
  };

  const loadHistory = async (accountId: string) => {
    if (!accountId) return;
    try {
      const res = await transactionApi.getHistory(accountId, { page: 0, size: 20 });
      setTransactions(res.data.data.content);
    } catch {
      setTransactions([]);
    }
  };

  useEffect(() => {
    loadAccounts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customer?.id]);

  useEffect(() => {
    if (selectedAccountId) {
      loadHistory(selectedAccountId);
    }
  }, [selectedAccountId]);

  const handleOpenAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customer?.id) {
      setError('Vui lòng tạo hồ sơ khách hàng (KYC) ở mục Hồ sơ trước khi mở tài khoản.');
      return;
    }
    setError(null);
    setCreating(true);
    try {
      const res = await accountApi.open(customer.id, newType, newCurrency);
      await loadAccounts();
      setSelectedAccountId(res.data.data.id);
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Tài khoản & Lịch sử giao dịch</h1>
        <p className="text-xs sm:text-sm text-slate-500">Quản lý tài khoản thanh toán, tiết kiệm và sao kê</p>
      </div>

      {/* Open New Account Bar */}
      <form
        onSubmit={handleOpenAccount}
        className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 flex flex-col sm:flex-row items-stretch sm:items-end gap-3"
      >
        <div className="flex-1">
          <label className="block text-xs font-medium text-slate-600 mb-1">Loại tài khoản</label>
          <select
            value={newType}
            onChange={(e) => setNewType(e.target.value as AccountType)}
            className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm bg-white"
          >
            <option value="CURRENT">CURRENT (Thanh toán)</option>
            <option value="SAVINGS">SAVINGS (Tiết kiệm)</option>
          </select>
        </div>
        <div className="w-full sm:w-32">
          <label className="block text-xs font-medium text-slate-600 mb-1">Loại tiền</label>
          <select
            value={newCurrency}
            onChange={(e) => setNewCurrency(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm bg-white"
          >
            <option value="VND">VND</option>
            <option value="USD">USD</option>
          </select>
        </div>
        <button
          type="submit"
          disabled={creating}
          className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold inline-flex items-center justify-center gap-2 cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          <span>{creating ? 'Đang mở...' : 'Mở tài khoản mới'}</span>
        </button>
      </form>

      {error && (
        <div className="rounded-xl bg-rose-50 border border-rose-200 px-4 py-3 text-xs sm:text-sm text-rose-700">
          {error}
        </div>
      )}

      {/* Accounts Selector */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {accounts.map((acc) => {
          const isSelected = acc.id === selectedAccountId;
          return (
            <button
              key={acc.id}
              type="button"
              onClick={() => setSelectedAccountId(acc.id)}
              className={`text-left rounded-2xl p-4 border transition-all cursor-pointer ${
                isSelected
                  ? 'bg-slate-900 text-white border-slate-900 shadow-md'
                  : 'bg-white text-slate-900 border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between text-xs mb-2">
                <span className={isSelected ? 'text-emerald-300 font-semibold' : 'text-slate-500 font-medium'}>
                  {acc.accountType} • {acc.currency}
                </span>
                <span className="text-[11px] opacity-80">{acc.status}</span>
              </div>
              <div className="text-lg font-bold tabular-nums">
                {formatCurrency(Number(acc.balance), acc.currency)}
              </div>
              <div className={`text-[11px] font-mono mt-1 ${isSelected ? 'text-slate-300' : 'text-slate-400'}`}>
                {acc.accountNumber}
              </div>
            </button>
          );
        })}
      </div>

      {/* Transaction History */}
      <div className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-6 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-slate-900">Sao kê giao dịch</h2>
          {selectedAccountId && (
            <button
              onClick={() => loadHistory(selectedAccountId)}
              className="text-xs text-slate-600 hover:text-slate-900 inline-flex items-center gap-1 cursor-pointer"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Làm mới
            </button>
          )}
        </div>

        {transactions.length === 0 ? (
          <div className="text-sm text-slate-500 py-8 text-center">
            Chưa có giao dịch phát sinh trên tài khoản này.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {transactions.map((txn) => {
              const isCredit = txn.targetAccountId === selectedAccountId;
              return (
                <div key={txn.id} className="py-3.5 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`h-9 w-9 rounded-full flex items-center justify-center shrink-0 ${
                        isCredit ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
                      }`}
                    >
                      {isCredit ? (
                        <ArrowDownLeft className="h-4.5 w-4.5" />
                      ) : (
                        <ArrowUpRight className="h-4.5 w-4.5" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-slate-900 truncate">
                        {txn.description || txn.transactionType}
                      </div>
                      <div className="text-[11px] text-slate-400 font-mono">
                        {txn.transactionRef} • {formatDateTime(txn.createdAt)}
                      </div>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div
                      className={`text-sm font-bold tabular-nums ${
                        isCredit ? 'text-emerald-600' : 'text-slate-900'
                      }`}
                    >
                      {isCredit ? '+' : '-'}
                      {formatCurrency(Number(txn.amount), txn.currency)}
                    </div>
                    <div className="text-[10px] font-semibold text-slate-500">{txn.status}</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
