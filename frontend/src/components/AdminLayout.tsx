import React from 'react';
import { NavLink, Outlet, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Activity,
  FileText,
  LogOut,
  PlusCircle,
  RotateCcw,
  Scale,
  ShieldAlert,
  Vault,
  Wallet,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { LanguageSwitcher } from './LanguageSwitcher';

export const AdminLayout: React.FC = () => {
  const { user, logout } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const currentTab = searchParams.get('tab') || 'overview';

  const adminNavItems = [
    { tab: 'overview', to: '/admin', label: t('admin.tabOverview'), icon: Activity },
    { tab: 'allocate', to: '/admin?tab=allocate', label: t('admin.tabAllocate'), icon: PlusCircle },
    { tab: 'accounts', to: '/admin?tab=accounts', label: t('admin.tabAccounts'), icon: Wallet },
    { tab: 'reversal', to: '/admin?tab=reversal', label: t('admin.tabReversal'), icon: RotateCcw },
    { tab: 'audit', to: '/admin?tab=audit', label: t('admin.tabAudit'), icon: FileText },
    { tab: 'reconcile', to: '/admin?tab=reconcile', label: t('admin.tabReconcile'), icon: Scale },
    { tab: 'vaults', to: '/admin?tab=vaults', label: t('admin.tabVaults'), icon: Vault },
  ];

  return (
    <div className="min-h-screen bg-slate-900/5 flex flex-col md:flex-row font-sans text-slate-900">
      {/* Desktop Sidebar - Dark Slate & Rose Accent specifically for Admin */}
      <aside className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 bg-slate-900 text-white border-r border-slate-800 shadow-xl z-20">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-gradient-to-tr from-rose-500 to-indigo-600 text-white font-bold shadow-md shadow-rose-500/30 flex items-center justify-center">
              <ShieldAlert className="h-5 w-5" />
            </div>
            <div>
              <div className="font-extrabold tracking-tight text-base text-white">NovaBank Admin</div>
              <div className="text-[11px] text-rose-400 font-semibold uppercase tracking-wider">
                System Control Portal
              </div>
            </div>
          </div>
        </div>

        {/* Cluster Status & Language */}
        <div className="px-4 py-2.5 border-b border-slate-800 flex items-center justify-between bg-slate-950/40">
          <div className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-400">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>Cluster 5/5 UP</span>
          </div>
          <LanguageSwitcher />
        </div>

        {/* Exclusive Admin Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          <div className="px-3 pb-2 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
            Chức Năng Quản Trị Viên
          </div>
          {adminNavItems.map(({ tab, to, label, icon: Icon }) => {
            const isActive = location.pathname === '/admin' && currentTab === tab;
            return (
              <NavLink
                key={tab}
                to={to}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-xs font-semibold transition-all ${
                  isActive
                    ? 'bg-rose-600 text-white font-bold shadow-md shadow-rose-600/30 border border-rose-500'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <Icon className="h-4.5 w-4.5 shrink-0" />
                <span>{label}</span>
              </NavLink>
            );
          })}
        </nav>

        {/* Admin Profile & Logout */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/60">
          <div className="flex items-center justify-between gap-2 mb-3">
            <div className="min-w-0">
              <div className="text-xs font-bold text-white truncate">{user?.username}</div>
              <div className="text-[11px] text-slate-400 truncate mt-0.5 flex items-center gap-1.5">
                <span className="px-1.5 py-0.5 rounded-md font-bold text-[9px] uppercase bg-rose-500/20 text-rose-300 border border-rose-500/30">
                  ADMINISTRATOR
                </span>
                <span className="font-mono text-[10px] text-slate-500">• ROOT</span>
              </div>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-rose-600/20 text-slate-300 hover:text-rose-400 border border-slate-700/60 hover:border-rose-500/40 transition-colors cursor-pointer shadow-xs"
          >
            <LogOut className="h-4 w-4" />
            {t('nav.logout')}
          </button>
        </div>
      </aside>

      {/* Mobile Top Header for Admin */}
      <header className="md:hidden sticky top-0 z-30 bg-slate-900 border-b border-slate-800 px-4 py-3 flex items-center justify-between text-white shadow-md">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-xl bg-gradient-to-tr from-rose-500 to-indigo-600 flex items-center justify-center text-white font-bold shadow-xs">
            <ShieldAlert className="h-4.5 w-4.5" />
          </div>
          <div>
            <div className="font-bold text-sm leading-tight text-white">NovaBank Admin</div>
            <div className="text-[11px] text-rose-400 leading-tight">Admin: {user?.username}</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <LanguageSwitcher />
          <button
            onClick={handleLogout}
            className="p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-slate-800 cursor-pointer transition-colors"
            aria-label={t('nav.logout')}
          >
            <LogOut className="h-5 w-5" />
          </button>
        </div>
      </header>

      {/* Main Content Viewport */}
      <main className="flex-1 md:pl-64 pb-20 md:pb-10 bg-gradient-to-b from-slate-100/90 via-slate-50 to-white min-h-screen">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          <Outlet />
        </div>
      </main>

      {/* Mobile Bottom Navigation Bar for Admin */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-slate-900/95 backdrop-blur border-t border-slate-800 px-2 py-2 flex justify-around items-center text-slate-400 shadow-xl">
        {adminNavItems.slice(0, 5).map(({ tab, to, label, icon: Icon }) => {
          const isActive = location.pathname === '/admin' && currentTab === tab;
          return (
            <NavLink
              key={tab}
              to={to}
              className={`flex flex-col items-center justify-center gap-1 px-2 py-1 rounded-xl text-[10px] font-semibold transition-colors ${
                isActive ? 'text-rose-400 font-bold' : 'text-slate-400 hover:text-white'
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
