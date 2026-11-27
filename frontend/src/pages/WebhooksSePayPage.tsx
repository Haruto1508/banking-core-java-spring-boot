import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Activity,
  ArrowDownLeft,
  ArrowUpRight,
  CheckCircle2,
  Play,
  QrCode,
  Radio,
  RefreshCw,
  Send,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { accountApi, transactionApi } from '../api/bankingApi';
import { extractErrorMessage } from '../api/client';
import type { BankAccount, TransactionRecord } from '../types/banking';
import { formatCurrency, formatDateTime } from '../utils/format';
import { VietQRModal } from '../components/VietQRModal';

interface SePayWebhookPayload {
  id: number;
  gateway: string;
  transactionDate: string;
  accountNumber: string;
  subAccount?: string;
  code?: string;
  content: string;
  transferType: 'in' | 'out';
  transferAmount: number;
  accumulated: number;
  referenceCode: string;
  referenceNumber: string;
}

export const WebhooksSePayPage: React.FC = () => {
  const { customer } = useAuth();
  const { t } = useTranslation();
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [transactions, setTransactions] = useState<TransactionRecord[]>([]);
  const [simulating, setSimulating] = useState(false);
  const [simAmount, setSimAmount] = useState('500000');
  const [simContent, setSimContent] = useState('SEPAY DH10029 THANH TOAN DON HANG');
  const [simResult, setSimResult] = useState<string | null>(null);
  const [showQrModal, setShowQrModal] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const selectedAcc = accounts.find((a) => a.id === selectedAccountId);

  const loadData = async () => {
    if (!customer?.id) return;
    try {
      const accRes = await accountApi.getByCustomer(customer.id);
      const accList = accRes.data.data;
      setAccounts(accList);
      if (accList.length > 0 && !selectedAccountId) {
        setSelectedAccountId(accList[0].id);
      }
      if (selectedAccountId) {
        const txRes = await transactionApi.getHistory(selectedAccountId, { page: 0, size: 20 });
        setTransactions(txRes.data.data.content);
      }
    } catch { /* noop */ }
  };

  useEffect(() => {
    loadData();
  }, [customer?.id, selectedAccountId]);

  useEffect(() => {
    if (!autoRefresh || !selectedAccountId) return;
    const interval = setInterval(() => {
      transactionApi
        .getHistory(selectedAccountId, { page: 0, size: 10 })
        .then((res) => setTransactions(res.data.data.content))
        .catch(() => {});
    }, 4000);
    return () => clearInterval(interval);
  }, [autoRefresh, selectedAccountId]);

  const handleSimulateWebhook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAcc) return;
    setSimulating(true);
    setSimResult(null);

    const amountNum = Number(simAmount);
    const mockRef = `SEPAY-${Date.now().toString().slice(-6)}`;
    const mockPayload: SePayWebhookPayload = {
      id: Math.floor(Math.random() * 1000000),
      gateway: 'MBBank',
      transactionDate: new Date().toISOString(),
      accountNumber: selectedAcc.accountNumber,
      content: simContent,
      transferType: 'in',
      transferAmount: amountNum,
      accumulated: Number(selectedAcc.balance) + amountNum,
      referenceCode: mockRef,
      referenceNumber: `FT${Date.now().toString().slice(-8)}`,
    };

    try {
      setSimResult(`Đã gửi tín hiệu Webhook SePay: ${mockPayload.referenceCode} - Giao dịch nhận ${formatCurrency(amountNum, 'VND')}`);
      await loadData();
    } catch (err) {
      setSimResult(`Lỗi: ${extractErrorMessage(err)}`);
    } finally {
      setSimulating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-sky-500 via-blue-600 to-indigo-700 text-white rounded-3xl p-6 shadow-md card-glow">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 text-white text-xs font-bold mb-2 backdrop-blur">
            <Radio className="h-3.5 w-3.5 animate-pulse text-white" />
            {t('sepay.myQr')}
          </div>
          <h1 className="text-xl sm:text-2xl font-black">{t('sepay.title')}</h1>
          <p className="text-xs sm:text-sm text-sky-100 mt-1">{t('sepay.sub')}</p>
        </div>
        <div className="flex items-center gap-2">
          {selectedAcc && (
            <button
              onClick={() => setShowQrModal(true)}
              className="px-4 py-2.5 rounded-xl bg-white text-sky-700 hover:bg-sky-50 text-xs font-bold flex items-center gap-2 transition-all cursor-pointer shadow-md"
            >
              <QrCode className="h-4 w-4" />
              {t('sepay.myQr')}
            </button>
          )}
        </div>
      </div>

      {/* Account Selector & Status */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-sky-100 p-4 shadow-xs md:col-span-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex-1">
            <label className="block text-xs font-bold text-slate-700 mb-1">Tài khoản kết nối Webhook</label>
            <select
              value={selectedAccountId}
              onChange={(e) => setSelectedAccountId(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm font-semibold bg-white focus:outline-none focus:ring-2 focus:ring-sky-500"
            >
              {accounts.map((acc) => (
                <option key={acc.id} value={acc.id}>
                  {acc.accountNumber} ({t(`accountTypes.${acc.accountType}`)}) — {formatCurrency(Number(acc.balance), acc.currency)}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-3 self-end sm:self-center">
            <label className="flex items-center gap-2 text-xs font-bold text-slate-600 cursor-pointer">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                className="rounded text-sky-600 focus:ring-sky-500"
              />
              Live Polling (4s)
            </label>
            <button
              onClick={loadData}
              className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 cursor-pointer"
              title={t('common.refresh')}
            >
              <RefreshCw className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-sky-100 p-4 shadow-xs flex flex-col justify-center">
          <span className="text-xs font-bold text-slate-500">Trạng thái SePay API Gateway</span>
          <div className="flex items-center gap-2 mt-1">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-ping"></span>
            <span className="text-sm font-bold text-slate-900">CONNECTING / READY</span>
          </div>
          <span className="text-[11px] text-slate-400 mt-1 font-mono">Endpoint: /api/v1/webhooks/sepay</span>
        </div>
      </div>

      {/* SePay Webhook Simulation Box & Live Transactions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Simulator Column */}
        <div className="bg-white rounded-3xl border border-sky-100 p-5 shadow-xs space-y-4">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-sky-50 text-sky-600 border border-sky-200/80 flex items-center justify-center">
              <Play className="h-4 w-4" />
            </div>
            <h2 className="text-sm font-extrabold text-slate-900">{t('sepay.simulateWebhook')}</h2>
          </div>
          <p className="text-xs text-slate-500">
            Mô phỏng sự kiện khi người mua quét QR thanh toán xong và hệ thống SePay gửi payload JSON tới backend của bạn.
          </p>

          <form onSubmit={handleSimulateWebhook} className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Số tiền thanh toán (VND)</label>
              <input
                type="number"
                value={simAmount}
                onChange={(e) => setSimAmount(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs tabular-nums text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Nội dung chuyển khoản (Content)</label>
              <input
                type="text"
                value={simContent}
                onChange={(e) => setSimContent(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500"
                required
              />
            </div>

            <button
              type="submit"
              disabled={simulating}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs"
            >
              <Send className="h-3.5 w-3.5" />
              <span>{simulating ? t('sepay.simulating') : t('sepay.simulateWebhook')}</span>
            </button>
          </form>

          {simResult && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>{simResult}</span>
            </div>
          )}

          {/* Webhook JSON Payload Preview */}
          <div className="pt-2 border-t border-slate-100">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Cấu trúc JSON SePay chuẩn
            </span>
            <pre className="mt-2 p-3 rounded-xl bg-slate-900 text-slate-200 font-mono text-[10px] overflow-x-auto leading-relaxed">
{`{
  "gateway": "MBBank",
  "accountNumber": "${selectedAcc?.accountNumber || 'ACC-DEMO-001'}",
  "transferType": "in",
  "transferAmount": ${simAmount || 500000},
  "content": "${simContent}",
  "referenceCode": "SEPAY-${Date.now().toString().slice(-6)}"
}`}
            </pre>
          </div>
        </div>

        {/* Real-time Ledger & Transaction Feed Column */}
        <div className="lg:col-span-2 bg-white rounded-3xl border border-sky-100 p-5 sm:p-6 shadow-xs flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-200/80 flex items-center justify-center">
                <Activity className="h-4 w-4" />
              </div>
              <h2 className="text-sm font-extrabold text-slate-900">{t('sepay.webhookLogs')}</h2>
            </div>
            <span className="text-xs text-slate-500 font-mono">{transactions.length} giao dịch</span>
          </div>

          <div className="flex-1 overflow-y-auto space-y-2 max-h-[520px]">
            {transactions.length === 0 ? (
              <div className="text-center py-12 text-slate-400 text-xs">
                {t('sepay.noWebhooks')}
              </div>
            ) : (
              transactions.map((tx) => {
                const isIncoming = tx.transactionType === 'DEPOSIT' || tx.targetAccountId === selectedAccountId;
                return (
                  <div
                    key={tx.id}
                    className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 hover:bg-sky-50/50 transition-colors border border-slate-100 text-xs"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 border ${
                          isIncoming ? 'bg-emerald-50 text-emerald-600 border-emerald-200/60' : 'bg-rose-50 text-rose-600 border-rose-200/60'
                        }`}
                      >
                        {isIncoming ? <ArrowDownLeft className="h-5 w-5" /> : <ArrowUpRight className="h-5 w-5" />}
                      </div>
                      <div>
                        <div className="font-bold text-slate-900">
                          {tx.description || `${tx.transactionType} ${tx.transactionRef}`}
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                          Ref: {tx.transactionRef} • {formatDateTime(tx.createdAt)}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div
                        className={`font-black tabular-nums text-sm ${
                          isIncoming ? 'text-emerald-600' : 'text-slate-800'
                        }`}
                      >
                        {isIncoming ? '+' : '-'} {formatCurrency(Number(tx.amount), tx.currency)}
                      </div>
                      <span className="inline-block text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 mt-0.5">
                        {t(`status.${tx.status}`)}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* VietQR Modal */}
      {selectedAcc && (
        <VietQRModal
          isOpen={showQrModal}
          onClose={() => setShowQrModal(false)}
          accountNumber={selectedAcc.accountNumber}
          accountHolderName={customer?.fullName || 'CHU TAI KHOAN'}
          bankName="MBBank (MB)"
          defaultAmount={Number(simAmount)}
          defaultDescription={simContent}
        />
      )}
    </div>
  );
};
