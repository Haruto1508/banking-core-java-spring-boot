import React from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Activity,
  ArrowLeftRight,
  Bell,
  CreditCard,
  Home,
  Landmark,
  LogOut,
  QrCode,
  Radio,
  ShieldAlert,
  ShieldCheck,
  Store,
  User,
  Wallet,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { LanguageSwitcher } from './LanguageSwitcher';

export const AppShell: React.FC = () => {
  const { user, customer, logout } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const isAdmin = user?.role === 'ADMIN';
  const isStaff = user?.role === 'STAFF';

  // Actor-specific navigation items
  let navItems: Array<{ to: string; label: string; icon: any }>;
  let bottomNavItems: Array<{ to: string; label: string; icon: any }>;

  if (isAdmin) {
    navItems = [
      { to: '/', label: t('nav.adminDashboard'), icon: Activity },
      { to: '/admin', label: t('nav.adminAccounts'), icon: ShieldAlert },
      { to: '/teller', label: t('nav.tellerDesk'), icon: ShieldCheck },
      { to: '/sepay', label: t('nav.sepay'), icon: Radio },
      { to: '/notifications', label: t('nav.notifications'), icon: Bell },
      { to: '/profile', label: t('nav.profile'), icon: User },
    ];
    bottomNavItems = [
      { to: '/', label: t('nav.adminDashboard'), icon: Activity },
      { to: '/admin', label: t('nav.adminAccounts'), icon: ShieldAlert },
      { to: '/teller', label: t('nav.tellerDesk'), icon: ShieldCheck },
      { to: '/sepay', label: t('nav.sepay'), icon: Radio },
      { to: '/profile', label: t('nav.profile'), icon: User },
    ];
  } else if (isStaff) {
    navItems = [
      { to: '/', label: t('nav.tellerDesk'), icon: ShieldCheck },
      { to: '/teller', label: t('nav.teller'), icon: Wallet },
      { to: '/sepay', label: t('nav.sepay'), icon: Radio },
      { to: '/notifications', label: t('nav.notifications'), icon: Bell },
      { to: '/profile', label: t('nav.profile'), icon: User },
    ];
    bottomNavItems = [
      { to: '/', label: t('nav.tellerDesk'), icon: ShieldCheck },
      { to: '/teller', label: t('nav.teller'), icon: Wallet },
      { to: '/sepay', label: t('nav.sepay'), icon: Radio },
      { to: '/notifications', label: t('nav.notifications'), icon: Bell },
      { to: '/profile', label: t('nav.profile'), icon: User },
    ];
  } else {
    // CUSTOMER & SELLER
    navItems = [
      { to: '/', label: t('nav.overview'), icon: Home },
      { to: '/seller', label: t('nav.sellerHub'), icon: Store },
      { to: '/transfer', label: t('nav.transfer'), icon: ArrowLeftRight },
      { to: '/payments', label: t('nav.payments'), icon: QrCode },
      { to: '/sepay', label: t('nav.sepay'), icon: Radio },
      { to: '/accounts', label: t('nav.accounts'), icon: CreditCard },
      { to: '/notifications', label: t('nav.notifications'), icon: Bell },
      { to: '/profile', label: t('nav.profile'), icon: User },
    ];
    bottomNavItems = [
      { to: '/', label: t('nav.home'), icon: Home },
      { to: '/seller', label: t('nav.sellerHub'), icon: Store },
      { to: '/transfer', label: t('nav.transfer'), icon: ArrowLeftRight },
      { to: '/accounts', label: t('nav.accounts'), icon: CreditCard },
      { to: '/profile', label: t('nav.profile'), icon: User },
    ];
  }

  return (
    <div className="min-h-screen bg-slate-50/80 flex flex-col md:flex-row font-sans text-slate-900">
      {/* Desktop Sidebar - Clean Light Theme with Sky Blue Accents */}
      <aside className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 bg-white border-r border-sky-100/90 shadow-xs z-20">
        <div className="flex items-center justify-between px-5 py-4 border-b border-sky-100/80">
          <div className="flex items-center gap-3">
            <div
              className={`h-10 w-10 rounded-2xl text-white font-bold shadow-md flex items-center justify-center ${
                isAdmin
                  ? 'bg-gradient-to-tr from-rose-500 to-indigo-600 shadow-rose-500/20'
                  : isStaff
                  ? 'bg-gradient-to-tr from-emerald-500 to-teal-600 shadow-emerald-500/20'
                  : 'bg-gradient-to-tr from-sky-500 to-blue-600 shadow-sky-500/20'
              }`}
            >
              <Landmark className="h-5 w-5" />
            </div>
            <div>
              <div className="font-extrabold tracking-tight text-base text-slate-900">
                {isAdmin ? 'NovaBank Admin' : isStaff ? 'NovaBank Teller' : t('common.appName')}
              </div>
              <div className="text-[11px] text-sky-600 font-medium">
                {isAdmin ? 'System Control Portal' : isStaff ? 'Quầy Giao Dịch Viên' : t('common.coreEngine')}
              </div>
            </div>
          </div>
        </div>

        <div className="px-4 py-2 border-b border-sky-50 flex items-center justify-between">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Ngôn ngữ / Lang</span>
          <LanguageSwitcher />
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-xs font-semibold transition-all ${
                  isActive
                    ? 'bg-sky-50 text-sky-700 font-bold border border-sky-200/80 shadow-xs'
                    : 'text-slate-600 hover:bg-sky-50/60 hover:text-sky-800'
                }`
              }
            >
              <Icon className="h-4.5 w-4.5 shrink-0" />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        {/* User Card & Logout */}
        <div className="p-4 border-t border-sky-100/80 bg-sky-50/40">
          <div className="flex items-center justify-between gap-2 mb-3">
            <div className="min-w-0">
              <div className="text-xs font-bold text-slate-800 truncate">
                {customer?.fullName || user?.username}
              </div>
              <div className="text-[11px] text-slate-500 truncate mt-0.5 flex items-center gap-1.5">
                <span
                  className={`px-1.5 py-0.5 rounded-md font-bold text-[9px] uppercase border ${
                    isAdmin
                      ? 'bg-rose-50 text-rose-700 border-rose-200'
                      : isStaff
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : 'bg-sky-50 text-sky-700 border-sky-200'
                  }`}
                >
                  {isAdmin ? 'ADMIN' : isStaff ? 'TELLER' : 'CUSTOMER'}
                </span>
                {customer?.customerNumber && (
                  <span className="font-mono text-[10px] text-slate-400">• {customer.customerNumber}</span>
                )}
              </div>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold bg-white hover:bg-rose-50 text-slate-600 hover:text-rose-600 transition-colors cursor-pointer border border-slate-200/80 hover:border-rose-200 shadow-xs"
          >
            <LogOut className="h-4 w-4" />
            {t('nav.logout')}
          </button>
        </div>
      </aside>

      {/* Mobile Top Header */}
      <header className="md:hidden sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-sky-100 px-4 py-3 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-xl bg-gradient-to-tr from-sky-500 to-blue-600 flex items-center justify-center text-white font-bold shadow-xs">
            <Landmark className="h-4.5 w-4.5" />
          </div>
          <div>
            <div className="font-bold text-sm leading-tight text-slate-900">{t('common.appName')}</div>
            <div className="text-[11px] text-sky-600 leading-tight">
              {customer?.fullName || user?.username}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <LanguageSwitcher />
          <NavLink
            to="/notifications"
            className="p-2 rounded-xl text-slate-500 hover:text-sky-600 hover:bg-sky-50 transition-colors"
            aria-label={t('nav.notifications')}
          >
            <Bell className="h-5 w-5" />
          </NavLink>
          <button
            onClick={handleLogout}
            className="p-2 rounded-xl text-slate-500 hover:text-rose-600 hover:bg-rose-50 cursor-pointer transition-colors"
            aria-label={t('nav.logout')}
          >
            <LogOut className="h-5 w-5" />
          </button>
        </div>
      </header>

      {/* Main Content Viewport */}
      <main className="flex-1 md:pl-64 pb-24 md:pb-10 bg-gradient-to-b from-[#f0f7ff]/50 via-slate-50/70 to-slate-50 min-h-screen">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          <Outlet />
        </div>
      </main>

      {/* Mobile Bottom Navigation Bar */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-white/95 backdrop-blur border-t border-sky-100 px-2 py-2 flex justify-around items-center text-slate-500 shadow-lg">
        {bottomNavItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center gap-1 px-2.5 py-1 rounded-xl text-[10px] font-semibold transition-colors ${
                isActive ? 'text-sky-600 font-bold' : 'text-slate-500 hover:text-slate-800'
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
