import React, { useEffect, useState } from 'react';
import {
  ArrowDownLeft,
  ArrowUpRight,
  Bell,
  CheckCircle2,
  RefreshCw,
  TrendingDown,
} from 'lucide-react';
import { notificationApi } from '../api/bankingApi';
import type { NotificationRecord } from '../types/banking';
import { formatDateTime } from '../utils/format';

const EVENT_CONFIG: Record<string, { color: string; icon: typeof ArrowDownLeft; label: string }> = {
  DEPOSIT: { color: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20', icon: ArrowDownLeft, label: 'Tiền vào' },
  WITHDRAWAL: { color: 'bg-rose-500/15 text-rose-400 border-rose-500/20', icon: ArrowUpRight, label: 'Tiền ra' },
  TRANSFER_DEBIT: { color: 'bg-rose-500/15 text-rose-400 border-rose-500/20', icon: ArrowUpRight, label: 'Chuyển đi' },
  TRANSFER_CREDIT: { color: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20', icon: ArrowDownLeft, label: 'Nhận tiền' },
  PAYMENT: { color: 'bg-orange-500/15 text-orange-400 border-orange-500/20', icon: TrendingDown, label: 'Thanh toán' },
  SYSTEM: { color: 'bg-indigo-500/15 text-indigo-400 border-indigo-500/20', icon: Bell, label: 'Hệ thống' },
};

function getEventConfig(type: string) {
  for (const key of Object.keys(EVENT_CONFIG)) {
    if (type?.includes(key)) return EVENT_CONFIG[key];
  }
  return EVENT_CONFIG['SYSTEM'];
}

function groupByDate(items: NotificationRecord[]): Record<string, NotificationRecord[]> {
  const groups: Record<string, NotificationRecord[]> = {};
  for (const item of items) {
    const d = new Date(item.createdAt);
    const today = new Date();
    const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);
    let key: string;
    if (d.toDateString() === today.toDateString()) key = 'Hôm nay';
    else if (d.toDateString() === yesterday.toDateString()) key = 'Hôm qua';
    else key = d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
    if (!groups[key]) groups[key] = [];
    groups[key].push(item);
  }
  return groups;
}

export const NotificationsPage: React.FC = () => {
  const [items, setItems] = useState<NotificationRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const res = await notificationApi.getMyNotifications(0, 50);
      setItems(res.data.data.content);
    } catch { setItems([]); } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const groups = groupByDate(items);
  const unreadCount = items.filter(n => n.status === 'PENDING').length;

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-white">Thông báo</h1>
          <p className="text-xs text-slate-400 mt-0.5">Cảnh báo biến động số dư và sự kiện hệ thống theo thời gian thực</p>
        </div>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <span className="px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/20 text-emerald-400 text-xs font-bold">
              {unreadCount} chưa đọc
            </span>
          )}
          <button onClick={load} className="p-2.5 rounded-2xl bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-400 cursor-pointer transition-colors">
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Tổng thông báo', value: items.length, color: 'text-white' },
          { label: 'Chưa đọc', value: unreadCount, color: 'text-emerald-400' },
          { label: 'Đã đọc', value: items.length - unreadCount, color: 'text-slate-400' },
        ].map(({ label, value, color }) => (
          <div key={label} className="rounded-2xl bg-slate-900 border border-slate-800 p-3.5 text-center">
            <div className={`text-2xl font-black tabular-nums ${color}`}>{value}</div>
            <div className="text-[10px] text-slate-500 font-medium mt-0.5">{label}</div>
          </div>
        ))}
      </div>

      {/* Notification List */}
      <div className="space-y-5">
        {loading ? (
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 space-y-3">
            {[0, 1, 2, 3].map(i => <div key={i} className="h-16 rounded-xl skeleton" />)}
          </div>
        ) : items.length === 0 ? (
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-16 text-center">
            <div className="h-14 w-14 rounded-2xl bg-slate-800 flex items-center justify-center mx-auto mb-3">
              <Bell className="h-7 w-7 text-slate-600" />
            </div>
            <p className="text-sm text-slate-500">Bạn chưa có thông báo nào.</p>
            <p className="text-xs text-slate-600 mt-1">Thông báo sẽ xuất hiện khi có biến động tài khoản</p>
          </div>
        ) : Object.entries(groups).map(([date, group]) => (
          <div key={date} className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-400">{date}</span>
              <div className="flex-1 h-px bg-slate-800" />
              <span className="text-[10px] text-slate-600">{group.length} thông báo</span>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-3xl divide-y divide-slate-800/60 overflow-hidden">
              {group.map((n) => {
                const cfg = getEventConfig(n.eventType);
                const EventIcon = cfg.icon;
                const isUnread = n.status === 'PENDING';
                return (
                  <div key={n.id} className={`flex items-start gap-3.5 p-4 sm:p-5 hover:bg-slate-800/40 transition-colors ${isUnread ? 'border-l-2 border-emerald-500' : ''}`}>
                    <div className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 border ${cfg.color}`}>
                      <EventIcon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <span className={`text-sm font-semibold ${isUnread ? 'text-white' : 'text-slate-300'}`}>{n.subject}</span>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {isUnread && <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />}
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
                            {n.status === 'PENDING' ? 'Mới' : n.status}
                          </span>
                        </div>
                      </div>
                      <p className="text-xs text-slate-400 mt-1 leading-relaxed">{n.content}</p>
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${cfg.color}`}>{cfg.label}</span>
                        <span className="text-[10px] text-slate-600">{formatDateTime(n.createdAt)}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {items.length > 0 && (
        <div className="rounded-2xl bg-slate-900/50 border border-slate-800 p-4 flex items-center gap-3">
          <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
          <p className="text-xs text-slate-400">Tất cả thông báo được gửi qua hệ thống sự kiện Kafka real-time và lưu trữ trong 90 ngày.</p>
        </div>
      )}
    </div>
  );
};
