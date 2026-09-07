import pool from '@/lib/db';
import EventHomePage, { EventData } from '@/components/EventHomePage';

export const revalidate = 0;

async function getEvents(): Promise<EventData[]> {
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
    
    return result.rows.map(row => ({
      ...row,
      event_date: row.event_date ? new Date(row.event_date).toISOString() : new Date().toISOString(),
    }));
  } catch (error) {
    console.error('Failed to fetch events:', error);
    return [];
  }
}

export default async function Home() {
  const events = await getEvents();
  
  return <EventHomePage events={events} />;
}
