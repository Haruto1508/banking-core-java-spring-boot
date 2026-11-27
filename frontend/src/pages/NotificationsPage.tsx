import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
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

const EVENT_CONFIG: Record<string, { color: string; icon: typeof ArrowDownLeft; labelKey: string }> = {
  DEPOSIT: { color: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: ArrowDownLeft, labelKey: 'notifications.types.DEPOSIT' },
  WITHDRAWAL: { color: 'bg-rose-50 text-rose-700 border-rose-200', icon: ArrowUpRight, labelKey: 'notifications.types.WITHDRAWAL' },
  TRANSFER_DEBIT: { color: 'bg-rose-50 text-rose-700 border-rose-200', icon: ArrowUpRight, labelKey: 'notifications.types.TRANSFER_DEBIT' },
  TRANSFER_CREDIT: { color: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: ArrowDownLeft, labelKey: 'notifications.types.TRANSFER_CREDIT' },
  PAYMENT: { color: 'bg-amber-50 text-amber-700 border-amber-200', icon: TrendingDown, labelKey: 'notifications.types.PAYMENT' },
  SYSTEM: { color: 'bg-sky-50 text-sky-700 border-sky-200', icon: Bell, labelKey: 'notifications.types.SYSTEM' },
};

function getEventConfig(type: string) {
  for (const key of Object.keys(EVENT_CONFIG)) {
    if (type?.includes(key)) return EVENT_CONFIG[key];
  }
  return EVENT_CONFIG['SYSTEM'];
}

export const NotificationsPage: React.FC = () => {
  const { t } = useTranslation();
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

  const groupByDate = (notifs: NotificationRecord[]): Record<string, NotificationRecord[]> => {
    const groups: Record<string, NotificationRecord[]> = {};
    for (const item of notifs) {
      const d = new Date(item.createdAt);
      const today = new Date();
      const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);
      let key: string;
      if (d.toDateString() === today.toDateString()) key = t('notifications.today');
      else if (d.toDateString() === yesterday.toDateString()) key = t('notifications.yesterday');
      else key = d.toLocaleDateString(undefined, { day: '2-digit', month: '2-digit', year: 'numeric' });
      if (!groups[key]) groups[key] = [];
      groups[key].push(item);
    }
    return groups;
  };

  const groups = groupByDate(items);
  const unreadCount = items.filter(n => n.status === 'PENDING').length;

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 leading-tight">{t('notifications.title')}</h1>
          <p className="text-xs text-slate-500 mt-0.5">{t('notifications.desc')}</p>
        </div>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <span className="px-3 py-1 rounded-full bg-sky-50 border border-sky-200 text-sky-700 text-xs font-bold">
              {unreadCount} {t('notifications.unread')}
            </span>
          )}
          <button
            onClick={load}
            className="p-2.5 rounded-2xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 cursor-pointer transition-colors shadow-xs"
            title={t('common.refresh')}
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: t('notifications.total'), value: items.length, color: 'text-slate-900' },
          { label: t('notifications.unread'), value: unreadCount, color: 'text-sky-600' },
          { label: t('notifications.read'), value: items.length - unreadCount, color: 'text-slate-500' },
        ].map(({ label, value, color }) => (
          <div key={label} className="rounded-2xl bg-white border border-sky-100 p-3.5 text-center shadow-xs">
            <div className={`text-2xl font-black tabular-nums ${color}`}>{value}</div>
            <div className="text-[10px] text-slate-500 font-bold mt-0.5">{label}</div>
          </div>
        ))}
      </div>

      {/* Notification Groups */}
      <div className="space-y-5">
        {loading ? (
          <div className="bg-white border border-sky-100 rounded-3xl p-5 space-y-3 shadow-xs">
            {[0, 1, 2, 3].map(i => <div key={i} className="h-16 rounded-xl skeleton" />)}
          </div>
        ) : items.length === 0 ? (
          <div className="bg-white border border-sky-100 rounded-3xl p-16 text-center shadow-xs">
            <div className="h-14 w-14 rounded-2xl bg-sky-50 text-sky-500 flex items-center justify-center mx-auto mb-3">
              <Bell className="h-7 w-7" />
            </div>
            <p className="text-sm font-bold text-slate-700">{t('notifications.empty')}</p>
            <p className="text-xs text-slate-400 mt-1">{t('notifications.emptySub')}</p>
          </div>
        ) : (
          Object.entries(groups).map(([date, group]) => (
            <div key={date} className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-600">{date}</span>
                <div className="flex-1 h-px bg-slate-200" />
                <span className="text-[10px] text-slate-400">{group.length} {t('notifications.total').toLowerCase()}</span>
              </div>
              <div className="bg-white border border-sky-100 rounded-3xl divide-y divide-sky-50 overflow-hidden shadow-xs">
                {group.map((n) => {
                  const cfg = getEventConfig(n.eventType);
                  const EventIcon = cfg.icon;
                  const isUnread = n.status === 'PENDING';
                  return (
                    <div
                      key={n.id}
                      className={`flex items-start gap-3.5 p-4 sm:p-5 hover:bg-sky-50/40 transition-colors ${
                        isUnread ? 'border-l-4 border-sky-500 bg-sky-50/20' : ''
                      }`}
                    >
                      <div className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 border ${cfg.color}`}>
                        <EventIcon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <span className={`text-sm font-bold ${isUnread ? 'text-slate-900' : 'text-slate-700'}`}>
                            {n.subject}
                          </span>
                          <div className="flex items-center gap-1.5 shrink-0">
                            {isUnread && <span className="h-2 w-2 rounded-full bg-sky-500 animate-pulse" />}
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                              {n.status === 'PENDING' ? t('notifications.newBadge') : t(`status.${n.status}`)}
                            </span>
                          </div>
                        </div>
                        <p className="text-xs text-slate-600 mt-1 leading-relaxed">{n.content}</p>
                        <div className="flex items-center gap-2 mt-1.5">
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${cfg.color}`}>
                            {t(cfg.labelKey)}
                          </span>
                          <span className="text-[10px] text-slate-400">{formatDateTime(n.createdAt)}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>

      {items.length > 0 && (
        <div className="rounded-2xl bg-sky-50/80 border border-sky-200/80 p-4 flex items-center gap-3">
          <CheckCircle2 className="h-4 w-4 text-sky-600 shrink-0" />
          <p className="text-xs text-sky-800">{t('notifications.kafkaNotice')}</p>
        </div>
      )}
    </div>
  );
};
