'use client';

import React, { useState, useMemo, useEffect } from 'react';
import {
  FileText,
  FileSpreadsheet,
  Coins,
  HandCoins,
  ShieldCheck,
  Search,
  RotateCw,
  Download,
  Plus,
  Eye,
  Pencil,
  Trash2,
  X,
  Check,
  AlertCircle,
  Info,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  User,
  Share2,
  Handshake,
  PiggyBank,
} from 'lucide-react';

export interface Contract {
  id: number;
  contract_code: string;
  contract_date: string;
  customer_name: string;
  value: number | string;
  closer_id: number | null;
  closer_name?: string | null;
  referrer_id: number | null;
  referrer_name?: string | null;
  supporter_id: number | null;
  supporter_name?: string | null;
  closer_fee: number | string;
  referrer_fee: number | string;
  supporter_fee: number | string;
  status: string;
  file_url?: string | null;
  notes?: string | null;
  created_at?: string;
}

export interface Stats {
  totalContracts: number;
  totalValue: number;
  totalCommission: number;
  approvedContracts: number;
}

export interface UserOption {
  id: number;
  full_name: string;
  phone?: string;
}

interface ContractManagementProps {
  initialContracts: Contract[];
  initialStats: Stats;
  initialUsers: UserOption[];
  initialClosers: UserOption[];
}

export default function ContractManagement({
  initialContracts,
  initialStats,
  initialUsers,
  initialClosers,
}: ContractManagementProps) {
  const [contracts, setContracts] = useState<Contract[]>(initialContracts);
  const [stats, setStats] = useState<Stats>(initialStats);
  const [users, setUsers] = useState<UserOption[]>(initialUsers);
  const [closers, setClosers] = useState<UserOption[]>(initialClosers);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('Tất cả');
  const [closerFilter, setCloserFilter] = useState('Tất cả');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingContract, setEditingContract] = useState<Contract | null>(null);
  const [viewingContract, setViewingContract] = useState<Contract | null>(null);
  const [deleteConfirmContract, setDeleteConfirmContract] = useState<Contract | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    contract_code: '',
    contract_date: '',
    customer_name: '',
    value: 0,
    closer_id: '',
    referrer_id: '',
    supporter_id: '',
    status: 'Đã duyệt',
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
      const q = new URLSearchParams();
      if (searchQuery) q.append('search', searchQuery);
      if (statusFilter && statusFilter !== 'Tất cả') q.append('status', statusFilter);
      if (closerFilter && closerFilter !== 'Tất cả') q.append('closer_id', closerFilter);
      if (fromDate) q.append('from_date', fromDate);
      if (toDate) q.append('to_date', toDate);

      const res = await fetch(`/api/admin/contracts?${q.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setContracts(data.contracts || []);
        setStats(data.stats || initialStats);
        if (data.closers) setClosers(data.closers);
        if (data.users) setUsers(data.users);
      }
    } catch (err) {
      console.error('Error refreshing contracts:', err);
    }
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    setStatusFilter('Tất cả');
    setCloserFilter('Tất cả');
    setFromDate('');
    setToDate('');
  };

  useEffect(() => {
    refreshData();
  }, [searchQuery, statusFilter, closerFilter, fromDate, toDate]);

  // Client-side pagination
  const totalPages = Math.ceil(contracts.length / pageSize) || 1;
  const paginatedContracts = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return contracts.slice(start, start + pageSize);
  }, [contracts, currentPage, pageSize]);

  // Computed commissions for form
  const computedCloserFee = useMemo(() => Math.round((Number(formData.value) || 0) * 0.06), [formData.value]);
  const computedReferrerFee = useMemo(() => Math.round((Number(formData.value) || 0) * 0.01), [formData.value]);
  const computedSupporterFee = useMemo(() => Math.round((Number(formData.value) || 0) * 0.005), [formData.value]);

  // Budget breakdown calculations
  const totalContractVal = stats.totalValue || 0;
  const breakdownProSale = Math.round(totalContractVal * 0.06);
  const breakdownReferral = Math.round(totalContractVal * 0.01);
  const breakdownSupport = Math.round(totalContractVal * 0.005);
  const breakdownFund = Math.round(totalContractVal * 0.005);
  const breakdownTotal = breakdownProSale + breakdownReferral + breakdownSupport + breakdownFund;

  const handleOpenAddModal = () => {
    setEditingContract(null);
    setFormData({
      contract_code: `HD00${contracts.length + 1}`,
      contract_date: new Date().toISOString().split('T')[0],
      customer_name: '',
      value: 50000000,
      closer_id: users[0]?.id ? String(users[0].id) : '',
      referrer_id: users[1]?.id ? String(users[1].id) : '',
      supporter_id: users[2]?.id ? String(users[2].id) : '',
      status: 'Đã duyệt',
      notes: '',
    });
    setFormError('');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (c: Contract) => {
    setEditingContract(c);
    let dateStr = '';
    if (c.contract_date) {
      dateStr = new Date(c.contract_date).toISOString().split('T')[0];
    }
    setFormData({
      contract_code: c.contract_code || '',
      contract_date: dateStr,
      customer_name: c.customer_name || '',
      value: Number(c.value) || 0,
      closer_id: c.closer_id ? String(c.closer_id) : '',
      referrer_id: c.referrer_id ? String(c.referrer_id) : '',
      supporter_id: c.supporter_id ? String(c.supporter_id) : '',
      status: c.status || 'Đã duyệt',
      notes: c.notes || '',
    });
    setFormError('');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!formData.contract_code.trim()) {
      setFormError('Vui lòng nhập mã hợp đồng');
      return;
    }
    if (!formData.customer_name.trim()) {
      setFormError('Vui lòng nhập tên khách hàng');
      return;
    }
    if (!formData.contract_date) {
      setFormError('Vui lòng chọn ngày ký');
      return;
    }

    setIsSubmitting(true);
    try {
      const url = editingContract
        ? `/api/admin/contracts/${editingContract.id}`
        : '/api/admin/contracts';
      const method = editingContract ? 'PUT' : 'POST';

      const payload = {
        ...formData,
        value: Number(formData.value) || 0,
        closer_fee: computedCloserFee,
        referrer_fee: computedReferrerFee,
        supporter_fee: computedSupporterFee,
      };

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const resData = await res.json();
      if (!res.ok) {
        throw new Error(resData.error || 'Có lỗi xảy ra');
      }

      showToast('success', editingContract ? 'Cập nhật hợp đồng thành công' : 'Thêm mới hợp đồng thành công');
      setIsModalOpen(false);
      await refreshData();
    } catch (err: any) {
      setFormError(err.message || 'Lỗi khi lưu hợp đồng');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteContract = async () => {
    if (!deleteConfirmContract) return;
    try {
      const res = await fetch(`/api/admin/contracts/${deleteConfirmContract.id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Xóa hợp đồng thất bại');

      showToast('success', 'Đã xóa hợp đồng thành công');
      setDeleteConfirmContract(null);
      await refreshData();
    } catch (err: any) {
      showToast('error', err.message || 'Lỗi khi xóa hợp đồng');
    }
  };

  const formatCurrency = (val: number | string) => {
    const num = Number(val) || 0;
    return new Intl.NumberFormat('vi-VN').format(num) + ' đ';
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  };

  return (
    <div className="p-8 max-w-[1600px] mx-auto min-h-screen bg-slate-50 text-slate-900">
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
              <Check className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{toastMessage.text}</span>
          </div>
        </div>
      )}

      {/* Breadcrumb & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2 text-xs font-medium text-slate-500 mb-2">
            <span>Trang chủ</span>
            <span>&gt;</span>
            <span className="text-slate-800 font-semibold">Nhật ký hợp đồng</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Nhật ký hợp đồng</h1>
          <p className="text-sm text-slate-500 mt-1">
            Quản lý hợp đồng, doanh số chốt và phân bổ hoa hồng
          </p>
        </div>

        <button
          onClick={handleOpenAddModal}
          className="inline-flex items-center justify-center gap-2 bg-[#2563eb] hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl text-sm font-semibold shadow-sm transition-all active:scale-[0.98]"
        >
          <Plus className="w-4 h-4" />
          <span>Thêm hợp đồng</span>
        </button>
      </div>

      {/* 4 Stat Cards (Khớp Hình 13) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        {/* 1. Tổng hợp đồng */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-medium text-slate-500 block">Tổng hợp đồng</span>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className="text-2xl font-bold text-slate-900">{stats.totalContracts}</span>
              <span className="text-xs text-slate-400">hợp đồng</span>
            </div>
          </div>
        </div>

        {/* 2. Tổng giá trị hợp đồng */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <Coins className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-medium text-slate-500 block">Tổng giá trị hợp đồng</span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-2xl font-bold text-slate-900">{formatCurrency(stats.totalValue)}</span>
            </div>
          </div>
        </div>

        {/* 3. Tổng hoa hồng */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <HandCoins className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-medium text-slate-500 block">Tổng hoa hồng</span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-2xl font-bold text-slate-900">{formatCurrency(stats.totalCommission)}</span>
            </div>
          </div>
        </div>

        {/* 4. Đã duyệt */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-medium text-slate-500 block">Đã duyệt</span>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className="text-2xl font-bold text-slate-900">{stats.approvedContracts}</span>
              <span className="text-xs text-slate-400">hợp đồng</span>
            </div>
          </div>
        </div>
      </div>

      {/* Filter Toolbar (Khớp Hình 13) */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3.5 items-center">
          {/* Tìm kiếm */}
          <div className="lg:col-span-3 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm mã hợp đồng, khách hàng..."
              className="w-full pl-10 pr-3.5 py-2 bg-slate-50/70 hover:bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900"
            />
          </div>

          {/* Trạng thái */}
          <div className="lg:col-span-2">
            <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Trạng thái</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-1.5 bg-slate-50/70 hover:bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800"
            >
              <option value="Tất cả">Tất cả</option>
              <option value="Đã duyệt">Đã duyệt</option>
              <option value="Chờ duyệt">Chờ duyệt</option>
              <option value="Từ chối">Từ chối</option>
            </select>
          </div>

          {/* Người chốt */}
          <div className="lg:col-span-2">
            <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Người chốt</label>
            <select
              value={closerFilter}
              onChange={(e) => setCloserFilter(e.target.value)}
              className="w-full px-3 py-1.5 bg-slate-50/70 hover:bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800"
            >
              <option value="Tất cả">Tất cả</option>
              {closers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.full_name}
                </option>
              ))}
            </select>
          </div>

          {/* Khoảng thời gian: Từ ngày */}
          <div className="lg:col-span-2">
            <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Từ ngày</label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="w-full px-3 py-1.5 bg-slate-50/70 hover:bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800"
            />
          </div>

          {/* Đến ngày */}
          <div className="lg:col-span-2">
            <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Đến ngày</label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="w-full px-3 py-1.5 bg-slate-50/70 hover:bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800"
            />
          </div>

          {/* Buttons: Làm mới & Xuất Excel */}
          <div className="lg:col-span-1 flex items-end gap-2 pt-4">
            <button
              onClick={handleResetFilters}
              title="Làm mới bộ lọc"
              className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 border border-slate-200 rounded-xl transition-colors"
            >
              <RotateCw className="w-4 h-4" />
            </button>
            <a
              href="/api/admin/contracts/export"
              download
              title="Xuất Excel (CSV)"
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-xl transition-colors shrink-0"
            >
              <Download className="w-4 h-4" />
              <span className="hidden xl:inline">Xuất Excel</span>
            </a>
          </div>
        </div>
      </div>

      {/* Bảng Danh sách Hợp đồng (Khớp 100% cột trong Hình 13) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden mb-6">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[1200px]">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                <th className="py-3.5 px-4 text-center w-12">STT</th>
                <th className="py-3.5 px-4">Mã hợp đồng</th>
                <th className="py-3.5 px-4">Ngày ký</th>
                <th className="py-3.5 px-4">Tên khách hàng</th>
                <th className="py-3.5 px-4 text-right">Giá trị hợp đồng</th>
                <th className="py-3.5 px-4">Người chốt</th>
                <th className="py-3.5 px-4">Người giới thiệu</th>
                <th className="py-3.5 px-4">Người hỗ trợ</th>
                <th className="py-3.5 px-4 text-right">Thù lao người chốt (6%)</th>
                <th className="py-3.5 px-4 text-right">Thù lao người GT (1%)</th>
                <th className="py-3.5 px-4 text-right">Thù lao hỗ trợ (0,5%)</th>
                <th className="py-3.5 px-4 text-center">Trạng thái</th>
                <th className="py-3.5 px-4 text-center">Hợp đồng</th>
                <th className="py-3.5 px-4 text-center">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {paginatedContracts.length === 0 ? (
                <tr>
                  <td colSpan={14} className="py-12 text-center text-slate-400">
                    <FileSpreadsheet className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                    Không tìm thấy hợp đồng nào phù hợp
                  </td>
                </tr>
              ) : (
                paginatedContracts.map((c, index) => {
                  const itemIndex = (currentPage - 1) * pageSize + index + 1;
                  return (
                    <tr key={c.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3.5 px-4 text-center text-slate-400 font-medium">{itemIndex}</td>
                      <td className="py-3.5 px-4 font-bold text-blue-600">{c.contract_code}</td>
                      <td className="py-3.5 px-4 text-slate-600">{formatDate(c.contract_date)}</td>
                      <td className="py-3.5 px-4 font-medium text-slate-800">{c.customer_name}</td>
                      <td className="py-3.5 px-4 text-right font-bold text-slate-900">{formatCurrency(c.value)}</td>
                      <td className="py-3.5 px-4 text-slate-700">{c.closer_name || '—'}</td>
                      <td className="py-3.5 px-4 text-slate-700">{c.referrer_name || '—'}</td>
                      <td className="py-3.5 px-4 text-slate-700">{c.supporter_name || '—'}</td>
                      <td className="py-3.5 px-4 text-right font-semibold text-emerald-700">{formatCurrency(c.closer_fee)}</td>
                      <td className="py-3.5 px-4 text-right font-semibold text-blue-700">{formatCurrency(c.referrer_fee)}</td>
                      <td className="py-3.5 px-4 text-right font-semibold text-purple-700">{formatCurrency(c.supporter_fee)}</td>
                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                            c.status === 'Đã duyệt'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
                              : c.status === 'Từ chối'
                              ? 'bg-rose-50 text-rose-700 border border-rose-200/60'
                              : 'bg-amber-50 text-amber-700 border border-amber-200/60'
                          }`}
                        >
                          {c.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <a
                          href={c.file_url || '#'}
                          target="_blank"
                          rel="noreferrer"
                          className="text-blue-600 hover:text-blue-800 font-semibold hover:underline inline-flex items-center gap-1"
                        >
                          <span>Xem file</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setViewingContract(c)}
                            title="Xem chi tiết"
                            className="p-1 text-slate-400 hover:text-blue-600 rounded hover:bg-slate-100 transition-colors"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenEditModal(c)}
                            title="Chỉnh sửa"
                            className="p-1 text-slate-400 hover:text-amber-600 rounded hover:bg-slate-100 transition-colors"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteConfirmContract(c)}
                            title="Xóa"
                            className="p-1 text-slate-400 hover:text-rose-600 rounded hover:bg-slate-100 transition-colors"
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

      {/* Bottom Area: Phân trang bên trái & Bảng phân tích phân bổ ngân sách 15% bên phải (Khớp Hình 13) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Phân trang */}
        <div className="lg:col-span-6 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div>
            Hiển thị <span className="font-semibold text-slate-800">{contracts.length > 0 ? (currentPage - 1) * pageSize + 1 : 0}</span>–
            <span className="font-semibold text-slate-800">{Math.min(currentPage * pageSize, contracts.length)}</span> trong tổng số{' '}
            <span className="font-semibold text-slate-800">{contracts.length}</span> hợp đồng
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              <button
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="p-1.5 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:pointer-events-none text-slate-600"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`w-8 h-8 rounded-lg font-semibold transition-all ${
                    currentPage === page
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'border border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {page}
                </button>
              ))}
              <button
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="p-1.5 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:pointer-events-none text-slate-600"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(parseInt(e.target.value));
                setCurrentPage(1);
              }}
              className="px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs bg-white text-slate-700"
            >
              <option value={10}>10 / trang</option>
              <option value={20}>20 / trang</option>
              <option value={50}>50 / trang</option>
            </select>
          </div>
        </div>

        {/* Khung Phân tích phân bổ ngân sách hợp đồng (15%) (Khớp 100% Hình 13) */}
        <div className="lg:col-span-6 bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                Phân tích phân bổ ngân sách hợp đồng (15%)
              </h3>
              <Info className="w-4 h-4 text-slate-400 cursor-help" />
            </div>
            <span className="text-[11px] font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
              Tự động tính
            </span>
          </div>

          <div className="p-4">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-slate-400 font-medium">
                  <th className="pb-2">Hạng mục</th>
                  <th className="pb-2 text-center">Tỷ lệ</th>
                  <th className="pb-2 text-right">Số tiền (VNĐ)</th>
                  <th className="pb-2 pl-4">Ghi chú</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {/* 1. Sale trực tiếp - Pro sale */}
                <tr>
                  <td className="py-2.5 font-medium text-slate-800 flex items-center gap-2">
                    <div className="w-6 h-6 rounded-md bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                      <User className="w-3.5 h-3.5" />
                    </div>
                    <span>Sale trực tiếp - Pro sale</span>
                  </td>
                  <td className="py-2.5 text-center">
                    <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-bold text-[11px]">
                      6%
                    </span>
                  </td>
                  <td className="py-2.5 text-right font-bold text-slate-900">
                    {formatCurrency(breakdownProSale)}
                  </td>
                  <td className="py-2.5 pl-4 text-slate-500 text-[11px]">
                    Thù lao cho người chốt hợp đồng
                  </td>
                </tr>

                {/* 2. Tri ấn kết nối sale trực tiếp */}
                <tr>
                  <td className="py-2.5 font-medium text-slate-800 flex items-center gap-2">
                    <div className="w-6 h-6 rounded-md bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                      <Share2 className="w-3.5 h-3.5" />
                    </div>
                    <span>Tri ân kết nối sale trực tiếp</span>
                  </td>
                  <td className="py-2.5 text-center">
                    <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 font-bold text-[11px]">
                      1%
                    </span>
                  </td>
                  <td className="py-2.5 text-right font-bold text-slate-900">
                    {formatCurrency(breakdownReferral)}
                  </td>
                  <td className="py-2.5 pl-4 text-slate-500 text-[11px]">
                    Thù lao cho người giới thiệu
                  </td>
                </tr>

                {/* 3. Tri ân hỗ trợ sale */}
                <tr>
                  <td className="py-2.5 font-medium text-slate-800 flex items-center gap-2">
                    <div className="w-6 h-6 rounded-md bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                      <Handshake className="w-3.5 h-3.5" />
                    </div>
                    <span>Tri ân hỗ trợ sale</span>
                  </td>
                  <td className="py-2.5 text-center">
                    <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-700 font-bold text-[11px]">
                      0,5%
                    </span>
                  </td>
                  <td className="py-2.5 text-right font-bold text-slate-900">
                    {formatCurrency(breakdownSupport)}
                  </td>
                  <td className="py-2.5 pl-4 text-slate-500 text-[11px]">
                    Thù lao cho người hỗ trợ
                  </td>
                </tr>

                {/* 4. Quỹ Sự kiện & Chốt hợp đồng */}
                <tr>
                  <td className="py-2.5 font-medium text-slate-800 flex items-center gap-2">
                    <div className="w-6 h-6 rounded-md bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                      <PiggyBank className="w-3.5 h-3.5" />
                    </div>
                    <span>Quỹ Sự kiện & Chốt hợp đồng</span>
                  </td>
                  <td className="py-2.5 text-center">
                    <span className="px-2 py-0.5 rounded bg-purple-50 text-purple-700 font-bold text-[11px]">
                      0,5%
                    </span>
                  </td>
                  <td className="py-2.5 text-right font-bold text-slate-900">
                    {formatCurrency(breakdownFund)}
                  </td>
                  <td className="py-2.5 pl-4 text-slate-500 text-[11px]">
                    Quỹ dùng cho sự kiện & chốt hợp đồng
                  </td>
                </tr>

                {/* Tổng cộng */}
                <tr className="border-t border-slate-200 bg-slate-50/40 font-bold">
                  <td className="py-2.5 text-slate-900">Tổng cộng</td>
                  <td className="py-2.5 text-center">
                    <span className="px-2 py-0.5 rounded bg-blue-600 text-white font-bold text-[11px]">
                      8%
                    </span>
                  </td>
                  <td className="py-2.5 text-right text-blue-700 text-sm">
                    {formatCurrency(breakdownTotal)}
                  </td>
                  <td className="py-2.5 pl-4 text-slate-400 text-[11px]">
                    Tổng thù lao & quỹ
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* MODAL: THÊM MỚI / CHỈNH SỬA HỢP ĐỒNG                          */}
      {/* ============================================================ */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl w-full max-w-xl shadow-2xl border border-slate-100 overflow-hidden max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h2 className="text-base font-bold text-slate-900">
                {editingContract ? 'Sửa thông tin hợp đồng' : 'Thêm mới hợp đồng'}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="overflow-y-auto px-6 py-5 space-y-4 flex-1">
              {formError && (
                <div className="bg-rose-50 border border-rose-200 text-rose-600 text-xs px-3.5 py-2.5 rounded-xl flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                {/* Mã hợp đồng */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Mã hợp đồng <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.contract_code}
                    onChange={(e) => setFormData({ ...formData, contract_code: e.target.value })}
                    className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900"
                    placeholder="VD: HD005"
                    required
                  />
                </div>

                {/* Ngày ký */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Ngày ký <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={formData.contract_date}
                    onChange={(e) => setFormData({ ...formData, contract_date: e.target.value })}
                    className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900"
                    required
                  />
                </div>
              </div>

              {/* Tên khách hàng */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Tên khách hàng <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.customer_name}
                  onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
                  className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900"
                  placeholder="VD: Bác Nguyễn Văn Hải (Sở hữu)"
                  required
                />
              </div>

              {/* Giá trị hợp đồng */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Giá trị hợp đồng (VNĐ) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  min="0"
                  step="1000000"
                  value={formData.value}
                  onChange={(e) => setFormData({ ...formData, value: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-lg text-sm font-bold text-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              {/* Tính toán tự động hoa hồng */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
                <span className="font-bold text-slate-700 uppercase tracking-wide text-[10px] block">
                  Tự động phân bổ thù lao theo tỷ lệ
                </span>
                <div className="grid grid-cols-3 gap-2 text-slate-700">
                  <div className="p-2 bg-white rounded-lg border border-slate-100">
                    <span className="text-slate-400 block text-[10px]">Người chốt (6%)</span>
                    <span className="font-bold text-emerald-700">{formatCurrency(computedCloserFee)}</span>
                  </div>
                  <div className="p-2 bg-white rounded-lg border border-slate-100">
                    <span className="text-slate-400 block text-[10px]">Người GT (1%)</span>
                    <span className="font-bold text-blue-700">{formatCurrency(computedReferrerFee)}</span>
                  </div>
                  <div className="p-2 bg-white rounded-lg border border-slate-100">
                    <span className="text-slate-400 block text-[10px]">Người hỗ trợ (0,5%)</span>
                    <span className="font-bold text-purple-700">{formatCurrency(computedSupporterFee)}</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                {/* Người chốt */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Người chốt
                  </label>
                  <select
                    value={formData.closer_id}
                    onChange={(e) => setFormData({ ...formData, closer_id: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800"
                  >
                    <option value="">Chọn người chốt</option>
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.full_name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Người giới thiệu */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Người giới thiệu
                  </label>
                  <select
                    value={formData.referrer_id}
                    onChange={(e) => setFormData({ ...formData, referrer_id: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800"
                  >
                    <option value="">Chọn người GT</option>
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.full_name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Người hỗ trợ */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Người hỗ trợ
                  </label>
                  <select
                    value={formData.supporter_id}
                    onChange={(e) => setFormData({ ...formData, supporter_id: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800"
                  >
                    <option value="">Chọn người hỗ trợ</option>
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.full_name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Trạng thái */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Trạng thái
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800"
                >
                  <option value="Đã duyệt">Đã duyệt</option>
                  <option value="Chờ duyệt">Chờ duyệt</option>
                  <option value="Từ chối">Từ chối</option>
                </select>
              </div>

              {/* Ghi chú */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Ghi chú
                </label>
                <textarea
                  rows={2}
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 resize-none"
                  placeholder="Ghi chú thêm về hợp đồng..."
                />
              </div>

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
                  className="px-5 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-all shadow-xs disabled:opacity-50"
                >
                  {isSubmitting ? 'Đang lưu...' : 'Lưu hợp đồng'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL: XEM CHI TIẾT HỢP ĐỒNG                                 */}
      {/* ============================================================ */}
      {viewingContract && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl border border-slate-100 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <div>
                <span className="text-xs text-blue-600 font-bold uppercase tracking-wider block">
                  Chi tiết hợp đồng
                </span>
                <h2 className="text-lg font-bold text-slate-900">{viewingContract.contract_code}</h2>
              </div>
              <button
                onClick={() => setViewingContract(null)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs sm:text-sm">
              <div className="grid grid-cols-2 gap-4 pb-3 border-b border-slate-100">
                <div>
                  <span className="text-slate-400 block text-xs">Khách hàng</span>
                  <span className="font-semibold text-slate-900">{viewingContract.customer_name}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-xs">Ngày ký</span>
                  <span className="font-semibold text-slate-900">{formatDate(viewingContract.contract_date)}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pb-3 border-b border-slate-100">
                <div>
                  <span className="text-slate-400 block text-xs">Giá trị hợp đồng</span>
                  <span className="font-bold text-blue-700 text-base">{formatCurrency(viewingContract.value)}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-xs">Trạng thái</span>
                  <span className="inline-block mt-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                    {viewingContract.status}
                  </span>
                </div>
              </div>

              {/* Thù lao hoa hồng */}
              <div className="p-4 bg-slate-50 rounded-xl space-y-2 border border-slate-100">
                <span className="font-bold text-slate-800 block text-xs uppercase">Phân bổ hoa hồng</span>
                <div className="flex justify-between py-1 border-b border-slate-200/60">
                  <span className="text-slate-600">Người chốt (6%): {viewingContract.closer_name || '—'}</span>
                  <span className="font-bold text-emerald-700">{formatCurrency(viewingContract.closer_fee)}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200/60">
                  <span className="text-slate-600">Người giới thiệu (1%): {viewingContract.referrer_name || '—'}</span>
                  <span className="font-bold text-blue-700">{formatCurrency(viewingContract.referrer_fee)}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-600">Người hỗ trợ (0.5%): {viewingContract.supporter_name || '—'}</span>
                  <span className="font-bold text-purple-700">{formatCurrency(viewingContract.supporter_fee)}</span>
                </div>
              </div>

              {viewingContract.notes && (
                <div>
                  <span className="text-slate-400 block text-xs mb-1">Ghi chú</span>
                  <p className="p-3 bg-slate-50 rounded-lg text-slate-700">{viewingContract.notes}</p>
                </div>
              )}
            </div>

            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setViewingContract(null)}
                className="px-5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-100"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL: XÁC NHẬN XÓA HỢP ĐỒNG                                 */}
      {/* ============================================================ */}
      {deleteConfirmContract && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl p-6 text-center">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900 mb-1">Xác nhận xóa hợp đồng</h3>
            <p className="text-xs text-slate-500 mb-6">
              Bạn có chắc chắn muốn xóa hợp đồng <span className="font-semibold text-slate-800">{deleteConfirmContract.contract_code}</span>? Hành động này không thể hoàn tác.
            </p>
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={() => setDeleteConfirmContract(null)}
                className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg border border-slate-200"
              >
                Hủy
              </button>
              <button
                onClick={handleDeleteContract}
                className="px-5 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-xs"
              >
                Xóa hợp đồng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
