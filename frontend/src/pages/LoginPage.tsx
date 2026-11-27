import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Lock, User } from 'lucide-react';
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
    <div className="min-h-screen bg-[#f0f3fa] flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden font-sans text-slate-900">
      {/* Background Soft Glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[36rem] h-[36rem] bg-blue-200/30 rounded-full blur-3xl pointer-events-none" />

      {/* Language Switcher in Top Corner */}
      <div className="absolute top-4 right-4 z-20">
        <LanguageSwitcher />
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10 px-4">
        {/* Emblem & Bank Title matching FinTech .D Logo */}
        <div className="flex flex-col items-center justify-center text-center gap-2.5 mb-5">
          <div className="h-14 w-14 rounded-2xl bg-[#4361ee] flex items-center justify-center text-white shadow-lg shadow-[#4361ee]/25">
            <span className="text-2xl font-black tracking-tight">.D</span>
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900 tracking-tight">
              SePay Banking
            </div>
            <div className="text-xs text-slate-500 font-medium tracking-wide mt-0.5">
              NovaCore FinTech Platform · 2026
            </div>
          </div>
        </div>

        <h2 className="text-center text-lg font-extrabold text-slate-800">
          {t('login.title')}
        </h2>
        <p className="mt-1 text-center text-xs text-slate-500">
          {t('login.sub')}
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md relative z-10 px-4">
        <div className="bg-white border border-slate-100 py-8 px-6 sm:px-8 shadow-xl shadow-slate-200/50 rounded-3xl">
          {error && (
            <div className="mb-5 rounded-2xl bg-rose-50 border border-rose-200 px-4 py-3 text-xs text-rose-700 font-medium">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                {t('login.username')}
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={usernameOrEmail}
                  onChange={(e) => setUsernameOrEmail(e.target.value)}
                  placeholder={t('login.usernamePlaceholder')}
                  className="w-full pl-10 pr-4 py-3 rounded-2xl bg-[#f8fafc] border border-slate-200 text-sm text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#4361ee]/20 focus:border-[#4361ee] transition-all"
                />
                <User className="h-4 w-4 text-slate-400 absolute left-3.5 top-3.5" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                {t('login.password')}
              </label>
              <div className="relative">
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-3 rounded-2xl bg-[#f8fafc] border border-slate-200 text-sm text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#4361ee]/20 focus:border-[#4361ee] transition-all"
                />
                <Lock className="h-4 w-4 text-slate-400 absolute left-3.5 top-3.5" />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 px-4 rounded-2xl text-white font-bold text-sm tracking-wide bg-[#4361ee] hover:bg-[#3451db] transition-all cursor-pointer shadow-md shadow-[#4361ee]/25 mt-2"
            >
              {loading ? t('login.loggingIn') : t('login.loginBtn')}
            </button>
          </form>

          {/* Quick Demo Fill Buttons for 3 Actors */}
          <div className="mt-6 pt-5 border-t border-slate-100">
            <span className="block text-[11px] font-bold text-slate-400 mb-3 uppercase tracking-wider text-center">
              {t('login.quickTitle')}
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
              <button
                type="button"
                onClick={() => fillDemo('demo_user', 'Password@123', '/')}
                className="py-3 px-2 rounded-2xl bg-slate-50 hover:bg-blue-50 border border-slate-200/70 hover:border-blue-300 text-slate-800 text-center font-bold transition-all cursor-pointer flex flex-col items-center gap-1 shadow-2xs hover:shadow-xs group"
              >
                <span className="group-hover:text-[#4361ee]">👤 {t('login.customer')}</span>
                <span className="text-[10px] text-slate-400 group-hover:text-slate-600 font-normal">demo_user</span>
              </button>
              <button
                type="button"
                onClick={() => fillDemo('teller', 'Password@123', '/teller')}
                className="py-3 px-2 rounded-2xl bg-slate-50 hover:bg-cyan-50 border border-slate-200/70 hover:border-cyan-300 text-slate-800 text-center font-bold transition-all cursor-pointer flex flex-col items-center gap-1 shadow-2xs hover:shadow-xs group"
              >
                <span className="group-hover:text-cyan-700">🏦 {t('login.tellerRole')}</span>
                <span className="text-[10px] text-slate-400 group-hover:text-slate-600 font-normal">teller</span>
              </button>
              <button
                type="button"
                onClick={() => fillDemo('admin', 'Password@123', '/admin')}
                className="py-3 px-2 rounded-2xl bg-slate-50 hover:bg-indigo-50 border border-slate-200/70 hover:border-indigo-300 text-slate-800 text-center font-bold transition-all cursor-pointer flex flex-col items-center gap-1 shadow-2xs hover:shadow-xs group"
              >
                <span className="group-hover:text-indigo-700">🛡️ {t('login.adminRole')}</span>
                <span className="text-[10px] text-slate-400 group-hover:text-slate-600 font-normal">admin</span>
              </button>
            </div>
            <p className="text-[11px] text-slate-400 text-center mt-3 font-mono">
              {t('login.defaultPass')} <span className="text-[#4361ee] font-bold">Password@123</span>
            </p>
          </div>

          <div className="mt-5 text-center text-xs text-slate-500">
            {t('login.noAccount')}{' '}
            <Link to="/register" className="font-bold text-[#4361ee] hover:underline">
              {t('login.registerNow')}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
