'use client';

import React, { useEffect, useMemo } from 'react';
import { Download, FileSpreadsheet, Loader2, Maximize2, X } from 'lucide-react';

export type ExcelPreviewMode = 'cashflow_week' | 'cashflow_month' | 'training';

export interface ExcelPreviewCashflowFund {
  name: string;
  rateText: string;
  allocated: number;
  spent: number;
  remaining: number;
}

export interface ExcelPreviewCashflowPerson {
  stt: number | string;
  name: string;
  phone?: string | null;
  bankAccount?: string | null;
  bankName?: string | null;
  detail?: string;
  total: number;
  amounts?: Record<string, number>;
}

export interface ExcelPreviewTrainingItem {
  stt: number | string;
  courseCode: string;
  date: string;
  memberPhone: string;
  memberName: string;
  tokenCount: number;
  sessionBudget: number;
  totalTokens: number;
  rewardAmount: number;
  status: string;
  validExpense: number;
  trainingDate: string;
}

export interface ExcelPreviewTrainingCourse {
  code: string;
  name: string;
  type: string;
  tokenValue: number;
  budget: number;
}

export interface ExcelPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExport: () => void | Promise<void>;
  onExportByContract?: () => void | Promise<void>;
  onExportByName?: () => void | Promise<void>;
  isExporting?: boolean;
  mode: ExcelPreviewMode;
  title: string;
  subtitle?: string;
  fileName?: string;
  distributionTitle?: string;
  distributionView?: 'contract' | 'person';
  onDistributionViewChange?: (view: 'contract' | 'person') => void;
  distributionMatrix?: React.ReactNode;
  data: {
    // For cashflow_week and cashflow_month
    salesBase?: number;
    periodLabel?: string;
    funds?: ExcelPreviewCashflowFund[];
    totalAllocated?: number;
    totalSpent?: number;
    totalRemaining?: number;
    people?: ExcelPreviewCashflowPerson[];
    fundColumns?: Array<{ key: string; label: string }>;
    // For training
    trainingLogs?: ExcelPreviewTrainingItem[];
    trainingCourses?: ExcelPreviewTrainingCourse[];
    tokenRate?: number;
    totalTokenCount?: number;
    totalRewards?: number;
    totalValidExpense?: number;
  };
}

const formatMoney = (val?: number | null) => {
  if (val === undefined || val === null) return '—';
  if (val === 0) return '0 đ';
  return Math.round(val).toLocaleString('vi-VN') + ' đ';
};

const formatPlainNumber = (val?: number | null) => {
  if (val === undefined || val === null) return '0';
  return Math.round(val).toLocaleString('vi-VN');
};

function DistributionMatrixControls({
  view,
  onViewChange,
}: {
  view: 'contract' | 'person';
  onViewChange: (view: 'contract' | 'person') => void;
}) {
  return (
    <div role="group" aria-label="Chế độ xem ma trận phân bổ" className="flex shrink-0 rounded-lg border border-slate-200 bg-white p-1 shadow-sm">
      <button type="button" aria-pressed={view === 'contract'} onClick={() => onViewChange('contract')} className={`rounded-md px-3 py-2 text-[11px] font-semibold ${view === 'contract' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50'}`}>
        Xem theo hợp đồng
      </button>
      <button type="button" aria-pressed={view === 'person'} onClick={() => onViewChange('person')} className={`rounded-md px-3 py-2 text-[11px] font-semibold ${view === 'person' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50'}`}>
        Xem theo họ tên
      </button>
    </div>
  );
}

function DistributionMatrixSection({
  title,
  matrix,
  showSignatures = true,
}: {
  title?: string;
  matrix?: React.ReactNode;
  showSignatures?: boolean;
}) {
  if (!matrix) return null;

  return (
    <section className="mt-8 border-t border-slate-200 pt-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold text-slate-900">{title || 'Bảng kê hợp đồng & nhân sự thụ hưởng'}</h2>
          <p className="mt-1 text-[11px] text-slate-500">Chi tiết số tiền phân bổ theo hợp đồng và người thụ hưởng.</p>
        </div>
      </div>
      {matrix}
      {showSignatures && <PreviewSignatures />}
    </section>
  );
}

function PreviewSignatures() {
  return (
    <div className="mt-8 border-t border-slate-200 pt-6">
      <div className="grid grid-cols-3 gap-6 rounded-lg border border-slate-200 bg-slate-50/70 p-5 text-center text-xs text-slate-800 shadow-2xs">
        <div className="flex flex-col items-center justify-between min-h-[90px]">
          <div>
            <p className="font-bold uppercase tracking-wider text-slate-900 text-xs">NGƯỜI LẬP</p>
            <p className="mt-0.5 text-[11px] text-slate-500 italic">(Ký, họ tên)</p>
          </div>
          <p className="mt-6 font-bold text-slate-900 text-xs sm:text-sm">Vũ Thị Cúc</p>
        </div>
        <div className="flex flex-col items-center justify-between min-h-[90px]">
          <div>
            <p className="font-bold uppercase tracking-wider text-slate-900 text-xs">PHÓ CHỦ TỊCH</p>
            <p className="mt-0.5 text-[11px] text-slate-500 italic">(Ký, họ tên)</p>
          </div>
          <p className="mt-6 font-bold text-slate-900 text-xs sm:text-sm">Nguyễn Thị Thương Hiếu</p>
        </div>
        <div className="flex flex-col items-center justify-between min-h-[90px]">
          <div>
            <p className="font-bold uppercase tracking-wider text-slate-900 text-xs">TỔNG GIÁM ĐỐC</p>
            <p className="mt-0.5 text-[11px] text-slate-500 italic">(Phê duyệt chi)</p>
          </div>
          <p className="mt-6 font-bold text-slate-900 text-xs sm:text-sm">Nguyễn Thị Hương Thảo</p>
        </div>
      </div>
    </div>
  );
}

function ExcelPreviewModal({
  isOpen,
  onClose,
  onExport,
  onExportByContract,
  onExportByName,
  isExporting = false,
  mode,
  title,
  subtitle,
  fileName,
  distributionTitle,
  distributionView,
  onDistributionViewChange,
  distributionMatrix,
  data,
}: ExcelPreviewModalProps) {
  const activeExportHandler = useMemo(() => {
    if (mode === 'cashflow_week' && distributionView === 'contract' && onExportByContract) return onExportByContract;
    if (mode === 'cashflow_week' && distributionView === 'person' && onExportByName) return onExportByName;
    return onExport;
  }, [distributionView, mode, onExport, onExportByContract, onExportByName]);

  // Close on ESC key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="flex flex-col w-full max-w-7xl h-[85vh] bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden"
        role="dialog"
        aria-modal="true"
        aria-labelledby="preview-modal-title"
      >
        {/* Header bar */}
        <div className="flex shrink-0 items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50/90">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 shadow-2xs">
              <FileSpreadsheet className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 id="preview-modal-title" className="text-base sm:text-lg font-bold text-slate-900 truncate">
                  {title}
                </h2>
                <span className="hidden sm:inline-flex rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700 border border-emerald-200">
                  Xem trước Excel
                </span>
              </div>
              <p className="text-xs text-slate-500 truncate">
                {subtitle || (fileName ? `Tệp: ${fileName}` : 'Xem trước định dạng bảng tính trước khi xuất file')}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={activeExportHandler}
              disabled={isExporting}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-xs sm:text-sm font-bold text-white shadow-sm hover:bg-emerald-700 active:scale-95 transition disabled:opacity-50 cursor-pointer"
              title="Tải tệp Excel .xlsx về máy"
            >
              {isExporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              <span>{isExporting ? 'Đang xuất...' : 'Xuất Excel'}</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl p-2 text-slate-400 hover:bg-slate-200/70 hover:text-slate-700 transition cursor-pointer"
              aria-label="Đóng popup"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* 2-Directional Scrollable Content */}
        <div className="flex-1 min-h-0 overflow-x-auto overflow-y-auto p-4 sm:p-6 bg-slate-100/80">
          {mode === 'cashflow_week' && distributionMatrix && distributionView && onDistributionViewChange && (
            <div className="min-w-[1050px] mb-3 flex justify-end">
              <DistributionMatrixControls view={distributionView} onViewChange={onDistributionViewChange} />
            </div>
          )}
          <div className="min-w-[1050px] bg-white p-6 sm:p-8 shadow-sm border border-slate-300 rounded-sm font-sans text-xs text-slate-800">
            {mode === 'cashflow_week' && <CashflowWeekPreview
              data={data}
              distributionSection={(
                <DistributionMatrixSection
                  title={distributionTitle}
                  matrix={distributionMatrix}
                  showSignatures={true}
                />
              )}
            />}
            {mode === 'cashflow_month' && <CashflowMonthPreview data={data} />}
            {mode === 'training' && <TrainingPreview data={data} />}
          </div>
        </div>

        {/* Footer info bar */}
        <div className="flex shrink-0 items-center justify-between px-6 py-3 border-t border-slate-200 bg-white text-xs text-slate-500">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />
              <span>Chế độ: Cuộn 2 chiều (Ngang / Dọc)</span>
            </span>
            {fileName && <span className="hidden sm:inline text-slate-400">| Tệp xuất: <strong className="text-slate-700 font-mono">{fileName}</strong></span>}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-200 px-3 py-1.5 font-semibold text-slate-600 hover:bg-slate-50 transition cursor-pointer"
            >
              Đóng
            </button>
            <button
              type="button"
              onClick={activeExportHandler}
              disabled={isExporting}
              className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-1.5 font-bold text-white shadow-2xs hover:bg-emerald-700 transition disabled:opacity-50 cursor-pointer"
            >
              {isExporting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
              <span>Xuất Excel (.xlsx)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default React.memo(ExcelPreviewModal);

// -------------------------------------------------------------
// PREVIEW 1: Cashflow Weekly Report (Theo tuần - chuẩn Hình 1 & Hình 3)
// -------------------------------------------------------------
function CashflowWeekPreview({
  data,
  distributionSection,
}: {
  data: ExcelPreviewModalProps['data'];
  distributionSection?: React.ReactNode;
}) {
  const funds = data.funds || [];
  const people = data.people || [];
  const fundCols = data.fundColumns || [];
  const salesBase = data.salesBase || 0;
  const totalAllocated = data.totalAllocated || funds.reduce((s, f) => s + f.allocated, 0);
  const totalSpent = data.totalSpent || funds.reduce((s, f) => s + f.spent, 0);
  const totalRemaining = totalAllocated - totalSpent;

  return (
    <div className="space-y-8 select-text">
      {/* Header Info */}
      <div className="space-y-1">
        <p className="font-bold text-slate-900 text-xs sm:text-sm uppercase tracking-wide">
          CÔNG TY CỔ PHẦN TẬP ĐOÀN NGHIÊNG COMPLEX
        </p>
        <p className="text-[11px] text-slate-600">
          ML 6-23 Vinhomes Greenbay, Đường Lương Thế Vinh, Đại Mỗ, Hà Nội
        </p>
      </div>

      <div className="text-center py-2">
        <h1 className="text-lg sm:text-xl font-extrabold uppercase text-slate-900 tracking-wider">
          ĐỀ NGHỊ THANH TOÁN
        </h1>
        <p className="text-xs font-semibold text-slate-700 mt-1">
          {data.periodLabel ? `Phân bổ hoa hồng và thù lao ${data.periodLabel}` : 'Phân bổ hoa hồng và thù lao kỳ tuần'}
        </p>
      </div>

      {/* Bảng 1: Phân bổ quỹ kỳ tuần (Không có cột Đề nghị chi - Chuẩn Hình 3) */}
      <div className="border border-slate-300 rounded-xs overflow-hidden">
        <table className="w-full text-left border-collapse text-[11px]">
          <thead>
            {/* Banner Row */}
            <tr className="bg-[#5B9BD5] text-white">
              <th colSpan={2} className="px-3 py-2.5 font-bold border-r border-[#4A87C0]">
                Doanh số HĐ (100%)
              </th>
              <th className="px-3 py-2.5 text-center font-bold border-r border-[#4A87C0]">Tỷ lệ</th>
              <th className="px-3 py-2.5 text-right font-bold border-r border-[#4A87C0]">
                {formatMoney(salesBase)}
              </th>
              <th className="px-3 py-2.5 text-right font-bold border-r border-[#4A87C0] bg-[#4281BD]">
                Tổng chi quỹ
              </th>
              <th className="px-3 py-2.5 text-right font-bold">Còn lại quỹ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {funds.map((f, idx) => {
              const remaining = f.allocated - f.spent;
              return (
              <tr key={idx} className="hover:bg-blue-50/30">
                <td className="w-8 px-2 py-2 text-center text-slate-400 font-mono border-r border-slate-200">
                  {idx + 1}
                </td>
                <td className="px-3 py-2 font-medium text-slate-800 border-r border-slate-200">
                  {f.name}
                </td>
                <td className="w-16 px-2 py-2 text-center text-slate-600 font-mono border-r border-slate-200">
                  {f.rateText}
                </td>
                <td className="px-3 py-2 text-right font-semibold text-slate-800 border-r border-slate-200 font-mono">
                  {formatMoney(f.allocated)}
                </td>
                <td
                  className={`px-3 py-2 text-right font-bold border-r border-slate-200 font-mono ${
                    f.spent === 0 ? 'text-red-600' : 'text-slate-900'
                  }`}
                >
                  {formatMoney(f.spent)}
                </td>
                <td
                  className={`px-3 py-2 text-right font-semibold font-mono ${
                    remaining === 0 ? 'text-red-600' : 'text-slate-800'
                  }`}
                >
                  {formatMoney(remaining)}
                </td>
              </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="bg-slate-100 font-bold border-t-2 border-slate-300 text-slate-900">
              <td colSpan={3} className="px-4 py-2.5 text-center uppercase tracking-wide border-r border-slate-300">
                Tổng quỹ
              </td>
              <td className="px-3 py-2.5 text-right font-mono border-r border-slate-300 text-blue-700">
                {formatMoney(totalAllocated)}
              </td>
              <td className="px-3 py-2.5 text-right font-mono border-r border-slate-300 text-emerald-700">
                {formatMoney(totalSpent)}
              </td>
              <td className="px-3 py-2.5 text-right font-mono text-amber-700">
                {formatMoney(totalRemaining)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {distributionSection}
      {!distributionSection && <PreviewSignatures />}
    </div>
  );
}

// -------------------------------------------------------------
// PREVIEW 2: Cashflow Monthly Report (Quyết toán tháng)
// -------------------------------------------------------------
function CashflowMonthPreview({ data }: { data: ExcelPreviewModalProps['data'] }) {
  const funds = data.funds || [];
  const people = data.people || [];
  const salesBase = data.salesBase || 0;
  const totalAllocated = data.totalAllocated || funds.reduce((s, f) => s + f.allocated, 0);
  const totalSpent = data.totalSpent || funds.reduce((s, f) => s + f.spent, 0);
  const totalRemaining = totalAllocated - totalSpent;

  return (
    <div className="space-y-8 select-text">
      <div className="space-y-1">
        <p className="font-bold text-slate-900 text-xs sm:text-sm uppercase tracking-wide">
          CÔNG TY CỔ PHẦN TẬP ĐOÀN NGHIÊNG COMPLEX
        </p>
        <p className="text-[11px] text-slate-600">
          ML 6-24 Vinhomes Greenbay, Đường Lương Thế Vinh, Đại Mỗ, Hà Nội
        </p>
      </div>

      <div className="text-center py-2">
        <h1 className="text-lg sm:text-xl font-extrabold uppercase text-slate-900 tracking-wider">
          {data.periodLabel ? `QUYẾT TOÁN QUỸ ${data.periodLabel}` : 'QUYẾT TOÁN QUỸ THÁNG'}
        </h1>
      </div>

      {/* Bảng Quyết toán quỹ */}
      <div className="border border-slate-300 rounded-xs overflow-hidden">
        <table className="w-full text-left border-collapse text-[11px]">
          <thead>
            <tr className="bg-[#5B9BD5] text-white">
              <th colSpan={2} className="px-3 py-2.5 font-bold border-r border-[#4A87C0]">
                Doanh số HĐ (100%)
              </th>
              <th className="px-3 py-2.5 text-center font-bold border-r border-[#4A87C0]">Tỷ lệ</th>
              <th className="px-3 py-2.5 text-right font-bold border-r border-[#4A87C0]">
                {formatMoney(salesBase)}
              </th>
              <th className="px-3 py-2.5 text-right font-bold border-r border-[#4A87C0] bg-[#4281BD]">
                Tổng chi quỹ
              </th>
              <th className="px-3 py-2.5 text-right font-bold">Còn lại quỹ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {funds.map((f, idx) => {
              const remaining = f.allocated - f.spent;
              return (
              <tr key={idx} className="hover:bg-blue-50/30">
                <td className="w-8 px-2 py-2 text-center text-slate-400 font-mono border-r border-slate-200">
                  {idx + 1}
                </td>
                <td className="px-3 py-2 font-medium text-slate-800 border-r border-slate-200">
                  {f.name}
                </td>
                <td className="w-16 px-2 py-2 text-center text-slate-600 font-mono border-r border-slate-200">
                  {f.rateText}
                </td>
                <td className="px-3 py-2 text-right font-semibold text-slate-800 border-r border-slate-200 font-mono">
                  {formatMoney(f.allocated)}
                </td>
                <td
                  className={`px-3 py-2 text-right font-bold border-r border-slate-200 font-mono ${
                    f.spent === 0 ? 'text-red-600' : 'text-slate-900'
                  }`}
                >
                  {formatMoney(f.spent)}
                </td>
                <td
                  className={`px-3 py-2 text-right font-semibold font-mono ${
                    remaining === 0 ? 'text-red-600' : 'text-slate-800'
                  }`}
                >
                  {formatMoney(remaining)}
                </td>
              </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="bg-slate-100 font-bold border-t-2 border-slate-300 text-slate-900">
              <td colSpan={3} className="px-4 py-2.5 text-center uppercase tracking-wide border-r border-slate-300">
                Tổng quỹ
              </td>
              <td className="px-3 py-2.5 text-right font-mono border-r border-slate-300 text-blue-700">
                {formatMoney(totalAllocated)}
              </td>
              <td className="px-3 py-2.5 text-right font-mono border-r border-slate-300 text-emerald-700">
                {formatMoney(totalSpent)}
              </td>
              <td className="px-3 py-2.5 text-right font-mono text-amber-700">
                {formatMoney(totalRemaining)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Bảng Kê Người Nhận Tháng */}
      {people.length > 0 ? (
        <div className="space-y-4">
          <div className="space-y-2">
            <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider">
              BẢNG KÊ NGƯỜI NHẬN HOA HỒNG VÀ THÙ LAO THÁNG ({people.length} NGƯỜI)
            </h3>
            <div className="border border-slate-300 rounded-xs overflow-hidden">
              <table className="w-full text-left border-collapse text-[11px]">
                <thead>
                  <tr className="bg-[#2F5597] text-white">
                    <th className="px-2 py-2 text-center w-10 border-r border-[#244277]">STT</th>
                    <th className="px-3 py-2 border-r border-[#244277] w-28">Mã Người nhận</th>
                    <th className="px-3 py-2 border-r border-[#244277]">Thông tin người nhận (Tên / STK / NH)</th>
                    <th className="px-3 py-2 border-r border-[#244277]">Chi tiết nội dung nhận</th>
                    <th className="px-3 py-2 text-right w-36 bg-[#1F3B6E]">Tổng tiền</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {people.map((p, idx) => (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="px-2 py-2 text-center text-slate-500 font-mono border-r border-slate-200 align-top">
                        {p.stt || idx + 1}
                      </td>
                      <td className="px-3 py-2 font-mono text-slate-700 border-r border-slate-200 align-top whitespace-nowrap">
                        {p.phone || '—'}
                      </td>
                      <td className="px-3 py-2 border-r border-slate-200 align-top">
                        <p className="font-bold text-slate-900">{p.name}</p>
                        {p.bankAccount && <p className="text-[10px] text-slate-600 font-mono">STK: {p.bankAccount}</p>}
                        {p.bankName && <p className="text-[10px] text-slate-500">{p.bankName}</p>}
                      </td>
                      <td className="px-3 py-2 border-r border-slate-200 align-top text-slate-700 whitespace-pre-line text-[10px] leading-relaxed">
                        {p.detail || 'Hoa hồng phân bổ theo các kỳ tuần'}
                      </td>
                      <td className="px-3 py-2 text-right font-bold text-emerald-700 font-mono align-top whitespace-nowrap">
                        {formatMoney(p.total)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-100 font-bold border-t-2 border-slate-300 text-slate-900">
                    <td colSpan={4} className="px-4 py-2.5 text-center uppercase tracking-wide border-r border-slate-300">
                      Tổng cộng thực chi ({people.length} người)
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono text-emerald-700 bg-emerald-100/50">
                      {formatMoney(people.reduce((sum, p) => sum + p.total, 0))}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
          <PreviewSignatures />
        </div>
      ) : (
        <PreviewSignatures />
      )}

    </div>
  );
}

// -------------------------------------------------------------
// PREVIEW 3: Training Management Sheet (7. Lịch Đào tạo)
// -------------------------------------------------------------
function TrainingPreview({ data }: { data: ExcelPreviewModalProps['data'] }) {
  const logs = data.trainingLogs || [];
  const courses = data.trainingCourses || [];
  const tokenRate = data.tokenRate || 5000;
  const totalTokens = data.totalTokenCount || logs.reduce((s, l) => s + (l.tokenCount || 0), 0);
  const totalRewards = data.totalRewards || logs.reduce((s, l) => s + (l.rewardAmount || 0), 0);
  const totalValid = data.totalValidExpense || logs.reduce((s, l) => s + (l.validExpense || 0), 0);

  return (
    <div className="space-y-6 select-text">
      {/* Banner 2 headers matching Excel */}
      <div className="grid grid-cols-12 gap-3 items-stretch">
        <div className="col-span-8 bg-[#1F497D] text-white p-3 rounded-xs text-center font-bold text-xs uppercase tracking-wider flex items-center justify-center">
          DANH SÁCH THAM GIA ĐÀO TẠO & THÙ LAO THEO TOKEN THỰC NHẬN
        </div>
        <div className="col-span-3 bg-[#1F497D] text-white p-3 rounded-xs text-center font-bold text-xs uppercase tracking-wider flex items-center justify-center">
          DANH MỤC BUỔI ĐÀO TẠO
        </div>
        <div className="col-span-1 bg-[#FFF2CC] border border-slate-300 p-2 rounded-xs text-center flex flex-col justify-center items-center">
          <span className="text-[9px] italic text-slate-600 leading-tight">1 token</span>
          <span className="text-xs font-bold text-slate-900 font-mono">{formatMoney(tokenRate)}</span>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-4 items-start">
        {/* Table 1: Danh sách tham gia đào tạo (Col-span 8) */}
        <div className="col-span-8 border border-slate-300 rounded-xs overflow-hidden">
          <table className="w-full text-left border-collapse text-[10px]">
            <thead>
              <tr className="bg-[#2F5597] text-white font-semibold">
                <th className="px-2 py-2 text-center w-8 border-r border-[#244277]">STT</th>
                <th className="px-2 py-2 border-r border-[#244277] w-20">Mã khoá học</th>
                <th className="px-2 py-2 border-r border-[#244277] w-16">Ngày</th>
                <th className="px-2 py-2 border-r border-[#244277] w-24">SĐT</th>
                <th className="px-2 py-2 border-r border-[#244277]">Họ Tên người tham gia</th>
                <th className="px-2 py-2 text-right border-r border-[#244277] w-14">Token</th>
                <th className="px-2 py-2 text-right border-r border-[#244277] w-24">Ngân sách</th>
                <th className="px-2 py-2 text-right border-r border-[#244277] w-24">Thù lao</th>
                <th className="px-2 py-2 text-center border-r border-[#244277] w-16">Trạng thái</th>
                <th className="px-2 py-2 text-right w-24 bg-[#1F3B6E]">Thực chi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {logs.map((item, idx) => (
                <tr key={idx} className="hover:bg-slate-50">
                  <td className="px-2 py-1.5 text-center text-slate-400 font-mono border-r border-slate-200">
                    {item.stt || idx + 1}
                  </td>
                  <td className="px-2 py-1.5 font-bold text-blue-700 font-mono border-r border-slate-200">
                    {item.courseCode}
                  </td>
                  <td className="px-2 py-1.5 text-slate-600 font-mono border-r border-slate-200 whitespace-nowrap">
                    {item.date}
                  </td>
                  <td className="px-2 py-1.5 text-slate-600 font-mono border-r border-slate-200 whitespace-nowrap">
                    {item.memberPhone}
                  </td>
                  <td className="px-2 py-1.5 font-medium text-slate-900 border-r border-slate-200 whitespace-nowrap">
                    {item.memberName}
                  </td>
                  <td className="px-2 py-1.5 text-right font-bold text-slate-900 font-mono border-r border-slate-200">
                    {item.tokenCount}
                  </td>
                  <td className="px-2 py-1.5 text-right text-slate-700 font-mono border-r border-slate-200 whitespace-nowrap">
                    {formatMoney(item.sessionBudget)}
                  </td>
                  <td className="px-2 py-1.5 text-right font-semibold text-slate-900 font-mono border-r border-slate-200 whitespace-nowrap">
                    {formatMoney(item.rewardAmount)}
                  </td>
                  <td className="px-2 py-1.5 text-center border-r border-slate-200 whitespace-nowrap">
                    <span
                      className={`inline-block px-1.5 py-0.5 rounded text-[9px] font-semibold ${
                        item.status === 'Đã duyệt'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {item.status}
                    </span>
                  </td>
                  <td className="px-2 py-1.5 text-right font-bold text-emerald-700 font-mono whitespace-nowrap bg-emerald-50/20">
                    {formatMoney(item.validExpense)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-[#FFFF00] font-bold text-slate-900 border-t-2 border-slate-300">
                <td colSpan={5} className="px-3 py-2 text-center uppercase tracking-wide border-r border-slate-300">
                  Tổng kết ({logs.length} lượt tham gia)
                </td>
                <td className="px-2 py-2 text-right font-mono border-r border-slate-300">
                  {totalTokens}
                </td>
                <td className="px-2 py-2 text-right font-mono border-r border-slate-300">
                  —
                </td>
                <td className="px-2 py-2 text-right font-mono border-r border-slate-300">
                  {formatMoney(totalRewards)}
                </td>
                <td className="px-2 py-2 text-center border-r border-slate-300">
                  —
                </td>
                <td className="px-2 py-2 text-right font-mono text-emerald-900">
                  {formatMoney(totalValid)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Table 2: Danh mục khóa học (Col-span 4) */}
        <div className="col-span-4 border border-slate-300 rounded-xs overflow-hidden">
          <table className="w-full text-left border-collapse text-[10px]">
            <thead>
              <tr className="bg-[#2F5597] text-white font-semibold">
                <th className="px-2 py-2 border-r border-[#244277] w-16">Mã BH</th>
                <th className="px-2 py-2 border-r border-[#244277]">Tên khoá học</th>
                <th className="px-2 py-2 text-center border-r border-[#244277] w-14">Hình thức</th>
                <th className="px-2 py-2 text-right border-r border-[#244277] w-12">Token</th>
                <th className="px-2 py-2 text-right w-20">Ngân sách</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {courses.map((c, idx) => (
                <tr key={idx} className="hover:bg-slate-50">
                  <td className="px-2 py-1.5 font-bold text-blue-700 font-mono border-r border-slate-200">
                    {c.code}
                  </td>
                  <td className="px-2 py-1.5 text-slate-800 border-r border-slate-200">
                    {c.name}
                  </td>
                  <td className="px-2 py-1.5 text-center text-slate-600 border-r border-slate-200">
                    {c.type}
                  </td>
                  <td className="px-2 py-1.5 text-right font-mono font-semibold text-slate-900 border-r border-slate-200">
                    {c.tokenValue}
                  </td>
                  <td className="px-2 py-1.5 text-right font-mono text-slate-800 whitespace-nowrap">
                    {formatMoney(c.budget)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-[#FFFF00] font-bold text-slate-900 border-t-2 border-slate-300">
                <td className="px-2 py-2 text-center border-r border-slate-300">{courses.length}</td>
                <td colSpan={2} className="px-2 py-2 text-center uppercase border-r border-slate-300">
                  Tổng ngân sách
                </td>
                <td className="px-2 py-2 text-right font-mono border-r border-slate-300">
                  {courses.reduce((s, c) => s + c.tokenValue, 0)}
                </td>
                <td className="px-2 py-2 text-right font-mono">
                  {formatMoney(courses.reduce((s, c) => s + c.budget, 0))}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      <PreviewSignatures />
    </div>
  );
}
