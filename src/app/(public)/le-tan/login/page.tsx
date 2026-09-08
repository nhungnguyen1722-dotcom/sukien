"use client";

import { useState } from "react";
import { UserCheck, Phone, Lock, Loader2, ArrowRight } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import SystemLogo from "@/components/SystemLogo";

export default function ReceptionLoginPage() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim()) {
      setErrorMsg("Vui lòng nhập Họ tên hoặc Số điện thoại");
      return;
    }

    setIsLoading(true);
    setErrorMsg("");

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: identifier.trim(), password }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        // Reception user goes to /admin/le-tan
        router.push(data.redirectTo || "/admin/le-tan");
        router.refresh();
      } else {
        setErrorMsg(data.error || "Đăng nhập thất bại. Vui lòng kiểm tra lại họ tên hoặc SĐT.");
      }
    } catch (err) {
      console.error(err);
      setErrorMsg("Đã xảy ra lỗi kết nối. Vui lòng thử lại sau.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-140px)] flex flex-col items-center justify-center bg-slate-50 px-4 py-12">
      {/* Brand Header */}
      <div className="flex flex-col items-center mb-6 text-center">
        <SystemLogo className="h-14 w-auto mb-3" />
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-bold mb-2">
          <UserCheck className="w-3.5 h-3.5" />
          <span>CỔNG ĐĂNG NHẬP LỄ TÂN</span>
        </div>
        <h1 className="text-2xl font-black text-gray-900 tracking-tight">Hệ Thống Lễ Tân Đón Tiếp</h1>
        <p className="text-xs text-gray-500 mt-1 max-w-sm">
          Dành riêng cho nhân sự lễ tân thực hiện check-in và nhập khách mời tại sự kiện
        </p>
      </div>

      {/* Login Card */}
      <div className="w-full max-w-md bg-white rounded-2xl border border-gray-200 p-6 sm:p-8 shadow-sm">
        {errorMsg && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-600 font-medium">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wide">
              Họ tên hoặc Số điện thoại <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Ví dụ: Trịnh Thị Hà hoặc 0912334455"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                required
                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all font-medium"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wide">
              Mật khẩu <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="password"
                placeholder="Nhập mật khẩu (hoặc SĐT)"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all font-medium"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full mt-2 inline-flex items-center justify-center gap-2 bg-[#2563eb] hover:bg-[#1d4ed8] text-white font-bold py-3 px-4 rounded-xl text-sm transition-all shadow-md shadow-blue-500/20 active:scale-98 disabled:opacity-60 cursor-pointer"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Đang xác thực...</span>
              </>
            ) : (
              <>
                <span>Đăng nhập Lễ tân</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <div className="mt-6 pt-4 border-t border-gray-100 text-center">
          <Link
            href="/login"
            className="text-xs text-gray-500 hover:text-blue-600 transition-colors"
          >
            Đăng nhập tài khoản Quản trị / Thành viên →
          </Link>
        </div>
      </div>
    </div>
  );
}
