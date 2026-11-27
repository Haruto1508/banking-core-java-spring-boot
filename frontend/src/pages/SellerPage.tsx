import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  ArrowDownLeft,
  ArrowLeftRight,
  ArrowUpRight,
  CheckCircle2,
  Copy,
  Play,
  PlusCircle,
  QrCode,
  RefreshCw,
  Search,
  Store,
  TrendingUp,
  Zap,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { accountApi, customerApi, transactionApi } from '../api/bankingApi';
import { extractErrorMessage } from '../api/client';
import type { AccountType, BankAccount, Customer, TransactionRecord } from '../types/banking';
import {
  formatCurrency,
  formatDateTime,
  formatNumberWithDots,
  generateIdempotencyKey,
  numberToWords,
  parseNumberFromDots,
} from '../utils/format';
import { AlertModal } from '../components/AlertModal';

const QUICK_AMOUNTS = [50_000, 100_000, 200_000, 500_000, 1_000_000, 2_000_000, 5_000_000];

export const SellerPage: React.FC = () => {
  const { customer, user } = useAuth();
  const { t, i18n } = useTranslation();
  const [searchParams] = useSearchParams();
  const validTabs = ['pos', 'deposit', 'withdraw', 'transfer', 'openAccount', 'history'] as const;
  type TabType = typeof validTabs[number];

  const tabParam = searchParams.get('tab') as TabType | null;
  const initialTab: TabType = tabParam && validTabs.includes(tabParam) ? tabParam : 'pos';
  const [activeTab, setActiveTab] = useState<TabType>(initialTab);

  useEffect(() => {
    if (tabParam && validTabs.includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, [tabParam]);

  // Seller receiving accounts
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [recentTransactions, setRecentTransactions] = useState<TransactionRecord[]>([]);

  // 1. Direct POS VietQR state
  const [orderCode, setOrderCode] = useState(() => `DH${Math.floor(10000 + Math.random() * 90000)}`);
  const [posAmountFormatted, setPosAmountFormatted] = useState('250.000');
  const [posDescription, setPosDescription] = useState('Thanh toan don hang');
  const [simulating, setSimulating] = useState(false);
  const [isPaid, setIsPaid] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  // 2. Direct Cash Deposit state
  const [depositTargetInput, setDepositTargetInput] = useState('');
  const [resolvedDepositAcc, setResolvedDepositAcc] = useState<BankAccount | null>(null);
  const [depositAmountFormatted, setDepositAmountFormatted] = useState('500.000');
  const [depositNote, setDepositNote] = useState('Khach nop tien mat truc tiep tai quay');
  const [depositLoading, setDepositLoading] = useState(false);
  const [depositReceipt, setDepositReceipt] = useState<TransactionRecord | null>(null);

  // 3. Direct Cash Withdrawal state
  const [withdrawSourceInput, setWithdrawSourceInput] = useState('');
  const [resolvedWithdrawAcc, setResolvedWithdrawAcc] = useState<BankAccount | null>(null);
  const [withdrawAmountFormatted, setWithdrawAmountFormatted] = useState('200.000');
  const [withdrawNote, setWithdrawNote] = useState('Khach rut tien mat truc tiep tai quay');
  const [withdrawLoading, setWithdrawLoading] = useState(false);
  const [withdrawReceipt, setWithdrawReceipt] = useState<TransactionRecord | null>(null);

  // 4. Direct Transfer at Counter state
  const [transferSourceInput, setTransferSourceInput] = useState('');
  const [resolvedTransferSource, setResolvedTransferSource] = useState<BankAccount | null>(null);
  const [transferTargetInput, setTransferTargetInput] = useState('');
  const [resolvedTransferTarget, setResolvedTransferTarget] = useState<BankAccount | null>(null);
  const [transferAmountFormatted, setTransferAmountFormatted] = useState('100.000');
  const [transferNote, setTransferNote] = useState('Chuyen tien truc tiep tai diem giao dich');
  const [transferLoading, setTransferLoading] = useState(false);

  // 5. Open Account directly state
  const [customerList, setCustomerList] = useState<Customer[]>([]);
  const [openCustomerId, setOpenCustomerId] = useState('');
  const [openAccountType, setOpenAccountType] = useState<AccountType>('CURRENT');
  const [openCurrency, setOpenCurrency] = useState('VND');
  const [openLoading, setOpenLoading] = useState(false);
  const [newlyOpenedAccount, setNewlyOpenedAccount] = useState<BankAccount | null>(null);

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

  // Numbers & words calculations
  const posNumericAmount = Math.max(0, parseNumberFromDots(posAmountFormatted));
  const posAmountWords = numberToWords(posNumericAmount, i18n.language, selectedAcc?.currency || 'VND');

  const depositNumericAmount = Math.max(0, parseNumberFromDots(depositAmountFormatted));
  const depositAmountWords = numberToWords(depositNumericAmount, i18n.language, resolvedDepositAcc?.currency || 'VND');

  const withdrawNumericAmount = Math.max(0, parseNumberFromDots(withdrawAmountFormatted));
  const withdrawAmountWords = numberToWords(withdrawNumericAmount, i18n.language, resolvedWithdrawAcc?.currency || 'VND');

  const transferNumericAmount = Math.max(0, parseNumberFromDots(transferAmountFormatted));
  const transferAmountWords = numberToWords(transferNumericAmount, i18n.language, resolvedTransferSource?.currency || 'VND');

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
      const txRes = await transactionApi.getHistory(accId, { page: 0, size: 20 });
      setRecentTransactions(txRes.data.data.content);
    } catch { /* noop */ }
  };

  const loadCustomers = async () => {
    try {
      const res = await customerApi.search('', 0, 50);
      setCustomerList(res.data.data.content);
      if (res.data.data.content.length > 0 && !openCustomerId) {
        setOpenCustomerId(res.data.data.content[0].id);
      }
    } catch { /* noop */ }
  };

  useEffect(() => {
    loadData();
    loadCustomers();
  }, [customer?.id]);

  // Account lookups for direct counter actions
  const handleLookupAccount = async (val: string, setter: (acc: BankAccount | null) => void) => {
    const trimmed = val.trim();
    if (!trimmed) { setter(null); return; }
    try {
      if (trimmed.length === 36 && trimmed.includes('-')) {
        const res = await accountApi.getById(trimmed);
        setter(res.data.data);
      } else {
        const res = await accountApi.lookupByNumber(trimmed);
        setter(res.data.data);
      }
    } catch {
      setter(null);
    }
  };

  // Generate new order code for POS
  const handleGenerateCode = () => {
    const newCode = `DH${Math.floor(10000 + Math.random() * 90000)}`;
    setOrderCode(newCode);
    setPosDescription(`Thanh toan don hang ${newCode}`);
    setIsPaid(false);
  };

  const fullDescription = `${orderCode} ${posDescription.trim()}`.trim();
  const qrUrl = selectedAcc
    ? `https://img.vietqr.io/image/MB-${selectedAcc.accountNumber}-compact2.png?amount=${posNumericAmount}&addInfo=${encodeURIComponent(
        fullDescription
      )}&accountName=${encodeURIComponent(customer?.fullName || user?.username || 'SEPAY MERCHANT')}`
    : '';

  // Simulate customer paying VietQR
  const handleSimulatePayment = async () => {
    if (!selectedAcc) {
      setAlertModal({
        isOpen: true,
        title: t('common.warningTitle'),
        message: 'Tài khoản nhận tiền bán hàng không hợp lệ.',
        type: 'warning',
      });
      return;
    }
    if (posNumericAmount <= 0) {
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
      await transactionApi.deposit({
        accountId: selectedAcc.id,
        amount: posNumericAmount,
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
          posNumericAmount,
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

  // Direct Cash Deposit
  const handleDirectDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resolvedDepositAcc) {
      setAlertModal({
        isOpen: true,
        title: t('common.warningTitle'),
        message: 'Vui lòng nhập và chọn tài khoản nhận tiền mặt hợp lệ.',
        type: 'warning',
      });
      return;
    }
    if (depositNumericAmount <= 0) {
      setAlertModal({
        isOpen: true,
        title: t('common.warningTitle'),
        message: t('transfer.missingAmount'),
        type: 'warning',
      });
      return;
    }
    setDepositLoading(true);
    try {
      const res = await transactionApi.deposit({
        accountId: resolvedDepositAcc.id,
        amount: depositNumericAmount,
        currency: resolvedDepositAcc.currency,
        description: depositNote.trim() || 'Nop tien mat truc tiep tai quay',
      });
      setDepositReceipt(res.data.data);
      setAlertModal({
        isOpen: true,
        title: t('common.successTitle'),
        message: `Nạp tiền mặt thành công! Đã nạp ${formatCurrency(
          depositNumericAmount,
          resolvedDepositAcc.currency
        )} vào tài khoản ${resolvedDepositAcc.accountNumber}.`,
        type: 'success',
      });
      if (selectedAccountId) await loadTransactions(selectedAccountId);
    } catch (err) {
      setAlertModal({
        isOpen: true,
        title: t('common.errorTitle'),
        message: extractErrorMessage(err),
        type: 'error',
      });
    } finally {
      setDepositLoading(false);
    }
  };

  // Direct Cash Withdrawal
  const handleDirectWithdraw = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resolvedWithdrawAcc) {
      setAlertModal({
        isOpen: true,
        title: t('common.warningTitle'),
        message: 'Vui lòng nhập và chọn tài khoản trích tiền mặt hợp lệ.',
        type: 'warning',
      });
      return;
    }
    if (withdrawNumericAmount <= 0) {
      setAlertModal({
        isOpen: true,
        title: t('common.warningTitle'),
        message: t('transfer.missingAmount'),
        type: 'warning',
      });
      return;
    }
    if (withdrawNumericAmount > Number(resolvedWithdrawAcc.balance)) {
      setAlertModal({
        isOpen: true,
        title: t('common.warningTitle'),
        message: `Số tiền rút (${formatCurrency(
          withdrawNumericAmount,
          resolvedWithdrawAcc.currency
        )}) vượt quá số dư khả dụng (${formatCurrency(
          Number(resolvedWithdrawAcc.balance),
          resolvedWithdrawAcc.currency
        )}).`,
        type: 'warning',
      });
      return;
    }
    setWithdrawLoading(true);
    try {
      const res = await transactionApi.withdraw({
        accountId: resolvedWithdrawAcc.id,
        amount: withdrawNumericAmount,
        currency: resolvedWithdrawAcc.currency,
        description: withdrawNote.trim() || 'Rut tien mat truc tiep tai quay',
      });
      setWithdrawReceipt(res.data.data);
      setAlertModal({
        isOpen: true,
        title: t('common.successTitle'),
        message: `Rút tiền mặt thành công! Đã xuất ${formatCurrency(
          withdrawNumericAmount,
          resolvedWithdrawAcc.currency
        )} từ tài khoản ${resolvedWithdrawAcc.accountNumber}.`,
        type: 'success',
      });
      if (selectedAccountId) await loadTransactions(selectedAccountId);
    } catch (err) {
      setAlertModal({
        isOpen: true,
        title: t('common.errorTitle'),
        message: extractErrorMessage(err),
        type: 'error',
      });
    } finally {
      setWithdrawLoading(false);
    }
  };

  // Direct Counter Transfer
  const handleDirectTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resolvedTransferSource || !resolvedTransferTarget) {
      setAlertModal({
        isOpen: true,
        title: t('common.warningTitle'),
        message: 'Vui lòng kiểm tra tài khoản nguồn và tài khoản đích.',
        type: 'warning',
      });
      return;
    }
    if (transferNumericAmount <= 0) {
      setAlertModal({
        isOpen: true,
        title: t('common.warningTitle'),
        message: t('transfer.missingAmount'),
        type: 'warning',
      });
      return;
    }
    setTransferLoading(true);
    try {
      const res = await transactionApi.transfer(
        {
          sourceAccountId: resolvedTransferSource.id,
          targetAccountId: resolvedTransferTarget.id,
          amount: transferNumericAmount,
          currency: resolvedTransferSource.currency,
          description: transferNote.trim() || 'Chuyen tien truc tiep tai quay',
        },
        generateIdempotencyKey('CTR')
      );
      setAlertModal({
        isOpen: true,
        title: t('common.successTitle'),
        message: `Chuyển khoản trực tiếp thành công! Mã giao dịch: ${res.data.data.transactionRef}`,
        type: 'success',
      });
      if (selectedAccountId) await loadTransactions(selectedAccountId);
    } catch (err) {
      setAlertModal({
        isOpen: true,
        title: t('common.errorTitle'),
        message: extractErrorMessage(err),
        type: 'error',
      });
    } finally {
      setTransferLoading(false);
    }
  };

  // Direct Account Opening on the spot
  const handleDirectOpenAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!openCustomerId) return;
    setOpenLoading(true);
    try {
      const res = await accountApi.open(openCustomerId, openAccountType, openCurrency);
      setNewlyOpenedAccount(res.data.data);
      setAlertModal({
        isOpen: true,
        title: t('common.successTitle'),
        message: `Mở tài khoản thành công! Số tài khoản mới: ${res.data.data.accountNumber}`,
        type: 'success',
      });
      await loadData();
    } catch (err) {
      setAlertModal({
        isOpen: true,
        title: t('common.errorTitle'),
        message: extractErrorMessage(err),
        type: 'error',
      });
    } finally {
      setOpenLoading(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(null), 2000);
  };

  // Shift totals
  const shiftDepositTotal = recentTransactions
    .filter((tx) => tx.transactionType === 'DEPOSIT' && tx.status === 'SUCCESS')
    .reduce((sum, tx) => sum + Number(tx.amount), 0);

  const shiftWithdrawTotal = recentTransactions
    .filter((tx) => tx.transactionType === 'WITHDRAWAL' && tx.status === 'SUCCESS')
    .reduce((sum, tx) => sum + Number(tx.amount), 0);

  return (
    <div className="space-y-6">
      {/* ─── Hero Header ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold shadow-2xs">
              <Store className="h-3.5 w-3.5 text-emerald-600" />
              {t('seller.badge')}
            </span>
            <span className="text-xs text-slate-400 font-mono">DIRECT-DESK-POS</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 leading-tight">
            Quầy Giao Dịch & Bán Hàng Trực Tiếp (Direct Desk & POS Hub)
          </h1>
          <p className="text-xs text-slate-500 mt-0.5 max-w-xl">
            Thực hiện giao dịch trực tiếp khi khách hàng đến quầy: Nộp tiền mặt, Rút tiền mặt, Thu ngân POS VietQR và Mở tài khoản
          </p>
        </div>

        {/* Linked Counter Account */}
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

      {/* ─── Shift Summary Cards ─── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        {[
          {
            label: t('seller.shiftTotalDeposit'),
            value: formatCurrency(shiftDepositTotal, selectedAcc?.currency || 'VND'),
            icon: ArrowDownLeft,
            color: 'from-emerald-500 to-teal-600',
          },
          {
            label: t('seller.shiftTotalWithdraw'),
            value: formatCurrency(shiftWithdrawTotal, selectedAcc?.currency || 'VND'),
            icon: ArrowUpRight,
            color: 'from-rose-500 to-pink-600',
          },
          {
            label: t('seller.shiftTotalSales'),
            value: formatCurrency(shiftDepositTotal, selectedAcc?.currency || 'VND'),
            icon: TrendingUp,
            color: 'from-sky-500 to-blue-600',
          },
          {
            label: t('seller.sepayStatus'),
            value: t('seller.autoDetectReady'),
            icon: Zap,
            color: 'from-amber-500 to-orange-500',
          },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="rounded-3xl bg-white border border-sky-100 p-4 shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold text-slate-400">{label}</span>
              <div className={`h-8 w-8 rounded-xl bg-gradient-to-br ${color} text-white flex items-center justify-center shadow-xs`}>
                <Icon className="h-4 w-4" />
              </div>
            </div>
            <div className="text-base sm:text-lg font-black text-slate-900 tabular-nums">
              {value}
            </div>
          </div>
        ))}
      </div>

      {/* ─── TAB 1: THU NGÂN POS & VIETQR TRỰC TIẾP ─── */}
      {activeTab === 'pos' && (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <div className="lg:col-span-3 bg-white border border-sky-100 rounded-3xl p-6 space-y-5 shadow-xs">
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

            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
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

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    {t('seller.orderAmount')} ({selectedAcc?.currency || 'VND'})
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      inputMode="numeric"
                      required
                      value={posAmountFormatted}
                      onChange={(e) => {
                        setPosAmountFormatted(formatNumberWithDots(e.target.value));
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

              {posAmountWords && (
                <div className="px-3.5 py-2 rounded-xl bg-sky-50/80 border border-sky-200/70 text-xs font-bold text-sky-800 flex items-center gap-2 shadow-2xs">
                  <span className="text-sky-500 font-normal">≈</span>
                  <span className="leading-snug">{posAmountWords}</span>
                </div>
              )}

              <div className="flex flex-wrap gap-2">
                {QUICK_AMOUNTS.slice(0, 5).map((val) => {
                  const chip = formatNumberWithDots(val);
                  return (
                    <button
                      key={val}
                      type="button"
                      onClick={() => {
                        setPosAmountFormatted(chip);
                        setIsPaid(false);
                      }}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold cursor-pointer transition-colors tabular-nums ${
                        posAmountFormatted === chip ? 'bg-sky-600 text-white shadow-xs' : 'bg-sky-50 text-sky-800 hover:bg-sky-100'
                      }`}
                    >
                      {chip}
                    </button>
                  );
                })}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">{t('seller.orderDesc')}</label>
                <input
                  type="text"
                  value={posDescription}
                  onChange={(e) => setPosDescription(e.target.value)}
                  placeholder={t('seller.orderDescPlaceholder')}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>
            </div>

            {selectedAcc && (
              <div className="pt-2 border-t border-sky-100">
                <div className="bg-gradient-to-b from-sky-50/60 to-white border border-sky-200/80 rounded-2xl p-5 flex flex-col items-center justify-center text-center">
                  <div className="mb-2">
                    <span className="text-xs font-bold text-slate-700">{t('seller.qrReadyTitle')}</span>
                    <p className="text-[11px] text-slate-500">{t('seller.qrReadySub')}</p>
                  </div>

                  <div className="bg-white p-3 rounded-2xl shadow-md border border-sky-200 my-3 relative">
                    <img src={qrUrl} alt="VietQR Napas247" className="w-52 h-auto object-contain mx-auto" />
                    {isPaid && (
                      <div className="absolute inset-0 bg-emerald-600/90 backdrop-blur-xs rounded-2xl flex flex-col items-center justify-center text-white p-4 animate-in fade-in">
                        <CheckCircle2 className="h-12 w-12 mb-2 animate-bounce" />
                        <span className="text-sm font-black uppercase">{t('seller.paidSuccess')}</span>
                        <span className="text-xs font-mono mt-1 opacity-90">{formatCurrency(posNumericAmount, selectedAcc.currency)}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center justify-center gap-2.5 w-full max-w-md">
                    <button
                      type="button"
                      disabled={simulating || isPaid}
                      onClick={handleSimulatePayment}
                      className="flex-1 min-w-[200px] py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 disabled:opacity-50 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-md shadow-emerald-500/20 cursor-pointer"
                    >
                      <Play className="h-4 w-4 fill-white" />
                      <span>{simulating ? t('seller.simulating') : t('seller.simulateWebhook')}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(qrUrl, 'qr')}
                      className="py-3 px-3.5 rounded-xl border border-sky-200 bg-white hover:bg-sky-50 text-sky-700 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                    >
                      <Copy className="h-3.5 w-3.5" />
                      <span>{copied === 'qr' ? t('common.copied') : t('seller.copyQrLink')}</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="lg:col-span-2 space-y-4">
            <div className="bg-white border border-sky-100 rounded-3xl p-5 space-y-3 shadow-xs">
              <h3 className="text-sm font-extrabold text-slate-900">{t('seller.recentOrdersTitle')}</h3>
              <p className="text-[10px] text-slate-400 font-medium">{t('seller.recentOrdersDesc')}</p>
              <div className="divide-y divide-sky-50 max-h-[300px] overflow-y-auto">
                {recentTransactions.slice(0, 6).map((tx) => (
                  <div key={tx.id} className="py-2.5 flex items-center justify-between text-xs">
                    <div>
                      <div className="font-bold text-slate-800 truncate max-w-[150px]">{tx.description || 'Thanh toan POS'}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{formatDateTime(tx.createdAt)}</div>
                    </div>
                    <div className="text-right">
                      <span className="font-black text-emerald-600">+{formatCurrency(Number(tx.amount), tx.currency)}</span>
                      <span className="block text-[9px] font-bold text-emerald-700">✓ ĐÃ THU</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── TAB 2: NẠP TIỀN MẶT TRỰC TIẾP VÀO TÀI KHOẢN (DIRECT CASH DEPOSIT) ─── */}
      {activeTab === 'deposit' && (
        <div className="max-w-2xl bg-white border border-sky-100 rounded-3xl p-6 space-y-5 shadow-xs">
          <div className="flex items-center gap-3 border-b border-sky-50 pb-3">
            <div className="h-10 w-10 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center">
              <ArrowDownLeft className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-sm font-extrabold text-slate-900">{t('seller.directDepositTitle')}</h2>
              <p className="text-[11px] text-slate-400 font-medium">{t('seller.directDepositSub')}</p>
            </div>
          </div>

          <form onSubmit={handleDirectDeposit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Số Tài Khoản Người Nhận (Napas / UUID)</label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={depositTargetInput}
                  onChange={(e) => {
                    setDepositTargetInput(e.target.value);
                    handleLookupAccount(e.target.value, setResolvedDepositAcc);
                  }}
                  placeholder="ACC-DEMO-001 hoặc ACC-DEMO-002"
                  className="w-full pl-3.5 pr-10 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm font-mono text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <Search className="h-4 w-4 text-slate-400 absolute right-3.5 top-3" />
              </div>
              {resolvedDepositAcc && (
                <div className="mt-2 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs flex items-center justify-between text-emerald-900">
                  <span className="font-bold">✓ Hợp lệ: {resolvedDepositAcc.accountNumber} ({resolvedDepositAcc.accountType})</span>
                  <span className="font-mono font-bold">Số dư: {formatCurrency(Number(resolvedDepositAcc.balance), resolvedDepositAcc.currency)}</span>
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Số Tiền Mặt Khách Nộp</label>
              <div className="relative">
                <input
                  type="text"
                  inputMode="numeric"
                  required
                  value={depositAmountFormatted}
                  onChange={(e) => setDepositAmountFormatted(formatNumberWithDots(e.target.value))}
                  placeholder="500.000"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 text-sm font-black text-slate-900 tabular-nums focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <span className="absolute right-3.5 top-2.5 text-xs font-bold text-emerald-600">
                  {resolvedDepositAcc?.currency || 'VND'}
                </span>
              </div>
            </div>

            {depositAmountWords && (
              <div className="px-3.5 py-2 rounded-xl bg-emerald-50/80 border border-emerald-200/70 text-xs font-bold text-emerald-800 flex items-center gap-2">
                <span className="text-emerald-500 font-normal">≈</span>
                <span>{depositAmountWords}</span>
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              {QUICK_AMOUNTS.map((val) => {
                const chip = formatNumberWithDots(val);
                return (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setDepositAmountFormatted(chip)}
                    className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 cursor-pointer"
                  >
                    {chip}
                  </button>
                );
              })}
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Ghi Chú Nộp Tiền Mặt</label>
              <input
                type="text"
                value={depositNote}
                onChange={(e) => setDepositNote(e.target.value)}
                placeholder="Khach nop tien mat truc tiep tai quay"
                className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <button
              type="submit"
              disabled={depositLoading || !resolvedDepositAcc}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 disabled:opacity-50 text-white text-sm font-bold flex items-center justify-center gap-2 shadow-md shadow-emerald-500/20 cursor-pointer"
            >
              <ArrowDownLeft className="h-4 w-4" />
              <span>{depositLoading ? 'Đang ghi có...' : t('seller.confirmDeposit')}</span>
            </button>
          </form>

          {depositReceipt && (
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 space-y-1.5 animate-in fade-in">
              <div className="flex items-center gap-2 text-xs font-bold text-emerald-800">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                <span>{t('seller.depositReceipt')}</span>
              </div>
              <div className="text-sm font-mono font-black text-slate-900">
                Mã GD: {depositReceipt.transactionRef}
              </div>
              <div className="text-xs font-bold text-emerald-700">
                Đã nạp: +{formatCurrency(Number(depositReceipt.amount), depositReceipt.currency)}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─── TAB 3: RÚT TIỀN MẶT TRỰC TIẾP (DIRECT CASH WITHDRAWAL) ─── */}
      {activeTab === 'withdraw' && (
        <div className="max-w-2xl bg-white border border-sky-100 rounded-3xl p-6 space-y-5 shadow-xs">
          <div className="flex items-center gap-3 border-b border-sky-50 pb-3">
            <div className="h-10 w-10 rounded-2xl bg-rose-50 text-rose-600 border border-rose-200 flex items-center justify-center">
              <ArrowUpRight className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-sm font-extrabold text-slate-900">{t('seller.directWithdrawTitle')}</h2>
              <p className="text-[11px] text-slate-400 font-medium">{t('seller.directWithdrawSub')}</p>
            </div>
          </div>

          <form onSubmit={handleDirectWithdraw} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Số Tài Khoản Trích Tiền (Khách rút)</label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={withdrawSourceInput}
                  onChange={(e) => {
                    setWithdrawSourceInput(e.target.value);
                    handleLookupAccount(e.target.value, setResolvedWithdrawAcc);
                  }}
                  placeholder="ACC-DEMO-001"
                  className="w-full pl-3.5 pr-10 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm font-mono text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
                <Search className="h-4 w-4 text-slate-400 absolute right-3.5 top-3" />
              </div>
              {resolvedWithdrawAcc && (
                <div className="mt-2 p-3 rounded-xl bg-sky-50 border border-sky-200 text-xs flex items-center justify-between text-sky-950">
                  <span className="font-bold">✓ Tài khoản: {resolvedWithdrawAcc.accountNumber}</span>
                  <span className="font-mono font-bold">Số dư: {formatCurrency(Number(resolvedWithdrawAcc.balance), resolvedWithdrawAcc.currency)}</span>
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Số Tiền Mặt Khách Cần Rút</label>
              <div className="relative">
                <input
                  type="text"
                  inputMode="numeric"
                  required
                  value={withdrawAmountFormatted}
                  onChange={(e) => setWithdrawAmountFormatted(formatNumberWithDots(e.target.value))}
                  placeholder="200.000"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 text-sm font-black text-slate-900 tabular-nums focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
                <span className="absolute right-3.5 top-2.5 text-xs font-bold text-rose-600">
                  {resolvedWithdrawAcc?.currency || 'VND'}
                </span>
              </div>
            </div>

            {withdrawAmountWords && (
              <div className="px-3.5 py-2 rounded-xl bg-rose-50/80 border border-rose-200/70 text-xs font-bold text-rose-800 flex items-center gap-2">
                <span className="text-rose-500 font-normal">≈</span>
                <span>{withdrawAmountWords}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Ghi Chú Rút Tiền</label>
              <input
                type="text"
                value={withdrawNote}
                onChange={(e) => setWithdrawNote(e.target.value)}
                placeholder="Khach rut tien mat truc tiep tai quay"
                className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500"
              />
            </div>

            <button
              type="submit"
              disabled={withdrawLoading || !resolvedWithdrawAcc}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-400 hover:to-pink-500 disabled:opacity-50 text-white text-sm font-bold flex items-center justify-center gap-2 shadow-md shadow-rose-500/20 cursor-pointer"
            >
              <ArrowUpRight className="h-4 w-4" />
              <span>{withdrawLoading ? 'Đang trừ tiền...' : t('seller.confirmWithdraw')}</span>
            </button>
          </form>

          {withdrawReceipt && (
            <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 space-y-1.5 animate-in fade-in">
              <div className="flex items-center gap-2 text-xs font-bold text-rose-800">
                <CheckCircle2 className="h-4 w-4 text-rose-600" />
                <span>{t('seller.withdrawReceipt')}</span>
              </div>
              <div className="text-sm font-mono font-black text-slate-900">
                Mã GD: {withdrawReceipt.transactionRef}
              </div>
              <div className="text-xs font-bold text-rose-700">
                Đã xuất tiền mặt: -{formatCurrency(Number(withdrawReceipt.amount), withdrawReceipt.currency)}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─── TAB 4: CHUYỂN TIỀN TRỰC TIẾP TẠI QUẦY ─── */}
      {activeTab === 'transfer' && (
        <div className="max-w-2xl bg-white border border-sky-100 rounded-3xl p-6 space-y-5 shadow-xs">
          <div className="flex items-center gap-3 border-b border-sky-50 pb-3">
            <div className="h-10 w-10 rounded-2xl bg-sky-50 text-sky-600 border border-sky-200 flex items-center justify-center">
              <ArrowLeftRight className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-sm font-extrabold text-slate-900">Chuyển Tiền Trực Tiếp Tại Quầy</h2>
              <p className="text-[11px] text-slate-400 font-medium">Hỗ trợ khách hàng chuyển tiền trực tiếp sang tài khoản thụ hưởng</p>
            </div>
          </div>

          <form onSubmit={handleDirectTransfer} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Tài Khoản Trích Tiền (Nguồn)</label>
              <input
                type="text"
                required
                value={transferSourceInput}
                onChange={(e) => {
                  setTransferSourceInput(e.target.value);
                  handleLookupAccount(e.target.value, setResolvedTransferSource);
                }}
                placeholder="ACC-DEMO-001"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm font-mono text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
              {resolvedTransferSource && (
                <div className="mt-1.5 text-xs text-sky-700 font-medium">
                  ✓ Nguồn: {resolvedTransferSource.accountNumber} · Số dư: {formatCurrency(Number(resolvedTransferSource.balance), resolvedTransferSource.currency)}
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Tài Khoản Thụ Hưởng (Đích)</label>
              <input
                type="text"
                required
                value={transferTargetInput}
                onChange={(e) => {
                  setTransferTargetInput(e.target.value);
                  handleLookupAccount(e.target.value, setResolvedTransferTarget);
                }}
                placeholder="ACC-DEMO-002"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm font-mono text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
              {resolvedTransferTarget && (
                <div className="mt-1.5 text-xs text-emerald-700 font-medium">
                  ✓ Người nhận: {resolvedTransferTarget.accountNumber} ({resolvedTransferTarget.accountType})
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Số Tiền Chuyển</label>
              <input
                type="text"
                inputMode="numeric"
                required
                value={transferAmountFormatted}
                onChange={(e) => setTransferAmountFormatted(formatNumberWithDots(e.target.value))}
                placeholder="100.000"
                className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 text-sm font-black text-slate-900 tabular-nums focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>

            {transferAmountWords && (
              <div className="px-3.5 py-2 rounded-xl bg-sky-50/80 border border-sky-200/70 text-xs font-bold text-sky-800 flex items-center gap-2">
                <span className="text-sky-500 font-normal">≈</span>
                <span>{transferAmountWords}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Nội Dung Chuyển</label>
              <input
                type="text"
                value={transferNote}
                onChange={(e) => setTransferNote(e.target.value)}
                placeholder="Chuyen tien truc tiep tai quay"
                className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>

            <button
              type="submit"
              disabled={transferLoading || !resolvedTransferSource || !resolvedTransferTarget}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 disabled:opacity-50 text-white text-sm font-bold flex items-center justify-center gap-2 shadow-md shadow-sky-500/20 cursor-pointer"
            >
              <ArrowLeftRight className="h-4 w-4" />
              <span>{transferLoading ? 'Đang chuyển...' : 'Xác Nhận Chuyển Tiền Trực Tiếp'}</span>
            </button>
          </form>
        </div>
      )}

      {/* ─── TAB 5: MỞ TÀI KHOẢN TRỰC TIẾP CHO KHÁCH (ON-THE-SPOT OPENING) ─── */}
      {activeTab === 'openAccount' && (
        <div className="max-w-2xl bg-white border border-sky-100 rounded-3xl p-6 space-y-5 shadow-xs">
          <div className="flex items-center gap-3 border-b border-sky-50 pb-3">
            <div className="h-10 w-10 rounded-2xl bg-indigo-50 text-indigo-600 border border-indigo-200 flex items-center justify-center">
              <PlusCircle className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-sm font-extrabold text-slate-900">{t('seller.directOpenTitle')}</h2>
              <p className="text-[11px] text-slate-400 font-medium">{t('seller.directOpenSub')}</p>
            </div>
          </div>

          <form onSubmit={handleDirectOpenAccount} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Khách Hàng Làm Thủ Tục Trực Tiếp (CIF)</label>
              <select
                value={openCustomerId}
                onChange={(e) => setOpenCustomerId(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
              >
                {customerList.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.fullName} — CIF: {c.customerNumber} ({c.identityNumber})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Loại Tài Khoản</label>
                <select
                  value={openAccountType}
                  onChange={(e) => setOpenAccountType(e.target.value as AccountType)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                >
                  <option value="CURRENT">CURRENT — Tài khoản thanh toán Napas</option>
                  <option value="SAVINGS">SAVINGS — Tài khoản tiết kiệm định kỳ</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Tiền Tệ</label>
                <select
                  value={openCurrency}
                  onChange={(e) => setOpenCurrency(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                >
                  <option value="VND">VND — Đồng Việt Nam</option>
                  <option value="USD">USD — US Dollar</option>
                </select>
              </div>
            </div>

            <button
              type="submit"
              disabled={openLoading || !openCustomerId}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500 disabled:opacity-50 text-white text-sm font-bold flex items-center justify-center gap-2 shadow-md shadow-indigo-500/20 cursor-pointer"
            >
              <PlusCircle className="h-4 w-4" />
              <span>{openLoading ? 'Đang mở tài khoản...' : 'Kích Hoạt Tài Khoản Trực Tiếp'}</span>
            </button>
          </form>

          {newlyOpenedAccount && (
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 space-y-1.5 animate-in fade-in">
              <div className="text-xs font-bold text-emerald-800">✓ Kích hoạt thành công tài khoản mới:</div>
              <div className="text-base font-mono font-black text-slate-900">{newlyOpenedAccount.accountNumber}</div>
              <div className="text-[11px] text-emerald-700">Loại: {newlyOpenedAccount.accountType} · Tiền tệ: {newlyOpenedAccount.currency}</div>
            </div>
          )}
        </div>
      )}

      {/* ─── TAB 6: QUẢN LÝ CA TRỰC TIẾP (HISTORY) ─── */}
      {activeTab === 'history' && (
        <div className="bg-white border border-sky-100 rounded-3xl p-6 space-y-4 shadow-xs">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-extrabold text-slate-900">Nhật Ký Giao Dịch Trực Tiếp Trong Ca</h2>
              <p className="text-[11px] text-slate-400 font-medium">Toàn bộ giao dịch nạp, rút, POS và chuyển khoản xử lý tại quầy</p>
            </div>
            <button
              onClick={() => selectedAcc && loadTransactions(selectedAcc.id)}
              className="p-2 text-slate-400 hover:text-sky-600 rounded-xl hover:bg-sky-50 transition-colors cursor-pointer"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
          </div>

          <div className="divide-y divide-sky-50 max-h-[480px] overflow-y-auto">
            {recentTransactions.length === 0 ? (
              <div className="py-14 text-center text-xs text-slate-400">Chưa có giao dịch nào trong ca làm việc.</div>
            ) : (
              recentTransactions.map((tx) => (
                <div key={tx.id} className="py-3 flex items-center justify-between text-xs hover:bg-sky-50/40 transition-colors">
                  <div>
                    <div className="font-bold text-slate-900">{tx.description || 'Giao dịch quầy'}</div>
                    <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                      {formatDateTime(tx.createdAt)} · Ref: {tx.transactionRef}
                    </div>
                  </div>
                  <div className="text-right">
                    <span
                      className={`font-black tabular-nums ${
                        tx.transactionType === 'DEPOSIT' ? 'text-emerald-600' : 'text-slate-900'
                      }`}
                    >
                      {tx.transactionType === 'DEPOSIT' ? '+' : '-'}
                      {formatCurrency(Number(tx.amount), tx.currency)}
                    </span>
                    <span className="block text-[9px] font-bold text-slate-400 uppercase mt-0.5">{tx.status}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

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
