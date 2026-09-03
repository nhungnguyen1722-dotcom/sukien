import pool from '@/lib/db';
import EventHomePage, { EventData } from '@/components/EventHomePage';

export const revalidate = 0;

async function getEvents(): Promise<EventData[]> {
  try {
    const result = await pool.query(`
      SELECT id, name, event_date, location, expected_guests, status, approval_status 
      FROM events 
      ORDER BY event_date ASC
    `);
    
    return result.rows.map(row => ({
      ...row,
      event_date: row.event_date.toISOString(),
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
