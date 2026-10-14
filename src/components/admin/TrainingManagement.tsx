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
  course_code: string | null;
  session_name?: string;
  member_phone?: string;
  member_name: string;
  approver?: string | null;
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
  initialCourses: TrainingCourse[];
  initialMembers: TrainingMember[];
  initialContracts: TrainingContract[];
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
  initialStats,
}: TrainingManagementProps) {
  const [logs, setLogs] = useState<TrainingLog[]>(initialLogs);
  const [stats, setStats] = useState(initialStats);
  const [activeView, setActiveView] = useState<'sessions' | 'ledger'>('sessions');
  const [selectedYear, setSelectedYear] = useState(Number(new Date().getFullYear()));
  const [selectedMonth, setSelectedMonth] = useState<number | 'all'>('all');
  const [selectedWeek, setSelectedWeek] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [isExporting, setIsExporting] = useState(false);
  const itemsPerPage = 10;
  const periodLabel = selectedMonth === 'all' ? 'toàn bộ dữ liệu' : selectedWeek ? 'theo tuần' : 'theo tháng';

  // Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isAddCourseOpen, setIsAddCourseOpen] = useState(false);
  const [isSavingCourse, setIsSavingCourse] = useState(false);
  const [editingCourse, setEditingCourse] = useState<TrainingCourse | null>(null);
  const [deletingCourseCode, setDeletingCourseCode] = useState<string | null>(null);
  const [updatingStatusId, setUpdatingStatusId] = useState<number | null>(null);
  const [courses, setCourses] = useState(initialCourses);
  const [courseSearch, setCourseSearch] = useState('');
  const [isCourseDropdownOpen, setIsCourseDropdownOpen] = useState(false);
  const [editingLog, setEditingLog] = useState<TrainingLog | null>(null);
  const [viewingLog, setViewingLog] = useState<TrainingLog | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const showToast = (type: 'success' | 'error', text: string) => {
    setToastMessage({ type, text });
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Form State
  const [formData, setFormData] = useState({
    session_code: 'TR001',
    course_code: '',
    session_name: '',
    training_date: new Date().toISOString().split('T')[0],
    session_budget: 3500000,
    member_name: '',
    member_phone: '',
    token_count: 0,
    approver: '',
    status: 'Chờ duyệt',
  });
  const [courseForm, setCourseForm] = useState({
    course_name: '',
    training_type: 'Offline',
    token_value: 50,
    budget: 250000,
  });

  const memberByName = useMemo(() => new Map(
    initialMembers.map((member) => [member.full_name.trim().toLocaleLowerCase('vi-VN'), member])
  ), [initialMembers]);
  const selectedCourse = courses.find((course) => course.course_code === formData.course_code);
  const filteredCourses = courses.filter((course) => {
    const query = courseSearch.trim().toLocaleLowerCase('vi-VN');
    return !query || `${course.course_code} ${course.course_name} ${course.training_type}`.toLocaleLowerCase('vi-VN').includes(query);
  });
  const nextCourseCode = useMemo(() => {
    const latestNumber = courses.reduce((latest, course) => {
      const match = course.course_code.match(/^TR(\d+)$/i);
      return match ? Math.max(latest, Number(match[1])) : latest;
    }, 0);
    return `TR${String(latestNumber + 1).padStart(3, '0')}`;
  }, [courses]);
  const monthKey = `${selectedYear}-${String(selectedMonth === 'all' ? 1 : selectedMonth).padStart(2, '0')}`;
  const dateRange = useMemo(() => selectedMonth === 'all'
    ? { start: '0001-01-01', endInclusive: '9999-12-31' }
    : getMonthWeekRange(monthKey, selectedWeek), [monthKey, selectedMonth, selectedWeek, selectedYear]);
  const sessionCodePreview = useMemo(() => {
    const existing = logs.find((log) => log.training_date === formData.training_date && log.course_code === formData.course_code);
    if (existing) return existing.session_code;
    const latestSequence = logs.reduce((max, log) => {
      const match = log.session_code.match(/^TR(\d+)$/i);
      return match ? Math.max(max, Number(match[1])) : max;
    }, 0);
    return `TR${String(latestSequence + 1).padStart(3, '0')}`;
  }, [formData.course_code, formData.training_date, logs]);

  const handleSaveLog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.member_name.trim()) {
      showToast('error', 'Vui lòng nhập họ tên nhân sự');
      return;
    }
    if (!formData.course_code) {
      showToast('error', 'Vui lòng tìm và chọn khóa học từ danh mục');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/admin/training-logs', {
        method: editingLog ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          session_code: sessionCodePreview,
          ...(editingLog ? { id: editingLog.id } : {}),
        }),
      });
      const data = await res.json();
      if (data.success) {
        showToast('success', editingLog ? 'Đã cập nhật lượt đào tạo.' : 'Đã lưu lượt tham gia đào tạo.');
        setIsAddModalOpen(false);
        setEditingLog(null);
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

  const handleStatusChange = async (log: TrainingLog, status: string) => {
    if (status === log.status) return;
    setUpdatingStatusId(log.id);
    try {
      const response = await fetch('/api/admin/training-logs', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: log.id, status }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.message || 'Không thể cập nhật trạng thái lượt đào tạo.');
      }
      setLogs((current) => current.map((item) => item.id === log.id ? { ...item, status } : item));
      showToast('success', 'Đã cập nhật trạng thái duyệt.');
    } catch (error) {
      showToast('error', error instanceof Error ? error.message : 'Lỗi kết nối máy chủ');
    } finally {
      setUpdatingStatusId(null);
    }
  };

  const openEditLog = (log: TrainingLog) => {
    setEditingLog(log);
    const selected = courses.find((course) => course.course_code === log.course_code);
    setCourseSearch(selected ? `${selected.course_code} - ${selected.course_name}` : '');
    setFormData({
      session_code: log.session_code,
      course_code: log.course_code || '',
      session_name: selected?.course_name || log.session_name || '',
      training_date: log.training_date || new Date().toISOString().split('T')[0],
      session_budget: log.session_budget,
      member_name: log.member_name,
      member_phone: log.member_phone || '',
      token_count: log.token_count,
      approver: log.approver || '',
      status: log.status,
    });
    setIsAddModalOpen(true);
  };

  const openAddLog = () => {
    setEditingLog(null);
    setCourseSearch('');
    setFormData({
      session_code: 'TR001',
      course_code: '',
      session_name: '',
      training_date: new Date().toISOString().split('T')[0],
      session_budget: 3500000,
      member_name: '',
      member_phone: '',
      token_count: 0,
      approver: '',
      status: 'Chờ duyệt',
    });
    setIsAddModalOpen(true);
  };

  const handleSaveCourse = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSavingCourse(true);
    try {
      const response = await fetch('/api/admin/training-courses', {
        method: editingCourse ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...courseForm,
          ...(editingCourse ? { course_code: editingCourse.course_code } : {}),
        }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.message || 'Không thể lưu khóa học');
      }
      setCourses((current) => (
        editingCourse
          ? current.map((course) => course.course_code === result.course.course_code ? result.course : course)
          : [...current, result.course]
      ).sort((a, b) => a.course_code.localeCompare(b.course_code)));
      if (editingCourse) {
        setLogs((current) => current.map((log) => log.course_code === result.course.course_code
          ? { ...log, session_name: result.course.course_name, session_budget: result.course.budget }
          : log));
      }
      setCourseForm({ course_name: '', training_type: 'Offline', token_value: 50, budget: 250000 });
      setEditingCourse(null);
      setIsAddCourseOpen(false);
      showToast('success', editingCourse ? 'Đã cập nhật khóa học.' : 'Đã thêm khóa học vào danh mục.');
    } catch (error) {
      showToast('error', error instanceof Error ? error.message : 'Lỗi kết nối máy chủ');
    } finally {
      setIsSavingCourse(false);
    }
  };

  const openCourseEditor = (course: TrainingCourse) => {
    setEditingCourse(course);
    setCourseForm({
      course_name: course.course_name,
      training_type: course.training_type,
      token_value: course.token_value,
      budget: course.budget,
    });
    setIsAddCourseOpen(true);
  };

  const handleDeleteCourse = async (course: TrainingCourse) => {
    if (!confirm(`Bạn có chắc chắn muốn xóa khóa học ${course.course_code} - ${course.course_name}?`)) return;
    setDeletingCourseCode(course.course_code);
    try {
      const response = await fetch(`/api/admin/training-courses?course_code=${encodeURIComponent(course.course_code)}`, {
        method: 'DELETE',
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.message || 'Không thể xóa khóa học.');
      }
      setCourses((current) => current.filter((item) => item.course_code !== course.course_code));
      showToast('success', 'Đã xóa khóa học khỏi danh mục.');
    } catch (error) {
      showToast('error', error instanceof Error ? error.message : 'Lỗi kết nối máy chủ');
    } finally {
      setDeletingCourseCode(null);
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

      const matchDate = Boolean(l.training_date)
        && l.training_date! >= dateRange.start
        && l.training_date! <= dateRange.endInclusive
        && (!selectedDate || l.training_date === selectedDate);

      return matchSearch && matchDate;
    });
  }, [dateRange.endInclusive, dateRange.start, logs, searchQuery, selectedDate]);

  const trainingRows = useMemo(
    () => [...filteredLogs].sort((a, b) => (a.training_date || '').localeCompare(b.training_date || '') || a.id - b.id),
    [filteredLogs]
  );
  const totalPages = Math.max(1, Math.ceil(trainingRows.length / itemsPerPage));
  const paginatedTrainingRows = trainingRows.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('vi-VN').format(Math.round(val || 0)) + ' đ';
  };

  const periodContracts = useMemo(
    () => initialContracts.filter((contract) => contract.contract_date >= dateRange.start && contract.contract_date <= dateRange.endInclusive),
    [dateRange, initialContracts]
  );
  const periodLogs = useMemo(
    () => logs.filter((log) => (log.training_date || '') >= dateRange.start && (log.training_date || '') <= dateRange.endInclusive && log.status === 'Đã duyệt'),
    [dateRange, logs]
  );
  const incomingTotal = periodContracts.reduce((sum, contract) => sum + Math.round(contract.allocation_base * 0.003), 0);
  const contractSalesTotal = periodContracts.reduce((sum, contract) => sum + contract.allocation_base, 0);
  const trainingFundTotal = incomingTotal;
  const outgoingTotal = periodLogs.reduce((sum, log) => sum + log.reward_amount, 0);
  const fundUsagePercent = trainingFundTotal > 0
    ? Math.min(100, Math.round((outgoingTotal / trainingFundTotal) * 100))
    : 0;
  const remainingFund = trainingFundTotal - outgoingTotal;
  const balance = remainingFund;

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
            onMonthChange={(month) => { setSelectedMonth(month); setSelectedWeek(0); }}
            allowAllMonths
            selectedWeek={selectedWeek}
            onWeekChange={setSelectedWeek}
          />
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <article className="rounded-xl border border-slate-200 bg-white p-4"><h2 className="text-xs font-semibold text-slate-500">Doanh số HĐ · {periodLabel}</h2><p className="mt-2 text-xl font-extrabold text-blue-700">{formatCurrency(contractSalesTotal)}</p></article>
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
                <tfoot className="border-t border-slate-200 bg-slate-50 font-bold">
                  <tr><td className="p-3" colSpan={3}>Tổng thu 0,3%</td><td className="p-3 text-right">{formatCurrency(contractSalesTotal)}</td><td className="p-3 text-right text-emerald-700">{formatCurrency(incomingTotal)}</td></tr>
                </tfoot>
              </table>
            </section>
            <section className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
              <h2 className="p-4 text-sm font-bold">Chi phí buổi đào tạo · {periodLabel}</h2>
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50"><tr><th className="p-3">Ngày học</th><th className="p-3">Tên buổi học</th><th className="p-3">Người tham gia</th><th className="p-3 text-right">Token</th><th className="p-3 text-right">Thù lao thực nhận</th></tr></thead>
                <tbody className="divide-y divide-slate-100">
                  {periodLogs.map((log) => (
                    <tr key={log.id}>
                      <td className="p-3 whitespace-nowrap">{log.training_date ? log.training_date.split('-').reverse().join('/') : '—'}</td>
                      <td className="p-3">{log.session_name || log.session_code}</td>
                      <td className="p-3">{log.member_name}</td>
                      <td className="p-3 text-right">{new Intl.NumberFormat('vi-VN').format(log.token_count)}</td>
                      <td className="p-3 text-right">{formatCurrency(log.reward_amount)}</td>
                    </tr>
                  ))}
                  {periodLogs.length === 0 && <tr><td colSpan={5} className="p-6 text-center text-slate-500">Không có buổi đào tạo đã duyệt trong kỳ.</td></tr>}
                </tbody>
                <tfoot className="border-t border-slate-200 bg-slate-50 font-bold">
                  <tr><td className="p-3" colSpan={3}>Tổng thù lao</td><td className="p-3 text-right">{new Intl.NumberFormat('vi-VN').format(periodLogs.reduce((sum, log) => sum + log.token_count, 0))}</td><td className="p-3 text-right text-rose-700">{formatCurrency(periodLogs.reduce((sum, log) => sum + log.reward_amount, 0))}</td></tr>
                </tfoot>
              </table>
            </section>
          </div>
          <section className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
              <div className="flex flex-wrap items-center justify-between gap-3 p-4">
                <h2 className="text-sm font-bold">Dòng tiền ra · {periodLabel}</h2>
              </div>
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50"><tr><th className="p-3 text-right">Khoản chi</th><th className="p-3 text-right">Đã thực chi thực tế</th><th className="p-3 text-right">Tổng tồn quỹ sau cộng</th></tr></thead>
                <tbody className="divide-y divide-slate-100">
                  <tr>
                    <td className="p-3 text-right">{formatCurrency(incomingTotal)}</td>
                    <td className="p-3 text-right">{formatCurrency(outgoingTotal)}</td>
                    <td className={`p-3 text-right font-semibold ${balance >= 0 ? 'text-indigo-700' : 'text-rose-700'}`}>{formatCurrency(balance)}</td>
                  </tr>
                </tbody>
              </table>
          </section>
        </section>
      )}

      {activeView === 'sessions' && <>
      <AdminTimeFilter
        selectedYear={selectedYear}
        onYearChange={setSelectedYear}
        selectedMonth={selectedMonth}
        onMonthChange={(month) => { setSelectedMonth(month); setSelectedWeek(0); }}
        allowAllMonths
        selectedWeek={selectedWeek}
        onWeekChange={setSelectedWeek}
      />
      {/* Top 4 Stat Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* 4 Stat Cards (8 Cols on Desktop) */}
        <div className="lg:col-span-12 grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-3 sm:gap-4">
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
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
              <Calendar className="h-3.5 w-3.5 text-blue-600" />
              <span>Tổng quan quỹ đào tạo</span>
            </div>
            <div>
              <div className="flex items-baseline justify-between gap-2 text-xs text-slate-500">
                <span>0,3% doanh số HĐ:</span>
                <span className="font-extrabold text-slate-900">{formatCurrency(trainingFundTotal)}</span>
              </div>
              <div className="mt-2 flex h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
                <div className="h-full rounded-full bg-emerald-500" style={{ width: `${fundUsagePercent}%` }} />
              </div>
              <div className="mt-2 flex items-center justify-between gap-2 text-[11px]">
                <span className="text-slate-600">Đã thực chi: {formatCurrency(outgoingTotal)} ({fundUsagePercent}%)</span>
                <span className={`font-bold ${remainingFund >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                  Còn {formatCurrency(remainingFund)}
                </span>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* Main Content Area: Table (Left 9 cols) + Right Sidebar (Right 3 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left 9 Cols: Filters + Table */}
        <div className="lg:col-span-12 space-y-4">
          {/* Filter Bar (Hình 15) */}
          <div className="bg-white p-3 sm:p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            {/* Search */}
            <div className="relative flex-1 min-w-[200px]">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="Tìm mã khóa học, tên nhân sự, SĐT..."
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
                onClick={openAddLog}
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
                    <th className="py-3.5 px-3">Ngày học</th>
                    <th className="py-3.5 px-3">Mã khóa học</th>
                    <th className="py-3.5 px-3">Tên buổi học</th>
                    <th className="py-3.5 px-3 text-right">Ngân sách buổi</th>
                    <th className="py-3.5 px-3">Người tham gia</th>
                    <th className="py-3.5 px-3 text-right">Số token</th>
                    <th className="py-3.5 px-3 text-right">Tổng token buổi</th>
                    <th className="py-3.5 px-3 text-right">Thù lao thực nhận</th>
                    <th className="py-3.5 px-3">Trạng thái</th>
                    <th className="py-3.5 px-3 text-center">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paginatedTrainingRows.map((log, idx) => (
                    <tr key={log.id} className="align-top hover:bg-slate-50/60">
                      <td className="py-3 px-3 text-center text-slate-400">{(currentPage - 1) * itemsPerPage + idx + 1}</td>
                      <td className="py-3 px-3 whitespace-nowrap">{log.training_date ? log.training_date.split('-').reverse().join('/') : '—'}</td>
                      <td className="py-3 px-3 whitespace-nowrap font-mono">{log.course_code || '—'}</td>
                      <td className="py-3 px-3 font-semibold">{log.session_name || '—'}</td>
                      <td className="py-3 px-3 text-right font-mono">{formatCurrency(log.session_budget)}</td>
                      <td className="py-3 px-3"><span className="flex flex-col font-medium"><span>{log.member_name}</span><span className="text-slate-500">{log.member_phone || '—'}</span></span></td>
                      <td className="py-3 px-3 text-right">{log.token_count}</td>
                      <td className="py-3 px-3 text-right">{log.total_tokens}</td>
                      <td className="py-3 px-3 text-right font-semibold">{formatCurrency(log.reward_amount)}</td>
                      <td className="py-3 px-3">
                        <select
                          aria-label={`Trạng thái duyệt của ${log.member_name}`}
                          value={log.status}
                          disabled={updatingStatusId !== null}
                          onChange={(event) => void handleStatusChange(log, event.target.value)}
                          className={`rounded-lg border px-2 py-1 text-[11px] font-semibold disabled:cursor-wait disabled:opacity-60 ${
                            log.status === 'Đã duyệt'
                              ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                              : 'border-amber-200 bg-amber-50 text-amber-700'
                          }`}
                        >
                          <option value="Đã duyệt">Đã duyệt</option>
                          <option value="Chờ duyệt">Chờ duyệt</option>
                        </select>
                      </td>
                      <td className="py-2 px-3">
                        <div className="flex items-center justify-center gap-1">
                          <button type="button" onClick={() => setViewingLog(log)} aria-label={`Xem lượt đào tạo của ${log.member_name}`} title="Xem"
                            className="rounded-lg p-1.5 text-blue-600 hover:bg-blue-50">
                            <Eye className="h-4 w-4" />
                          </button>
                          <button type="button" onClick={() => openEditLog(log)} aria-label={`Sửa lượt đào tạo của ${log.member_name}`} title="Sửa"
                            className="rounded-lg p-1.5 text-amber-600 hover:bg-amber-50">
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button type="button" onClick={() => handleDeleteLog(log.id)} aria-label={`Xóa lượt đào tạo của ${log.member_name}`} title="Xóa"
                            className="rounded-lg p-1.5 text-rose-600 hover:bg-rose-50">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {trainingRows.length === 0 && (
                <div className="p-12 text-center text-slate-400">
                  Không tìm thấy buổi học đào tạo nào phù hợp.
                </div>
              )}
            </div>

            {/* Pagination footer */}
            <div className="p-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <div>
                Hiển thị {trainingRows.length ? (currentPage - 1) * itemsPerPage + 1 : 0} –{' '}
                {Math.min(currentPage * itemsPerPage, trainingRows.length)} trong tổng số {trainingRows.length} lượt tham gia
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

      </div>
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-4">
          <div>
            <h2 className="text-sm font-bold text-slate-900">Danh mục khóa học đào tạo</h2>
            <p className="mt-1 text-xs text-slate-500">Danh mục này được dùng trực tiếp khi ghi nhận lượt tham gia.</p>
          </div>
          <button type="button" onClick={() => {
            setEditingCourse(null);
            setCourseForm({ course_name: '', training_type: 'Offline', token_value: 50, budget: 250000 });
            setIsAddCourseOpen(true);
          }}
            className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-blue-700">
            <Plus className="h-3.5 w-3.5" />
            Thêm dữ liệu
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
              <tr>
                <th className="p-3">Mã khóa học</th>
                <th className="p-3">Tên khóa học</th>
                <th className="p-3">Hình thức</th>
                <th className="p-3 text-right">Giá trị token</th>
                <th className="p-3 text-right">Ngân sách</th>
                <th className="p-3 text-center">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {courses.map((course) => (
                <tr key={course.course_code}>
                  <td className="p-3 font-mono font-semibold">{course.course_code}</td>
                  <td className="p-3 font-medium">{course.course_name}</td>
                  <td className="p-3">{course.training_type}</td>
                  <td className="p-3 text-right">{new Intl.NumberFormat('vi-VN').format(course.token_value)}</td>
                  <td className="p-3 text-right">{formatCurrency(course.budget)}</td>
                  <td className="p-2">
                    <div className="flex items-center justify-center gap-1">
                      <button type="button" onClick={() => openCourseEditor(course)}
                        aria-label={`Sửa khóa học ${course.course_code}`} title="Sửa"
                        className="rounded-lg p-1.5 text-amber-600 hover:bg-amber-50">
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button type="button" onClick={() => void handleDeleteCourse(course)}
                        disabled={deletingCourseCode !== null} aria-label={`Xóa khóa học ${course.course_code}`} title="Xóa"
                        className="rounded-lg p-1.5 text-rose-600 hover:bg-rose-50 disabled:cursor-wait disabled:opacity-50">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {courses.length === 0 && <tr><td colSpan={6} className="p-6 text-center text-slate-500">Chưa có khóa học trong danh mục.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
      </>}

      {/* Modal: Thêm hoặc sửa lượt tham gia đào tạo */}
      {activeView === 'sessions' && isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div>
                <h3 className="font-bold text-base text-slate-900">{editingLog ? 'Sửa lượt đào tạo' : 'Thêm chấm công đào tạo'}</h3>
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

            <form onSubmit={handleSaveLog} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Mã Buổi học *</label>
                  <input
                    type="text"
                    value={editingLog ? editingLog.session_code : sessionCodePreview}
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

              <div className="relative">
                <label className="block font-semibold text-slate-700 mb-1">Tên khóa học *</label>
                <input
                  type="search"
                  role="combobox"
                  aria-expanded={isCourseDropdownOpen}
                  aria-controls="training-course-options"
                  aria-autocomplete="list"
                  required
                  value={courseSearch}
                  onFocus={() => setIsCourseDropdownOpen(true)}
                  onChange={(event) => {
                    setCourseSearch(event.target.value);
                    setIsCourseDropdownOpen(true);
                    setFormData({ ...formData, course_code: '', session_name: '', token_count: 0 });
                  }}
                  onBlur={() => window.setTimeout(() => setIsCourseDropdownOpen(false), 150)}
                  placeholder="Tìm theo mã hoặc tên khóa học"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2"
                />
                {isCourseDropdownOpen && (
                  <ul id="training-course-options" role="listbox" className="absolute z-20 mt-1 max-h-52 w-full overflow-y-auto rounded-xl border border-slate-200 bg-white p-1 shadow-lg">
                    {filteredCourses.map((course) => (
                      <li key={course.course_code} role="option" aria-selected={formData.course_code === course.course_code}>
                        <button
                          type="button"
                          onMouseDown={(event) => event.preventDefault()}
                          onClick={() => {
                            setFormData({
                              ...formData,
                              course_code: course.course_code,
                              session_name: course.course_name,
                              token_count: Number(course.token_value),
                            });
                            setCourseSearch(`${course.course_code} - ${course.course_name}`);
                            setIsCourseDropdownOpen(false);
                          }}
                          className="flex w-full items-start justify-between gap-3 rounded-lg px-3 py-2 text-left hover:bg-blue-50"
                        >
                          <span><strong>{course.course_code}</strong><span className="ml-2">{course.course_name}</span></span>
                          <span className="shrink-0 text-slate-500">{course.training_type}</span>
                        </button>
                      </li>
                    ))}
                    {filteredCourses.length === 0 && <li className="px-3 py-2 text-slate-500">Không tìm thấy khóa học phù hợp.</li>}
                  </ul>
                )}
                {selectedCourse && (
                  <p className="mt-1 text-[11px] text-slate-500">
                    Đã điền {selectedCourse.token_value} token theo khóa học · Ngân sách {formatCurrency(selectedCourse.budget)}
                  </p>
                )}
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

              <div>
                <label htmlFor="training-log-status" className="mb-1 block font-semibold text-slate-700">Trạng thái duyệt *</label>
                <select
                  id="training-log-status"
                  required
                  value={formData.status}
                  onChange={(event) => setFormData({ ...formData, status: event.target.value })}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2"
                >
                  <option value="Đã duyệt">Đã duyệt</option>
                  <option value="Chờ duyệt">Chờ duyệt</option>
                </select>
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
                  {isSubmitting ? 'Đang lưu...' : editingLog ? 'Lưu thay đổi' : 'Lưu buổi học'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {activeView === 'sessions' && isAddCourseOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <section role="dialog" aria-modal="true" aria-labelledby="training-course-title" className="w-full max-w-lg rounded-2xl border border-slate-100 bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-start justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 id="training-course-title" className="text-base font-bold text-slate-900">{editingCourse ? 'Sửa khóa học đào tạo' : 'Thêm khóa học đào tạo'}</h3>
                <p className="mt-1 text-xs text-slate-500">Khóa học được lưu vào danh mục và dùng ngay trong form chấm công.</p>
              </div>
              <button type="button" onClick={() => { setIsAddCourseOpen(false); setEditingCourse(null); }} aria-label="Đóng" className="rounded-lg p-1 text-slate-400 hover:bg-slate-100">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleSaveCourse} className="space-y-3 text-xs">
              <div>
                <label htmlFor="training-course-code" className="mb-1 block font-semibold text-slate-700">Mã khóa học *</label>
                <input id="training-course-code" required maxLength={50} value={editingCourse?.course_code || nextCourseCode} disabled
                  className="w-full cursor-not-allowed rounded-xl border border-slate-200 bg-slate-100 px-3 py-2 font-mono text-slate-500" />
              </div>
              <div>
                <label htmlFor="training-course-name" className="mb-1 block font-semibold text-slate-700">Tên khóa học *</label>
                <input id="training-course-name" required maxLength={255} value={courseForm.course_name}
                  onChange={(event) => setCourseForm({ ...courseForm, course_name: event.target.value })}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2" />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label htmlFor="training-course-type" className="mb-1 block font-semibold text-slate-700">Hình thức *</label>
                  <select id="training-course-type" value={courseForm.training_type}
                    onChange={(event) => setCourseForm({ ...courseForm, training_type: event.target.value })}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                    <option value="Offline">Offline</option>
                    <option value="Online">Online</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="training-course-tokens" className="mb-1 block font-semibold text-slate-700">Token *</label>
                  <input id="training-course-tokens" type="number" min="1" step="1" required value={courseForm.token_value}
                    onChange={(event) => setCourseForm({ ...courseForm, token_value: Number(event.target.value) })}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2" />
                </div>
                <div>
                  <label htmlFor="training-course-budget" className="mb-1 block font-semibold text-slate-700">Ngân sách *</label>
                  <input id="training-course-budget" type="number" min="0" step="1" required value={courseForm.budget}
                    onChange={(event) => setCourseForm({ ...courseForm, budget: Number(event.target.value) })}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2" />
                </div>
              </div>
              <div className="flex justify-end gap-2 border-t border-slate-100 pt-3">
                <button type="button" onClick={() => { setIsAddCourseOpen(false); setEditingCourse(null); }} className="rounded-xl border border-slate-200 px-4 py-2 font-semibold text-slate-700 hover:bg-slate-50">Hủy</button>
                <button type="submit" disabled={isSavingCourse} className="rounded-xl bg-blue-600 px-4 py-2 font-bold text-white hover:bg-blue-700 disabled:opacity-50">
                  {isSavingCourse ? 'Đang lưu...' : editingCourse ? 'Lưu thay đổi' : 'Thêm khóa học'}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}

      {activeView === 'sessions' && viewingLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs" onClick={() => setViewingLog(null)}>
          <section role="dialog" aria-modal="true" aria-labelledby="training-log-view-title" onClick={(event) => event.stopPropagation()}
            className="w-full max-w-lg rounded-2xl border border-slate-100 bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-start justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 id="training-log-view-title" className="text-base font-bold text-slate-900">Chi tiết lượt đào tạo</h3>
                <p className="mt-1 text-xs text-slate-500">{viewingLog.session_code}</p>
              </div>
              <button type="button" onClick={() => setViewingLog(null)} aria-label="Đóng" className="rounded-lg p-1 text-slate-400 hover:bg-slate-100">
                <X className="h-5 w-5" />
              </button>
            </div>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-4 text-xs">
              <div><dt className="text-slate-500">Mã khóa học</dt><dd className="mt-1 font-semibold text-slate-900">{viewingLog.course_code || '—'}</dd></div>
              <div><dt className="text-slate-500">Tên buổi học</dt><dd className="mt-1 font-semibold text-slate-900">{viewingLog.session_name || '—'}</dd></div>
              <div><dt className="text-slate-500">Ngày học</dt><dd className="mt-1 font-semibold text-slate-900">{viewingLog.training_date ? viewingLog.training_date.split('-').reverse().join('/') : '—'}</dd></div>
              <div><dt className="text-slate-500">Người tham gia</dt><dd className="mt-1 font-semibold text-slate-900">{viewingLog.member_name}</dd></div>
              <div><dt className="text-slate-500">Số điện thoại</dt><dd className="mt-1 font-semibold text-slate-900">{viewingLog.member_phone || '—'}</dd></div>
              <div><dt className="text-slate-500">Token thực nhận</dt><dd className="mt-1 font-semibold text-slate-900">{viewingLog.token_count}</dd></div>
              <div><dt className="text-slate-500">Tổng token buổi</dt><dd className="mt-1 font-semibold text-slate-900">{viewingLog.total_tokens}</dd></div>
              <div><dt className="text-slate-500">Ngân sách buổi</dt><dd className="mt-1 font-semibold text-slate-900">{formatCurrency(viewingLog.session_budget)}</dd></div>
              <div><dt className="text-slate-500">Thù lao thực nhận</dt><dd className="mt-1 font-semibold text-slate-900">{formatCurrency(viewingLog.reward_amount)}</dd></div>
              <div><dt className="text-slate-500">Người duyệt</dt><dd className="mt-1 font-semibold text-slate-900">{viewingLog.approver || '—'}</dd></div>
              <div><dt className="text-slate-500">Trạng thái</dt><dd className="mt-1 font-semibold text-slate-900">{viewingLog.status}</dd></div>
            </dl>
            <div className="mt-5 flex justify-end">
              <button type="button" onClick={() => setViewingLog(null)} className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50">Đóng</button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
