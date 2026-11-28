import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  AlertTriangle,
  Building2,
  CheckCircle2,
  Layers,
  Loader2,
  QrCode,
  Receipt,
  Search,
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

const QUICK_AMOUNTS = [50_000, 100_000, 200_000, 500_000, 1_000_000, 2_000_000];

export const PaymentsPage: React.FC = () => {
  const { customer } = useAuth();
  const { t, i18n } = useTranslation();
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [sourceAccountId, setSourceAccountId] = useState('');
  const [merchantInput, setMerchantInput] = useState('');
  const [resolvedMerchantAcc, setResolvedMerchantAcc] = useState<BankAccount | null>(null);
  const [lookingUpMerchant, setLookingUpMerchant] = useState(false);
  const [merchantLookupError, setMerchantLookupError] = useState<string | null>(null);

  const [amountFormatted, setAmountFormatted] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('BILL_PAYMENT');
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
    {
      icon: Zap,
      labelKey: 'payments.electricity',
      descKey: 'payments.electricityDesc',
      color: 'from-amber-400 to-orange-500',
      accountNum: 'SYS-FEE-INCOME-001',
      defaultAmount: '350.000',
      defaultNote: 'Thanh toán tiền điện EVN HCMC',
    },
    {
      icon: Layers,
      labelKey: 'payments.water',
      descKey: 'payments.waterDesc',
      color: 'from-sky-400 to-blue-500',
      accountNum: 'SYS-FEE-INCOME-001',
      defaultAmount: '185.000',
      defaultNote: 'Thanh toán tiền nước Sawaco',
    },
    {
      icon: Smartphone,
      labelKey: 'payments.internet',
      descKey: 'payments.internetDesc',
      color: 'from-indigo-400 to-purple-500',
      accountNum: 'SYS-FEE-INCOME-001',
      defaultAmount: '220.000',
      defaultNote: 'Thanh toán cước Internet FPT/Viettel',
    },
    {
      icon: Wallet,
      labelKey: 'payments.other',
      descKey: 'payments.otherDesc',
      color: 'from-emerald-400 to-teal-500',
      accountNum: 'SYS-FEE-INCOME-001',
      defaultAmount: '100.000',
      defaultNote: 'Thanh toán phí dịch vụ công dân cư',
    },
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
        /* noop */
      }
    };
    init();
  }, [customer?.id]);

  // Lookup merchant account by account number or UUID
  const resolveMerchant = async (query: string) => {
    const trimmed = query.trim();
    if (!trimmed) {
      setResolvedMerchantAcc(null);
      setMerchantLookupError(null);
      return;
    }

    setLookingUpMerchant(true);
    setMerchantLookupError(null);
    try {
      // Check if it matches UUID format
      const isUUID = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(trimmed);
      let found: BankAccount | null = null;

      if (isUUID) {
        try {
          const res = await accountApi.getById(trimmed);
          found = res.data.data;
        } catch {
          /* try lookup by number */
        }
      }

      if (!found) {
        const res = await accountApi.lookupByNumber(trimmed);
        found = res.data.data;
      }

      if (found) {
        setResolvedMerchantAcc(found);
        setMerchantLookupError(null);
      } else {
        setResolvedMerchantAcc(null);
        setMerchantLookupError('Không tìm thấy tài khoản đối tác hoặc nhà cung cấp');
      }
    } catch {
      setResolvedMerchantAcc(null);
      setMerchantLookupError('Không tìm thấy tài khoản thụ hưởng / nhà cung cấp');
    } finally {
      setLookingUpMerchant(false);
    }
  };

  // Debounced lookup on manual typing
  useEffect(() => {
    if (!merchantInput.trim()) {
      setResolvedMerchantAcc(null);
      setMerchantLookupError(null);
      return;
    }
    const timer = setTimeout(() => {
      resolveMerchant(merchantInput);
    }, 450);
    return () => clearTimeout(timer);
  }, [merchantInput]);

  const handleSelectPreset = (preset: typeof BILL_PRESETS[number]) => {
    setPaymentMethod('BILL_PAYMENT');
    setMerchantInput(preset.accountNum);
    setAmountFormatted(preset.defaultAmount);
    setDescription(preset.defaultNote);
    resolveMerchant(preset.accountNum);
  };

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

    if (!resolvedMerchantAcc) {
      setAlertModal({
        isOpen: true,
        title: t('common.warningTitle'),
        message: 'Vui lòng nhập số tài khoản hoặc mã nhà cung cấp hợp lệ và chờ xác thực.',
        type: 'warning',
      });
      return;
    }

    if (resolvedMerchantAcc.id === selectedSource.id) {
      setAlertModal({
        isOpen: true,
        title: t('common.warningTitle'),
        message: 'Tài khoản nguồn và tài khoản thanh toán không được trùng nhau.',
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
          merchantAccountId: resolvedMerchantAcc.id,
          amount: numericAmount,
          currency: selectedSource.currency,
          paymentMethod,
          description: description.trim() || t('payments.notePlaceholder'),
        },
        generateIdempotencyKey('PAY')
      );
      const paymentData = res.data.data;
      setSuccessMsg(`Thanh toán thành công! Mã giao dịch: ${paymentData.paymentRef}`);
      setAlertModal({
        isOpen: true,
        title: t('common.successTitle'),
        message: `Thanh toán hóa đơn thành công ${formatCurrency(numericAmount, selectedSource.currency)} cho ${
          resolvedMerchantAcc.accountNumber
        }. Mã GD: ${paymentData.paymentRef}`,
        type: 'success',
      });
      setAmountFormatted('');
      setDescription('');
      // Refresh source account balance and payment history
      if (customer?.id) {
        const accRes = await accountApi.getByCustomer(customer.id);
        setAccounts(accRes.data.data.filter((a) => a.status === 'ACTIVE'));
      }
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
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-black text-slate-900 leading-tight">{t('payments.title')}</h1>
        <p className="text-xs text-slate-500 mt-0.5">{t('payments.desc')}</p>
      </div>

      {/* Bill Presets Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {BILL_PRESETS.map((preset) => {
          const { icon: Icon, labelKey, descKey, color } = preset;
          return (
            <button
              key={labelKey}
              type="button"
              onClick={() => handleSelectPreset(preset)}
              className="rounded-3xl bg-white border border-slate-100 hover:border-blue-300 p-4 flex flex-col items-center gap-2.5 cursor-pointer transition-all hover:shadow-md shadow-xs group"
            >
              <div
                className={`h-12 w-12 rounded-2xl bg-gradient-to-br ${color} text-white flex items-center justify-center shadow-md group-hover:scale-105 transition-transform`}
              >
                <Icon className="h-6 w-6" />
              </div>
              <div className="text-center">
                <div className="text-xs font-bold text-slate-800">{t(labelKey)}</div>
                <div className="text-[10px] text-slate-400 mt-0.5">{t(descKey)}</div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Main 2-col Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Payment Form (7 Cols) */}
        <div className="lg:col-span-7 bg-white border border-slate-100 rounded-3xl p-6 sm:p-7 space-y-5 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-[#4361ee]/10 text-[#4361ee] flex items-center justify-center font-bold">
              <Receipt className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-sm font-extrabold text-slate-900">{t('payments.formTitle')}</h2>
              <p className="text-xs text-slate-400">Thanh toán hóa đơn & dịch vụ tiện ích trực tuyến</p>
            </div>
          </div>

          {error && (
            <div className="rounded-2xl bg-rose-50 border border-rose-200 px-4 py-3 text-xs text-rose-700 font-medium">
              {error}
            </div>
          )}
          {successMsg && (
            <div className="rounded-2xl bg-emerald-50 border border-emerald-200 px-4 py-3 text-xs text-emerald-700 font-bold flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          <form onSubmit={handlePay} className="space-y-4">
            {/* Source Account */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">{t('payments.paymentSource')}</label>
              <select
                value={sourceAccountId}
                onChange={(e) => {
                  setSourceAccountId(e.target.value);
                  loadHistory(e.target.value);
                }}
                required
                className="w-full px-4 py-3 rounded-2xl bg-slate-50 border border-slate-200 text-sm font-semibold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#4361ee]"
              >
                {accounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.accountNumber} — {formatCurrency(Number(acc.balance), acc.currency)} ({t(`accountTypes.${acc.accountType}`)})
                  </option>
                ))}
              </select>
            </div>

            {/* Payment Method Tabs */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">{t('payments.method')}</label>
              <div className="grid grid-cols-3 gap-2">
                {(['BILL_PAYMENT', 'QR_CODE', 'INTERNAL_ACCOUNT'] as PaymentMethod[]).map((method) => {
                  const MethodIcon = METHOD_ICONS[method];
                  const labelKey =
                    method === 'BILL_PAYMENT'
                      ? 'payments.billPayment'
                      : method === 'QR_CODE'
                      ? 'payments.qrCode'
                      : 'payments.internal';
                  return (
                    <button
                      key={method}
                      type="button"
                      onClick={() => setPaymentMethod(method)}
                      className={`flex flex-col items-center gap-1.5 py-2.5 rounded-2xl text-xs font-bold border transition-colors cursor-pointer ${
                        paymentMethod === method
                          ? 'bg-[#4361ee]/10 border-[#4361ee] text-[#4361ee] shadow-xs'
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

            {/* Merchant Account Input & Lookup */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-slate-700">Tài khoản / Mã nhà cung cấp</label>
                {lookingUpMerchant && (
                  <span className="text-[10px] text-[#4361ee] flex items-center gap-1 font-semibold">
                    <Loader2 className="h-3 w-3 animate-spin" /> Đang kiểm tra...
                  </span>
                )}
              </div>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={merchantInput}
                  onChange={(e) => setMerchantInput(e.target.value)}
                  placeholder="Nhập số tài khoản hoặc mã nhà cung cấp (VD: SYS-FEE-INCOME-001)"
                  className={`w-full px-4 py-3 rounded-2xl border text-sm font-mono placeholder-slate-400 focus:outline-none focus:ring-2 ${
                    resolvedMerchantAcc
                      ? 'bg-emerald-50/50 border-emerald-300 text-emerald-900 focus:ring-emerald-500'
                      : merchantLookupError
                      ? 'bg-rose-50/50 border-rose-300 text-rose-900 focus:ring-rose-500'
                      : 'bg-slate-50 border-slate-200 text-slate-800 focus:bg-white focus:ring-[#4361ee]'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => resolveMerchant(merchantInput)}
                  className="absolute right-2 top-2 px-3 py-1.5 bg-[#4361ee] text-white rounded-xl text-xs font-bold hover:bg-[#3754e0] cursor-pointer flex items-center gap-1"
                >
                  <Search className="h-3.5 w-3.5" /> Kiểm tra
                </button>
              </div>

              {/* Resolved Merchant Account Card */}
              {resolvedMerchantAcc && (
                <div className="mt-2.5 p-3 rounded-2xl bg-emerald-50/90 border border-emerald-200 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="h-8 w-8 rounded-xl bg-emerald-500 text-white flex items-center justify-center shrink-0">
                      <Building2 className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="text-xs font-extrabold text-emerald-950 flex items-center gap-1.5">
                        <span>{resolvedMerchantAcc.accountNumber}</span>
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                      </div>
                      <div className="text-[10px] text-emerald-700 font-medium">
                        Tài khoản hợp lệ · Loại: {resolvedMerchantAcc.accountType} · Tiền tệ: {resolvedMerchantAcc.currency}
                      </div>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-200 text-emerald-800">
                    Sẵn sàng
                  </span>
                </div>
              )}

              {merchantLookupError && (
                <p className="mt-1.5 text-xs text-rose-600 font-semibold">{merchantLookupError}</p>
              )}
            </div>

            {/* Amount Input */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-slate-700">
                  {t('common.amount')} ({selectedSource?.currency || 'VND'})
                </label>
                {selectedSource && (
                  <span className="text-[11px] text-slate-400 font-medium">
                    Khả dụng: <span className="font-bold text-slate-700">{formatCurrency(Number(selectedSource.balance), selectedSource.currency)}</span>
                  </span>
                )}
              </div>
              <div className="relative">
                <input
                  type="text"
                  inputMode="numeric"
                  required
                  value={amountFormatted}
                  onChange={(e) => setAmountFormatted(formatNumberWithDots(e.target.value))}
                  placeholder="250.000"
                  className={`w-full px-4 py-3 rounded-2xl border text-sm font-black tabular-nums focus:outline-none focus:ring-2 ${
                    isExceedingBalance
                      ? 'bg-rose-50 border-rose-300 focus:ring-rose-500 text-rose-700'
                      : 'bg-slate-50 border-slate-200 focus:bg-white focus:ring-[#4361ee] text-slate-800'
                  }`}
                />
                <span className="absolute right-4 top-3 text-xs font-bold text-[#4361ee]">
                  {selectedSource?.currency || 'VND'}
                </span>
              </div>

              {/* Quick Amount Chips */}
              <div className="flex flex-wrap gap-1.5 mt-2">
                {QUICK_AMOUNTS.map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setAmountFormatted(formatNumberWithDots(amt.toString()))}
                    className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-bold cursor-pointer transition-colors"
                  >
                    {amt >= 1_000_000 ? `${amt / 1_000_000}M` : `${amt / 1_000}k`}
                  </button>
                ))}
              </div>

              {/* Amount in words preview */}
              {amountWords && (
                <div className="mt-2.5 px-3 py-2 rounded-xl bg-blue-50/70 border border-blue-200/60 text-xs font-bold text-[#4361ee] flex items-center gap-2">
                  <span className="text-blue-400 font-normal">≈</span>
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

            {/* Note */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">{t('payments.note')}</label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={t('payments.notePlaceholder')}
                className="w-full px-4 py-3 rounded-2xl bg-slate-50 border border-slate-200 text-sm text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#4361ee]"
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={submitting || !sourceAccountId || !resolvedMerchantAcc || isExceedingBalance}
              className="w-full py-4 rounded-2xl bg-[#4361ee] hover:bg-[#3754e0] disabled:opacity-50 text-white text-sm font-bold flex items-center justify-center gap-2 cursor-pointer transition-all shadow-md shadow-blue-500/25"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>{t('payments.paying')}</span>
                </>
              ) : (
                <>
                  <Receipt className="h-4 w-4" />
                  <span>{t('payments.payNow')}</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Payment History (5 Cols) */}
        <div className="lg:col-span-5 bg-white border border-slate-100 rounded-3xl overflow-hidden shadow-xs flex flex-col">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-extrabold text-slate-900">{t('payments.historyTitle')}</h2>
              <p className="text-[11px] text-slate-400 mt-0.5">{history.length} {t('payments.historyDesc')}</p>
            </div>
            <span className="h-8 w-8 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center">
              <Receipt className="h-4 w-4" />
            </span>
          </div>

          <div className="divide-y divide-slate-100 flex-1 max-h-[580px] overflow-y-auto">
            {history.length === 0 ? (
              <div className="py-20 text-center px-4">
                <div className="h-12 w-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
                  <Receipt className="h-6 w-6" />
                </div>
                <p className="text-xs font-semibold text-slate-500">{t('payments.noHistory')}</p>
                <p className="text-[11px] text-slate-400 mt-1">Các giao dịch thanh toán hóa đơn sẽ xuất hiện tại đây.</p>
              </div>
            ) : (
              history.map((p) => (
                <div key={p.id} className="p-4 flex items-center justify-between gap-3 hover:bg-slate-50/70 transition-colors">
                  <div className="min-w-0">
                    <div className="text-xs font-mono font-bold text-slate-800">{p.paymentRef}</div>
                    <div className="text-[11px] text-slate-500 truncate mt-0.5">{p.paymentMethod} · {p.description || '—'}</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">{formatDateTime(p.createdAt)}</div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-sm font-black text-slate-900 tabular-nums">
                      -{formatCurrency(Number(p.amount), p.currency)}
                    </div>
                    <span
                      className={`inline-block mt-1 text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
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
