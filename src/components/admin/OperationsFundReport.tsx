'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import * as XLSX from 'xlsx';
import {
  Calendar,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Download,
  Layers,
  Plus,
  TrendingUp,
  Wallet,
  X,
} from 'lucide-react';
import type { TransactionLog, WeeklyAllocation } from '@/components/admin/TransactionLogManagement';
import { getMonthWeekRange, getPeriodWeekNo } from '@/lib/weekRanges';
import {
  getOperationsSupportFundKey,
  OPERATIONS_SUPPORT_FUND_RATE,
  OPERATIONS_SUPPORT_FUND_TYPES,
  type OperationsSupportFundKey,
} from '@/lib/operationsFunds';

type ContractFundBasis = {
  contract_date: string;
  allocation_base: number;
};

type Props = {
  logs: TransactionLog[];
  contracts: ContractFundBasis[];
  allocations: WeeklyAllocation[];
  initialMonth: string;
};

/** Các bộ phận cố định cho dropdown (Hình 7.6) */
const DEPARTMENT_OPTIONS = [
  'Tri ấn kết nối phó tổng',
  'Tổng điều hành',
  'Phó tổng',
  'Quỹ hỗ trợ & dự phòng (CN)',
  'Quỹ hỗ trợ & dự phòng (KT)',
] as const;

/** Loại quỹ cho dropdown trong modal */
const FUND_TYPE_OPTIONS = [
  { key: 'operations', label: 'Quỹ vận hành' },
  { key: 'support_cn', label: 'BP hỗ trợ CN' },
  { key: 'support_kt', label: 'BP hỗ trợ KT' },
] as const;

/** Cấu hình phân bổ theo bộ phận - dữ liệu chuẩn theo Hình 7.1, 7.2, 7.3 */
const ALLOCATION_ROWS = [
  {
    fundType: 'Quỹ vận hành',
    fundKey: 'operations' as OperationsSupportFundKey,
    department: 'Tri ấn kết nối phó tổng',
    phone: '000006',
    fullName: 'Nguyễn Thị Hương Thảo',
    bankAccount: '0965749223',
    bankName: 'Vpbank',
    weeklyRate: 0.005,
    monthlyRate: 0.005,
  },
  {
    fundType: 'Quỹ vận hành',
    fundKey: 'operations' as OperationsSupportFundKey,
    department: 'Tổng điều hành',
    phone: '000007',
    fullName: 'Đinh Văn Bắc',
    bankAccount: '19033903936017',
    bankName: 'Techcombank',
    weeklyRate: 0.005,
    monthlyRate: 0.005,
  },
  {
    fundType: 'Quỹ vận hành',
    fundKey: 'operations' as OperationsSupportFundKey,
    department: 'Phó tổng',
    phone: '0889225989',
    fullName: 'Vũ Thị Cúc',
    bankAccount: '2589225989',
    bankName: 'Techcombank',
    weeklyRate: 0.012,
    monthlyRate: 0.012,
  },
  {
    fundType: 'BP hỗ trợ CN',
    fundKey: 'support_cn' as OperationsSupportFundKey,
    department: 'Quỹ hỗ trợ & dự phòng (CN)',
    phone: '0343781580',
    fullName: 'Nguyễn Đăng An',
    bankAccount: '183093983',
    bankName: 'VP Bank',
    weeklyRate: 0.002,
    monthlyRate: 0.002,
  },
  {
    fundType: 'BP hỗ trợ KT',
    fundKey: 'support_kt' as OperationsSupportFundKey,
    department: 'Quỹ hỗ trợ & dự phòng (KT)',
    phone: '00000',
    fullName: '',
    bankAccount: '',
    bankName: '',
    weeklyRate: 0.001,
    monthlyRate: 0.001,
  },
];

const PAID_STATUSES = new Set(['Đã chi', 'Đã thanh toán', 'Đã thực hiện']);
const REJECTED_STATUS = 'Từ chối';

const money = (value: number | null | undefined) =>
  `${new Intl.NumberFormat('vi-VN').format(Math.round(Number(value || 0)))} đ`;

const dateLabel = (value?: string | null) => {
  if (!value) return '—';
  const match = value.slice(0, 10).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return match ? `${match[3]}/${match[2]}/${match[1]}` : value;
};

const paidAmountFor = (log: TransactionLog) => Number(log.actual_expense ?? log.proposed_amount ?? 0);

function inRange(date: string | null | undefined, start: string, endInclusive: string) {
  if (!date) return false;
  const day = date.slice(0, 10);
  return day >= start && day <= endInclusive;
}

type ViewMode = 'month' | 'week';

export default function OperationsFundReport({ logs, contracts, allocations, initialMonth }: Props) {
  const [currentLogs, setCurrentLogs] = useState(logs);
  const [selectedMonth, setSelectedMonth] = useState(initialMonth.slice(0, 7));
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [selectedWeek, setSelectedWeek] = useState(1);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createError, setCreateError] = useState('');
  const [createForm, setCreateForm] = useState({
    fundType: 'operations' as OperationsSupportFundKey,
    department: '',
    fullName: '',
    phone: '',
    bankAccount: '',
    bankName: '',
    amount: '',
    month: Number(initialMonth.slice(5, 7)),
    paymentDate: new Date().toISOString().slice(0, 10),
    status: 'Chờ duyệt',
  });

  // Lấy danh sách các tháng khả dụng
  const availableMonths = useMemo(() => {
    const months = new Set<string>([initialMonth.slice(0, 7), '2026-09', '2026-10']);
    for (const alloc of allocations) if (alloc.period_month) months.add(alloc.period_month.slice(0, 7));
    for (const contract of contracts) if (contract.contract_date) months.add(contract.contract_date.slice(0, 7));
    return Array.from(months).filter((m) => /^\d{4}-\d{2}$/.test(m)).sort();
  }, [allocations, contracts, initialMonth]);

  // Tính khoảng ngày cho kỳ được chọn
  const range = useMemo(() => {
    if (viewMode === 'week') {
      return getMonthWeekRange(selectedMonth, selectedWeek);
    }
    return getMonthWeekRange(selectedMonth, 0);
  }, [selectedMonth, viewMode, selectedWeek]);

  // Danh sách 5 tuần trong tháng
  const weekOptions = useMemo(() => {
    return [1, 2, 3, 4, 5].map((weekNo) => {
      const r = getMonthWeekRange(selectedMonth, weekNo);
      const startParts = r.start.slice(0, 10).split('-');
      const endParts = r.endInclusive.slice(0, 10).split('-');
      return {
        weekNo,
        label: `Tuần ${weekNo}`,
        range: `${startParts[2]}/${startParts[1]} - ${endParts[2]}/${endParts[1]}`,
      };
    });
  }, [selectedMonth]);

  // Tính tổng DT hợp đồng trong kỳ
  const selectedContracts = useMemo(
    () => contracts.filter((c) => inRange(c.contract_date, range.start, range.endInclusive)),
    [contracts, range],
  );
  const contractBase = selectedContracts.reduce((sum, c) => sum + Number(c.allocation_base || 0), 0);
  const fundBudget = Math.round(contractBase * OPERATIONS_SUPPORT_FUND_RATE);

  // Lấy dữ liệu phân bổ từ database nếu có
  const selectedAllocations = useMemo(() => {
    const fundRows = allocations.filter((row) => (
      row.period_month === selectedMonth && getOperationsSupportFundKey(row.fund_source) !== null
    ));
    if (viewMode === 'month') {
      const monthRows = fundRows.filter((row) => row.period_code.endsWith('-MONTH'));
      return monthRows.length ? monthRows : fundRows.filter((row) => !row.period_code.endsWith('-MONTH'));
    }
    return fundRows.filter((row) => (
      !row.period_code.endsWith('-MONTH')
      && getPeriodWeekNo(row.period_label, row.period_code, 0) === selectedWeek
    ));
  }, [allocations, selectedMonth, viewMode, selectedWeek]);
  const recordedAllocation = selectedAllocations.reduce((sum, row) => sum + Number(row.requested_amount || 0), 0);

  // Lọc các kỳ chi thuộc kỳ được chọn
  const matchingLogs = useMemo(() => currentLogs.filter((log) => {
    const dateToCheck = log.payment_date || log.request_date;
    return (
      dateToCheck
      && inRange(dateToCheck, range.start, range.endInclusive)
      && getOperationsSupportFundKey(log.fund_source) !== null
      && log.status !== REJECTED_STATUS
    );
  }), [currentLogs, range]);

  const paidTotal = matchingLogs
    .filter((log) => PAID_STATUSES.has(log.status))
    .reduce((sum, log) => sum + paidAmountFor(log), 0);

  const reportedFund = selectedAllocations.length ? recordedAllocation : fundBudget;
  const remaining = reportedFund - paidTotal;

  // Tính phân bổ theo từng bộ phận
  const departmentAllocations = useMemo(() => {
    return ALLOCATION_ROWS.map((row) => {
      const rate = viewMode === 'week' ? row.weeklyRate : row.monthlyRate;
      const totalFund = Math.round(contractBase * rate);

      // Tính tổng đã chi cho từng bộ phận
      const deptLogs = matchingLogs.filter((log) => {
        const logFundKey = getOperationsSupportFundKey(log.fund_source);
        if (logFundKey !== row.fundKey) return false;
        const content = (log.detail_content || '').toLowerCase();
        const beneficiary = (log.beneficiary_name || '').toLowerCase();
        const rowName = row.fullName.toLowerCase();
        const rowDept = row.department.toLowerCase();

        return (rowName && beneficiary.includes(rowName))
          || content.includes(rowDept)
          || (row.department === 'Phó tổng' && content.includes('phó tổng'))
          || (row.department === 'Tổng điều hành' && content.includes('tổng điều hành'))
          || (row.department === 'Tri ấn kết nối phó tổng' && content.includes('tri ân'));
      });

      const paid = deptLogs
        .filter((log) => PAID_STATUSES.has(log.status))
        .reduce((sum, log) => sum + paidAmountFor(log), 0);

      return {
        ...row,
        rate: (rate * 100).toFixed(1).replace('.0', '') + '%',
        rawRate: rate,
        totalFund,
        paid,
        remaining: totalFund - paid,
      };
    });
  }, [contractBase, matchingLogs, viewMode]);

  const totalFundSum = departmentAllocations.reduce((sum, r) => sum + r.totalFund, 0);
  const totalPaidSum = departmentAllocations.reduce((sum, r) => sum + r.paid, 0);
  const totalRemainingSum = departmentAllocations.reduce((sum, r) => sum + r.remaining, 0);

  const monthNumber = Number(selectedMonth.slice(5, 7));
  const periodTitle = viewMode === 'week'
    ? `Tuần ${selectedWeek} — Tháng ${monthNumber}`
    : `Tháng ${monthNumber}`;

  // Tự động điền dữ liệu khi chọn Bộ phận trong Form Modal
  const handleDepartmentChange = (dept: string) => {
    const match = ALLOCATION_ROWS.find((r) => r.department === dept);
    if (match) {
      setCreateForm((c) => ({
        ...c,
        department: dept,
        fullName: match.fullName,
        phone: match.phone,
        bankAccount: match.bankAccount,
        bankName: match.bankName,
        fundType: match.fundKey,
      }));
    } else {
      setCreateForm((c) => ({
        ...c,
        department: dept,
      }));
    }
  };

  // Submit tạo kỳ chi mới
  const submitFundEntry = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setCreateError('');
    const amount = Number(createForm.amount);
    if (!createForm.department || !createForm.fullName.trim() || !Number.isFinite(amount) || amount <= 0) {
      setCreateError('Vui lòng nhập đầy đủ Bộ phận, Họ và tên và Số tiền hợp lệ.');
      return;
    }

    const fund = OPERATIONS_SUPPORT_FUND_TYPES.find((item) => item.key === createForm.fundType);
    if (!fund) return;
    setIsSubmitting(true);
    try {
      const response = await fetch('/api/admin/transaction-logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requestDate: createForm.paymentDate,
          paymentDate: createForm.paymentDate,
          fundSource: fund.label,
          detailContent: createForm.department,
          beneficiaryName: createForm.fullName.trim(),
          beneficiaryPhone: createForm.phone.trim() || null,
          beneficiaryBankAccount: createForm.bankAccount.trim() || null,
          beneficiaryBankName: createForm.bankName.trim() || null,
          proposedAmount: amount,
          availableBalance: Math.max(0, remaining),
          status: createForm.status,
        }),
      });
      const result = await response.json();
      if (!response.ok || !result.success || !result.log) {
        throw new Error(result.message || 'Không tạo được kỳ chi.');
      }
      setCurrentLogs((items) => [result.log as TransactionLog, ...items]);
      setIsCreateOpen(false);
      setCreateForm({
        fundType: 'operations',
        department: '',
        fullName: '',
        phone: '',
        bankAccount: '',
        bankName: '',
        amount: '',
        month: monthNumber,
        paymentDate: new Date().toISOString().slice(0, 10),
        status: 'Chờ duyệt',
      });
    } catch (error) {
      setCreateError(error instanceof Error ? error.message : 'Không tạo được kỳ chi.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Xuất file Excel
  const exportExcel = () => {
    const allocationSheet = departmentAllocations.map((row, index) => ({
      STT: index + 1,
      'Loại Quỹ': row.fundType,
      'Bộ phận hưởng thụ': row.department,
      'SĐT': row.phone,
      'Họ và tên': row.fullName || '—',
      'STK': row.bankAccount || '—',
      'Ngân hàng': row.bankName || '—',
      'Tỷ lệ %': row.rate,
      'Tổng quỹ': row.totalFund,
      'Đã chi': row.paid,
      'Còn lại': row.remaining,
    }));

    const summaryRows = [
      { Chỉ_tiêu: 'Khoảng thời gian', Giá_trị: periodTitle },
      { Chỉ_tiêu: 'Tổng DT Hợp đồng', Giá_trị: contractBase },
      { Chỉ_tiêu: 'Tổng quỹ vận hành (2,5%)', Giá_trị: fundBudget },
      { Chỉ_tiêu: 'Đã chi', Giá_trị: paidTotal },
      { Chỉ_tiêu: 'Còn lại', Giá_trị: remaining },
    ];

    const disbursementRows = matchingLogs.map((log, index) => ({
      STT: index + 1,
      'Mã phiếu': log.request_code,
      'Ngày chi': dateLabel(log.payment_date || log.request_date),
      'Loại quỹ': log.fund_source,
      'Hạng mục / Bộ phận': log.detail_content,
      'Người nhận': log.beneficiary_name,
      'SĐT': log.beneficiary_phone || '',
      'STK': log.beneficiary_bank_account || '',
      'Số tiền': Number(log.proposed_amount ?? log.actual_expense ?? 0),
      'Trạng thái': log.status,
    }));

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(summaryRows), 'Tổng quan');
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(allocationSheet), 'Phân bổ theo bộ phận');
    if (disbursementRows.length > 0) {
      XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(disbursementRows), 'Chi tiết kỳ chi');
    }
    XLSX.writeFile(workbook, `quy-van-hanh-ho-tro-${selectedMonth}${viewMode === 'week' ? `-tuan-${selectedWeek}` : ''}.xlsx`);
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] px-4 py-6 sm:px-6 lg:px-8">
      {/* ===== HEADER TRANG ===== */}
      <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Quỹ Vận hành & Hỗ trợ
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Phân bổ quỹ vận hành (2,5% DT HĐ) và giải ngân cho các bộ phận hỗ trợ
          </p>
        </div>

        {/* Nút hành động */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => {
              setCreateError('');
              setCreateForm((c) => ({
                ...c,
                month: monthNumber,
                paymentDate: new Date().toISOString().slice(0, 10),
              }));
              setIsCreateOpen(true);
            }}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 active:scale-[0.98] cursor-pointer"
          >
            <Plus className="h-4 w-4 stroke-[2.5]" />
            <span>Tạo kỳ chi</span>
          </button>
          <button
            type="button"
            onClick={exportExcel}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 active:scale-[0.98] cursor-pointer"
          >
            <Download className="h-4 w-4" />
            <span>Xuất Excel</span>
          </button>
        </div>
      </header>

      {/* ===== THANH BỘ LỌC THỜI GIAN (TABS THÁNG / TUẦN) ===== */}
      <div className="mb-6 flex flex-wrap items-center gap-3">
        {/* Tab chọn Tháng */}
        <div className="flex items-center gap-1.5">
          {availableMonths.map((monthKey) => {
            const m = Number(monthKey.slice(5, 7));
            const isActive = selectedMonth === monthKey;
            return (
              <button
                key={monthKey}
                type="button"
                onClick={() => {
                  setSelectedMonth(monthKey);
                  setSelectedWeek(1);
                }}
                className={`rounded-xl px-4 py-2 text-sm font-semibold transition cursor-pointer ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-sm ring-1 ring-blue-600'
                    : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50'
                }`}
              >
                Tháng {m}
              </button>
            );
          })}
        </div>

        {/* Chuyển đổi Tháng / Tuần */}
        <div className="flex items-center rounded-xl bg-slate-200/80 p-1 shadow-inner">
          <button
            type="button"
            onClick={() => setViewMode('month')}
            className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold transition cursor-pointer ${
              viewMode === 'month'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Xem theo Tháng
          </button>
          <button
            type="button"
            onClick={() => setViewMode('week')}
            className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold transition cursor-pointer ${
              viewMode === 'week'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Xem theo Tuần
          </button>
        </div>

        {/* Các nút Tuần khi chọn viewMode === 'week' */}
        {viewMode === 'week' && (
          <div className="flex flex-wrap items-center gap-1.5 animate-in fade-in duration-150">
            {weekOptions.map((opt) => {
              const isWeekActive = selectedWeek === opt.weekNo;
              return (
                <button
                  key={opt.weekNo}
                  type="button"
                  onClick={() => setSelectedWeek(opt.weekNo)}
                  className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition cursor-pointer ${
                    isWeekActive
                      ? 'bg-slate-900 text-white shadow-sm'
                      : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50'
                  }`}
                  title={opt.range}
                >
                  <span>{opt.label}</span>
                  <span className={`text-[10px] ${isWeekActive ? 'text-slate-300' : 'text-slate-400'}`}>
                    ({opt.range})
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* ===== 4 CARDS THỐNG KÊ (HÌNH 7.3) ===== */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {/* Card 1: Tổng DT Hợp đồng */}
        <div className="flex items-center gap-4 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs transition hover:shadow-md">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
            <TrendingUp className="h-6 w-6 stroke-[2]" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-medium text-slate-500">Tổng DT Hợp đồng</p>
            <p className="mt-1 truncate text-xl font-bold tracking-tight text-slate-900">
              {money(contractBase)}
            </p>
          </div>
        </div>

        {/* Card 2: Tổng quỹ vận hành (2,5%) */}
        <div className="flex items-center gap-4 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs transition hover:shadow-md">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-purple-50 text-purple-600">
            <Layers className="h-6 w-6 stroke-[2]" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-medium text-slate-500">Tổng quỹ vận hành (2,5%)</p>
            <p className="mt-1 truncate text-xl font-bold tracking-tight text-slate-900">
              {money(reportedFund)}
            </p>
          </div>
        </div>

        {/* Card 3: Đã chi */}
        <div className="flex items-center gap-4 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs transition hover:shadow-md">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
            <Wallet className="h-6 w-6 stroke-[2]" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-medium text-slate-500">Đã chi</p>
            <p className="mt-1 truncate text-xl font-bold tracking-tight text-slate-900">
              {money(paidTotal)}
            </p>
          </div>
        </div>

        {/* Card 4: Còn lại */}
        <div className="flex items-center gap-4 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs transition hover:shadow-md">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
            <Calendar className="h-6 w-6 stroke-[2]" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-medium text-slate-500">Còn lại</p>
            <p className={`mt-1 truncate text-xl font-bold tracking-tight ${remaining < 0 ? 'text-rose-600' : 'text-slate-900'}`}>
              {money(remaining)}
            </p>
          </div>
        </div>
      </div>

      {/* ===== BẢNG PHÂN BỔ QUÝ THEO BỘ PHẬN (HÌNH 7.1, 7.2, 7.3) ===== */}
      <section className="mb-8 overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-xs">
        <div className="border-b border-slate-100 px-6 py-4">
          <h2 className="text-base font-bold text-slate-900">
            Phân bổ quỹ theo bộ phận — {periodTitle}
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1000px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/75 text-xs font-semibold text-slate-500">
                <th className="px-5 py-3.5 font-medium">Loại Quỹ</th>
                <th className="px-5 py-3.5 font-medium">Bộ phận hưởng thụ</th>
                <th className="px-5 py-3.5 font-medium">SĐT</th>
                <th className="px-5 py-3.5 font-medium">Họ và tên</th>
                <th className="px-5 py-3.5 font-medium">STK</th>
                <th className="px-5 py-3.5 font-medium">Ngân hàng</th>
                <th className="px-5 py-3.5 text-right font-medium">Tỷ lệ %</th>
                <th className="px-5 py-3.5 text-right font-medium">Tổng quỹ</th>
                <th className="px-5 py-3.5 text-right font-medium">Đã chi</th>
                <th className="px-5 py-3.5 text-right font-medium">Còn lại</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {departmentAllocations.map((row, index) => (
                <tr key={index} className="transition-colors hover:bg-slate-50/60">
                  <td className="whitespace-nowrap px-5 py-3.5 font-medium text-slate-700">
                    {row.fundType}
                  </td>
                  <td className="px-5 py-3.5 font-semibold text-slate-900">
                    {row.department}
                  </td>
                  <td className="px-5 py-3.5 font-mono text-xs text-slate-600">
                    {row.phone}
                  </td>
                  <td className="px-5 py-3.5 font-medium text-slate-800">
                    {row.fullName || '—'}
                  </td>
                  <td className="px-5 py-3.5 font-mono text-xs text-slate-600">
                    {row.bankAccount || '—'}
                  </td>
                  <td className="px-5 py-3.5 text-slate-600">
                    {row.bankName || '—'}
                  </td>
                  <td className="whitespace-nowrap px-5 py-3.5 text-right font-semibold text-slate-700">
                    {row.rate}
                  </td>
                  <td className="whitespace-nowrap px-5 py-3.5 text-right font-semibold text-slate-900">
                    {money(row.totalFund)}
                  </td>
                  <td className="whitespace-nowrap px-5 py-3.5 text-right font-medium text-slate-600">
                    {money(row.paid)}
                  </td>
                  <td className={`whitespace-nowrap px-5 py-3.5 text-right font-bold ${row.remaining < 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                    {money(row.remaining)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-slate-200 bg-slate-50/90 font-bold text-slate-900">
                <td colSpan={6} className="px-5 py-4 uppercase tracking-wider text-xs font-bold text-slate-700">
                  TỔNG CỘNG
                </td>
                <td className="whitespace-nowrap px-5 py-4 text-right">
                  2,5%
                </td>
                <td className="whitespace-nowrap px-5 py-4 text-right text-slate-900">
                  {money(totalFundSum)}
                </td>
                <td className="whitespace-nowrap px-5 py-4 text-right text-slate-700">
                  {money(totalPaidSum)}
                </td>
                <td className={`whitespace-nowrap px-5 py-4 text-right ${totalRemainingSum < 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                  {money(totalRemainingSum)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </section>

      {/* ===== KỲ CHI GIẢI NGÂN (HÌNH 7.3) ===== */}
      <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-xs">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <h2 className="text-base font-bold text-slate-900">
            Kỳ chi giải ngân {periodTitle} ({matchingLogs.length})
          </h2>
        </div>

        {matchingLogs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
              <Calendar className="h-6 w-6" />
            </div>
            <p className="mt-3 text-sm font-medium text-slate-600">
              Chưa có kỳ chi giải ngân nào trong {periodTitle.toLowerCase()}
            </p>
            <p className="mt-1 text-xs text-slate-400">
              Nhấn &quot;+ Tạo kỳ chi&quot; ở trên để thêm phiếu chi mới cho bộ phận.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/75 text-xs font-semibold text-slate-500">
                  <th className="px-5 py-3.5 font-medium">Mã phiếu</th>
                  <th className="px-5 py-3.5 font-medium">Ngày chi</th>
                  <th className="px-5 py-3.5 font-medium">Loại quỹ</th>
                  <th className="px-5 py-3.5 font-medium">Hạng mục / Bộ phận</th>
                  <th className="px-5 py-3.5 font-medium">Người nhận</th>
                  <th className="px-5 py-3.5 font-medium">STK / Ngân hàng</th>
                  <th className="px-5 py-3.5 text-right font-medium">Số tiền</th>
                  <th className="px-5 py-3.5 text-center font-medium">Trạng thái</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {matchingLogs.map((log) => (
                  <tr key={log.id} className="transition-colors hover:bg-slate-50/60">
                    <td className="whitespace-nowrap px-5 py-3.5 font-mono text-xs font-semibold text-blue-600">
                      {log.request_code}
                    </td>
                    <td className="whitespace-nowrap px-5 py-3.5 text-slate-600">
                      {dateLabel(log.payment_date || log.request_date)}
                    </td>
                    <td className="whitespace-nowrap px-5 py-3.5">
                      <span className="inline-flex rounded-md bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700 ring-1 ring-blue-200">
                        {log.fund_source}
                      </span>
                    </td>
                    <td className="max-w-[220px] truncate px-5 py-3.5 font-medium text-slate-900" title={log.detail_content}>
                      {log.detail_content || '—'}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="font-semibold text-slate-900">{log.beneficiary_name || '—'}</div>
                      {log.beneficiary_phone && (
                        <div className="font-mono text-xs text-slate-400">{log.beneficiary_phone}</div>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-xs text-slate-600">
                      {log.beneficiary_bank_account || log.beneficiary_bank_name ? (
                        <span>{[log.beneficiary_bank_account, log.beneficiary_bank_name].filter(Boolean).join(' · ')}</span>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="whitespace-nowrap px-5 py-3.5 text-right font-bold text-slate-900">
                      {money(Number(log.proposed_amount ?? log.actual_expense ?? 0))}
                    </td>
                    <td className="whitespace-nowrap px-5 py-3.5 text-center">
                      <StatusBadge status={log.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ===== MODAL TẠO KỲ CHI MỚI (HÌNH 7.4 & 7.6) ===== */}
      {isCreateOpen && (
        <div
          className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-xs"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !isSubmitting) setIsCreateOpen(false);
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
            className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white shadow-2xl animate-in fade-in zoom-in-95 duration-150"
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <h2 id="modal-title" className="text-lg font-bold text-slate-900">
                Tạo kỳ chi mới
              </h2>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => setIsCreateOpen(false)}
                className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 disabled:opacity-50 cursor-pointer"
                aria-label="Đóng"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={submitFundEntry} className="space-y-4 px-6 py-5">
              {/* 1. Loại quỹ */}
              <div className="space-y-1.5">
                <label htmlFor="modal-fund-type" className="text-sm font-semibold text-slate-700">
                  Loại quỹ
                </label>
                <select
                  id="modal-fund-type"
                  value={createForm.fundType}
                  onChange={(e) => setCreateForm((c) => ({ ...c, fundType: e.target.value as OperationsSupportFundKey }))}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                >
                  {FUND_TYPE_OPTIONS.map((ft) => (
                    <option key={ft.key} value={ft.key}>
                      {ft.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* 2. Bộ phận * (Dropdown đúng 5 lựa chọn theo Hình 7.6) */}
              <div className="space-y-1.5">
                <label htmlFor="modal-department" className="text-sm font-semibold text-slate-700">
                  Bộ phận <span className="text-rose-500">*</span>
                </label>
                <select
                  id="modal-department"
                  required
                  value={createForm.department}
                  onChange={(e) => handleDepartmentChange(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                >
                  <option value="">Chọn bộ phận</option>
                  {DEPARTMENT_OPTIONS.map((dept) => (
                    <option key={dept} value={dept}>
                      {dept}
                    </option>
                  ))}
                </select>
              </div>

              {/* 3. Họ và tên * */}
              <div className="space-y-1.5">
                <label htmlFor="modal-fullname" className="text-sm font-semibold text-slate-700">
                  Họ và tên <span className="text-rose-500">*</span>
                </label>
                <input
                  id="modal-fullname"
                  required
                  value={createForm.fullName}
                  onChange={(e) => setCreateForm((c) => ({ ...c, fullName: e.target.value }))}
                  placeholder="Nhập họ và tên người nhận"
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              {/* 4. SĐT | STK */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label htmlFor="modal-phone" className="text-sm font-semibold text-slate-700">
                    SĐT
                  </label>
                  <input
                    id="modal-phone"
                    value={createForm.phone}
                    onChange={(e) => setCreateForm((c) => ({ ...c, phone: e.target.value }))}
                    placeholder="000000"
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="modal-bank-account" className="text-sm font-semibold text-slate-700">
                    STK
                  </label>
                  <input
                    id="modal-bank-account"
                    value={createForm.bankAccount}
                    onChange={(e) => setCreateForm((c) => ({ ...c, bankAccount: e.target.value }))}
                    placeholder="Số tài khoản"
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </div>
              </div>

              {/* 5. Ngân hàng | Số tiền (VND) */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label htmlFor="modal-bank-name" className="text-sm font-semibold text-slate-700">
                    Ngân hàng
                  </label>
                  <input
                    id="modal-bank-name"
                    value={createForm.bankName}
                    onChange={(e) => setCreateForm((c) => ({ ...c, bankName: e.target.value }))}
                    placeholder="Tên ngân hàng"
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="modal-amount" className="text-sm font-semibold text-slate-700">
                    Số tiền (VND)
                  </label>
                  <input
                    id="modal-amount"
                    type="number"
                    min="1"
                    step="1"
                    required
                    value={createForm.amount}
                    onChange={(e) => setCreateForm((c) => ({ ...c, amount: e.target.value }))}
                    placeholder="0"
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </div>
              </div>

              {/* 6. Tháng | Ngày chi */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label htmlFor="modal-month" className="text-sm font-semibold text-slate-700">
                    Tháng
                  </label>
                  <input
                    id="modal-month"
                    type="number"
                    min="1"
                    max="12"
                    value={createForm.month}
                    onChange={(e) => setCreateForm((c) => ({ ...c, month: Number(e.target.value) }))}
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="modal-payment-date" className="text-sm font-semibold text-slate-700">
                    Ngày chi
                  </label>
                  <input
                    id="modal-payment-date"
                    type="date"
                    value={createForm.paymentDate}
                    onChange={(e) => setCreateForm((c) => ({ ...c, paymentDate: e.target.value }))}
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </div>
              </div>

              {/* 7. Trạng thái */}
              <div className="space-y-1.5">
                <label htmlFor="modal-status" className="text-sm font-semibold text-slate-700">
                  Trạng thái
                </label>
                <select
                  id="modal-status"
                  value={createForm.status}
                  onChange={(e) => setCreateForm((c) => ({ ...c, status: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                >
                  <option value="Chờ duyệt">Chờ duyệt</option>
                  <option value="Đã duyệt">Đã duyệt</option>
                  <option value="Đã chi">Đã chi</option>
                </select>
              </div>

              {/* Thông báo lỗi nếu có */}
              {createError && (
                <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs text-rose-700 font-medium">
                  {createError}
                </p>
              )}

              {/* Footer Buttons */}
              <div className="flex items-center justify-end gap-3 border-t border-slate-100 pt-4">
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => setIsCreateOpen(false)}
                  className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50 cursor-pointer"
                >
                  Huỷ
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="rounded-xl bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
                >
                  {isSubmitting ? 'Đang lưu…' : 'Lưu'}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const isPaid = PAID_STATUSES.has(status);
  const isApproved = status === 'Đã duyệt';
  const isRejected = status === REJECTED_STATUS;

  let bgStyle = 'bg-amber-50 text-amber-700 ring-amber-200';
  if (isPaid) {
    bgStyle = 'bg-emerald-50 text-emerald-700 ring-emerald-200';
  } else if (isApproved) {
    bgStyle = 'bg-blue-50 text-blue-700 ring-blue-200';
  } else if (isRejected) {
    bgStyle = 'bg-rose-50 text-rose-700 ring-rose-200';
  }

  return (
    <span className={`inline-flex whitespace-nowrap rounded-md px-2.5 py-1 text-xs font-semibold ring-1 ${bgStyle}`}>
      {status || 'Chờ duyệt'}
    </span>
  );
}
