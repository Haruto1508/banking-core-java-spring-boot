import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Landmark, Lock, User } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { extractErrorMessage } from '../api/client';
import { LanguageSwitcher } from '../components/LanguageSwitcher';

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [usernameOrEmail, setUsernameOrEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const loggedInUser = await login(usernameOrEmail.trim(), password);
      const redirect = sessionStorage.getItem('loginRedirect');
      sessionStorage.removeItem('loginRedirect');

      if (redirect) {
        navigate(redirect, { replace: true });
      } else if (loggedInUser.role === 'ADMIN') {
        navigate('/admin', { replace: true });
      } else if (loggedInUser.role === 'STAFF') {
        navigate('/teller', { replace: true });
      } else {
        navigate('/', { replace: true });
      }
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const fillDemo = (u: string, p: string, redirectPath?: string) => {
    setUsernameOrEmail(u);
    setPassword(p);
    if (redirectPath) {
      sessionStorage.setItem('loginRedirect', redirectPath);
    } else {
      sessionStorage.removeItem('loginRedirect');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-50/80 via-slate-50 to-white flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden text-slate-900">
      {/* Background Soft Glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-sky-200/40 rounded-full blur-3xl pointer-events-none" />

      {/* Language Switcher in Top Corner */}
      <div className="absolute top-4 right-4 z-20">
        <LanguageSwitcher />
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10 px-4">
        <div className="flex items-center justify-center gap-3 mb-4">
          <div className="h-12 w-12 rounded-2xl bg-gradient-to-tr from-sky-500 to-blue-600 flex items-center justify-center text-white shadow-lg shadow-sky-500/20">
            <Landmark className="h-7 w-7" />
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900 tracking-tight">{t('common.appName')}</div>
            <div className="text-xs text-sky-600 font-bold">{t('common.coreEngine')}</div>
          </div>
        </div>
        <h2 className="text-center text-xl sm:text-2xl font-black text-slate-900">
          {t('login.title')}
        </h2>
        <p className="mt-1 text-center text-xs text-slate-500">
          {t('login.sub')}
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md relative z-10 px-4">
        <div className="bg-white border border-sky-100 py-8 px-6 sm:px-8 shadow-xl rounded-3xl card-glow">
          {error && (
            <div className="mb-5 rounded-2xl bg-rose-50 border border-rose-200 px-4 py-3 text-xs text-rose-700 font-medium">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                {t('login.username')}
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={usernameOrEmail}
                  onChange={(e) => setUsernameOrEmail(e.target.value)}
                  placeholder={t('login.usernamePlaceholder')}
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
                <User className="h-4 w-4 text-slate-400 absolute left-3.5 top-3.5" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                {t('login.password')}
              </label>
              <div className="relative">
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
                <Lock className="h-4 w-4 text-slate-400 absolute left-3.5 top-3.5" />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 disabled:opacity-50 text-white text-sm font-bold transition-all cursor-pointer shadow-md shadow-sky-500/20 mt-2"
            >
              {loading ? t('login.loggingIn') : t('login.loginBtn')}
            </button>
          </form>

          {/* Quick Demo Fill Buttons for 4 Actors */}
          <div className="mt-6 pt-5 border-t border-slate-100">
            <span className="block text-[11px] font-bold text-slate-400 mb-2.5 uppercase tracking-wider text-center">
              {t('login.quickTitle')}
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
              <button
                type="button"
                onClick={() => fillDemo('demo_user', 'Password@123', '/')}
                className="py-3 px-2 rounded-2xl bg-sky-50 hover:bg-sky-100 border border-sky-100 text-sky-800 text-center font-bold transition-colors cursor-pointer flex flex-col items-center gap-0.5 shadow-2xs"
              >
                <span>👤 {t('login.customer')}</span>
                <span className="text-[10px] text-slate-400 font-normal">demo_user (Khách hàng)</span>
              </button>
              <button
                type="button"
                onClick={() => fillDemo('teller', 'Password@123', '/teller')}
                className="py-3 px-2 rounded-2xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 text-center font-bold transition-colors cursor-pointer flex flex-col items-center gap-0.5 shadow-2xs"
              >
                <span>🏦 {t('login.tellerRole')}</span>
                <span className="text-[10px] text-slate-400 font-normal">teller (Quầy & Thu ngân POS)</span>
              </button>
              <button
                type="button"
                onClick={() => fillDemo('admin', 'Password@123', '/admin')}
                className="py-3 px-2 rounded-2xl bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-800 text-center font-bold transition-colors cursor-pointer flex flex-col items-center gap-0.5 shadow-2xs"
              >
                <span>🛡️ {t('login.adminRole')}</span>
                <span className="text-[10px] text-slate-400 font-normal">admin (Quản trị viên)</span>
              </button>
            </div>
            <p className="text-[11px] text-slate-400 text-center mt-2.5 font-mono">
              {t('login.defaultPass')} <span className="text-sky-600 font-bold">Password@123</span>
            </p>
          </div>

          <div className="mt-5 text-center text-xs text-slate-500">
            {t('login.noAccount')}{' '}
            <Link to="/register" className="font-bold text-sky-600 hover:text-sky-700">
              {t('login.registerNow')}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
