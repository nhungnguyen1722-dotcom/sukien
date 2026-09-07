import pool from '@/lib/db';
import QRCheckinClient from '@/components/QRCheckinClient';
import { EventData } from '@/components/EventHomePage';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface PageProps {
  searchParams: Promise<{
    ref?: string;
  }>;
}

export default async function QRCheckinPage({ searchParams }: PageProps) {
  const { ref } = await searchParams;
  const refCode = ref?.trim() || 'REF_CUC12';

  // 1. Resolve inviter info
  let inviter = {
    name: 'Vũ Thị Cúc',
    refCode: refCode,
    id: null as number | null,
  };

  try {
    const userRes = await pool.query(
      `SELECT id, full_name, ref_code, phone FROM users WHERE ref_code = $1 OR phone = $1 LIMIT 1`,
      [refCode]
    );

    if (userRes.rows.length > 0) {
      const u = userRes.rows[0];
      inviter = {
        name: u.full_name,
        refCode: u.ref_code || refCode,
        id: u.id,
      };
    } else {
      // Named standard fallbacks according to docx & mockups
      if (refCode.toUpperCase().includes('SALE001') || refCode.toUpperCase().includes('AN')) {
        inviter = {
          name: 'Nguyễn Văn An',
          refCode: 'SALE001',
          id: 3,
        };
      } else if (refCode.toUpperCase().includes('CUC') || refCode.toUpperCase().includes('REF_CUC12')) {
        inviter = {
          name: 'Vũ Thị Cúc',
          refCode: 'REF_CUC12',
          id: 1,
        };
      }
    }
  } catch (error) {
    console.error('Error resolving inviter:', error);
  }

  // 2. Fetch events
  let events: EventData[] = [];
  try {
    const result = await pool.query(`
      SELECT 
        id, 
        name, 
        code,
        event_date, 
        start_time::text, 
        end_time::text, 
        location, 
        expected_guests, 
        status, 
        approval_status, 
        image_url,
        short_description,
        detail_description,
        fee
      FROM events 
      ORDER BY id ASC
    `);

    events = result.rows.map((row) => ({
      ...row,
      event_date: row.event_date ? new Date(row.event_date).toISOString() : new Date().toISOString(),
    }));
  } catch (error) {
    console.error('Failed to fetch events for qr-checkin:', error);
  }

  return <QRCheckinClient events={events} inviter={inviter} />;
}
