'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  User,
  Settings,
  Lock,
  Bell,
  LogOut,
  Calendar,
  Users,
  Shield,
  ShieldCheck,
  Clock,
  Pencil,
  Camera,
  Check,
  CheckCircle2,
  Crown,
  Trash2,
  Globe,
  Sun,
  Moon,
  AlertTriangle,
  X,
  ChevronRight,
} from 'lucide-react';

export default function UserAccountSettings() {
  const searchParams = useSearchParams();
  const initialRoleParam = searchParams.get('role');
  const initialTabParam = searchParams.get('tab');

  // Role: 'member' | 'admin'
  const [activeRole, setActiveRole] = useState<'member' | 'admin'>(
    initialRoleParam === 'admin' ? 'admin' : 'member'
  );

  // Active sidebar nav
  const [activeMenu, setActiveMenu] = useState('settings');

  // Member Form States
  const [memberInfo, setMemberInfo] = useState({
    fullName: 'Nguyễn Văn A',
    email: 'nguyenvana@example.com',
    phone: '+84 912 345 678',
    role: 'Thành viên',
    company: 'Công ty ABC',
    position: 'Nhân viên',
    interests: ['Công nghệ', 'Kinh doanh', 'Kết nối'],
  });

  // Admin Form States
  const [adminInfo, setAdminInfo] = useState({
    fullName: 'Nguyễn Văn A',
    email: 'admin@nghieng.com',
    phone: '+84 912 345 678',
    joinedDate: '01/01/2024',
    role: 'Quản trị viên (Admin)',
  });

  // Member Notification Toggles
  const [memberNotifications, setMemberNotifications] = useState({
    newEvent: true,
    news: true,
    community: true,
    reminder: true,
    marketing: false,
  });

  // Admin Notification Toggles
  const [adminNotifications, setAdminNotifications] = useState({
    newEvent: true,
    newRegistration: true,
    userReports: true,
  });

  // Display Settings
  const [themeMode, setThemeMode] = useState<'light' | 'dark'>('light');
  const [language, setLanguage] = useState<'vi' | 'en'>('vi');

  // Edit Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editFullName, setEditFullName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editCompany, setEditCompany] = useState('');
  const [editPosition, setEditPosition] = useState('');

  // Password / 2FA / Login History Modals
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [is2FAModalOpen, setIs2FAModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  // Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  useEffect(() => {
    if (initialRoleParam === 'admin') setActiveRole('admin');
    else if (initialRoleParam === 'member') setActiveRole('member');

    if (initialTabParam === 'security') setIsPasswordModalOpen(true);
  }, [initialRoleParam, initialTabParam]);

  const handleOpenEdit = () => {
    if (activeRole === 'member') {
      setEditFullName(memberInfo.fullName);
      setEditEmail(memberInfo.email);
      setEditPhone(memberInfo.phone);
      setEditCompany(memberInfo.company);
      setEditPosition(memberInfo.position);
    } else {
      setEditFullName(adminInfo.fullName);
      setEditEmail(adminInfo.email);
      setEditPhone(adminInfo.phone);
    }
    setIsEditModalOpen(true);
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (activeRole === 'member') {
      setMemberInfo({
        ...memberInfo,
        fullName: editFullName,
        email: editEmail,
        phone: editPhone,
        company: editCompany,
        position: editPosition,
      });
    } else {
      setAdminInfo({
        ...adminInfo,
        fullName: editFullName,
        email: editEmail,
        phone: editPhone,
      });
    }
    setIsEditModalOpen(false);
    showToast('Cập nhật thông tin tài khoản thành công!');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 bg-slate-900 text-white text-xs font-semibold px-4 py-3 rounded-2xl shadow-xl flex items-center gap-2 animate-in fade-in slide-in-from-top-4 duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Bar Switcher (Member vs Admin View according to image4.png) */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
            <Link href="/" className="hover:text-blue-600">Trang chủ</Link>
            <span>/</span>
            <span className="text-slate-800 font-medium">Cài đặt tài khoản</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Cài đặt tài khoản</h1>
        </div>

        {/* View Switcher Tabs matching image4.png */}
        <div className="flex items-center p-1 bg-slate-100 rounded-2xl border border-slate-200 shadow-inner">
          <button
            type="button"
            onClick={() => setActiveRole('member')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeRole === 'member'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            <span>1. Setting Thành viên (Người dùng thường)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveRole('admin')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeRole === 'admin'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>2. Setting Admin (Quản trị viên)</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* ============================================================ */}
        {/* SIDEBAR BÊN TRÁI (COL 1-4)                                   */}
        {/* ============================================================ */}
        <div className="lg:col-span-4 xl:col-span-3 space-y-4">
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs">
            {/* User Profile Mini Block */}
            {activeRole === 'member' ? (
              <div className="flex items-center gap-3.5 pb-6 border-b border-slate-100">
                <div className="w-12 h-12 rounded-full overflow-hidden bg-slate-100 ring-2 ring-blue-500/20 flex-shrink-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80"
                    alt={memberInfo.fullName}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="min-w-0">
                  <h2 className="text-sm font-bold text-slate-900 truncate">{memberInfo.fullName}</h2>
                  <p className="text-xs text-slate-400 truncate">{memberInfo.email}</p>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3.5 pb-6 border-b border-slate-100">
                <div className="w-12 h-12 rounded-full overflow-hidden bg-slate-100 ring-2 ring-blue-600/30 flex-shrink-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&auto=format&fit=crop&q=80"
                    alt="Admin"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="min-w-0">
                  <h2 className="text-sm font-bold text-slate-900">Admin</h2>
                  <p className="text-xs text-blue-600 font-semibold">Quản trị hệ thống</p>
                </div>
              </div>
            )}

            {/* Sidebar Navigation */}
            <div className="space-y-1 pt-4 text-xs font-semibold text-slate-600">
              <button
                type="button"
                onClick={() => { setActiveMenu('profile'); handleOpenEdit(); }}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all ${
                  activeMenu === 'profile' ? 'bg-blue-50 text-blue-700' : 'hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <User className="w-4 h-4 text-slate-400" />
                <span>Trang cá nhân</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveMenu('settings')}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all ${
                  activeMenu === 'settings' ? 'bg-blue-50 text-blue-700 font-bold' : 'hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <Settings className="w-4 h-4 text-blue-600" />
                <span>Cài đặt tài khoản</span>
              </button>

              {activeRole === 'admin' && (
                <>
                  <Link
                    href="/admin/su-kien"
                    className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl hover:bg-slate-50 hover:text-slate-900 transition-all"
                  >
                    <Calendar className="w-4 h-4 text-slate-400" />
                    <span>Quản lý sự kiện</span>
                  </Link>

                  <Link
                    href="/admin/thanh-vien"
                    className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl hover:bg-slate-50 hover:text-slate-900 transition-all"
                  >
                    <Users className="w-4 h-4 text-slate-400" />
                    <span>Quản lý người dùng</span>
                  </Link>

                  <Link
                    href="/admin/thiet-lap"
                    className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl hover:bg-slate-50 hover:text-slate-900 transition-all"
                  >
                    <Settings className="w-4 h-4 text-slate-400" />
                    <span>Cài đặt hệ thống</span>
                  </Link>
                </>
              )}

              <button
                type="button"
                onClick={() => setIsPasswordModalOpen(true)}
                className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl hover:bg-slate-50 hover:text-slate-900 transition-all text-left"
              >
                <Lock className="w-4 h-4 text-slate-400" />
                <span>Đổi mật khẩu</span>
              </button>

              {activeRole === 'member' && (
                <button
                  type="button"
                  onClick={() => showToast('Bạn có 3 thông báo mới chưa đọc')}
                  className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl hover:bg-slate-50 hover:text-slate-900 transition-all text-left"
                >
                  <div className="flex items-center gap-3">
                    <Bell className="w-4 h-4 text-slate-400" />
                    <span>Thông báo</span>
                  </div>
                  <span className="w-4 h-4 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
                    3
                  </span>
                </button>
              )}

              <div className="pt-2 border-t border-slate-100">
                <Link
                  href="/"
                  className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl hover:bg-rose-50 text-slate-500 hover:text-rose-600 transition-all text-left"
                >
                  <LogOut className="w-4 h-4 text-slate-400" />
                  <span>Đăng xuất</span>
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* ============================================================ */}
        {/* NỘI DUNG CHÍNH (COL 5-12)                                    */}
        {/* ============================================================ */}
        <div className="lg:col-span-8 xl:col-span-9 space-y-6">
          {/* Main Title Block */}
          <div>
            <h2 className="text-xl font-bold text-slate-900">
              {activeRole === 'member' ? 'Cài đặt tài khoản' : 'Cài đặt tài khoản'}
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              {activeRole === 'member'
                ? 'Quản lý thông tin cá nhân và tùy chỉnh tài khoản của bạn.'
                : 'Quản lý thông tin cá nhân, bảo mật và quyền hạn hệ thống.'}
            </p>
          </div>

          {/* ============================================================ */}
          {/* VIEW 1: SETTING TÀI KHOẢN THÀNH VIÊN (NGƯỜI DÙNG THƯỜNG)      */}
          {/* ============================================================ */}
          {activeRole === 'member' && (
            <div className="space-y-6">
              {/* CARD 1: THÔNG TIN CÁ NHÂN */}
              <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200 shadow-xs space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <Users className="w-5 h-5 text-blue-600" />
                    <h3 className="text-sm sm:text-base font-bold text-slate-900">
                      Thông tin cá nhân
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={handleOpenEdit}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-blue-200 text-blue-600 hover:bg-blue-50 text-xs font-semibold transition-all shadow-2xs"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                    <span>Chỉnh sửa</span>
                  </button>
                </div>

                <div className="flex flex-col sm:flex-row items-start gap-6 pt-1">
                  {/* Avatar with Camera Icon */}
                  <div className="relative group flex-shrink-0">
                    <div className="w-20 h-20 rounded-full overflow-hidden bg-slate-100 ring-4 ring-slate-100">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80"
                        alt={memberInfo.fullName}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => showToast('Mở trình tải ảnh đại diện')}
                      className="absolute bottom-0 right-0 w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center ring-2 ring-white shadow-xs hover:bg-blue-700 transition-colors"
                      title="Đổi ảnh đại diện"
                    >
                      <Camera className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* General Info Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-8 flex-1 text-xs">
                    <div>
                      <span className="text-slate-400 block mb-0.5">Họ và tên</span>
                      <span className="text-slate-900 font-bold text-sm">{memberInfo.fullName}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block mb-0.5">Email</span>
                      <span className="text-slate-900 font-medium">{memberInfo.email}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block mb-0.5">Số điện thoại</span>
                      <span className="text-slate-900 font-semibold">{memberInfo.phone}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block mb-0.5">Vai trò</span>
                      <span className="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-100">
                        {memberInfo.role}
                      </span>
                    </div>
                  </div>
                </div>

                <hr className="border-slate-100" />

                {/* Thông tin bổ sung (Đơn vị, Chức vụ, Lĩnh vực quan tâm) */}
                <div>
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-4">
                    Thông tin bổ sung
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-8 text-xs">
                    <div>
                      <span className="text-slate-400 block mb-0.5">Đơn vị công tác</span>
                      <span className="text-slate-800 font-semibold">{memberInfo.company}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block mb-0.5">Chức vụ</span>
                      <span className="text-slate-800 font-semibold">{memberInfo.position}</span>
                    </div>
                    <div className="sm:col-span-2">
                      <span className="text-slate-400 block mb-2">Lĩnh vực quan tâm</span>
                      <div className="flex flex-wrap gap-2">
                        {memberInfo.interests.map((tag) => (
                          <span
                            key={tag}
                            className="px-3 py-1 bg-blue-50 text-blue-700 border border-blue-100 rounded-full text-xs font-medium"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* CARD 2: TÙY CHỌN THÔNG BÁO */}
              <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200 shadow-xs space-y-4">
                <div className="flex items-center gap-2.5">
                  <Bell className="w-5 h-5 text-blue-600" />
                  <div>
                    <h3 className="text-sm sm:text-base font-bold text-slate-900">
                      Tùy chọn thông báo
                    </h3>
                    <p className="text-xs text-slate-400">Chọn cách bạn muốn nhận thông báo từ hệ thống.</p>
                  </div>
                </div>

                <div className="divide-y divide-slate-100 pt-2 text-xs">
                  {[
                    { key: 'newEvent', label: 'Thông báo sự kiện mới' },
                    { key: 'news', label: 'Thông báo tin tức' },
                    { key: 'community', label: 'Thông báo từ cộng đồng' },
                    { key: 'reminder', label: 'Nhắc nhở sự kiện sắp diễn ra' },
                    { key: 'marketing', label: 'Nhận email marketing' },
                  ].map((item) => (
                    <div key={item.key} className="py-3 flex items-center justify-between">
                      <span className="font-semibold text-slate-700">{item.label}</span>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={memberNotifications[item.key as keyof typeof memberNotifications]}
                          onChange={(e) => {
                            setMemberNotifications({
                              ...memberNotifications,
                              [item.key]: e.target.checked,
                            });
                            showToast(`Đã ${e.target.checked ? 'bật' : 'tắt'} ${item.label.toLowerCase()}`);
                          }}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600" />
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              {/* CARD 3: CÀI ĐẶT HIỂN THỊ */}
              <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200 shadow-xs space-y-4">
                <div className="flex items-center gap-2.5">
                  <Sun className="w-5 h-5 text-blue-600" />
                  <div>
                    <h3 className="text-sm sm:text-base font-bold text-slate-900">
                      Cài đặt hiển thị
                    </h3>
                    <p className="text-xs text-slate-400">Tùy chỉnh giao diện và trải nghiệm khi sử dụng hệ thống.</p>
                  </div>
                </div>

                <div className="space-y-4 pt-2 text-xs">
                  {/* Chế độ giao diện */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-2 border-b border-slate-100">
                    <span className="font-semibold text-slate-700 flex items-center gap-2">
                      <Sun className="w-4 h-4 text-slate-400" />
                      Chế độ giao diện
                    </span>
                    <div className="flex items-center gap-4">
                      <label className="inline-flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="themeMode"
                          checked={themeMode === 'light'}
                          onChange={() => { setThemeMode('light'); showToast('Đã chọn chế độ Sáng'); }}
                          className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="font-semibold text-slate-800">Sáng</span>
                      </label>
                      <label className="inline-flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="themeMode"
                          checked={themeMode === 'dark'}
                          onChange={() => { setThemeMode('dark'); showToast('Chế độ Tối đang được kích hoạt'); }}
                          className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="font-medium text-slate-500">Tối</span>
                      </label>
                    </div>
                  </div>

                  {/* Ngôn ngữ */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-2">
                    <span className="font-semibold text-slate-700 flex items-center gap-2">
                      <Globe className="w-4 h-4 text-slate-400" />
                      Ngôn ngữ
                    </span>
                    <select
                      value={language}
                      onChange={(e) => {
                        setLanguage(e.target.value as 'vi' | 'en');
                        showToast(`Đã chuyển ngôn ngữ sang ${e.target.value === 'vi' ? 'Tiếng Việt' : 'English'}`);
                      }}
                      className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="vi">Tiếng Việt</option>
                      <option value="en">English (US)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* CARD 4: XÓA TÀI KHOẢN */}
              <div className="bg-rose-50/40 border border-rose-200 rounded-3xl p-6 sm:p-7 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center flex-shrink-0">
                    <Trash2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Xóa tài khoản</h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Tài khoản của bạn sẽ bị xóa vĩnh viễn và không thể khôi phục.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsDeleteModalOpen(true)}
                  className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs active:scale-95 flex-shrink-0"
                >
                  Xóa tài khoản
                </button>
              </div>
            </div>
          )}

          {/* ============================================================ */}
          {/* VIEW 2: SETTING TÀI KHOẢN ADMIN (QUẢN TRỊ VIÊN)               */}
          {/* ============================================================ */}
          {activeRole === 'admin' && (
            <div className="space-y-6">
              {/* CARD 1: THÔNG TIN CÁ NHÂN ADMIN */}
              <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200 shadow-xs space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <Users className="w-5 h-5 text-blue-600" />
                    <h3 className="text-sm sm:text-base font-bold text-slate-900">
                      Thông tin cá nhân
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={handleOpenEdit}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-blue-200 text-blue-600 hover:bg-blue-50 text-xs font-semibold transition-all shadow-2xs"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                    <span>Chỉnh sửa</span>
                  </button>
                </div>

                <div className="flex flex-col sm:flex-row items-start gap-6 pt-1">
                  {/* Admin Avatar */}
                  <div className="relative group flex-shrink-0">
                    <div className="w-20 h-20 rounded-full overflow-hidden bg-slate-100 ring-4 ring-slate-100">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80"
                        alt="Admin"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => showToast('Mở trình tải ảnh Admin')}
                      className="absolute bottom-0 right-0 w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center ring-2 ring-white shadow-xs hover:bg-blue-700 transition-colors"
                      title="Đổi ảnh đại diện"
                    >
                      <Camera className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Info Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-8 flex-1 text-xs">
                    <div>
                      <span className="text-slate-400 block mb-0.5">Họ và tên</span>
                      <span className="text-slate-900 font-bold text-sm">{adminInfo.fullName}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block mb-0.5">Email</span>
                      <span className="text-slate-900 font-medium">{adminInfo.email}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block mb-0.5">Số điện thoại</span>
                      <span className="text-slate-900 font-semibold">{adminInfo.phone}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block mb-0.5">Ngày tham gia</span>
                      <span className="text-slate-900 font-semibold">{adminInfo.joinedDate}</span>
                    </div>
                    <div className="sm:col-span-2">
                      <span className="text-slate-400 block mb-0.5">Vai trò</span>
                      <span className="inline-block px-3 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-200">
                        {adminInfo.role}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* CARD 2: PHÂN QUYỀN & QUYỀN HẠN */}
              <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200 shadow-xs space-y-4">
                <div className="flex items-center gap-2.5">
                  <Shield className="w-5 h-5 text-blue-600" />
                  <div>
                    <h3 className="text-sm sm:text-base font-bold text-slate-900">
                      Phân quyền & quyền hạn
                    </h3>
                    <p className="text-xs text-slate-400">Quyền hạn của tài khoản trong hệ thống.</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-6 pt-2 items-center">
                  {/* Left 5 Ticks */}
                  <div className="md:col-span-6 space-y-2.5 text-xs font-semibold text-slate-800">
                    {[
                      'Quản lý sự kiện',
                      'Quản lý người dùng',
                      'Cài đặt hệ thống',
                      'Xem báo cáo',
                      'Quản lý nội dung',
                    ].map((perm) => (
                      <div key={perm} className="flex items-center gap-2.5">
                        <div className="w-4.5 h-4.5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center flex-shrink-0">
                          <Check className="w-3 h-3 stroke-[3]" />
                        </div>
                        <span>{perm}</span>
                      </div>
                    ))}
                  </div>

                  {/* Right Crown Banner Box */}
                  <div className="md:col-span-6 bg-gradient-to-br from-blue-50 to-indigo-50/50 rounded-2xl p-5 border border-blue-100/80 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center flex-shrink-0 shadow-sm shadow-blue-500/20">
                      <Crown className="w-6 h-6" />
                    </div>
                    <p className="text-xs font-semibold text-blue-900 leading-relaxed">
                      Tài khoản Admin có toàn quyền truy cập và quản lý hệ thống.
                    </p>
                  </div>
                </div>
              </div>

              {/* CARD 3: THÔNG TIN BẢO MẬT */}
              <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200 shadow-xs space-y-4">
                <div className="flex items-center gap-2.5">
                  <ShieldCheck className="w-5 h-5 text-blue-600" />
                  <div>
                    <h3 className="text-sm sm:text-base font-bold text-slate-900">
                      Thông tin bảo mật
                    </h3>
                    <p className="text-xs text-slate-400">Đảm bảo an toàn cho tài khoản của bạn.</p>
                  </div>
                </div>

                <div className="divide-y divide-slate-100 text-xs font-medium">
                  {/* Đổi mật khẩu */}
                  <div className="py-3.5 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <Lock className="w-4 h-4 text-slate-400" />
                      <span className="font-semibold text-slate-800">Đổi mật khẩu</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsPasswordModalOpen(true)}
                      className="px-3.5 py-1.5 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-semibold transition-colors"
                    >
                      Đổi mật khẩu
                    </button>
                  </div>

                  {/* Xác thực 2 lớp */}
                  <div className="py-3.5 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <Shield className="w-4 h-4 text-slate-400" />
                      <div>
                        <span className="font-semibold text-slate-800">Xác thực 2 lớp (2FA)</span>
                        <span className="text-[11px] text-slate-400 ml-2">(Chưa bật)</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIs2FAModalOpen(true)}
                      className="px-3.5 py-1.5 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-semibold transition-colors"
                    >
                      Bật ngay
                    </button>
                  </div>

                  {/* Lịch sử đăng nhập */}
                  <div className="py-3.5 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <Clock className="w-4 h-4 text-slate-400" />
                      <span className="font-semibold text-slate-800">Lịch sử đăng nhập</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsHistoryModalOpen(true)}
                      className="px-3.5 py-1.5 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-semibold transition-colors"
                    >
                      Xem lịch sử
                    </button>
                  </div>
                </div>
              </div>

              {/* CARD 4: CÀI ĐẶT THÔNG BÁO HỆ THỐNG */}
              <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200 shadow-xs space-y-4">
                <div className="flex items-center gap-2.5">
                  <Bell className="w-5 h-5 text-blue-600" />
                  <div>
                    <h3 className="text-sm sm:text-base font-bold text-slate-900">
                      Cài đặt thông báo hệ thống
                    </h3>
                    <p className="text-xs text-slate-400">Nhận thông báo từ hệ thống và người dùng.</p>
                  </div>
                </div>

                <div className="divide-y divide-slate-100 pt-2 text-xs">
                  {[
                    { key: 'newEvent', label: 'Thông báo sự kiện mới' },
                    { key: 'newRegistration', label: 'Thông báo đăng ký mới' },
                    { key: 'userReports', label: 'Thông báo từ người dùng' },
                  ].map((item) => (
                    <div key={item.key} className="py-3 flex items-center justify-between">
                      <span className="font-semibold text-slate-700">{item.label}</span>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={adminNotifications[item.key as keyof typeof adminNotifications]}
                          onChange={(e) => {
                            setAdminNotifications({
                              ...adminNotifications,
                              [item.key]: e.target.checked,
                            });
                            showToast(`Đã ${e.target.checked ? 'bật' : 'tắt'} ${item.label.toLowerCase()}`);
                          }}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600" />
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              {/* CARD 5: XÓA TÀI KHOẢN ADMIN */}
              <div className="bg-rose-50/40 border border-rose-200 rounded-3xl p-6 sm:p-7 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center flex-shrink-0">
                    <Trash2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Xóa tài khoản</h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Tài khoản Admin chỉ có thể xóa bởi tài khoản cấp cao hơn.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  disabled
                  className="px-5 py-2.5 bg-rose-400/80 text-white rounded-xl text-xs font-bold cursor-not-allowed flex-shrink-0"
                  title="Cần tài khoản Super Admin để thực hiện"
                >
                  Xóa tài khoản
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ============================================================ */}
      {/* MODAL: CHỈNH SỬA THÔNG TIN CÁ NHÂN                          */}
      {/* ============================================================ */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl border border-slate-100 overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">Chỉnh sửa thông tin cá nhân</h3>
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="w-8 h-8 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveProfile} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Họ và tên</label>
                <input
                  type="text"
                  required
                  value={editFullName}
                  onChange={(e) => setEditFullName(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Email</label>
                <input
                  type="email"
                  required
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Số điện thoại</label>
                <input
                  type="tel"
                  required
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {activeRole === 'member' && (
                <>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Đơn vị công tác</label>
                    <input
                      type="text"
                      value={editCompany}
                      onChange={(e) => setEditCompany(e.target.value)}
                      className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Chức vụ</label>
                    <input
                      type="text"
                      value={editPosition}
                      onChange={(e) => setEditPosition(e.target.value)}
                      className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </>
              )}

              <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 font-semibold"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-sm"
                >
                  Lưu thay đổi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL: ĐỔI MẬT KHẨU                                         */}
      {/* ============================================================ */}
      {isPasswordModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl border border-slate-100 overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">Đổi mật khẩu tài khoản</h3>
              <button
                type="button"
                onClick={() => setIsPasswordModalOpen(false)}
                className="w-8 h-8 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                setIsPasswordModalOpen(false);
                showToast('Đã cập nhật mật khẩu mới thành công!');
              }}
              className="p-6 space-y-4 text-xs"
            >
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Mật khẩu hiện tại</label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Mật khẩu mới</label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Xác nhận mật khẩu mới</label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsPasswordModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 font-semibold"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-sm"
                >
                  Cập nhật mật khẩu
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL: XÁC THỰC 2 LỚP (2FA)                                  */}
      {/* ============================================================ */}
      {is2FAModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl border border-slate-100 p-6 text-center space-y-4">
            <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center mx-auto">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Xác thực 2 lớp (2FA)</h3>
              <p className="text-xs text-slate-500 mt-1">
                Bảo vệ tài khoản với mã xác minh gửi qua ứng dụng Google Authenticator hoặc tin nhắn SMS.
              </p>
            </div>
            <div className="p-4 bg-slate-50 rounded-2xl text-xs text-slate-600 border border-slate-200">
              Tính năng bảo mật 2FA đang sẵn sàng để kích hoạt cho tài khoản này.
            </div>
            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIs2FAModalOpen(false)}
                className="flex-1 py-2.5 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600"
              >
                Đóng
              </button>
              <button
                type="button"
                onClick={() => {
                  setIs2FAModalOpen(false);
                  showToast('Đã kích hoạt xác thực 2 lớp thành công!');
                }}
                className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl text-xs font-bold shadow-sm"
              >
                Xác nhận bật
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL: LỊCH SỬ ĐĂNG NHẬP                                     */}
      {/* ============================================================ */}
      {isHistoryModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl border border-slate-100 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">Lịch sử đăng nhập gần đây</h3>
              <button
                type="button"
                onClick={() => setIsHistoryModalOpen(false)}
                className="w-8 h-8 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-6 space-y-3 text-xs">
              {[
                { ip: '192.168.1.102', device: 'Chrome trên Windows (Máy tính hiện tại)', time: 'Vừa xong', status: 'Thành công' },
                { ip: '14.238.12.89', device: 'Safari trên iPhone 15 Pro', time: 'Hôm qua lúc 18:22', status: 'Thành công' },
                { ip: '113.190.23.45', device: 'Chrome trên MacOS', time: '2 ngày trước lúc 09:15', status: 'Thành công' },
              ].map((log, idx) => (
                <div key={idx} className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-slate-800">{log.device}</div>
                    <div className="text-[11px] text-slate-400 mt-0.5">IP: {log.ip} • {log.time}</div>
                  </div>
                  <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">
                    {log.status}
                  </span>
                </div>
              ))}
            </div>
            <div className="p-4 border-t border-slate-100 text-right">
              <button
                type="button"
                onClick={() => setIsHistoryModalOpen(false)}
                className="px-4 py-2 bg-slate-100 text-slate-700 text-xs font-semibold rounded-xl"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL: XÓA TÀI KHOẢN                                         */}
      {/* ============================================================ */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl border border-slate-100 p-6 text-center space-y-4">
            <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Xác nhận xóa tài khoản?</h3>
              <p className="text-xs text-slate-500 mt-1">
                Thao tác này sẽ xóa toàn bộ dữ liệu và không thể khôi phục.
              </p>
            </div>
            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsDeleteModalOpen(false)}
                className="flex-1 py-2.5 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsDeleteModalOpen(false);
                  showToast('Yêu cầu xóa tài khoản đã được tiếp nhận');
                }}
                className="flex-1 py-2.5 bg-rose-600 text-white rounded-xl text-xs font-bold shadow-sm"
              >
                Xóa ngay
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
