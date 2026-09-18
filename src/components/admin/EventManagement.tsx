'use client';

import React, { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import {
  CalendarDays,
  TrendingUp,
  Users,
  Wallet,
  Search,
  Plus,
  Pencil,
  X,
  Check,
  AlertCircle,
  ChevronRight,
  Settings2,
  Mic,
  Presentation,
  Coffee,
  Handshake,
  UserCheck,
  Info,
  FileSpreadsheet,
  Upload,
  Image as LucideImage,
} from 'lucide-react';

const PRESET_EVENT_IMAGES = [
  { url: '/events/event-1.jpg', title: 'Hội thảo Doanh nghiệp' },
  { url: '/events/event-2.jpg', title: 'Workshop Chuyển đổi số' },
  { url: '/events/event-3.jpg', title: 'CEO Talk & Lãnh đạo' },
  { url: '/events/event-4.jpg', title: 'Hội nghị Thường niên' },
  { url: '/events/event-5.jpg', title: 'Đào tạo Kỹ năng mềm' },
  { url: '/events/event-6.jpg', title: 'Hội thảo AI & Công nghệ' },
  { url: '/events/event-7.jpg', title: 'Teambuilding Gắn kết' },
  { url: '/events/event-8.jpg', title: 'Gala Ra mắt Sản phẩm' },
];

export interface Event {
  id: number;
  name: string;
  event_date: string;
  expected_guests: number;
  location: string | null;
  manager_id: number | null;
  manager_name: string | null;
  status: string;
  approval_status: string;
  mc_fee: string | number;
  speaker_fee: string | number;
  support_fee: string | number;
  closer_fee: string | number;
  tea_break_fee: string | number;
  notes: string | null;
  image_url?: string | null;
  registration_count?: number;
  in_charge_user_ids?: number[];
}

export interface Stats {
  totalEvents: number;
  upcomingEvents: number;
  totalGuests: number;
  totalCost: number;
}

export interface ManagerOption {
  id: number;
  full_name: string;
  role?: string;
}

interface EventManagementProps {
  initialEvents: Event[];
  initialStats: Stats;
  initialManagers: ManagerOption[];
}

const STATUS_OPTIONS = ['Đang diễn ra', 'Sắp diễn ra', 'Đã diễn ra'];

export default function EventManagement({
  initialEvents,
  initialStats,
  initialManagers,
}: EventManagementProps) {
  const [events, setEvents] = useState<Event[]>(initialEvents);
  const [stats, setStats] = useState<Stats>(initialStats);
  const [managers, setManagers] = useState<ManagerOption[]>(initialManagers);
  
  // Tabs (Mục 8)
  const [activeTab, setActiveTab] = useState<'Tất cả' | 'Sắp diễn ra' | 'Đang diễn ra' | 'Đã diễn ra'>('Tất cả');

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [managerFilter, setManagerFilter] = useState('');
  const [timeFilter, setTimeFilter] = useState('');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);

  // 5 Trường giá cố định (Mục 6 & 7)
  const [fixedFees, setFixedFees] = useState({
    support_fee: 200000,
    mc_fee: 200000,
    speaker_fee: 300000,
    closer_fee: 200000,
    tea_break_fee: 1250000,
  });
  const [tempFixedFees, setTempFixedFees] = useState(fixedFees);
  const [isFixedFeesDrawerOpen, setIsFixedFeesDrawerOpen] = useState(false);
  const [isSavingFixedFees, setIsSavingFixedFees] = useState(false);

  // Form State - Removed expected_guests and manager_id per Item 18
  const [formData, setFormData] = useState({
    name: '',
    event_date: '',
    location: '',
    status: 'Sắp diễn ra',
    mc_fee: 200000,
    speaker_fee: 300000,
    support_fee: 200000,
    closer_fee: 200000,
    tea_break_fee: 1250000,
    notes: '',
    image_url: '/events/event-1.jpg',
  });

  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSyncingSheet, setIsSyncingSheet] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Phân quyền (Mục 1 & Mục 2.1)
  const [isAdmin, setIsAdmin] = useState(true);

  useEffect(() => {
    try {
      const match = document.cookie.match(new RegExp('(^|;\\s*)user_role=([^;]*)'));
      const role = match ? decodeURIComponent(match[2]) : null;
      if (role) {
        const rLower = role.toLowerCase();
        setIsAdmin(rLower === 'admin' || rLower.includes('quản trị'));
      }
    } catch {
      // Ignore
    }
  }, []);

  // Image upload & Media library state
  const [showMediaLibrary, setShowMediaLibrary] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Bổ sung Người phụ trách & Vai trò và Content Editor (Mục 2.2)
  const [formInCharges, setFormInCharges] = useState<Array<{ user_id?: number; full_name: string; role: string }>>([
    { full_name: 'Nguyễn Văn A', role: 'MC' },
    { full_name: 'Nguyễn Văn B', role: 'Nhân sự' },
  ]);
  const [selectedInChargeUserId, setSelectedInChargeUserId] = useState<string>('');
  const [newInChargeName, setNewInChargeName] = useState<string>('');
  const [newInChargeRole, setNewInChargeRole] = useState<string>('MC');
  const [contentHtml, setContentHtml] = useState<string>('');

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingImage(true);
    try {
      const uploadData = new FormData();
      uploadData.append('file', file);
      const res = await fetch('/api/admin/upload', {
        method: 'POST',
        body: uploadData,
      });
      const data = await res.json();
      if (res.ok && data.url) {
        setFormData((prev) => ({ ...prev, image_url: data.url }));
        showToast('success', 'Tải ảnh sự kiện lên thành công!');
      } else {
        showToast('error', data.error || 'Lỗi khi tải ảnh');
      }
    } catch {
      showToast('error', 'Lỗi kết nối khi tải ảnh');
    } finally {
      setIsUploadingImage(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const showToast = (type: 'success' | 'error', text: string) => {
    setToastMessage({ type, text });
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleSyncSheet = async () => {
    setIsSyncingSheet(true);
    try {
      const res = await fetch('/api/admin/events/sync-sheet', {
        method: 'POST',
      });
      const data = await res.json();
      if (res.ok) {
        showToast('success', data.message || 'Đồng bộ danh sách sự kiện lên Google Sheet thành công!');
      } else {
        showToast('error', data.error || 'Lỗi khi đồng bộ Google Sheet');
      }
    } catch (err) {
      console.error('Sync sheet error:', err);
      showToast('error', 'Lỗi kết nối khi đồng bộ Google Sheet');
    } finally {
      setIsSyncingSheet(false);
    }
  };

  // Tải cấu hình 5 trường cố định từ hệ thống
  useEffect(() => {
    fetch('/api/admin/settings')
      .then(res => res.json())
      .then(data => {
        if (data.settings?.fixed_fees) {
          setFixedFees(data.settings.fixed_fees);
          setTempFixedFees(data.settings.fixed_fees);
        }
      })
      .catch(err => console.error('Error fetching settings:', err));
  }, []);

  // Lưu cập nhật 5 trường cố định (Mục 6)
  const handleSaveFixedFees = async () => {
    setIsSavingFixedFees(true);
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key: 'fixed_fees',
          value: tempFixedFees,
          description: '5 trường chi phí cố định cho sự kiện mới',
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Cập nhật thất bại');
      }

      setFixedFees(tempFixedFees);
      setIsFixedFeesDrawerOpen(false);
      showToast('success', 'Đã cập nhật giá 5 trường cố định cho các sự kiện tạo mới!');
    } catch (err: any) {
      showToast('error', err.message || 'Lỗi khi lưu 5 trường cố định');
    } finally {
      setIsSavingFixedFees(false);
    }
  };

  const refreshData = async () => {
    try {
      const queryParams = new URLSearchParams();
      if (searchQuery) queryParams.append('search', searchQuery);
      if (statusFilter) queryParams.append('status', statusFilter);
      if (managerFilter) queryParams.append('manager_id', managerFilter);

      const res = await fetch(`/api/admin/events?${queryParams.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setEvents(data.events || []);
        setStats(data.stats || initialStats);
        setManagers(data.managers || []);
      }
    } catch (err) {
      console.error('Error refreshing events:', err);
    }
  };

  const tabCounts = useMemo(() => {
    return {
      all: events.length,
      upcoming: events.filter(e => e.status === 'Sắp diễn ra').length,
      ongoing: events.filter(e => e.status === 'Đang diễn ra').length,
      past: events.filter(e => e.status === 'Đã diễn ra' || e.status === 'Đã hoàn thành').length,
    };
  }, [events]);

  const filteredEvents = useMemo(() => {
    const list = events.filter(e => {
      const matchSearch = e.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchStatus = statusFilter ? e.status === statusFilter : true;
      const matchManager = managerFilter
        ? (String(e.manager_id) === managerFilter || e.in_charge_user_ids?.includes(Number(managerFilter)))
        : true;
      const matchTab = activeTab === 'Tất cả'
        ? true
        : activeTab === 'Đã diễn ra'
          ? (e.status === 'Đã diễn ra' || e.status === 'Đã hoàn thành')
          : e.status === activeTab;

      let matchTime = true;
      if (timeFilter && e.event_date) {
        const evDate = new Date(e.event_date);
        const today = new Date();
        const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        const endOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);

        if (timeFilter === 'today') {
          matchTime = evDate >= startOfToday && evDate <= endOfToday;
        } else if (timeFilter === 'this_week') {
          const dayOfWeek = today.getDay();
          const diffToMonday = (dayOfWeek + 6) % 7;
          const monday = new Date(startOfToday);
          monday.setDate(monday.getDate() - diffToMonday);
          const sunday = new Date(monday);
          sunday.setDate(sunday.getDate() + 6);
          sunday.setHours(23, 59, 59, 999);
          matchTime = evDate >= monday && evDate <= sunday;
        } else if (timeFilter === 'this_month') {
          const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
          const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59, 999);
          matchTime = evDate >= firstDay && evDate <= lastDay;
        }
      }

      return matchSearch && matchStatus && matchManager && matchTime && matchTab;
    });

    return list.sort((a, b) => {
      const getPriority = (st: string) => {
        if (st === 'Đang diễn ra' || st === 'Đang thực hiện') return 1;
        if (st === 'Sắp diễn ra') return 2;
        return 3;
      };
      const pA = getPriority(a.status);
      const pB = getPriority(b.status);
      if (pA !== pB) return pA - pB;
      const tA = a.event_date ? new Date(a.event_date).getTime() : 0;
      const tB = b.event_date ? new Date(b.event_date).getTime() : 0;
      return tA - tB;
    });
  }, [events, searchQuery, statusFilter, managerFilter, timeFilter, activeTab]);

  const handleOpenAddModal = () => {
    setEditingEvent(null);
    setFormData({
      name: '',
      event_date: '',
      location: '',
      status: 'Sắp diễn ra',
      mc_fee: Number(fixedFees.mc_fee) || 200000,
      speaker_fee: Number(fixedFees.speaker_fee) || 300000,
      support_fee: Number(fixedFees.support_fee) || 200000,
      closer_fee: Number(fixedFees.closer_fee) || 200000,
      tea_break_fee: Number(fixedFees.tea_break_fee) || 1250000,
      notes: '',
      image_url: '/events/event-1.jpg',
    });
    setFormInCharges([]);
    setContentHtml('');
    setNewInChargeName('');
    setSelectedInChargeUserId('');
    setNewInChargeRole('');
    setFormError('');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (event: Event) => {
    setEditingEvent(event);
    let dateFormatted = '';
    if (event.event_date) {
      dateFormatted = new Date(event.event_date).toISOString().split('T')[0];
    }
    setFormData({
      name: event.name || '',
      event_date: dateFormatted,
      location: event.location || '',
      status: event.status || 'Sắp diễn ra',
      mc_fee: Number(event.mc_fee) || 0,
      speaker_fee: Number(event.speaker_fee) || 0,
      support_fee: Number(event.support_fee) || 0,
      closer_fee: Number(event.closer_fee) || 0,
      tea_break_fee: Number(event.tea_break_fee) || 0,
      notes: event.notes || '',
      image_url: event.image_url || '/events/event-1.jpg',
    });
    setContentHtml((event as any).content || (event as any).detail_description || '');
    setFormInCharges([]);
    setNewInChargeName('');
    setSelectedInChargeUserId('');
    setNewInChargeRole('');
    fetch(`/api/admin/events/${event.id}/in-charge`)
      .then((res) => res.json())
      .then((data) => {
        if (data.inChargePersons && Array.isArray(data.inChargePersons)) {
          setFormInCharges(
            data.inChargePersons.map((p: any) => ({
              user_id: p.user_id,
              full_name: p.full_name,
              role: Array.isArray(p.roles) ? p.roles[0] : (p.roles || p.position || 'Thành viên'),
            }))
          );
        }
      })
      .catch(() => {});
    setFormError('');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!formData.name.trim()) {
      setFormError('Vui lòng nhập tên sự kiện');
      return;
    }
    if (!formData.event_date) {
      setFormError('Vui lòng chọn ngày tổ chức');
      return;
    }

    setIsSubmitting(true);
    try {
      const url = editingEvent
        ? `/api/admin/events/${editingEvent.id}`
        : '/api/admin/events';
      const method = editingEvent ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          content: contentHtml,
          in_charges: formInCharges,
        }),
      });

      const resData = await res.json();
      if (!res.ok) {
        throw new Error(resData.error || 'Có lỗi xảy ra');
      }

      showToast('success', editingEvent ? 'Cập nhật sự kiện thành công' : 'Thêm mới sự kiện thành công');
      setIsModalOpen(false);
      await refreshData();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setFormError(err.message);
      } else {
        setFormError('Có lỗi xảy ra, vui lòng thử lại');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN').format(amount) + ' đ';
  };
  
  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
  };

  const getStatusBadge = (status: string) => {
    if (status === 'Đang thực hiện' || status === 'Đang diễn ra') {
      return <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">{status}</span>;
    }
    if (status === 'Đã diễn ra' || status === 'Đã hoàn thành') {
      return <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">Đã diễn ra</span>;
    }
    return <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-200">{status || 'Sắp diễn ra'}</span>;
  };
  
  const getApprovalBadge = (status: string) => {
    if (status === 'Đã duyệt') return <span className="inline-block px-3 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">Đã duyệt</span>;
    if (status === 'Từ chối') return <span className="inline-block px-3 py-1 rounded-full text-xs font-medium bg-rose-100 text-rose-700">Từ chối</span>;
    return <span className="inline-block px-3 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700">{status || 'Chờ duyệt'}</span>;
  };

  return (
    <div className="p-8 max-w-[1600px] mx-auto min-h-screen bg-slate-50">
      {/* Toast */}
      {toastMessage && (
        <div className="fixed top-6 right-6 z-[9999] animate-in fade-in slide-in-from-top-4 duration-200">
          <div
            className={`flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-lg border text-sm font-medium ${
              toastMessage.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : 'bg-rose-50 text-rose-800 border-rose-200'
            }`}
          >
            {toastMessage.type === 'success' ? (
              <Check className="w-4 h-4 text-emerald-600" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600" />
            )}
            <span>{toastMessage.text}</span>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Sự kiện</h1>
          <p className="text-sm text-slate-500 mt-1 font-normal">
            Tạo & quản lý sự kiện — 5 trường giá cố định, duyệt sự kiện (Admin)
          </p>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <button
            type="button"
            onClick={handleSyncSheet}
            disabled={isSyncingSheet}
            className="inline-flex items-center justify-center gap-1.5 sm:gap-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-semibold shadow-xs transition-all cursor-pointer disabled:opacity-50 active:scale-[0.98]"
            title="Đồng bộ danh sách sự kiện sang Google Sheet"
          >
            <FileSpreadsheet className={`w-4 h-4 ${isSyncingSheet ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">{isSyncingSheet ? 'Đang đồng bộ...' : 'Đồng bộ Sheet'}</span>
            <span className="sm:hidden">{isSyncingSheet ? 'Đang...' : 'Đồng bộ'}</span>
          </button>

          {isAdmin && (
            <>
              <button
                type="button"
                onClick={() => {
                  setTempFixedFees(fixedFees);
                  setIsFixedFeesDrawerOpen(true);
                }}
                className="inline-flex items-center justify-center gap-1.5 sm:gap-2 bg-white hover:bg-slate-50 text-blue-600 border border-blue-200 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-semibold shadow-xs transition-all active:scale-[0.98]"
              >
                <Settings2 className="w-4 h-4 text-blue-600" />
                <span className="hidden sm:inline">Cập nhật giá 5 trường cố định</span>
                <span className="sm:hidden">Cập nhật</span>
              </button>

              <button
                onClick={handleOpenAddModal}
                className="inline-flex items-center justify-center gap-1.5 sm:gap-2 bg-[#2563eb] hover:bg-blue-700 text-white px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-semibold shadow-sm transition-all active:scale-[0.98]"
              >
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">Tạo sự kiện mới</span>
                <span className="sm:hidden font-bold text-base">+</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Stats Cards (Mobile 2x2 grid, smaller font) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5 mb-8">
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between">
          <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 shrink-0">
              <CalendarDays className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <span className="text-xs font-medium text-slate-500">Tổng sự kiện</span>
          </div>
          <div className="text-lg sm:text-2xl font-bold text-slate-900 pl-1">{stats.totalEvents}</div>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between">
          <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 shrink-0">
              <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <span className="text-xs font-medium text-slate-500">Sắp diễn ra</span>
          </div>
          <div className="text-lg sm:text-2xl font-bold text-slate-900 pl-1">{stats.upcomingEvents}</div>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between">
          <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600 shrink-0">
              <Users className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <span className="text-xs font-medium text-slate-500">Tổng khách</span>
          </div>
          <div className="text-lg sm:text-2xl font-bold text-slate-900 pl-1">{stats.totalGuests}</div>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between">
          <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600 shrink-0">
              <Wallet className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <span className="text-xs font-medium text-slate-500">Tổng chi phí</span>
          </div>
          <div className="text-sm sm:text-2xl font-bold text-slate-900 pl-1 truncate" title={formatCurrency(stats.totalCost)}>{formatCurrency(stats.totalCost)}</div>
        </div>
      </div>

      {/* Quy tắc chi phí tiệc trà banner */}
      <div className="mb-6 p-4 rounded-xl bg-blue-50/80 border border-blue-100 flex items-center justify-between text-xs text-blue-900 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center font-bold shrink-0">
            <Info className="w-4 h-4" />
          </div>
          <div>
            <span className="font-bold text-blue-900">Quy tắc chi phí tiệc trà: </span>
            <span className="text-blue-800">
              Khách mời đã được công ty chi trả phí tiệc trà quá 5 lần, từ lần thứ 6 trở đi khách sẽ tự trả phí.
            </span>
          </div>
        </div>
        <span className="text-blue-600 font-semibold cursor-pointer hover:underline text-xs shrink-0 ml-4 hidden sm:inline">
          Xem chi tiết quy tắc →
        </span>
      </div>

      {/* 4 Tabs (Mục 8: Tất cả, Sắp diễn ra, Đang diễn ra, Đã diễn ra) */}
      <div className="flex items-center gap-2 border-b border-slate-200 mb-6 overflow-x-auto pb-1">
        {[
          { key: 'Tất cả', label: 'Tất cả', count: tabCounts.all },
          { key: 'Sắp diễn ra', label: 'Sắp diễn ra', count: tabCounts.upcoming },
          { key: 'Đang diễn ra', label: 'Đang diễn ra', count: tabCounts.ongoing },
          { key: 'Đã diễn ra', label: 'Đã diễn ra', count: tabCounts.past },
        ].map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key as any)}
            className={`px-4 py-2 text-sm font-semibold rounded-xl transition-all whitespace-nowrap flex items-center gap-2 cursor-pointer ${
              activeTab === tab.key
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <span>{tab.label}</span>
            <span
              className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                activeTab === tab.key ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
              }`}
            >
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm kiếm sự kiện..."
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-slate-800 placeholder-slate-400"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-slate-800"
        >
          <option value="">Tất cả trạng thái</option>
          {STATUS_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
        </select>
        <select
          value={timeFilter}
          onChange={(e) => setTimeFilter(e.target.value)}
          className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-slate-800"
        >
          <option value="">Thời gian (Tất cả)</option>
          <option value="today">Hôm nay</option>
          <option value="this_week">Tuần này</option>
          <option value="this_month">Tháng này</option>
        </select>
        <select
          value={managerFilter}
          onChange={(e) => setManagerFilter(e.target.value)}
          className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-slate-800"
        >
          <option value="">Người phụ trách (Tất cả)</option>
          {managers.map(m => (
            <option key={m.id} value={m.id}>{m.full_name}</option>
          ))}
        </select>
      </div>

      {/* Table (Items 13 & 17: Thumbnail image + link to /admin/su-kien/[id]) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600 border-collapse min-w-[1000px]">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/50 text-slate-500 font-medium text-xs">
                <th className="py-4 px-5">Tên sự kiện</th>
                <th className="py-4 px-5">Ngày</th>
                <th className="py-4 px-5 max-w-[170px]">Địa điểm</th>
                <th className="py-4 px-5 text-center">Khách dự kiến</th>
                <th className="py-4 px-5">Người phụ trách</th>
                <th className="py-4 px-5">Trạng thái</th>
                <th className="py-4 px-5">Duyệt</th>
                <th className="py-4 px-5 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredEvents.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400 text-sm">
                    {searchQuery ? 'Không tìm thấy sự kiện phù hợp' : 'Chưa có sự kiện nào'}
                  </td>
                </tr>
              ) : (
                filteredEvents.map((event) => (
                  <tr key={event.id} className="hover:bg-slate-50 transition-colors">
                    {/* Item 13 & 17: Thumbnail and clickable name */}
                    <td className="py-3 px-5">
                      <Link
                        href={`/admin/su-kien/${event.id}`}
                        className="flex items-center gap-3 group"
                      >
                        <div className="w-12 h-12 rounded-xl overflow-hidden bg-slate-100 shrink-0 border border-slate-200 group-hover:ring-2 group-hover:ring-blue-500/30 transition-all">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={event.image_url || '/events/event-1.jpg'}
                            alt={event.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                          />
                        </div>
                        <span className="font-semibold text-slate-900 group-hover:text-blue-600 transition-colors line-clamp-2">
                          {event.name}
                        </span>
                      </Link>
                    </td>
                    <td className="py-4 px-5 text-slate-600">{event.event_date ? formatDate(event.event_date) : '—'}</td>
                    <td className="py-4 px-5 text-slate-600 max-w-[170px] truncate" title={event.location || ''}>{event.location || '—'}</td>
                    <td className="py-4 px-5 text-slate-600 text-center font-medium">{event.registration_count ?? 0}</td>
                    <td className="py-4 px-5 text-slate-600">{event.manager_name || '—'}</td>
                    <td className="py-4 px-5">{getStatusBadge(event.status)}</td>
                    <td className="py-4 px-5">{getApprovalBadge(event.approval_status)}</td>
                    <td className="py-4 px-5 text-right">
                      <div className="flex items-center justify-end gap-3">
                        <Link
                          href={`/admin/su-kien/${event.id}`}
                          className="flex items-center gap-1 px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-semibold text-blue-600 hover:bg-blue-50 hover:border-blue-200 transition-colors"
                        >
                          Chi tiết <ChevronRight className="w-3 h-3" />
                        </Link>
                        {isAdmin && (
                          <button
                            onClick={() => handleOpenEditModal(event)}
                            className="text-slate-400 hover:text-blue-600 transition-colors p-1.5 rounded-lg hover:bg-blue-50"
                            title="Sửa"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: Tạo / Sửa sự kiện (Items 14, 18: Bỏ khách dự kiến và người phụ trách) */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl w-full md:w-[1014px] md:max-w-[1014px] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-900">
                {editingEvent ? 'Sửa sự kiện' : 'Tạo sự kiện mới'}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="overflow-y-auto px-6 py-5 flex-1 space-y-5">
              {formError && (
                <div className="bg-rose-50 text-rose-600 px-4 py-3 rounded-xl text-sm flex items-center gap-2 border border-rose-200">
                  <AlertCircle className="w-4 h-4" />
                  {formError}
                </div>
              )}

              {/* Hình ảnh sự kiện */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Hình ảnh sự kiện
                </label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />

                <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 space-y-3">
                  {formData.image_url ? (
                    <div className="relative rounded-lg overflow-hidden border border-slate-200 bg-slate-900 group aspect-[16/9] max-h-48">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={formData.image_url}
                        alt="Event Preview"
                        className="w-full h-full object-cover group-hover:opacity-90 transition-opacity"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="px-3 py-1.5 bg-white/90 hover:bg-white text-slate-800 text-xs font-semibold rounded-lg shadow transition-colors flex items-center gap-1.5"
                        >
                          <Upload className="w-3.5 h-3.5" />
                          Đổi ảnh khác
                        </button>
                        <button
                          type="button"
                          onClick={() => setFormData({ ...formData, image_url: '' })}
                          className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-lg shadow transition-colors flex items-center gap-1.5"
                        >
                          <X className="w-3.5 h-3.5" />
                          Xóa
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="border-2 border-dashed border-slate-200 rounded-lg p-6 text-center bg-white">
                      <LucideImage className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                      <p className="text-xs text-slate-500 mb-3">Chưa có hình ảnh sự kiện</p>
                    </div>
                  )}

                  <div className="flex flex-wrap items-center gap-2.5 pt-1">
                    <button
                      type="button"
                      disabled={isUploadingImage}
                      onClick={() => fileInputRef.current?.click()}
                      className="px-3.5 py-2 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-100 hover:border-slate-300 transition-all shadow-sm flex items-center gap-1.5 disabled:opacity-60"
                    >
                      {isUploadingImage ? (
                        <div className="w-3.5 h-3.5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Upload className="w-3.5 h-3.5 text-blue-600" />
                      )}
                      <span>Tải ảnh từ máy</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setShowMediaLibrary(!showMediaLibrary)}
                      className="px-3.5 py-2 bg-blue-50 border border-blue-200 rounded-lg text-xs font-semibold text-blue-700 hover:bg-blue-100 transition-all flex items-center gap-1.5"
                    >
                      <LucideImage className="w-3.5 h-3.5 text-blue-600" />
                      <span>Chọn từ Thư viện Media</span>
                    </button>
                  </div>

                  {/* Media Library Grid */}
                  {showMediaLibrary && (
                    <div className="mt-3 p-3 bg-white border border-blue-100 rounded-xl shadow-inner space-y-2 animate-in fade-in duration-150">
                      <div className="flex items-center justify-between pb-1 border-b border-slate-100">
                        <span className="text-xs font-bold text-slate-700">Thư viện ảnh sự kiện có sẵn:</span>
                        <button
                          type="button"
                          onClick={() => setShowMediaLibrary(false)}
                          className="text-slate-400 hover:text-slate-600 text-xs"
                        >
                          Đóng
                        </button>
                      </div>
                      <div className="grid grid-cols-4 gap-2 max-h-48 overflow-y-auto p-1">
                        {PRESET_EVENT_IMAGES.map((img) => (
                          <div
                            key={img.url}
                            onClick={() => {
                              setFormData({ ...formData, image_url: img.url });
                              setShowMediaLibrary(false);
                            }}
                            className={`group relative rounded-lg overflow-hidden border-2 cursor-pointer aspect-video transition-all hover:scale-105 ${
                              formData.image_url === img.url
                                ? 'border-blue-600 ring-2 ring-blue-500/20'
                                : 'border-slate-200 hover:border-blue-400'
                            }`}
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={img.url}
                              alt={img.title}
                              className="w-full h-full object-cover"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-1">
                              <span className="text-[10px] text-white font-medium truncate">
                                {img.title}
                              </span>
                            </div>
                            {formData.image_url === img.url && (
                              <div className="absolute top-1 right-1 w-4 h-4 bg-blue-600 rounded-full flex items-center justify-center text-white">
                                <Check className="w-2.5 h-2.5" />
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Tên sự kiện */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                  Tên sự kiện <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-slate-900"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Ngày tổ chức */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                    Ngày tổ chức <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={formData.event_date}
                    onChange={(e) => setFormData({ ...formData, event_date: e.target.value })}
                    className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-slate-900"
                    required
                  />
                </div>
                {/* Trạng thái (Item 14: 4 trạng thái Sắp diễn ra, Kế hoạch, Đang thực hiện, Đã diễn ra) */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                    Trạng thái
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-slate-900"
                  >
                    {STATUS_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                  </select>
                </div>
              </div>

              {/* Địa điểm */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                  Địa điểm
                </label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-slate-900"
                />
              </div>

              {/* 5 trường giá cố định (Mục 7: Read-only / Không cho chỉnh sửa) */}
              <div className="pt-2">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-bold text-slate-800">5 trường giá cố định (chỉ áp dụng sự kiện mới)</h3>
                  <span className="text-[11px] font-medium text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-md">
                    Cố định (Không thể sửa)
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Giá MC</label>
                    <input
                      type="text"
                      readOnly
                      disabled
                      value={new Intl.NumberFormat('vi-VN').format(formData.mc_fee) + ' đ'}
                      className="w-full px-3.5 py-2 bg-slate-100 border border-slate-200 rounded-lg text-sm font-semibold text-slate-600 cursor-not-allowed select-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Giá Thuyết trình</label>
                    <input
                      type="text"
                      readOnly
                      disabled
                      value={new Intl.NumberFormat('vi-VN').format(formData.speaker_fee) + ' đ'}
                      className="w-full px-3.5 py-2 bg-slate-100 border border-slate-200 rounded-lg text-sm font-semibold text-slate-600 cursor-not-allowed select-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Giá Phụng sự</label>
                    <input
                      type="text"
                      readOnly
                      disabled
                      value={new Intl.NumberFormat('vi-VN').format(formData.support_fee) + ' đ'}
                      className="w-full px-3.5 py-2 bg-slate-100 border border-slate-200 rounded-lg text-sm font-semibold text-slate-600 cursor-not-allowed select-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Giá Chốt sự kiện</label>
                    <input
                      type="text"
                      readOnly
                      disabled
                      value={new Intl.NumberFormat('vi-VN').format(formData.closer_fee) + ' đ'}
                      className="w-full px-3.5 py-2 bg-slate-100 border border-slate-200 rounded-lg text-sm font-semibold text-slate-600 cursor-not-allowed select-none"
                    />
                  </div>
                  <div className="col-span-2 sm:col-span-1">
                    <label className="block text-xs font-medium text-slate-600 mb-1">Giá Tiệc trà</label>
                    <input
                      type="text"
                      readOnly
                      disabled
                      value={new Intl.NumberFormat('vi-VN').format(formData.tea_break_fee) + ' đ'}
                      className="w-full px-3.5 py-2 bg-slate-100 border border-slate-200 rounded-lg text-sm font-semibold text-slate-600 cursor-not-allowed select-none"
                    />
                  </div>
                </div>
              </div>

              {/* Ghi chú */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                  Ghi chú
                </label>
                <textarea
                  rows={3}
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-slate-900 resize-none"
                />
              </div>

              {/* Bổ sung Người phụ trách và Vai trò (Mục 2.2) */}
              <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="block text-xs font-bold text-slate-800 uppercase tracking-wide">
                      Người phụ trách & Vai trò (Mục 2.2)
                    </label>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Khai báo một hoặc nhiều người phụ trách và vai trò tương ứng (MC, Nhân sự, Diễn giả, Phụng sự, Chốt sự kiện...)
                    </p>
                  </div>
                </div>

                {/* Danh sách người phụ trách đã thêm */}
                {formInCharges.length > 0 && (
                  <div className="border border-slate-200 rounded-lg overflow-hidden bg-white shadow-2xs">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                        <tr>
                          <th className="py-2.5 px-3 w-12 text-center">STT</th>
                          <th className="py-2.5 px-3">Người phụ trách</th>
                          <th className="py-2.5 px-3">Vai trò</th>
                          <th className="py-2.5 px-3 w-16 text-center">Xóa</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {formInCharges.map((ic, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/80">
                            <td className="py-2 px-3 text-center text-slate-400 font-medium">{idx + 1}</td>
                            <td className="py-2 px-3 font-semibold text-slate-800">{ic.full_name}</td>
                            <td className="py-2 px-3">
                              <span className="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-100">
                                {ic.role}
                              </span>
                            </td>
                            <td className="py-2 px-3 text-center">
                              <button
                                type="button"
                                onClick={() => setFormInCharges(formInCharges.filter((_, i) => i !== idx))}
                                className="text-rose-500 hover:text-rose-700 p-1 rounded hover:bg-rose-50 cursor-pointer"
                                title="Xóa"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Form thêm Người phụ trách (Mục 2.2) */}
                <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 pt-1">
                  <select
                    value={selectedInChargeUserId}
                    onChange={(e) => {
                      const uid = e.target.value;
                      setSelectedInChargeUserId(uid);
                      const m = managers.find((mgr) => String(mgr.id) === uid);
                      if (m) {
                        setNewInChargeName(m.full_name);
                        setNewInChargeRole(m.role || 'Khác');
                      } else {
                        setNewInChargeName('');
                        setNewInChargeRole('');
                      }
                    }}
                    className="flex-1 min-w-[200px] px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">-- Chọn thành viên phụ trách --</option>
                    {managers.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.full_name} {m.role ? `(${m.role})` : ''}
                      </option>
                    ))}
                  </select>

                  <select
                    value={newInChargeRole}
                    disabled
                    className="w-44 px-3 py-2 bg-slate-100 border border-slate-200 rounded-lg text-xs font-semibold text-slate-600 cursor-not-allowed"
                    title="Vai trò được hiển thị theo tài khoản thành viên, không thể thay đổi ở tạo sự kiện"
                  >
                    <option value="">-- Vai trò --</option>
                    <option value="MC">MC</option>
                    <option value="Nhân sự">Nhân sự</option>
                    <option value="Diễn giả">Diễn giả</option>
                    <option value="Thuyết trình">Thuyết trình</option>
                    <option value="Phụng sự">Phụng sự</option>
                    <option value="Chốt sự kiện">Chốt sự kiện</option>
                    <option value="Nhân viên">Nhân viên</option>
                    <option value="Kinh doanh">Kinh doanh</option>
                    <option value="Lễ tân">Lễ tân</option>
                    <option value="Khác">Khác</option>
                    {newInChargeRole && ![
                      'MC', 'Nhân sự', 'Diễn giả', 'Thuyết trình', 'Phụng sự', 'Chốt sự kiện', 'Nhân viên', 'Kinh doanh', 'Lễ tân', 'Khác'
                    ].includes(newInChargeRole) && (
                      <option value={newInChargeRole}>{newInChargeRole}</option>
                    )}
                  </select>

                  <button
                    type="button"
                    onClick={() => {
                      if (!newInChargeName.trim()) return;
                      if (selectedInChargeUserId && formInCharges.some((ic) => String(ic.user_id) === String(selectedInChargeUserId))) {
                        return;
                      }
                      setFormInCharges([
                        ...formInCharges,
                        {
                          user_id: selectedInChargeUserId ? parseInt(selectedInChargeUserId, 10) : undefined,
                          full_name: newInChargeName.trim(),
                          role: newInChargeRole || 'Thành viên',
                        },
                      ]);
                      setNewInChargeName('');
                      setSelectedInChargeUserId('');
                      setNewInChargeRole('');
                    }}
                    disabled={!selectedInChargeUserId}
                    className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg text-xs font-semibold shadow-xs flex items-center gap-1 shrink-0 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Thêm</span>
                  </button>
                </div>
              </div>

              {/* Content Editor gồm Text và Ảnh (Mục 2.2) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="block text-xs font-bold text-slate-800 uppercase tracking-wide">
                      Nội dung giới thiệu chi tiết (Content Editor - Mục 2.2)
                    </label>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Nhập text & chèn ảnh. Nội dung này sẽ xuất hiện tại Tab Giới thiệu trên mục Lịch trình dự kiến.
                    </p>
                  </div>
                </div>

                <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-xs">
                  {/* Toolbar */}
                  <div className="flex flex-wrap items-center gap-1.5 p-2 bg-slate-50 border-b border-slate-200 text-xs">
                    <button
                      type="button"
                      onClick={() => {
                        const url = prompt('Nhập URL hình ảnh:');
                        if (url) {
                          setContentHtml((prev) => `${prev}\n<img src="${url}" alt="Hình ảnh bài viết" class="rounded-xl my-3 max-h-96 object-cover w-full shadow-sm" />\n`);
                        }
                      }}
                      className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg hover:bg-slate-100 font-semibold text-slate-700 flex items-center gap-1.5 cursor-pointer shadow-2xs"
                      title="Chèn ảnh từ liên kết URL"
                    >
                      <LucideImage className="w-3.5 h-3.5 text-blue-600" />
                      <span>Chèn ảnh URL</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        const input = document.createElement('input');
                        input.type = 'file';
                        input.accept = 'image/*';
                        input.onchange = async (e: any) => {
                          const file = e.target?.files?.[0];
                          if (!file) return;
                          const uploadData = new FormData();
                          uploadData.append('file', file);
                          try {
                            const res = await fetch('/api/admin/upload', { method: 'POST', body: uploadData });
                            const d = await res.json();
                            if (d.url) {
                              setContentHtml((prev) => `${prev}\n<img src="${d.url}" alt="${file.name}" class="rounded-xl my-3 max-h-96 object-cover w-full shadow-sm" />\n`);
                            }
                          } catch {
                            alert('Lỗi khi tải ảnh');
                          }
                        };
                        input.click();
                      }}
                      className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg hover:bg-slate-100 font-semibold text-slate-700 flex items-center gap-1.5 cursor-pointer shadow-2xs"
                      title="Tải ảnh từ máy và chèn vào nội dung"
                    >
                      <Upload className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Tải ảnh từ máy</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setContentHtml((prev) => `${prev}\n<h4 class="font-bold text-slate-900 mt-3 mb-1">Tiêu đề đoạn</h4>\n`)}
                      className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg hover:bg-slate-100 font-bold text-slate-700 cursor-pointer shadow-2xs"
                      title="Tiêu đề đoạn"
                    >
                      Tiêu đề H4
                    </button>

                    <button
                      type="button"
                      onClick={() => setContentHtml((prev) => `${prev}\n<p class="text-slate-600 leading-relaxed my-2">Nội dung chi tiết đoạn văn bản...</p>\n`)}
                      className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg hover:bg-slate-100 font-medium text-slate-700 cursor-pointer shadow-2xs"
                      title="Đoạn văn"
                    >
                      Đoạn văn
                    </button>
                  </div>

                  <textarea
                    rows={6}
                    value={contentHtml}
                    onChange={(e) => setContentHtml(e.target.value)}
                    placeholder="Nhập nội dung bài viết và chèn hình ảnh tại đây..."
                    className="w-full p-3.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 font-sans leading-relaxed"
                  />
                </div>
              </div>

              {/* Footer Actions */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2.5 rounded-xl text-sm font-medium text-slate-600 border border-slate-200 hover:bg-slate-50 transition-colors"
                >
                  Huỷ
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 rounded-xl text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors disabled:opacity-70 flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : null}
                  Lưu
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* DRAWER: CẬP NHẬT 5 TRƯỜNG CỐ ĐỊNH (Mục 6 - Hình 9 & 10)       */}
      {/* ============================================================ */}
      {isFixedFeesDrawerOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex justify-end animate-in fade-in duration-150">
          <div className="bg-white w-full max-w-md h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
            {/* Drawer Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
              <h2 className="text-base font-bold text-slate-900 uppercase tracking-tight">
                Cập nhật 5 trường cố định
              </h2>
              <button
                type="button"
                onClick={() => setIsFixedFeesDrawerOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Drawer Content */}
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
              {/* Notice */}
              <div className="p-4 rounded-xl bg-blue-50/80 border border-blue-100 flex items-start gap-3 text-xs text-blue-900">
                <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <p>5 trường dưới đây được áp dụng cố định cho tất cả sự kiện mới.</p>
              </div>

              {/* Table / List */}
              <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                <div className="grid grid-cols-12 bg-slate-50 px-4 py-2.5 text-xs font-semibold text-slate-600 border-b border-slate-200">
                  <div className="col-span-6">Trường cố định</div>
                  <div className="col-span-6 text-right">Giá hiện tại (VNĐ)</div>
                </div>

                <div className="divide-y divide-slate-100 bg-white text-sm">
                  {/* 1. Thù lao phụng sự */}
                  <div className="grid grid-cols-12 items-center px-4 py-3 gap-3">
                    <div className="col-span-6 flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                        <UserCheck className="w-4 h-4" />
                      </div>
                      <span className="font-medium text-slate-800 text-xs sm:text-sm">Thù lao phụng sự</span>
                    </div>
                    <div className="col-span-6">
                      <input
                        type="number"
                        min="0"
                        step="10000"
                        value={tempFixedFees.support_fee}
                        onChange={(e) =>
                          setTempFixedFees({ ...tempFixedFees, support_fee: parseFloat(e.target.value) || 0 })
                        }
                        className="w-full text-right px-3 py-1.5 border border-slate-200 rounded-lg text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  {/* 2. Thù lao MC */}
                  <div className="grid grid-cols-12 items-center px-4 py-3 gap-3">
                    <div className="col-span-6 flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                        <Mic className="w-4 h-4" />
                      </div>
                      <span className="font-medium text-slate-800 text-xs sm:text-sm">Thù lao MC</span>
                    </div>
                    <div className="col-span-6">
                      <input
                        type="number"
                        min="0"
                        step="10000"
                        value={tempFixedFees.mc_fee}
                        onChange={(e) =>
                          setTempFixedFees({ ...tempFixedFees, mc_fee: parseFloat(e.target.value) || 0 })
                        }
                        className="w-full text-right px-3 py-1.5 border border-slate-200 rounded-lg text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  {/* 3. Thù lao thuyết trình */}
                  <div className="grid grid-cols-12 items-center px-4 py-3 gap-3">
                    <div className="col-span-6 flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                        <Presentation className="w-4 h-4" />
                      </div>
                      <span className="font-medium text-slate-800 text-xs sm:text-sm">Thù lao thuyết trình</span>
                    </div>
                    <div className="col-span-6">
                      <input
                        type="number"
                        min="0"
                        step="10000"
                        value={tempFixedFees.speaker_fee}
                        onChange={(e) =>
                          setTempFixedFees({ ...tempFixedFees, speaker_fee: parseFloat(e.target.value) || 0 })
                        }
                        className="w-full text-right px-3 py-1.5 border border-slate-200 rounded-lg text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  {/* 4. Chốt sự kiện */}
                  <div className="grid grid-cols-12 items-center px-4 py-3 gap-3">
                    <div className="col-span-6 flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                        <Handshake className="w-4 h-4" />
                      </div>
                      <span className="font-medium text-slate-800 text-xs sm:text-sm">Chốt sự kiện</span>
                    </div>
                    <div className="col-span-6">
                      <input
                        type="number"
                        min="0"
                        step="10000"
                        value={tempFixedFees.closer_fee}
                        onChange={(e) =>
                          setTempFixedFees({ ...tempFixedFees, closer_fee: parseFloat(e.target.value) || 0 })
                        }
                        className="w-full text-right px-3 py-1.5 border border-slate-200 rounded-lg text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  {/* 5. Chi phí tiệc trà (50đ, TD hỗ trợ) */}
                  <div className="grid grid-cols-12 items-center px-4 py-3 gap-3">
                    <div className="col-span-6 flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                        <Coffee className="w-4 h-4" />
                      </div>
                      <span className="font-medium text-slate-800 text-xs sm:text-sm">Chi phí tiệc trà (50đ, TD hỗ trợ)</span>
                    </div>
                    <div className="col-span-6">
                      <input
                        type="number"
                        min="0"
                        step="10000"
                        value={tempFixedFees.tea_break_fee}
                        onChange={(e) =>
                          setTempFixedFees({ ...tempFixedFees, tea_break_fee: parseFloat(e.target.value) || 0 })
                        }
                        className="w-full text-right px-3 py-1.5 border border-slate-200 rounded-lg text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Lưu ý quan trọng */}
              <div className="p-4 rounded-xl bg-amber-50/80 border border-amber-200 flex items-start gap-3 text-xs text-amber-900">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold mb-1 text-amber-950">Lưu ý quan trọng</p>
                  <p className="text-amber-900 leading-relaxed">
                    Khách mời đã được công ty chi trả phí tiệc trà quá 5 lần, từ lần thứ 6 trở đi khách sẽ tự trả phí.
                    Các thay đổi ở đây chỉ áp dụng cho sự kiện tạo mới sau thời điểm lưu, sự kiện cũ sẽ giữ nguyên giá trị snapshot.
                  </p>
                </div>
              </div>
            </div>

            {/* Drawer Footer */}
            <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-end gap-3 bg-white">
              <button
                type="button"
                onClick={() => setIsFixedFeesDrawerOpen(false)}
                disabled={isSavingFixedFees}
                className="px-5 py-2.5 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-100 border border-slate-200 transition-colors"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleSaveFixedFees}
                disabled={isSavingFixedFees}
                className="px-6 py-2.5 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-all shadow-sm active:scale-[0.98] disabled:opacity-50 flex items-center gap-2"
              >
                {isSavingFixedFees ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Đang lưu...</span>
                  </>
                ) : (
                  <span>Lưu cập nhật</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
