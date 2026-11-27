import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  CheckCircle2,
  CreditCard,
  Edit3,
  Mail,
  Phone,
  Shield,
  User,
  UserCheck,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { customerApi } from '../api/bankingApi';
import { extractErrorMessage } from '../api/client';

export const ProfilePage: React.FC = () => {
  const { user, customer, refreshCustomer } = useAuth();
  const { t } = useTranslation();

  const [fullName, setFullName] = useState('');
  const [identityNumber, setIdentityNumber] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (customer) {
      setFullName(customer.fullName);
      setIdentityNumber(customer.identityNumber);
      setPhoneNumber(customer.phoneNumber);
      setEmail(customer.email);
    } else if (user) {
      setEmail(user.email);
    }
  }, [customer, user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null); setSuccessMsg(null); setSubmitting(true);
    try {
      if (customer) {
        await customerApi.update(customer.id, {
          fullName: fullName.trim(),
          phoneNumber: phoneNumber.trim(),
          email: email.trim(),
        });
        setSuccessMsg(t('profile.updateSuccess'));
      } else {
        await customerApi.create({
          fullName: fullName.trim(),
          identityNumber: identityNumber.trim(),
          phoneNumber: phoneNumber.trim(),
          email: email.trim(),
        });
        setSuccessMsg(t('profile.createSuccess'));
      }
      await refreshCustomer();
    } catch (err) { setError(extractErrorMessage(err)); } finally { setSubmitting(false); }
  };

  const initials = (customer?.fullName || user?.username || 'U')
    .split(' ')
    .slice(-2)
    .map(w => w[0]?.toUpperCase())
    .join('');

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-black text-slate-900 leading-tight">{t('profile.title')}</h1>
        <p className="text-xs text-slate-500 mt-0.5">
          {customer ? `${t('profile.cifCode')}: ${customer.customerNumber} · ${t('common.status')}: ${t(`status.${customer.status}`)}` : t('profile.desc')}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        {/* Left: Identity Card */}
        <div className="lg:col-span-2 space-y-4">
          {/* Avatar Card */}
          <div className="relative bg-white border border-sky-100 rounded-3xl p-6 text-center shadow-xs card-glow">
            <div className="flex flex-col items-center">
              <div className="h-20 w-20 rounded-2xl bg-gradient-to-tr from-sky-500 to-blue-600 flex items-center justify-center text-white font-black text-2xl shadow-md shadow-sky-500/20 mb-3">
                {initials}
              </div>
              <h2 className="text-base font-black text-slate-900 leading-tight">{customer?.fullName || user?.username}</h2>
              <p className="text-xs text-slate-400 mt-1">{user?.role} · {user?.username}</p>
              {customer && (
                <span className={`mt-3 px-3 py-1 rounded-full text-[11px] font-bold border ${
                  customer.status === 'ACTIVE'
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-amber-50 text-amber-700 border-amber-200'
                }`}>
                  {customer.status === 'ACTIVE' ? t('profile.kycVerified') : t(`status.${customer.status}`)}
                </span>
              )}
            </div>
          </div>

          {/* Quick Info Summary */}
          {customer && (
            <div className="bg-white border border-sky-100 rounded-3xl p-5 space-y-3 shadow-xs">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">{t('profile.quickInfo')}</h3>
              {[
                { icon: User, label: t('profile.cifCode'), value: customer.customerNumber },
                { icon: CreditCard, label: t('profile.identityNumber'), value: customer.identityNumber },
                { icon: Phone, label: t('profile.phoneNumber'), value: customer.phoneNumber },
                { icon: Mail, label: t('profile.email'), value: customer.email },
              ].map(({ icon: Icon, label, value }) => (
                <div key={label} className="flex items-center gap-3">
                  <div className="h-7 w-7 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center shrink-0">
                    <Icon className="h-3.5 w-3.5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-[10px] text-slate-400 font-medium">{label}</div>
                    <div className="text-xs font-bold text-slate-800 truncate">{value || '—'}</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Security Badge */}
          <div className="bg-sky-50/80 border border-sky-200/80 rounded-3xl p-4 flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-sky-500 text-white flex items-center justify-center shrink-0 shadow-xs">
              <Shield className="h-4.5 w-4.5" />
            </div>
            <div>
              <div className="text-xs font-bold text-sky-950">{t('profile.securityTitle')}</div>
              <div className="text-[10px] text-sky-700 mt-0.5">{t('profile.securityDesc')}</div>
            </div>
          </div>
        </div>

        {/* Right: Edit Form */}
        <div className="lg:col-span-3 bg-white border border-sky-100 rounded-3xl p-5 sm:p-6 shadow-xs">
          <div className="flex items-center gap-2 mb-5">
            <div className="h-8 w-8 rounded-xl bg-sky-50 text-sky-600 border border-sky-200/80 flex items-center justify-center">
              <Edit3 className="h-4 w-4" />
            </div>
            <h2 className="text-sm font-extrabold text-slate-900">
              {customer ? t('profile.updateTitle') : t('profile.createTitle')}
            </h2>
          </div>

          {!customer && (
            <div className="mb-5 rounded-2xl bg-sky-50 border border-sky-200 p-4 text-xs text-sky-800 font-medium">
              {t('profile.kycNote')}
            </div>
          )}

          {error && <div className="mb-4 rounded-xl bg-rose-50 border border-rose-200 px-4 py-3 text-xs text-rose-700 font-medium">{error}</div>}
          {successMsg && (
            <div className="mb-4 rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3 text-xs text-emerald-700 font-bold flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">{t('profile.fullName')}</label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Nguyễn Văn A"
                className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">{t('profile.identityNumber')}</label>
              <input
                type="text"
                required={!customer}
                disabled={!!customer}
                value={identityNumber}
                onChange={(e) => setIdentityNumber(e.target.value)}
                placeholder="079099001234"
                className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 text-sm text-slate-800 font-mono focus:outline-none focus:ring-2 focus:ring-sky-500 disabled:bg-slate-50 disabled:text-slate-500 disabled:cursor-not-allowed"
              />
              {customer && <p className="mt-1 text-[10px] text-slate-400">{t('profile.cannotEditCccd')}</p>}
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">{t('profile.phoneNumber')}</label>
              <input
                type="tel"
                required
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="0901234567"
                className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">{t('profile.email')}</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email@domain.com"
                className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 disabled:opacity-50 text-white text-sm font-bold inline-flex items-center justify-center gap-2 cursor-pointer transition-all shadow-md shadow-sky-500/20"
            >
              <UserCheck className="h-4 w-4" />
              {submitting ? t('profile.saving') : customer ? t('profile.saveBtn') : t('profile.createBtn')}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
