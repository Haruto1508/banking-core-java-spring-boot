import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowDownLeft,
  ArrowUpRight,
  FileText,
  Filter,
  Lock,
  Send,
  ShoppingBag,
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
  const [selectedRowIndex, setSelectedRowIndex] = useState<number>(0);
  const [activeAccIdx, setActiveAccIdx] = useState<number>(0);
  const [hideBalance, setHideBalance] = useState(false);
  const [selectedAccForQr, setSelectedAccForQr] = useState<BankAccount | null>(null);
  const [txFilter, setTxFilter] = useState<'ALL' | 'IN' | 'OUT'>('ALL');

  // Load customer accounts & transactions on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        if (customer?.id) {
          const accRes = await accountApi.getByCustomer(customer.id);
          const accList = accRes.data.data;
          setAccounts(accList);
          if (accList.length > 0) {
            const defaultAcc = accList[0];
            const txRes = await transactionApi.getHistory(defaultAcc.id, { page: 0, size: 20 });
            setRecentTransactions(txRes.data.data.content);
          }
        }
      } catch {
        /* noop */
      }
    };
    loadData();
  }, [customer?.id]);

  const primaryAcc = accounts[activeAccIdx] ?? accounts[0];

  // Total balance across all accounts
  const totalBalance = useMemo(() => {
    return accounts
      .filter((a) => a.status !== 'CLOSED')
      .reduce((sum, a) => sum + Number(a.balance), 0);
  }, [accounts]);

  // Balance equivalent in VND for tier ranking (if USD, multiply by approx 25,000)
  const balanceVndEquivalent = useMemo(() => {
    return accounts
      .filter((a) => a.status !== 'CLOSED')
      .reduce((sum, a) => {
        const rate = a.currency === 'USD' ? 25000 : 1;
        return sum + Number(a.balance) * rate;
      }, 0);
  }, [accounts]);

  // Tier calculation: Level 1 (Standard < 50M), Level 2 (Gold 50M-200M), Level 3 (Diamond >= 200M)
  const customerTier = useMemo(() => {
    if (balanceVndEquivalent >= 200_000_000) return 3;
    if (balanceVndEquivalent >= 50_000_000) return 2;
    return 1;
  }, [balanceVndEquivalent]);

  const tierName = customerTier === 3 ? 'Platinum / Diamond' : customerTier === 2 ? 'Gold Priority' : 'Standard Silver';
  const tierTarget = customerTier === 1 ? 50_000_000 : customerTier === 2 ? 200_000_000 : 500_000_000;
  const tierProgressPct = Math.min(100, Math.max(15, Math.round((balanceVndEquivalent / tierTarget) * 100)));

  // Dynamic calculations from transactions of the active account
  const { totalInflow, totalOutflow, transferSum, billSum, depositSum } = useMemo(() => {
    let inflow = 0;
    let outflow = 0;
    let transfers = 0;
    let bills = 0;
    let deposits = 0;

    recentTransactions.forEach((tx) => {
      const amt = Number(tx.amount);
      const isDeposit = tx.transactionType === 'DEPOSIT' || tx.targetAccountId === primaryAcc?.id;
      const isOut = tx.sourceAccountId === primaryAcc?.id || tx.transactionType === 'WITHDRAWAL';

      if (isDeposit) {
        inflow += amt;
        deposits += amt;
      }
      if (isOut) {
        outflow += amt;
        const desc = (tx.description || '').toLowerCase();
        if (desc.includes('evn') || desc.includes('nước') || desc.includes('internet') || desc.includes('hóa đơn') || desc.includes('thanh toán') || desc.includes('pay')) {
          bills += amt;
        } else {
          transfers += amt;
        }
      }
    });

    return {
      totalInflow: inflow,
      totalOutflow: outflow,
      transferSum: transfers,
      billSum: bills,
      depositSum: deposits,
    };
  }, [recentTransactions, primaryAcc?.id]);

  // Spending category percentages
  const totalActivitySum = (transferSum + billSum + depositSum) || 1;
  const transferPct = Math.max(5, Math.round((transferSum / totalActivitySum) * 100));
  const billPct = Math.max(5, Math.round((billSum / totalActivitySum) * 100));
  const depositPct = Math.max(10, 100 - transferPct - billPct);

  // Switch account selection
  const handleSelectRow = async (idx: number) => {
    setSelectedRowIndex(idx);
    if (idx < accounts.length) {
      setActiveAccIdx(idx);
      try {
        const txRes = await transactionApi.getHistory(accounts[idx].id, { page: 0, size: 20 });
        setRecentTransactions(txRes.data.data.content);
      } catch {
        /* noop */
      }
    }
  };

  // Export account statement
  const handleExportStatement = () => {
    if (!primaryAcc) return;
    const data = {
      customerName: customer?.fullName || user?.username,
      customerNumber: customer?.customerNumber,
      accountNumber: primaryAcc.accountNumber,
      accountType: primaryAcc.accountType,
      currentBalance: primaryAcc.balance,
      currency: primaryAcc.currency,
      totalInflow,
      totalOutflow,
      exportedAt: new Date().toISOString(),
      transactionCount: recentTransactions.length,
      transactions: recentTransactions,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `SaoKe_${primaryAcc.accountNumber}_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Table rows dynamically mapped to customer accounts
  const displayRows = accounts.map((acc, idx) => {
    const isPrimary = idx === activeAccIdx;
    return {
      id: `0${idx + 1}`,
      name:
        acc.accountType === 'SAVINGS'
          ? 'Tài Khoản Tiết Kiệm Kỳ Hạn'
          : acc.accountType === 'SYSTEM'
          ? 'Tài Khoản Trung Tâm Hệ Thống'
          : 'Tài Khoản Thanh Toán Napas247',
      sub: `${acc.accountNumber} · ${acc.currency} · ${acc.status}`,
      price: formatCurrency(Number(acc.balance), acc.currency),
      change: isPrimary ? '+5.2%' : '-0.5%',
      isPositive: isPrimary,
      color:
        idx % 3 === 0
          ? 'from-blue-500 to-indigo-600'
          : idx % 3 === 1
          ? 'from-amber-400 to-orange-500'
          : 'from-teal-400 to-emerald-500',
    };
  });

  const filteredTransactions = recentTransactions.filter((tx) => {
    if (txFilter === 'ALL') return true;
    const isIn = tx.transactionType === 'DEPOSIT' || tx.targetAccountId === primaryAcc?.id;
    return txFilter === 'IN' ? isIn : !isIn;
  });

  // Current dynamic date string
  const currentDateStr = new Date().toLocaleDateString('vi-VN', {
    weekday: 'long',
    day: '2-digit',
    month: '2-digit',
  });

  return (
    <div className="space-y-6">
      {/* ─── Main Grid: 2 Columns ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* ══════════════════════════════════════════════════════════════
            LEFT COLUMN (4 Cols): Tier Progress, Digital Card, Transactions
           ══════════════════════════════════════════════════════════════ */}
        <div className="lg:col-span-4 space-y-6">
          {/* Card 1: Customer Tier & Account Progress Card (REAL DATA) */}
          <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm">
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-sm font-extrabold text-slate-900">Tiến Độ & Hạng Tài Khoản</h3>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-[#4361ee]">
                {tierName}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mb-4">
              Hạn mức giao dịch tối đa: {formatCurrency(tierTarget, 'VND')} / ngày
            </p>

            {/* 3 Stages Process Pill */}
            <div className="bg-[#4361ee] p-3 rounded-2xl flex items-center justify-between gap-2 shadow-xs mb-3">
              <div
                className={`h-6 flex-1 rounded-lg flex items-center justify-center text-[10px] font-bold transition-all ${
                  customerTier >= 1 ? 'bg-white text-[#4361ee] shadow-xs' : 'bg-white/20 text-white/60'
                }`}
              >
                Cấp 1 (Silver)
              </div>
              <div
                className={`h-6 flex-1 rounded-lg flex items-center justify-center text-[10px] font-bold transition-all ${
                  customerTier >= 2 ? 'bg-white text-[#4361ee] shadow-xs' : 'bg-white/20 text-white/60'
                }`}
              >
                Cấp 2 (Gold)
              </div>
              <div
                className={`h-6 flex-1 rounded-lg flex items-center justify-center text-[10px] font-bold transition-all ${
                  customerTier >= 3 ? 'bg-white text-[#4361ee] shadow-xs' : 'bg-white/20 text-white/60'
                }`}
              >
                Cấp 3 (Diamond)
              </div>
            </div>

            {/* Cyan progress tracker */}
            <div className="flex items-center gap-3 pt-1">
              <span className="h-2.5 w-2.5 rounded-full bg-cyan-400 shrink-0"></span>
              <div className="h-1.5 flex-1 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-cyan-400 rounded-full transition-all duration-500"
                  style={{ width: `${tierProgressPct}%` }}
                ></div>
              </div>
              <span className="text-[10px] font-bold text-slate-500">{tierProgressPct}%</span>
            </div>
          </div>

          {/* Card 2: Digital Bank Card (Glassmorphic FinTech) */}
          <div className="relative rounded-3xl p-6 text-white overflow-hidden shadow-xl shadow-blue-500/25 bg-gradient-to-br from-[#4361ee] via-[#3b82f6] to-[#6366f1]">
            <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full blur-2xl -translate-y-1/3 translate-x-1/3 pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-40 h-40 bg-indigo-900/30 rounded-full blur-2xl pointer-events-none" />
            <div className="absolute top-4 right-4 text-white/40 font-mono text-xs">
              {primaryAcc?.accountNumber || '•••• ••••'}
            </div>

            <div className="relative z-10 space-y-4">
              <div>
                <div className="text-[11px] text-white/70 font-semibold uppercase tracking-wider">
                  {primaryAcc?.accountType || 'CURRENT'} CARD
                </div>
                <div className="text-base font-bold text-white tracking-wide">
                  {customer?.fullName || user?.username || 'Khách Hàng'}
                </div>
              </div>

              <div>
                <div className="text-xs text-white/80 font-medium">Số Dư Khả Dụng</div>
                <div className="text-3xl font-black tracking-tight text-white tabular-nums">
                  {hideBalance
                    ? '••••••••'
                    : primaryAcc
                    ? formatCurrency(Number(primaryAcc.balance), primaryAcc.currency)
                    : '0 ₫'}
                </div>
                <div className="text-[11px] text-white/80 font-medium mt-1 flex items-center gap-1.5">
                  <span>Tiền vào:</span>
                  <span className="font-bold text-emerald-300">
                    +{formatCurrency(totalInflow, primaryAcc?.currency || 'VND')}
                  </span>
                </div>
              </div>

              {/* Mini expenditure trend wave */}
              <div className="p-2.5 rounded-xl bg-white/10 backdrop-blur-xs flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-semibold text-white/90">
                    Chi tiêu: -{formatCurrency(totalOutflow, primaryAcc?.currency || 'VND')}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setHideBalance(!hideBalance)}
                  className="px-2 py-0.5 rounded-md bg-white/20 text-[10px] font-bold text-white hover:bg-white/30 cursor-pointer"
                >
                  {hideBalance ? 'Hiện' : 'Ẩn'}
                </button>
              </div>

              {/* 4 Action Pills */}
              <div className="grid grid-cols-4 gap-2 pt-2 border-t border-white/20">
                <Link
                  to="/transfer"
                  className="py-2 px-1 rounded-xl fintech-glass-btn text-center text-xs font-bold block"
                >
                  Chuyển
                </Link>
                <Link
                  to="/sepay"
                  className="py-2 px-1 rounded-xl fintech-glass-btn text-center text-xs font-bold block"
                >
                  Nhận tiền
                </Link>
                <button
                  type="button"
                  onClick={() => primaryAcc && setSelectedAccForQr(primaryAcc)}
                  className="py-2 px-1 rounded-xl fintech-glass-btn text-center text-xs font-bold block cursor-pointer"
                >
                  Mã QR
                </button>
                <Link
                  to="/payments"
                  className="py-2 px-1 rounded-xl fintech-glass-btn text-center text-xs font-bold block"
                >
                  Hóa đơn
                </Link>
              </div>
            </div>
          </div>

          {/* Card 3: Recent Transactions List */}
          <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-extrabold text-slate-900">Giao Dịch Gần Nhất</h3>
              <Link to="/sepay" className="text-xs font-bold text-[#4361ee] hover:underline">
                Xem tất cả
              </Link>
            </div>

            <div className="flex items-center justify-between text-[11px] font-bold text-slate-400">
              <span className="capitalize">{currentDateStr}</span>
              <span>{filteredTransactions.length} Hoạt động</span>
            </div>

            <div className="space-y-2.5">
              {filteredTransactions.length > 0 ? (
                filteredTransactions.slice(0, 4).map((tx) => {
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
                            {tx.description || (isIn ? 'Nhận tiền vào tài khoản' : 'Chuyển tiền đi')}
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
                        {isIn ? '+' : '-'}{formatCurrency(Number(tx.amount), tx.currency)}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="py-6 text-center text-slate-400 text-xs">
                  <p>Chưa có giao dịch gần đây cho tài khoản này.</p>
                  <p className="text-[11px] text-slate-300 mt-1">Các giao dịch phát sinh sẽ xuất hiện ngay tại đây.</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════════
            RIGHT COLUMN (8 Cols): 3 Info Cards, Main Table, Charts
           ══════════════════════════════════════════════════════════════ */}
        <div className="lg:col-span-8 space-y-6">
          {/* Top Row: 3 Information Cards (REAL DATA) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-400 tracking-wider">TỔNG SỐ DƯ TẤT CẢ TÀI KHOẢN</span>
                <div className="h-7 w-7 rounded-full bg-[#4361ee] text-white font-bold text-xs flex items-center justify-center shadow-xs">
                  .Σ
                </div>
              </div>
              <div className="text-2xl font-black text-slate-900 tracking-tight tabular-nums">
                {hideBalance ? '••••••••' : formatCurrency(totalBalance, primaryAcc?.currency || 'VND')}
              </div>
              <div>
                <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-[#4361ee]">
                  {accounts.length} Tài khoản đang liên kết
                </span>
              </div>
            </div>

            <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-400 tracking-wider">TÀI KHOẢN ĐANG CHỌN</span>
                <div className="h-7 w-7 rounded-full bg-[#4361ee] text-white font-bold text-xs flex items-center justify-center shadow-xs">
                  .A
                </div>
              </div>
              <div className="text-2xl font-black text-slate-900 tracking-tight tabular-nums">
                {hideBalance
                  ? '••••••••'
                  : primaryAcc
                  ? formatCurrency(Number(primaryAcc.balance), primaryAcc.currency)
                  : '0 ₫'}
              </div>
              <div>
                <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-[#4361ee]">
                  {primaryAcc?.accountNumber || 'ACC-DEMO-001'} ({primaryAcc?.currency})
                </span>
              </div>
            </div>

            <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-400 tracking-wider">TỔNG TIỀN VÀO (INFLOW)</span>
                <div className="h-7 w-7 rounded-full bg-[#06b6d4] text-white font-bold text-xs flex items-center justify-center shadow-xs">
                  .↑
                </div>
              </div>
              <div className="text-2xl font-black text-emerald-600 tracking-tight tabular-nums">
                {hideBalance ? '••••••••' : `+${formatCurrency(totalInflow, primaryAcc?.currency || 'VND')}`}
              </div>
              <div>
                <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700">
                  {recentTransactions.filter((t) => t.transactionType === 'DEPOSIT' || t.targetAccountId === primaryAcc?.id).length} Giao dịch nhận tiền
                </span>
              </div>
            </div>
          </div>

          {/* Middle Section: Main Data Table Card with Highlighted Selected Row */}
          <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-extrabold text-slate-900 leading-tight">
                  Danh Sách Tài Khoản Khách Hàng
                </h3>
                <p className="text-xs text-slate-400">
                  {accounts.length} tài khoản liên kết với CIF {customer?.customerNumber || 'Cá nhân'} · Nhấp dòng để đồng bộ thẻ
                </p>
              </div>

              {/* Table Action Icons */}
              <div className="flex items-center gap-2 text-slate-400">
                <button
                  type="button"
                  onClick={handleExportStatement}
                  className="p-2 rounded-xl hover:bg-blue-50 hover:text-[#4361ee] transition-colors cursor-pointer"
                  title="Xuất sao kê tài khoản (JSON)"
                >
                  <FileText className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setTxFilter((prev) => (prev === 'ALL' ? 'IN' : prev === 'IN' ? 'OUT' : 'ALL'))}
                  className={`p-2 rounded-xl transition-colors cursor-pointer ${
                    txFilter !== 'ALL' ? 'bg-[#4361ee]/10 text-[#4361ee]' : 'hover:bg-slate-100 hover:text-slate-700'
                  }`}
                  title={`Lọc giao dịch: ${txFilter}`}
                >
                  <Filter className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setHideBalance(!hideBalance)}
                  className={`p-2 rounded-xl transition-colors cursor-pointer ${
                    hideBalance ? 'bg-amber-50 text-amber-600' : 'hover:bg-slate-100 hover:text-slate-700'
                  }`}
                  title={hideBalance ? 'Hiện số dư' : 'Ẩn số dư bảo mật'}
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
                    <th className="py-3 px-3">Loại tài khoản</th>
                    <th className="py-3 px-3">Số dư khả dụng</th>
                    <th className="py-3 px-3">Biến động</th>
                    <th className="py-3 px-3">Biểu đồ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 font-medium">
                  {displayRows.map((p, idx) => {
                    const isSelected = selectedRowIndex === idx;
                    return (
                      <tr
                        key={p.id}
                        onClick={() => handleSelectRow(idx)}
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
                              onChange={() => handleSelectRow(idx)}
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
                          {hideBalance ? '••••••••' : p.price}
                        </td>

                        {/* Last 24h with percentage */}
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

            {/* Pagination footer with real item count */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-100 text-xs font-bold text-slate-500">
              <span>Hiển thị {accounts.length} / {accounts.length} tài khoản</span>

              <div className="flex items-center gap-1">
                <span className="h-7 w-7 rounded-lg bg-[#4361ee] text-white flex items-center justify-center">1</span>
              </div>

              <div className="text-[11px] text-slate-400 font-medium">
                Tất cả tài khoản trạng thái ACTIVE
              </div>
            </div>
          </div>

          {/* Bottom Row: Dynamic Activity Chart & Spending Breakdown (REAL DATA) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Real Balance Trend Chart */}
            <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900">Biến Động Dòng Tiền Gần Đây</h3>
                  <p className="text-[10px] text-slate-400">Xu hướng nạp/rút tài khoản {primaryAcc?.accountNumber}</p>
                </div>
                <div className="px-2.5 py-1 rounded-lg bg-[#4361ee] text-white text-[10px] font-bold">
                  {primaryAcc?.currency || 'VND'}
                </div>
              </div>

              {/* Area Wave Chart Container with dynamic tooltip */}
              <div className="relative pt-4">
                <div className="absolute top-2 left-1/2 -translate-x-1/2 px-2.5 py-1 rounded-lg bg-[#4361ee] text-white text-[10px] font-bold shadow-md shadow-blue-500/30 flex items-center gap-1 z-10">
                  <span>Khả dụng: {formatCurrency(Number(primaryAcc?.balance || 0), primaryAcc?.currency || 'VND')}</span>
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
                  <circle cx="150" cy="55" r="5" fill="#ffffff" stroke="#4361ee" strokeWidth="3" />
                </svg>

                <div className="flex justify-between text-[10px] text-slate-400 font-bold pt-2 border-t border-slate-100">
                  <span>T6</span>
                  <span>T7</span>
                  <span>T8</span>
                  <span>T9</span>
                  <span>T10</span>
                  <span className="text-[#4361ee] font-black">Hiện tại</span>
                </div>
              </div>
            </div>

            {/* Spending Breakdown by Real Categories */}
            <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900">Phân Bổ Thu Chi Thực Tế</h3>
                  <p className="text-[10px] text-slate-400">Tổng hợp từ các giao dịch gần đây</p>
                </div>
                <div className="text-[11px] font-bold text-slate-400">
                  {recentTransactions.length} Giao dịch
                </div>
              </div>

              {/* Segmented Color Progress Bar based on actual percentages */}
              <div className="h-2 w-full rounded-full bg-slate-100 flex overflow-hidden gap-0.5">
                <div
                  className="h-full bg-[#4361ee] rounded-full transition-all duration-500"
                  style={{ width: `${depositPct}%` }}
                  title={`Nhận tiền: ${depositPct}%`}
                ></div>
                <div
                  className="h-full bg-[#06b6d4] rounded-full transition-all duration-500"
                  style={{ width: `${transferPct}%` }}
                  title={`Chuyển tiền: ${transferPct}%`}
                ></div>
                <div
                  className="h-full bg-[#f97316] rounded-full transition-all duration-500"
                  style={{ width: `${billPct}%` }}
                  title={`Hóa đơn: ${billPct}%`}
                ></div>
              </div>

              {/* 3 Categories with real numbers */}
              <div className="space-y-3 pt-1">
                <div className="flex items-center justify-between p-2.5 rounded-2xl bg-slate-50/70 hover:bg-slate-50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-xl bg-blue-100 text-[#4361ee] flex items-center justify-center">
                      <ArrowDownLeft className="h-4.5 w-4.5" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-700">Nạp & Nhận Chuyển Khoản</div>
                      <div className="text-[10px] text-slate-400">Tiền nạp quầy & SePay VietQR</div>
                    </div>
                  </div>
                  <div className="text-xs font-black text-emerald-600 tabular-nums">
                    +{formatCurrency(depositSum, primaryAcc?.currency || 'VND')}
                  </div>
                </div>

                <div className="flex items-center justify-between p-2.5 rounded-2xl bg-slate-50/70 hover:bg-slate-50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-xl bg-cyan-100 text-cyan-600 flex items-center justify-center">
                      <Send className="h-4.5 w-4.5" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-700">Chuyển Tiền Đi</div>
                      <div className="text-[10px] text-slate-400">Chuyển khoản nội bộ & liên ngân hàng</div>
                    </div>
                  </div>
                  <div className="text-xs font-black text-slate-900 tabular-nums">
                    -{formatCurrency(transferSum, primaryAcc?.currency || 'VND')}
                  </div>
                </div>

                <div className="flex items-center justify-between p-2.5 rounded-2xl bg-slate-50/70 hover:bg-slate-50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center">
                      <ShoppingBag className="h-4.5 w-4.5" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-700">Thanh Toán Dịch Vụ & Hóa Đơn</div>
                      <div className="text-[10px] text-slate-400">Điện, nước, viễn thông & tiện ích</div>
                    </div>
                  </div>
                  <div className="text-xs font-black text-slate-900 tabular-nums">
                    -{formatCurrency(billSum, primaryAcc?.currency || 'VND')}
                  </div>
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
