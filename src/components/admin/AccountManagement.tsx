'use client';

import { useState, useCallback, useEffect } from 'react';
import { Search, Plus, Shield, X, Check, Lock, User as UserIcon } from 'lucide-react';

export type UserAccount = {
  id: number;
  full_name: string;
  email: string;
  role: string;
  status: string;
  created_at: string;
};

export type Permission = {
  module: string;
  can_view: boolean;
  can_create: boolean;
  can_edit: boolean;
  can_delete: boolean;
};

interface AccountManagementProps {
  initialUsers: UserAccount[];
}

const ALL_MODULES = [
  'Tổng quan',
  'Sự kiện',
  'Thành viên',
  'Người mới',
  'Lễ tân',
  'Mời bạn bè',
  'Tài khoản & Phân quyền',
];

function RoleBadge({ role }: { role: string }) {
  if (role === 'Admin') {
    return (
      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-[#ffe4e6] text-[#e11d48]">
        <Shield className="w-3 h-3" />
        Admin
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-[#dbeafe] text-[#2563eb]">
      <UserIcon className="w-3 h-3" />
      Nhân viên
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  if (status === 'Đang hoạt động') {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-[#dcfce7] text-[#16a34a]">
        <Lock className="w-3 h-3 text-[#16a34a]" />
        Đang hoạt động
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
      {status}
    </span>
  );
}

// ============================================================
// Modal: Thêm tài khoản
// ============================================================
function AddUserModal({
  isOpen,
  onClose,
  onSubmit,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: { full_name: string; email: string; role: string }) => Promise<void>;
}) {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('Nhân viên');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);
    try {
      await onSubmit({ full_name: fullName, email, role });
      setFullName('');
      setEmail('');
      setRole('Nhân viên');
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Có lỗi xảy ra khi tạo tài khoản');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl border border-gray-100 overflow-hidden animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/50">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Thêm tài khoản</h2>
            <p className="text-xs text-gray-500 mt-0.5">Tạo tài khoản quản trị hoặc nhân viên mới</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-2.5 rounded-xl">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
              Họ và tên <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white shadow-xs"
              placeholder="Ví dụ: Vũ Thị Cúc"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
              Email đăng nhập <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white shadow-xs"
              placeholder="Ví dụ: vuthicuc@gmail.com"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
              Vai trò
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white shadow-xs"
            >
              <option value="Admin">Admin</option>
              <option value="Nhân viên">Nhân viên</option>
            </select>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 px-4 py-2.5 bg-[#2563eb] hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition-colors disabled:opacity-60 shadow-sm"
            >
              {isSubmitting ? 'Đang tạo...' : 'Tạo tài khoản'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ============================================================
// Modal: Phân quyền
// ============================================================
function PermissionsModal({
  isOpen,
  onClose,
  user,
}: {
  isOpen: boolean;
  onClose: () => void;
  user: UserAccount | null;
}) {
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const fetchPermissions = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const res = await fetch(`/api/admin/users/${user.id}/permissions`);
      const data = await res.json();
      const existing: Permission[] = data.permissions || [];

      // Map across ALL_MODULES
      const merged = ALL_MODULES.map((mod) => {
        const found = existing.find((p: Permission) => p.module === mod);
        // Default admin to full permissions if none exists
        const isUserAdmin = user.role === 'Admin';
        return (
          found || {
            module: mod,
            can_view: isUserAdmin,
            can_create: isUserAdmin,
            can_edit: isUserAdmin,
            can_delete: isUserAdmin,
          }
        );
      });
      setPermissions(merged);
    } catch {
      setPermissions(
        ALL_MODULES.map((mod) => ({
          module: mod,
          can_view: false,
          can_create: false,
          can_edit: false,
          can_delete: false,
        }))
      );
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (isOpen && user) {
      fetchPermissions();
      setSaved(false);
    }
  }, [isOpen, user, fetchPermissions]);

  if (!isOpen || !user) return null;

  const togglePermission = (moduleIndex: number, field: keyof Permission) => {
    if (field === 'module') return;
    setPermissions((prev) =>
      prev.map((p, i) => (i === moduleIndex ? { ...p, [field]: !p[field] } : p))
    );
    setSaved(false);
  };

  const toggleAllForModule = (moduleIndex: number) => {
    setPermissions((prev) =>
      prev.map((p, i) => {
        if (i !== moduleIndex) return p;
        const allTrue = p.can_view && p.can_create && p.can_edit && p.can_delete;
        return {
          ...p,
          can_view: !allTrue,
          can_create: !allTrue,
          can_edit: !allTrue,
          can_delete: !allTrue,
        };
      })
    );
    setSaved(false);
  };

  const handleGrantAll = () => {
    setPermissions((prev) =>
      prev.map((p) => ({
        ...p,
        can_view: true,
        can_create: true,
        can_edit: true,
        can_delete: true,
      }))
    );
    setSaved(false);
  };

  const handleRevokeAll = () => {
    setPermissions((prev) =>
      prev.map((p) => ({
        ...p,
        can_view: false,
        can_create: false,
        can_edit: false,
        can_delete: false,
      }))
    );
    setSaved(false);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const res = await fetch(`/api/admin/users/${user.id}/permissions`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ permissions }),
      });
      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 2500);
      } else {
        alert('Lỗi khi lưu phân quyền');
      }
    } catch {
      alert('Lỗi khi lưu phân quyền');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl border border-gray-100 max-h-[90vh] overflow-hidden flex flex-col animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/50">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-gray-900">Phân quyền tài khoản</h2>
              <RoleBadge role={user.role} />
            </div>
            <p className="text-xs text-gray-500 mt-1">
              <span className="font-semibold text-gray-700">{user.full_name}</span> — {user.email}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick Actions */}
        <div className="px-6 py-2.5 bg-blue-50/50 border-b border-blue-100/60 flex items-center justify-between text-xs">
          <span className="text-blue-900 font-medium">Tùy chọn nhanh:</span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleGrantAll}
              className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors cursor-pointer"
            >
              Chọn tất cả
            </button>
            <button
              type="button"
              onClick={handleRevokeAll}
              className="px-2.5 py-1 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg font-medium transition-colors cursor-pointer"
            >
              Bỏ chọn tất cả
            </button>
          </div>
        </div>

        {/* Content Table */}
        <div className="overflow-auto flex-1 p-6">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12 gap-2">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent"></div>
              <span className="text-xs text-gray-400">Đang tải phân quyền...</span>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-gray-500 text-xs uppercase tracking-wider">
                  <th className="text-left py-3 px-3 font-semibold">Tên Module</th>
                  <th className="text-center py-3 px-3 font-semibold">Xem</th>
                  <th className="text-center py-3 px-3 font-semibold">Tạo</th>
                  <th className="text-center py-3 px-3 font-semibold">Sửa</th>
                  <th className="text-center py-3 px-3 font-semibold">Xóa</th>
                  <th className="text-center py-3 px-3 font-semibold">Tất cả</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {permissions.map((perm, idx) => {
                  const allChecked =
                    perm.can_view && perm.can_create && perm.can_edit && perm.can_delete;
                  return (
                    <tr key={perm.module} className="hover:bg-blue-50/30 transition-colors">
                      <td className="py-3 px-3 font-medium text-gray-800 flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                        {perm.module}
                      </td>
                      <td className="text-center py-3 px-3">
                        <input
                          type="checkbox"
                          checked={perm.can_view}
                          onChange={() => togglePermission(idx, 'can_view')}
                          className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500 cursor-pointer"
                        />
                      </td>
                      <td className="text-center py-3 px-3">
                        <input
                          type="checkbox"
                          checked={perm.can_create}
                          onChange={() => togglePermission(idx, 'can_create')}
                          className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500 cursor-pointer"
                        />
                      </td>
                      <td className="text-center py-3 px-3">
                        <input
                          type="checkbox"
                          checked={perm.can_edit}
                          onChange={() => togglePermission(idx, 'can_edit')}
                          className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500 cursor-pointer"
                        />
                      </td>
                      <td className="text-center py-3 px-3">
                        <input
                          type="checkbox"
                          checked={perm.can_delete}
                          onChange={() => togglePermission(idx, 'can_delete')}
                          className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500 cursor-pointer"
                        />
                      </td>
                      <td className="text-center py-3 px-3">
                        <input
                          type="checkbox"
                          checked={allChecked}
                          onChange={() => toggleAllForModule(idx)}
                          className="w-4 h-4 text-green-600 rounded border-gray-300 focus:ring-green-500 cursor-pointer"
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 bg-gray-50/50">
          <div>
            {saved && (
              <span className="inline-flex items-center gap-1.5 text-sm text-green-600 font-semibold animate-in fade-in duration-200">
                <Check className="w-4 h-4" /> Đã lưu phân quyền thành công!
              </span>
            )}
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors"
            >
              Đóng
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="px-5 py-2 bg-[#2563eb] hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition-colors disabled:opacity-60 shadow-sm"
            >
              {isSaving ? 'Đang lưu...' : 'Lưu phân quyền'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// Main Component
// ============================================================
export default function AccountManagement({ initialUsers }: AccountManagementProps) {
  const [users, setUsers] = useState<UserAccount[]>(initialUsers);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showPermModal, setShowPermModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserAccount | null>(null);

  const filteredUsers = users.filter(
    (user) =>
      user.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAddUser = async (data: { full_name: string; email: string; role: string }) => {
    const res = await fetch('/api/admin/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error || 'Lỗi khi tạo tài khoản');
    setUsers((prev) => [...prev, result.user]);
  };

  const handleOpenPermissions = (user: UserAccount) => {
    setSelectedUser(user);
    setShowPermModal(true);
  };

  return (
    <div className="p-8 max-w-[1400px] mx-auto">
      {/* Page Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-[22px] font-bold text-gray-900 tracking-tight">
            Tài khoản Admin & Phân quyền
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Quản lý tài khoản hệ thống và phân quyền theo module
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-[#2563eb] hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition-all shadow-sm shadow-blue-500/20 active:scale-[0.98]"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          Thêm tài khoản
        </button>
      </div>

      {/* Search Bar Container */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-xs p-3 mb-6">
        <div className="relative max-w-md">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-gray-400" />
          </div>
          <input
            type="text"
            className="block w-full pl-10 pr-3.5 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none bg-transparent"
            placeholder="Tìm theo tên hoặc email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Account Table Card */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-xs overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 text-gray-500 text-xs font-semibold">
              <th className="text-left py-4 px-6 w-16">STT</th>
              <th className="text-left py-4 px-6">Họ và tên</th>
              <th className="text-left py-4 px-6">Tên đăng nhập (Email)</th>
              <th className="text-left py-4 px-6">Vai trò</th>
              <th className="text-left py-4 px-6">Trạng thái</th>
              <th className="text-right py-4 px-6">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filteredUsers.map((user, index) => (
              <tr key={user.id} className="hover:bg-slate-50/50 transition-colors">
                <td className="py-4 px-6 text-gray-400 font-medium">{index + 1}</td>
                <td className="py-4 px-6 font-semibold text-gray-900">{user.full_name}</td>
                <td className="py-4 px-6 text-gray-600">{user.email}</td>
                <td className="py-4 px-6">
                  <RoleBadge role={user.role} />
                </td>
                <td className="py-4 px-6">
                  <StatusBadge status={user.status} />
                </td>
                <td className="py-4 px-6 text-right">
                  <button
                    onClick={() => handleOpenPermissions(user)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 border border-gray-200 rounded-xl text-xs font-medium text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-colors active:scale-[0.98]"
                  >
                    <Shield className="w-3.5 h-3.5 text-gray-600" />
                    Phân quyền
                  </button>
                </td>
              </tr>
            ))}

            {filteredUsers.length === 0 && (
              <tr>
                <td colSpan={6} className="py-16 text-center text-gray-400">
                  Không tìm thấy tài khoản nào phù hợp.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modals */}
      <AddUserModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSubmit={handleAddUser}
      />

      <PermissionsModal
        isOpen={showPermModal}
        onClose={() => {
          setShowPermModal(false);
          setSelectedUser(null);
        }}
        user={selectedUser}
      />
    </div>
  );
}
