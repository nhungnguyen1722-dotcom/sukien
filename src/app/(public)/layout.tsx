import Link from "next/link";
import SystemLogo from "@/components/SystemLogo";

export default function PublicLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 flex items-center justify-between px-6 py-3">
        <Link href="/" className="flex items-center gap-3">
          <SystemLogo className="h-10 w-auto max-h-10 object-contain" />
        </Link>
        <nav className="flex items-center gap-6 text-sm font-medium">
          <Link href="/" className="text-gray-900">Sự kiện</Link>
          <Link href="/login" className="text-gray-500 hover:text-gray-900">Đăng nhập</Link>
        </nav>
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
