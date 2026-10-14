'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import AdminTimeFilter from '@/components/admin/AdminTimeFilter';
import { getMonthWeekRange } from '@/lib/weekRanges';
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
  token_count: number;
  session_budget: number;
  total_tokens: number;
  reward_amount: number;
  status: string;
  training_date?: string;
}

interface TrainingMember {
  full_name: string;
  phone: string | null;
}

interface TrainingContract {
  contract_code: string | null;
  contract_date: string;
  customer_name: string;
  allocation_base: number;
}

interface TrainingFundExpense {
  id: number;
  expense_date: string;
  detail_content: string;
  amount: number;
  status: string;
  fund_source: string;
}

export interface TrainingCourse {
  id?: number;
  course_code: string;
  course_name: string;
  training_type: string;
  token_value: number;
  budget: number;
}

interface TrainingManagementProps {
  initialLogs: TrainingLog[];
  initialCourses?: TrainingCourse[];
  initialMembers: TrainingMember[];
  initialContracts: TrainingContract[];
  initialExpenses: TrainingFundExpense[];
  initialStats: {
    totalSessions: number;
    totalMembers: number;
    totalTokens: number;
    totalRewards: number;
  };
}

export default function TrainingManagement({
  initialLogs,
  initialCourses,
  initialMembers,
  initialContracts,
  initialExpenses,
  initialStats,
}: TrainingManagementProps) {
  const [logs, setLogs] = useState<TrainingLog[]>(initialLogs);
  const [courses] = useState<TrainingCourse[]>(
    initialCourses && initialCourses.length > 0
      ? initialCourses
      : [
          { course_code: 'TR001', course_name: 'Đào tạo Prosale mới', training_type: 'Offline', token_value: 120, budget: 600000 },
          { course_code: 'TR002', course_name: 'Đào tạo prosale mới', training_type: 'Online', token_value: 100, budget: 500000 },
          { course_code: 'TR003', course_name: 'ĐT Chuyên sâu – Buổi 1 (Nguồn vốn)', training_type: 'Online', token_value: 50, budget: 250000 },
          { course_code: 'TR004', course_name: 'ĐT chuyên sâu – Buổi 2 (Lữ hành)', training_type: 'Online', token_value: 50, budget: 250000 },
          { course_code: 'TR005', course_name: 'ĐT chuyển sâu – Buổi 3 (Welink)', training_type: 'Online', token_value: 50, budget: 250000 },
          { course_code: 'TR006', course_name: 'ĐT Mô hình Welink', training_type: 'Offline', token_value: 100, budget: 500000 },
        ]
  );
  const [stats, setStats] = useState(initialStats);
  const [activeView, setActiveView] = useState<'sessions' | 'ledger'>('sessions');
  const [selectedYear, setSelectedYear] = useState(Number(new Date().getFullYear()));
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedWeek, setSelectedWeek] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [isExporting, setIsExporting] = useState(false);
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
    token_count: 0,
    approver: '',
    status: 'Đã duyệt',
  });

  const memberByName = useMemo(() => new Map(
    initialMembers.map((member) => [member.full_name.trim().toLocaleLowerCase('vi-VN'), member])
  ), [initialMembers]);
  const sessionCodePreview = useMemo(() => {
    const existing = logs.find((log) => log.training_date === formData.training_date);
    if (existing) return existing.session_code;
    const latestSequence = logs.reduce((max, log) => {
      const match = log.session_code.match(/^TR(\d+)$/i);
      return match ? Math.max(max, Number(match[1])) : max;
    }, 0);
    return `TR${String(latestSequence + 1).padStart(3, '0')}`;
  }, [formData.training_date, logs]);

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
        body: JSON.stringify({ ...formData, session_code: sessionCodePreview }),
      });
      const data = await res.json();
      if (data.success) {
        showToast('success', 'Đã lưu lượt tham gia đào tạo.');
        setIsAddModalOpen(false);
        // Refresh logs
        const refRes = await fetch('/api/admin/training-logs');
        const refData = await refRes.json();
        if (!refRes.ok || !refData.success) {
          throw new Error(refData.message || 'Đã lưu nhưng không thể tải lại nhật ký đào tạo');
        }
        setLogs(refData.logs);
        setStats(refData.stats);
      } else {
        showToast('error', data.message || 'Lỗi khi thêm buổi học');
      }
    } catch (error) {
      showToast('error', error instanceof Error ? error.message : 'Lỗi kết nối máy chủ');
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
        const refreshed = await fetch('/api/admin/training-logs');
        const refreshedData = await refreshed.json();
        if (!refreshed.ok || !refreshedData.success) {
          throw new Error(refreshedData.message || 'Không thể tải lại danh sách đào tạo');
        }
        setLogs(refreshedData.logs);
        setStats(refreshedData.stats);
      } else {
        showToast('error', data.message || 'Lỗi khi xóa');
      }
    } catch (error) {
      showToast('error', error instanceof Error ? error.message : 'Lỗi kết nối');
    }
  };

  // Export to Excel compatible with 7. Lịch Đào tạo
  const handleExportExcel = async () => {
    try {
      setIsExporting(true);
      const params = new URLSearchParams();
      if (searchQuery.trim()) params.append('search', searchQuery.trim());
      if (selectedDate) params.append('date', selectedDate);

      const res = await fetch(`/api/admin/training-logs/export?${params.toString()}`);
      if (!res.ok) {
        const errJson = await res.json().catch(() => null);
        throw new Error(errJson?.error || 'Không thể tạo file báo cáo Excel');
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Bao_cao_lich_dao_tao_${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      showToast('success', 'Đã xuất file Excel tab "7. Lịch Đào tạo" thành công!');
    } catch (err: any) {
      console.error(err);
      showToast('error', err.message || 'Lỗi khi tải file báo cáo');
    } finally {
      setIsExporting(false);
    }
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

      const matchDate = !selectedDate || l.training_date === selectedDate;

      return matchSearch && matchDate;
    });
  }, [logs, searchQuery, selectedDate]);

  const sessions = useMemo(() => {
    const grouped = new Map<string, {
      key: string;
      code: string;
      date: string;
      name: string;
      budget: number;
      tokenTotal: number;
      members: TrainingLog[];
    }>();
    for (const log of filteredLogs) {
      const key = `${log.training_date || ''}:${log.session_code}`;
      const session = grouped.get(key) || {
        key,
        code: log.session_code,
        date: log.training_date || '',
        name: log.session_name || '',
        budget: 0,
        tokenTotal: 0,
        members: [],
      };
      session.tokenTotal += log.token_count;
      session.budget = session.tokenTotal * 5000;
      session.members.push(log);
      grouped.set(key, session);
    }
    return Array.from(grouped.values()).sort((a, b) => b.date.localeCompare(a.date) || a.code.localeCompare(b.code));
  }, [filteredLogs]);

  const totalPages = Math.max(1, Math.ceil(sessions.length / itemsPerPage));
  const paginatedSessions = sessions.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('vi-VN').format(Math.round(val || 0)) + ' đ';
  };

  const monthKey = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}`;
  const dateRange = useMemo(() => getMonthWeekRange(monthKey, selectedWeek), [monthKey, selectedWeek]);
  const periodContracts = useMemo(
    () => initialContracts.filter((contract) => contract.contract_date >= dateRange.start && contract.contract_date <= dateRange.endInclusive),
    [dateRange, initialContracts]
  );
  const periodLogs = useMemo(
    () => logs.filter((log) => (log.training_date || '') >= dateRange.start && (log.training_date || '') <= dateRange.endInclusive && log.status === 'Đã duyệt'),
    [dateRange, logs]
  );
  const periodExpenses = useMemo(
    () => initialExpenses.filter((expense) => expense.expense_date.slice(0, 10) >= dateRange.start && expense.expense_date.slice(0, 10) <= dateRange.endInclusive),
    [dateRange, initialExpenses]
  );
  const incomingTotal = periodContracts.reduce((sum, contract) => sum + Math.round(contract.allocation_base * 0.003), 0);
  const contractSalesTotal = periodContracts.reduce((sum, contract) => sum + contract.allocation_base, 0);
  const outgoingTotal = periodLogs.reduce((sum, log) => sum + log.reward_amount, 0)
    + periodExpenses.reduce((sum, expense) => sum + expense.amount, 0);
  const ledgerOutgoingRows = useMemo(() => {
    const beforeRange = initialContracts
      .filter((contract) => contract.contract_date < dateRange.start)
      .reduce((sum, contract) => sum + Math.round(contract.allocation_base * 0.003), 0)
      - logs.filter((log) => (log.training_date || '') < dateRange.start && log.status === 'Đã duyệt')
        .reduce((sum, log) => sum + log.reward_amount, 0)
      - initialExpenses.filter((expense) => expense.expense_date.slice(0, 10) < dateRange.start)
        .reduce((sum, expense) => sum + expense.amount, 0);
    const movements = [
      ...periodContracts.map((contract) => ({
        date: contract.contract_date,
        amount: Math.round(contract.allocation_base * 0.003),
        kind: 'income' as const,
        title: '',
        key: `income-${contract.contract_code}-${contract.contract_date}`,
      })),
      ...periodLogs.map((log) => ({
        date: log.training_date || '',
        amount: log.reward_amount,
        kind: 'expense' as const,
        title: `${log.session_code} · ${log.member_name}`,
        key: `training-${log.id}`,
      })),
      ...periodExpenses.map((expense) => ({
        date: expense.expense_date.slice(0, 10),
        amount: expense.amount,
        kind: 'expense' as const,
        title: expense.detail_content,
        key: `expense-${expense.id}`,
      })),
    ].sort((a, b) => a.date.localeCompare(b.date) || (a.kind === b.kind ? a.key.localeCompare(b.key) : a.kind === 'income' ? -1 : 1));
    let runningBalance = beforeRange;
    const rows: Array<{ date: string; title: string; amount: number; balanceAfter: number; key: string }> = [];
    for (const movement of movements) {
      runningBalance += movement.kind === 'income' ? movement.amount : -movement.amount;
      if (movement.kind === 'expense') {
        rows.push({ ...movement, balanceAfter: runningBalance });
      }
    }
    return rows;
  }, [dateRange.start, initialContracts, initialExpenses, logs, periodContracts, periodExpenses, periodLogs]);
  const balance = initialContracts
    .filter((contract) => contract.contract_date <= dateRange.endInclusive)
    .reduce((sum, contract) => sum + Math.round(contract.allocation_base * 0.003), 0)
    - logs.filter((log) => (log.training_date || '') <= dateRange.endInclusive && log.status === 'Đã duyệt')
      .reduce((sum, log) => sum + log.reward_amount, 0)
    - initialExpenses.filter((expense) => expense.expense_date.slice(0, 10) <= dateRange.endInclusive)
      .reduce((sum, expense) => sum + expense.amount, 0);

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
              Quản lý buổi học, token thực nhận và Quỹ đào tạo
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900">
        Quy chuẩn quy đổi cố định: <strong>1 Token = 5.000 VNĐ</strong> · Thù lao thực nhận = Số Token × 5.000 VNĐ.
      </div>

      <nav aria-label="Chức năng quỹ đào tạo" className="grid gap-2 sm:grid-cols-2">
        <button type="button" role="tab" aria-selected={activeView === 'sessions'} onClick={() => setActiveView('sessions')}
          className={`rounded-xl border px-4 py-3 text-left text-sm font-semibold ${activeView === 'sessions' ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-200 bg-white text-slate-700'}`}>
          Danh sách buổi học (Tổng quan)
        </button>
        <button type="button" role="tab" aria-selected={activeView === 'ledger'} onClick={() => setActiveView('ledger')}
          className={`rounded-xl border px-4 py-3 text-left text-sm font-semibold ${activeView === 'ledger' ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-200 bg-white text-slate-700'}`}>
          Nhật ký thu chi quỹ đào tạo
        </button>
      </nav>

      {activeView === 'ledger' && (
        <section className="space-y-4">
          <AdminTimeFilter
            selectedYear={selectedYear}
            onYearChange={setSelectedYear}
            selectedMonth={selectedMonth}
            onMonthChange={(month) => { if (month !== 'all') setSelectedMonth(month); }}
            selectedWeek={selectedWeek}
            onWeekChange={setSelectedWeek}
          />
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <article className="rounded-xl border border-slate-200 bg-white p-4"><h2 className="text-xs font-semibold text-slate-500">{selectedWeek ? 'Doanh số HĐ tuần' : 'Doanh số HĐ tháng'}</h2><p className="mt-2 text-xl font-extrabold text-blue-700">{formatCurrency(contractSalesTotal)}</p></article>
            <article className="rounded-xl border border-slate-200 bg-white p-4"><h2 className="text-xs font-semibold text-slate-500">Tổng tiền vào (Thu)</h2><p className="mt-2 text-xl font-extrabold text-emerald-700">{formatCurrency(incomingTotal)}</p></article>
            <article className="rounded-xl border border-slate-200 bg-white p-4"><h2 className="text-xs font-semibold text-slate-500">Đã thực chi thực tế</h2><p className="mt-2 text-xl font-extrabold text-rose-700">{formatCurrency(outgoingTotal)}</p></article>
            <article className="rounded-xl border border-slate-200 bg-white p-4"><h2 className="text-xs font-semibold text-slate-500">Tồn quỹ đào tạo sau cộng</h2><p className="mt-2 text-xl font-extrabold text-indigo-700">{formatCurrency(balance)}</p></article>
          </div>
          <div className="grid gap-4 xl:grid-cols-2">
            <section className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
              <h2 className="p-4 text-sm font-bold">Dòng tiền vào · 0,3% hợp đồng đã duyệt</h2>
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50"><tr><th className="p-3">Ngày chốt</th><th className="p-3">Mã HĐ</th><th className="p-3">Khách hàng</th><th className="p-3 text-right">Căn cứ phân bổ</th><th className="p-3 text-right">Thu 0,3%</th></tr></thead>
                <tbody className="divide-y divide-slate-100">
                  {periodContracts.map((contract, index) => (
                    <tr key={`${contract.contract_code || contract.contract_date}-${index}`}>
                      <td className="p-3">{contract.contract_date}</td><td className="p-3">{contract.contract_code || '—'}</td><td className="p-3">{contract.customer_name}</td>
                      <td className="p-3 text-right">{formatCurrency(contract.allocation_base)}</td><td className="p-3 text-right font-semibold text-emerald-700">{formatCurrency(Math.round(contract.allocation_base * 0.003))}</td>
                    </tr>
                  ))}
                  {periodContracts.length === 0 && <tr><td colSpan={5} className="p-6 text-center text-slate-500">Không có hợp đồng đã duyệt trong kỳ.</td></tr>}
                </tbody>
              </table>
            </section>
            <section className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
              <h2 className="p-4 text-sm font-bold">Dòng tiền ra · Ngày thực chi</h2>
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50"><tr><th className="p-3">Ngày</th><th className="p-3">Khoản chi</th><th className="p-3 text-right">Đã thực chi</th><th className="p-3 text-right">Tồn quỹ sau cộng</th></tr></thead>
                <tbody className="divide-y divide-slate-100">
                  {ledgerOutgoingRows.map((expense) => (
                    <tr key={expense.key}><td className="p-3">{expense.date}</td><td className="p-3">{expense.title}</td><td className="p-3 text-right">{formatCurrency(expense.amount)}</td><td className="p-3 text-right font-semibold">{formatCurrency(expense.balanceAfter)}</td></tr>
                  ))}
                  {ledgerOutgoingRows.length === 0 && <tr><td colSpan={4} className="p-6 text-center text-slate-500">Không có khoản chi trong kỳ.</td></tr>}
                </tbody>
              </table>
            </section>
          </div>
        </section>
      )}

      {activeView === 'sessions' && <>
      {/* Top 4 Stat Cards */}
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
                  {stats.totalSessions}
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
                  {stats.totalMembers}
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
                  {stats.totalTokens.toLocaleString('vi-VN')}
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
                  {formatCurrency(stats.totalRewards)}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-4 flex items-center rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm font-semibold text-amber-900">
          Thù lao mỗi người được tính độc lập: số token thực nhận × 5.000 VNĐ.
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
              {/* Nút Xuất Báo Cáo Excel */}
              <button
                type="button"
                onClick={handleExportExcel}
                disabled={isExporting}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer disabled:opacity-50"
              >
                <Download className="w-3.5 h-3.5" />
                <span>{isExporting ? 'Đang xuất...' : 'Xuất Báo Cáo Excel'}</span>
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
                    <th className="py-3.5 px-3 text-center">STT</th>
                    <th className="py-3.5 px-3">Mã buổi học</th>
                    <th className="py-3.5 px-3">Ngày học</th>
                    <th className="py-3.5 px-3">Tên buổi học</th>
                    <th className="py-3.5 px-3 text-right">Ngân sách buổi</th>
                    <th className="py-3.5 px-3">Người tham gia · Token · Thù lao</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paginatedSessions.map((session, idx) => (
                    <tr key={session.key} className="align-top hover:bg-slate-50/60">
                      <td className="py-3 px-3 text-center text-slate-400">{(currentPage - 1) * itemsPerPage + idx + 1}</td>
                      <td className="py-3 px-3"><span className="rounded-md border border-blue-200 bg-blue-50 px-2 py-0.5 font-bold text-blue-700">{session.code}</span></td>
                      <td className="py-3 px-3 whitespace-nowrap">{session.date ? session.date.split('-').reverse().join('/') : '—'}</td>
                      <td className="py-3 px-3 font-semibold">{session.name || '—'}</td>
                      <td className="py-3 px-3 text-right font-mono">{formatCurrency(session.budget)}</td>
                      <td className="py-3 px-3">
                        <div className="space-y-1.5">
                          {session.members.map((log) => (
                            <div key={log.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-slate-50 px-2 py-1.5">
                              <span className="font-medium">{log.member_name} <span className="text-slate-500">({log.member_phone || '—'})</span></span>
                              <span>{log.token_count} token · <strong className="text-emerald-700">{formatCurrency(log.token_count * 5000)}</strong></span>
                              <button type="button" onClick={() => handleDeleteLog(log.id)} aria-label={`Xóa ${log.member_name}`} className="text-rose-600 hover:text-rose-800"><Trash2 className="h-3.5 w-3.5" /></button>
                            </div>
                          ))}
                          <p className="text-right font-bold text-slate-700">Tổng: {session.tokenTotal} token · {formatCurrency(session.tokenTotal * 5000)}</p>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {sessions.length === 0 && (
                <div className="p-12 text-center text-slate-400">
                  Không tìm thấy buổi học đào tạo nào phù hợp.
                </div>
              )}
            </div>

            {/* Pagination footer */}
            <div className="p-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <div>
                Hiển thị {sessions.length ? (currentPage - 1) * itemsPerPage + 1 : 0} –{' '}
                {Math.min(currentPage * itemsPerPage, sessions.length)} trong tổng số {sessions.length} buổi
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

          {/* Widget 2: DANH MỤC BUỔI ĐÀO TẠO & NGÂN SÁCH CỐ ĐỊNH */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5 text-blue-600" />
                <span className="tracking-tight uppercase">Danh mục buổi đào tạo</span>
              </span>
              <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                {courses.length} Buổi • 470 Token
              </span>
            </div>

            <div className="space-y-2">
              {courses.map((crs) => (
                <div
                  key={crs.course_code}
                  onClick={() => setSearchQuery(searchQuery === crs.course_code ? '' : crs.course_code)}
                  className={`p-2.5 rounded-xl border transition cursor-pointer ${
                    searchQuery === crs.course_code
                      ? 'border-blue-500 bg-blue-50/70 shadow-xs'
                      : 'border-slate-100 bg-slate-50/70 hover:bg-slate-100/70'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800">
                      {crs.course_code}
                    </span>
                    <span
                      className={`text-[9px] px-1.5 py-0.5 rounded font-semibold ${
                        crs.training_type === 'Online'
                          ? 'bg-amber-100 text-amber-800 border border-amber-200'
                          : 'bg-indigo-100 text-indigo-800 border border-indigo-200'
                      }`}
                    >
                      {crs.training_type}
                    </span>
                  </div>
                  <h4 className="font-bold text-[11px] text-slate-800 leading-tight truncate" title={crs.course_name}>
                    {crs.course_name}
                  </h4>
                  <div className="flex items-center justify-between text-[10px] text-slate-500 mt-1.5">
                    <span className="font-medium text-slate-600">{crs.token_value} Token</span>
                    <span className="font-bold text-slate-800 font-mono">
                      {formatCurrency(crs.budget)}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="w-full text-center text-[11px] text-blue-600 font-semibold hover:underline cursor-pointer pt-1"
              >
                Xóa lọc ({searchQuery})
              </button>
            )}
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
      </>}

      {/* Modal: Thêm buổi học đào tạo (Hình 15) */}
      {activeView === 'sessions' && isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div>
                <h3 className="font-bold text-base text-slate-900">Thêm chấm công đào tạo</h3>
                <p className="text-xs text-slate-400">
                  Nhập token thực nhận; thù lao tự tính theo mức 5.000 VNĐ/token.
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
                    value={sessionCodePreview}
                    readOnly
                    disabled
                    className="w-full cursor-not-allowed rounded-xl border border-slate-200 bg-slate-100 px-3 py-2 font-bold uppercase text-slate-500"
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
                    list="training-member-options"
                    value={formData.member_name}
                    onChange={(e) => {
                      const name = e.target.value;
                      const member = memberByName.get(name.trim().toLocaleLowerCase('vi-VN'));
                      setFormData({ ...formData, member_name: name, member_phone: member?.phone || '' });
                    }}
                    placeholder="Tìm và chọn nhân sự"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium"
                  />
                  <datalist id="training-member-options">
                    {initialMembers.map((member) => <option key={`${member.full_name}-${member.phone}`} value={member.full_name} />)}
                  </datalist>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Số điện thoại</label>
                  <input
                    type="text"
                    value={formData.member_phone}
                    readOnly
                    placeholder="0912 345 671"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Số Token thực nhận *</label>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    required
                    value={formData.token_count || ''}
                    onChange={(e) => setFormData({ ...formData, token_count: Number(e.target.value) || 0 })}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-center font-bold"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Người duyệt</label>
                  <input
                    type="text"
                    list="training-approver-options"
                    value={formData.approver}
                    onChange={(e) => setFormData({ ...formData, approver: e.target.value })}
                    placeholder="Tìm và chọn người duyệt"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 font-medium"
                  />
                  <datalist id="training-approver-options">
                    {initialMembers.map((member) => <option key={`approver-${member.full_name}-${member.phone}`} value={member.full_name} />)}
                  </datalist>
                </div>
              </div>

              <div className="rounded-xl border border-blue-100 bg-blue-50/70 p-3 text-[11px] text-blue-800">
                Thù lao lượt này: <strong>{formatCurrency(formData.token_count * 5000)}</strong>. Tổng token và ngân sách của buổi học sẽ được cập nhật tự động.
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
