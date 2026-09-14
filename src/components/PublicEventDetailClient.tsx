'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  CalendarDays,
  Calendar,
  Clock,
  MapPin,
  Users,
  Share2,
  Check,
  CheckCircle2,
  ChevronRight,
  Sparkles,
  Ticket,
  Copy,
  Briefcase,
  Layers,
  GraduationCap,
  Award,
  X,
} from 'lucide-react';
import SystemLogo from './SystemLogo';
import EventRegistrationModal, { RegistrationEventData } from './EventRegistrationModal';

export interface PublicScheduleItem {
  id?: number | string;
  time: string;
  title: string;
  speaker?: string | null;
  description?: string | null;
}

interface PublicEventDetailClientProps {
  event: any;
  initialSchedules?: PublicScheduleItem[];
  inChargePersons?: any[];
  registrationCount?: number;
}

export default function PublicEventDetailClient({ event, initialSchedules, inChargePersons, registrationCount }: PublicEventDetailClientProps) {
  const [activeTab, setActiveTab] = useState<'intro' | 'content' | 'speakers' | 'target'>('intro');
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedRef, setCopiedRef] = useState(false);
  const [isShareMenuOpen, setIsShareMenuOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<{ id?: string; phone?: string; name?: string; ref_code?: string } | null>(null);

  useEffect(() => {
    try {
      const getCookie = (name: string) => {
        const match = document.cookie.match(new RegExp('(^|;\\s*)(' + name + ')=([^;]*)'));
        return match ? decodeURIComponent(match[3]) : null;
      };
      const cId = getCookie('user_id');
      const cPhone = getCookie('user_phone');
      const cName = getCookie('user_name');
      let cRef = getCookie('user_ref_code');
      if (!cRef && typeof window !== 'undefined') {
        cRef = localStorage.getItem('nghieng_user_ref_code');
      }
      if (!cRef && cId) {
        cRef = 'N_' + String(cId).padStart(10, '0');
      }
      if (cId || cPhone || cRef) {
        setCurrentUser({
          id: cId || undefined,
          phone: cPhone || undefined,
          name: cName || undefined,
          ref_code: cRef || 'N_0000000001',
        });
      }
    } catch {
      // Ignore
    }
  }, []);

  const eventDateObj = event.event_date ? new Date(event.event_date) : new Date();
  const day = eventDateObj.getDate();
  const month = eventDateObj.getMonth() + 1;
  const year = eventDateObj.getFullYear();
  const dateFormatted = `${day < 10 ? '0' + day : day}/${month < 10 ? '0' + month : month}/${year}`;
  const dayOfWeek = eventDateObj.toLocaleDateString('vi-VN', { weekday: 'long' });

  const timeDisplay = event.start_time && event.end_time
    ? `${event.start_time.slice(0, 5)} - ${event.end_time.slice(0, 5)}`
    : '08:30 - 11:30';

  const isEnded = event.status === 'Đã diễn ra' || event.status === 'Đã hoàn thành';

  const getShareUrl = () => {
    if (typeof window === 'undefined') return '';
    const origin = window.location.origin;
    // Khi đã đăng nhập: lấy ref_code của tài khoản (ví dụ N_0000000002)
    // Khi chưa đăng nhập: ID mặc định của nhungnguyen1722@gmail.com là N_0000000001
    const refCode = currentUser?.ref_code || 'N_0000000001';
    return `${origin}/qr-checkin?ref=${encodeURIComponent(refCode)}&event=${event.id}`;
  };

  const handleCopyLink = () => {
    try {
      navigator.clipboard.writeText(getShareUrl());
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 3000);
    } catch {
      // Ignore
    }
  };

  const handleCopyRefLink = () => {
    try {
      navigator.clipboard.writeText(getShareUrl());
      setCopiedRef(true);
      setTimeout(() => setCopiedRef(false), 3000);
    } catch {
      // Ignore
    }
  };

  const handleShareFacebook = () => {
    const url = encodeURIComponent(getShareUrl());
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${url}`, '_blank', 'width=600,height=400');
  };

  const handleShareZalo = () => {
    const url = encodeURIComponent(getShareUrl());
    window.open(`https://zalo.me/share?url=${url}`, '_blank', 'width=600,height=400');
  };

  const handleShareTelegram = () => {
    const url = encodeURIComponent(getShareUrl());
    const text = encodeURIComponent(event.name || 'Sự kiện');
    window.open(`https://t.me/share/url?url=${url}&text=${text}`, '_blank', 'width=600,height=400');
  };

  const handleShareTwitter = () => {
    const url = encodeURIComponent(getShareUrl());
    const text = encodeURIComponent(event.name || 'Sự kiện');
    window.open(`https://twitter.com/intent/tweet?url=${url}&text=${text}`, '_blank', 'width=600,height=400');
  };

  const scheduleItems = initialSchedules && initialSchedules.length > 0
    ? initialSchedules
    : [
        { time: '08:00 - 08:30', title: 'Đón tiếp đại biểu & Check-in', speaker: 'Ban Lễ tân' },
        { time: '08:30 - 09:00', title: 'Khai mạc chương trình & Giới thiệu đại biểu', speaker: 'MC sự kiện' },
        { time: '09:00 - 10:00', title: 'Phiên 1: Xu hướng phát triển và cơ hội cho doanh nghiệp', speaker: 'Nguyễn Văn A (Diễn giả)' },
        { time: '10:00 - 10:15', title: 'Giải lao & Networking mở rộng kết nối', speaker: 'Hội đồng chuyên gia' },
        { time: '10:15 - 11:00', title: 'Phiên 2: Chiến lược kết nối & hợp tác thực chiến', speaker: 'Trần Văn Mạnh' },
        { time: '11:00 - 11:30', title: 'Giao lưu, Q&A và bế mạc sự kiện', speaker: 'Ban tổ chức' },
      ];

  const targetAudiences = [
    { label: 'Chủ doanh nghiệp', icon: Briefcase },
    { label: 'Quản lý cấp cao', icon: Award },
    { label: 'Chuyên gia', icon: GraduationCap },
    { label: 'Nhà đầu tư', icon: Layers },
    { label: 'Cộng đồng WeLink', icon: Users },
  ];

  return (
    <div className="min-h-screen bg-[#f8fafc] text-gray-900 pb-16">
      {/* 2. BREADCRUMB / ĐIỀU HƯỚNG PHÂN CẤP (IMAGE 6) */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3">
          <nav className="flex items-center gap-2 text-xs sm:text-sm text-gray-500 font-medium overflow-x-auto whitespace-nowrap">
            <Link href="/" className="hover:text-blue-600 transition-colors">
              Trang chủ
            </Link>
            <ChevronRight className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
            <Link href="/#tat-ca-su-kien" className="hover:text-blue-600 transition-colors">
              Sự kiện
            </Link>
            <ChevronRight className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
            <span className="text-gray-900 font-semibold truncate max-w-md">
              {event.name}
            </span>
          </nav>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 pt-6 sm:pt-8 space-y-8">
        {/* 3. KHU VỰC THÔNG TIN CHÍNH (CHIA 2 CỘT - IMAGE 6) */}
        <div className="bg-white rounded-3xl border border-gray-100 p-6 sm:p-8 shadow-sm">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Cột trái: Ảnh sự kiện lớn + Badge trạng thái + Mobile Share (Mục 12/13) */}
            <div className="lg:col-span-6">
              <div className="relative rounded-2xl overflow-hidden h-72 sm:h-96 w-full bg-slate-100 shadow-md border border-slate-200">
                {event.image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={event.image_url}
                    alt={event.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center p-8 bg-blue-50">
                    <SystemLogo className="max-h-32 w-auto object-contain" />
                  </div>
                )}
                <span className="absolute top-4 left-4 px-3.5 py-1 rounded-lg text-xs font-bold bg-[#2563eb] text-white shadow-md">
                  {event.status || 'Sắp diễn ra'}
                </span>
                {/* Nút share trên ảnh cover trên mobile (Mục 12/13) */}
                <button
                  type="button"
                  onClick={() => setIsShareMenuOpen(true)}
                  className="absolute top-4 right-4 sm:hidden w-9 h-9 rounded-full bg-white/90 backdrop-blur-xs text-slate-700 hover:text-blue-600 flex items-center justify-center shadow-md active:scale-95 transition-all cursor-pointer"
                  title="Chia sẻ sự kiện"
                >
                  <Share2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Cột phải: Tiêu đề, mô tả, thông số & Nút hành động */}
            <div className="lg:col-span-6 flex flex-col justify-between h-full space-y-6">
              <div>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight leading-snug mb-3">
                  {event.name}
                </h1>

                <p className="text-sm sm:text-base text-gray-600 leading-relaxed mb-6 font-normal">
                  {event.short_description || event.detail_description || 'Hội thảo kết nối cộng đồng doanh nghiệp, chia sẻ kinh nghiệm và mở rộng cơ hội hợp tác phát triển.'}
                </p>

                {/* Thông tin nhanh */}
                <div className="space-y-3 text-sm text-gray-700 bg-slate-50/80 p-4 rounded-2xl border border-slate-100 mb-6">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center flex-shrink-0">
                      <Calendar className="w-4 h-4" />
                    </div>
                    <span>
                      <strong className="text-gray-900">{dateFormatted}</strong> ({dayOfWeek})
                    </span>
                  </div>

                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center flex-shrink-0">
                      <Clock className="w-4 h-4" />
                    </div>
                    <span>{timeDisplay}</span>
                  </div>

                  <div className="flex items-start gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-amber-100 text-amber-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <MapPin className="w-4 h-4" />
                    </div>
                    <span className="leading-snug">{event.location || 'Trung tâm Hội nghị Quốc gia, 57 Phạm Hùng, Hà Nội'}</span>
                  </div>

                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-purple-100 text-purple-600 flex items-center justify-center flex-shrink-0">
                      <Users className="w-4 h-4" />
                    </div>
                    <span>
                      <strong className="text-gray-900">{registrationCount ?? event.expected_guests ?? 0} người</strong> tham dự dự kiến
                    </span>
                  </div>
                </div>
              </div>

              {/* 2 Nút hành động */}
              <div className="flex flex-col sm:flex-row gap-3 pt-2 relative">
                <button
                  type="button"
                  onClick={() => setIsRegisterOpen(true)}
                  className={`flex-1 inline-flex items-center justify-center gap-2 px-6 py-3.5 text-white font-bold text-sm rounded-xl shadow-lg transition-all active:scale-95 cursor-pointer ${
                    isEnded
                      ? 'bg-[#4f46e5] hover:bg-[#4338ca]'
                      : 'bg-[#2563eb] hover:bg-[#1d4ed8] shadow-blue-500/25'
                  }`}
                >
                  <Ticket className="w-4 h-4" />
                  <span>{isEnded ? 'Xem lại sự kiện' : 'Đăng ký'}</span>
                </button>

                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setIsShareMenuOpen(true)}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3.5 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 font-semibold text-sm rounded-xl shadow-xs transition-colors cursor-pointer"
                  >
                    {copiedRef || copiedLink ? (
                      <>
                        <Check className="w-4 h-4 text-emerald-600" />
                        <span className="text-emerald-700">Đã sao chép</span>
                      </>
                    ) : (
                      <>
                        <Share2 className="w-4 h-4 text-gray-500" />
                        <span>Chia sẻ sự kiện</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 4 & 5: CHI TIẾT TABS & SIDEBAR THÔNG TIN SỰ KIỆN */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* CỘT TRÁI: CÁC TABS NỘI DUNG */}
          <div className="lg:col-span-8 space-y-6">
            <div className="bg-white rounded-3xl border border-gray-100 p-6 sm:p-8 shadow-sm">
              {/* Tab Navigation (Item 5 & Item 7) */}
              <div className="flex flex-wrap items-center gap-2 pb-4 border-b border-gray-100 mb-6">
                {[
                  { key: 'intro', label: 'Giới thiệu' },
                  { key: 'content', label: 'Nội dung' },
                  { key: 'speakers', label: 'Ban tổ chức' },
                  { key: 'target', label: 'Đối tượng tham dự' },
                ].map((t) => (
                  <button
                    key={t.key}
                    type="button"
                    onClick={() => setActiveTab(t.key as any)}
                    className={`relative px-4 py-2 text-sm font-semibold rounded-xl transition-all cursor-pointer ${
                      activeTab === t.key
                        ? 'text-[#2563eb] bg-blue-50'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              {/* Tab Content */}
              {activeTab === 'intro' && (
                <div className="space-y-6 text-sm text-gray-700 leading-relaxed">
                  <div>
                    <h3 className="text-base font-bold text-gray-900 mb-2">Giới thiệu sự kiện</h3>
                    <p className="text-gray-600">
                      {event.detail_description ||
                        'Hội thảo là nơi quy tụ các doanh nghiệp, chuyên gia và nhà quản lý cùng chia sẻ kinh nghiệm, giải pháp và xu hướng phát triển trong bối cảnh kinh tế mới. Đây là cơ hội tuyệt vời để mở rộng mạng lưới quan hệ và tìm kiếm cơ hội hợp tác.'}
                    </p>
                  </div>

                  <div>
                    <h3 className="text-base font-bold text-gray-900 mb-3">Nội dung chính</h3>
                    <ul className="space-y-2.5 text-gray-600">
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                        <span>Xu hướng phát triển kinh tế và cơ hội cho doanh nghiệp trong năm 2026</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                        <span>Chiến lược kết nối và hợp tác hiệu quả giữa các đơn vị thành viên</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                        <span>Chia sẻ kinh nghiệm thực chiến từ các doanh nghiệp thành công</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                        <span>Giao lưu, kết nối và mở rộng quan hệ đối tác chiến lược bền vững</span>
                      </li>
                    </ul>
                  </div>

                  {/* Nội dung chi tiết / Content Editor hiển thị trên Lịch trình dự kiến (Mục 2.2) */}
                  {((event as any).content || event.detail_description) && (
                    <div className="p-4 bg-slate-50/60 rounded-2xl border border-slate-100">
                      <h3 className="text-base font-bold text-gray-900 mb-3">Nội dung chi tiết</h3>
                      <div
                        className="text-gray-700 leading-relaxed text-sm space-y-3 font-normal [&_img]:rounded-xl [&_img]:shadow-sm [&_img]:my-3 [&_img]:max-h-96 [&_img]:w-full [&_img]:object-cover [&_h4]:font-bold [&_h4]:text-gray-900 [&_h4]:text-base [&_h4]:mt-4 [&_h4]:mb-1 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1"
                        dangerouslySetInnerHTML={{
                          __html: (event as any).content || event.detail_description || '',
                        }}
                      />
                    </div>
                  )}

                  <div>
                    <h3 className="text-base font-bold text-gray-900 mb-4">Lịch trình dự kiến</h3>
                    <div className="relative pl-6 space-y-4 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-blue-200">
                      {scheduleItems.map((item, idx) => (
                        <div key={idx} className="relative flex items-start gap-3">
                          <span className="absolute -left-6 top-1.5 w-4 h-4 rounded-full bg-blue-600 ring-4 ring-blue-100" />
                          <div className="flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                                {item.time}
                              </span>
                              {item.speaker && (
                                <span className="text-xs text-slate-500 font-medium">
                                  • {item.speaker}
                                </span>
                              )}
                            </div>
                            <p className="text-sm font-semibold text-gray-800 mt-1">{item.title}</p>
                            {item.description && (
                              <p className="text-xs text-gray-500 mt-0.5">{item.description}</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'content' && (
                <div className="space-y-4 text-sm text-gray-700 leading-relaxed">
                  <h3 className="text-base font-bold text-gray-900">Chi tiết chương trình & chuyên đề</h3>
                  <p className="text-gray-600">
                    Chương trình diễn ra trong không gian trang trọng, kết hợp giữa thuyết trình chuyên sâu của các chuyên gia đầu ngành và các phiên đối thoại mở, tạo cơ hội cho mọi người tham gia tương tác trực tiếp và giải quyết bài toán thực tế.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                      <h4 className="font-bold text-gray-900 mb-1">Chuyên đề 1</h4>
                      <p className="text-xs text-gray-500">Mô hình kinh doanh linh hoạt và tái cấu trúc nguồn vốn trong kỷ nguyên số.</p>
                    </div>
                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                      <h4 className="font-bold text-gray-900 mb-1">Chuyên đề 2</h4>
                      <p className="text-xs text-gray-500">Xây dựng chuỗi giá trị liên kết và tiếp cận tệp khách hàng tiềm năng cùng WeLink.</p>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'speakers' && (
                <div className="space-y-4">
                  <h3 className="text-base font-bold text-gray-900 mb-4">Ban tổ chức</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {inChargePersons && inChargePersons.length > 0 ? (
                      inChargePersons.map((person, idx) => (
                        <div key={person.id || idx} className="flex items-center gap-3 p-4 rounded-2xl bg-slate-50 border border-slate-100">
                          {person.avatar ? (
                            /* eslint-disable-next-line @next/next/no-img-element */
                            <img
                              src={person.avatar}
                              alt={person.full_name}
                              className="w-12 h-12 rounded-full object-cover"
                              onError={(e) => { e.currentTarget.src = '/logo-nghieng.png'; }}
                            />
                          ) : (
                            <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-sm">
                              {person.full_name?.split(' ').map((w: string) => w[0]).join('').slice(-2).toUpperCase()}
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <h4 className="text-sm font-bold text-gray-900 truncate">{person.full_name}</h4>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {(Array.isArray(person.roles) && person.roles.length > 0
                                ? person.roles
                                : [person.position || 'Ban tổ chức']
                              ).map((r: string, rIdx: number) => (
                                <span
                                  key={rIdx}
                                  className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200"
                                >
                                  {r}
                                </span>
                              ))}
                            </div>
                            {person.phone && (
                              <p className="text-xs text-gray-400 mt-1">{person.phone}</p>
                            )}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="col-span-2 text-center text-sm text-gray-400 py-6">
                        Thông tin ban tổ chức đang được cập nhật.
                      </div>
                    )}
                  </div>
                </div>
              )}

              {activeTab === 'target' && (
                <div className="space-y-4">
                  <h3 className="text-base font-bold text-gray-900 mb-3">Ai nên tham gia sự kiện này?</h3>
                  <div className="flex flex-wrap gap-2.5">
                    {targetAudiences.map((aud, idx) => {
                      const Icon = aud.icon;
                      return (
                        <div
                          key={idx}
                          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-50 text-blue-800 text-xs font-bold border border-blue-100"
                        >
                          <Icon className="w-4 h-4 text-blue-600" />
                          <span>{aud.label}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* CỘT PHẢI: SIDEBAR THÔNG TIN SỰ KIỆN & ĐỐI TƯỢNG THAM DỰ (IMAGE 6) */}
          <div className="lg:col-span-4 space-y-6">
            {/* 4. THÔNG TIN SỰ KIỆN */}
            <div className="bg-white rounded-3xl border border-gray-100 p-6 shadow-sm">
              <h3 className="font-bold text-base text-gray-900 mb-5">
                Thông tin sự kiện
              </h3>

              <div className="space-y-4 text-xs text-gray-600">
                <div className="flex items-start gap-3 pb-3.5 border-b border-gray-100">
                  <Clock className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold text-gray-900 block">Thời gian</span>
                    <span>{timeDisplay}, {dayOfWeek}</span>
                    <span className="block text-gray-400">{dateFormatted}</span>
                  </div>
                </div>

                <div className="flex items-start gap-3 pb-3.5 border-b border-gray-100">
                  <MapPin className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold text-gray-900 block">Địa điểm</span>
                    <span className="leading-relaxed">{event.location || 'Trung tâm Hội nghị Quốc gia, 57 Phạm Hùng, Nam Từ Liêm, Hà Nội'}</span>
                  </div>
                </div>

                <div className="flex items-start gap-3 pb-3.5 border-b border-gray-100">
                  <Layers className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold text-gray-900 block">Hình thức</span>
                    <span>{event.event_format || 'Trực tiếp'}</span>
                  </div>
                </div>

                <div className="flex items-start gap-3 pb-3.5 border-b border-gray-100">
                  <Ticket className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold text-gray-900 block">Phí tham dự</span>
                    <span className="font-bold text-emerald-600">Miễn phí (Tiệc trà được hỗ trợ)</span>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Calendar className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold text-gray-900 block">Hạn đăng ký</span>
                    <span>Trước ngày diễn ra sự kiện</span>
                  </div>
                </div>
              </div>
            </div>

            {/* 5. ĐỐI TƯỢNG THAM DỰ (TAGS KÈM BIỂU TƯỢNG - IMAGE 6) */}
            <div className="bg-white rounded-3xl border border-gray-100 p-6 shadow-sm">
              <h3 className="font-bold text-sm text-gray-900 mb-4">
                Đối tượng tham dự
              </h3>
              <div className="flex flex-wrap gap-2">
                {targetAudiences.map((aud, idx) => {
                  const Icon = aud.icon;
                  return (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-gray-700"
                    >
                      <Icon className="w-3.5 h-3.5 text-blue-600" />
                      <span>{aud.label}</span>
                    </span>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* 6. BANNER KÊU GỌI HÀNH ĐỘNG (CTA - IMAGE 6) */}
        <div className="bg-gradient-to-r from-blue-50 via-indigo-50 to-blue-100 border border-blue-200/80 rounded-3xl p-6 sm:p-8 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center flex-shrink-0 shadow-md shadow-blue-500/20">
              <CalendarDays className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-gray-900 tracking-tight leading-snug">
                Đừng bỏ lỡ cơ hội kết nối và phát triển cùng cộng đồng doanh nghiệp!
              </h3>
              <p className="text-xs sm:text-sm text-gray-600 mt-0.5">
                Đăng ký ngay hôm nay để giữ chỗ và nhận vé tham dự điện tử kèm mã QR check-in.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsRegisterOpen(true)}
            className="inline-flex items-center gap-2 px-7 py-3.5 bg-[#2563eb] hover:bg-[#1d4ed8] text-white font-bold text-sm rounded-xl shadow-lg shadow-blue-500/25 transition-all active:scale-95 cursor-pointer flex-shrink-0"
          >
            <span>Đăng ký ngay</span>
            <span>→</span>
          </button>
        </div>
      </main>

      {/* 2-ROW SHARE POPUP (Item 12 & 13) */}
      {isShareMenuOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl p-5 border border-slate-100 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Share2 className="w-5 h-5 text-blue-600" />
                <h3 className="font-bold text-slate-900 text-base">Chia sẻ sự kiện</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsShareMenuOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Hàng 1: Liên kết chia sẻ mời bạn bè (Link cá nhân) - Đưa lên trên theo Mục 9.1 */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <p className="text-xs font-semibold text-slate-800">
                  {currentUser ? 'Share mời bạn bè (Link cá nhân):' : 'Liên kết sự kiện:'}
                </p>
                <span className="text-[10px] text-blue-600 font-medium">
                  {currentUser ? 'Đã gắn ID cá nhân' : 'Mặc định Admin nhungnguyen1722@gmail.com'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={typeof window !== 'undefined' ? getShareUrl() : ''}
                  className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600 select-all truncate font-mono"
                />
                <button
                  type="button"
                  onClick={handleCopyRefLink}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-colors flex-shrink-0 cursor-pointer"
                >
                  {copiedRef ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-white" />
                      <span>Đã chép</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Sao chép</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Hàng 2: Mạng xã hội */}
            <div className="pt-3 border-t border-slate-100">
              <p className="text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wide">
                Chia sẻ qua Mạng xã hội
              </p>
              <div className="grid grid-cols-4 gap-2">
                <button
                  type="button"
                  onClick={handleShareFacebook}
                  className="flex flex-col items-center gap-1.5 p-2 rounded-xl hover:bg-blue-50 transition-colors group cursor-pointer"
                >
                  <div className="w-10 h-10 rounded-full bg-[#1877F2] text-white flex items-center justify-center font-bold text-base shadow-sm group-hover:scale-105 transition-transform">
                    f
                  </div>
                  <span className="text-[11px] font-medium text-slate-700">Facebook</span>
                </button>
                <button
                  type="button"
                  onClick={handleShareZalo}
                  className="flex flex-col items-center gap-1.5 p-2 rounded-xl hover:bg-blue-50 transition-colors group cursor-pointer"
                >
                  <div className="w-10 h-10 rounded-full bg-[#0068FF] text-white flex items-center justify-center font-bold text-xs shadow-sm group-hover:scale-105 transition-transform">
                    Zalo
                  </div>
                  <span className="text-[11px] font-medium text-slate-700">Zalo</span>
                </button>
                <button
                  type="button"
                  onClick={handleShareTelegram}
                  className="flex flex-col items-center gap-1.5 p-2 rounded-xl hover:bg-sky-50 transition-colors group cursor-pointer"
                >
                  <div className="w-10 h-10 rounded-full bg-[#229ED9] text-white flex items-center justify-center font-bold text-xs shadow-sm group-hover:scale-105 transition-transform">
                    ✈
                  </div>
                  <span className="text-[11px] font-medium text-slate-700">Telegram</span>
                </button>
                <button
                  type="button"
                  onClick={handleShareTwitter}
                  className="flex flex-col items-center gap-1.5 p-2 rounded-xl hover:bg-slate-100 transition-colors group cursor-pointer"
                >
                  <div className="w-10 h-10 rounded-full bg-black text-white flex items-center justify-center font-bold text-sm shadow-sm group-hover:scale-105 transition-transform">
                    𝕏
                  </div>
                  <span className="text-[11px] font-medium text-slate-700">X</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* POPUP ĐĂNG KÝ SỰ KIỆN KHI BẤM NÚT TRÊN TRANG CHI TIẾT */}
      <EventRegistrationModal
        isOpen={isRegisterOpen}
        onClose={() => setIsRegisterOpen(false)}
        event={{
          id: event.id,
          name: event.name,
          event_date: event.event_date,
          start_time: event.start_time,
          end_time: event.end_time,
          location: event.location,
          status: event.status,
          image_url: event.image_url,
          short_description: event.short_description,
        }}
      />
    </div>
  );
}
