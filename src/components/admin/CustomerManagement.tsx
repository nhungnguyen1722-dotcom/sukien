'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  Users,
  UserCheck,
  Search,
  CheckCircle2,
  Clock,
  Gift,
  Share2,
  ChevronDown,
  ChevronRight,
  Filter,
  UserPlus,
  Building2,
  Phone,
  Mail,
  Calendar,
} from 'lucide-react';

export interface CustomerInvite {
  id: number;
  inviter_id: number;
  invitee_name: string | null;
  invitee_email: string;
  invitee_phone?: string | null;
  status: string;
  reward_points: number;
  created_at: string | null;
  inviter_name?: string | null;
  inviter_role?: string | null;
  inviter_ref_code?: string | null;
}

export interface InviterGroup {
  id: number;
  full_name: string;
  role?: string | null;
  count: number;
}

interface CustomerManagementProps {
  isAdmin: boolean;
  currentUser: {
    id?: number;
    name?: string;
    role?: string;
    phone?: string;
  };
  initialCustomers: CustomerInvite[];
  inviters: InviterGroup[];
}

export default function CustomerManagement({
  isAdmin,
  currentUser,
  initialCustomers,
  inviters,
}: CustomerManagementProps) {
  const [customers, setCustomers] = useState<CustomerInvite[]>(initialCustomers);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedInviter, setSelectedInviter] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grouped' | 'table'>(isAdmin ? 'grouped' : 'table');
  const [expandedInviters, setExpandedInviters] = useState<Record<string, boolean>>({
    all: true,
  });

  const toggleInviterExpand = (key: string) => {
    setExpandedInviters((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  // Filtered List
  const filteredCustomers = useMemo(() => {
    return customers.filter((c) => {
      const matchSearch =
        searchQuery.trim() === '' ||
        (c.invitee_name && c.invitee_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (c.invitee_email && c.invitee_email.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (c.invitee_phone && c.invitee_phone.includes(searchQuery)) ||
        (c.inviter_name && c.inviter_name.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchInviter =
        selectedInviter === 'all' || String(c.inviter_id) === selectedInviter;

      const matchStatus =
        selectedStatus === 'all' || c.status === selectedStatus;

      return matchSearch && matchInviter && matchStatus;
    });
  }, [customers, searchQuery, selectedInviter, selectedStatus]);

  // Grouped by inviter for Admin hierarchical view
  const groupedCustomers = useMemo(() => {
    const groups: Record<string, { inviter: { id: number; name: string; role?: string }; items: CustomerInvite[] }> = {};

    filteredCustomers.forEach((c) => {
      const key = c.inviter_id ? String(c.inviter_id) : 'unknown';
      if (!groups[key]) {
        groups[key] = {
          inviter: {
            id: c.inviter_id,
            name: c.inviter_name || 'Hệ thống / Admin',
            role: c.inviter_role || 'Admin',
          },
          items: [],
        };
      }
      groups[key].items.push(c);
    });

    return groups;
  }, [filteredCustomers]);

  // Statistics
  const stats = useMemo(() => {
    const total = filteredCustomers.length;
    const joined = filteredCustomers.filter((c) => c.status === 'Đã tham gia').length;
    const pending = filteredCustomers.filter((c) => c.status === 'Đang chờ').length;
    const rewards = filteredCustomers.reduce((acc, c) => acc + (c.reward_points || (c.status === 'Đã tham gia' ? 1 : 0)), 0);
    return { total, joined, pending, rewards };
  }, [filteredCustomers]);

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-[1400px] mx-auto space-y-6">
      {/* Top Banner Header */}
      <div className="bg-gradient-to-r from-[#0b1b3d] via-[#102a5c] to-[#1e3a8a] text-white p-6 sm:p-7 rounded-3xl shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-xs font-semibold text-blue-200 mb-2 border border-white/15">
              <UserCheck className="w-3.5 h-3.5 text-blue-300" />
              <span>{isAdmin ? 'Quản trị hệ thống khách hàng' : 'Khách hàng của tôi'}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Danh sách khách hàng
            </h1>
            <p className="text-xs sm:text-sm text-blue-100/80 mt-1 max-w-2xl">
              {isAdmin
                ? 'Xem danh sách khách hàng phân cấp theo người mời và trạng thái tham dự sự kiện.'
                : 'Danh sách các khách hàng và bạn bè được mời bởi tài khoản của bạn.'}
            </p>
          </div>

          <div className="flex items-center gap-2.5 self-start sm:self-center">
            <Link
              href="/admin/moi-ban-be"
              className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-sm transition active:scale-95 cursor-pointer"
            >
              <Share2 className="w-4 h-4" />
              <span>Lấy link mời bạn bè</span>
            </Link>
          </div>
        </div>

        {/* 4 Metrics Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-3 border-t border-white/10">
          <div className="bg-white/10 backdrop-blur-xs p-3.5 rounded-2xl border border-white/10">
            <div className="text-xs text-blue-200">Tổng khách hàng</div>
            <div className="text-2xl font-bold text-white mt-1">{stats.total}</div>
          </div>
          <div className="bg-white/10 backdrop-blur-xs p-3.5 rounded-2xl border border-white/10">
            <div className="text-xs text-emerald-300">Đã tham gia</div>
            <div className="text-2xl font-bold text-emerald-400 mt-1">{stats.joined}</div>
          </div>
          <div className="bg-white/10 backdrop-blur-xs p-3.5 rounded-2xl border border-white/10">
            <div className="text-xs text-amber-300">Đang chờ</div>
            <div className="text-2xl font-bold text-amber-400 mt-1">{stats.pending}</div>
          </div>
          <div className="bg-white/10 backdrop-blur-xs p-3.5 rounded-2xl border border-white/10">
            <div className="text-xs text-pink-300">Điểm thưởng</div>
            <div className="text-2xl font-bold text-pink-400 mt-1">{stats.rewards}</div>
          </div>
        </div>
      </div>

      {/* Control Bar: Search & Filters */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Tìm theo tên khách, email, SĐT, người mời..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-blue-500 transition"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600 bg-slate-200 px-1.5 py-0.5 rounded"
            >
              Xóa
            </button>
          )}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Inviter Filter (Admin only) */}
          {isAdmin && (
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl text-xs">
              <span className="text-slate-500 font-medium">Người mời:</span>
              <select
                value={selectedInviter}
                onChange={(e) => setSelectedInviter(e.target.value)}
                className="bg-transparent font-semibold text-slate-800 outline-none cursor-pointer"
              >
                <option value="all">Tất cả ({customers.length})</option>
                {inviters.map((inv) => (
                  <option key={inv.id} value={String(inv.id)}>
                    {inv.full_name} ({inv.count})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Status Filter */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl text-xs">
            <span className="text-slate-500 font-medium">Trạng thái:</span>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="bg-transparent font-semibold text-slate-800 outline-none cursor-pointer"
            >
              <option value="all">Tất cả</option>
              <option value="Đã tham gia">Đã tham gia</option>
              <option value="Đang chờ">Đang chờ</option>
              <option value="Từ chối">Từ chối</option>
            </select>
          </div>

          {/* View Mode Toggle (Admin only) */}
          {isAdmin && (
            <div className="flex items-center p-1 bg-slate-100 rounded-xl border border-slate-200 text-xs font-semibold">
              <button
                onClick={() => setViewMode('grouped')}
                className={`px-3 py-1 rounded-lg transition ${
                  viewMode === 'grouped' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Phân cấp
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={`px-3 py-1 rounded-lg transition ${
                  viewMode === 'table' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Danh sách
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Main Content Area: Hierarchical (Admin) or Flat Table */}
      {isAdmin && viewMode === 'grouped' ? (
        /* HIERARCHICAL GROUPED VIEW (Mục 9 - Danh sách phân cấp) */
        <div className="space-y-4">
          {Object.entries(groupedCustomers).map(([inviterKey, group]) => {
            const isExpanded = expandedInviters[inviterKey] !== false;

            return (
              <div
                key={inviterKey}
                className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden transition-all"
              >
                {/* Group Header: Người mời */}
                <div
                  onClick={() => toggleInviterExpand(inviterKey)}
                  className="p-4 sm:p-5 bg-slate-50/70 hover:bg-slate-100/70 flex items-center justify-between cursor-pointer select-none transition border-b border-slate-200/60"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs">
                      {group.inviter.name.charAt(0)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-slate-900 text-sm sm:text-base">
                          {group.inviter.name}
                        </h3>
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                          {group.inviter.role || 'Thành viên'}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Đã giới thiệu {group.items.length} khách hàng
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-xs font-bold text-slate-700 bg-white px-2.5 py-1 rounded-lg border border-slate-200">
                      {group.items.length} khách
                    </span>
                    {isExpanded ? (
                      <ChevronDown className="w-4 h-4 text-slate-400" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-slate-400" />
                    )}
                  </div>
                </div>

                {/* Sub-table: Danh sách khách được mời */}
                {isExpanded && (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-white text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-100">
                        <tr>
                          <th className="py-2.5 px-4 font-semibold">Tên khách hàng</th>
                          <th className="py-2.5 px-4 font-semibold hidden sm:table-cell">Email</th>
                          <th className="py-2.5 px-4 font-semibold hidden md:table-cell">Số điện thoại</th>
                          <th className="py-2.5 px-4 font-semibold">Thời gian</th>
                          <th className="py-2.5 px-4 font-semibold">Trạng thái</th>
                          <th className="py-2.5 px-4 font-semibold text-right">Điểm thưởng</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {group.items.map((cust) => (
                          <tr key={cust.id} className="hover:bg-slate-50/50 transition">
                            <td className="py-3 px-4">
                              <div className="font-bold text-slate-900">{cust.invitee_name || 'Khách vãng lai'}</div>
                              <div className="text-[11px] text-slate-400 sm:hidden">{cust.invitee_phone || cust.invitee_email}</div>
                            </td>
                            <td className="py-3 px-4 text-slate-600 hidden sm:table-cell">{cust.invitee_email}</td>
                            <td className="py-3 px-4 text-slate-600 hidden md:table-cell font-mono">{cust.invitee_phone || '—'}</td>
                            <td className="py-3 px-4 text-slate-500">
                              {cust.created_at ? new Date(cust.created_at).toLocaleDateString('vi-VN') : '—'}
                            </td>
                            <td className="py-3 px-4">
                              <span
                                className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                                  cust.status === 'Đã tham gia'
                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                    : cust.status === 'Từ chối'
                                    ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                    : 'bg-amber-50 text-amber-700 border border-amber-200'
                                }`}
                              >
                                {cust.status || 'Đang chờ'}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-right font-bold text-slate-700">
                              +{cust.reward_points || 1} điểm
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })}

          {Object.keys(groupedCustomers).length === 0 && (
            <div className="bg-white p-12 text-center text-slate-400 rounded-2xl border border-slate-200">
              Không tìm thấy khách hàng nào phù hợp với bộ lọc.
            </div>
          )}
        </div>
      ) : (
        /* FLAT TABLE VIEW (Non-admin or Table mode) */
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] tracking-wider border-b border-slate-200/80">
                <tr>
                  <th className="py-3.5 px-4 font-semibold">Tên khách hàng</th>
                  <th className="py-3.5 px-4 font-semibold hidden sm:table-cell">Email</th>
                  <th className="py-3.5 px-4 font-semibold hidden md:table-cell">Số điện thoại</th>
                  {isAdmin && <th className="py-3.5 px-4 font-semibold">Người mời</th>}
                  <th className="py-3.5 px-4 font-semibold">Thời gian</th>
                  <th className="py-3.5 px-4 font-semibold">Trạng thái</th>
                  <th className="py-3.5 px-4 font-semibold text-right">Điểm</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredCustomers.length > 0 ? (
                  filteredCustomers.map((cust) => (
                    <tr key={cust.id} className="hover:bg-slate-50/60 transition">
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900">{cust.invitee_name || 'Khách đăng ký'}</div>
                        <div className="text-[11px] text-slate-400 sm:hidden">
                          {cust.invitee_phone || cust.invitee_email}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 hidden sm:table-cell">{cust.invitee_email}</td>
                      <td className="py-3.5 px-4 text-slate-600 hidden md:table-cell font-mono">{cust.invitee_phone || '—'}</td>
                      {isAdmin && (
                        <td className="py-3.5 px-4">
                          <span className="font-semibold text-slate-800">{cust.inviter_name || 'Admin'}</span>
                          <span className="block text-[10px] text-slate-400">{cust.inviter_role}</span>
                        </td>
                      )}
                      <td className="py-3.5 px-4 text-slate-500">
                        {cust.created_at ? new Date(cust.created_at).toLocaleDateString('vi-VN') : '—'}
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            cust.status === 'Đã tham gia'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : cust.status === 'Từ chối'
                              ? 'bg-rose-50 text-rose-700 border border-rose-200'
                              : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}
                        >
                          {cust.status || 'Đang chờ'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right font-bold text-slate-700">
                        +{cust.reward_points || 1}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={isAdmin ? 7 : 6} className="py-12 text-center text-slate-400">
                      Không có khách hàng nào trong danh sách.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
