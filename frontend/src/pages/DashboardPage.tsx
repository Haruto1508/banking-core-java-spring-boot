import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowDownLeft,
  ArrowUpRight,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  FileText,
  Filter,
  Lock,
  MoreHorizontal,
  Send,
  ShoppingBag,
  Tv,
  Utensils,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { accountApi, transactionApi } from '../api/bankingApi';
import type { BankAccount, TransactionRecord } from '../types/banking';
import { formatCurrency, formatDateTime } from '../utils/format';
import { VietQRModal } from '../components/VietQRModal';

export const DashboardPage: React.FC = () => {
  const { user, customer } = useAuth();

  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [recentTransactions, setRecentTransactions] = useState<TransactionRecord[]>([]);
  const [selectedRowIndex, setSelectedRowIndex] = useState<number>(1);
  const [hideBalance, setHideBalance] = useState(false);
  const [selectedAccForQr, setSelectedAccForQr] = useState<BankAccount | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        if (customer?.id) {
          const accRes = await accountApi.getByCustomer(customer.id);
          const accList = accRes.data.data;
          setAccounts(accList);
          if (accList.length > 0) {
            const txRes = await transactionApi.getHistory(accList[0].id, { page: 0, size: 8 });
            setRecentTransactions(txRes.data.data.content);
          }
        }
      } catch {
        /* noop */
      }
    };
    loadData();
  }, [customer?.id]);

  const primaryAcc = accounts[0];

  // Mock table products aligned with the screenshot
  const tableProducts = [
    {
      id: '01',
      name: 'Napas247 Current Account',
      sub: accounts[0]?.accountNumber || 'ACC-DEMO-001 · Primary Account',
      price: accounts[0] ? formatCurrency(Number(accounts[0].balance), accounts[0].currency) : '$19,000.89',
      change: '-4.2%',
      isPositive: false,
      color: 'from-amber-400 to-orange-500',
    },
    {
      id: '02',
      name: 'Vault Gold Savings',
      sub: 'ACC-SAVINGS-002 · Định kỳ 12 tháng',
      price: '$7,500.98',
      change: '-0.3%',
      isPositive: false,
      color: 'from-blue-500 to-indigo-600',
    },
    {
      id: '03',
      name: 'SePay VietQR Hub Account',
      sub: 'ACC-SEPAY-003 · Thanh toán Napas tự động',
      price: '$3,010.50',
      change: '-11.1%',
      isPositive: false,
      color: 'from-teal-400 to-emerald-500',
    },
    {
      id: '04',
      name: 'Visa Signature Credit',
      sub: 'Hạn mức chi tiêu tín dụng 50.000.000 ₫',
      price: '$6,310.11',
      change: '+3.6%',
      isPositive: true,
      color: 'from-sky-400 to-blue-500',
    },
  ];

  return (
    <div className="space-y-6">
      {/* ─── Main Grid: 2 Columns matching the reference screenshot ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* ══════════════════════════════════════════════════════════════
            LEFT COLUMN (4 Cols): Progress, Digital Card, Transactions
           ══════════════════════════════════════════════════════════════ */}
        <div className="lg:col-span-4 space-y-6">
          {/* Card 1: Data Company Progress Card */}
          <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm">
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-sm font-extrabold text-slate-900">Data Company Progress</h3>
              <button type="button" className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <MoreHorizontal className="h-4 w-4" />
              </button>
            </div>
            <p className="text-[11px] text-slate-400 mb-4">
              Hạn mức thẻ & tiến độ tài khoản ngân hàng
            </p>

            {/* 3 Stages Process Pill */}
            <div className="bg-[#4361ee] p-3 rounded-2xl flex items-center justify-between gap-2 shadow-xs mb-3">
              <div className="h-6 w-16 bg-white/20 rounded-lg flex items-center justify-center text-[10px] text-white font-bold">
                Level 1
              </div>
              <div className="h-6 w-16 bg-white/30 rounded-lg flex items-center justify-center text-[10px] text-white font-bold">
                Level 2
              </div>
              <div className="h-6 w-16 bg-white/20 rounded-lg flex items-center justify-center text-[10px] text-white font-bold">
                Level 3
              </div>
            </div>

            {/* Cyan progress tracker */}
            <div className="flex items-center gap-3 pt-1">
              <span className="h-2.5 w-2.5 rounded-full bg-cyan-400 shrink-0"></span>
              <div className="h-1.5 flex-1 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-cyan-400 w-3/4 rounded-full"></div>
              </div>
              <span className="h-2 w-2 rounded-full bg-cyan-400 shrink-0"></span>
            </div>
          </div>

          {/* Card 2: Digital Bank Card (Glassmorphic FinTech) */}
          <div className="relative rounded-3xl p-6 text-white overflow-hidden shadow-xl shadow-blue-500/25 bg-gradient-to-br from-[#4361ee] via-[#3b82f6] to-[#6366f1]">
            {/* Background geometric decorative circles */}
            <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full blur-2xl -translate-y-1/3 translate-x-1/3 pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-40 h-40 bg-indigo-900/30 rounded-full blur-2xl pointer-events-none" />
            <div className="absolute top-4 right-4 text-white/20 font-mono text-xs">
              •••• ••••
            </div>

            <div className="relative z-10 space-y-4">
              <div>
                <div className="text-[11px] text-white/70 font-semibold uppercase tracking-wider">
                  Platinum Card
                </div>
                <div className="text-base font-bold text-white tracking-wide">
                  {customer?.fullName || user?.username || 'John James Doe'}
                </div>
              </div>

              <div>
                <div className="text-xs text-white/80 font-medium">Available Balance</div>
                <div className="text-3xl font-black tracking-tight text-white tabular-nums">
                  {hideBalance
                    ? '••••••••'
                    : primaryAcc
                    ? formatCurrency(Number(primaryAcc.balance), primaryAcc.currency)
                    : '$16,750.00'}
                </div>
                <div className="text-[11px] text-white/70 font-medium mt-0.5">
                  Revenue <span className="font-bold text-emerald-300">+15%</span> from last week
                </div>
              </div>

              {/* Mini expenditure trend wave */}
              <div className="p-2.5 rounded-xl bg-white/10 backdrop-blur-xs flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <svg className="w-16 h-5 text-emerald-300 stroke-current fill-none" viewBox="0 0 100 30">
                    <path d="M0,25 Q25,5 50,20 T100,5" strokeWidth="3" strokeLinecap="round" />
                  </svg>
                  <span className="text-[11px] font-semibold text-white/90">Expenditure +6.2%</span>
                </div>
                <button
                  type="button"
                  onClick={() => setHideBalance(!hideBalance)}
                  className="px-2 py-0.5 rounded-md bg-white/20 text-[10px] font-bold text-white hover:bg-white/30 cursor-pointer"
                >
                  {hideBalance ? 'Show' : 'Hide'}
                </button>
              </div>

              {/* 4 Glassmorphism Action Pills matching screenshot: Send, Request, Create QR, More */}
              <div className="grid grid-cols-4 gap-2 pt-2 border-t border-white/20">
                <Link
                  to="/transfer"
                  className="py-2 px-1 rounded-xl fintech-glass-btn text-center text-xs font-bold block"
                >
                  Send
                </Link>
                <Link
                  to="/sepay"
                  className="py-2 px-1 rounded-xl fintech-glass-btn text-center text-xs font-bold block"
                >
                  Request
                </Link>
                <button
                  type="button"
                  onClick={() => primaryAcc && setSelectedAccForQr(primaryAcc)}
                  className="py-2 px-1 rounded-xl fintech-glass-btn text-center text-xs font-bold block cursor-pointer"
                >
                  Create QR
                </button>
                <Link
                  to="/payments"
                  className="py-2 px-1 rounded-xl fintech-glass-btn text-center text-xs font-bold block"
                >
                  More
                </Link>
              </div>
            </div>
          </div>

          {/* Card 3: Recent Transactions List matching screenshot */}
          <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-extrabold text-slate-900">Recent Transactions</h3>
              <Link to="/sepay" className="text-xs font-bold text-[#4361ee] hover:underline">
                See All
              </Link>
            </div>

            <div className="flex items-center justify-between text-[11px] font-bold text-slate-400">
              <span>Monday</span>
              <span>{recentTransactions.length > 0 ? `${recentTransactions.length} Activity` : '4 Activity'}</span>
            </div>

            <div className="space-y-2.5">
              {recentTransactions.length > 0 ? (
                recentTransactions.slice(0, 4).map((tx) => {
                  const isIn = tx.transactionType === 'DEPOSIT' || tx.targetAccountId === primaryAcc?.id;
                  return (
                    <div
                      key={tx.id}
                      className="p-3 rounded-2xl bg-slate-50/70 hover:bg-slate-50 flex items-center justify-between transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 ${
                            isIn ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-200 text-slate-600'
                          }`}
                        >
                          {isIn ? <ArrowDownLeft className="h-4.5 w-4.5" /> : <ArrowUpRight className="h-4.5 w-4.5" />}
                        </div>
                        <div>
                          <div className="text-xs font-bold text-slate-800 truncate max-w-[140px]">
                            {tx.description || (isIn ? 'Receive Money' : 'Send Money')}
                          </div>
                          <div className="text-[10px] text-slate-400 font-medium">
                            {formatDateTime(tx.createdAt)}
                          </div>
                        </div>
                      </div>
                      <div
                        className={`text-xs font-black tabular-nums ${
                          isIn ? 'text-emerald-600' : 'text-slate-900'
                        }`}
                      >
                        {isIn ? '+' : '-'}${Number(tx.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </div>
                    </div>
                  );
                })
              ) : (
                <>
                  <div className="p-3 rounded-2xl bg-slate-50/70 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-xl bg-slate-200 text-slate-600 flex items-center justify-center">
                        <Send className="h-4 w-4" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-800">Send Money</div>
                        <div className="text-[10px] text-slate-400">Daniel Harrison</div>
                      </div>
                    </div>
                    <div className="text-xs font-black text-slate-900 tabular-nums">-$300.00</div>
                  </div>

                  <div className="p-3 rounded-2xl bg-slate-50/70 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
                        <ArrowDownLeft className="h-4 w-4" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-800">Receive Money</div>
                        <div className="text-[10px] text-slate-400">Isabella Anderson</div>
                      </div>
                    </div>
                    <div className="text-xs font-black text-emerald-600 tabular-nums">+$500.00</div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════════
            RIGHT COLUMN (8 Cols): 3 Info Cards, Main Table, Charts
           ══════════════════════════════════════════════════════════════ */}
        <div className="lg:col-span-8 space-y-6">
          {/* Top Row: 3 Information Cards matching reference image */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              {
                title: 'INFORMATION A',
                value: '$1,234.00',
                badge: '350 Document',
                color: 'bg-[#4361ee]',
              },
              {
                title: 'INFORMATION B',
                value: '$2,345.00',
                badge: '350 Document',
                color: 'bg-[#4361ee]',
              },
              {
                title: 'INFORMATION C',
                value: '$3,456.00',
                badge: '350 Document',
                color: 'bg-[#06b6d4]',
              },
            ].map(({ title, value, badge, color }) => (
              <div
                key={title}
                className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-400 tracking-wider">
                    {title}
                  </span>
                  <div
                    className={`h-7 w-7 rounded-full ${color} text-white font-bold text-xs flex items-center justify-center shadow-xs`}
                  >
                    .B
                  </div>
                </div>

                <div className="text-2xl font-black text-slate-900 tracking-tight tabular-nums">
                  {value}
                </div>

                <div>
                  <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-[#4361ee]">
                    {badge}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Middle Section: Main Data Table Card with Highlighted Selected Row */}
          <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-extrabold text-slate-900 leading-tight">
                  Data Company Progress
                </h3>
                <p className="text-xs text-slate-400">Lorem ipsum dolor sit amet</p>
              </div>

              {/* Table Action Icons */}
              <div className="flex items-center gap-2 text-slate-400">
                <button
                  type="button"
                  className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
                  title="Document"
                >
                  <FileText className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
                  title="Filter"
                >
                  <Filter className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
                  title="Lock"
                >
                  <Lock className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto -mx-2">
              <table className="w-full text-left text-xs min-w-[550px]">
                <thead>
                  <tr className="text-slate-400 text-[11px] font-bold border-b border-slate-100">
                    <th className="py-3 px-3">No.</th>
                    <th className="py-3 px-3">Name</th>
                    <th className="py-3 px-3">Current price</th>
                    <th className="py-3 px-3">Last 24h</th>
                    <th className="py-3 px-3">7 days period</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 font-medium">
                  {tableProducts.map((p, idx) => {
                    const isSelected = selectedRowIndex === idx;
                    return (
                      <tr
                        key={p.id}
                        onClick={() => setSelectedRowIndex(idx)}
                        className={`cursor-pointer transition-all ${
                          isSelected
                            ? 'bg-[#4361ee] text-white shadow-md shadow-blue-500/25 rounded-2xl'
                            : 'hover:bg-slate-50/80 text-slate-700'
                        }`}
                      >
                        {/* No. with checkbox */}
                        <td className="py-3.5 px-3">
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => setSelectedRowIndex(idx)}
                              className="rounded border-slate-300 text-[#4361ee] focus:ring-[#4361ee]"
                            />
                            <span className={isSelected ? 'text-white font-bold' : 'text-slate-400'}>
                              {p.id}
                            </span>
                          </div>
                        </td>

                        {/* Name with squircle icon */}
                        <td className="py-3.5 px-3">
                          <div className="flex items-center gap-3">
                            <div
                              className={`h-9 w-9 rounded-xl bg-gradient-to-tr ${p.color} text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs`}
                            >
                              .P
                            </div>
                            <div>
                              <div className={`font-bold leading-tight ${isSelected ? 'text-white' : 'text-slate-900'}`}>
                                {p.name}
                              </div>
                              <div className={`text-[10px] ${isSelected ? 'text-white/80' : 'text-slate-400'}`}>
                                {p.sub}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Current price */}
                        <td className="py-3.5 px-3 font-bold tabular-nums">
                          {p.price}
                        </td>

                        {/* Last 24h with percentage and mini trend */}
                        <td className="py-3.5 px-3 tabular-nums font-bold">
                          <div className="flex items-center gap-1.5">
                            {p.isPositive ? (
                              <span className={isSelected ? 'text-emerald-200' : 'text-emerald-500'}>
                                {p.change}
                              </span>
                            ) : (
                              <span className={isSelected ? 'text-rose-200' : 'text-rose-500'}>
                                {p.change}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* 7 days period SVG sparkline */}
                        <td className="py-3.5 px-3">
                          <svg
                            className={`w-24 h-6 ${
                              isSelected
                                ? 'stroke-white fill-none'
                                : p.isPositive
                                ? 'stroke-emerald-500 fill-none'
                                : 'stroke-rose-400 fill-none'
                            }`}
                            viewBox="0 0 100 25"
                          >
                            <path
                              d={
                                p.isPositive
                                  ? 'M0,20 Q25,15 50,8 T100,2'
                                  : 'M0,5 Q25,8 50,18 T100,22'
                              }
                              strokeWidth="2"
                              strokeLinecap="round"
                            />
                          </svg>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination footer matching screenshot */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-100 text-xs font-bold text-slate-500">
              <button
                type="button"
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors cursor-pointer"
              >
                <ChevronLeft className="h-4 w-4" />
                <span>Previous</span>
              </button>

              <div className="flex items-center gap-1">
                <span className="h-7 w-7 rounded-lg bg-[#4361ee] text-white flex items-center justify-center">1</span>
                <span className="h-7 w-7 rounded-lg hover:bg-slate-100 flex items-center justify-center cursor-pointer">2</span>
                <span className="h-7 w-7 rounded-lg hover:bg-slate-100 flex items-center justify-center cursor-pointer">3</span>
                <span className="px-1 text-slate-300">...</span>
                <span className="h-7 w-7 rounded-lg hover:bg-slate-100 flex items-center justify-center cursor-pointer">8</span>
                <span className="h-7 w-7 rounded-lg hover:bg-slate-100 flex items-center justify-center cursor-pointer">9</span>
                <span className="h-7 w-7 rounded-lg hover:bg-slate-100 flex items-center justify-center cursor-pointer">10</span>
              </div>

              <button
                type="button"
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors cursor-pointer"
              >
                <span>Next</span>
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Bottom Row: Monthly Investment Chart & Company Spending Breakdown */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Monthly Investment (Wavy Area Chart) */}
            <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900">Monthly Investment</h3>
                </div>
                <div className="px-2.5 py-1 rounded-lg bg-[#4361ee] text-white text-[10px] font-bold">
                  Month
                </div>
              </div>

              {/* Area Wave Chart Container */}
              <div className="relative pt-4">
                {/* Floating tooltip pill like in screenshot: 18th Mar */}
                <div className="absolute top-2 left-1/2 -translate-x-1/2 px-2.5 py-1 rounded-lg bg-[#4361ee] text-white text-[10px] font-bold shadow-md shadow-blue-500/30 flex items-center gap-1 z-10">
                  <span>18th Mar</span>
                </div>

                <svg className="w-full h-32" viewBox="0 0 300 120" preserveAspectRatio="none">
                  <defs>
                    <linearGradient id="waveGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#4361ee" stopOpacity="0.25" />
                      <stop offset="100%" stopColor="#4361ee" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>
                  <path
                    d="M0,100 Q40,30 90,80 T180,40 T260,70 T300,50 L300,120 L0,120 Z"
                    fill="url(#waveGradient)"
                  />
                  <path
                    d="M0,100 Q40,30 90,80 T180,40 T260,70 T300,50"
                    fill="none"
                    stroke="#4361ee"
                    strokeWidth="3"
                    strokeLinecap="round"
                  />
                  {/* Pin Circle */}
                  <circle cx="150" cy="55" r="5" fill="#ffffff" stroke="#4361ee" strokeWidth="3" />
                </svg>

                <div className="flex justify-between text-[10px] text-slate-400 font-bold pt-2 border-t border-slate-100">
                  <span>Jan</span>
                  <span>Feb</span>
                  <span className="text-[#4361ee] font-black">Mar</span>
                  <span>Apr</span>
                  <span>May</span>
                  <span>Jun</span>
                </div>
              </div>
            </div>

            {/* Company Spending Breakdown */}
            <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900">Company spending</h3>
                  <p className="text-[10px] text-slate-400">Lorem ipsum dolor sit amet</p>
                </div>
                <div className="flex items-center gap-1 text-[11px] font-bold text-slate-400 cursor-pointer">
                  <span>Most Recent</span>
                  <ChevronDown className="h-3.5 w-3.5" />
                </div>
              </div>

              {/* Segmented Color Progress Bar matching screenshot */}
              <div className="h-2 w-full rounded-full bg-slate-100 flex overflow-hidden gap-0.5">
                <div className="h-full bg-[#4361ee] w-1/2 rounded-full"></div>
                <div className="h-full bg-[#06b6d4] w-1/4 rounded-full"></div>
                <div className="h-full bg-[#f97316] w-1/4 rounded-full"></div>
              </div>

              {/* 3 Categories: Entertainment, Shopping, Dining */}
              <div className="space-y-3 pt-1">
                <div className="flex items-center justify-between p-2.5 rounded-2xl bg-slate-50/70 hover:bg-slate-50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-xl bg-blue-100 text-[#4361ee] flex items-center justify-center">
                      <Tv className="h-4.5 w-4.5" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-700">Entertainment</div>
                      <div className="text-[10px] text-slate-400">Xem phim & Truyền hình</div>
                    </div>
                  </div>
                  <div className="text-xs font-black text-slate-900 tabular-nums">$816.00</div>
                </div>

                <div className="flex items-center justify-between p-2.5 rounded-2xl bg-slate-50/70 hover:bg-slate-50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center">
                      <ShoppingBag className="h-4.5 w-4.5" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-700">Shopping</div>
                      <div className="text-[10px] text-slate-400">Mua sắm trực tuyến</div>
                    </div>
                  </div>
                  <div className="text-xs font-black text-slate-900 tabular-nums">$590.00</div>
                </div>

                <div className="flex items-center justify-between p-2.5 rounded-2xl bg-slate-50/70 hover:bg-slate-50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-xl bg-cyan-100 text-cyan-600 flex items-center justify-center">
                      <Utensils className="h-4.5 w-4.5" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-700">Dining</div>
                      <div className="text-[10px] text-slate-400">Nhà hàng & Ẩm thực</div>
                    </div>
                  </div>
                  <div className="text-xs font-black text-slate-900 tabular-nums">$352.24</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* VietQR Modal */}
      {selectedAccForQr && (
        <VietQRModal
          isOpen={!!selectedAccForQr}
          onClose={() => setSelectedAccForQr(null)}
          accountNumber={selectedAccForQr.accountNumber}
          accountHolderName={customer?.fullName || user?.username || 'CHU TAI KHOAN'}
          bankName="MBBank (MB)"
        />
      )}
    </div>
  );
};
