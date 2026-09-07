'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function PublicHeaderNav() {
  const pathname = usePathname();

  const isHome = pathname === '/';
  const isSuKien = pathname.startsWith('/su-kien');

  const navItems = [
    { label: 'Trang chủ', href: '/', isActive: isHome },
    { label: 'Sự kiện', href: '/#tat-ca-su-kien', isActive: isSuKien || (!isHome && pathname.includes('su-kien')) },
    { label: 'Tin tức', href: '/#', isActive: false },
    { label: 'Thư viện', href: '/#', isActive: false },
    { label: 'Kết nối', href: '/#', isActive: false },
    { label: 'Về chúng tôi', href: '/#', isActive: false },
  ];

  return (
    <nav className="hidden md:flex items-center gap-1 lg:gap-2">
      {navItems.map((item) => (
        <Link
          key={item.label}
          href={item.href}
          className={`relative px-3 py-2 text-sm font-semibold transition-colors ${
            item.isActive
              ? 'text-[#2563eb]'
              : 'text-gray-700 hover:text-[#2563eb]'
          }`}
        >
          {item.label}
          {item.isActive && (
            <span className="absolute bottom-0 left-3 right-3 h-0.5 bg-[#2563eb] rounded-full" />
          )}
        </Link>
      ))}
    </nav>
  );
}
