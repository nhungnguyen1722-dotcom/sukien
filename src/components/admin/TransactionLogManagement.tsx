'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  AlertCircle,
  CalendarDays,
  CheckCircle2,
  CircleDollarSign,
  Eye,
  MoreVertical,
  Plus,
  Printer,
  Receipt,
  Search,
  Wallet,
  X,
  XCircle,
} from 'lucide-react';

export interface TransactionLog {
  id: number;
  request_code: string;
  request_date: string | null;
  fund_source: string;
  detail_content: string;
  requester_id?: string | null;
  requester_name: string;
  requester_phone?: string | null;
  approver_id?: string | null;
  approver_name: string;
  approver_phone?: string | null;
  beneficiary_name: string;
  beneficiary_phone?: string | null;
  proposed_amount: number | null;
  available_balance: number | null;
  fund_alert: string;
  status: string;
  actual_expense?: number | null;
  receipt_url?: string | null;
  approval_date?: string | null;
  payment_date?: string | null;
  source_complete?: boolean;
  expense_type?: string;
  beneficiary_user_id?: number | null;
  beneficiary_bank_account?: string | null;
  source_contract_id?: number | null;
  beneficiary_role?: string | null;
  beneficiary_team?: string | null;
}

export interface TransactionMember {
  id: number;
  full_name: string;
  phone?: string | null;
  bank_account?: string | null;
  team_name?: string | null;
  title?: string | null;
}

export interface WeeklyAllocation {
  period_code: string;
  period_month: string;
  period_label: string;
  period_start: string;
  period_end: string;
  fund_key: string;
  fund_source: string;
  allocation_rate: number;
  requested_amount: number;
  source_sheet: string;
}

export interface FundContract {
  id: number;
  contract_code: string | null;
  contract_date: string;
  customer_name: string;
  value: number;
  allocated_value: number;
  closer_name: string;
  closer_phone: string;
  closer_fee: number;
  referrer_name: string;
  referrer_phone: string;
  referrer_fee: number;
  supporter_name: string;
  supporter_phone: string;
  supporter_fee: number;
  status: string;
  source_period_code?: string;
  source_excel_row?: number;
  source_sheet?: string;
  source_beneficiaries?: FundContractBeneficiary[];
  unallocated_pool?: number;
  distributed_commission?: number;
  remaining_fund?: number;
}

export interface FundContractBeneficiary {
  name: string;
  amount: number;
}

export interface EventFundExpense {
  event_code: string;
  event_date: string;
  beneficiary_phone: string;
  beneficiary_name: string;
  expense_role: string;
  proposed_amount: number;
  status: string;
}

interface Props {
  initialLogs: TransactionLog[];
  initialMembers: TransactionMember[];
  weeklyAllocations: WeeklyAllocation[];
  contracts: FundContract[];
  workbookContracts: FundContract[];
  workbookWarnings: Record<string, string[]>;
  eventExpenses: EventFundExpense[];
  currentMonth: string;
}

const MONTH_OVERVIEW = '__month_overview__';

const FUND_ORDER = [
  'direct_sale',
  'tribute_connection',
  'tribute_support',
  'tribute_referral',
  'event_close',
  'customer_care',
  'training',
  'incentive',
  'travel',
  'operations',
  'support_kt',
  'support_cn',
];

const FUND_COLORS: Record<string, string> = {
  direct_sale: '#2563eb',
  tribute_connection: '#059669',
  tribute_support: '#d97706',
  tribute_referral: '#0891b2',
  event_close: '#7c3aed',
  customer_care: '#0d9488',
  training: '#8b5cf6',
  incentive: '#f59e0b',
  travel: '#10b981',
  operations: '#4f46e5',
  support_kt: '#6366f1',
  support_cn: '#a855f7',
  leader: '#db2777',
};

const FUND_LABELS: Record<string, string> = {
  direct_sale: 'Sale trực tiếp · Pro sale',
  tribute_connection: 'Tri ân kết nối Sale trực tiếp',
  tribute_support: 'Tri ân hỗ trợ Sale',
  tribute_referral: 'Tri ân giới thiệu',
  event_close: 'Quỹ Sự kiện & Chốt hợp đồng',
  customer_care: 'Quỹ Chăm sóc khách hàng',
  training: 'Quỹ Đào tạo Chuyên môn & Kỹ năng',
  incentive: 'Quỹ Thi đua & Chương trình thúc đẩy',
  travel: 'Chi phí Công tác phí',
  operations: 'Quỹ Vận hành',
  support_kt: 'BP hỗ trợ KT',
  support_cn: 'BP hỗ trợ CN',
  leader: 'Leader Team & Giám đốc KD',
};

const FUND_SOURCE_BY_KEY: Record<string, string> = {
  direct_sale: 'Sale trực tiếp - Pro sale (Nguồn khách)',
  tribute_connection: 'Tri ân kết nối sale trực tiếp',
  tribute_support: 'Tri ân hỗ trợ sale',
  tribute_referral: 'Tri ân giới thiệu',
  event_close: 'Quỹ Sự kiện & Chốt hợp đồng',
  customer_care: 'Quỹ Chăm sóc khách hàng',
  training: 'Quỹ Đào tạo Chuyên môn & Kỹ năng',
  incentive: 'Quỹ Thi đua & Chương trình thúc đẩy',
  travel: 'Chi phí Công tác phí',
  operations: 'Quỹ Vận hành',
  support_kt: 'BP hỗ trợ KT',
  support_cn: 'BP hỗ trợ CN',
  leader: 'Leader team - giám đốc Kd',
};

const formatVND = (amount: number | null | undefined) =>
  `${new Intl.NumberFormat('vi-VN').format(Math.round(Number(amount || 0)))} ₫`;

const inputClass = 'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100';

const formatDate = (date?: string | null) => {
  if (!date) return '—';
  const match = date.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return match ? `${match[3]}/${match[2]}/${match[1]}` : date;
};

const safeText = (value?: string | null) => value?.trim() || 'Chưa có dữ liệu';
const isPaidStatus = (status: string) => ['Đã chi', 'Đã thanh toán', 'Đã thực hiện'].includes(status);
const normalizeFund = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[đĐ]/g, 'd').trim().toLocaleLowerCase('vi');

function withinPeriod(date: string, period: WeeklyAllocation) {
  return date >= period.period_start && date <= period.period_end;
}

function contractBeneficiaries(contract: FundContract): FundContractBeneficiary[] {
  if (contract.source_beneficiaries) return contract.source_beneficiaries;
  return [
    { name: contract.closer_name, amount: contract.closer_fee },
    { name: contract.referrer_name, amount: contract.referrer_fee },
    { name: contract.supporter_name, amount: contract.supporter_fee },
  ].filter((person) => person.name.trim());
}

function contractPool(contract: FundContract) {
  return contract.unallocated_pool ?? Math.round(contract.allocated_value * 0.15);
}

function contractCommission(contract: FundContract) {
  return contract.distributed_commission
    ?? [contract.closer_fee, contract.referrer_fee, contract.supporter_fee].reduce((sum, amount) => sum + Number(amount || 0), 0);
}

function contractRemainingFund(contract: FundContract) {
  return contract.remaining_fund ?? contractPool(contract) - contractCommission(contract);
}

function groupContractsByPerson(contracts: FundContract[]) {
  const people = new Map<string, {
    name: string;
    total: number;
    contracts: Map<number, { contract: FundContract; amount: number }>;
  }>();

  for (const contract of contracts) {
    for (const beneficiary of contractBeneficiaries(contract)) {
      const key = beneficiary.name.normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/đ/gi, 'd')
        .toLocaleLowerCase('vi')
        .replace(/[^a-z0-9 ]/g, ' ')
        .trim()
        .replace(/\s+/g, ' ');
      const person = people.get(key) || { name: beneficiary.name, total: 0, contracts: new Map() };
      const contractAllocation = person.contracts.get(contract.id);
      if (contractAllocation) contractAllocation.amount += beneficiary.amount;
      else person.contracts.set(contract.id, { contract, amount: beneficiary.amount });
      person.total += beneficiary.amount;
      people.set(key, person);
    }
  }

  return Array.from(people.values())
    .map((person) => ({ ...person, contracts: Array.from(person.contracts.values()) }))
    .sort((a, b) => a.name.localeCompare(b.name, 'vi'));
}

function formatPeriodRange(period: WeeklyAllocation) {
  const start = period.period_start.match(/^(\d{4})-(\d{2})-(\d{2})/);
  const end = period.period_end.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!start || !end) return '';
  if (start[1] === end[1] && start[2] === end[2]) return `${start[3]}–${end[3]}/${end[2]}`;
  return `${start[3]}/${start[2]}–${end[3]}/${end[2]}`;
}

function getPeriodWeekNumber(period: WeeklyAllocation, index: number) {
  const label = period.period_label.trim();
  const match = `${label} ${period.period_code}`.match(/(?:tuần|tuan|week|wk|w)[\s._-]*0?([1-5])\b/i)
    || label.match(/^0?([1-5])\b/);
  return match ? Number(match[1]) : index + 1;
}

function Panel({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <section className={`rounded-2xl border border-slate-200 bg-white shadow-sm ${className}`}>{children}</section>;
}

export default function TransactionLogManagement({ initialLogs, initialMembers, weeklyAllocations, contracts, workbookContracts, workbookWarnings, eventExpenses, currentMonth }: Props) {
  const [logs, setLogs] = useState(initialLogs);
  const [activeTab, setActiveTab] = useState<'cashflow' | 'event' | 'vouchers'>('cashflow');
  const [selectedYear, setSelectedYear] = useState(currentMonth.slice(0, 4));
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const yearOptions = useMemo(() => {
    const years = new Set<number>();
    const dates = [
      currentMonth,
      ...weeklyAllocations.map((row) => row.period_month),
      ...contracts.map((contract) => contract.contract_date),
      ...eventExpenses.map((expense) => expense.event_date),
      ...logs.map((log) => log.request_date || ''),
    ];
    for (const date of dates) {
      const year = Number(date.slice(0, 4));
      if (year >= 2000 && year <= 2200) years.add(year);
    }
    years.add(Number(selectedYear));
    return Array.from(years).sort((a, b) => b - a);
  }, [contracts, currentMonth, eventExpenses, logs, selectedYear, weeklyAllocations]);
  const periodsForMonth = useMemo(() => {
    const unique = new Map<string, WeeklyAllocation>();
    weeklyAllocations
      .filter((row) => row.period_month === selectedMonth && !row.period_code.endsWith('-MONTH'))
      .forEach((row) => unique.set(row.period_code, row));
    return Array.from(unique.values()).sort((a, b) => a.period_start.localeCompare(b.period_start));
  }, [weeklyAllocations, selectedMonth]);
  const [selectedPeriodCode, setSelectedPeriodCode] = useState(MONTH_OVERVIEW);
  const selectedPeriod = selectedPeriodCode === MONTH_OVERVIEW
    ? undefined
    : periodsForMonth.find((period) => period.period_code === selectedPeriodCode) || periodsForMonth.at(-1);
  const isMonthOverview = selectedPeriodCode === MONTH_OVERVIEW;
  const periodCodesForMonth = new Set(periodsForMonth.map((period) => period.period_code));
  const weeklyRowsForMonth = weeklyAllocations.filter((row) => (
    row.period_month === selectedMonth && periodCodesForMonth.has(row.period_code)
  ));

  const periodBase = (period: WeeklyAllocation) => {
    const sourceContracts = workbookContracts.filter((contract) => contract.source_period_code === period.period_code);
    const sourceRows = sourceContracts.length ? sourceContracts : contracts.filter((contract) => withinPeriod(contract.contract_date, period));
    return sourceRows.reduce((total, contract) => total + contract.allocated_value, 0);
  };

  const monthContracts = ((selectedMonth === '2026-09' && workbookContracts.length)
    ? workbookContracts
    : periodsForMonth.length
      ? contracts.filter((contract) => periodsForMonth.some((period) => withinPeriod(contract.contract_date, period)))
      : contracts.filter((contract) => contract.contract_date.slice(0, 7) === selectedMonth))
    .sort((a, b) => a.contract_date.localeCompare(b.contract_date) || a.id - b.id);
  const monthBase = monthContracts.reduce((total, contract) => total + contract.allocated_value, 0);
  const selectedBase = selectedPeriod ? periodBase(selectedPeriod) : 0;
  const monthPool = monthContracts.reduce((total, contract) => total + contractPool(contract), 0);
  const monthEventRows = weeklyRowsForMonth.filter((row) => row.fund_key === 'event_close');
  const monthEventPool = Math.round(monthEventRows.reduce((sum, row) => {
    const period = periodsForMonth.find((item) => item.period_code === row.period_code);
    return sum + (period ? periodBase(period) * row.allocation_rate : 0);
  }, 0));
  const monthlyEventExpenses = eventExpenses.filter((item) => item.event_date.slice(0, 7) === selectedMonth);
  const staffProposed = monthlyEventExpenses.reduce((sum, item) => sum + item.proposed_amount, 0);
  const staffPaid = monthlyEventExpenses
    .filter((item) => isPaidStatus(item.status))
    .reduce((sum, item) => sum + item.proposed_amount, 0);
  const otherEventRequests = logs.filter(
    (log) => log.fund_source.toLowerCase().includes('sự kiện')
      && log.request_date?.slice(0, 7) === selectedMonth
      && Number(log.proposed_amount || 0) > 0
      && log.status !== 'Từ chối'
  );
  const otherEventProposed = otherEventRequests.reduce((sum, item) => sum + Number(item.proposed_amount || 0), 0);
  const otherEventPaid = otherEventRequests
    .filter((item) => isPaidStatus(item.status))
    .reduce((sum, item) => sum + Number(item.actual_expense || 0), 0);
  const monthlyEventPaid = staffPaid + otherEventPaid;

  const monthLeaderRows = weeklyRowsForMonth.filter((row) => row.fund_key === 'leader');
  const monthlyLeaderPool = Math.round(monthLeaderRows.reduce((sum, row) => {
    const period = periodsForMonth.find((item) => item.period_code === row.period_code);
    return sum + (period ? periodBase(period) * row.allocation_rate : 0);
  }, 0));
  const monthlyLeaderRequests = monthLeaderRows.reduce((sum, row) => sum + row.requested_amount, 0);

  const selectedRows = selectedPeriod
    ? weeklyAllocations
        .filter((row) => row.period_code === selectedPeriod.period_code && row.fund_key !== 'leader')
        .sort((a, b) => FUND_ORDER.indexOf(a.fund_key) - FUND_ORDER.indexOf(b.fund_key))
    : [];
  const monthFundRows = Array.from(
    weeklyAllocations
      .filter((row) => periodCodesForMonth.has(row.period_code) && row.fund_key !== 'leader')
      .reduce((summaries, row) => {
        const period = periodsForMonth.find((item) => item.period_code === row.period_code);
        const current = summaries.get(row.fund_key);
        const allocationAmount = period ? Math.round(periodBase(period) * row.allocation_rate) : 0;
        summaries.set(row.fund_key, current
          ? {
              ...current,
              requested_amount: current.requested_amount + row.requested_amount,
              allocation_amount: current.allocation_amount + allocationAmount,
              periods: current.periods + 1,
            }
          : {
              fund_key: row.fund_key,
              fund_source: row.fund_source,
              allocation_rate: row.allocation_rate,
              requested_amount: row.requested_amount,
              source_sheet: row.source_sheet,
              allocation_amount: allocationAmount,
              periods: 1,
            });
        return summaries;
      }, new Map<string, {
        fund_key: string;
        fund_source: string;
        allocation_rate: number;
        requested_amount: number;
        source_sheet: string;
        allocation_amount: number;
        periods: number;
      }>())
      .values()
  ).sort((a, b) => FUND_ORDER.indexOf(a.fund_key) - FUND_ORDER.indexOf(b.fund_key));
  const sourceDirectSale = selectedRows.find((row) => row.fund_key === 'direct_sale');
  const reportedSalesBase = sourceDirectSale && sourceDirectSale.allocation_rate > 0
    ? sourceDirectSale.requested_amount / sourceDirectSale.allocation_rate
    : null;
  const salesBaseDifference = reportedSalesBase == null ? 0 : Math.round(selectedBase - reportedSalesBase);
  const selectedRequests = selectedPeriod
    ? weeklyAllocations
        .filter((row) => row.period_code === selectedPeriod.period_code)
        .reduce((sum, row) => sum + row.requested_amount, 0)
    : 0;
  const monthRequests = weeklyAllocations
    .filter((row) => periodCodesForMonth.has(row.period_code))
    .reduce((sum, row) => sum + row.requested_amount, 0);
  const selectedContracts = selectedPeriod
    ? (workbookContracts.some((contract) => contract.source_period_code === selectedPeriod.period_code)
        ? workbookContracts.filter((contract) => contract.source_period_code === selectedPeriod.period_code)
        : contracts.filter((contract) => withinPeriod(contract.contract_date, selectedPeriod)))
        .sort((a, b) => a.contract_date.localeCompare(b.contract_date) || a.id - b.id)
    : [];
  const displayedContracts = isMonthOverview ? monthContracts : selectedContracts;
  const displayedContractTotals = displayedContracts.reduce((totals, contract) => ({
    pool: totals.pool + contractPool(contract),
    commission: totals.commission + contractCommission(contract),
    remaining: totals.remaining + contractRemainingFund(contract),
  }), { pool: 0, commission: 0, remaining: 0 });
  const peopleRows = groupContractsByPerson(displayedContracts);
  const displayedWorkbookWarnings = selectedMonth === '2026-09'
    ? (isMonthOverview
        ? Object.values(workbookWarnings).flat()
        : workbookWarnings[selectedPeriod?.period_code || ''] || [])
    : [];

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFund, setSelectedFund] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedType, setSelectedType] = useState('all');
  const filteredLogs = logs.filter((log) => {
    const haystack = `${log.request_code} ${log.detail_content} ${log.requester_name} ${log.beneficiary_name} ${log.fund_source}`.toLocaleLowerCase('vi');
    return (!searchQuery || haystack.includes(searchQuery.toLocaleLowerCase('vi')))
      && (selectedFund === 'all' || log.fund_source === selectedFund)
      && (selectedStatus === 'all' || log.status === selectedStatus)
      && (selectedType === 'all' || (log.expense_type || 'Thủ công') === selectedType);
  });

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [viewLog, setViewLog] = useState<TransactionLog | null>(null);
  const [viewContract, setViewContract] = useState<FundContract | null>(null);
  const [distributionView, setDistributionView] = useState<'contract' | 'person'>('contract');
  const [printLog, setPrintLog] = useState<TransactionLog | null>(null);
  const [actionMenuId, setActionMenuId] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState({
    requestCode: 'YC',
    requestDate: new Date().toISOString().slice(0, 10),
    fundSource: FUND_SOURCE_BY_KEY.direct_sale,
    detailContent: '',
    requesterName: '',
    requesterPhone: '',
    approverName: '',
    approverPhone: '',
    beneficiaryName: '',
    beneficiaryPhone: '',
    beneficiaryUserId: '',
    beneficiaryBankAccount: '',
    proposedAmount: '',
    status: 'Chờ duyệt',
  });

  const openCreateForm = () => {
    setForm((current) => ({
      ...current,
      requestCode: `YC${String(Date.now()).slice(-5)}`,
      requestDate: new Date().toISOString().slice(0, 10),
    }));
    setIsCreateOpen(true);
  };

  useEffect(() => {
    let active = true;
    fetch('/api/admin/transaction-logs/generate', { method: 'POST' })
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok || !result.success) throw new Error(result.message || 'Không tạo được phiếu tự động.');
        if (active) setLogs(result.logs || []);
      })
      .catch((error) => console.error('Automatic contract slip generation failed:', error));
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!printLog) return;
    const afterPrint = () => setPrintLog(null);
    window.addEventListener('afterprint', afterPrint);
    const timeoutId = window.setTimeout(() => window.print(), 100);
    return () => {
      window.clearTimeout(timeoutId);
      window.removeEventListener('afterprint', afterPrint);
    };
  }, [printLog]);

  const handleCreate = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.detailContent.trim() || !form.beneficiaryName.trim() || Number(form.proposedAmount) <= 0) {
      alert('Nhập người thụ hưởng, nội dung và số tiền đề xuất lớn hơn 0.');
      return;
    }
    setIsSubmitting(true);
    try {
      const response = await fetch('/api/admin/transaction-logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || 'Không tạo được phiếu.');
      setLogs((current) => [result.log, ...current]);
      setIsCreateOpen(false);
      setForm((current) => ({ ...current, requestCode: `YC${String(Date.now()).slice(-5)}`, detailContent: '', proposedAmount: '', beneficiaryName: '', beneficiaryPhone: '', beneficiaryUserId: '', beneficiaryBankAccount: '', status: 'Chờ duyệt' }));
    } catch (error: unknown) {
      alert(error instanceof Error ? error.message : 'Có lỗi xảy ra.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateLogStatus = async (log: TransactionLog, status: string) => {
    try {
      const response = await fetch('/api/admin/transaction-logs', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: log.id, status }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || 'Không cập nhật được phiếu.');
      setLogs((current) => current.map((item) => item.id === log.id ? result.log : item));
      setActionMenuId(null);
    } catch (error: unknown) {
      alert(error instanceof Error ? error.message : 'Có lỗi xảy ra.');
    }
  };

  const deleteLog = async (log: TransactionLog) => {
    if (!confirm(`Xóa phiếu ${log.request_code}?`)) return;
    const response = await fetch(`/api/admin/transaction-logs?id=${log.id}`, { method: 'DELETE' });
    const result = await response.json();
    if (!response.ok || !result.success) {
      alert(result.message || 'Không xóa được phiếu.');
      return;
    }
    setLogs((current) => current.filter((item) => item.id !== log.id));
    setActionMenuId(null);
  };

  const changeYear = (year: string) => {
    setSelectedYear(year);
    setSelectedMonth(`${year}-${selectedMonth.slice(5, 7)}`);
    setSelectedPeriodCode(MONTH_OVERVIEW);
  };

  const changeMonth = (month: number) => {
    setSelectedMonth(`${selectedYear}-${String(month).padStart(2, '0')}`);
    setSelectedPeriodCode(MONTH_OVERVIEW);
  };

  const paidAmountForFund = (fundKey: string, fundSource: string) => logs
    .filter((log) => {
      if (!isPaidStatus(log.status) || !log.request_date) return false;
      if (isMonthOverview ? !log.request_date.startsWith(selectedMonth) : !selectedPeriod || !withinPeriod(log.request_date, selectedPeriod)) return false;
      const target = normalizeFund(FUND_SOURCE_BY_KEY[fundKey] || fundSource);
      return normalizeFund(log.fund_source) === normalizeFund(fundSource)
        || normalizeFund(log.fund_source) === target;
    })
    .reduce((sum, log) => sum + Number(log.actual_expense ?? log.proposed_amount ?? 0), 0);

  return (
    <div className="space-y-5 px-[30px] pt-6 pb-8">
      <header className="flex flex-col gap-4 rounded-2xl bg-slate-100 p-5 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="mb-1 flex items-center gap-2 text-xs font-medium text-slate-500">
            <Link href="/admin" className="hover:text-blue-600">Trang chủ</Link><span>›</span><span>Nhật ký thu chi</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Nhật ký dòng tiền & phân bổ quỹ</h1>
        </div>
        <button onClick={openCreateForm} className="hidden sm:inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700">
          <Plus className="h-4 w-4" /> Thêm phiếu chi
        </button>
      </header>

      <Panel className="p-2">
        <nav role="tablist" aria-label="Các phân hệ nhật ký thu chi" className="grid gap-2 sm:grid-cols-3">
          {[
            { id: 'cashflow' as const, title: 'Nhật ký dòng tiền & Phân bổ quỹ', subtitle: 'Quản lý theo hợp đồng' },
            { id: 'event' as const, title: 'Quỹ Sự kiện & Chốt hợp đồng', subtitle: 'Tổng hợp tháng' },
            { id: 'vouchers' as const, title: 'Nhật ký phiếu thu chi', subtitle: 'Phiếu tự động và thủ công' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={activeTab === tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`rounded-xl px-3 py-3 text-left transition ${activeTab === tab.id ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-700 hover:bg-slate-50'}`}
            >
              <span className="block text-xs font-bold sm:text-sm">{tab.title}</span>
              <span className={`mt-1 block text-[10px] ${activeTab === tab.id ? 'text-blue-100' : 'text-slate-500'}`}>{tab.subtitle}</span>
            </button>
          ))}
        </nav>
      </Panel>

      {activeTab !== 'vouchers' && <Panel className="p-3">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <div className="flex items-center gap-2">
            <label htmlFor="transaction-log-year" className="px-2 text-xs font-bold uppercase tracking-wide text-slate-500">Năm</label>
            <select
              id="transaction-log-year"
              aria-label="Chọn năm"
              value={selectedYear}
              onChange={(event) => changeYear(event.target.value)}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700"
            >
              {yearOptions.map((year) => <option key={year} value={year}>{year}</option>)}
            </select>
          </div>
          <div className="hidden h-6 w-px bg-slate-300 sm:block" />
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-2 text-xs font-bold uppercase tracking-wide text-slate-500">Tháng</span>
            {Array.from({ length: 12 }, (_, index) => index + 1).map((month) => (
              <button key={month} onClick={() => changeMonth(month)} className={`min-w-9 rounded-lg border px-3 py-2 text-xs font-semibold ${Number(selectedMonth.slice(5, 7)) === month ? 'border-blue-700 bg-slate-900 text-white' : 'border-slate-200 text-slate-700 hover:bg-slate-50'}`}>
                {month}
              </button>
            ))}
          </div>
          <div className="hidden h-6 w-px bg-slate-300 sm:block" />
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-2 text-xs font-bold uppercase tracking-wide text-slate-500">Tuần</span>
            <button onClick={() => setSelectedPeriodCode(MONTH_OVERVIEW)} className={`rounded-lg border px-3 py-2 text-xs font-semibold ${isMonthOverview ? 'border-blue-500 bg-blue-600 text-white' : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'}`}>
              Cả tháng
            </button>
            {periodsForMonth.map((period, index) => (
              <button key={period.period_code} onClick={() => setSelectedPeriodCode(period.period_code)} className={`rounded-lg border px-3 py-2 text-xs font-semibold ${selectedPeriodCode === period.period_code ? 'border-blue-500 bg-blue-600 text-white' : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'}`}>
                {getPeriodWeekNumber(period, index)} · {formatPeriodRange(period) || period.period_label}
              </button>
            ))}
          </div>
        </div>
      </Panel>}

      {activeTab === 'cashflow' && <>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={<Wallet className="h-5 w-5" />} label={isMonthOverview ? 'Doanh số HĐ tháng' : 'Doanh số HĐ kỳ tuần'} value={formatVND(isMonthOverview ? monthBase : selectedBase)} note={`${isMonthOverview ? monthContracts.length : selectedContracts.length} hợp đồng ${isMonthOverview ? 'trong tháng' : 'trong kỳ'}`} tint="blue" />
        <StatCard icon={<CircleDollarSign className="h-5 w-5" />} label={isMonthOverview ? 'Quỹ phân bổ tháng (15%)' : 'Quỹ phân bổ tuần (15%)'} value={formatVND(displayedContractTotals.pool)} note="Tính theo giá trị chốt được phân bổ" tint="indigo" />
        <StatCard icon={<Receipt className="h-5 w-5" />} label={isMonthOverview ? 'Đề nghị chi theo tháng' : 'Đề nghị chi theo bảng tuần'} value={formatVND(isMonthOverview ? monthRequests : selectedRequests)} note={isMonthOverview ? 'Cộng tất cả các tuần trong tháng' : 'Tổng cột đề nghị trong DNTT'} tint="amber" />
        <StatCard icon={<CalendarDays className="h-5 w-5" />} label="Quỹ tích lũy tháng" value={formatVND(monthPool)} note={`Tháng ${Number(selectedMonth.slice(5)) || '—'}/${selectedMonth.slice(0, 4) || '—'}`} tint="emerald" />
      </div>

      <div className="grid gap-5 xl:grid-cols-12">
        <Panel className="overflow-hidden xl:col-span-8">
          <div className="border-b border-slate-200 px-5 py-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="font-bold text-slate-900">Bảng kê hợp đồng & nhân sự thụ hưởng — {isMonthOverview ? `Tổng quan tháng ${Number(selectedMonth.slice(5))}/${selectedMonth.slice(0, 4)}` : selectedPeriod?.period_label || 'Chưa có kỳ'}</h2>
                <p className="mt-1 text-xs text-slate-500">Hiển thị danh sách nhân sự và số tiền phân bổ theo từng hợp đồng.</p>
              </div>
              <div role="group" aria-label="Chế độ xem bảng kê" className="flex shrink-0 rounded-lg border border-slate-200 bg-slate-50 p-1">
                <button type="button" aria-pressed={distributionView === 'contract'} onClick={() => setDistributionView('contract')} className={`rounded-md px-3 py-2 text-[11px] font-semibold ${distributionView === 'contract' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:bg-white'}`}>
                  Xem theo hợp đồng
                </button>
                <button type="button" aria-pressed={distributionView === 'person'} onClick={() => setDistributionView('person')} className={`rounded-md px-3 py-2 text-[11px] font-semibold ${distributionView === 'person' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:bg-white'}`}>
                  Xem theo Họ và tên
                </button>
              </div>
            </div>
            {!isMonthOverview && Math.abs(salesBaseDifference) >= 1 && <p className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-900">Doanh số trong danh sách hợp đồng ({formatVND(selectedBase)}) lệch {formatVND(salesBaseDifference)} so với nền DNTT ({formatVND(reportedSalesBase)}). Bảng đề nghị tuần giữ nguyên số ghi trong Excel để tiện đối soát.</p>}
            {displayedWorkbookWarnings.map((warning) => <p key={warning} className="mt-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-[11px] leading-5 text-amber-950">{warning}</p>)}
          </div>
          <div className="overflow-x-auto">
            {distributionView === 'contract' ? (
              <table className="min-w-[1120px] w-full text-left text-xs">
                <thead className="bg-slate-50 text-[10px] uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Ngày / HĐ / Khách hàng</th>
                    <th className="px-3 py-3 text-right">Giá trị phân bổ</th>
                    <th className="px-3 py-3">Danh sách nhân sự thụ hưởng</th>
                    <th className="px-3 py-3 text-right">Quỹ chưa chia (15%)</th>
                    <th className="px-3 py-3 text-right">Hoa hồng chia</th>
                    <th className="px-3 py-3 text-right">Quỹ còn lại</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {displayedContracts.length ? displayedContracts.map((contract) => (
                    <tr
                      key={contract.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => setViewContract(contract)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          setViewContract(contract);
                        }
                      }}
                      title="Xem chi tiết hợp đồng"
                      className="cursor-pointer hover:bg-blue-50/60 focus:bg-blue-50/60 focus:outline-none"
                    >
                      <td className="px-4 py-3">
                        <div className="font-semibold text-slate-800">{contract.contract_code || (contract.source_excel_row ? `Excel · dòng ${contract.source_excel_row}` : `HĐ #${contract.id}`)} · {contract.customer_name}</div>
                        <div className="mt-1 text-[10px] text-slate-500">Ngày ký {formatDate(contract.contract_date)} · {contract.status}</div>
                      </td>
                      <td className="whitespace-nowrap px-3 py-3 text-right font-semibold text-slate-900">{formatVND(contract.allocated_value)}</td>
                      <td className="px-3 py-3">
                        <div className="flex min-w-[330px] flex-wrap gap-1.5">
                          {contractBeneficiaries(contract).map((person, index) => (
                            <span key={`${person.name}-${index}`} className="inline-flex flex-wrap items-center gap-x-1 rounded-md bg-slate-50 px-2 py-1 text-[10px]">
                              <span className="font-semibold text-slate-700">{person.name}</span>
                              <span className="whitespace-nowrap text-slate-500">{formatVND(person.amount)}</span>
                            </span>
                          ))}
                          {!contractBeneficiaries(contract).length && <span className="text-slate-400">Chưa có nhân sự</span>}
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-3 py-3 text-right">{formatVND(contractPool(contract))}</td>
                      <td className="whitespace-nowrap px-3 py-3 text-right font-semibold text-slate-800">{formatVND(contractCommission(contract))}</td>
                      <td className="whitespace-nowrap px-3 py-3 text-right font-semibold text-slate-800">{formatVND(contractRemainingFund(contract))}</td>
                    </tr>
                  )) : <tr><td colSpan={6} className="px-4 py-12 text-center text-slate-500">{isMonthOverview ? 'Không có hợp đồng trong tháng này.' : 'Không có hợp đồng trong kỳ này.'}</td></tr>}
                </tbody>
                <tfoot className="bg-blue-50 font-bold text-slate-800">
                  <tr>
                    <td colSpan={2} className="px-4 py-3">{isMonthOverview ? 'TỔNG CỘNG THÁNG' : 'TỔNG CỘNG KỲ TUẦN'}</td>
                    <td className="px-3 py-3 text-slate-600">{displayedContracts.length} hợp đồng · {peopleRows.length} nhân sự</td>
                    <td className="whitespace-nowrap px-3 py-3 text-right">{formatVND(displayedContractTotals.pool)}</td>
                    <td className="whitespace-nowrap px-3 py-3 text-right">{formatVND(displayedContractTotals.commission)}</td>
                    <td className="whitespace-nowrap px-3 py-3 text-right">{formatVND(displayedContractTotals.remaining)}</td>
                  </tr>
                </tfoot>
              </table>
            ) : (
              <table className="min-w-[900px] w-full text-left text-xs">
                <thead className="bg-slate-50 text-[10px] uppercase tracking-wide text-slate-500">
                  <tr><th className="px-4 py-3">Họ và tên</th><th className="px-3 py-3 text-right">Tổng hoa hồng chia</th><th className="px-3 py-3">Hợp đồng và phân bổ tương ứng</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {peopleRows.length ? peopleRows.map((person) => (
                    <tr key={person.name}>
                      <td className="px-4 py-3 font-semibold text-slate-800">{person.name}</td>
                      <td className="whitespace-nowrap px-3 py-3 text-right font-bold text-slate-900">{formatVND(person.total)}</td>
                      <td className="px-3 py-3">
                        <div className="flex flex-wrap gap-2">
                          {person.contracts.map(({ contract, amount }) => (
                            <button key={contract.id} type="button" onClick={() => setViewContract(contract)} className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-left text-[10px] hover:border-blue-300 hover:bg-blue-50">
                              <span className="block font-semibold text-slate-700">{contract.customer_name} · {formatDate(contract.contract_date)}</span>
                              <span className="mt-0.5 block text-slate-500">{contract.contract_code || (contract.source_excel_row ? `Excel · dòng ${contract.source_excel_row}` : `HĐ #${contract.id}`)} · {formatVND(amount)}</span>
                            </button>
                          ))}
                        </div>
                      </td>
                    </tr>
                  )) : <tr><td colSpan={3} className="px-4 py-12 text-center text-slate-500">Chưa có nhân sự thụ hưởng trong kỳ này.</td></tr>}
                </tbody>
                <tfoot className="bg-blue-50 font-bold text-slate-800">
                  <tr><td className="px-4 py-3">TỔNG CỘNG</td><td className="whitespace-nowrap px-3 py-3 text-right">{formatVND(displayedContractTotals.commission)}</td><td className="px-3 py-3 text-slate-600">{peopleRows.length} nhân sự · {displayedContracts.length} hợp đồng</td></tr>
                </tfoot>
              </table>
            )}
          </div>
        </Panel>

        <div className="space-y-5 xl:col-span-4">
          <Panel className="p-4">
            <div className="mb-3 flex items-center justify-between border-b border-slate-100 pb-3">
              <div><h2 className="font-bold text-slate-900">{isMonthOverview ? 'Phân bổ quỹ trong tháng' : 'Phân bổ quỹ kỳ tuần'}</h2><p className="mt-1 text-[11px] text-slate-500">Đề nghị chi và số phân bổ được tách riêng.</p></div>
              <span className="rounded-full bg-blue-50 px-2 py-1 text-[10px] font-bold text-blue-700">15%</span>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-[520px] w-full text-left text-[10px]">
                <thead className="border-b border-slate-200 text-slate-500">
                  <tr><th className="px-2 py-2">Quỹ</th><th className="px-2 py-2 text-right">Phân bổ</th><th className="px-2 py-2 text-right">Đã chi</th><th className="px-2 py-2 text-right">Còn tồn</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
              {(isMonthOverview ? monthFundRows : selectedRows).map((row) => {
                const allocation = 'allocation_amount' in row ? row.allocation_amount : Math.round(selectedBase * row.allocation_rate);
                const periodCount = 'periods' in row ? row.periods : 0;
                const paid = paidAmountForFund(row.fund_key, row.fund_source);
                const remaining = allocation - paid;
                return (
                  <tr key={row.fund_key}>
                    <td className="px-2 py-2 align-top"><div className="flex items-start gap-1.5"><span className="mt-1 h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: FUND_COLORS[row.fund_key] || '#64748b' }} /><span><span className="block font-bold text-slate-800">{FUND_LABELS[row.fund_key] || row.fund_source}</span><span className="mt-0.5 block text-[9px] text-slate-500">{isMonthOverview ? `${periodCount} kỳ tuần` : `${(row.allocation_rate * 100).toLocaleString('vi-VN')}%`} · Đề nghị {formatVND(row.requested_amount)}</span></span></div></td>
                    <td className="whitespace-nowrap px-2 py-2 text-right font-semibold text-slate-800">{formatVND(allocation)}</td>
                    <td className="whitespace-nowrap px-2 py-2 text-right font-semibold text-emerald-700">{formatVND(paid)}</td>
                    <td className={`whitespace-nowrap px-2 py-2 text-right font-bold ${remaining < 0 ? 'text-red-600' : 'text-slate-800'}`}>{formatVND(remaining)}</td>
                  </tr>
                );
              })}
              {!(isMonthOverview ? monthFundRows : selectedRows).length && <tr><td colSpan={4} className="px-2 py-8 text-center text-slate-500">Chưa có dữ liệu phân bổ cho kỳ này.</td></tr>}
                </tbody>
              </table>
            </div>
            <div className="mt-3 rounded-xl bg-slate-900 p-3 text-white">
              <div className="flex justify-between text-xs font-bold"><span>{isMonthOverview ? 'TỔNG QUỸ PHÂN BỔ THÁNG (15%)' : 'TỔNG QUỸ PHÂN BỔ TUẦN (15%)'}</span><span>{formatVND((isMonthOverview ? monthBase : selectedBase) * 0.15)}</span></div>
              <div className="mt-1 text-[10px] text-slate-300">{isMonthOverview ? `Tổng hợp ${periodsForMonth.length} kỳ tuần` : `Nguồn bảng: ${selectedPeriod?.source_sheet || 'DATA-Du-an-Nghieng.xlsx'}`}</div>
            </div>
          </Panel>

          <Panel className="p-4">
            <div className="mb-3 flex items-center justify-between">
              <div><h2 className="font-bold text-slate-900">Leader Team & Giám đốc KD</h2><p className="mt-1 text-[11px] text-slate-500">Tổng hợp tháng, chia tỷ lệ 30% / 70%.</p></div>
              <span className="rounded-full bg-pink-50 px-2 py-1 text-[10px] font-bold text-pink-700">2,9%</span>
            </div>
            <div className="space-y-2 text-xs">
              <SplitRow label="Quỹ Leader Team (30%)" amount={Math.round(monthlyLeaderPool * 0.3)} color="text-pink-700" />
              <SplitRow label="Quỹ Giám đốc KD (70%)" amount={Math.round(monthlyLeaderPool * 0.7)} color="text-blue-700" />
              <div className="flex justify-between border-t border-slate-100 pt-2 font-bold"><span>Tổng quỹ lũy kế tháng</span><span>{formatVND(monthlyLeaderPool)}</span></div>
              <div className="flex justify-between text-[11px] text-slate-500"><span>Đề nghị chi trong DNTT tuần</span><span>{formatVND(monthlyLeaderRequests)}</span></div>
            </div>
          </Panel>
        </div>
      </div>

      </>}

      {activeTab === 'event' && <Panel className="overflow-hidden">
        <div className="flex flex-col gap-2 border-b border-slate-200 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
          <div><h2 className="font-bold text-slate-900">Quỹ Sự kiện & Chốt hợp đồng — tổng hợp tháng</h2><p className="mt-1 text-xs text-slate-500">Gồm thù lao nhân sự sự kiện, đề xuất chi và các khoản phát sinh cùng quỹ.</p></div>
          <div className="rounded-lg bg-violet-50 px-3 py-2 text-right"><div className="text-[10px] font-semibold uppercase text-violet-700">Quỹ tích lũy tháng</div><div className="font-bold text-violet-900">{formatVND(monthEventPool)}</div></div>
        </div>
        <div className="grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-4">
          <MiniStat label="Thù lao sự kiện đề nghị" value={formatVND(staffProposed)} note={`${monthlyEventExpenses.length} dòng nhân sự`} />
          <MiniStat label="Đề xuất chi khác" value={formatVND(otherEventProposed)} note="Phiếu thuộc Quỹ Sự kiện" />
          <MiniStat label="Đã thanh toán / thực hiện" value={formatVND(monthlyEventPaid)} note="Chỉ cộng trạng thái đã thanh toán" />
          <MiniStat label="Còn lại sau khi đã chi" value={formatVND(monthEventPool - monthlyEventPaid)} note="Không trừ các khoản còn chờ duyệt" />
        </div>
        <div className="overflow-x-auto border-t border-slate-100">
          <table className="min-w-[760px] w-full text-left text-xs">
            <thead className="bg-slate-50 text-[10px] uppercase text-slate-500"><tr><th className="px-4 py-3">Ngày / Sự kiện</th><th className="px-3 py-3">Người thụ hưởng</th><th className="px-3 py-3">Vai trò</th><th className="px-3 py-3 text-right">Thù lao đề nghị</th><th className="px-3 py-3 text-center">Trạng thái</th></tr></thead>
            <tbody className="divide-y divide-slate-100">{monthlyEventExpenses.map((item, index) => <tr key={`${item.event_code}-${item.beneficiary_phone}-${index}`}><td className="px-4 py-2.5"><div className="font-semibold text-slate-800">{item.event_code}</div><div className="text-[10px] text-slate-500">{formatDate(item.event_date)}</div></td><td className="px-3 py-2.5"><div className="font-medium">{item.beneficiary_name}</div><div className="text-[10px] text-slate-500">{item.beneficiary_phone || '—'}</div></td><td className="px-3 py-2.5">{item.expense_role}</td><td className="px-3 py-2.5 text-right font-semibold">{formatVND(item.proposed_amount)}</td><td className="px-3 py-2.5 text-center"><StatusBadge status={item.status} /></td></tr>)}{!monthlyEventExpenses.length && <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-500">Chưa có chi tiết thù lao sự kiện trong tháng.</td></tr>}</tbody>
          </table>
        </div>
        <p className="px-4 py-3 text-[11px] text-slate-500">Phiếu YC003 trong bảng thu chi chưa có ngày và số tiền; khoản đó được giữ ở trạng thái thiếu dữ liệu và chưa cộng vào tổng đề nghị.</p>
      </Panel>}

      {activeTab === 'vouchers' && <Panel className="overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-slate-200 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
          <div><h2 className="font-bold text-slate-900">Nhật ký phiếu thu chi</h2><p className="mt-1 text-xs text-slate-500">Phiếu tự động từ bảng kê hợp đồng và phiếu thủ công được quản lý cùng tại đây.</p></div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <label className="relative"><Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" /><input value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="Tìm mã, quỹ, nội dung..." className="rounded-lg border border-slate-200 bg-slate-50 py-2 pl-8 pr-3 text-xs" /></label>
            <select value={selectedFund} onChange={(event) => setSelectedFund(event.target.value)} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs"><option value="all">Tất cả quỹ</option>{Array.from(new Set(logs.map((item) => item.fund_source))).map((fund) => <option key={fund} value={fund}>{fund}</option>)}</select>
            <select value={selectedStatus} onChange={(event) => setSelectedStatus(event.target.value)} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs"><option value="all">Tất cả trạng thái</option>{Array.from(new Set(logs.map((item) => item.status))).map((status) => <option key={status} value={status}>{status}</option>)}</select>
            <select value={selectedType} onChange={(event) => setSelectedType(event.target.value)} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs"><option value="all">Tất cả loại phiếu</option><option value="Tự động">Tự động</option><option value="Thủ công">Thủ công</option></select>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-[1120px] w-full text-left text-xs">
            <thead className="bg-slate-50 text-[10px] uppercase text-slate-500"><tr><th className="px-4 py-3">Mã / Ngày</th><th className="px-3 py-3">Phân loại</th><th className="px-3 py-3">Quỹ / Nội dung</th><th className="px-3 py-3">Người đề xuất</th><th className="px-3 py-3">Người duyệt</th><th className="px-3 py-3">Người thụ hưởng</th><th className="px-3 py-3 text-right">Đề xuất / Thực chi</th><th className="px-3 py-3 text-center">Trạng thái</th><th className="px-3 py-3 text-center">Thao tác</th></tr></thead>
            <tbody className="divide-y divide-slate-100">{filteredLogs.map((log) => <tr key={log.id} className="hover:bg-slate-50/70">
              <td className="px-4 py-3"><div className="font-mono font-bold text-slate-800">{log.request_code}</div><div className="mt-1 text-[10px] text-slate-500">{formatDate(log.request_date)}</div></td>
              <td className="px-3 py-3"><span className={`rounded-full px-2 py-1 text-[10px] font-bold ${(log.expense_type || 'Thủ công') === 'Tự động' ? 'bg-violet-50 text-violet-700' : 'bg-slate-100 text-slate-700'}`}>{log.expense_type || 'Thủ công'}</span></td>
              <td className="max-w-[260px] px-3 py-3"><div className="font-semibold text-slate-800">{log.fund_source}</div><div className="mt-1 truncate text-[10px] text-slate-500" title={log.detail_content}>{safeText(log.detail_content)}</div></td>
              <td className="px-3 py-3"><div>{safeText(log.requester_name)}</div><div className="text-[10px] text-slate-500">{log.requester_phone || '—'}</div></td>
              <td className="px-3 py-3"><div>{safeText(log.approver_name)}</div><div className="text-[10px] text-slate-500">{log.approver_phone || '—'}</div></td>
              <td className="px-3 py-3">
                <div className="font-semibold text-slate-900">{safeText(log.beneficiary_name)}</div>
                <div className="text-[10px] text-slate-500">{log.beneficiary_phone || '—'}</div>
                <div className="text-[10px] text-slate-500">{log.beneficiary_bank_account || 'Chưa có tài khoản ngân hàng'}</div>
                {log.beneficiary_team && (
                  <div className="mt-1">
                    <span className="inline-flex items-center gap-1 rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-semibold text-blue-700">
                      Đội: {log.beneficiary_team}
                    </span>
                  </div>
                )}
              </td>
              <td className="px-3 py-3 text-right"><div className="font-semibold">{log.proposed_amount == null ? '—' : formatVND(log.proposed_amount)}</div><div className="text-[10px] text-slate-500">Thực chi {formatVND(log.actual_expense)}</div></td>
              <td className="px-3 py-3 text-center"><StatusBadge status={log.status} /></td>
              <td className="relative px-3 py-3 text-center"><div className="inline-flex items-center gap-1"><button onClick={() => setViewLog(log)} className="rounded p-1.5 text-slate-500 hover:bg-slate-100 hover:text-blue-600" title="Chi tiết"><Eye className="h-4 w-4" /></button><button onClick={() => setPrintLog(log)} className="rounded p-1.5 text-slate-500 hover:bg-slate-100 hover:text-blue-600" title="In phiếu / Lưu PDF"><Printer className="h-4 w-4" /></button><button onClick={() => setActionMenuId(actionMenuId === log.id ? null : log.id)} className="rounded p-1.5 text-slate-500 hover:bg-slate-100" title="Thao tác"><MoreVertical className="h-4 w-4" /></button></div>
                {actionMenuId === log.id && <div className="absolute right-5 top-10 z-20 w-48 rounded-xl border border-slate-200 bg-white py-1 text-left shadow-xl">{log.status !== 'Đã duyệt' && <button onClick={() => updateLogStatus(log, 'Đã duyệt')} className="flex w-full items-center gap-2 px-3 py-2 text-emerald-700 hover:bg-emerald-50"><CheckCircle2 className="h-3.5 w-3.5" /> Duyệt phiếu</button>}{!isPaidStatus(log.status) && <button onClick={() => updateLogStatus(log, 'Đã thanh toán')} className="flex w-full items-center gap-2 px-3 py-2 text-blue-700 hover:bg-blue-50"><Receipt className="h-3.5 w-3.5" /> Đã thanh toán</button>}{!isPaidStatus(log.status) && <button onClick={() => updateLogStatus(log, 'Đã thực hiện')} className="flex w-full items-center gap-2 px-3 py-2 text-indigo-700 hover:bg-indigo-50"><CheckCircle2 className="h-3.5 w-3.5" /> Đã thực hiện</button>}{log.status !== 'Từ chối' && <button onClick={() => updateLogStatus(log, 'Từ chối')} className="flex w-full items-center gap-2 px-3 py-2 text-amber-700 hover:bg-amber-50"><XCircle className="h-3.5 w-3.5" /> Từ chối</button>}<button onClick={() => deleteLog(log)} className="flex w-full items-center gap-2 border-t border-slate-100 px-3 py-2 text-red-700 hover:bg-red-50"><X className="h-3.5 w-3.5" /> Xóa phiếu</button></div>}</td>
            </tr>)}{!filteredLogs.length && <tr><td colSpan={9} className="px-4 py-10 text-center text-slate-500">Không có phiếu phù hợp.</td></tr>}</tbody>
          </table>
        </div>
      </Panel>}

      {isCreateOpen && <Modal onClose={() => setIsCreateOpen(false)} title="Tạo phiếu đề xuất chi">
        <form onSubmit={handleCreate} className="space-y-3 p-5 text-xs">
          <div className="grid gap-3 sm:grid-cols-2"><Field label="Mã phiếu"><input readOnly value={form.requestCode} className={`${inputClass} bg-slate-100`} /></Field><Field label="Ngày đề xuất"><input type="date" value={form.requestDate} onChange={(e) => setForm({ ...form, requestDate: e.target.value })} className={inputClass} /></Field></div>
          <Field label="Nguồn quỹ"><select value={form.fundSource} onChange={(e) => setForm({ ...form, fundSource: e.target.value })} className={inputClass}>{[...Object.values(FUND_SOURCE_BY_KEY)].map((fund) => <option key={fund}>{fund}</option>)}</select></Field>
          <Field label="Nội dung chi tiết"><textarea required rows={3} value={form.detailContent} onChange={(e) => setForm({ ...form, detailContent: e.target.value })} className={inputClass} /></Field>
          <Field label="Số tiền đề xuất (VND)"><input required type="number" min="1" value={form.proposedAmount} onChange={(e) => setForm({ ...form, proposedAmount: e.target.value })} className={inputClass} /></Field>
          <Field label="Trạng thái phiếu"><select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className={inputClass}><option>Chờ duyệt</option><option>Đã duyệt</option><option>Đã thanh toán</option><option>Đã thực hiện</option><option>Từ chối</option></select></Field>
          <div className="grid gap-3 sm:grid-cols-2"><PersonFields title="Người đề xuất" name={form.requesterName} phone={form.requesterPhone} onName={(v) => setForm({ ...form, requesterName: v })} onPhone={(v) => setForm({ ...form, requesterPhone: v })} /><PersonFields title="Người duyệt" name={form.approverName} phone={form.approverPhone} onName={(v) => setForm({ ...form, approverName: v })} onPhone={(v) => setForm({ ...form, approverPhone: v })} /></div>
          <BeneficiaryFields
            members={initialMembers}
            name={form.beneficiaryName}
            phone={form.beneficiaryPhone}
            bankAccount={form.beneficiaryBankAccount}
            onChange={(name, member) => setForm((current) => ({
              ...current,
              beneficiaryName: name,
              beneficiaryUserId: member ? String(member.id) : '',
              beneficiaryPhone: member ? (member.phone || '') : current.beneficiaryPhone,
              beneficiaryBankAccount: member ? (member.bank_account || '') : current.beneficiaryBankAccount,
            }))}
            onPhone={(beneficiaryPhone) => setForm((current) => ({ ...current, beneficiaryPhone }))}
            onBankAccount={(beneficiaryBankAccount) => setForm((current) => ({ ...current, beneficiaryBankAccount }))}
          />
          <div className="flex justify-end gap-2 border-t border-slate-100 pt-3"><button type="button" onClick={() => setIsCreateOpen(false)} className="rounded-lg border border-slate-200 px-4 py-2">Hủy</button><button disabled={isSubmitting} className="rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white disabled:opacity-50">{isSubmitting ? 'Đang lưu…' : 'Lưu phiếu'}</button></div>
        </form>
      </Modal>}
      {viewLog && <Modal onClose={() => setViewLog(null)} title={`Chi tiết phiếu ${viewLog.request_code}`}>
        <div className="grid gap-3 p-5 text-xs sm:grid-cols-2">
          <Detail label="Ngày đề xuất" value={formatDate(viewLog.request_date)} />
          <Detail label="Phân loại" value={viewLog.expense_type || 'Thủ công'} />
          <Detail label="Nguồn quỹ" value={viewLog.fund_source} />
          <Detail label="Trạng thái" value={viewLog.status} />
          <Detail label="Số tiền đề xuất" value={viewLog.proposed_amount == null ? 'Chưa có số liệu' : formatVND(viewLog.proposed_amount)} />
          <Detail label="Số tiền thực chi" value={formatVND(viewLog.actual_expense)} />
          <Detail label="Người đề xuất" value={`${safeText(viewLog.requester_name)} · ${viewLog.requester_phone || '—'}`} />
          <Detail label="Người duyệt" value={`${safeText(viewLog.approver_name)} · ${viewLog.approver_phone || '—'}`} />
          <Detail label="Người thụ hưởng" value={`${safeText(viewLog.beneficiary_name)} · ${viewLog.beneficiary_phone || '—'}`} />
          <Detail label="Đội nhóm thụ hưởng" value={viewLog.beneficiary_team || 'Chưa phân đội'} />
          <Detail label="Ngân hàng nhận" value={viewLog.beneficiary_bank_account || '—'} />
          <div className="rounded-lg bg-slate-50 p-3 sm:col-span-2"><div className="mb-1 text-slate-500">Nội dung</div>{safeText(viewLog.detail_content)}</div>
          {viewLog.receipt_url && <a href={viewLog.receipt_url} target="_blank" rel="noreferrer" className="text-blue-600 underline sm:col-span-2">Mở chứng từ</a>}
          <button type="button" onClick={() => setPrintLog(viewLog)} className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-3 py-2 font-semibold text-white sm:col-span-2"><Printer className="h-4 w-4" /> In / Lưu PDF</button>
        </div>
      </Modal>}
      {viewContract && <Modal onClose={() => setViewContract(null)} title={`Chi tiết hợp đồng ${viewContract.contract_code || viewContract.customer_name}`}>
        <div className="space-y-4 p-5 text-xs">
          <div className="grid gap-3 sm:grid-cols-2">
            <Detail label="Khách hàng" value={viewContract.customer_name} />
            <Detail label="Ngày ký" value={formatDate(viewContract.contract_date)} />
            <Detail label="Giá trị phân bổ" value={formatVND(viewContract.allocated_value)} />
            <Detail label="Trạng thái hợp đồng" value={viewContract.status || '—'} />
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <Detail label="Tổng quỹ chưa chia (15%)" value={formatVND(contractPool(viewContract))} />
            <Detail label="Tổng hoa hồng chia" value={formatVND(contractCommission(viewContract))} />
            <Detail label="Tổng quỹ còn lại" value={formatVND(contractRemainingFund(viewContract))} />
          </div>
          <div>
            <h3 className="mb-2 font-bold text-slate-800">Nhân sự thụ hưởng</h3>
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="min-w-[420px] w-full text-left">
                <thead className="bg-slate-50 text-[10px] uppercase text-slate-500"><tr><th className="px-3 py-2">Họ và tên</th><th className="px-3 py-2 text-right">Hoa hồng chia</th></tr></thead>
                <tbody className="divide-y divide-slate-100">
                  {contractBeneficiaries(viewContract).map((person, index) => (
                    <tr key={index}>
                      <td className="px-3 py-2 font-semibold text-slate-800">{person.name}</td>
                      <td className="px-3 py-2 text-right font-bold">{formatVND(person.amount)}</td>
                    </tr>
                  ))}
                  {!contractBeneficiaries(viewContract).length && <tr><td colSpan={2} className="px-3 py-6 text-center text-slate-500">Chưa có nhân sự thụ hưởng.</td></tr>}
                </tbody>
              </table>
            </div>
            {viewContract.source_sheet && <p className="mt-2 text-[10px] text-slate-500">Nguồn đối chiếu: {viewContract.source_sheet} · dòng Excel {viewContract.source_excel_row}</p>}
          </div>
        </div>
      </Modal>}
      {printLog && <div className="print-sheet">
        <div className="mb-8 border-b-2 border-slate-900 pb-4 text-center">
          <h1 className="text-sm font-bold uppercase">Công ty Cổ phần Tập đoàn Nghiêng Complex</h1>
          <h2 className="mt-5 text-xl font-bold uppercase">Phiếu đề nghị thanh toán</h2>
          <p className="mt-2 text-sm">Mã phiếu: {printLog.request_code} · Ngày: {formatDate(printLog.request_date)}</p>
        </div>
        <div className="space-y-4 text-sm">
          <p><strong>Loại phiếu:</strong> {printLog.expense_type || 'Thủ công'}</p>
          <p><strong>Nguồn quỹ:</strong> {printLog.fund_source}</p>
          <p><strong>Nội dung thanh toán:</strong> {safeText(printLog.detail_content)}</p>
          <p><strong>Số tiền đề nghị:</strong> {printLog.proposed_amount == null ? 'Chưa có số liệu' : formatVND(printLog.proposed_amount)}</p>
          <p><strong>Người thụ hưởng:</strong> {safeText(printLog.beneficiary_name)} · {printLog.beneficiary_phone || '—'}</p>
          <p><strong>Tài khoản / Ngân hàng:</strong> {printLog.beneficiary_bank_account || '—'}</p>
          <p><strong>Người đề xuất:</strong> {safeText(printLog.requester_name)} · {printLog.requester_phone || '—'}</p>
          <p><strong>Người duyệt:</strong> {safeText(printLog.approver_name)} · {printLog.approver_phone || '—'}</p>
          <p><strong>Trạng thái:</strong> {printLog.status}</p>
        </div>
        <div className="mt-20 grid grid-cols-3 gap-6 text-center text-xs font-bold">
          <div>NGƯỜI ĐỀ NGHỊ</div><div>PHỤ TRÁCH QUỸ</div><div>PHÊ DUYỆT</div>
        </div>
      </div>}
      <button type="button" onClick={openCreateForm} aria-label="Tạo phiếu chi" title="Tạo phiếu chi" className="fixed bottom-5 right-5 z-40 inline-flex h-14 w-14 items-center justify-center rounded-full bg-blue-600 text-white shadow-xl hover:bg-blue-700 sm:hidden"><Plus className="h-6 w-6" /></button>
    </div>
  );
}

function StatCard({ icon, label, value, note, tint }: { icon: React.ReactNode; label: string; value: string; note: string; tint: string }) {
  const tints: Record<string, string> = { blue: 'bg-blue-50 text-blue-700', indigo: 'bg-indigo-50 text-indigo-700', amber: 'bg-amber-50 text-amber-700', emerald: 'bg-emerald-50 text-emerald-700' };
  return <Panel className="p-4"><div className="flex items-start justify-between"><div className="text-xs font-semibold text-slate-500">{label}</div><div className={`rounded-xl p-2 ${tints[tint]}`}>{icon}</div></div><div className="mt-3 text-xl font-bold tracking-tight text-slate-900">{value}</div><div className="mt-1 text-[10px] text-slate-500">{note}</div></Panel>;
}


function SplitRow({ label, amount, color }: { label: string; amount: number; color: string }) {
  return <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2"><span className="font-medium text-slate-700">{label}</span><span className={`font-bold ${color}`}>{formatVND(amount)}</span></div>;
}

function MiniStat({ label, value, note }: { label: string; value: string; note: string }) {
  return <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3"><div className="text-[10px] font-semibold text-slate-500">{label}</div><div className="mt-1 text-base font-bold text-slate-900">{value}</div><div className="mt-1 text-[10px] text-slate-500">{note}</div></div>;
}

function StatusBadge({ status }: { status: string }) {
  const style = isPaidStatus(status) ? 'bg-emerald-50 text-emerald-700' : status === 'Đã duyệt' ? 'bg-blue-50 text-blue-700' : status === 'Từ chối' ? 'bg-red-50 text-red-700' : status === 'Thiếu dữ liệu' ? 'bg-orange-50 text-orange-700' : 'bg-amber-50 text-amber-700';
  return <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-bold ${style}`}>{status === 'Thiếu dữ liệu' ? <AlertCircle className="h-3 w-3" /> : null}{status}</span>;
}

function Modal({ children, onClose, title }: { children: React.ReactNode; onClose: () => void; title: string }) {
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4"><div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl"><div className="flex items-center justify-between border-b border-slate-100 px-5 py-4"><h2 className="font-bold text-slate-900">{title}</h2><button onClick={onClose} className="rounded-lg p-1 text-slate-500 hover:bg-slate-100"><X className="h-5 w-5" /></button></div>{children}</div></div>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block space-y-1"><span className="font-semibold text-slate-600">{label}</span>{children}</label>;
}

function PersonFields({ title, name, phone, onName, onPhone }: { title: string; name: string; phone: string; onName: (value: string) => void; onPhone: (value: string) => void }) {
  return <div className="grid gap-2 rounded-xl border border-slate-100 p-3 sm:grid-cols-2"><div className="font-bold text-slate-700 sm:col-span-2">{title}</div><Field label="Họ tên"><input value={name} onChange={(event) => onName(event.target.value)} className={inputClass} /></Field><Field label="Số điện thoại"><input value={phone} onChange={(event) => onPhone(event.target.value)} className={inputClass} /></Field></div>;
}

function BeneficiaryFields({
  members,
  name,
  phone,
  bankAccount,
  onChange,
  onPhone,
  onBankAccount,
}: {
  members: TransactionMember[];
  name: string;
  phone: string;
  bankAccount: string;
  onChange: (name: string, member?: TransactionMember) => void;
  onPhone: (phone: string) => void;
  onBankAccount: (bankAccount: string) => void;
}) {
  const selectedMember = useMemo(() => {
    return members.find((m) => m.full_name.toLocaleLowerCase('vi') === name.trim().toLocaleLowerCase('vi'));
  }, [members, name]);

  return (
    <div className="grid gap-2 rounded-xl border border-slate-100 p-3 sm:grid-cols-2">
      <div className="font-bold text-slate-700 sm:col-span-2">Người thụ hưởng</div>
      <Field label="Thành viên hoặc đối tác">
        <input
          list="transaction-beneficiary-options"
          value={name}
          onChange={(event) => {
            const nextName = event.target.value;
            const selected = members.find((member) => member.full_name.toLocaleLowerCase('vi') === nextName.trim().toLocaleLowerCase('vi'));
            onChange(nextName, selected);
          }}
          placeholder="Tìm thành viên hoặc nhập tên đối tác"
          className={inputClass}
        />
        <datalist id="transaction-beneficiary-options">
          {members.map((member) => (
            <option key={member.id} value={member.full_name}>
              {member.phone ? `${member.phone} · ` : ''}{member.team_name ? `Đội ${member.team_name}` : ''}{member.title ? ` (${member.title})` : ''}
            </option>
          ))}
        </datalist>
      </Field>
      <Field label="Số điện thoại"><input value={phone} onChange={(event) => onPhone(event.target.value)} className={inputClass} /></Field>
      <Field label="Tài khoản / Ngân hàng nhận"><input value={bankAccount} onChange={(event) => onBankAccount(event.target.value)} className={inputClass} /></Field>
      {selectedMember && (
        <div className="sm:col-span-2 flex flex-wrap items-center gap-2 rounded-lg border border-blue-100 bg-blue-50/80 px-3 py-2 text-xs text-blue-900">
          <span className="font-semibold text-blue-700">Đội nhóm (TeamLead):</span>
          <span className="inline-flex items-center rounded-md bg-white px-2 py-0.5 font-bold text-blue-700 shadow-2xs border border-blue-200">
            {selectedMember.team_name || 'Chưa phân đội'}
          </span>
          {selectedMember.title && (
            <>
              <span className="text-slate-300">|</span>
              <span className="text-slate-600">Chức vụ: <strong>{selectedMember.title}</strong></span>
            </>
          )}
        </div>
      )}
      <p className="text-[10px] text-slate-500 sm:col-span-2">Chọn thành viên để tự động điền Đội nhóm, SĐT và thông tin ngân hàng thụ hưởng.</p>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return <div className="rounded-lg bg-slate-50 p-3"><div className="mb-1 text-slate-500">{label}</div><div className="font-semibold text-slate-800">{value}</div></div>;
}
