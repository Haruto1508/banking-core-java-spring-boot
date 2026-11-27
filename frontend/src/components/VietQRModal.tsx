import React, { useState } from 'react';
import { Check, Copy, Download, QrCode } from 'lucide-react';
import { formatCurrency } from '../utils/format';

interface VietQRModalProps {
  isOpen: boolean;
  onClose: () => void;
  accountNumber: string;
  accountHolderName: string;
  bankName?: string;
  defaultAmount?: number;
  defaultDescription?: string;
}

export const VietQRModal: React.FC<VietQRModalProps> = ({
  isOpen,
  onClose,
  accountNumber,
  accountHolderName,
  bankName = 'MBBank (MB)',
  defaultAmount = 0,
  defaultDescription = '',
}) => {
  const [amount, setAmount] = useState<string>(defaultAmount > 0 ? String(defaultAmount) : '');
  const [description, setDescription] = useState<string>(defaultDescription || 'SEPAY THANH TOAN');
  const [copied, setCopied] = useState<string | null>(null);

  if (!isOpen) return null;

  // VietQR / SePay format: bankId, acc, template, amount, des
  // Using public VietQR image generator URL for standard banking apps (MBBank bin 970422 / MB)
  const numericAmount = Math.max(0, Number(amount) || 0);
  const qrUrl = `https://img.vietqr.io/image/MB-${accountNumber}-compact2.png?amount=${numericAmount}&addInfo=${encodeURIComponent(description)}&accountName=${encodeURIComponent(accountHolderName)}`;

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl border border-slate-100 overflow-hidden">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-emerald-600 to-teal-700 px-6 py-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-white/20 flex items-center justify-center">
              <QrCode className="h-5 w-5 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-base">Mã QR Chuyển Khoản Tức Thì</h3>
              <p className="text-[11px] text-emerald-100">Chuẩn Napas 247 / VietQR phong cách SePay</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors text-lg leading-none cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* QR Content */}
        <div className="p-6 space-y-4">
          <div className="flex flex-col items-center justify-center bg-emerald-50/60 border border-emerald-100 rounded-2xl p-4">
            <div className="bg-white p-3 rounded-2xl shadow-sm border border-slate-200/80 mb-3">
              <img
                src={qrUrl}
                alt="VietQR Napas247"
                className="w-56 h-auto object-contain mx-auto"
                loading="lazy"
              />
            </div>
            <div className="text-center">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-semibold">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
                SePay Gateway Auto-Detect Ready
              </span>
            </div>
          </div>

          {/* Quick Amount and Note Inputs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div>
              <label className="block font-medium text-slate-700 mb-1">Số tiền (₫)</label>
              <input
                type="number"
                placeholder="Nhập số tiền"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-xs tabular-nums"
              />
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">Nội dung CK</label>
              <input
                type="text"
                placeholder="SEPAY DH12345"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-xs"
              />
            </div>
          </div>

          {/* Bank details card with copy */}
          <div className="bg-slate-50 rounded-2xl p-3.5 space-y-2 text-xs border border-slate-100">
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Ngân hàng:</span>
              <span className="font-semibold text-slate-800">{bankName}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Số tài khoản:</span>
              <div className="flex items-center gap-1.5">
                <span className="font-mono font-bold text-slate-900">{accountNumber}</span>
                <button
                  type="button"
                  onClick={() => copyToClipboard(accountNumber, 'acc')}
                  className="p-1 text-slate-500 hover:text-emerald-600 rounded cursor-pointer"
                  title="Sao chép"
                >
                  {copied === 'acc' ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                </button>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Chủ tài khoản:</span>
              <span className="font-semibold text-slate-800 uppercase">{accountHolderName}</span>
            </div>
            {numericAmount > 0 && (
              <div className="flex items-center justify-between pt-1 border-t border-slate-200/60">
                <span className="text-slate-500">Số tiền:</span>
                <span className="font-bold text-emerald-600 tabular-nums">{formatCurrency(numericAmount, 'VND')}</span>
              </div>
            )}
          </div>

          <div className="flex gap-2">
            <a
              href={qrUrl}
              download={`vietqr-${accountNumber}.png`}
              target="_blank"
              rel="noreferrer"
              className="flex-1 py-2.5 px-3 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <Download className="h-4 w-4" />
              Tải ảnh QR
            </a>
            <button
              onClick={onClose}
              className="flex-1 py-2.5 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition-colors cursor-pointer"
            >
              Đóng
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
