import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  AlertTriangle,
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
import {
  formatCurrency,
  formatDateTime,
  formatNumberWithDots,
  generateIdempotencyKey,
  numberToWords,
  parseNumberFromDots,
} from '../utils/format';
import { AlertModal } from '../components/AlertModal';

export const PaymentsPage: React.FC = () => {
  const { customer } = useAuth();
  const { t, i18n } = useTranslation();
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [sourceAccountId, setSourceAccountId] = useState('');
  const [merchantAccountId, setMerchantAccountId] = useState('');
  const [amountFormatted, setAmountFormatted] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('QR_CODE');
  const [description, setDescription] = useState('');
  const [history, setHistory] = useState<PaymentRecord[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Alert Modal state
  const [alertModal, setAlertModal] = useState<{
    isOpen: boolean;
    title?: string;
    message: string;
    type?: 'error' | 'warning' | 'info' | 'success';
  }>({
    isOpen: false,
    title: '',
    message: '',
    type: 'error',
  });

  const BILL_PRESETS = [
    { icon: Zap, labelKey: 'payments.electricity', descKey: 'payments.electricityDesc', color: 'from-amber-400 to-orange-500' },
    { icon: Layers, labelKey: 'payments.water', descKey: 'payments.waterDesc', color: 'from-sky-400 to-blue-500' },
    { icon: Smartphone, labelKey: 'payments.internet', descKey: 'payments.internetDesc', color: 'from-indigo-400 to-purple-500' },
    { icon: Wallet, labelKey: 'payments.other', descKey: 'payments.otherDesc', color: 'from-emerald-400 to-teal-500' },
  ];

  const METHOD_ICONS: Record<PaymentMethod, typeof QrCode> = {
    QR_CODE: QrCode,
    BILL_PAYMENT: Receipt,
    INTERNAL_ACCOUNT: Layers,
  };

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
  const numericAmount = parseNumberFromDots(amountFormatted);
  const amountWords = numberToWords(numericAmount, i18n.language, selectedSource?.currency || 'VND');
  const isExceedingBalance = selectedSource ? numericAmount > Number(selectedSource.balance) : false;

  const handlePay = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSource) {
      setAlertModal({
        isOpen: true,
        title: t('common.warningTitle'),
        message: t('transfer.missingSourceAccount'),
        type: 'warning',
      });
      return;
    }

    if (!merchantAccountId.trim()) {
      setAlertModal({
        isOpen: true,
        title: t('common.warningTitle'),
        message: t('payments.missingMerchant'),
        type: 'warning',
      });
      return;
    }

    if (numericAmount <= 0) {
      setAlertModal({
        isOpen: true,
        title: t('common.warningTitle'),
        message: t('payments.missingAmount'),
        type: 'warning',
      });
      return;
    }

    if (isExceedingBalance) {
      setAlertModal({
        isOpen: true,
        title: t('common.warningTitle'),
        message: t('payments.exceedBalance'),
        type: 'warning',
      });
      return;
    }

    setError(null);
    setSuccessMsg(null);
    setSubmitting(true);
    try {
      const res = await paymentApi.create(
        {
          sourceAccountId,
          merchantAccountId: merchantAccountId.trim(),
          amount: numericAmount,
          currency: selectedSource.currency,
          paymentMethod,
          description: description.trim() || t('payments.notePlaceholder'),
        },
        generateIdempotencyKey('PAY')
      );
      setSuccessMsg(`Thanh toán thành công! Ref: ${res.data.data.paymentRef}`);
      setAmountFormatted('');
      setDescription('');
      await loadHistory(sourceAccountId);
    } catch (err) {
      const errMsg = extractErrorMessage(err);
      setError(errMsg);
      setAlertModal({
        isOpen: true,
        title: t('common.errorTitle'),
        message: errMsg,
        type: 'error',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-black text-slate-900 leading-tight">{t('payments.title')}</h1>
        <p className="text-xs text-slate-500 mt-0.5">{t('payments.desc')}</p>
      </div>

      {/* Bill Presets Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {BILL_PRESETS.map(({ icon: Icon, labelKey, descKey, color }) => (
          <button
            key={labelKey}
            type="button"
            onClick={() => { setPaymentMethod('BILL_PAYMENT'); setDescription(`Thanh toán ${t(labelKey)}`); }}
            className="rounded-2xl bg-white border border-sky-100 hover:border-sky-300 p-3.5 flex flex-col items-center gap-2 cursor-pointer transition-all hover:shadow-md shadow-xs group"
          >
            <div className={`h-11 w-11 rounded-xl bg-gradient-to-br ${color} text-white flex items-center justify-center shadow-md group-hover:scale-105 transition-transform`}>
              <Icon className="h-5 w-5" />
            </div>
            <div className="text-center">
              <div className="text-xs font-bold text-slate-800">{t(labelKey)}</div>
              <div className="text-[10px] text-slate-400 mt-0.5">{t(descKey)}</div>
            </div>
          </button>
        ))}
      </div>

      {/* Main 2-col Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        {/* Payment Form */}
        <div className="lg:col-span-3 bg-white border border-sky-100 rounded-3xl p-5 sm:p-6 space-y-4 shadow-xs">
          <div className="flex items-center gap-2 mb-1">
            <div className="h-8 w-8 rounded-xl bg-sky-50 text-sky-600 border border-sky-200/80 flex items-center justify-center">
              <QrCode className="h-4 w-4" />
            </div>
            <h2 className="text-sm font-extrabold text-slate-900">{t('payments.formTitle')}</h2>
          </div>

          {error && (
            <div className="rounded-xl bg-rose-50 border border-rose-200 px-4 py-3 text-xs text-rose-700 font-medium">
              {error}
            </div>
          )}
          {successMsg && (
            <div className="rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3 text-xs text-emerald-700 font-bold flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          <form onSubmit={handlePay} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">{t('payments.paymentSource')}</label>
              <select
                value={sourceAccountId}
                onChange={(e) => { setSourceAccountId(e.target.value); loadHistory(e.target.value); }}
                required
                className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500"
              >
                {accounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.accountNumber} — {formatCurrency(Number(acc.balance), acc.currency)}
                  </option>
                ))}
              </select>
            </div>

            {/* Payment Method Tabs */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">{t('payments.method')}</label>
              <div className="grid grid-cols-3 gap-2">
                {(['QR_CODE', 'BILL_PAYMENT', 'INTERNAL_ACCOUNT'] as PaymentMethod[]).map((method) => {
                  const MethodIcon = METHOD_ICONS[method];
                  const labelKey = method === 'QR_CODE' ? 'payments.qrCode' : method === 'BILL_PAYMENT' ? 'payments.billPayment' : 'payments.internal';
                  return (
                    <button
                      key={method}
                      type="button"
                      onClick={() => setPaymentMethod(method)}
                      className={`flex flex-col items-center gap-1.5 py-2.5 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${
                        paymentMethod === method
                          ? 'bg-sky-50 border-sky-300 text-sky-700 shadow-xs'
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <MethodIcon className="h-4 w-4" />
                      {t(labelKey)}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">{t('payments.merchantId')}</label>
              <input
                type="text"
                required
                value={merchantAccountId}
                onChange={(e) => setMerchantAccountId(e.target.value)}
                placeholder={t('payments.merchantPlaceholder')}
                className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 text-sm text-slate-800 font-mono placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                {t('common.amount')} ({selectedSource?.currency || 'VND'})
              </label>
              <div className="relative">
                <input
                  type="text"
                  inputMode="numeric"
                  required
                  value={amountFormatted}
                  onChange={(e) => setAmountFormatted(formatNumberWithDots(e.target.value))}
                  placeholder="250.000"
                  className={`w-full px-3.5 py-2.5 rounded-xl bg-white border text-sm font-black tabular-nums focus:outline-none focus:ring-2 ${
                    isExceedingBalance
                      ? 'border-rose-300 focus:ring-rose-500 text-rose-700'
                      : 'border-slate-200 focus:ring-sky-500 text-slate-800'
                  }`}
                />
                <span className="absolute right-3.5 top-2.5 text-xs font-bold text-sky-600">
                  {selectedSource?.currency || 'VND'}
                </span>
              </div>

              {/* Amount in words preview */}
              {amountWords && (
                <div className="mt-2 px-3 py-2 rounded-xl bg-sky-50/80 border border-sky-200/70 text-xs font-bold text-sky-800 flex items-center gap-2 shadow-2xs">
                  <span className="text-sky-500 font-normal">≈</span>
                  <span className="leading-snug">{amountWords}</span>
                </div>
              )}

              {/* Exceed Balance Warning */}
              {isExceedingBalance && (
                <div className="mt-1.5 text-xs text-rose-600 font-bold flex items-center gap-1.5">
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                  <span>{t('payments.exceedBalance')}</span>
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">{t('payments.note')}</label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={t('payments.notePlaceholder')}
                className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>

            <button
              type="submit"
              disabled={submitting || !sourceAccountId}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 disabled:opacity-50 text-white text-sm font-bold flex items-center justify-center gap-2 cursor-pointer transition-all shadow-md shadow-sky-500/20"
            >
              <QrCode className="h-4 w-4" />
              {submitting ? t('payments.paying') : t('payments.payNow')}
            </button>
          </form>
        </div>

        {/* Payment History */}
        <div className="lg:col-span-2 bg-white border border-sky-100 rounded-3xl overflow-hidden shadow-xs">
          <div className="p-4 border-b border-sky-100">
            <h2 className="text-sm font-extrabold text-slate-900">{t('payments.historyTitle')}</h2>
            <p className="text-[11px] text-slate-500 mt-0.5">{history.length} {t('payments.historyDesc')}</p>
          </div>
          <div className="divide-y divide-sky-50 max-h-[480px] overflow-y-auto">
            {history.length === 0 ? (
              <div className="py-14 text-center">
                <Receipt className="h-10 w-10 text-sky-400 mx-auto mb-2" />
                <p className="text-xs text-slate-400">{t('payments.noHistory')}</p>
              </div>
            ) : (
              history.map((p) => (
                <div key={p.id} className="px-4 py-3.5 flex items-center justify-between gap-3 hover:bg-sky-50/50 transition-colors">
                  <div className="min-w-0">
                    <div className="text-xs font-mono font-bold text-slate-800">{p.paymentRef}</div>
                    <div className="text-[10px] text-slate-500 truncate mt-0.5">{p.paymentMethod} · {p.description || '—'}</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">{formatDateTime(p.createdAt)}</div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-sm font-black text-slate-900 tabular-nums">
                      -{formatCurrency(Number(p.amount), p.currency)}
                    </div>
                    <span
                      className={`inline-block mt-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                        p.status === 'COMPLETED'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : p.status === 'REFUNDED'
                          ? 'bg-sky-50 text-sky-700 border-sky-200'
                          : 'bg-rose-50 text-rose-700 border-rose-200'
                      }`}
                    >
                      {t(`status.${p.status}`)}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Alert Modal */}
      <AlertModal
        isOpen={alertModal.isOpen}
        onClose={() => setAlertModal((prev) => ({ ...prev, isOpen: false }))}
        title={alertModal.title}
        message={alertModal.message}
        type={alertModal.type}
      />
    </div>
  );
};
