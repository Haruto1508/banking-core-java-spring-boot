import React, { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  ArrowLeftRight,
  Bell,
  ChevronDown,
  CreditCard,
  Home,
  LogOut,
  Menu,
  PlusCircle,
  QrCode,
  Radio,
  Search,
  User,
  X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { LanguageSwitcher } from './LanguageSwitcher';

export const CustomerLayout: React.FC = () => {
  const { user, customer, logout } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const menuItems = [
    { to: '/', label: t('nav.overview'), icon: Home, end: true },
    { to: '/notifications', label: t('nav.notifications'), icon: Bell, badge: '3' },
    { to: '/accounts', label: t('nav.accounts'), icon: CreditCard },
    { to: '/transfer', label: t('nav.transfer'), icon: ArrowLeftRight },
    { to: '/payments', label: t('nav.payments'), icon: QrCode },
    { to: '/sepay', label: t('nav.sepay'), icon: Radio },
  ];

  const configItems = [
    { to: '/profile', label: t('nav.profile'), icon: User },
  ];

  return (
    <div className="min-h-screen bg-[#f0f3fa] flex flex-col md:flex-row font-sans text-slate-800">
      {/* Desktop Sidebar - Pure Crisp White matching the reference image */}
      <aside className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 bg-white border-r border-slate-100 shadow-xs z-30">
        {/* Brand Header */}
        <div className="flex items-center gap-3 px-6 py-5">
          <div className="h-10 w-10 rounded-2xl bg-[#4361ee] text-white font-extrabold flex items-center justify-center text-lg shadow-md shadow-blue-500/25">
            .D
          </div>
          <div>
            <div className="font-extrabold text-sm text-slate-900 leading-tight">Dashboard</div>
            <div className="text-[11px] text-slate-400 font-semibold leading-tight">
              {customer?.fullName?.split(' ').slice(-1)[0] || 'Customer'}
            </div>
          </div>
        </div>

        {/* Project / Account Selector Pill Button */}
        <div className="px-5 mb-4">
          <div className="w-full bg-[#4361ee] hover:bg-[#3754e0] text-white rounded-xl py-2.5 px-3.5 text-xs font-bold flex items-center justify-between shadow-md shadow-blue-500/20 cursor-pointer transition-colors">
            <span className="truncate">
              {customer?.customerNumber ? `CIF: ${customer.customerNumber}` : 'Tài Khoản Cá Nhân'}
            </span>
            <ChevronDown className="h-4 w-4 shrink-0 text-white/80 ml-1" />
          </div>
        </div>

        {/* Navigation Categories */}
        <div className="flex-1 px-4 py-2 space-y-6 overflow-y-auto">
          {/* Menu Category */}
          <div>
            <div className="px-3 pb-2 text-[11px] font-bold text-slate-400">
              Menu
            </div>
            <nav className="space-y-1">
              {menuItems.map(({ to, label, icon: Icon, badge, end }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={end}
                  className={({ isActive }) =>
                    `flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                      isActive
                        ? 'bg-[#4361ee]/10 text-[#4361ee] font-bold'
                        : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                    }`
                  }
                >
                  <div className="flex items-center gap-3">
                    <Icon className="h-4.5 w-4.5 shrink-0" />
                    <span>{label}</span>
                  </div>
                  {badge && (
                    <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-[#4361ee] text-white shadow-xs">
                      {badge}
                    </span>
                  )}
                </NavLink>
              ))}
            </nav>
          </div>

          {/* Configuration Category */}
          <div>
            <div className="px-3 pb-2 text-[11px] font-bold text-slate-400">
              Configuration
            </div>
            <nav className="space-y-1">
              {configItems.map(({ to, label, icon: Icon }) => (
                <NavLink
                  key={to}
                  to={to}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                      isActive
                        ? 'bg-[#4361ee]/10 text-[#4361ee] font-bold'
                        : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                    }`
                  }
                >
                  <Icon className="h-4.5 w-4.5 shrink-0" />
                  <span>{label}</span>
                </NavLink>
              ))}
            </nav>
          </div>
        </div>

        {/* Bottom CTA Button: Cyan / Teal Pill */}
        <div className="p-4 border-t border-slate-100 space-y-3">
          <NavLink
            to="/transfer"
            className="w-full py-2.5 px-3 rounded-xl fintech-cyan-btn text-xs font-bold flex items-center justify-center gap-2 cursor-pointer"
          >
            <PlusCircle className="h-4 w-4" />
            <span>+ Tạo Giao Dịch</span>
          </NavLink>

          {/* Logout Button */}
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-medium text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
          >
            <LogOut className="h-4 w-4" />
            <span>{t('nav.logout')}</span>
          </button>
        </div>
      </aside>

      {/* Mobile Drawer Overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="relative w-72 bg-white h-full flex flex-col justify-between p-4 shadow-xl z-10 animate-in slide-in-from-left duration-200">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-xl bg-[#4361ee] text-white font-extrabold flex items-center justify-center text-sm shadow-md">
                    .D
                  </div>
                  <div>
                    <div className="font-extrabold text-xs text-slate-900">Dashboard</div>
                    <div className="text-[10px] text-slate-400 font-semibold">
                      {customer?.fullName || 'Customer'}
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="space-y-1">
                  <div className="px-3 pb-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Menu
                  </div>
                  {menuItems.map(({ to, label, icon: Icon, badge, end }) => (
                    <NavLink
                      key={to}
                      to={to}
                      end={end}
                      onClick={() => setMobileMenuOpen(false)}
                      className={({ isActive }) =>
                        `flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                          isActive
                            ? 'bg-[#4361ee]/10 text-[#4361ee] font-bold'
                            : 'text-slate-600 hover:bg-slate-50'
                        }`
                      }
                    >
                      <div className="flex items-center gap-3">
                        <Icon className="h-4.5 w-4.5 shrink-0" />
                        <span>{label}</span>
                      </div>
                      {badge && (
                        <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-[#4361ee] text-white">
                          {badge}
                        </span>
                      )}
                    </NavLink>
                  ))}
                </div>

                <div className="space-y-1 pt-2 border-t border-slate-100">
                  <div className="px-3 pb-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Configuration
                  </div>
                  {configItems.map(({ to, label, icon: Icon }) => (
                    <NavLink
                      key={to}
                      to={to}
                      onClick={() => setMobileMenuOpen(false)}
                      className={({ isActive }) =>
                        `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                          isActive
                            ? 'bg-[#4361ee]/10 text-[#4361ee] font-bold'
                            : 'text-slate-600 hover:bg-slate-50'
                        }`
                      }
                    >
                      <Icon className="h-4.5 w-4.5 shrink-0" />
                      <span>{label}</span>
                    </NavLink>
                  ))}
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 space-y-2">
              <NavLink
                to="/transfer"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full py-2.5 px-3 rounded-xl fintech-cyan-btn text-xs font-bold flex items-center justify-center gap-2 cursor-pointer"
              >
                <PlusCircle className="h-4 w-4" />
                <span>+ Tạo Giao Dịch</span>
              </NavLink>

              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-medium text-rose-600 hover:bg-rose-50 transition-colors"
              >
                <LogOut className="h-4 w-4" />
                <span>{t('nav.logout')}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Container */}
      <div className="flex-1 md:pl-64 flex flex-col min-h-screen">
        {/* Top Header matching reference image with Search Pill & Avatar */}
        <header className="sticky top-0 z-20 bg-white/90 backdrop-blur-md border-b border-slate-100/90 px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
          {/* Mobile hamburger button */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(true)}
            className="md:hidden p-2 rounded-xl text-slate-600 hover:bg-slate-100 cursor-pointer"
            aria-label="Open Navigation"
          >
            <Menu className="h-5 w-5" />
          </button>

          {/* Left: Search pill */}
          <div className="relative flex-1 max-w-sm">
            <input
              type="text"
              placeholder="Type in to search ..."
              className="w-full pl-9 pr-4 py-2 rounded-full bg-slate-100/80 text-xs text-slate-700 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#4361ee]/30 border border-transparent focus:border-[#4361ee]/40 transition-all"
            />
            <Search className="h-4 w-4 text-slate-400 absolute left-3 top-2.5" />
          </div>

          {/* Right Icons: Language, Notifications, Avatar */}
          <div className="flex items-center gap-2 sm:gap-3">
            <LanguageSwitcher />

            <NavLink
              to="/notifications"
              className="relative p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            >
              <Bell className="h-4.5 w-4.5" />
              <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-rose-500 ring-2 ring-white"></span>
            </NavLink>

            {/* User Avatar Circle */}
            <div className="flex items-center gap-2.5 pl-2 border-l border-slate-100">
              <div className="h-9 w-9 rounded-full bg-gradient-to-tr from-[#4361ee] to-[#7209b7] text-white font-bold text-xs flex items-center justify-center shadow-xs">
                {(customer?.fullName || user?.username || 'U').charAt(0).toUpperCase()}
              </div>
              <div className="hidden sm:block text-left">
                <div className="text-xs font-bold text-slate-800 leading-tight">
                  {customer?.fullName || user?.username}
                </div>
                <div className="text-[10px] text-slate-400 font-medium leading-tight">
                  Customer
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Viewport content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-7">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
