import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  AlertTriangle,
  ArrowLeftRight,
  CheckCircle2,
  Clock,
  QrCode,
  Search,
  Send,
  ShieldCheck,
  UserCheck,
  Zap,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { accountApi, transactionApi } from '../api/bankingApi';
import { extractErrorMessage } from '../api/client';
import type { BankAccount, TransactionRecord } from '../types/banking';
import {
  formatCurrency,
  formatDateTime,
  formatNumberWithDots,
  generateIdempotencyKey,
  numberToWords,
  parseNumberFromDots,
} from '../utils/format';
import { VietQRModal } from '../components/VietQRModal';
import { AlertModal } from '../components/AlertModal';

const QUICK_AMOUNTS = [50_000, 100_000, 200_000, 500_000, 1_000_000, 2_000_000];

const FREQUENT_BENEFICIARIES = [
  { name: 'Nguyễn Văn A', account: 'ACC-DEMO-001', bank: 'NovaBank', initial: 'A' },
  { name: 'Trần Thị B', account: 'ACC-DEMO-002', bank: 'NovaBank', initial: 'B' },
];

export const TransferPage: React.FC = () => {
  const { customer, user } = useAuth();
  const { t, i18n } = useTranslation();
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [sourceAccountId, setSourceAccountId] = useState('');
  const [targetInput, setTargetInput] = useState('');
  const [resolvedAccount, setResolvedAccount] = useState<BankAccount | null>(null);
  const [resolving, setResolving] = useState(false);
  const [amountFormatted, setAmountFormatted] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [receipt, setReceipt] = useState<TransactionRecord | null>(null);
  const [showQrModal, setShowQrModal] = useState(false);

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

  const loadAccounts = async () => {
    if (!customer?.id) return;
    try {
      const res = await accountApi.getByCustomer(customer.id);
      const active = res.data.data.filter((a) => a.status === 'ACTIVE');
      setAccounts(active);
      if (active.length > 0 && !sourceAccountId) setSourceAccountId(active[0].id);
    } catch { /* noop */ }
  };

  useEffect(() => { loadAccounts(); }, [customer?.id]);

  const selectedSource = accounts.find((a) => a.id === sourceAccountId);
  const numericAmount = parseNumberFromDots(amountFormatted);
  const amountWords = numberToWords(numericAmount, i18n.language, selectedSource?.currency || 'VND');
  const isExceedingBalance = selectedSource ? numericAmount > Number(selectedSource.balance) : false;

  const handleLookup = async (inputVal: string) => {
    const trimmed = inputVal.trim();
    if (!trimmed) { setResolvedAccount(null); return; }
    setResolving(true);
    try {
      if (trimmed.startsWith('ACC-') || trimmed.startsWith('SYS-')) {
        const res = await accountApi.lookupByNumber(trimmed);
        setResolvedAccount(res.data.data);
      } else if (trimmed.length === 36 && trimmed.includes('-')) {
        const res = await accountApi.getById(trimmed);
        setResolvedAccount(res.data.data);
      } else {
        const res = await accountApi.lookupByNumber(trimmed);
        setResolvedAccount(res.data.data);
      }
    } catch { setResolvedAccount(null); } finally { setResolving(false); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // 1. Kiểm tra tài khoản nguồn
    if (!selectedSource) {
      setAlertModal({
        isOpen: true,
        title: t('common.warningTitle'),
        message: t('transfer.missingSourceAccount'),
        type: 'warning',
      });
      return;
    }

    // 2. Kiểm tra thông tin người nhận
    const finalTargetId = resolvedAccount ? resolvedAccount.id : targetInput.trim();
    if (!finalTargetId) {
      setAlertModal({
        isOpen: true,
        title: t('common.warningTitle'),
        message: t('transfer.missingTargetAccount'),
        type: 'warning',
      });
      return;
    }

    // 3. Kiểm tra số tiền hợp lệ
    if (numericAmount <= 0) {
      setAlertModal({
        isOpen: true,
        title: t('common.warningTitle'),
        message: t('transfer.missingAmount'),
        type: 'warning',
      });
      return;
    }

    // 4. Kiểm tra số dư khả dụng
    if (isExceedingBalance) {
      setAlertModal({
        isOpen: true,
        title: t('common.warningTitle'),
        message: t('transfer.exceedBalanceModal', {
          amount: formatCurrency(numericAmount, selectedSource.currency),
          balance: formatCurrency(Number(selectedSource.balance), selectedSource.currency),
        }),
        type: 'warning',
      });
      return;
    }

    setSubmitting(true);
    try {
      const res = await transactionApi.transfer(
        {
          sourceAccountId,
          targetAccountId: finalTargetId,
          amount: numericAmount,
          currency: selectedSource.currency,
          description: description.trim() || t('transfer.descriptionPlaceholder'),
        },
        generateIdempotencyKey('TRF')
      );
      setReceipt(res.data.data);
      setAmountFormatted('');
      setDescription('');
      setTargetInput('');
      setResolvedAccount(null);
      await loadAccounts();
    } catch (err) {
      setAlertModal({
        isOpen: true,
        title: t('common.errorTitle'),
        message: extractErrorMessage(err),
        type: 'error',
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (receipt) {
    return (
      <div className="max-w-lg mx-auto">
        <div className="rounded-3xl bg-white border border-sky-100 p-8 text-center shadow-lg card-glow">
          <div className="h-16 w-16 rounded-full bg-emerald-50 border-2 border-emerald-200 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="h-9 w-9 text-emerald-600" />
          </div>
          <span className="inline-block px-3.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold mb-3 border border-emerald-200">
            {t('transfer.successBadge')}
          </span>
          <h2 className="text-xl font-black text-slate-900 mb-1">{t('transfer.successTitle')}</h2>
          <p className="text-4xl font-black tabular-nums text-sky-600 my-4">
            {formatCurrency(Number(receipt.amount), receipt.currency)}
          </p>
          <div className="rounded-2xl bg-slate-50 border border-slate-200/80 p-4 text-left space-y-3 my-5">
            {[
              { label: t('transfer.txRef'), value: receipt.transactionRef, mono: true },
              { label: t('common.status'), value: t(`status.${receipt.status}`) },
              { label: t('transfer.description'), value: receipt.description || '—' },
              { label: t('transfer.txTime'), value: formatDateTime(receipt.createdAt) },
            ].map(({ label, value, mono }) => (
              <div key={label} className="flex justify-between gap-2 text-xs">
                <span className="text-slate-500 font-medium">{label}</span>
                <span className={`font-bold text-slate-800 text-right ${mono ? 'font-mono' : ''}`}>{value}</span>
              </div>
            ))}
          </div>
          <button
            onClick={() => setReceipt(null)}
            className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white text-sm font-bold cursor-pointer transition-all shadow-md shadow-sky-500/20"
          >
            {t('transfer.newTx')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 leading-tight">{t('transfer.title')}</h1>
          <p className="text-xs text-slate-500 mt-0.5">{t('transfer.desc')}</p>
        </div>
        {selectedSource && (
          <button
            onClick={() => setShowQrModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white hover:bg-sky-50 border border-sky-200 text-sky-700 text-xs font-bold cursor-pointer transition-colors shadow-xs"
          >
            <QrCode className="h-4 w-4 text-sky-600" />
            <span>{t('transfer.myQr')}</span>
          </button>
        )}
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { icon: Zap, label: t('transfer.instant'), desc: t('transfer.napas'), color: 'text-sky-600 bg-sky-50 border border-sky-200/80' },
          { icon: ShieldCheck, label: t('transfer.security'), desc: t('transfer.jwtOtp'), color: 'text-indigo-600 bg-indigo-50 border border-indigo-200/80' },
          { icon: Clock, label: t('transfer.fee'), desc: t('transfer.free'), color: 'text-emerald-600 bg-emerald-50 border border-emerald-200/80' },
        ].map(({ icon: Icon, label, desc, color }) => (
          <div key={label} className="rounded-2xl bg-white border border-sky-100 p-3 flex items-center gap-2.5 shadow-xs">
            <div className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 ${color}`}>
              <Icon className="h-4.5 w-4.5" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-900">{label}</div>
              <div className="text-[10px] text-slate-500">{desc}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Desktop: 2-col Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        {/* Transfer Form */}
        <div className="lg:col-span-3 bg-white border border-sky-100 rounded-3xl p-5 sm:p-6 space-y-4 shadow-xs">
          <div className="flex items-center gap-2 mb-1">
            <div className="h-8 w-8 rounded-xl bg-sky-50 text-sky-600 border border-sky-200/80 flex items-center justify-center">
              <ArrowLeftRight className="h-4 w-4" />
            </div>
            <h2 className="text-sm font-extrabold text-slate-900">{t('transfer.info')}</h2>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Source Account */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">{t('transfer.sourceAccount')}</label>
              <select
                value={sourceAccountId}
                onChange={(e) => setSourceAccountId(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500"
              >
                {accounts.length === 0 ? (
                  <option value="">{t('common.noData')}</option>
                ) : (
                  accounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.accountNumber} ({t(`accountTypes.${acc.accountType}`)}) — {formatCurrency(Number(acc.balance), acc.currency)}
                    </option>
                  ))
                )}
              </select>
              {selectedSource && (
                <div className="mt-1.5 text-[11px] text-slate-500">
                  {t('transfer.availableBalance')}:{' '}
                  <span className="font-bold text-sky-600 tabular-nums">
                    {formatCurrency(Number(selectedSource.balance), selectedSource.currency)}
                  </span>
                </div>
              )}
            </div>

            {/* Target Account */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-slate-700">{t('transfer.targetAccount')}</label>
                {resolving && <span className="text-[11px] text-sky-600 animate-pulse font-medium">{t('transfer.resolving')}</span>}
              </div>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={targetInput}
                  onChange={(e) => { setTargetInput(e.target.value); handleLookup(e.target.value); }}
                  placeholder={t('transfer.targetPlaceholder')}
                  className="w-full pl-3.5 pr-10 py-2.5 rounded-xl bg-white border border-slate-200 text-sm text-slate-800 font-mono placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
                <button
                  type="button"
                  onClick={() => handleLookup(targetInput)}
                  className="absolute right-2.5 top-2.5 p-1 text-slate-400 hover:text-sky-600 cursor-pointer transition-colors"
                >
                  <Search className="h-4 w-4" />
                </button>
              </div>

              {resolvedAccount && (
                <div className="mt-2.5 p-3 rounded-2xl bg-sky-50/80 border border-sky-200 flex items-center gap-2.5">
                  <div className="h-8 w-8 rounded-xl bg-sky-500 text-white flex items-center justify-center font-bold text-sm shrink-0 shadow-xs">
                    <UserCheck className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-sky-950">
                      {t('transfer.validAccount')}: {resolvedAccount.accountNumber}
                    </div>
                    <div className="text-[10px] text-sky-700 font-medium">
                      {t(`accountTypes.${resolvedAccount.accountType}`)} · {resolvedAccount.currency} · {t(`status.${resolvedAccount.status}`)}
                    </div>
                  </div>
                  <span className="ml-auto text-sky-700 font-bold text-xs">✓ {t('transfer.verified')}</span>
                </div>
              )}
            </div>

            {/* Amount with Auto Thousand-dot Format & Amount in Words */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">{t('transfer.amount')}</label>
              <div className="relative">
                <input
                  type="text"
                  inputMode="numeric"
                  required
                  value={amountFormatted}
                  onChange={(e) => setAmountFormatted(formatNumberWithDots(e.target.value))}
                  placeholder="500.000"
                  className={`w-full px-3.5 py-2.5 rounded-xl bg-white border text-sm text-slate-800 font-black tabular-nums focus:outline-none focus:ring-2 ${
                    isExceedingBalance
                      ? 'border-rose-300 focus:ring-rose-500 text-rose-700'
                      : 'border-slate-200 focus:ring-sky-500'
                  }`}
                />
                <span className="absolute right-3.5 top-2.5 text-xs font-bold text-sky-600">
                  {selectedSource?.currency || 'VND'}
                </span>
              </div>

              {/* Amount in Words preview */}
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
                  <span>{t('transfer.exceedBalance')}</span>
                </div>
              )}

              {/* Quick Amount Chips */}
              <div className="flex flex-wrap gap-2 mt-2.5">
                {QUICK_AMOUNTS.map((val) => {
                  const formattedChip = formatNumberWithDots(val);
                  return (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setAmountFormatted(formattedChip)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-colors cursor-pointer tabular-nums ${
                        amountFormatted === formattedChip
                          ? 'bg-sky-600 text-white shadow-xs'
                          : 'bg-sky-50 hover:bg-sky-100 text-sky-800 border border-sky-100'
                      }`}
                    >
                      {formattedChip} {selectedSource?.currency || 'VND'}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">{t('transfer.description')}</label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={t('transfer.descriptionPlaceholder')}
                className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 disabled:opacity-50 text-white text-sm font-bold flex items-center justify-center gap-2 cursor-pointer transition-all shadow-md shadow-sky-500/20"
            >
              <Send className="h-4 w-4" />
              {submitting ? t('transfer.submitting') : t('transfer.submit')}
            </button>
          </form>
        </div>

        {/* Right Panel: Frequent Beneficiaries + Tips */}
        <div className="lg:col-span-2 space-y-4">
          {/* Frequent Beneficiaries */}
          <div className="bg-white border border-sky-100 rounded-3xl p-5 shadow-xs">
            <h2 className="text-sm font-extrabold text-slate-900 mb-3">{t('transfer.frequentBeneficiaries')}</h2>
            <div className="space-y-2">
              {FREQUENT_BENEFICIARIES.map((b) => (
                <button
                  key={b.account}
                  type="button"
                  onClick={() => { setTargetInput(b.account); handleLookup(b.account); }}
                  className="w-full flex items-center gap-3 p-3 rounded-2xl bg-sky-50/50 hover:bg-sky-50 border border-sky-100 hover:border-sky-200 cursor-pointer transition-colors text-left"
                >
                  <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-sky-500 to-blue-600 flex items-center justify-center text-white font-bold text-sm shrink-0 shadow-xs">
                    {b.initial}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-bold text-slate-800">{b.name}</div>
                    <div className="text-[10px] text-slate-500 font-mono">{b.account} · {b.bank}</div>
                  </div>
                </button>
              ))}
              <div className="p-3 rounded-2xl border border-dashed border-sky-200 text-center text-[11px] text-slate-500">
                {t('transfer.frequentNote')}
              </div>
            </div>
          </div>

          {/* Transfer Guidelines */}
          <div className="bg-gradient-to-br from-sky-50 to-blue-50/60 border border-sky-100 rounded-3xl p-5">
            <h2 className="text-sm font-extrabold text-slate-900 mb-3">{t('transfer.tipsTitle')}</h2>
            <ul className="space-y-2.5 text-xs text-slate-600">
              {[t('transfer.tip1'), t('transfer.tip2'), t('transfer.tip3'), t('transfer.tip4')].map((tip, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-sky-600 font-bold shrink-0">·</span>
                  <span>{tip}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* VietQR Modal */}
      {selectedSource && (
        <VietQRModal
          isOpen={showQrModal}
          onClose={() => setShowQrModal(false)}
          accountNumber={selectedSource.accountNumber}
          accountHolderName={customer?.fullName || user?.username || 'CHU TAI KHOAN'}
          bankName="MBBank (MB)"
        />
      )}

      {/* Alert / Error Modal */}
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
