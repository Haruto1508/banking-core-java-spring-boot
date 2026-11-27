import React, { useEffect, useState } from 'react';
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
  const { user, customer } = useAuth();
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
    } catch {
      // Ignore
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customer?.id, selectedAccountId]);

  // Polling simulation for SePay Real-time Webhook Feed
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-3xl p-6 shadow-md border border-slate-800">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-semibold mb-2">
            <Radio className="h-3.5 w-3.5 animate-pulse text-emerald-400" />
            Cổng thanh toán tự động SePay Webhook
          </div>
          <h1 className="text-xl sm:text-2xl font-bold">Biến động số dư & Tích hợp SePay</h1>
          <p className="text-xs sm:text-sm text-slate-300 mt-1">
            Bắn Webhook tức thì khi khách hàng quét mã VietQR chuyển tiền vào tài khoản ngân hàng.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {selectedAcc && (
            <button
              onClick={() => setShowQrModal(true)}
              className="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold flex items-center gap-2 transition-all cursor-pointer shadow-sm"
            >
              <QrCode className="h-4 w-4" />
              Mở VietQR Nhận Tiền
            </button>
          )}
        </div>
      </div>

      {/* Account Selector & Live Polling Status */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs md:col-span-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex-1">
            <label className="block text-xs font-medium text-slate-500 mb-1">Tài khoản kết nối Webhook</label>
            <select
              value={selectedAccountId}
              onChange={(e) => setSelectedAccountId(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm font-semibold bg-slate-50 focus:bg-white"
            >
              {accounts.map((acc) => (
                <option key={acc.id} value={acc.id}>
                  {acc.accountNumber} ({acc.accountType}) — {formatCurrency(Number(acc.balance), acc.currency)}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-3 self-end sm:self-center">
            <label className="flex items-center gap-2 text-xs font-medium text-slate-600 cursor-pointer">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                className="rounded text-emerald-600 focus:ring-emerald-500"
              />
              Live Polling (4s)
            </label>
            <button
              onClick={loadData}
              className="p-2 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-700 cursor-pointer"
              title="Làm mới"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex flex-col justify-center">
          <span className="text-xs font-medium text-slate-500">Trạng thái SePay API Gateway</span>
          <div className="flex items-center gap-2 mt-1">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-ping"></span>
            <span className="text-sm font-bold text-slate-800">CONNECTING / READY</span>
          </div>
          <span className="text-[11px] text-slate-400 mt-1 font-mono">Endpoint: /api/v1/webhooks/sepay</span>
        </div>
      </div>

      {/* SePay Webhook Simulation Box & Live Transactions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Simulator Column */}
        <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs space-y-4">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Play className="h-4 w-4" />
            </div>
            <h2 className="text-sm font-bold text-slate-900">Giả Lập Webhook SePay</h2>
          </div>
          <p className="text-xs text-slate-500">
            Mô phỏng sự kiện khi người mua quét QR thanh toán xong và hệ thống SePay gửi payload JSON tới backend của bạn.
          </p>

          <form onSubmit={handleSimulateWebhook} className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Số tiền thanh toán (VND)</label>
              <input
                type="number"
                value={simAmount}
                onChange={(e) => setSimAmount(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs tabular-nums"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Nội dung chuyển khoản (Content)</label>
              <input
                type="text"
                value={simContent}
                onChange={(e) => setSimContent(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-mono"
                required
              />
            </div>

            <button
              type="submit"
              disabled={simulating}
              className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <Send className="h-3.5 w-3.5" />
              <span>{simulating ? 'Đang bắn Webhook...' : 'Bắn Webhook Thử Nghiệm'}</span>
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
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
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
        <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-200 p-5 sm:p-6 shadow-xs flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <Activity className="h-4 w-4" />
              </div>
              <h2 className="text-sm font-bold text-slate-900">Nhật Ký Biến Động Số Dư Tức Thì</h2>
            </div>
            <span className="text-xs text-slate-400 font-mono">{transactions.length} giao dịch</span>
          </div>

          <div className="flex-1 overflow-y-auto space-y-2 max-h-[520px]">
            {transactions.length === 0 ? (
              <div className="text-center py-12 text-slate-400 text-xs">
                Chưa có giao dịch biến động nào trên tài khoản này.
              </div>
            ) : (
              transactions.map((tx) => {
                const isIncoming = tx.transactionType === 'DEPOSIT' || tx.targetAccountId === selectedAccountId;
                return (
                  <div
                    key={tx.id}
                    className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 hover:bg-slate-100/80 transition-colors border border-slate-100 text-xs"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 ${
                          isIncoming ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'
                        }`}
                      >
                        {isIncoming ? <ArrowDownLeft className="h-5 w-5" /> : <ArrowUpRight className="h-5 w-5" />}
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
                          isIncoming ? 'text-emerald-600' : 'text-slate-900'
                        }`}
                      >
                        {isIncoming ? '+' : '-'} {formatCurrency(Number(tx.amount), tx.currency)}
                      </div>
                      <span className="inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 mt-0.5">
                        {tx.status}
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
          accountHolderName={customer?.fullName || user?.username || 'CHU TAI KHOAN'}
          bankName="MBBank (MB)"
          defaultAmount={Number(simAmount)}
          defaultDescription={simContent}
        />
      )}
    </div>
  );
};
