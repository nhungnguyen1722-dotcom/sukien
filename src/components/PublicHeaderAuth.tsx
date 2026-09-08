'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  LogIn,
  Bell,
  Search,
  User,
  Settings,
  Lock,
  LogOut,
  ChevronDown,
  ChevronRight,
  ShieldCheck,
  Calendar,
  Users,
  Check,
} from 'lucide-react';

export type AuthRole = 'guest' | 'member' | 'admin';

interface PublicHeaderAuthProps {
  initialRole?: AuthRole;
}

export default function PublicHeaderAuth({ initialRole = 'guest' }: PublicHeaderAuthProps) {
  const router = useRouter();
  const [role, setRole] = useState<AuthRole>(initialRole);
  const [userName, setUserName] = useState<string>('Thành viên');
  const [userEmail, setUserEmail] = useState<string>('member@example.com');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Sync role and user info from cookies or localStorage
  useEffect(() => {
    try {
      // Check document.cookie first
      const getCookie = (name: string) => {
        const match = document.cookie.match(new RegExp('(^|;\\s*)(' + name + ')=([^;]*)'));
        return match ? decodeURIComponent(match[3]) : null;
      };

      const cRole = getCookie('user_role');
      const cName = getCookie('user_name');
      const cEmail = getCookie('user_email');

      if (cName) setUserName(cName);
      if (cEmail) setUserEmail(cEmail);

      if (cRole) {
        const lower = cRole.toLowerCase();
        if (lower.includes('admin') || lower.includes('quản trị')) {
          setRole('admin');
        } else if (lower.includes('lễ tân')) {
          setRole('admin'); // or staff
        } else {
          setRole('member');
        }
      } else {
        const savedRole = localStorage.getItem('nghieng_auth_role') as AuthRole | null;
        if (savedRole && ['guest', 'member', 'admin'].includes(savedRole)) {
          setRole(savedRole);
        } else {
          setRole('guest');
        }
      }
    } catch {
      // Ignore
    }
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    setRole('guest');
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
    setIsDropdownOpen(false);
    router.push('/');
    router.refresh();
  };

  return (
    <div className="flex items-center gap-3" ref={dropdownRef}>
      {/* 1. Nút Search */}
      <button
        type="button"
        className="w-9 h-9 rounded-full flex items-center justify-center text-gray-500 hover:text-gray-800 hover:bg-gray-100 transition-colors"
        title="Tìm kiếm"
      >
        <Search className="w-4.5 h-4.5" />
      </button>

      {/* 2. Chuông thông báo (Bell with badge 3) */}
      <div className="relative">
        <button
          type="button"
          onClick={() => {
            if (role === 'guest') router.push('/login');
            else router.push(`/cai-dat?role=${role}&tab=notifications`);
          }}
          className="w-9 h-9 rounded-full flex items-center justify-center text-gray-500 hover:text-gray-800 hover:bg-gray-100 transition-colors"
          title="Thông báo"
        >
          <Bell className="w-4.5 h-4.5" />
        </button>
        <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white rounded-full text-[10px] font-bold flex items-center justify-center ring-2 ring-white select-none pointer-events-none">
          3
        </span>
      </div>

      {/* 3. TRẠNG THÁI GÓC PHẢI */}

      {/* TRẠNG THÁI 1: CHƯA ĐĂNG NHẬP */}
      {role === 'guest' && (
        <div className="flex items-center gap-2">
          <Link
            href="/login"
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#2563eb] hover:bg-[#1d4ed8] text-white text-sm font-semibold rounded-xl transition-all shadow-sm shadow-blue-500/20 active:scale-95"
          >
            <LogIn className="w-4 h-4" />
            <span>Đăng nhập</span>
          </Link>
        </div>
      )}

      {/* TRẠNG THÁI 2: THÀNH VIÊN ĐÃ ĐĂNG KÝ (TÀI KHOẢN THƯỜNG) */}
      {role === 'member' && (
        <div className="relative">
          <button
            type="button"
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="flex items-center gap-1.5 p-1 rounded-full hover:bg-slate-100 transition-colors group"
          >
            <div className="relative w-8 h-8 rounded-full overflow-hidden ring-2 ring-blue-500/30">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80"
                alt={userName}
                className="w-full h-full object-cover"
              />
              <span className="absolute bottom-0 right-0 w-2 h-2 bg-emerald-500 rounded-full ring-1 ring-white" />
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-slate-500 group-hover:text-slate-800 transition-transform" />
          </button>

          {/* Dropdown tài khoản thành viên */}
          {isDropdownOpen && (
            <div className="absolute right-0 mt-2.5 w-64 bg-white rounded-2xl shadow-xl border border-slate-100 p-2 z-50 animate-in fade-in zoom-in-95 duration-150">
              {/* Header profile row */}
              <Link
                href="/cai-dat?role=member"
                onClick={() => setIsDropdownOpen(false)}
                className="flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-50 transition-colors border-b border-slate-100 mb-1"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-9 h-9 rounded-full overflow-hidden bg-slate-100 flex-shrink-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80"
                      alt="Avatar"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-slate-900 truncate">{userName}</div>
                    <div className="text-[11px] text-slate-400 truncate">{userEmail}</div>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </Link>

              {/* Menu items */}
              <div className="space-y-0.5 text-xs font-medium text-slate-700">
                <Link
                  href="/cai-dat?role=member&tab=profile"
                  onClick={() => setIsDropdownOpen(false)}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-slate-50 hover:text-blue-600 transition-colors"
                >
                  <User className="w-4 h-4 text-slate-400" />
                  <span>Trang cá nhân</span>
                </Link>

                <Link
                  href="/cai-dat?role=member"
                  onClick={() => setIsDropdownOpen(false)}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-blue-50/80 text-blue-700 font-semibold transition-colors"
                >
                  <Settings className="w-4 h-4 text-blue-600" />
                  <span>Cài đặt tài khoản</span>
                </Link>

                <Link
                  href="/cai-dat?role=member&tab=security"
                  onClick={() => setIsDropdownOpen(false)}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-slate-50 hover:text-blue-600 transition-colors"
                >
                  <Lock className="w-4 h-4 text-slate-400" />
                  <span>Đổi mật khẩu</span>
                </Link>

                <Link
                  href="/cai-dat?role=member&tab=notifications"
                  onClick={() => setIsDropdownOpen(false)}
                  className="flex items-center justify-between px-3 py-2 rounded-xl hover:bg-slate-50 hover:text-blue-600 transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <Bell className="w-4 h-4 text-slate-400" />
                    <span>Thông báo</span>
                  </div>
                  <span className="w-4 h-4 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
                    3
                  </span>
                </Link>

                <div className="border-t border-slate-100 my-1" />

                <button
                  type="button"
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-rose-50 text-slate-600 hover:text-rose-600 transition-colors text-left"
                >
                  <LogOut className="w-4 h-4 text-slate-400" />
                  <span>Đăng xuất</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TRẠNG THÁI 3: ADMIN ĐÃ ĐĂNG NHẬP (TÀI KHOẢN QUẢN TRỊ) */}
      {role === 'admin' && (
        <div className="relative">
          <button
            type="button"
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="flex items-center gap-1.5 p-1 rounded-full hover:bg-slate-100 transition-colors group"
          >
            <div className="relative w-8 h-8 rounded-full overflow-hidden ring-2 ring-blue-600/40">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80"
                alt="Admin"
                className="w-full h-full object-cover"
              />
              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-blue-600 rounded-full ring-1 ring-white flex items-center justify-center text-[7px] text-white">
                ★
              </span>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-slate-500 group-hover:text-slate-800 transition-transform" />
          </button>

          {/* Dropdown tài khoản admin */}
          {isDropdownOpen && (
            <div className="absolute right-0 mt-2.5 w-64 bg-white rounded-2xl shadow-xl border border-slate-100 p-2 z-50 animate-in fade-in zoom-in-95 duration-150">
              {/* Header admin row */}
              <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-blue-50/60 border border-blue-100/60 mb-1">
                <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center flex-shrink-0 shadow-xs">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-bold text-slate-900">{userName || 'Admin'}</div>
                  <div className="text-[11px] text-blue-700 font-medium">Quản trị hệ thống</div>
                </div>
              </div>

              {/* Menu items */}
              <div className="space-y-0.5 text-xs font-medium text-slate-700">
                <Link
                  href="/admin/su-kien"
                  onClick={() => setIsDropdownOpen(false)}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-slate-50 hover:text-blue-600 transition-colors"
                >
                  <Calendar className="w-4 h-4 text-slate-400" />
                  <span>Quản lý sự kiện</span>
                </Link>

                <Link
                  href="/admin/thanh-vien"
                  onClick={() => setIsDropdownOpen(false)}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-slate-50 hover:text-blue-600 transition-colors"
                >
                  <Users className="w-4 h-4 text-slate-400" />
                  <span>Quản lý người dùng</span>
                </Link>

                <Link
                  href="/admin/thiet-lap"
                  onClick={() => setIsDropdownOpen(false)}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-slate-50 hover:text-blue-600 transition-colors"
                >
                  <Settings className="w-4 h-4 text-slate-400" />
                  <span>Cài đặt hệ thống</span>
                </Link>

                <Link
                  href="/cai-dat?role=admin"
                  onClick={() => setIsDropdownOpen(false)}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-slate-50 hover:text-blue-600 transition-colors"
                >
                  <User className="w-4 h-4 text-slate-400" />
                  <span>Cài đặt tài khoản Admin</span>
                </Link>

                <Link
                  href="/cai-dat?role=admin&tab=security"
                  onClick={() => setIsDropdownOpen(false)}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-slate-50 hover:text-blue-600 transition-colors"
                >
                  <Lock className="w-4 h-4 text-slate-400" />
                  <span>Đổi mật khẩu</span>
                </Link>

                <div className="border-t border-slate-100 my-1" />

                <button
                  type="button"
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-rose-50 text-slate-600 hover:text-rose-600 transition-colors text-left"
                >
                  <LogOut className="w-4 h-4 text-slate-400" />
                  <span>Đăng xuất</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
