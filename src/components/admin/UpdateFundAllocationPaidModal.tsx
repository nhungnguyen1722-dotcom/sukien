'use client';

import React, { useEffect, useState } from 'react';
import { Check, Edit3, Loader2, RefreshCw, X } from 'lucide-react';

export interface FundRowItem {
  fund_key: string;
  fund_source: string;
  allocation_rate: number;
  allocation_amount: number;
  paid_amount: number;
}

export interface UpdateFundAllocationPaidModalProps {
  isOpen: boolean;
  onClose: () => void;
  periodCode: string;
  periodLabel: string;
  salesBase: number;
  fundRows: FundRowItem[];
  onSaveSuccess: (updatedRows: any[]) => void;
}

const formatVND = (num: number) => {
  return Math.round(num).toLocaleString('vi-VN') + ' ₫';
};

export default function UpdateFundAllocationPaidModal({
  isOpen,
  onClose,
  periodCode,
  periodLabel,
  salesBase,
  fundRows,
  onSaveSuccess,
}: UpdateFundAllocationPaidModalProps) {
  const [values, setValues] = useState<Record<string, number>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (isOpen) {
      const initial: Record<string, number> = {};
      for (const row of fundRows) {
        initial[row.fund_key] = row.paid_amount || 0;
      }
      setValues(initial);
      setErrorMsg('');
    }
  }, [isOpen, fundRows]);

  if (!isOpen) return null;

  const handleInputChange = (fundKey: string, valStr: string) => {
    const clean = valStr.replace(/[^\d]/g, '');
    const num = Number(clean) || 0;
    setValues((prev) => ({ ...prev, [fundKey]: num }));
  };

  const handleApplyStandard = () => {
    const updated: Record<string, number> = {};
    for (const row of fundRows) {
      if (['direct_sale', 'tribute_connection', 'tribute_support', 'operations', 'support_cn'].includes(row.fund_key)) {
        updated[row.fund_key] = Math.round(row.allocation_amount);
      } else if (row.fund_key === 'leader' || row.fund_key === 'leader_70') {
        updated[row.fund_key] = Math.round(row.allocation_amount * 0.7);
      } else {
        updated[row.fund_key] = 0;
      }
    }
    setValues(updated);
  };

  const handleResetZeros = () => {
    const updated: Record<string, number> = {};
    for (const row of fundRows) {
      updated[row.fund_key] = 0;
    }
    setValues(updated);
  };

  const totalAllocated = fundRows.reduce((s, r) => s + r.allocation_amount, 0);
  const totalPaid = fundRows.reduce((s, r) => s + (values[r.fund_key] || 0), 0);
  const totalRemaining = totalAllocated - totalPaid;

  const handleSave = async () => {
    try {
      setIsSaving(true);
      setErrorMsg('');

      const updates = fundRows.map((r) => ({
        fund_key: r.fund_key,
        paid_amount: values[r.fund_key] || 0,
      }));

      const res = await fetch('/api/admin/fund-weekly-allocations', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          period_code: periodCode,
          updates,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Không thể lưu cập nhật số tiền đã chi');
      }

      onSaveSuccess(json.updated || []);
      onClose();
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Lỗi khi cập nhật cơ sở dữ liệu');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="flex flex-col w-full max-w-4xl max-h-[90vh] bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
              <Edit3 className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900">
                Cập nhật số tiền "Đã chi" (Tổng chi quỹ)
              </h2>
              <p className="text-xs text-slate-500">
                {periodLabel ? `${periodLabel} (${periodCode})` : periodCode} · Doanh số HĐ: <strong>{formatVND(salesBase)}</strong>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-slate-400 hover:bg-slate-200/70 hover:text-slate-700 transition cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Quick action tools */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-2.5 bg-blue-50/50 border-b border-blue-100 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-slate-600 font-medium">Thao tác nhanh:</span>
            <button
              type="button"
              onClick={handleApplyStandard}
              className="px-2.5 py-1 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 transition cursor-pointer"
            >
              Điền theo chuẩn đối soát (Hình 3)
            </button>
            <button
              type="button"
              onClick={handleResetZeros}
              className="px-2.5 py-1 rounded-lg bg-slate-200 text-slate-700 font-semibold hover:bg-slate-300 transition cursor-pointer"
            >
              Đặt tất cả = 0
            </button>
          </div>
          <div className="text-slate-500 text-[11px]">
            * Nhập số tiền trực tiếp vào ô tương ứng, hệ thống sẽ tự động tính số dư Còn tồn.
          </div>
        </div>

        {errorMsg && (
          <div className="mx-6 mt-3 p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700">
            {errorMsg}
          </div>
        )}

        {/* Scrollable table of funds */}
        <div className="flex-1 min-h-0 overflow-y-auto px-6 py-4">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="border-b border-slate-200 text-slate-500 font-semibold sticky top-0 bg-white">
              <tr>
                <th className="py-2 px-2">Quỹ</th>
                <th className="py-2 px-2 text-center w-16">Tỷ lệ</th>
                <th className="py-2 px-3 text-right w-36">Phân bổ (15%)</th>
                <th className="py-2 px-3 text-right w-44 text-emerald-700">Đã chi (Chỉnh sửa)</th>
                <th className="py-2 px-3 text-right w-36">Còn tồn</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {fundRows.map((row) => {
                const currentPaid = values[row.fund_key] || 0;
                const remaining = row.allocation_amount - currentPaid;
                const ratePct = row.allocation_rate > 1 ? row.allocation_rate : row.allocation_rate * 100;

                return (
                  <tr key={row.fund_key} className="hover:bg-slate-50/70">
                    <td className="py-2 px-2">
                      <span className="font-semibold text-slate-800">{row.fund_source}</span>
                    </td>
                    <td className="py-2 px-2 text-center text-slate-600 font-mono">
                      {ratePct.toLocaleString('vi-VN', { maximumFractionDigits: 2 })}%
                    </td>
                    <td className="py-2 px-3 text-right font-mono font-medium text-slate-700">
                      {formatVND(row.allocation_amount)}
                    </td>
                    <td className="py-1.5 px-3 text-right">
                      <input
                        type="text"
                        value={currentPaid > 0 ? currentPaid.toLocaleString('vi-VN') : (currentPaid === 0 ? '0' : '')}
                        onChange={(e) => handleInputChange(row.fund_key, e.target.value)}
                        className="w-full text-right font-mono font-bold text-emerald-700 border border-slate-200 rounded-lg px-2.5 py-1 text-xs focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
                      />
                    </td>
                    <td
                      className={`py-2 px-3 text-right font-mono font-bold ${
                        remaining < 0 ? 'text-red-600' : 'text-slate-800'
                      }`}
                    >
                      {formatVND(remaining)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="border-t-2 border-slate-200 bg-slate-50 font-bold sticky bottom-0">
              <tr>
                <td colSpan={2} className="py-2.5 px-3 uppercase text-slate-700">
                  Tổng cộng
                </td>
                <td className="py-2.5 px-3 text-right font-mono text-blue-700">
                  {formatVND(totalAllocated)}
                </td>
                <td className="py-2.5 px-3 text-right font-mono text-emerald-700">
                  {formatVND(totalPaid)}
                </td>
                <td
                  className={`py-2.5 px-3 text-right font-mono ${
                    totalRemaining < 0 ? 'text-red-600' : 'text-slate-900'
                  }`}
                >
                  {formatVND(totalRemaining)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Footer */}
        <div className="flex shrink-0 items-center justify-between px-6 py-3.5 border-t border-slate-200 bg-slate-50">
          <div className="text-xs text-slate-500">
            Số tiền cập nhật sẽ được lưu trực tiếp vào cơ sở dữ liệu Neon.
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-blue-600 text-xs font-bold text-white shadow-sm hover:bg-blue-700 transition disabled:opacity-50 cursor-pointer"
            >
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              <span>{isSaving ? 'Đang lưu...' : 'Lưu cập nhật'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
