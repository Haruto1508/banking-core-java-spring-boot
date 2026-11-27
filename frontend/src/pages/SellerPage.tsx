import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  CheckCircle2,
  Copy,
  Play,
  QrCode,
  Radio,
  RefreshCw,
  ShoppingBag,
  Store,
  TrendingUp,
  Wallet,
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
  numberToWords,
  parseNumberFromDots,
} from '../utils/format';
import { AlertModal } from '../components/AlertModal';

const QUICK_AMOUNTS = [50_000, 100_000, 200_000, 500_000, 1_000_000, 2_000_000];

export const SellerPage: React.FC = () => {
  const { customer, user } = useAuth();
  const { t, i18n } = useTranslation();
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [recentTransactions, setRecentTransactions] = useState<TransactionRecord[]>([]);

  // POS Form state
  const [orderCode, setOrderCode] = useState(() => `DH${Math.floor(10000 + Math.random() * 90000)}`);
  const [amountFormatted, setAmountFormatted] = useState('250.000');
  const [description, setDescription] = useState('Thanh toan don hang');
  const [qrGenerated, setQrGenerated] = useState(true);
  const [simulating, setSimulating] = useState(false);
  const [isPaid, setIsPaid] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

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

  const selectedAcc = accounts.find((a) => a.id === selectedAccountId);
  const numericAmount = Math.max(0, parseNumberFromDots(amountFormatted));
  const amountWords = numberToWords(numericAmount, i18n.language, selectedAcc?.currency || 'VND');

  const loadData = async () => {
    if (!customer?.id) return;
    try {
      const res = await accountApi.getByCustomer(customer.id);
      const active = res.data.data.filter((a) => a.status === 'ACTIVE');
      setAccounts(active);
      if (active.length > 0 && !selectedAccountId) {
        setSelectedAccountId(active[0].id);
        await loadTransactions(active[0].id);
      }
    } catch { /* noop */ }
  };

  const loadTransactions = async (accId: string) => {
    if (!accId) return;
    try {
      const txRes = await transactionApi.getHistory(accId, { page: 0, size: 8 });
      setRecentTransactions(txRes.data.data.content);
    } catch { /* noop */ }
  };

  useEffect(() => {
    loadData();
  }, [customer?.id]);

  const handleGenerateCode = () => {
    const newCode = `DH${Math.floor(10000 + Math.random() * 90000)}`;
    setOrderCode(newCode);
    setDescription(`Thanh toan don hang ${newCode}`);
    setIsPaid(false);
    setQrGenerated(true);
  };

  const fullDescription = `${orderCode} ${description.trim()}`.trim();
  const qrUrl = selectedAcc
    ? `https://img.vietqr.io/image/MB-${selectedAcc.accountNumber}-compact2.png?amount=${numericAmount}&addInfo=${encodeURIComponent(
        fullDescription
      )}&accountName=${encodeURIComponent(customer?.fullName || user?.username || 'SEPAY MERCHANT')}`
    : '';

  // Simulate customer paying the VietQR order via SePay Webhook
  const handleSimulatePayment = async () => {
    if (!selectedAcc) {
      setAlertModal({
        isOpen: true,
        title: t('common.warningTitle'),
        message: t('seller.receivingAccount') + ' không hợp lệ.',
        type: 'warning',
      });
      return;
    }

    if (numericAmount <= 0) {
      setAlertModal({
        isOpen: true,
        title: t('common.warningTitle'),
        message: t('transfer.missingAmount'),
        type: 'warning',
      });
      return;
    }

    setSimulating(true);
    try {
      // Direct deposit into merchant account with the exact order description
      await transactionApi.deposit({
        accountId: selectedAcc.id,
        amount: numericAmount,
        currency: selectedAcc.currency,
        description: `SEPAY ${fullDescription}`,
      });
      setIsPaid(true);
      await loadData();
      await loadTransactions(selectedAcc.id);
      setAlertModal({
        isOpen: true,
        title: t('common.successTitle'),
        message: `${t('seller.paidSuccess')} Đơn hàng ${orderCode} đã nhận đủ ${formatCurrency(
          numericAmount,
          selectedAcc.currency
        )}.`,
        type: 'success',
      });
    } catch (err) {
      setAlertModal({
        isOpen: true,
        title: t('common.errorTitle'),
        message: extractErrorMessage(err),
        type: 'error',
      });
    } finally {
      setSimulating(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(null), 2000);
  };

  // Calculate today's revenue (deposit transactions)
  const todayRevenue = recentTransactions
    .filter((tx) => tx.transactionType === 'DEPOSIT' && tx.status === 'SUCCESS')
    .reduce((sum, tx) => sum + Number(tx.amount), 0);

  const paidCount = recentTransactions.filter((tx) => tx.transactionType === 'DEPOSIT').length;

  return (
    <div className="space-y-6">
      {/* ─── Hero Header ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold shadow-2xs">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
              {t('seller.badge')}
            </span>
            <span className="text-xs text-slate-400 font-mono">SEPAY-HUB-v2</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 leading-tight">
            {t('seller.title')}
          </h1>
          <p className="text-xs text-slate-500 mt-0.5 max-w-xl">
            {t('seller.sub')}
          </p>
        </div>

        {/* Receiving Account Selector */}
        {accounts.length > 0 && (
          <div className="bg-white border border-sky-100 rounded-2xl p-3 shadow-xs flex items-center gap-3 self-start sm:self-auto">
            <div className="h-10 w-10 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center shrink-0">
              <Store className="h-5 w-5" />
            </div>
            <div>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                {t('seller.receivingAccount')}
              </div>
              <select
                value={selectedAccountId}
                onChange={(e) => {
                  setSelectedAccountId(e.target.value);
                  loadTransactions(e.target.value);
                }}
                className="text-xs font-bold text-slate-900 bg-transparent border-none focus:outline-none cursor-pointer"
              >
                {accounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.accountNumber} ({formatCurrency(Number(acc.balance), acc.currency)})
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}
      </div>

      {/* ─── Metrics Row ─── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        {[
          {
            label: t('seller.todayRevenue'),
            value: formatCurrency(todayRevenue, selectedAcc?.currency || 'VND'),
            icon: TrendingUp,
            color: 'from-emerald-500 to-teal-600',
          },
          {
            label: t('seller.paidOrders'),
            value: `${paidCount} đơn`,
            icon: ShoppingBag,
            color: 'from-sky-500 to-blue-600',
          },
          {
            label: t('seller.receivingAccount'),
            value: selectedAcc?.accountNumber || '—',
            icon: Wallet,
            color: 'from-indigo-500 to-violet-600',
            mono: true,
          },
          {
            label: t('seller.sepayStatus'),
            value: t('seller.autoDetectReady'),
            icon: Zap,
            color: 'from-amber-500 to-orange-500',
          },
        ].map(({ label, value, icon: Icon, color, mono }) => (
          <div key={label} className="rounded-3xl bg-white border border-sky-100 p-4 shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold text-slate-400">{label}</span>
              <div className={`h-8 w-8 rounded-xl bg-gradient-to-br ${color} text-white flex items-center justify-center shadow-xs`}>
                <Icon className="h-4 w-4" />
              </div>
            </div>
            <div className={`text-base sm:text-lg font-black text-slate-900 ${mono ? 'font-mono' : 'tabular-nums'}`}>
              {value}
            </div>
          </div>
        ))}
      </div>

      {/* ─── Main 2-Col Layout: POS Register vs Orders & Dev Hub ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Left: POS Register / Dynamic VietQR Generator (3 cols) */}
        <div className="lg:col-span-3 bg-white border border-sky-100 rounded-3xl p-5 sm:p-6 space-y-5 shadow-xs">
          <div className="flex items-center justify-between border-b border-sky-50 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-xl bg-sky-50 text-sky-600 border border-sky-200 flex items-center justify-center">
                <QrCode className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-sm font-extrabold text-slate-900">{t('seller.posTitle')}</h2>
                <p className="text-[10px] text-slate-400 font-medium">{t('seller.posSub')}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleGenerateCode}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sky-50 hover:bg-sky-100 text-sky-700 text-xs font-bold transition-colors cursor-pointer border border-sky-200/80"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span>{t('seller.generateNewCode')}</span>
            </button>
          </div>

          {/* Form */}
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {/* Order Code */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">{t('seller.orderCode')}</label>
                <input
                  type="text"
                  value={orderCode}
                  onChange={(e) => {
                    setOrderCode(e.target.value.toUpperCase());
                    setIsPaid(false);
                  }}
                  placeholder={t('seller.orderCodePlaceholder')}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm font-mono font-bold text-slate-900 uppercase focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>

              {/* Order Amount with Auto Dot Format */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  {t('seller.orderAmount')} ({selectedAcc?.currency || 'VND'})
                </label>
                <div className="relative">
                  <input
                    type="text"
                    inputMode="numeric"
                    required
                    value={amountFormatted}
                    onChange={(e) => {
                      setAmountFormatted(formatNumberWithDots(e.target.value));
                      setIsPaid(false);
                    }}
                    placeholder={t('seller.orderAmountPlaceholder')}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 text-sm font-black text-slate-900 tabular-nums focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                  <span className="absolute right-3.5 top-2.5 text-xs font-bold text-sky-600">
                    {selectedAcc?.currency || 'VND'}
                  </span>
                </div>
              </div>
            </div>

            {/* Live Amount In Words */}
            {amountWords && (
              <div className="px-3.5 py-2 rounded-xl bg-sky-50/80 border border-sky-200/70 text-xs font-bold text-sky-800 flex items-center gap-2 shadow-2xs">
                <span className="text-sky-500 font-normal">≈</span>
                <span className="leading-snug">{amountWords}</span>
              </div>
            )}

            {/* Quick Amount Chips */}
            <div className="flex flex-wrap gap-2">
              {QUICK_AMOUNTS.map((val) => {
                const formattedChip = formatNumberWithDots(val);
                return (
                  <button
                    key={val}
                    type="button"
                    onClick={() => {
                      setAmountFormatted(formattedChip);
                      setIsPaid(false);
                    }}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-colors cursor-pointer tabular-nums ${
                      amountFormatted === formattedChip
                        ? 'bg-sky-600 text-white shadow-xs'
                        : 'bg-sky-50 hover:bg-sky-100 text-sky-800 border border-sky-100'
                    }`}
                  >
                    {formattedChip} {selectedAcc?.currency || 'VND'}
                  </button>
                );
              })}
            </div>

            {/* Order Note */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">{t('seller.orderDesc')}</label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={t('seller.orderDescPlaceholder')}
                className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>
          </div>

          {/* QR Display Area */}
          {qrGenerated && selectedAcc && (
            <div className="pt-2 border-t border-sky-100">
              <div className="bg-gradient-to-b from-sky-50/60 to-white border border-sky-200/80 rounded-2xl p-5 flex flex-col items-center justify-center text-center">
                <div className="mb-2">
                  <span className="text-xs font-bold text-slate-700">{t('seller.qrReadyTitle')}</span>
                  <p className="text-[11px] text-slate-500">{t('seller.qrReadySub')}</p>
                </div>

                {/* QR Image Box */}
                <div className="bg-white p-3 rounded-2xl shadow-md border border-sky-200 my-3 relative">
                  <img
                    src={qrUrl}
                    alt="VietQR Napas247"
                    className="w-56 h-auto object-contain mx-auto"
                    loading="lazy"
                  />
                  {isPaid && (
                    <div className="absolute inset-0 bg-emerald-600/90 backdrop-blur-xs rounded-2xl flex flex-col items-center justify-center text-white p-4 animate-in fade-in zoom-in-95">
                      <CheckCircle2 className="h-14 w-14 mb-2 animate-bounce" />
                      <span className="text-sm font-black uppercase tracking-wider">{t('seller.paidSuccess')}</span>
                      <span className="text-xs font-mono mt-1 opacity-90">{formatCurrency(numericAmount, selectedAcc.currency)}</span>
                    </div>
                  )}
                </div>

                {/* Status Bar */}
                <div className="w-full max-w-sm mb-4">
                  {isPaid ? (
                    <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs font-bold flex items-center justify-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      <span>Đơn hàng {orderCode} đã thanh toán thành công!</span>
                    </div>
                  ) : (
                    <div className="p-3 rounded-xl bg-sky-50 border border-sky-200 text-sky-800 text-xs font-medium flex items-center justify-center gap-2 animate-pulse">
                      <span className="h-2 w-2 rounded-full bg-sky-600"></span>
                      <span>{t('seller.waitingPayment')}</span>
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex flex-wrap items-center justify-center gap-2.5 w-full max-w-md">
                  <button
                    type="button"
                    disabled={simulating || isPaid}
                    onClick={handleSimulatePayment}
                    className="flex-1 min-w-[200px] py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 disabled:opacity-50 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-md shadow-emerald-500/20 cursor-pointer transition-all"
                  >
                    <Play className="h-4 w-4 fill-white" />
                    <span>{simulating ? t('seller.simulating') : t('seller.simulateWebhook')}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => copyToClipboard(qrUrl, 'qr')}
                    className="py-3 px-3.5 rounded-xl border border-sky-200 bg-white hover:bg-sky-50 text-sky-700 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Copy className="h-3.5 w-3.5" />
                    <span>{copied === 'qr' ? t('common.copied') : t('seller.copyQrLink')}</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right: Orders History & API Integration Hub (2 cols) */}
        <div className="lg:col-span-2 space-y-5">
          {/* Recent Orders List */}
          <div className="bg-white border border-sky-100 rounded-3xl overflow-hidden shadow-xs">
            <div className="p-4 border-b border-sky-100 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-extrabold text-slate-900">{t('seller.recentOrdersTitle')}</h3>
                <p className="text-[10px] text-slate-400 font-medium">{t('seller.recentOrdersDesc')}</p>
              </div>
              <button
                onClick={() => selectedAcc && loadTransactions(selectedAcc.id)}
                className="p-1.5 text-slate-400 hover:text-sky-600 rounded-lg hover:bg-sky-50 transition-colors cursor-pointer"
              >
                <RefreshCw className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="divide-y divide-sky-50 max-h-[340px] overflow-y-auto">
              {recentTransactions.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-400">
                  <ShoppingBag className="h-9 w-9 text-sky-300 mx-auto mb-2" />
                  {t('seller.noOrders')}
                </div>
              ) : (
                recentTransactions.map((tx) => (
                  <div key={tx.id} className="p-3.5 hover:bg-sky-50/50 transition-colors flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-slate-900 truncate">
                        {tx.description || 'SePay Payment'}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                        {formatDateTime(tx.createdAt)}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-xs font-black text-emerald-600 tabular-nums">
                        +{formatCurrency(Number(tx.amount), tx.currency)}
                      </div>
                      <span className="inline-block mt-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                        {tx.status}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Webhook & Developer Integration */}
          <div className="bg-sky-50/60 border border-sky-100 rounded-3xl p-5 space-y-3.5 shadow-xs">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-lg bg-sky-500 text-white flex items-center justify-center shadow-2xs">
                <Radio className="h-4 w-4" />
              </div>
              <div>
                <h4 className="text-xs font-extrabold text-slate-900">{t('seller.apiIntegrationTitle')}</h4>
                <p className="text-[10px] text-slate-500">{t('seller.apiIntegrationSub')}</p>
              </div>
            </div>

            <div className="space-y-2 text-xs">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-1">{t('seller.webhookUrl')}</label>
                <div className="flex items-center gap-1.5 bg-white border border-sky-200 rounded-xl px-3 py-2 font-mono text-[11px] text-slate-800">
                  <span className="truncate flex-1">http://localhost:8081/api/v1/sepay/webhook</span>
                  <button
                    onClick={() => copyToClipboard('http://localhost:8081/api/v1/sepay/webhook', 'url')}
                    className="text-sky-600 hover:text-sky-800 cursor-pointer"
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-1">{t('seller.apiKey')}</label>
                <div className="flex items-center gap-1.5 bg-white border border-sky-200 rounded-xl px-3 py-2 font-mono text-[11px] text-slate-800">
                  <span className="truncate flex-1">sepay_live_sec_99a8b7c6d5e4f3a2b1</span>
                  <button
                    onClick={() => copyToClipboard('sepay_live_sec_99a8b7c6d5e4f3a2b1', 'key')}
                    className="text-sky-600 hover:text-sky-800 cursor-pointer"
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
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
