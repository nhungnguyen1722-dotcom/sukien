import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action') || 'list';

    if (action === 'list') {
      const wheelsRes = await pool.query(`
        SELECT * FROM lucky_wheels ORDER BY id DESC
      `);
      return NextResponse.json({ success: true, wheels: wheelsRes.rows });
    }

    if (action === 'active') {
      const activeRes = await pool.query(`
        SELECT * FROM lucky_wheels WHERE is_active = true LIMIT 1
      `);
      let activeWheel = activeRes.rows[0];
      if (!activeWheel) {
        const firstRes = await pool.query(`
          SELECT * FROM lucky_wheels ORDER BY id ASC LIMIT 1
        `);
        activeWheel = firstRes.rows[0];
      }
      return NextResponse.json({ success: true, wheel: activeWheel });
    }

    if (action === 'spins') {
      const wheelId = searchParams.get('wheel_id');
      let query = `SELECT * FROM lucky_wheel_spins`;
      const params: any[] = [];
      if (wheelId) {
        params.push(wheelId);
        query += ` WHERE wheel_id = $1`;
      }
      query += ` ORDER BY spun_at DESC, id DESC LIMIT 100`;

      const spinsRes = await pool.query(query, params);
      return NextResponse.json({ success: true, spins: spinsRes.rows });
    }

    if (action === 'events') {
      const eventsRes = await pool.query(`
        SELECT id, name, event_date, location FROM events ORDER BY id DESC
      `);
      return NextResponse.json({ success: true, events: eventsRes.rows });
    }

    if (action === 'participants') {
      // Get recent members and guests
      const membersRes = await pool.query(`
        SELECT id, full_name as name, phone, ref_code as code, 'Thành viên' as type
        FROM users 
        WHERE status != 'Tạm khóa'
        ORDER BY id ASC
        LIMIT 50
      `);

      const guestsRes = await pool.query(`
        SELECT id, full_name as name, phone, '' as code, 'Khách mời' as type
        FROM event_registrations
        ORDER BY id DESC
        LIMIT 50
      `);

      const participants = [
        ...membersRes.rows.map((m) => ({
          id: `m_${m.id}`,
          name: m.name,
          phone: m.phone,
          code: m.code || `TV${String(m.id).padStart(3, '0')}`,
          type: m.type,
        })),
        ...guestsRes.rows.map((g) => ({
          id: `g_${g.id}`,
          name: g.name,
          phone: g.phone,
          code: `KM${String(g.id).padStart(3, '0')}`,
          type: g.type,
        })),
      ];

      return NextResponse.json({ success: true, participants });
    }

    return NextResponse.json({ success: false, message: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    console.error('API GET lucky-wheel error:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action } = body;

    if (action === 'create_wheel') {
      const {
        name,
        description,
        rewardText,
        quantity,
        eventName,
        status,
        slices,
        coreColor,
        arrowColor,
        borderColor,
      } = body;

      const slicesJson = JSON.stringify(slices || []);

      const insertRes = await pool.query(
        `
        INSERT INTO lucky_wheels (
          name, description, reward_text, quantity, event_name, status,
          slices_json, core_color, arrow_color, border_color, spins_count, is_active
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 0, false)
        RETURNING *
      `,
        [
          name || 'Vòng quay mới',
          description || '',
          rewardText || 'Quà tặng',
          quantity || 1,
          eventName || null,
          status || 'Sắp diễn ra',
          slicesJson,
          coreColor || '#1e3a8a',
          arrowColor || '#f59e0b',
          borderColor || '#1e3a8a',
        ]
      );

      return NextResponse.json({ success: true, wheel: insertRes.rows[0] });
    }

    if (action === 'spin') {
      const { wheelId, participantName, participantPhone, participantCode, prize } = body;

      if (!wheelId || !participantName || !prize) {
        return NextResponse.json(
          { success: false, message: 'Thiếu thông tin quay thưởng' },
          { status: 400 }
        );
      }

      // 1. Get wheel name
      const wheelRes = await pool.query('SELECT name FROM lucky_wheels WHERE id = $1', [wheelId]);
      const wheelName = wheelRes.rows[0]?.name || 'Vòng quay';

      // 2. Insert spin log
      const spinRes = await pool.query(
        `
        INSERT INTO lucky_wheel_spins (
          wheel_id, wheel_name, participant_name, participant_phone, participant_code, prize, spun_at, status
        ) VALUES ($1, $2, $3, $4, $5, $6, NOW(), 'Đã nhận thưởng')
        RETURNING *
      `,
        [wheelId, wheelName, participantName, participantPhone || '', participantCode || '', prize]
      );

      // 3. Increment spins_count on wheel
      await pool.query(
        `UPDATE lucky_wheels SET spins_count = spins_count + 1 WHERE id = $1`,
        [wheelId]
      );

      return NextResponse.json({ success: true, spin: spinRes.rows[0] });
    }

    return NextResponse.json({ success: false, message: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    console.error('API POST lucky-wheel error:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { action, wheelId } = body;

    if (action === 'set_active') {
      if (!wheelId) {
        return NextResponse.json({ success: false, message: 'Missing wheelId' }, { status: 400 });
      }

      // Deactivate all, activate selected
      await pool.query('UPDATE lucky_wheels SET is_active = false');
      await pool.query('UPDATE lucky_wheels SET is_active = true WHERE id = $1', [wheelId]);

      return NextResponse.json({ success: true });
    }

    if (action === 'update_wheel') {
      const { id, name, description, rewardText, quantity, status, eventName } = body;
      await pool.query(
        `
        UPDATE lucky_wheels
        SET 
          name = COALESCE($1, name),
          description = COALESCE($2, description),
          reward_text = COALESCE($3, reward_text),
          quantity = COALESCE($4, quantity),
          status = COALESCE($5, status),
          event_name = COALESCE($6, event_name)
        WHERE id = $7
      `,
        [name, description, rewardText, quantity, status, eventName, id]
      );

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ success: false, message: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    console.error('API PUT lucky-wheel error:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, message: 'Missing wheel ID' }, { status: 400 });
    }

    await pool.query('DELETE FROM lucky_wheels WHERE id = $1', [id]);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('API DELETE lucky-wheel error:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
