import Link from "next/link";
import { cookies } from "next/headers";
import { Search, Bell, LogIn } from "lucide-react";
import SystemLogo from "@/components/SystemLogo";
import PublicHeaderNav from "@/components/PublicHeaderNav";
import PublicHeaderAuth from "@/components/PublicHeaderAuth";
import { safeDecodeURI } from "@/lib/authUtils";

export default async function PublicLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Read cookies server-side to determine initial auth state
  const cookieStore = await cookies();
  const userRole = safeDecodeURI(cookieStore.get('user_role')?.value || '');
  const userName = safeDecodeURI(cookieStore.get('user_name')?.value || '');
  const userEmail = safeDecodeURI(cookieStore.get('user_email')?.value || '');

  let initialRole: 'guest' | 'member' | 'admin' = 'guest';
  if (userRole) {
    const lower = userRole.toLowerCase();
    if (lower.includes('admin') || lower.includes('quản trị') || lower.includes('quan tri')) {
      initialRole = 'admin';
    } else {
      initialRole = 'member';
    }
  }

  return (
    <div className="flex flex-col min-h-screen bg-[#f8fafc]">
      {/* Header (Mục 11 - Hình 12: Chiều cao 90px, logo contain) */}
      <header className="bg-white border-b border-slate-100 sticky top-0 z-40 shadow-xs">
        <div
          className="max-w-7xl mx-auto flex items-center justify-between px-4 sm:px-6 lg:px-8 h-16"
          style={{ height: '90px' }}
        >
          {/* Logo Nghiêng Complex */}
          <Link href="/" className="flex items-center group py-1 shrink-0">
            <div
              className="h-10 sm:h-11 flex items-center justify-center"
              style={{
                maxHeight: '100%',
                height: '90px',
              }}
            >
              <SystemLogo
                className="h-9 sm:h-10 w-auto max-h-10 object-contain transition-transform group-hover:scale-105 duration-200"
                style={{
                  maxHeight: '100%',
                  height: '100%',
                }}
              />
            </div>
          </Link>

          {/* Menu Điều Hướng - Căn giữa theo chiều dọc */}
          <div className="flex items-center">
            <PublicHeaderNav />
          </div>

          {/* Công cụ bên phải (Search, Bell, Account) - Cùng một hàng, căn giữa theo chiều dọc */}
          <div className="flex items-center">
            <PublicHeaderAuth initialRole={initialRole} />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1">
        {children}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-100 py-6 px-6 flex flex-col sm:flex-row items-center justify-between text-xs text-gray-500">
        <p>© 2026 Tập đoàn Nghiêng Complex. Bản quyền thuộc về Nghiêng Complex.</p>
        <Link href="/admin" className="text-blue-600 hover:underline mt-4 sm:mt-0">Đăng nhập quản trị</Link>
      </footer>
    </div>
  );
}
