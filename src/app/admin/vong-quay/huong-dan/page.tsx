import React from 'react';
import Link from 'next/link';
import {
  HelpCircle,
  Play,
  RotateCw,
  Gift,
  Award,
  UserPlus,
  Users,
  Bell,
  Trophy,
  ShieldCheck,
  Layers,
  Zap,
} from 'lucide-react';

export const revalidate = 0;

export default function HuongDanVongQuayPage() {
  return (
    <div className="space-y-6">
      {/* Header (Hình 17.4) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Hướng dẫn</h1>
          <p className="text-xs text-slate-500 mt-1">
            Thể lệ và quy trình quay thưởng
          </p>
        </div>

        <Link
          href="/admin/vong-quay/quay"
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-all active:scale-95 cursor-pointer self-start sm:self-auto"
        >
          <Play className="w-3.5 h-3.5 fill-current" />
          <span>Trải nghiệm quay ngay</span>
        </Link>
      </div>

      {/* Card 1: Quy trình quay thưởng (Hình 17.4) */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6">
        <h2 className="text-sm font-bold text-slate-900 mb-6">Quy trình quay thưởng</h2>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 relative">
          {/* Step 1 */}
          <div className="flex flex-col items-center text-center">
            <div className="w-10 h-10 rounded-full bg-[#1e3a8a] text-white flex items-center justify-center font-bold text-sm shadow-md mb-3">
              1
            </div>
            <h3 className="font-bold text-slate-900 text-xs mb-1.5">1. Nhận lượt quay</h3>
            <p className="text-[11px] text-slate-500 leading-relaxed max-w-[200px]">
              Mỗi sự kiện cấp cho bạn lượt quay miễn phí. Người mới đăng ký tự động nhận lượt quay cho mọi sự kiện đang diễn ra.
            </p>
          </div>

          {/* Step 2 */}
          <div className="flex flex-col items-center text-center">
            <div className="w-10 h-10 rounded-full bg-[#1e3a8a] text-white flex items-center justify-center font-bold text-sm shadow-md mb-3">
              2
            </div>
            <h3 className="font-bold text-slate-900 text-xs mb-1.5">2. Quay thưởng</h3>
            <p className="text-[11px] text-slate-500 leading-relaxed max-w-[200px]">
              Truy cập mục "Vòng quay trúng thưởng", chọn sự kiện và bấm QUAY. Hệ thống xác định phần thưởng ngẫu nhiên.
            </p>
          </div>

          {/* Step 3 */}
          <div className="flex flex-col items-center text-center">
            <div className="w-10 h-10 rounded-full bg-[#1e3a8a] text-white flex items-center justify-center font-bold text-sm shadow-md mb-3">
              3
            </div>
            <h3 className="font-bold text-slate-900 text-xs mb-1.5">3. Nhận kết quả</h3>
            <p className="text-[11px] text-slate-500 leading-relaxed max-w-[200px]">
              Vòng quay dừng lại và hiển thị phần thưởng bạn đã trúng. Kết quả được ghi nhận vào hệ thống.
            </p>
          </div>

          {/* Step 4 */}
          <div className="flex flex-col items-center text-center">
            <div className="w-10 h-10 rounded-full bg-[#1e3a8a] text-white flex items-center justify-center font-bold text-sm shadow-md mb-3">
              4
            </div>
            <h3 className="font-bold text-slate-900 text-xs mb-1.5">4. Nhận thưởng</h3>
            <p className="text-[11px] text-slate-500 leading-relaxed max-w-[200px]">
              Phần thưởng tự động thêm vào "Phần thưởng của tôi". Voucher có mã sử dụng, điểm được cộng vào số dư.
            </p>
          </div>
        </div>
      </div>

      {/* Card 2: Thể lệ chương trình (Hình 17.4) */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6">
        <h2 className="text-sm font-bold text-slate-900 mb-4">Thể lệ chương trình</h2>
        <ul className="space-y-2.5 text-xs text-slate-600 list-disc pl-5 leading-relaxed">
          <li>Thành viên nhận lượt quay miễn phí khi đăng ký và qua lời mời bạn bè.</li>
          <li>Kết quả quay được xác định ngẫu nhiên theo tỷ lệ cấu hình phía backend, không thể can thiệp.</li>
          <li>Điểm thưởng tích lũy vào số dư tài khoản, có thể dùng để đổi quà.</li>
          <li>Voucher có hạn sử dụng 30 ngày kể từ ngày trúng thưởng.</li>
          <li>Mọi lượt quay đều được ghi nhận vào lịch sử để đối soát.</li>
        </ul>
      </div>

      {/* Card 3: Các tình huống thường gặp (Hình 17.4) */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6">
        <h2 className="text-sm font-bold text-slate-900 mb-4">Các tình huống thường gặp</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 rounded-xl border border-slate-200/80 bg-slate-50/50 flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 mt-0.5">
              <UserPlus className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-xs text-slate-800 mb-1">Mời bạn bè tham gia</h3>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Mỗi lời mời thành công (bạn bè đăng ký) bạn nhận thêm 1 lượt quay miễn phí.
              </p>
            </div>
          </div>

          <div className="p-4 rounded-xl border border-slate-200/80 bg-slate-50/50 flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 mt-0.5">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-xs text-slate-800 mb-1">Người mới tham gia</h3>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Tự động nhận lượt quay miễn phí cho mọi sự kiện đang diễn ra khi đăng ký.
              </p>
            </div>
          </div>

          <div className="p-4 rounded-xl border border-slate-200/80 bg-slate-50/50 flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center shrink-0 mt-0.5">
              <Bell className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-xs text-slate-800 mb-1">Thông báo sự kiện</h3>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Nhận thông báo trước khi sự kiện quay thưởng mới bắt đầu.
              </p>
            </div>
          </div>

          <div className="p-4 rounded-xl border border-slate-200/80 bg-slate-50/50 flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 mt-0.5">
              <Trophy className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-xs text-slate-800 mb-1">Trúng thưởng nhiều sự kiện</h3>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Tất cả phần thưởng được gộp vào mục "Phần thưởng của tôi".
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Banner: 3 pillars (Hình 17.4) */}
      <div className="bg-[#101b4b] text-white p-6 rounded-2xl shadow-md grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="flex items-start gap-3">
          <ShieldCheck className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
          <div>
            <h4 className="font-bold text-xs text-white mb-1">Công bằng</h4>
            <p className="text-[11px] text-slate-300 leading-relaxed">
              Kết quả xác định ngẫu nhiên theo tỷ lệ cấu hình, không thể can thiệp.
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <Layers className="w-5 h-5 text-purple-400 shrink-0 mt-0.5" />
          <div>
            <h4 className="font-bold text-xs text-white mb-1">Đa dạng</h4>
            <p className="text-[11px] text-slate-300 leading-relaxed">
              Đa dạng phần thưởng: điểm, voucher, mã giảm giá.
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <Zap className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <h4 className="font-bold text-xs text-white mb-1">Dễ dàng</h4>
            <p className="text-[11px] text-slate-300 leading-relaxed">
              Thao tác đơn giản, phần thưởng tự động ghi nhận.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
