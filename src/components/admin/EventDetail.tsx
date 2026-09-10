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
  image_url?: string | null;
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

export interface ScheduleItem {
  id: number | string;
  time: string;
  title: string;
  speaker: string;
  description?: string;
  order_num?: number;
}

interface EventDetailProps {
  initialEvent: EventData;
  initialRegistrations: Registration[];
  initialLogs: EventLog[];
  initialAttachments: Attachment[];
  managers: ManagerOption[];
  initialSchedules?: ScheduleItem[];
  initialInChargePersons?: any[];
}

export default function EventDetail({
  initialEvent,
  initialRegistrations,
  initialLogs,
  initialAttachments,
  managers,
  initialSchedules,
  initialInChargePersons,
}: EventDetailProps) {
  const [event, setEvent] = useState<EventData>(initialEvent);
  const [registrations, setRegistrations] = useState<Registration[]>(initialRegistrations);
  const [logs, setLogs] = useState<EventLog[]>(initialLogs);
  const [attachments, setAttachments] = useState<Attachment[]>(initialAttachments);

  // Active Tab: 'general' | 'schedule' | 'costs' | 'approval' | 'logs' | 'attachments'
  const [activeTab, setActiveTab] = useState<'general' | 'schedule' | 'costs' | 'approval' | 'logs' | 'attachments'>('general');

  // Modals & Drawers
  const [isEditEventModalOpen, setIsEditEventModalOpen] = useState(false);
  const [isFixedFeesDrawerOpen, setIsFixedFeesDrawerOpen] = useState(false);
  const [isEditCostModalOpen, setIsEditCostModalOpen] = useState(false);
  const [isAddLogModalOpen, setIsAddLogModalOpen] = useState(false);
  const [isAddGuestModalOpen, setIsAddGuestModalOpen] = useState(false);
  const [isAddAttachModalOpen, setIsAddAttachModalOpen] = useState(false);
  const [isAddInChargeModalOpen, setIsAddInChargeModalOpen] = useState(false);
  const [editingInCharge, setEditingInCharge] = useState<any | null>(null);
  const [isAddScheduleModalOpen, setIsAddScheduleModalOpen] = useState(false);

  // In-charge persons state - loaded from DB via props
  const [inChargePersons, setInChargePersons] = useState<any[]>(initialInChargePersons || []);

  // In charge form state
  const [inChargeForm, setInChargeForm] = useState({
    user_id: '',
    full_name: '',
    position: 'Thành viên',
    phone: '',
    email: '',
    roles: [] as string[],
    notes: '',
  });

  // Schedule list state (Item 5)
  const [scheduleList, setScheduleList] = useState<ScheduleItem[]>(
    initialSchedules && initialSchedules.length > 0
      ? initialSchedules
      : [
          { id: 1, time: '08:00 - 08:30', title: 'Đón tiếp đại biểu & Check-in', speaker: 'Ban Lễ tân', description: 'Đón khách tại sảnh, cấp phát tài liệu hội thảo và thẻ đeo.' },
          { id: 2, time: '08:30 - 09:00', title: 'Khai mạc & Tuyên bố lý do', speaker: 'MC sự kiện', description: 'Giới thiệu ban tổ chức, đại biểu và mục đích buổi hội thảo.' },
          { id: 3, time: '09:00 - 10:30', title: 'Phiên thuyết trình & Chuyên đề chính', speaker: 'Nguyễn Văn A (Diễn giả)', description: 'Chia sẻ chiến lược và giải pháp tối ưu hóa hiệu quả vận hành doanh nghiệp.' },
          { id: 4, time: '10:30 - 11:15', title: 'Tọa đàm Q&A & Giao lưu kết nối', speaker: 'Hội đồng chuyên gia', description: 'Giải đáp thắc mắc của khách tham dự và trao đổi trực tiếp.' },
          { id: 5, time: '11:15 - 12:00', title: 'Chốt sự kiện & Tiệc trà Tea Break', speaker: 'Trần Văn Mạnh', description: 'Đăng ký nhận ưu đãi, thưởng thức tiệc trà và kết nối giao thương.' },
        ]
  );

  const [editingSchedule, setEditingSchedule] = useState<ScheduleItem | null>(null);
  const [showSpeakerDropdown, setShowSpeakerDropdown] = useState(false);
  const [isSavingSchedule, setIsSavingSchedule] = useState(false);

  const [scheduleForm, setScheduleForm] = useState({
    time: '',
    title: '',
    speaker: '',
    description: '',
  });

  // Toast
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const showToast = (type: 'success' | 'error', text: string) => {
    setToastMessage({ type, text });
    setTimeout(() => setToastMessage(null), 4000);
  };

  // 5 Trường giá cố định (Item 15)
  const [tempFixedFees, setTempFixedFees] = useState({
    support_fee: Number(event.support_fee) || 200000,
    mc_fee: Number(event.mc_fee) || 200000,
    speaker_fee: Number(event.speaker_fee) || 300000,
    closer_fee: Number(event.closer_fee) || 200000,
    tea_break_fee: Number(event.tea_break_fee) || 1250000,
  });
  const [isSavingFixedFees, setIsSavingFixedFees] = useState(false);

  // Edit Event Form (Item 15, 18)
  const [editEventForm, setEditEventForm] = useState({
    name: event.name || '',
    event_date: event.event_date ? new Date(event.event_date).toISOString().split('T')[0] : '',
    start_time: event.start_time || '08:30',
    end_time: event.end_time || '12:00',
    location: event.location || '',
    event_type: event.event_type || 'Hội thảo / Seminar',
    status: event.status || 'Sắp diễn ra',
    image_url: event.image_url || '/events/event-1.jpg',
    notes: event.notes || '',
  });

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
    total_attendees: registrations.length || 8,
    food_guests_count: Math.max(1, Math.floor((registrations.length || 8) * 0.3)),
    staff_remuneration: (Number(event.mc_fee) || 0) + (Number(event.speaker_fee) || 0) + (Number(event.support_fee) || 0) + (Number(event.closer_fee) || 0) || 4500000,
    tea_break_cost: Number(event.tea_break_fee) || 350000,
    total_cost: 0,
    status: event.status || 'Sắp diễn ra',
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
    attendance_status: 'Đã đăng ký',
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

  // Calculations (Item 19: Expected guests = count of registrations)
  const totalExpectedGuests = useMemo(() => {
    return Math.max(registrations.length, event.expected_guests || 0);
  }, [registrations.length, event.expected_guests]);

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

  const collected = 0;
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
    if (status === 'Đã diễn ra' || status === 'Đã hoàn thành') {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
          Đã diễn ra
        </span>
      );
    }
    if (status === 'Kế hoạch' || status === 'Đang thực hiện') {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
          {status}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-200">
        {status || 'Sắp diễn ra'}
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

  // Handler: Save Edit Event
  const handleSaveEditEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`/api/admin/events/${event.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...editEventForm,
          mc_fee: event.mc_fee,
          speaker_fee: event.speaker_fee,
          support_fee: event.support_fee,
          closer_fee: event.closer_fee,
          tea_break_fee: event.tea_break_fee,
        }),
      });

      if (!res.ok) throw new Error('Cập nhật sự kiện thất bại');

      setEvent({
        ...event,
        name: editEventForm.name,
        event_date: editEventForm.event_date,
        start_time: editEventForm.start_time,
        end_time: editEventForm.end_time,
        location: editEventForm.location,
        event_type: editEventForm.event_type,
        status: editEventForm.status,
        image_url: editEventForm.image_url,
        notes: editEventForm.notes,
      });

      showToast('success', 'Đã cập nhật thông tin sự kiện!');
      setIsEditEventModalOpen(false);
    } catch {
      showToast('error', 'Lỗi khi cập nhật thông tin sự kiện');
    }
  };

  // Handler: Save Fixed Fees
  const handleSaveFixedFees = async () => {
    setIsSavingFixedFees(true);
    try {
      const res = await fetch(`/api/admin/events/${event.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: event.name,
          event_date: event.event_date ? new Date(event.event_date).toISOString().split('T')[0] : '',
          location: event.location,
          status: event.status,
          mc_fee: tempFixedFees.mc_fee,
          speaker_fee: tempFixedFees.speaker_fee,
          support_fee: tempFixedFees.support_fee,
          closer_fee: tempFixedFees.closer_fee,
          tea_break_fee: tempFixedFees.tea_break_fee,
          notes: event.notes,
        }),
      });

      if (!res.ok) throw new Error('Cập nhật thất bại');

      setEvent({
        ...event,
        mc_fee: tempFixedFees.mc_fee,
        speaker_fee: tempFixedFees.speaker_fee,
        support_fee: tempFixedFees.support_fee,
        closer_fee: tempFixedFees.closer_fee,
        tea_break_fee: tempFixedFees.tea_break_fee,
      });

      showToast('success', 'Đã lưu 5 trường chi phí thành công!');
      setIsFixedFeesDrawerOpen(false);
    } catch {
      showToast('error', 'Lỗi khi lưu 5 trường chi phí');
    } finally {
      setIsSavingFixedFees(false);
    }
  };

  // Handler: Update Costs Modal
  const handleUpdateCosts = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`/api/admin/events/${event.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: event.name,
          event_date: event.event_date ? new Date(event.event_date).toISOString().split('T')[0] : '',
          location: event.location,
          status: event.status,
          mc_fee: costForm.mc_fee,
          speaker_fee: costForm.speaker_fee,
          support_fee: costForm.support_fee,
          closer_fee: costForm.closer_fee,
          tea_break_fee: costForm.tea_break_fee,
        }),
      });
      if (res.ok) {
        setEvent((prev) => ({ ...prev, ...costForm }));
        setIsEditCostModalOpen(false);
        showToast('success', 'Đã cập nhật chi phí thành công');
      } else {
        showToast('error', 'Có lỗi xảy ra khi cập nhật chi phí');
      }
    } catch {
      showToast('error', 'Lỗi kết nối máy chủ');
    }
  };

  // Schedule Handlers (Item 5)
  const handleOpenAddSchedule = () => {
    setEditingSchedule(null);
    setScheduleForm({ time: '', title: '', speaker: '', description: '' });
    setShowSpeakerDropdown(false);
    setIsAddScheduleModalOpen(true);
  };

  const handleOpenEditSchedule = (item: ScheduleItem) => {
    setEditingSchedule(item);
    setScheduleForm({
      time: item.time,
      title: item.title,
      speaker: item.speaker || '',
      description: item.description || '',
    });
    setShowSpeakerDropdown(false);
    setIsAddScheduleModalOpen(true);
  };

  const handleDeleteSchedule = async (id: number | string) => {
    if (!confirm('Bạn có chắc chắn muốn xóa mốc lịch trình này?')) return;
    try {
      await fetch(`/api/admin/events/${event.id}/schedules?scheduleId=${id}`, {
        method: 'DELETE',
      });
      setScheduleList((prev) => prev.filter((s) => s.id !== id));
      showToast('success', 'Đã xóa mốc lịch trình thành công');
    } catch (err) {
      console.error('Failed to delete schedule:', err);
      setScheduleList((prev) => prev.filter((s) => s.id !== id));
      showToast('success', 'Đã xóa mốc lịch trình');
    }
  };

  const handleSaveSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!scheduleForm.title || !scheduleForm.time) {
      showToast('error', 'Vui lòng nhập thời gian và tiêu đề');
      return;
    }
    setIsSavingSchedule(true);
    try {
      if (editingSchedule) {
        const res = await fetch(`/api/admin/events/${event.id}/schedules`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            scheduleId: editingSchedule.id,
            time: scheduleForm.time,
            title: scheduleForm.title,
            speaker: scheduleForm.speaker || 'Ban tổ chức',
            description: scheduleForm.description,
          }),
        });
        const data = await res.json();
        if (res.ok && data.schedule) {
          setScheduleList((prev) => prev.map((s) => (s.id === editingSchedule.id ? data.schedule : s)));
        } else {
          setScheduleList((prev) =>
            prev.map((s) =>
              s.id === editingSchedule.id
                ? { ...s, ...scheduleForm, speaker: scheduleForm.speaker || 'Ban tổ chức' }
                : s
            )
          );
        }
        showToast('success', 'Đã cập nhật mốc lịch trình vào Database thành công');
      } else {
        const res = await fetch(`/api/admin/events/${event.id}/schedules`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            time: scheduleForm.time,
            title: scheduleForm.title,
            speaker: scheduleForm.speaker || 'Ban tổ chức',
            description: scheduleForm.description,
          }),
        });
        const data = await res.json();
        if (res.ok && data.schedule) {
          setScheduleList((prev) => [...prev, data.schedule]);
        } else {
          setScheduleList((prev) => [
            ...prev,
            {
              id: Date.now(),
              time: scheduleForm.time,
              title: scheduleForm.title,
              speaker: scheduleForm.speaker || 'Ban tổ chức',
              description: scheduleForm.description,
            },
          ]);
        }
        showToast('success', 'Đã lưu mốc lịch trình vào Database thành công');
      }
      setIsAddScheduleModalOpen(false);
    } catch (err) {
      console.error('Error saving schedule:', err);
      showToast('error', 'Lỗi khi lưu mốc lịch trình');
    } finally {
      setIsSavingSchedule(false);
    }
  };

  // Handler: Change Guest Attendance Status (Item 16: Đã đăng ký -> Check-in -> Check-out)
  const handleChangeGuestStatus = async (reg: Registration, newStatus: string) => {
    try {
      const res = await fetch('/api/admin/le-tan', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: reg.id,
          attendance_status: newStatus,
        }),
      });
      if (res.ok) {
        setRegistrations(
          registrations.map((r) => (r.id === reg.id ? { ...r, attendance_status: newStatus } : r))
        );
        showToast('success', `Đã chuyển trạng thái sang ${newStatus}`);
      }
    } catch {
      showToast('error', 'Lỗi khi cập nhật trạng thái');
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

      const data = await res.json();
      if (!res.ok) {
        showToast('error', data.error || 'Lỗi khi thêm khách');
        return;
      }

      setRegistrations([data.registration, ...registrations]);
      showToast('success', 'Thêm khách tham dự thành công');
      setIsAddGuestModalOpen(false);
      setGuestForm({
        guest_name: '',
        guest_phone: '',
        guest_email: '',
        company_address: '',
        source: 'Lễ tân nhập',
        attendance_status: 'Đã đăng ký',
        notes: '',
      });
    } catch (err) {
      showToast('error', 'Có lỗi xảy ra khi thêm khách');
    }
  };

  // Handler: Fetch in-charge persons from API
  const fetchInChargePersons = async () => {
    try {
      const res = await fetch(`/api/admin/events/${event.id}/in-charge`);
      if (res.ok) {
        const data = await res.json();
        setInChargePersons(data.inChargePersons || []);
      }
    } catch (err) {
      console.error('Error fetching in-charge persons:', err);
    }
  };

  // Handler: Delete in-charge person
  const handleDeleteInCharge = async (personId: number) => {
    if (!confirm('Bạn có chắc chắn muốn xóa người phụ trách này?')) return;
    try {
      const res = await fetch(`/api/admin/events/${event.id}/in-charge?id=${personId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setInChargePersons(inChargePersons.filter((p) => p.id !== personId));
        showToast('success', 'Đã xóa người phụ trách');
      } else {
        showToast('error', 'Lỗi khi xóa người phụ trách');
      }
    } catch {
      showToast('error', 'Lỗi khi xóa người phụ trách');
    }
  };

  // Handler: Save in-charge person (add or edit)
  const handleSaveInCharge = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inChargeForm.full_name) {
      showToast('error', 'Vui lòng chọn hoặc nhập tên người phụ trách');
      return;
    }
    if (inChargeForm.roles.length === 0) {
      showToast('error', 'Vui lòng chọn ít nhất một vai trò');
      return;
    }
    try {
      if (editingInCharge) {
        const res = await fetch(`/api/admin/events/${event.id}/in-charge`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: editingInCharge.id,
            full_name: inChargeForm.full_name,
            position: inChargeForm.position,
            phone: inChargeForm.phone,
            email: inChargeForm.email,
            roles: inChargeForm.roles,
          }),
        });
        if (res.ok) {
          await fetchInChargePersons();
          showToast('success', 'Đã cập nhật người phụ trách');
        } else {
          showToast('error', 'Lỗi khi cập nhật');
        }
      } else {
        const res = await fetch(`/api/admin/events/${event.id}/in-charge`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            full_name: inChargeForm.full_name,
            position: inChargeForm.position,
            phone: inChargeForm.phone,
            email: inChargeForm.email,
            roles: inChargeForm.roles,
          }),
        });
        if (res.ok) {
          await fetchInChargePersons();
          showToast('success', 'Đã thêm người phụ trách');
        } else {
          showToast('error', 'Lỗi khi thêm người phụ trách');
        }
      }
      setIsAddInChargeModalOpen(false);
      setEditingInCharge(null);
    } catch {
      showToast('error', 'Có lỗi xảy ra');
    }
  };

  // Handler: Approve in-charge person
  const handleApproveInCharge = async (personId: number) => {
    try {
      const res = await fetch(`/api/admin/events/${event.id}/in-charge`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: personId,
          status: 'Đã duyệt',
        }),
      });
      if (res.ok) {
        setInChargePersons(inChargePersons.map(p =>
          p.id === personId ? { ...p, status: 'Đã duyệt' } : p
        ));
        showToast('success', 'Đã duyệt người phụ trách');
      } else {
        showToast('error', 'Lỗi khi duyệt');
      }
    } catch {
      showToast('error', 'Lỗi khi duyệt người phụ trách');
    }
  };

  // Handler: Toggle food approval for tea break
  const handleToggleFood = async (reg: Registration) => {
    const nextVal = reg.is_food_approved === false ? true : false;
    try {
      const res = await fetch('/api/admin/le-tan', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: reg.id,
          is_food_approved: nextVal,
        }),
      });
      if (res.ok) {
        setRegistrations(
          registrations.map((r) => (r.id === reg.id ? { ...r, is_food_approved: nextVal } : r))
        );
        showToast('success', `Đã ${nextVal ? 'bật' : 'hủy'} suất ăn tiệc trà cho ${reg.guest_name}`);
      }
    } catch {
      showToast('error', 'Lỗi khi cập nhật suất ăn');
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

  // Handler: Export Excel
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

      {/* Breadcrumbs & Action Bar (Item 15: Added Cập nhật 5 trường cố định) */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <Link href="/admin/su-kien" className="hover:text-blue-600 transition-colors">
            Sự kiện
          </Link>
          <span>/</span>
          <span className="text-slate-800 font-medium">Chi tiết sự kiện</span>
        </div>

        <div className="flex items-center gap-2.5">
          <Link
            href="/admin/su-kien"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-all shadow-sm active:scale-95"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Quay lại</span>
          </Link>

          {/* Item 15: Button Cập nhật 5 trường cố định */}
          <button
            onClick={() => {
              setTempFixedFees({
                mc_fee: Number(event.mc_fee) || 200000,
                speaker_fee: Number(event.speaker_fee) || 300000,
                support_fee: Number(event.support_fee) || 200000,
                closer_fee: Number(event.closer_fee) || 200000,
                tea_break_fee: Number(event.tea_break_fee) || 1250000,
              });
              setIsFixedFeesDrawerOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white border border-blue-200 text-blue-600 hover:bg-blue-50 rounded-xl text-xs font-semibold shadow-sm transition-all active:scale-95"
          >
            <CreditCard className="w-3.5 h-3.5 text-blue-600" />
            <span>Cập nhật 5 trường cố định</span>
          </button>

          {/* Item 15: Button Chỉnh sửa mở modal sửa sự kiện */}
          <button
            onClick={() => {
              setEditEventForm({
                name: event.name || '',
                event_date: event.event_date ? new Date(event.event_date).toISOString().split('T')[0] : '',
                start_time: event.start_time || '08:30',
                end_time: event.end_time || '12:00',
                location: event.location || '',
                event_type: event.event_type || 'Hội thảo / Seminar',
                status: event.status || 'Sắp diễn ra',
                image_url: event.image_url || '/events/event-1.jpg',
                notes: event.notes || '',
              });
              setIsEditEventModalOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-all active:scale-95"
          >
            <Pencil className="w-3.5 h-3.5" />
            <span>Chỉnh sửa</span>
          </button>

          <Link
            href={`/su-kien/${event.id}`}
            target="_blank"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-all"
          >
            <span>Trang Public ↗</span>
          </Link>
        </div>
      </div>

      {/* Main Header Card - 4 Blocks */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm mb-6">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
          {/* KHỐI 1: Ảnh đại diện sự kiện */}
          <div className="md:col-span-3 lg:col-span-2">
            <div className="relative rounded-2xl overflow-hidden aspect-[4/3] bg-slate-100 border border-slate-200 shadow-sm">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={event.image_url || '/events/event-1.jpg'}
                alt={event.name}
                className="w-full h-full object-cover"
              />
              <div className="absolute top-2 left-2">
                {getStatusBadge(event.status)}
              </div>
            </div>
          </div>

          {/* KHỐI 2: Thông tin chung về sự kiện */}
          <div className="md:col-span-5 lg:col-span-4 space-y-2.5">
            <h1 className="text-xl font-bold text-slate-900 leading-snug">
              {event.name}
            </h1>
            <div className="space-y-1.5 text-xs text-slate-600">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-blue-500 flex-shrink-0" />
                <span>
                  <strong className="text-slate-800">{formatDate(event.event_date)}</strong> • {event.start_time || '08:30'} - {event.end_time || '12:00'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-rose-500 flex-shrink-0" />
                <span className="truncate" title={event.location || ''}>
                  {event.location || 'Trung tâm hội nghị Quốc Gia, Hà Nội'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Presentation className="w-4 h-4 text-purple-500 flex-shrink-0" />
                <span>Loại hình: <span className="font-semibold text-slate-800">{event.event_type || 'Hội thảo / Seminar'}</span></span>
              </div>
            </div>
          </div>

          {/* KHỐI 3: Trạng thái */}
          <div className="md:col-span-4 lg:col-span-3 border-l md:border-slate-100 md:pl-5 space-y-2 text-xs">
            <div className="text-slate-400 uppercase tracking-wider font-semibold text-[10px]">
              Trạng thái & Phê duyệt
            </div>
            <div className="flex items-center gap-2">
              <span className="text-slate-500">Trạng thái:</span>
              <span className="font-semibold text-slate-800">{event.status}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-slate-500">Phê duyệt:</span>
              <div>{getApprovalBadge(event.approval_status)}</div>
            </div>
            <div className="text-[11px] text-slate-400 pt-1">
              Người tạo: <span className="text-slate-600 font-medium">Vũ Thị Cúc</span>
              <br />
              Vào lúc: {formatDateTime(event.created_at) || '18/05/2024 10:30'}
            </div>
          </div>

          {/* KHỐI 4: Box TỔNG QUAN SỰ KIỆN & CHI PHÍ */}
          <div className="md:col-span-12 lg:col-span-3 bg-gradient-to-br from-slate-50 to-blue-50/50 rounded-2xl p-4 border border-blue-100 shadow-sm space-y-2">
            <div className="text-[11px] font-bold text-blue-900 tracking-wide uppercase flex items-center gap-1.5 pb-1 border-b border-blue-100">
              <Wallet className="w-3.5 h-3.5 text-blue-600" />
              <span>Tổng quan sự kiện</span>
            </div>
            <div className="grid grid-cols-2 gap-2.5 text-xs pt-1">
              <div>
                <div className="text-slate-500 text-[11px]">Khách dự kiến:</div>
                <div className="font-bold text-slate-900">{totalExpectedGuests} khách</div>
              </div>
              <div>
                <div className="text-slate-500 text-[11px]">Chi phí dự kiến:</div>
                <div className="font-bold text-blue-700">{formatCurrency(totalExpectedCost)}</div>
              </div>
              <div>
                <div className="text-slate-500 text-[11px]">Đã thu:</div>
                <div className="font-bold text-emerald-700">{formatCurrency(collected)}</div>
              </div>
              <div>
                <div className="text-slate-500 text-[11px]">Còn lại:</div>
                <div className="font-bold text-rose-600">{formatCurrency(remaining)}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Navigation Bar (Item 7.1: Added Lịch trình tab) */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-1.5 shadow-sm mb-6 flex flex-wrap items-center gap-1.5">
        <button
          onClick={() => setActiveTab('general')}
          className={`flex-1 min-w-[120px] py-2.5 px-4 text-center rounded-xl text-sm font-semibold transition-all ${
            activeTab === 'general'
              ? 'bg-blue-50 text-blue-700 shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          Thông tin chung
        </button>

        <button
          onClick={() => setActiveTab('schedule')}
          className={`flex-1 min-w-[120px] py-2.5 px-4 text-center rounded-xl text-sm font-semibold transition-all ${
            activeTab === 'schedule'
              ? 'bg-blue-50 text-blue-700 shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          Lịch trình
        </button>

        <button
          onClick={() => setActiveTab('costs')}
          className={`flex-1 min-w-[120px] py-2.5 px-4 text-center rounded-xl text-sm font-semibold transition-all ${
            activeTab === 'costs'
              ? 'bg-blue-50 text-blue-700 shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          Chi phí dự kiến
        </button>

        <button
          onClick={() => setActiveTab('approval')}
          className={`flex-1 min-w-[120px] py-2.5 px-4 text-center rounded-xl text-sm font-semibold transition-all ${
            activeTab === 'approval'
              ? 'bg-blue-50 text-blue-700 shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          Lịch sử duyệt
        </button>

        <button
          onClick={() => setActiveTab('logs')}
          className={`flex-1 min-w-[120px] py-2.5 px-4 text-center rounded-xl text-sm font-semibold transition-all ${
            activeTab === 'logs'
              ? 'bg-blue-50 text-blue-700 shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          Nhật ký sự kiện
        </button>

        <button
          onClick={() => setActiveTab('attachments')}
          className={`flex-1 min-w-[120px] py-2.5 px-4 text-center rounded-xl text-sm font-semibold transition-all ${
            activeTab === 'attachments'
              ? 'bg-blue-50 text-blue-700 shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          Tệp đính kèm
        </button>
      </div>

      {/* TAB 1: THÔNG TIN CHUNG (Item 21: Added DANH SÁCH NGƯỜI PHỤ TRÁCH) */}
      {activeTab === 'general' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm space-y-8 animate-in fade-in duration-150">
          {/* General Metadata Section */}
          <div className="space-y-3 text-sm">
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

          {/* ITEM 21: DANH SÁCH NGƯỜI PHỤ TRÁCH (Hình 34 - 37) */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-bold text-slate-900 uppercase tracking-tight">
                  DANH SÁCH NGƯỜI PHỤ TRÁCH ({inChargePersons.length})
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Phân công các thành viên phụ trách và vai trò cụ thể trong sự kiện
                </p>
              </div>

              <button
                onClick={() => {
                  setEditingInCharge(null);
                  setInChargeForm({
                    user_id: '',
                    full_name: '',
                    position: 'Thành viên',
                    phone: '',
                    email: '',
                    roles: ['Diễn giả'],
                    notes: '',
                  });
                  setIsAddInChargeModalOpen(true);
                }}
                className="inline-flex items-center gap-2 bg-[#2563eb] hover:bg-blue-700 text-white px-3.5 py-2 rounded-xl text-xs font-semibold shadow-sm transition-all active:scale-95"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Thêm người phụ trách</span>
              </button>
            </div>

            <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
              <table className="w-full text-left text-xs text-slate-600 border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                    <th className="py-3 px-4 w-12 text-center">STT</th>
                    <th className="py-3 px-4">Họ và tên</th>
                    <th className="py-3 px-4">Chức vụ</th>
                    <th className="py-3 px-4">Số điện thoại</th>
                    <th className="py-3 px-4">Email</th>
                    <th className="py-3 px-4">Vai trò trong sự kiện</th>
                    <th className="py-3 px-4">Trạng thái</th>
                    <th className="py-3 px-4 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {inChargePersons.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-slate-400">
                        Chưa có người phụ trách nào được phân công.
                      </td>
                    </tr>
                  ) : (
                    inChargePersons.map((p, idx) => (
                      <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-3.5 px-4 text-center font-medium text-slate-500">{idx + 1}</td>
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full overflow-hidden bg-slate-100 shrink-0 border border-slate-200">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={p.avatar} alt={p.full_name} className="w-full h-full object-cover" />
                            </div>
                            <span className="font-bold text-slate-900">{p.full_name}</span>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-slate-700 font-medium">{p.position}</td>
                        <td className="py-3.5 px-4 text-slate-600">{p.phone}</td>
                        <td className="py-3.5 px-4 text-slate-600">{p.email}</td>
                        <td className="py-3.5 px-4">
                          <div className="flex flex-wrap gap-1.5">
                            {(Array.isArray(p.roles) ? p.roles : []).map((r: string, rIdx: number) => (
                              <span
                                key={rIdx}
                                className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200"
                              >
                                {r}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          {p.status === 'Đã duyệt' ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-700 border border-emerald-200">
                              Đã duyệt
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-100 text-amber-700 border border-amber-200">
                              {p.status || 'Chờ duyệt'}
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {p.status !== 'Đã duyệt' && (
                              <button
                                onClick={() => handleApproveInCharge(p.id)}
                                className="text-emerald-600 hover:text-emerald-700 p-1.5 rounded hover:bg-emerald-50"
                                title="Duyệt"
                              >
                                <Check className="w-3.5 h-3.5" />
                              </button>
                            )}
                            <button
                              onClick={() => {
                                setEditingInCharge(p);
                                setInChargeForm({
                                  user_id: '',
                                  full_name: p.full_name,
                                  position: p.position,
                                  phone: p.phone,
                                  email: p.email,
                                  roles: Array.isArray(p.roles) ? p.roles : [],
                                  notes: '',
                                });
                                setIsAddInChargeModalOpen(true);
                              }}
                              className="text-slate-400 hover:text-blue-600 p-1.5 rounded hover:bg-blue-50"
                              title="Sửa"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteInCharge(p.id)}
                              className="text-slate-400 hover:text-rose-600 p-1.5 rounded hover:bg-rose-50"
                              title="Xóa"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
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

          <hr className="border-slate-100" />

          {/* Guest Registration Section (Item 16: Check-in / Check-out status) */}
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
              <div>
                <h2 className="text-base font-bold text-slate-900 uppercase tracking-tight">
                  Khách đăng ký & Check-in Suất ăn Tiệc trà ({registrations.length})
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Mặc định tính suất ăn 50.000đ/khách. Bỏ tích chọn người không ăn để chốt đề xuất thanh toán.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <div className="bg-amber-50 border border-amber-200 rounded-xl px-3 py-1.5 text-xs text-amber-900 font-semibold flex items-center gap-2">
                  <span>Khách ăn: {registrations.filter((r) => r.is_food_approved !== false).length}/{registrations.length}</span>
                  <span>•</span>
                  <span>Tiệc trà: {formatCurrency(registrations.filter((r) => r.is_food_approved !== false).length * 50000)}</span>
                </div>

                <button
                  onClick={() => setIsAddGuestModalOpen(true)}
                  className="inline-flex items-center gap-2 bg-[#2563eb] hover:bg-blue-700 text-white px-3.5 py-2 rounded-xl text-xs font-semibold shadow-sm transition-all active:scale-95"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ Thêm khách</span>
                </button>
              </div>
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
                <option value="Đã đăng ký">Đã đăng ký</option>
                <option value="Check-in">Check-in</option>
                <option value="Check-out">Check-out</option>
              </select>
            </div>

            {/* Guest Table */}
            <div className="border border-slate-100 rounded-xl overflow-hidden shadow-sm">
              <table className="w-full text-left text-xs text-slate-600 border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-100">
                    <th className="py-3 px-4">Tên khách</th>
                    <th className="py-3 px-4">SĐT</th>
                    <th className="py-3 px-4">Nguồn</th>
                    <th className="py-3 px-4 text-center">Suất ăn tiệc trà (50k)</th>
                    <th className="py-3 px-4">Trạng thái tham dự</th>
                    <th className="py-3 px-4 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredGuests.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-400">
                        Chưa có khách đăng ký cho sự kiện này
                      </td>
                    </tr>
                  ) : (
                    filteredGuests.map((guest) => {
                      const isFood = guest.is_food_approved !== false;
                      const status = guest.attendance_status || 'Đã đăng ký';
                      return (
                        <tr key={guest.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3.5 px-4 font-semibold text-slate-800">
                            {guest.guest_name}
                          </td>
                          <td className="py-3.5 px-4 text-slate-600">{guest.guest_phone || '—'}</td>
                          <td className="py-3.5 px-4 text-slate-600">{guest.source || 'Lễ tân nhập'}</td>
                          <td className="py-3.5 px-4 text-center">
                            <label className="inline-flex items-center gap-1.5 cursor-pointer select-none">
                              <input
                                type="checkbox"
                                checked={isFood}
                                onChange={() => handleToggleFood(guest)}
                                className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer"
                              />
                              <span className={`text-[11px] font-semibold ${isFood ? 'text-emerald-700' : 'text-slate-400'}`}>
                                {isFood ? 'Ăn tiệc trà' : 'Không ăn'}
                              </span>
                            </label>
                          </td>
                          <td className="py-3.5 px-4">
                            <span
                              className={`inline-block px-2.5 py-0.5 rounded-full font-semibold ${
                                status === 'Check-in'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : status === 'Check-out'
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-slate-100 text-slate-700'
                              }`}
                            >
                              {status}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {status !== 'Check-in' && (
                                <button
                                  onClick={() => handleChangeGuestStatus(guest, 'Check-in')}
                                  className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition-colors"
                                >
                                  Check-in
                                </button>
                              )}
                              {status === 'Check-in' && (
                                <button
                                  onClick={() => handleChangeGuestStatus(guest, 'Check-out')}
                                  className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200 transition-colors"
                                  title="Khách không ở lại ăn / ra về"
                                >
                                  Check-out
                                </button>
                              )}
                              {status === 'Check-out' && (
                                <button
                                  onClick={() => handleChangeGuestStatus(guest, 'Đã đăng ký')}
                                  className="px-2 py-1 rounded-lg text-xs font-medium text-slate-500 hover:bg-slate-100"
                                >
                                  Đặt lại
                                </button>
                              )}
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
      )}

      {/* TAB 2: LỊCH TRÌNH (Item 7.1 - Hình 8) */}
      {activeTab === 'schedule' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm space-y-6 animate-in fade-in duration-150">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-bold text-slate-900 uppercase tracking-tight">
                Lịch trình chi tiết sự kiện
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Các mốc thời gian và nội dung diễn ra xuyên suốt sự kiện
              </p>
            </div>

            <button
              onClick={handleOpenAddSchedule}
              className="inline-flex items-center gap-2 bg-[#2563eb] hover:bg-blue-700 text-white px-3.5 py-2 rounded-xl text-xs font-semibold shadow-sm transition-all active:scale-95"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Thêm mốc lịch trình</span>
            </button>
          </div>

          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <div className="divide-y divide-slate-100">
              {scheduleList.map((item) => (
                <div key={item.id} className="p-4 hover:bg-slate-50/80 transition-colors flex items-start gap-4">
                  <div className="w-28 shrink-0">
                    <span className="inline-block px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 font-bold text-xs border border-blue-100">
                      {item.time}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-bold text-slate-900">{item.title}</h3>
                    <p className="text-xs text-slate-500 mt-0.5 font-medium">Người phụ trách / Diễn giả: <span className="text-slate-800">{item.speaker}</span></p>
                    {item.description && <p className="text-xs text-slate-600 mt-1">{item.description}</p>}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleOpenEditSchedule(item)}
                      className="text-slate-400 hover:text-blue-600 p-1.5 rounded-lg hover:bg-blue-50 transition-colors"
                      title="Sửa mốc lịch trình"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteSchedule(item.id)}
                      className="text-slate-400 hover:text-rose-600 p-1.5 rounded-lg hover:bg-rose-50 transition-colors"
                      title="Xóa mốc lịch trình"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: CHI PHÍ DỰ KIẾN (Item 20: Phân công vai trò chuyển sang đây, đặt trên 5 trường giá cố định) */}
      {activeTab === 'costs' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm space-y-8 animate-in fade-in duration-150">
          {/* Item 20: Phân công vai trò sự kiện & Thù lao ban tổ chức */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-900">
                Phân công vai trò sự kiện & Thù lao ban tổ chức
              </h2>
              <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-lg">
                Tổng thù lao: {formatCurrency(totalStaffCost)}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {[
                { role: 'MC sự kiện', fee: event.mc_fee, person: 'Vũ Thị Cúc', color: 'blue' },
                { role: 'Thuyết trình / Diễn giả', fee: event.speaker_fee, person: event.manager_name || 'Nguyễn Văn A', color: 'purple' },
                { role: 'Chốt sự kiện', fee: event.closer_fee, person: 'Trần Văn Mạnh', color: 'emerald' },
                { role: 'Phụng sự 1 (Lễ tân)', fee: event.support_fee, person: 'Lê Thu Trang', color: 'amber' },
                { role: 'Phụng sự 2 (Kỹ thuật)', fee: event.support_fee, person: 'Phạm Đức Hoàng', color: 'amber' },
                { role: 'Phụng sự 3 (Hậu cần)', fee: event.support_fee, person: 'Đỗ Hải Nam', color: 'amber' },
              ].map((item, idx) => (
                <div
                  key={idx}
                  className="bg-slate-50/70 border border-slate-200 rounded-xl p-3 flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-slate-800 truncate">{item.role}</div>
                    <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                      <UserCheck className="w-3 h-3 text-slate-400" />
                      <span>{item.person}</span>
                    </div>
                  </div>
                  <div className="text-xs font-bold text-slate-900 flex-shrink-0">
                    {formatCurrency(item.fee)}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <hr className="border-slate-100" />

          {/* Chi tiết 5 trường giá cố định */}
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
              <div>
                <h2 className="text-base font-bold text-slate-900">Chi tiết 5 trường giá cố định</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Bảng giá phân bổ thù lao ban tổ chức và hỗ trợ chi phí tiệc trà
                </p>
              </div>

              <button
                onClick={() => {
                  setTempFixedFees({
                    mc_fee: Number(event.mc_fee) || 200000,
                    speaker_fee: Number(event.speaker_fee) || 300000,
                    support_fee: Number(event.support_fee) || 200000,
                    closer_fee: Number(event.closer_fee) || 200000,
                    tea_break_fee: Number(event.tea_break_fee) || 1250000,
                  });
                  setIsFixedFeesDrawerOpen(true);
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
      {/* MODAL: CHỈNH SỬA THÔNG TIN SỰ KIỆN (Item 15, 18: Không có expected_guests và manager_id) */}
      {isEditEventModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">Chỉnh sửa thông tin sự kiện</h3>
              <button
                onClick={() => setIsEditEventModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditEvent} className="p-6 overflow-y-auto space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Tên sự kiện <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={editEventForm.name}
                  onChange={(e) => setEditEventForm({ ...editEventForm, name: e.target.value })}
                  className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Ngày tổ chức <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={editEventForm.event_date}
                    onChange={(e) => setEditEventForm({ ...editEventForm, event_date: e.target.value })}
                    className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Trạng thái</label>
                  <select
                    value={editEventForm.status}
                    onChange={(e) => setEditEventForm({ ...editEventForm, status: e.target.value })}
                    className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900"
                  >
                    <option value="Sắp diễn ra">Sắp diễn ra</option>
                    <option value="Kế hoạch">Kế hoạch</option>
                    <option value="Đang thực hiện">Đang thực hiện</option>
                    <option value="Đã diễn ra">Đã diễn ra</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Giờ bắt đầu</label>
                  <input
                    type="time"
                    value={editEventForm.start_time}
                    onChange={(e) => setEditEventForm({ ...editEventForm, start_time: e.target.value })}
                    className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Giờ kết thúc</label>
                  <input
                    type="time"
                    value={editEventForm.end_time}
                    onChange={(e) => setEditEventForm({ ...editEventForm, end_time: e.target.value })}
                    className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Địa điểm</label>
                <input
                  type="text"
                  value={editEventForm.location}
                  onChange={(e) => setEditEventForm({ ...editEventForm, location: e.target.value })}
                  className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Hình ảnh sự kiện (URL)</label>
                <input
                  type="text"
                  value={editEventForm.image_url}
                  onChange={(e) => setEditEventForm({ ...editEventForm, image_url: e.target.value })}
                  className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Ghi chú</label>
                <textarea
                  rows={3}
                  value={editEventForm.notes}
                  onChange={(e) => setEditEventForm({ ...editEventForm, notes: e.target.value })}
                  className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsEditEventModalOpen(false)}
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

      {/* DRAWER: CẬP NHẬT 5 TRƯỜNG CỐ ĐỊNH (Item 15) */}
      {isFixedFeesDrawerOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex justify-end animate-in fade-in duration-150">
          <div className="bg-white w-full max-w-md h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
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

            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
              <div className="p-3.5 rounded-xl bg-blue-50/80 border border-blue-100 text-xs text-blue-900">
                Cập nhật 5 trường giá cố định cho sự kiện này.
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Thù lao phụng sự (VNĐ)</label>
                  <input
                    type="number"
                    step="10000"
                    value={tempFixedFees.support_fee}
                    onChange={(e) => setTempFixedFees({ ...tempFixedFees, support_fee: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Thù lao MC (VNĐ)</label>
                  <input
                    type="number"
                    step="10000"
                    value={tempFixedFees.mc_fee}
                    onChange={(e) => setTempFixedFees({ ...tempFixedFees, mc_fee: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Thù lao Thuyết trình / Diễn giả (VNĐ)</label>
                  <input
                    type="number"
                    step="10000"
                    value={tempFixedFees.speaker_fee}
                    onChange={(e) => setTempFixedFees({ ...tempFixedFees, speaker_fee: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Thù lao Người chốt (VNĐ)</label>
                  <input
                    type="number"
                    step="10000"
                    value={tempFixedFees.closer_fee}
                    onChange={(e) => setTempFixedFees({ ...tempFixedFees, closer_fee: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Chi phí Tiệc trà (VNĐ)</label>
                  <input
                    type="number"
                    step="10000"
                    value={tempFixedFees.tea_break_fee}
                    onChange={(e) => setTempFixedFees({ ...tempFixedFees, tea_break_fee: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-end gap-3 bg-white">
              <button
                type="button"
                onClick={() => setIsFixedFeesDrawerOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-medium text-slate-600 border border-slate-200 hover:bg-slate-50"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleSaveFixedFees}
                disabled={isSavingFixedFees}
                className="px-5 py-2 rounded-xl text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 shadow-sm disabled:opacity-50"
              >
                {isSavingFixedFees ? 'Đang lưu...' : 'Lưu cập nhật'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: THÊM / SỬA NGƯỜI PHỤ TRÁCH (Item 21 - Hình 35, 36, 37) */}
      {isAddInChargeModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">
                {editingInCharge ? 'Chỉnh sửa người phụ trách' : 'Thêm người phụ trách sự kiện'}
              </h3>
              <button
                onClick={() => setIsAddInChargeModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveInCharge} className="p-6 overflow-y-auto space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Chọn thành viên <span className="text-rose-500">*</span>
                </label>
                <select
                  value={inChargeForm.user_id}
                  onChange={(e) => {
                    const selId = e.target.value;
                    const mgr = managers.find(m => String(m.id) === selId);
                    if (mgr) {
                      setInChargeForm({
                        ...inChargeForm,
                        user_id: selId,
                        full_name: mgr.full_name,
                        position: mgr.role || 'Thành viên',
                      });
                    } else {
                      setInChargeForm({ ...inChargeForm, user_id: selId });
                    }
                  }}
                  className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900"
                >
                  <option value="">-- Chọn thành viên từ danh sách --</option>
                  {managers.map(m => (
                    <option key={m.id} value={m.id}>{m.full_name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Họ và tên người phụ trách <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={inChargeForm.full_name}
                  onChange={(e) => setInChargeForm({ ...inChargeForm, full_name: e.target.value })}
                  placeholder="Ví dụ: Nguyễn Văn A"
                  className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Chức vụ</label>
                  <input
                    type="text"
                    value={inChargeForm.position}
                    onChange={(e) => setInChargeForm({ ...inChargeForm, position: e.target.value })}
                    placeholder="Trưởng phòng KD..."
                    className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Số điện thoại</label>
                  <input
                    type="text"
                    value={inChargeForm.phone}
                    onChange={(e) => setInChargeForm({ ...inChargeForm, phone: e.target.value })}
                    placeholder="0912..."
                    className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Email</label>
                <input
                  type="email"
                  value={inChargeForm.email}
                  onChange={(e) => setInChargeForm({ ...inChargeForm, email: e.target.value })}
                  placeholder="email@example.com"
                  className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900"
                />
              </div>

              {/* Checkbox Multiple Roles (Item 21) */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-2">
                  Vai trò trong sự kiện <span className="text-rose-500">*</span> (chọn nhiều vai trò)
                </label>
                <div className="grid grid-cols-2 gap-2 bg-slate-50 p-3 rounded-xl border border-slate-200">
                  {['Diễn giả', 'MC', 'Chốt sự kiện', 'Phụng sự', 'Điều phối', 'Hỗ trợ', 'Khách mời', 'Khác'].map((r) => {
                    const isChecked = inChargeForm.roles.includes(r);
                    return (
                      <label key={r} className="flex items-center gap-2 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {
                            if (isChecked) {
                              setInChargeForm({
                                ...inChargeForm,
                                roles: inChargeForm.roles.filter((item) => item !== r),
                              });
                            } else {
                              setInChargeForm({
                                ...inChargeForm,
                                roles: [...inChargeForm.roles, r],
                              });
                            }
                          }}
                          className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                        />
                        <span className="text-xs text-slate-700 font-medium">{r}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddInChargeModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-slate-600 border border-slate-200 hover:bg-slate-50"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-colors shadow-sm"
                >
                  Lưu người phụ trách
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: THÊM / SỬA LỊCH TRÌNH (Item 5) */}
      {isAddScheduleModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">
                {editingSchedule ? 'Chỉnh sửa mốc lịch trình' : 'Thêm mốc lịch trình'}
              </h3>
              <button
                onClick={() => setIsAddScheduleModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveSchedule} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Khung thời gian <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={scheduleForm.time}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, time: e.target.value })}
                  placeholder="Ví dụ: 08:30 - 09:15"
                  className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Tiêu đề nội dung <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={scheduleForm.title}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, title: e.target.value })}
                  placeholder="Ví dụ: Khai mạc sự kiện..."
                  className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900"
                  required
                />
              </div>

              <div className="relative">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Người phụ trách / Diễn giả
                </label>
                <input
                  type="text"
                  value={scheduleForm.speaker}
                  onFocus={() => setShowSpeakerDropdown(true)}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, speaker: e.target.value })}
                  placeholder="Ví dụ: MC / Diễn giả Nguyễn Văn A"
                  className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900"
                />
                {showSpeakerDropdown && inChargePersons.length > 0 && (
                  <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg z-50 max-h-48 overflow-y-auto">
                    <div className="p-2 text-[10px] font-semibold text-slate-400 border-b border-slate-100 uppercase tracking-wider">
                      Chọn từ DANH SÁCH NGƯỜI PHỤ TRÁCH
                    </div>
                    {inChargePersons.map((p) => {
                      const rolesStr = p.roles && p.roles.length > 0 ? ` (${p.roles.join(', ')})` : '';
                      const displayStr = `${p.full_name}${rolesStr}`;
                      return (
                        <button
                          key={p.id}
                          type="button"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            setScheduleForm({ ...scheduleForm, speaker: displayStr });
                            setShowSpeakerDropdown(false);
                          }}
                          className="w-full flex items-center justify-between px-3 py-2 text-left hover:bg-blue-50 text-xs text-slate-800 transition-colors border-b border-slate-50 last:border-0"
                        >
                          <span className="font-semibold text-slate-900">{p.full_name}</span>
                          <span className="text-[11px] text-blue-600 bg-blue-50 px-2 py-0.5 rounded font-medium">
                            {p.roles?.join(', ') || p.position}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Mô tả ngắn</label>
                <textarea
                  rows={2}
                  value={scheduleForm.description}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, description: e.target.value })}
                  placeholder="Chi tiết hoạt động..."
                  className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddScheduleModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-slate-600 border border-slate-200 hover:bg-slate-50"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isSavingSchedule}
                  className="px-5 py-2 rounded-xl text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-50"
                >
                  {isSavingSchedule ? 'Đang lưu...' : 'Lưu mốc'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
