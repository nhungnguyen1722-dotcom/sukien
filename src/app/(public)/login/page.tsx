"use client";

import { useState, useEffect } from "react";
import { LogIn, Mail, Lock, Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";

const isMobileDevice = () => {
  if (typeof window === "undefined") return false;
  const ua = navigator.userAgent || navigator.vendor || (window as any).opera || "";
  const isMobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);
  const isSmallScreen = window.innerWidth <= 768;
  return isMobileUA || isSmallScreen;
};

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    const isMobile = isMobileDevice();

    if (!isMobile) {
      // Trên Desktop: dọn dẹp các cookie và storage phiên cũ để form và phiên đăng nhập hoàn toàn mới
      try {
        document.cookie = "user_role=; path=/; max-age=0";
        document.cookie = "user_name=; path=/; max-age=0";
        document.cookie = "user_email=; path=/; max-age=0";
        document.cookie = "user_phone=; path=/; max-age=0";
        document.cookie = "user_id=; path=/; max-age=0";
        document.cookie = "user_ref_code=; path=/; max-age=0";
        document.cookie = "ref_code=; path=/; max-age=0";
        document.cookie = "user_ref=; path=/; max-age=0";
        localStorage.removeItem("nghieng_auth_role");
        localStorage.removeItem("nghieng_user_ref_code");
        localStorage.removeItem("ref_code");
        localStorage.removeItem("nghieng_user_id");
        localStorage.removeItem("nghieng_user_name");
        localStorage.removeItem("nghieng_user_email");
        localStorage.removeItem("nghieng_user_phone");
        window.dispatchEvent(new Event("nghieng-auth-change"));
      } catch {
        // Ignore
      }
    } else {
      // Chỉ ở trên điện thoại:
      // Lưu sẵn cookies của tài khoản đã từng đăng nhập lần thứ 1, lần thứ 2 trở đi vẫn lưu
      // Tự động khôi phục thông tin đăng nhập đã lưu (Email & Mật khẩu) vào form
      try {
        const getCookie = (name: string) => {
          if (typeof document === "undefined") return "";
          const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`));
          return match ? decodeURIComponent(match[1]) : "";
        };

        const savedEmail =
          getCookie("mobile_saved_email") ||
          getCookie("user_email") ||
          localStorage.getItem("nghieng_mobile_email") ||
          "";

        const savedPassword =
          getCookie("mobile_saved_password") ||
          localStorage.getItem("nghieng_mobile_password") ||
          "";

        if (savedEmail) {
          setEmail(savedEmail);
        }
        if (savedPassword) {
          setPassword(savedPassword);
        }
      } catch {
        // Ignore
      }
    }
  }, []);

  const handleGoogleSignIn = async () => {
    try {
      setIsGoogleLoading(true);
      setErrorMsg("");
      await signIn("google");
    } catch (err) {
      console.error("Google sign in error:", err);
      setErrorMsg("Đã xảy ra lỗi khi đăng nhập với Google. Vui lòng thử lại.");
      setIsGoogleLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg("");

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        const rawRole = data.role || data.user?.role || "";
        const userRole = rawRole.toLowerCase();
        const isAdmin = data.isAdmin || userRole.includes("admin") || userRole.includes("quản trị");
        const isReception = data.isReception || userRole.includes("lễ tân") || userRole.includes("le tan");

        const isMobile = isMobileDevice();

        // Chỉ ở trên điện thoại: lưu sẵn cookies tài khoản đăng nhập để lần 2 trở đi vẫn lưu
        if (isMobile) {
          try {
            const maxAge = 365 * 24 * 60 * 60; // 1 năm
            document.cookie = `mobile_saved_email=${encodeURIComponent(email.trim())}; path=/; max-age=${maxAge}; SameSite=Lax`;
            document.cookie = `mobile_saved_password=${encodeURIComponent(password)}; path=/; max-age=${maxAge}; SameSite=Lax`;
            localStorage.setItem("nghieng_mobile_email", email.trim());
            localStorage.setItem("nghieng_mobile_password", password);

            if (data.user?.email) {
              document.cookie = `user_email=${encodeURIComponent(data.user.email)}; path=/; max-age=${maxAge}; SameSite=Lax`;
            }
            if (data.user?.full_name) {
              document.cookie = `user_name=${encodeURIComponent(data.user.full_name)}; path=/; max-age=${maxAge}; SameSite=Lax`;
            }
            if (data.user?.phone) {
              document.cookie = `user_phone=${encodeURIComponent(data.user.phone)}; path=/; max-age=${maxAge}; SameSite=Lax`;
            }
            if (rawRole) {
              document.cookie = `user_role=${encodeURIComponent(rawRole)}; path=/; max-age=${maxAge}; SameSite=Lax`;
            }
          } catch {
            // Ignore
          }
        }

        try {
          localStorage.setItem(
            "nghieng_auth_role",
            rawRole || (isAdmin ? "Admin" : isReception ? "Lễ tân" : "Thành viên")
          );
          if (data.ref_code) {
            localStorage.setItem("nghieng_user_ref_code", data.ref_code);
            localStorage.setItem("ref_code", data.ref_code);
          }
          if (data.user?.id) {
            localStorage.setItem("nghieng_user_id", String(data.user.id));
          }
        } catch {
          // Ignore
        }

        // Dispatch custom event to notify header
        try {
          window.dispatchEvent(new Event('nghieng-auth-change'));
        } catch {
          // Ignore
        }

        // Chuyển hướng theo phân quyền:
        // - Lễ tân -> /admin/le-tan
        // - Admin & các tài khoản Mục 1 (MC, Nhân sự, Nhân viên, Diễn giả, Khác, Phụng sự, Chốt sự kiện...) -> /admin
        if (isReception) {
          window.location.href = data.redirectTo || "/admin/le-tan";
        } else {
          window.location.href = data.redirectTo && data.redirectTo.startsWith("/admin") ? data.redirectTo : "/admin";
        }
      } else {
        setErrorMsg(data.error || "Đăng nhập thất bại. Vui lòng kiểm tra lại thông tin.");
      }
    } catch (err) {
      console.error(err);
      setErrorMsg("Lỗi kết nối. Vui lòng thử lại sau.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-140px)] flex flex-col items-center justify-center bg-gray-50 px-4 py-12">
      {/* Icon */}
      <div className="mb-4">
        <div className="bg-[#3b5bdb] text-white w-12 h-12 flex items-center justify-center rounded-xl shadow-sm">
          <LogIn className="w-6 h-6" />
        </div>
      </div>

      {/* Title */}
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Welcome back</h1>
      <p className="text-sm text-gray-500 mb-8">Log in to your account</p>

      {/* Card */}
      <div className="w-full max-w-md">
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6 shadow-sm">
          {/* Google Button */}
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={isGoogleLoading}
            className="w-full flex items-center justify-center gap-3 border border-gray-200 rounded-lg px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isGoogleLoading ? (
              <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
            ) : (
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
            )}
            {isGoogleLoading ? "Đang kết nối Google..." : "Continue with Google"}
          </button>

          {/* Divider */}
          <div className="flex items-center my-5">
            <div className="flex-1 border-t border-gray-200"></div>
            <span className="px-4 text-xs text-gray-400 uppercase">or</span>
            <div className="flex-1 border-t border-gray-200"></div>
          </div>

          {errorMsg && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-600">
              {errorMsg}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-semibold text-gray-700 mb-1.5"
              >
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-gray-400" />
                <input
                  id="email"
                  type="text"
                  name="email"
                  autoComplete="username email"
                  placeholder="you@example.com hoặc SĐT"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  required
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label
                  htmlFor="password"
                  className="block text-sm font-semibold text-gray-700"
                >
                  Password
                </label>
                <Link
                  href="/forgot-password"
                  className="text-xs text-blue-500 hover:text-blue-600 font-medium"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-gray-400" />
                <input
                  id="password"
                  type="password"
                  name="password"
                  autoComplete="current-password"
                  placeholder="Nhập mật khẩu"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  required
                />
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-[#4263eb] hover:bg-[#3b5bdb] text-white font-medium py-2.5 rounded-lg text-sm transition-colors disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer mt-2"
            >
              {isLoading ? "Đang đăng nhập..." : "Log In"}
            </button>
          </form>
        </div>

        {/* Sign up link */}
        <p className="text-center text-sm text-gray-500">
          Don&apos;t have an account?{" "}
          <Link
            href="/register"
            className="text-blue-500 hover:text-blue-600 font-medium"
          >
            Create one
          </Link>
        </p>
      </div>
    </div>
  );
}
