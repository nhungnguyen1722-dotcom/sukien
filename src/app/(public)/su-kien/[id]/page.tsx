import { notFound } from 'next/navigation';
import pool from '@/lib/db';
import PublicEventDetailClient from '@/components/PublicEventDetailClient';

export const revalidate = 0;

interface EventDetailProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function EventDetailPage({ params }: EventDetailProps) {
  const { id } = await params;
  
  let eventId = parseInt(id);
  if (isNaN(eventId)) {
    // Fallback for Base44-style hash IDs
    if (id === '6a8fddfa6b74280edb94560e') {
      eventId = 1;
    } else if (id === '6a9254fd7194452499f20df3') {
      eventId = 2;
    } else {
      // Try lookup by code
      try {
        const codeRes = await pool.query('SELECT id FROM events WHERE code = $1 LIMIT 1', [id]);
        if (codeRes.rows.length > 0) {
          eventId = codeRes.rows[0].id;
        } else {
          const firstRes = await pool.query('SELECT id FROM events ORDER BY id ASC LIMIT 1');
          eventId = firstRes.rows.length > 0 ? firstRes.rows[0].id : 0;
        }
      } catch {
        eventId = 1;
      }
    }
  }

  let event = null;
  let schedules: Array<{
    id: number | string;
    time: string;
    title: string;
    speaker: string;
    description?: string;
  }> = [];
  let inChargePersons: Array<any> = [];
  let registrationCount = 0;
  try {
    const [result, schedRes, inChargeRes, regCountRes] = await Promise.all([
      pool.query(`
        SELECT 
          id, name, code, short_description, detail_description, content,
          event_date, start_time::text, end_time::text,
          location, event_format, fee,
          registration_deadline, expected_guests,
          event_type, status, approval_status,
          image_url, notes,
          mc_fee, speaker_fee, support_fee, closer_fee, tea_break_fee
        FROM events 
        WHERE id = $1
      `, [eventId]),
      pool.query(`
        SELECT id, time, title, speaker, description, order_num
        FROM event_schedules
        WHERE event_id = $1
        ORDER BY order_num ASC, id ASC
      `, [eventId]),
      pool.query(`
        SELECT id, full_name, position, phone, email, avatar, roles, status
        FROM event_in_charge
        WHERE event_id = $1
        ORDER BY id ASC
      `, [eventId]),
      pool.query(`
        SELECT COUNT(*)::int AS count
        FROM event_registrations
        WHERE event_id = $1
      `, [eventId]),
    ]);
    
    if (result.rows.length > 0) {
      const rawEvent = result.rows[0];
      let currentStatus = rawEvent.status;

      // Real-time status auto-check: if past end time according to real timezone, change to 'Đã diễn ra'
      if (rawEvent.event_date && currentStatus !== 'Đã hủy' && currentStatus !== 'Hủy' && currentStatus !== 'Đã diễn ra') {
        try {
          const eDate = new Date(rawEvent.event_date);
          const endTimeStr = rawEvent.end_time || '23:59:59';
          const [h, m] = endTimeStr.split(':').map(Number);
          eDate.setHours(isNaN(h) ? 23 : h, isNaN(m) ? 59 : m, 59, 999);
          if (new Date() > eDate) {
            currentStatus = 'Đã diễn ra';
            pool.query(`UPDATE events SET status = 'Đã diễn ra', updated_at = NOW() WHERE id = $1`, [eventId]).catch(() => {});
          }
        } catch (err) {
          console.error('Error auto-updating event status:', err);
        }
      }

      event = {
        ...rawEvent,
        status: currentStatus,
        event_date: rawEvent.event_date ? new Date(rawEvent.event_date).toISOString() : null,
      };
    }
    schedules = schedRes.rows;
    inChargePersons = inChargeRes.rows.map((p: any) => ({
      ...p,
      roles: Array.isArray(p.roles) ? p.roles : (p.roles ? [p.roles] : []),
    }));
    // Thống kê số khách mời đồng bộ: Khách đăng ký & check-in + Người phụ trách (Mục 7)
    const rawRegCount = regCountRes.rows[0]?.count || 0;
    registrationCount = rawRegCount + inChargePersons.length;
    if (event) {
      event.expected_guests = registrationCount;
    }
  } catch (error) {
    console.error('Failed to fetch event:', error);
  }

  if (!event) {
    notFound();
  }

  return <PublicEventDetailClient event={event} initialSchedules={schedules} inChargePersons={inChargePersons} registrationCount={registrationCount} />;
}
