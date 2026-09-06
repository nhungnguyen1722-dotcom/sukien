import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Calendar, MapPin, Users, Receipt, Wallet, CreditCard } from 'lucide-react';
import pool from '@/lib/db';
import SystemLogo from '@/components/SystemLogo';

export const revalidate = 0;

interface EventDetailProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function EventDetailPage({ params }: EventDetailProps) {
  const { id } = await params;
  
  let eventId = parseInt(id);
  if (isNaN(eventId) && id === '6a9254fd7194452499f20df3') {
    eventId = 2; // Mock ID from the Base44 system for "Hội nghị khách hàng Hà Đông"
  }

  let event = null;
  try {
    const result = await pool.query(`
      SELECT *
      FROM events 
      WHERE id = $1
    `, [eventId]);
    
    if (result.rows.length > 0) {
      event = result.rows[0];
    }
  } catch (error) {
    console.error('Failed to fetch event:', error);
  }

  if (!event) {
    notFound();
  }

  const expectedCost = parseFloat(event.fee || '0');
  const collected = 0; // Assuming 0 for now as there's no collected field
  const remaining = expectedCost - collected;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
  };

  const formatDate = (date: Date) => {
    if (!date) return '';
    return new Date(date).toLocaleDateString('vi-VN');
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 max-w-5xl mx-auto">
        <Link href="/" className="flex items-center gap-2">
          <SystemLogo className="h-10 w-auto max-h-10 object-contain" />
        </Link>
        <Link href="/" className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Quay lại
        </Link>
      </header>

      <main className="max-w-5xl mx-auto px-6 pb-12">
        {/* Banner */}
        <div className="w-full bg-slate-100 border border-slate-200 rounded-2xl h-[300px] flex items-center justify-center mb-8 overflow-hidden">
          {event.image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={event.image_url} alt={event.name} className="w-full h-full object-cover" />
          ) : (
            <SystemLogo className="max-h-48 w-auto object-contain" />
          )}
        </div>

        {/* Event Header Info */}
        <div className="mb-8">
          <span className="inline-block px-3 py-1 bg-gray-100 text-gray-700 text-xs font-medium rounded-full mb-4">
            {event.status || 'Kế hoạch'}
          </span>
          <h1 className="text-3xl font-bold text-gray-900 mb-4">{event.name}</h1>
          <div className="flex flex-wrap items-center gap-6 text-sm text-gray-600">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              <span>{formatDate(event.event_date)}</span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              <span>{event.location && event.location !== '-' ? event.location : '—'}</span>
            </div>
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              <span>{event.expected_guests || 0} khách dự kiến</span>
            </div>
          </div>
        </div>

        {/* Description Box */}
        <div className="bg-gray-50 rounded-xl p-4 mb-8 text-sm text-gray-600">
          {event.name}
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm flex flex-col justify-between">
            <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center mb-3">
              <Users className="w-4 h-4 text-blue-500" />
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Khách dự kiến</p>
              <p className="font-bold text-gray-900">{event.expected_guests || 0}</p>
            </div>
          </div>

          <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm flex flex-col justify-between">
            <div className="w-8 h-8 rounded-lg bg-orange-50 flex items-center justify-center mb-3">
              <Receipt className="w-4 h-4 text-orange-500" />
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Chi phí dự kiến</p>
              <p className="font-bold text-gray-900">{formatCurrency(expectedCost)}</p>
            </div>
          </div>

          <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm flex flex-col justify-between">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center mb-3">
              <Wallet className="w-4 h-4 text-emerald-500" />
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Đã thu</p>
              <p className="font-bold text-gray-900">{formatCurrency(collected)}</p>
            </div>
          </div>

          <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm flex flex-col justify-between">
            <div className="w-8 h-8 rounded-lg bg-rose-50 flex items-center justify-center mb-3">
              <CreditCard className="w-4 h-4 text-rose-500" />
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Còn lại</p>
              <p className="font-bold text-gray-900">{formatCurrency(remaining)}</p>
            </div>
          </div>
        </div>
      </main>
      
      {/* Footer */}
      <footer className="max-w-5xl mx-auto px-6 py-8 border-t border-gray-100">
        <p className="text-xs text-gray-400">
          © 2026 Tập đoàn Nghiêng Complex.
        </p>
      </footer>
    </div>
  );
}
