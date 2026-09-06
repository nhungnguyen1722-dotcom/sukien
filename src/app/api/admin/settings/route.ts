import { NextRequest } from 'next/server';
import pool from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const res = await pool.query('SELECT key, value, description FROM system_settings');
    const settings: Record<string, any> = {};
    for (const row of res.rows) {
      if (row.key === 'fixed_fees') {
        try {
          settings[row.key] = JSON.parse(row.value);
        } catch {
          settings[row.key] = row.value;
        }
      } else {
        settings[row.key] = row.value;
      }
    }

    if (!settings.system_logo) {
      settings.system_logo = '/logo-nghieng.png';
    }
    if (!settings.fixed_fees) {
      settings.fixed_fees = {
        support_fee: 200000,
        mc_fee: 200000,
        speaker_fee: 300000,
        closer_fee: 200000,
        tea_break_fee: 1250000,
      };
    }

    return Response.json({ success: true, settings });
  } catch (error: any) {
    console.error('Error fetching system settings:', error);
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { key, value, description } = body;

    if (!key) {
      return Response.json({ success: false, error: 'Thiếu key cài đặt' }, { status: 400 });
    }

    const valueStr = typeof value === 'object' ? JSON.stringify(value) : String(value);

    await pool.query(`
      INSERT INTO system_settings (key, value, description, updated_at)
      VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
      ON CONFLICT (key) DO UPDATE SET
        value = EXCLUDED.value,
        description = COALESCE(EXCLUDED.description, system_settings.description),
        updated_at = CURRENT_TIMESTAMP;
    `, [key, valueStr, description || null]);

    return Response.json({ success: true, key, value });
  } catch (error: any) {
    console.error('Error updating system settings:', error);
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
}
