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
  Calendar,
  MapPin,
  Trash2,
  ChevronDown,
  Share2,
  Copy,
} from 'lucide-react';

export interface FixedFeeField {
  id: string;
  name: string;
  amount: number;
}

export const DEFAULT_FIXED_FIELDS: FixedFeeField[] = [
  { id: 'support_fee', name: 'Thù lao phụng sự', amount: 300000 },
  { id: 'mc_fee', name: 'Thù lao MC', amount: 200000 },
  { id: 'speaker_fee', name: 'Thù lao thuyết trình', amount: 300000 },
  { id: 'closer_fee', name: 'Chốt sự kiện', amount: 200000 },
  { id: 'tea_break_fee', name: 'Chi phí tiệc trà (50đ, TĐ hỗ trợ)', amount: 50000 },
];

export function formatNumberWithDots(val: number | string | undefined | null): string {
  if (val === undefined || val === null || val === '') return '';
  const num = typeof val === 'number' ? val : parseInt(String(val).replace(/\D/g, ''), 10);
  if (isNaN(num)) return '';
  return num.toLocaleString('vi-VN');
}

export function parseNumberFromDots(val: string): number {
  const digits = String(val).replace(/\D/g, '');
  return digits ? parseInt(digits, 10) : 0;
}

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

  // Cập nhật các trường sự kiện (Mục 6 & 7)
  const [fixedFeeFields, setFixedFeeFields] = useState<FixedFeeField[]>(DEFAULT_FIXED_FIELDS);
  const [tempFeeFields, setTempFeeFields] = useState<FixedFeeField[]>(DEFAULT_FIXED_FIELDS);
  const [newFieldName, setNewFieldName] = useState('');
  const [newFieldAmount, setNewFieldAmount] = useState<number>(0);

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
    approval_status: 'Chờ duyệt',
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

  // Chia sẻ sự kiện (Mục 3 - Hình 3)
  const [currentUserRef, setCurrentUserRef] = useState<string>('N_0914556677');
  const [shareOrigin, setShareOrigin] = useState<string>('https://sukien-rouge.vercel.app');
  const [shareEvent, setShareEvent] = useState<Event | null>(null);
  const [copiedLine1, setCopiedLine1] = useState(false);
  const [copiedLine2, setCopiedLine2] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setShareOrigin(window.location.origin);
      try {
        const getCookie = (name: string) => {
          const match = document.cookie.match(new RegExp('(^|;\\s*)' + name + '=([^;]*)'));
          return match ? decodeURIComponent(match[2]) : null;
        };
        const cRef = getCookie('user_ref_code') || getCookie('ref_code') || getCookie('user_ref') || getCookie('user_phone');
        if (cRef) {
          const formatted = cRef.startsWith('N_') ? cRef : `N_${cRef}`;
          setCurrentUserRef(formatted);
        }
      } catch {
        // Ignore
      }
    }
  }, []);

  const copyToClipboard = async (text: string, isLine1: boolean) => {
    try {
      await navigator.clipboard.writeText(text);
      if (isLine1) {
        setCopiedLine1(true);
        setTimeout(() => setCopiedLine1(false), 2000);
      } else {
        setCopiedLine2(true);
        setTimeout(() => setCopiedLine2(false), 2000);
      }
      showToast('success', 'Đã sao chép liên kết vào bộ nhớ tạm');
    } catch {
      showToast('error', 'Không thể sao chép liên kết');
    }
  };

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

  // Tải cấu hình các trường cố định từ hệ thống (Mục 6)
  useEffect(() => {
    fetch('/api/admin/settings')
      .then(res => res.json())
      .then(data => {
        if (data.settings?.fixed_fees) {
          const raw = data.settings.fixed_fees;
          let parsedFields: FixedFeeField[] = [];
          if (Array.isArray(raw)) {
            parsedFields = raw;
          } else if (raw && Array.isArray(raw.fields)) {
            parsedFields = raw.fields;
          } else if (raw && typeof raw === 'object') {
            parsedFields = [
              { id: 'support_fee', name: 'Thù lao phụng sự', amount: Number(raw.support_fee) || 300000 },
              { id: 'mc_fee', name: 'Thù lao MC', amount: Number(raw.mc_fee) || 200000 },
              { id: 'speaker_fee', name: 'Thù lao thuyết trình', amount: Number(raw.speaker_fee) || 300000 },
              { id: 'closer_fee', name: 'Chốt sự kiện', amount: Number(raw.closer_fee) || 200000 },
              { id: 'tea_break_fee', name: 'Chi phí tiệc trà (50đ, TĐ hỗ trợ)', amount: Number(raw.tea_break_fee) || 50000 },
            ];
          }
          if (parsedFields.length > 0) {
            setFixedFeeFields(parsedFields);
            setTempFeeFields(parsedFields);
          }
          if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
            setFixedFees(raw);
            setTempFixedFees(raw);
          }
        }
      })
      .catch(err => console.error('Error fetching settings:', err));
  }, []);

  // Lưu cập nhật các trường cố định (Mục 6 & 7)
  const handleSaveFixedFees = async () => {
    setIsSavingFixedFees(true);
    try {
      const payload: any = {
        fields: tempFeeFields,
        support_fee: tempFeeFields.find(f => f.id === 'support_fee')?.amount ?? 0,
        mc_fee: tempFeeFields.find(f => f.id === 'mc_fee')?.amount ?? 0,
        speaker_fee: tempFeeFields.find(f => f.id === 'speaker_fee')?.amount ?? 0,
        closer_fee: tempFeeFields.find(f => f.id === 'closer_fee')?.amount ?? 0,
        tea_break_fee: tempFeeFields.find(f => f.id === 'tea_break_fee')?.amount ?? 0,
      };

      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key: 'fixed_fees',
          value: payload,
          description: 'Danh sách các trường chi phí cho sự kiện mới',
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Cập nhật thất bại');
      }

      setFixedFeeFields(tempFeeFields);
      setFixedFees({
        support_fee: payload.support_fee,
        mc_fee: payload.mc_fee,
        speaker_fee: payload.speaker_fee,
        closer_fee: payload.closer_fee,
        tea_break_fee: payload.tea_break_fee,
      });
      setIsFixedFeesDrawerOpen(false);
      showToast('success', 'Đã cập nhật danh sách trường chi phí cho các sự kiện tạo mới!');
    } catch (err: any) {
      showToast('error', err.message || 'Lỗi khi lưu cấu hình');
    } finally {
      setIsSavingFixedFees(false);
    }
  };

  // Thay đổi trực tiếp Trạng thái từ bảng (Mục 9 - Hình 10)
  const handleDirectStatusChange = async (eventId: number, newStatus: string) => {
    setEvents(prev => prev.map(ev => ev.id === eventId ? { ...ev, status: newStatus } : ev));
    try {
      const res = await fetch(`/api/admin/events/${eventId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Lỗi cập nhật trạng thái');
      showToast('success', `Đã cập nhật trạng thái thành "${newStatus}"!`);
    } catch (err: any) {
      showToast('error', err.message || 'Không thể lưu trạng thái mới');
      refreshData();
    }
  };

  // Thay đổi trực tiếp Duyệt từ bảng (Mục 9 - Hình 10)
  const handleDirectApprovalChange = async (eventId: number, newApproval: string) => {
    setEvents(prev => prev.map(ev => ev.id === eventId ? { ...ev, approval_status: newApproval } : ev));
    try {
      const res = await fetch(`/api/admin/events/${eventId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approval_status: newApproval }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Lỗi cập nhật trạng thái duyệt');
      showToast('success', `Đã cập nhật trạng thái duyệt thành "${newApproval}"!`);
    } catch (err: any) {
      showToast('error', err.message || 'Không thể lưu trạng thái duyệt mới');
      refreshData();
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
      location: 'ML6-23 Vinhomes Green Bay, đường Lương Thế Vinh, phường Đại Mỗ, TP Hà Nội',
      status: 'Sắp diễn ra',
      approval_status: 'Chờ duyệt',
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
      status: event.status === 'Đang thực hiện' ? 'Đang diễn ra' : (event.status || 'Sắp diễn ra'),
      approval_status: event.approval_status || 'Chờ duyệt',
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

  const handleDeleteEvent = async (id: number, name: string) => {
    if (!isAdmin) {
      showToast('error', 'Chỉ tài khoản Admin mới có quyền xóa sự kiện');
      return;
    }
    if (!confirm(`Bạn có chắc chắn muốn xóa sự kiện "${name}" không? Thao tác này sẽ xóa sự kiện khỏi hệ thống.`)) {
      return;
    }
    try {
      const res = await fetch(`/api/admin/events/${id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Có lỗi xảy ra khi xóa sự kiện');
      }
      showToast('success', 'Đã xóa sự kiện thành công');
      await refreshData();
    } catch (err: unknown) {
      if (err instanceof Error) {
        showToast('error', err.message);
      } else {
        showToast('error', 'Lỗi khi xóa sự kiện');
      }
    }
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
    <div className="px-[15px] py-4 sm:p-6 lg:p-8 max-w-[1600px] mx-auto min-h-screen bg-slate-50">
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 sm:mb-8">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">Sự kiện</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 font-normal">
            Tạo & quản lý sự kiện, trường chi phí, duyệt sự kiện (Admin)
          </p>
        </div>

        <div className="flex items-center gap-2 sm:gap-2.5">
          {/* Nút Đồng bộ Google Sheet: trên mobile đổi thành "Đồng bộ" */}
          <button
            type="button"
            onClick={handleSyncSheet}
            disabled={isSyncingSheet}
            className="inline-flex items-center justify-center gap-1.5 sm:gap-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 px-2.5 sm:px-4 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-semibold shadow-xs transition-all cursor-pointer disabled:opacity-50 active:scale-[0.98]"
            title="Đồng bộ danh sách sự kiện sang Google Sheet"
          >
            <FileSpreadsheet className={`w-4 h-4 ${isSyncingSheet ? 'animate-spin' : ''}`} />
            <span className="hidden lg:inline">{isSyncingSheet ? 'Đang đồng bộ...' : 'Đồng bộ Google Sheet'}</span>
            <span className="lg:hidden">{isSyncingSheet ? 'Đang...' : 'Đồng bộ'}</span>
          </button>

          {isAdmin && (
            <>
              {/* Nút Cập nhật các trường cố định (Mục 6 - Hình 6) */}
              <button
                type="button"
                onClick={() => {
                  setTempFeeFields([...fixedFeeFields]);
                  setNewFieldName('');
                  setNewFieldAmount(0);
                  setIsFixedFeesDrawerOpen(true);
                }}
                className="inline-flex items-center justify-center gap-1.5 sm:gap-2 bg-white hover:bg-slate-50 text-blue-600 border border-blue-200 px-2.5 sm:px-4 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-semibold shadow-xs transition-all active:scale-[0.98]"
              >
                <Settings2 className="w-4 h-4 text-blue-600" />
                <span className="hidden lg:inline">Cập nhật các trường cố định</span>
                <span className="lg:hidden">Cập nhật</span>
              </button>

              {/* Nút Tạo sự kiện mới: trên mobile đổi thành icon dấu "+" */}
              <button
                onClick={handleOpenAddModal}
                className="inline-flex items-center justify-center gap-1.5 sm:gap-2 bg-[#2563eb] hover:bg-blue-700 text-white px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-semibold shadow-sm transition-all active:scale-[0.98]"
                title="Tạo sự kiện mới"
              >
                <Plus className="w-4 h-4" />
                <span className="hidden lg:inline">Tạo sự kiện mới</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Stats Cards (Mobile 2x2 grid, smaller font) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
        <div className="bg-white p-3 sm:p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between">
          <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 shrink-0">
              <CalendarDays className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <span className="text-[11px] sm:text-xs font-medium text-slate-500 leading-tight">Tổng sự kiện</span>
          </div>
          <div className="text-sm sm:text-lg lg:text-2xl font-bold text-slate-900 pl-1">{stats.totalEvents}</div>
        </div>

        <div className="bg-white p-3 sm:p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between">
          <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 shrink-0">
              <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <span className="text-[11px] sm:text-xs font-medium text-slate-500 leading-tight">Sắp diễn ra</span>
          </div>
          <div className="text-sm sm:text-lg lg:text-2xl font-bold text-slate-900 pl-1">{stats.upcomingEvents}</div>
        </div>

        <div className="bg-white p-3 sm:p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between">
          <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600 shrink-0">
              <Users className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <span className="text-[11px] sm:text-xs font-medium text-slate-500 leading-tight">Tổng khách</span>
          </div>
          <div className="text-sm sm:text-lg lg:text-2xl font-bold text-slate-900 pl-1">{stats.totalGuests}</div>
        </div>

        <div className="bg-white p-3 sm:p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between">
          <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600 shrink-0">
              <Wallet className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <span className="text-[11px] sm:text-xs font-medium text-slate-500 leading-tight">Tổng chi phí</span>
          </div>
          <div className="text-[11px] sm:text-base lg:text-2xl font-bold text-slate-900 pl-1 truncate" title={formatCurrency(stats.totalCost)}>{formatCurrency(stats.totalCost)}</div>
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
          <table className="w-full text-left text-sm text-slate-600 border-collapse min-w-[900px]">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/50 text-slate-500 font-medium text-xs">
                <th className="py-4 px-5">Tên sự kiện</th>
                <th className="py-4 px-5 text-center">Khách tham dự</th>
                <th className="py-4 px-5">Trạng thái</th>
                <th className="py-4 px-5">Duyệt</th>
                <th className="py-4 px-5 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredEvents.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400 text-sm">
                    {searchQuery ? 'Không tìm thấy sự kiện phù hợp' : 'Chưa có sự kiện nào'}
                  </td>
                </tr>
              ) : (
                filteredEvents.map((event) => (
                  <tr key={event.id} className="hover:bg-slate-50 transition-colors">
                    {/* Item 1, 2, 3, 4: Ảnh lớn + Nút Share + Gạch chân khi hover + Ngày & Địa điểm dưới tên */}
                    <td className="py-3.5 px-5">
                      <div className="flex items-center gap-4">
                        {/* Cột ảnh lớn hơn, object-fit: cover, giữ đúng tỷ lệ (Mục 2 - Hình 2) + Nút Share (Mục 3 - Hình 3) */}
                        <div className="relative w-32 h-20 sm:w-40 sm:h-26 rounded-xl overflow-hidden bg-slate-100 shrink-0 border border-slate-200 group-hover:ring-2 group-hover:ring-blue-500/30 transition-all shadow-2xs">
                          <Link href={`/admin/su-kien/${event.id}`} className="block w-full h-full">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={event.image_url || '/events/event-1.jpg'}
                              alt={event.name}
                              className="w-full h-full object-cover hover:scale-105 transition-transform duration-200"
                              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            />
                          </Link>
                          {/* Nút Share sự kiện (Mục 3 - Hình 3) */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setShareEvent(event);
                            }}
                            className="absolute top-1.5 right-1.5 p-1.5 bg-black/60 hover:bg-blue-600 text-white rounded-lg backdrop-blur-xs transition-all z-10 hover:scale-110 shadow-sm cursor-pointer"
                            title="Chia sẻ sự kiện"
                          >
                            <Share2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <div className="min-w-0 flex-1">
                          <Link
                            href={`/admin/su-kien/${event.id}`}
                            className="group block"
                          >
                            {/* Gạch chân khi hover tên sự kiện (Mục 4 - Hình 4) */}
                            <span className="font-semibold text-slate-900 group-hover:underline group-hover:text-blue-600 transition-colors line-clamp-2">
                              {event.name}
                            </span>
                            {/* Ngày và Địa điểm nằm ngay dưới tên sự kiện */}
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-xs text-slate-500 font-normal">
                              {event.event_date && (
                                <span className="flex items-center gap-1 shrink-0">
                                  <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                  {formatDate(event.event_date)}
                                </span>
                              )}
                              {event.location && (
                                <span className="flex items-center gap-1 min-w-0" title={event.location}>
                                  <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                  <span className="truncate max-w-[240px]">{event.location}</span>
                                </span>
                              )}
                            </div>
                          </Link>
                        </div>
                      </div>
                    </td>

                    <td className="py-4 px-5 text-slate-600 text-center font-medium">{event.registration_count ?? 0}</td>

                    {/* Cột Trạng thái: Admin thay đổi trực tiếp (Mục 8 & 9 - Hình 9 & 10) */}
                    <td className="py-4 px-5">
                      {isAdmin ? (
                        <div className="relative inline-block" onClick={(e) => e.stopPropagation()}>
                          <select
                            value={event.status === 'Đang thực hiện' ? 'Đang diễn ra' : (event.status || 'Sắp diễn ra')}
                            onChange={(e) => handleDirectStatusChange(event.id, e.target.value)}
                            className={`appearance-none font-semibold text-xs rounded-full pl-3 pr-6 py-1 cursor-pointer transition-all border outline-none focus:ring-2 focus:ring-blue-500/20 ${
                              (event.status === 'Đang thực hiện' || event.status === 'Đang diễn ra')
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                                : (event.status === 'Đã diễn ra' || event.status === 'Đã hoàn thành')
                                ? 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
                                : 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100'
                            }`}
                            title="Admin thay đổi trực tiếp trạng thái"
                          >
                            <option value="Đang diễn ra">Đang diễn ra</option>
                            <option value="Sắp diễn ra">Sắp diễn ra</option>
                            <option value="Đã diễn ra">Đã diễn ra</option>
                          </select>
                          <ChevronDown className="w-3 h-3 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none opacity-60" />
                        </div>
                      ) : (
                        getStatusBadge(event.status)
                      )}
                    </td>

                    {/* Cột Duyệt: Admin thay đổi trực tiếp (Mục 9 - Hình 10) */}
                    <td className="py-4 px-5">
                      {isAdmin ? (
                        <div className="relative inline-block" onClick={(e) => e.stopPropagation()}>
                          <select
                            value={event.approval_status || 'Chờ duyệt'}
                            onChange={(e) => handleDirectApprovalChange(event.id, e.target.value)}
                            className={`appearance-none font-semibold text-xs rounded-full pl-3 pr-6 py-1 cursor-pointer transition-all border outline-none focus:ring-2 focus:ring-blue-500/20 ${
                              event.approval_status === 'Đã duyệt'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                                : event.approval_status === 'Từ chối'
                                ? 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
                                : 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'
                            }`}
                            title="Admin thay đổi trực tiếp duyệt"
                          >
                            <option value="Đã duyệt">Đã duyệt</option>
                            <option value="Chờ duyệt">Chờ duyệt</option>
                            <option value="Từ chối">Từ chối</option>
                          </select>
                          <ChevronDown className="w-3 h-3 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none opacity-60" />
                        </div>
                      ) : (
                        getApprovalBadge(event.approval_status)
                      )}
                    </td>

                    {/* Cột Thao tác: Nút Sửa & Nút Xóa (cho tài khoản Admin) */}
                    <td className="py-4 px-5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {isAdmin && (
                          <>
                            <button
                              onClick={() => handleOpenEditModal(event)}
                              className="text-slate-400 hover:text-blue-600 transition-colors p-1.5 rounded-lg hover:bg-blue-50 cursor-pointer"
                              title="Sửa sự kiện"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteEvent(event.id, event.name)}
                              className="text-slate-400 hover:text-rose-600 transition-colors p-1.5 rounded-lg hover:bg-rose-50 cursor-pointer"
                              title="Xóa sự kiện"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
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

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                {/* Trạng thái (Mục 8: Đang diễn ra thay vì Đang thực hiện) */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                    Trạng thái
                  </label>
                  <select
                    value={formData.status === 'Đang thực hiện' ? 'Đang diễn ra' : formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-slate-900"
                  >
                    {STATUS_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                  </select>
                </div>
                {/* Trường Duyệt trong Popup sửa chi tiết sự kiện (Mục 10 - Hình 11) */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                    Duyệt
                  </label>
                  <select
                    value={formData.approval_status || 'Chờ duyệt'}
                    onChange={(e) => setFormData({ ...formData, approval_status: e.target.value })}
                    className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-slate-900"
                  >
                    <option value="Đã duyệt">Đã duyệt</option>
                    <option value="Chờ duyệt">Chờ duyệt</option>
                    <option value="Từ chối">Từ chối</option>
                  </select>
                </div>
              </div>

              {/* Địa điểm (Mục 7: Mặc định địa điểm & nút x xóa) */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                  Địa điểm
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    placeholder="Nhập địa điểm sự kiện..."
                    className="w-full pl-3.5 pr-9 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-slate-900"
                  />
                  {formData.location && (
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, location: '' })}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-100 transition-colors cursor-pointer"
                      title="Xóa địa điểm"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Các trường giá cố định (Mục 6, 7: Dynamic fields with dot formatting) */}
              <div className="pt-2">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-bold text-slate-800">Các trường giá cố định (chỉ áp dụng sự kiện mới)</h3>
                  <span className="text-[11px] font-medium text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-md">
                    Cố định (Không thể sửa)
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  {fixedFeeFields.map((field) => {
                    const val = (formData as any)[field.id] !== undefined ? (formData as any)[field.id] : field.amount;
                    return (
                      <div key={field.id}>
                        <label className="block text-xs font-medium text-slate-600 mb-1">{field.name}</label>
                        <input
                          type="text"
                          readOnly
                          disabled
                          value={formatNumberWithDots(val) + ' đ'}
                          className="w-full px-3.5 py-2 bg-slate-100 border border-slate-200 rounded-lg text-sm font-semibold text-slate-600 cursor-not-allowed select-none"
                        />
                      </div>
                    );
                  })}
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
      {/* DRAWER: CẬP NHẬT CÁC TRƯỜNG SỰ KIỆN (Mục 6 & 7 - Hình 6, 7, 8) */}
      {/* ============================================================ */}
      {isFixedFeesDrawerOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex justify-end animate-in fade-in duration-150">
          <div className="bg-white w-full max-w-lg h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
            {/* Drawer Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
              <div>
                <h2 className="text-base font-bold text-slate-900 uppercase tracking-tight">
                  Cập nhật các trường trong các sự kiện mới nhất
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">Số lượng: {tempFeeFields.length} trường</p>
              </div>
              <button
                type="button"
                onClick={() => setIsFixedFeesDrawerOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Drawer Content */}
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
              {/* Notice */}
              <div className="p-4 rounded-xl bg-blue-50/80 border border-blue-100 flex items-start gap-3 text-xs text-blue-900">
                <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <p>Các trường dưới đây được áp dụng cho các sự kiện mới. Admin có thể tăng hoặc giảm số lượng trường, bổ sung trường mới tùy theo nhu cầu.</p>
              </div>

              {/* Table / List */}
              <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                <div className="grid grid-cols-12 bg-slate-50 px-4 py-2.5 text-xs font-semibold text-slate-600 border-b border-slate-200">
                  <div className="col-span-6">Trường cập nhật</div>
                  <div className="col-span-5 text-right">Giá hiện tại (VNĐ)</div>
                  <div className="col-span-1 text-center">Xóa</div>
                </div>

                <div className="divide-y divide-slate-100 bg-white text-sm">
                  {tempFeeFields.map((field, idx) => (
                    <div key={field.id} className="grid grid-cols-12 items-center px-4 py-3 gap-2 hover:bg-slate-50/50 transition-colors">
                      <div className="col-span-6">
                        <input
                          type="text"
                          value={field.name}
                          onChange={(e) => {
                            const next = [...tempFeeFields];
                            next[idx] = { ...next[idx], name: e.target.value };
                            setTempFeeFields(next);
                          }}
                          className="w-full px-2.5 py-1.5 border border-transparent hover:border-slate-200 focus:border-blue-500 rounded-lg text-xs sm:text-sm font-medium text-slate-800 bg-transparent focus:bg-white outline-none"
                          placeholder="Tên trường..."
                        />
                      </div>
                      <div className="col-span-5">
                        <input
                          type="text"
                          value={formatNumberWithDots(field.amount)}
                          onChange={(e) => {
                            const next = [...tempFeeFields];
                            next[idx] = { ...next[idx], amount: parseNumberFromDots(e.target.value) };
                            setTempFeeFields(next);
                          }}
                          className="w-full text-right px-3 py-1.5 border border-slate-200 rounded-lg text-xs sm:text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="0"
                        />
                      </div>
                      <div className="col-span-1 flex justify-center">
                        <button
                          type="button"
                          onClick={() => {
                            if (tempFeeFields.length <= 1) {
                              showToast('error', 'Cần giữ lại ít nhất 1 trường');
                              return;
                            }
                            setTempFeeFields(tempFeeFields.filter((_, i) => i !== idx));
                          }}
                          className="text-slate-400 hover:text-rose-600 hover:bg-rose-50 p-1.5 rounded-lg transition-colors cursor-pointer"
                          title="Xóa trường này"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Bổ sung thêm trường mới (Mục 6 - Hình 6, 7) */}
              <div className="p-4 rounded-xl bg-slate-50 border border-dashed border-slate-300 space-y-3">
                <div className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <Plus className="w-4 h-4 text-blue-600" />
                  Bổ sung thêm trường mới
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                  <div className="sm:col-span-7">
                    <input
                      type="text"
                      value={newFieldName}
                      onChange={(e) => setNewFieldName(e.target.value)}
                      placeholder="Tên trường mới (ví dụ: Chi phí quà tặng)"
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900"
                    />
                  </div>
                  <div className="sm:col-span-5">
                    <input
                      type="text"
                      value={formatNumberWithDots(newFieldAmount)}
                      onChange={(e) => setNewFieldAmount(parseNumberFromDots(e.target.value))}
                      placeholder="Giá trị (VNĐ)"
                      className="w-full text-right px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs sm:text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900"
                    />
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (!newFieldName.trim()) {
                      showToast('error', 'Vui lòng nhập tên trường mới');
                      return;
                    }
                    const id = 'custom_' + Date.now();
                    setTempFeeFields([...tempFeeFields, { id, name: newFieldName.trim(), amount: newFieldAmount }]);
                    setNewFieldName('');
                    setNewFieldAmount(0);
                    showToast('success', `Đã thêm trường "${newFieldName.trim()}"!`);
                  }}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Thêm trường mới
                </button>
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
                className="px-5 py-2.5 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-100 border border-slate-200 transition-colors cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleSaveFixedFees}
                disabled={isSavingFixedFees}
                className="px-6 py-2.5 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-all shadow-sm active:scale-[0.98] disabled:opacity-50 flex items-center gap-2 cursor-pointer"
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

      {/* MODAL: CHIA SẺ SỰ KIỆN (MỤC 3 - HÌNH 3) */}
      {shareEvent && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-100 overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                  <Share2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Chia sẻ sự kiện</h3>
                  <p className="text-xs text-slate-500 truncate max-w-[320px]">{shareEvent.name}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShareEvent(null)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-5">
              {/* Dòng 1: ID sự kiện */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
                  <span>Dòng 1 : ID sự kiện</span>
                  <span className="text-[11px] text-slate-400 font-normal">Link đăng ký chung của sự kiện</span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={`${shareOrigin}/qr-checkin?ref&event=${shareEvent.id}`}
                    className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-700 focus:outline-none select-all font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => copyToClipboard(`${shareOrigin}/qr-checkin?ref&event=${shareEvent.id}`, true)}
                    className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shrink-0 transition-all cursor-pointer shadow-xs active:scale-95"
                  >
                    {copiedLine1 ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedLine1 ? 'Đã chép' : 'Sao chép'}</span>
                  </button>
                </div>
              </div>

              {/* Dòng 2 : ID sự kiện + ID cá nhân */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
                  <span>Dòng 2 : ID sự kiện + ID cá nhân</span>
                  <span className="text-[11px] text-blue-600 font-medium">Kèm ID cá nhân: {currentUserRef}</span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={`${shareOrigin}/qr-checkin?ref=${currentUserRef}&event=${shareEvent.id}`}
                    className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-700 focus:outline-none select-all font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => copyToClipboard(`${shareOrigin}/qr-checkin?ref=${currentUserRef}&event=${shareEvent.id}`, false)}
                    className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shrink-0 transition-all cursor-pointer shadow-xs active:scale-95"
                  >
                    {copiedLine2 ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedLine2 ? 'Đã chép' : 'Sao chép'}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-100 flex items-center justify-end">
              <button
                type="button"
                onClick={() => setShareEvent(null)}
                className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 font-semibold rounded-xl text-xs transition-colors cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
