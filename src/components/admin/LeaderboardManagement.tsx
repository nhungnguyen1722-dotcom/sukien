'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Trophy,
  Medal,
  Award,
  Download,
  Calendar,
  Users,
  Search,
  CheckCircle2,
  TrendingUp,
  Sparkles,
  ShieldCheck,
  ChevronDown,
  Layers,
  FileSpreadsheet,
  Briefcase,
  ExternalLink,
} from 'lucide-react';
import { LeaderboardData, LeaderboardMember, LeaderboardTeam } from '@/lib/leaderboardService';

interface Props {
  initialData?: LeaderboardData | null;
  initialMonth?: string;
  className?: string;
}

export function formatCompactVND(value: number): string {
  if (!value || value === 0) return '0 VNĐ';
  if (value >= 1_000_000_000) {
    const b = value / 1_000_000_000;
    return `${b % 1 === 0 ? b.toFixed(0) : b.toFixed(2)} Tỷ VNĐ`;
  }
  if (value >= 1_000_000) {
    const m = value / 1_000_000;
    return `${m % 1 === 0 ? m.toFixed(0) : m.toFixed(1)} Triệu VNĐ`;
  }
  return `${value.toLocaleString('vi-VN')} VNĐ`;
}

export function formatFullVND(value: number): string {
  return `${(Number(value) || 0).toLocaleString('vi-VN')} đ`;
}

const MONTH_SELECT_OPTIONS = [
  { value: '2026-10', label: 'Tháng 10/2026' },
  { value: '2026-09', label: 'Tháng 09/2026' },
  { value: '2026-08', label: 'Tháng 08/2026' },
  { value: '2026-07', label: 'Tháng 07/2026' },
  { value: '2026-11', label: 'Tháng 11/2026' },
  { value: '2026-12', label: 'Tháng 12/2026' },
];

export default function LeaderboardManagement({ initialData, initialMonth = '2026-10', className = '' }: Props) {
  const [selectedMonth, setSelectedMonth] = useState(initialMonth);
  const [mode, setMode] = useState<'month' | 'cumulative3'>('month');
  const [data, setData] = useState<LeaderboardData | null>(initialData || null);
  const [loading, setLoading] = useState(!initialData);
  const [exporting, setExporting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewTab, setViewTab] = useState<'personal' | 'team'>('personal');

  useEffect(() => {
    if (initialMonth && /^\d{4}-\d{2}$/.test(initialMonth)) {
      setSelectedMonth(initialMonth);
    }
  }, [initialMonth]);

  // Fetch leaderboard data when month or mode changes
  useEffect(() => {
    let active = true;
    setLoading(true);

    fetch(`/api/admin/leaderboard?month=${selectedMonth}&mode=${mode}`)
      .then((res) => res.json())
      .then((res) => {
        if (!active) return;
        if (res.success && res.data) {
          setData(res.data);
        }
      })
      .catch((err) => console.error('Failed to load leaderboard data:', err))
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [selectedMonth, mode]);

  // Export Excel
  const handleExportExcel = async () => {
    try {
      setExporting(true);
      const url = `/api/admin/leaderboard/export?month=${selectedMonth}&mode=${mode}`;
      const response = await fetch(url);
      if (!response.ok) throw new Error('Không thể xuất file Excel.');

      const blob = await response.blob();
      const disposition = response.headers.get('content-disposition');
      let filename = `bang-xep-hang-thi-dua-${selectedMonth}.xlsx`;
      if (disposition) {
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
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Lỗi xuất file Excel');
    } finally {
      setExporting(false);
    }
  };

  // Top 3 Members
  const top1 = data?.top3Members?.[0];
  const top2 = data?.top3Members?.[1];
  const top3 = data?.top3Members?.[2];

  // Filtered members by search
  const filteredMembers = useMemo(() => {
    if (!data?.members) return [];
    if (!searchQuery.trim()) return data.members;
    const q = searchQuery.toLowerCase().trim();
    return data.members.filter(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        m.phone.toLowerCase().includes(q) ||
        m.team.toLowerCase().includes(q) ||
        m.title.toLowerCase().includes(q)
    );
  }, [data?.members, searchQuery]);

  // Avatar helper
  const getInitials = (name: string) => {
    if (!name) return 'TV';
    const words = name.trim().split(/\s+/);
    if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
    return (words[0][0] + words[words.length - 1][0]).toUpperCase();
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* HEADER SECTION (matching Image 1) */}
      <div className="flex flex-col gap-4 rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
              <Trophy className="h-3.5 w-3.5 text-amber-500" /> Bảng Vinh Danh Doanh Số
            </span>
            <span className="hidden text-xs text-slate-400 sm:inline">•</span>
            <span className="hidden text-xs text-slate-500 sm:inline">Xét bổ nhiệm Quản lý & Giám đốc KD</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Bảng Xếp Hạng Thi Đua & Vinh Danh Doanh Số
          </h1>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Month Selector Dropdown */}
          <div className="relative">
            <select
              aria-label="Chọn tháng xem bảng xếp hạng"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="appearance-none rounded-2xl border border-slate-200 bg-slate-50/90 py-2.5 pl-4 pr-10 text-sm font-semibold text-slate-800 shadow-xs transition hover:bg-slate-100/80 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
            >
              {MONTH_SELECT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          </div>

          {/* Mode Pill Toggle (Xem theo Tháng vs Xét thăng hạng 3 tháng) */}
          <div className="inline-flex rounded-2xl border border-slate-200 bg-slate-100/80 p-1 shadow-inner">
            <button
              type="button"
              onClick={() => setMode('month')}
              className={`rounded-xl px-4 py-2 text-xs font-bold transition-all sm:text-sm ${
                mode === 'month'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Xem theo Tháng
            </button>
            <button
              type="button"
              onClick={() => setMode('cumulative3')}
              className={`rounded-xl px-4 py-2 text-xs font-bold transition-all sm:text-sm ${
                mode === 'cumulative3'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Xét thăng hạng (Lũy kế 3 tháng)
            </button>
          </div>

          {/* Export Excel Button */}
          <button
            type="button"
            onClick={handleExportExcel}
            disabled={exporting}
            className="inline-flex items-center gap-2 rounded-2xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 active:scale-95 disabled:opacity-60"
          >
            <FileSpreadsheet className="h-4 w-4" />
            {exporting ? 'Đang xuất…' : 'Xuất file Excel'}
          </button>
        </div>
      </div>

      {/* TOP 3 PODIUM CARDS (matching Image 1) */}
      <div className="grid grid-cols-1 items-end gap-5 md:grid-cols-3">
        {/* TOP 2 CARD (Left) */}
        <div className="order-2 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition-all hover:shadow-md md:order-1">
          <div className="flex flex-col items-center text-center">
            {/* Top 2 Medal Badge */}
            <div className="relative mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-b from-slate-100 to-slate-200 shadow-inner">
              <Medal className="h-8 w-8 text-slate-400" />
              <span className="absolute -bottom-2 rounded-full border border-slate-300 bg-white px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-700 shadow-xs">
                Top 2
              </span>
            </div>

            <h3 className="mt-2 text-lg font-bold text-slate-900">
              {top2?.name || 'Chưa xác định'}
            </h3>
            <p className="text-xs font-medium text-slate-500">
              {top2?.team ? `- Đội ${top2.team}` : '- Đang cập nhật'}
            </p>

            <div className="mt-4 w-full rounded-2xl bg-slate-50/80 p-3.5">
              <div className="text-xs text-slate-500">
                Doanh số <span className="font-bold text-slate-900">{formatCompactVND(top2?.revenue || 0)}</span>
              </div>
              <div className="mt-1 text-xs text-slate-500">
                Hoa hồng <span className="font-bold text-blue-600">{formatCompactVND(top2?.commission || 0)}</span>
              </div>
              <div className="mt-1 text-[11px] text-slate-400">
                Số HĐ: <span className="font-semibold text-slate-700">{top2?.contractCount || 0}</span>
              </div>
            </div>

            <div className="mt-3">
              <span className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-[11px] font-semibold text-blue-700">
                {top2?.promotionEvaluation || 'Thành viên xuất sắc'}
              </span>
            </div>
          </div>
        </div>

        {/* TOP 1 CARD (Center - Elevated, Golden Crown) */}
        <div className="relative order-1 rounded-3xl border-2 border-amber-300 bg-gradient-to-b from-amber-50/40 via-white to-white p-7 shadow-lg ring-4 ring-amber-100/60 transition-all hover:shadow-xl md:order-2 md:-translate-y-2">
          {/* Radiant crown glow */}
          <div className="absolute -top-3 left-1/2 -translate-x-1/2">
            <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-amber-500 to-yellow-500 px-3.5 py-1 text-xs font-black uppercase tracking-wider text-white shadow-md">
              <Sparkles className="h-3.5 w-3.5" /> Quán Quân Doanh Số
            </span>
          </div>

          <div className="mt-2 flex flex-col items-center text-center">
            {/* Golden Trophy Icon */}
            <div className="relative mb-3 flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-amber-400 via-yellow-400 to-amber-500 shadow-md ring-4 ring-amber-200/50">
              <Trophy className="h-11 w-11 text-white drop-shadow-sm" />
            </div>

            <h2 className="mt-1 text-xl font-extrabold text-slate-900 sm:text-2xl">
              {top1?.name || 'Chưa xác định'}
            </h2>
            <p className="text-sm font-semibold text-slate-600">
              {top1?.team ? `- Đội ${top1.team}` : '- Đang cập nhật'}
            </p>

            <div className="mt-5 w-full rounded-2xl border border-amber-100 bg-amber-50/40 p-4 shadow-inner">
              <div className="text-sm text-slate-600">
                Doanh số <span className="text-base font-extrabold text-slate-900">{formatCompactVND(top1?.revenue || 0)}</span>
              </div>
              <div className="mt-1.5 text-sm text-slate-600">
                Hoa hồng <span className="text-base font-extrabold text-amber-700">{formatCompactVND(top1?.commission || 0)}</span>
              </div>
              <div className="mt-1 text-xs text-slate-500">
                Tổng hợp đồng: <span className="font-bold text-slate-800">{top1?.contractCount || 0}</span>
              </div>
            </div>

            {/* Evaluation Pill Badge */}
            <div className="mt-4">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-300 bg-gradient-to-r from-amber-100 to-yellow-100 px-4 py-1.5 text-xs font-bold text-amber-900 shadow-xs">
                <CheckCircle2 className="h-3.5 w-3.5 text-amber-700" />
                {top1?.promotionEvaluation || 'Duy trì 3 tháng liên tục - Đạt chuẩn Giám đốc KD'}
              </span>
            </div>
          </div>
        </div>

        {/* TOP 3 CARD (Right) */}
        <div className="order-3 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition-all hover:shadow-md md:order-3">
          <div className="flex flex-col items-center text-center">
            {/* Top 3 Bronze Medal Badge */}
            <div className="relative mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-b from-orange-100 to-amber-200 shadow-inner">
              <Medal className="h-8 w-8 text-amber-700" />
              <span className="absolute -bottom-2 rounded-full border border-amber-300 bg-white px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-800 shadow-xs">
                Top 3
              </span>
            </div>

            <h3 className="mt-2 text-lg font-bold text-slate-900">
              {top3?.name || 'Chưa xác định'}
            </h3>
            <p className="text-xs font-medium text-slate-500">
              {top3?.team ? `- Đội ${top3.team}` : '- Đang cập nhật'}
            </p>

            <div className="mt-4 w-full rounded-2xl bg-slate-50/80 p-3.5">
              <div className="text-xs text-slate-500">
                Doanh số <span className="font-bold text-slate-900">{formatCompactVND(top3?.revenue || 0)}</span>
              </div>
              <div className="mt-1 text-xs text-slate-500">
                Hoa hồng <span className="font-bold text-blue-600">{formatCompactVND(top3?.commission || 0)}</span>
              </div>
              <div className="mt-1 text-[11px] text-slate-400">
                Số HĐ: <span className="font-semibold text-slate-700">{top3?.contractCount || 0}</span>
              </div>
            </div>

            <div className="mt-3">
              <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-[11px] font-semibold text-slate-700">
                {top3?.promotionEvaluation || 'Thành viên xuất sắc'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* VIEW SWITCHER & SEARCH (Personal vs Team) */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="inline-flex rounded-2xl border border-slate-200 bg-white p-1 shadow-xs">
          <button
            type="button"
            onClick={() => setViewTab('personal')}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition sm:text-sm ${
              viewTab === 'personal'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Users className="h-4 w-4" /> Bảng Cá Nhân ({data?.members?.length || 0})
          </button>
          <button
            type="button"
            onClick={() => setViewTab('team')}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition sm:text-sm ${
              viewTab === 'team'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Layers className="h-4 w-4" /> Bảng Đội Nhóm ({data?.teams?.length || 0})
          </button>
        </div>

        {/* Search */}
        <div className="relative min-w-[280px]">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Tìm theo tên thành viên, số ĐT, đội..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-2xl border border-slate-200 bg-white py-2 pl-10 pr-4 text-xs font-medium text-slate-800 placeholder-slate-400 shadow-xs focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
          />
        </div>
      </div>

      {/* TABLE 1: PERSONAL LEADERBOARD (matching Image 1) */}
      {viewTab === 'personal' && (
        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50/80 text-xs font-bold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-5 py-4 text-center">Thứ hạng</th>
                  <th className="px-5 py-4">Thành viên & Chức danh</th>
                  <th className="px-5 py-4">Đội nhóm</th>
                  <th className="px-5 py-4 text-right">Doanh số cá nhân</th>
                  <th className="px-5 py-4 text-right">Hoa hồng thực nhận</th>
                  <th className="px-5 py-4 text-center">Số hợp đồng</th>
                  <th className="px-5 py-4">Đánh giá thăng hạng (Quản lý/Giám đốc)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-5 py-14 text-center text-sm text-slate-400">
                      Đang tải dữ liệu bảng xếp hạng…
                    </td>
                  </tr>
                ) : filteredMembers.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-5 py-14 text-center text-sm text-slate-400">
                      Không tìm thấy dữ liệu phù hợp.
                    </td>
                  </tr>
                ) : (
                  filteredMembers.map((member) => {
                    const isTop1 = member.rank === 1;
                    const isTop2 = member.rank === 2;
                    const isTop3 = member.rank === 3;

                    return (
                      <tr
                        key={`${member.phone}-${member.name}`}
                        className={`transition hover:bg-slate-50/70 ${
                          isTop1 ? 'bg-amber-50/30' : isTop3 ? 'bg-orange-50/20' : ''
                        }`}
                      >
                        {/* Rank Badge */}
                        <td className="px-5 py-4 text-center font-bold">
                          {isTop1 ? (
                            <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-tr from-amber-400 to-yellow-300 text-sm font-black text-amber-950 shadow-xs">
                              1
                            </span>
                          ) : isTop2 ? (
                            <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-tr from-slate-200 to-slate-100 text-sm font-black text-slate-800 shadow-xs">
                              2
                            </span>
                          ) : isTop3 ? (
                            <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-tr from-amber-200 to-orange-200 text-sm font-black text-amber-950 shadow-xs">
                              3
                            </span>
                          ) : (
                            <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 text-xs font-bold text-slate-600">
                              {member.rank}
                            </span>
                          )}
                        </td>

                        {/* Member & Avatar */}
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border border-slate-200 bg-slate-100 shadow-inner">
                              {member.avatarUrl ? (
                                <img
                                  src={member.avatarUrl}
                                  alt={member.name}
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                <span className="text-xs font-black text-slate-600">
                                  {getInitials(member.name)}
                                </span>
                              )}
                            </div>
                            <div>
                              <div className="font-bold text-slate-900">{member.name}</div>
                              <div className="text-xs text-slate-500">
                                {member.team ? `Đội ${member.team}` : member.title || 'Thành viên'}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Team */}
                        <td className="px-5 py-4">
                          <span className="inline-flex items-center rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-700">
                            {member.team || 'Chưa gán đội'}
                          </span>
                        </td>

                        {/* Personal Revenue */}
                        <td className="px-5 py-4 text-right font-bold text-slate-900" title={formatFullVND(member.revenue)}>
                          {formatCompactVND(member.revenue)}
                        </td>

                        {/* Commission */}
                        <td className="px-5 py-4 text-right font-bold text-blue-700" title={formatFullVND(member.commission)}>
                          {formatCompactVND(member.commission)}
                        </td>

                        {/* Contracts count */}
                        <td className="px-5 py-4 text-center font-semibold text-slate-700">
                          {member.contractCount}
                        </td>

                        {/* Promotion Evaluation */}
                        <td className="px-5 py-4">
                          {member.isDirectorEligible || member.promotionEvaluation.includes('Giám đốc') ? (
                            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-800">
                              <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                              {member.promotionEvaluation}
                            </span>
                          ) : member.isManagerEligible || member.promotionEvaluation.includes('Quản lý') ? (
                            <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-bold text-blue-800">
                              <Briefcase className="h-3.5 w-3.5 text-blue-600" />
                              {member.promotionEvaluation}
                            </span>
                          ) : member.promotionEvaluation.includes('Tiềm năng') ? (
                            <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800">
                              <TrendingUp className="h-3.5 w-3.5 text-amber-600" />
                              {member.promotionEvaluation}
                            </span>
                          ) : (
                            <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                              {member.promotionEvaluation}
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TABLE 2: TEAM LEADERBOARD (matching Image 2) */}
      {viewTab === 'team' && (
        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px] text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50/80 text-xs font-bold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-5 py-4 text-center">Hạng</th>
                  <th className="px-5 py-4">Đội nhóm</th>
                  <th className="px-5 py-4 text-right">Doanh số đội</th>
                  <th className="px-5 py-4 text-center">Số hợp đồng</th>
                  <th className="px-5 py-4 text-right">Thưởng thi đua nhóm (Dự kiến)</th>
                  <th className="px-5 py-4 text-right">Thưởng KPI nhóm</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-14 text-center text-sm text-slate-400">
                      Đang tải danh sách đội nhóm…
                    </td>
                  </tr>
                ) : (
                  data?.teams?.map((team) => {
                    const isTop1 = team.rank === 1;
                    const isTop2 = team.rank === 2;
                    const isTop3 = team.rank === 3;

                    return (
                      <tr
                        key={team.teamName}
                        className={`transition hover:bg-slate-50/70 ${
                          isTop1 ? 'bg-amber-50/30 font-semibold' : isTop3 ? 'bg-orange-50/20' : ''
                        }`}
                      >
                        <td className="px-5 py-4 text-center">
                          {isTop1 ? (
                            <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-amber-400 text-xs font-black text-amber-950 shadow-xs">
                              1
                            </span>
                          ) : isTop2 ? (
                            <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-slate-200 text-xs font-black text-slate-800 shadow-xs">
                              2
                            </span>
                          ) : isTop3 ? (
                            <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-orange-200 text-xs font-black text-orange-900 shadow-xs">
                              3
                            </span>
                          ) : (
                            <span className="text-xs font-bold text-slate-500">{team.rank}</span>
                          )}
                        </td>
                        <td className="px-5 py-4">
                          <span className="font-bold text-slate-900">{team.teamName}</span>
                        </td>
                        <td className="px-5 py-4 text-right font-bold text-slate-900" title={formatFullVND(team.revenue)}>
                          {formatFullVND(team.revenue)}
                        </td>
                        <td className="px-5 py-4 text-center font-semibold text-slate-600">
                          {team.contractCount}
                        </td>
                        <td className="px-5 py-4 text-right font-bold text-amber-700">
                          {formatFullVND(team.bonusThiDua)}
                        </td>
                        <td className="px-5 py-4 text-right font-bold text-blue-700">
                          {formatFullVND(team.bonusKpi)}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
