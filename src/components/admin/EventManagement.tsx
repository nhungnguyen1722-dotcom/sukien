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
} from 'lucide-react';

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
}

interface EventManagementProps {
  initialEvents: Event[];
  initialStats: Stats;
  initialManagers: ManagerOption[];
}

const STATUS_OPTIONS = ['Kế hoạch', 'Đang thực hiện', 'Đã hoàn thành'];

export default function EventManagement({
  initialEvents,
  initialStats,
  initialManagers,
}: EventManagementProps) {
  const [events, setEvents] = useState<Event[]>(initialEvents);
  const [stats, setStats] = useState<Stats>(initialStats);
  const [managers, setManagers] = useState<ManagerOption[]>(initialManagers);
  
  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [managerFilter, setManagerFilter] = useState('');

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

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    event_date: '',
    expected_guests: 0,
    location: '',
    manager_id: '',
    status: 'Kế hoạch',
    mc_fee: 200000,
    speaker_fee: 300000,
    support_fee: 200000,
    closer_fee: 200000,
    tea_break_fee: 1250000,
    notes: '',
  });

  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSyncingSheet, setIsSyncingSheet] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

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

  // Debounce the search/filter triggering if needed, but simple useMemo for client-side filtering is fine too.
  // Since we have an API, we can either call refreshData on filter change, or just filter client-side.
  // The provided image shows filters, let's just do client-side filtering for immediate response.
  const filteredEvents = useMemo(() => {
    return events.filter(e => {
      const matchSearch = e.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchStatus = statusFilter ? e.status === statusFilter : true;
      const matchManager = managerFilter ? String(e.manager_id) === managerFilter : true;
      return matchSearch && matchStatus && matchManager;
    });
  }, [events, searchQuery, statusFilter, managerFilter]);


  const handleOpenAddModal = () => {
    setEditingEvent(null);
    setFormData({
      name: '',
      event_date: '',
      expected_guests: 0,
      location: '',
      manager_id: '',
      status: 'Kế hoạch',
      mc_fee: Number(fixedFees.mc_fee) || 200000,
      speaker_fee: Number(fixedFees.speaker_fee) || 300000,
      support_fee: Number(fixedFees.support_fee) || 200000,
      closer_fee: Number(fixedFees.closer_fee) || 200000,
      tea_break_fee: Number(fixedFees.tea_break_fee) || 1250000,
      notes: '',
    });
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
      expected_guests: event.expected_guests || 0,
      location: event.location || '',
      manager_id: event.manager_id ? String(event.manager_id) : '',
      status: event.status || 'Kế hoạch',
      mc_fee: Number(event.mc_fee) || 0,
      speaker_fee: Number(event.speaker_fee) || 0,
      support_fee: Number(event.support_fee) || 0,
      closer_fee: Number(event.closer_fee) || 0,
      tea_break_fee: Number(event.tea_break_fee) || 0,
      notes: event.notes || '',
    });
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
        body: JSON.stringify(formData),
      });

      const resData = await res.json();
      if (!res.ok) {
        throw new Error(resData.error || 'Có lỗi xảy ra');
      }

      showToast('success', editingEvent ? 'Cập nhật sự kiện thành công' : 'Thêm mới sự kiện thành công');
      setIsModalOpen(false);
      await refreshData(); // Refresh list & stats
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
    if (status === 'Đã hoàn thành') return <span className="inline-block px-3 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">{status}</span>;
    if (status === 'Đang thực hiện') return <span className="inline-block px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">{status}</span>;
    return <span className="inline-block px-3 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600">{status || 'Kế hoạch'}</span>;
  };
  
  const getApprovalBadge = (status: string) => {
    if (status === 'Đã duyệt') return <span className="inline-block px-3 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">{status}</span>;
    if (status === 'Từ chối') return <span className="inline-block px-3 py-1 rounded-full text-xs font-medium bg-rose-100 text-rose-700">{status}</span>;
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

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleSyncSheet}
            disabled={isSyncingSheet}
            className="inline-flex items-center justify-center gap-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 px-4 py-2.5 rounded-xl text-sm font-semibold shadow-xs transition-all cursor-pointer disabled:opacity-50 active:scale-[0.98]"
            title="Đồng bộ danh sách sự kiện sang Google Sheet"
          >
            <FileSpreadsheet className={`w-4 h-4 ${isSyncingSheet ? 'animate-spin' : ''}`} />
            <span>{isSyncingSheet ? 'Đang đồng bộ...' : 'Đồng bộ Sheet'}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setTempFixedFees(fixedFees);
              setIsFixedFeesDrawerOpen(true);
            }}
            className="inline-flex items-center justify-center gap-2 bg-white hover:bg-slate-50 text-blue-600 border border-blue-200 px-4 py-2.5 rounded-xl text-sm font-semibold shadow-xs transition-all active:scale-[0.98]"
          >
            <Settings2 className="w-4 h-4 text-blue-600" />
            <span>Cập nhật giá 5 trường cố định</span>
          </button>

          <button
            onClick={handleOpenAddModal}
            className="inline-flex items-center justify-center gap-2 bg-[#2563eb] hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl text-sm font-semibold shadow-sm transition-all active:scale-[0.98]"
          >
            <Plus className="w-4 h-4" />
            <span>Tạo sự kiện mới</span>
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
              <CalendarDays className="w-5 h-5" />
            </div>
            <span className="text-xs font-medium text-slate-500">Tổng sự kiện</span>
          </div>
          <div className="text-2xl font-bold text-slate-900 pl-1">{stats.totalEvents}</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
              <TrendingUp className="w-5 h-5" />
            </div>
            <span className="text-xs font-medium text-slate-500">Sắp diễn ra</span>
          </div>
          <div className="text-2xl font-bold text-slate-900 pl-1">{stats.upcomingEvents}</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600">
              <Users className="w-5 h-5" />
            </div>
            <span className="text-xs font-medium text-slate-500">Tổng khách</span>
          </div>
          <div className="text-2xl font-bold text-slate-900 pl-1">{stats.totalGuests}</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600">
              <Wallet className="w-5 h-5" />
            </div>
            <span className="text-xs font-medium text-slate-500">Tổng chi phí</span>
          </div>
          <div className="text-2xl font-bold text-slate-900 pl-1">{formatCurrency(stats.totalCost)}</div>
        </div>
      </div>

      {/* Quy tắc chi phí tiệc trà banner (Hình 9 & 10) */}
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

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm kiếm..."
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-slate-800 placeholder-slate-400"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-slate-800"
        >
          <option value="">Trạng thái</option>
          {STATUS_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
        </select>
        <select
          className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-slate-800 text-slate-400"
          disabled
        >
          <option value="">Thời gian (chưa hỗ trợ)</option>
        </select>
        <select
          value={managerFilter}
          onChange={(e) => setManagerFilter(e.target.value)}
          className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-slate-800"
        >
          <option value="">Người phụ trách</option>
          {managers.map(m => (
            <option key={m.id} value={m.id}>{m.full_name}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600 border-collapse min-w-[1000px]">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/50 text-slate-500 font-medium text-xs">
                <th className="py-4 px-5">Tên sự kiện</th>
                <th className="py-4 px-5">Ngày</th>
                <th className="py-4 px-5">Địa điểm</th>
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
                    <td className="py-4 px-5 font-medium text-slate-800">{event.name}</td>
                    <td className="py-4 px-5 text-slate-600">{event.event_date ? formatDate(event.event_date) : '—'}</td>
                    <td className="py-4 px-5 text-slate-600">{event.location || '—'}</td>
                    <td className="py-4 px-5 text-slate-600 text-center">{event.expected_guests || 0}</td>
                    <td className="py-4 px-5 text-slate-600">{event.manager_name || '—'}</td>
                    <td className="py-4 px-5">{getStatusBadge(event.status)}</td>
                    <td className="py-4 px-5">{getApprovalBadge(event.approval_status)}</td>
                    <td className="py-4 px-5 text-right">
                      <div className="flex items-center justify-end gap-3">
                        <Link
                          href={`/admin/su-kien/${event.id}`}
                          className="flex items-center gap-1 px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors"
                        >
                          Chi tiết <ChevronRight className="w-3 h-3" />
                        </Link>
                        <button
                          onClick={() => handleOpenEditModal(event)}
                          className="text-slate-400 hover:text-blue-600 transition-colors p-1.5 rounded-lg hover:bg-blue-50"
                          title="Sửa"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
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
                {/* Số lượng khách dự kiến */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                    Số lượng khách dự kiến
                  </label>
                  <input
                    type="number"
                    value={formData.expected_guests}
                    onChange={(e) => setFormData({ ...formData, expected_guests: parseInt(e.target.value) || 0 })}
                    className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-slate-900"
                  />
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

              <div className="grid grid-cols-2 gap-4">
                {/* Người phụ trách */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                    Người phụ trách
                  </label>
                  <select
                    value={formData.manager_id}
                    onChange={(e) => setFormData({ ...formData, manager_id: e.target.value })}
                    className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-slate-900"
                  >
                    <option value="">Chọn thành viên</option>
                    {managers.map(m => (
                      <option key={m.id} value={m.id}>{m.full_name}</option>
                    ))}
                  </select>
                </div>
                {/* Trạng thái */}
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
