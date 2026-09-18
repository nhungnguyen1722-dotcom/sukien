'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  User,
  Phone,
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
  const [hasTeaBreak, setHasTeaBreak] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [duplicateInfo, setDuplicateInfo] = useState<{
    isDuplicate: boolean;
    duplicateType?: string;
    registration?: any;
  } | null>(null);
  const [registrationResult, setRegistrationResult] = useState<any>(null);

  // Auto-fill from localStorage if previously registered
  useEffect(() => {
    if (!isOpen) {
      setRegistrationResult(null);
      setErrorMsg('');
      setDuplicateInfo(null);
      return;
    }

    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.phone) {
          setPhone(parsed.phone || '');
          setFullName(parsed.fullName || '');
          if (parsed.hasTeaBreak !== undefined) {
            setHasTeaBreak(Boolean(parsed.hasTeaBreak));
          }
        }
      }
    } catch {
      // Ignore
    }
  }, [isOpen]);

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
      const res = await fetch('/api/events/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventId: defaultEvent.id,
          fullName: fullName.trim(),
          phone: cleanPhone,
          referrer: `${inviter.name} (${inviter.refCode})`,
          company: 'Khách mời tham dự',
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

      // Save to localStorage for single-tap convenience
      try {
        localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({
            phone: cleanPhone,
            fullName: fullName.trim(),
            referrer: `${inviter.name} (${inviter.refCode})`,
            hasTeaBreak: hasTeaBreak,
            registeredAt: new Date().toISOString(),
          })
        );
      } catch {
        // Ignore
      }

      // Tự động chuyển sang trạng thái đăng nhập cho khách hàng sau khi đăng ký thành công
      try {
        const role = data.role || data.user?.role || 'Thành viên';
        const uName = data.user?.fullName || fullName.trim();
        const uPhone = data.user?.phone || cleanPhone;
        const uEmail = data.user?.email || '';
        const uId = data.user?.id ? String(data.user.id) : '';
        const uRefCode = data.ref_code || data.user?.ref_code || (cleanPhone ? `N_${cleanPhone}` : 'N_0000000001');
        const maxAge = 31536000;

        document.cookie = `user_role=${encodeURIComponent(role)}; path=/; max-age=${maxAge}; SameSite=Lax`;
        document.cookie = `user_name=${encodeURIComponent(uName)}; path=/; max-age=${maxAge}; SameSite=Lax`;
        document.cookie = `user_phone=${encodeURIComponent(uPhone)}; path=/; max-age=${maxAge}; SameSite=Lax`;
        if (uEmail) {
          document.cookie = `user_email=${encodeURIComponent(uEmail)}; path=/; max-age=${maxAge}; SameSite=Lax`;
        }
        if (uId) {
          document.cookie = `user_id=${uId}; path=/; max-age=${maxAge}; SameSite=Lax`;
        }
        document.cookie = `user_ref_code=${encodeURIComponent(uRefCode)}; path=/; max-age=${maxAge}; SameSite=Lax`;
        document.cookie = `ref_code=${encodeURIComponent(uRefCode)}; path=/; max-age=${maxAge}; SameSite=Lax`;
        document.cookie = `user_ref=${encodeURIComponent(uRefCode)}; path=/; max-age=${maxAge}; SameSite=Lax`;

        localStorage.setItem('nghieng_auth_role', role);
        localStorage.setItem('nghieng_user_name', uName);
        localStorage.setItem('nghieng_user_phone', uPhone);
        if (uEmail) localStorage.setItem('nghieng_user_email', uEmail);
        if (uId) localStorage.setItem('nghieng_user_id', uId);
        localStorage.setItem('nghieng_user_ref_code', uRefCode);
        localStorage.setItem('ref_code', uRefCode);

        // Dispatch sự kiện để PublicHeaderAuth và EventHomePage cập nhật tức thì
        window.dispatchEvent(new Event('nghieng-auth-change'));
        window.dispatchEvent(new Event('storage'));
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl max-h-[92vh] overflow-y-auto bg-white rounded-3xl shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-200">
        {/* Close Button */}
        <button
          onClick={handleCloseModal}
          type="button"
          className="absolute top-4 right-4 z-20 w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-colors shadow-xs"
        >
          <X className="w-4 h-4" />
        </button>

        {!registrationResult ? (
          /* FORM VIEW - 2 COLUMNS CHUẨN 100% THEO HÌNH 4.7 */
          <div className="grid grid-cols-1 md:grid-cols-12 min-h-[520px]">
            {/* Left Column: Form & Event Card */}
            <div className="md:col-span-7 p-6 sm:p-8 flex flex-col justify-between space-y-5">
              <div className="space-y-4">
                {/* Header with blue calendar icon */}
                <div className="flex items-start gap-3.5 pr-6">
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

                {/* Event Summary Mini-Card (Hình 4.7) */}
                <div className="bg-slate-50/90 border border-slate-200/80 rounded-2xl p-3 sm:p-4 flex items-center justify-between gap-3">
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
                    <div className="p-1 bg-white border border-slate-200 rounded-lg shadow-xs">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=90x90&data=${encodeURIComponent(eventCode)}`}
                        alt="QR Mã sự kiện"
                        className="w-12 h-12 sm:w-14 sm:h-14 object-contain"
                      />
                    </div>
                    <span className="text-[9px] font-mono text-slate-500 mt-1 max-w-[80px] truncate text-center" title={eventCode}>
                      {eventCode}
                    </span>
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
                  {/* Thông tin hiển thị về người mời (Hình 5) */}
                  {inviter && (
                    <div className="bg-[#f0f5ff] border border-blue-100 rounded-2xl p-3 sm:p-3.5 flex items-center gap-3 shadow-2xs">
                      <div className="w-10 h-10 rounded-xl bg-white text-blue-600 flex items-center justify-center flex-shrink-0 shadow-xs border border-blue-100/60">
                        <User className="w-5 h-5 text-blue-600" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[11px] sm:text-xs text-slate-500 font-normal leading-tight">
                          Bạn đang được mời tham dự bởi
                        </p>
                        <p className="text-xs sm:text-sm font-bold text-slate-900 leading-snug truncate mt-0.5">
                          {inviter.name} ({inviter.refCode})
                        </p>
                      </div>
                    </div>
                  )}

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
                        placeholder="Nhập số điện thoại"
                        className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all shadow-xs"
                      />
                    </div>
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
                  <span className="font-semibold text-blue-600">{inviter.name}</span>
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
