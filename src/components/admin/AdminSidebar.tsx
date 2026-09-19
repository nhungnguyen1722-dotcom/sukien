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
  GraduationCap,
  Receipt,
  Sparkles,
  ChevronDown,
  Trophy,
} from 'lucide-react';
import SystemLogo from '@/components/SystemLogo';
import { safeDecodeURI } from '@/lib/authUtils';

const menuItems = [
  { label: 'Tổng quan', href: '/admin', icon: LayoutDashboard },
  { label: 'Sự kiện', href: '/admin/su-kien', icon: CalendarDays },
  { label: 'Thành viên', href: '/admin/thanh-vien', icon: Users },
  { label: 'Danh sách khách hàng', href: '/admin/nguoi-moi', icon: UserPlus },
  { label: 'Lễ tân', href: '/admin/le-tan', icon: ConciergeBell },
  { label: 'Mời bạn bè', href: '/admin/moi-ban-be', icon: Ticket },
  { label: 'Nhật ký hợp đồng', href: '/admin/nhat-ky-hop-dong', icon: FileSpreadsheet },
  { label: 'Nhật ký đào tạo', href: '/admin/nhat-ky-dao-tao', icon: GraduationCap },
  { label: 'Nhật ký thu chi', href: '/admin/nhat-ky-thu-chi', icon: Receipt },
  { label: 'Tài khoản & Phân quyền', href: '/admin/tai-khoan', icon: ShieldCheck },
  { label: 'Thiết lập', href: '/admin/thiet-lap', icon: Settings },
];

const luckyWheelSubItems = [
  { label: 'Danh sách vòng quay', href: '/admin/vong-quay' },
  { label: 'Quay vòng trúng thưởng', href: '/admin/vong-quay/quay' },
  { label: 'Lịch sử quay thưởng', href: '/admin/vong-quay/lich-su' },
  { label: 'Hướng dẫn', href: '/admin/vong-quay/huong-dan' },
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

  const isWheelRoute = pathname?.startsWith('/admin/vong-quay');
  const [isWheelMenuOpen, setIsWheelMenuOpen] = useState(isWheelRoute);

  useEffect(() => {
    if (isWheelRoute) {
      setIsWheelMenuOpen(true);
    }
  }, [isWheelRoute]);

  useEffect(() => {
    if (defaultAdminRole) setCurrentRole(safeDecodeURI(defaultAdminRole));
    if (defaultAdminName) setCurrentName(safeDecodeURI(defaultAdminName));
    try {
      const getCookie = (name: string) => {
        const match = document.cookie.match(new RegExp('(^|;\\s*)(' + name + ')=([^;]*)'));
        return match ? safeDecodeURI(match[3]) : null;
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

  // Phân quyền menu (Mục 6 - Hình 6)
  const visibleMenuItems = useMemo(() => {
    if (isAdmin) {
      return menuItems;
    }
    if (isReception) {
      // Tài liệu Mục 6 & Hình 6:
      // Được xem: Tổng quan, Sự kiện, Danh sách khách hàng, Lễ tân, Mời bạn bè
      return menuItems.filter((item) =>
        ['/admin', '/admin/su-kien', '/admin/nguoi-moi', '/admin/le-tan', '/admin/moi-ban-be'].includes(item.href)
      );
    }
    // Các vai trò phi-admin: MC, Nhân sự, Nhân viên, Diễn giả, Khác, Phụng sự, Chốt sự kiện...
    // Được xem: Trang tổng quát, Sự kiện, Mời bạn bè, và Danh sách khách hàng (KHÔNG được xem Lễ tân)
    return menuItems.filter((item) =>
      ['/admin', '/admin/su-kien', '/admin/moi-ban-be', '/admin/nguoi-moi'].includes(item.href)
    );
  }, [isAdmin, isReception]);

  const handleLogout = () => {
    try {
      const cookiesToClear = [
        'user_role',
        'user_name',
        'user_email',
        'user_phone',
        'user_id',
        'user_ref_code',
        'ref_code',
        'user_ref',
      ];
      cookiesToClear.forEach((name) => {
        document.cookie = `${name}=; path=/; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
      });

      const storageToClear = [
        'nghieng_auth_role',
        'nghieng_user_name',
        'nghieng_user_phone',
        'nghieng_user_email',
        'nghieng_user_id',
        'nghieng_user_ref_code',
        'ref_code',
      ];
      storageToClear.forEach((key) => {
        localStorage.removeItem(key);
      });

      window.dispatchEvent(new Event('nghieng-auth-change'));
      window.dispatchEvent(new Event('storage'));
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
              <React.Fragment key={item.href}>
                <li>
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

                {/* Vòng quay sự kiện - Chỉ có tài khoản Admin mới nhìn thấy (Mục 16.1) */}
                {isAdmin && item.href === '/admin/nhat-ky-thu-chi' && (
                  <li className="space-y-1">
                    <button
                      type="button"
                      onClick={() => setIsWheelMenuOpen(!isWheelMenuOpen)}
                      className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-[14px] font-medium transition-all cursor-pointer ${
                        isWheelRoute
                          ? 'bg-slate-800 text-amber-400 font-semibold shadow-xs'
                          : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                      }`}
                    >
                      <div className="flex items-center gap-3.5">
                        <Sparkles
                          className={`w-5 h-5 flex-shrink-0 ${
                            isWheelRoute ? 'text-amber-400' : 'text-slate-400'
                          }`}
                        />
                        <span>Vòng quay sự kiện</span>
                      </div>
                      <ChevronDown
                        className={`w-4 h-4 transition-transform duration-200 ${
                          isWheelMenuOpen ? 'rotate-180 text-white' : 'text-slate-500'
                        }`}
                      />
                    </button>

                    {isWheelMenuOpen && (
                      <ul className="pl-5 space-y-1 pt-1 pb-1 animate-in fade-in slide-in-from-top-1 duration-150">
                        {luckyWheelSubItems.map((sub) => {
                          const isSubActive = pathname === sub.href;
                          return (
                            <li key={sub.href}>
                              <Link
                                href={sub.href}
                                className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                                  isSubActive
                                    ? 'bg-[#2563eb] text-white shadow-xs'
                                    : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
                                }`}
                              >
                                <span
                                  className={`w-1.5 h-1.5 rounded-full ${
                                    isSubActive ? 'bg-white' : 'bg-slate-500'
                                  }`}
                                />
                                <span>{sub.label}</span>
                              </Link>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </li>
                )}
              </React.Fragment>
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

          {/* Name & Role (Đã xóa khung đỏ theo Hình 2.2 Mục 2) */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center">
              <span className="text-white text-sm font-semibold truncate max-w-[140px]" title={currentName}>
                {currentName}
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
