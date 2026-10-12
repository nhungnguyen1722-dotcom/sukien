'use client';

import React, { useState, useEffect } from 'react';
import AdminSidebar from './AdminSidebar';

interface AdminShellProps {
  currentName: string;
  currentRole?: string;
  children: React.ReactNode;
}

export default function AdminShell({
  currentName,
  currentRole,
  children,
}: AdminShellProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('nghieng_sidebar_collapsed');
      if (saved !== null) {
        setIsCollapsed(saved === 'true');
      }
    } catch {
      // Ignore
    }
  }, []);

  const toggleCollapse = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('nghieng_sidebar_collapsed', String(next));
      } catch {
        // Ignore
      }
      return next;
    });
  };

  return (
    <div className="flex min-h-screen bg-[#f8fafc]">
      <AdminSidebar
        adminName={currentName}
        adminRole={currentRole}
        isCollapsed={isCollapsed}
        onToggleCollapse={toggleCollapse}
      />
      <main
        className={`flex-1 transition-[margin] duration-300 ease-in-out pt-12 md:pt-0 overflow-y-auto min-h-screen ${
          isCollapsed ? 'ml-0 md:ml-[76px]' : 'ml-0 md:ml-[260px]'
        }`}
      >
        {children}
      </main>
    </div>
  );
}
