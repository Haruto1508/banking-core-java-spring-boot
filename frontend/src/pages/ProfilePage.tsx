import React, { useEffect, useState } from 'react';
import { CheckCircle2, UserCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { customerApi } from '../api/bankingApi';
import { extractErrorMessage } from '../api/client';

export const ProfilePage: React.FC = () => {
  const { user, customer, refreshCustomer } = useAuth();

  const [fullName, setFullName] = useState('');
  const [identityNumber, setIdentityNumber] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (customer) {
      setFullName(customer.fullName);
      setIdentityNumber(customer.identityNumber);
      setPhoneNumber(customer.phoneNumber);
      setEmail(customer.email);
    } else if (user) {
      setEmail(user.email);
    }
  }, [customer, user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    setSubmitting(true);
    try {
      if (customer) {
        await customerApi.update(customer.id, {
          fullName: fullName.trim(),
          phoneNumber: phoneNumber.trim(),
          email: email.trim(),
        });
        setSuccessMsg('Cập nhật thông tin khách hàng thành công.');
      } else {
        await customerApi.create({
          fullName: fullName.trim(),
          identityNumber: identityNumber.trim(),
          phoneNumber: phoneNumber.trim(),
          email: email.trim(),
        });
        setSuccessMsg('Tạo hồ sơ khách hàng (CIF) thành công! Bạn đã có thể mở tài khoản ngân hàng.');
      }
      await refreshCustomer();
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto space-y-5">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Hồ sơ khách hàng (CIF)</h1>
        <p className="text-xs sm:text-sm text-slate-500">
          {customer
            ? `Mã khách hàng: ${customer.customerNumber} • Trạng thái: ${customer.status}`
            : 'Hoàn tất thông tin định danh cá nhân để kích hoạt dịch vụ ngân hàng'}
        </p>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-7 shadow-xs">
        {error && (
          <div className="mb-4 rounded-xl bg-rose-50 border border-rose-200 px-4 py-3 text-xs sm:text-sm text-rose-700">
            {error}
          </div>
        )}
        {successMsg && (
          <div className="mb-4 rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3 text-xs sm:text-sm text-emerald-700 flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">Họ và tên</label>
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Nguyễn Văn A"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">Số CCCD / Hộ chiếu</label>
            <input
              type="text"
              required
              disabled={!!customer}
              value={identityNumber}
              onChange={(e) => setIdentityNumber(e.target.value)}
              placeholder="079099001234"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm disabled:bg-slate-100 disabled:text-slate-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">Số điện thoại</label>
            <input
              type="tel"
              required
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder="0901234567"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">Email liên hệ</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@domain.com"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white text-sm font-semibold inline-flex items-center justify-center gap-2 cursor-pointer"
          >
            <UserCheck className="h-4 w-4" />
            <span>
              {submitting ? 'Đang lưu...' : customer ? 'Cập nhật hồ sơ' : 'Xác nhận tạo hồ sơ CIF'}
            </span>
          </button>
        </form>
      </div>
    </div>
  );
};
