import React, { useEffect, useState } from 'react';
import { Bell, Mail } from 'lucide-react';
import { notificationApi } from '../api/bankingApi';
import type { NotificationRecord } from '../types/banking';
import { formatDateTime } from '../utils/format';

export const NotificationsPage: React.FC = () => {
  const [items, setItems] = useState<NotificationRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await notificationApi.getMyNotifications(0, 30);
        setItems(res.data.data.content);
      } catch {
        setItems([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Thông báo giao dịch</h1>
        <p className="text-xs sm:text-sm text-slate-500">
          Cảnh báo biến động số dư và sự kiện hệ thống theo thời gian thực
        </p>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 divide-y divide-slate-100 shadow-xs">
        {loading ? (
          <div className="p-8 text-center text-sm text-slate-400">Đang tải thông báo...</div>
        ) : items.length === 0 ? (
          <div className="p-10 text-center text-sm text-slate-500">
            <Bell className="h-8 w-8 text-slate-300 mx-auto mb-2" />
            Bạn chưa có thông báo nào.
          </div>
        ) : (
          items.map((n) => (
            <div key={n.id} className="p-4 sm:p-5 flex items-start gap-3.5">
              <div className="h-9 w-9 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                <Mail className="h-4.5 w-4.5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold text-slate-900">{n.subject}</span>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 shrink-0">
                    {n.status}
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-slate-600 mt-1">{n.content}</p>
                <div className="text-[11px] text-slate-400 mt-1.5">
                  {n.eventType} • {formatDateTime(n.createdAt)}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
