'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  BarChart3,
  CalendarDays,
  Check,
  Clock3,
  FileSpreadsheet,
  History,
  Info,
  LockKeyhole,
  PieChart,
  Save,
  ShieldCheck,
  SlidersHorizontal,
  X,
} from 'lucide-react';
import {
  ALLOCATION_POLICY_BUDGET_RATE,
  DEFAULT_ALLOCATION_POLICY_ROWS,
  DEFAULT_POLICY_EFFECTIVE_DATE,
  DEFAULT_POLICY_VERSION,
  type AllocationPolicyRow,
  type AllocationPolicyVersion,
} from '@/lib/allocationPolicyConfig';

const money = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 0 });
const chartColors = ['#2563eb', '#06b6d4', '#14b8a6', '#84cc16', '#f59e0b', '#f97316', '#ec4899', '#8b5cf6', '#64748b', '#0ea5e9', '#22c55e', '#a855f7', '#eab308', '#ef4444'];

type PolicyApiResponse = {
  success?: boolean;
  error?: string;
  current?: AllocationPolicyVersion;
  history?: AllocationPolicyVersion[];
};

function formatMoney(value: number) {
  return `${money.format(Math.round(value))} ₫`;
}

function displayPercent(value: number) {
  const rounded = Math.round((value + Number.EPSILON) * 100) / 100;
  return `${rounded.toLocaleString('vi-VN', { minimumFractionDigits: 1, maximumFractionDigits: 2 })}%`;
}

function parseRevenue(value: string) {
  const digits = value.replace(/\D/g, '');
  return digits ? Number(digits) : 0;
}

function formatInputMoney(value: string) {
  const digits = value.replace(/\D/g, '');
  return digits ? money.format(Number(digits)) : '';
}

function formatRateInput(value: number) {
  return value.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 4 });
}

function getToday() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Bangkok', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(new Date());
  const value = (type: string) => parts.find((part) => part.type === type)?.value || '';
  return `${value('year')}-${value('month')}-${value('day')}`;
}

function formatDate(value: string) {
  if (!value) return '—';
  const parts = value.slice(0, 10).split('-');
  return parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : value;
}

function getErrorMessage(result: PolicyApiResponse, fallback: string) {
  return typeof result.error === 'string' ? result.error : fallback;
}

export default function AllocationPolicyManager() {
  const [rows, setRows] = useState<AllocationPolicyRow[]>(DEFAULT_ALLOCATION_POLICY_ROWS);
  const [rateInputs, setRateInputs] = useState<Record<string, string>>(() => Object.fromEntries(
    DEFAULT_ALLOCATION_POLICY_ROWS.map((row) => [row.id, formatRateInput(row.allocationPercent)])
  ));
  const [current, setCurrent] = useState<AllocationPolicyVersion | null>(null);
  const [history, setHistory] = useState<AllocationPolicyVersion[]>([]);
  const [revenueText, setRevenueText] = useState('10.000.000');
  const [activeView, setActiveView] = useState<'table' | 'chart'>('table');
  const [chartType, setChartType] = useState<'donut' | 'bar'>('donut');
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [saveOpen, setSaveOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyDetailId, setHistoryDetailId] = useState<number | null>(null);
  const [commitNote, setCommitNote] = useState('');
  const [effectiveDate, setEffectiveDate] = useState(DEFAULT_POLICY_EFFECTIVE_DATE);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [exportError, setExportError] = useState('');
  const [savedMessage, setSavedMessage] = useState('');

  const revenue = parseRevenue(revenueText);
  const budgetRows = rows;
  const totalAllocation = budgetRows.reduce((sum, row) => sum + row.allocationPercent, 0);
  const totalRevenueRate = totalAllocation * ALLOCATION_POLICY_BUDGET_RATE / 100;
  const totalAmount = budgetRows.reduce((sum, row) => sum + Math.round(revenue * row.allocationPercent * ALLOCATION_POLICY_BUDGET_RATE / 10000), 0);
  const operatingBudget = Math.round(revenue * ALLOCATION_POLICY_BUDGET_RATE / 100);
  const balanceStatus = Math.abs(totalAllocation - 100) < 0.005 ? 'balanced' : totalAllocation > 100 ? 'over' : 'under';

  const chartGradient = useMemo(() => {
    const positiveRows = budgetRows.filter((row) => row.allocationPercent > 0);
    const total = positiveRows.reduce((sum, row) => sum + row.allocationPercent, 0);
    if (total <= 0) return 'conic-gradient(#cbd5e1 0deg 360deg)';
    let cursor = 0;
    const segments = positiveRows.map((row) => {
      const start = cursor;
      cursor += row.allocationPercent / total * 360;
      const color = chartColors[rows.findIndex((item) => item.id === row.id) % chartColors.length];
      return `${color} ${start}deg ${cursor}deg`;
    });
    return `conic-gradient(${segments.join(', ')})`;
  }, [budgetRows, rows]);

  async function requestPolicy() {
    const response = await fetch('/api/admin/allocation-policy', { cache: 'no-store' });
    const result = await response.json() as PolicyApiResponse;
    if (!response.ok || !result.success || !result.current) {
      throw new Error(getErrorMessage(result, 'Không thể tải chính sách.'));
    }
    return result;
  }

  function applyLoadedPolicy(result: PolicyApiResponse) {
    const active = result.current;
    if (!active) throw new Error('Không thể tải chính sách.');
    setCurrent(active);
    setRows(active.rows);
    setRateInputs(Object.fromEntries(active.rows.map((row) => [row.id, formatRateInput(row.allocationPercent)])));
    setHistory(result.history || [active]);
  }

  async function loadPolicy() {
    setIsLoading(true);
    setLoadError('');
    try {
      applyLoadedPolicy(await requestPolicy());
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'Không thể tải chính sách.');
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    let cancelled = false;
    requestPolicy()
      .then((result) => {
        if (!cancelled) applyLoadedPolicy(result);
      })
      .catch((error: unknown) => {
        if (!cancelled) setLoadError(error instanceof Error ? error.message : 'Không thể tải chính sách.');
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  function updateRate(id: string, text: string) {
    setRateInputs((previous) => ({ ...previous, [id]: text }));
    const normalized = text.trim().replace(',', '.');
    if (normalized === '') {
      setRows((previous) => previous.map((row) => row.id === id ? { ...row, allocationPercent: 0 } : row));
      setSavedMessage('');
      return;
    }
    const parsed = Number(normalized);
    if (!Number.isFinite(parsed)) return;
    setRows((previous) => previous.map((row) => row.id === id ? { ...row, allocationPercent: Math.max(0, Math.min(100, parsed)) } : row));
    setSavedMessage('');
  }

  function finishRateEdit(id: string) {
    const normalized = (rateInputs[id] || '').trim().replace(',', '.');
    const parsed = normalized === '' || normalized === '.' ? 0 : Number(normalized);
    const value = Number.isFinite(parsed) ? Number(Math.max(0, Math.min(100, parsed)).toFixed(4)) : rows.find((row) => row.id === id)?.allocationPercent || 0;
    setRows((previous) => previous.map((row) => row.id === id ? { ...row, allocationPercent: value } : row));
    setRateInputs((previous) => ({ ...previous, [id]: formatRateInput(value) }));
  }

  async function savePolicy() {
    setSaveError('');
    if (!commitNote.trim()) {
      setSaveError('Vui lòng nhập ghi chú thay đổi.');
      return;
    }
    setIsSaving(true);
    try {
      const response = await fetch('/api/admin/allocation-policy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows, note: commitNote.trim(), effectiveDate }),
      });
      const result = await response.json() as PolicyApiResponse;
      if (!response.ok || !result.success || !result.current) {
        throw new Error(getErrorMessage(result, 'Không thể lưu chính sách.'));
      }
      applyLoadedPolicy(result);
      setCommitNote('');
      setSaveOpen(false);
      setSavedMessage(`Đã lưu ${result.current.versionLabel}.`);
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'Không thể lưu chính sách.');
    } finally {
      setIsSaving(false);
    }
  }

  async function exportSpreadsheet() {
    setExportError('');
    try {
      const XLSX = await import('xlsx');
      const data = [
        ['MÔ HÌNH PHÂN BỔ NGÂN SÁCH HOẠT ĐỘNG'],
        ['Phiên bản', current?.versionLabel || DEFAULT_POLICY_VERSION],
        ['Ngày áp dụng', current?.effectiveDate || DEFAULT_POLICY_EFFECTIVE_DATE],
        ['Doanh thu giả định (VND)', revenue],
        ['Tỷ lệ ngân sách hoạt động (%)', ALLOCATION_POLICY_BUDGET_RATE],
        [],
        ['Tên quỹ / khẩu phân bổ', 'Tỷ lệ phân bổ (%)', 'Tỷ lệ trên doanh thu (%)', 'Số tiền phân bổ (VND)'],
        ...rows.map((row) => [
          row.label,
          row.allocationPercent,
          row.allocationPercent * ALLOCATION_POLICY_BUDGET_RATE / 100,
          Math.round(revenue * row.allocationPercent * ALLOCATION_POLICY_BUDGET_RATE / 10000),
        ]),
        ['TỔNG CỘNG NGÂN SÁCH', totalAllocation, totalRevenueRate, totalAmount],
      ];
      const worksheet = XLSX.utils.aoa_to_sheet(data);
      worksheet['!cols'] = [{ wch: 48 }, { wch: 22 }, { wch: 28 }, { wch: 27 }];
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Chinh sach');
      XLSX.writeFile(workbook, `chinh-sach-phan-bo-${current?.versionLabel || DEFAULT_POLICY_VERSION}.xlsx`);
    } catch (error) {
      setExportError(error instanceof Error ? `Không thể xuất Excel: ${error.message}` : 'Không thể xuất file Excel.');
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-[#142746] text-white shadow-sm">
        <div className="mx-auto flex max-w-[1500px] flex-wrap items-center justify-between gap-3 px-5 py-3 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-600 shadow"><SlidersHorizontal className="h-5 w-5" /></div>
            <div className="min-w-0">
              <h1 className="truncate text-lg font-bold tracking-tight">MÔ HÌNH PHÂN BỔ NGÂN SÁCH HOẠT ĐỘNG</h1>
              <p className="text-xs text-slate-300">Nguồn: tab 1. Chính sách · <span className="text-emerald-300">● Chính sách đang áp dụng</span></p>
            </div>
            <span className="hidden rounded-full border border-blue-300/40 bg-blue-500/15 px-2.5 py-1 text-[11px] font-semibold text-blue-100 sm:inline-flex">{current?.versionLabel || DEFAULT_POLICY_VERSION}</span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button onClick={() => { setHistoryDetailId(current?.id ?? null); setHistoryOpen(true); }} className="inline-flex items-center gap-2 rounded-lg border border-slate-500/60 px-3 py-2 text-xs font-semibold text-slate-100 hover:bg-white/10"><History className="h-4 w-4" /> Lịch sử cập nhật</button>
            <button onClick={() => void exportSpreadsheet()} disabled={!current} className="inline-flex items-center gap-2 rounded-lg border border-slate-500/60 px-3 py-2 text-xs font-semibold text-slate-100 hover:bg-white/10 disabled:opacity-50"><FileSpreadsheet className="h-4 w-4 text-emerald-300" /> Xuất Excel</button>
            <button onClick={() => { setCommitNote(''); setSaveError(''); setEffectiveDate(getToday()); setSaveOpen(true); }} disabled={!current || isLoading} className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold text-white shadow hover:bg-emerald-500 disabled:opacity-50"><Save className="h-4 w-4" /> Cập nhật Chính sách</button>
          </div>
        </div>
      </header>

      <main className="mx-auto flex max-w-[1500px] flex-col gap-4 px-4 py-5 sm:px-6 lg:px-8">
        {loadError && (
          <div role="alert" className="flex items-center justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
            <span>{loadError}</span><button onClick={() => void loadPolicy()} className="rounded-lg border border-rose-300 px-3 py-1.5 font-semibold hover:bg-rose-100">Tải lại</button>
          </div>
        )}
        {exportError && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{exportError}</div>}
        {savedMessage && <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">{savedMessage}</div>}

        <section className="grid gap-4 rounded-2xl bg-[#10243e] p-5 text-white shadow-lg md:grid-cols-[1.1fr_0.65fr_0.9fr] md:items-end md:p-6">
          <div>
            <div className="mb-4 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-sky-300"><span className="h-2 w-2 rounded-full bg-emerald-400" /><CalculatorLabel /> Khu vực kiểm thử số liệu (Accounting Sandbox)</div>
            <label htmlFor="assumed-revenue" className="mb-2 block text-[11px] font-semibold uppercase text-slate-300">Doanh thu hợp đồng giả định (doanh số hệ thống)</label>
            <div className="flex items-center rounded-xl border border-blue-500/70 bg-slate-950/50 px-3 focus-within:ring-2 focus-within:ring-emerald-400/50">
              <input id="assumed-revenue" inputMode="numeric" value={revenueText} onChange={(event) => setRevenueText(event.target.value)} onBlur={() => setRevenueText(formatInputMoney(revenueText))} className="min-w-0 flex-1 bg-transparent py-3 text-xl font-extrabold tabular-nums text-emerald-300 outline-none" aria-label="Doanh thu hợp đồng giả định" />
              <span className="rounded-md border border-slate-600 bg-slate-800 px-2 py-1 text-[10px] font-bold text-slate-300">VND</span>
            </div>
          </div>
          <div>
            <label className="mb-2 block text-[11px] font-semibold uppercase text-slate-300">Tỷ lệ ngân sách hoạt động</label>
            <div className="flex items-center justify-between rounded-xl border border-slate-700 bg-slate-900/70 px-3 py-3">
              <span className="flex items-center gap-2 text-xs text-slate-400"><LockKeyhole className="h-4 w-4 text-blue-300" /> Cố định</span>
              <span className="rounded-md bg-slate-800 px-3 py-1.5 text-lg font-bold tabular-nums">15,0 <small className="text-xs text-slate-400">%</small></span>
            </div>
          </div>
          <div className="flex min-h-[74px] items-center justify-between gap-4 rounded-xl border border-blue-500/60 bg-blue-950/70 px-4 py-3">
            <div><p className="text-[10px] font-bold uppercase text-blue-200">Tổng ngân sách hoạt động</p><p className="mt-1 text-[10px] text-blue-300">= Doanh thu × tỷ lệ ngân sách</p></div>
            <div className="text-right"><strong className="whitespace-nowrap text-xl font-extrabold tabular-nums">{formatMoney(operatingBudget)}</strong><p className="mt-1 text-[9px] text-emerald-300">Cập nhật tức thì</p></div>
          </div>
        </section>

        <section className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="mr-1 inline-flex items-center gap-1 font-bold uppercase text-slate-500"><SlidersHorizontal className="h-3.5 w-3.5" /> Nguồn chính sách</span>
            <span className="rounded-md border border-blue-200 bg-blue-50 px-3 py-1.5 font-medium text-blue-800">Tab “1. Chính sách” · Complex (Standard)</span>
          </div>
          <div className="inline-flex rounded-lg border border-slate-200 bg-slate-100 p-1">
            <button onClick={() => setActiveView('table')} className={`rounded-md px-3 py-1.5 text-xs font-semibold ${activeView === 'table' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500'}`}><span className="mr-1">▦</span> Bảng chi tiết</button>
            <button onClick={() => setActiveView('chart')} className={`rounded-md px-3 py-1.5 text-xs font-semibold ${activeView === 'chart' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500'}`}><PieChart className="mr-1 inline h-3.5 w-3.5" /> Biểu đồ trực quan</button>
          </div>
        </section>

        {activeView === 'table' ? (
          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
              <div><h2 className="text-base font-bold">Định mức phân bổ chi tiết các quỹ & bộ phận</h2><p className="mt-1 text-xs text-slate-500">Admin nhập trực tiếp phần trăm (%) phân bổ để thay đổi định mức cho hệ thống.</p></div>
              <BalanceBadge status={balanceStatus} total={totalAllocation} />
            </div>
            {isLoading ? <div className="px-5 py-16 text-center text-sm text-slate-500">Đang tải phiên bản chính sách…</div> : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px] border-collapse text-sm">
                  <thead className="bg-slate-100 text-[10px] uppercase tracking-wide text-slate-600">
                    <tr><th className="px-5 py-3 text-left">Tên quỹ / khẩu phân bổ</th><th className="px-4 py-3 text-center">Tỷ lệ phân bổ (%)<small className="block normal-case text-slate-400">(quy định đầu vào)</small></th><th className="px-4 py-3 text-right">Tỷ lệ / doanh thu (%)<small className="block normal-case text-slate-400">(= % phân bổ × 15%)</small></th><th className="px-5 py-3 text-right">Số tiền phân bổ giả định (VND)<small className="block normal-case text-slate-400">(kèm dấu phân cách)</small></th></tr>
                  </thead>
                  <tbody>
                    {rows.map((row, index) => {
                      const revenueRate = row.allocationPercent * ALLOCATION_POLICY_BUDGET_RATE / 100;
                      const amount = Math.round(revenue * revenueRate / 100);
                      return (
                        <tr key={row.id} className="border-t border-slate-100 hover:bg-slate-50/70">
                          <td className="px-5 py-2.5 text-[13px] font-semibold text-slate-800">
                            <span className={`mr-2 inline-block h-1.5 w-1.5 rounded-full align-middle ${index === 0 || row.id === 'leader-team' || row.id === 'operations-support' ? 'bg-blue-600' : 'bg-slate-400'}`} />{row.label}
                          </td>
                          <td className="px-4 py-2 text-center">
                            <label className="inline-flex items-center rounded-md border border-slate-200 bg-white px-2 shadow-sm focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-100">
                              <input type="text" inputMode="decimal" disabled={!current} value={rateInputs[row.id] ?? formatRateInput(row.allocationPercent)} onChange={(event) => updateRate(row.id, event.target.value)} onBlur={() => finishRateEdit(row.id)} className="w-[58px] bg-transparent py-1 text-right font-semibold tabular-nums text-slate-800 outline-none disabled:opacity-60" aria-label={`Tỷ lệ phân bổ ${row.label}`} />
                              <span className="ml-1 text-xs text-slate-500">%</span>
                            </label>
                          </td>
                          <td className="px-4 py-2.5 text-right font-semibold tabular-nums text-blue-700">{displayPercent(revenueRate)}</td>
                          <td className="px-5 py-2.5 text-right font-bold tabular-nums text-teal-700">{formatMoney(amount)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot className="bg-[#101a30] text-white">
                    <tr><td className="px-5 py-4 font-bold uppercase"><span className="mr-2 text-blue-300">▦</span> Tổng cộng ngân sách</td><td className="px-4 py-4 text-center font-extrabold tabular-nums text-sky-300">{displayPercent(totalAllocation)}</td><td className="px-4 py-4 text-right font-extrabold tabular-nums text-sky-300">{displayPercent(totalRevenueRate)}</td><td className="px-5 py-4 text-right font-extrabold tabular-nums text-amber-300">{formatMoney(totalAmount)}</td></tr>
                  </tfoot>
                </table>
              </div>
            )}
            <div className="flex items-start gap-2 border-t border-amber-100 bg-amber-50/70 px-5 py-3 text-[11px] leading-relaxed text-amber-800"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" /><span><strong>Quy trình bảo toàn số liệu:</strong> Chỉnh sửa ở đây chỉ tạo phiên bản chính sách mới, không cập nhật hợp đồng hiện hữu. Tổng ngân sách luôn đối chiếu đúng 100% theo bảng chính sách mẫu.</span></div>
          </section>
        ) : (
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-base font-bold">Tỷ trọng phân bổ giữa các quỹ</h2><p className="mt-1 text-xs text-slate-500">Biểu đồ tính theo toàn bộ định mức đang hiển thị trong bảng chính sách.</p></div><div className="inline-flex rounded-lg border border-slate-200 bg-slate-100 p-1"><button onClick={() => setChartType('donut')} className={`rounded-md px-3 py-1.5 text-xs font-semibold ${chartType === 'donut' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500'}`}><PieChart className="mr-1 inline h-3.5 w-3.5" /> Tròn</button><button onClick={() => setChartType('bar')} className={`rounded-md px-3 py-1.5 text-xs font-semibold ${chartType === 'bar' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500'}`}><BarChart3 className="mr-1 inline h-3.5 w-3.5" /> Cột</button></div></div>
            {chartType === 'donut' ? (
              <div className="grid items-center gap-8 py-4 md:grid-cols-[280px_1fr]">
                <div className="mx-auto grid h-64 w-64 place-items-center rounded-full" style={{ background: chartGradient }}><div className="grid h-36 w-36 place-content-center rounded-full bg-white text-center shadow-inner"><strong className="text-2xl tabular-nums">{displayPercent(totalAllocation)}</strong><span className="mt-1 text-[10px] uppercase text-slate-500">tổng tỷ lệ</span></div></div>
                <div className="grid gap-x-6 gap-y-2 sm:grid-cols-2">{budgetRows.map((row) => { const index = rows.findIndex((item) => item.id === row.id); return <div key={row.id} className="flex min-w-0 items-center gap-2 text-xs"><span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: chartColors[index % chartColors.length] }} /><span className="min-w-0 flex-1 truncate font-medium">{row.label}</span><strong className="tabular-nums">{displayPercent(row.allocationPercent)}</strong></div>; })}</div>
              </div>
            ) : (
              <div className="space-y-3 py-2">{budgetRows.map((row) => { const index = rows.findIndex((item) => item.id === row.id); return <div key={row.id} className="grid grid-cols-[minmax(145px,1fr)_minmax(90px,2fr)_56px] items-center gap-3 text-xs"><span className="truncate font-medium">{row.label}</span><div className="h-3 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full" style={{ width: `${Math.min(row.allocationPercent, 100)}%`, background: chartColors[index % chartColors.length] }} /></div><strong className="text-right tabular-nums">{displayPercent(row.allocationPercent)}</strong></div>; })}</div>
            )}
            <div className="mt-5 rounded-lg bg-slate-50 px-4 py-3 text-xs text-slate-600">Ngân sách hoạt động giả định: <strong className="text-slate-900">{formatMoney(operatingBudget)}</strong> · Tổng tiền theo các định mức đang hiển thị: <strong className="text-teal-700">{formatMoney(totalAmount)}</strong></div>
          </section>
        )}

        <section className="grid gap-3 text-xs text-slate-500 sm:grid-cols-3">
          <div className="rounded-xl border border-slate-200 bg-white p-4"><p className="flex items-center gap-2 font-semibold text-slate-700"><ShieldCheck className="h-4 w-4 text-blue-600" /> Phiên bản hiện tại</p><p className="mt-2">{current?.versionLabel || DEFAULT_POLICY_VERSION} · áp dụng từ {formatDate(current?.effectiveDate || DEFAULT_POLICY_EFFECTIVE_DATE)}</p></div>
          <div className="rounded-xl border border-slate-200 bg-white p-4"><p className="flex items-center gap-2 font-semibold text-slate-700"><Clock3 className="h-4 w-4 text-blue-600" /> Cập nhật gần nhất</p><p className="mt-2">{current ? new Date(current.createdAt).toLocaleString('vi-VN') : '—'}{current?.createdBy ? ` · ${current.createdBy}` : ''}</p></div>
          <div className="rounded-xl border border-slate-200 bg-white p-4"><p className="flex items-center gap-2 font-semibold text-slate-700"><Info className="h-4 w-4 text-blue-600" /> Nguồn tham chiếu</p><p className="mt-2">Tong-hop-DNTT-T9-T10.xlsx · tab “1. Chính sách”</p></div>
        </section>
      </main>

      {saveOpen && <Modal title="Xác nhận cập nhật chính sách" onClose={() => !isSaving && setSaveOpen(false)}>
        <p className="mb-4 text-sm leading-relaxed text-slate-600">Lưu sẽ tạo phiên bản mới và ghi lại các tỷ lệ đã chỉnh sửa. Chính sách được lưu riêng, không làm thay đổi số liệu hợp đồng hiện có.</p>
        <div className="mb-4 rounded-xl bg-slate-50 p-3 text-sm"><div className="flex justify-between gap-3"><span className="text-slate-500">Tổng tỷ lệ các dòng</span><strong className={balanceStatus === 'balanced' ? 'text-emerald-700' : 'text-amber-700'}>{displayPercent(totalAllocation)}</strong></div><div className="mt-2 flex justify-between gap-3"><span className="text-slate-500">Tổng phân bổ trên doanh thu giả định</span><strong>{formatMoney(totalAmount)}</strong></div></div>
        <label className="mb-1.5 block text-sm font-semibold text-slate-700">Ngày áp dụng</label><div className="relative mb-4"><CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input type="date" value={effectiveDate} onChange={(event) => setEffectiveDate(event.target.value)} className="w-full rounded-lg border border-slate-300 py-2.5 pl-10 pr-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" /></div>
        <label htmlFor="commit-note" className="mb-1.5 block text-sm font-semibold text-slate-700">Ghi chú thay đổi <span className="text-rose-600">*</span></label><textarea id="commit-note" value={commitNote} onChange={(event) => setCommitNote(event.target.value)} maxLength={500} rows={3} placeholder="Ví dụ: Cập nhật tỷ lệ theo chính sách đã phê duyệt…" className="w-full resize-y rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
        {saveError && <p role="alert" className="mt-2 text-sm text-rose-700">{saveError}</p>}
        <div className="mt-5 flex justify-end gap-2"><button onClick={() => setSaveOpen(false)} disabled={isSaving} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50">Hủy</button><button onClick={() => void savePolicy()} disabled={isSaving || !current} className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-500 disabled:opacity-60">{isSaving ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" /> : <Check className="h-4 w-4" />}{isSaving ? 'Đang lưu…' : 'Xác nhận lưu'}</button></div>
      </Modal>}

      {historyOpen && <Modal title="Lịch sử cập nhật chính sách" onClose={() => setHistoryOpen(false)} wide>
        <p className="mb-4 text-sm text-slate-600">Nhật ký chỉ lưu các phiên bản được xác nhận bằng nút “Cập nhật Chính sách”.</p>
        {history.length ? <div className="max-h-[35vh] overflow-auto rounded-xl border border-slate-200"><table className="w-full min-w-[800px] text-left text-xs"><thead className="sticky top-0 bg-slate-100 text-[10px] uppercase text-slate-500"><tr><th className="px-3 py-3">Phiên bản</th><th className="px-3 py-3">Ngày áp dụng</th><th className="px-3 py-3">Ngày ghi nhận</th><th className="px-3 py-3">Người cập nhật</th><th className="px-3 py-3">Ghi chú</th><th className="px-3 py-3">Chi tiết</th></tr></thead><tbody>{history.map((entry, index) => <tr key={entry.id} className="border-t border-slate-100 align-top"><td className="px-3 py-3 font-bold text-blue-700">{entry.versionLabel}{index === 0 && <span className="ml-2 rounded-full bg-emerald-100 px-2 py-0.5 text-[9px] text-emerald-700">Đang áp dụng</span>}</td><td className="px-3 py-3 whitespace-nowrap">{formatDate(entry.effectiveDate)}</td><td className="px-3 py-3 whitespace-nowrap">{new Date(entry.createdAt).toLocaleString('vi-VN')}</td><td className="px-3 py-3">{entry.createdBy}</td><td className="max-w-[260px] px-3 py-3">{entry.note}</td><td className="px-3 py-3"><button onClick={() => setHistoryDetailId(entry.id)} className="whitespace-nowrap rounded-md border border-blue-200 px-2.5 py-1.5 font-semibold text-blue-700 hover:bg-blue-50">Xem tỷ lệ</button></td></tr>)}</tbody></table></div> : <div className="rounded-lg bg-slate-50 p-8 text-center text-sm text-slate-500">Chưa có lịch sử phiên bản.</div>}
        {history.find((entry) => entry.id === historyDetailId) && (() => {
          const selected = history.find((entry) => entry.id === historyDetailId)!;
          const allocationTotal = selected.rows.reduce((sum, row) => sum + row.allocationPercent, 0);
          return <div className="mt-4 overflow-hidden rounded-xl border border-slate-200"><div className="flex items-center justify-between gap-3 bg-slate-50 px-4 py-3"><div><h3 className="text-sm font-bold">Định mức lưu trong {selected.versionLabel}</h3><p className="mt-0.5 text-xs text-slate-500">Ngày áp dụng {formatDate(selected.effectiveDate)} · Ghi chú: {selected.note}</p></div><button onClick={() => setHistoryDetailId(null)} className="rounded p-1 text-slate-400 hover:bg-white" aria-label="Đóng chi tiết"><X className="h-4 w-4" /></button></div><div className="max-h-[32vh] overflow-auto"><table className="w-full min-w-[520px] text-left text-xs"><thead className="sticky top-0 bg-white text-[10px] uppercase text-slate-500"><tr><th className="px-4 py-2">Quỹ / khẩu phân bổ</th><th className="px-4 py-2 text-right">Tỷ lệ phân bổ</th><th className="px-4 py-2 text-right">Tỷ lệ / doanh thu</th></tr></thead><tbody>{selected.rows.map((row) => <tr key={row.id} className="border-t border-slate-100"><td className={`px-4 py-2 ${row.parentId ? 'pl-9 text-slate-500' : 'font-medium'}`}>{row.parentId ? '├─ ' : ''}{row.label}</td><td className="px-4 py-2 text-right tabular-nums">{row.allocationPercent.toLocaleString('vi-VN')}%</td><td className="px-4 py-2 text-right tabular-nums text-blue-700">{displayPercent(row.allocationPercent * ALLOCATION_POLICY_BUDGET_RATE / 100)}</td></tr>)}</tbody><tfoot className="bg-slate-50 font-bold"><tr><td className="px-4 py-2">Tổng các dòng</td><td className="px-4 py-2 text-right">{displayPercent(allocationTotal)}</td><td className="px-4 py-2 text-right">{displayPercent(allocationTotal * ALLOCATION_POLICY_BUDGET_RATE / 100)}</td></tr></tfoot></table></div></div>;
        })()}
        <div className="mt-4 flex justify-end"><button onClick={() => setHistoryOpen(false)} className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white">Đóng</button></div>
      </Modal>}
    </div>
  );
}

function CalculatorLabel() {
  return <span className="inline-flex h-4 w-4 items-center justify-center rounded border border-sky-300/60 text-[9px] font-black">₫</span>;
}

function BalanceBadge({ status, total }: { status: 'balanced' | 'over' | 'under'; total: number }) {
  if (status === 'balanced') return <span className="inline-flex items-center gap-1 rounded-md border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-[11px] font-semibold text-emerald-700"><Check className="h-3.5 w-3.5" /> Cân bằng: {total.toLocaleString('vi-VN')}%</span>;
  return <span className={`inline-flex items-center gap-1 rounded-md border px-2.5 py-1.5 text-[11px] font-semibold ${status === 'over' ? 'border-amber-200 bg-amber-50 text-amber-700' : 'border-sky-200 bg-sky-50 text-sky-700'}`}><Info className="h-3.5 w-3.5" /> {status === 'over' ? 'Vượt' : 'Thiếu'} cân bằng: {total.toLocaleString('vi-VN')}%</span>;
}

function Modal({ title, children, onClose, wide = false }: { title: string; children: React.ReactNode; onClose: () => void; wide?: boolean }) {
  return <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/55 p-4 backdrop-blur-[2px]" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><div role="dialog" aria-modal="true" aria-label={title} className={`my-auto w-full rounded-2xl bg-white p-5 shadow-2xl sm:p-6 ${wide ? 'max-w-5xl' : 'max-w-xl'}`}><div className="mb-4 flex items-center justify-between gap-3 border-b border-slate-100 pb-3"><h2 className="text-lg font-bold">{title}</h2><button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700" aria-label="Đóng"><X className="h-5 w-5" /></button></div>{children}</div></div>;
}
