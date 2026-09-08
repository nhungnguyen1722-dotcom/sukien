'use client';

import React, { useState, useEffect } from 'react';
import {
  CalendarDays,
  Calendar,
  MapPin,
  Clock,
  User,
  Phone,
  Mail,
  Building2,
  Users,
  Check,
  X,
  QrCode,
  Download,
  AlertCircle,
  Loader2,
  CheckCircle2,
  Sparkles,
  Ticket,
} from 'lucide-react';
import SystemLogo from './SystemLogo';

export interface RegistrationEventData {
  id: number;
  name: string;
  event_date: string;
  start_time?: string | null;
  end_time?: string | null;
  location?: string | null;
  status?: string;
  image_url?: string | null;
  short_description?: string | null;
  speaker_name?: string | null;
  speaker_title?: string | null;
}

interface EventRegistrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  event: RegistrationEventData | null;
  onSuccess?: () => void;
}

const STORAGE_KEY = 'nghieng_registered_user';

export default function EventRegistrationModal({
  isOpen,
  onClose,
  event,
  onSuccess,
}: EventRegistrationModalProps) {
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [company, setCompany] = useState('');
  const [referrerType, setReferrerType] = useState<'vang_lai' | 'co_nguoi_gioi_thieu'>('vang_lai');
  const [referrer, setReferrer] = useState('');
  const [notes, setNotes] = useState('');
  const [agreeTerms, setAgreeTerms] = useState(true);

  const [hasSavedProfile, setHasSavedProfile] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [registrationResult, setRegistrationResult] = useState<any>(null);

  // Load saved profile on mount or open
  useEffect(() => {
    if (!isOpen) {
      setRegistrationResult(null);
      setErrorMsg('');
      return;
    }

    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.phone) {
          setPhone(parsed.phone || '');
          setFullName(parsed.fullName || '');
          setEmail(parsed.email || '');
          setCompany(parsed.company || '');
          if (parsed.referrer && parsed.referrer !== 'Khách vãng lai') {
            setReferrer(parsed.referrer);
            setReferrerType('co_nguoi_gioi_thieu');
          } else {
            setReferrerType('vang_lai');
          }
          setHasSavedProfile(true);
        }
      }
    } catch {
      // Ignore storage errors
    }
  }, [isOpen]);

  if (!isOpen || !event) return null;

  // Format date parts
  const eventDateObj = event.event_date ? new Date(event.event_date) : new Date();
  const dayNumber = eventDateObj.getDate();
  const monthNumber = eventDateObj.getMonth() + 1;
  const monthStr = `TH${monthNumber < 10 ? '0' + monthNumber : monthNumber}`;
  const yearStr = eventDateObj.getFullYear();
  const fullDateStr = `${eventDateObj.toLocaleDateString('vi-VN', { weekday: 'long' })}, ${dayNumber}/${monthNumber}/${yearStr}`;

  // Time display
  const timeDisplay = event.start_time && event.end_time
    ? `${event.start_time.slice(0, 5)} - ${event.end_time.slice(0, 5)}`
    : '08:30 - 11:30';

  // Check if today is event date
  const isToday = new Date().toDateString() === eventDateObj.toDateString();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agreeTerms) {
      setErrorMsg('Vui lòng đồng ý với điều khoản tham gia sự kiện.');
      return;
    }

    if (!fullName.trim() || !phone.trim()) {
      setErrorMsg('Vui lòng điền họ tên và số điện thoại.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');

    const finalReferrer = referrerType === 'vang_lai' ? 'Khách vãng lai' : referrer.trim();

    try {
      const res = await fetch('/api/events/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventId: event.id,
          fullName,
          phone,
          email,
          company,
          referrer: finalReferrer,
          notes,
          isTodayCheckin: isToday,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Đăng ký thất bại. Vui lòng thử lại.');
      }

      // Lưu thông tin người dùng trên thiết bị theo luồng hop-thoai-6.txt
      try {
        localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({
            phone: phone.trim(),
            fullName: fullName.trim(),
            email: email.trim(),
            company: company.trim(),
            referrer: finalReferrer,
          })
        );
      } catch {
        // Ignore
      }

      setRegistrationResult(data.registration);
      if (onSuccess) onSuccess();
    } catch (err: any) {
      setErrorMsg(err.message || 'Có lỗi xảy ra khi xử lý đăng ký.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const clearSavedProfile = () => {
    try {
      localStorage.removeItem(STORAGE_KEY);
      setHasSavedProfile(false);
      setFullName('');
      setPhone('');
      setEmail('');
      setCompany('');
      setReferrer('');
    } catch {
      // Ignore
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="bg-white w-full max-w-4xl rounded-2xl sm:rounded-3xl shadow-2xl border border-gray-100 overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-start justify-between px-5 sm:px-7 pt-5 pb-4 border-b border-gray-100 bg-white">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#2563eb] flex items-center justify-center flex-shrink-0 mt-0.5">
              <CalendarDays className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
                {isToday ? 'Check-in tham dự sự kiện' : 'Đăng ký tham dự sự kiện'}
              </h2>
              <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
                Vui lòng điền thông tin để đăng ký tham dự sự kiện. Sau khi đăng ký thành công, bạn sẽ nhận được mã QR để check-in tại sự kiện.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer flex-shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="overflow-y-auto flex-1 p-5 sm:p-7">
          {registrationResult ? (
            /* SUCCESS E-TICKET SCREEN */
            <div className="py-4 px-2 flex flex-col items-center text-center max-w-xl mx-auto">
              <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-4 shadow-sm animate-in zoom-in">
                <CheckCircle2 className="w-8 h-8" />
              </div>

              <span className="px-3 py-1 bg-emerald-50 text-emerald-700 font-semibold text-xs rounded-full uppercase tracking-wider mb-2">
                {isToday ? 'Check-in thành công' : 'Đăng ký tham dự thành công'}
              </span>

              <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-1">
                Chúc mừng {registrationResult.guestName}!
              </h3>
              <p className="text-sm text-gray-500 mb-6">
                Hệ thống đã tự động lưu thông tin và tạo vé tham dự điện tử dành riêng cho bạn.
              </p>

              {/* E-Ticket Card */}
              <div className="w-full bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl p-5 text-white shadow-xl relative overflow-hidden mb-6 text-left">
                <div className="absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 bg-white/10 rounded-full blur-xl pointer-events-none" />
                
                <div className="flex items-center justify-between border-b border-white/20 pb-3 mb-4">
                  <div className="flex items-center gap-2">
                    <Ticket className="w-5 h-5 text-blue-200" />
                    <span className="text-xs font-semibold uppercase tracking-wider text-blue-100">
                      Vé tham dự / E-Ticket Pass
                    </span>
                  </div>
                  <span className="text-xs font-mono font-bold bg-white/20 px-2 py-0.5 rounded">
                    {registrationResult.guestCode}
                  </span>
                </div>

                <div className="flex flex-col sm:flex-row gap-5 items-center sm:items-start justify-between">
                  <div className="space-y-2 flex-1">
                    <h4 className="font-bold text-base sm:text-lg leading-snug">
                      {event.name}
                    </h4>
                    <div className="text-xs text-blue-100 space-y-1">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 flex-shrink-0" />
                        <span>{fullDateStr} ({timeDisplay})</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                        <span>{event.location || 'Địa điểm sự kiện'}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 flex-shrink-0" />
                        <span>Khách: <strong className="text-white">{registrationResult.guestName}</strong> ({registrationResult.guestPhone})</span>
                      </div>
                    </div>
                  </div>

                  {/* QR Box */}
                  <div className="bg-white p-3 rounded-xl shadow-md flex flex-col items-center justify-center flex-shrink-0">
                    {/* SVG Simulated QR code */}
                    <svg className="w-24 h-24 text-gray-900" viewBox="0 0 100 100" fill="currentColor">
                      {/* Outer corner squares */}
                      <rect x="5" y="5" width="26" height="26" rx="2" fill="#1e293b" />
                      <rect x="10" y="10" width="16" height="16" fill="white" />
                      <rect x="14" y="14" width="8" height="8" fill="#1e293b" />

                      <rect x="69" y="5" width="26" height="26" rx="2" fill="#1e293b" />
                      <rect x="74" y="10" width="16" height="16" fill="white" />
                      <rect x="78" y="14" width="8" height="8" fill="#1e293b" />

                      <rect x="5" y="69" width="26" height="26" rx="2" fill="#1e293b" />
                      <rect x="10" y="74" width="16" height="16" fill="white" />
                      <rect x="14" y="78" width="8" height="8" fill="#1e293b" />

                      {/* Random data grid pattern */}
                      <rect x="36" y="8" width="8" height="8" fill="#2563eb" />
                      <rect x="48" y="8" width="6" height="6" fill="#1e293b" />
                      <rect x="58" y="8" width="6" height="12" fill="#1e293b" />
                      <rect x="36" y="22" width="18" height="6" fill="#1e293b" />
                      <rect x="8" y="38" width="8" height="8" fill="#1e293b" />
                      <rect x="22" y="38" width="6" height="18" fill="#2563eb" />
                      <rect x="34" y="36" width="14" height="14" fill="#1e293b" />
                      <rect x="54" y="36" width="12" height="6" fill="#1e293b" />
                      <rect x="72" y="36" width="8" height="8" fill="#2563eb" />
                      <rect x="86" y="38" width="8" height="14" fill="#1e293b" />
                      <rect x="36" y="56" width="8" height="16" fill="#1e293b" />
                      <rect x="48" y="52" width="14" height="8" fill="#2563eb" />
                      <rect x="68" y="52" width="14" height="14" fill="#1e293b" />
                      <rect x="86" y="58" width="8" height="14" fill="#1e293b" />
                      <rect x="36" y="78" width="16" height="8" fill="#1e293b" />
                      <rect x="58" y="72" width="8" height="20" fill="#2563eb" />
                      <rect x="72" y="72" width="22" height="8" fill="#1e293b" />
                      <rect x="72" y="86" width="10" height="8" fill="#1e293b" />
                    </svg>
                    <span className="text-[10px] font-mono font-bold text-gray-700 mt-1">
                      MÃ CHECK-IN
                    </span>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-white/20 flex items-center justify-between text-[11px] text-blue-100">
                  <span>Mặc định: Suất ăn tiệc trà đã được xác nhận</span>
                  <span>Trạng thái: {registrationResult.attendanceStatus}</span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-col sm:flex-row gap-3 w-full justify-center">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-800 text-sm font-semibold rounded-xl transition-all"
                >
                  <Download className="w-4 h-4" />
                  <span>Lưu / In vé điện tử</span>
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-[#2563eb] hover:bg-[#1d4ed8] text-white text-sm font-semibold rounded-xl shadow-md transition-all cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>Hoàn tất</span>
                </button>
              </div>
            </div>
          ) : (
            /* 2-COLUMN FORM & EVENT PREVIEW (IMAGE 12) */
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">
              {/* LEFT COLUMN: FORM */}
              <div className="lg:col-span-7 flex flex-col">
                <h3 className="font-bold text-base text-gray-900 mb-3 flex items-center justify-between">
                  <span>Thông tin đăng ký</span>
                  {hasSavedProfile && (
                    <button
                      type="button"
                      onClick={clearSavedProfile}
                      className="text-xs text-gray-400 hover:text-red-500 font-normal underline"
                    >
                      Xóa thông tin đã lưu
                    </button>
                  )}
                </h3>

                {/* Banner nhận diện thiết bị theo hop-thoai-6.txt */}
                {hasSavedProfile && (
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 mb-4 flex items-start gap-2 text-xs text-blue-800">
                    <Sparkles className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold">Đã tự động nhận diện thông tin của bạn:</p>
                      <p className="text-blue-700 mt-0.5">
                        {fullName} ({phone}) {company ? `• ${company}` : ''}
                      </p>
                      <p className="text-blue-500 text-[11px] mt-1">
                        Hệ thống đã tự lưu trên thiết bị này. Bạn có thể nhấn &quot;Đăng ký ngay&quot; 1-chạm mà không cần nhập lại!
                      </p>
                    </div>
                  </div>
                )}

                {errorMsg && (
                  <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-4 flex items-center gap-2 text-xs text-red-700">
                    <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                    <span>{errorMsg}</span>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-3.5 flex-1 flex flex-col">
                  {/* Họ và tên */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Họ và tên <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <User className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        required
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="Nguyễn Văn An"
                        className="w-full pl-9 pr-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                      />
                    </div>
                  </div>

                  {/* Số điện thoại */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Số điện thoại <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <Phone className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="tel"
                        required
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="0987 654 321"
                        className="w-full pl-9 pr-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                      />
                    </div>
                  </div>

                  {/* Email & Đơn vị */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">
                        Email <span className="text-gray-400 font-normal">(tùy chọn)</span>
                      </label>
                      <div className="relative">
                        <Mail className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="Nhập email của bạn"
                          className="w-full pl-9 pr-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">
                        Đơn vị / Công ty <span className="text-gray-400 font-normal">(tùy chọn)</span>
                      </label>
                      <div className="relative">
                        <Building2 className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          value={company}
                          onChange={(e) => setCompany(e.target.value)}
                          placeholder="Nhập tên công ty"
                          className="w-full pl-9 pr-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Người giới thiệu (Item 4) */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                      Người giới thiệu
                    </label>
                    <div className="flex items-center gap-6 mb-2">
                      <label className="inline-flex items-center gap-2 cursor-pointer text-xs font-medium text-gray-700">
                        <input
                          type="radio"
                          name="referrerType"
                          value="vang_lai"
                          checked={referrerType === 'vang_lai'}
                          onChange={() => setReferrerType('vang_lai')}
                          className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500 cursor-pointer"
                        />
                        <span>Người vãng lai</span>
                      </label>
                      <label className="inline-flex items-center gap-2 cursor-pointer text-xs font-medium text-gray-700">
                        <input
                          type="radio"
                          name="referrerType"
                          value="co_nguoi_gioi_thieu"
                          checked={referrerType === 'co_nguoi_gioi_thieu'}
                          onChange={() => setReferrerType('co_nguoi_gioi_thieu')}
                          className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500 cursor-pointer"
                        />
                        <span>Người giới thiệu</span>
                      </label>
                    </div>

                    {referrerType === 'co_nguoi_gioi_thieu' && (
                      <div className="relative animate-in fade-in duration-200">
                        <Users className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          required={referrerType === 'co_nguoi_gioi_thieu'}
                          value={referrer}
                          onChange={(e) => setReferrer(e.target.value)}
                          placeholder="Nhập đúng tên hoặc SĐT của User thành viên mời"
                          className="w-full pl-9 pr-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                        />
                      </div>
                    )}
                  </div>

                  {/* Ghi chú */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-semibold text-gray-700">
                        Ghi chú <span className="text-gray-400 font-normal">(tùy chọn)</span>
                      </label>
                      <span className="text-[11px] text-gray-400">{notes.length}/500</span>
                    </div>
                    <textarea
                      rows={2}
                      maxLength={500}
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Nhập ghi chú (nếu có)"
                      className="w-full p-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none"
                    />
                  </div>

                  {/* Checkbox Terms */}
                  <div className="flex items-start gap-2 pt-1">
                    <input
                      type="checkbox"
                      id="terms"
                      checked={agreeTerms}
                      onChange={(e) => setAgreeTerms(e.target.checked)}
                      className="mt-0.5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                    />
                    <label htmlFor="terms" className="text-xs text-gray-600 cursor-pointer select-none">
                      Tôi đồng ý với{' '}
                      <span className="text-blue-600 font-medium hover:underline">
                        điều khoản tham gia sự kiện
                      </span>{' '}
                      và nhận thông báo cập nhật qua SĐT/Zalo.
                    </label>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100 mt-auto">
                    <button
                      type="button"
                      onClick={onClose}
                      className="px-4 py-2 border border-gray-200 hover:bg-gray-50 text-gray-700 text-sm font-semibold rounded-xl transition-all cursor-pointer"
                    >
                      Hủy bỏ
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="inline-flex items-center gap-2 px-6 py-2 bg-[#2563eb] hover:bg-[#1d4ed8] text-white text-sm font-semibold rounded-xl shadow-md shadow-blue-500/20 transition-all cursor-pointer disabled:opacity-60"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Đang xử lý...</span>
                        </>
                      ) : (
                        <>
                          <span>{isToday ? 'Xác nhận tham dự' : 'Đăng ký ngay'}</span>
                          <span className="text-xs font-bold">→</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>

              {/* RIGHT COLUMN: EVENT SUMMARY PREVIEW (IMAGE 12) */}
              <div className="lg:col-span-5 bg-slate-50 border border-slate-200/80 rounded-2xl p-4 sm:p-5 flex flex-col justify-between">
                <div>
                  {/* Event Image */}
                  <div className="relative rounded-xl overflow-hidden h-36 w-full bg-slate-200 mb-3 border border-slate-200">
                    {event.image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={event.image_url}
                        alt={event.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-blue-50">
                        <SystemLogo className="h-16 w-auto object-contain" />
                      </div>
                    )}
                    <span className="absolute top-2 left-2 px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-[#2563eb] text-white shadow-xs">
                      {event.status || 'Sắp diễn ra'}
                    </span>
                  </div>

                  {/* Date & Title */}
                  <div className="flex gap-3 mb-3">
                    <div className="bg-white border border-gray-200 rounded-xl px-2.5 py-1.5 flex flex-col items-center justify-center flex-shrink-0 text-center min-w-[50px] shadow-xs">
                      <span className="text-lg font-black text-gray-900 leading-none">{dayNumber}</span>
                      <span className="text-[10px] font-bold text-[#2563eb] tracking-wide uppercase mt-0.5">{monthStr}</span>
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-gray-900 leading-snug line-clamp-2">
                        {event.name}
                      </h4>
                      <div className="flex items-center gap-1 text-xs text-gray-500 mt-1">
                        <Clock className="w-3.5 h-3.5 text-gray-400" />
                        <span>{timeDisplay}</span>
                      </div>
                    </div>
                  </div>

                  {/* Location */}
                  <div className="flex items-start gap-2 text-xs text-gray-600 mb-4 bg-white p-2.5 rounded-xl border border-gray-100">
                    <MapPin className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
                    <span className="line-clamp-2">{event.location || 'Trung tâm hội nghị Quốc Gia, Hà Nội'}</span>
                  </div>

                  {/* Speaker Section */}
                  <div className="mb-4 pt-2 border-t border-gray-200/80">
                    <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">
                      Diễn giả
                    </p>
                    <div className="flex items-center gap-3 bg-white p-2.5 rounded-xl border border-gray-100">
                      <div className="w-9 h-9 rounded-full overflow-hidden bg-gray-200 flex-shrink-0">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src="/events/speaker-hung.jpg"
                          alt="Diễn giả"
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.currentTarget.src = '/logo-nghieng.png';
                          }}
                        />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-gray-900 leading-tight">
                          {event.speaker_name || 'Ông Nguyễn Văn Hùng'}
                        </p>
                        <p className="text-[11px] text-gray-500">
                          {event.speaker_title || 'Chuyên gia kinh tế - Giám đốc ABC'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Key Takeaways */}
                  <div className="mb-4">
                    <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">
                      Nội dung chính
                    </p>
                    <ul className="space-y-1.5 text-xs text-gray-600">
                      <li className="flex items-start gap-1.5">
                        <Check className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0 mt-0.5" />
                        <span>Xu hướng phát triển kinh tế và cơ hội cho doanh nghiệp</span>
                      </li>
                      <li className="flex items-start gap-1.5">
                        <Check className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0 mt-0.5" />
                        <span>Chiến lược kết nối và hợp tác hiệu quả</span>
                      </li>
                      <li className="flex items-start gap-1.5">
                        <Check className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0 mt-0.5" />
                        <span>Chia sẻ kinh nghiệm từ các doanh nghiệp thành công</span>
                      </li>
                      <li className="flex items-start gap-1.5">
                        <Check className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0 mt-0.5" />
                        <span>Giao lưu, kết nối và mở rộng mối quan hệ</span>
                      </li>
                    </ul>
                  </div>
                </div>

                {/* QR Notice Box */}
                <div className="bg-blue-50/80 border border-blue-100 rounded-xl p-3 flex items-start gap-2.5 text-xs text-blue-900 mt-2">
                  <div className="w-6 h-6 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <QrCode className="w-3.5 h-3.5" />
                  </div>
                  <p className="text-[11px] leading-relaxed text-blue-800">
                    Sau khi đăng ký, bạn sẽ nhận được <strong>mã QR</strong> qua Zalo/Email để check-in tại sự kiện.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
