'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  Users,
  UserCheck,
  UserPlus,
  UserX,
  Search,
  Plus,
  Pencil,
  Trash2,
  X,
  Check,
  AlertCircle,
  Upload,
  Image as LucideImage,
  Eye,
  FileText,
  Receipt,
  Wallet,
  ExternalLink,
  CreditCard,
  Mail,
  Calendar,
  Phone,
  Award,
} from 'lucide-react';
import ImageLibraryModal from '@/components/admin/ImageLibraryModal';
import { MEMBER_TEAM_OPTIONS } from '@/lib/teamOptions';

const formatVND = (val?: number | null) => {
  if (val == null || !Number.isFinite(val)) return '0 đ';
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);
};

export interface Member {
  id: number;
  full_name: string;
  phone: string;
  email?: string | null;
  avatar_url?: string | null;
  identity_card?: string | null;
  bank_account?: string | null;
  role?: string | null;
  classification?: string | null;
  title?: string | null;
  team_id?: number | null;
  team_name?: string | null;
  ref_code?: string | null;
  referrer_id?: number | null;
  referrer_name?: string | null;
  referrer_phone?: string | null;
  referral_group?: string | null;
  source?: string | null;
  join_date?: string | null;
  status?: string | null;
  is_team_leader_eligible?: boolean | null;
  invite_count?: number | null;
  guest_count?: number | null;
  notes?: string | null;
  business_unit?: string | null;
  created_at?: string;
  updated_at?: string;
  contract_count?: number | null;
  total_contract_value?: number | null;
  total_commission?: number | null;
  total_paid_amount?: number | null;
  total_pending_amount?: number | null;
}

export interface Stats {
  totalMembers: number;
  activeMembers: number;
  newMembers: number;
  inactiveMembers: number;
}

export interface ReferrerOption {
  id: number;
  full_name: string;
  phone: string;
  ref_code?: string | null;
}

interface MemberManagementProps {
  initialMembers: Member[];
  initialStats: Stats;
  initialReferrers: ReferrerOption[];
  initialTeams?: Array<{ id: number; name: string }>;
}

const COMPETENCY_OPTIONS = [
  'MC',
  'Diễn giả',
  'Chốt sự kiện',
  'Phụng sự',
  'Điều phối',
  'Hỗ trợ',
  'Khách mời',
  'Kinh doanh',
  'Lễ tân',
  'Khác',
];

const ROLE_OPTIONS = [
  'Khác',
  'MC',
  'Diễn giả',
  'Thuyết trình',
  'Chốt sự kiện',
  'Phụng sự',
  'Điều phối',
  'Hỗ trợ',
  'Kinh doanh',
  'Team Leader',
  'Kế toán',
  'Công nghệ',
  'Nhân sự',
  'Nhân viên',
  'Lễ tân',
  'Admin',
  'Quản trị viên',
];

const CLASSIFICATION_OPTIONS = [
  'Nhân sự',
  'Khách mời',
  'CTV',
  'Sale',
  'Pro Sale',
  'Khác',
];

const TITLE_OPTIONS = [
  'Thành viên',
  'Trưởng phòng',
  'Phó Giám đốc',
  'Giám đốc',
  'Chủ tịch',
];

const REFERRAL_GROUP_OPTIONS = [
  'Khách vãng lai',
  'Chọn người mời trong hệ thống',
  'Mã mời từ thành viên (Referral Code)',
  'Thành viên hệ thống',
  'Khác',
];

const STATUS_OPTIONS = [
  'Hoạt động',
  'Đang hoạt động',
  'Không hoạt động',
  'Tạm khóa',
];

export default function MemberManagement({
  initialMembers,
  initialStats,
  initialReferrers,
  initialTeams,
}: MemberManagementProps) {
  const [members, setMembers] = useState<Member[]>(initialMembers);
  const [stats, setStats] = useState<Stats>(initialStats);
  const [referrers, setReferrers] = useState<ReferrerOption[]>(initialReferrers);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [viewingMember, setViewingMember] = useState<Member | null>(null);
  const [isImageLibraryOpen, setIsImageLibraryOpen] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  // Delete Confirmation Modal
  const [deleteConfirmMember, setDeleteConfirmMember] = useState<Member | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Form State - Đầy đủ các trường kèm avatar_url
  const [formData, setFormData] = useState({
    full_name: '',
    phone: '',
    avatar_url: '',
    referral_group: 'Khách vãng lai',
    ref_code: '',
    role: 'Khác',
    classification: 'Nhân sự',
    title: 'Thành viên',
    team_name: '',
    referrer_id: '',
    referrer_name: '',
    source: '',
    join_date: '',
    guest_count: 0,
    email: '',
    bank_account: '',
    identity_card: '',
    status: 'Hoạt động',
    notes: '',
    business_unit: 'Khối kinh doanh',
  });

  const availableTeamOptions = useMemo(() => {
    const list = [...MEMBER_TEAM_OPTIONS] as string[];
    if (initialTeams && initialTeams.length) {
      for (const t of initialTeams) {
        if (!list.includes(t.name)) list.push(t.name);
      }
    }
    if (formData.team_name) {
      const selected = formData.team_name
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      for (const t of selected) {
        if (!list.includes(t)) {
          list.push(t);
        }
      }
    }
    return list;
  }, [formData.team_name, initialTeams]);

  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSyncingSheet, setIsSyncingSheet] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Hiển thị Toast
  const showToast = (type: 'success' | 'error', text: string) => {
    setToastMessage({ type, text });
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Upload Avatar từ máy tính
  const handleAvatarFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const uploadData = new FormData();
    uploadData.append('file', file);

    try {
      setIsUploadingAvatar(true);
      const res = await fetch('/api/admin/upload', {
        method: 'POST',
        body: uploadData,
      });
      const data = await res.json();
      if (data && data.url) {
        setFormData((prev) => ({ ...prev, avatar_url: data.url }));
        showToast('success', 'Tải ảnh đại diện thành công');
      } else {
        showToast('error', data.error || 'Lỗi tải ảnh lên máy chủ');
      }
    } catch {
      showToast('error', 'Không thể kết nối máy chủ để tải ảnh');
    } finally {
      setIsUploadingAvatar(false);
      e.target.value = '';
    }
  };

  // Đồng bộ Google Sheet (Mục 10 - Hình 13)
  const handleSyncSheet = async () => {
    setIsSyncingSheet(true);
    try {
      const res = await fetch('/api/admin/members/sync-sheet', {
        method: 'POST',
      });
      const data = await res.json();
      if (res.ok) {
        showToast('success', data.message || 'Đồng bộ danh sách thành viên lên Google Sheet thành công!');
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

  // Refresh data from API
  const refreshData = async () => {
    try {
      const res = await fetch('/api/admin/members');
      if (res.ok) {
        const data = await res.json();
        setMembers(data.members || []);
        setStats(data.stats || initialStats);
        setReferrers(data.referrers || []);
      }
    } catch (err) {
      console.error('Error refreshing members:', err);
    }
  };

  // Mở modal thêm mới
  const handleOpenAddModal = () => {
    setEditingMember(null);
    setFormData({
      full_name: '',
      phone: '',
      avatar_url: '',
      referral_group: 'Khách vãng lai',
      ref_code: '',
      role: 'Khác',
      classification: 'Nhân sự',
      title: 'Thành viên',
      team_name: '',
      referrer_id: '',
      referrer_name: '',
      source: '',
      join_date: '',
      guest_count: 0,
      email: '',
      bank_account: '',
      identity_card: '',
      status: 'Hoạt động',
      notes: '',
      business_unit: 'Khối kinh doanh',
    });
    setFormError('');
    setIsModalOpen(true);
  };

  // Mở modal sửa
  const handleOpenEditModal = (member: Member) => {
    setEditingMember(member);
    let joinDateFormatted = '';
    if (member.join_date) {
      joinDateFormatted = new Date(member.join_date).toISOString().split('T')[0];
    }
    setFormData({
      full_name: member.full_name || '',
      phone: member.phone || '',
      avatar_url: member.avatar_url || '',
      referral_group: member.referral_group || 'Khách vãng lai',
      ref_code: member.ref_code || '',
      role: member.role || 'Khác',
      classification: member.classification || 'Nhân sự',
      title: member.title || 'Thành viên',
      team_name: member.team_name || '',
      referrer_id: member.referrer_id ? String(member.referrer_id) : '',
      referrer_name: member.referrer_name || '',
      source: member.source || '',
      join_date: joinDateFormatted,
      guest_count: member.guest_count ?? 0,
      email: member.email || '',
      bank_account: member.bank_account || '',
      identity_card: member.identity_card || '',
      status: member.status || 'Hoạt động',
      notes: member.notes || '',
      business_unit: member.business_unit || 'Khối kinh doanh',
    });
    setFormError('');
    setIsModalOpen(true);
  };

  // Submit form (Tạo hoặc Cập nhật)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!formData.full_name.trim()) {
      setFormError('Vui lòng nhập họ và tên');
      return;
    }
    if (!formData.phone.trim()) {
      setFormError('Vui lòng nhập số điện thoại');
      return;
    }

    setIsSubmitting(true);
    try {
      const url = editingMember
        ? `/api/admin/members/${editingMember.id}`
        : '/api/admin/members';
      const method = editingMember ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          referrer_id: formData.referrer_id ? parseInt(formData.referrer_id) : null,
          guest_count: Number(formData.guest_count) || 0,
        }),
      });

      const resData = await res.json();
      if (!res.ok) {
        throw new Error(resData.error || 'Có lỗi xảy ra');
      }

      showToast('success', editingMember ? 'Cập nhật thành viên thành công' : 'Thêm mới thành viên thành công');
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

  // Xóa thành viên
  const handleDeleteMember = async () => {
    if (!deleteConfirmMember) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/admin/members/${deleteConfirmMember.id}`, {
        method: 'DELETE',
      });
      const resData = await res.json();
      if (!res.ok) {
        throw new Error(resData.error || 'Không thể xóa thành viên');
      }
      showToast('success', 'Đã xóa thành viên thành công');
      setDeleteConfirmMember(null);
      await refreshData();
    } catch (err: unknown) {
      if (err instanceof Error) {
        showToast('error', err.message);
      } else {
        showToast('error', 'Có lỗi xảy ra khi xóa');
      }
    } finally {
      setIsDeleting(false);
    }
  };

  // Filter members list based on search query
  const filteredMembers = useMemo(() => {
    if (!searchQuery.trim()) return members;
    const q = searchQuery.toLowerCase().trim();
    return members.filter((m) => {
      const nameMatch = m.full_name?.toLowerCase().includes(q);
      const phoneMatch = m.phone?.toLowerCase().includes(q);
      const roleMatch = m.role?.toLowerCase().includes(q);
      const emailMatch = m.email?.toLowerCase().includes(q);
      const classMatch = m.classification?.toLowerCase().includes(q);
      const titleMatch = m.title?.toLowerCase().includes(q);
      const teamMatch = m.team_name?.toLowerCase().includes(q);
      return nameMatch || phoneMatch || roleMatch || emailMatch || classMatch || titleMatch || teamMatch;
    });
  }, [members, searchQuery]);

  const pageCount = Math.max(1, Math.ceil(filteredMembers.length / pageSize));
  const activePage = Math.min(currentPage, pageCount);
  const firstVisibleMember = filteredMembers.length === 0 ? 0 : (activePage - 1) * pageSize + 1;
  const lastVisibleMember = Math.min(activePage * pageSize, filteredMembers.length);
  const paginatedMembers = filteredMembers.slice(firstVisibleMember - 1, lastVisibleMember);

  return (
    <div className="px-[15px] py-4 sm:p-6 lg:p-8 max-w-[1600px] mx-auto min-h-screen">
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

      {/* Header Section (Item 10: Đồng bộ Google Sheet) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 sm:mb-8">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">Thành viên</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 font-normal">
            Database gốc: nhân sự, khách mời, cộng tác viên — gắn người giới thiệu, chức danh, Team Leader
          </p>
        </div>

        <div className="flex items-center gap-2.5 sm:gap-3">
          {/* Nút Đồng bộ Google Sheet (Mục 1 - Đổi tên thành "Đồng bộ" trên mobile <= 991px) */}
          <button
            type="button"
            onClick={handleSyncSheet}
            disabled={isSyncingSheet}
            className="inline-flex items-center justify-center gap-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-semibold shadow-xs transition-all cursor-pointer disabled:opacity-50 active:scale-[0.98]"
            title="Đồng bộ danh sách thành viên sang Google Sheet"
          >
            <span className={`w-2 h-2 rounded-full bg-emerald-500 ${isSyncingSheet ? 'animate-ping' : ''}`} />
            <span className="lg:hidden">Đồng bộ</span>
            <span className="hidden lg:inline">{isSyncingSheet ? 'Đang đồng bộ...' : 'Đồng bộ Google Sheet'}</span>
          </button>

          {/* Nút Thêm mới */}
          <button
            onClick={handleOpenAddModal}
            className="inline-flex items-center justify-center gap-2 bg-[#2563eb] hover:bg-blue-700 text-white px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-semibold shadow-sm transition-all active:scale-[0.98]"
          >
            <Plus className="w-4 h-4" />
            <span>Thêm mới</span>
          </button>
        </div>
      </div>

      {/* 4 Thẻ Thống kê (Stat Cards) - 2 cột x 2 dòng trên mobile <= 991px */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
        {/* Card 1: Tổng số thành viên */}
        <div className="bg-white p-3.5 sm:p-5 rounded-2xl border border-slate-100/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-blue-50 flex items-center justify-center text-[#2563eb] shrink-0">
              <Users className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <span className="text-[11px] sm:text-xs font-medium text-slate-500 leading-tight">Tổng số thành viên</span>
          </div>
          <div className="text-lg sm:text-2xl font-bold text-slate-900 pl-1">{stats.totalMembers}</div>
        </div>

        {/* Card 2: Thành viên hoạt động */}
        <div className="bg-white p-3.5 sm:p-5 rounded-2xl border border-slate-100/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 shrink-0">
              <UserCheck className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <span className="text-[11px] sm:text-xs font-medium text-slate-500 leading-tight">Thành viên hoạt động</span>
          </div>
          <div className="text-lg sm:text-2xl font-bold text-slate-900 pl-1">{stats.activeMembers}</div>
        </div>

        {/* Card 3: Thành viên mới (tháng này) */}
        <div className="bg-white p-3.5 sm:p-5 rounded-2xl border border-slate-100/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600 shrink-0">
              <UserPlus className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <span className="text-[11px] sm:text-xs font-medium text-slate-500 leading-tight">Thành viên mới (tháng này)</span>
          </div>
          <div className="text-lg sm:text-2xl font-bold text-slate-900 pl-1">{stats.newMembers}</div>
        </div>

        {/* Card 4: Thành viên không hoạt động */}
        <div className="bg-white p-3.5 sm:p-5 rounded-2xl border border-slate-100/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600 shrink-0">
              <UserX className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <span className="text-[11px] sm:text-xs font-medium text-slate-500 leading-tight">Thành viên không hoạt động</span>
          </div>
          <div className="text-lg sm:text-2xl font-bold text-slate-900 pl-1">{stats.inactiveMembers}</div>
        </div>
      </div>

      {/* Thanh Tìm kiếm */}
      <div className="mb-6 max-w-md">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="Tìm kiếm..."
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-slate-800 placeholder-slate-400 shadow-xs"
          />
          {searchQuery && (
            <button
              onClick={() => {
                setSearchQuery('');
                setCurrentPage(1);
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Bảng Danh sách Thành viên */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-slate-200 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-slate-600">
            Hiển thị {firstVisibleMember}–{lastVisibleMember} / {filteredMembers.length} thành viên
          </p>
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <label htmlFor="member-page-size" className="text-slate-500">Số dòng:</label>
            <select
              id="member-page-size"
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-slate-700 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
            >
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
            <button
              type="button"
              onClick={() => setCurrentPage(Math.max(1, activePage - 1))}
              disabled={activePage <= 1}
              className="rounded-lg border border-slate-200 px-3 py-1.5 font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Trước
            </button>
            <span className="min-w-[92px] text-center text-slate-600">Trang {activePage} / {pageCount}</span>
            <button
              type="button"
              onClick={() => setCurrentPage(Math.min(pageCount, activePage + 1))}
              disabled={activePage >= pageCount}
              className="rounded-lg border border-slate-200 px-3 py-1.5 font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Tiếp
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600 border-collapse">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/50 text-slate-500 font-medium text-xs">
                <th className="py-4 px-5">Họ và tên</th>
                <th className="py-4 px-5">Người mời</th>
                <th className="py-4 px-5">Năng lực thực hiện</th>
                <th className="py-4 px-5">Chức danh</th>
                <th className="py-4 px-5">Đội nhóm</th>
                <th className="py-4 px-5">Số lần làm khách</th>
                <th className="py-4 px-5">Trạng thái</th>
                <th className="py-4 px-5 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredMembers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400 text-sm">
                    {searchQuery ? 'Không tìm thấy thành viên phù hợp với từ khóa' : 'Chưa có thành viên nào trong danh sách'}
                  </td>
                </tr>
              ) : (
                paginatedMembers.map((member) => (
                  <tr
                    key={member.id}
                    className="hover:bg-slate-50/70 transition-colors group"
                  >
                    {/* Họ và tên (kèm avatar + số điện thoại nhỏ phía dưới) */}
                    <td className="py-4 px-5 font-medium text-slate-800">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full overflow-hidden bg-slate-100 border border-slate-200 shrink-0 flex items-center justify-center">
                          {member.avatar_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={member.avatar_url}
                              alt={member.full_name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <Users className="w-4 h-4 text-slate-400" />
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-medium text-slate-900">{member.full_name}</span>
                            <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                              member.business_unit === 'Ban nguồn vốn'
                                ? 'bg-purple-100 text-purple-700 border border-purple-200'
                                : 'bg-blue-100 text-blue-700 border border-blue-200'
                            }`}>
                              {member.business_unit || 'Khối kinh doanh'}
                            </span>
                          </div>
                          {member.phone && (
                            <div className="text-xs text-slate-400 font-normal mt-0.5">{member.phone}</div>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Người mời (di chuyển sang cạnh Họ và tên theo Hình 5, format theo Hình 5.2 & 5.3) */}
                    <td className="py-4 px-5 text-slate-600">
                      {member.referral_group === 'Chọn người mời trong hệ thống' ? (
                        member.referrer_name ? (
                          <span>
                            {member.referrer_name} {member.referrer_phone ? `(${member.referrer_phone})` : ''}
                          </span>
                        ) : (
                          'Chọn người mời trong hệ thống'
                        )
                      ) : (
                        member.referral_group || '—'
                      )}
                    </td>

                    {/* Năng lực thực hiện (Mục 4) */}
                    <td className="py-4 px-5 text-slate-700">
                      <div className="flex flex-wrap gap-1">
                        {member.role
                          ? member.role.split(',').map((s) => s.trim()).filter(Boolean).map((r, rIdx) => (
                              <span
                                key={rIdx}
                                className="inline-block px-2 py-0.5 rounded-md text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200"
                              >
                                {r}
                              </span>
                            ))
                          : '—'}
                      </div>
                    </td>

                    {/* Chức danh */}
                    <td className="py-4 px-5 text-slate-600">
                      {member.title || '—'}
                    </td>

                    <td className="py-4 px-5 text-slate-600">
                      {member.team_name ? (
                        <div className="flex flex-wrap gap-1">
                          {member.team_name
                            .split(',')
                            .map((s) => s.trim())
                            .filter(Boolean)
                            .map((t, tIdx) => (
                              <span
                                key={tIdx}
                                className="inline-block px-2 py-0.5 rounded-md text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200"
                              >
                                {t}
                              </span>
                            ))}
                        </div>
                      ) : (
                        '—'
                      )}
                    </td>

                    {/* Số lần làm khách */}
                    <td className="py-4 px-5 text-slate-600">
                      {member.guest_count && member.guest_count > 0 ? member.guest_count : '—'}
                    </td>

                    {/* Trạng thái */}
                    <td className="py-4 px-5 text-slate-600">
                      {member.status ? (
                        <span
                          className={`inline-block text-xs font-normal ${
                            member.status === 'Hoạt động' || member.status === 'Đang hoạt động'
                              ? 'text-slate-600'
                              : 'text-slate-400'
                          }`}
                        >
                          {member.status}
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>

                    {/* Thao tác */}
                    <td className="py-4 px-5 text-right">
                      <div className="flex items-center justify-end gap-2.5">
                        <button
                          onClick={() => setViewingMember(member)}
                          className="text-slate-400 hover:text-indigo-600 transition-colors p-1 rounded-md hover:bg-indigo-50"
                          title="Xem dữ liệu liên kết (Đội nhóm, Hợp đồng, Thu chi)"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleOpenEditModal(member)}
                          className="text-slate-400 hover:text-blue-600 transition-colors p-1 rounded-md hover:bg-blue-50"
                          title="Sửa"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDeleteConfirmMember(member)}
                          className="text-rose-400 hover:text-rose-600 transition-colors p-1 rounded-md hover:bg-rose-50"
                          title="Xóa"
                        >
                          <Trash2 className="w-4 h-4" />
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

      {/* ============================================================ */}
      {/* POPUP MODAL: Thêm mới / Sửa thành viên (Item 22: Đã bỏ Phân loại) */}
      {/* ============================================================ */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl w-full md:w-[1014px] md:max-w-[1014px] shadow-2xl border border-slate-100 overflow-hidden max-h-[90vh] flex flex-col">
            {/* Header Modal */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-white">
              {editingMember && <h2 className="text-base font-bold text-slate-900">Sửa thông tin thành viên</h2>}
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Form Content - Scrollable 2 cột trên PC (Mục 7 - Hình 7.1) */}
            <form onSubmit={handleSubmit} className="overflow-y-auto px-6 py-5 flex-1 space-y-4">
              {formError && (
                <div className="bg-rose-50 border border-rose-200 text-rose-600 text-xs px-3.5 py-2.5 rounded-xl flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}
              {editingMember && (
                <div className="bg-gradient-to-r from-blue-50/70 via-indigo-50/60 to-purple-50/70 border border-blue-200/70 rounded-xl p-3.5 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-blue-600" />
                      Dữ liệu liên thông của thành viên:
                    </span>
                    <span className="text-[11px] text-slate-500 font-mono">ID #{editingMember.id}</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
                    {/* 1. TeamLead */}
                    <div className="bg-white/95 border border-blue-100 rounded-lg p-2.5 shadow-2xs">
                      <div className="flex items-center justify-between text-slate-500 mb-1">
                        <span className="font-semibold text-blue-700">Đội nhóm & TeamLead</span>
                        <Link
                          href={`/admin/teamlead`}
                          target="_blank"
                          className="text-blue-600 hover:text-blue-800 transition-colors"
                          title="Mở phân hệ TeamLead"
                        >
                          <ExternalLink className="w-3 h-3" />
                        </Link>
                      </div>
                      <p className="font-medium text-slate-800 truncate" title={editingMember.team_name || 'Chưa gán'}>
                        Đội: <span className="font-semibold text-blue-900">{editingMember.team_name || 'Chưa gán'}</span>
                      </p>
                      <p className="text-[11px] text-slate-600">
                        Chức vụ: <span className="font-medium text-indigo-700">{editingMember.title || 'Thành viên'}</span>
                      </p>
                      <p className="text-[10px] text-slate-500 mt-0.5">
                        {editingMember.is_team_leader_eligible ? '✓ Đủ ĐK nhận quỹ TeamLead' : '○ Chưa kích hoạt TeamLead'}
                      </p>
                    </div>

                    {/* 2. Hợp đồng */}
                    <div className="bg-white/95 border border-emerald-100 rounded-lg p-2.5 shadow-2xs">
                      <div className="flex items-center justify-between text-slate-500 mb-1">
                        <span className="font-semibold text-emerald-700">Hợp đồng cá nhân</span>
                        <Link
                          href={`/admin/nhat-ky-hop-dong?search=${encodeURIComponent(editingMember.full_name || '')}`}
                          target="_blank"
                          className="text-emerald-600 hover:text-emerald-800 transition-colors"
                          title="Xem danh sách hợp đồng đã chốt"
                        >
                          <ExternalLink className="w-3 h-3" />
                        </Link>
                      </div>
                      <p className="font-medium text-slate-800">
                        Đã chốt: <span className="font-bold text-emerald-800">{editingMember.contract_count || 0} HĐ</span>
                      </p>
                      <p className="text-[11px] text-slate-600">
                        Doanh số: <span className="font-semibold text-slate-900">{formatVND(editingMember.total_contract_value)}</span>
                      </p>
                      <p className="text-[10px] text-emerald-700 font-medium mt-0.5">
                        Hoa hồng: {formatVND(editingMember.total_commission)}
                      </p>
                    </div>

                    {/* 3. Thu chi */}
                    <div className="bg-white/95 border border-amber-100 rounded-lg p-2.5 shadow-2xs">
                      <div className="flex items-center justify-between text-slate-500 mb-1">
                        <span className="font-semibold text-amber-700">Thu chi cá nhân</span>
                        <Link
                          href={`/admin/nhat-ky-thu-chi?search=${encodeURIComponent(editingMember.full_name || '')}`}
                          target="_blank"
                          className="text-amber-600 hover:text-amber-800 transition-colors"
                          title="Xem sổ quỹ thu chi"
                        >
                          <ExternalLink className="w-3 h-3" />
                        </Link>
                      </div>
                      <p className="font-medium text-slate-800">
                        Đã chi nhận: <span className="font-bold text-amber-800">{formatVND(editingMember.total_paid_amount)}</span>
                      </p>
                      <p className="text-[11px] text-slate-600">
                        Chờ duyệt: <span className="font-medium text-slate-800">{formatVND(editingMember.total_pending_amount)}</span>
                      </p>
                      <p className="text-[10px] text-slate-500 mt-0.5 truncate" title={editingMember.bank_account || 'Chưa cập nhật'}>
                        Tài khoản: {editingMember.bank_account || 'Chưa cập nhật'}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* 0. Ảnh đại diện Avatar (Mục 3 - Hình 3 & 3.1) */}
                <div className="md:col-span-2 flex flex-col sm:flex-row items-start sm:items-center gap-4 p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
                  <div className="relative w-16 h-16 rounded-full overflow-hidden bg-slate-200 border-2 border-slate-300 flex items-center justify-center shrink-0 shadow-xs">
                    {formData.avatar_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={formData.avatar_url}
                        alt="Avatar"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Users className="w-7 h-7 text-slate-400" />
                    )}
                  </div>

                  <div className="flex-1 space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-800">Ảnh đại diện (Avatar)</span>
                      <span className="text-[11px] text-slate-500 font-normal">Hỗ trợ JPG, PNG, WEBP</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setIsImageLibraryOpen(true)}
                        className="px-3 py-1.5 bg-white hover:bg-slate-100 text-blue-600 border border-slate-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
                      >
                        <LucideImage className="w-3.5 h-3.5" />
                        <span>Lấy ảnh từ thư viện</span>
                      </button>

                      <label className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer">
                        <Upload className="w-3.5 h-3.5" />
                        <span>{isUploadingAvatar ? 'Đang tải lên...' : 'Tải ảnh từ máy tính'}</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          disabled={isUploadingAvatar}
                          onChange={handleAvatarFileUpload}
                        />
                      </label>

                      {formData.avatar_url && (
                        <button
                          type="button"
                          onClick={() => setFormData((prev) => ({ ...prev, avatar_url: '' }))}
                          className="px-2.5 py-1.5 text-xs text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                        >
                          Xóa ảnh
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* 1. Họ và tên * */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Họ và tên <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-slate-900 shadow-2xs"
                    placeholder=""
                    required
                  />
                </div>

              {/* 2. Số điện thoại * */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Số điện thoại <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-slate-900 shadow-2xs"
                  placeholder=""
                  required
                />
              </div>

              {/* 3. Nhóm người mời */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Nhóm người mời
                </label>
                <select
                  value={formData.referral_group}
                  onChange={(e) => setFormData({ ...formData, referral_group: e.target.value })}
                  className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-slate-800 shadow-2xs cursor-pointer"
                >
                  {REFERRAL_GROUP_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>

              {/* 4. Mã mời (Referral Code) */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Mã mời (Referral Code)
                </label>
                <input
                  type="text"
                  value={formData.ref_code}
                  onChange={(e) => setFormData({ ...formData, ref_code: e.target.value })}
                  className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-slate-900 shadow-2xs"
                  placeholder=""
                />
              </div>

              {/* 5. Năng lực thực hiện (Mục 4) */}
              <div className="col-span-1 sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Năng lực thực hiện <span className="text-slate-400 font-normal">(Chọn một hoặc nhiều năng lực / vai trò)</span>
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 bg-slate-50 p-3 rounded-xl border border-slate-200">
                  {COMPETENCY_OPTIONS.map((opt) => {
                    const currentList = formData.role
                      ? formData.role.split(',').map((s) => s.trim()).filter(Boolean)
                      : [];
                    const isChecked = currentList.includes(opt);
                    return (
                      <label
                        key={opt}
                        className="flex items-center gap-2 cursor-pointer select-none text-xs text-slate-700 font-medium hover:text-blue-600"
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {
                            let updatedList = [...currentList];
                            if (isChecked) {
                              updatedList = updatedList.filter((item) => item !== opt);
                            } else {
                              if (opt === 'Khác') {
                                updatedList = ['Khác'];
                              } else {
                                updatedList = updatedList.filter((item) => item !== 'Khác');
                                updatedList.push(opt);
                              }
                            }
                            setFormData({
                              ...formData,
                              role: updatedList.length > 0 ? updatedList.join(', ') : 'Khác',
                            });
                          }}
                          className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer"
                        />
                        <span>{opt}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Khối / Ban */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Khối / Ban
                </label>
                <select
                  value={formData.business_unit}
                  onChange={(e) => setFormData({ ...formData, business_unit: e.target.value })}
                  className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-slate-800 shadow-2xs cursor-pointer"
                >
                  <option value="Khối kinh doanh">Khối kinh doanh</option>
                  <option value="Ban nguồn vốn">Ban nguồn vốn</option>
                </select>
              </div>

              {/* 6. Chức danh */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Chức danh
                </label>
                <select
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-slate-800 shadow-2xs cursor-pointer"
                >
                  {TITLE_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>

              {/* 7. Đội nhóm (TeamLead) - Chọn nhiều checkbox 1 lúc */}
              <div className={editingMember ? 'col-span-1 sm:col-span-2' : 'hidden'}>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Đội nhóm (TeamLead) <span className="text-slate-400 font-normal">(Chọn một hoặc nhiều đội nhóm)</span>
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 bg-slate-50 p-3 rounded-xl border border-slate-200">
                  {availableTeamOptions.map((team) => {
                    const currentTeams = formData.team_name
                      ? formData.team_name.split(',').map((s) => s.trim()).filter(Boolean)
                      : [];
                    const isChecked = currentTeams.includes(team);
                    return (
                      <label
                        key={team}
                        className="flex items-center gap-2 cursor-pointer select-none text-xs text-slate-700 font-medium hover:text-blue-600"
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {
                            let updatedList = [...currentTeams];
                            if (isChecked) {
                              updatedList = updatedList.filter((item) => item !== team);
                            } else {
                              updatedList.push(team);
                            }
                            setFormData({
                              ...formData,
                              team_name: updatedList.join(', '),
                            });
                          }}
                          className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer"
                        />
                        <span>{team}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* 8. Người giới thiệu (ID) */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Người giới thiệu (ID)
                </label>
                <div className="relative">
                  <input
                    type="text"
                    list="referrer-id-datalist"
                    value={formData.referrer_id}
                    onChange={(e) => {
                      const val = e.target.value;
                      const found = referrers.find((r) => String(r.id) === val);
                      setFormData((prev) => ({
                        ...prev,
                        referrer_id: val,
                        referrer_name: found ? found.full_name : prev.referrer_name,
                      }));
                    }}
                    className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-slate-900 shadow-2xs"
                    placeholder=""
                  />
                  <datalist id="referrer-id-datalist">
                    {referrers
                      .filter((r) => !editingMember || r.id !== editingMember.id)
                      .map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.full_name} ({r.phone})
                        </option>
                      ))}
                  </datalist>
                </div>
              </div>

              {/* 9. Họ tên người giới thiệu */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Họ tên người giới thiệu
                </label>
                <input
                  type="text"
                  value={formData.referrer_name}
                  onChange={(e) => setFormData({ ...formData, referrer_name: e.target.value })}
                  className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-slate-900 shadow-2xs"
                  placeholder=""
                />
              </div>

              {/* 10. Nguồn biết đến sự kiện */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Nguồn biết đến sự kiện
                </label>
                <input
                  type="text"
                  value={formData.source}
                  onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                  className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-slate-900 shadow-2xs"
                  placeholder=""
                />
              </div>

              {/* 11. Ngày tham gia */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Ngày tham gia
                </label>
                <input
                  type="date"
                  value={formData.join_date}
                  onChange={(e) => setFormData({ ...formData, join_date: e.target.value })}
                  className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-slate-900 shadow-2xs"
                />
              </div>

              {/* 12. Số lần làm khách */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Số lần làm khách
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.guest_count}
                  onChange={(e) => setFormData({ ...formData, guest_count: parseInt(e.target.value) || 0 })}
                  className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-slate-900 shadow-2xs"
                />
              </div>

              {/* 13, 14, 15: Ẩn khi Thêm mới, chỉ hiển thị khi Sửa (Mục 5 theo Yêu cầu) */}
              {editingMember && (
                <>
                  {/* 13. Email */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Email
                    </label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-slate-900 shadow-2xs"
                      placeholder=""
                    />
                  </div>

                  {/* 14. Số tài khoản */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Số tài khoản
                    </label>
                    <input
                      type="text"
                      value={formData.bank_account}
                      onChange={(e) => setFormData({ ...formData, bank_account: e.target.value })}
                      className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-slate-900 shadow-2xs"
                      placeholder=""
                    />
                  </div>

                  {/* 15. Căn cước công dân */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Căn cước công dân
                    </label>
                    <input
                      type="text"
                      value={formData.identity_card}
                      onChange={(e) => setFormData({ ...formData, identity_card: e.target.value })}
                      className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-slate-900 shadow-2xs"
                      placeholder=""
                    />
                  </div>
                </>
              )}

              {/* 16. Trạng thái */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Trạng thái
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-slate-800 shadow-2xs cursor-pointer"
                >
                  {STATUS_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Nút thao tác dưới Modal */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors border border-slate-200"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 text-sm font-semibold text-white bg-[#2563eb] hover:bg-blue-700 rounded-lg transition-all shadow-xs active:scale-[0.98] disabled:opacity-50"
                >
                  {isSubmitting ? 'Đang lưu...' : 'Lưu'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL: Xem chi tiết & Dữ liệu thông suốt của thành viên       */}
      {/* ============================================================ */}
      {viewingMember && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl w-full max-w-3xl shadow-2xl border border-slate-100 flex flex-col max-h-[90vh] overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-full overflow-hidden bg-slate-200 border-2 border-slate-300 flex items-center justify-center shrink-0">
                  {viewingMember.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={viewingMember.avatar_url}
                      alt={viewingMember.full_name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Users className="w-6 h-6 text-slate-400" />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-bold text-slate-900 leading-tight">
                      {viewingMember.full_name}
                    </h2>
                    <span
                      className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                        viewingMember.status === 'Hoạt động' || viewingMember.status === 'Đang hoạt động'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-slate-100 text-slate-600 border border-slate-200'
                      }`}
                    >
                      {viewingMember.status || 'Hoạt động'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-2">
                    <span>{viewingMember.phone}</span>
                    {viewingMember.email && <span>· {viewingMember.email}</span>}
                    <span>· Phân loại: <b>{viewingMember.classification || 'Nhân sự'}</b></span>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setViewingMember(null)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body - Scrollable */}
            <div className="overflow-y-auto px-6 py-5 flex-1 space-y-4">
              {/* Thẻ 1: Đội nhóm & Chức vụ TeamLead */}
              <div className="bg-gradient-to-br from-blue-50/70 via-indigo-50/50 to-white border border-blue-200/80 rounded-xl p-4 shadow-2xs">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2 text-sm font-bold text-blue-900">
                    <Award className="w-4 h-4 text-blue-600" />
                    <span>Đội nhóm & Chức vụ TeamLead</span>
                  </div>
                  <Link
                    href={`/admin/teamlead`}
                    target="_blank"
                    className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-800 transition-colors bg-white px-2.5 py-1 rounded-lg border border-blue-200 shadow-2xs"
                  >
                    <span>Mở phân hệ TeamLead</span>
                    <ExternalLink className="w-3 h-3" />
                  </Link>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div className="bg-white/80 p-2.5 rounded-lg border border-blue-100">
                    <span className="text-slate-500 block mb-0.5">Đội nhóm hiện tại</span>
                    <span className="font-bold text-blue-950 text-sm">{viewingMember.team_name || 'Chưa phân đội'}</span>
                  </div>
                  <div className="bg-white/80 p-2.5 rounded-lg border border-blue-100">
                    <span className="text-slate-500 block mb-0.5">Chức vụ TeamLead</span>
                    <span className="font-bold text-indigo-900 text-sm">{viewingMember.title || 'Thành viên'}</span>
                  </div>
                  <div className="bg-white/80 p-2.5 rounded-lg border border-blue-100">
                    <span className="text-slate-500 block mb-0.5">Hưởng quỹ TeamLead</span>
                    <span className={`font-semibold text-xs ${viewingMember.is_team_leader_eligible ? 'text-emerald-700' : 'text-slate-500'}`}>
                      {viewingMember.is_team_leader_eligible ? '✓ Đủ điều kiện hưởng quỹ' : '○ Chưa kích hoạt'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Grid 2 cột: Hợp đồng & Thu chi cá nhân */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Thẻ 2: Hợp đồng cá nhân */}
                <div className="bg-gradient-to-br from-emerald-50/70 via-teal-50/50 to-white border border-emerald-200/80 rounded-xl p-4 shadow-2xs flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2 text-sm font-bold text-emerald-900">
                        <FileText className="w-4 h-4 text-emerald-600" />
                        <span>Hợp đồng cá nhân</span>
                      </div>
                      <Link
                        href={`/admin/nhat-ky-hop-dong?search=${encodeURIComponent(viewingMember.full_name)}`}
                        target="_blank"
                        className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 hover:text-emerald-900 transition-colors bg-white px-2 py-0.5 rounded-md border border-emerald-200"
                        title="Xem hợp đồng do thành viên này chốt"
                      >
                        <span>Tra cứu</span>
                        <ExternalLink className="w-3 h-3" />
                      </Link>
                    </div>

                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between py-1 border-b border-emerald-100/80">
                        <span className="text-slate-600">Số HĐ đã chốt:</span>
                        <span className="font-bold text-emerald-900">{viewingMember.contract_count || 0} hợp đồng</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-emerald-100/80">
                        <span className="text-slate-600">Tổng doanh số cá nhân:</span>
                        <span className="font-bold text-slate-900">{formatVND(viewingMember.total_contract_value)}</span>
                      </div>
                      <div className="flex justify-between py-1">
                        <span className="text-slate-600">Tổng hoa hồng:</span>
                        <span className="font-bold text-emerald-700">{formatVND(viewingMember.total_commission)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Thẻ 3: Thu chi cá nhân */}
                <div className="bg-gradient-to-br from-amber-50/70 via-orange-50/50 to-white border border-amber-200/80 rounded-xl p-4 shadow-2xs flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2 text-sm font-bold text-amber-900">
                        <Receipt className="w-4 h-4 text-amber-600" />
                        <span>Nhật ký thu chi cá nhân</span>
                      </div>
                      <Link
                        href={`/admin/nhat-ky-thu-chi?search=${encodeURIComponent(viewingMember.full_name)}`}
                        target="_blank"
                        className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700 hover:text-amber-900 transition-colors bg-white px-2 py-0.5 rounded-md border border-amber-200"
                        title="Xem phiếu chi hoa hồng cá nhân"
                      >
                        <span>Sổ quỹ</span>
                        <ExternalLink className="w-3 h-3" />
                      </Link>
                    </div>

                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between py-1 border-b border-amber-100/80">
                        <span className="text-slate-600">Đã chi trả thực tế:</span>
                        <span className="font-bold text-emerald-700">{formatVND(viewingMember.total_paid_amount)}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-amber-100/80">
                        <span className="text-slate-600">Đang chờ duyệt chi:</span>
                        <span className="font-bold text-amber-700">{formatVND(viewingMember.total_pending_amount)}</span>
                      </div>
                      <div className="flex justify-between py-1">
                        <span className="text-slate-600">Tài khoản nhận:</span>
                        <span className="font-medium text-slate-800 truncate max-w-[160px]" title={viewingMember.bank_account || 'Chưa cập nhật'}>
                          {viewingMember.bank_account || 'Chưa cập nhật'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Thẻ 4: Thông tin cá nhân & Hồ sơ chi tiết */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs">
                <div className="flex items-center gap-2 text-sm font-bold text-slate-800 mb-3">
                  <CreditCard className="w-4 h-4 text-slate-600" />
                  <span>Hồ sơ & Tài khoản</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  <div>
                    <span className="text-slate-500 block">Số điện thoại:</span>
                    <span className="font-medium text-slate-800">{viewingMember.phone || '—'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Email:</span>
                    <span className="font-medium text-slate-800">{viewingMember.email || '—'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Căn cước công dân (CCCD):</span>
                    <span className="font-medium text-slate-800">{viewingMember.identity_card || '—'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Số tài khoản ngân hàng:</span>
                    <span className="font-medium text-slate-800">{viewingMember.bank_account || '—'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Nhóm người mời:</span>
                    <span className="font-medium text-slate-800">{viewingMember.referral_group || '—'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Người giới thiệu:</span>
                    <span className="font-medium text-slate-800">{viewingMember.referrer_name || '—'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Nguồn biết:</span>
                    <span className="font-medium text-slate-800">{viewingMember.source || '—'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Ngày tham gia:</span>
                    <span className="font-medium text-slate-800">{viewingMember.join_date ? new Date(viewingMember.join_date).toLocaleDateString('vi-VN') : '—'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Số lần làm khách:</span>
                    <span className="font-medium text-slate-800">{viewingMember.guest_count ?? 0}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between px-6 py-3.5 border-t border-slate-100 bg-slate-50/50">
              <button
                type="button"
                onClick={() => {
                  const m = viewingMember;
                  setViewingMember(null);
                  handleOpenEditModal(m);
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors cursor-pointer"
              >
                <Pencil className="w-3.5 h-3.5" />
                <span>Chỉnh sửa thông tin thành viên</span>
              </button>

              <button
                type="button"
                onClick={() => setViewingMember(null)}
                className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-200 rounded-lg transition-colors border border-slate-200 cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* POPUP CONFIRM: Xóa thành viên                                */}
      {/* ============================================================ */}
      {deleteConfirmMember && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl border border-slate-100 p-6 space-y-4">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div className="text-center">
              <h3 className="text-lg font-bold text-slate-900">Xóa thành viên</h3>
              <p className="text-sm text-slate-500 mt-2">
                Bạn có chắc chắn muốn xóa thành viên{' '}
                <span className="font-semibold text-slate-800">
                  {deleteConfirmMember.full_name}
                </span>{' '}
                (SĐT: {deleteConfirmMember.phone})? Hành động này không thể hoàn tác.
              </p>
            </div>

            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmMember(null)}
                disabled={isDeleting}
                className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors border border-slate-200"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleDeleteMember}
                disabled={isDeleting}
                className="px-5 py-2 text-sm font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition-all shadow-xs disabled:opacity-50"
              >
                {isDeleting ? 'Đang xóa...' : 'Xóa thành viên'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Thư viện ảnh chọn Avatar */}
      <ImageLibraryModal
        isOpen={isImageLibraryOpen}
        onClose={() => setIsImageLibraryOpen(false)}
        onSelectImage={(url) => setFormData((prev) => ({ ...prev, avatar_url: url }))}
      />
    </div>
  );
}
