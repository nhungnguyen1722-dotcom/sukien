'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  CalendarDays,
  Users,
  UserPlus,
  ConciergeBell,
  Ticket,
  ShieldCheck,
  FileSpreadsheet,
  Settings,
  LogOut,
  Menu,
  X,
} from 'lucide-react';
import SystemLogo from '@/components/SystemLogo';

const menuItems = [
  { label: 'Tổng quan', href: '/admin', icon: LayoutDashboard },
  { label: 'Sự kiện', href: '/admin/su-kien', icon: CalendarDays },
  { label: 'Thành viên', href: '/admin/thanh-vien', icon: Users },
  { label: 'Danh sách khách hàng', href: '/admin/nguoi-moi', icon: UserPlus },
  { label: 'Lễ tân', href: '/admin/le-tan', icon: ConciergeBell },
  { label: 'Mời bạn bè', href: '/admin/moi-ban-be', icon: Ticket },
  { label: 'Nhật ký hợp đồng', href: '/admin/nhat-ky-hop-dong', icon: FileSpreadsheet },
  { label: 'Tài khoản & Phân quyền', href: '/admin/tai-khoan', icon: ShieldCheck },
  { label: 'Thiết lập', href: '/admin/thiet-lap', icon: Settings },
];

interface AdminSidebarProps {
  adminName?: string;
  adminRole?: string;
}

export default function AdminSidebar({
  adminName: defaultAdminName = 'Nhung Nguyễn',
  adminRole: defaultAdminRole = 'ADMIN',
}: AdminSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [currentRole, setCurrentRole] = useState(defaultAdminRole);
  const [currentName, setCurrentName] = useState(defaultAdminName);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  useEffect(() => {
    if (defaultAdminRole) setCurrentRole(defaultAdminRole);
    if (defaultAdminName) setCurrentName(defaultAdminName);
    try {
      const getCookie = (name: string) => {
        const match = document.cookie.match(new RegExp('(^|;\\s*)(' + name + ')=([^;]*)'));
        return match ? decodeURIComponent(match[3]) : null;
      };
      const cRole = getCookie('user_role');
      const cName = getCookie('user_name');
      if (cRole) setCurrentRole(cRole);
      if (cName) setCurrentName(cName);
    } catch {
      // Ignore
    }
  }, [defaultAdminRole, defaultAdminName]);

  // Close mobile sidebar on route change
  useEffect(() => {
    setIsMobileOpen(false);
  }, [pathname]);

  const roleLower = (currentRole || '').toLowerCase();
  const isAdmin = roleLower === 'admin' || roleLower.includes('quản trị');
  const isReception = roleLower.includes('lễ tân') || roleLower.includes('reception');

  // Phân quyền menu (Mục 9)
  const visibleMenuItems = useMemo(() => {
    if (isAdmin) {
      return menuItems;
    }
    if (isReception) {
      return menuItems.filter((item) => item.href === '/admin/le-tan');
    }
    // Các vai trò phi-admin: MC, Nhân sự, Nhân viên, Diễn giả, Khác, Phụng sự, Chốt sự kiện...
    // Được xem: Trang tổng quát, Sự kiện, Mời bạn bè, và Danh sách khách hàng (Mục 1)
    return menuItems.filter((item) =>
      ['/admin', '/admin/su-kien', '/admin/moi-ban-be', '/admin/nguoi-moi'].includes(item.href)
    );
  }, [isAdmin, isReception]);

  const handleLogout = () => {
    try {
      localStorage.removeItem('nghieng_auth_role');
      document.cookie = 'user_role=; path=/; max-age=0';
      document.cookie = 'user_name=; path=/; max-age=0';
      document.cookie = 'user_email=; path=/; max-age=0';
      document.cookie = 'user_phone=; path=/; max-age=0';
      document.cookie = 'user_id=; path=/; max-age=0';
    } catch {
      // Ignore
    }
    router.push('/login');
    router.refresh();
  };

  return (
    <>
      {/* Nút Toggle mở Left Sidebar trên Mobile (Mục 15) */}
      <button
        type="button"
        onClick={() => setIsMobileOpen(true)}
        className="fixed top-3.5 left-4 z-40 md:hidden p-2 rounded-xl bg-slate-900 text-white shadow-lg border border-slate-700 hover:bg-slate-800 transition-all cursor-pointer active:scale-95"
        title="Mở menu quản trị"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Backdrop trên Mobile khi mở Sidebar */}
      {isMobileOpen && (
        <div
          onClick={() => setIsMobileOpen(false)}
          className="fixed inset-0 bg-black/60 backdrop-blur-xs z-40 md:hidden animate-in fade-in duration-150"
        />
      )}

      <aside
        className={`w-[260px] min-h-screen bg-[#0f172a] flex flex-col fixed left-0 top-0 bottom-0 z-50 text-white select-none transition-transform duration-200 ease-in-out ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        {/* Brand Header */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-slate-800/60">
          <Link href={isReception ? "/admin/le-tan" : "/admin"} className="flex items-center justify-center flex-1 group">
            <div className="bg-white px-4 py-2 rounded-2xl shadow-md flex items-center justify-center w-full max-w-[190px] hover:shadow-lg transition-all">
              <SystemLogo className="h-9 w-auto max-h-9 object-contain transition-transform group-hover:scale-105 duration-200" />
            </div>
          </Link>
          <button
            type="button"
            onClick={() => setIsMobileOpen(false)}
            className="md:hidden p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors ml-2 cursor-pointer"
            title="Đóng menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

      {/* Navigation List */}
      <nav className="flex-1 px-4 mt-2 overflow-y-auto">
        <ul className="space-y-1.5">
          {visibleMenuItems.map((item) => {
            const isActive =
              item.href === '/admin'
                ? pathname === '/admin'
                : pathname.startsWith(item.href);
            const Icon = item.icon;

            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`flex items-center gap-3.5 px-4 py-3 rounded-xl text-[14px] font-medium transition-all ${
                    isActive
                      ? 'bg-[#2563eb] text-white shadow-md'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  <Icon className="w-5 h-5 flex-shrink-0" />
                  <span>{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* User Info / Profile at bottom */}
      <div className="p-4 border-t border-slate-800/80">
        <div className="flex items-center gap-3 px-2 py-2">
          {/* Avatar */}
          <div className="w-10 h-10 rounded-full bg-[#2563eb] flex items-center justify-center text-white text-base font-bold flex-shrink-0 shadow-sm">
            {currentName ? currentName.trim().charAt(0).toUpperCase() : 'N'}
          </div>

          {/* Name & Role */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-white text-sm font-semibold truncate max-w-[90px]">
                {currentName}
              </span>
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded tracking-wide uppercase border ${
                isReception
                  ? 'bg-amber-950/70 text-amber-400 border-amber-500/20'
                  : 'bg-[#831843]/70 text-[#f472b6] border-[#ec4899]/20'
              }`}>
                {isReception ? 'LỄ TÂN' : currentRole}
              </span>
            </div>
            <p className="text-slate-400 text-xs truncate">
              {isReception ? 'Nhân viên lễ tân' : isAdmin ? 'Quản trị viên' : currentRole}
            </p>
          </div>

          {/* Logout Button */}
          <button
            onClick={handleLogout}
            className="text-slate-400 hover:text-white transition-colors p-1.5 rounded-lg hover:bg-slate-800"
            title="Đăng xuất"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
    </>
  );
}
