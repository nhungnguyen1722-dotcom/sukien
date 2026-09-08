'use client';

import React, { useState } from 'react';
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
} from 'lucide-react';
import SystemLogo from './SystemLogo';
import EventRegistrationModal, { RegistrationEventData } from './EventRegistrationModal';

interface PublicEventDetailClientProps {
  event: any;
}

export default function PublicEventDetailClient({ event }: PublicEventDetailClientProps) {
  const [activeTab, setActiveTab] = useState<'intro' | 'content' | 'speakers' | 'target'>('intro');
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [isShareMenuOpen, setIsShareMenuOpen] = useState(false);

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

  const handleCopyLink = () => {
    try {
      navigator.clipboard.writeText(window.location.href);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 3000);
      setIsShareMenuOpen(false);
    } catch {
      // Ignore
    }
  };

  const handleShareFacebook = () => {
    const url = encodeURIComponent(window.location.href);
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${url}`, '_blank', 'width=600,height=400');
    setIsShareMenuOpen(false);
  };

  const handleShareTwitter = () => {
    const url = encodeURIComponent(window.location.href);
    const text = encodeURIComponent(event.name || 'Sự kiện');
    window.open(`https://twitter.com/intent/tweet?url=${url}&text=${text}`, '_blank', 'width=600,height=400');
    setIsShareMenuOpen(false);
  };

  const scheduleItems = [
    { time: '08:00 - 08:30', title: 'Đón tiếp đại biểu & Check-in' },
    { time: '08:30 - 09:00', title: 'Khai mạc chương trình & Giới thiệu đại biểu' },
    { time: '09:00 - 10:00', title: 'Phiên 1: Xu hướng phát triển và cơ hội cho doanh nghiệp' },
    { time: '10:00 - 10:15', title: 'Giải lao & Networking mở rộng kết nối' },
    { time: '10:15 - 11:00', title: 'Phiên 2: Chiến lược kết nối & hợp tác thực chiến' },
    { time: '11:00 - 11:30', title: 'Giao lưu, Q&A và bế mạc sự kiện' },
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
            {/* Cột trái: Ảnh sự kiện lớn + Badge trạng thái */}
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
                      <strong className="text-gray-900">{event.expected_guests || 0} người</strong> tham dự dự kiến
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
                  <span>{isEnded ? 'Xem lại sự kiện' : 'Đăng ký tham dự'}</span>
                </button>

                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setIsShareMenuOpen(!isShareMenuOpen)}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3.5 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 font-semibold text-sm rounded-xl shadow-xs transition-colors cursor-pointer"
                  >
                    {copiedLink ? (
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

                  {/* Share Menu Popup (Item 6) */}
                  {isShareMenuOpen && (
                    <div className="absolute right-0 bottom-full mb-2 w-56 bg-white rounded-2xl shadow-xl border border-gray-100 p-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                      <button
                        type="button"
                        onClick={handleShareFacebook}
                        className="w-full flex items-center gap-3 px-3 py-2.5 text-xs font-semibold text-gray-700 hover:bg-blue-50 hover:text-[#1877F2] rounded-xl transition-colors cursor-pointer text-left"
                      >
                        <span className="w-6 h-6 rounded-full bg-[#1877F2] text-white flex items-center justify-center text-xs font-black">f</span>
                        <span>Chia sẻ lên Facebook</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleShareTwitter}
                        className="w-full flex items-center gap-3 px-3 py-2.5 text-xs font-semibold text-gray-700 hover:bg-gray-100 hover:text-black rounded-xl transition-colors cursor-pointer text-left"
                      >
                        <span className="w-6 h-6 rounded-full bg-black text-white flex items-center justify-center text-xs font-bold">𝕏</span>
                        <span>Chia sẻ lên X (Twitter)</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleCopyLink}
                        className="w-full flex items-center gap-3 px-3 py-2.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 rounded-xl transition-colors cursor-pointer text-left border-t border-gray-100 mt-1 pt-2"
                      >
                        <Copy className="w-4 h-4 text-gray-500" />
                        <span>Sao chép liên kết</span>
                      </button>
                    </div>
                  )}
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
                  { key: 'speakers', label: 'Hội đồng quản trị' },
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

                  <div>
                    <h3 className="text-base font-bold text-gray-900 mb-4">Lịch trình dự kiến</h3>
                    <div className="relative pl-6 space-y-4 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-blue-200">
                      {scheduleItems.map((item, idx) => (
                        <div key={idx} className="relative flex items-start gap-3">
                          <span className="absolute -left-6 top-1.5 w-4 h-4 rounded-full bg-blue-600 ring-4 ring-blue-100" />
                          <div>
                            <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                              {item.time}
                            </span>
                            <p className="text-sm font-semibold text-gray-800 mt-1">{item.title}</p>
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
                  <h3 className="text-base font-bold text-gray-900 mb-4">Hội đồng quản trị và Ban tổ chức</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="flex items-center gap-3 p-4 rounded-2xl bg-slate-50 border border-slate-100">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src="/events/speaker-hung.jpg"
                        alt="Ông Nguyễn Văn Hùng"
                        className="w-12 h-12 rounded-full object-cover"
                        onError={(e) => { e.currentTarget.src = '/logo-nghieng.png'; }}
                      />
                      <div>
                        <h4 className="text-sm font-bold text-gray-900">Ông Nguyễn Văn Hùng</h4>
                        <p className="text-xs text-gray-500">Chuyên gia kinh tế - Giám đốc ABC</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 p-4 rounded-2xl bg-slate-50 border border-slate-100">
                      <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-sm">
                        VC
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-gray-900">Bà Vũ Thị Cúc</h4>
                        <p className="text-xs text-gray-500">Ban tổ chức & Điều phối sự kiện WeLink</p>
                      </div>
                    </div>
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
