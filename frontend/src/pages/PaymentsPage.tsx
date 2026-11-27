import React, { useEffect, useState } from 'react';
import { CheckCircle2, QrCode } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { accountApi, paymentApi } from '../api/bankingApi';
import { extractErrorMessage } from '../api/client';
import type { BankAccount, PaymentMethod, PaymentRecord } from '../types/banking';
import { formatCurrency, formatDateTime, generateIdempotencyKey } from '../utils/format';

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
    } catch {
      setHistory([]);
    }
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
      } catch {
        // Ignore
      }
    };
    init();
  }, [customer?.id]);

  const selectedSource = accounts.find((a) => a.id === sourceAccountId);

  const handlePay = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSource) return;

    setError(null);
    setSuccessMsg(null);
    setSubmitting(true);
    try {
      const res = await paymentApi.create(
        {
          sourceAccountId,
          merchantAccountId: merchantAccountId.trim(),
          amount: Number(amount),
          currency: selectedSource.currency,
          paymentMethod,
          description: description.trim() || 'Thanh toán hóa đơn / QR',
        },
        generateIdempotencyKey('PAY')
      );
      setSuccessMsg(`Thanh toán thành công! Mã: ${res.data.data.paymentRef}`);
      setAmount('');
      setDescription('');
      await loadHistory(sourceAccountId);
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Thanh toán hóa đơn & QR</h1>
        <p className="text-xs sm:text-sm text-slate-500">
          Thanh toán dịch vụ và theo dõi trạng thái hoàn tiền
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Payment Form */}
        <div className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-6 shadow-xs">
          {error && (
            <div className="mb-4 rounded-xl bg-rose-50 border border-rose-200 px-4 py-3 text-xs sm:text-sm text-rose-700">
              {error}
            </div>
          )}
          {successMsg && (
            <div className="mb-4 rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3 text-xs sm:text-sm text-emerald-700 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          <form onSubmit={handlePay} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">Tài khoản thanh toán</label>
              <select
                value={sourceAccountId}
                onChange={(e) => {
                  setSourceAccountId(e.target.value);
                  loadHistory(e.target.value);
                }}
                required
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm bg-white"
              >
                {accounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.accountNumber} — {formatCurrency(Number(acc.balance), acc.currency)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">Phương thức</label>
              <div className="grid grid-cols-3 gap-2">
                {(['QR_CODE', 'BILL_PAYMENT', 'INTERNAL_ACCOUNT'] as PaymentMethod[]).map((method) => (
                  <button
                    key={method}
                    type="button"
                    onClick={() => setPaymentMethod(method)}
                    className={`py-2 px-2 rounded-xl text-xs font-semibold border transition-colors cursor-pointer ${
                      paymentMethod === method
                        ? 'bg-slate-900 text-white border-slate-900'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    {method === 'QR_CODE' ? 'QR Code' : method === 'BILL_PAYMENT' ? 'Hóa đơn' : 'Nội bộ'}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                Merchant / Biller Account UUID
              </label>
              <input
                type="text"
                required
                value={merchantAccountId}
                onChange={(e) => setMerchantAccountId(e.target.value)}
                placeholder="UUID tài khoản nhà cung cấp"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-mono"
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
                placeholder="250000"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold tabular-nums"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">Ghi chú</label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Thanh toán đơn hàng #101"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm"
              />
            </div>

            <button
              type="submit"
              disabled={submitting || !sourceAccountId}
              className="w-full py-3 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white text-sm font-semibold flex items-center justify-center gap-2 cursor-pointer"
            >
              <QrCode className="h-4 w-4" />
              <span>{submitting ? 'Đang thanh toán...' : 'Thanh toán ngay'}</span>
            </button>
          </form>
        </div>

        {/* Payment History */}
        <div className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-6 shadow-xs">
          <h2 className="text-base font-semibold text-slate-900 mb-4">Lịch sử thanh toán</h2>
          {history.length === 0 ? (
            <div className="text-sm text-slate-500 py-8 text-center">Chưa có giao dịch thanh toán nào.</div>
          ) : (
            <div className="space-y-3">
              {history.map((p) => (
                <div
                  key={p.id}
                  className="rounded-2xl border border-slate-100 bg-slate-50 p-3.5 flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <div className="text-xs font-mono font-semibold text-slate-800">{p.paymentRef}</div>
                    <div className="text-xs text-slate-500 truncate mt-0.5">
                      {p.paymentMethod} • {p.description || '—'}
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5">{formatDateTime(p.createdAt)}</div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-sm font-bold text-slate-900 tabular-nums">
                      -{formatCurrency(Number(p.amount), p.currency)}
                    </div>
                    <span
                      className={`inline-block mt-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                        p.status === 'COMPLETED'
                          ? 'bg-emerald-100 text-emerald-700'
                          : p.status === 'REFUNDED'
                          ? 'bg-sky-100 text-sky-700'
                          : 'bg-rose-100 text-rose-700'
                      }`}
                    >
                      {p.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
