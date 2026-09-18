import pool from '@/lib/db';
import LuckyWheelList, { LuckyWheel } from '@/components/admin/LuckyWheelList';

export const revalidate = 0;

async function getWheelData() {
  try {
    const [wheelsRes, eventsRes] = await Promise.all([
      pool.query(`SELECT * FROM lucky_wheels ORDER BY id DESC`),
      pool.query(`SELECT id, name FROM events ORDER BY id DESC`),
    ]);

    const wheels: LuckyWheel[] = wheelsRes.rows.map((row) => ({
      ...row,
      quantity: Number(row.quantity || 1),
      spins_count: Number(row.spins_count || 0),
      is_active: Boolean(row.is_active),
    }));

    return {
      wheels,
      events: eventsRes.rows,
    };
  } catch (error) {
    console.error('Error fetching lucky wheels:', error);
    return {
      wheels: [],
      events: [],
    };
  }
}

export default async function VongQuayPage() {
  const { wheels, events } = await getWheelData();

  return <LuckyWheelList initialWheels={wheels} events={events} />;
}
