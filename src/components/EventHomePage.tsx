'use client';

import { useState } from 'react';
import { Calendar, MapPin, Users, Search } from 'lucide-react';
import Link from 'next/link';
import SystemLogo from './SystemLogo';

export type EventData = {
  id: number;
  name: string;
  event_date: string;
  location: string | null;
  expected_guests: number;
  status: string;
  approval_status: string;
  image_url?: string | null;
};

interface EventHomePageProps {
  events: EventData[];
}

function StatusBadge({ status, type }: { status: string, type: 'status' | 'approval' }) {
  let bgColor = 'bg-gray-100';
  let textColor = 'text-gray-600';

  if (type === 'status') {
    switch (status) {
      case 'Kế hoạch':
        bgColor = 'bg-gray-100';
        textColor = 'text-gray-600';
        break;
      case 'Đã hoàn thành':
        bgColor = 'bg-green-50';
        textColor = 'text-green-600';
        break;
      case 'Đang thực hiện':
        bgColor = 'bg-blue-50';
        textColor = 'text-blue-600';
        break;
      default:
        break;
    }
  } else if (type === 'approval') {
    switch (status) {
      case 'Đã duyệt':
        bgColor = 'bg-emerald-50';
        textColor = 'text-emerald-600';
        break;
      case 'Chờ duyệt':
        bgColor = 'bg-orange-50';
        textColor = 'text-orange-600';
        break;
      case 'Từ chối':
        bgColor = 'bg-red-50';
        textColor = 'text-red-600';
        break;
      default:
        break;
    }
  }

  return (
    <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${bgColor} ${textColor}`}>
      {status}
    </span>
  );
}

export default function EventHomePage({ events }: EventHomePageProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredEvents = events.filter((event) =>
    event.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="w-full">
      {/* Hero Section */}
      <section className="bg-[#2563eb] py-16 px-6 text-white text-center sm:text-left">
        <div className="max-w-6xl mx-auto flex flex-col items-center sm:items-start">
          <h1 className="text-3xl sm:text-4xl font-bold mb-4">Sự kiện Nghiêng Complex</h1>
          <p className="text-blue-100 text-sm sm:text-base max-w-xl">
            Khám phá và đăng ký tham dự các sự kiện, hội thảo, buổi gặp mặt của Tập đoàn Nghiêng Complex.
          </p>
        </div>
      </section>

      {/* Content Section */}
      <section className="max-w-6xl mx-auto px-6 py-8">
        {/* Search Bar */}
        <div className="relative mb-8 max-w-md">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            className="block w-full pl-10 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white shadow-sm"
            placeholder="Tìm sự kiện..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Event Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {filteredEvents.map((event) => (
            <div key={event.id} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
              {/* Card Image */}
              <div className="bg-slate-50 border-b border-gray-100 h-36 flex items-center justify-center p-3 overflow-hidden">
                {event.image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={event.image_url}
                    alt={event.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <SystemLogo className="max-h-24 w-auto object-contain transition-transform hover:scale-105 duration-200" />
                )}
              </div>
              
              {/* Card Content */}
              <div className="p-4 flex flex-col flex-grow">
                {/* Tags */}
                <div className="flex gap-2 mb-3">
                  <StatusBadge status={event.status} type="status" />
                  <StatusBadge status={event.approval_status} type="approval" />
                </div>
                
                {/* Title */}
                <h3 className="font-bold text-gray-900 mb-4 line-clamp-2 leading-snug">
                  {event.name}
                </h3>
                
                {/* Meta details */}
                <div className="flex flex-col gap-2 text-xs text-gray-500 mb-4 flex-grow">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-3.5 h-3.5 flex-shrink-0" />
                    <span>{new Date(event.event_date).toLocaleDateString('vi-VN')}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                    <span className="truncate">{event.location && event.location !== '-' ? event.location : '—'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="w-3.5 h-3.5 flex-shrink-0" />
                    <span>{event.expected_guests} khách dự kiến</span>
                  </div>
                </div>
                
                {/* Footer Link */}
                <div className="mt-auto pt-4 border-t border-gray-50">
                  <Link href={`/su-kien/${event.id}`} className="text-blue-600 text-xs font-semibold hover:underline flex items-center">
                    Xem chi tiết <span className="ml-1">›</span>
                  </Link>
                </div>
              </div>
            </div>
          ))}
          
          {filteredEvents.length === 0 && (
            <div className="col-span-full text-center py-12 text-gray-500">
              Không tìm thấy sự kiện nào phù hợp.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
