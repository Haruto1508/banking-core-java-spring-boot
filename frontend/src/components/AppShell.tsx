import React from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  ArrowLeftRight,
  Bell,
  CreditCard,
  Home,
  Landmark,
  LogOut,
  QrCode,
  ShieldCheck,
  User,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const AppShell: React.FC = () => {
  const { user, customer, logout } = useAuth();
  const navigate = useNavigate();

  const isStaffOrAdmin = user?.role === 'ADMIN' || user?.role === 'STAFF';

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const navItems = [
    { to: '/', label: 'Tổng quan', icon: Home },
    { to: '/transfer', label: 'Chuyển tiền', icon: ArrowLeftRight },
    { to: '/payments', label: 'Thanh toán', icon: QrCode },
    { to: '/accounts', label: 'Tài khoản', icon: CreditCard },
    { to: '/notifications', label: 'Thông báo', icon: Bell },
    { to: '/profile', label: 'Hồ sơ', icon: User },
  ];

  if (isStaffOrAdmin) {
    navItems.push({ to: '/admin', label: 'Quầy Teller', icon: ShieldCheck });
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 bg-slate-900 text-white">
        <div className="flex items-center gap-3 px-6 py-5 border-b border-slate-800">
          <div className="h-9 w-9 rounded-xl bg-emerald-500 flex items-center justify-center text-slate-950 font-bold shadow-sm">
            <Landmark className="h-5 w-5" />
          </div>
          <div>
            <div className="font-semibold tracking-tight text-base">NovaBank</div>
            <div className="text-[11px] text-slate-400">Core Digital Banking</div>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-emerald-500/15 text-emerald-400'
                    : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                }`
              }
            >
              <Icon className="h-4.5 w-4.5 shrink-0" />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-800">
          <div className="flex items-center justify-between gap-2 mb-3">
            <div className="min-w-0">
              <div className="text-sm font-medium truncate">
                {customer?.fullName || user?.username}
              </div>
              <div className="text-xs text-slate-400 truncate">
                {user?.role} {customer?.customerNumber ? `• ${customer.customerNumber}` : ''}
              </div>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors cursor-pointer"
          >
            <LogOut className="h-4 w-4" />
            Đăng xuất
          </button>
        </div>
      </aside>

      {/* Mobile Top Header */}
      <header className="md:hidden sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-slate-200 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-lg bg-slate-900 flex items-center justify-center text-emerald-400">
            <Landmark className="h-4.5 w-4.5" />
          </div>
          <div>
            <div className="font-semibold text-sm text-slate-900 leading-tight">NovaBank</div>
            <div className="text-[11px] text-slate-500 leading-tight">
              {customer?.fullName || user?.username}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <NavLink
            to="/notifications"
            className="p-2 rounded-full text-slate-600 hover:bg-slate-100"
            aria-label="Thông báo"
          >
            <Bell className="h-5 w-5" />
          </NavLink>
          <button
            onClick={handleLogout}
            className="p-2 rounded-full text-slate-600 hover:bg-slate-100 cursor-pointer"
            aria-label="Đăng xuất"
          >
            <LogOut className="h-5 w-5" />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 md:pl-64 pb-20 md:pb-8">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-5 sm:py-7">
          <Outlet />
        </div>
      </main>

      {/* Mobile Bottom Navigation Bar */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-white border-t border-slate-200 px-1 py-1.5 flex justify-around items-center">
        {[
          { to: '/', label: 'Trang chủ', icon: Home },
          { to: '/transfer', label: 'Chuyển tiền', icon: ArrowLeftRight },
          { to: '/payments', label: 'Thanh toán', icon: QrCode },
          { to: '/accounts', label: 'Tài khoản', icon: CreditCard },
          isStaffOrAdmin
            ? { to: '/admin', label: 'Teller', icon: ShieldCheck }
            : { to: '/profile', label: 'Hồ sơ', icon: User },
        ].map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center gap-0.5 px-2 py-1 rounded-lg text-[11px] font-medium transition-colors ${
                isActive ? 'text-emerald-600' : 'text-slate-500 hover:text-slate-800'
              }`
            }
          >
            <Icon className="h-5 w-5" />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
};
