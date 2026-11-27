import React, { useEffect, useState } from 'react';
import {
  CheckCircle2,
  Layers,
  QrCode,
  Receipt,
  Smartphone,
  Wallet,
  Zap,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { accountApi, paymentApi } from '../api/bankingApi';
import { extractErrorMessage } from '../api/client';
import type { BankAccount, PaymentMethod, PaymentRecord } from '../types/banking';
import { formatCurrency, formatDateTime, generateIdempotencyKey } from '../utils/format';

const BILL_PRESETS = [
  { icon: Zap, label: 'Điện', desc: 'EVN · Hàng tháng', color: 'from-amber-500 to-orange-500' },
  { icon: Layers, label: 'Nước', desc: 'Cấp nước TP', color: 'from-sky-500 to-blue-500' },
  { icon: Smartphone, label: 'Internet', desc: 'FPT / VNPT', color: 'from-indigo-500 to-purple-500' },
  { icon: Wallet, label: 'Khác', desc: 'Hóa đơn khác', color: 'from-emerald-500 to-teal-500' },
];

const METHOD_ICONS: Record<PaymentMethod, typeof QrCode> = {
  QR_CODE: QrCode,
  BILL_PAYMENT: Receipt,
  INTERNAL_ACCOUNT: Layers,
};

const METHOD_LABELS: Record<PaymentMethod, string> = {
  QR_CODE: 'QR Code',
  BILL_PAYMENT: 'Hóa đơn',
  INTERNAL_ACCOUNT: 'Nội bộ',
};

export const PaymentsPage: React.FC = () => {
  const { customer } = useAuth();
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [sourceAccountId, setSourceAccountId] = useState('');
  const [merchantAccountId, setMerchantAccountId] = useState('');
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('QR_CODE');
  const [description, setDescription] = useState('');
  const [history, setHistory] = useState<PaymentRecord[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const loadHistory = async (accId: string) => {
    if (!accId) return;
    try {
      const res = await paymentApi.getHistory(accId, 0, 10);
      setHistory(res.data.data.content);
    } catch { setHistory([]); }
  };

  useEffect(() => {
    const init = async () => {
      if (!customer?.id) return;
      try {
        const res = await accountApi.getByCustomer(customer.id);
        const active = res.data.data.filter((a) => a.status === 'ACTIVE');
        setAccounts(active);
        if (active.length > 0) {
          setSourceAccountId(active[0].id);
          await loadHistory(active[0].id);
        }
      } catch { /* noop */ }
    };
    init();
  }, [customer?.id]);

  const selectedSource = accounts.find((a) => a.id === sourceAccountId);

  const handlePay = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSource) return;
    setError(null); setSuccessMsg(null); setSubmitting(true);
    try {
      const res = await paymentApi.create(
        { sourceAccountId, merchantAccountId: merchantAccountId.trim(), amount: Number(amount), currency: selectedSource.currency, paymentMethod, description: description.trim() || 'Thanh toán hóa đơn / QR' },
        generateIdempotencyKey('PAY')
      );
      setSuccessMsg(`Thanh toán thành công! Mã: ${res.data.data.paymentRef}`);
      setAmount(''); setDescription('');
      await loadHistory(sourceAccountId);
    } catch (err) { setError(extractErrorMessage(err)); } finally { setSubmitting(false); }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-extrabold text-white">Thanh toán hóa đơn & QR</h1>
        <p className="text-xs text-slate-400 mt-0.5">Thanh toán nhanh dịch vụ, hóa đơn điện nước, internet và theo dõi trạng thái</p>
      </div>

      {/* Bill Preset Cards */}
      <div className="grid grid-cols-4 gap-3">
        {BILL_PRESETS.map(({ icon: Icon, label, desc, color }) => (
          <button key={label} type="button"
            onClick={() => { setPaymentMethod('BILL_PAYMENT'); setDescription(`Thanh toán ${label}`); }}
            className="rounded-2xl bg-slate-900 border border-slate-800 hover:border-slate-700 p-3.5 flex flex-col items-center gap-2.5 cursor-pointer transition-all hover:scale-[1.02] group">
            <div className={`h-10 w-10 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center shadow-md group-hover:shadow-lg`}>
              <Icon className="h-5 w-5 text-white" />
            </div>
            <div className="text-center">
              <div className="text-xs font-bold text-slate-200">{label}</div>
              <div className="text-[9px] text-slate-500 leading-tight">{desc}</div>
            </div>
          </button>
        ))}
      </div>

      {/* Main 2-col grid */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        {/* Payment Form */}
        <div className="lg:col-span-3 bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 space-y-4">
          <div className="flex items-center gap-2 mb-1">
            <div className="h-8 w-8 rounded-xl bg-orange-500/15 flex items-center justify-center">
              <QrCode className="h-4 w-4 text-orange-400" />
            </div>
            <h2 className="text-sm font-bold text-white">Thực hiện thanh toán</h2>
          </div>

          {error && <div className="rounded-xl bg-rose-500/10 border border-rose-500/20 px-4 py-3 text-xs text-rose-400">{error}</div>}
          {successMsg && (
            <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 px-4 py-3 text-xs text-emerald-400 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          <form onSubmit={handlePay} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">Tài khoản thanh toán</label>
              <select value={sourceAccountId} onChange={(e) => { setSourceAccountId(e.target.value); loadHistory(e.target.value); }} required
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500">
                {accounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>{acc.accountNumber} — {formatCurrency(Number(acc.balance), acc.currency)}</option>
                ))}
              </select>
            </div>

            {/* Payment Method Tabs */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">Phương thức</label>
              <div className="grid grid-cols-3 gap-2">
                {(['QR_CODE', 'BILL_PAYMENT', 'INTERNAL_ACCOUNT'] as PaymentMethod[]).map((method) => {
                  const MethodIcon = METHOD_ICONS[method];
                  return (
                    <button key={method} type="button" onClick={() => setPaymentMethod(method)}
                      className={`flex flex-col items-center gap-1.5 py-2.5 rounded-xl text-xs font-semibold border transition-colors cursor-pointer ${paymentMethod === method ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400' : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700'}`}>
                      <MethodIcon className="h-4 w-4" />
                      {METHOD_LABELS[method]}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                {paymentMethod === 'QR_CODE' ? 'UUID tài khoản nhà cung cấp dịch vụ' : paymentMethod === 'BILL_PAYMENT' ? 'Mã hóa đơn / Số hợp đồng' : 'Số tài khoản nhận nội bộ'}
              </label>
              <input type="text" required value={merchantAccountId} onChange={(e) => setMerchantAccountId(e.target.value)}
                placeholder={paymentMethod === 'QR_CODE' ? 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx' : paymentMethod === 'BILL_PAYMENT' ? 'PE-EVN-001234' : 'ACC-...'}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-sm text-white font-mono placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500" />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">Số tiền ({selectedSource?.currency || 'VND'})</label>
              <div className="relative">
                <input type="number" required min="1" step="any" value={amount} onChange={(e) => setAmount(e.target.value)}
                  placeholder="250,000"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-sm text-white tabular-nums focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                <span className="absolute right-3.5 top-2.5 text-xs font-bold text-emerald-400">{selectedSource?.currency || 'VND'}</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">Ghi chú</label>
              <input type="text" value={description} onChange={(e) => setDescription(e.target.value)}
                placeholder="Thanh toán đơn hàng #101"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500" />
            </div>

            <button type="submit" disabled={submitting || !sourceAccountId}
              className="w-full py-3.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 text-sm font-bold flex items-center justify-center gap-2 cursor-pointer transition-colors shadow-lg shadow-emerald-500/20">
              <QrCode className="h-4 w-4" />
              {submitting ? 'Đang thanh toán...' : 'Thanh toán ngay'}
            </button>
          </form>
        </div>

        {/* Payment History */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden">
          <div className="p-4 border-b border-slate-800">
            <h2 className="text-sm font-bold text-white">Lịch sử thanh toán</h2>
            <p className="text-[11px] text-slate-500 mt-0.5">{history.length} giao dịch gần nhất</p>
          </div>
          <div className="divide-y divide-slate-800/60 max-h-[480px] overflow-y-auto">
            {history.length === 0 ? (
              <div className="py-14 text-center">
                <Receipt className="h-10 w-10 text-slate-700 mx-auto mb-2" />
                <p className="text-xs text-slate-500">Chưa có giao dịch thanh toán nào.</p>
              </div>
            ) : history.map((p) => (
              <div key={p.id} className="px-4 py-3.5 flex items-center justify-between gap-3 hover:bg-slate-800/40 transition-colors">
                <div className="min-w-0">
                  <div className="text-xs font-mono font-semibold text-slate-200">{p.paymentRef}</div>
                  <div className="text-[10px] text-slate-500 truncate mt-0.5">{p.paymentMethod} · {p.description || '—'}</div>
                  <div className="text-[10px] text-slate-600 mt-0.5">{formatDateTime(p.createdAt)}</div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-sm font-bold text-slate-200 tabular-nums">-{formatCurrency(Number(p.amount), p.currency)}</div>
                  <span className={`inline-block mt-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                    p.status === 'COMPLETED' ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20' :
                    p.status === 'REFUNDED' ? 'bg-sky-500/15 text-sky-400 border-sky-500/20' :
                    'bg-rose-500/15 text-rose-400 border-rose-500/20'
                  }`}>{p.status}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
