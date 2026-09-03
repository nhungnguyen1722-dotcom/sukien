'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  CalendarDays,
  Calendar,
  MapPin,
  Users,
  Wallet,
  Receipt,
  CreditCard,
  ArrowLeft,
  Search,
  Plus,
  Pencil,
  Trash2,
  CheckCircle2,
  XCircle,
  Download,
  FileText,
  Presentation,
  Check,
  AlertCircle,
  X,
  Clock,
  UserCheck,
  ShieldCheck,
  Building2,
  Phone,
  Paperclip,
} from 'lucide-react';

export interface EventData {
  id: number;
  code: string | null;
  name: string;
  short_description: string | null;
  detail_description: string | null;
  event_date: string | null;
  start_time: string | null;
  end_time: string | null;
  location: string | null;
  event_format: string | null;
  fee: string | number | null;
  expected_guests: number;
  event_type: string | null;
  manager_id: number | null;
  manager_name?: string | null;
  manager_phone?: string | null;
  manager_email?: string | null;
  creator_id: number | null;
  status: string;
  approval_status: string;
  approved_by: number | null;
  approved_by_name?: string | null;
  approved_at: string | null;
  approval_notes: string | null;
  mc_fee: string | number;
  speaker_fee: string | number;
  support_fee: string | number;
  closer_fee: string | number;
  tea_break_fee: string | number;
  notes: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface Registration {
  id: number;
  event_id: number;
  guest_name: string;
  guest_phone: string | null;
  guest_email: string | null;
  company_address: string | null;
  source: string | null;
  referrer_name?: string | null;
  attendance_status: string;
  is_food_approved: boolean;
  notes: string | null;
  registered_at: string | null;
  checkin_at: string | null;
}

export interface EventLog {
  id: number;
  event_id: number;
  event_code: string;
  event_date: string | null;
  title: string;
  location: string;
  total_attendees: number;
  food_guests_count: number;
  staff_remuneration: string | number;
  tea_break_cost: string | number;
  total_cost: string | number;
  status: string;
  updater_name: string;
  notes: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface Attachment {
  id: number;
  event_id: number;
  file_name: string;
  file_url: string;
  file_type: string;
  file_size?: string | null;
  uploaded_by?: string | null;
  created_at: string | null;
}

export interface ManagerOption {
  id: number;
  full_name: string;
  role?: string;
}

interface EventDetailProps {
  initialEvent: EventData;
  initialRegistrations: Registration[];
  initialLogs: EventLog[];
  initialAttachments: Attachment[];
  managers: ManagerOption[];
}

export default function EventDetail({
  initialEvent,
  initialRegistrations,
  initialLogs,
  initialAttachments,
  managers,
}: EventDetailProps) {
  const [event, setEvent] = useState<EventData>(initialEvent);
  const [registrations, setRegistrations] = useState<Registration[]>(initialRegistrations);
  const [logs, setLogs] = useState<EventLog[]>(initialLogs);
  const [attachments, setAttachments] = useState<Attachment[]>(initialAttachments);

  // Active Tab: 'general' | 'costs' | 'approval' | 'logs' | 'attachments'
  const [activeTab, setActiveTab] = useState<'general' | 'costs' | 'approval' | 'logs' | 'attachments'>('general');

  // Modals
  const [isEditCostModalOpen, setIsEditCostModalOpen] = useState(false);
  const [isAddLogModalOpen, setIsAddLogModalOpen] = useState(false);
  const [isAddGuestModalOpen, setIsAddGuestModalOpen] = useState(false);
  const [isAddAttachModalOpen, setIsAddAttachModalOpen] = useState(false);

  // Toast
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const showToast = (type: 'success' | 'error', text: string) => {
    setToastMessage({ type, text });
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Form states
  const [costForm, setCostForm] = useState({
    mc_fee: Number(event.mc_fee) || 0,
    speaker_fee: Number(event.speaker_fee) || 0,
    support_fee: Number(event.support_fee) || 0,
    closer_fee: Number(event.closer_fee) || 0,
    tea_break_fee: Number(event.tea_break_fee) || 0,
  });

  const [approvalNote, setApprovalNote] = useState(event.approval_notes || '');
  const [isSubmittingApproval, setIsSubmittingApproval] = useState(false);

  // Log Form State
  const [logForm, setLogForm] = useState({
    event_code: event.code || `ST${String(event.id).padStart(3, '0')}`,
    event_date: event.event_date ? new Date(event.event_date).toISOString().split('T')[0] : '',
    title: event.name || '',
    location: event.location || 'P. Đại Mỗ',
    total_attendees: event.expected_guests || 8,
    food_guests_count: Math.max(1, Math.floor((event.expected_guests || 8) * 0.3)),
    staff_remuneration: (Number(event.mc_fee) || 0) + (Number(event.speaker_fee) || 0) + (Number(event.support_fee) || 0) + (Number(event.closer_fee) || 0) || 4500000,
    tea_break_cost: Number(event.tea_break_fee) || 350000,
    total_cost: 0,
    status: event.status || 'Kế hoạch',
    updater_name: 'Vũ Thị Cúc',
    notes: '',
  });

  // Guest Form State
  const [guestForm, setGuestForm] = useState({
    guest_name: '',
    guest_phone: '',
    guest_email: '',
    company_address: '',
    source: 'Lễ tân nhập',
    attendance_status: 'Mới đăng ký',
    notes: '',
  });

  // Attachment Form State
  const [attachForm, setAttachForm] = useState({
    file_name: '',
    file_type: 'PDF Document',
    file_size: '1.5 MB',
    file_url: '#',
    uploaded_by: 'Admin',
  });

  // Guest search/filter
  const [guestSearch, setGuestSearch] = useState('');
  const [guestStatusFilter, setGuestStatusFilter] = useState('');

  // Calculations
  const totalStaffCost = useMemo(() => {
    return (
      (Number(event.mc_fee) || 0) +
      (Number(event.speaker_fee) || 0) +
      (Number(event.support_fee) || 0) +
      (Number(event.closer_fee) || 0)
    );
  }, [event.mc_fee, event.speaker_fee, event.support_fee, event.closer_fee]);

  const totalExpectedCost = useMemo(() => {
    const sum5 = totalStaffCost + (Number(event.tea_break_fee) || 0);
    return sum5 > 0 ? sum5 : Number(event.fee) || 0;
  }, [totalStaffCost, event.tea_break_fee, event.fee]);

  const collected = 0; // Default 0 as per demo image
  const remaining = totalExpectedCost - collected;

  const formatCurrency = (amount: number | string | null | undefined) => {
    const num = Number(amount) || 0;
    return new Intl.NumberFormat('vi-VN').format(num) + ' đ';
  };

  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '—';
    return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
  };

  const formatDateTime = (dateStr: string | null | undefined) => {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '—';
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  const getStatusBadge = (status: string) => {
    if (status === 'Đã hoàn thành') {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700">
          Đã hoàn thành
        </span>
      );
    }
    if (status === 'Đang thực hiện') {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-700">
          Đang thực hiện
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">
        {status || 'Kế hoạch'}
      </span>
    );
  };

  const getApprovalBadge = (status: string) => {
    if (status === 'Đã duyệt') {
      return (
        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
          <Check className="w-3.5 h-3.5" /> Đã duyệt
        </span>
      );
    }
    if (status === 'Từ chối') {
      return (
        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-rose-100 text-rose-800">
          <X className="w-3.5 h-3.5" /> Từ chối
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">
        <Clock className="w-3.5 h-3.5" /> Chờ duyệt
      </span>
    );
  };

  // Filtered registrations
  const filteredGuests = useMemo(() => {
    return registrations.filter((r) => {
      const matchSearch =
        (r.guest_name && r.guest_name.toLowerCase().includes(guestSearch.toLowerCase())) ||
        (r.guest_phone && r.guest_phone.includes(guestSearch));
      const matchStatus = guestStatusFilter ? r.attendance_status === guestStatusFilter : true;
      return matchSearch && matchStatus;
    });
  }, [registrations, guestSearch, guestStatusFilter]);

  // Handler: Update 5 fees
  const handleUpdateCosts = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`/api/admin/events/${event.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: event.name,
          event_date: event.event_date ? new Date(event.event_date).toISOString().split('T')[0] : '',
          expected_guests: event.expected_guests,
          location: event.location,
          manager_id: event.manager_id,
          status: event.status,
          mc_fee: costForm.mc_fee,
          speaker_fee: costForm.speaker_fee,
          support_fee: costForm.support_fee,
          closer_fee: costForm.closer_fee,
          tea_break_fee: costForm.tea_break_fee,
          notes: event.notes,
        }),
      });

      if (!res.ok) throw new Error('Cập nhật chi phí thất bại');

      const data = await res.json();
      setEvent({
        ...event,
        mc_fee: costForm.mc_fee,
        speaker_fee: costForm.speaker_fee,
        support_fee: costForm.support_fee,
        closer_fee: costForm.closer_fee,
        tea_break_fee: costForm.tea_break_fee,
      });

      showToast('success', 'Đã cập nhật chi phí sự kiện thành công');
      setIsEditCostModalOpen(false);
    } catch (err) {
      showToast('error', 'Có lỗi xảy ra khi cập nhật chi phí');
    }
  };

  // Handler: Update Approval Status (Admin)
  const handleUpdateApproval = async (newStatus: 'Đã duyệt' | 'Từ chối' | 'Chờ duyệt') => {
    setIsSubmittingApproval(true);
    try {
      const res = await fetch(`/api/admin/events/${event.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          approval_status: newStatus,
          approval_notes: approvalNote,
        }),
      });

      if (!res.ok) throw new Error('Cập nhật trạng thái duyệt thất bại');

      setEvent({
        ...event,
        approval_status: newStatus,
        approval_notes: approvalNote,
        approved_by_name: newStatus === 'Đã duyệt' ? 'Vũ Thị Cúc (Admin)' : null,
        approved_at: newStatus === 'Đã duyệt' ? new Date().toISOString() : null,
      });

      showToast('success', `Đã chuyển trạng thái sự kiện sang: ${newStatus}`);
    } catch (err) {
      showToast('error', 'Lỗi khi cập nhật trạng thái duyệt');
    } finally {
      setIsSubmittingApproval(false);
    }
  };

  // Handler: Add Guest
  const handleAddGuest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!guestForm.guest_name.trim()) {
      showToast('error', 'Vui lòng nhập họ và tên khách');
      return;
    }

    try {
      const res = await fetch('/api/admin/le-tan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event_id: event.id,
          guest_name: guestForm.guest_name,
          guest_phone: guestForm.guest_phone,
          source: guestForm.source,
          attendance_status: guestForm.attendance_status,
          notes: guestForm.notes,
        }),
      });

      if (!res.ok) throw new Error('Lỗi khi thêm khách');
      const data = await res.json();

      setRegistrations([data.registration, ...registrations]);
      showToast('success', 'Thêm khách tham dự thành công');
      setIsAddGuestModalOpen(false);
      setGuestForm({
        guest_name: '',
        guest_phone: '',
        guest_email: '',
        company_address: '',
        source: 'Lễ tân nhập',
        attendance_status: 'Mới đăng ký',
        notes: '',
      });
    } catch (err) {
      showToast('error', 'Có lỗi xảy ra khi thêm khách');
    }
  };

  // Handler: Toggle check-in status
  const handleToggleCheckin = async (reg: Registration) => {
    const nextStatus = reg.attendance_status === 'Đã check-in' ? 'Mới đăng ký' : 'Đã check-in';
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
        setRegistrations(
          registrations.map((r) => (r.id === reg.id ? { ...r, attendance_status: nextStatus } : r))
        );
        showToast('success', `Đã chuyển trạng thái sang ${nextStatus}`);
      }
    } catch (err) {
      showToast('error', 'Lỗi khi cập nhật trạng thái');
    }
  };

  // Handler: Add Log
  const handleAddLog = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const computedTotal = Number(logForm.staff_remuneration) + Number(logForm.tea_break_cost);
      const res = await fetch(`/api/admin/events/${event.id}/logs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...logForm,
          total_cost: computedTotal,
        }),
      });

      if (!res.ok) throw new Error('Thêm nhật ký thất bại');
      const data = await res.json();
      setLogs([data.log, ...logs]);
      showToast('success', 'Thêm bản ghi nhật ký thành công');
      setIsAddLogModalOpen(false);
    } catch (err) {
      showToast('error', 'Lỗi khi thêm bản ghi nhật ký');
    }
  };

  // Handler: Delete Log
  const handleDeleteLog = async (logId: number) => {
    if (!confirm('Bạn có chắc chắn muốn xóa bản ghi nhật ký này?')) return;
    try {
      const res = await fetch(`/api/admin/events/${event.id}/logs?logId=${logId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setLogs(logs.filter((l) => l.id !== logId));
        showToast('success', 'Đã xóa bản ghi nhật ký');
      }
    } catch (err) {
      showToast('error', 'Lỗi khi xóa bản ghi');
    }
  };

  // Handler: Export Excel (CSV format with UTF-8 BOM for full Excel compatibility)
  const handleExportExcel = () => {
    if (logs.length === 0) {
      showToast('error', 'Không có bản ghi nhật ký nào để xuất');
      return;
    }

    const headers = [
      'Mã sự kiện',
      'Ngày tổ chức',
      'Tên sự kiện / Tiệc trà',
      'Địa điểm',
      'Tổng người tham gia',
      'Số lượng Khách mời ăn',
      'Tổng thù lao NS (đ)',
      'Chi phí tiệc trà (đ)',
      'Tổng chi phí SK (đ)',
      'Trạng thái',
      'Thời gian cập nhật',
      'Người cập nhật',
      'Ghi chú',
    ];

    const rows = logs.map((l) => [
      `"${l.event_code || ''}"`,
      `"${formatDate(l.event_date)}"`,
      `"${(l.title || '').replace(/"/g, '""')}"`,
      `"${(l.location || '').replace(/"/g, '""')}"`,
      l.total_attendees || 0,
      l.food_guests_count || 0,
      Number(l.staff_remuneration) || 0,
      Number(l.tea_break_cost) || 0,
      Number(l.total_cost) || 0,
      `"${l.status || ''}"`,
      `"${formatDateTime(l.updated_at || l.created_at)}"`,
      `"${(l.updater_name || '').replace(/"/g, '""')}"`,
      `"${(l.notes || '').replace(/"/g, '""')}"`,
    ]);

    // Summary row
    const totalAttendees = logs.reduce((sum, l) => sum + (Number(l.total_attendees) || 0), 0);
    const totalFood = logs.reduce((sum, l) => sum + (Number(l.food_guests_count) || 0), 0);
    const totalStaff = logs.reduce((sum, l) => sum + (Number(l.staff_remuneration) || 0), 0);
    const totalTea = logs.reduce((sum, l) => sum + (Number(l.tea_break_cost) || 0), 0);
    const totalCostSum = logs.reduce((sum, l) => sum + (Number(l.total_cost) || 0), 0);

    const summaryRow = [
      '"TỔNG CỘNG"',
      '""',
      '""',
      '""',
      totalAttendees,
      totalFood,
      totalStaff,
      totalTea,
      totalCostSum,
      '""',
      '""',
      '""',
      '""',
    ];

    const csvContent =
      '\uFEFF' +
      [headers.join(','), ...rows.map((r) => r.join(',')), summaryRow.join(',')].join('\r\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Nhat_ky_su_kien_${event.id}_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showToast('success', 'Đã xuất file Excel / CSV thành công');
  };

  // Handler: Add Attachment
  const handleAddAttachment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!attachForm.file_name.trim()) {
      showToast('error', 'Vui lòng nhập tên tệp đính kèm');
      return;
    }

    try {
      const res = await fetch(`/api/admin/events/${event.id}/attachments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(attachForm),
      });

      if (!res.ok) throw new Error('Thêm tệp thất bại');
      const data = await res.json();
      setAttachments([data.attachment, ...attachments]);
      showToast('success', 'Đã thêm tệp đính kèm thành công');
      setIsAddAttachModalOpen(false);
      setAttachForm({
        file_name: '',
        file_type: 'PDF Document',
        file_size: '1.5 MB',
        file_url: '#',
        uploaded_by: 'Admin',
      });
    } catch (err) {
      showToast('error', 'Lỗi khi thêm tệp');
    }
  };

  // Handler: Delete Attachment
  const handleDeleteAttachment = async (attachId: number) => {
    if (!confirm('Bạn có chắc muốn xóa tệp này?')) return;
    try {
      const res = await fetch(`/api/admin/events/${event.id}/attachments?attachmentId=${attachId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setAttachments(attachments.filter((a) => a.id !== attachId));
        showToast('success', 'Đã xóa tệp đính kèm');
      }
    } catch (err) {
      showToast('error', 'Lỗi khi xóa tệp');
    }
  };

  return (
    <div className="p-8 max-w-[1600px] mx-auto min-h-screen bg-[#f8fafc]">
      {/* Toast Notification */}
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

      {/* Breadcrumbs */}
      <div className="flex items-center gap-2 text-sm text-slate-500 mb-4">
        <Link href="/admin/su-kien" className="hover:text-blue-600 transition-colors">
          Sự kiện
        </Link>
        <span>/</span>
        <span className="text-slate-800 font-medium">Chi tiết sự kiện</span>
      </div>

      {/* Main Header Card */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
        <div className="flex items-start md:items-center gap-5">
          {/* Blue calendar icon block */}
          <div className="w-16 h-16 rounded-2xl bg-[#2563eb] text-white flex items-center justify-center flex-shrink-0 shadow-md shadow-blue-500/10">
            <CalendarDays className="w-8 h-8" />
          </div>

          {/* Event info */}
          <div>
            <div className="flex flex-wrap items-center gap-3 mb-2">
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{event.name}</h1>
              {getStatusBadge(event.status)}
            </div>

            <div className="flex flex-wrap items-center gap-5 text-sm text-slate-500 font-normal">
              <div className="flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-slate-400" />
                <span>{formatDate(event.event_date)}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-slate-400" />
                <span>{event.location && event.location !== '-' ? event.location : '—'}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Users className="w-4 h-4 text-slate-400" />
                <span>{event.expected_guests || 0} khách</span>
              </div>
            </div>
          </div>
        </div>

        {/* Back Button */}
        <div className="flex items-center gap-3 self-end md:self-center">
          <Link
            href="/admin/su-kien"
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-all shadow-sm active:scale-95"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Quay lại</span>
          </Link>
        </div>
      </div>

      {/* 4 Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        {/* Card 1: Khách dự kiến */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
              <Users className="w-5 h-5" />
            </div>
            <span className="text-xs font-medium text-slate-500">Khách dự kiến</span>
          </div>
          <div className="text-2xl font-bold text-slate-900 pl-1">{event.expected_guests || 0}</div>
        </div>

        {/* Card 2: Chi phí dự kiến */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600">
              <Wallet className="w-5 h-5" />
            </div>
            <span className="text-xs font-medium text-slate-500">Chi phí dự kiến</span>
          </div>
          <div className="text-2xl font-bold text-slate-900 pl-1">{formatCurrency(totalExpectedCost)}</div>
        </div>

        {/* Card 3: Đã thu */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
              <Receipt className="w-5 h-5" />
            </div>
            <span className="text-xs font-medium text-slate-500">Đã thu</span>
          </div>
          <div className="text-2xl font-bold text-slate-900 pl-1">{formatCurrency(collected)}</div>
        </div>

        {/* Card 4: Còn lại */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center text-rose-600">
              <CreditCard className="w-5 h-5" />
            </div>
            <span className="text-xs font-medium text-slate-500">Còn lại</span>
          </div>
          <div className="text-2xl font-bold text-slate-900 pl-1">{formatCurrency(remaining)}</div>
        </div>
      </div>

      {/* Tabs Navigation Bar */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-1.5 shadow-sm mb-6 flex flex-wrap items-center gap-1.5">
        <button
          onClick={() => setActiveTab('general')}
          className={`flex-1 min-w-[140px] py-2.5 px-4 text-center rounded-xl text-sm font-semibold transition-all ${
            activeTab === 'general'
              ? 'bg-slate-100 text-slate-900 shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          Thông tin chung
        </button>

        <button
          onClick={() => setActiveTab('costs')}
          className={`flex-1 min-w-[140px] py-2.5 px-4 text-center rounded-xl text-sm font-semibold transition-all ${
            activeTab === 'costs'
              ? 'bg-slate-100 text-slate-900 shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          Chi phí dự kiến
        </button>

        <button
          onClick={() => setActiveTab('approval')}
          className={`flex-1 min-w-[140px] py-2.5 px-4 text-center rounded-xl text-sm font-semibold transition-all ${
            activeTab === 'approval'
              ? 'bg-slate-100 text-slate-900 shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          Lịch sử duyệt
        </button>

        <button
          onClick={() => setActiveTab('logs')}
          className={`flex-1 min-w-[140px] py-2.5 px-4 text-center rounded-xl text-sm font-semibold transition-all ${
            activeTab === 'logs'
              ? 'bg-slate-100 text-slate-900 shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          Nhật ký sự kiện
        </button>

        <button
          onClick={() => setActiveTab('attachments')}
          className={`flex-1 min-w-[140px] py-2.5 px-4 text-center rounded-xl text-sm font-semibold transition-all ${
            activeTab === 'attachments'
              ? 'bg-slate-100 text-slate-900 shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          Tệp đính kèm
        </button>
      </div>

      {/* Tab Contents */}

      {/* TAB 1: THÔNG TIN CHUNG */}
      {activeTab === 'general' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm space-y-8 animate-in fade-in duration-150">
          {/* General Metadata Section */}
          <div className="space-y-3 text-sm">
            <div className="flex items-center gap-2">
              <span className="text-slate-500 font-medium min-w-[120px]">Người phụ trách:</span>
              <span className="text-slate-800 font-semibold">{event.manager_name || '—'}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-slate-500 font-medium min-w-[120px]">Trạng thái:</span>
              <span>{getStatusBadge(event.status)}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-slate-500 font-medium min-w-[120px]">Ghi chú:</span>
              <span className="text-slate-700">{event.notes || event.name || '—'}</span>
            </div>
          </div>

          <hr className="border-slate-100" />

          {/* Guest Registration & Check-in Section */}
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
              <h2 className="text-base font-bold text-slate-900">
                Khách đăng ký & check-in ({registrations.length})
              </h2>

              <button
                onClick={() => setIsAddGuestModalOpen(true)}
                className="inline-flex items-center gap-2 bg-[#2563eb] hover:bg-blue-700 text-white px-3.5 py-2 rounded-xl text-xs font-semibold shadow-sm transition-all active:scale-95"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Thêm khách</span>
              </button>
            </div>

            {/* Guest Filters */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
              <div className="relative sm:col-span-2">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={guestSearch}
                  onChange={(e) => setGuestSearch(e.target.value)}
                  placeholder="Tìm khách theo tên hoặc số điện thoại..."
                  className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white text-slate-800 placeholder-slate-400"
                />
              </div>

              <select
                value={guestStatusFilter}
                onChange={(e) => setGuestStatusFilter(e.target.value)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white text-slate-800"
              >
                <option value="">Tất cả trạng thái</option>
                <option value="Mới đăng ký">Mới đăng ký</option>
                <option value="Đã check-in">Đã check-in</option>
                <option value="Đã tham dự">Đã tham dự</option>
                <option value="Vắng mặt">Vắng mặt</option>
              </select>
            </div>

            {/* Guest Table */}
            <div className="border border-slate-100 rounded-xl overflow-hidden">
              <table className="w-full text-left text-xs text-slate-600 border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-100">
                    <th className="py-3 px-4">Tên</th>
                    <th className="py-3 px-4">SĐT</th>
                    <th className="py-3 px-4">Nguồn</th>
                    <th className="py-3 px-4">Tình trạng</th>
                    <th className="py-3 px-4 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredGuests.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-400">
                        Chưa có khách đăng ký cho sự kiện này
                      </td>
                    </tr>
                  ) : (
                    filteredGuests.map((guest) => (
                      <tr key={guest.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3.5 px-4 font-semibold text-slate-800">
                          {guest.guest_name}
                        </td>
                        <td className="py-3.5 px-4 text-slate-600">{guest.guest_phone || '—'}</td>
                        <td className="py-3.5 px-4 text-slate-600">{guest.source || 'Lễ tân nhập'}</td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`inline-block px-2.5 py-0.5 rounded-full font-medium ${
                              guest.attendance_status === 'Đã check-in'
                                ? 'bg-emerald-100 text-emerald-700'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {guest.attendance_status || 'Mới đăng ký'}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <button
                            onClick={() => handleToggleCheckin(guest)}
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                              guest.attendance_status === 'Đã check-in'
                                ? 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                                : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                            }`}
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>{guest.attendance_status === 'Đã check-in' ? 'Hủy check-in' : 'Check-in'}</span>
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: CHI PHÍ DỰ KIẾN */}
      {activeTab === 'costs' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm space-y-6 animate-in fade-in duration-150">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">Chi tiết 5 trường giá cố định</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Bảng giá phân bổ thù lao ban tổ chức và hỗ trợ chi phí tiệc trà
              </p>
            </div>

            <button
              onClick={() => {
                setCostForm({
                  mc_fee: Number(event.mc_fee) || 0,
                  speaker_fee: Number(event.speaker_fee) || 0,
                  support_fee: Number(event.support_fee) || 0,
                  closer_fee: Number(event.closer_fee) || 0,
                  tea_break_fee: Number(event.tea_break_fee) || 0,
                });
                setIsEditCostModalOpen(true);
              }}
              className="inline-flex items-center gap-2 bg-[#2563eb] hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-xs font-semibold shadow-sm transition-all active:scale-95"
            >
              <Pencil className="w-3.5 h-3.5" />
              <span>Cập nhật chi phí</span>
            </button>
          </div>

          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <table className="w-full text-left text-sm text-slate-700 border-collapse">
              <thead className="bg-slate-50 text-slate-500 font-semibold text-xs border-b border-slate-200">
                <tr>
                  <th className="py-3 px-5">Khoản mục chi phí</th>
                  <th className="py-3 px-5">Mô tả / Vai trò</th>
                  <th className="py-3 px-5 text-right">Mức chi phí (VNĐ)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                <tr>
                  <td className="py-3.5 px-5 font-semibold text-slate-800">1. Thù lao MC</td>
                  <td className="py-3.5 px-5 text-slate-500 text-xs">Dẫn chương trình sự kiện</td>
                  <td className="py-3.5 px-5 text-right font-medium text-slate-900">
                    {formatCurrency(event.mc_fee)}
                  </td>
                </tr>
                <tr>
                  <td className="py-3.5 px-5 font-semibold text-slate-800">2. Thù lao Thuyết trình / Diễn giả</td>
                  <td className="py-3.5 px-5 text-slate-500 text-xs">Diễn giả chia sẻ chuyên đề</td>
                  <td className="py-3.5 px-5 text-right font-medium text-slate-900">
                    {formatCurrency(event.speaker_fee)}
                  </td>
                </tr>
                <tr>
                  <td className="py-3.5 px-5 font-semibold text-slate-800">3. Thù lao Phụng sự</td>
                  <td className="py-3.5 px-5 text-slate-500 text-xs">Hỗ trợ hậu cần, đón tiếp</td>
                  <td className="py-3.5 px-5 text-right font-medium text-slate-900">
                    {formatCurrency(event.support_fee)}
                  </td>
                </tr>
                <tr>
                  <td className="py-3.5 px-5 font-semibold text-slate-800">4. Thù lao Người chốt</td>
                  <td className="py-3.5 px-5 text-slate-500 text-xs">Chốt hợp đồng / gói tài trợ</td>
                  <td className="py-3.5 px-5 text-right font-medium text-slate-900">
                    {formatCurrency(event.closer_fee)}
                  </td>
                </tr>
                <tr>
                  <td className="py-3.5 px-5 font-semibold text-slate-800">5. Chi phí Tiệc trà</td>
                  <td className="py-3.5 px-5 text-slate-500 text-xs">Công ty hỗ trợ (50.000 đ/khách)</td>
                  <td className="py-3.5 px-5 text-right font-medium text-slate-900">
                    {formatCurrency(event.tea_break_fee)}
                  </td>
                </tr>
              </tbody>
              <tfoot className="bg-slate-50/80 font-bold border-t border-slate-200">
                <tr>
                  <td colSpan={2} className="py-4 px-5 text-slate-900">
                    TỔNG CHI PHÍ DỰ KIẾN
                  </td>
                  <td className="py-4 px-5 text-right text-base text-blue-600">
                    {formatCurrency(totalExpectedCost)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: LỊCH SỬ DUYỆT */}
      {activeTab === 'approval' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm space-y-6 animate-in fade-in duration-150">
          <div>
            <h2 className="text-base font-bold text-slate-900">Thông tin & Phê duyệt sự kiện (Admin)</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Quyền phê duyệt sự kiện dành riêng cho tài khoản Quản trị viên (Vũ Thị Cúc)
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50 p-5 rounded-xl border border-slate-200/80">
            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-2">
                <span className="text-slate-500 font-medium min-w-[140px]">Trạng thái duyệt:</span>
                <div>{getApprovalBadge(event.approval_status)}</div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-slate-500 font-medium min-w-[140px]">Người duyệt:</span>
                <span className="text-slate-800 font-semibold">
                  {event.approved_by_name || (event.approval_status === 'Đã duyệt' ? 'Vũ Thị Cúc (Admin)' : '—')}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-slate-500 font-medium min-w-[140px]">Thời gian duyệt:</span>
                <span className="text-slate-700">
                  {event.approved_at ? formatDateTime(event.approved_at) : '—'}
                </span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Ghi chú phê duyệt:
              </label>
              <textarea
                rows={3}
                value={approvalNote}
                onChange={(e) => setApprovalNote(e.target.value)}
                placeholder="Nhập lý do duyệt hoặc ghi chú điều chỉnh..."
                className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 resize-none"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              onClick={() => handleUpdateApproval('Từ chối')}
              disabled={isSubmittingApproval}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 rounded-xl text-xs font-semibold transition-all active:scale-95 disabled:opacity-60"
            >
              <XCircle className="w-4 h-4 text-rose-600" />
              <span>Từ chối sự kiện</span>
            </button>

            <button
              onClick={() => handleUpdateApproval('Đã duyệt')}
              disabled={isSubmittingApproval}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-all active:scale-95 disabled:opacity-60"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Phê duyệt sự kiện</span>
            </button>
          </div>
        </div>
      )}

      {/* TAB 4: NHẬT KÝ SỰ KIỆN */}
      {activeTab === 'logs' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm space-y-6 animate-in fade-in duration-150">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <h2 className="text-base font-bold text-slate-900">
              Nhật ký quản lý sự kiện & chi phí
            </h2>

            <div className="flex items-center gap-3">
              <button
                onClick={handleExportExcel}
                className="inline-flex items-center gap-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 px-3.5 py-2 rounded-xl text-xs font-semibold shadow-sm transition-all active:scale-95"
              >
                <Download className="w-3.5 h-3.5 text-slate-600" />
                <span>Xuất Excel</span>
              </button>

              <button
                onClick={() => {
                  setLogForm({
                    event_code: event.code || `ST${String(event.id).padStart(3, '0')}`,
                    event_date: event.event_date ? new Date(event.event_date).toISOString().split('T')[0] : '',
                    title: event.name || '',
                    location: event.location || 'P. Đại Mỗ',
                    total_attendees: event.expected_guests || 8,
                    food_guests_count: Math.max(1, Math.floor((event.expected_guests || 8) * 0.3)),
                    staff_remuneration: totalStaffCost || 4500000,
                    tea_break_cost: Number(event.tea_break_fee) || 350000,
                    total_cost: 0,
                    status: event.status || 'Kế hoạch',
                    updater_name: 'Vũ Thị Cúc',
                    notes: '',
                  });
                  setIsAddLogModalOpen(true);
                }}
                className="inline-flex items-center gap-1.5 bg-[#2563eb] hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-xs font-semibold shadow-sm transition-all active:scale-95"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Thêm</span>
              </button>
            </div>
          </div>

          {logs.length === 0 ? (
            <div className="py-20 text-center text-slate-400 text-sm">
              Chưa có bản ghi.
            </div>
          ) : (
            <div className="border border-slate-200 rounded-xl overflow-x-auto shadow-sm">
              <table className="w-full text-left text-xs text-slate-600 border-collapse min-w-[1100px]">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                    <th className="py-3 px-3.5">Mã sự kiện</th>
                    <th className="py-3 px-3.5">Ngày tổ chức</th>
                    <th className="py-3 px-3.5">Tên sự kiện / Tiệc trà</th>
                    <th className="py-3 px-3.5">Địa điểm</th>
                    <th className="py-3 px-3.5 text-center">Tổng người TG</th>
                    <th className="py-3 px-3.5 text-center">Khách mời ăn</th>
                    <th className="py-3 px-3.5 text-right">Tổng thù lao NS</th>
                    <th className="py-3 px-3.5 text-right">Chi phí tiệc trà (Cty)</th>
                    <th className="py-3 px-3.5 text-right">Tổng chi phí SK</th>
                    <th className="py-3 px-3.5 text-center">Trạng thái</th>
                    <th className="py-3 px-3.5">Cập nhật lúc</th>
                    <th className="py-3 px-3.5">Người cập nhật</th>
                    <th className="py-3 px-3.5 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {logs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-3.5 font-bold text-blue-600">{log.event_code}</td>
                      <td className="py-3 px-3.5 text-slate-700">{formatDate(log.event_date)}</td>
                      <td className="py-3 px-3.5 font-medium text-slate-800 max-w-[200px] truncate" title={log.title}>
                        {log.title}
                      </td>
                      <td className="py-3 px-3.5 text-slate-600">{log.location}</td>
                      <td className="py-3 px-3.5 text-center font-semibold text-slate-800">
                        {log.total_attendees}
                      </td>
                      <td className="py-3 px-3.5 text-center font-semibold text-amber-600">
                        {log.food_guests_count}
                      </td>
                      <td className="py-3 px-3.5 text-right font-medium text-slate-800">
                        {formatCurrency(log.staff_remuneration)}
                      </td>
                      <td className="py-3 px-3.5 text-right font-medium text-slate-800">
                        {formatCurrency(log.tea_break_cost)}
                      </td>
                      <td className="py-3 px-3.5 text-right font-bold text-slate-900">
                        {formatCurrency(log.total_cost)}
                      </td>
                      <td className="py-3 px-3.5 text-center">{getStatusBadge(log.status)}</td>
                      <td className="py-3 px-3.5 text-slate-500 text-[11px]">
                        {formatDateTime(log.updated_at || log.created_at)}
                      </td>
                      <td className="py-3 px-3.5 text-slate-700 font-medium">{log.updater_name}</td>
                      <td className="py-3 px-3.5 text-right">
                        <button
                          onClick={() => handleDeleteLog(log.id)}
                          className="text-slate-400 hover:text-rose-600 transition-colors p-1 rounded hover:bg-rose-50"
                          title="Xóa bản ghi"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-slate-50 font-bold border-t border-slate-200 text-slate-900">
                  <tr>
                    <td colSpan={4} className="py-3.5 px-3.5">
                      TỔNG CỘNG ({logs.length} bản ghi)
                    </td>
                    <td className="py-3.5 px-3.5 text-center">
                      {logs.reduce((sum, l) => sum + (Number(l.total_attendees) || 0), 0)}
                    </td>
                    <td className="py-3.5 px-3.5 text-center text-amber-700">
                      {logs.reduce((sum, l) => sum + (Number(l.food_guests_count) || 0), 0)}
                    </td>
                    <td className="py-3.5 px-3.5 text-right">
                      {formatCurrency(logs.reduce((sum, l) => sum + (Number(l.staff_remuneration) || 0), 0))}
                    </td>
                    <td className="py-3.5 px-3.5 text-right">
                      {formatCurrency(logs.reduce((sum, l) => sum + (Number(l.tea_break_cost) || 0), 0))}
                    </td>
                    <td className="py-3.5 px-3.5 text-right text-blue-600">
                      {formatCurrency(logs.reduce((sum, l) => sum + (Number(l.total_cost) || 0), 0))}
                    </td>
                    <td colSpan={4}></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 5: TỆP ĐÍNH KÈM */}
      {activeTab === 'attachments' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm space-y-6 animate-in fade-in duration-150">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">Tệp đính kèm sự kiện</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Kế hoạch tổ chức, slide thuyết trình, hình ảnh và tài liệu liên quan
              </p>
            </div>

            <button
              onClick={() => setIsAddAttachModalOpen(true)}
              className="inline-flex items-center gap-2 bg-[#2563eb] hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-xs font-semibold shadow-sm transition-all active:scale-95"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Thêm tệp</span>
            </button>
          </div>

          {attachments.length === 0 ? (
            <div className="py-16 text-center text-slate-400 text-sm">
              Chưa có tệp đính kèm nào cho sự kiện này.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {attachments.map((file) => (
                <div
                  key={file.id}
                  className="bg-slate-50 rounded-xl p-4 border border-slate-200 flex items-start justify-between gap-3 hover:bg-slate-100/70 transition-colors"
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center flex-shrink-0">
                      <Paperclip className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-xs font-bold text-slate-800 truncate" title={file.file_name}>
                        {file.file_name}
                      </h4>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        {file.file_size || '1.2 MB'} • {file.file_type || 'Tài liệu'}
                      </p>
                      <p className="text-[10px] text-slate-400 mt-1">
                        Tải lên bởi: {file.uploaded_by || 'Admin'}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => handleDeleteAttachment(file.id)}
                    className="text-slate-400 hover:text-rose-600 p-1 rounded hover:bg-rose-50 transition-colors flex-shrink-0"
                    title="Xóa tệp"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* MODAL: CHỈNH SỬA 5 TRƯỜNG GIÁ */}
      {isEditCostModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">Cập nhật 5 trường chi phí</h3>
              <button
                onClick={() => setIsEditCostModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateCosts} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Giá MC (VNĐ)</label>
                <input
                  type="number"
                  value={costForm.mc_fee}
                  onChange={(e) => setCostForm({ ...costForm, mc_fee: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Giá Thuyết trình / Diễn giả (VNĐ)</label>
                <input
                  type="number"
                  value={costForm.speaker_fee}
                  onChange={(e) => setCostForm({ ...costForm, speaker_fee: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Giá Phụng sự (VNĐ)</label>
                <input
                  type="number"
                  value={costForm.support_fee}
                  onChange={(e) => setCostForm({ ...costForm, support_fee: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Giá Chốt sự kiện (VNĐ)</label>
                <input
                  type="number"
                  value={costForm.closer_fee}
                  onChange={(e) => setCostForm({ ...costForm, closer_fee: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Giá Tiệc trà (VNĐ)</label>
                <input
                  type="number"
                  value={costForm.tea_break_fee}
                  onChange={(e) => setCostForm({ ...costForm, tea_break_fee: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsEditCostModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-slate-600 border border-slate-200 hover:bg-slate-50"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-colors shadow-sm"
                >
                  Lưu thay đổi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: THÊM NHẬT KÝ SỰ KIỆN */}
      {isAddLogModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">Thêm bản ghi nhật ký sự kiện</h3>
              <button
                onClick={() => setIsAddLogModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddLog} className="p-6 overflow-y-auto space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Mã sự kiện</label>
                  <input
                    type="text"
                    value={logForm.event_code}
                    onChange={(e) => setLogForm({ ...logForm, event_code: e.target.value })}
                    className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Ngày tổ chức</label>
                  <input
                    type="date"
                    value={logForm.event_date}
                    onChange={(e) => setLogForm({ ...logForm, event_date: e.target.value })}
                    className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Tên sự kiện / Tiệc trà</label>
                <input
                  type="text"
                  value={logForm.title}
                  onChange={(e) => setLogForm({ ...logForm, title: e.target.value })}
                  className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Địa điểm</label>
                  <input
                    type="text"
                    value={logForm.location}
                    onChange={(e) => setLogForm({ ...logForm, location: e.target.value })}
                    className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Trạng thái</label>
                  <select
                    value={logForm.status}
                    onChange={(e) => setLogForm({ ...logForm, status: e.target.value })}
                    className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900"
                  >
                    <option value="Kế hoạch">Kế hoạch</option>
                    <option value="Đang thực hiện">Đang thực hiện</option>
                    <option value="Đã hoàn thành">Đã hoàn thành</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Tổng người tham gia</label>
                  <input
                    type="number"
                    value={logForm.total_attendees}
                    onChange={(e) => setLogForm({ ...logForm, total_attendees: parseInt(e.target.value) || 0 })}
                    className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Số lượng khách mời ăn</label>
                  <input
                    type="number"
                    value={logForm.food_guests_count}
                    onChange={(e) => setLogForm({ ...logForm, food_guests_count: parseInt(e.target.value) || 0 })}
                    className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Tổng thù lao NS (VNĐ)</label>
                  <input
                    type="number"
                    value={logForm.staff_remuneration}
                    onChange={(e) => setLogForm({ ...logForm, staff_remuneration: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Chi phí tiệc trà (VNĐ)</label>
                  <input
                    type="number"
                    value={logForm.tea_break_cost}
                    onChange={(e) => setLogForm({ ...logForm, tea_break_cost: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Người cập nhật</label>
                <input
                  type="text"
                  value={logForm.updater_name}
                  onChange={(e) => setLogForm({ ...logForm, updater_name: e.target.value })}
                  className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddLogModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-slate-600 border border-slate-200 hover:bg-slate-50"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-colors shadow-sm"
                >
                  Lưu bản ghi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: THÊM KHÁCH MỜI */}
      {isAddGuestModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">Thêm khách tham dự</h3>
              <button
                onClick={() => setIsAddGuestModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddGuest} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Họ và tên <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={guestForm.guest_name}
                  onChange={(e) => setGuestForm({ ...guestForm, guest_name: e.target.value })}
                  placeholder="Ví dụ: Nguyễn Văn A"
                  className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Số điện thoại</label>
                <input
                  type="text"
                  value={guestForm.guest_phone}
                  onChange={(e) => setGuestForm({ ...guestForm, guest_phone: e.target.value })}
                  placeholder="0912..."
                  className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Nguồn</label>
                  <select
                    value={guestForm.source}
                    onChange={(e) => setGuestForm({ ...guestForm, source: e.target.value })}
                    className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900"
                  >
                    <option value="Lễ tân nhập">Lễ tân nhập</option>
                    <option value="QR Code">QR Code</option>
                    <option value="Website">Website</option>
                    <option value="Bạn bè mời">Bạn bè mời</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Tình trạng</label>
                  <select
                    value={guestForm.attendance_status}
                    onChange={(e) => setGuestForm({ ...guestForm, attendance_status: e.target.value })}
                    className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900"
                  >
                    <option value="Mới đăng ký">Mới đăng ký</option>
                    <option value="Đã check-in">Đã check-in</option>
                    <option value="Đã tham dự">Đã tham dự</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddGuestModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-slate-600 border border-slate-200 hover:bg-slate-50"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-colors shadow-sm"
                >
                  Lưu khách
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: THÊM TỆP ĐÍNH KÈM */}
      {isAddAttachModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">Thêm tệp đính kèm</h3>
              <button
                onClick={() => setIsAddAttachModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddAttachment} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Tên tệp <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={attachForm.file_name}
                  onChange={(e) => setAttachForm({ ...attachForm, file_name: e.target.value })}
                  placeholder="Ví dụ: Ke_hoach_to_chuc.pdf"
                  className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Loại tệp</label>
                  <select
                    value={attachForm.file_type}
                    onChange={(e) => setAttachForm({ ...attachForm, file_type: e.target.value })}
                    className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900"
                  >
                    <option value="PDF Document">PDF Document</option>
                    <option value="Presentation">Presentation (PPT)</option>
                    <option value="Word Document">Word Document</option>
                    <option value="Spreadsheet">Excel Spreadsheet</option>
                    <option value="Hình ảnh">Hình ảnh</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Kích thước</label>
                  <input
                    type="text"
                    value={attachForm.file_size}
                    onChange={(e) => setAttachForm({ ...attachForm, file_size: e.target.value })}
                    placeholder="2.4 MB"
                    className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Người tải lên</label>
                <input
                  type="text"
                  value={attachForm.uploaded_by}
                  onChange={(e) => setAttachForm({ ...attachForm, uploaded_by: e.target.value })}
                  className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddAttachModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-slate-600 border border-slate-200 hover:bg-slate-50"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-colors shadow-sm"
                >
                  Lưu tệp
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
