import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertCircle, AlertTriangle, CheckCircle, Info, X } from 'lucide-react';

interface AlertModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  message: string;
  type?: 'error' | 'warning' | 'info' | 'success';
  buttonText?: string;
}

export const AlertModal: React.FC<AlertModalProps> = ({
  isOpen,
  onClose,
  title,
  message,
  type = 'error',
  buttonText,
}) => {
  const { t } = useTranslation();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const typeConfig = {
    error: {
      icon: AlertCircle,
      iconBg: 'bg-rose-50 text-rose-600 border-rose-200',
      badgeBg: 'bg-rose-50 text-rose-700 border-rose-200',
      defaultTitle: t('common.errorTitle', 'Thông báo lỗi'),
      btnBg: 'bg-gradient-to-r from-rose-500 to-red-600 hover:from-rose-400 hover:to-red-500 shadow-rose-500/20',
    },
    warning: {
      icon: AlertTriangle,
      iconBg: 'bg-amber-50 text-amber-600 border-amber-200',
      badgeBg: 'bg-amber-50 text-amber-700 border-amber-200',
      defaultTitle: t('common.warningTitle', 'Cảnh báo giao dịch'),
      btnBg: 'bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 shadow-amber-500/20',
    },
    info: {
      icon: Info,
      iconBg: 'bg-sky-50 text-sky-600 border-sky-200',
      badgeBg: 'bg-sky-50 text-sky-700 border-sky-200',
      defaultTitle: t('common.infoTitle', 'Thông báo hệ thống'),
      btnBg: 'bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 shadow-sky-500/20',
    },
    success: {
      icon: CheckCircle,
      iconBg: 'bg-emerald-50 text-emerald-600 border-emerald-200',
      badgeBg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      defaultTitle: t('common.successTitle', 'Thành công'),
      btnBg: 'bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 shadow-emerald-500/20',
    },
  }[type];

  const Icon = typeConfig.icon;
  const modalTitle = title || typeConfig.defaultTitle;
  const btnLabel = buttonText || t('common.close', 'Đã hiểu');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="bg-white w-full max-w-md rounded-3xl shadow-2xl border border-sky-100 overflow-hidden transform transition-all animate-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="px-6 pt-6 pb-2 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className={`h-12 w-12 rounded-2xl flex items-center justify-center border shadow-xs ${typeConfig.iconBg}`}>
              <Icon className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900 leading-tight">{modalTitle}</h3>
              <span className={`inline-block mt-0.5 text-[10px] font-bold px-2 py-0.5 rounded-full border ${typeConfig.badgeBg}`}>
                {type.toUpperCase()}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
            aria-label="Đóng"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-4">
          <p className="text-sm text-slate-600 leading-relaxed font-medium whitespace-pre-line">
            {message}
          </p>
        </div>

        {/* Footer */}
        <div className="px-6 pb-6 pt-2">
          <button
            type="button"
            onClick={onClose}
            autoFocus
            className={`w-full py-3 px-4 rounded-2xl text-white text-sm font-bold transition-all cursor-pointer shadow-md text-center ${typeConfig.btnBg}`}
          >
            {btnLabel}
          </button>
        </div>
      </div>
    </div>
  );
};
