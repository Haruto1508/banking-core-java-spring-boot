import React, { useEffect, useState } from 'react';
import { ArrowDownLeft, ArrowUpRight, Plus, QrCode, RefreshCw } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { accountApi, transactionApi } from '../api/bankingApi';
import { extractErrorMessage } from '../api/client';
import type { AccountType, BankAccount, TransactionRecord } from '../types/banking';
import { formatCurrency, formatDateTime } from '../utils/format';
import { VietQRModal } from '../components/VietQRModal';

export const AccountsPage: React.FC = () => {
  const { customer, user } = useAuth();
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [transactions, setTransactions] = useState<TransactionRecord[]>([]);
  const [newType, setNewType] = useState<AccountType>('CURRENT');
  const [newCurrency, setNewCurrency] = useState('VND');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedAccForQr, setSelectedAccForQr] = useState<BankAccount | null>(null);

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

  const activeAccount = accounts.find((a) => a.id === selectedAccountId);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Tài khoản & Sao kê giao dịch</h1>
          <p className="text-xs sm:text-sm text-slate-500">Quản lý các tài khoản thanh toán và tiết kiệm</p>
        </div>
        {activeAccount && (
          <button
            onClick={() => setSelectedAccForQr(activeAccount)}
            className="self-start sm:self-auto px-4 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-2 cursor-pointer transition-colors shadow-sm"
          >
            <QrCode className="h-4 w-4" />
            <span>Mã VietQR của tài khoản này</span>
          </button>
        )}
      </div>

      {/* Open New Account Bar */}
      <form
        onSubmit={handleOpenAccount}
        className="bg-white rounded-3xl border border-slate-200/90 p-4 sm:p-5 flex flex-col sm:flex-row items-stretch sm:items-end gap-3 shadow-xs"
      >
        <div className="flex-1">
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">Loại tài khoản mở mới</label>
          <select
            value={newType}
            onChange={(e) => setNewType(e.target.value as AccountType)}
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="CURRENT">CURRENT — Tài khoản thanh toán Napas</option>
            <option value="SAVINGS">SAVINGS — Tài khoản tiết kiệm sinh lời</option>
          </select>
        </div>
        <div className="w-full sm:w-36">
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">Loại tiền tệ</label>
          <select
            value={newCurrency}
            onChange={(e) => setNewCurrency(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="VND">VND (Việt Nam Đồng)</option>
            <option value="USD">USD (Đô la Mỹ)</option>
          </select>
        </div>
        <button
          type="submit"
          disabled={creating}
          className="px-6 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-sm font-bold inline-flex items-center justify-center gap-2 cursor-pointer transition-colors"
        >
          <Plus className="h-4 w-4" />
          <span>{creating ? 'Đang mở...' : 'Mở tài khoản'}</span>
        </button>
      </form>

      {error && (
        <div className="rounded-2xl bg-rose-50 border border-rose-200 px-4 py-3 text-xs sm:text-sm text-rose-700">
          {error}
        </div>
      )}

      {/* Accounts Selector Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {accounts.map((acc) => {
          const isSelected = acc.id === selectedAccountId;
          return (
            <button
              key={acc.id}
              type="button"
              onClick={() => setSelectedAccountId(acc.id)}
              className={`text-left rounded-3xl p-5 border transition-all cursor-pointer relative overflow-hidden ${
                isSelected
                  ? 'bg-slate-950 text-white border-slate-900 shadow-lg'
                  : 'bg-white text-slate-900 border-slate-200 hover:border-slate-300 shadow-xs'
              }`}
            >
              <div className="flex items-center justify-between text-xs mb-2">
                <span className={isSelected ? 'text-emerald-400 font-semibold' : 'text-slate-500 font-semibold'}>
                  {acc.accountType} • {acc.currency}
                </span>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    isSelected ? 'bg-white/10 text-white' : 'bg-slate-100 text-slate-700'
                  }`}
                >
                  {acc.status}
                </span>
              </div>
              <div className="text-xl font-extrabold tabular-nums">
                {formatCurrency(Number(acc.balance), acc.currency)}
              </div>
              <div className={`text-xs font-mono mt-1 ${isSelected ? 'text-slate-400' : 'text-slate-500'}`}>
                {acc.accountNumber}
              </div>
            </button>
          );
        })}
      </div>

      {/* Account Statement History */}
      <div className="bg-white rounded-3xl border border-slate-200/90 p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900">Sao kê lịch sử giao dịch</h2>
            <p className="text-xs text-slate-500">
              Đang xem chi tiết tài khoản:{' '}
              <span className="font-mono font-semibold text-slate-800">{activeAccount?.accountNumber || '—'}</span>
            </p>
          </div>
          <button
            onClick={() => selectedAccountId && loadHistory(selectedAccountId)}
            className="p-2 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-600 transition-colors cursor-pointer"
            title="Làm mới sao kê"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>

        <div className="divide-y divide-slate-100 overflow-x-auto">
          {transactions.length === 0 ? (
            <div className="text-center py-12 text-xs text-slate-400">
              Không có giao dịch nào được ghi nhận cho tài khoản này.
            </div>
          ) : (
            transactions.map((tx) => {
              const isCredit = tx.transactionType === 'DEPOSIT' || tx.targetAccountId === selectedAccountId;
              return (
                <div key={tx.id} className="py-3.5 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-3">
                    <div
                      className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 ${
                        isCredit ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
                      }`}
                    >
                      {isCredit ? <ArrowDownLeft className="h-5 w-5" /> : <ArrowUpRight className="h-5 w-5" />}
                    </div>
                    <div>
                      <div className="font-semibold text-slate-900">
                        {tx.description || `${tx.transactionType} ${tx.transactionRef}`}
                      </div>
                      <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                        Ref: {tx.transactionRef} • {formatDateTime(tx.createdAt)}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div
                      className={`font-bold tabular-nums text-sm ${
                        isCredit ? 'text-emerald-600' : 'text-slate-900'
                      }`}
                    >
                      {isCredit ? '+' : '-'} {formatCurrency(Number(tx.amount), tx.currency)}
                    </div>
                    <span className="inline-block text-[10px] font-semibold text-slate-500">
                      {tx.status}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {selectedAccForQr && (
        <VietQRModal
          isOpen={!!selectedAccForQr}
          onClose={() => setSelectedAccForQr(null)}
          accountNumber={selectedAccForQr.accountNumber}
          accountHolderName={customer?.fullName || user?.username || 'CHU TAI KHOAN'}
          bankName="MBBank (MB)"
        />
      )}
    </div>
  );
};
