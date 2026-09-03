'use client';

import React, { useState, useMemo } from 'react';
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
} from 'lucide-react';

export interface Member {
  id: number;
  full_name: string;
  phone: string;
  email?: string | null;
  identity_card?: string | null;
  bank_account?: string | null;
  role?: string | null;
  classification?: string | null;
  title?: string | null;
  team_id?: number | null;
  ref_code?: string | null;
  referrer_id?: number | null;
  referrer_name?: string | null;
  referral_group?: string | null;
  source?: string | null;
  join_date?: string | null;
  status?: string | null;
  is_team_leader_eligible?: boolean | null;
  invite_count?: number | null;
  guest_count?: number | null;
  notes?: string | null;
  created_at?: string;
  updated_at?: string;
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
}

const ROLE_OPTIONS = [
  'Khác',
  'MC',
  'Thuyết trình',
  'Chốt sự kiện',
  'Phụng sự',
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
}: MemberManagementProps) {
  const [members, setMembers] = useState<Member[]>(initialMembers);
  const [stats, setStats] = useState<Stats>(initialStats);
  const [referrers, setReferrers] = useState<ReferrerOption[]>(initialReferrers);
  const [searchQuery, setSearchQuery] = useState('');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<Member | null>(null);

  // Delete Confirmation Modal
  const [deleteConfirmMember, setDeleteConfirmMember] = useState<Member | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Form State - Đầy đủ 16 trường theo đúng giao diện Base44
  const [formData, setFormData] = useState({
    full_name: '',
    phone: '',
    referral_group: 'Khách vãng lai',
    ref_code: '',
    role: 'Khác',
    classification: 'Nhân sự',
    title: 'Thành viên',
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
  });

  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Hiển thị Toast
  const showToast = (type: 'success' | 'error', text: string) => {
    setToastMessage({ type, text });
    setTimeout(() => setToastMessage(null), 4000);
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
      referral_group: 'Khách vãng lai',
      ref_code: '',
      role: 'Khác',
      classification: 'Nhân sự',
      title: 'Thành viên',
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
      referral_group: member.referral_group || 'Khách vãng lai',
      ref_code: member.ref_code || '',
      role: member.role || 'Khác',
      classification: member.classification || 'Nhân sự',
      title: member.title || 'Thành viên',
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
      return nameMatch || phoneMatch || roleMatch || emailMatch || classMatch || titleMatch;
    });
  }, [members, searchQuery]);

  return (
    <div className="p-8 max-w-[1600px] mx-auto min-h-screen">
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

      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Thành viên</h1>
          <p className="text-sm text-slate-500 mt-1 font-normal">
            Database gốc: nhân sự, khách mời, cộng tác viên — gắn người giới thiệu, chức danh, Team Leader
          </p>
        </div>

        {/* Nút Thêm mới */}
        <button
          onClick={handleOpenAddModal}
          className="inline-flex items-center justify-center gap-2 bg-[#2563eb] hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl text-sm font-semibold shadow-sm transition-all active:scale-[0.98]"
        >
          <Plus className="w-4 h-4" />
          <span>Thêm mới</span>
        </button>
      </div>

      {/* 4 Thẻ Thống kê (Stat Cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        {/* Card 1: Tổng số thành viên */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100/80 shadow-[0_1px_3px_rgba(0,0,0,0.03)] flex flex-col justify-between">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-[#2563eb]">
              <Users className="w-5 h-5" />
            </div>
            <span className="text-xs font-medium text-slate-500">Tổng số thành viên</span>
          </div>
          <div className="text-2xl font-bold text-slate-900 pl-1">{stats.totalMembers}</div>
        </div>

        {/* Card 2: Thành viên hoạt động */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100/80 shadow-[0_1px_3px_rgba(0,0,0,0.03)] flex flex-col justify-between">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
              <UserCheck className="w-5 h-5" />
            </div>
            <span className="text-xs font-medium text-slate-500">Thành viên hoạt động</span>
          </div>
          <div className="text-2xl font-bold text-slate-900 pl-1">{stats.activeMembers}</div>
        </div>

        {/* Card 3: Thành viên mới (tháng này) */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100/80 shadow-[0_1px_3px_rgba(0,0,0,0.03)] flex flex-col justify-between">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600">
              <UserPlus className="w-5 h-5" />
            </div>
            <span className="text-xs font-medium text-slate-500">Thành viên mới (tháng này)</span>
          </div>
          <div className="text-2xl font-bold text-slate-900 pl-1">{stats.newMembers}</div>
        </div>

        {/* Card 4: Thành viên không hoạt động */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100/80 shadow-[0_1px_3px_rgba(0,0,0,0.03)] flex flex-col justify-between">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600">
              <UserX className="w-5 h-5" />
            </div>
            <span className="text-xs font-medium text-slate-500">Thành viên không hoạt động</span>
          </div>
          <div className="text-2xl font-bold text-slate-900 pl-1">{stats.inactiveMembers}</div>
        </div>
      </div>

      {/* Thanh Tìm kiếm */}
      <div className="mb-6 max-w-md">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm kiếm..."
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-slate-800 placeholder-slate-400 shadow-xs"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Bảng Danh sách Thành viên */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600 border-collapse">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/50 text-slate-500 font-medium text-xs">
                <th className="py-4 px-5">Họ và tên</th>
                <th className="py-4 px-5">SĐT</th>
                <th className="py-4 px-5">Vai trò</th>
                <th className="py-4 px-5">Phân loại</th>
                <th className="py-4 px-5">Chức danh</th>
                <th className="py-4 px-5">Số lần làm khách</th>
                <th className="py-4 px-5">Nhóm người mới</th>
                <th className="py-4 px-5">Trạng thái</th>
                <th className="py-4 px-5 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredMembers.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400 text-sm">
                    {searchQuery ? 'Không tìm thấy thành viên phù hợp với từ khóa' : 'Chưa có thành viên nào trong danh sách'}
                  </td>
                </tr>
              ) : (
                filteredMembers.map((member) => (
                  <tr
                    key={member.id}
                    className="hover:bg-slate-50/70 transition-colors group"
                  >
                    {/* Họ và tên */}
                    <td className="py-4 px-5 font-medium text-slate-800">
                      {member.full_name}
                    </td>

                    {/* SĐT */}
                    <td className="py-4 px-5 text-slate-600 font-normal">
                      {member.phone || '—'}
                    </td>

                    {/* Vai trò */}
                    <td className="py-4 px-5 text-slate-700">
                      {member.role || '—'}
                    </td>

                    {/* Phân loại */}
                    <td className="py-4 px-5 text-slate-600">
                      {member.classification || '—'}
                    </td>

                    {/* Chức danh */}
                    <td className="py-4 px-5 text-slate-600">
                      {member.title || '—'}
                    </td>

                    {/* Số lần làm khách */}
                    <td className="py-4 px-5 text-slate-600">
                      {member.guest_count && member.guest_count > 0 ? member.guest_count : '—'}
                    </td>

                    {/* Nhóm người mới */}
                    <td className="py-4 px-5 text-slate-600">
                      {member.referral_group || '—'}
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
      {/* POPUP MODAL: Thêm mới / Sửa thành viên (16 trường Base44)     */}
      {/* ============================================================ */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl border border-slate-100 overflow-hidden max-h-[90vh] flex flex-col">
            {/* Header Modal */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-white">
              <h2 className="text-base font-bold text-slate-900">
                {editingMember ? 'Sửa thông tin thành viên' : 'Thêm mới – Thành viên'}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Form Content - Scrollable */}
            <form onSubmit={handleSubmit} className="overflow-y-auto px-6 py-5 space-y-4 flex-1">
              {formError && (
                <div className="bg-rose-50 border border-rose-200 text-rose-600 text-xs px-3.5 py-2.5 rounded-xl flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

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

              {/* 5. Vai trò */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Vai trò
                </label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-slate-800 shadow-2xs cursor-pointer"
                >
                  {ROLE_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>

              {/* 6. Phân loại */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Phân loại
                </label>
                <select
                  value={formData.classification}
                  onChange={(e) => setFormData({ ...formData, classification: e.target.value })}
                  className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-slate-800 shadow-2xs cursor-pointer"
                >
                  {CLASSIFICATION_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>

              {/* 7. Chức danh */}
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
    </div>
  );
}
