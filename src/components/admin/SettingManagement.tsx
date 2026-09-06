'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  Settings,
  Upload,
  Image as ImageIcon,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
  Sparkles,
  ShieldAlert,
} from 'lucide-react';
import { useSystemSettings } from '@/components/SettingsProvider';

export default function SettingManagement() {
  const { logoUrl, setLogoUrl, refreshSettings } = useSystemSettings();

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return () => {
      if (previewUrl && previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        setMessage({ type: 'error', text: 'Vui lòng chọn file hình ảnh (PNG, JPG, SVG, WebP)' });
        return;
      }
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setMessage(null);
    }
  };

  const handleUploadLogo = async () => {
    if (!selectedFile) {
      setMessage({ type: 'error', text: 'Vui lòng chọn file logo để cập nhật' });
      return;
    }

    setIsUploading(true);
    setMessage(null);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);

      const res = await fetch('/api/admin/settings/upload-logo', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Tải lên logo thất bại');
      }

      setLogoUrl(data.logo_url);
      await refreshSettings();
      setSelectedFile(null);
      setPreviewUrl(null);
      if (fileInputRef.current) fileInputRef.current.value = '';

      setMessage({
        type: 'success',
        text: 'Cập nhật logo thành công! Logo mới đã được đồng bộ toàn hệ thống (Public Header, Admin Sidebar, ảnh bài viết).',
      });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Có lỗi xảy ra khi tải lên' });
    } finally {
      setIsUploading(false);
    }
  };

  const handleResetDefault = async () => {
    if (!confirm('Bạn có chắc chắn muốn khôi phục về logo mặc định "logo-nghieng.png"?')) {
      return;
    }

    setIsUploading(true);
    setMessage(null);

    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key: 'system_logo',
          value: '/logo-nghieng.png',
          description: 'Logo Nghiêng Complex mặc định',
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Khôi phục thất bại');
      }

      setLogoUrl('/logo-nghieng.png');
      await refreshSettings();
      setSelectedFile(null);
      setPreviewUrl(null);
      if (fileInputRef.current) fileInputRef.current.value = '';

      setMessage({
        type: 'success',
        text: 'Đã khôi phục logo mặc định Nghiêng Complex thành công!',
      });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Lỗi khi khôi phục logo' });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="p-8 max-w-[1200px] mx-auto min-h-screen bg-slate-50 text-slate-900">
      {/* Breadcrumb & Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 text-xs font-medium text-slate-500 mb-2">
          <span>Trang chủ</span>
          <span>&gt;</span>
          <span className="text-slate-800 font-semibold">Thiết lập hệ thống</span>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-3">
              <Settings className="w-7 h-7 text-blue-600" />
              Thiết lập & Cấu hình hệ thống
            </h1>
            <p className="text-slate-500 text-sm mt-1">
              Quản lý logo thương hiệu tập trung và các cấu hình vận hành toàn bộ hệ thống
            </p>
          </div>
        </div>
      </div>

      {/* Thông báo kết quả */}
      {message && (
        <div
          className={`mb-6 p-4 rounded-xl border flex items-start gap-3 text-sm transition-all animate-in fade-in duration-200 ${
            message.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          {message.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          )}
          <div className="flex-1 font-medium">{message.text}</div>
        </div>
      )}

      {/* Quản lý Logo Section */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mb-8">
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-slate-50 to-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center font-bold">
              <ImageIcon className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Quản lý Logo thương hiệu</h2>
              <p className="text-xs text-slate-500">
                Nguồn logo duy nhất áp dụng cho Header Public, Sidebar Admin và ảnh mặc định sự kiện
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleResetDefault}
            disabled={isUploading}
            className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors disabled:opacity-50"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Khôi phục mặc định
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Cột 1: Logo hiện tại */}
            <div className="p-5 rounded-xl border border-slate-200 bg-slate-50/70 flex flex-col">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Logo hiện tại đang sử dụng
                </span>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-700">
                  Đang hoạt động
                </span>
              </div>
              <div className="flex-1 min-h-[160px] bg-white rounded-xl border border-slate-200/80 p-4 flex items-center justify-center shadow-inner">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={logoUrl || '/logo-nghieng.png'}
                  alt="Logo hiện tại"
                  className="max-h-28 max-w-full object-contain"
                />
              </div>
              <p className="text-[11px] text-slate-400 mt-2 truncate">
                Đường dẫn: <code className="text-slate-600">{logoUrl}</code>
              </p>
            </div>

            {/* Cột 2: Chọn & Xem trước logo mới */}
            <div className="p-5 rounded-xl border border-dashed border-blue-300 bg-blue-50/30 flex flex-col">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-blue-800">
                  Tải lên Logo mới
                </span>
                {previewUrl && (
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-100 text-amber-700">
                    Chờ lưu cập nhật
                  </span>
                )}
              </div>

              <div
                onClick={() => fileInputRef.current?.click()}
                className={`flex-1 min-h-[160px] rounded-xl border-2 border-dashed transition-all flex flex-col items-center justify-center p-4 cursor-pointer text-center ${
                  previewUrl
                    ? 'bg-white border-blue-400 shadow-sm'
                    : 'bg-white/60 border-slate-300 hover:border-blue-500 hover:bg-white'
                }`}
              >
                {previewUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={previewUrl}
                    alt="Logo xem trước"
                    className="max-h-28 max-w-full object-contain"
                  />
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center">
                      <Upload className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-800">
                        Click để chọn file logo từ máy tính
                      </p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Hỗ trợ định dạng: PNG, JPG, SVG, WebP (Tối đa 5MB)
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />

              {selectedFile && (
                <div className="mt-3 flex items-center justify-between text-xs text-slate-600 bg-white p-2.5 rounded-lg border border-slate-200">
                  <span className="font-medium truncate max-w-[200px]">{selectedFile.name}</span>
                  <span className="text-slate-400">
                    {(selectedFile.size / 1024).toFixed(1)} KB
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Xem trước thực tế trên cả 2 nền Sáng & Tối */}
          {previewUrl && (
            <div className="p-4 rounded-xl bg-slate-100/70 border border-slate-200 space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-700 uppercase tracking-wide">
                <Sparkles className="w-4 h-4 text-blue-600" />
                Mô phỏng hiển thị trên các giao diện
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Giao diện sáng - Header Public */}
                <div className="bg-white rounded-xl border border-slate-200 p-4 flex flex-col items-center justify-center shadow-xs">
                  <span className="text-[11px] font-semibold text-slate-500 mb-2">
                    Nền sáng (Header Public)
                  </span>
                  <div className="h-12 flex items-center justify-center">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={previewUrl} alt="Preview light" className="max-h-10 w-auto object-contain" />
                  </div>
                </div>

                {/* Giao diện tối - Sidebar Admin */}
                <div className="bg-[#0f172a] rounded-xl border border-slate-800 p-4 flex flex-col items-center justify-center shadow-xs">
                  <span className="text-[11px] font-semibold text-slate-400 mb-2">
                    Nền tối (Sidebar Admin)
                  </span>
                  <div className="h-12 flex items-center justify-center bg-white px-3 py-1 rounded-lg">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={previewUrl} alt="Preview dark" className="max-h-8 w-auto object-contain" />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Nút hành động */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            {previewUrl && (
              <button
                type="button"
                onClick={() => {
                  setSelectedFile(null);
                  setPreviewUrl(null);
                  if (fileInputRef.current) fileInputRef.current.value = '';
                }}
                disabled={isUploading}
                className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors"
              >
                Hủy xem trước
              </button>
            )}
            <button
              type="button"
              onClick={handleUploadLogo}
              disabled={!selectedFile || isUploading}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-all shadow-sm active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none"
            >
              {isUploading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Đang lưu...</span>
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  <span>Cập nhật Logo</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Ghi chú nguyên tắc quản lý */}
      <div className="p-4 rounded-xl bg-blue-50/50 border border-blue-100 flex items-start gap-3 text-xs text-blue-800">
        <ShieldAlert className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
        <div>
          <p className="font-semibold mb-0.5">Nguyên tắc một nguồn dữ liệu dùng chung (Single Source of Truth)</p>
          <p className="text-blue-700 leading-relaxed">
            Khi Admin tải lên và cập nhật logo tại đây, logo mới sẽ được lưu vào cấu hình hệ thống và tự động phản ánh tức thì trên toàn bộ các trang: Header trang Public, Sidebar Admin, ảnh mặc định các sự kiện/bài viết chưa có ảnh và các khu vực có hiển thị logo chính thức.
          </p>
        </div>
      </div>
    </div>
  );
}
