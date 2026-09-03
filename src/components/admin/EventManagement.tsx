'use client';

import React, { useState, useMemo } from 'react';
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

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    event_date: '',
    expected_guests: 0,
    location: '',
    manager_id: '',
    status: 'Kế hoạch',
    mc_fee: 0,
    speaker_fee: 0,
    support_fee: 0,
    closer_fee: 0,
    tea_break_fee: 0,
    notes: '',
  });

  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const showToast = (type: 'success' | 'error', text: string) => {
    setToastMessage({ type, text });
    setTimeout(() => setToastMessage(null), 4000);
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
      mc_fee: 0,
      speaker_fee: 0,
      support_fee: 0,
      closer_fee: 0,
      tea_break_fee: 0,
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

        <button
          onClick={handleOpenAddModal}
          className="inline-flex items-center justify-center gap-2 bg-[#2563eb] hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl text-sm font-semibold shadow-sm transition-all active:scale-[0.98]"
        >
          <Plus className="w-4 h-4" />
          <span>Tạo sự kiện</span>
        </button>
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

              {/* 5 trường giá cố định */}
              <div className="pt-2">
                <h3 className="text-sm font-bold text-slate-800 mb-3">5 trường giá cố định (chỉ áp dụng sự kiện mới)</h3>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Giá MC</label>
                    <input
                      type="number"
                      value={formData.mc_fee}
                      onChange={(e) => setFormData({ ...formData, mc_fee: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Giá Thuyết trình</label>
                    <input
                      type="number"
                      value={formData.speaker_fee}
                      onChange={(e) => setFormData({ ...formData, speaker_fee: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Giá Phụng sự</label>
                    <input
                      type="number"
                      value={formData.support_fee}
                      onChange={(e) => setFormData({ ...formData, support_fee: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Giá Chốt sự kiện</label>
                    <input
                      type="number"
                      value={formData.closer_fee}
                      onChange={(e) => setFormData({ ...formData, closer_fee: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Giá Tiệc trà</label>
                    <input
                      type="number"
                      value={formData.tea_break_fee}
                      onChange={(e) => setFormData({ ...formData, tea_break_fee: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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
    </div>
  );
}
