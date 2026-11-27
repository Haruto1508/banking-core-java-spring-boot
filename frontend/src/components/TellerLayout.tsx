import React from 'react';
import { NavLink, Outlet, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  ArrowDownLeft,
  ArrowLeftRight,
  ArrowUpRight,
  LogOut,
  PlusCircle,
  QrCode,
  Receipt,
  Store,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { LanguageSwitcher } from './LanguageSwitcher';

export const TellerLayout: React.FC = () => {
  const { user, logout } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const currentTab = searchParams.get('tab') || 'pos';

  const tellerNavItems = [
    { tab: 'pos', to: '/teller', label: t('seller.tabDirectPOS'), icon: QrCode },
    { tab: 'deposit', to: '/teller?tab=deposit', label: t('seller.tabDirectDeposit'), icon: ArrowDownLeft },
    { tab: 'withdraw', to: '/teller?tab=withdraw', label: t('seller.tabDirectWithdraw'), icon: ArrowUpRight },
    { tab: 'transfer', to: '/teller?tab=transfer', label: 'Chuyển tiền tại quầy', icon: ArrowLeftRight },
    { tab: 'openAccount', to: '/teller?tab=openAccount', label: t('seller.tabDirectOpen'), icon: PlusCircle },
    { tab: 'history', to: '/teller?tab=history', label: t('seller.tabDirectHistory'), icon: Receipt },
  ];

  return (
    <div className="min-h-screen bg-emerald-950/5 flex flex-col md:flex-row font-sans text-slate-900">
      {/* Desktop Sidebar - Emerald & Teal specifically for Teller/Seller Desk */}
      <aside className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 bg-white border-r border-emerald-100 shadow-sm z-20">
        <div className="flex items-center justify-between px-5 py-4 border-b border-emerald-100">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-600 text-white font-bold shadow-md shadow-emerald-500/20 flex items-center justify-center">
              <Store className="h-5 w-5" />
            </div>
            <div>
              <div className="font-extrabold tracking-tight text-base text-slate-900">NovaBank Desk</div>
              <div className="text-[11px] text-emerald-600 font-semibold uppercase tracking-wider">
                Quầy Giao Dịch & POS
              </div>
            </div>
          </div>
        </div>

        {/* Shift Drawer Status & Language */}
        <div className="px-4 py-2.5 border-b border-emerald-50 flex items-center justify-between bg-emerald-50/50">
          <div className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-700">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>Ca trực hoạt động</span>
          </div>
          <LanguageSwitcher />
        </div>

        {/* Exclusive Teller Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          <div className="px-3 pb-2 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
            Nghiệp Vụ Quầy & Thu Ngân
          </div>
          {tellerNavItems.map(({ tab, to, label, icon: Icon }) => {
            const isActive = location.pathname === '/teller' && currentTab === tab;
            return (
              <NavLink
                key={tab}
                to={to}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-xs font-semibold transition-all ${
                  isActive
                    ? 'bg-emerald-50 text-emerald-800 font-bold shadow-xs border border-emerald-200'
                    : 'text-slate-600 hover:bg-emerald-50/60 hover:text-emerald-700'
                }`}
              >
                <Icon className="h-4.5 w-4.5 shrink-0" />
                <span>{label}</span>
              </NavLink>
            );
          })}
        </nav>

        {/* Teller User Card & Logout */}
        <div className="p-4 border-t border-emerald-100 bg-emerald-50/30">
          <div className="flex items-center justify-between gap-2 mb-3">
            <div className="min-w-0">
              <div className="text-xs font-bold text-slate-800 truncate">{user?.username}</div>
              <div className="text-[11px] text-slate-500 truncate mt-0.5 flex items-center gap-1.5">
                <span className="px-1.5 py-0.5 rounded-md font-bold text-[9px] uppercase bg-emerald-100 text-emerald-800 border border-emerald-200">
                  TELLER / STAFF
                </span>
                <span className="font-mono text-[10px] text-slate-400">• BÀN QUẦY</span>
              </div>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold bg-white hover:bg-rose-50 text-slate-600 hover:text-rose-600 border border-slate-200 hover:border-rose-200 transition-colors cursor-pointer shadow-2xs"
          >
            <LogOut className="h-4 w-4" />
            {t('nav.logout')}
          </button>
        </div>
      </aside>

      {/* Mobile Top Header for Teller */}
      <header className="md:hidden sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-emerald-100 px-4 py-3 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-600 flex items-center justify-center text-white font-bold shadow-xs">
            <Store className="h-4.5 w-4.5" />
          </div>
          <div>
            <div className="font-bold text-sm leading-tight text-slate-900">NovaBank Desk</div>
            <div className="text-[11px] text-emerald-600 leading-tight">Teller: {user?.username}</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <LanguageSwitcher />
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
      <main className="flex-1 md:pl-64 pb-20 md:pb-10 bg-gradient-to-b from-[#f0fbf7]/60 via-slate-50/70 to-slate-50 min-h-screen">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          <Outlet />
        </div>
      </main>

      {/* Mobile Bottom Navigation Bar for Teller */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-white/95 backdrop-blur border-t border-emerald-100 px-2 py-2 flex justify-around items-center text-slate-500 shadow-lg">
        {tellerNavItems.slice(0, 5).map(({ tab, to, label, icon: Icon }) => {
          const isActive = location.pathname === '/teller' && currentTab === tab;
          return (
            <NavLink
              key={tab}
              to={to}
              className={`flex flex-col items-center justify-center gap-1 px-2 py-1 rounded-xl text-[10px] font-semibold transition-colors ${
                isActive ? 'text-emerald-600 font-bold' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Icon className="h-4.5 w-4.5" />
              <span>{label.split(' ')[0]}</span>
            </NavLink>
          );
        })}
      </nav>
    </div>
  );
};
