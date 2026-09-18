import pool from '@/lib/db';
import LuckyWheelSpin from '@/components/admin/LuckyWheelSpin';
import { LuckyWheel } from '@/components/admin/LuckyWheelList';

export const revalidate = 0;

async function getSpinPageData() {
  try {
    const [wheelsRes, spinsRes, membersRes, guestsRes] = await Promise.all([
      pool.query(`SELECT * FROM lucky_wheels ORDER BY is_active DESC, id DESC`),
      pool.query(`SELECT * FROM lucky_wheel_spins ORDER BY spun_at DESC, id DESC LIMIT 50`),
      pool.query(`
        SELECT id, full_name, phone, ref_code
        FROM users 
        WHERE status != 'Tạm khóa'
        ORDER BY id ASC
        LIMIT 60
      `),
      pool.query(`
        SELECT id, full_name, phone
        FROM event_registrations
        ORDER BY id DESC
        LIMIT 40
      `),
    ]);

    const wheels: LuckyWheel[] = wheelsRes.rows.map((row) => ({
      ...row,
      quantity: Number(row.quantity || 1),
      spins_count: Number(row.spins_count || 0),
      is_active: Boolean(row.is_active),
    }));

    const activeWheel = wheels.find((w) => w.is_active) || wheels[0];

    const spins = spinsRes.rows.map((r) => ({
      ...r,
      spun_at: r.spun_at ? new Date(r.spun_at).toISOString() : '',
    }));

    const participants = [
      ...membersRes.rows.map((m) => ({
        id: `m_${m.id}`,
        name: m.full_name,
        phone: m.phone,
        code: m.ref_code || `#${String(m.id).padStart(3, '0')}`,
        type: 'Thành viên',
      })),
      ...guestsRes.rows.map((g) => ({
        id: `g_${g.id}`,
        name: g.full_name,
        phone: g.phone,
        code: `#KM${String(g.id).padStart(3, '0')}`,
        type: 'Khách mời',
      })),
    ];

    return {
      wheels,
      activeWheel,
      spins,
      participants,
    };
  } catch (error) {
    console.error('Error fetching spin page data:', error);
    return {
      wheels: [],
      activeWheel: undefined,
      spins: [],
      participants: [],
    };
  }
}

export default async function QuayVongPage() {
  const { wheels, activeWheel, spins, participants } = await getSpinPageData();

  return (
    <LuckyWheelSpin
      wheels={wheels}
      initialActiveWheel={activeWheel}
      initialSpins={spins}
      participants={participants}
    />
  );
}
