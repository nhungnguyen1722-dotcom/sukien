'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  CalendarDays,
  Calendar,
  Clock,
  MapPin,
  Users,
  Search,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  BookOpen,
  Briefcase,
  Globe2,
  FileText,
  Sparkles,
  Quote,
  Shield,
  Layers,
} from 'lucide-react';
import SystemLogo from './SystemLogo';
import EventRegistrationModal, { RegistrationEventData } from './EventRegistrationModal';

export type EventData = {
  id: number;
  name: string;
  code?: string | null;
  event_date: string;
  start_time?: string | null;
  end_time?: string | null;
  location: string | null;
  expected_guests: number;
  status: string;
  approval_status: string;
  image_url?: string | null;
  short_description?: string | null;
  detail_description?: string | null;
  fee?: number | string | null;
};

interface EventHomePageProps {
  events: EventData[];
}

export default function EventHomePage({ events }: EventHomePageProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('Tất cả');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  // Registration Modal State
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [selectedEventForRegister, setSelectedEventForRegister] = useState<RegistrationEventData | null>(null);

  const handleOpenRegister = (event: EventData) => {
    setSelectedEventForRegister({
      id: event.id,
      name: event.name,
      event_date: event.event_date,
      start_time: event.start_time,
      end_time: event.end_time,
      location: event.location,
      status: event.status,
      image_url: event.image_url,
      short_description: event.short_description,
    });
    setIsRegisterModalOpen(true);
  };

  // Filtered Featured Events
  const featuredEvents = useMemo(() => {
    return events.filter((e) => {
      const matchSearch =
        e.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (e.location && e.location.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (e.short_description && e.short_description.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchSearch;
    });
  }, [events, searchQuery]);

  // Filtered List Events for "Tất cả sự kiện"
  const listEvents = useMemo(() => {
    let list = events.filter((e) => {
      const matchSearch =
        e.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (e.location && e.location.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (e.short_description && e.short_description.toLowerCase().includes(searchQuery.toLowerCase()));

      let matchStatus = true;
      if (selectedStatus !== 'Tất cả') {
        matchStatus = e.status === selectedStatus;
      }

      return matchSearch && matchStatus;
    });

    list.sort((a, b) => {
      const dateA = new Date(a.event_date).getTime();
      const dateB = new Date(b.event_date).getTime();
      return sortOrder === 'newest' ? dateB - dateA : dateA - dateB;
    });

    return list;
  }, [events, searchQuery, selectedStatus, sortOrder]);

  // Pagination for List View
  const totalPages = Math.max(1, Math.ceil(listEvents.length / itemsPerPage));
  const paginatedEvents = listEvents.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Status Badge Helper
  const getStatusBadge = (status: string) => {
    if (status === 'Đang mở đăng ký' || status === 'Đang diễn ra') {
      return (
        <span className="px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-[#059669] text-white shadow-xs">
          {status}
        </span>
      );
    }
    if (status === 'Đã diễn ra' || status === 'Đã hoàn thành') {
      return (
        <span className="px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-[#4f46e5] text-white shadow-xs">
          Đã diễn ra
        </span>
      );
    }
    return (
      <span className="px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-[#2563eb] text-white shadow-xs">
        {status || 'Sắp diễn ra'}
      </span>
    );
  };

  // Helper date
  const parseDate = (dateStr: string) => {
    const d = dateStr ? new Date(dateStr) : new Date();
    const day = d.getDate();
    const month = d.getMonth() + 1;
    const monthStr = `TH${month < 10 ? '0' + month : month}`;
    return {
      day,
      monthStr,
      fullDate: `${day < 10 ? '0' + day : day}/${month < 10 ? '0' + month : month}/${d.getFullYear()}`,
    };
  };

  return (
    <div className="w-full bg-[#f8fafc] text-gray-900 pb-16">
      {/* KHU VỰC 1: BANNER GIỚI THIỆU & TÌM KIẾM SỰ KIỆN (IMAGE 3 & 5) */}
      <section className="relative bg-gradient-to-r from-[#0b1b3d] via-[#102a5c] to-[#1e3a8a] text-white py-14 sm:py-20 px-4 sm:px-6 overflow-hidden">
        {/* Subtle Background Pattern / Image */}
        <div className="absolute inset-0 opacity-20 mix-blend-luminosity pointer-events-none">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/events/hero-banner.jpg"
            alt="Hero Background"
            className="w-full h-full object-cover"
          />
        </div>
        <div className="absolute inset-0 bg-radial from-transparent to-[#0b1b3d]/90 pointer-events-none" />

        <div className="relative max-w-5xl mx-auto flex flex-col items-start z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-xs text-blue-200 mb-3">
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span>Hệ thống sự kiện & kết nối doanh nghiệp</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight mb-3 text-white leading-tight">
            Kết nối – Chia sẻ – Phát triển
          </h1>
          <p className="text-blue-100 text-sm sm:text-base max-w-2xl mb-8 leading-relaxed font-normal">
            Tham gia các sự kiện để mở rộng mối quan hệ, học hỏi kiến thức và cùng nhau phát triển bền vững.
          </p>

          {/* Search Box */}
          <div className="w-full max-w-2xl relative shadow-2xl rounded-2xl overflow-hidden">
            <div className="relative flex items-center">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Tìm kiếm sự kiện, chủ đề, diễn giả..."
                className="w-full pl-12 pr-12 py-3.5 sm:py-4 bg-white text-gray-900 placeholder-gray-400 text-sm sm:text-base rounded-2xl focus:outline-none focus:ring-4 focus:ring-blue-500/30 shadow-lg border-0"
              />
              <div className="absolute left-4 text-gray-400 pointer-events-none">
                <Search className="w-5 h-5" />
              </div>
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-4 text-gray-400 hover:text-gray-600 text-xs bg-gray-100 px-2 py-1 rounded-md"
                >
                  Xóa
                </button>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* KHU VỰC 2: SỰ KIỆN NỔI BẬT (GRID 4 CỘT - IMAGE 3 & 5) */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 pt-10 pb-12">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-100 text-[#2563eb] flex items-center justify-center">
              <CalendarDays className="w-4.5 h-4.5" />
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">
              Sự kiện nổi bật
            </h2>
          </div>

          <a
            href="#tat-ca-su-kien"
            className="inline-flex items-center gap-1 text-sm font-semibold text-[#2563eb] hover:text-[#1d4ed8] transition-colors"
          >
            <span>Xem tất cả</span>
            <ArrowRight className="w-4 h-4" />
          </a>
        </div>

        {/* 4-Column Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {featuredEvents.slice(0, 8).map((event) => {
            const { day, monthStr } = parseDate(event.event_date);
            const isEnded = event.status === 'Đã diễn ra' || event.status === 'Đã hoàn thành';

            return (
              <div
                key={event.id}
                className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden flex flex-col group"
              >
                {/* Event Image */}
                <div className="relative h-44 w-full bg-slate-100 overflow-hidden">
                  {event.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={event.image_url}
                      alt={event.name}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-slate-50">
                      <SystemLogo className="h-16 w-auto object-contain" />
                    </div>
                  )}

                  {/* Status Tag on Top-Left of Image */}
                  <div className="absolute top-2.5 left-2.5">
                    {getStatusBadge(event.status)}
                  </div>
                </div>

                {/* Event Card Content */}
                <div className="p-4 sm:p-5 flex flex-col flex-1">
                  {/* Date Block & Title */}
                  <div className="flex gap-3 mb-3">
                    <div className="bg-slate-50 border border-slate-200/80 rounded-xl px-2.5 py-1 flex flex-col items-center justify-center flex-shrink-0 text-center min-w-[50px] shadow-2xs">
                      <span className="text-xl font-black text-gray-900 leading-none">{day}</span>
                      <span className="text-[10px] font-bold text-[#2563eb] tracking-wider uppercase mt-0.5">
                        {monthStr}
                      </span>
                    </div>

                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-sm text-gray-900 leading-snug line-clamp-2 group-hover:text-blue-600 transition-colors">
                        {event.name}
                      </h3>
                      <div className="flex items-center gap-1 text-[11px] text-gray-500 mt-1">
                        <Clock className="w-3 h-3 text-gray-400 flex-shrink-0" />
                        <span>{event.start_time ? `${event.start_time.slice(0, 5)} - ${event.end_time?.slice(0, 5) || '11:30'}` : '08:30 - 11:30'}</span>
                        <span className="mx-1">•</span>
                        <MapPin className="w-3 h-3 text-gray-400 flex-shrink-0" />
                        <span className="truncate">{event.location?.split(',')[0] || 'Hà Nội'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Short Description */}
                  <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed mb-4 flex-1">
                    {event.short_description || event.name}
                  </p>

                  {/* 2 Action Buttons (Image 3/5/11) */}
                  <div className="grid grid-cols-2 gap-2 pt-3 border-t border-gray-100">
                    <Link
                      href={`/su-kien/${event.id}`}
                      className="inline-flex items-center justify-center gap-1 py-2 px-2 rounded-xl text-xs font-semibold text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 transition-colors"
                    >
                      <FileText className="w-3.5 h-3.5 text-gray-400" />
                      <span>Chi tiết sự kiện</span>
                    </Link>

                    {/* NÚT ĐĂNG KÝ THAM DỰ -> KÍCH HOẠT POPUP THEO HOP-THOAI-6 */}
                    <button
                      type="button"
                      onClick={() => handleOpenRegister(event)}
                      className={`inline-flex items-center justify-center gap-1 py-2 px-2 rounded-xl text-xs font-semibold text-white shadow-xs transition-all active:scale-95 cursor-pointer ${
                        isEnded
                          ? 'bg-[#4f46e5] hover:bg-[#4338ca]'
                          : 'bg-[#2563eb] hover:bg-[#1d4ed8] shadow-blue-500/20'
                      }`}
                    >
                      <span>{isEnded ? 'Xem lại sự kiện' : 'Đăng ký tham dự'}</span>
                      <span className="text-[10px]">→</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {featuredEvents.length === 0 && (
          <div className="bg-white rounded-2xl p-12 text-center text-gray-500 border border-gray-100">
            Không tìm thấy sự kiện nổi bật nào phù hợp.
          </div>
        )}
      </section>

      {/* KHU VỰC 3 & 4: TẤT CẢ SỰ KIỆN (LIST VIEW) & SIDEBAR CỘNG ĐỒNG (IMAGE 3 & 5) */}
      <section id="tat-ca-su-kien" className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* KHU VỰC 3 (BÊN TRÁI): TẤT CẢ SỰ KIỆN (LIST VIEW) */}
          <div className="lg:col-span-8 flex flex-col">
            <div className="bg-white rounded-2xl border border-gray-100 p-5 sm:p-6 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-gray-100">
                <h2 className="text-xl font-bold text-gray-900 tracking-tight">
                  Tất cả sự kiện
                </h2>

                {/* Sort Dropdown */}
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500 font-medium">Sắp xếp:</span>
                  <select
                    value={sortOrder}
                    onChange={(e) => setSortOrder(e.target.value as any)}
                    className="text-xs font-semibold bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5 text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="newest">Mới nhất</option>
                    <option value="oldest">Cũ nhất</option>
                  </select>
                </div>
              </div>

              {/* Status Filter Tabs */}
              <div className="flex flex-wrap gap-2 py-4 border-b border-gray-100">
                {['Tất cả', 'Sắp diễn ra', 'Đang diễn ra', 'Đã diễn ra'].map((status) => (
                  <button
                    key={status}
                    type="button"
                    onClick={() => {
                      setSelectedStatus(status);
                      setCurrentPage(1);
                    }}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                      selectedStatus === status
                        ? 'bg-[#2563eb] text-white shadow-xs'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {status}
                  </button>
                ))}
              </div>

              {/* List View Items */}
              <div className="divide-y divide-gray-100">
                {paginatedEvents.map((event) => {
                  const { fullDate } = parseDate(event.event_date);

                  return (
                    <div
                      key={event.id}
                      className="py-4 sm:py-5 flex flex-col sm:flex-row sm:items-center gap-4 hover:bg-slate-50/60 p-2 rounded-xl transition-colors"
                    >
                      {/* Thumbnail */}
                      <div className="w-full sm:w-28 h-20 rounded-xl bg-slate-100 overflow-hidden flex-shrink-0 relative border border-slate-200/80">
                        {event.image_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={event.image_url}
                            alt={event.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center p-2">
                            <SystemLogo className="h-8 w-auto object-contain" />
                          </div>
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          {getStatusBadge(event.status)}
                        </div>
                        <h4 className="font-bold text-sm text-gray-900 leading-snug line-clamp-1 hover:text-blue-600 transition-colors">
                          <Link href={`/su-kien/${event.id}`}>
                            {event.name}
                          </Link>
                        </h4>
                        <p className="text-xs text-gray-500 line-clamp-1 mt-0.5">
                          {event.short_description || event.name}
                        </p>
                        <div className="flex flex-wrap items-center gap-3 text-[11px] text-gray-500 mt-2">
                          <div className="flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-gray-400" />
                            <span>{fullDate}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="w-3 h-3 text-gray-400" />
                            <span>{event.start_time ? `${event.start_time.slice(0, 5)} - ${event.end_time?.slice(0, 5) || '11:30'}` : '08:30 - 11:30'}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-gray-400" />
                            <span className="truncate">{event.location?.split(',')[0] || 'Hà Nội'}</span>
                          </div>
                        </div>
                      </div>

                      {/* Action Button */}
                      <div className="flex sm:flex-col items-center gap-2 flex-shrink-0 self-end sm:self-center">
                        <Link
                          href={`/su-kien/${event.id}`}
                          className="inline-flex items-center gap-1 px-3.5 py-2 border border-gray-200 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200 text-gray-700 text-xs font-semibold rounded-xl transition-all"
                        >
                          <span>Chi tiết</span>
                          <span className="text-xs">→</span>
                        </Link>
                        <button
                          type="button"
                          onClick={() => handleOpenRegister(event)}
                          className="inline-flex items-center gap-1 px-3.5 py-2 bg-[#2563eb] hover:bg-[#1d4ed8] text-white text-xs font-semibold rounded-xl shadow-xs transition-all cursor-pointer"
                        >
                          <span>Đăng ký</span>
                        </button>
                      </div>
                    </div>
                  );
                })}

                {paginatedEvents.length === 0 && (
                  <div className="py-12 text-center text-gray-400 text-sm">
                    Không có sự kiện nào trong danh mục này.
                  </div>
                )}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-1.5 pt-6 border-t border-gray-100 mt-4">
                  <button
                    type="button"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-500 hover:bg-gray-100 disabled:opacity-40"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>

                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                    <button
                      key={page}
                      type="button"
                      onClick={() => setCurrentPage(page)}
                      className={`w-8 h-8 rounded-lg text-xs font-bold transition-colors ${
                        currentPage === page
                          ? 'bg-[#2563eb] text-white'
                          : 'text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      {page}
                    </button>
                  ))}

                  <button
                    type="button"
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-500 hover:bg-gray-100 disabled:opacity-40"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* KHU VỰC 4 (BÊN PHẢI): SIDEBAR ĐĂNG KÝ THAM GIA CỘNG ĐỒNG (IMAGE 3 & 5) */}
          <div className="lg:col-span-4 space-y-6">
            {/* Box 1: Gia nhập cộng đồng */}
            <div className="bg-white rounded-2xl border border-gray-100 p-5 sm:p-6 shadow-sm overflow-hidden relative">
              <div className="relative z-10">
                <h3 className="font-bold text-base text-gray-900 leading-snug mb-1.5">
                  Gia nhập cộng đồng NGHIÊNG Complex
                </h3>
                <p className="text-xs text-gray-500 leading-relaxed mb-4">
                  Kết nối với hàng ngàn doanh nghiệp, chuyên gia và những người cùng chí hướng.
                </p>

                <button
                  type="button"
                  onClick={() => {
                    if (events.length > 0) handleOpenRegister(events[0]);
                  }}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-[#2563eb] hover:bg-[#1d4ed8] text-white text-xs font-bold rounded-xl shadow-md shadow-blue-500/20 transition-all active:scale-95 cursor-pointer mb-5"
                >
                  <span>Đăng ký ngay</span>
                  <span>→</span>
                </button>
              </div>

              {/* Illustration */}
              <div className="w-full h-32 rounded-xl bg-gradient-to-tr from-blue-50 to-indigo-50 border border-blue-100/60 overflow-hidden flex items-center justify-center p-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/events/community.png"
                  alt="Cộng đồng Nghiêng Complex"
                  className="w-full h-full object-cover rounded-lg"
                  onError={(e) => {
                    e.currentTarget.src = '/events/hero-banner.jpg';
                  }}
                />
              </div>
            </div>

            {/* Box 2: Vì sao nên tham gia sự kiện? */}
            <div className="bg-white rounded-2xl border border-gray-100 p-5 sm:p-6 shadow-sm">
              <h3 className="font-bold text-sm text-gray-900 mb-4">
                Vì sao nên tham gia sự kiện?
              </h3>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5 p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center">
                    <Users className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-bold text-gray-800 leading-tight">
                    Mở rộng mối quan hệ
                  </span>
                </div>

                <div className="flex flex-col gap-1.5 p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center">
                    <BookOpen className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-bold text-gray-800 leading-tight">
                    Tiếp cận kiến thức mới
                  </span>
                </div>

                <div className="flex flex-col gap-1.5 p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <div className="w-7 h-7 rounded-lg bg-amber-100 text-amber-600 flex items-center justify-center">
                    <Briefcase className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-bold text-gray-800 leading-tight">
                    Cơ hội hợp tác kinh doanh
                  </span>
                </div>

                <div className="flex flex-col gap-1.5 p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <div className="w-7 h-7 rounded-lg bg-purple-100 text-purple-600 flex items-center justify-center">
                    <Globe2 className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-bold text-gray-800 leading-tight">
                    Cộng đồng chuyên nghiệp
                  </span>
                </div>
              </div>
            </div>

            {/* Box 3: Quote Message */}
            <div className="bg-gradient-to-br from-slate-50 to-blue-50/50 rounded-2xl border border-blue-100/80 p-5 shadow-2xs">
              <Quote className="w-5 h-5 text-blue-400 mb-2" />
              <p className="text-xs italic text-gray-700 leading-relaxed font-medium">
                &ldquo;NGHIÊNG Complex – Cùng kết nối, kiến tạo giá trị bền vững.&rdquo;
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* POPUP ĐĂNG KÝ THAM DỰ SỰ KIỆN CHUẨN 100% THEO HÌNH 12 & HOP-THOAI-6.TXT */}
      <EventRegistrationModal
        isOpen={isRegisterModalOpen}
        onClose={() => setIsRegisterModalOpen(false)}
        event={selectedEventForRegister}
      />
    </div>
  );
}
