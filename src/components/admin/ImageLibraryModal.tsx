'use client';

import React, { useState, useEffect } from 'react';
import { X, Upload, Check, Image as LucideImage, RefreshCw } from 'lucide-react';

interface ImageItem {
  url: string;
  name: string;
  type: string;
}

interface ImageLibraryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectImage: (imageUrl: string) => void;
}

const DEFAULT_IMAGES: ImageItem[] = [
  { url: '/events/event-1.jpg', name: 'event-1.jpg', type: 'Thư viện sự kiện' },
  { url: '/events/event-2.jpg', name: 'event-2.jpg', type: 'Thư viện sự kiện' },
  { url: '/events/event-3.jpg', name: 'event-3.jpg', type: 'Thư viện sự kiện' },
  { url: '/events/event-4.jpg', name: 'event-4.jpg', type: 'Thư viện sự kiện' },
  { url: '/events/event-5.jpg', name: 'event-5.jpg', type: 'Thư viện sự kiện' },
  { url: '/events/event-6.jpg', name: 'event-6.jpg', type: 'Thư viện sự kiện' },
  { url: '/events/event-7.jpg', name: 'event-7.jpg', type: 'Thư viện sự kiện' },
  { url: '/events/event-8.jpg', name: 'event-8.jpg', type: 'Thư viện sự kiện' },
  { url: '/events/hero-banner.jpg', name: 'hero-banner.jpg', type: 'Thư viện sự kiện' },
  { url: '/events/community.png', name: 'community.png', type: 'Thư viện sự kiện' },
  { url: '/events/speaker-hung.jpg', name: 'speaker-hung.jpg', type: 'Thư viện sự kiện' },
];

export default function ImageLibraryModal({
  isOpen,
  onClose,
  onSelectImage,
}: ImageLibraryModalProps) {
  const [images, setImages] = useState<ImageItem[]>(DEFAULT_IMAGES);
  const [selectedUrl, setSelectedUrl] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'all' | 'events' | 'uploads'>('all');
  const [isUploading, setIsUploading] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const fetchImages = async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/admin/media');
      const data = await res.json();
      if (data && data.success && Array.isArray(data.images) && data.images.length > 0) {
        setImages(data.images);
      }
    } catch {
      // fallback to DEFAULT_IMAGES
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchImages();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      setIsUploading(true);
      const res = await fetch('/api/admin/upload', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (data && data.url) {
        const newImg: ImageItem = {
          url: data.url,
          name: data.filename || file.name,
          type: 'Đã tải lên',
        };
        setImages((prev) => [newImg, ...prev]);
        setSelectedUrl(data.url);
      } else {
        alert(data.error || 'Lỗi tải ảnh lên máy chủ');
      }
    } catch {
      alert('Không thể kết nối đến máy chủ để tải ảnh');
    } finally {
      setIsUploading(false);
    }
  };

  const filteredImages = images.filter((img) => {
    if (activeTab === 'events') return img.type === 'Thư viện sự kiện';
    if (activeTab === 'uploads') return img.type === 'Đã tải lên';
    return true;
  });

  const handleConfirm = () => {
    if (!selectedUrl) return;
    onSelectImage(selectedUrl);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl max-w-3xl w-full shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <LucideImage className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800">Thư viện hình ảnh</h3>
              <p className="text-xs text-slate-500">Chọn ảnh có sẵn hoặc tải ảnh mới từ máy tính</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Toolbar & Filter */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-3 border-b border-slate-100 bg-white">
          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl text-xs font-semibold">
            <button
              type="button"
              onClick={() => setActiveTab('all')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                activeTab === 'all'
                  ? 'bg-white text-slate-900 shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Tất cả ({images.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('events')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                activeTab === 'events'
                  ? 'bg-white text-slate-900 shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Thư viện sự kiện
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('uploads')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                activeTab === 'uploads'
                  ? 'bg-white text-slate-900 shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Đã tải lên
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={fetchImages}
              className="p-2 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl transition-colors"
              title="Làm mới"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
            <label className="inline-flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl cursor-pointer shadow-xs transition-colors">
              <Upload className="w-3.5 h-3.5" />
              <span>{isUploading ? 'Đang tải lên...' : 'Tải ảnh từ máy'}</span>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                disabled={isUploading}
                onChange={handleFileUpload}
              />
            </label>
          </div>
        </div>

        {/* Image Grid */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50 min-h-[280px]">
          {filteredImages.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-400">
              <LucideImage className="w-12 h-12 stroke-[1.5] mb-2 opacity-50" />
              <p className="text-sm font-medium">Chưa có hình ảnh nào trong mục này</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3.5">
              {filteredImages.map((img, idx) => {
                const isSelected = selectedUrl === img.url;
                return (
                  <div
                    key={`${img.url}-${idx}`}
                    onClick={() => setSelectedUrl(img.url)}
                    onDoubleClick={() => {
                      setSelectedUrl(img.url);
                      onSelectImage(img.url);
                      onClose();
                    }}
                    className={`group relative rounded-xl overflow-hidden border-2 cursor-pointer transition-all bg-white aspect-[4/3] flex flex-col justify-end ${
                      isSelected
                        ? 'border-blue-600 shadow-md ring-2 ring-blue-500/20'
                        : 'border-slate-200 hover:border-blue-400 hover:shadow-xs'
                    }`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={img.url}
                      alt={img.name}
                      className="absolute inset-0 w-full h-full object-cover transition-transform group-hover:scale-105 duration-300"
                    />

                    {/* Selected badge */}
                    {isSelected && (
                      <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-md animate-in zoom-in-75">
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                      </div>
                    )}

                    {/* Overlay info */}
                    <div className="relative z-10 bg-gradient-to-t from-slate-900/80 via-slate-900/40 to-transparent p-2 text-white">
                      <p className="text-[11px] font-medium truncate">{img.name}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-3.5 border-t border-slate-100 bg-white">
          <div className="text-xs text-slate-500 truncate max-w-sm">
            {selectedUrl ? (
              <span>
                Đang chọn: <strong className="text-slate-800">{selectedUrl}</strong>
              </span>
            ) : (
              <span>Nhấp vào ảnh để chọn hoặc nhấp đúp để chèn ngay</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            >
              Hủy bỏ
            </button>
            <button
              type="button"
              disabled={!selectedUrl}
              onClick={handleConfirm}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-semibold rounded-xl transition-colors cursor-pointer shadow-xs"
            >
              Chèn ảnh vào bài
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
