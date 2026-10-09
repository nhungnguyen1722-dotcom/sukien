'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  User,
  Phone,
  Lock,
  Eye,
  EyeOff,
  UserPlus,
  CheckCircle2,
  Calendar,
  Search,
  Info,
  Check,
} from 'lucide-react';
import { getValidReferralCode, safeDecodeURI } from '@/lib/authUtils';

export interface ProxyEventInfo {
  id: number;
  name: string;
  code?: string | null;
  location?: string | null;
  event_date?: string | null;
}

interface CustomerItem {
  id: number;
  name: string;
  phone: string;
}

const INITIAL_CUSTOMERS: CustomerItem[] = [
  { id: 1, name: 'Nguyễn Văn A', phone: '0912 345 671' },
  { id: 2, name: 'Trần Thị Bình', phone: '0987 654 321' },
  { id: 3, name: 'Lê Văn Cường', phone: '0965 432 100' },
  { id: 4, name: 'Phạm Thị Dung', phone: '0903 876 543' },
  { id: 5, name: 'Vũ Thị Giang', phone: '0972 111 222' },
];

interface GuestProxyRegistrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  event: ProxyEventInfo | null;
  onSuccess?: () => void;
}

export default function GuestProxyRegistrationModal({
  isOpen,
  onClose,
  event,
  onSuccess,
}: GuestProxyRegistrationModalProps) {
  // Step 1: Login (if not logged in)
  // Step 2: Proxy Registration
  // Step 3: Success
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);

  // Auth state
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userName, setUserName] = useState('');
  const [userPhone, setUserPhone] = useState('');
  const [userId, setUserId] = useState<string | null>(null);
  const [userRefCode, setUserRefCode] = useState('');
  const [userBusinessUnit, setUserBusinessUnit] = useState<'Ban Nguồn Vốn' | 'Khối Kinh doanh'>('Khối Kinh doanh');

  // Login form state (Step 1)
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmittingLogin, setIsSubmittingLogin] = useState(false);

  // Step 2 form state
  const [guestName, setGuestName] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [customerSearch, setCustomerSearch] = useState('');
  const [selectedCustomerIds, setSelectedCustomerIds] = useState<Set<number>>(new Set());
  const [customerList, setCustomerList] = useState<CustomerItem[]>(INITIAL_CUSTOMERS);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [registeredCount, setRegisteredCount] = useState(0);

  // Check login cookies on open
  useEffect(() => {
    if (!isOpen) return;

    try {
      const getCookie = (name: string) => {
        const match = document.cookie.match(new RegExp('(^|;\\s*)(' + name + ')=([^;]*)'));
        return match ? safeDecodeURI(match[3]) : null;
      };

      const cName = getCookie('user_name') || localStorage.getItem('nghieng_user_name');
      const cEmail = getCookie('user_email') || localStorage.getItem('nghieng_user_email');
      const cRole = getCookie('user_role') || localStorage.getItem('nghieng_auth_role');
      const cPhone = getCookie('user_phone') || localStorage.getItem('nghieng_user_phone');
      const cId = getCookie('user_id') || localStorage.getItem('nghieng_user_id');
      const cUnit = getCookie('user_business_unit') || localStorage.getItem('nghieng_user_business_unit');
      const cRef = getValidReferralCode(
        localStorage.getItem('nghieng_user_ref_code'),
        localStorage.getItem('ref_code'),
        getCookie('user_ref_code'),
        getCookie('ref_code'),
        getCookie('user_ref')
      );

      if (cUnit) {
        setUserBusinessUnit(cUnit.toLowerCase().includes('vốn') ? 'Ban Nguồn Vốn' : 'Khối Kinh doanh');
      }

      if (cName && cRole && cRole.toLowerCase() !== 'guest' && cRef) {
        setIsLoggedIn(true);
        setUserName(cName);
        if (cPhone) setUserPhone(cPhone);
        if (cId) setUserId(cId);
        setUserRefCode(cRef);
        setCurrentStep(2);

        // Fetch user info to ensure exact business_unit
        const queryTerm = cPhone || cRef || (cId ? String(cId) : '');
        if (queryTerm) {
          fetch(`/api/users/search?q=${encodeURIComponent(queryTerm)}`)
            .then((r) => r.json())
            .then((d) => {
              if (d.results && d.results.length > 0) {
                const u = d.results[0];
                if (u.business_unit) {
                  const norm = u.business_unit.toLowerCase().includes('vốn') ? 'Ban Nguồn Vốn' : 'Khối Kinh doanh';
                  setUserBusinessUnit(norm);
                  localStorage.setItem('nghieng_user_business_unit', norm);
                }
              }
            })
            .catch(() => {});
        }
      } else {
        setIsLoggedIn(false);
        setCurrentStep(1);
        setUserName('');
        setUserPhone('');
        setUserId(null);
        setUserRefCode('');
        setUserBusinessUnit('Khối Kinh doanh');
        setLoginUsername(cEmail || (cName?.includes('@') ? cName : ''));
      }
    } catch {
      setIsLoggedIn(false);
      setCurrentStep(1);
    }
  }, [isOpen]);

  if (!isOpen || !event) return null;

  // Step 1: Submit Login
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginUsername.trim()) {
      setErrorMsg('Vui lòng nhập email hoặc số điện thoại');
      return;
    }
    if (!loginPassword.trim()) {
      setErrorMsg('Vui lòng nhập mật khẩu');
      return;
    }
    setErrorMsg(null);
    setIsSubmittingLogin(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginUsername.trim(), password: loginPassword }),
      });
      const data = await response.json();
      if (!response.ok || !data.success || !data.user) {
        setErrorMsg(data.error || 'Thông tin đăng nhập không chính xác');
        return;
      }

      const user = data.user;
      const role = data.role || user.role || 'Thành viên';
      const refCode = user.ref_code || data.ref_code || (user.id ? `N_${String(user.id).padStart(10, '0')}` : '');
      if (!refCode || /^EVT\d+/i.test(refCode)) {
        setErrorMsg('Tài khoản chưa có mã giới thiệu hợp lệ. Vui lòng liên hệ quản trị viên.');
        return;
      }

      const name = user.full_name || loginUsername.trim();
      setUserName(name);
      setUserPhone(user.phone || '');
      setUserId(user.id ? String(user.id) : null);
      setUserRefCode(refCode);

      const rawBu = user.business_unit || data.business_unit;
      const normBu = (rawBu && String(rawBu).toLowerCase().includes('vốn')) ? 'Ban Nguồn Vốn' : 'Khối Kinh doanh';
      setUserBusinessUnit(normBu);
      localStorage.setItem('nghieng_user_business_unit', normBu);

      setIsLoggedIn(true);
      setCurrentStep(2);
      setLoginPassword('');

      localStorage.setItem('nghieng_auth_role', role);
      localStorage.setItem('nghieng_user_name', name);
      localStorage.setItem('nghieng_user_phone', user.phone || '');
      localStorage.setItem('nghieng_user_email', user.email || '');
      localStorage.setItem('nghieng_user_ref_code', refCode);
      localStorage.setItem('ref_code', refCode);
      if (user.id) localStorage.setItem('nghieng_user_id', String(user.id));
      window.dispatchEvent(new Event('nghieng-auth-change'));
    } catch {
      setErrorMsg('Không thể kết nối máy chủ');
    } finally {
      setIsSubmittingLogin(false);
    }
  };

  // Step 2: Filter customers
  const filteredCustomers = customerList.filter(
    (c) =>
      c.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
      c.phone.includes(customerSearch)
  );

  // Toggle customer selection (multi-select)
  const handleSelectCustomer = (c: CustomerItem) => {
    setSelectedCustomerIds(prev => {
      const next = new Set(prev);
      if (next.has(c.id)) {
        next.delete(c.id);
      } else {
        next.add(c.id);
      }
      return next;
    });
    setGuestName(c.name);
    setGuestPhone(c.phone);
    setErrorMsg(null);
  };

  // Add new customer to table and auto-select
  const handleAddNewCustomer = () => {
    if (!guestName.trim()) {
      setErrorMsg('Vui lòng nhập họ và tên khách trước khi thêm');
      return;
    }
    if (!guestPhone.trim()) {
      setErrorMsg('Vui lòng nhập số điện thoại khách trước khi thêm');
      return;
    }
    setErrorMsg(null);

    const newId = Date.now();
    const newCust: CustomerItem = {
      id: newId,
      name: guestName.trim(),
      phone: guestPhone.trim(),
    };
    setCustomerList([newCust, ...customerList]);
    setSelectedCustomerIds(prev => new Set(prev).add(newId));
    // Clear inputs for next person
    setGuestName('');
    setGuestPhone('');
  };

  // Submit proxy registration for ALL selected customers
  const handleConfirmRegistration = async () => {
    // Gather selected customers
    const selectedGuests = customerList.filter(c => selectedCustomerIds.has(c.id));

    if (selectedGuests.length === 0) {
      setErrorMsg('Vui lòng chọn ít nhất 1 khách từ danh sách hoặc thêm khách mới');
      return;
    }
    setErrorMsg(null);
    setIsSubmitting(true);

    let successCount = 0;
    const errors: string[] = [];

    try {
      for (const guest of selectedGuests) {
        try {
          const res = await fetch('/api/admin/le-tan', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              event_id: event.id,
              guest_name: guest.name.trim(),
              guest_phone: guest.phone.trim(),
              source: 'Đăng ký hộ',
              referrer_id: userId ? parseInt(userId, 10) : undefined,
              referrer_name: userName,
              referrer_phone: userPhone || userRefCode,
              referrer_group: `${userName}${userPhone ? ` (${userPhone})` : ''}`,
              business_unit: userBusinessUnit === 'Ban Nguồn Vốn' ? 'Ban nguồn vốn' : 'Khối kinh doanh',
              attendance_status: 'Đã đăng ký',
              notes: `Đăng ký hộ bởi ${userName} (${userPhone || userRefCode})`,
            }),
          });

          const data = await res.json();
          if (res.ok) {
            successCount++;
          } else {
            errors.push(`${guest.name}: ${data.error || 'Thất bại'}`);
          }
        } catch {
          errors.push(`${guest.name}: Lỗi kết nối`);
        }
      }

      setIsSubmitting(false);
      setRegisteredCount(successCount);

      if (successCount > 0) {
        if (errors.length > 0) {
          setErrorMsg(`Đã đăng ký ${successCount}/${selectedGuests.length} khách. Lỗi: ${errors.join('; ')}`);
        }
        setCurrentStep(3);
        if (onSuccess) onSuccess();
      } else {
        setErrorMsg(errors.join('; ') || 'Có lỗi xảy ra khi đăng ký hộ');
      }
    } catch {
      setErrorMsg('Lỗi kết nối máy chủ');
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setCurrentStep(isLoggedIn ? 2 : 1);
    setGuestName('');
    setGuestPhone('');
    setSelectedCustomerIds(new Set());
    setRegisteredCount(0);
    setErrorMsg(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      {/* ================= STEP 1: ĐĂNG NHẬP ================= */}
      {currentStep === 1 && (
        <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-100 p-6 sm:p-7 relative animate-in zoom-in-95 duration-150">
          <button
            type="button"
            onClick={handleClose}
            className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 p-1.5 rounded-full hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-3 mb-5">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <UserPlus className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">Đăng nhập</h3>
              <p className="text-xs text-slate-500 mt-0.5 leading-snug">
                Vui lòng đăng nhập để sử dụng tính năng Mời bạn bè và các tiện ích khác.
              </p>
            </div>
          </div>

          {errorMsg && (
            <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl">
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <div>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                  <User className="w-4 h-4" />
                </span>
                <input
                  type="text"
                  value={loginUsername}
                  onChange={(e) => setLoginUsername(e.target.value)}
                  placeholder="Email hoặc số điện thoại"
                  className="w-full pl-10 pr-9 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                  required
                />
                {loginUsername && (
                  <button
                    type="button"
                    onClick={() => setLoginUsername('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded-full hover:bg-slate-200"
                    title="Xóa nội dung"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            <div>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                  <Lock className="w-4 h-4" />
                </span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="Mật khẩu"
                  className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex justify-end text-xs pt-1">
              <button
                type="button"
                onClick={() => alert('Vui lòng liên hệ ban quản trị để được hỗ trợ cấp lại mật khẩu.')}
                className="text-blue-600 hover:underline font-medium"
              >
                Quên mật khẩu?
              </button>
            </div>

            <button
              type="submit"
              disabled={isSubmittingLogin}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-md transition-all active:scale-98 cursor-pointer mt-2"
            >
              {isSubmittingLogin ? 'Đang đăng nhập...' : 'Đăng nhập'}
            </button>
          </form>
        </div>
      )}

      {/* ================= STEP 2: ĐĂNG KÝ HỘ THAM DỰ SỰ KIỆN ================= */}
      {currentStep === 2 && (
        <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-150">
          {/* Header */}
          <div className="p-5 sm:p-6 pb-4 border-b border-slate-100 flex items-start justify-between relative bg-slate-50/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                <UserPlus className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-bold text-slate-900">
                  Đăng ký hộ tham dự sự kiện
                </h3>
                <p className="text-xs text-slate-500 mt-0.5 leading-snug">
                  Vui lòng điền thông tin để đăng ký tham dự sự kiện.
                  <br className="hidden sm:inline" /> Sau khi đăng ký thành công, bạn sẽ nhận được mã QR để check-in tại sự kiện.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleClose}
              className="text-slate-400 hover:text-slate-600 p-1.5 rounded-full hover:bg-slate-200 transition-colors shrink-0"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4">
            {errorMsg && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl">
                {errorMsg}
              </div>
            )}

            {/* Người giới thiệu & Sự kiện box */}
            <div className="bg-blue-50/50 border border-blue-100 rounded-2xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                  <UserPlus className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-[10px] text-blue-600 font-semibold uppercase">Người giới thiệu</div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900">{userName}</span>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                      userBusinessUnit === 'Ban Nguồn Vốn'
                        ? 'bg-purple-50 text-purple-700 border-purple-200'
                        : 'bg-blue-50 text-blue-700 border-blue-200'
                    }`}>
                      {userBusinessUnit}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500">Mã giới thiệu: {userRefCode}</div>
                </div>
              </div>

              <div className="sm:border-l sm:border-blue-100 sm:pl-3 min-w-0">
                <div className="flex items-center gap-1.5 text-[10px] text-slate-500 uppercase font-semibold">
                  <Calendar className="w-3.5 h-3.5 text-blue-600" />
                  <span>Sự kiện</span>
                </div>
                <div className="font-bold text-slate-900 truncate max-w-xs">{event.name}</div>
              </div>
            </div>

            {/* Inputs: Họ và tên [X] & SĐT [X] */}
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Họ và tên <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                    <User className="w-4 h-4" />
                  </span>
                  <input
                    type="text"
                    value={guestName}
                    onChange={(e) => setGuestName(e.target.value)}
                    placeholder="Nhập họ và tên"
                    className="w-full pl-10 pr-9 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                    required
                  />
                  {guestName && (
                    <button
                      type="button"
                      onClick={() => setGuestName('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded-full hover:bg-slate-200 transition-colors"
                      title="Xóa nội dung"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Số điện thoại <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                    <Phone className="w-4 h-4" />
                  </span>
                  <input
                    type="text"
                    value={guestPhone}
                    onChange={(e) => setGuestPhone(e.target.value)}
                    placeholder="Nhập số điện thoại"
                    className="w-full pl-10 pr-9 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all font-mono"
                    required
                  />
                  {guestPhone && (
                    <button
                      type="button"
                      onClick={() => setGuestPhone('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded-full hover:bg-slate-200 transition-colors"
                      title="Xóa nội dung"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Danh sách khách hàng của bạn */}
            <div className="space-y-2.5 pt-1">
              <label className="block text-xs font-bold text-slate-800">
                Danh sách khách hàng của bạn
              </label>

              {/* Search bar with [X] */}
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                  <Search className="w-4 h-4" />
                </span>
                <input
                  type="text"
                  value={customerSearch}
                  onChange={(e) => setCustomerSearch(e.target.value)}
                  placeholder="Tìm kiếm theo tên, số điện thoại..."
                  className="w-full pl-9 pr-9 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                />
                {customerSearch && (
                  <button
                    type="button"
                    onClick={() => setCustomerSearch('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded-full hover:bg-slate-200 transition-colors"
                    title="Xóa nội dung"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* 3 Buttons Placed Side-by-Side (Hình 7.3 & 7.4) */}
              <div className="grid grid-cols-3 gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleClose}
                  className="py-2 px-3 border border-slate-200 hover:bg-slate-100 text-slate-700 font-semibold text-xs rounded-xl transition-all cursor-pointer text-center"
                >
                  Hủy bỏ
                </button>
                <button
                  type="button"
                  onClick={handleAddNewCustomer}
                  className="py-2 px-3 bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700 font-semibold text-xs rounded-xl transition-all flex items-center justify-center gap-1 cursor-pointer"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Thêm khách</span>
                </button>
                <button
                  type="button"
                  disabled={isSubmitting || selectedCustomerIds.size === 0}
                  onClick={handleConfirmRegistration}
                  className="py-2 px-3 bg-blue-600 hover:bg-blue-700 active:scale-98 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-1 cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>{isSubmitting ? '...' : `Xác nhận${selectedCustomerIds.size > 0 ? ` (${selectedCustomerIds.size})` : ''}`}</span>
                </button>
              </div>

              {/* Table of Customers */}
              <div className="border border-slate-200 rounded-xl overflow-hidden text-xs">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-blue-50/70 text-slate-600 font-semibold border-b border-slate-200">
                      <th className="py-2 px-3 w-10 text-center">STT</th>
                      <th className="py-2 px-3">Họ và tên</th>
                      <th className="py-2 px-3">Số điện thoại</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredCustomers.length === 0 ? (
                      <tr>
                        <td colSpan={3} className="py-6 text-center text-slate-400">
                          Không tìm thấy khách hàng nào
                        </td>
                      </tr>
                    ) : (
                      filteredCustomers.map((cust, idx) => {
                        const isSelected = selectedCustomerIds.has(cust.id);
                        return (
                          <tr
                            key={cust.id}
                            onClick={() => handleSelectCustomer(cust)}
                            className={`cursor-pointer transition-colors ${
                              isSelected ? 'bg-blue-50/80 font-semibold' : 'hover:bg-slate-50'
                            }`}
                          >
                            <td className="py-2 px-3 text-center">
                              <span className="flex items-center justify-center">
                                <span
                                  className={`w-4 h-4 rounded-full border flex items-center justify-center text-[10px] ${
                                    isSelected
                                      ? 'border-blue-600 bg-blue-600 text-white'
                                      : 'border-slate-300 text-slate-600'
                                  }`}
                                >
                                  {isSelected ? '✓' : idx + 1}
                                </span>
                              </span>
                            </td>
                            <td className="py-2 px-3 text-slate-800">{cust.name}</td>
                            <td className="py-2 px-3 text-slate-600 font-mono">{cust.phone}</td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Info Note */}
              <div className="p-3 bg-blue-50/50 border border-blue-100 rounded-xl text-[11px] text-blue-800 flex items-start gap-2">
                <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <span>
                  Bạn có thể chọn khách có sẵn trong danh sách hoặc nhấn &ldquo;Thêm khách&rdquo; để đăng ký thêm người tham dự.
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= STEP 3: ĐĂNG KÝ THÀNH CÔNG ================= */}
      {currentStep === 3 && (
        <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-100 p-6 sm:p-7 relative text-center animate-in zoom-in-95 duration-150">
          <button
            type="button"
            onClick={handleClose}
            className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 p-1.5 rounded-full hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Green circle checkmark */}
          <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-4 animate-in zoom-in-75">
            <CheckCircle2 className="w-9 h-9 stroke-[2.5]" />
          </div>

          <h3 className="text-xl font-bold text-slate-900">Đăng ký thành công</h3>
          <p className="text-xs text-slate-500 mt-1 mb-5">
            Khách đã được thêm vào danh sách tham dự sự kiện.
          </p>

          {/* Event Card info */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-left mb-4 space-y-1">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-blue-600 shrink-0" />
              <div className="font-bold text-slate-900 text-xs sm:text-sm truncate">
                {event.name}
              </div>
            </div>
            <div className="text-[11px] text-slate-500 pl-6">
              Mã sự kiện: <span className="font-mono text-slate-700">{event.code || `EVT20240530-${event.id}`}</span>
            </div>
          </div>

          {/* Green Banner */}
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3.5 text-left flex items-start gap-2.5 mb-6">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <div className="text-xs">
              <div className="font-bold text-emerald-900">Đã đăng ký {registeredCount} khách hàng</div>
              <div className="text-emerald-700 text-[11px]">Thông tin đã được lưu vào danh sách tham dự.</div>
            </div>
          </div>

          {/* Button Close */}
          <button
            type="button"
            onClick={handleClose}
            className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md transition-all active:scale-98 cursor-pointer"
          >
            Đóng
          </button>
        </div>
      )}
    </div>
  );
}
