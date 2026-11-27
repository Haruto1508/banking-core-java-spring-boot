import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Eye, EyeOff, Landmark, Lock, Mail, User } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { extractErrorMessage } from '../api/client';
import { LanguageSwitcher } from '../components/LanguageSwitcher';

export const RegisterPage: React.FC = () => {
  const { register } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await register(username.trim(), email.trim(), password);
      navigate('/profile');
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-50/80 via-slate-50 to-white flex items-center justify-center px-4 py-10 relative overflow-hidden text-slate-900">
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-sky-200/40 rounded-full blur-3xl pointer-events-none" />

      {/* Language Switcher in Top Corner */}
      <div className="absolute top-4 right-4 z-20">
        <LanguageSwitcher />
      </div>

      <div className="w-full max-w-md bg-white border border-sky-100 rounded-3xl shadow-xl p-7 sm:p-9 relative z-10 card-glow">
        <div className="flex items-center gap-3 mb-7">
          <div className="h-11 w-11 rounded-2xl bg-gradient-to-tr from-sky-500 to-blue-600 text-white flex items-center justify-center shadow-md shadow-sky-500/20">
            <Landmark className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900">Đăng ký {t('common.appName')}</h1>
            <p className="text-xs text-slate-500">Khởi tạo tài khoản ngân hàng số trong 30 giây</p>
          </div>
        </div>

        {error && (
          <div className="mb-5 rounded-xl bg-rose-50 border border-rose-200 px-4 py-3 text-xs sm:text-sm text-rose-700 font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">{t('login.username')}</label>
            <div className="relative">
              <User className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                required
                minLength={4}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="nguyenvana"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">{t('profile.email')}</label>
            <div className="relative">
              <Mail className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nguyenvana@gmail.com"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              {t('login.password')}
            </label>
            <div className="relative">
              <Lock className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password@123"
                className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 disabled:opacity-60 text-white font-bold text-sm transition-all cursor-pointer shadow-md shadow-sky-500/20"
          >
            {submitting ? 'Đang tạo tài khoản...' : 'Đăng ký ngay'}
          </button>
        </form>

        <div className="mt-6 text-center text-xs text-slate-500">
          Đã có tài khoản?{' '}
          <Link to="/login" className="text-sky-600 font-bold hover:underline">
            {t('login.loginBtn')}
          </Link>
        </div>
      </div>
    </div>
  );
};
