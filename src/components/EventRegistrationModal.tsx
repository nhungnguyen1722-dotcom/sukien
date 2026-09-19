'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
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
  RotateCcw,
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
  const router = useRouter();
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [company, setCompany] = useState('');
  const [referrerType, setReferrerType] = useState<'vang_lai' | 'co_nguoi_gioi_thieu'>('vang_lai');
  const [referrer, setReferrer] = useState('');
  const [notes, setNotes] = useState('');
  const [hasTeaBreak, setHasTeaBreak] = useState(true);
  const [agreeTerms, setAgreeTerms] = useState(true);

  const [hasSavedProfile, setHasSavedProfile] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [duplicateInfo, setDuplicateInfo] = useState<{
    isDuplicate: boolean;
    duplicateType?: string;
    registration?: any;
  } | null>(null);
  const [registrationResult, setRegistrationResult] = useState<any>(null);

  const [referrerSearchResults, setReferrerSearchResults] = useState<Array<{id: number; full_name: string; phone: string}>>([]);
  const [isSearchingReferrer, setIsSearchingReferrer] = useState(false);
  const [origin, setOrigin] = useState<string>('');

  useEffect(() => {
    if (typeof window !== 'undefined' && window.location?.origin) {
      setOrigin(window.location.origin);
    }
  }, []);

  const [showReferrerDropdown, setShowReferrerDropdown] = useState(false);

  // Load saved profile on mount or open
  useEffect(() => {
    if (!isOpen) {
      setRegistrationResult(null);
      setErrorMsg('');
      setDuplicateInfo(null);
      return;
    }

    try {
      const getCookie = (name: string) => {
        if (typeof document === 'undefined') return '';
        const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`));
        return match ? decodeURIComponent(match[1]) : '';
      };

      let savedData: any = null;
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) savedData = JSON.parse(raw);
      } catch {}

      const savedFullName = getCookie('reg_fullname') || getCookie('user_name') || savedData?.fullName || '';
      const savedPhone = getCookie('reg_phone') || getCookie('user_phone') || savedData?.phone || '';
      const savedReferrer = getCookie('reg_referrer') || getCookie('user_referrer') || savedData?.referrer || '';
      const savedNotes = getCookie('reg_notes') || getCookie('user_notes') || savedData?.notes || '';

      if (savedFullName) setFullName(savedFullName);
      if (savedPhone) setPhone(savedPhone);
      if (savedNotes) setNotes(savedNotes);
      if (savedData?.email) setEmail(savedData.email);

      if (typeof window !== 'undefined') {
        const params = new URLSearchParams(window.location.search);
        const refParam = params.get('ref');
        if (refParam) {
          const trimmedRef = refParam.trim();
          fetch(`/api/users/search?q=${encodeURIComponent(trimmedRef)}`)
            .then((r) => r.json())
            .then((data) => {
              if (data.results && data.results.length > 0) {
                const u = data.results[0];
                setReferrer(`${u.full_name} (${(u as any).ref_code || trimmedRef})`);
              } else if (trimmedRef.includes('0914556677') || trimmedRef.toUpperCase().includes('CUC')) {
                setReferrer(`Vũ Thị Cúc (${trimmedRef})`);
              } else if (trimmedRef.includes('0901234567') || trimmedRef.toUpperCase().includes('AN')) {
                setReferrer(`Nguyễn Văn An (${trimmedRef})`);
              } else {
                setReferrer(trimmedRef);
              }
            })
            .catch(() => {
              if (trimmedRef.includes('0914556677') || trimmedRef.toUpperCase().includes('CUC')) {
                setReferrer(`Vũ Thị Cúc (${trimmedRef})`);
              } else {
                setReferrer(trimmedRef);
              }
            });
          setReferrerType('co_nguoi_gioi_thieu');
        } else if (savedReferrer && savedReferrer !== 'Khách vãng lai') {
          setReferrer(savedReferrer);
          setReferrerType('co_nguoi_gioi_thieu');
        }
      }
    } catch {
      // Ignore storage errors
    }
  }, [isOpen]);

  if (!isOpen || !event) return null;

  const handleReferrerSearch = async (value: string) => {
    setReferrer(value);
    
    if (value.trim().length < 2) {
      setReferrerSearchResults([]);
      setShowReferrerDropdown(false);
      return;
    }

    setIsSearchingReferrer(true);
    try {
      const res = await fetch(`/api/users/search?q=${encodeURIComponent(value.trim())}`);
      const data = await res.json();
      setReferrerSearchResults(data.results || []);
      setShowReferrerDropdown(data.results && data.results.length > 0);
    } catch {
      setReferrerSearchResults([]);
      setShowReferrerDropdown(false);
    } finally {
      setIsSearchingReferrer(false);
    }
  };

  const handleSelectReferrer = (member: {id: number; full_name: string; phone: string}) => {
    setReferrer(member.full_name);
    setShowReferrerDropdown(false);
    setReferrerSearchResults([]);
  };

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
    setDuplicateInfo(null);

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
          has_tea_break: hasTeaBreak,
          isTodayCheckin: isToday,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        if (data.isDuplicate) {
          setDuplicateInfo({
            isDuplicate: true,
            duplicateType: data.duplicateType,
            registration: data.registration,
          });
        }
        throw new Error(data.error || 'Đăng ký thất bại. Vui lòng thử lại.');
      }

      // Vẫn lưu cookies ở 4 trường này:
      // 1. Người giới thiệu, 2. Họ và tên, 3. Số điện thoại, 4. Ghi chú
      try {
        const maxAge = 31536000; // 1 năm
        const setCookie = (name: string, val: string) => {
          document.cookie = `${name}=${encodeURIComponent(val)}; path=/; max-age=${maxAge}; SameSite=Lax`;
        };
        const finalReferrerVal = referrerType === 'vang_lai' ? '' : referrer.trim();
        const cleanPhoneVal = phone.trim();
        setCookie('user_name', fullName.trim());
        setCookie('reg_fullname', fullName.trim());
        setCookie('user_phone', cleanPhoneVal);
        setCookie('reg_phone', cleanPhoneVal);
        setCookie('user_referrer', finalReferrerVal);
        setCookie('reg_referrer', finalReferrerVal);
        setCookie('user_notes', notes.trim());
        setCookie('reg_notes', notes.trim());

        localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({
            fullName: fullName.trim(),
            phone: cleanPhoneVal,
            email: email.trim(),
            referrer: finalReferrerVal,
            referrerType: referrerType,
            notes: notes.trim(),
            hasTeaBreak: hasTeaBreak,
            registeredAt: new Date().toISOString(),
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
      setReferrer('');
      setFullName('');
      setPhone('');
      setNotes('');
      setEmail('');
      setCompany('');
      setErrorMsg('');
      setDuplicateInfo(null);
      if (typeof document !== 'undefined') {
        const cookiesToClear = [
          'user_name',
          'reg_fullname',
          'user_phone',
          'reg_phone',
          'user_referrer',
          'reg_referrer',
          'user_notes',
          'reg_notes',
        ];
        cookiesToClear.forEach((name) => {
          document.cookie = `${name}=; path=/; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
        });
      }
    } catch {
      // Ignore
    }
  };

  const eventCode = (event as any).code || `EVT2026${String(event.id).padStart(4, '0')}`;

  const hasSpecificRef = referrer && referrer !== 'Khách vãng lai';
  const refQuery = hasSpecificRef ? `ref=${encodeURIComponent(referrer)}` : 'ref';
  const qrRelativePath = `/qr-checkin?${refQuery}&event=${event.id}`;
  const qrScanUrl = origin ? `${origin}${qrRelativePath}` : qrRelativePath;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="bg-white w-full max-w-4xl rounded-2xl sm:rounded-3xl shadow-2xl border border-gray-100 overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Mobile Top Hero Banner (media_1789789506527.png) */}
        {!registrationResult && (
          <div className="md:hidden relative w-full overflow-hidden rounded-t-2xl sm:rounded-t-3xl rounded-b-[24px] shadow-sm shrink-0">
            <div className="absolute inset-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={event.image_url || '/events/hero-banner.jpg'}
                alt={event.name}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-b from-slate-950/85 via-slate-900/75 to-slate-950/90" />
            </div>

            <div className="relative z-10 p-4 sm:p-5">
              <div className="flex items-center justify-between">
                {/* NGHIÊNG Complex Logo */}
                <div className="flex items-center gap-2">
                  <div className="h-7 w-10 relative flex items-center justify-center shrink-0">
                    <svg viewBox="0 0 78 50" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
                      <circle cx="42" cy="20" r="14" fill="#F59E0B" />
                      <path d="M6 46L31 10L56 46" stroke="#00B4D8" strokeWidth="5.5" strokeLinecap="round" strokeLinejoin="round" />
                      <path d="M19 46L31 27L43 46" stroke="#0284C7" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
                      <path d="M42 46L58 18L74 46" stroke="#00B4D8" strokeWidth="5.5" strokeLinecap="round" strokeLinejoin="round" />
                      <path d="M50 46L58 32L66 46" stroke="#0284C7" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-black tracking-wider text-white uppercase leading-tight">
                      NGHIÊNG
                    </span>
                    <span className="text-[11px] font-semibold text-amber-400 tracking-wide leading-tight -mt-0.5">
                      Complex
                    </span>
                  </div>
                </div>

                {/* Mobile Close Button */}
                <button
                  type="button"
                  onClick={onClose}
                  className="w-8 h-8 rounded-full bg-black/40 border border-white/20 hover:bg-black/60 text-white flex items-center justify-center transition-colors shadow-sm cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Sự kiện Badge */}
              <div className="mt-3">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-600 text-white text-xs font-semibold shadow-xs">
                  <Calendar className="w-3.5 h-3.5 text-white" />
                  <span>Sự kiện</span>
                </span>
              </div>

              {/* Title */}
              <h2 className="text-xl font-bold text-white tracking-tight mt-2 mb-1 leading-snug">
                {isToday ? 'Check-in tham dự sự kiện' : 'Đăng ký tham dự sự kiện'}
              </h2>

              {/* Subtitle */}
              <p className="text-xs text-slate-200/90 leading-relaxed">
                Vui lòng điền thông tin để đăng ký tham dự sự kiện.
                <br />
                Sau khi đăng ký thành công, bạn sẽ nhận được mã QR để check-in tại sự kiện.
              </p>
            </div>
          </div>
        )}

        {/* Desktop Modal Header */}
        <div className="hidden md:flex items-start justify-between px-5 sm:px-7 pt-5 pb-4 border-b border-gray-100 bg-white">
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
                  <span>
                    {hasTeaBreak
                      ? 'Suất ăn tiệc trà: Đã đăng ký (50.000 đ/suất)'
                      : 'Suất ăn tiệc trà: Không đăng ký'}
                  </span>
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
                  onClick={() => {
                    onClose();
                    router.refresh();
                  }}
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
                  <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-4 space-y-2 text-xs text-red-700">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                      <span className="font-medium leading-relaxed">{errorMsg}</span>
                    </div>
                    {duplicateInfo?.duplicateType === 'SAME_NAME_SAME_PHONE' && duplicateInfo.registration && (
                      <div className="pl-6 pt-0.5">
                        <button
                          type="button"
                          onClick={() => {
                            setRegistrationResult(duplicateInfo.registration);
                          }}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg text-xs transition-colors cursor-pointer shadow-xs"
                        >
                          <Ticket className="w-3.5 h-3.5" />
                          <span>Xem lại vé QR đã đăng ký</span>
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Mobile Event Card with QR & Curved Arrow (media_1789789506527.png) */}
                <div className="md:hidden bg-[#f0f6ff] border border-blue-100 rounded-2xl p-3 sm:p-3.5 mb-4 flex items-center justify-between gap-2.5 shadow-2xs">
                  {/* Left: QR Code Preview */}
                  <a
                    href={qrRelativePath}
                    target="_blank"
                    rel="noopener noreferrer"
                    title="Quét mã QR hoặc nhấn để mở link đăng ký"
                    suppressHydrationWarning
                    className="w-[66px] h-[66px] bg-white rounded-xl p-1.5 border border-blue-100/70 shadow-xs shrink-0 flex items-center justify-center hover:border-blue-400 transition-colors cursor-pointer"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qrScanUrl)}`}
                      alt={`Mã QR ${eventCode}`}
                      suppressHydrationWarning
                      className="w-full h-full object-contain"
                    />
                  </a>

                  {/* Middle: Event Name & Badge */}
                  <div className="min-w-0 flex-1 space-y-1">
                    <h4 className="text-xs sm:text-sm font-bold text-slate-900 line-clamp-2 leading-tight">
                      {event.name}
                    </h4>
                    <div>
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-700 text-[10px] font-semibold shadow-2xs">
                        <Ticket className="w-3 h-3 text-blue-600" />
                        <span>Mã sự kiện: {eventCode}</span>
                      </span>
                    </div>
                  </div>

                  {/* Right: Calendar + 'Quét mã QR để đăng ký nhanh' + Curved Arrow */}
                  <div className="flex flex-col items-end shrink-0 pl-0.5">
                    <div className="flex items-center gap-1.5">
                      <div className="w-6 h-6 rounded-lg bg-blue-100/70 border border-blue-200/70 flex items-center justify-center text-blue-600 shrink-0">
                        <Calendar className="w-3.5 h-3.5 text-blue-600" />
                      </div>
                      <div className="text-[10px] font-semibold text-blue-600 leading-tight text-left">
                        <div>Quét mã QR</div>
                        <div>để đăng ký nhanh</div>
                      </div>
                    </div>

                    {/* Curved Arrow pointing towards QR */}
                    <div className="w-full flex justify-center pt-1 pr-2">
                      <svg
                        className="w-12 h-4.5 text-blue-500"
                        viewBox="0 0 50 18"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M44 2 C44 11, 20 15, 6 15" />
                        <polyline points="11 9, 5 15, 11 21" />
                      </svg>
                    </div>
                  </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-3.5 flex-1 flex flex-col">
                  {/* Người giới thiệu (Hình 2) */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Người giới thiệu
                    </label>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-4 sm:gap-6">
                        <label className="inline-flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-700 select-none">
                          <input
                            type="radio"
                            name="referrerType"
                            value="vang_lai"
                            checked={referrerType === 'vang_lai'}
                            onChange={() => {
                              setReferrerType('vang_lai');
                              setReferrer('');
                            }}
                            className="w-4 h-4 text-blue-600 border-slate-300 focus:ring-blue-500 cursor-pointer"
                          />
                          <span>Người vãng lai</span>
                        </label>
                        <label className="inline-flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-700 select-none">
                          <input
                            type="radio"
                            name="referrerType"
                            value="co_nguoi_gioi_thieu"
                            checked={referrerType === 'co_nguoi_gioi_thieu'}
                            onChange={() => setReferrerType('co_nguoi_gioi_thieu')}
                            className="w-4 h-4 text-blue-600 border-slate-300 focus:ring-blue-500 cursor-pointer"
                          />
                          <span>Người giới thiệu</span>
                        </label>
                      </div>

                      {/* 1) Khi click Người giới thiệu mới có nút Clear */}
                      {referrerType === 'co_nguoi_gioi_thieu' && (
                        <button
                          type="button"
                          onClick={clearSavedProfile}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200/80 rounded-lg transition-all cursor-pointer shadow-2xs active:scale-95 shrink-0"
                          title="Xóa trắng 4 trường thông tin đã lưu"
                        >
                          <RotateCcw className="w-3 h-3" />
                          <span>Clear</span>
                        </button>
                      )}
                    </div>

                    {referrerType === 'co_nguoi_gioi_thieu' && (
                      <div className="relative animate-in fade-in duration-200">
                        <Users className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                        <input
                          type="text"
                          required={referrerType === 'co_nguoi_gioi_thieu'}
                          value={referrer}
                          onChange={(e) => handleReferrerSearch(e.target.value)}
                          onFocus={() => { if (referrerSearchResults.length > 0) setShowReferrerDropdown(true); }}
                          onBlur={() => {
                            setTimeout(() => setShowReferrerDropdown(false), 200);
                            if (typeof document !== 'undefined') {
                              const maxAge = 31536000;
                              document.cookie = `user_referrer=${encodeURIComponent(referrer.trim())}; path=/; max-age=${maxAge}; SameSite=Lax`;
                              document.cookie = `reg_referrer=${encodeURIComponent(referrer.trim())}; path=/; max-age=${maxAge}; SameSite=Lax`;
                            }
                          }}
                          placeholder="Nhập đúng SĐT của User thành viên mời"
                          className="w-full pl-10 pr-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all shadow-xs"
                        />
                        {isSearchingReferrer && (
                          <div className="absolute right-3.5 top-1/2 -translate-y-1/2">
                            <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
                          </div>
                        )}
                        {showReferrerDropdown && referrerSearchResults.length > 0 && (
                          <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg z-50 max-h-48 overflow-y-auto">
                            {referrerSearchResults.map((member) => (
                              <button
                                key={member.id}
                                type="button"
                                onMouseDown={(e) => e.preventDefault()}
                                onClick={() => {
                                  setReferrer(`${member.full_name} (${member.phone})`);
                                  setShowReferrerDropdown(false);
                                }}
                                className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-blue-50 transition-colors text-xs cursor-pointer border-b border-slate-50 last:border-0"
                              >
                                <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                                  <User className="w-3.5 h-3.5 text-blue-600" />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className="font-semibold text-slate-900 text-xs truncate">{member.full_name}</p>
                                  <p className="text-[11px] text-slate-500">{member.phone}</p>
                                </div>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

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
                        onBlur={() => {
                          if (fullName.trim() && typeof document !== 'undefined') {
                            const maxAge = 31536000;
                            document.cookie = `user_name=${encodeURIComponent(fullName.trim())}; path=/; max-age=${maxAge}; SameSite=Lax`;
                            document.cookie = `reg_fullname=${encodeURIComponent(fullName.trim())}; path=/; max-age=${maxAge}; SameSite=Lax`;
                          }
                        }}
                        placeholder="Nhập họ và tên"
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
                        onBlur={() => {
                          if (phone.trim() && typeof document !== 'undefined') {
                            const maxAge = 31536000;
                            document.cookie = `user_phone=${encodeURIComponent(phone.trim())}; path=/; max-age=${maxAge}; SameSite=Lax`;
                            document.cookie = `reg_phone=${encodeURIComponent(phone.trim())}; path=/; max-age=${maxAge}; SameSite=Lax`;
                          }
                        }}
                        placeholder="Nhập số điện thoại"
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
                      onBlur={() => {
                        if (notes.trim() && typeof document !== 'undefined') {
                          const maxAge = 31536000;
                          document.cookie = `user_notes=${encodeURIComponent(notes.trim())}; path=/; max-age=${maxAge}; SameSite=Lax`;
                          document.cookie = `reg_notes=${encodeURIComponent(notes.trim())}; path=/; max-age=${maxAge}; SameSite=Lax`;
                        }
                      }}
                      placeholder="Nhập ghi chú (nếu có)"
                      className="w-full p-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none"
                    />
                  </div>

                  {/* Checkbox Suất ăn trưa tiệc trà (Mục 10 - Hình 13.2 & 13.3) */}
                  <div className="flex items-center gap-2.5 p-3 bg-amber-50/80 border border-amber-200/80 rounded-xl">
                    <input
                      type="checkbox"
                      id="teaBreakCheckbox"
                      checked={hasTeaBreak}
                      onChange={(e) => setHasTeaBreak(e.target.checked)}
                      className="w-4 h-4 rounded border-amber-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                    />
                    <label htmlFor="teaBreakCheckbox" className="text-xs text-amber-950 font-semibold cursor-pointer select-none">
                      Đăng ký suất ăn trưa tiệc trà (50.000 đ/suất)
                    </label>
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
