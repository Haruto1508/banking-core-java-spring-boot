import React, { useEffect, useState } from 'react';
import {
  CheckCircle2,
  CreditCard,
  Edit3,
  Mail,
  Phone,
  Shield,
  User,
  UserCheck,
} from 'lucide-react';
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
    setError(null); setSuccessMsg(null); setSubmitting(true);
    try {
      if (customer) {
        await customerApi.update(customer.id, { fullName: fullName.trim(), phoneNumber: phoneNumber.trim(), email: email.trim() });
        setSuccessMsg('Cập nhật thông tin khách hàng thành công.');
      } else {
        await customerApi.create({ fullName: fullName.trim(), identityNumber: identityNumber.trim(), phoneNumber: phoneNumber.trim(), email: email.trim() });
        setSuccessMsg('Tạo hồ sơ khách hàng (CIF) thành công! Bạn đã có thể mở tài khoản ngân hàng.');
      }
      await refreshCustomer();
    } catch (err) { setError(extractErrorMessage(err)); } finally { setSubmitting(false); }
  };

  const initials = (customer?.fullName || user?.username || 'U').split(' ').slice(-2).map(w => w[0]?.toUpperCase()).join('');

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-extrabold text-white">Hồ sơ khách hàng (CIF)</h1>
        <p className="text-xs text-slate-400 mt-0.5">
          {customer ? `Mã khách hàng: ${customer.customerNumber} · Trạng thái: ${customer.status}` : 'Hoàn tất thông tin định danh cá nhân để kích hoạt dịch vụ ngân hàng'}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        {/* Left: Identity Card */}
        <div className="lg:col-span-2 space-y-4">
          {/* Avatar Card */}
          <div className="relative bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950 border border-slate-800 rounded-3xl p-6 overflow-hidden card-glow">
            <div className="absolute top-0 right-0 w-40 h-40 bg-emerald-500/8 rounded-full blur-3xl -translate-y-1/3 translate-x-1/3 pointer-events-none" />
            <div className="relative z-10 flex flex-col items-center text-center">
              <div className="h-20 w-20 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-400 flex items-center justify-center text-slate-950 font-black text-2xl shadow-lg shadow-emerald-500/20 mb-4">
                {initials}
              </div>
              <h2 className="text-base font-bold text-white leading-tight">{customer?.fullName || user?.username}</h2>
              <p className="text-xs text-slate-400 mt-1">{user?.role} · {user?.username}</p>
              {customer && (
                <span className={`mt-3 px-3 py-1 rounded-full text-[11px] font-bold border ${
                  customer.status === 'ACTIVE' ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20' :
                  customer.status === 'SUSPENDED' ? 'bg-amber-500/15 text-amber-400 border-amber-500/20' :
                  'bg-slate-700 text-slate-400 border-slate-600'
                }`}>
                  {customer.status === 'ACTIVE' ? '✓ Đã xác minh KYC' : customer.status}
                </span>
              )}
            </div>
          </div>

          {/* Info Summary */}
          {customer && (
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 space-y-3">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Thông tin nhanh</h3>
              {[
                { icon: User, label: 'CIF', value: customer.customerNumber },
                { icon: CreditCard, label: 'CCCD', value: customer.identityNumber },
                { icon: Phone, label: 'SĐT', value: customer.phoneNumber },
                { icon: Mail, label: 'Email', value: customer.email },
              ].map(({ icon: Icon, label, value }) => (
                <div key={label} className="flex items-center gap-3">
                  <div className="h-7 w-7 rounded-lg bg-slate-800 flex items-center justify-center shrink-0">
                    <Icon className="h-3.5 w-3.5 text-slate-400" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-[10px] text-slate-500">{label}</div>
                    <div className="text-xs font-semibold text-slate-200 truncate">{value || '—'}</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Security Badge */}
          <div className="bg-gradient-to-br from-indigo-900/60 to-slate-900 border border-indigo-800/30 rounded-3xl p-4 flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-indigo-500/15 flex items-center justify-center shrink-0">
              <Shield className="h-4.5 w-4.5 text-indigo-400" />
            </div>
            <div>
              <div className="text-xs font-bold text-white">Bảo mật tài khoản</div>
              <div className="text-[10px] text-indigo-300 mt-0.5">JWT + Refresh Token Rotation · BCrypt mật khẩu</div>
            </div>
          </div>
        </div>

        {/* Right: Edit Form */}
        <div className="lg:col-span-3 bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6">
          <div className="flex items-center gap-2 mb-5">
            <div className="h-8 w-8 rounded-xl bg-emerald-500/15 flex items-center justify-center">
              <Edit3 className="h-4 w-4 text-emerald-400" />
            </div>
            <h2 className="text-sm font-bold text-white">{customer ? 'Cập nhật thông tin' : 'Tạo hồ sơ khách hàng (KYC)'}</h2>
          </div>

          {!customer && (
            <div className="mb-5 rounded-2xl bg-amber-500/8 border border-amber-500/20 p-4 text-xs text-amber-400">
              <strong>Bước quan trọng:</strong> Điền đầy đủ thông tin định danh để kích hoạt dịch vụ ngân hàng (mở tài khoản, nhận VietQR, chuyển tiền).
            </div>
          )}

          {error && <div className="mb-4 rounded-xl bg-rose-500/10 border border-rose-500/20 px-4 py-3 text-xs text-rose-400">{error}</div>}
          {successMsg && (
            <div className="mb-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 px-4 py-3 text-xs text-emerald-400 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {[
              { label: 'Họ và tên đầy đủ', value: fullName, onChange: setFullName, placeholder: 'Nguyễn Văn A', type: 'text', disabled: false, required: true },
              { label: 'Số CCCD / Hộ chiếu', value: identityNumber, onChange: setIdentityNumber, placeholder: '079099001234', type: 'text', disabled: !!customer, required: !customer },
              { label: 'Số điện thoại', value: phoneNumber, onChange: setPhoneNumber, placeholder: '0901234567', type: 'tel', disabled: false, required: true },
              { label: 'Email liên hệ', value: email, onChange: setEmail, placeholder: 'email@domain.com', type: 'email', disabled: false, required: true },
            ].map(({ label, value, onChange, placeholder, type, disabled, required }) => (
              <div key={label}>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">{label}</label>
                <input type={type} required={required} disabled={disabled} value={value}
                  onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed" />
                {disabled && <p className="mt-1 text-[10px] text-slate-600">Không thể chỉnh sửa sau khi đã xác minh KYC</p>}
              </div>
            ))}

            <button type="submit" disabled={submitting}
              className="w-full py-3.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 text-sm font-bold inline-flex items-center justify-center gap-2 cursor-pointer transition-colors shadow-lg shadow-emerald-500/20">
              <UserCheck className="h-4 w-4" />
              {submitting ? 'Đang lưu...' : customer ? 'Cập nhật hồ sơ' : 'Xác nhận tạo hồ sơ CIF'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
