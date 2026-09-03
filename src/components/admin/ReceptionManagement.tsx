'use client';

import React, { useState, useMemo, useEffect } from 'react';
import {
  ConciergeBell,
  UserPlus,
  Search,
  CheckCircle2,
  AlertCircle,
  Trash2,
  Clock,
  UserCheck,
  RefreshCw,
  X,
  ChevronDown
} from 'lucide-react';

export interface EventItem {
  id: number;
  name: string;
  event_date: string | null;
  location: string | null;
}

export interface SaleUser {
  id: number;
  full_name: string;
  phone: string;
  role?: string | null;
  classification?: string | null;
  ref_code?: string | null;
}

export interface RegistrationItem {
  id: number;
  event_id: number;
  guest_code: string | null;
  guest_name: string;
  guest_phone: string | null;
  guest_email?: string | null;
  company_address?: string | null;
  guest_role: string;
  source: string;
  referrer_id: number | null;
  sale_name: string;
  sale_phone?: string | null;
  attendance_status: string;
  notes: string | null;
  registered_at?: string | null;
  created_at: string | null;
  event_name?: string;
  event_date?: string | null;
  event_location?: string | null;
}

interface ReceptionManagementProps {
  initialEvents: EventItem[];
  initialSales: SaleUser[];
  initialRegistrations: RegistrationItem[];
  defaultEventId?: number;
}

const ROLE_OPTIONS = [
  'MC',
  'Thuyết trình',
  'Phụng sự',
  'Chốt sự kiện',
  'Khách mời',
  'VIP',
  'Khách thường',
  'Khác',
];

const SOURCE_OPTIONS = [
  'Lễ tân nhập',
  'QR',
  'Link chia sẻ',
  'Giới thiệu',
  'Zalo',
  'Facebook',
  'Khác',
];

const STATUS_OPTIONS = [
  'Đã đăng ký',
  'Đã check-in',
  'Mới đăng ký',
  'Đã tham dự',
  'Vắng mặt',
];

export default function ReceptionManagement({
  initialEvents,
  initialSales,
  initialRegistrations,
  defaultEventId,
}: ReceptionManagementProps) {
  const [events] = useState<EventItem[]>(initialEvents);
  const [sales] = useState<SaleUser[]>(initialSales);
  
  // Selected event
  const [selectedEventId, setSelectedEventId] = useState<number | string>(
    defaultEventId || (events.length > 0 ? events[0].id : '')
  );

  // Registrations state
  const [registrations, setRegistrations] = useState<RegistrationItem[]>(initialRegistrations);
  const [isLoadingRegs, setIsLoadingRegs] = useState(false);
  const [tableSearch, setTableSearch] = useState('');

  // Form State
  const [guestCode, setGuestCode] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [guestName, setGuestName] = useState('');
  const [saleSearch, setSaleSearch] = useState('');
  const [selectedSaleId, setSelectedSaleId] = useState('');
  const [guestRole, setGuestRole] = useState('MC');
  const [source, setSource] = useState('Lễ tân nhập');
  const [attendanceStatus, setAttendanceStatus] = useState('Đã đăng ký');
  const [notes, setNotes] = useState('');

  // UI state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [toast, setToast] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);

  const showToast = (type: 'success' | 'error', text: string) => {
    setToast({ type, text });
    setTimeout(() => {
      setToast(null);
    }, 4000);
  };

  // Find currently selected event object
  const currentEvent = useMemo(() => {
    return events.find((e) => e.id === Number(selectedEventId)) || null;
  }, [events, selectedEventId]);

  // Format date helper
  const formatDateDisplay = (dateString: string | null | undefined) => {
    if (!dateString) return '—';
    if (/^\d{4}-\d{2}-\d{2}/.test(dateString)) {
      return dateString.substring(0, 10);
    }
    try {
      const d = new Date(dateString);
      if (isNaN(d.getTime())) return dateString;
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    } catch {
      return dateString;
    }
  };

  // Fetch registrations whenever selected event changes
  const fetchRegistrations = async (eventId: number | string) => {
    if (!eventId) {
      setRegistrations([]);
      return;
    }
    setIsLoadingRegs(true);
    try {
      const res = await fetch(`/api/admin/le-tan?eventId=${eventId}`);
      if (res.ok) {
        const data = await res.json();
        setRegistrations(data.registrations || []);
      } else {
        showToast('error', 'Không thể tải danh sách khách mời');
      }
    } catch (err) {
      console.error('Fetch registrations error:', err);
      showToast('error', 'Có lỗi xảy ra khi kết nối máy chủ');
    } finally {
      setIsLoadingRegs(false);
    }
  };

  const handleEventChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newEventId = e.target.value;
    setSelectedEventId(newEventId);
    if (newEventId) {
      fetchRegistrations(newEventId);
    } else {
      setRegistrations([]);
    }
  };

  // Filter sales for the dropdown
  const filteredSales = useMemo(() => {
    if (!saleSearch.trim()) return sales;
    const query = saleSearch.toLowerCase().trim();
    return sales.filter(
      (s) =>
        s.full_name?.toLowerCase().includes(query) ||
        s.phone?.includes(query) ||
        s.ref_code?.toLowerCase().includes(query) ||
        s.classification?.toLowerCase().includes(query)
    );
  }, [sales, saleSearch]);

  // Filter registrations for table view
  const filteredRegistrations = useMemo(() => {
    if (!tableSearch.trim()) return registrations;
    const q = tableSearch.toLowerCase().trim();
    return registrations.filter(
      (r) =>
        r.guest_name?.toLowerCase().includes(q) ||
        r.guest_phone?.includes(q) ||
        r.guest_code?.toLowerCase().includes(q) ||
        r.sale_name?.toLowerCase().includes(q) ||
        r.guest_role?.toLowerCase().includes(q) ||
        r.source?.toLowerCase().includes(q) ||
        r.attendance_status?.toLowerCase().includes(q)
    );
  }, [registrations, tableSearch]);

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!selectedEventId) {
      setFormError('Vui lòng chọn sự kiện');
      return;
    }

    if (!guestName.trim()) {
      setFormError('Vui lòng nhập họ tên khách');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        event_id: Number(selectedEventId),
        guest_code: guestCode.trim() || null,
        guest_phone: guestPhone.trim() || null,
        guest_name: guestName.trim(),
        referrer_id: selectedSaleId ? Number(selectedSaleId) : null,
        guest_role: guestRole,
        source: source,
        attendance_status: attendanceStatus,
        notes: notes.trim() || null,
      };

      const res = await fetch('/api/admin/le-tan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (res.ok) {
        showToast('success', 'Thêm khách mời thành công');
        // Prepend or refresh table
        if (data.registration) {
          setRegistrations((prev) => [data.registration, ...prev]);
        } else {
          fetchRegistrations(selectedEventId);
        }

        // Reset form inputs (keep selected event)
        setGuestCode('');
        setGuestPhone('');
        setGuestName('');
        setSelectedSaleId('');
        setSaleSearch('');
        setGuestRole('MC');
        setSource('Lễ tân nhập');
        setAttendanceStatus('Đã đăng ký');
        setNotes('');
      } else {
        setFormError(data.error || 'Có lỗi xảy ra khi thêm khách mời');
      }
    } catch (err) {
      console.error('Submit error:', err);
      setFormError('Lỗi kết nối máy chủ khi tạo khách mời');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Quick check-in toggle
  const handleQuickCheckin = async (reg: RegistrationItem) => {
    const nextStatus = reg.attendance_status === 'Đã check-in' ? 'Đã đăng ký' : 'Đã check-in';
    try {
      const res = await fetch('/api/admin/le-tan', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: reg.id,
          attendance_status: nextStatus,
        }),
      });

      if (res.ok) {
        setRegistrations((prev) =>
          prev.map((item) =>
            item.id === reg.id ? { ...item, attendance_status: nextStatus } : item
          )
        );
        showToast('success', `Đã cập nhật trạng thái: ${nextStatus}`);
      } else {
        showToast('error', 'Không thể cập nhật trạng thái');
      }
    } catch (err) {
      console.error('Checkin update error:', err);
      showToast('error', 'Lỗi khi cập nhật trạng thái');
    }
  };

  // Delete guest
  const handleDeleteRegistration = async (id: number) => {
    try {
      const res = await fetch(`/api/admin/le-tan?id=${id}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        setRegistrations((prev) => prev.filter((r) => r.id !== id));
        showToast('success', 'Đã xóa khách mời khỏi danh sách');
      } else {
        showToast('error', 'Không thể xóa khách mời');
      }
    } catch (err) {
      console.error('Delete error:', err);
      showToast('error', 'Lỗi kết nối khi xóa khách mời');
    } finally {
      setDeleteConfirmId(null);
    }
  };

  return (
    <div className="p-6 max-w-[1600px] mx-auto min-h-screen text-slate-800">
      {/* Toast notification */}
      {toast && (
        <div
          className={`fixed top-6 right-6 z-50 flex items-center gap-3 px-5 py-3.5 rounded-xl shadow-xl text-sm font-medium text-white transition-all transform animate-in fade-in slide-in-from-top-4 duration-300 ${
            toast.type === 'success' ? 'bg-emerald-600' : 'bg-rose-600'
          }`}
        >
          {toast.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
          )}
          <span>{toast.text}</span>
          <button
            onClick={() => setToast(null)}
            className="ml-2 hover:opacity-80 p-0.5 rounded-md"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmId !== null && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl border border-slate-100 animate-in zoom-in-95">
            <h3 className="text-lg font-bold text-slate-900 mb-2">Xác nhận xóa</h3>
            <p className="text-sm text-slate-600 mb-6">
              Bạn có chắc chắn muốn xóa bản ghi khách mời này? Hành động này không thể hoàn tác.
            </p>
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition"
              >
                Hủy bỏ
              </button>
              <button
                onClick={() => handleDeleteRegistration(deleteConfirmId)}
                className="px-4 py-2 text-sm font-medium text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-sm transition"
              >
                Xóa ngay
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 text-slate-700 bg-white rounded-lg border border-slate-200/80 shadow-xs">
          <ConciergeBell className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            Lễ tân — Nhập khách mời
          </h1>
          <p className="text-sm text-slate-500 font-normal">
            Nhập khách mời trên máy tính — đầy đủ trường theo đặc tả
          </p>
        </div>
      </div>

      {/* Two Column Layout Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Column: Entry Form */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs">
          <form onSubmit={handleSubmit} className="space-y-4">
            {formError && (
              <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            {/* Event Dropdown */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Sự kiện <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <select
                  value={selectedEventId}
                  onChange={handleEventChange}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition appearance-none cursor-pointer pr-10"
                >
                  <option value="" disabled>-- Chọn sự kiện --</option>
                  {events.map((ev) => (
                    <option key={ev.id} value={ev.id}>
                      {ev.name}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>

              {/* Event Info Card Box */}
              <div className="mt-2.5 p-3.5 bg-slate-50/90 border border-slate-100 rounded-xl text-xs space-y-1 text-slate-600">
                <div className="flex items-center gap-1.5">
                  <span className="font-medium text-slate-500">Ngày:</span>
                  <span className="text-slate-800 font-semibold">
                    {formatDateDisplay(currentEvent?.event_date)}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="font-medium text-slate-500">Địa điểm:</span>
                  <span className="text-slate-800">
                    {currentEvent?.location || '—'}
                  </span>
                </div>
              </div>
            </div>

            {/* Row 1: Guest Code & Phone */}
            <div className="grid grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Mã khách
                </label>
                <input
                  type="text"
                  value={guestCode}
                  onChange={(e) => setGuestCode(e.target.value)}
                  placeholder="KH0001"
                  className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  SĐT
                </label>
                <input
                  type="text"
                  value={guestPhone}
                  onChange={(e) => setGuestPhone(e.target.value)}
                  placeholder="09xxx"
                  className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                />
              </div>
            </div>

            {/* Guest Name */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Họ tên khách <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                placeholder="Nhập họ tên"
                required
                className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
              />
            </div>

            {/* Referrer / Sale */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Người mời (Sale)
              </label>
              <div className="space-y-2">
                {/* Search Sale input */}
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={saleSearch}
                    onChange={(e) => setSaleSearch(e.target.value)}
                    placeholder="Tìm Sale..."
                    className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-3.5 py-2 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                  />
                  {saleSearch && (
                    <button
                      type="button"
                      onClick={() => setSaleSearch('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Select dropdown */}
                <div className="relative">
                  <select
                    value={selectedSaleId}
                    onChange={(e) => setSelectedSaleId(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition appearance-none cursor-pointer pr-10"
                  >
                    <option value="">Chọn Sale hoặc Khách vãng lai</option>
                    {filteredSales.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.full_name} {s.phone ? `(${s.phone})` : ''} {s.classification ? `— ${s.classification}` : ''}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>
            </div>

            {/* Row 2: Role & Source */}
            <div className="grid grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Vai trò
                </label>
                <div className="relative">
                  <select
                    value={guestRole}
                    onChange={(e) => setGuestRole(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition appearance-none cursor-pointer pr-8"
                  >
                    {ROLE_OPTIONS.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Nguồn
                </label>
                <div className="relative">
                  <select
                    value={source}
                    onChange={(e) => setSource(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition appearance-none cursor-pointer pr-8"
                  >
                    {SOURCE_OPTIONS.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>
            </div>

            {/* Attendance Status */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Tình trạng
              </label>
              <div className="relative">
                <select
                  value={attendanceStatus}
                  onChange={(e) => setAttendanceStatus(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition appearance-none cursor-pointer pr-10"
                >
                  {STATUS_OPTIONS.map((st) => (
                    <option key={st} value={st}>
                      {st}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Ghi chú
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition resize-y"
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-[#2563eb] hover:bg-[#1d4ed8] text-white py-3 px-4 rounded-xl font-semibold text-sm shadow-sm hover:shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed mt-2"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Đang lưu...</span>
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4" />
                  <span>Thêm khách mời</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Right Column: Registered Guest Table */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs">
          {/* Table Header & Search */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <h2 className="text-base font-bold text-slate-900">
                Khách mời đã nhập ({registrations.length})
              </h2>
              {isLoadingRegs && (
                <RefreshCw className="w-4 h-4 text-blue-600 animate-spin" />
              )}
            </div>

            {/* Quick search input */}
            <div className="relative w-full sm:w-60">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={tableSearch}
                onChange={(e) => setTableSearch(e.target.value)}
                placeholder="Tìm tên, SĐT..."
                className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:bg-white transition"
              />
              {tableSearch && (
                <button
                  onClick={() => setTableSearch('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 font-semibold">
                  <th className="pb-3 pr-3 font-medium">Mã</th>
                  <th className="pb-3 px-3 font-medium">Tên</th>
                  <th className="pb-3 px-3 font-medium">SĐT</th>
                  <th className="pb-3 px-3 font-medium">Sale</th>
                  <th className="pb-3 px-3 font-medium">Vai trò</th>
                  <th className="pb-3 px-3 font-medium">Nguồn</th>
                  <th className="pb-3 px-3 font-medium">Tình trạng</th>
                  <th className="pb-3 pl-3 font-medium text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredRegistrations.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-400">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <UserPlus className="w-8 h-8 text-slate-300" />
                        <p className="text-sm">Chưa có khách mời nào được nhập cho sự kiện này</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredRegistrations.map((guest) => {
                    const isCheckedIn = guest.attendance_status === 'Đã check-in';
                    const isAbsent = guest.attendance_status === 'Vắng mặt';

                    return (
                      <tr
                        key={guest.id}
                        className="hover:bg-slate-50/80 transition-colors group"
                      >
                        <td className="py-3.5 pr-3 text-slate-400 font-mono">
                          {guest.guest_code || '—'}
                        </td>
                        <td className="py-3.5 px-3 font-medium text-slate-900">
                          {guest.guest_name}
                        </td>
                        <td className="py-3.5 px-3 text-slate-600 font-mono">
                          {guest.guest_phone || '—'}
                        </td>
                        <td className="py-3.5 px-3 text-slate-600">
                          {guest.sale_name || '—'}
                        </td>
                        <td className="py-3.5 px-3">
                          <span className="inline-block px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-700">
                            {guest.guest_role || 'MC'}
                          </span>
                        </td>
                        <td className="py-3.5 px-3">
                          <span className="text-slate-600 text-xs">
                            {guest.source || 'Lễ tân nhập'}
                          </span>
                        </td>
                        <td className="py-3.5 px-3">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium ${
                              isCheckedIn
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
                                : isAbsent
                                ? 'bg-rose-50 text-rose-700 border border-rose-200/60'
                                : 'bg-blue-50 text-blue-700 border border-blue-200/60'
                            }`}
                          >
                            {guest.attendance_status || 'Đã đăng ký'}
                          </span>
                        </td>
                        <td className="py-3.5 pl-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Quick Check-in Button */}
                            <button
                              onClick={() => handleQuickCheckin(guest)}
                              title={isCheckedIn ? 'Hủy check-in' : 'Check-in nhanh'}
                              className={`p-1.5 rounded-lg transition ${
                                isCheckedIn
                                  ? 'text-emerald-600 hover:bg-emerald-50'
                                  : 'text-slate-400 hover:text-blue-600 hover:bg-blue-50'
                              }`}
                            >
                              <UserCheck className="w-4 h-4" />
                            </button>

                            {/* Delete Button */}
                            <button
                              onClick={() => setDeleteConfirmId(guest.id)}
                              title="Xóa khách mời"
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}
