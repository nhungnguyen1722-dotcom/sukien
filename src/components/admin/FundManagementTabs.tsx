import Link from 'next/link';
import { HandCoins, SlidersHorizontal, Users } from 'lucide-react';

type FundTab = 'teamlead' | 'policy' | 'operations';

const tabs: Array<{
  id: FundTab;
  label: string;
  href: string;
  icon: typeof Users;
  activeClass: string;
}> = [
  {
    id: 'teamlead',
    label: 'Quỹ TeamLead',
    href: '/admin/teamlead',
    icon: Users,
    activeClass: 'border-blue-600 bg-blue-600 text-white shadow-md shadow-blue-200',
  },
  {
    id: 'policy',
    label: 'Chính sách phân bổ',
    href: '/admin/teamlead/chinh-sach',
    icon: SlidersHorizontal,
    activeClass: 'border-blue-600 bg-blue-600 text-white shadow-md shadow-blue-200',
  },
  {
    id: 'operations',
    label: 'Quỹ vận hành và hỗ trợ',
    href: '/admin/quy-van-hanh-ho-tro',
    icon: HandCoins,
    activeClass: 'border-emerald-600 bg-emerald-600 text-white shadow-md shadow-emerald-200',
  },
];

export default function FundManagementTabs({ activeTab }: { activeTab: FundTab }) {
  return (
    <div className="bg-slate-50 px-4 pt-5 pb-1 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1600px]">
        <section className="mb-2">
          <nav aria-label="Đường dẫn" className="mb-3 flex items-center gap-2 text-xs text-slate-500">
            <Link href="/admin" className="hover:text-blue-700">Trang chủ</Link>
            <span aria-hidden="true">›</span>
            <span className="font-medium text-blue-700">Quản lý quỹ</span>
          </nav>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Quản lý quỹ</h1>
          <p className="mt-1 text-sm text-slate-500">
            Tổng hợp và quản lý các quỹ của hệ thống trên cùng một trang.
          </p>
          <nav aria-label="Các mục quản lý quỹ" className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <Link
                  key={tab.id}
                  href={tab.href}
                  aria-current={isActive ? 'page' : undefined}
                  className={`flex min-h-14 items-center gap-3 rounded-xl border px-4 py-3 text-sm font-semibold transition-colors ${
                    isActive
                      ? tab.activeClass
                      : 'border-slate-200 bg-white text-slate-700 hover:border-blue-200 hover:bg-blue-50'
                  }`}
                >
                  <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
                    isActive ? 'bg-white/20' : 'bg-slate-100 text-slate-600'
                  }`}>
                    <Icon className="h-4.5 w-4.5" aria-hidden="true" />
                  </span>
                  <span>{tab.label}</span>
                </Link>
              );
            })}
          </nav>
        </section>
      </div>
    </div>
  );
}
