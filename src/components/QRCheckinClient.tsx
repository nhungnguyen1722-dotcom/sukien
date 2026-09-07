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
}

export default function QRCheckinClient({ events, inviter }: QRCheckinClientProps) {
  const [isModalOpen, setIsModalOpen] = useState(true);

  const defaultEvent = events.length > 0 ? events[0] : {
    id: 1,
    name: 'Hội thảo Kết nối Doanh nghiệp 2024',
    event_date: '2026-05-30',
    start_time: '08:30',
    end_time: '11:30',
    location: 'Trung tâm Hội nghị Quốc gia, 57 Phạm Hùng, Hà Nội',
  };

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
