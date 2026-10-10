'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import * as XLSX from 'xlsx';
import {
  CalendarDays,
  CheckCircle2,
  Clock3,
  Download,
  Eye,
  Plus,
  Search,
  Wallet,
  X,
} from 'lucide-react';
import type { TransactionLog, WeeklyAllocation } from '@/components/admin/TransactionLogManagement';
import { getMonthWeekRange, getPeriodWeekNo } from '@/lib/weekRanges';
import {
  getOperationsSupportFundKey,
  OPERATIONS_SUPPORT_FUND_RATE,
  OPERATIONS_SUPPORT_FUND_TYPES,
  SEPTEMBER_2026_OPERATIONS_EXPENSE_SOURCE_ROWS,
  SEPTEMBER_2026_OPERATIONS_FUND_SOURCE,
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

type FundSummary = {
  key: OperationsSupportFundKey;
  label: string;
  color: string;
  proposed: number;
  paid: number;
  allocated: number;
  rows: number;
  share: number;
  rateSource: string;
  sourceSheet: string;
};

const PAID_STATUSES = new Set(['Đã chi', 'Đã thanh toán', 'Đã thực hiện']);
const REJECTED_STATUS = 'Từ chối';
const MONTHS = [
  'Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6',
  'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12',
];

const money = (value: number | null | undefined) =>
  `${new Intl.NumberFormat('vi-VN').format(Math.round(Number(value || 0)))} ₫`;

const dateLabel = (value?: string | null) => {
  if (!value) return '—';
  const match = value.slice(0, 10).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return match ? `${match[3]}/${match[2]}/${match[1]}` : value;
};

const amountFor = (log: TransactionLog) => Number(log.proposed_amount ?? log.actual_expense ?? 0);
const paidAmountFor = (log: TransactionLog) => Number(log.actual_expense ?? log.proposed_amount ?? 0);

function inRange(date: string | null | undefined, start: string, endInclusive: string) {
  if (!date) return false;
  const day = date.slice(0, 10);
  return day >= start && day <= endInclusive;
}

function Panel({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <section className={`rounded-2xl border border-slate-200 bg-white shadow-sm ${className}`}>{children}</section>;
}

function formatPeriodRangeStr(startStr: string, endInclusiveStr: string) {
  const start = startStr.slice(0, 10).split('-');
  const end = endInclusiveStr.slice(0, 10).split('-');
  if (start.length !== 3 || end.length !== 3) return '';
  const [, sMonth, sDay] = start;
  const [, eMonth, eDay] = end;
  if (sMonth === eMonth) {
    return `${sDay}–${eDay}/${eMonth}`;
  }
  return `${sDay}/${sMonth}–${eDay}/${eMonth}`;
}

function weekLabel(month: string, weekNo: number) {
  const range = getMonthWeekRange(month, weekNo);
  return `Tuần ${weekNo} · ${dateLabel(range.start)}–${dateLabel(range.endInclusive)}`;
}

function MetricCard({
  title,
  value,
  note,
  icon,
  tone,
}: {
  title: string;
  value: string;
  note: string;
  icon: React.ReactNode;
  tone: 'blue' | 'rose' | 'emerald' | 'violet';
}) {
  const tones = {
    blue: 'border-blue-100 bg-blue-50 text-blue-700',
    rose: 'border-rose-100 bg-rose-50 text-rose-700',
    emerald: 'border-emerald-100 bg-emerald-50 text-emerald-700',
    violet: 'border-violet-100 bg-violet-50 text-violet-700',
  };
  return (
    <section className="flex min-w-0 items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full border ${tones[tone]}`}>{icon}</span>
      <div className="min-w-0">
        <p className="truncate text-xs font-medium text-slate-500">{title}</p>
        <p className="mt-1 truncate text-lg font-bold tabular-nums text-slate-900">{value}</p>
        <p className="mt-0.5 truncate text-[10px] text-slate-500">{note}</p>
      </div>
    </section>
  );
}

function StatusBadge({ status }: { status: string }) {
  const style = PAID_STATUSES.has(status)
    ? 'bg-emerald-50 text-emerald-700'
    : status === 'Đã duyệt'
      ? 'bg-blue-50 text-blue-700'
      : status === REJECTED_STATUS
        ? 'bg-rose-50 text-rose-700'
        : 'bg-amber-50 text-amber-700';
  return <span className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-[10px] font-semibold ${style}`}>{status || 'Chưa có trạng thái'}</span>;
}

export default function OperationsFundReport({ logs, contracts, allocations, initialMonth }: Props) {
  const [currentLogs, setCurrentLogs] = useState(logs);
  const [selectedYear, setSelectedYear] = useState(initialMonth.slice(0, 4));
  const [selectedMonth, setSelectedMonth] = useState(initialMonth.slice(5, 7));
  const [selectedWeek, setSelectedWeek] = useState(0);
  const [search, setSearch] = useState('');
  const [viewLog, setViewLog] = useState<TransactionLog | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createError, setCreateError] = useState('');
  const [createForm, setCreateForm] = useState({
    requestDate: '',
    fundKey: 'operations' as OperationsSupportFundKey,
    department: '',
    detailContent: '',
    beneficiaryName: '',
    beneficiaryPhone: '',
    beneficiaryBankAccount: '',
    proposedAmount: '',
  });

  const monthKey = `${selectedYear}-${selectedMonth}`;
  const range = useMemo(() => getMonthWeekRange(monthKey, selectedWeek), [monthKey, selectedWeek]);

  const changeYear = (year: string) => {
    setSelectedYear(year);
    setSelectedWeek(0);
  };

  const changeMonth = (month: number) => {
    setSelectedMonth(String(month).padStart(2, '0'));
    setSelectedWeek(0);
  };

  const allYears = useMemo(() => {
    const years = new Set<string>([initialMonth.slice(0, 4), selectedYear]);
    for (const log of currentLogs) if (log.request_date) years.add(log.request_date.slice(0, 4));
    for (const contract of contracts) years.add(contract.contract_date.slice(0, 4));
    for (const alloc of allocations) if (alloc.period_month) years.add(alloc.period_month.slice(0, 4));
    return Array.from(years).filter((year) => /^\d{4}$/.test(year)).sort((a, b) => b.localeCompare(a));
  }, [allocations, contracts, currentLogs, initialMonth, selectedYear]);

  const weekOptions = useMemo(() => {
    return [1, 2, 3, 4, 5].map((weekNo) => {
      const r = getMonthWeekRange(monthKey, weekNo);
      return {
        weekNo,
        label: `${weekNo} · ${formatPeriodRangeStr(r.start, r.endInclusive)}`,
      };
    });
  }, [monthKey]);

  useEffect(() => {
    if (selectedWeek !== 0 && !weekOptions.some((opt) => opt.weekNo === selectedWeek)) {
      setSelectedWeek(0);
    }
  }, [selectedWeek, weekOptions]);

  const selectedContracts = useMemo(
    () => contracts.filter((contract) => inRange(contract.contract_date, range.start, range.endInclusive)),
    [contracts, range],
  );
  const contractBase = selectedContracts.reduce((sum, contract) => sum + Number(contract.allocation_base || 0), 0);
  const fundBudget = Math.round(contractBase * OPERATIONS_SUPPORT_FUND_RATE);

  const selectedAllocations = useMemo(() => {
    const fundRows = allocations.filter((row) => (
      row.period_month === monthKey && getOperationsSupportFundKey(row.fund_source) !== null
    ));
    if (selectedWeek === 0) {
      const monthRows = fundRows.filter((row) => row.period_code.endsWith('-MONTH'));
      return monthRows.length ? monthRows : fundRows.filter((row) => !row.period_code.endsWith('-MONTH'));
    }
    return fundRows.filter((row) => (
      !row.period_code.endsWith('-MONTH')
      && getPeriodWeekNo(row.period_label, row.period_code, 0) === selectedWeek
    ));
  }, [allocations, monthKey, selectedWeek]);
  const recordedAllocation = selectedAllocations.reduce((sum, row) => sum + Number(row.requested_amount || 0), 0);

  const matchingLogs = useMemo(() => currentLogs.filter((log) => (
    log.request_date
    && inRange(log.request_date, range.start, range.endInclusive)
    && getOperationsSupportFundKey(log.fund_source) !== null
    && log.status !== REJECTED_STATUS
  )), [currentLogs, range]);

  const filteredLogs = useMemo(() => {
    const query = search.trim().toLocaleLowerCase('vi');
    if (!query) return matchingLogs;
    return matchingLogs.filter((log) => [
      log.request_code,
      log.fund_source,
      log.detail_content,
      log.requester_name,
      log.beneficiary_name,
      log.beneficiary_phone,
      log.beneficiary_bank_account,
    ].some((value) => String(value || '').toLocaleLowerCase('vi').includes(query)));
  }, [matchingLogs, search]);

  const proposedTotal = matchingLogs.reduce((sum, log) => sum + amountFor(log), 0);
  const paidTotal = matchingLogs
    .filter((log) => PAID_STATUSES.has(log.status))
    .reduce((sum, log) => sum + paidAmountFor(log), 0);
  const waitingTotal = matchingLogs
    .filter((log) => !PAID_STATUSES.has(log.status))
    .reduce((sum, log) => sum + amountFor(log), 0);
  const reportedFund = selectedAllocations.length ? recordedAllocation : fundBudget;
  const remaining = reportedFund - paidTotal;

  const fundSummaries: FundSummary[] = OPERATIONS_SUPPORT_FUND_TYPES.map((fund) => {
    const rows = matchingLogs.filter((log) => getOperationsSupportFundKey(log.fund_source) === fund.key);
    const allocationRows = selectedAllocations.filter((row) => getOperationsSupportFundKey(row.fund_source) === fund.key);
    const proposed = rows.reduce((sum, log) => sum + amountFor(log), 0);
    const paid = rows
      .filter((log) => PAID_STATUSES.has(log.status))
      .reduce((sum, log) => sum + paidAmountFor(log), 0);
    const allocated = allocationRows.reduce((sum, row) => sum + Number(row.requested_amount || 0), 0);
    return {
      ...fund,
      proposed,
      paid,
      allocated,
      rows: rows.length,
      share: recordedAllocation > 0 ? (allocated / recordedAllocation) * 100 : 0,
      rateSource: Array.from(new Set(allocationRows.map((row) => row.fund_source).filter(Boolean))).join(' · '),
      sourceSheet: Array.from(new Set(allocationRows.map((row) => row.source_sheet).filter(Boolean))).join(', '),
    };
  });

  const sourceSnapshot = SEPTEMBER_2026_OPERATIONS_FUND_SOURCE;
  const showSourceComparison = monthKey === '2026-09' && selectedWeek === 0;
  const sourceContracts = contracts.filter((contract) => (
    inRange(contract.contract_date, sourceSnapshot.start, sourceSnapshot.endInclusive)
  ));
  const sourceContractRevenue = sourceContracts.reduce((sum, contract) => sum + Number(contract.allocation_base || 0), 0);
  const sourceMonthAllocations = allocations.filter((row) => (
    row.period_month === '2026-09'
    && row.period_code.endsWith('-MONTH')
    && getOperationsSupportFundKey(row.fund_source) !== null
  ));
  const sourceRecordedFund = sourceMonthAllocations.reduce((sum, row) => sum + Number(row.requested_amount || 0), 0);
  const sourcePeriodLogs = currentLogs.filter((log) => (
    log.request_date
    && inRange(log.request_date, sourceSnapshot.start, sourceSnapshot.endInclusive)
    && getOperationsSupportFundKey(log.fund_source) !== null
    && log.status !== REJECTED_STATUS
  ));
  const sourceLivePaid = sourcePeriodLogs
    .filter((log) => PAID_STATUSES.has(log.status))
    .reduce((sum, log) => sum + paidAmountFor(log), 0);
  const sourceComparisonRows = sourceSnapshot.groups.map((sourceGroup) => {
    const liveAllocation = sourceMonthAllocations
      .filter((row) => getOperationsSupportFundKey(row.fund_source) === sourceGroup.key)
      .reduce((sum, row) => sum + Number(row.requested_amount || 0), 0);
    const livePaid = sourcePeriodLogs
      .filter((log) => getOperationsSupportFundKey(log.fund_source) === sourceGroup.key && PAID_STATUSES.has(log.status))
      .reduce((sum, log) => sum + paidAmountFor(log), 0);
    const fund = OPERATIONS_SUPPORT_FUND_TYPES.find((item) => item.key === sourceGroup.key)!;
    return { ...sourceGroup, label: fund.label, liveAllocation, livePaid };
  });
  const showSourceDetails = monthKey === '2026-09';
  const sourceDetailsForRange = showSourceDetails
    ? SEPTEMBER_2026_OPERATIONS_EXPENSE_SOURCE_ROWS.filter((row) => inRange(row.date, range.start, range.endInclusive))
    : [];
  const sourcePeopleSummary = Array.from(new Set(sourceDetailsForRange.map((row) => row.beneficiary))).map((beneficiary) => {
    const rows = sourceDetailsForRange.filter((row) => row.beneficiary === beneficiary);
    return {
      beneficiary,
      departments: Array.from(new Set(rows.map((row) => row.department))).join(' · '),
      amounts: rows.map((row) => row.amount),
      total: rows.reduce((sum, row) => sum + row.amount, 0),
    };
  });
  const sourcePeopleTotal = sourceDetailsForRange.reduce((sum, row) => sum + row.amount, 0);

  const submitFundEntry = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setCreateError('');
    const amount = Number(createForm.proposedAmount);
    if (!createForm.requestDate || !createForm.detailContent.trim() || !createForm.beneficiaryName.trim() || !Number.isFinite(amount) || amount <= 0) {
      setCreateError('Nhập ngày, hạng mục, người thụ hưởng và số tiền hợp lệ.');
      return;
    }

    const fund = OPERATIONS_SUPPORT_FUND_TYPES.find((item) => item.key === createForm.fundKey);
    if (!fund) return;
    setIsSubmitting(true);
    try {
      const response = await fetch('/api/admin/transaction-logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requestDate: createForm.requestDate,
          fundSource: fund.label,
          detailContent: [createForm.department.trim(), createForm.detailContent.trim()].filter(Boolean).join(' · '),
          beneficiaryName: createForm.beneficiaryName.trim(),
          beneficiaryPhone: createForm.beneficiaryPhone.trim(),
          beneficiaryBankAccount: createForm.beneficiaryBankAccount.trim(),
          proposedAmount: amount,
          availableBalance: Math.max(0, (fundSummaries.find((item) => item.key === fund.key)?.allocated || 0)
            - (fundSummaries.find((item) => item.key === fund.key)?.paid || 0)),
          status: 'Chờ duyệt',
        }),
      });
      const result = await response.json();
      if (!response.ok || !result.success || !result.log) {
        throw new Error(result.message || 'Không tạo được phiếu quỹ.');
      }
      setCurrentLogs((items) => [result.log as TransactionLog, ...items]);
      setIsCreateOpen(false);
      setCreateForm({
        requestDate: '',
        fundKey: 'operations',
        department: '',
        detailContent: '',
        beneficiaryName: '',
        beneficiaryPhone: '',
        beneficiaryBankAccount: '',
        proposedAmount: '',
      });
    } catch (error) {
      setCreateError(error instanceof Error ? error.message : 'Không tạo được phiếu quỹ.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const chartSegments = (() => {
    let cursor = 0;
    return fundSummaries.map((fund) => {
      const start = cursor;
      cursor += fund.share;
      return `${fund.color} ${start}% ${cursor}%`;
    });
  })();
  const chartStyle = {
    background: recordedAllocation > 0
      ? `conic-gradient(${chartSegments.join(', ')})`
      : 'conic-gradient(#e2e8f0 0% 100%)',
  };

  const periodTitle = selectedWeek ? weekLabel(monthKey, selectedWeek) : `Tháng ${Number(selectedMonth)}/${selectedYear}`;

  const exportExcel = () => {
    const detailRows = filteredLogs.map((log, index) => ({
      STT: index + 1,
      Ngày: dateLabel(log.request_date),
      'Mã phiếu': log.request_code,
      'Tên quỹ': log.fund_source,
      'Hạng mục chi': log.detail_content,
      'Số tiền đề nghị': amountFor(log),
      'Thực chi': PAID_STATUSES.has(log.status) ? paidAmountFor(log) : 0,
      'Người nhận': log.beneficiary_name,
      'Điện thoại': log.beneficiary_phone || '',
      'Tài khoản': log.beneficiary_bank_account || '',
      'Trạng thái': log.status,
    }));
    const summaryRows = [
      { Chỉ_tiêu: 'Khoảng thời gian', Giá_trị: periodTitle },
      { Chỉ_tiêu: 'Doanh số hợp đồng', Giá_trị: contractBase },
      { Chỉ_tiêu: 'Tỷ lệ định mức theo mã nguồn', Giá_trị: '2,5%' },
      { Chỉ_tiêu: 'Quỹ định mức tính theo doanh số', Giá_trị: fundBudget },
      { Chỉ_tiêu: 'Tổng số ghi trong bảng phân bổ', Giá_trị: selectedAllocations.length ? recordedAllocation : 'Chưa có dữ liệu' },
      { Chỉ_tiêu: 'Tổng đề nghị chi', Giá_trị: proposedTotal },
      { Chỉ_tiêu: 'Đã thanh toán / thực hiện', Giá_trị: paidTotal },
      { Chỉ_tiêu: 'Chờ thanh toán', Giá_trị: waitingTotal },
      { Chỉ_tiêu: 'Còn lại sau thực chi', Giá_trị: (selectedAllocations.length ? recordedAllocation : fundBudget) - paidTotal },
    ];
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(summaryRows), 'Tổng hợp');
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(detailRows), 'Chi tiết');
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(fundSummaries.map((fund) => ({
      'Nhóm quỹ': fund.label,
      'Tỷ lệ theo nguồn': fund.rateSource,
      'Số tiền phân bổ ghi nhận': fund.allocated,
      'Tỷ trọng trong phân bổ': `${fund.share.toLocaleString('vi-VN', { maximumFractionDigits: 1 })}%`,
      'Nguồn bảng': fund.sourceSheet,
    }))), 'Phân bổ');
    XLSX.writeFile(workbook, `quy-van-hanh-ho-tro-${monthKey}${selectedWeek ? `-tuan-${selectedWeek}` : ''}.xlsx`);
  };

  return (
    <div className="min-h-screen space-y-5 px-4 py-5 sm:px-6 lg:px-8">
      <header className="flex flex-col gap-4 rounded-2xl bg-slate-100 p-5 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="mb-1 flex items-center gap-2 text-xs font-medium text-slate-500">
            <Link href="/admin" className="hover:text-blue-600">Trang chủ</Link><span>›</span><span>Quỹ vận hành và hỗ trợ</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Bảng quỹ vận hành và hỗ trợ</h1>
          <p className="mt-1 text-sm text-slate-500">Tổng hợp quỹ vận hành, BP hỗ trợ KT và BP hỗ trợ CN theo tháng hoặc tuần.</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <button type="button" onClick={() => { setCreateError(''); setIsCreateOpen(true); }} className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700">
            <Plus className="h-4 w-4" /> Thêm Quỹ vận hành hỗ trợ
          </button>
          <button type="button" onClick={exportExcel} className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700">
            <Download className="h-4 w-4" /> Xuất Excel
          </button>
        </div>
      </header>

      <Panel className="p-3">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <div className="flex items-center gap-2">
            <label htmlFor="operations-year" className="px-2 text-xs font-bold uppercase tracking-wide text-slate-500">
              Năm
            </label>
            <select
              id="operations-year"
              aria-label="Chọn năm"
              value={selectedYear}
              onChange={(event) => changeYear(event.target.value)}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700"
            >
              {allYears.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </div>

          <div className="hidden h-6 w-px bg-slate-300 sm:block" />

          <div className="flex flex-wrap items-center gap-2">
            <span className="px-2 text-xs font-bold uppercase tracking-wide text-slate-500">
              Tháng
            </span>
            {Array.from({ length: 12 }, (_, index) => index + 1).map((month) => {
              const isSelected = Number(selectedMonth) === month;
              return (
                <button
                  key={month}
                  type="button"
                  onClick={() => changeMonth(month)}
                  className={`min-w-9 rounded-lg border px-3 py-2 text-xs font-semibold transition ${
                    isSelected
                      ? 'border-blue-700 bg-slate-900 text-white'
                      : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {month}
                </button>
              );
            })}
          </div>

          <div className="hidden h-6 w-px bg-slate-300 sm:block" />

          <div className="flex flex-wrap items-center gap-2">
            <span className="px-2 text-xs font-bold uppercase tracking-wide text-slate-500">
              Tuần
            </span>
            <button
              type="button"
              onClick={() => setSelectedWeek(0)}
              className={`rounded-lg border px-3 py-2 text-xs font-semibold transition ${
                selectedWeek === 0
                  ? 'border-blue-500 bg-blue-600 text-white'
                  : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
              }`}
            >
              Cả tháng
            </button>
            {weekOptions.map((opt) => {
              const isSelected = selectedWeek === opt.weekNo;
              return (
                <button
                  key={opt.weekNo}
                  type="button"
                  onClick={() => setSelectedWeek(opt.weekNo)}
                  className={`rounded-lg border px-3 py-2 text-xs font-semibold transition ${
                    isSelected
                      ? 'border-blue-500 bg-blue-600 text-white'
                      : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>
      </Panel>

      {showSourceComparison && (
        <section className="space-y-4 rounded-2xl border border-amber-200 bg-amber-50/60 p-4 sm:p-5">
          <div>
            <h2 className="font-bold text-slate-900">Đối chiếu dữ liệu nguồn tháng 9/2026</h2>
            <p className="mt-1 text-xs leading-5 text-slate-600">
              Tham chiếu tab “Quỹ Vận hành& hỗ trợ” trong {sourceSnapshot.workbook}, kỳ {dateLabel(sourceSnapshot.start)}–{dateLabel(sourceSnapshot.endInclusive)}.
              Số Excel được giữ riêng để so sánh, không cộng vào sổ Neon.
            </p>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            <MetricCard
              title="Doanh số hợp đồng · Excel / danh sách"
              value={money(sourceSnapshot.contractRevenue)}
              note={`Danh sách hợp đồng ${money(sourceContractRevenue)} · lệch ${money(sourceContractRevenue - sourceSnapshot.contractRevenue)}`}
              icon={<Wallet className="h-5 w-5" />}
              tone={Math.abs(sourceContractRevenue - sourceSnapshot.contractRevenue) >= 1 ? 'rose' : 'emerald'}
            />
            <MetricCard
              title="Tổng quỹ · Excel / phân bổ Neon"
              value={money(sourceSnapshot.totalFund)}
              note={`Neon ${money(sourceRecordedFund)} · lệch ${money(sourceRecordedFund - sourceSnapshot.totalFund)}`}
              icon={<Wallet className="h-5 w-5" />}
              tone={Math.abs(sourceRecordedFund - sourceSnapshot.totalFund) >= 1 ? 'rose' : 'emerald'}
            />
            <MetricCard
              title="Đã chi · Excel / nhật ký Neon"
              value={money(sourceSnapshot.totalPaid)}
              note={`Neon ${money(sourceLivePaid)} (${sourcePeriodLogs.length} phiếu) · lệch ${money(sourceLivePaid - sourceSnapshot.totalPaid)}`}
              icon={<CheckCircle2 className="h-5 w-5" />}
              tone={Math.abs(sourceLivePaid - sourceSnapshot.totalPaid) >= 1 ? 'rose' : 'emerald'}
            />
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            <MetricCard title="Tổng quỹ lũy kế · Excel" value={money(sourceSnapshot.cumulativeFund)} note="Theo số tổng hợp trong tab nguồn" icon={<Wallet className="h-5 w-5" />} tone="blue" />
            <MetricCard title="Đã chi lũy kế · Excel" value={money(sourceSnapshot.cumulativePaid)} note="Theo số tổng hợp trong tab nguồn" icon={<CheckCircle2 className="h-5 w-5" />} tone="emerald" />
            <MetricCard title="Phải trả lũy kế · Excel" value={money(sourceSnapshot.cumulativePayable)} note="Theo số tổng hợp trong tab nguồn" icon={<Clock3 className="h-5 w-5" />} tone="violet" />
          </div>
          <div className="overflow-x-auto rounded-xl border border-amber-200 bg-white">
            <table className="min-w-[760px] w-full text-left text-xs">
              <thead className="bg-slate-50 text-[10px] uppercase tracking-wide text-slate-500">
                <tr><th className="px-3 py-2.5">Nhóm quỹ</th><th className="px-3 py-2.5 text-right">Tỷ lệ ảnh</th><th className="px-3 py-2.5 text-right">Tổng quỹ ảnh</th><th className="px-3 py-2.5 text-right">Phân bổ Neon</th><th className="px-3 py-2.5 text-right">Đã chi ảnh</th><th className="px-3 py-2.5 text-right">Đã chi Neon</th><th className="px-3 py-2.5 text-right">Còn lại ảnh</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sourceComparisonRows.map((row) => (
                  <tr key={row.key}>
                    <td className="px-3 py-2.5 font-semibold text-slate-800">{row.label}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums">{(row.rate * 100).toLocaleString('vi-VN', { maximumFractionDigits: 1 })}%</td>
                    <td className="px-3 py-2.5 text-right tabular-nums">{money(row.fund)}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums">{money(row.liveAllocation)}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums">{money(row.paid)}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums">{money(row.livePaid)}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums">{money(row.remaining)}</td>
                  </tr>
                ))}
                <tr className="bg-slate-50 font-bold text-slate-900">
                  <td className="px-3 py-2.5">Tổng cộng</td>
                  <td className="px-3 py-2.5 text-right">2,5%</td>
                  <td className="px-3 py-2.5 text-right">{money(sourceSnapshot.totalFund)}</td>
                  <td className="px-3 py-2.5 text-right">{money(sourceRecordedFund)}</td>
                  <td className="px-3 py-2.5 text-right">{money(sourceSnapshot.totalPaid)}</td>
                  <td className="px-3 py-2.5 text-right">{money(sourceLivePaid)}</td>
                  <td className="px-3 py-2.5 text-right">{money(sourceSnapshot.remaining)}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="text-[11px] leading-5 text-amber-900">
            Bảng hợp đồng, phân bổ và nhật ký chi trong Neon được đối chiếu nguyên trạng. Chênh lệch được báo cáo để rà soát; dữ liệu ảnh không được tự nhập hoặc ghi đè vào database.
          </p>
        </section>
      )}

      {showSourceDetails && sourceDetailsForRange.length > 0 && (
        <section className="overflow-hidden rounded-2xl border border-blue-200 bg-white shadow-sm">
          <div className="flex flex-col gap-2 border-b border-blue-100 bg-blue-50/60 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-bold text-slate-900">Chi tiết từng người thụ hưởng · tháng 9/2026</h2>
              <p className="mt-1 text-xs text-slate-600">
                {sourceDetailsForRange.length} dòng trong tab Excel, ngày chi {dateLabel(sourceDetailsForRange[0].date)}. Sổ Neon kỳ này có {matchingLogs.length} phiếu, đã chi {money(paidTotal)}; hai nguồn được trình bày riêng.
              </p>
            </div>
            <span className="w-fit rounded-full border border-blue-200 bg-white px-3 py-1 text-[10px] font-semibold text-blue-700">Tham chiếu workbook · không phải phiếu Neon</span>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-[760px] w-full text-left text-xs">
              <thead className="bg-slate-50 text-[10px] uppercase tracking-wide text-slate-500">
                <tr><th className="px-4 py-3">Người thụ hưởng</th><th className="px-3 py-3">Bộ phận / hạng mục</th><th className="px-3 py-3 text-center">Số dòng</th><th className="px-3 py-3 text-right">Các khoản theo file</th><th className="px-4 py-3 text-right">Tổng theo người</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sourcePeopleSummary.map((person) => (
                  <tr key={person.beneficiary}>
                    <td className="px-4 py-3 font-semibold text-slate-900">{person.beneficiary}</td>
                    <td className="px-3 py-3 text-slate-600">{person.departments}</td>
                    <td className="px-3 py-3 text-center tabular-nums">{person.amounts.length}</td>
                    <td className="px-3 py-3 text-right tabular-nums text-slate-600">{person.amounts.map(money).join(' + ')}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-right font-bold tabular-nums text-slate-900">{money(person.total)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-blue-50 font-bold text-slate-900">
                <tr><td colSpan={3} className="px-4 py-3">Tổng theo workbook · {sourceDetailsForRange.length} dòng</td><td className="px-3 py-3 text-right">—</td><td className="whitespace-nowrap px-4 py-3 text-right">{money(sourcePeopleTotal)}</td></tr>
              </tfoot>
            </table>
          </div>
        </section>
      )}

      <section className="grid gap-3 sm:grid-cols-2 2xl:grid-cols-4">
        <MetricCard title={selectedAllocations.length ? 'Phân bổ đã nhập' : 'Quỹ định mức (2,5%)'} value={money(reportedFund)} note={selectedAllocations.length ? `Định mức theo doanh số HĐ: ${money(fundBudget)}` : `Theo doanh số HĐ: ${money(contractBase)}`} icon={<Wallet className="h-5 w-5" />} tone="blue" />
        <MetricCard title="Tổng đề nghị chi" value={money(proposedTotal)} note={`${matchingLogs.length} phiếu chưa bị từ chối`} icon={<Wallet className="h-5 w-5" />} tone="rose" />
        <MetricCard title="Đã thanh toán / thực hiện" value={money(paidTotal)} note="Theo trạng thái phiếu đã chi" icon={<CheckCircle2 className="h-5 w-5" />} tone="emerald" />
        <MetricCard title="Chờ thanh toán" value={money(waitingTotal)} note="Không cộng phiếu đã từ chối" icon={<Clock3 className="h-5 w-5" />} tone="violet" />
      </section>

      {selectedAllocations.length > 0 && Math.abs(recordedAllocation - fundBudget) >= 1 && (
        <section className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-900">
          <strong>Số phân bổ chưa khớp định mức:</strong> bảng phân bổ ghi {money(recordedAllocation)}, trong khi 2,5% doanh số hợp đồng trong kỳ là {money(fundBudget)} (chênh {money(recordedAllocation - fundBudget)}). Trang giữ nguyên cả hai số liệu để đối chiếu, không tự điều chỉnh dữ liệu nguồn.
        </section>
      )}
      {selectedAllocations.length > 0 && matchingLogs.length === 0 && (
        <section className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-xs text-blue-900">
          Đã tải phân bổ từ bảng quỹ tuần/tháng. Kỳ này chưa có phiếu chi thuộc Quỹ vận hành, BP hỗ trợ KT hoặc BP hỗ trợ CN trong nhật ký thu chi; bảng chi tiết và các thẻ chi phản ánh phiếu trong sổ hiện có.
        </section>
      )}

      <div className="grid gap-5 2xl:grid-cols-12">
        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm 2xl:col-span-8">
          <div className="flex flex-col gap-3 border-b border-slate-100 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-bold text-slate-900">Chi tiết quỹ vận hành và hỗ trợ</h2>
              <p className="mt-1 text-xs text-slate-500">Các phiếu chi thuộc kỳ {periodTitle}; số tiền thực chi chỉ cộng khi phiếu đã thanh toán hoặc thực hiện.</p>
            </div>
            <label className="relative w-full sm:max-w-xs">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Tìm mã phiếu, quỹ, người nhận..." className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-xs outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
            </label>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-[980px] w-full text-left text-xs">
              <thead className="bg-slate-50 text-[10px] uppercase tracking-wide text-slate-500">
                <tr><th className="px-4 py-3">Thời gian / Mã phiếu</th><th className="px-3 py-3">Loại quỹ</th><th className="px-3 py-3">Hạng mục chi</th><th className="px-3 py-3 text-right">Số tiền</th><th className="px-3 py-3">Người nhận / Tài khoản</th><th className="px-3 py-3 text-center">Trạng thái</th><th className="px-3 py-3 text-center">Chi tiết</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-blue-50/50">
                    <td className="px-4 py-3"><div className="font-semibold text-slate-800">{dateLabel(log.request_date)}</div><div className="mt-0.5 font-mono text-[10px] text-slate-500">{log.request_code || `#${log.id}`}</div></td>
                    <td className="px-3 py-3"><span className="rounded-full bg-blue-50 px-2 py-1 text-[10px] font-semibold text-blue-700">{log.fund_source}</span></td>
                    <td className="max-w-[230px] px-3 py-3"><div className="truncate font-medium text-slate-700" title={log.detail_content}>{log.detail_content || '—'}</div><div className="mt-0.5 text-[10px] text-slate-400">{log.expense_type || 'Thủ công'}</div></td>
                    <td className="whitespace-nowrap px-3 py-3 text-right font-semibold tabular-nums text-slate-900">{money(amountFor(log))}{PAID_STATUSES.has(log.status) && <div className="mt-0.5 text-[10px] font-normal text-emerald-700">Thực chi {money(paidAmountFor(log))}</div>}</td>
                    <td className="px-3 py-3"><div className="font-medium text-slate-800">{log.beneficiary_name || '—'}</div><div className="mt-0.5 text-[10px] text-slate-500">{log.beneficiary_bank_account ? `STK ${log.beneficiary_bank_account}` : log.beneficiary_phone || 'Chưa có tài khoản'}</div></td>
                    <td className="px-3 py-3 text-center"><StatusBadge status={log.status} /></td>
                    <td className="px-3 py-3 text-center"><button type="button" onClick={() => setViewLog(log)} className="rounded-lg p-2 text-slate-500 hover:bg-blue-50 hover:text-blue-700" aria-label={`Xem phiếu ${log.request_code}`}><Eye className="h-4 w-4" /></button></td>
                  </tr>
                ))}
                {!filteredLogs.length && <tr><td colSpan={7} className="px-4 py-12 text-center text-sm text-slate-500">{matchingLogs.length ? 'Không có phiếu phù hợp với nội dung tìm kiếm.' : 'Chưa có phiếu thuộc các quỹ này trong kỳ đã chọn.'}</td></tr>}
              </tbody>
              <tfoot className="bg-blue-50 font-bold text-slate-800"><tr><td colSpan={3} className="px-4 py-3">TỔNG CỘNG · {filteredLogs.length} phiếu</td><td className="whitespace-nowrap px-3 py-3 text-right">{money(filteredLogs.reduce((sum, log) => sum + amountFor(log), 0))}</td><td colSpan={3} className="px-3 py-3 text-[10px] font-medium text-slate-500">Quỹ phân bổ còn lại toàn kỳ: {money(remaining)}</td></tr></tfoot>
            </table>
          </div>
        </section>

        <aside className="space-y-5 2xl:col-span-4">
          <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div><h2 className="font-bold text-slate-900">Tỷ lệ phân bổ theo nguồn</h2><p className="mt-1 text-[11px] text-slate-500">Theo các dòng quỹ đã nhập cho kỳ</p></div>
              <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-bold text-blue-700">Quỹ chung 2,5%</span>
            </div>
            <div className="my-5 flex justify-center">
                <div className="relative h-40 w-40 rounded-full" style={chartStyle} role="img" aria-label="Biểu đồ tỷ lệ phân bổ theo quỹ">
                <div className="absolute inset-6 flex flex-col items-center justify-center rounded-full bg-white text-center shadow-inner"><span className="text-[10px] text-slate-500">Tổng phân bổ</span><strong className="mt-1 max-w-24 text-sm leading-5 text-slate-900">{money(recordedAllocation)}</strong></div>
              </div>
            </div>
            <div className="space-y-3">
              {fundSummaries.map((fund) => (
                <div key={fund.key}>
                  <div className="flex items-center justify-between gap-3 text-xs">
                    <span className="flex min-w-0 items-center gap-2 font-medium text-slate-700"><i className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: fund.color }} />{fund.label}</span>
                    <span className="shrink-0 text-right font-semibold tabular-nums text-slate-800">{fund.share.toLocaleString('vi-VN', { maximumFractionDigits: 1 })}% · {money(fund.allocated)}</span>
                  </div>
                  <div className="mt-1 flex justify-between gap-2 pl-4 text-[10px] text-slate-400"><span className="truncate" title={fund.rateSource || fund.sourceSheet}>{fund.rateSource || fund.sourceSheet || 'Chưa có dòng phân bổ'}</span><span className="shrink-0">Phiếu chi {fund.rows} · Đã chi {money(fund.paid)}</span></div>
                </div>
              ))}
            </div>
            <div className={`mt-4 rounded-xl p-3 ${remaining < 0 ? 'bg-rose-50 text-rose-800' : 'bg-slate-900 text-white'}`}>
              <div className="flex justify-between gap-3 text-xs font-bold"><span>CÒN LẠI TOÀN KỲ SAU THỰC CHI</span><span className="tabular-nums">{money(remaining)}</span></div>
              <p className={`mt-1 text-[10px] ${remaining < 0 ? 'text-rose-700' : 'text-slate-300'}`}>Quỹ ghi nhận {money(reportedFund)} trừ số đã thanh toán/thực hiện {money(paidTotal)}.</p>
            </div>
          </section>
          <section className="rounded-xl border border-blue-100 bg-blue-50/70 p-4 text-xs leading-5 text-slate-600">
            <h3 className="font-bold text-slate-800">Cách tính đang áp dụng</h3>
            <ul className="mt-2 list-disc space-y-1 pl-4">
              <li>Định mức quỹ = tổng giá trị phân bổ hợp đồng trong kỳ × 2,5%, theo bảng ngân sách hợp đồng hiện tại.</li>
              <li>Phân bổ đã nhập được lấy từ bảng phân bổ tuần/tháng. Khi có chênh lệch với định mức, trang hiển thị riêng để đối chiếu.</li>
              <li>Đề nghị chi cộng phiếu chưa bị từ chối; thực chi cộng các trạng thái “Đã chi”, “Đã thanh toán” hoặc “Đã thực hiện”.</li>
              <li>Tỷ lệ bên phải là phần của từng nhóm trên tổng số tiền phân bổ ghi nhận, không phải tỷ lệ ngân sách riêng.</li>
            </ul>
          </section>
        </aside>
      </div>

      {isCreateOpen && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/50 p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !isSubmitting) setIsCreateOpen(false); }}>
          <section role="dialog" aria-modal="true" aria-labelledby="create-operations-fund-title" className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <div>
                <p className="text-xs text-slate-500">Phiếu mới · trạng thái mặc định Chờ duyệt</p>
                <h2 id="create-operations-fund-title" className="mt-1 text-lg font-bold text-slate-900">Thêm Quỹ vận hành hỗ trợ</h2>
              </div>
              <button type="button" disabled={isSubmitting} onClick={() => setIsCreateOpen(false)} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 disabled:opacity-50" aria-label="Đóng"><X className="h-5 w-5" /></button>
            </div>
            <form onSubmit={submitFundEntry} className="space-y-4 p-5">
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="space-y-1.5 text-xs font-semibold text-slate-700">
                  <span>Ngày đề nghị *</span>
                  <input type="date" required value={createForm.requestDate} onChange={(event) => setCreateForm((current) => ({ ...current, requestDate: event.target.value }))} className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm font-normal outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
                </label>
                <label className="space-y-1.5 text-xs font-semibold text-slate-700">
                  <span>Nhóm quỹ *</span>
                  <select value={createForm.fundKey} onChange={(event) => setCreateForm((current) => ({ ...current, fundKey: event.target.value as OperationsSupportFundKey }))} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm font-normal outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100">
                    {OPERATIONS_SUPPORT_FUND_TYPES.map((fund) => <option key={fund.key} value={fund.key}>{fund.label}</option>)}
                  </select>
                </label>
                <label className="space-y-1.5 text-xs font-semibold text-slate-700">
                  <span>Bộ phận / hạng mục</span>
                  <input value={createForm.department} onChange={(event) => setCreateForm((current) => ({ ...current, department: event.target.value }))} placeholder="VD: Tổng điều hành" className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm font-normal outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
                </label>
                <label className="space-y-1.5 text-xs font-semibold text-slate-700">
                  <span>Số tiền đề nghị *</span>
                  <input type="number" min="1" step="1" required value={createForm.proposedAmount} onChange={(event) => setCreateForm((current) => ({ ...current, proposedAmount: event.target.value }))} placeholder="0" className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm font-normal outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
                </label>
                <label className="space-y-1.5 text-xs font-semibold text-slate-700 sm:col-span-2">
                  <span>Hạng mục / nội dung chi *</span>
                  <input required value={createForm.detailContent} onChange={(event) => setCreateForm((current) => ({ ...current, detailContent: event.target.value }))} placeholder="Nhập nội dung đề nghị chi" className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm font-normal outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
                </label>
                <label className="space-y-1.5 text-xs font-semibold text-slate-700">
                  <span>Họ và tên người thụ hưởng *</span>
                  <input required value={createForm.beneficiaryName} onChange={(event) => setCreateForm((current) => ({ ...current, beneficiaryName: event.target.value }))} className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm font-normal outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
                </label>
                <label className="space-y-1.5 text-xs font-semibold text-slate-700">
                  <span>Số điện thoại</span>
                  <input value={createForm.beneficiaryPhone} onChange={(event) => setCreateForm((current) => ({ ...current, beneficiaryPhone: event.target.value }))} className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm font-normal outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
                </label>
                <label className="space-y-1.5 text-xs font-semibold text-slate-700 sm:col-span-2">
                  <span>Tài khoản / ngân hàng</span>
                  <input value={createForm.beneficiaryBankAccount} onChange={(event) => setCreateForm((current) => ({ ...current, beneficiaryBankAccount: event.target.value }))} placeholder="Số tài khoản (có thể kèm tên ngân hàng)" className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm font-normal outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
                </label>
              </div>
              {createError && <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">{createError}</p>}
              <p className="text-[11px] leading-5 text-slate-500">Khi bấm lưu, hệ thống tạo phiếu trong nhật ký thu chi bằng API hiện hành. Dữ liệu Excel tham chiếu không được tự động ghi vào database.</p>
              <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
                <button type="button" disabled={isSubmitting} onClick={() => setIsCreateOpen(false)} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50">Hủy</button>
                <button type="submit" disabled={isSubmitting} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60">{isSubmitting ? 'Đang lưu…' : 'Lưu phiếu'}</button>
              </div>
            </form>
          </section>
        </div>
      )}

      {viewLog && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/50 p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setViewLog(null); }}>
          <section role="dialog" aria-modal="true" aria-labelledby="operations-expense-title" className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4"><div><p className="text-xs text-slate-500">Chi tiết phiếu · {viewLog.request_code || `#${viewLog.id}`}</p><h2 id="operations-expense-title" className="mt-1 text-lg font-bold text-slate-900">{viewLog.fund_source}</h2></div><button type="button" onClick={() => setViewLog(null)} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100" aria-label="Đóng"><X className="h-5 w-5" /></button></div>
            <div className="grid gap-3 p-5 sm:grid-cols-2">
              <Detail label="Ngày đề nghị" value={dateLabel(viewLog.request_date)} />
              <Detail label="Trạng thái" value={viewLog.status} />
              <Detail label="Hạng mục chi" value={viewLog.detail_content || '—'} />
              <Detail label="Số tiền đề nghị" value={money(amountFor(viewLog))} />
              <Detail label="Thực chi" value={PAID_STATUSES.has(viewLog.status) ? money(paidAmountFor(viewLog)) : 'Chưa ghi nhận'} />
              <Detail label="Ngày thanh toán" value={dateLabel(viewLog.payment_date)} />
              <Detail label="Người đề nghị" value={viewLog.requester_name || '—'} />
              <Detail label="Người thụ hưởng" value={viewLog.beneficiary_name || '—'} />
              <Detail label="Điện thoại" value={viewLog.beneficiary_phone || '—'} />
              <Detail label="Tài khoản nhận" value={viewLog.beneficiary_bank_account || 'Chưa ghi trên phiếu'} />
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl bg-slate-50 p-3"><p className="text-[11px] text-slate-500">{label}</p><p className="mt-1 break-words text-sm font-semibold text-slate-800">{value}</p></div>;
}
