import { NextRequest } from 'next/server';
import pool from '@/lib/db';
import { normalizeTrainingTokenRate } from '@/lib/trainingTokenRate';

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

    settings.training_token_rate = normalizeTrainingTokenRate(settings.training_token_rate);

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

    if (key === 'training_token_rate') {
      const rate = Number(value);
      if (!Number.isSafeInteger(rate) || rate <= 0 || rate > 1_000_000_000) {
        return Response.json({ success: false, error: 'Tỷ giá Token phải là số nguyên dương hợp lệ.' }, { status: 400 });
      }

      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const currentRateResult = await client.query(
          "SELECT value FROM system_settings WHERE key = 'training_token_rate' FOR UPDATE"
        );
        const currentRate = normalizeTrainingTokenRate(currentRateResult.rows[0]?.value);
        await client.query(
          `UPDATE training_logs
           SET reward_amount = token_count * $1
           WHERE reward_amount IS NULL`,
          [currentRate]
        );
        await client.query(`
          INSERT INTO system_settings (key, value, description, updated_at)
          VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
          ON CONFLICT (key) DO UPDATE SET
            value = EXCLUDED.value,
            description = COALESCE(EXCLUDED.description, system_settings.description),
            updated_at = CURRENT_TIMESTAMP
        `, [key, String(rate), description || 'Giá trị quy đổi của một Token (VNĐ)']);
        await client.query('UPDATE training_courses SET budget = token_value * $1', [rate]);
        await client.query('COMMIT');
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }

      return Response.json({ success: true, key, value: rate });
    }

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
