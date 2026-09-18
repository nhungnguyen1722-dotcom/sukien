'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  History,
  Search,
  Filter,
  Download,
  Calendar,
  Gift,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Play,
  Award,
} from 'lucide-react';
import { SpinRecord } from './LuckyWheelSpin';

interface LuckyWheelHistoryProps {
  initialSpins: SpinRecord[];
}

export default function LuckyWheelHistory({ initialSpins }: LuckyWheelHistoryProps) {
  const [spins, setSpins] = useState<SpinRecord[]>(initialSpins);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(15);

  const filteredSpins = useMemo(() => {
    if (!searchQuery) return spins;
    return spins.filter(
      (s) =>
        s.participant_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.prize.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.wheel_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (s.participant_phone && s.participant_phone.includes(searchQuery)) ||
        (s.participant_code && s.participant_code.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  }, [spins, searchQuery]);

  const totalPages = Math.ceil(filteredSpins.length / itemsPerPage) || 1;
  const paginatedSpins = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredSpins.slice(start, start + itemsPerPage);
  }, [filteredSpins, currentPage, itemsPerPage]);

  return (
    <div className="space-y-6">
      {/* Header (Hình 17.2) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="text-[11px] text-slate-400 mb-0.5">
            Quay thưởng thưởng để nhận nhiều phần quà hấp dẫn
          </div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            Lịch sử quay thưởng
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Tổng cộng <span className="font-bold text-blue-600">{spins.length}</span> lượt quay
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Link
            href="/admin/vong-quay/quay"
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-all active:scale-95 cursor-pointer"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Vào quay thưởng</span>
          </Link>
        </div>
      </div>

      {/* Filter / Search Row */}
      <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Tìm theo người nhận, mã, giải thưởng..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          />
        </div>

        <div className="text-xs text-slate-400">
          Hiển thị {filteredSpins.length} kết quả
        </div>
      </div>

      {/* Table Container (Hình 17.2) */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden min-h-[350px]">
        {filteredSpins.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center text-slate-400 text-sm">
            <History className="w-12 h-12 text-slate-300 mb-3" />
            <span>Chưa có lượt quay nào.</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px] tracking-wider select-none">
                <tr>
                  <th className="py-3 px-3 text-center w-12">STT</th>
                  <th className="py-3 px-4">Thời gian</th>
                  <th className="py-3 px-4">Người tham gia</th>
                  <th className="py-3 px-4">SĐT / Mã</th>
                  <th className="py-3 px-4">Vòng quay</th>
                  <th className="py-3 px-4">Giải thưởng trúng</th>
                  <th className="py-3 px-4 text-center">Trạng thái</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedSpins.map((spin, index) => {
                  const isWin = !spin.prize.toLowerCase().includes('không');

                  return (
                    <tr key={spin.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-3 text-center text-slate-400 font-medium">
                        {(currentPage - 1) * itemsPerPage + index + 1}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap text-slate-500 font-mono text-[11px]">
                        {new Date(spin.spun_at).toLocaleTimeString('vi-VN')} {new Date(spin.spun_at).toLocaleDateString('vi-VN')}
                      </td>
                      <td className="py-3.5 px-4 font-bold text-slate-800">
                        {spin.participant_name}
                      </td>
                      <td className="py-3.5 px-4 text-slate-500 font-mono text-[11px]">
                        {spin.participant_code || spin.participant_phone || '—'}
                      </td>
                      <td className="py-3.5 px-4 font-medium text-slate-700">
                        {spin.wheel_name}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${
                            isWin
                              ? 'bg-amber-50 text-amber-800 border border-amber-200'
                              : 'bg-slate-100 text-slate-500'
                          }`}
                        >
                          {isWin && <Award className="w-3.5 h-3.5 text-amber-600" />}
                          {spin.prize}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          {spin.status || 'Đã nhận thưởng'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        {filteredSpins.length > itemsPerPage && (
          <div className="px-4 py-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <div>
              Trang {currentPage} / {totalPages}
            </div>
            <div className="flex items-center gap-1">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="p-1 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="p-1 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
