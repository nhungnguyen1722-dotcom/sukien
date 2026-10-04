'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  AlertCircle,
  CalendarDays,
  CheckCircle2,
  CircleDollarSign,
  Eye,
  MoreVertical,
  Plus,
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
  weeklyAllocations: WeeklyAllocation[];
  contracts: FundContract[];
  eventExpenses: EventFundExpense[];
}

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

function withinPeriod(date: string, period: WeeklyAllocation) {
  return date >= period.period_start && date <= period.period_end;
}

function Panel({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <section className={`rounded-2xl border border-slate-200 bg-white shadow-sm ${className}`}>{children}</section>;
}

export default function TransactionLogManagement({ initialLogs, weeklyAllocations, contracts, eventExpenses }: Props) {
  const [logs, setLogs] = useState(initialLogs);
  const months = useMemo(
    () => Array.from(new Set(weeklyAllocations.map((row) => row.period_month))).sort(),
    [weeklyAllocations]
  );
  const [selectedMonth, setSelectedMonth] = useState(months.at(-1) || '');
  const periodsForMonth = useMemo(() => {
    const unique = new Map<string, WeeklyAllocation>();
    weeklyAllocations
      .filter((row) => row.period_month === selectedMonth)
      .forEach((row) => unique.set(row.period_code, row));
    return Array.from(unique.values()).sort((a, b) => a.period_start.localeCompare(b.period_start));
  }, [weeklyAllocations, selectedMonth]);
  const [selectedPeriodCode, setSelectedPeriodCode] = useState(periodsForMonth.at(-1)?.period_code || '');
  const selectedPeriod = periodsForMonth.find((period) => period.period_code === selectedPeriodCode) || periodsForMonth.at(-1);

  const periodBase = (period: WeeklyAllocation) =>
    contracts
      .filter((contract) => withinPeriod(contract.contract_date, period))
      .reduce((total, contract) => total + contract.allocated_value, 0);

  const monthBase = periodsForMonth.reduce((total, period) => total + periodBase(period), 0);
  const selectedBase = selectedPeriod ? periodBase(selectedPeriod) : 0;
  const monthPool = Math.round(monthBase * 0.15);
  const monthEventRows = weeklyAllocations.filter((row) => row.period_month === selectedMonth && row.fund_key === 'event_close');
  const monthEventPool = Math.round(monthEventRows.reduce((sum, row) => {
    const period = periodsForMonth.find((item) => item.period_code === row.period_code);
    return sum + (period ? periodBase(period) * row.allocation_rate : 0);
  }, 0));
  const monthlyEventExpenses = eventExpenses.filter((item) => item.event_date.slice(0, 7) === selectedMonth);
  const staffProposed = monthlyEventExpenses.reduce((sum, item) => sum + item.proposed_amount, 0);
  const staffPaid = monthlyEventExpenses
    .filter((item) => item.status === 'Đã chi')
    .reduce((sum, item) => sum + item.proposed_amount, 0);
  const otherEventRequests = logs.filter(
    (log) => log.fund_source.toLowerCase().includes('sự kiện')
      && log.request_date?.slice(0, 7) === selectedMonth
      && Number(log.proposed_amount || 0) > 0
      && log.status !== 'Từ chối'
  );
  const otherEventProposed = otherEventRequests.reduce((sum, item) => sum + Number(item.proposed_amount || 0), 0);
  const otherEventPaid = otherEventRequests
    .filter((item) => item.status === 'Đã chi')
    .reduce((sum, item) => sum + Number(item.actual_expense || 0), 0);
  const monthlyEventPaid = staffPaid + otherEventPaid;

  const monthLeaderRows = weeklyAllocations.filter((row) => row.period_month === selectedMonth && row.fund_key === 'leader');
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
  const selectedContracts = selectedPeriod
    ? contracts
        .filter((contract) => withinPeriod(contract.contract_date, selectedPeriod))
        .sort((a, b) => a.contract_date.localeCompare(b.contract_date) || a.id - b.id)
    : [];

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFund, setSelectedFund] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const filteredLogs = logs.filter((log) => {
    const haystack = `${log.request_code} ${log.detail_content} ${log.requester_name} ${log.beneficiary_name} ${log.fund_source}`.toLocaleLowerCase('vi');
    return (!searchQuery || haystack.includes(searchQuery.toLocaleLowerCase('vi')))
      && (selectedFund === 'all' || log.fund_source === selectedFund)
      && (selectedStatus === 'all' || log.status === selectedStatus);
  });

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [viewLog, setViewLog] = useState<TransactionLog | null>(null);
  const [actionMenuId, setActionMenuId] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState({
    requestCode: `YC${String(Date.now()).slice(-5)}`,
    requestDate: new Date().toISOString().slice(0, 10),
    fundSource: FUND_SOURCE_BY_KEY.direct_sale,
    detailContent: '',
    requesterName: '',
    requesterPhone: '',
    approverName: '',
    approverPhone: '',
    beneficiaryName: '',
    beneficiaryPhone: '',
    proposedAmount: '',
  });

  const handleCreate = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.detailContent.trim() || Number(form.proposedAmount) <= 0) {
      alert('Nhập nội dung và số tiền đề xuất lớn hơn 0.');
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
      setForm((current) => ({ ...current, requestCode: `YC${String(Date.now()).slice(-5)}`, detailContent: '', proposedAmount: '', beneficiaryName: '', beneficiaryPhone: '' }));
    } catch (error: any) {
      alert(error.message || 'Có lỗi xảy ra.');
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
    } catch (error: any) {
      alert(error.message || 'Có lỗi xảy ra.');
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

  const changeMonth = (month: string) => {
    setSelectedMonth(month);
    const nextPeriod = weeklyAllocations.filter((row) => row.period_month === month).sort((a, b) => a.period_start.localeCompare(b.period_start)).at(-1);
    setSelectedPeriodCode(nextPeriod?.period_code || '');
  };

  return (
    <div className="space-y-5 pb-8">
      <header className="flex flex-col gap-4 rounded-2xl bg-slate-100 p-5 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="mb-1 flex items-center gap-2 text-xs font-medium text-slate-500">
            <Link href="/admin" className="hover:text-blue-600">Trang chủ</Link><span>›</span><span>Nhật ký thu chi</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Nhật ký dòng tiền & phân bổ quỹ</h1>
          <p className="mt-1 text-sm text-slate-600">Theo dõi hợp đồng theo tuần, quỹ sự kiện theo tháng và khoản chi theo trạng thái thực tế.</p>
        </div>
        <button onClick={() => setIsCreateOpen(true)} className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700">
          <Plus className="h-4 w-4" /> Thêm phiếu chi
        </button>
      </header>

      <Panel className="p-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-2 text-xs font-bold uppercase tracking-wide text-slate-500">Tháng</span>
            {months.map((month) => (
              <button key={month} onClick={() => changeMonth(month)} className={`rounded-lg border px-3 py-2 text-xs font-semibold ${selectedMonth === month ? 'border-blue-700 bg-slate-900 text-white' : 'border-slate-200 text-slate-700 hover:bg-slate-50'}`}>
                Tháng {Number(month.slice(5))}/{month.slice(0, 4)}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-2 text-xs font-bold uppercase tracking-wide text-slate-500">Kỳ tuần</span>
            {periodsForMonth.map((period) => (
              <button key={period.period_code} onClick={() => setSelectedPeriodCode(period.period_code)} className={`rounded-lg border px-3 py-2 text-xs font-semibold ${selectedPeriodCode === period.period_code ? 'border-blue-500 bg-blue-600 text-white' : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'}`}>
                {period.period_label}
              </button>
            ))}
          </div>
        </div>
      </Panel>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={<Wallet className="h-5 w-5" />} label="Doanh số HĐ kỳ tuần" value={formatVND(selectedBase)} note={`${selectedContracts.length} hợp đồng trong kỳ`} tint="blue" />
        <StatCard icon={<CircleDollarSign className="h-5 w-5" />} label="Quỹ phân bổ tuần (15%)" value={formatVND(selectedBase * 0.15)} note="Tính theo giá trị chốt được phân bổ" tint="indigo" />
        <StatCard icon={<Receipt className="h-5 w-5" />} label="Đề nghị chi theo bảng tuần" value={formatVND(selectedRequests)} note="Tổng cột đề nghị trong DNTT" tint="amber" />
        <StatCard icon={<CalendarDays className="h-5 w-5" />} label="Quỹ tích lũy tháng" value={formatVND(monthPool)} note={`Tháng ${Number(selectedMonth.slice(5)) || '—'}/${selectedMonth.slice(0, 4) || '—'}`} tint="emerald" />
      </div>

      <div className="grid gap-5 xl:grid-cols-12">
        <Panel className="overflow-hidden xl:col-span-8">
          <div className="border-b border-slate-200 px-5 py-4">
            <h2 className="font-bold text-slate-900">Bảng kê hợp đồng & nhân sự thụ hưởng — {selectedPeriod?.period_label || 'Chưa có kỳ'}</h2>
            <p className="mt-1 text-xs text-slate-500">Chi tiết người chốt, người giới thiệu, người hỗ trợ và phí theo hợp đồng.</p>
            {Math.abs(salesBaseDifference) >= 1 && <p className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-900">Doanh số trong danh sách hợp đồng ({formatVND(selectedBase)}) lệch {formatVND(salesBaseDifference)} so với nền DNTT ({formatVND(reportedSalesBase)}). Bảng đề nghị tuần giữ nguyên số ghi trong Excel để tiện đối soát.</p>}
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-[980px] w-full text-left text-xs">
              <thead className="bg-slate-50 text-[10px] uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">Ngày / HĐ / Khách hàng</th><th className="px-3 py-3 text-right">Giá trị phân bổ</th>
                  <th className="px-3 py-3">Người chốt (6%)</th><th className="px-3 py-3">Người giới thiệu (1%)</th><th className="px-3 py-3">Người hỗ trợ (0,5%)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {selectedContracts.length ? selectedContracts.map((contract) => (
                  <tr key={contract.id} className="hover:bg-slate-50/70">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-800">{contract.contract_code || `HĐ #${contract.id}`} · {contract.customer_name}</div>
                      <div className="mt-1 text-[10px] text-slate-500">Ngày ký {formatDate(contract.contract_date)} · {contract.status}</div>
                    </td>
                    <td className="whitespace-nowrap px-3 py-3 text-right font-semibold text-slate-900">{formatVND(contract.allocated_value)}</td>
                    <td className="px-3 py-3"><Payee name={contract.closer_name} phone={contract.closer_phone} amount={contract.closer_fee} color="blue" /></td>
                    <td className="px-3 py-3"><Payee name={contract.referrer_name} phone={contract.referrer_phone} amount={contract.referrer_fee} color="emerald" /></td>
                    <td className="px-3 py-3"><Payee name={contract.supporter_name} phone={contract.supporter_phone} amount={contract.supporter_fee} color="amber" /></td>
                  </tr>
                )) : <tr><td colSpan={5} className="px-4 py-12 text-center text-slate-500">Không có hợp đồng trong kỳ này.</td></tr>}
              </tbody>
              <tfoot className="bg-blue-50 font-bold text-slate-800">
                <tr><td className="px-4 py-3">TỔNG CỘNG KỲ TUẦN</td><td className="px-3 py-3 text-right">{formatVND(selectedBase)}</td><td colSpan={3} className="px-3 py-3 text-slate-600">{selectedContracts.length} hợp đồng · phân bổ theo dữ liệu hợp đồng</td></tr>
              </tfoot>
            </table>
          </div>
        </Panel>

        <div className="space-y-5 xl:col-span-4">
          <Panel className="p-4">
            <div className="mb-3 flex items-center justify-between border-b border-slate-100 pb-3">
              <div><h2 className="font-bold text-slate-900">Phân bổ quỹ kỳ tuần</h2><p className="mt-1 text-[11px] text-slate-500">Đề nghị chi và số phân bổ được tách riêng.</p></div>
              <span className="rounded-full bg-blue-50 px-2 py-1 text-[10px] font-bold text-blue-700">15%</span>
            </div>
            <div className="space-y-2">
              {selectedRows.map((row) => {
                const allocation = Math.round(selectedBase * row.allocation_rate);
                const remaining = allocation - row.requested_amount;
                return (
                  <div key={row.fund_key} className="rounded-xl border border-slate-100 bg-slate-50/70 p-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2"><span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: FUND_COLORS[row.fund_key] || '#64748b' }} /><div><div className="text-[11px] font-bold text-slate-800">{FUND_LABELS[row.fund_key] || row.fund_source}</div><div className="mt-0.5 text-[10px] text-slate-500">{row.fund_key === 'event_close' ? 'Tích lũy tuần · quyết toán theo tháng' : row.fund_key === 'tribute_referral' ? 'Quỹ riêng · nguồn chưa có tỷ lệ và số tiền' : `${(row.allocation_rate * 100).toLocaleString('vi-VN')}% · tổng hợp theo tuần`}</div></div></div>
                      <div className="whitespace-nowrap text-right"><div className="text-[11px] font-bold text-slate-900">{formatVND(allocation)}</div><div className="text-[9px] text-slate-400">phân bổ</div></div>
                    </div>
                    <div className="mt-2 grid grid-cols-2 gap-2 border-t border-slate-200/70 pt-2 text-[10px]">
                      <div><span className="text-slate-500">Đề nghị từ bảng:</span><div className="font-semibold text-slate-700">{formatVND(row.requested_amount)}</div></div>
                      <div className="text-right"><span className="text-slate-500">Chênh lệch:</span><div className={`font-semibold ${remaining < 0 ? 'text-red-600' : 'text-emerald-700'}`}>{formatVND(remaining)}</div></div>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="mt-3 rounded-xl bg-slate-900 p-3 text-white">
              <div className="flex justify-between text-xs font-bold"><span>TỔNG QUỸ PHÂN BỔ TUẦN (15%)</span><span>{formatVND(selectedBase * 0.15)}</span></div>
              <div className="mt-1 text-[10px] text-slate-300">Nguồn bảng: {selectedPeriod?.source_sheet || 'DATA-Du-an-Nghieng.xlsx'}</div>
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

      <Panel className="overflow-hidden">
        <div className="flex flex-col gap-2 border-b border-slate-200 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
          <div><h2 className="font-bold text-slate-900">Quỹ Sự kiện & Chốt hợp đồng — tổng hợp tháng</h2><p className="mt-1 text-xs text-slate-500">Gồm thù lao nhân sự sự kiện, đề xuất chi và các khoản phát sinh cùng quỹ.</p></div>
          <div className="rounded-lg bg-violet-50 px-3 py-2 text-right"><div className="text-[10px] font-semibold uppercase text-violet-700">Quỹ tích lũy tháng</div><div className="font-bold text-violet-900">{formatVND(monthEventPool)}</div></div>
        </div>
        <div className="grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-4">
          <MiniStat label="Thù lao sự kiện đề nghị" value={formatVND(staffProposed)} note={`${monthlyEventExpenses.length} dòng nhân sự`} />
          <MiniStat label="Đề xuất chi khác" value={formatVND(otherEventProposed)} note="Phiếu thuộc Quỹ Sự kiện" />
          <MiniStat label="Đã chi có xác nhận" value={formatVND(monthlyEventPaid)} note="Chỉ tính phiếu trạng thái Đã chi" />
          <MiniStat label="Còn lại sau khi đã chi" value={formatVND(monthEventPool - monthlyEventPaid)} note="Không trừ các khoản còn chờ duyệt" />
        </div>
        <div className="overflow-x-auto border-t border-slate-100">
          <table className="min-w-[760px] w-full text-left text-xs">
            <thead className="bg-slate-50 text-[10px] uppercase text-slate-500"><tr><th className="px-4 py-3">Ngày / Sự kiện</th><th className="px-3 py-3">Người thụ hưởng</th><th className="px-3 py-3">Vai trò</th><th className="px-3 py-3 text-right">Thù lao đề nghị</th><th className="px-3 py-3 text-center">Trạng thái</th></tr></thead>
            <tbody className="divide-y divide-slate-100">{monthlyEventExpenses.map((item, index) => <tr key={`${item.event_code}-${item.beneficiary_phone}-${index}`}><td className="px-4 py-2.5"><div className="font-semibold text-slate-800">{item.event_code}</div><div className="text-[10px] text-slate-500">{formatDate(item.event_date)}</div></td><td className="px-3 py-2.5"><div className="font-medium">{item.beneficiary_name}</div><div className="text-[10px] text-slate-500">{item.beneficiary_phone || '—'}</div></td><td className="px-3 py-2.5">{item.expense_role}</td><td className="px-3 py-2.5 text-right font-semibold">{formatVND(item.proposed_amount)}</td><td className="px-3 py-2.5 text-center"><StatusBadge status={item.status} /></td></tr>)}{!monthlyEventExpenses.length && <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-500">Chưa có chi tiết thù lao sự kiện trong tháng.</td></tr>}</tbody>
          </table>
        </div>
        <p className="px-4 py-3 text-[11px] text-slate-500">Phiếu YC003 trong bảng thu chi chưa có ngày và số tiền; khoản đó được giữ ở trạng thái thiếu dữ liệu và chưa cộng vào tổng đề nghị.</p>
      </Panel>

      <Panel className="overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-slate-200 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
          <div><h2 className="font-bold text-slate-900">Nhật ký phiếu thu chi</h2><p className="mt-1 text-xs text-slate-500">Danh sách YC từ sheet 6. DSThu chi; dòng thiếu dữ liệu được giữ để đối soát.</p></div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <label className="relative"><Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" /><input value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="Tìm mã, quỹ, nội dung..." className="rounded-lg border border-slate-200 bg-slate-50 py-2 pl-8 pr-3 text-xs" /></label>
            <select value={selectedFund} onChange={(event) => setSelectedFund(event.target.value)} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs"><option value="all">Tất cả quỹ</option>{Array.from(new Set(logs.map((item) => item.fund_source))).map((fund) => <option key={fund} value={fund}>{fund}</option>)}</select>
            <select value={selectedStatus} onChange={(event) => setSelectedStatus(event.target.value)} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs"><option value="all">Tất cả trạng thái</option>{Array.from(new Set(logs.map((item) => item.status))).map((status) => <option key={status} value={status}>{status}</option>)}</select>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-[1120px] w-full text-left text-xs">
            <thead className="bg-slate-50 text-[10px] uppercase text-slate-500"><tr><th className="px-4 py-3">Mã / Ngày</th><th className="px-3 py-3">Quỹ / Nội dung</th><th className="px-3 py-3">Người đề xuất</th><th className="px-3 py-3">Người duyệt</th><th className="px-3 py-3">Người thụ hưởng</th><th className="px-3 py-3 text-right">Đề xuất / Thực chi</th><th className="px-3 py-3 text-center">Trạng thái</th><th className="px-3 py-3 text-center">Thao tác</th></tr></thead>
            <tbody className="divide-y divide-slate-100">{filteredLogs.map((log) => <tr key={log.id} className="hover:bg-slate-50/70">
              <td className="px-4 py-3"><div className="font-mono font-bold text-slate-800">{log.request_code}</div><div className="mt-1 text-[10px] text-slate-500">{formatDate(log.request_date)}</div></td>
              <td className="max-w-[260px] px-3 py-3"><div className="font-semibold text-slate-800">{log.fund_source}</div><div className="mt-1 truncate text-[10px] text-slate-500" title={log.detail_content}>{safeText(log.detail_content)}</div></td>
              <td className="px-3 py-3"><div>{safeText(log.requester_name)}</div><div className="text-[10px] text-slate-500">{log.requester_phone || '—'}</div></td>
              <td className="px-3 py-3"><div>{safeText(log.approver_name)}</div><div className="text-[10px] text-slate-500">{log.approver_phone || '—'}</div></td>
              <td className="px-3 py-3"><div>{safeText(log.beneficiary_name)}</div><div className="text-[10px] text-slate-500">{log.beneficiary_phone || '—'}</div></td>
              <td className="px-3 py-3 text-right"><div className="font-semibold">{log.proposed_amount == null ? '—' : formatVND(log.proposed_amount)}</div><div className="text-[10px] text-slate-500">Thực chi {formatVND(log.actual_expense)}</div></td>
              <td className="px-3 py-3 text-center"><StatusBadge status={log.status} /></td>
              <td className="relative px-3 py-3 text-center"><div className="inline-flex items-center gap-1"><button onClick={() => setViewLog(log)} className="rounded p-1.5 text-slate-500 hover:bg-slate-100 hover:text-blue-600" title="Chi tiết"><Eye className="h-4 w-4" /></button><button onClick={() => setActionMenuId(actionMenuId === log.id ? null : log.id)} className="rounded p-1.5 text-slate-500 hover:bg-slate-100" title="Thao tác"><MoreVertical className="h-4 w-4" /></button></div>
                {actionMenuId === log.id && <div className="absolute right-5 top-10 z-20 w-40 rounded-xl border border-slate-200 bg-white py-1 text-left shadow-xl">{log.status !== 'Đã duyệt' && <button onClick={() => updateLogStatus(log, 'Đã duyệt')} className="flex w-full items-center gap-2 px-3 py-2 text-emerald-700 hover:bg-emerald-50"><CheckCircle2 className="h-3.5 w-3.5" /> Duyệt phiếu</button>}{log.status !== 'Đã chi' && <button onClick={() => updateLogStatus(log, 'Đã chi')} className="flex w-full items-center gap-2 px-3 py-2 text-blue-700 hover:bg-blue-50"><Receipt className="h-3.5 w-3.5" /> Xác nhận đã chi</button>}{log.status !== 'Từ chối' && <button onClick={() => updateLogStatus(log, 'Từ chối')} className="flex w-full items-center gap-2 px-3 py-2 text-amber-700 hover:bg-amber-50"><XCircle className="h-3.5 w-3.5" /> Từ chối</button>}<button onClick={() => deleteLog(log)} className="flex w-full items-center gap-2 border-t border-slate-100 px-3 py-2 text-red-700 hover:bg-red-50"><X className="h-3.5 w-3.5" /> Xóa phiếu</button></div>}</td>
            </tr>)}{!filteredLogs.length && <tr><td colSpan={8} className="px-4 py-10 text-center text-slate-500">Không có phiếu phù hợp.</td></tr>}</tbody>
          </table>
        </div>
      </Panel>

      {isCreateOpen && <Modal onClose={() => setIsCreateOpen(false)} title="Tạo phiếu đề xuất chi">
        <form onSubmit={handleCreate} className="space-y-3 p-5 text-xs">
          <div className="grid gap-3 sm:grid-cols-2"><Field label="Mã phiếu"><input readOnly value={form.requestCode} className={`${inputClass} bg-slate-100`} /></Field><Field label="Ngày đề xuất"><input type="date" value={form.requestDate} onChange={(e) => setForm({ ...form, requestDate: e.target.value })} className={inputClass} /></Field></div>
          <Field label="Nguồn quỹ"><select value={form.fundSource} onChange={(e) => setForm({ ...form, fundSource: e.target.value })} className={inputClass}>{[...Object.values(FUND_SOURCE_BY_KEY)].map((fund) => <option key={fund}>{fund}</option>)}</select></Field>
          <Field label="Nội dung chi tiết"><textarea required rows={3} value={form.detailContent} onChange={(e) => setForm({ ...form, detailContent: e.target.value })} className={inputClass} /></Field>
          <Field label="Số tiền đề xuất (VND)"><input required type="number" min="1" value={form.proposedAmount} onChange={(e) => setForm({ ...form, proposedAmount: e.target.value })} className={inputClass} /></Field>
          <div className="grid gap-3 sm:grid-cols-2"><PersonFields title="Người đề xuất" name={form.requesterName} phone={form.requesterPhone} onName={(v) => setForm({ ...form, requesterName: v })} onPhone={(v) => setForm({ ...form, requesterPhone: v })} /><PersonFields title="Người duyệt" name={form.approverName} phone={form.approverPhone} onName={(v) => setForm({ ...form, approverName: v })} onPhone={(v) => setForm({ ...form, approverPhone: v })} /></div>
          <PersonFields title="Người thụ hưởng" name={form.beneficiaryName} phone={form.beneficiaryPhone} onName={(v) => setForm({ ...form, beneficiaryName: v })} onPhone={(v) => setForm({ ...form, beneficiaryPhone: v })} />
          <div className="flex justify-end gap-2 border-t border-slate-100 pt-3"><button type="button" onClick={() => setIsCreateOpen(false)} className="rounded-lg border border-slate-200 px-4 py-2">Hủy</button><button disabled={isSubmitting} className="rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white disabled:opacity-50">{isSubmitting ? 'Đang lưu…' : 'Lưu phiếu'}</button></div>
        </form>
      </Modal>}
      {viewLog && <Modal onClose={() => setViewLog(null)} title={`Chi tiết phiếu ${viewLog.request_code}`}><div className="grid gap-3 p-5 text-xs sm:grid-cols-2"><Detail label="Ngày đề xuất" value={formatDate(viewLog.request_date)} /><Detail label="Nguồn quỹ" value={viewLog.fund_source} /><Detail label="Số tiền đề xuất" value={viewLog.proposed_amount == null ? 'Chưa có số liệu' : formatVND(viewLog.proposed_amount)} /><Detail label="Số tiền thực chi" value={formatVND(viewLog.actual_expense)} /><Detail label="Người đề xuất" value={`${safeText(viewLog.requester_name)} · ${viewLog.requester_phone || '—'}`} /><Detail label="Người duyệt" value={`${safeText(viewLog.approver_name)} · ${viewLog.approver_phone || '—'}`} /><Detail label="Người thụ hưởng" value={`${safeText(viewLog.beneficiary_name)} · ${viewLog.beneficiary_phone || '—'}`} /><Detail label="Trạng thái" value={viewLog.status} /><div className="rounded-lg bg-slate-50 p-3 sm:col-span-2"><div className="mb-1 text-slate-500">Nội dung</div>{safeText(viewLog.detail_content)}</div>{viewLog.receipt_url && <a href={viewLog.receipt_url} target="_blank" rel="noreferrer" className="text-blue-600 underline sm:col-span-2">Mở chứng từ</a>}</div></Modal>}
    </div>
  );
}

function StatCard({ icon, label, value, note, tint }: { icon: React.ReactNode; label: string; value: string; note: string; tint: string }) {
  const tints: Record<string, string> = { blue: 'bg-blue-50 text-blue-700', indigo: 'bg-indigo-50 text-indigo-700', amber: 'bg-amber-50 text-amber-700', emerald: 'bg-emerald-50 text-emerald-700' };
  return <Panel className="p-4"><div className="flex items-start justify-between"><div className="text-xs font-semibold text-slate-500">{label}</div><div className={`rounded-xl p-2 ${tints[tint]}`}>{icon}</div></div><div className="mt-3 text-xl font-bold tracking-tight text-slate-900">{value}</div><div className="mt-1 text-[10px] text-slate-500">{note}</div></Panel>;
}

function Payee({ name, phone, amount, color }: { name?: string | null; phone?: string | null; amount: number; color: string }) {
  const colors: Record<string, string> = { blue: 'text-blue-700', emerald: 'text-emerald-700', amber: 'text-amber-700' };
  return <><div className="font-medium text-slate-800">{safeText(name)}</div><div className="text-[10px] text-slate-500">{phone || '—'}</div><div className={`mt-1 font-bold ${colors[color]}`}>{formatVND(amount)}</div></>;
}

function SplitRow({ label, amount, color }: { label: string; amount: number; color: string }) {
  return <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2"><span className="font-medium text-slate-700">{label}</span><span className={`font-bold ${color}`}>{formatVND(amount)}</span></div>;
}

function MiniStat({ label, value, note }: { label: string; value: string; note: string }) {
  return <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3"><div className="text-[10px] font-semibold text-slate-500">{label}</div><div className="mt-1 text-base font-bold text-slate-900">{value}</div><div className="mt-1 text-[10px] text-slate-500">{note}</div></div>;
}

function StatusBadge({ status }: { status: string }) {
  const style = status === 'Đã chi' ? 'bg-emerald-50 text-emerald-700' : status === 'Đã duyệt' ? 'bg-blue-50 text-blue-700' : status === 'Từ chối' ? 'bg-red-50 text-red-700' : status === 'Thiếu dữ liệu' ? 'bg-orange-50 text-orange-700' : 'bg-amber-50 text-amber-700';
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

function Detail({ label, value }: { label: string; value: string }) {
  return <div className="rounded-lg bg-slate-50 p-3"><div className="mb-1 text-slate-500">{label}</div><div className="font-semibold text-slate-800">{value}</div></div>;
}
