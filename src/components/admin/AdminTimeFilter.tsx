'use client';

import React, { useMemo } from 'react';
import { ChevronDown } from 'lucide-react';
import { computeMonthWeeks, formatDateDM } from '@/lib/weekRanges';

export interface AdminWeekItem {
  weekNo: number; // 0 for "Cả tháng", 1..5/6 for weeks
  weekKey?: string; // unique key e.g. "2026-10-W1" or "MONTH_OVERVIEW"
  label: string; // "Tuần 1" or "Cả tháng"
  dateRange: string; // "03/10 - 09/10"
}

export interface AdminTimeFilterProps {
  // Năm
  selectedYear: number;
  yearOptions?: number[];
  onYearChange: (year: number) => void;

  // Tháng
  selectedMonth: number | 'all'; // 1..12 or 'all'
  onMonthChange: (month: number | 'all') => void;
  allowAllMonths?: boolean; // Hiển thị nút "Tất cả" ở hàng tháng nếu cần

  // Tuần
  selectedWeek: number | string | null; // 0, null, or key for "Cả tháng", 1..6 or key for Tuần
  onWeekChange: (weekNo: number, weekKey?: string) => void;
  customWeeks?: AdminWeekItem[]; // Nếu trang truyền danh sách tuần riêng
  allMonthRangeLabel?: string; // Khoảng thời gian cho nút "Cả tháng"
  hideWeekRow?: boolean; // Ẩn hàng tuần (ví dụ khi chọn "Tất cả" tháng)

  // Tiện ích bổ sung
  rightSlot?: React.ReactNode;
  className?: string;
}

const MONTH_LIST = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

function AdminTimeFilterComponent({
  selectedYear,
  yearOptions,
  onYearChange,
  selectedMonth,
  onMonthChange,
  allowAllMonths = false,
  selectedWeek,
  onWeekChange,
  customWeeks,
  allMonthRangeLabel,
  hideWeekRow = false,
  rightSlot,
  className = '',
}: AdminTimeFilterProps) {
  // Tính danh sách năm hiển thị
  const years = useMemo(() => {
    if (yearOptions && yearOptions.length > 0) return yearOptions;
    const current = new Date().getFullYear();
    const set = new Set<number>([current, current + 1, current - 1, 2026, 2027, selectedYear]);
    return Array.from(set).sort((a, b) => b - a);
  }, [yearOptions, selectedYear]);

  // Key tháng dạng "YYYY-MM"
  const monthKey = useMemo(() => {
    if (selectedMonth === 'all') return `${selectedYear}-01`;
    return `${selectedYear}-${String(selectedMonth).padStart(2, '0')}`;
  }, [selectedYear, selectedMonth]);

  // Danh sách tuần trong tháng
  const weeks = useMemo<AdminWeekItem[]>(() => {
    if (customWeeks && customWeeks.length > 0) return customWeeks;
    if (selectedMonth === 'all') return [];

    try {
      const raw = computeMonthWeeks(monthKey);
      return raw.map((w) => ({
        weekNo: w.weekNo,
        weekKey: `${monthKey}-W${w.weekNo}`,
        label: `Tuần ${w.weekNo}`,
        dateRange: `${formatDateDM(w.start)} - ${formatDateDM(w.endInclusive)}`,
      }));
    } catch {
      return [1, 2, 3, 4, 5].map((no) => ({
        weekNo: no,
        weekKey: `${monthKey}-W${no}`,
        label: `Tuần ${no}`,
        dateRange: `Tuần ${no}`,
      }));
    }
  }, [customWeeks, monthKey, selectedMonth]);

  // Khoảng ngày tổng thể của cả tháng
  const computedMonthRange = useMemo(() => {
    if (allMonthRangeLabel) return allMonthRangeLabel;
    if (weeks.length === 0) return 'Toàn bộ';
    const first = weeks[0]?.dateRange.split(' - ')[0];
    const last = weeks[weeks.length - 1]?.dateRange.split(' - ')[1];
    return first && last ? `${first} - ${last}` : 'Toàn bộ';
  }, [allMonthRangeLabel, weeks]);

  // Kiểm tra tuần nào đang được chọn (active)
  const isMonthOverviewActive = useMemo(() => {
    if (selectedWeek === 0 || selectedWeek === null || selectedWeek === undefined) return true;
    if (typeof selectedWeek === 'string') {
      const lower = selectedWeek.toLowerCase();
      return (
        selectedWeek === '0' ||
        selectedWeek === '__MONTH_OVERVIEW__' ||
        lower.includes('all') ||
        lower.includes('month') ||
        lower.endsWith('-month')
      );
    }
    return false;
  }, [selectedWeek]);

  const checkWeekActive = (weekNo: number, weekKey?: string) => {
    if (isMonthOverviewActive) return false;
    if (typeof selectedWeek === 'number') {
      return selectedWeek === weekNo;
    }
    if (typeof selectedWeek === 'string') {
      if (weekKey && selectedWeek === weekKey) return true;
      if (selectedWeek === String(weekNo)) return true;
      // Trích xuất số tuần từ string e.g. "2026-10-W2"
      const match = selectedWeek.match(/-W?(\d+)$/i);
      if (match && Number(match[1]) === weekNo) return true;
    }
    return false;
  };

  return (
    <div className={`rounded-2xl border border-slate-200/90 bg-white p-3 shadow-xs transition-all ${className}`}>
      {/* ===== DÒNG 1: NĂM & THÁNG TRÊN CÙNG 1 HÀNG ===== */}
      <div className="flex flex-col gap-2.5 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          {/* Chọn Năm */}
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Năm</span>
            <div className="relative inline-flex items-center">
              <select
                aria-label="Chọn năm"
                value={selectedYear}
                onChange={(e) => onYearChange(Number(e.target.value))}
                className="appearance-none rounded-lg border border-slate-200 bg-white py-1.5 pl-3 pr-7 text-xs font-semibold text-slate-800 shadow-xs outline-none transition-colors hover:border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 cursor-pointer"
              >
                {years.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-2 h-3.5 w-3.5 text-slate-400" />
            </div>
          </div>

          <div className="hidden sm:block h-5 w-px bg-slate-200 shrink-0" />

          {/* Chọn Tháng */}
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar shrink-0">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 shrink-0 pr-1">Tháng</span>

            {allowAllMonths && (
              <button
                type="button"
                onClick={() => onMonthChange('all')}
                className={`shrink-0 rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
                  selectedMonth === 'all'
                    ? 'border-blue-600 bg-blue-600 text-white shadow-xs'
                    : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                }`}
                aria-pressed={selectedMonth === 'all'}
              >
                Tất cả
              </button>
            )}

            <div className="flex items-center gap-1">
              {MONTH_LIST.map((m) => {
                const isMonthActive = selectedMonth === m;
                return (
                  <button
                    type="button"
                    key={m}
                    onClick={() => onMonthChange(m)}
                    className={`h-8 w-8 shrink-0 rounded-lg border flex items-center justify-center text-xs font-semibold transition-all cursor-pointer ${
                      isMonthActive
                        ? 'border-slate-900 bg-slate-900 text-white font-bold shadow-xs'
                        : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                    aria-pressed={isMonthActive}
                  >
                    {m}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {rightSlot && <div className="shrink-0 flex items-center gap-2 pt-2 lg:pt-0 border-t border-slate-100 lg:border-t-0">{rightSlot}</div>}
      </div>

      {/* ===== DÒNG 2: DANH SÁCH CÁC TUẦN XUỐNG HÀNG DƯỚI ===== */}
      {!hideWeekRow && selectedMonth !== 'all' && (
        <div className="mt-2.5 flex items-center gap-1 overflow-x-auto no-scrollbar border-t border-slate-100 pt-2.5">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500 shrink-0 pr-1">Tuần</span>

          {/* Nút Cả tháng */}
          <button
            type="button"
            onClick={() => onWeekChange(0, '__MONTH_OVERVIEW__')}
            className={`group shrink-0 flex flex-col items-center justify-center rounded-lg border px-2.5 py-1 text-center transition-all cursor-pointer min-w-[70px] ${
              isMonthOverviewActive
                ? 'border-blue-600 bg-blue-600 text-white shadow-xs ring-1 ring-blue-600'
                : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
            }`}
            aria-pressed={isMonthOverviewActive}
          >
            <span className="text-xs font-bold leading-tight">Cả tháng</span>
            <span
              className={`text-[10px] leading-tight font-normal mt-0.5 ${
                isMonthOverviewActive ? 'text-blue-100 font-medium' : 'text-slate-400'
              }`}
            >
              {computedMonthRange}
            </span>
          </button>

          {/* Dãy nút Tuần: Chỉ hiển thị số tuần 1, 2, 3... không có chữ 'Tuần' */}
          {weeks.map((w) => {
            const isWeekActive = checkWeekActive(w.weekNo, w.weekKey);
            return (
              <button
                type="button"
                key={w.weekKey || w.weekNo}
                onClick={() => onWeekChange(w.weekNo, w.weekKey)}
                className={`group shrink-0 flex flex-col items-center justify-center rounded-lg border px-2.5 py-1 text-center transition-all cursor-pointer min-w-[70px] ${
                  isWeekActive
                    ? 'border-blue-600 bg-blue-600 text-white shadow-xs ring-1 ring-blue-600'
                    : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                }`}
                aria-pressed={isWeekActive}
              >
                <span className="text-xs font-bold leading-tight">{w.weekNo}</span>
                <span
                  className={`text-[10px] leading-tight font-normal mt-0.5 ${
                    isWeekActive ? 'text-blue-100 font-medium' : 'text-slate-400'
                  }`}
                >
                  {w.dateRange}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export const AdminTimeFilter = React.memo(AdminTimeFilterComponent);
export default AdminTimeFilter;
