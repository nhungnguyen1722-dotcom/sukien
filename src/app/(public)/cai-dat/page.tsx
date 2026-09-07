import React, { Suspense } from 'react';
import UserAccountSettings from '@/components/UserAccountSettings';

export const metadata = {
  title: 'Cài đặt tài khoản | NGHIÊNG Complex',
  description: 'Quản lý thông tin cá nhân, bảo mật và quyền hạn hệ thống.',
};

export default function CaiDatPage() {
  return (
    <div className="min-h-screen bg-[#f8fafc]">
      <Suspense
        fallback={
          <div className="max-w-7xl mx-auto px-4 py-16 flex items-center justify-center">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        }
      >
        <UserAccountSettings />
      </Suspense>
    </div>
  );
}
