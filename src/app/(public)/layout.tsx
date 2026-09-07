import Link from "next/link";
import { Search, Bell, LogIn } from "lucide-react";
import SystemLogo from "@/components/SystemLogo";
import PublicHeaderNav from "@/components/PublicHeaderNav";

export default function PublicLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="flex flex-col min-h-screen bg-[#f8fafc]">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-40 shadow-xs">
        <div className="max-w-7xl mx-auto flex items-center justify-between px-4 sm:px-6 py-2.5">
          {/* Logo Nghiêng Complex - Kích thước lớn, rõ ràng, không có text lặp lại */}
          <Link href="/" className="flex items-center gap-2 group py-1">
            <div className="h-11 flex items-center">
              <SystemLogo className="h-10 sm:h-11 w-auto max-h-11 object-contain transition-transform group-hover:scale-105 duration-200" />
            </div>
          </Link>

          {/* Menu Điều Hướng */}
          <PublicHeaderNav />

          {/* Công cụ bên phải */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="w-9 h-9 rounded-full flex items-center justify-center text-gray-500 hover:text-gray-800 hover:bg-gray-100 transition-colors"
              title="Tìm kiếm"
            >
              <Search className="w-4.5 h-4.5" />
            </button>
            <div className="relative">
              <button
                type="button"
                className="w-9 h-9 rounded-full flex items-center justify-center text-gray-500 hover:text-gray-800 hover:bg-gray-100 transition-colors"
                title="Thông báo"
              >
                <Bell className="w-4.5 h-4.5" />
              </button>
              <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white rounded-full text-[10px] font-bold flex items-center justify-center ring-2 ring-white">
                3
              </span>
            </div>
            <Link
              href="/login"
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#2563eb] hover:bg-[#1d4ed8] text-white text-sm font-semibold rounded-xl transition-all shadow-sm shadow-blue-500/20 active:scale-95"
            >
              <LogIn className="w-4 h-4" />
              <span>Đăng nhập</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1">
        {children}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-100 py-6 px-6 flex flex-col sm:flex-row items-center justify-between text-xs text-gray-500">
        <p>© 2026 Tập đoàn Nghiêng Complex. Bản quyền thuộc về WeLink.</p>
        <Link href="/admin" className="text-blue-600 hover:underline mt-4 sm:mt-0">Đăng nhập quản trị</Link>
      </footer>
    </div>
  );
}
