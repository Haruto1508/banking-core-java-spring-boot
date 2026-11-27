import React, { useEffect, useState } from 'react';
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
  ACTIVE: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
  FROZEN: 'bg-amber-500/15 text-amber-400 border-amber-500/20',
  CLOSED: 'bg-rose-500/15 text-rose-400 border-rose-500/20',
};

export const AccountsPage: React.FC = () => {
  const { customer, user } = useAuth();
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
      setError('Vui lòng tạo hồ sơ khách hàng (KYC) ở mục Hồ sơ trước khi mở tài khoản.');
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
          <h1 className="text-xl sm:text-2xl font-extrabold text-white leading-tight">Tài khoản & Sao kê</h1>
          <p className="text-xs text-slate-400 mt-0.5">Quản lý tài khoản thanh toán, tiết kiệm và theo dõi giao dịch</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold transition-colors cursor-pointer shadow-lg shadow-emerald-500/20"
        >
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">Mở tài khoản</span>
        </button>
      </div>

      {/* Total Balance Summary */}
      <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950 border border-slate-800 p-5 card-glow">
        <div className="absolute top-0 right-0 w-56 h-56 bg-emerald-500/8 rounded-full blur-3xl -translate-y-1/3 translate-x-1/3 pointer-events-none" />
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Tổng số dư khả dụng</div>
            {loading ? (
              <div className="h-9 w-44 rounded-xl skeleton" />
            ) : (
              <div className="text-3xl font-black tabular-nums text-white flex items-center gap-3">
                {hideBalance ? '•••••••••' : formatCurrency(totalBalance, 'VND')}
                <button onClick={() => setHideBalance(!hideBalance)} className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 cursor-pointer">
                  {hideBalance ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            )}
            <div className="flex items-center gap-2 mt-2">
              <TrendingUp className="h-3.5 w-3.5 text-emerald-400" />
              <span className="text-xs text-emerald-400 font-semibold">{accounts.filter(a => a.status === 'ACTIVE').length} tài khoản đang hoạt động</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {activeAccount && (
              <button onClick={() => setSelectedAccForQr(activeAccount)} className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/20 text-emerald-400 text-xs font-bold cursor-pointer transition-colors">
                <QrCode className="h-4 w-4" />
                <span>VietQR</span>
              </button>
            )}
            <button onClick={() => loadHistory(selectedAccountId)} className="p-2.5 rounded-2xl bg-white/5 hover:bg-white/10 text-slate-400 cursor-pointer transition-colors border border-slate-800">
              <RefreshCw className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Open Account Form */}
      {showForm && (
        <form onSubmit={handleOpenAccount} className="bg-slate-900 border border-slate-800 rounded-3xl p-5 space-y-4">
          <h2 className="text-sm font-bold text-white">Mở tài khoản mới</h2>
          {error && (
            <div className="rounded-xl bg-rose-500/10 border border-rose-500/20 px-4 py-3 text-xs text-rose-400">{error}</div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">Loại tài khoản</label>
              <select value={newType} onChange={(e) => setNewType(e.target.value as AccountType)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500">
                <option value="CURRENT">CURRENT — Tài khoản thanh toán Napas</option>
                <option value="SAVINGS">SAVINGS — Tài khoản tiết kiệm sinh lời</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">Tiền tệ</label>
              <select value={newCurrency} onChange={(e) => setNewCurrency(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500">
                <option value="VND">VND (Việt Nam Đồng)</option>
                <option value="USD">USD (Đô la Mỹ)</option>
              </select>
            </div>
          </div>
          <div className="flex gap-3">
            <button type="submit" disabled={creating}
              className="flex-1 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-sm font-bold inline-flex items-center justify-center gap-2 cursor-pointer transition-colors">
              <Plus className="h-4 w-4" />
              {creating ? 'Đang mở...' : 'Xác nhận mở tài khoản'}
            </button>
            <button type="button" onClick={() => setShowForm(false)}
              className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-semibold cursor-pointer transition-colors">
              Hủy
            </button>
          </div>
        </form>
      )}

      {/* Desktop: 2-col | Mobile: stacked */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        {/* Account Cards Column */}
        <div className="lg:col-span-2 space-y-3">
          <h2 className="text-sm font-bold text-slate-200">Danh sách tài khoản</h2>
          {loading ? [0, 1].map(i => <div key={i} className="h-28 rounded-2xl skeleton" />) :
            accounts.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-700 p-8 text-center">
                <CreditCard className="h-8 w-8 text-slate-600 mx-auto mb-2" />
                <p className="text-xs text-slate-500">Chưa có tài khoản nào. Nhấn <strong className="text-emerald-400">Mở tài khoản</strong> để bắt đầu.</p>
              </div>
            ) : accounts.map((acc) => {
              const isSelected = acc.id === selectedAccountId;
              return (
                <button key={acc.id} type="button" onClick={() => setSelectedAccountId(acc.id)}
                  className={`w-full text-left rounded-2xl p-4 border transition-all cursor-pointer ${isSelected ? 'bg-emerald-500 border-emerald-400 shadow-lg shadow-emerald-500/20' : 'bg-slate-900 border-slate-800 hover:border-slate-600'}`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${STATUS_COLOR[acc.status] || 'bg-slate-700 text-slate-300 border-slate-600'}`}>{acc.status}</span>
                    <span className={`text-[10px] font-bold ${isSelected ? 'text-emerald-100' : 'text-slate-400'}`}>{acc.accountType} · {acc.currency}</span>
                  </div>
                  <div className={`text-lg font-extrabold tabular-nums mb-2 ${isSelected ? 'text-white' : 'text-slate-100'}`}>
                    {hideBalance ? '••••••' : formatCurrency(Number(acc.balance), acc.currency)}
                  </div>
                  <div className="flex items-center justify-between">
                    <span className={`text-[11px] font-mono ${isSelected ? 'text-emerald-100' : 'text-slate-500'}`}>{acc.accountNumber}</span>
                    <button onClick={(e) => { e.stopPropagation(); copyText(acc.accountNumber); }} className="cursor-pointer p-1">
                      {copiedId === acc.accountNumber
                        ? <CheckCircle2 className={`h-3.5 w-3.5 ${isSelected ? 'text-white' : 'text-emerald-400'}`} />
                        : <Copy className={`h-3.5 w-3.5 ${isSelected ? 'text-emerald-100' : 'text-slate-500'}`} />}
                    </button>
                  </div>
                </button>
              );
            })
          }
        </div>

        {/* Transaction History Column */}
        <div className="lg:col-span-3 bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b border-slate-800">
            <div>
              <h2 className="text-sm font-bold text-white">Sao kê giao dịch</h2>
              <p className="text-[11px] text-slate-500 font-mono mt-0.5">{activeAccount?.accountNumber || 'Chọn tài khoản để xem'}</p>
            </div>
            <button onClick={() => selectedAccountId && loadHistory(selectedAccountId)}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 cursor-pointer transition-colors">
              <RefreshCw className="h-4 w-4" />
            </button>
          </div>

          <div className="divide-y divide-slate-800/60 max-h-[600px] overflow-y-auto">
            {txLoading ? [0, 1, 2, 3].map(i => <div key={i} className="h-16 mx-4 my-2 rounded-xl skeleton" />) :
              transactions.length === 0 ? (
                <div className="py-16 text-center">
                  <div className="h-12 w-12 rounded-2xl bg-slate-800 flex items-center justify-center mx-auto mb-3">
                    <ArrowUpRight className="h-6 w-6 text-slate-600" />
                  </div>
                  <p className="text-xs text-slate-500">Chưa có giao dịch nào trong tài khoản này.</p>
                </div>
              ) : transactions.map((tx) => {
                const isCredit = tx.transactionType === 'DEPOSIT' || tx.targetAccountId === selectedAccountId;
                return (
                  <div key={tx.id} className="flex items-center justify-between px-4 py-3.5 hover:bg-slate-800/40 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 ${isCredit ? 'bg-emerald-500/15 text-emerald-400' : 'bg-rose-500/15 text-rose-400'}`}>
                        {isCredit ? <ArrowDownLeft className="h-4 w-4" /> : <ArrowUpRight className="h-4 w-4" />}
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-slate-200 leading-tight">{tx.description || tx.transactionType}</div>
                        <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                          {tx.transactionRef} · {formatDateTime(tx.createdAt)}
                        </div>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className={`text-sm font-bold tabular-nums ${isCredit ? 'text-emerald-400' : 'text-slate-300'}`}>
                        {isCredit ? '+' : '-'}{formatCurrency(Number(tx.amount), tx.currency)}
                      </div>
                      <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${tx.status === 'SUCCESS' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-slate-700 text-slate-400'}`}>
                        {tx.status}
                      </span>
                    </div>
                  </div>
                );
              })
            }
          </div>
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
