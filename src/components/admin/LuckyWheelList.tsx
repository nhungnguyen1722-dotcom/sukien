'use client';

import React, { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import {
  Sparkles,
  Plus,
  Eye,
  Edit2,
  Trash2,
  CheckCircle2,
  X,
  Play,
  Calendar,
  Layers,
  ChevronRight,
  Gift,
  HelpCircle,
  History,
} from 'lucide-react';

export interface WheelSlice {
  id: number;
  label: string;
  color: string;
  type: string;
  weight: number;
}

export interface LuckyWheel {
  id: number;
  name: string;
  description: string;
  reward_text: string;
  quantity: number;
  event_name?: string;
  spins_count: number;
  status: string;
  is_active: boolean;
  slices_json?: WheelSlice[] | string;
  core_color?: string;
  arrow_color?: string;
  border_color?: string;
}

interface LuckyWheelListProps {
  initialWheels: LuckyWheel[];
  events: Array<{ id: number; name: string }>;
}

export default function LuckyWheelList({ initialWheels, events }: LuckyWheelListProps) {
  const [wheels, setWheels] = useState<LuckyWheel[]>(initialWheels);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedViewWheel, setSelectedViewWheel] = useState<LuckyWheel | null>(null);
  const [activeWheelId, setActiveWheelId] = useState<number>(() => {
    const act = initialWheels.find((w) => w.is_active);
    return act ? act.id : initialWheels[0]?.id || 1;
  });

  // New wheel modal state
  const [wheelName, setWheelName] = useState('Vòng quay may mắn');
  const [rewardText, setRewardText] = useState('Voucher 500.000đ');
  const [description, setDescription] = useState('Vòng quay dành cho khách hàng tham dự');
  const [quantity, setQuantity] = useState(1);
  const [status, setStatus] = useState('Sắp diễn ra');
  const [selectedEventName, setSelectedEventName] = useState('— Không gắn —');
  const [coreColor, setCoreColor] = useState('#1e3a8a');
  const [arrowColor, setArrowColor] = useState('#f59e0b');
  const [borderColor, setBorderColor] = useState('#1e3a8a');

  const [slices, setSlices] = useState<WheelSlice[]>([
    { id: 1, label: 'Voucher 1.000.000đ', color: '#1e40af', type: 'Voucher', weight: 1 },
    { id: 2, label: '500 Điểm thưởng', color: '#047857', type: 'Điểm', weight: 2 },
    { id: 3, label: 'Voucher 500.000đ', color: '#b45309', type: 'Voucher', weight: 2 },
    { id: 4, label: '100 Điểm thưởng', color: '#6d28d9', type: 'Điểm', weight: 3 },
    { id: 5, label: 'Chúc bạn may mắn', color: '#475569', type: 'Không trúng', weight: 4 },
    { id: 6, label: 'Voucher 200.000đ', color: '#be123c', type: 'Voucher', weight: 2 },
  ]);

  const handleSetActive = async (wheelId: number) => {
    try {
      setActiveWheelId(wheelId);
      await fetch('/api/admin/lucky-wheel', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'set_active', wheelId }),
      });
      setWheels(
        wheels.map((w) => ({
          ...w,
          is_active: w.id === wheelId,
          status: w.id === wheelId ? 'Đang quay' : w.status === 'Đang quay' ? 'Sắp diễn ra' : w.status,
        }))
      );
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteWheel = async (wheelId: number) => {
    if (!confirm('Bạn có chắc chắn muốn xóa vòng quay này?')) return;
    try {
      await fetch(`/api/admin/lucky-wheel?id=${wheelId}`, { method: 'DELETE' });
      setWheels(wheels.filter((w) => w.id !== wheelId));
    } catch (e) {
      alert('Lỗi khi xóa vòng quay');
    }
  };

  const handleAddSlice = () => {
    const palette = ['#1e40af', '#047857', '#b45309', '#6d28d9', '#be123c', '#0284c7', '#475569'];
    const newId = slices.length > 0 ? Math.max(...slices.map((s) => s.id)) + 1 : 1;
    const color = palette[(slices.length) % palette.length];
    setSlices([...slices, { id: newId, label: 'Ô mới', color, type: 'Quà tặng', weight: 1 }]);
  };

  const handleRemoveSlice = (id: number) => {
    if (slices.length <= 2) {
      alert('Vòng quay cần tối thiểu 2 ô!');
      return;
    }
    setSlices(slices.filter((s) => s.id !== id));
  };

  const handleSaveWheel = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/admin/lucky-wheel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create_wheel',
          name: wheelName,
          description,
          rewardText,
          quantity,
          eventName: selectedEventName === '— Không gắn —' ? null : selectedEventName,
          status,
          slices,
          coreColor,
          arrowColor,
          borderColor,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message);

      setWheels([data.wheel, ...wheels]);
      setIsAddModalOpen(false);
      alert('Tạo vòng quay thành công!');
    } catch (err: any) {
      alert(err.message || 'Lỗi khi tạo vòng quay');
    }
  };

  // Generate SVG segments for Wheel Preview
  const svgWheelPreview = useMemo(() => {
    const totalSlices = slices.length || 1;
    const anglePerSlice = 360 / totalSlices;
    const radius = 110;
    const center = 120;

    return slices.map((slice, i) => {
      const startAngle = i * anglePerSlice - 90;
      const endAngle = (i + 1) * anglePerSlice - 90;
      const midAngle = (startAngle + endAngle) / 2;

      const startRad = (startAngle * Math.PI) / 180;
      const endRad = (endAngle * Math.PI) / 180;
      const midRad = (midAngle * Math.PI) / 180;

      const x1 = center + radius * Math.cos(startRad);
      const y1 = center + radius * Math.sin(startRad);
      const x2 = center + radius * Math.cos(endRad);
      const y2 = center + radius * Math.sin(endRad);

      const largeArc = anglePerSlice > 180 ? 1 : 0;
      const d = `M ${center} ${center} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} Z`;

      // Text position along radius
      const textRadius = radius * 0.65;
      const tx = center + textRadius * Math.cos(midRad);
      const ty = center + textRadius * Math.sin(midRad);

      return (
        <g key={slice.id}>
          <path d={d} fill={slice.color} stroke="#ffffff" strokeWidth="1.5" />
          <text
            x={tx}
            y={ty}
            fill="#ffffff"
            fontSize={slices.length > 8 ? "8" : "10"}
            fontWeight="bold"
            textAnchor="middle"
            dominantBaseline="central"
            transform={`rotate(${midAngle + 90}, ${tx}, ${ty})`}
          >
            {slice.label.length > 15 ? slice.label.slice(0, 14) + '…' : slice.label}
          </text>
        </g>
      );
    });
  }, [slices]);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            Danh sách vòng quay
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Quản lý các vòng quay: nội dung, số lượng, text giải thưởng. Mỗi vòng quay dùng cho một sự kiện.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Link
            href="/admin/vong-quay/quay"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-all active:scale-95"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Quay thưởng ngay</span>
          </Link>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-all active:scale-95 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>+ Thêm vòng quay</span>
          </button>
        </div>
      </div>

      {/* Main Table (Hình 17) */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px] tracking-wider select-none">
              <tr>
                <th className="py-3.5 px-4 min-w-[220px]">TÊN VÒNG QUAY</th>
                <th className="py-3.5 px-4">TEXT GIẢI THƯỞNG</th>
                <th className="py-3.5 px-3 text-center">SỐ LƯỢNG</th>
                <th className="py-3.5 px-4">SỰ KIỆN</th>
                <th className="py-3.5 px-3 text-center">ĐÃ QUAY</th>
                <th className="py-3.5 px-3 text-center">TRẠNG THÁI</th>
                <th className="py-3.5 px-3 text-center">CHỌN</th>
                <th className="py-3.5 px-4 text-center">THAO TÁC</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-normal">
              {wheels.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-slate-400">
                    Chưa có vòng quay nào. Nhấn "+ Thêm vòng quay" để tạo mới.
                  </td>
                </tr>
              ) : (
                wheels.map((wheel) => {
                  const isSelected = activeWheelId === wheel.id;

                  return (
                    <tr
                      key={wheel.id}
                      className={`hover:bg-slate-50/80 transition-colors ${
                        isSelected ? 'bg-blue-50/30' : ''
                      }`}
                    >
                      {/* Tên vòng quay */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900 text-xs">{wheel.name}</div>
                        {wheel.description && (
                          <div className="text-[11px] text-slate-400 truncate max-w-[240px]">
                            {wheel.description}
                          </div>
                        )}
                      </td>

                      {/* Text giải thưởng */}
                      <td className="py-3.5 px-4 font-semibold text-slate-700 whitespace-nowrap">
                        {wheel.reward_text}
                      </td>

                      {/* Số lượng */}
                      <td className="py-3.5 px-3 text-center font-bold text-slate-800">
                        {wheel.quantity}
                      </td>

                      {/* Sự kiện */}
                      <td className="py-3.5 px-4 text-slate-600 whitespace-nowrap">
                        {wheel.event_name || '—'}
                      </td>

                      {/* Đã quay */}
                      <td className="py-3.5 px-3 text-center font-bold text-blue-600">
                        {wheel.spins_count}
                      </td>

                      {/* Trạng thái */}
                      <td className="py-3.5 px-3 text-center whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            wheel.status === 'Đang quay' || wheel.is_active
                              ? 'text-emerald-700 bg-emerald-50 border border-emerald-200'
                              : wheel.status === 'Đã kết thúc'
                              ? 'text-slate-500 bg-slate-100 border border-slate-200'
                              : 'text-amber-700 bg-amber-50 border border-amber-200'
                          }`}
                        >
                          {wheel.is_active ? 'Đang quay' : wheel.status}
                        </span>
                      </td>

                      {/* Cột CHỌN (Radio button) */}
                      <td className="py-3.5 px-3 text-center">
                        <input
                          type="radio"
                          name="selected_active_wheel"
                          checked={isSelected}
                          onChange={() => handleSetActive(wheel.id)}
                          className="w-4 h-4 text-blue-600 focus:ring-blue-500 cursor-pointer"
                          title="Chọn hiển thị trên trang Quay vòng trúng thưởng"
                        />
                      </td>

                      {/* Thao tác */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => setSelectedViewWheel(wheel)}
                            className="p-1 text-slate-400 hover:text-blue-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                            title="Xem chi tiết"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => alert(`Chỉnh sửa vòng quay: ${wheel.name}`)}
                            className="p-1 text-slate-400 hover:text-amber-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                            title="Chỉnh sửa"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteWheel(wheel.id)}
                            className="p-1 text-slate-400 hover:text-red-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                            title="Xóa"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footnote matching Hình 17 */}
        <div className="p-3.5 bg-slate-50 border-t border-slate-100 text-[11px] text-slate-400">
          Chọn 1 vòng quay (cột CHỌN) để hiển thị trên trang Quay vòng trúng thưởng.
        </div>
      </div>

      {/* Modal: Thêm vòng quay (Hình 17.1) */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[92vh] overflow-y-auto shadow-2xl border border-slate-200">
            {/* Header */}
            <div className="flex items-center justify-between p-4 px-6 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-base">Thêm vòng quay</h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSaveWheel} className="p-6">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Left Side (7 cols) */}
                <div className="lg:col-span-7 space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-700 font-semibold text-xs mb-1">
                        Tên vòng quay
                      </label>
                      <input
                        type="text"
                        value={wheelName}
                        onChange={(e) => setWheelName(e.target.value)}
                        placeholder="Vòng quay may mắn"
                        className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-slate-700 font-semibold text-xs mb-1">
                        Text giải thưởng
                      </label>
                      <input
                        type="text"
                        value={rewardText}
                        onChange={(e) => setRewardText(e.target.value)}
                        placeholder="Voucher 500.000đ"
                        className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-700 font-semibold text-xs mb-1">
                        Nội dung
                      </label>
                      <input
                        type="text"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Nội dung"
                        className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-700 font-semibold text-xs mb-1">
                        Số lượng
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={quantity}
                        onChange={(e) => setQuantity(Number(e.target.value))}
                        className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-700 font-semibold text-xs mb-1">
                        Trạng thái
                      </label>
                      <select
                        value={status}
                        onChange={(e) => setStatus(e.target.value)}
                        className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                      >
                        <option value="Sắp diễn ra">Sắp diễn ra</option>
                        <option value="Đang quay">Đang quay</option>
                        <option value="Đã kết thúc">Đã kết thúc</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-slate-700 font-semibold text-xs mb-1">
                        Sự kiện
                      </label>
                      <select
                        value={selectedEventName}
                        onChange={(e) => setSelectedEventName(e.target.value)}
                        className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                      >
                        <option value="— Không gắn —">— Không gắn —</option>
                        {events.map((ev) => (
                          <option key={ev.id} value={ev.name}>
                            {ev.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Slices list header & Add button */}
                  <div className="pt-2">
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-slate-800 font-bold text-xs">
                        Danh sách màu sắc & nội dung vòng quay
                      </label>
                      <button
                        type="button"
                        onClick={handleAddSlice}
                        className="inline-flex items-center gap-1 px-3 py-1 bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold rounded-lg shadow-xs cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>+ Thêm ô</span>
                      </button>
                    </div>

                    {/* Slices list */}
                    <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                      {slices.map((s, idx) => (
                        <div
                          key={s.id}
                          className="flex items-center gap-2 p-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                        >
                          {/* Color picker */}
                          <input
                            type="color"
                            value={s.color}
                            onChange={(e) => {
                              const updated = [...slices];
                              updated[idx].color = e.target.value;
                              setSlices(updated);
                            }}
                            className="w-7 h-7 rounded-lg cursor-pointer border border-slate-300 p-0.5 shrink-0"
                            title="Chọn màu"
                          />

                          {/* Label */}
                          <input
                            type="text"
                            value={s.label}
                            onChange={(e) => {
                              const updated = [...slices];
                              updated[idx].label = e.target.value;
                              setSlices(updated);
                            }}
                            className="flex-1 px-2.5 py-1 text-xs bg-white border border-slate-200 rounded-lg min-w-0"
                            placeholder="Tên ô"
                          />

                          {/* Type */}
                          <select
                            value={s.type}
                            onChange={(e) => {
                              const updated = [...slices];
                              updated[idx].type = e.target.value;
                              setSlices(updated);
                            }}
                            className="w-24 px-2 py-1 text-xs bg-white border border-slate-200 rounded-lg"
                          >
                            <option value="Quà tặng">Quà tặng</option>
                            <option value="Voucher">Voucher</option>
                            <option value="Điểm">Điểm</option>
                            <option value="Không trúng">Không trúng</option>
                          </select>

                          {/* Weight */}
                          <input
                            type="number"
                            min="1"
                            value={s.weight}
                            onChange={(e) => {
                              const updated = [...slices];
                              updated[idx].weight = Number(e.target.value) || 1;
                              setSlices(updated);
                            }}
                            className="w-12 px-2 py-1 text-xs text-center bg-white border border-slate-200 rounded-lg"
                            title="Tỷ lệ trọng số"
                          />

                          {/* Delete slice */}
                          <button
                            type="button"
                            onClick={() => handleRemoveSlice(s.id)}
                            className="p-1 text-slate-400 hover:text-red-600 rounded-lg hover:bg-slate-200"
                            title="Xóa ô"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Right Side: Wheel Preview (5 cols) (Hình 17.1) */}
                <div className="lg:col-span-5 bg-slate-50/70 p-5 rounded-2xl border border-slate-200/80 flex flex-col items-center justify-between">
                  <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                    XEM TRƯỚC
                  </div>

                  {/* Interactive SVG Wheel Preview */}
                  <div className="relative w-60 h-60 flex items-center justify-center my-2">
                    {/* Orange Arrow pointing down */}
                    <div
                      className="absolute -top-1 left-1/2 -translate-x-1/2 z-20 w-0 h-0"
                      style={{
                        borderLeft: '10px solid transparent',
                        borderRight: '10px solid transparent',
                        borderTop: `18px solid ${arrowColor}`,
                      }}
                    />

                    {/* SVG Wheel */}
                    <svg className="w-60 h-60 drop-shadow-md" viewBox="0 0 240 240">
                      {/* Wheel outer border */}
                      <circle cx="120" cy="120" r="114" fill="none" stroke={borderColor} strokeWidth="6" />
                      {/* Wheel Slices */}
                      {svgWheelPreview}
                      {/* Center Hub */}
                      <circle cx="120" cy="120" r="32" fill={coreColor} stroke="#ffffff" strokeWidth="3" />
                      <text
                        x="120"
                        y="124"
                        fill="#ffffff"
                        fontSize="12"
                        fontWeight="bold"
                        textAnchor="middle"
                      >
                        QUAY
                      </text>
                    </svg>
                  </div>

                  {/* Core / Arrow / Border Color Pickers (Hình 17.1) */}
                  <div className="w-full grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-slate-200 text-[11px]">
                    <div>
                      <span className="block text-slate-500 font-medium mb-1">Màu lõi</span>
                      <input
                        type="color"
                        value={coreColor}
                        onChange={(e) => setCoreColor(e.target.value)}
                        className="w-full h-7 rounded-lg cursor-pointer border border-slate-200 p-0.5"
                      />
                    </div>
                    <div>
                      <span className="block text-slate-500 font-medium mb-1">Mũi tên</span>
                      <input
                        type="color"
                        value={arrowColor}
                        onChange={(e) => setArrowColor(e.target.value)}
                        className="w-full h-7 rounded-lg cursor-pointer border border-slate-200 p-0.5"
                      />
                    </div>
                    <div>
                      <span className="block text-slate-500 font-medium mb-1">Viền</span>
                      <input
                        type="color"
                        value={borderColor}
                        onChange={(e) => setBorderColor(e.target.value)}
                        className="w-full h-7 rounded-lg cursor-pointer border border-slate-200 p-0.5"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2 pt-6 mt-6 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-5 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold rounded-xl text-xs"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-blue-700 hover:bg-blue-800 text-white font-semibold rounded-xl text-xs shadow-xs"
                >
                  Lưu thay đổi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: View Details */}
      {selectedViewWheel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl border border-slate-200 text-xs space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-sm">{selectedViewWheel.name}</h3>
              <button
                onClick={() => setSelectedViewWheel(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-2">
              <div>
                <span className="text-slate-400">Giải thưởng:</span>{' '}
                <strong className="text-slate-800">{selectedViewWheel.reward_text}</strong>
              </div>
              <div>
                <span className="text-slate-400">Số lượng:</span>{' '}
                <span className="text-slate-800">{selectedViewWheel.quantity}</span>
              </div>
              <div>
                <span className="text-slate-400">Sự kiện:</span>{' '}
                <span className="text-slate-800">{selectedViewWheel.event_name || 'Không có'}</span>
              </div>
              <div>
                <span className="text-slate-400">Lượt đã quay:</span>{' '}
                <span className="text-blue-600 font-bold">{selectedViewWheel.spins_count}</span>
              </div>
              <div>
                <span className="text-slate-400">Trạng thái:</span>{' '}
                <span className="font-bold text-emerald-600">{selectedViewWheel.status}</span>
              </div>
            </div>
            <div className="flex justify-end pt-3 border-t border-slate-100">
              <button
                onClick={() => setSelectedViewWheel(null)}
                className="px-4 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
