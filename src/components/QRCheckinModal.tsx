'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  User,
  Phone,
  Mail,
  Calendar,
  X,
  QrCode,
  Download,
  AlertCircle,
  Loader2,
  CheckCircle2,
  Sparkles,
  Ticket,
  MapPin,
  Clock,
  FileText,
  Users,
  Info,
  ShieldCheck,
  UserPlus,
  ArrowLeft,
  ArrowRight,
  Printer,
  RotateCcw,
} from 'lucide-react';
import SystemLogo from './SystemLogo';

interface InviterInfo {
  name: string;
  refCode: string;
  id?: number | null;
}

interface QRCheckinModalProps {
  isOpen: boolean;
  onClose: () => void;
  inviter: InviterInfo;
  defaultEvent: {
    id: number;
    name: string;
    code?: string | null;
    event_date: string;
    start_time?: string | null;
    end_time?: string | null;
    location?: string | null;
    image_url?: string | null;
    speaker?: string | null;
  };
}

const STORAGE_KEY = 'nghieng_registered_user';

export default function QRCheckinModal({
  isOpen,
  onClose,
  inviter,
  defaultEvent,
}: QRCheckinModalProps) {
  const router = useRouter();
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [notes, setNotes] = useState('');
  const [referrerType, setReferrerType] = useState<'vang_lai' | 'co_nguoi_gioi_thieu'>('vang_lai');
  const [referrer, setReferrer] = useState('');
  const [referrerSearchResults, setReferrerSearchResults] = useState<Array<{ id: number; full_name: string; phone: string; ref_code?: string }>>([]);
  const [isSearchingReferrer, setIsSearchingReferrer] = useState(false);
  const [showReferrerDropdown, setShowReferrerDropdown] = useState(false);
  const [hasTeaBreak, setHasTeaBreak] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [duplicateInfo, setDuplicateInfo] = useState<{
    isDuplicate: boolean;
    duplicateType?: string;
    registration?: any;
  } | null>(null);
  const [registrationResult, setRegistrationResult] = useState<any>(null);

  // Khôi phục thông tin từ cookies hoặc localStorage cho 4 trường:
  // 1. Người giới thiệu, 2. Họ và tên, 3. Số điện thoại, 4. Ghi chú
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

      // Người giới thiệu: ưu tiên người mời từ URL (?ref=...) nếu có, nếu không lấy từ cookies đã lưu
      const isDefaultInviter =
        !inviter ||
        !inviter.refCode ||
        inviter.refCode === 'N_0000000001' ||
        (inviter.name && (inviter.name.includes('Nhung') || inviter.name.includes('Ban tổ chức')));

      if (!isDefaultInviter && inviter?.name) {
        setReferrer(`${inviter.name} (${inviter.refCode})`);
        setReferrerType('co_nguoi_gioi_thieu');
      } else if (savedReferrer && savedReferrer !== 'Khách vãng lai') {
        setReferrer(savedReferrer);
        setReferrerType('co_nguoi_gioi_thieu');
      }
    } catch {
      // Ignore
    }
  }, [isOpen, inviter]);

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

  const handleSelectReferrer = (member: { id: number; full_name: string; phone: string; ref_code?: string }) => {
    setReferrer(`${member.full_name} (${member.ref_code || member.phone})`);
    setShowReferrerDropdown(false);
    setReferrerSearchResults([]);
  };

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setDuplicateInfo(null);

    if (!fullName.trim()) {
      setErrorMsg('Vui lòng nhập họ và tên của bạn');
      return;
    }

    const cleanPhone = phone.trim().replace(/\s+/g, '');
    if (!cleanPhone || cleanPhone.length < 9) {
      setErrorMsg('Vui lòng nhập số điện thoại hợp lệ');
      return;
    }

    setIsSubmitting(true);
    try {
      const finalReferrer =
        referrerType === 'vang_lai'
          ? 'Khách vãng lai'
          : (referrer.trim() || 'Người giới thiệu');

      const res = await fetch('/api/events/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventId: defaultEvent.id,
          fullName: fullName.trim(),
          phone: cleanPhone,
          email: email.trim() || undefined,
          company: referrerType === 'vang_lai' ? 'Khách vãng lai' : 'Khách mời tham dự',
          referrer: finalReferrer,
          notes: notes.trim() || undefined,
          isTodayCheckin: false,
          has_tea_break: hasTeaBreak,
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
        throw new Error(data.error || 'Đăng ký thất bại, vui lòng thử lại');
      }

      // Vẫn lưu cookies ở 4 trường này:
      // 1. Người giới thiệu, 2. Họ và tên, 3. Số điện thoại, 4. Ghi chú
      try {
        const maxAge = 31536000; // 1 năm
        const setCookie = (name: string, val: string) => {
          document.cookie = `${name}=${encodeURIComponent(val)}; path=/; max-age=${maxAge}; SameSite=Lax`;
        };
        const finalReferrerVal = referrerType === 'vang_lai' ? '' : referrer.trim();
        setCookie('user_name', fullName.trim());
        setCookie('reg_fullname', fullName.trim());
        setCookie('user_phone', cleanPhone);
        setCookie('reg_phone', cleanPhone);
        setCookie('user_referrer', finalReferrerVal);
        setCookie('reg_referrer', finalReferrerVal);
        setCookie('user_notes', notes.trim());
        setCookie('reg_notes', notes.trim());

        localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({
            fullName: fullName.trim(),
            phone: cleanPhone,
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

      setRegistrationResult(data);
    } catch (err: any) {
      setErrorMsg(err.message || 'Có lỗi xảy ra khi gửi thông tin');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCloseModal = () => {
    onClose();
    if (registrationResult) {
      router.refresh();
    }
  };

  const handleClearForm = () => {
    // Xóa trắng 4 trường theo đúng 4 mũi tên chỉ định trong ảnh:
    // 1. Người giới thiệu, 2. Họ và tên, 3. Số điện thoại, 4. Ghi chú
    setReferrer('');
    setFullName('');
    setPhone('');
    setNotes('');
    setEmail('');
    setErrorMsg('');
    setDuplicateInfo(null);

    // Xóa cookies & localStorage của 4 trường này
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
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Ignore
    }
  };

  const formatDateDisplay = (dateStr?: string) => {
    if (!dateStr) return '30/05/2026 (Thứ năm)';
    try {
      const d = new Date(dateStr);
      const days = ['Chủ nhật', 'Thứ hai', 'Thứ ba', 'Thứ tư', 'Thứ năm', 'Thứ sáu', 'Thứ bảy'];
      const dayName = days[d.getDay()];
      const day = d.getDate().toString().padStart(2, '0');
      const month = (d.getMonth() + 1).toString().padStart(2, '0');
      const year = d.getFullYear();
      return `${day}/${month}/${year} (${dayName})`;
    } catch {
      return dateStr;
    }
  };

  const eventCode = defaultEvent.code || `EVT2026${String(defaultEvent.id).padStart(4, '0')}`;

  const qrScanUrl = useMemo(() => {
    let origin = 'https://sukien-rouge.vercel.app';
    if (typeof window !== 'undefined' && window.location?.origin) {
      origin = window.location.origin;
    }
    const hasSpecificRef = inviter?.refCode && inviter.refCode !== 'N_0000000001';
    const refQuery = hasSpecificRef ? `ref=${encodeURIComponent(inviter.refCode)}` : 'ref';
    return `${origin}/qr-checkin?${refQuery}&event=${defaultEvent.id}`;
  }, [inviter?.refCode, defaultEvent.id]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl max-h-[92vh] overflow-y-auto bg-white rounded-3xl shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-200">
        {/* Mobile Top Hero Banner (media_1789789506527.png) */}
        <div className="md:hidden relative w-full overflow-hidden rounded-t-3xl rounded-b-[24px] shadow-sm">
          {/* Background image & gradient overlay */}
          <div className="absolute inset-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={defaultEvent.image_url || '/events/hero-banner.jpg'}
              alt={defaultEvent.name}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-slate-950/85 via-slate-900/75 to-slate-950/90" />
          </div>

          {/* Banner content */}
          <div className="relative z-10 p-4 sm:p-5">
            {/* Top row: NGHIÊNG Complex Logo & Close Button */}
            <div className="flex items-center justify-between">
              {/* Logo */}
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

              {/* Close Button on Mobile */}
              <button
                type="button"
                onClick={handleCloseModal}
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
              Đăng ký tham dự sự kiện
            </h2>

            {/* Subtitle */}
            <p className="text-xs text-slate-200/90 leading-relaxed">
              Vui lòng điền thông tin để đăng ký tham dự sự kiện.
              <br />
              Sau khi đăng ký thành công, bạn sẽ nhận được mã QR để check-in tại sự kiện.
            </p>
          </div>
        </div>

        {/* Desktop Close Button */}
        <button
          onClick={handleCloseModal}
          type="button"
          className="hidden md:flex absolute top-4 right-4 z-20 w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 items-center justify-center transition-colors shadow-xs"
        >
          <X className="w-4 h-4" />
        </button>

        {!registrationResult ? (
          /* FORM VIEW - 2 COLUMNS CHUẨN 100% THEO HÌNH 4.7 */
          <div className="grid grid-cols-1 md:grid-cols-12 min-h-[520px]">
            {/* Left Column: Form & Event Card */}
            <div className="md:col-span-7 p-4 sm:p-6 md:p-8 flex flex-col justify-between space-y-5">
              <div className="space-y-4">
                {/* Desktop Header with blue calendar icon */}
                <div className="hidden md:flex items-start gap-3.5 pr-6">
                  <div className="w-11 h-11 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0 shadow-xs">
                    <Calendar className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-lg sm:text-xl font-bold text-slate-900 leading-snug">
                      Đăng ký tham dự sự kiện
                    </h3>
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                      Vui lòng điền thông tin để đăng ký tham dự sự kiện.
                      <br className="hidden sm:inline" /> Sau khi đăng ký thành công, bạn sẽ nhận được mã QR để check-in tại sự kiện.
                    </p>
                  </div>
                </div>

                {/* Desktop Mini-Card (Hình 4.7) */}
                <div className="hidden md:flex bg-slate-50/90 border border-slate-200/80 rounded-2xl p-3 sm:p-4 items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden bg-slate-200 shrink-0 border border-slate-200 shadow-xs relative">
                      {defaultEvent.image_url ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          src={defaultEvent.image_url}
                          alt={defaultEvent.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-blue-600 to-indigo-800 flex items-center justify-center text-white font-bold text-xs p-1 text-center">
                          NGHIENG
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 space-y-1">
                      <h4 className="text-xs sm:text-sm font-bold text-slate-900 line-clamp-2 leading-tight">
                        {defaultEvent.name}
                      </h4>
                      <div>
                        <span className="inline-flex items-center gap-1 bg-blue-600 text-white text-[10px] font-semibold px-2 py-0.5 rounded-md shadow-xs">
                          <Users className="w-2.5 h-2.5" />
                          <span>Sự kiện sắp diễn ra</span>
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Event QR Code preview */}
                  <div className="flex flex-col items-center shrink-0 border-l border-slate-200 pl-3">
                    <a
                      href={qrScanUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      title={`Quét mã QR hoặc nhấn để mở link đăng ký: ${qrScanUrl}`}
                      className="p-1 bg-white border border-slate-200 rounded-lg shadow-xs hover:border-blue-400 transition-colors cursor-pointer block group"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qrScanUrl)}`}
                        alt={`Mã QR ${eventCode}`}
                        className="w-12 h-12 sm:w-14 sm:h-14 object-contain group-hover:scale-105 transition-transform"
                      />
                    </a>
                    <span className="text-[9px] font-mono text-slate-500 mt-1 max-w-[80px] truncate text-center" title={eventCode}>
                      {eventCode}
                    </span>
                  </div>
                </div>

                {/* Mobile Event Card with QR & Curved Arrow (media_1789789506527.png) */}
                <div className="md:hidden bg-[#f0f6ff] border border-blue-100 rounded-2xl p-3 sm:p-3.5 flex items-center justify-between gap-2.5 shadow-2xs">
                  {/* Left: QR Code Preview */}
                  <a
                    href={qrScanUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    title={`Quét mã QR hoặc nhấn để mở link đăng ký: ${qrScanUrl}`}
                    className="w-[66px] h-[66px] bg-white rounded-xl p-1.5 border border-blue-100/70 shadow-xs shrink-0 flex items-center justify-center hover:border-blue-400 transition-colors cursor-pointer"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qrScanUrl)}`}
                      alt={`Mã QR ${eventCode}`}
                      className="w-full h-full object-contain"
                    />
                  </a>

                  {/* Middle: Event Name & Badge */}
                  <div className="min-w-0 flex-1 space-y-1">
                    <h4 className="text-xs sm:text-sm font-bold text-slate-900 line-clamp-2 leading-tight">
                      {defaultEvent.name}
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

                {errorMsg && (
                  <div className="bg-rose-50 border border-rose-200 text-rose-700 px-3.5 py-2.5 rounded-xl text-xs space-y-2">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-rose-600" />
                      <span className="font-medium leading-relaxed">{errorMsg}</span>
                    </div>
                    {duplicateInfo?.duplicateType === 'SAME_NAME_SAME_PHONE' && duplicateInfo.registration && (
                      <div className="pl-6 pt-0.5">
                        <button
                          type="button"
                          onClick={() => {
                            setRegistrationResult({
                              success: true,
                              registration: duplicateInfo.registration,
                              message: 'Thông tin vé đã đăng ký của bạn',
                            });
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

                {/* Registration Form */}
                <form onSubmit={handleSubmit} className="space-y-3.5">
                  {/* Người giới thiệu (Hình 2) */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Người giới thiệu
                    </label>
                    <div className="flex items-center justify-between gap-2 mb-2">
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
                          onClick={handleClearForm}
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
                                onClick={() => handleSelectReferrer(member)}
                                className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-blue-50 transition-colors text-xs cursor-pointer border-b border-slate-50 last:border-0"
                              >
                                <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                                  <User className="w-3.5 h-3.5 text-blue-600" />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className="font-semibold text-slate-900 text-xs truncate">{member.full_name}</p>
                                  <p className="text-[11px] text-slate-500">{member.phone} {member.ref_code ? `(${member.ref_code})` : ''}</p>
                                </div>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Họ và tên của bạn */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-slate-400" />
                      <span>Họ và tên của bạn <span className="text-rose-500">*</span></span>
                    </label>
                    <div className="relative">
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
                        className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all shadow-xs"
                      />
                    </div>
                  </div>

                  {/* Số điện thoại */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-slate-400" />
                      <span>Số điện thoại <span className="text-rose-500">*</span></span>
                    </label>
                    <div className="relative">
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
                        className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all shadow-xs"
                      />
                    </div>
                  </div>

                  {/* Ghi chú (tùy chọn) (Hình 2) */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-semibold text-slate-700">
                        Ghi chú <span className="text-slate-400 font-normal">(tùy chọn)</span>
                      </label>
                      <span className="text-[11px] text-slate-400">{notes.length}/500</span>
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
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all shadow-xs resize-none"
                    />
                  </div>

                  {/* Checkbox Đăng ký suất ăn trưa tiệc trà (Hình 6) */}
                  <div className="flex items-center gap-2.5 p-3 bg-amber-50/80 border border-amber-200/80 rounded-xl shadow-2xs">
                    <input
                      type="checkbox"
                      id="teaBreakCheckbox"
                      checked={hasTeaBreak}
                      onChange={(e) => setHasTeaBreak(e.target.checked)}
                      className="w-4 h-4 rounded border-amber-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                    />
                    <label
                      htmlFor="teaBreakCheckbox"
                      className="text-xs text-amber-950 font-semibold cursor-pointer select-none"
                    >
                      Đăng ký suất ăn trưa tiệc trà (50.000 đ/suất)
                    </label>
                  </div>

                  {/* Nút Xác nhận tham dự */}
                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full py-3 px-5 bg-[#2563eb] hover:bg-[#1d4ed8] text-white font-bold rounded-xl text-xs sm:text-sm transition-all shadow-md shadow-blue-500/25 active:scale-98 flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Đang xử lý đăng ký...</span>
                        </>
                      ) : (
                        <>
                          <QrCode className="w-4 h-4" />
                          <span>XÁC NHẬN THAM DỰ</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>

              {/* Thông báo dưới form */}
              <div className="bg-blue-50/70 border border-blue-100 rounded-xl p-3 flex items-start gap-2.5 text-[11px] text-blue-900">
                <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <span>
                  Sau khi đăng ký thành công, mã QR sẽ được gửi về Zalo hoặc hiển thị tại đây. Vui lòng mang theo mã QR để check-in tại sự kiện.
                </span>
              </div>
            </div>

            {/* Right Column: Thông tin & Lịch trình sự kiện (Hình 4.7) */}
            <div className="md:col-span-5 bg-[#f8faff] p-6 sm:p-8 border-t md:border-t-0 md:border-l border-slate-100 flex flex-col justify-between space-y-6">
              <div className="space-y-5">
                {/* THÔNG TIN SỰ KIỆN */}
                <div>
                  <h4 className="text-[11px] font-bold text-blue-900 tracking-wider uppercase mb-3">
                    THÔNG TIN SỰ KIỆN
                  </h4>
                  <div className="space-y-3 text-xs text-slate-700">
                    <div className="flex items-start gap-2.5">
                      <Calendar className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                      <div>
                        <div className="font-semibold text-slate-800">Thời gian</div>
                        <div className="text-slate-600 mt-0.5">
                          {formatDateDisplay(defaultEvent.event_date)} • {defaultEvent.start_time || '08:30'} - {defaultEvent.end_time || '11:30'}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-start gap-2.5">
                      <MapPin className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                      <div>
                        <div className="font-semibold text-slate-800">Địa điểm</div>
                        <div className="text-slate-600 mt-0.5">
                          {defaultEvent.location || 'Trung tâm Hội nghị Quốc gia, Hà Nội'}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-start gap-2.5">
                      <FileText className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                      <div>
                        <div className="font-semibold text-slate-800">Diễn giả</div>
                        <div className="text-slate-600 mt-0.5">
                          {defaultEvent.speaker || 'Các chuyên gia từ Nghiêng Complex'}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-start gap-2.5">
                      <Users className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                      <div>
                        <div className="font-semibold text-slate-800">Đối tượng tham dự</div>
                        <div className="text-slate-600 mt-0.5">
                          Thành viên, Đối tác, Khách mời
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="border-t border-slate-200/70" />

                {/* LỊCH TRÌNH SỰ KIỆN */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-[11px] font-bold text-slate-800 tracking-wider uppercase">
                      LỊCH TRÌNH SỰ KIỆN
                    </h4>
                    <span className="text-[11px] text-blue-600 font-medium cursor-pointer hover:underline">
                      Xem chi tiết
                    </span>
                  </div>

                  {/* Timeline with connected line */}
                  <div className="relative pl-4 space-y-3 text-xs before:absolute before:left-[5px] before:top-1.5 before:bottom-1.5 before:w-0.5 before:bg-blue-200">
                    <div className="relative flex items-center justify-between">
                      <div className="absolute -left-[15px] w-2.5 h-2.5 rounded-full bg-blue-600 border-2 border-white shadow-xs" />
                      <span className="font-medium text-slate-500">08:30 - 09:00</span>
                      <span className="font-semibold text-slate-800 text-right">Đón khách & Check-in</span>
                    </div>

                    <div className="relative flex items-center justify-between">
                      <div className="absolute -left-[15px] w-2.5 h-2.5 rounded-full bg-blue-600 border-2 border-white shadow-xs" />
                      <span className="font-medium text-slate-500">09:00 - 09:15</span>
                      <span className="font-semibold text-slate-800 text-right">Khai mạc</span>
                    </div>

                    <div className="relative flex items-center justify-between">
                      <div className="absolute -left-[15px] w-2.5 h-2.5 rounded-full bg-blue-600 border-2 border-white shadow-xs" />
                      <span className="font-medium text-slate-500">09:15 - 10:30</span>
                      <span className="font-semibold text-slate-800 text-right">Chia sẻ từ diễn giả</span>
                    </div>

                    <div className="relative flex items-center justify-between">
                      <div className="absolute -left-[15px] w-2.5 h-2.5 rounded-full bg-blue-600 border-2 border-white shadow-xs" />
                      <span className="font-medium text-slate-500">10:30 - 11:30</span>
                      <span className="font-semibold text-slate-800 text-right">Giao lưu & Kết nối</span>
                    </div>

                    <div className="relative flex items-center justify-between">
                      <div className="absolute -left-[15px] w-2.5 h-2.5 rounded-full bg-blue-600 border-2 border-white shadow-xs" />
                      <span className="font-medium text-slate-500">11:30</span>
                      <span className="font-semibold text-slate-800 text-right">Kết thúc</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom Card Alert */}
              <div className="bg-blue-100/60 border border-blue-200/60 text-blue-900 rounded-xl p-3 flex items-center gap-2.5 text-[11px]">
                <ShieldCheck className="w-4 h-4 text-blue-700 shrink-0" />
                <span>
                  Mã QR này sẽ được sử dụng để check-in tại sự kiện. Vui lòng giữ lại sau khi đăng ký.
                </span>
              </div>
            </div>
          </div>
        ) : (
          /* SUCCESS VIEW - E-TICKET KÈM MÃ QR CODE */
          <div className="p-6 sm:p-8 space-y-5 text-center max-w-lg mx-auto">
            <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-sm">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div>
              <h3 className="text-xl font-bold text-slate-900">
                Đăng ký thành công!
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Vé tham dự điện tử đã sẵn sàng. Vui lòng xuất trình mã QR tại bàn check-in.
              </p>
            </div>

            {/* Ticket Card */}
            <div className="bg-gradient-to-b from-blue-50/70 to-slate-50 border border-blue-100 rounded-2xl p-5 text-left space-y-4 relative overflow-hidden shadow-sm">
              <div className="flex items-center justify-between border-b border-blue-100/80 pb-3">
                <div className="h-6 flex items-center">
                  <SystemLogo className="h-5 w-auto" />
                </div>
                <span className="text-xs font-bold text-blue-700 bg-blue-100/80 px-2.5 py-0.5 rounded-full">
                  Vé Tham Dự
                </span>
              </div>

              {/* QR Code */}
              <div className="flex flex-col items-center justify-center py-2">
                <div className="p-3 bg-white border border-slate-200 rounded-2xl shadow-sm">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(
                      registrationResult.registration?.guestCode || 'QR-NGHIENG-CHECKIN'
                    )}`}
                    alt="QR Check-in"
                    className="w-36 h-36 object-contain"
                  />
                </div>
                <span className="text-xs font-mono font-bold text-slate-800 mt-2 bg-white px-3 py-1 rounded-lg border border-slate-200 shadow-xs">
                  {registrationResult.registration?.guestCode || 'DK-2026-CHECKIN'}
                </span>
              </div>

              {/* Participant Details */}
              <div className="space-y-1.5 text-xs text-slate-600 pt-1 border-t border-slate-200/60">
                <div className="flex justify-between">
                  <span className="text-slate-400">Khách mời:</span>
                  <span className="font-bold text-slate-900">{fullName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Số điện thoại:</span>
                  <span className="font-semibold text-slate-800">{phone}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Người giới thiệu:</span>
                  <span className="font-semibold text-blue-600">
                    {referrerType === 'vang_lai' ? 'Khách vãng lai' : (referrer || inviter.name || 'Người giới thiệu')}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Sự kiện:</span>
                  <span className="font-semibold text-slate-800 truncate max-w-[200px]" title={defaultEvent.name}>
                    {defaultEvent.name}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Thời gian:</span>
                  <span className="font-semibold text-slate-800">{formatDateDisplay(defaultEvent.event_date)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Suất ăn tiệc trà:</span>
                  <span className="font-semibold text-slate-800">
                    {hasTeaBreak ? 'Đã đăng ký (50.000 đ/suất)' : 'Không đăng ký'}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => window.print()}
                className="flex-1 py-3 px-4 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold rounded-xl text-xs transition-colors flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
              >
                <Download className="w-4 h-4 text-slate-500" />
                <span>Tải vé</span>
              </button>
              <button
                type="button"
                onClick={handleCloseModal}
                className="flex-1 py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-xs transition-colors shadow-sm shadow-blue-500/20 cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
