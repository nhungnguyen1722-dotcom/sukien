'use client';

import React, { useState } from 'react';
import EventHomePage, { EventData } from './EventHomePage';
import QRCheckinModal from './QRCheckinModal';

interface InviterInfo {
  name: string;
  refCode: string;
  id?: number | null;
}

interface QRCheckinClientProps {
  events: EventData[];
  inviter: InviterInfo;
  selectedEventId?: string;
}

export default function QRCheckinClient({ events, inviter, selectedEventId }: QRCheckinClientProps) {
  const [isModalOpen, setIsModalOpen] = useState(true);

  // Chọn đúng sự kiện được truyền qua URL query param ?event=... (Mục 8)
  const matchedEvent = selectedEventId
    ? events.find(
        (e) =>
          String(e.id) === String(selectedEventId) ||
          (e.code && e.code.toLowerCase() === selectedEventId.toLowerCase()) ||
          `EVT2026${String(e.id).padStart(4, '0')}`.toLowerCase() === selectedEventId.toLowerCase()
      )
    : null;

  const defaultEvent = matchedEvent || (events.length > 0 ? events[0] : {
    id: 38,
    name: 'TIỆC TRÀ',
    code: 'EVT20260038',
    event_date: '2026-09-19',
    start_time: '08:30',
    end_time: '11:30',
    location: 'Công ty CP Tập đoàn Nghiêng Complex ML6-23 Vinhomes Green Bay đường Lương Thế Vinh, phường Đại Mỗ, TP Hà Nội',
    image_url: '/events/hero-banner.jpg',
  });

  return (
    <>
      {/* Background Event Home Page */}
      <EventHomePage events={events} />

      {/* Auto-opened QR Check-in Modal matching image2.jpeg */}
      <QRCheckinModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        inviter={inviter}
        defaultEvent={defaultEvent}
      />
    </>
  );
}
