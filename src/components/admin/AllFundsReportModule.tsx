'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  FileSpreadsheet,
  Download,
  Copy,
  Check,
  RefreshCw,
  Search,
  Wallet,
  Users,
  Building2,
  BadgePercent,
  Layers,
  FileText,
  DollarSign,
  Info,
  X,
} from 'lucide-react';
import AdminTimeFilter from '@/components/admin/AdminTimeFilter';
import type {
  AllFundsReportData,
  MasterPerson,
  ContractItem,
  TeamLeadBonusItem,
  OperationLogItem,
} from '@/lib/allFundsReport';
import { formatDateDM } from '@/lib/weekRanges';

const MASTER_EXPORT_COLUMNS: Array<{ key: keyof MasterPerson; label: string; required?: boolean }> = [
  { key: 'name', label: 'Họ tên', required: true },
  { key: 'phone', label: 'Số điện thoại', required: true },
  { key: 'bankAccount', label: 'Số tài khoản', required: true },
  { key: 'bankName', label: 'Ngân hàng', required: true },
  { key: 'totalAmount', label: 'Tổng thực nhận' },
  { key: 'saleCommission', label: '1. Hoa hồng Sale' },
  { key: 'teamLeadBonus', label: '2. Quỹ TeamLead' },
  { key: 'operationsBonus', label: '3. Quỹ Vận hành' },
  { key: 'eventTrainingBonus', label: '4. Đào tạo & SK' },
];

function formatVND(value: number | string | null | undefined): string {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (!num || isNaN(num)) return '0 ₫';
  return `${new Intl.NumberFormat('vi-VN').format(Math.round(num))} ₫`;
}

function formatNumber(value: number | string | null | undefined): string {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (!num || isNaN(num)) return '0';
  return new Intl.NumberFormat('vi-VN').format(Math.round(num));
}

type TabType = 'master' | 'sale' | 'teamlead' | 'operations' | 'customerCare' | 'eventClose' | 'training' | 'incentive' | 'travel';

const DETAIL_TABS: Array<{ id: TabType; label: string }> = [
  { id: 'master', label: 'Tổng hợp tất cả các quỹ' },
  { id: 'sale', label: 'Hoa hồng Sale & Hợp đồng' },
  { id: 'teamlead', label: 'Phân bổ Quỹ TeamLead' },
  { id: 'operations', label: 'Ban hỗ trợ & Vận hành' },
  { id: 'customerCare', label: 'Chăm sóc khách hàng' },
  { id: 'eventClose', label: 'Sự kiện & Chốt hợp đồng' },
  { id: 'training', label: 'Đào tạo Chuyên môn & Kỹ năng' },
  { id: 'incentive', label: 'Thi đua & Chương trình thúc đẩy' },
  { id: 'travel', label: 'Chi phí Công tác phí' },
];

export default function AllFundsReportModule({
  initialMonth,
  initialWeek,
  initialData,
}: {
  initialMonth?: string;
  initialWeek?: number;
  initialData?: AllFundsReportData;
}) {
  const currentYear = new Date().getFullYear();
  const currentMonthNum = new Date().getMonth() + 1;

  const defaultYear = initialMonth ? parseInt(initialMonth.slice(0, 4), 10) : currentYear;
  const defaultMonth = initialMonth ? parseInt(initialMonth.slice(5, 7), 10) : currentMonthNum;

  const [selectedYear, setSelectedYear] = useState<number>(defaultYear);
  const [selectedMonth, setSelectedMonth] = useState<number>(defaultMonth);
  const [selectedWeek, setSelectedWeek] = useState<number>(initialWeek || 0);
  const [activeSheetTab, setActiveSheetTab] = useState<TabType>('master');
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [copiedAllMB, setCopiedAllMB] = useState(false);
  const [isColumnExportOpen, setIsColumnExportOpen] = useState(false);
  const [exportColumns, setExportColumns] = useState<Array<keyof MasterPerson>>([
    'totalAmount',
    'saleCommission',
    'teamLeadBonus',
    'operationsBonus',
    'eventTrainingBonus',
  ]);

  const [data, setData] = useState<AllFundsReportData | null>(initialData || null);
  const [loading, setLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState('');

  const formattedMonth = useMemo(() => {
    return `${selectedYear}-${String(selectedMonth).padStart(2, '0')}`;
  }, [selectedYear, selectedMonth]);
  const periodTitle = useMemo(() => {
    if (!data || !selectedWeek) return `Tháng ${selectedMonth}/${selectedYear}`;
    return `Tuần ${selectedWeek} · ${formatDateDM(data.periodStart)}–${formatDateDM(data.periodEnd)}/${selectedYear}`;
  }, [data, selectedMonth, selectedWeek, selectedYear]);

  const yearOptions = useMemo(() => {
    const list: number[] = [];
    const maxYear = Math.max(currentYear + 1, selectedYear);
    for (let y = maxYear; y >= 2024; y--) {
      list.push(y);
    }
    return list;
  }, [currentYear, selectedYear]);

  // Tải dữ liệu khi đổi năm / tháng
  const loadData = useCallback(async (monthStr: string, weekNo: number, signal?: AbortSignal) => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ month: monthStr, week: String(weekNo) });
      const res = await fetch(`/api/admin/all-funds?${params.toString()}`, { signal });
      if (!res.ok) {
        throw new Error('Không thể tải dữ liệu báo cáo tổng hợp tất cả các quỹ.');
      }
      const json: AllFundsReportData = await res.json();
      setData(json);
    } catch (err: unknown) {
      if (signal?.aborted) return;
      setError(err instanceof Error ? err.message : 'Lỗi khi tải dữ liệu.');
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    if (!data || data.targetMonth !== formattedMonth || data.targetWeek !== selectedWeek) {
      loadData(formattedMonth, selectedWeek, controller.signal);
    }
    return () => controller.abort();
  }, [formattedMonth, selectedWeek, data, loadData]);

  // Xuất file Excel 4 sheet
  const handleExportExcel = async () => {
    try {
      setIsExporting(true);
      const params = new URLSearchParams({ month: formattedMonth, week: String(selectedWeek) });
      const url = `/api/admin/all-funds/export?${params.toString()}`;
      const response = await fetch(url);
      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.error || 'Không thể xuất file Excel.');
      }
      const blob = await response.blob();
      const disposition = response.headers.get('content-disposition');
      let filename = `Bao-cao-tong-hop-tat-ca-cac-quy-Thang-${formattedMonth}.xlsx`;
      if (disposition && disposition.includes('filename=')) {
        const match = disposition.match(/filename="?([^";]+)"?/);
        if (match?.[1]) filename = decodeURIComponent(match[1]);
      }
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(downloadUrl);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Có lỗi khi xuất file Excel.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportMasterExcel = async () => {
    try {
      setIsExporting(true);
      const params = new URLSearchParams({
        view: 'master',
        month: formattedMonth,
        week: String(selectedWeek),
        columns: exportColumns.join(','),
      });
      const response = await fetch(`/api/admin/all-funds/export?${params.toString()}`);
      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.error || 'Không thể xuất bảng tổng hợp Excel.');
      }
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `Tong-hop-quy-${formattedMonth}-T${selectedWeek || 'thang'}.xlsx`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(downloadUrl);
      setIsColumnExportOpen(false);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Có lỗi khi xuất file Excel.');
    } finally {
      setIsExporting(false);
    }
  };

  // Sao chép 1 dòng MB Bank
  const handleCopySingleMB = (p: MasterPerson, key: string) => {
    const text = `${p.name}\t${p.phone || ''}\t${p.bankAccount || ''}\t${p.bankName || ''}\t${p.totalAmount}`;
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Sao chép toàn bộ danh sách MB Bank (để dán vào Excel / Lập lệnh MB Bank)
  const handleCopyAllMB = () => {
    if (!data || data.masterList.length === 0) return;
    const header = "Họ và tên\tSố điện thoại\tSố tài khoản\tNgân hàng\tTổng thực nhận";
    const rows = data.masterList.map(
      (p) => `${p.name}\t${p.phone || ''}\t${p.bankAccount || ''}\t${p.bankName || ''}\t${p.totalAmount}`
    );
    const content = [header, ...rows].join('\n');
    navigator.clipboard.writeText(content);
    setCopiedAllMB(true);
    setTimeout(() => setCopiedAllMB(false), 2500);
  };

  // Lọc dữ liệu Master List theo từ khóa
  const filteredMasterList = useMemo(() => {
    if (!data?.masterList) return [];
    if (!searchQuery.trim()) return data.masterList;
    const q = searchQuery.toLowerCase().trim();
    return data.masterList.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.phone.includes(q) ||
        p.bankAccount.includes(q) ||
        p.bankName.toLowerCase().includes(q) ||
        p.teamName.toLowerCase().includes(q)
    );
  }, [data?.masterList, searchQuery]);

  // Lọc dữ liệu Hợp đồng theo từ khóa
  const filteredContracts = useMemo(() => {
    if (!data?.contracts) return [];
    if (!searchQuery.trim()) return data.contracts;
    const q = searchQuery.toLowerCase().trim();
    return data.contracts.filter(
      (c) =>
        c.contract_code.toLowerCase().includes(q) ||
        c.customer_name.toLowerCase().includes(q) ||
        c.closer_name?.toLowerCase().includes(q) ||
        c.referrer_name?.toLowerCase().includes(q) ||
        c.team_name?.toLowerCase().includes(q)
    );
  }, [data?.contracts, searchQuery]);

  // Lọc dữ liệu TeamLead theo từ khóa
  const filteredTeamLeadRows = useMemo(() => {
    if (!data?.teamLeadRows) return [];
    if (!searchQuery.trim()) return data.teamLeadRows;
    const q = searchQuery.toLowerCase().trim();
    return data.teamLeadRows.filter(
      (t) =>
        t.memberName.toLowerCase().includes(q) ||
        t.memberPhone.includes(q) ||
        t.teamName.toLowerCase().includes(q) ||
        t.role.toLowerCase().includes(q)
    );
  }, [data?.teamLeadRows, searchQuery]);

  // Lọc dữ liệu Ban Hỗ trợ & Vận hành theo từ khóa
  const filteredLogs = useMemo(() => {
    if (!data?.logs) return [];
    if (!searchQuery.trim()) return data.logs;
    const q = searchQuery.toLowerCase().trim();
    return data.logs.filter(
      (l) =>
        l.request_code?.toLowerCase().includes(q) ||
        l.beneficiary_name?.toLowerCase().includes(q) ||
        l.beneficiary_phone?.includes(q) ||
        l.fund_source?.toLowerCase().includes(q) ||
        l.detail_content?.toLowerCase().includes(q)
    );
  }, [data?.logs, searchQuery]);

  const categoryLogs = useMemo(() => {
    const sourceTerms: Partial<Record<TabType, string[]>> = {
      customerCare: ['chăm sóc khách hàng', 'hỗ trợ khách hàng'],
      eventClose: ['sự kiện', 'chốt hợp đồng'],
      training: ['đào tạo'],
      incentive: ['thi đua', 'chương trình thúc đẩy'],
      travel: ['công tác phí'],
    };
    const terms = sourceTerms[activeSheetTab] || [];
    return filteredLogs.filter((log) => {
      const source = (log.fund_source || '').toLocaleLowerCase('vi-VN');
      return terms.some((term) => source.includes(term));
    });
  }, [activeSheetTab, filteredLogs]);

  return (
    <div className="min-h-screen bg-slate-50 px-4 pt-3 pb-12 text-slate-900 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1600px] space-y-5">
        {/* ========================================================================= */}
        {/* THANH ĐIỀU HƯỚNG THỜI GIAN & HÀNH ĐỘNG                                    */}
        {/* ========================================================================= */}
        <header className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs sm:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            {/* Tiêu đề & Giới thiệu */}
            <div>
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-600">
                <span className="flex h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
                ⭐ Báo cáo tài chính tổng thể tất cả các quỹ
              </div>
              <h1 className="mt-1 text-2xl font-extrabold text-slate-900 sm:text-3xl">
                Báo cáo tổng hợp quỹ — {periodTitle}
              </h1>
              <p className="mt-1 text-xs text-slate-500">
                Gộp chung tất cả các bộ phận: Hoa hồng Sale, Quỹ TeamLead, Quỹ Vận hành & Ban hỗ trợ trong 1 bảng chi trả duy nhất.
              </p>
            </div>

            {/* Các nút hành động chính */}
            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                onClick={() => loadData(formattedMonth, selectedWeek)}
                disabled={loading}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-semibold text-slate-700 shadow-xs transition hover:bg-slate-50 disabled:opacity-60 cursor-pointer"
                title="Tải lại dữ liệu"
              >
                <RefreshCw className={`h-4 w-4 text-blue-600 ${loading ? 'animate-spin' : ''}`} />
                <span>Làm mới</span>
              </button>

              <button
                type="button"
                onClick={handleCopyAllMB}
                disabled={loading || !data?.masterList.length}
                className="inline-flex items-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50 px-3.5 py-2.5 text-xs font-bold text-blue-700 shadow-xs transition hover:bg-blue-100 disabled:opacity-50 cursor-pointer"
                title="Sao chép toàn bộ danh sách định dạng bảng để dán vào Excel / Lập lệnh MB Bank"
              >
                {copiedAllMB ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
                <span>{copiedAllMB ? 'Đã sao chép MB Bank!' : 'Sao chép MB Bank (Hàng loạt)'}</span>
              </button>

              <button
                type="button"
                onClick={handleExportExcel}
                disabled={isExporting || loading}
                className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white shadow-xs transition hover:bg-indigo-700 active:scale-95 disabled:opacity-50 cursor-pointer"
                title="Xuất file Excel gồm 4 sheet hoàn chỉnh có chữ ký kế toán"
              >
                <FileSpreadsheet className="h-4 w-4" />
                <span>{isExporting ? 'Đang xuất Excel...' : 'Xuất Excel tất cả các quỹ'}</span>
              </button>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* BỘ LỌC NĂM VÀ 12 THÁNG (CHỦ YẾU THEO NĂM THEO THÁNG)                       */}
          {/* ========================================================================= */}
          <AdminTimeFilter
            selectedYear={selectedYear}
            yearOptions={yearOptions}
            onYearChange={setSelectedYear}
            selectedMonth={selectedMonth}
            onMonthChange={(value) => {
              if (value !== 'all') setSelectedMonth(value);
            }}
            selectedWeek={selectedWeek}
            onWeekChange={setSelectedWeek}
            rightSlot={
              <div className="relative w-full lg:w-72">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Tìm nhân sự, SĐT, STK, mã HĐ..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-8 pr-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:border-blue-500 focus:bg-white focus:outline-hidden"
                />
              </div>
            }
          />
        </header>

        {/* Thông báo lỗi nếu có */}
        {error && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        )}

        {/* ========================================================================= */}
        {/* CÁC THẺ THỐNG KÊ TỔNG HỢP (KPI CARDS)                                     */}
        {/* ========================================================================= */}
        <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-5">
          <div className="rounded-2xl border border-indigo-200 bg-linear-to-br from-indigo-50 to-white p-4 shadow-2xs">
            <div className="flex items-center justify-between text-indigo-700">
              <span className="text-xs font-bold uppercase tracking-wider">Tổng thực nhận tất cả quỹ</span>
              <Wallet className="h-5 w-5" />
            </div>
            <div className="mt-2 text-xl font-extrabold text-indigo-950 sm:text-2xl">
              {formatVND(data?.summary.totalAmount)}
            </div>
            <div className="mt-1 text-[11px] font-medium text-indigo-600">
              {data?.summary.personCount || 0} nhân sự được thụ hưởng
            </div>
          </div>

          <div className="rounded-2xl border border-emerald-200 bg-linear-to-br from-emerald-50 to-white p-4 shadow-2xs">
            <div className="flex items-center justify-between text-emerald-700">
              <span className="text-xs font-bold uppercase tracking-wider">1. Hoa hồng Sale & HĐ</span>
              <DollarSign className="h-5 w-5" />
            </div>
            <div className="mt-2 text-xl font-extrabold text-emerald-950 sm:text-2xl">
              {formatVND(data?.summary.sumSale)}
            </div>
            <div className="mt-1 text-[11px] font-medium text-emerald-600">
              {data?.summary.contractCount || 0} hợp đồng phát sinh
            </div>
          </div>

          <div className="rounded-2xl border border-blue-200 bg-linear-to-br from-blue-50 to-white p-4 shadow-2xs">
            <div className="flex items-center justify-between text-blue-700">
              <span className="text-xs font-bold uppercase tracking-wider">2. Quỹ TeamLead (70%+30%)</span>
              <Users className="h-5 w-5" />
            </div>
            <div className="mt-2 text-xl font-extrabold text-blue-950 sm:text-2xl">
              {formatVND(data?.summary.sumTeamLead)}
            </div>
            <div className="mt-1 text-[11px] font-medium text-blue-600">
              {data?.summary.teamLeadCount || 0} thủ lĩnh nhận thù lao
            </div>
          </div>

          <div className="rounded-2xl border border-amber-200 bg-linear-to-br from-amber-50 to-white p-4 shadow-2xs">
            <div className="flex items-center justify-between text-amber-700">
              <span className="text-xs font-bold uppercase tracking-wider">3. Ban hỗ trợ & Vận hành</span>
              <Building2 className="h-5 w-5" />
            </div>
            <div className="mt-2 text-xl font-extrabold text-amber-950 sm:text-2xl">
              {formatVND(data?.summary.sumOps)}
            </div>
            <div className="mt-1 text-[11px] font-medium text-amber-600">
              {data?.summary.logCount || 0} khoản đề nghị đã chi
            </div>
          </div>

          <div className="rounded-2xl border border-purple-200 bg-linear-to-br from-purple-50 to-white p-4 shadow-2xs">
            <div className="flex items-center justify-between text-purple-700">
              <span className="text-xs font-bold uppercase tracking-wider">4. Đào tạo & Sự kiện</span>
              <BadgePercent className="h-5 w-5" />
            </div>
            <div className="mt-2 text-xl font-extrabold text-purple-950 sm:text-2xl">
              {formatVND(data?.summary.sumEvent)}
            </div>
            <div className="mt-1 text-[11px] font-medium text-purple-600">
              Thù lao đào tạo & trợ giảng
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* CÁC TAB CHI TIẾT QUỸ */}
        {/* ========================================================================= */}
        <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
          <div className="flex items-center gap-1 border-b border-slate-200 bg-slate-100/70 p-2 overflow-x-auto">
            {DETAIL_TABS.map((tab, index) => (
              <button
                type="button"
                key={tab.id}
                onClick={() => setActiveSheetTab(tab.id)}
                className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition-all cursor-pointer shrink-0 ${
                  activeSheetTab === tab.id
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-white text-slate-700 hover:bg-slate-200/70'
                }`}
              >
                {index === 0 && <Layers className="h-4 w-4" />}
                {index === 1 && <DollarSign className="h-4 w-4" />}
                {index === 2 && <Users className="h-4 w-4" />}
                {index === 3 && <Building2 className="h-4 w-4" />}
                <span>{index === 0 ? tab.label.toUpperCase() : `${index + 1}. ${tab.label}`}</span>
                <span className={`rounded-full px-2 py-0.5 text-[10px] ${
                  activeSheetTab === tab.id ? 'bg-indigo-700 text-white' : 'bg-slate-100 text-slate-600'
                }`}>
                  {tab.id === 'master' ? data?.masterList.length || 0
                    : tab.id === 'sale' ? data?.contracts.length || 0
                    : tab.id === 'teamlead' ? data?.teamLeadRows.length || 0
                    : tab.id === 'operations' ? data?.logs.length || 0
                    : tab.id === 'training' || tab.id === 'eventClose' ? data?.eventExpenses.length || 0
                    : categoryLogs.length}
                </span>
              </button>
            ))}
          </div>

          {/* ========================================================================= */}
          {/* TAB 1: BẢNG TỔNG HỢP TẤT CẢ CÁC QUỸ (MASTER SHEET)                       */}
          {/* ========================================================================= */}
          {activeSheetTab === 'master' && (
            <div className="p-4 sm:p-5">
              <div className="mb-3 flex flex-wrap items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsColumnExportOpen(true)}
                  className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-3 py-2 text-xs font-bold text-white hover:bg-indigo-700"
                >
                  <FileSpreadsheet className="h-4 w-4" />
                  Xuất Excel
                </button>
              </div>
              {/* Lưu ý MB Bank */}
              <div className="mb-4 flex items-center justify-between rounded-xl border border-indigo-100 bg-indigo-50/70 px-4 py-2.5 text-xs text-indigo-900">
                <div className="flex items-center gap-2">
                  <Info className="h-4 w-4 text-indigo-600 shrink-0" />
                  <span>
                    <strong>Cụm cột MB Bank (B–F):</strong> Được chuẩn hóa liền kề để kế toán Vân có thể sao chép nhanh 1 chạm khi lập lệnh chuyển khoản ngân hàng hàng loạt.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleCopyAllMB}
                  className="inline-flex items-center gap-1 font-bold text-indigo-700 hover:text-indigo-900 underline cursor-pointer shrink-0 ml-2"
                >
                  <Copy className="h-3.5 w-3.5" />
                  <span>Copy toàn bộ bảng</span>
                </button>
              </div>

              <div className="overflow-x-auto border border-slate-200 rounded-xl">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    {/* Header Group */}
                    <tr className="border-b border-slate-200 bg-slate-100 text-[11px] font-bold text-slate-600 uppercase">
                      <th className="px-3 py-2 text-center" colSpan={1}></th>
                      <th
                        className="px-3 py-2 text-center bg-indigo-100/70 text-indigo-900 border-x border-indigo-200"
                        colSpan={5}
                      >
                        ★ Cụm chuyển khoản MB Bank (Liền kề copy 1 chạm)
                      </th>
                      <th className="px-3 py-2 text-center bg-emerald-100/70 text-emerald-900" colSpan={4}>
                        Phân rã chi tiết nguồn quỹ được hưởng
                      </th>
                      <th className="px-3 py-2 text-center" colSpan={1}></th>
                    </tr>
                    {/* Header Detail */}
                    <tr className="border-b border-slate-200 bg-slate-900 text-white font-bold">
                      <th className="px-3 py-3 text-center w-12">STT</th>
                      <th className="px-3 py-3 w-48">Họ và tên</th>
                      <th className="px-3 py-3 text-center w-28">Số điện thoại</th>
                      <th className="px-3 py-3 text-center w-36">Số tài khoản</th>
                      <th className="px-3 py-3 w-32">Ngân hàng</th>
                      <th className="px-3 py-3 text-right w-40 bg-indigo-800 text-amber-300">
                        TỔNG THỰC NHẬN
                      </th>
                      <th className="px-3 py-3 text-right w-36">1. Hoa hồng Sale</th>
                      <th className="px-3 py-3 text-right w-36">2. Quỹ TeamLead</th>
                      <th className="px-3 py-3 text-right w-36">3. Quỹ Vận hành</th>
                      <th className="px-3 py-3 text-right w-36">4. Đào tạo & SK</th>
                      <th className="px-3 py-3 w-44">Ghi chú / Đội nhóm</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {loading ? (
                      <tr>
                        <td colSpan={11} className="py-12 text-center text-slate-500">
                          <RefreshCw className="mx-auto h-6 w-6 animate-spin text-blue-600 mb-2" />
                          <span>Đang tổng hợp dữ liệu tất cả các quỹ...</span>
                        </td>
                      </tr>
                    ) : filteredMasterList.length === 0 ? (
                      <tr>
                        <td colSpan={11} className="py-12 text-center text-slate-500">
                          Không tìm thấy nhân sự nào có khoản chi trong tháng {selectedMonth}/{selectedYear}.
                        </td>
                      </tr>
                    ) : (
                      filteredMasterList.map((p, index) => {
                        const rowKey = `${p.phone || p.name}-${index}`;
                        const isCopied = copiedKey === rowKey;
                        return (
                          <tr
                            key={rowKey}
                            className={`hover:bg-indigo-50/40 transition-colors ${
                              index % 2 === 1 ? 'bg-slate-50/50' : 'bg-white'
                            }`}
                          >
                            <td className="px-3 py-2.5 text-center text-slate-500 font-medium">{index + 1}</td>
                            <td className="px-3 py-2.5 font-bold text-slate-900 flex items-center justify-between gap-1">
                              <span>{p.name}</span>
                              <button
                                type="button"
                                onClick={() => handleCopySingleMB(p, rowKey)}
                                className="opacity-40 hover:opacity-100 text-indigo-600 p-0.5 rounded cursor-pointer"
                                title="Sao chép dòng MB Bank"
                              >
                                {isCopied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                              </button>
                            </td>
                            <td className="px-3 py-2.5 text-center font-mono text-slate-600">{p.phone || '—'}</td>
                            <td className="px-3 py-2.5 text-center font-mono font-semibold text-slate-900 bg-amber-50/40">
                              {p.bankAccount || '—'}
                            </td>
                            <td className="px-3 py-2.5 text-slate-700">{p.bankName || '—'}</td>
                            <td className="px-3 py-2.5 text-right font-extrabold text-indigo-900 bg-indigo-50/60 text-sm">
                              {formatNumber(p.totalAmount)}
                            </td>
                            <td className="px-3 py-2.5 text-right font-medium text-emerald-700">
                              {p.saleCommission ? formatNumber(p.saleCommission) : '—'}
                            </td>
                            <td className="px-3 py-2.5 text-right font-medium text-blue-700">
                              {p.teamLeadBonus ? formatNumber(p.teamLeadBonus) : '—'}
                            </td>
                            <td className="px-3 py-2.5 text-right font-medium text-amber-700">
                              {p.operationsBonus ? formatNumber(p.operationsBonus) : '—'}
                            </td>
                            <td className="px-3 py-2.5 text-right font-medium text-purple-700">
                              {p.eventTrainingBonus ? formatNumber(p.eventTrainingBonus) : '—'}
                            </td>
                            <td className="px-3 py-2.5 text-slate-500 truncate max-w-xs" title={p.note}>
                              {p.teamName ? `Đội ${p.teamName}${p.note ? ` · ${p.note}` : ''}` : p.note || '—'}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                  {/* Dòng Tổng cộng nổi bật */}
                  {data && data.masterList.length > 0 && (
                    <tfoot>
                      <tr className="bg-amber-100/80 font-bold border-t-2 border-amber-300 text-slate-900 text-xs">
                        <td className="px-3 py-3 text-center">★</td>
                        <td className="px-3 py-3">
                          TỔNG CỘNG ({data.masterList.length} nhân sự)
                        </td>
                        <td className="px-3 py-3 text-center" colSpan={3}>
                          —
                        </td>
                        <td className="px-3 py-3 text-right font-extrabold text-indigo-950 text-sm">
                          {formatNumber(data.summary.totalAmount)}
                        </td>
                        <td className="px-3 py-3 text-right text-emerald-900">
                          {formatNumber(data.summary.sumSale)}
                        </td>
                        <td className="px-3 py-3 text-right text-blue-900">
                          {formatNumber(data.summary.sumTeamLead)}
                        </td>
                        <td className="px-3 py-3 text-right text-amber-900">
                          {formatNumber(data.summary.sumOps)}
                        </td>
                        <td className="px-3 py-3 text-right text-purple-900">
                          {formatNumber(data.summary.sumEvent)}
                        </td>
                        <td className="px-3 py-3">—</td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 2: HOA HỒNG SALE & HỢP ĐỒNG (SHEET 2)                                 */}
          {/* ========================================================================= */}
          {activeSheetTab === 'sale' && (
            <div className="p-4 sm:p-5">
              <div className="overflow-x-auto border border-slate-200 rounded-xl">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-900 text-white font-bold">
                      <th className="px-3 py-3 text-center w-12">STT</th>
                      <th className="px-3 py-3 w-32">Mã HĐ</th>
                      <th className="px-3 py-3 text-center w-28">Ngày ký</th>
                      <th className="px-3 py-3 w-48">Khách hàng</th>
                      <th className="px-3 py-3 text-right w-36">Giá trị HĐ</th>
                      <th className="px-3 py-3 text-right w-36">Giá trị phân bổ</th>
                      <th className="px-3 py-3 w-32">Đội nhóm</th>
                      <th className="px-3 py-3 w-40">Closer (Sale chính)</th>
                      <th className="px-3 py-3 text-right w-32 text-emerald-300">Phí Closer</th>
                      <th className="px-3 py-3 w-40">Người giới thiệu</th>
                      <th className="px-3 py-3 text-right w-32 text-blue-300">Phí Giới thiệu</th>
                      <th className="px-3 py-3 w-40">Người hỗ trợ</th>
                      <th className="px-3 py-3 text-right w-32 text-amber-300">Phí Hỗ trợ</th>
                      <th className="px-3 py-3 text-center w-28">Trạng thái</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredContracts.length === 0 ? (
                      <tr>
                        <td colSpan={14} className="py-12 text-center text-slate-500">
                          Không có hợp đồng nào phát sinh trong tháng {selectedMonth}/{selectedYear}.
                        </td>
                      </tr>
                    ) : (
                      filteredContracts.map((c, index) => (
                        <tr key={c.id} className="hover:bg-slate-50">
                          <td className="px-3 py-2.5 text-center text-slate-500 font-medium">{index + 1}</td>
                          <td className="px-3 py-2.5 font-bold font-mono text-slate-900">
                            {c.contract_code || `HĐ #${c.id}`}
                          </td>
                          <td className="px-3 py-2.5 text-center text-slate-600">{c.contract_date || '—'}</td>
                          <td className="px-3 py-2.5 font-semibold text-slate-900">{c.customer_name}</td>
                          <td className="px-3 py-2.5 text-right font-medium text-slate-700">
                            {formatNumber(c.value)}
                          </td>
                          <td className="px-3 py-2.5 text-right font-bold text-slate-900">
                            {formatNumber(c.allocated_value)}
                          </td>
                          <td className="px-3 py-2.5 text-slate-600">{c.team_name || '—'}</td>
                          <td className="px-3 py-2.5 font-medium text-slate-900">{c.closer_name || '—'}</td>
                          <td className="px-3 py-2.5 text-right font-bold text-emerald-700">
                            {c.closer_fee ? formatNumber(c.closer_fee) : '—'}
                          </td>
                          <td className="px-3 py-2.5 text-slate-700">{c.referrer_name || '—'}</td>
                          <td className="px-3 py-2.5 text-right font-bold text-blue-700">
                            {c.referrer_fee ? formatNumber(c.referrer_fee) : '—'}
                          </td>
                          <td className="px-3 py-2.5 text-slate-700">{c.supporter_name || '—'}</td>
                          <td className="px-3 py-2.5 text-right font-bold text-amber-700">
                            {c.supporter_fee ? formatNumber(c.supporter_fee) : '—'}
                          </td>
                          <td className="px-3 py-2.5 text-center">
                            <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              {c.status || 'Thành công'}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 3: PHÂN BỔ QUỸ TEAMLEAD (SHEET 3)                                    */}
          {/* ========================================================================= */}
          {activeSheetTab === 'teamlead' && (
            <div className="p-4 sm:p-5">
              <div className="overflow-x-auto border border-slate-200 rounded-xl">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-900 text-white font-bold">
                      <th className="px-3 py-3 text-center w-12">STT</th>
                      <th className="px-3 py-3 w-48">Họ và tên thủ lĩnh</th>
                      <th className="px-3 py-3 text-center w-32">Số điện thoại</th>
                      <th className="px-3 py-3 w-40">Đội nhóm</th>
                      <th className="px-3 py-3 w-40">Chức danh / Vai trò</th>
                      <th className="px-3 py-3 text-right w-36">Thù lao 70% (Theo đội)</th>
                      <th className="px-3 py-3 text-right w-36">Thù lao 30% (Chia đều)</th>
                      <th className="px-3 py-3 text-right w-44 bg-blue-800 text-amber-300">
                        TỔNG NHẬN QUỸ TEAMLEAD
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredTeamLeadRows.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-12 text-center text-slate-500">
                          Chưa có dữ liệu thù lao thủ lĩnh tháng {selectedMonth}/{selectedYear}.
                        </td>
                      </tr>
                    ) : (
                      filteredTeamLeadRows.map((t, index) => (
                        <tr key={index} className="hover:bg-slate-50">
                          <td className="px-3 py-2.5 text-center text-slate-500 font-medium">{index + 1}</td>
                          <td className="px-3 py-2.5 font-bold text-slate-900">{t.memberName}</td>
                          <td className="px-3 py-2.5 text-center font-mono text-slate-600">{t.memberPhone || '—'}</td>
                          <td className="px-3 py-2.5 text-slate-700">{t.teamName || '—'}</td>
                          <td className="px-3 py-2.5 text-slate-600">{t.role || 'Team Leader'}</td>
                          <td className="px-3 py-2.5 text-right font-medium text-slate-700">
                            {t.payout70 ? formatNumber(t.payout70) : '—'}
                          </td>
                          <td className="px-3 py-2.5 text-right font-medium text-slate-700">
                            {t.payout30 ? formatNumber(t.payout30) : '—'}
                          </td>
                          <td className="px-3 py-2.5 text-right font-extrabold text-blue-900 bg-blue-50/50">
                            {formatNumber(t.total)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                  {data && data.teamLeadRows.length > 0 && (
                    <tfoot>
                      <tr className="bg-blue-100/80 font-bold border-t-2 border-blue-300 text-slate-900 text-xs">
                        <td className="px-3 py-3 text-center">★</td>
                        <td className="px-3 py-3" colSpan={4}>
                          TỔNG CỘNG QUỸ TEAMLEAD ({data.teamLeadRows.length} thủ lĩnh)
                        </td>
                        <td className="px-3 py-3 text-right">
                          {formatNumber(data.teamLeadRows.reduce((s, r) => s + r.payout70, 0))}
                        </td>
                        <td className="px-3 py-3 text-right">
                          {formatNumber(data.teamLeadRows.reduce((s, r) => s + r.payout30, 0))}
                        </td>
                        <td className="px-3 py-3 text-right font-extrabold text-blue-950 text-sm">
                          {formatNumber(data.summary.sumTeamLead)}
                        </td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 4: BAN HỖ TRỢ & VẬN HÀNH (SHEET 4)                                    */}
          {/* ========================================================================= */}
          {activeSheetTab === 'operations' && (
            <div className="p-4 sm:p-5">
              <div className="overflow-x-auto border border-slate-200 rounded-xl">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-900 text-white font-bold">
                      <th className="px-3 py-3 text-center w-12">STT</th>
                      <th className="px-3 py-3 w-32">Mã đề nghị</th>
                      <th className="px-3 py-3 text-center w-28">Ngày chi/duyệt</th>
                      <th className="px-3 py-3 w-36">Nguồn quỹ</th>
                      <th className="px-3 py-3 w-64">Nội dung chi</th>
                      <th className="px-3 py-3 w-44">Người thụ hưởng</th>
                      <th className="px-3 py-3 text-center w-28">Số điện thoại</th>
                      <th className="px-3 py-3 text-center w-36">Số tài khoản</th>
                      <th className="px-3 py-3 w-32">Ngân hàng</th>
                      <th className="px-3 py-3 text-right w-36 bg-amber-800 text-amber-300">Số tiền (VND)</th>
                      <th className="px-3 py-3 text-center w-28">Trạng thái</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredLogs.length === 0 ? (
                      <tr>
                        <td colSpan={11} className="py-12 text-center text-slate-500">
                          Không có đề xuất chi nào trong tháng {selectedMonth}/{selectedYear}.
                        </td>
                      </tr>
                    ) : (
                      filteredLogs.map((l, index) => (
                        <tr key={l.id} className="hover:bg-slate-50">
                          <td className="px-3 py-2.5 text-center text-slate-500 font-medium">{index + 1}</td>
                          <td className="px-3 py-2.5 font-mono font-bold text-slate-900">
                            {l.request_code || `YC #${l.id}`}
                          </td>
                          <td className="px-3 py-2.5 text-center text-slate-600">
                            {l.payment_date || l.request_date || '—'}
                          </td>
                          <td className="px-3 py-2.5 font-medium text-slate-800">
                            {l.fund_source || 'Quỹ Vận hành'}
                          </td>
                          <td className="px-3 py-2.5 text-slate-700">{l.detail_content || '—'}</td>
                          <td className="px-3 py-2.5 font-bold text-slate-900">{l.beneficiary_name || '—'}</td>
                          <td className="px-3 py-2.5 text-center font-mono text-slate-600">
                            {l.beneficiary_phone || '—'}
                          </td>
                          <td className="px-3 py-2.5 text-center font-mono text-slate-800">
                            {l.beneficiary_bank_account || '—'}
                          </td>
                          <td className="px-3 py-2.5 text-slate-700">{l.beneficiary_bank_name || '—'}</td>
                          <td className="px-3 py-2.5 text-right font-extrabold text-amber-900 bg-amber-50/50">
                            {formatNumber(l.amount)}
                          </td>
                          <td className="px-3 py-2.5 text-center">
                            <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              {l.status || 'Đã chi'}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}

                    {['customerCare', 'eventClose', 'training', 'incentive', 'travel'].includes(activeSheetTab) && (
                      <div className="p-4 sm:p-5">
                        <div className="overflow-x-auto rounded-xl border border-slate-200">
                          <table className="w-full border-collapse text-left text-xs">
                            <thead>
                              <tr className="border-b border-slate-200 bg-slate-900 font-bold text-white">
                                <th className="px-3 py-3 text-center">STT</th>
                                <th className="px-3 py-3">Ngày</th>
                                <th className="px-3 py-3">Mã / Nội dung</th>
                                <th className="px-3 py-3">Người thụ hưởng</th>
                                <th className="px-3 py-3 text-right">Số tiền (VND)</th>
                                <th className="px-3 py-3 text-center">Trạng thái</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {categoryLogs.length === 0 ? (
                                <tr>
                                  <td colSpan={6} className="py-10 text-center text-slate-500">
                                    Chưa có khoản thu chi thuộc mục này trong kỳ đã chọn.
                                  </td>
                                </tr>
                              ) : categoryLogs.map((log, index) => (
                                <tr key={log.id} className="hover:bg-slate-50">
                                  <td className="px-3 py-2.5 text-center text-slate-500">{index + 1}</td>
                                  <td className="px-3 py-2.5">{log.payment_date || log.request_date || '—'}</td>
                                  <td className="px-3 py-2.5">
                                    <span className="font-semibold">{log.request_code || `YC #${log.id}`}</span>
                                    <span className="mt-0.5 block text-slate-500">{log.detail_content || log.fund_source || '—'}</span>
                                  </td>
                                  <td className="px-3 py-2.5">{log.beneficiary_name || '—'}</td>
                                  <td className="px-3 py-2.5 text-right font-bold">{formatNumber(log.amount)}</td>
                                  <td className="px-3 py-2.5 text-center">{log.status || '—'}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </tbody>
                  {data && data.logs.length > 0 && (
                    <tfoot>
                      <tr className="bg-amber-100/80 font-bold border-t-2 border-amber-300 text-slate-900 text-xs">
                        <td className="px-3 py-3 text-center">★</td>
                        <td className="px-3 py-3" colSpan={8}>
                          TỔNG CỘNG QUỸ VẬN HÀNH & BAN HỖ TRỢ ({data.logs.length} khoản chi)
                        </td>
                        <td className="px-3 py-3 text-right font-extrabold text-amber-950 text-sm">
                          {formatNumber(data.summary.sumOps)}
                        </td>
                        <td className="px-3 py-3">—</td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
      {isColumnExportOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/50 p-4" role="presentation">
          <section
            aria-labelledby="export-master-title"
            aria-modal="true"
            className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-2xl"
            role="dialog"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 id="export-master-title" className="text-lg font-bold text-slate-900">Tùy chọn cột Excel</h2>
                <p className="mt-1 text-xs text-slate-500">Chọn các quỹ cần đưa vào bảng tổng hợp.</p>
              </div>
              <button type="button" onClick={() => setIsColumnExportOpen(false)} aria-label="Đóng">
                <X className="h-5 w-5 text-slate-500" />
              </button>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setExportColumns(MASTER_EXPORT_COLUMNS.map(({ key }) => key).filter((key) => key !== 'name' && key !== 'phone' && key !== 'bankAccount' && key !== 'bankName'))}
                className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700"
              >
                Đầy đủ tất cả các quỹ
              </button>
              <button
                type="button"
                onClick={() => setExportColumns(['totalAmount'])}
                className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700"
              >
                Chỉ lấy thông tin chuyển khoản + Tổng thực nhận
              </button>
            </div>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {MASTER_EXPORT_COLUMNS.map(({ key, label, required }) => {
                const checked = required || exportColumns.includes(key);
                return (
                  <label key={key} className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={required}
                      onChange={() => setExportColumns((current) =>
                        checked ? current.filter((item) => item !== key) : [...current, key]
                      )}
                    />
                    {label}{required ? ' *' : ''}
                  </label>
                );
              })}
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={() => setIsColumnExportOpen(false)} className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-600">
                Hủy
              </button>
              <button
                type="button"
                onClick={handleExportMasterExcel}
                disabled={isExporting || loading}
                className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                {isExporting ? 'Đang xuất...' : 'Tải Excel'}
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
