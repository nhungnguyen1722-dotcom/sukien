'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  GraduationCap,
  BookOpen,
  Users,
  Coins,
  Wallet,
  Search,
  Filter,
  Download,
  Plus,
  Eye,
  Edit2,
  Trash2,
  CheckCircle2,
  Clock,
  ChevronLeft,
  ChevronRight,
  X,
  Calendar,
  AlertCircle,
  TrendingUp,
} from 'lucide-react';

export interface TrainingLog {
  id: number;
  session_code: string;
  session_name?: string;
  member_phone?: string;
  member_name: string;
  role: string;
  token_tier: string;
  token_count: number;
  session_budget: number;
  total_tokens: number;
  reward_amount: number;
  approver?: string;
  status: string;
  training_date?: string;
}

interface TrainingManagementProps {
  initialLogs: TrainingLog[];
  initialStats: {
    totalSessions: number;
    totalMembers: number;
    totalTokens: number;
    totalRewards: number;
    roleStats: Record<string, number>;
  };
}

export default function TrainingManagement({ initialLogs, initialStats }: TrainingManagementProps) {
  const [logs, setLogs] = useState<TrainingLog[]>(initialLogs);
  const [stats, setStats] = useState(initialStats);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRole, setSelectedRole] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedDate, setSelectedDate] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const showToast = (type: 'success' | 'error', text: string) => {
    setToastMessage({ type, text });
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Form State
  const [formData, setFormData] = useState({
    session_code: 'TR001',
    session_name: 'Kỹ năng tư vấn tài chính',
    training_date: new Date().toISOString().split('T')[0],
    session_budget: 3500000,
    member_name: '',
    member_phone: '',
    role: 'Giảng viên',
    token_tier: 'Hạng A',
    token_count: 10,
    approver: 'Chị Cúc',
    status: 'Đã duyệt',
  });

  const handleRoleChange = (role: string) => {
    let tier = 'Hạng A';
    let count = 10;
    if (role === 'Trợ giảng') {
      tier = 'Hạng B';
      count = 5;
    } else if (role === 'Học viên xuất sắc') {
      tier = 'Hạng C';
      count = 3;
    } else if (role === 'Học viên') {
      tier = 'Hạng D';
      count = 1;
    }
    setFormData((prev) => ({
      ...prev,
      role,
      token_tier: tier,
      token_count: count,
    }));
  };

  const handleTierChange = (tier: string) => {
    let count = 10;
    if (tier === 'Hạng B') count = 5;
    if (tier === 'Hạng C') count = 3;
    if (tier === 'Hạng D') count = 1;
    setFormData((prev) => ({
      ...prev,
      token_tier: tier,
      token_count: count,
    }));
  };

  const handleCreateLog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.member_name.trim()) {
      showToast('error', 'Vui lòng nhập họ tên nhân sự');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/admin/training-logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (data.success) {
        showToast('success', 'Đã thêm buổi học và cập nhật Bể Token thành công!');
        setIsAddModalOpen(false);
        // Refresh logs
        const refRes = await fetch('/api/admin/training-logs');
        const refData = await refRes.json();
        if (refData.success) {
          setLogs(refData.logs);
          setStats(refData.stats);
        }
      } else {
        showToast('error', data.message || 'Lỗi khi thêm buổi học');
      }
    } catch {
      showToast('error', 'Lỗi kết nối máy chủ');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteLog = async (id: number) => {
    if (!confirm('Bạn có chắc chắn muốn xóa bản ghi đào tạo này?')) return;
    try {
      const res = await fetch(`/api/admin/training-logs?id=${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        showToast('success', 'Đã xóa bản ghi đào tạo');
        setLogs((prev) => prev.filter((l) => l.id !== id));
      } else {
        showToast('error', data.message || 'Lỗi khi xóa');
      }
    } catch {
      showToast('error', 'Lỗi kết nối');
    }
  };

  // Export to CSV
  const handleExportExcel = () => {
    const headers = [
      'STT',
      'Mã buổi học',
      'Ngày đào tạo',
      'Họ tên',
      'SĐT',
      'Vai trò',
      'Hạng Token',
      'Số Token',
      'Ngân sách buổi học (VNĐ)',
      'Thù lao thực nhận (VNĐ)',
      'Người duyệt',
      'Trạng thái',
    ];
    const rows = filteredLogs.map((l, idx) => [
      idx + 1,
      l.session_code,
      l.training_date || '',
      `"${l.member_name}"`,
      l.member_phone || '',
      l.role,
      l.token_tier,
      l.token_count,
      l.session_budget,
      Math.round(l.reward_amount),
      l.approver || 'Chị Cúc',
      l.status,
    ]);

    const csvContent =
      '\uFEFF' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Nhat_ky_dao_tao_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  // Filtered List
  const filteredLogs = useMemo(() => {
    return logs.filter((l) => {
      const matchSearch =
        searchQuery.trim() === '' ||
        l.session_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        l.member_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (l.member_phone && l.member_phone.includes(searchQuery)) ||
        (l.session_name && l.session_name.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchRole = selectedRole === 'all' || l.role === selectedRole;
      const matchStatus = selectedStatus === 'all' || l.status === selectedStatus;
      const matchDate = !selectedDate || l.training_date === selectedDate;

      return matchSearch && matchRole && matchStatus && matchDate;
    });
  }, [logs, searchQuery, selectedRole, selectedStatus, selectedDate]);

  // Paginated List
  const totalPages = Math.max(1, Math.ceil(filteredLogs.length / itemsPerPage));
  const paginatedLogs = filteredLogs.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('vi-VN').format(Math.round(val || 0)) + ' đ';
  };

  // Donut chart calculations
  const totalRewardSum =
    (stats.roleStats['Giảng viên'] || 0) +
    (stats.roleStats['Trợ giảng'] || 0) +
    (stats.roleStats['Học viên xuất sắc'] || 0) +
    (stats.roleStats['Học viên'] || 0) || 1;

  const rolesBreakdown = [
    {
      name: 'Giảng viên',
      amount: stats.roleStats['Giảng viên'] || 22176000,
      color: '#2563eb',
      pct: Math.round(((stats.roleStats['Giảng viên'] || 22176000) / totalRewardSum) * 100) || 52,
    },
    {
      name: 'Trợ giảng',
      amount: stats.roleStats['Trợ giảng'] || 10272000,
      color: '#9333ea',
      pct: Math.round(((stats.roleStats['Trợ giảng'] || 10272000) / totalRewardSum) * 100) || 24,
    },
    {
      name: 'Học viên xuất sắc',
      amount: stats.roleStats['Học viên xuất sắc'] || 5992000,
      color: '#f59e0b',
      pct: Math.round(((stats.roleStats['Học viên xuất sắc'] || 5992000) / totalRewardSum) * 100) || 14,
    },
    {
      name: 'Học viên',
      amount: stats.roleStats['Học viên'] || 4360000,
      color: '#10b981',
      pct: Math.round(((stats.roleStats['Học viên'] || 4360000) / totalRewardSum) * 100) || 10,
    },
  ];

  return (
    <div className="p-[15px] sm:p-6 lg:p-8 max-w-[1600px] mx-auto min-h-screen bg-slate-50 text-slate-900 space-y-6">
      {/* Toast */}
      {toastMessage && (
        <div className="fixed top-6 right-6 z-[9999] animate-in fade-in slide-in-from-top-4 duration-200">
          <div
            className={`flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg border text-sm font-medium ${
              toastMessage.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : 'bg-rose-50 text-rose-800 border-rose-200'
            }`}
          >
            {toastMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600" />
            )}
            <span>{toastMessage.text}</span>
          </div>
        </div>
      )}

      {/* Header & Breadcrumb (Hình 15) */}
      <div>
        <div className="flex items-center gap-2 text-xs font-medium text-slate-500 mb-2">
          <Link href="/admin" className="hover:text-blue-600">
            Trang chủ
          </Link>
          <span>&gt;</span>
          <span className="text-slate-800 font-semibold">Nhật ký đào tạo</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20">
            <GraduationCap className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Nhật ký đào tạo
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              Quản lý buổi học, chấm công Token và phân bổ thù lao theo cơ chế Dynamic Pool Sharing
            </p>
          </div>
        </div>
      </div>

      {/* Top 4 Stat Cards & Donut Chart (Hình 15) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* 4 Stat Cards (8 Cols on Desktop) */}
        <div className="lg:col-span-8 grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          {/* Card 1: Tổng số buổi học */}
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-3">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs font-medium text-slate-500 block">Tổng số buổi học</span>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-xl sm:text-2xl font-extrabold text-slate-900">
                  {stats.totalSessions || 12}
                </span>
                <span className="text-xs text-slate-400">buổi</span>
              </div>
            </div>
          </div>

          {/* Card 2: Tổng số thành viên */}
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs font-medium text-slate-500 block">Tổng số thành viên</span>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-xl sm:text-2xl font-extrabold text-slate-900">
                  {stats.totalMembers || 268}
                </span>
                <span className="text-xs text-slate-400">người</span>
              </div>
            </div>
          </div>

          {/* Card 3: Tổng Token phát sinh */}
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center mb-3">
              <Coins className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs font-medium text-slate-500 block">Tổng Token phát sinh</span>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-xl sm:text-2xl font-extrabold text-slate-900">
                  {stats.totalTokens.toLocaleString('vi-VN') || '2.540'}
                </span>
                <span className="text-xs text-slate-400">Token</span>
              </div>
            </div>
          </div>

          {/* Card 4: Tổng thù lao đã chi */}
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center mb-3">
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs font-medium text-slate-500 block">Tổng thù lao đã chi</span>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-lg sm:text-xl font-extrabold text-slate-900 truncate">
                  {formatCurrency(stats.totalRewards || 42800000)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Donut Chart Card (4 Cols on Desktop) */}
        <div className="lg:col-span-4 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
          {/* Circular Donut Graphic */}
          <div className="relative w-28 h-28 flex items-center justify-center flex-shrink-0">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
              {/* Slices */}
              <circle
                cx="18"
                cy="18"
                r="14"
                fill="none"
                stroke="#2563eb"
                strokeWidth="5"
                strokeDasharray="52 48"
                strokeDashoffset="0"
              />
              <circle
                cx="18"
                cy="18"
                r="14"
                fill="none"
                stroke="#9333ea"
                strokeWidth="5"
                strokeDasharray="24 76"
                strokeDashoffset="-52"
              />
              <circle
                cx="18"
                cy="18"
                r="14"
                fill="none"
                stroke="#f59e0b"
                strokeWidth="5"
                strokeDasharray="14 86"
                strokeDashoffset="-76"
              />
              <circle
                cx="18"
                cy="18"
                r="14"
                fill="none"
                stroke="#10b981"
                strokeWidth="5"
                strokeDasharray="10 90"
                strokeDashoffset="-90"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
              <span className="text-[10px] font-black text-slate-800 leading-tight">
                {formatCurrency(stats.totalRewards || 42800000).replace(' đ', '')}
              </span>
              <span className="text-[8px] text-slate-400 font-medium">Tổng thù lao</span>
            </div>
          </div>

          {/* Legend */}
          <div className="flex-1 w-full space-y-1.5 text-xs">
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold text-slate-800 text-[11px] uppercase tracking-wider">
                Phân bổ theo vai trò
              </span>
              <span className="text-[10px] text-blue-600 font-medium cursor-pointer">Xem tất cả</span>
            </div>
            {rolesBreakdown.map((r) => (
              <div key={r.name} className="flex items-center justify-between gap-2 text-[11px]">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ backgroundColor: r.color }}
                  />
                  <span className="text-slate-600 truncate">{r.name}</span>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0 font-medium">
                  <span className="text-slate-400 text-[10px]">{r.pct}%</span>
                  <span className="text-slate-800 font-bold">{formatCurrency(r.amount)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content Area: Table (Left 9 cols) + Right Sidebar (Right 3 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left 9 Cols: Filters + Table */}
        <div className="lg:col-span-9 space-y-4">
          {/* Filter Bar (Hình 15) */}
          <div className="bg-white p-3 sm:p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            {/* Search */}
            <div className="relative flex-1 min-w-[200px]">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="Tìm mã buổi học, tên nhân sự, SĐT..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 outline-none focus:border-blue-500 transition"
              />
            </div>

            {/* Dropdowns */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Vai trò */}
              <select
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value)}
                className="bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl text-xs font-medium text-slate-700 outline-none cursor-pointer"
              >
                <option value="all">Vai trò: Tất cả</option>
                <option value="Giảng viên">Giảng viên</option>
                <option value="Trợ giảng">Trợ giảng</option>
                <option value="Học viên xuất sắc">Học viên xuất sắc</option>
                <option value="Học viên">Học viên</option>
              </select>

              {/* Trạng thái */}
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl text-xs font-medium text-slate-700 outline-none cursor-pointer"
              >
                <option value="all">Trạng thái: Tất cả</option>
                <option value="Đã duyệt">Đã duyệt</option>
                <option value="Chờ duyệt">Chờ duyệt</option>
              </select>

              {/* Nút Xuất Excel */}
              <button
                type="button"
                onClick={handleExportExcel}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold transition shadow-2xs cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-slate-500" />
                <span>Xuất Excel</span>
              </button>

              {/* Nút Thêm buổi học */}
              <button
                type="button"
                onClick={() => setIsAddModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition shadow-sm cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Thêm buổi học</span>
              </button>
            </div>
          </div>

          {/* Table (Hình 15) */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/80 text-slate-500 font-semibold uppercase text-[10px] tracking-wider border-b border-slate-200/80">
                  <tr>
                    <th className="py-3.5 px-3 text-center w-8">
                      <input type="checkbox" className="rounded text-blue-600 cursor-pointer" />
                    </th>
                    <th className="py-3.5 px-2 text-center w-10">STT</th>
                    <th className="py-3.5 px-3">Mã buổi học</th>
                    <th className="py-3.5 px-3">Ngày đào tạo</th>
                    <th className="py-3.5 px-3">Họ tên</th>
                    <th className="py-3.5 px-3">SĐT</th>
                    <th className="py-3.5 px-3">Vai trò</th>
                    <th className="py-3.5 px-2 text-center">Hạng Token</th>
                    <th className="py-3.5 px-2 text-center">Số Token</th>
                    <th className="py-3.5 px-3 text-right">Ngân sách (VNĐ)</th>
                    <th className="py-3.5 px-3 text-right font-bold text-slate-900">Thù lao thực nhận</th>
                    <th className="py-3.5 px-3 text-center">Người duyệt</th>
                    <th className="py-3.5 px-3 text-center">Trạng thái</th>
                    <th className="py-3.5 px-3 text-center">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paginatedLogs.map((log, idx) => (
                    <tr key={log.id} className="hover:bg-slate-50/60 transition">
                      <td className="py-3 px-3 text-center">
                        <input type="checkbox" className="rounded text-blue-600 cursor-pointer" />
                      </td>
                      <td className="py-3 px-2 text-center text-slate-400 font-medium">
                        {(currentPage - 1) * itemsPerPage + idx + 1}
                      </td>
                      <td className="py-3 px-3">
                        <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 font-bold border border-blue-200">
                          {log.session_code}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-slate-500 font-mono">
                        {log.training_date ? log.training_date.split('-').reverse().join('/') : '—'}
                      </td>
                      <td className="py-3 px-3 font-bold text-slate-900">{log.member_name}</td>
                      <td className="py-3 px-3 text-slate-500 font-mono">{log.member_phone || '—'}</td>
                      <td className="py-3 px-3">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            log.role === 'Giảng viên'
                              ? 'bg-blue-50 text-blue-700 border border-blue-200'
                              : log.role === 'Trợ giảng'
                              ? 'bg-purple-50 text-purple-700 border border-purple-200'
                              : log.role === 'Học viên xuất sắc'
                              ? 'bg-amber-50 text-amber-700 border border-amber-200'
                              : 'bg-slate-100 text-slate-700 border border-slate-200'
                          }`}
                        >
                          {log.role}
                        </span>
                      </td>
                      <td className="py-3 px-2 text-center text-slate-600 font-medium">
                        {log.token_tier}
                      </td>
                      <td className="py-3 px-2 text-center font-bold text-slate-800">
                        {log.token_count}
                      </td>
                      <td className="py-3 px-3 text-right text-slate-600 font-mono">
                        {formatCurrency(log.session_budget).replace(' đ', '')}
                      </td>
                      <td className="py-3 px-3 text-right font-bold text-emerald-600 font-mono">
                        {formatCurrency(log.reward_amount)}
                      </td>
                      <td className="py-3 px-3 text-center text-slate-600">{log.approver || 'Chị Cúc'}</td>
                      <td className="py-3 px-3 text-center">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            log.status === 'Đã duyệt'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}
                        >
                          {log.status}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() =>
                              alert(
                                `Chi tiết buổi học ${log.session_code}: ${log.session_name || ''}\nThù lao cá nhân = (${log.token_count} / ${log.total_tokens}) * ${formatCurrency(log.session_budget)} = ${formatCurrency(log.reward_amount)}`
                              )
                            }
                            className="p-1 hover:bg-slate-100 text-slate-400 hover:text-blue-600 rounded transition cursor-pointer"
                            title="Xem chi tiết"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteLog(log.id)}
                            className="p-1 hover:bg-slate-100 text-slate-400 hover:text-rose-600 rounded transition cursor-pointer"
                            title="Xóa bản ghi"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {filteredLogs.length === 0 && (
                <div className="p-12 text-center text-slate-400">
                  Không tìm thấy buổi học đào tạo nào phù hợp.
                </div>
              )}
            </div>

            {/* Pagination footer */}
            <div className="p-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <div>
                Hiển thị {(currentPage - 1) * itemsPerPage + 1} –{' '}
                {Math.min(currentPage * itemsPerPage, filteredLogs.length)} trong tổng số{' '}
                {filteredLogs.length} bản ghi
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className="p-1.5 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setCurrentPage(p)}
                    className={`w-7 h-7 rounded-lg font-bold transition cursor-pointer ${
                      currentPage === p
                        ? 'bg-blue-600 text-white'
                        : 'border border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    {p}
                  </button>
                ))}
                <button
                  type="button"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  className="p-1.5 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 cursor-pointer"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right 3 Cols: Sidebars & Widgets (Hình 15) */}
        <div className="lg:col-span-3 space-y-5">
          {/* Widget 1: Tổng quan quỹ đào tạo (15%) */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-blue-600" />
                <span>Tổng quan quỹ đào tạo</span>
              </span>
              <span className="text-[10px] text-blue-600 font-medium cursor-pointer">Xem chi tiết</span>
            </div>
            <div>
              <div className="flex items-baseline justify-between text-xs text-slate-500 mb-1">
                <span>Ngân sách quỹ (15%):</span>
                <span className="font-extrabold text-slate-900">120.000.000 đ</span>
              </div>
              {/* Progress Bar */}
              <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden flex">
                <div className="bg-emerald-500 h-full rounded-full" style={{ width: '36%' }} />
              </div>
              <div className="flex items-center justify-between text-[11px] mt-2">
                <span className="text-slate-600">Đã sử dụng: 42.800.000 đ (36%)</span>
                <span className="text-emerald-600 font-bold">Còn 77.200.000 đ (64%)</span>
              </div>
            </div>
          </div>

          {/* Widget 2: Các buổi học sắp tới */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5 text-blue-600" />
                <span>Các buổi học sắp tới</span>
              </span>
              <span className="text-[10px] text-blue-600 font-medium cursor-pointer">Xem tất cả</span>
            </div>

            <div className="space-y-3">
              {/* Session 1 */}
              <div className="flex gap-3 items-start">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 flex flex-col items-center justify-center flex-shrink-0">
                  <span className="text-xs font-black">25</span>
                  <span className="text-[9px] font-bold uppercase">Th09</span>
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="font-bold text-xs text-slate-900 leading-tight">
                    Kỹ năng giao tiếp và thuyết trình
                  </h4>
                  <p className="text-[10px] text-slate-400 mt-0.5">08:30 - 11:30 • Hà Nội</p>
                  <span className="inline-block mt-1 px-2 py-0.5 rounded text-[9px] font-bold bg-blue-50 text-blue-600">
                    Đã lên kế hoạch
                  </span>
                </div>
              </div>

              {/* Session 2 */}
              <div className="flex gap-3 items-start">
                <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-700 flex flex-col items-center justify-center flex-shrink-0">
                  <span className="text-xs font-black">02</span>
                  <span className="text-[9px] font-bold uppercase">Th10</span>
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="font-bold text-xs text-slate-900 leading-tight">Marketing Ứng dụng</h4>
                  <p className="text-[10px] text-slate-400 mt-0.5">13:30 - 16:30 • Online</p>
                  <span className="inline-block mt-1 px-2 py-0.5 rounded text-[9px] font-bold bg-blue-50 text-blue-600">
                    Đã lên kế hoạch
                  </span>
                </div>
              </div>

              {/* Session 3 */}
              <div className="flex gap-3 items-start">
                <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex flex-col items-center justify-center flex-shrink-0">
                  <span className="text-xs font-black">09</span>
                  <span className="text-[9px] font-bold uppercase">Th10</span>
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="font-bold text-xs text-slate-900 leading-tight">
                    Quản lý tài chính cá nhân
                  </h4>
                  <p className="text-[10px] text-slate-400 mt-0.5">08:30 - 11:30 • Nghiêng Complex</p>
                  <span className="inline-block mt-1 px-2 py-0.5 rounded text-[9px] font-bold bg-blue-50 text-blue-600">
                    Đã lên kế hoạch
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Widget 3: Quote Card */}
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50/80 p-5 rounded-2xl border border-blue-100 shadow-2xs">
            <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center mb-2.5">
              <GraduationCap className="w-4 h-4" />
            </div>
            <p className="text-xs font-medium text-slate-700 italic leading-relaxed">
              &quot;Đào tạo là đầu tư cho con người, và con người là tài sản quý giá nhất của Nghiêng
              Complex.&quot;
            </p>
          </div>
        </div>
      </div>

      {/* Modal: Thêm buổi học đào tạo (Hình 15) */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div>
                <h3 className="font-bold text-base text-slate-900">Thêm chấm công đào tạo</h3>
                <p className="text-xs text-slate-400">
                  Phân bổ thù lao theo cơ chế Token Bể cố định (Dynamic Pool)
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateLog} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Mã Buổi học *</label>
                  <input
                    type="text"
                    required
                    value={formData.session_code}
                    onChange={(e) => setFormData({ ...formData, session_code: e.target.value })}
                    placeholder="TR001"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold uppercase"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Ngày đào tạo</label>
                  <input
                    type="date"
                    value={formData.training_date}
                    onChange={(e) => setFormData({ ...formData, training_date: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Tên Buổi học</label>
                <input
                  type="text"
                  value={formData.session_name}
                  onChange={(e) => setFormData({ ...formData, session_name: e.target.value })}
                  placeholder="Kỹ năng tư vấn tài chính thực chiến"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Họ tên Nhân sự *</label>
                  <input
                    type="text"
                    required
                    value={formData.member_name}
                    onChange={(e) => setFormData({ ...formData, member_name: e.target.value })}
                    placeholder="Nguyễn Văn A"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Số điện thoại</label>
                  <input
                    type="text"
                    value={formData.member_phone}
                    onChange={(e) => setFormData({ ...formData, member_phone: e.target.value })}
                    placeholder="0912 345 671"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Vai trò Đào tạo</label>
                  <select
                    value={formData.role}
                    onChange={(e) => handleRoleChange(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium cursor-pointer"
                  >
                    <option value="Giảng viên">Giảng viên (Hạng A - 10 Token)</option>
                    <option value="Trợ giảng">Trợ giảng (Hạng B - 5 Token)</option>
                    <option value="Học viên xuất sắc">Học viên xuất sắc (Hạng C - 3 Token)</option>
                    <option value="Học viên">Học viên (Hạng D - 1 Token)</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Hạng Token & Số Token</label>
                  <div className="flex gap-2">
                    <select
                      value={formData.token_tier}
                      onChange={(e) => handleTierChange(e.target.value)}
                      className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium"
                    >
                      <option value="Hạng A">Hạng A</option>
                      <option value="Hạng B">Hạng B</option>
                      <option value="Hạng C">Hạng C</option>
                      <option value="Hạng D">Hạng D</option>
                    </select>
                    <input
                      type="number"
                      value={formData.token_count}
                      onChange={(e) =>
                        setFormData({ ...formData, token_count: parseFloat(e.target.value) || 1 })
                      }
                      className="w-16 px-2 py-2 bg-slate-50 border border-slate-200 rounded-xl text-center font-bold"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Ngân sách Buổi học (VNĐ)</label>
                  <input
                    type="number"
                    step="500000"
                    value={formData.session_budget}
                    onChange={(e) =>
                      setFormData({ ...formData, session_budget: parseFloat(e.target.value) || 0 })
                    }
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Người duyệt</label>
                  <input
                    type="text"
                    value={formData.approver}
                    onChange={(e) => setFormData({ ...formData, approver: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium"
                  />
                </div>
              </div>

              <div className="p-3 bg-blue-50/70 border border-blue-100 rounded-xl text-[11px] text-blue-800">
                💡 <strong>Công thức Dynamic Pool:</strong> Thù lao cá nhân = (Số Token cá nhân / Tổng Token
                buổi) × Ngân sách buổi học. Hệ thống sẽ tự động cập nhật lại thù lao của các nhân sự khác
                trong cùng buổi học.
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-semibold hover:bg-slate-50"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-sm transition disabled:opacity-50"
                >
                  {isSubmitting ? 'Đang lưu...' : 'Lưu buổi học'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
