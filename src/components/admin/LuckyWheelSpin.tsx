'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import Link from 'next/link';
import {
  Play,
  RotateCw,
  Trophy,
  Sparkles,
  Users,
  CheckCircle2,
  ChevronDown,
  Gift,
  Clock,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { LuckyWheel, WheelSlice } from './LuckyWheelList';

export interface SpinRecord {
  id: number;
  wheel_id: number;
  wheel_name: string;
  participant_name: string;
  participant_phone?: string;
  participant_code?: string;
  prize: string;
  spun_at: string;
  status: string;
}

export interface Participant {
  id: string;
  name: string;
  phone?: string;
  code?: string;
  type: string;
}

interface LuckyWheelSpinProps {
  wheels: LuckyWheel[];
  initialActiveWheel?: LuckyWheel;
  initialSpins: SpinRecord[];
  participants: Participant[];
}

export default function LuckyWheelSpin({
  wheels,
  initialActiveWheel,
  initialSpins,
  participants,
}: LuckyWheelSpinProps) {
  const [selectedWheelId, setSelectedWheelId] = useState<number>(() => {
    return initialActiveWheel ? initialActiveWheel.id : wheels[0]?.id || 1;
  });

  const currentWheel = useMemo(() => {
    return wheels.find((w) => w.id === selectedWheelId) || wheels[0] || null;
  }, [wheels, selectedWheelId]);

  const [spins, setSpins] = useState<SpinRecord[]>(initialSpins);
  const [selectedParticipant, setSelectedParticipant] = useState<Participant | null>(
    participants[0] || null
  );
  const [searchPart, setSearchPart] = useState('');

  // Spinning states
  const [isSpinning, setIsSpinning] = useState(false);
  const [rotationDegree, setRotationDegree] = useState(0);
  const [spinResult, setSpinResult] = useState<string | null>(null);
  const [showWinnerModal, setShowWinnerModal] = useState(false);

  // Wheel slices
  const slices: WheelSlice[] = useMemo(() => {
    if (!currentWheel) return [];
    if (typeof currentWheel.slices_json === 'string') {
      try {
        return JSON.parse(currentWheel.slices_json);
      } catch {
        return [];
      }
    }
    if (Array.isArray(currentWheel.slices_json)) {
      return currentWheel.slices_json;
    }
    return [
      { id: 1, label: currentWheel.reward_text || 'Voucher 1.000.000đ', color: '#1e40af', type: 'Voucher', weight: 1 },
      { id: 2, label: '500 Điểm thưởng', color: '#047857', type: 'Điểm', weight: 2 },
      { id: 3, label: 'Voucher 500.000đ', color: '#b45309', type: 'Voucher', weight: 2 },
      { id: 4, label: '100 Điểm thưởng', color: '#6d28d9', type: 'Điểm', weight: 3 },
      { id: 5, label: 'Chúc bạn may mắn', color: '#475569', type: 'Không trúng', weight: 4 },
      { id: 6, label: 'Voucher 200.000đ', color: '#be123c', type: 'Voucher', weight: 2 },
    ];
  }, [currentWheel]);

  const filteredParticipants = useMemo(() => {
    if (!searchPart) return participants;
    return participants.filter(
      (p) =>
        p.name.toLowerCase().includes(searchPart.toLowerCase()) ||
        (p.code && p.code.toLowerCase().includes(searchPart.toLowerCase())) ||
        (p.phone && p.phone.includes(searchPart))
    );
  }, [participants, searchPart]);

  const handleStartSpin = async () => {
    if (isSpinning) return;
    if (!selectedParticipant) {
      alert('Vui lòng chọn người tham gia trong danh sách!');
      return;
    }
    if (slices.length === 0) {
      alert('Vòng quay chưa cấu hình các ô giải thưởng!');
      return;
    }

    setIsSpinning(true);
    setSpinResult(null);

    // Random prize based on weights
    const totalWeight = slices.reduce((acc, s) => acc + (s.weight || 1), 0);
    let randomNum = Math.random() * totalWeight;
    let winningIndex = 0;
    for (let i = 0; i < slices.length; i++) {
      if (randomNum <= (slices[i].weight || 1)) {
        winningIndex = i;
        break;
      }
      randomNum -= slices[i].weight || 1;
    }

    const wonSlice = slices[winningIndex];
    const sliceAngle = 360 / slices.length;
    // Calculate rotation: Spin 6 to 8 full rotations + stop on winning slice
    // Pointer is at the top (270 degrees in standard math or 0 degrees at top)
    const extraRounds = 360 * (6 + Math.floor(Math.random() * 3));
    const targetSliceDegree = 360 - (winningIndex * sliceAngle + sliceAngle / 2);
    const totalRotation = rotationDegree + extraRounds + (targetSliceDegree - (rotationDegree % 360));

    setRotationDegree(totalRotation);

    // Animate for 4 seconds
    setTimeout(async () => {
      setIsSpinning(false);
      setSpinResult(wonSlice.label);
      setShowWinnerModal(true);

      // Save to database
      try {
        const res = await fetch('/api/admin/lucky-wheel', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'spin',
            wheelId: currentWheel.id,
            participantName: selectedParticipant.name,
            participantPhone: selectedParticipant.phone || '',
            participantCode: selectedParticipant.code || '',
            prize: wonSlice.label,
          }),
        });
        const data = await res.json();
        if (data.success && data.spin) {
          setSpins([data.spin, ...spins]);
        }
      } catch (err) {
        console.error('Failed to log spin:', err);
      }
    }, 4200);
  };

  const svgWheelSegments = useMemo(() => {
    const totalSlices = slices.length || 1;
    const anglePerSlice = 360 / totalSlices;
    const radius = 140;
    const center = 150;

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

      const textRadius = radius * 0.65;
      const tx = center + textRadius * Math.cos(midRad);
      const ty = center + textRadius * Math.sin(midRad);

      return (
        <g key={slice.id}>
          <path d={d} fill={slice.color} stroke="#ffffff" strokeWidth="2" />
          <text
            x={tx}
            y={ty}
            fill="#ffffff"
            fontSize={slices.length > 8 ? "9" : "11"}
            fontWeight="bold"
            textAnchor="middle"
            dominantBaseline="central"
            transform={`rotate(${midAngle + 90}, ${tx}, ${ty})`}
          >
            {slice.label.length > 16 ? slice.label.slice(0, 15) + '…' : slice.label}
          </text>
        </g>
      );
    });
  }, [slices]);

  return (
    <div className="space-y-6">
      {/* Header (Hình 17.3) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Quay vòng trúng thưởng</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {currentWheel?.name || 'Vòng quay'} — {currentWheel?.event_name || '2026-08-13'}
          </p>
        </div>

        {/* Wheel selector dropdown */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-600">Vòng quay:</span>
            <select
              value={selectedWheelId}
              onChange={(e) => setSelectedWheelId(Number(e.target.value))}
              className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 shadow-xs focus:ring-2 focus:ring-blue-500 cursor-pointer"
            >
              {wheels.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </select>
          </div>
          <div className="px-3 py-1 bg-blue-50 text-blue-700 text-xs font-bold rounded-xl border border-blue-200">
            {currentWheel?.reward_text || 'Giải đặc biệt'}
          </div>
        </div>
      </div>

      {/* Main Grid: Left Participants (4 cols) + Right Wheel / Result (8 cols) (Hình 17.3) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Box: Danh sách tham gia */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider font-mono">
                // DANH SÁCH THAM GIA
              </span>
              <span className="px-2.5 py-0.5 bg-blue-50 text-blue-700 rounded-full text-xs font-bold">
                {participants.length} người
              </span>
            </div>

            {/* Search participant */}
            <input
              type="text"
              placeholder="Tìm theo tên hoặc SĐT..."
              value={searchPart}
              onChange={(e) => setSearchPart(e.target.value)}
              className="w-full mb-3 px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
            />

            {/* Participants list */}
            <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
              {filteredParticipants.map((part) => {
                const isSelected = selectedParticipant?.id === part.id;
                return (
                  <button
                    key={part.id}
                    type="button"
                    onClick={() => setSelectedParticipant(part)}
                    className={`w-full text-left p-2.5 rounded-xl text-xs transition-all flex items-center justify-between cursor-pointer ${
                      isSelected
                        ? 'bg-blue-600 text-white font-bold shadow-xs'
                        : 'bg-slate-50 hover:bg-slate-100 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span
                        className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                          isSelected ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
                        }`}
                      >
                        {part.name.charAt(0)}
                      </span>
                      <span className="truncate">{part.name}</span>
                    </div>
                    <span
                      className={`text-[11px] font-mono shrink-0 ml-2 ${
                        isSelected ? 'text-blue-100' : 'text-slate-400'
                      }`}
                    >
                      {part.code}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Bottom Spin Lever Button (Hình 17.3) */}
          <div className="pt-4 mt-4 border-t border-slate-100">
            <button
              onClick={handleStartSpin}
              disabled={isSpinning || !selectedParticipant}
              className="w-full py-3.5 bg-[#1e3a8a] hover:bg-[#1e40af] disabled:opacity-50 text-white text-sm font-bold rounded-xl shadow-md transition-all active:scale-98 flex items-center justify-center gap-2 cursor-pointer"
            >
              <Play className={`w-4 h-4 fill-current ${isSpinning ? 'animate-spin' : ''}`} />
              <span>{isSpinning ? 'Đang quay...' : 'Kéo cần gạt để bắt đầu'}</span>
            </button>
            <div className="text-center text-[11px] text-slate-400 mt-2 font-medium">
              Giải thưởng: {currentWheel?.reward_text || 'Voucher 1.000.000đ'}
            </div>
          </div>
        </div>

        {/* Right Box: Kết quả & Vòng quay (Hình 17.3) */}
        <div className="lg:col-span-7 bg-white rounded-2xl border-2 border-amber-300 shadow-xs p-6 flex flex-col justify-between items-center relative overflow-hidden min-h-[420px]">
          {/* Header */}
          <div className="w-full flex items-center justify-between pb-2 border-b border-amber-100">
            <span className="text-xs font-bold text-amber-800 uppercase tracking-wider font-mono">
              // KẾT QUẢ
            </span>
            <span
              className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                isSpinning
                  ? 'bg-amber-100 text-amber-800 animate-pulse'
                  : 'bg-emerald-100 text-emerald-800'
              }`}
            >
              {isSpinning ? 'SPINNING' : 'READY'}
            </span>
          </div>

          {/* Interactive Wheel spinning visualization */}
          <div className="relative w-72 h-72 my-4 flex items-center justify-center">
            {/* Top Indicator Arrow */}
            <div
              className="absolute -top-2 left-1/2 -translate-x-1/2 z-30 w-0 h-0"
              style={{
                borderLeft: '12px solid transparent',
                borderRight: '12px solid transparent',
                borderTop: `22px solid ${currentWheel?.arrow_color || '#f59e0b'}`,
              }}
            />

            {/* Rotating Wheel Container */}
            <div
              className="w-72 h-72 transition-transform ease-out"
              style={{
                transform: `rotate(${rotationDegree}deg)`,
                transitionDuration: isSpinning ? '4000ms' : '0ms',
                transitionTimingFunction: 'cubic-bezier(0.15, 0.9, 0.2, 1)',
              }}
            >
              <svg className="w-72 h-72 drop-shadow-xl" viewBox="0 0 300 300">
                {/* Border */}
                <circle
                  cx="150"
                  cy="150"
                  r="144"
                  fill="none"
                  stroke={currentWheel?.border_color || '#1e3a8a'}
                  strokeWidth="8"
                />
                {/* Slices */}
                {svgWheelSegments}
                {/* Hub */}
                <circle
                  cx="150"
                  cy="150"
                  r="38"
                  fill={currentWheel?.core_color || '#1e3a8a'}
                  stroke="#ffffff"
                  strokeWidth="4"
                />
                <text
                  x="150"
                  y="155"
                  fill="#ffffff"
                  fontSize="14"
                  fontWeight="bold"
                  textAnchor="middle"
                >
                  QUAY
                </text>
              </svg>
            </div>
          </div>

          {/* Result Text */}
          <div className="text-center">
            {spinResult ? (
              <div className="p-2.5 px-6 rounded-2xl bg-amber-50 border border-amber-200 animate-in zoom-in">
                <span className="text-xs text-amber-700 block font-medium">Trúng thưởng:</span>
                <span className="text-xl font-extrabold text-amber-900">{spinResult}</span>
              </div>
            ) : (
              <div className="text-sm italic text-slate-400 font-medium">
                Kéo cần gạt để xem kết quả
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom: Lịch sử vòng quay (Hình 17.3) */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Clock className="w-4 h-4 text-blue-600" />
            Lịch sử vòng quay
          </h2>
          <span className="text-xs text-slate-400">
            {spins.slice(0, 5).length} kết quả gần đây
          </span>
        </div>

        <div className="divide-y divide-slate-100">
          {spins.slice(0, 8).map((sp) => {
            const isWin = !sp.prize.toLowerCase().includes('không');
            return (
              <div key={sp.id} className="py-3 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                      isWin ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    TH
                  </div>
                  <div>
                    <div className="font-bold text-xs text-slate-900">{sp.participant_name}</div>
                    <div className="text-[11px] text-slate-500">
                      {sp.wheel_name} —{' '}
                      <span className={isWin ? 'text-emerald-600 font-bold' : 'text-slate-400'}>
                        {sp.prize}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="text-right text-[11px] text-slate-400 whitespace-nowrap">
                  {new Date(sp.spun_at).toLocaleTimeString('vi-VN')} {new Date(sp.spun_at).toLocaleDateString('vi-VN')}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Winner Celebration Modal */}
      {showWinnerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border-2 border-amber-300 text-center space-y-4 animate-in zoom-in">
            <div className="w-16 h-16 rounded-full bg-amber-100 text-amber-600 mx-auto flex items-center justify-center shadow-inner">
              <Trophy className="w-8 h-8 animate-bounce" />
            </div>

            <div>
              <span className="text-xs font-bold text-amber-600 uppercase tracking-wider">
                CHÚC MỪNG CHIẾN THẮNG!
              </span>
              <h3 className="text-lg font-bold text-slate-900 mt-1">
                {selectedParticipant?.name}
              </h3>
              <p className="text-xs text-slate-500">
                Mã: {selectedParticipant?.code} | {currentWheel?.name}
              </p>
            </div>

            <div className="p-4 bg-gradient-to-r from-amber-50 via-yellow-50 to-amber-50 rounded-2xl border border-amber-200">
              <span className="text-xs text-amber-700 block">Phần thưởng trúng:</span>
              <span className="text-2xl font-black text-amber-900">{spinResult}</span>
            </div>

            <button
              onClick={() => setShowWinnerModal(false)}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md cursor-pointer"
            >
              Xác nhận & Đóng
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
