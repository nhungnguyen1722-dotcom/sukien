'use client';

import React, { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import {
  Users,
  CheckCircle2,
  Clock,
  Gift,
  Copy,
  Send,
  Share2,
  Mail,
  MessageCircle,
  Check,
  X,
  Search,
  ChevronRight,
  ExternalLink,
  Trash2,
  Save,
  BellRing,
  Award,
  Sparkles,
  Calendar,
  MapPin,
  RotateCw,
  Download,
} from 'lucide-react';

export interface Invitation {
  id: number;
  inviter_id: number;
  invitee_name: string | null;
  invitee_email: string;
  invitee_phone?: string | null;
  status: 'Đã tham gia' | 'Đang chờ' | 'Từ chối' | string;
  reward_points: number;
  created_at: string | null;
  updated_at?: string | null;
  inviter_name?: string | null;
  inviter_ref_code?: string | null;
}

export interface InviteStats {
  totalInvites: number;
  joinedCount: number;
  pendingCount: number;
  rejectedCount?: number;
  totalRewards: number;
}

export interface CurrentUser {
  id: number;
  full_name: string;
  ref_code?: string | null;
  email?: string | null;
}

export interface UpcomingEvent {
  id: number;
  name: string;
  event_date?: string | null;
  start_time?: string | null;
  end_time?: string | null;
  location?: string | null;
  status?: string;
}

interface InviteManagementProps {
  initialInvitations: Invitation[];
  initialStats: InviteStats;
  currentUser?: CurrentUser;
  upcomingEvents?: UpcomingEvent[];
}

export default function InviteManagement({
  initialInvitations,
  initialStats,
  currentUser = { id: 1, full_name: 'Nhung Nguyễn', ref_code: 'N_0000000001' },
  upcomingEvents = [],
}: InviteManagementProps) {
  const [invitations, setInvitations] = useState<Invitation[]>(initialInvitations);
  const [stats, setStats] = useState<InviteStats>(initialStats);
  
  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'Đã tham gia' | 'Đang chờ' | 'Từ chối'>('all');

  // Event Selection for referral link (Item 10)
  const [eventsList, setEventsList] = useState<UpcomingEvent[]>(upcomingEvents);
  const [selectedEventId, setSelectedEventId] = useState<number | null>(null);
  const [eventInputVal, setEventInputVal] = useState<string>('');

  // Fetch upcoming events if none provided via props
  useEffect(() => {
    if (eventsList.length === 0) {
      fetch('/api/admin/events')
        .then((res) => res.json())
        .then((data) => {
          if (data && Array.isArray(data.events)) {
            const up = data.events.filter(
              (e: any) => e.status === 'Sắp diễn ra' || e.status === 'Đang diễn ra'
            );
            setEventsList(up);
          }
        })
        .catch(() => {});
    }
  }, [eventsList.length]);

  const handleSelectEvent = (val: string) => {
    setEventInputVal(val);
    const idMatch = val.match(/^(\d+)/);
    if (idMatch) {
      setSelectedEventId(parseInt(idMatch[1], 10));
    } else {
      const found = eventsList.find(
        (ev) => ev.name.toLowerCase() === val.trim().toLowerCase()
      );
      if (found) {
        setSelectedEventId(found.id);
      } else {
        setSelectedEventId(null);
      }
    }
  };

  const selectedEvent = useMemo(() => {
    if (!selectedEventId) return null;
    return eventsList.find((ev) => ev.id === selectedEventId) || null;
  }, [eventsList, selectedEventId]);

  // Form states for sending invite
  const [inviteName, setInviteName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Detail Modal State
  const [selectedInvite, setSelectedInvite] = useState<Invitation | null>(null);
  const [modalStatus, setModalStatus] = useState<string>('Đang chờ');
  const [modalReward, setModalReward] = useState<number>(0);
  const [modalName, setModalName] = useState<string>('');
  const [modalEmail, setModalEmail] = useState<string>('');
  const [isUpdating, setIsUpdating] = useState(false);

  // Toast Notification State
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'info' | 'error' } | null>(null);
  const [copied, setCopied] = useState(false);

  // Computed referral code & Dynamic URL according to environment (localhost vs production Vercel)
  const [baseUrl, setBaseUrl] = useState<string>('http://localhost:3000');

  React.useEffect(() => {
    if (typeof window !== 'undefined' && window.location.origin) {
      setBaseUrl(window.location.origin);
    }
  }, []);

  const refCode = currentUser.ref_code || 'N_0000000001';
  const referralUrl = selectedEventId
    ? `${baseUrl}/qr-checkin?ref=${encodeURIComponent(refCode)}&event=${selectedEventId}`
    : `${baseUrl}/qr-checkin?ref=${encodeURIComponent(refCode)}`;

  // Show Toast helper
  const showToast = (message: string, type: 'success' | 'info' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 3500);
  };

  // Copy Link Action
  const handleCopyLink = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(referralUrl);
      setCopied(true);
      showToast('Đã sao chép đường dẫn mời vào bộ nhớ tạm!');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Social Share Action
  const handleShare = (platform: 'facebook' | 'zalo' | 'telegram' | 'email' | 'native') => {
    const text = `Tham gia sự kiện cùng mình tại NGHIÊNG COMPLEX: ${referralUrl}`;
    if (platform === 'facebook') {
      window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(referralUrl)}`, '_blank');
    } else if (platform === 'zalo') {
      window.open(`https://chat.zalo.me/?url=${encodeURIComponent(referralUrl)}`, '_blank');
    } else if (platform === 'telegram') {
      window.open(`https://t.me/share/url?url=${encodeURIComponent(referralUrl)}&text=${encodeURIComponent(text)}`, '_blank');
    } else if (platform === 'email') {
      window.location.href = `mailto:?subject=${encodeURIComponent('[NGHIENG Complex] Thư mời tham gia sự kiện')}&body=${encodeURIComponent(text)}`;
    } else if (platform === 'native') {
      if (typeof navigator !== 'undefined' && navigator.share) {
        navigator.share({
          title: 'NGHIÊNG COMPLEX - Mời tham gia sự kiện',
          text: text,
          url: referralUrl,
        }).catch(() => {});
      } else {
        handleCopyLink();
      }
    }
  };

  // Handle Send Invite via Email
  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) {
      showToast('Vui lòng nhập email người nhận', 'error');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(inviteEmail.trim())) {
      showToast('Định dạng email không hợp lệ', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/admin/invitations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          inviter_id: currentUser.id,
          invitee_name: inviteName.trim() || null,
          invitee_email: inviteEmail.trim().toLowerCase(),
          status: 'Đang chờ',
          reward_points: 0,
          event_id: selectedEventId,
          event_name: selectedEvent ? selectedEvent.name : 'Sự kiện Nghiêng Complex',
          event_time: selectedEvent ? `${formatDateDisplay(selectedEvent.event_date ?? null)} (${selectedEvent.start_time || '08:30'} - ${selectedEvent.end_time || '11:30'})` : '30/05/2026 (Thứ năm) - 08:30 - 11:30',
          event_location: selectedEvent?.location || 'Trung tâm Hội nghị Quốc gia, Hà Nội',
          invite_link: referralUrl,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Có lỗi xảy ra khi gửi lời mời');
      }

      // Add to list
      setInvitations((prev) => [...prev, data.invitation]);
      // Update stats
      setStats((prev) => ({
        ...prev,
        totalInvites: prev.totalInvites + 1,
        pendingCount: prev.pendingCount + 1,
      }));

      setInviteName('');
      setInviteEmail('');
      showToast(`Đã gửi lời mời thành công tới ${inviteEmail}!`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Lỗi khi gửi lời mời';
      showToast(msg, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Open Details Modal
  const openDetailModal = (invite: Invitation) => {
    setSelectedInvite(invite);
    setModalStatus(invite.status);
    setModalReward(invite.reward_points);
    setModalName(invite.invitee_name || '');
    setModalEmail(invite.invitee_email || '');
  };

  // Save Modal Changes
  const handleSaveModal = async () => {
    if (!selectedInvite) return;
    setIsUpdating(true);
    try {
      const res = await fetch(`/api/admin/invitations/${selectedInvite.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: modalStatus,
          reward_points: modalReward,
          invitee_name: modalName.trim() || null,
          invitee_email: modalEmail.trim().toLowerCase(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Có lỗi xảy ra khi cập nhật');
      }

      // Update in local state
      setInvitations((prev) =>
        prev.map((item) => (item.id === selectedInvite.id ? data.invitation : item))
      );

      // Recalculate stats
      const updatedList = invitations.map((item) =>
        item.id === selectedInvite.id ? data.invitation : item
      );
      const totalInvites = updatedList.length;
      const joinedCount = updatedList.filter((i) => i.status === 'Đã tham gia').length;
      const pendingCount = updatedList.filter((i) => i.status === 'Đang chờ').length;
      const rejectedCount = updatedList.filter((i) => i.status === 'Từ chối').length;
      const totalRewards = updatedList.reduce(
        (sum, i) => sum + (i.status === 'Đã tham gia' ? i.reward_points || 1 : 0),
        0
      );

      setStats({
        totalInvites,
        joinedCount,
        pendingCount,
        rejectedCount,
        totalRewards,
      });

      showToast('Cập nhật thông tin lời mời thành công!');
      setSelectedInvite(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Lỗi khi cập nhật';
      showToast(msg, 'error');
    } finally {
      setIsUpdating(false);
    }
  };

  // Send Reminder Action
  const handleRemind = async (invite: Invitation, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      const res = await fetch(`/api/admin/invitations/${invite.id}`, {
        method: 'POST',
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Lỗi khi gửi email nhắc nhở');
      }
      showToast(`Đã gửi email nhắc nhở tới ${invite.invitee_email}!`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Lỗi khi gửi nhắc nhở';
      showToast(msg, 'error');
    }
  };

  // Delete Invitation Action
  const handleDeleteInvite = async (id: number) => {
    if (!confirm('Bạn có chắc chắn muốn xóa bản ghi lời mời này?')) return;
    try {
      const res = await fetch(`/api/admin/invitations/${id}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        throw new Error('Lỗi khi xóa lời mời');
      }

      const updated = invitations.filter((i) => i.id !== id);
      setInvitations(updated);

      setStats({
        totalInvites: updated.length,
        joinedCount: updated.filter((i) => i.status === 'Đã tham gia').length,
        pendingCount: updated.filter((i) => i.status === 'Đang chờ').length,
        rejectedCount: updated.filter((i) => i.status === 'Từ chối').length,
        totalRewards: updated.reduce(
          (sum, i) => sum + (i.status === 'Đã tham gia' ? i.reward_points || 1 : 0),
          0
        ),
      });

      showToast('Đã xóa lời mời thành công');
      setSelectedInvite(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Lỗi khi xóa';
      showToast(msg, 'error');
    }
  };

  // Format date helper: returns dd/M/yyyy (e.g. 19/8/2026) to match screenshot
  const formatDateDisplay = (dateStr: string | null) => {
    if (!dateStr) return '—';
    try {
      const date = new Date(dateStr);
      const day = date.getDate();
      const month = date.getMonth() + 1;
      const year = date.getFullYear();
      return `${day}/${month}/${year}`;
    } catch {
      return dateStr;
    }
  };

  // Filtered invitations list
  const filteredInvitations = useMemo(() => {
    return invitations.filter((item) => {
      const matchesSearch =
        searchQuery.trim() === '' ||
        (item.invitee_name && item.invitee_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
        item.invitee_email.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus = statusFilter === 'all' || item.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [invitations, searchQuery, statusFilter]);

  return (
    <div className="p-6 md:p-8 max-w-[1360px] mx-auto space-y-6">
      {/* Toast Alert */}
      {toast && (
        <div className="fixed top-6 right-6 z-50 transition-all duration-300 transform translate-y-0">
          <div
            className={`flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg text-sm font-medium border ${
              toast.type === 'error'
                ? 'bg-rose-50 text-rose-800 border-rose-200'
                : toast.type === 'info'
                ? 'bg-blue-50 text-blue-800 border-blue-200'
                : 'bg-emerald-50 text-emerald-800 border-emerald-200'
            }`}
          >
            {toast.type === 'error' ? (
              <X className="w-4 h-4 text-rose-600" />
            ) : (
              <Check className="w-4 h-4 text-emerald-600" />
            )}
            <span>{toast.message}</span>
            <button
              onClick={() => setToast(null)}
              className="ml-2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs md:text-sm text-slate-400 font-medium">
        <Link href="/admin/moi-ban-be" className="hover:text-slate-600 transition-colors">
          Mời bạn bè
        </Link>
        <span>/</span>
        <span className="text-slate-600 font-semibold">Mời tham gia sự kiện</span>
      </div>

      {/* Hero Banner with Stats */}
      <div className="bg-[#0B1E48] bg-gradient-to-r from-[#0a1838] via-[#0e245a] to-[#122e70] rounded-2xl p-6 md:p-8 text-white shadow-sm border border-slate-800/40">
        <div className="mb-6">
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white">
            Mời tham gia sự kiện
          </h1>
          <p className="text-blue-200/90 text-sm mt-1.5 font-normal">
            Mời bạn bè tham gia sự kiện để nhận điểm thưởng hấp dẫn.
          </p>
        </div>

        {/* 4 Stat Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* Card 1: Tổng lời mời */}
          <div className="bg-[#152e69]/70 hover:bg-[#152e69] transition-all border border-blue-400/15 rounded-xl p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <Users className="w-4 h-4 text-blue-300" />
            </div>
            <div>
              <div className="text-2xl md:text-3xl font-bold text-white tracking-tight">
                {stats.totalInvites}
              </div>
              <div className="text-xs text-blue-200/80 font-medium mt-0.5">
                Tổng lời mời
              </div>
            </div>
          </div>

          {/* Card 2: Đã tham gia */}
          <div className="bg-[#152e69]/70 hover:bg-[#152e69] transition-all border border-blue-400/15 rounded-xl p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            </div>
            <div>
              <div className="text-2xl md:text-3xl font-bold text-white tracking-tight">
                {stats.joinedCount}
              </div>
              <div className="text-xs text-blue-200/80 font-medium mt-0.5">
                Đã tham gia
              </div>
            </div>
          </div>

          {/* Card 3: Đang chờ */}
          <div className="bg-[#152e69]/70 hover:bg-[#152e69] transition-all border border-blue-400/15 rounded-xl p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <Clock className="w-4 h-4 text-amber-300" />
            </div>
            <div>
              <div className="text-2xl md:text-3xl font-bold text-white tracking-tight">
                {stats.pendingCount}
              </div>
              <div className="text-xs text-blue-200/80 font-medium mt-0.5">
                Đang chờ
              </div>
            </div>
          </div>

          {/* Card 4: Điểm đã nhận */}
          <div className="bg-[#152e69]/70 hover:bg-[#152e69] transition-all border border-blue-400/15 rounded-xl p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <Gift className="w-4 h-4 text-pink-300" />
            </div>
            <div>
              <div className="text-2xl md:text-3xl font-bold text-white tracking-tight">
                {stats.totalRewards}
              </div>
              <div className="text-xs text-blue-200/80 font-medium mt-0.5">
                Điểm đã nhận
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2 Middle Action Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left Card: Đường dẫn mời của bạn */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-sm flex flex-col justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900 mb-3">
              Đường dẫn mời của bạn
            </h2>

            {/* Dropdown chọn sự kiện Sắp diễn ra (Mục 10 - Hình 10) */}
            <div className="mb-4">
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Chọn sự kiện áp dụng (Sắp diễn ra):
              </label>
              <div className="relative">
                <input
                  type="text"
                  list="upcoming-events-list"
                  placeholder="Gõ tìm kiếm hoặc chọn sự kiện..."
                  value={eventInputVal}
                  onChange={(e) => handleSelectEvent(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-xs md:text-sm px-3.5 py-2.5 rounded-xl outline-none focus:border-blue-500 transition placeholder:text-slate-400 pr-16"
                />
                <datalist id="upcoming-events-list">
                  {eventsList.map((ev) => (
                    <option key={ev.id} value={`${ev.id} - ${ev.name}`} />
                  ))}
                </datalist>
                {selectedEventId && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedEventId(null);
                      setEventInputVal('');
                    }}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[11px] text-slate-500 hover:text-rose-600 bg-slate-200/70 hover:bg-rose-50 px-2 py-0.5 rounded-lg transition-colors cursor-pointer"
                  >
                    Bỏ chọn
                  </button>
                )}
              </div>
              {selectedEventId && (
                <p className="text-[11px] text-emerald-600 font-medium mt-1 flex items-center gap-1">
                  <Check className="w-3 h-3 text-emerald-600" />
                  <span>Đã kèm mã sự kiện #{selectedEventId} vào đường dẫn mời bên dưới</span>
                </p>
              )}
            </div>

            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Đường dẫn mời hoàn chỉnh:
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={referralUrl}
                className="flex-1 bg-slate-50 border border-slate-200 text-slate-700 text-xs md:text-sm font-mono px-3.5 py-2.5 rounded-xl outline-none select-all focus:border-blue-500 transition"
              />
              <button
                type="button"
                onClick={handleCopyLink}
                className="bg-[#2563eb] hover:bg-[#1d4ed8] active:scale-95 text-white font-medium text-xs md:text-sm px-4 py-2.5 rounded-xl flex items-center gap-1.5 transition-all shadow-sm flex-shrink-0 cursor-pointer"
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                <span>{copied ? 'Đã chép' : 'Sao chép'}</span>
              </button>
            </div>
          </div>

          <div className="mt-5 pt-4 border-t border-slate-100 flex items-center gap-3">
            <span className="text-xs md:text-sm font-medium text-slate-500">
              Chia sẻ:
            </span>
            <div className="flex items-center gap-2">
              {/* Facebook */}
              <button
                type="button"
                onClick={() => handleShare('facebook')}
                className="w-8 h-8 rounded-full border border-slate-200 flex items-center justify-center text-[#1877f2] hover:bg-slate-50 hover:border-slate-300 transition"
                title="Chia sẻ qua Facebook"
              >
                <span className="font-bold text-sm">f</span>
              </button>

              {/* Zalo */}
              <button
                type="button"
                onClick={() => handleShare('zalo')}
                className="w-8 h-8 rounded-full border border-slate-200 flex items-center justify-center text-[#0068ff] hover:bg-slate-50 hover:border-slate-300 transition"
                title="Chia sẻ qua Zalo"
              >
                <MessageCircle className="w-4 h-4" />
              </button>

              {/* Telegram / Messenger */}
              <button
                type="button"
                onClick={() => handleShare('telegram')}
                className="w-8 h-8 rounded-full border border-slate-200 flex items-center justify-center text-[#229ed9] hover:bg-slate-50 hover:border-slate-300 transition"
                title="Chia sẻ qua Telegram"
              >
                <Send className="w-3.5 h-3.5 -rotate-12 translate-x-[-1px]" />
              </button>

              {/* Email */}
              <button
                type="button"
                onClick={() => handleShare('email')}
                className="w-8 h-8 rounded-full border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-50 hover:border-slate-300 transition"
                title="Gửi qua Email"
              >
                <Mail className="w-3.5 h-3.5" />
              </button>

              {/* Share / More */}
              <button
                type="button"
                onClick={() => handleShare('native')}
                className="w-8 h-8 rounded-full border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-50 hover:border-slate-300 transition"
                title="Tùy chọn chia sẻ khác"
              >
                <Share2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* QR Code Card (Hình 4.4 và Hình 4.5) */}
          <div className="mt-5 p-4 rounded-2xl border border-blue-100 bg-[#f8faff] flex flex-col sm:flex-row items-center gap-4">
            <div className="p-2.5 bg-white border border-slate-200 rounded-xl shadow-xs shrink-0 flex items-center justify-center">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=130x130&data=${encodeURIComponent(referralUrl)}`}
                alt="QR Code Sự kiện"
                className="w-28 h-28 object-contain"
              />
            </div>
            <div className="flex-1 text-center sm:text-left space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-sm font-bold text-slate-900">
                  Mã QR tham gia sự kiện
                </h3>
                <button
                  type="button"
                  onClick={() => {
                    showToast('Đã làm mới mã QR thành công!');
                  }}
                  className="text-[11px] font-medium text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded-lg flex items-center gap-1 transition-colors"
                >
                  <RotateCw className="w-3 h-3" />
                  <span>Tạo mã QR mới</span>
                </button>
              </div>
              <p className="text-xs text-slate-500">
                Quét mã QR để đăng ký tham gia sự kiện
              </p>
              <div className="pt-1.5">
                <a
                  href={`https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=${encodeURIComponent(referralUrl)}`}
                  download={`QR_Event_${selectedEventId || 'Referral'}.png`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 bg-[#2563eb] hover:bg-[#1d4ed8] text-white text-xs font-semibold px-3.5 py-2 rounded-xl shadow-xs transition-all active:scale-95"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Tải mã QR</span>
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Right Card: Gửi lời mời qua email */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-sm">
          <h2 className="text-base font-bold text-slate-900 mb-3">
            Gửi lời mời qua email
          </h2>
          <form onSubmit={handleSendInvite} className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Tên bạn bè (tùy chọn)
              </label>
              <input
                type="text"
                value={inviteName}
                onChange={(e) => setInviteName(e.target.value)}
                placeholder="Nhập tên bạn bè"
                className="w-full bg-white border border-slate-200 text-slate-800 text-xs md:text-sm px-3.5 py-2 rounded-xl outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-50 transition"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Email <span className="text-rose-500">*</span>
              </label>
              <input
                type="email"
                required
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="email@example.com"
                className="w-full bg-white border border-slate-200 text-slate-800 text-xs md:text-sm px-3.5 py-2 rounded-xl outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-50 transition"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-[#2563eb] hover:bg-[#1d4ed8] active:scale-[0.99] disabled:opacity-60 text-white font-medium text-xs md:text-sm py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 transition-all shadow-sm mt-1"
            >
              <Send className="w-4 h-4" />
              <span>{isSubmitting ? 'Đang gửi...' : 'Gửi lời mời'}</span>
            </button>
          </form>

          {/* Hộp xem trước nội dung email (Hình 4.2 và Hình 4.3) */}
          <div className="mt-4 p-4 rounded-xl border border-blue-100 bg-blue-50/40 text-xs text-slate-700 space-y-3">
            <div className="flex items-center gap-2 font-bold text-blue-900 border-b border-blue-100/80 pb-2">
              <Mail className="w-4 h-4 text-blue-600" />
              <span>Xem trước nội dung email sẽ gửi cho khách hàng</span>
            </div>

            <div className="space-y-1 text-slate-600">
              <p><strong className="text-slate-800">Từ:</strong> Nghiêng Complex &lt;sukien@nghieng.com&gt;</p>
              <p><strong className="text-slate-800">Chủ đề:</strong> [NGHIENG Complex] Thư mời tham gia sự kiện</p>
            </div>

            <div className="pt-1">
              <p className="font-medium text-slate-800">Kính gửi {inviteName.trim() || 'Anh/Chị'},</p>
              <p className="mt-1 text-slate-600">Bạn được mời tham gia sự kiện do Nghiêng Complex tổ chức.</p>
            </div>

            {/* Thông tin sự kiện */}
            <div className="p-3.5 bg-white rounded-xl border border-blue-100/80 space-y-2 shadow-xs">
              <div className="font-bold text-slate-900 mb-1">Thông tin sự kiện:</div>
              <div className="flex items-start gap-2">
                <Calendar className="w-3.5 h-3.5 text-blue-600 mt-0.5 shrink-0" />
                <span><strong className="text-slate-700">Tên sự kiện:</strong> {selectedEvent ? selectedEvent.name : 'Hội thảo Kết nối Doanh nghiệp 2026'}</span>
              </div>
              <div className="flex items-start gap-2">
                <Clock className="w-3.5 h-3.5 text-blue-600 mt-0.5 shrink-0" />
                <span><strong className="text-slate-700">Thời gian:</strong> {selectedEvent ? `${formatDateDisplay(selectedEvent.event_date ?? null)} (${selectedEvent.start_time || '08:30'} - ${selectedEvent.end_time || '11:30'})` : '30/05/2026 (Thứ năm) – 08:30 - 11:30'}</span>
              </div>
              <div className="flex items-start gap-2">
                <MapPin className="w-3.5 h-3.5 text-blue-600 mt-0.5 shrink-0" />
                <span><strong className="text-slate-700">Địa điểm:</strong> {selectedEvent?.location || 'Trung tâm Hội nghị Quốc gia, Hà Nội'}</span>
              </div>
              <div className="flex items-start gap-2">
                <Users className="w-3.5 h-3.5 text-blue-600 mt-0.5 shrink-0" />
                <span><strong className="text-slate-700">Người mời:</strong> {currentUser.full_name || 'Nhung Nguyễn'}</span>
              </div>
            </div>

            <p className="text-slate-600">Vui lòng nhấn vào liên kết bên dưới để xem thông tin và đăng ký tham dự sự kiện.</p>
            <div>
              <a
                href={referralUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block bg-[#2563eb] hover:bg-[#1d4ed8] text-white font-medium text-xs px-4 py-2 rounded-lg shadow-sm"
              >
                Tham gia sự kiện
              </a>
            </div>

            <div className="pt-2 text-slate-500 text-[11px] leading-relaxed border-t border-blue-100/60">
              <p>Trân trọng,</p>
              <p className="font-semibold text-slate-700">Tập đoàn Nghiêng Complex</p>
            </div>
          </div>
        </div>
      </div>

      {/* Table Card: Danh sách lời mời */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden">
        {/* Table Header with Search & Filter */}
        <div className="p-5 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-slate-900">
              Danh sách lời mời ({invitations.length})
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Status Filter */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-medium text-slate-600">
              <button
                onClick={() => setStatusFilter('all')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  statusFilter === 'all'
                    ? 'bg-white text-slate-900 shadow-xs font-semibold'
                    : 'hover:text-slate-900'
                }`}
              >
                Tất cả ({invitations.length})
              </button>
              <button
                onClick={() => setStatusFilter('Đã tham gia')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  statusFilter === 'Đã tham gia'
                    ? 'bg-white text-emerald-700 shadow-xs font-semibold'
                    : 'hover:text-slate-900'
                }`}
              >
                Đã tham gia ({stats.joinedCount})
              </button>
              <button
                onClick={() => setStatusFilter('Đang chờ')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  statusFilter === 'Đang chờ'
                    ? 'bg-white text-amber-700 shadow-xs font-semibold'
                    : 'hover:text-slate-900'
                }`}
              >
                Đang chờ ({stats.pendingCount})
              </button>
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm tên, email..."
                className="pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 text-xs md:text-sm rounded-xl outline-none focus:bg-white focus:border-blue-500 w-[180px] md:w-[220px] transition"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Data Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs md:text-sm text-slate-700">
            <thead className="bg-slate-50/70 border-b border-slate-100 text-slate-500 font-semibold text-xs uppercase tracking-wider">
              <tr>
                <th className="py-3.5 px-4 md:px-6 w-[60px]">STT</th>
                <th className="py-3.5 px-4 md:px-6">Tên</th>
                <th className="py-3.5 px-4 md:px-6">Email</th>
                <th className="py-3.5 px-4 md:px-6">Thời gian mời</th>
                <th className="py-3.5 px-4 md:px-6">Trạng thái</th>
                <th className="py-3.5 px-4 md:px-6 text-center">Thưởng</th>
                <th className="py-3.5 px-4 md:px-6 text-right md:text-left">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredInvitations.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    Không tìm thấy lời mời nào phù hợp
                  </td>
                </tr>
              ) : (
                filteredInvitations.map((invite, index) => {
                  const isJoined = invite.status === 'Đã tham gia';
                  const isPending = invite.status === 'Đang chờ';
                  const isRejected = invite.status === 'Từ chối';

                  return (
                    <tr
                      key={invite.id}
                      className="hover:bg-slate-50/70 transition-colors group"
                    >
                      {/* STT */}
                      <td className="py-4 px-4 md:px-6 font-medium text-slate-500">
                        {index + 1}
                      </td>

                      {/* Tên */}
                      <td className="py-4 px-4 md:px-6 font-semibold text-slate-900">
                        {invite.invitee_name || '—'}
                      </td>

                      {/* Email */}
                      <td className="py-4 px-4 md:px-6 text-slate-600 font-mono text-xs">
                        {invite.invitee_email}
                      </td>

                      {/* Thời gian mời */}
                      <td className="py-4 px-4 md:px-6 text-slate-600">
                        {formatDateDisplay(invite.created_at)}
                      </td>

                      {/* Trạng thái Badge */}
                      <td className="py-4 px-4 md:px-6">
                        {isJoined && (
                          <span className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200/80 px-2.5 py-0.5 rounded-full text-xs font-medium">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                            Đã tham gia
                          </span>
                        )}
                        {isPending && (
                          <span className="inline-flex items-center gap-1.5 bg-amber-50 text-amber-700 border border-amber-200/80 px-2.5 py-0.5 rounded-full text-xs font-medium">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                            Đang chờ
                          </span>
                        )}
                        {isRejected && (
                          <span className="inline-flex items-center gap-1.5 bg-rose-50 text-rose-700 border border-rose-200/80 px-2.5 py-0.5 rounded-full text-xs font-medium">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                            Từ chối
                          </span>
                        )}
                        {!isJoined && !isPending && !isRejected && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
                            {invite.status}
                          </span>
                        )}
                      </td>

                      {/* Thưởng */}
                      <td className="py-4 px-4 md:px-6 text-center font-medium text-slate-800">
                        {invite.reward_points}
                      </td>

                      {/* Thao tác */}
                      <td className="py-4 px-4 md:px-6 text-right md:text-left">
                        <div className="flex items-center justify-end md:justify-start gap-3">
                          <button
                            type="button"
                            onClick={() => openDetailModal(invite)}
                            className="text-[#2563eb] hover:text-[#1d4ed8] hover:underline font-medium text-xs md:text-sm cursor-pointer"
                          >
                            Xem chi tiết
                          </button>

                          {isPending && (
                            <button
                              type="button"
                              onClick={(e) => handleRemind(invite, e)}
                              className="text-[#2563eb] hover:text-[#1d4ed8] hover:underline font-medium text-xs md:text-sm cursor-pointer"
                            >
                              Nhắc nhở
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

      {/* Bottom Rules Card: Thể lệ mời bạn bè */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-sm space-y-4">
        <h2 className="text-base font-bold text-slate-900">Thể lệ mời bạn bè</h2>
        <ul className="space-y-2 text-xs md:text-sm text-slate-700">
          <li className="flex items-start gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-600 mt-2 flex-shrink-0"></span>
            <span>
              Mời 1 bạn bè tham gia sự kiện thành công — nhận 1 lượt quay vòng trúng thưởng.
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-600 mt-2 flex-shrink-0"></span>
            <span>Không giới hạn số lượng người mời.</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-600 mt-2 flex-shrink-0"></span>
            <span>Điểm thưởng cộng ngay khi bạn bè tham gia sự kiện.</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-600 mt-2 flex-shrink-0"></span>
            <span>Bạn bè cần đăng ký qua đường dẫn mời của bạn.</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-600 mt-2 flex-shrink-0"></span>
            <span>Lời mời hết hạn sau 30 ngày nếu không được phản hồi.</span>
          </li>
        </ul>

        {/* Bottom CTA Banner Button */}
        <div
          onClick={handleCopyLink}
          className="bg-[#0B1E48] hover:bg-[#081738] active:scale-[0.99] text-white py-3.5 px-6 rounded-xl flex items-center justify-center gap-2.5 font-medium text-xs md:text-sm transition-all cursor-pointer shadow-sm"
        >
          <Gift className="w-4 h-4 text-pink-300" />
          <span>Cùng mời bạn bè tham gia — Nhận thưởng hấp dẫn!</span>
        </div>
      </div>

      {/* Detail & Edit Modal */}
      {selectedInvite && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-xl w-full md:w-[1014px] md:max-w-[1014px] overflow-hidden border border-slate-100">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-sm">
                  #{selectedInvite.id}
                </div>
                <h3 className="font-bold text-slate-900 text-base">
                  Chi tiết lời mời
                </h3>
              </div>
              <button
                onClick={() => setSelectedInvite(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4 text-xs md:text-sm text-slate-700">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Tên người nhận
                  </label>
                  <input
                    type="text"
                    value={modalName}
                    onChange={(e) => setModalName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-blue-500 font-medium"
                    placeholder="Chưa đặt tên"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={modalEmail}
                    onChange={(e) => setModalEmail(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-blue-500 font-mono text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Trạng thái
                  </label>
                  <select
                    value={modalStatus}
                    onChange={(e) => {
                      const val = e.target.value;
                      setModalStatus(val);
                      if (val === 'Đã tham gia') setModalReward(1);
                      else setModalReward(0);
                    }}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-blue-500 font-medium"
                  >
                    <option value="Đang chờ">Đang chờ</option>
                    <option value="Đã tham gia">Đã tham gia</option>
                    <option value="Từ chối">Từ chối</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Điểm thưởng
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={modalReward}
                    onChange={(e) => setModalReward(parseInt(e.target.value, 10) || 0)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-blue-500 font-medium"
                  />
                </div>
              </div>

              <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-100 space-y-2 text-xs text-slate-600">
                <div className="flex justify-between">
                  <span className="text-slate-400">Thời gian tạo:</span>
                  <span className="font-medium text-slate-700">
                    {formatDateDisplay(selectedInvite.created_at)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Người gửi lời mời:</span>
                  <span className="font-medium text-slate-700">
                    {selectedInvite.inviter_name || currentUser.full_name}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Mã giới thiệu (Ref):</span>
                  <span className="font-mono font-medium text-blue-600">
                    {selectedInvite.inviter_ref_code || refCode}
                  </span>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 bg-slate-50/70 border-t border-slate-100 flex items-center justify-between">
              <button
                type="button"
                onClick={() => handleDeleteInvite(selectedInvite.id)}
                className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 px-3 py-2 rounded-xl text-xs md:text-sm font-medium flex items-center gap-1.5 transition"
              >
                <Trash2 className="w-4 h-4" />
                <span>Xóa</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedInvite(null)}
                  className="px-4 py-2 rounded-xl text-xs md:text-sm font-medium text-slate-600 hover:bg-slate-200/70 transition"
                >
                  Đóng
                </button>
                <button
                  type="button"
                  disabled={isUpdating}
                  onClick={handleSaveModal}
                  className="bg-[#2563eb] hover:bg-[#1d4ed8] disabled:opacity-60 text-white px-4 py-2 rounded-xl text-xs md:text-sm font-medium flex items-center gap-1.5 transition shadow-sm"
                >
                  <Save className="w-4 h-4" />
                  <span>{isUpdating ? 'Đang lưu...' : 'Lưu thay đổi'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
