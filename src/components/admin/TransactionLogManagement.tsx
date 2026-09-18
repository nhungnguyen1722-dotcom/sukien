'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  Receipt,
  Wallet,
  TrendingUp,
  Clock,
  Search,
  Filter,
  Plus,
  Eye,
  MoreVertical,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  X,
  Calendar,
  DollarSign,
  UserCheck,
  Building2,
  Check,
  FileText,
  Info,
  Layers,
  ArrowUpRight,
  ShieldCheck,
  AlertTriangle,
} from 'lucide-react';

export interface TransactionLog {
  id: number;
  request_code: string;
  request_date: string;
  fund_source: string;
  detail_content: string;
  requester_id?: string;
  requester_name: string;
  approver_id?: string;
  approver_name: string;
  beneficiary_name: string;
  proposed_amount: number;
  available_balance: number;
  fund_alert: string;
  status: string;
  actual_expense?: number;
  receipt_url?: string;
  created_at?: string;
}

interface FundMeta {
  name: string;
  percent: number;
  total: number;
  used: number;
  color: string;
  bgLight: string;
  textLight: string;
  borderLight: string;
}

const DEFAULT_FUNDS: Record<string, { percent: number; total: number; color: string; bgLight: string; textLight: string; borderLight: string }> = {
  'Quỹ Chăm sóc khách hàng': {
    percent: 35,
    total: 52500000,
    color: '#2563eb',
    bgLight: 'bg-blue-50',
    textLight: 'text-blue-700',
    borderLight: 'border-blue-200',
  },
  'Quỹ Sự kiện & Chốt HĐ': {
    percent: 20,
    total: 30000000,
    color: '#ec4899',
    bgLight: 'bg-pink-50',
    textLight: 'text-pink-700',
    borderLight: 'border-pink-200',
  },
  'Quỹ Đào tạo Kỹ năng': {
    percent: 15,
    total: 22500000,
    color: '#8b5cf6',
    bgLight: 'bg-purple-50',
    textLight: 'text-purple-700',
    borderLight: 'border-purple-200',
  },
  'Quỹ Thi đua & Thúc đẩy': {
    percent: 10,
    total: 15000000,
    color: '#f59e0b',
    bgLight: 'bg-amber-50',
    textLight: 'text-amber-700',
    borderLight: 'border-amber-200',
  },
  'Quỹ Công tác phí': {
    percent: 10,
    total: 15000000,
    color: '#10b981',
    bgLight: 'bg-emerald-50',
    textLight: 'text-emerald-700',
    borderLight: 'border-emerald-200',
  },
  'Quỹ Vận hành gián tiếp': {
    percent: 10,
    total: 15000000,
    color: '#06b6d4',
    bgLight: 'bg-cyan-50',
    textLight: 'text-cyan-700',
    borderLight: 'border-cyan-200',
  },
};

interface TransactionManagementProps {
  initialLogs: TransactionLog[];
  initialStats: {
    totalBudget: number;
    totalUsed: number;
    totalRemaining: number;
    fundMap: Record<string, any>;
  };
}

export default function TransactionLogManagement({ initialLogs, initialStats }: TransactionManagementProps) {
  const [logs, setLogs] = useState<TransactionLog[]>(initialLogs);
  const [stats, setStats] = useState(initialStats);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFund, setSelectedFund] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Modals
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [viewLog, setViewLog] = useState<TransactionLog | null>(null);
  const [actionMenuOpenId, setActionMenuOpenId] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form fields for Create
  const [formData, setFormData] = useState({
    requestCode: `YC${String(Math.floor(100 + Math.random() * 900))}`,
    requestDate: new Date().toISOString().split('T')[0],
    fundSource: 'Quỹ Chăm sóc khách hàng',
    detailContent: '',
    requesterId: 'TV001',
    requesterName: 'Kế toán Vân',
    approverId: 'QL01',
    approverName: 'Vũ Thị Cúc',
    beneficiaryName: '',
    proposedAmount: '',
  });

  const formatVND = (num: number) => {
    return new Intl.NumberFormat('vi-VN').format(Math.round(num)) + ' đ';
  };

  const formatDateDisplay = (dateStr?: string) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  };

  // Fund balance calculator for modal
  const selectedFundTotal = DEFAULT_FUNDS[formData.fundSource]?.total || 15000000;
  const selectedFundUsed = stats.fundMap[formData.fundSource]?.used || 0;
  const currentAvailableBalance = Math.max(0, selectedFundTotal - selectedFundUsed);
  const parsedProposedAmount = Number(formData.proposedAmount.replace(/\D/g, '')) || 0;
  const isOverBudget = parsedProposedAmount > currentAvailableBalance;

  // Filtered logs
  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      const matchSearch =
        !searchQuery ||
        log.request_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.detail_content.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.requester_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.beneficiary_name.toLowerCase().includes(searchQuery.toLowerCase());

      const matchFund =
        selectedFund === 'all' ||
        log.fund_source.toLowerCase().includes(selectedFund.toLowerCase());

      const matchStatus =
        selectedStatus === 'all' || log.status === selectedStatus;

      return matchSearch && matchFund && matchStatus;
    });
  }, [logs, searchQuery, selectedFund, selectedStatus]);

  // Pagination
  const totalPages = Math.ceil(filteredLogs.length / itemsPerPage) || 1;
  const paginatedLogs = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredLogs.slice(start, start + itemsPerPage);
  }, [filteredLogs, currentPage, itemsPerPage]);

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.detailContent || !parsedProposedAmount) {
      alert('Vui lòng điền nội dung chi tiết và số tiền đề xuất!');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/admin/transaction-logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          proposedAmount: parsedProposedAmount,
          availableBalance: currentAvailableBalance,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Lỗi khi tạo phiếu');
      }

      // Add to state
      setLogs([data.log, ...logs]);
      setIsCreateOpen(false);
      setFormData({
        requestCode: `YC${String(Math.floor(100 + Math.random() * 900))}`,
        requestDate: new Date().toISOString().split('T')[0],
        fundSource: 'Quỹ Chăm sóc khách hàng',
        detailContent: '',
        requesterId: 'TV001',
        requesterName: 'Kế toán Vân',
        approverId: 'QL01',
        approverName: 'Vũ Thị Cúc',
        beneficiaryName: '',
        proposedAmount: '',
      });
      alert('Tạo phiếu đề xuất thành công!');
    } catch (err: any) {
      alert(err.message || 'Có lỗi xảy ra');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateStatus = async (id: number, status: string) => {
    try {
      const res = await fetch('/api/admin/transaction-logs', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status, approverName: 'Vũ Thị Cúc' }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message);

      setLogs(logs.map((l) => (l.id === id ? { ...l, status } : l)));
      setActionMenuOpenId(null);
    } catch (err: any) {
      alert(err.message || 'Lỗi cập nhật trạng thái');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Bạn có chắc muốn xóa phiếu đề xuất này?')) return;
    try {
      const res = await fetch(`/api/admin/transaction-logs?id=${id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message);

      setLogs(logs.filter((l) => l.id !== id));
      setActionMenuOpenId(null);
    } catch (err: any) {
      alert(err.message || 'Lỗi khi xóa');
    }
  };

  // Helper for fund pill style
  const getFundMeta = (fundName: string) => {
    const key = Object.keys(DEFAULT_FUNDS).find((k) =>
      fundName.toLowerCase().includes(k.toLowerCase()) || k.toLowerCase().includes(fundName.toLowerCase())
    );
    return key ? DEFAULT_FUNDS[key] : DEFAULT_FUNDS['Quỹ Chăm sóc khách hàng'];
  };

  // Donut chart SVG calculations
  const chartSegments = useMemo(() => {
    const radius = 40;
    const circumference = 2 * Math.PI * radius;
    let accumulatedPercent = 0;

    return Object.entries(DEFAULT_FUNDS).map(([k, meta]) => {
      const pct = meta.percent;
      const strokeDasharray = `${(pct / 100) * circumference} ${circumference}`;
      const strokeDashoffset = -((accumulatedPercent / 100) * circumference);
      accumulatedPercent += pct;

      return {
        key: k,
        meta,
        strokeDasharray,
        strokeDashoffset,
      };
    });
  }, []);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 mb-1">
            <Link href="/admin" className="hover:text-blue-600 transition-colors">
              Trang chủ
            </Link>
            <span>›</span>
            <span className="text-slate-600">Nhật ký thu chi</span>
          </div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              Nhật ký thu chi
              <Info className="w-4 h-4 text-slate-400 cursor-help" />
            </h1>
          </div>
          <p className="text-sm text-slate-500 mt-0.5">
            Quản lý các phiếu đề xuất giải ngân từ nguồn Quỹ chung 15%.
          </p>
        </div>

        <div className="flex items-center gap-3 self-end sm:self-auto">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 rounded-xl shadow-xs text-xs font-medium text-slate-700">
            <Calendar className="w-3.5 h-3.5 text-blue-600" />
            <span>01/09/2026 - 30/09/2026</span>
          </div>
          <div className="flex items-center gap-2 pl-3 border-l border-slate-200">
            <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs shadow-xs">
              C
            </div>
            <div className="hidden sm:block text-left text-xs">
              <div className="font-semibold text-slate-800">Vũ Thị Cúc</div>
              <div className="text-slate-400">Quản trị viên</div>
            </div>
          </div>
        </div>
      </div>

      {/* Top Stat Cards & Donut Chart Grid (Hình 16) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Tổng ngân sách 15% */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Tổng ngân sách 15%</span>
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Wallet className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-2xl font-bold text-slate-900 tracking-tight">
              {formatVND(stats.totalBudget)}
            </div>
            <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
              <span>Trích 15% từ doanh thu hợp đồng</span>
            </div>
          </div>
        </div>

        {/* Card 2: Đã sử dụng */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Đã sử dụng</span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-bold text-slate-900 tracking-tight">
                {formatVND(stats.totalUsed)}
              </span>
              <span className="text-xs font-semibold text-emerald-600">
                {Math.round((stats.totalUsed / stats.totalBudget) * 100)}%
              </span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2 overflow-hidden">
              <div
                className="bg-emerald-500 h-1.5 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, Math.round((stats.totalUsed / stats.totalBudget) * 100))}%` }}
              />
            </div>
          </div>
        </div>

        {/* Card 3: Còn lại */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Còn lại</span>
            <div className="w-9 h-9 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-bold text-slate-900 tracking-tight">
                {formatVND(stats.totalRemaining)}
              </span>
              <span className="text-xs font-semibold text-sky-600">
                {Math.round((stats.totalRemaining / stats.totalBudget) * 100)}%
              </span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2 overflow-hidden">
              <div
                className="bg-sky-500 h-1.5 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, Math.round((stats.totalRemaining / stats.totalBudget) * 100))}%` }}
              />
            </div>
          </div>
        </div>

        {/* Card 4: Donut Chart Cơ cấu quỹ 15% */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-blue-600" />
              Cơ cấu quỹ 15%
            </span>
            <span className="text-[11px] text-blue-600 font-medium">150.000.000 đ</span>
          </div>

          <div className="flex items-center gap-4">
            {/* SVG Donut */}
            <div className="relative w-20 h-20 shrink-0 flex items-center justify-center">
              <svg className="w-20 h-20 -rotate-90" viewBox="0 0 100 100">
                {chartSegments.map((seg) => (
                  <circle
                    key={seg.key}
                    cx="50"
                    cy="50"
                    r="40"
                    fill="transparent"
                    stroke={seg.meta.color}
                    strokeWidth="16"
                    strokeDasharray={seg.strokeDasharray}
                    strokeDashoffset={seg.strokeDashoffset}
                  />
                ))}
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="text-[9px] font-bold text-slate-800">15%</span>
                <span className="text-[7px] text-slate-400 uppercase">Quỹ chung</span>
              </div>
            </div>

            {/* Legend list */}
            <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[10px] w-full">
              {Object.entries(DEFAULT_FUNDS).map(([k, meta]) => (
                <div key={k} className="flex items-center justify-between gap-1">
                  <div className="flex items-center gap-1 truncate">
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: meta.color }} />
                    <span className="truncate text-slate-600" title={k}>
                      {k.replace('Quỹ ', '')}
                    </span>
                  </div>
                  <span className="font-semibold text-slate-800">{meta.percent}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Filter Row & Action */}
      <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex flex-1 flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Tìm mã phiếu, nội dung chi, người đề xuất, người thụ hưởng..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            />
          </div>

          {/* Fund Filter */}
          <select
            value={selectedFund}
            onChange={(e) => {
              setSelectedFund(e.target.value);
              setCurrentPage(1);
            }}
            className="px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer"
          >
            <option value="all">Nguồn quỹ: Tất cả</option>
            {Object.keys(DEFAULT_FUNDS).map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={selectedStatus}
            onChange={(e) => {
              setSelectedStatus(e.target.value);
              setCurrentPage(1);
            }}
            className="px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer"
          >
            <option value="all">Trạng thái: Tất cả</option>
            <option value="Đã duyệt">Đã duyệt</option>
            <option value="Chờ duyệt">Chờ duyệt</option>
            <option value="Từ chối">Từ chối</option>
          </select>
        </div>

        {/* Create button */}
        <button
          onClick={() => setIsCreateOpen(true)}
          className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-all active:scale-95 cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Tạo phiếu đề xuất</span>
        </button>
      </div>

      {/* Main Grid: Left Table (75%) + Right 6-Fund Sidebar (25%) */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        {/* Left: Table Container (9 cols on xl) */}
        <div className="xl:col-span-9 bg-white rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px] tracking-wider select-none">
                <tr>
                  <th className="py-3 px-3 text-center w-10">STT</th>
                  <th className="py-3 px-3">Mã phiếu YC</th>
                  <th className="py-3 px-3">Ngày đề xuất</th>
                  <th className="py-3 px-3">Nguồn quỹ trích chi</th>
                  <th className="py-3 px-4 min-w-[180px]">Nội dung chi tiết</th>
                  <th className="py-3 px-3">Người đề xuất</th>
                  <th className="py-3 px-3">Người duyệt</th>
                  <th className="py-3 px-3">Người thụ hưởng</th>
                  <th className="py-3 px-3 text-right">Số tiền đề xuất</th>
                  <th className="py-3 px-3 text-right">Số dư khả dụng</th>
                  <th className="py-3 px-3 text-center">Cảnh báo tồn quỹ</th>
                  <th className="py-3 px-3 text-center">Trạng thái</th>
                  <th className="py-3 px-3 text-center">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-normal">
                {paginatedLogs.length === 0 ? (
                  <tr>
                    <td colSpan={13} className="text-center py-12 text-slate-400">
                      Không có phiếu đề xuất nào phù hợp.
                    </td>
                  </tr>
                ) : (
                  paginatedLogs.map((log, index) => {
                    const meta = getFundMeta(log.fund_source);
                    const isAlert = log.fund_alert?.includes('VƯỢT') || log.proposed_amount > log.available_balance;

                    return (
                      <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                        {/* STT */}
                        <td className="py-3 px-3 text-center font-medium text-slate-400">
                          {(currentPage - 1) * itemsPerPage + index + 1}
                        </td>

                        {/* Mã phiếu YC */}
                        <td className="py-3 px-3 font-bold text-blue-600">
                          <button
                            onClick={() => setViewLog(log)}
                            className="hover:underline cursor-pointer"
                          >
                            {log.request_code}
                          </button>
                        </td>

                        {/* Ngày đề xuất */}
                        <td className="py-3 px-3 whitespace-nowrap text-slate-500">
                          {formatDateDisplay(log.request_date)}
                        </td>

                        {/* Nguồn quỹ */}
                        <td className="py-3 px-3 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold border ${meta.bgLight} ${meta.textLight} ${meta.borderLight}`}
                          >
                            {log.fund_source.replace('Quỹ ', '')}
                          </span>
                        </td>

                        {/* Nội dung chi tiết */}
                        <td className="py-3 px-4 font-medium text-slate-800 max-w-[220px] truncate" title={log.detail_content}>
                          {log.detail_content}
                        </td>

                        {/* Người đề xuất */}
                        <td className="py-3 px-3 whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <div className="w-5 h-5 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center text-[10px] font-bold">
                              {log.requester_name.charAt(0)}
                            </div>
                            <div>
                              <div className="text-[10px] text-slate-400 font-mono leading-none">
                                {log.requester_id || 'TV001'}
                              </div>
                              <div className="font-medium text-slate-800 text-[11px]">
                                {log.requester_name}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Người duyệt */}
                        <td className="py-3 px-3 whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <div className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-[10px] font-bold">
                              C
                            </div>
                            <div>
                              <div className="text-[10px] text-blue-500 font-mono leading-none">
                                {log.approver_id || 'QL01'}
                              </div>
                              <div className="font-medium text-slate-800 text-[11px]">
                                {log.approver_name || 'Vũ Thị Cúc'}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Người thụ hưởng */}
                        <td className="py-3 px-3 whitespace-nowrap">
                          <div className="font-medium text-slate-800 text-[11px]">
                            {log.beneficiary_name}
                          </div>
                        </td>

                        {/* Số tiền đề xuất */}
                        <td className="py-3 px-3 text-right font-bold text-slate-900 whitespace-nowrap">
                          {formatVND(log.proposed_amount)}
                        </td>

                        {/* Số dư khả dụng */}
                        <td className="py-3 px-3 text-right font-semibold text-blue-600 whitespace-nowrap">
                          {formatVND(log.available_balance)}
                        </td>

                        {/* Cảnh báo tồn quỹ */}
                        <td className="py-3 px-3 text-center whitespace-nowrap">
                          {isAlert ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-700 border border-red-200">
                              <AlertTriangle className="w-3 h-3 text-red-600" />
                              Vượt quá tồn quỹ
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 border border-emerald-200">
                              <Check className="w-3 h-3 text-emerald-600" />
                              An toàn
                            </span>
                          )}
                        </td>

                        {/* Trạng thái */}
                        <td className="py-3 px-3 text-center whitespace-nowrap">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              log.status === 'Đã duyệt'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : log.status === 'Từ chối'
                                ? 'bg-red-50 text-red-700 border border-red-200'
                                : 'bg-amber-50 text-amber-700 border border-amber-200'
                            }`}
                          >
                            {log.status}
                          </span>
                        </td>

                        {/* Thao tác */}
                        <td className="py-3 px-3 text-center whitespace-nowrap relative">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => setViewLog(log)}
                              className="p-1 text-slate-400 hover:text-blue-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                              title="Xem chi tiết"
                            >
                              <Eye className="w-4 h-4" />
                            </button>

                            <div className="relative">
                              <button
                                onClick={() =>
                                  setActionMenuOpenId(actionMenuOpenId === log.id ? null : log.id)
                                }
                                className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                                title="Tùy chọn"
                              >
                                <MoreVertical className="w-4 h-4" />
                              </button>

                              {actionMenuOpenId === log.id && (
                                <div className="absolute right-0 top-8 z-30 w-32 bg-white border border-slate-200 rounded-xl shadow-lg py-1 text-xs text-left animate-in fade-in">
                                  {log.status !== 'Đã duyệt' && (
                                    <button
                                      onClick={() => handleUpdateStatus(log.id, 'Đã duyệt')}
                                      className="w-full px-3 py-1.5 hover:bg-slate-50 text-emerald-600 font-medium flex items-center gap-1.5"
                                    >
                                      <CheckCircle2 className="w-3.5 h-3.5" /> Duyệt
                                    </button>
                                  )}
                                  {log.status !== 'Từ chối' && (
                                    <button
                                      onClick={() => handleUpdateStatus(log.id, 'Từ chối')}
                                      className="w-full px-3 py-1.5 hover:bg-slate-50 text-amber-600 font-medium flex items-center gap-1.5"
                                    >
                                      <XCircle className="w-3.5 h-3.5" /> Từ chối
                                    </button>
                                  )}
                                  <button
                                    onClick={() => handleDelete(log.id)}
                                    className="w-full px-3 py-1.5 hover:bg-red-50 text-red-600 font-medium flex items-center gap-1.5 border-t border-slate-100"
                                  >
                                    <X className="w-3.5 h-3.5" /> Xóa phiếu
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer */}
          <div className="px-4 py-3 border-t border-slate-200/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
            <div>
              Hiển thị{' '}
              <span className="font-semibold text-slate-700">
                {filteredLogs.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0}
              </span>{' '}
              -{' '}
              <span className="font-semibold text-slate-700">
                {Math.min(currentPage * itemsPerPage, filteredLogs.length)}
              </span>{' '}
              trong tổng số{' '}
              <span className="font-semibold text-slate-700">{filteredLogs.length}</span> phiếu
            </div>

            <div className="flex items-center gap-2">
              <select
                value={itemsPerPage}
                onChange={(e) => {
                  setItemsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium cursor-pointer"
              >
                <option value={10}>10 / trang</option>
                <option value={20}>20 / trang</option>
                <option value={50}>50 / trang</option>
              </select>

              <div className="flex items-center gap-1">
                <button
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className="p-1 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((pg) => (
                  <button
                    key={pg}
                    onClick={() => setCurrentPage(pg)}
                    className={`w-7 h-7 rounded-lg text-xs font-semibold ${
                      currentPage === pg
                        ? 'bg-blue-600 text-white'
                        : 'border border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    {pg}
                  </button>
                ))}
                <button
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  className="p-1 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Sidebar with 6 Funds Breakdown + Note Box (3 cols on xl) */}
        <div className="xl:col-span-3 space-y-4">
          {/* Card: Danh sách 6 quỹ thành phần */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-blue-600" />
                Danh sách 6 quỹ thành phần
              </h3>
              <span className="text-[11px] text-blue-600 hover:underline cursor-pointer">
                Xem chi tiết
              </span>
            </div>

            <div className="space-y-3">
              {Object.entries(DEFAULT_FUNDS).map(([k, meta]) => {
                const used = stats.fundMap[k]?.used || 0;
                const pct = Math.min(100, Math.round((used / meta.total) * 100));

                return (
                  <div key={k} className="p-2.5 rounded-xl bg-slate-50/70 border border-slate-100">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: meta.color }}
                        />
                        <span className="font-bold text-slate-800 text-[11px]">{k}</span>
                      </div>
                      <span className="text-[10px] font-bold text-slate-400">{meta.percent}%</span>
                    </div>

                    <div className="mt-1.5 flex items-baseline justify-between text-[11px]">
                      <span className="text-slate-500">Tổng: {formatVND(meta.total)}</span>
                      <span className="font-semibold text-slate-700">
                        Đã dùng: {formatVND(used)} ({pct}%)
                      </span>
                    </div>

                    <div className="w-full bg-slate-200 rounded-full h-1.5 mt-1.5 overflow-hidden">
                      <div
                        className="h-1.5 rounded-full transition-all duration-500"
                        style={{
                          width: `${pct}%`,
                          backgroundColor: meta.color,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Card: Ghi chú */}
          <div className="bg-amber-50/60 p-4 rounded-2xl border border-amber-200/80 shadow-xs text-xs text-amber-900 space-y-2">
            <div className="font-bold flex items-center gap-1.5 text-amber-800">
              <Info className="w-4 h-4 text-amber-600" />
              Ghi chú
            </div>
            <ul className="space-y-1.5 text-[11px] text-amber-800/90 list-disc pl-4 leading-relaxed">
              <li>Mỗi phiếu đề xuất cần có 3 người xác nhận: Người đề xuất, Người duyệt, Người thụ hưởng.</li>
              <li>Hệ thống tự động cảnh báo khi đề xuất vượt quá số dư khả dụng.</li>
              <li>Dữ liệu được tổng hợp theo từng tháng và từng quỹ thành phần.</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Modal: Tạo phiếu đề xuất */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between p-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Receipt className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Tạo phiếu đề xuất giải ngân</h3>
                  <p className="text-[11px] text-slate-400">Trích xuất chi từ Quỹ chung 15%</p>
                </div>
              </div>
              <button
                onClick={() => setIsCreateOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="p-5 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-medium mb-1">Mã phiếu YC</label>
                  <input
                    type="text"
                    readOnly
                    value={formData.requestCode}
                    className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-xl font-mono text-slate-600"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-medium mb-1">Ngày đề xuất</label>
                  <input
                    type="date"
                    value={formData.requestDate}
                    onChange={(e) => setFormData({ ...formData, requestDate: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>

              {/* Fund source */}
              <div>
                <label className="block text-slate-700 font-medium mb-1">Nguồn quỹ trích chi *</label>
                <select
                  value={formData.fundSource}
                  onChange={(e) => setFormData({ ...formData, fundSource: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium"
                >
                  {Object.keys(DEFAULT_FUNDS).map((f) => (
                    <option key={f} value={f}>
                      {f} (Hạn mức: {formatVND(DEFAULT_FUNDS[f].total)})
                    </option>
                  ))}
                </select>
              </div>

              {/* Fund balance status pill */}
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between">
                <div>
                  <span className="text-slate-500 text-[11px]">Số dư khả dụng hiện tại:</span>
                  <div className="text-sm font-bold text-blue-600">{formatVND(currentAvailableBalance)}</div>
                </div>
                <div>
                  {isOverBudget ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-red-100 text-red-700 border border-red-200">
                      <AlertTriangle className="w-3.5 h-3.5 text-red-600" />
                      ⚠️ Vượt quá tồn quỹ
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 border border-emerald-200">
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      🟢 An toàn
                    </span>
                  )}
                </div>
              </div>

              {/* Proposed amount */}
              <div>
                <label className="block text-slate-700 font-medium mb-1">Số tiền đề xuất (VNĐ) *</label>
                <input
                  type="text"
                  placeholder="Ví dụ: 3.500.000"
                  value={formData.proposedAmount}
                  onChange={(e) => {
                    const clean = e.target.value.replace(/\D/g, '');
                    setFormData({
                      ...formData,
                      proposedAmount: clean ? new Intl.NumberFormat('vi-VN').format(Number(clean)) : '',
                    });
                  }}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900"
                />
              </div>

              {/* Detail content */}
              <div>
                <label className="block text-slate-700 font-medium mb-1">Nội dung chi tiết *</label>
                <textarea
                  rows={3}
                  placeholder="Mô tả mục đích giải ngân..."
                  value={formData.detailContent}
                  onChange={(e) => setFormData({ ...formData, detailContent: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              {/* 3 People info */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
                <div>
                  <label className="block text-slate-600 font-medium mb-1">Người đề xuất</label>
                  <input
                    type="text"
                    value={formData.requesterName}
                    onChange={(e) => setFormData({ ...formData, requesterName: e.target.value })}
                    className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-medium mb-1">Người duyệt</label>
                  <input
                    type="text"
                    value={formData.approverName}
                    onChange={(e) => setFormData({ ...formData, approverName: e.target.value })}
                    className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-medium mb-1">Người thụ hưởng *</label>
                  <input
                    type="text"
                    placeholder="Tên cá nhân / Cty"
                    value={formData.beneficiaryName}
                    onChange={(e) => setFormData({ ...formData, beneficiaryName: e.target.value })}
                    className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold rounded-xl"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl shadow-xs disabled:opacity-50"
                >
                  {isSubmitting ? 'Đang gửi...' : 'Gửi đề xuất'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Xem chi tiết phiếu */}
      {viewLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full p-5 shadow-2xl border border-slate-200 text-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                  YC
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">
                    Chi tiết phiếu {viewLog.request_code}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Ngày: {formatDateDisplay(viewLog.request_date)}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setViewLog(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2.5">
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-500">Nguồn quỹ:</span>
                <span className="font-bold text-slate-800">{viewLog.fund_source}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-500">Số tiền đề xuất:</span>
                <span className="font-bold text-blue-600 text-sm">{formatVND(viewLog.proposed_amount)}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-500">Số dư khả dụng:</span>
                <span className="font-semibold text-slate-700">{formatVND(viewLog.available_balance)}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-500">Cảnh báo tồn quỹ:</span>
                <span className="font-bold">{viewLog.fund_alert}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-500">Trạng thái:</span>
                <span className="font-bold">{viewLog.status}</span>
              </div>
              <div className="py-1">
                <span className="text-slate-500 block mb-1">Nội dung chi tiết:</span>
                <p className="p-2.5 bg-slate-50 rounded-xl text-slate-800 leading-relaxed">
                  {viewLog.detail_content}
                </p>
              </div>
              <div className="grid grid-cols-3 gap-2 pt-2 text-[11px]">
                <div className="p-2 bg-slate-50 rounded-lg">
                  <span className="text-slate-400 block text-[10px]">Đề xuất:</span>
                  <span className="font-bold text-slate-800">{viewLog.requester_name}</span>
                </div>
                <div className="p-2 bg-slate-50 rounded-lg">
                  <span className="text-slate-400 block text-[10px]">Phê duyệt:</span>
                  <span className="font-bold text-slate-800">{viewLog.approver_name}</span>
                </div>
                <div className="p-2 bg-slate-50 rounded-lg">
                  <span className="text-slate-400 block text-[10px]">Thụ hưởng:</span>
                  <span className="font-bold text-slate-800">{viewLog.beneficiary_name}</span>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-100">
              <button
                onClick={() => setViewLog(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl"
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
