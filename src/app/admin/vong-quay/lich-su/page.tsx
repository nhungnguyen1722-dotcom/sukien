import pool from '@/lib/db';
import LuckyWheelHistory from '@/components/admin/LuckyWheelHistory';

export const revalidate = 0;

async function getSpinsHistory() {
  try {
    const res = await pool.query(`
      SELECT * FROM lucky_wheel_spins 
      ORDER BY spun_at DESC, id DESC 
      LIMIT 200
    `);

    const spins = res.rows.map((r) => ({
      ...r,
      spun_at: r.spun_at ? new Date(r.spun_at).toISOString() : '',
    }));

    return spins;
  } catch (error) {
    console.error('Error fetching spin history:', error);
    return [];
  }
}

export default async function LichSuVongQuayPage() {
  const spins = await getSpinsHistory();

  return <LuckyWheelHistory initialSpins={spins} />;
}
