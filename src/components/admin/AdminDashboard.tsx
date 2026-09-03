'use client';

import {
  Calendar,
  TrendingUp,
  Users,
  Wallet,
  ArrowRight,
} from 'lucide-react';
import Link from 'next/link';

export interface DashboardStats {
  totalEvents: number;
  upcomingEvents: number;
  totalGuests: number;
  totalExpectedCost: number;
}

export interface UpcomingEvent {
  id: number;
  name: string;
  location: string | null;
  event_date: string;
}

export interface ActivityStats {
  totalEvents: number;
  newSales: number;
  totalMembers: number;
  registeredGuests: number;
}

interface AdminDashboardProps {
  stats: DashboardStats;
  upcomingEvents: UpcomingEvent[];
  activity: ActivityStats;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('vi-VN').format(amount) + ' đ';
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  const clean = dateStr.split('T')[0];
  const parts = clean.split('-');
  if (parts.length === 3) {
    const year = parts[0];
    const month = parseInt(parts[1], 10);
    const day = parseInt(parts[2], 10);
    return `${day}/${month}/${year}`;
  }
  const date = new Date(dateStr);
  return `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;
}

export default function AdminDashboard({
  stats,
  upcomingEvents,
  activity,
}: AdminDashboardProps) {
  return (
    <div className="p-8 max-w-[1400px]">
      {/* Title & Subtitle */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Tổng quan</h1>
        <p className="text-sm text-gray-500 mt-1.5 font-normal">
          Hệ thống quản lý sự kiện – thành viên – người mới
        </p>
      </div>

      {/* Top 4 Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Card 1: Tổng sự kiện */}
        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
          <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center mb-4">
            <Calendar className="w-5 h-5 text-blue-600" />
          </div>
          <p className="text-xs text-gray-500 font-medium mb-2">Tổng sự kiện</p>
          <p className="text-3xl font-bold text-gray-900">{stats.totalEvents}</p>
        </div>

        {/* Card 2: Sắp diễn ra */}
        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center mb-4">
            <TrendingUp className="w-5 h-5 text-emerald-600" />
          </div>
          <p className="text-xs text-gray-500 font-medium mb-2">Sắp diễn ra</p>
          <p className="text-3xl font-bold text-gray-900">{stats.upcomingEvents}</p>
        </div>

        {/* Card 3: Tổng khách mời */}
        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
          <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center mb-4">
            <Users className="w-5 h-5 text-purple-600" />
          </div>
          <p className="text-xs text-gray-500 font-medium mb-2">Tổng khách mời</p>
          <p className="text-3xl font-bold text-gray-900">{stats.totalGuests}</p>
        </div>

        {/* Card 4: Tổng chi phí dự kiến */}
        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
          <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center mb-4">
            <Wallet className="w-5 h-5 text-amber-600" />
          </div>
          <p className="text-xs text-gray-500 font-medium mb-2">Tổng chi phí dự kiến</p>
          <p className="text-3xl font-bold text-gray-900 tracking-tight">
            {formatCurrency(stats.totalExpectedCost)}
          </p>
        </div>
      </div>

      {/* Main Section: Sự kiện sắp tới & Hoạt động */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Sự kiện sắp tới (7 cols) */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-gray-100 shadow-[0_1px_3px_rgba(0,0,0,0.02)] p-6">
          <div className="flex items-center justify-between pb-4 border-b border-gray-100/80 mb-2">
            <h2 className="font-bold text-gray-900 text-base">Sự kiện sắp tới</h2>
            <Link
              href="/admin/su-kien"
              className="text-xs text-gray-500 hover:text-blue-600 flex items-center gap-1 transition-colors"
            >
              Chi tiết <span className="text-sm font-normal">→</span>
            </Link>
          </div>

          <div className="divide-y divide-gray-100/80">
            {upcomingEvents.length === 0 ? (
              <div className="py-8 text-center text-sm text-gray-400">
                Không có sự kiện nào
              </div>
            ) : (
              upcomingEvents.map((event) => (
                <div
                  key={event.id}
                  className="py-4 flex items-center justify-between hover:bg-gray-50/50 transition-colors px-1"
                >
                  <div className="min-w-0 pr-4">
                    <h3 className="text-sm font-semibold text-gray-900 truncate">
                      {event.name}
                    </h3>
                    <p className="text-xs text-gray-400 mt-1 truncate">
                      {event.location && event.location !== '-'
                        ? event.location
                        : '—'}
                    </p>
                  </div>
                  <div className="text-xs text-gray-500 font-medium flex-shrink-0">
                    {formatDate(event.event_date)}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Column: Hoạt động (5 cols) */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-gray-100 shadow-[0_1px_3px_rgba(0,0,0,0.02)] p-6 flex flex-col">
          <div className="pb-4 border-b border-gray-100/80 mb-2">
            <h2 className="font-bold text-gray-900 text-base">Hoạt động</h2>
          </div>

          <div className="divide-y divide-gray-100/80 flex-1">
            <div className="py-4 flex items-center justify-between">
              <span className="text-sm text-gray-600 font-normal">Sự kiện</span>
              <span className="text-sm font-bold text-gray-900">
                {activity.totalEvents}
              </span>
            </div>

            <div className="py-4 flex items-center justify-between">
              <span className="text-sm text-gray-600 font-normal">
                Người mời (Sale)
              </span>
              <span className="text-sm font-bold text-gray-900">
                {activity.newSales}
              </span>
            </div>

            <div className="py-4 flex items-center justify-between">
              <span className="text-sm text-gray-600 font-normal">Thành viên</span>
              <span className="text-sm font-bold text-gray-900">
                {activity.totalMembers}
              </span>
            </div>

            <div className="py-4 flex items-center justify-between">
              <span className="text-sm text-gray-600 font-normal">
                Khách mời đã đăng ký
              </span>
              <span className="text-sm font-bold text-gray-900">
                {activity.registeredGuests}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
