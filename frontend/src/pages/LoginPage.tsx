import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Landmark, Lock, User } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { extractErrorMessage } from '../api/client';

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
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
      await login(usernameOrEmail.trim(), password);
      navigate('/');
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const fillDemo = (u: string, p: string) => {
    setUsernameOrEmail(u);
    setPassword(p);
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background glowing effects */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10 px-4">
        <div className="flex items-center justify-center gap-3 mb-4">
          <div className="h-12 w-12 rounded-2xl bg-emerald-500 flex items-center justify-center text-slate-950 shadow-lg shadow-emerald-500/20">
            <Landmark className="h-7 w-7" />
          </div>
          <div>
            <div className="text-2xl font-extrabold text-white tracking-tight">NovaBank</div>
            <div className="text-xs text-emerald-400 font-semibold">Tích hợp Cổng thanh toán SePay 24/7</div>
          </div>
        </div>
        <h2 className="text-center text-xl sm:text-2xl font-bold text-slate-100">
          Đăng nhập tài khoản
        </h2>
        <p className="mt-1 text-center text-xs text-slate-400">
          Hệ thống ngân hàng số an toàn chuẩn PCI-DSS & JWT Refresh Rotation
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md relative z-10 px-4">
        <div className="bg-slate-900 border border-slate-800 py-8 px-6 sm:px-8 shadow-2xl rounded-3xl text-slate-200">
          {error && (
            <div className="mb-5 rounded-2xl bg-rose-950/60 border border-rose-800/80 px-4 py-3 text-xs text-rose-300">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Tên đăng nhập hoặc Email
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={usernameOrEmail}
                  onChange={(e) => setUsernameOrEmail(e.target.value)}
                  placeholder="admin, teller, hoặc demo_user"
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <User className="h-4 w-4 text-slate-400 absolute left-3.5 top-3.5" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Mật khẩu
              </label>
              <div className="relative">
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <Lock className="h-4 w-4 text-slate-400 absolute left-3.5 top-3.5" />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 text-sm font-bold transition-all cursor-pointer shadow-lg shadow-emerald-500/20 mt-2"
            >
              {loading ? 'Đang xác thực...' : 'Đăng nhập hệ thống'}
            </button>
          </form>

          {/* Quick Demo Fill Buttons */}
          <div className="mt-6 pt-5 border-t border-slate-800">
            <span className="block text-[11px] font-semibold text-slate-400 mb-2 uppercase tracking-wider text-center">
              Chọn nhanh tài khoản thử nghiệm
            </span>
            <div className="grid grid-cols-3 gap-2 text-xs">
              <button
                type="button"
                onClick={() => fillDemo('demo_user', 'Password@123')}
                className="py-2 px-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-center font-medium transition-colors cursor-pointer"
              >
                Khách hàng
              </button>
              <button
                type="button"
                onClick={() => fillDemo('teller', 'Password@123')}
                className="py-2 px-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-center font-medium transition-colors cursor-pointer"
              >
                Giao dịch viên
              </button>
              <button
                type="button"
                onClick={() => fillDemo('admin', 'Password@123')}
                className="py-2 px-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-center font-medium transition-colors cursor-pointer"
              >
                Quản trị viên
              </button>
            </div>
            <p className="text-[11px] text-slate-400 text-center mt-2 font-mono">
              Mật khẩu mặc định: <span className="text-emerald-400 font-semibold">Password@123</span>
            </p>
          </div>

          <div className="mt-5 text-center text-xs text-slate-400">
            Chưa có tài khoản?{' '}
            <Link to="/register" className="font-semibold text-emerald-400 hover:text-emerald-300">
              Đăng ký ngay
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
