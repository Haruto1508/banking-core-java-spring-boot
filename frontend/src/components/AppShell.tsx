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
  Radio,
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
    { to: '/sepay', label: 'Cổng SePay QR', icon: Radio },
    { to: '/payments', label: 'Thanh toán hoá đơn', icon: QrCode },
    { to: '/accounts', label: 'Tài khoản & Sao kê', icon: CreditCard },
    { to: '/notifications', label: 'Thông báo', icon: Bell },
    { to: '/profile', label: 'Hồ sơ khách hàng', icon: User },
  ];

  if (isStaffOrAdmin) {
    navItems.push({ to: '/admin', label: 'Quầy Teller', icon: ShieldCheck });
  }

  return (
    <div className="min-h-screen bg-[#080d14] flex flex-col md:flex-row font-sans">
      {/* Desktop Sidebar - SePay Dark Modern Style */}
      <aside className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 bg-slate-950 text-white border-r border-slate-900 shadow-xl z-20">
        <div className="flex items-center gap-3 px-6 py-5 border-b border-slate-900">
          <div className="h-10 w-10 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-slate-950 font-bold shadow-md shadow-emerald-500/20">
            <Landmark className="h-5 w-5" />
          </div>
          <div>
            <div className="font-extrabold tracking-tight text-base text-white">NovaBank</div>
            <div className="text-[11px] text-emerald-400 font-medium">Core SePay Engine</div>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1.5 overflow-y-auto">
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-xs font-semibold transition-all ${
                  isActive
                    ? 'bg-emerald-500/15 text-emerald-400 shadow-xs'
                    : 'text-slate-400 hover:bg-slate-900 hover:text-white'
                }`
              }
            >
              <Icon className="h-4.5 w-4.5 shrink-0" />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        {/* User Card & Logout */}
        <div className="p-4 border-t border-slate-900 bg-slate-950/50">
          <div className="flex items-center justify-between gap-2 mb-3">
            <div className="min-w-0">
              <div className="text-xs font-bold text-white truncate">
                {customer?.fullName || user?.username}
              </div>
              <div className="text-[11px] text-slate-400 truncate">
                {user?.role} {customer?.customerNumber ? `• ${customer.customerNumber}` : ''}
              </div>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white transition-colors cursor-pointer border border-slate-800"
          >
            <LogOut className="h-4 w-4" />
            Đăng xuất
          </button>
        </div>
      </aside>

      {/* Mobile Top Header */}
      <header className="md:hidden sticky top-0 z-30 bg-slate-950 text-white border-b border-slate-900 px-4 py-3 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-xl bg-emerald-500 flex items-center justify-center text-slate-950 font-bold">
            <Landmark className="h-4.5 w-4.5" />
          </div>
          <div>
            <div className="font-bold text-sm leading-tight text-white">NovaBank</div>
            <div className="text-[11px] text-emerald-400 leading-tight">
              {customer?.fullName || user?.username}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <NavLink
            to="/notifications"
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-900"
            aria-label="Thông báo"
          >
            <Bell className="h-5 w-5" />
          </NavLink>
          <button
            onClick={handleLogout}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-900 cursor-pointer"
            aria-label="Đăng xuất"
          >
            <LogOut className="h-5 w-5" />
          </button>
        </div>
      </header>

      {/* Main Content Viewport */}
      <main className="flex-1 md:pl-64 pb-24 md:pb-10 bg-[#080d14] min-h-screen">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          <Outlet />
        </div>
      </main>

      {/* Mobile Bottom Navigation Bar */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-slate-950/95 backdrop-blur border-t border-slate-900 px-2 py-2 flex justify-around items-center text-slate-400 shadow-xl">
        {[
          { to: '/', label: 'Trang chủ', icon: Home },
          { to: '/transfer', label: 'Chuyển tiền', icon: ArrowLeftRight },
          { to: '/sepay', label: 'SePay QR', icon: Radio },
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
              `flex flex-col items-center justify-center gap-1 px-2.5 py-1 rounded-xl text-[10px] font-semibold transition-colors ${
                isActive ? 'text-emerald-400' : 'text-slate-400 hover:text-slate-200'
              }`
            }
          >
            <Icon className="h-4.5 w-4.5" />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
};
