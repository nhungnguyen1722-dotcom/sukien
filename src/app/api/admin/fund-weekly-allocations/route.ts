import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const periodCode = searchParams.get('period_code');
    const month = searchParams.get('month');

    let query = `
      SELECT id, period_code, period_month, period_label, period_start::text AS period_start,
        period_end::text AS period_end, fund_key, fund_source,
        allocation_rate::float8 AS allocation_rate,
        requested_amount::float8 AS requested_amount,
        COALESCE(allocated_amount, 0)::float8 AS allocated_amount,
        COALESCE(paid_amount, 0)::float8 AS paid_amount,
        COALESCE(remaining_amount, 0)::float8 AS remaining_amount,
        source_sheet
      FROM fund_weekly_allocations
      WHERE 1=1
    `;
    const params: any[] = [];
    if (periodCode) {
      params.push(periodCode);
      query += ` AND period_code = $${params.length}`;
    }
    if (month) {
      params.push(month);
      query += ` AND period_month = $${params.length}`;
    }
    query += ` ORDER BY period_start, id`;

    const result = await pool.query(query, params);
    return NextResponse.json({ success: true, data: result.rows });
  } catch (error: any) {
    console.error('Error fetching fund_weekly_allocations:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { period_code, updates } = body as {
      period_code: string;
      updates: Array<{ fund_key: string; paid_amount: number }>;
    };

    if (!period_code || !Array.isArray(updates) || updates.length === 0) {
      return NextResponse.json({ success: false, error: 'Thiếu period_code hoặc danh sách cập nhật' }, { status: 400 });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const updatedRows: any[] = [];

      for (const item of updates) {
        const paid = Number(item.paid_amount) || 0;
        const res = await client.query(
          `
          UPDATE fund_weekly_allocations
          SET paid_amount = $1,
              remaining_amount = COALESCE(allocated_amount, requested_amount, 0) - $1
          WHERE period_code = $2 AND fund_key = $3
          RETURNING id, period_code, period_month, period_label, period_start::text AS period_start,
            period_end::text AS period_end, fund_key, fund_source,
            allocation_rate::float8 AS allocation_rate,
            requested_amount::float8 AS requested_amount,
            allocated_amount::float8 AS allocated_amount,
            paid_amount::float8 AS paid_amount,
            remaining_amount::float8 AS remaining_amount,
            source_sheet
        `,
          [paid, period_code, item.fund_key]
        );
        if (res.rows.length > 0) {
          updatedRows.push(res.rows[0]);
        }
      }

      await client.query('COMMIT');
      return NextResponse.json({ success: true, updated: updatedRows });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error('Error updating fund_weekly_allocations:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
