import Link from "next/link";
import { Search, Bell, LogIn } from "lucide-react";
import SystemLogo from "@/components/SystemLogo";
import PublicHeaderNav from "@/components/PublicHeaderNav";
import PublicHeaderAuth from "@/components/PublicHeaderAuth";

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

          {/* Công cụ bên phải (3 trạng thái theo Hình 3: image3.png) */}
          <PublicHeaderAuth />
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
