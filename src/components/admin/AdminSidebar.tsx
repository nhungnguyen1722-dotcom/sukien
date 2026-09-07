'use client';

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
} from 'lucide-react';
import SystemLogo from '@/components/SystemLogo';

const menuItems = [
  { label: 'Tổng quan', href: '/admin', icon: LayoutDashboard },
  { label: 'Sự kiện', href: '/admin/su-kien', icon: CalendarDays },
  { label: 'Thành viên', href: '/admin/thanh-vien', icon: Users },
  { label: 'Người mời', href: '/admin/nguoi-moi', icon: UserPlus },
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
  adminName = 'Nhung Nguyễn',
  adminRole = 'ADMIN',
}: AdminSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = () => {
    router.push('/login');
  };

  return (
    <aside className="w-[260px] min-h-screen bg-[#0f172a] flex flex-col fixed left-0 top-0 bottom-0 z-50 text-white select-none">
      {/* Brand Header */}
      <div className="flex items-center justify-center px-4 py-4 border-b border-slate-800/60">
        <Link href="/admin" className="flex items-center justify-center w-full group">
          <div className="bg-white px-4 py-2.5 rounded-2xl shadow-md flex items-center justify-center w-full max-w-[210px] hover:shadow-lg transition-all">
            <SystemLogo className="h-10 w-auto max-h-10 object-contain transition-transform group-hover:scale-105 duration-200" />
          </div>
        </Link>
      </div>

      {/* Navigation List */}
      <nav className="flex-1 px-4 mt-2 overflow-y-auto">
        <ul className="space-y-1.5">
          {menuItems.map((item) => {
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
            {adminName ? adminName.trim().charAt(0).toUpperCase() : 'N'}
          </div>

          {/* Name & Role */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-white text-sm font-semibold truncate max-w-[90px]">
                {adminName}
              </span>
              <span className="bg-[#831843]/70 text-[#f472b6] text-[10px] font-bold px-1.5 py-0.5 rounded tracking-wide uppercase border border-[#ec4899]/20">
                {adminRole}
              </span>
            </div>
            <p className="text-slate-400 text-xs truncate">Quản trị viên</p>
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
  );
}
