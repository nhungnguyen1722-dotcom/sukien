'use client';

import React, { useState, useEffect } from 'react';
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
    event_date: string;
    start_time?: string | null;
    end_time?: string | null;
    location?: string | null;
  };
}

const STORAGE_KEY = 'nghieng_registered_user';

export default function QRCheckinModal({
  isOpen,
  onClose,
  inviter,
  defaultEvent,
}: QRCheckinModalProps) {
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [registrationResult, setRegistrationResult] = useState<any>(null);

  // Auto-fill from localStorage if previously registered
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
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
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

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '30/05/2026';
    const d = new Date(dateStr);
    return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-100 animate-in zoom-in-95 duration-200">
        {/* Close Button */}
        <button
          onClick={onClose}
          type="button"
          className="absolute top-4 right-4 z-10 w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-colors shadow-xs"
        >
          <X className="w-5 h-5" />
        </button>

        {!registrationResult ? (
          /* FORM VIEW - CHUẨN 100% THEO HÌNH 2 (image2.jpeg) */
          <div className="p-6 sm:p-8 space-y-5">
            {/* Header with user icon in rounded box */}
            <div className="flex items-start gap-3.5 pr-8">
              <div className="w-11 h-11 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">
                <User className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg sm:text-xl font-bold text-slate-900 leading-snug">
                  Đăng ký tham dự sự kiện
                </h3>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  Vui lòng điền thông tin để đăng ký tham dự sự kiện. Bạn sẽ nhận được mã QR để check-in tại sự kiện.
                </p>
              </div>
            </div>

            {/* Khung người mời (Blue Banner Box) */}
            <div className="bg-blue-50/70 border border-blue-100 rounded-2xl p-4 flex items-center gap-3.5">
              <div className="w-9 h-9 rounded-full bg-white text-blue-600 flex items-center justify-center flex-shrink-0 shadow-xs">
                <User className="w-4.5 h-4.5" />
              </div>
              <div className="min-w-0">
                <div className="text-[11px] text-slate-500 font-medium">
                  Bạn đang được mời tham dự bởi
                </div>
                <div className="text-sm font-bold text-slate-900 truncate">
                  {inviter.name} ({inviter.refCode})
                </div>
              </div>
            </div>

            {errorMsg && (
              <div className="bg-rose-50 border border-rose-200 text-rose-700 px-3.5 py-2.5 rounded-xl text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4 pt-1">
              {/* Họ và tên của bạn */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-slate-400" />
                  <span>Họ và tên của bạn <span className="text-rose-500">*</span></span>
                </label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Trần Thị Minh"
                  className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all shadow-xs"
                />
              </div>

              {/* Số điện thoại */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                  <span>Số điện thoại <span className="text-rose-500">*</span></span>
                </label>
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="0901234567"
                  className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all shadow-xs"
                />
              </div>

              {/* Nút Xác nhận tham dự */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3.5 px-5 bg-[#2563eb] hover:bg-[#1d4ed8] text-white font-bold rounded-xl text-sm transition-all shadow-md shadow-blue-500/25 active:scale-98 flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Đang xử lý đăng ký...</span>
                    </>
                  ) : (
                    <>
                      <Calendar className="w-4.5 h-4.5" />
                      <span>XÁC NHẬN THAM DỰ</span>
                    </>
                  )}
                </button>
              </div>
            </form>

            <div className="text-center pt-1">
              <span className="text-[11px] text-slate-400">
                Sự kiện: <strong className="text-slate-600">{defaultEvent.name}</strong>
              </span>
            </div>
          </div>
        ) : (
          /* SUCCESS VIEW - E-TICKET KÈM MÃ QR CODE */
          <div className="p-6 sm:p-8 space-y-5 text-center">
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
                  <span className="font-semibold text-slate-800">{formatDate(defaultEvent.event_date)}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => window.print()}
                className="flex-1 py-3 px-4 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold rounded-xl text-xs transition-colors flex items-center justify-center gap-1.5 shadow-xs"
              >
                <Download className="w-4 h-4 text-slate-500" />
                <span>Tải vé</span>
              </button>
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-xs transition-colors shadow-sm shadow-blue-500/20"
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
