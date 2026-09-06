import { NextRequest } from 'next/server';
import pool from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || '';
    const closerId = searchParams.get('closer_id') || '';
    const fromDate = searchParams.get('from_date') || '';
    const toDate = searchParams.get('to_date') || '';

    const conditions: string[] = [];
    const values: any[] = [];
    let idx = 1;

    if (search) {
      conditions.push(`(
        c.contract_code ILIKE $${idx} 
        OR c.customer_name ILIKE $${idx} 
        OR u_closer.full_name ILIKE $${idx}
      )`);
      values.push(`%${search}%`);
      idx++;
    }

    if (status && status !== 'Tất cả') {
      conditions.push(`c.status = $${idx}`);
      values.push(status);
      idx++;
    }

    if (closerId && closerId !== 'Tất cả') {
      conditions.push(`c.closer_id = $${idx}`);
      values.push(parseInt(closerId, 10));
      idx++;
    }

    if (fromDate) {
      conditions.push(`c.contract_date >= $${idx}`);
      values.push(fromDate);
      idx++;
    }

    if (toDate) {
      conditions.push(`c.contract_date <= $${idx}`);
      values.push(toDate);
      idx++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const query = `
      SELECT 
        c.*,
        u_closer.full_name as closer_name,
        u_referrer.full_name as referrer_name,
        u_supporter.full_name as supporter_name
      FROM contracts c
      LEFT JOIN users u_closer ON c.closer_id = u_closer.id
      LEFT JOIN users u_referrer ON c.referrer_id = u_referrer.id
      LEFT JOIN users u_supporter ON c.supporter_id = u_supporter.id
      ${whereClause}
      ORDER BY c.contract_date DESC, c.id DESC
    `;

    const [contractsRes, statsRes, closersRes, usersRes] = await Promise.all([
      pool.query(query, values),
      pool.query(`
        SELECT 
          COUNT(*)::int AS total_contracts,
          COALESCE(SUM(value), 0)::numeric AS total_value,
          COALESCE(SUM(COALESCE(closer_fee, 0) + COALESCE(referrer_fee, 0) + COALESCE(supporter_fee, 0)), 0)::numeric AS total_commission,
          COUNT(CASE WHEN status = 'Đã duyệt' THEN 1 END)::int AS approved_contracts
        FROM contracts
      `),
      pool.query(`
        SELECT DISTINCT u.id, u.full_name 
        FROM contracts c
        JOIN users u ON c.closer_id = u.id
        ORDER BY u.full_name ASC
      `),
      pool.query(`SELECT id, full_name, phone FROM users WHERE status != 'Tạm khóa' ORDER BY full_name ASC`),
    ]);

    const statsRow = statsRes.rows[0] || {
      total_contracts: 0,
      total_value: 0,
      total_commission: 0,
      approved_contracts: 0,
    };

    const contracts = contractsRes.rows.map((row) => ({
      ...row,
      contract_date: row.contract_date ? new Date(row.contract_date).toISOString().split('T')[0] : '',
      created_at: row.created_at ? new Date(row.created_at).toISOString() : '',
    }));

    return Response.json({
      success: true,
      contracts,
      stats: {
        totalContracts: statsRow.total_contracts,
        totalValue: Number(statsRow.total_value),
        totalCommission: Number(statsRow.total_commission),
        approvedContracts: statsRow.approved_contracts,
      },
      closers: closersRes.rows,
      users: usersRes.rows,
    });
  } catch (error: any) {
    console.error('Error in GET /api/admin/contracts:', error);
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      contract_code,
      contract_date,
      customer_name,
      value,
      closer_id,
      referrer_id,
      supporter_id,
      status,
      notes,
    } = body;

    if (!contract_code || !contract_code.trim()) {
      return Response.json({ success: false, error: 'Mã hợp đồng không được để trống' }, { status: 400 });
    }
    if (!customer_name || !customer_name.trim()) {
      return Response.json({ success: false, error: 'Tên khách hàng không được để trống' }, { status: 400 });
    }
    if (!contract_date) {
      return Response.json({ success: false, error: 'Ngày ký không được để trống' }, { status: 400 });
    }

    const numValue = Number(value) || 0;
    // Rule: Chốt sale 6%, Giới thiệu 1%, Hỗ trợ chốt 0.5%
    const closer_fee = body.closer_fee !== undefined ? Number(body.closer_fee) : Math.round(numValue * 0.06);
    const referrer_fee = body.referrer_fee !== undefined ? Number(body.referrer_fee) : Math.round(numValue * 0.01);
    const supporter_fee = body.supporter_fee !== undefined ? Number(body.supporter_fee) : Math.round(numValue * 0.005);

    const res = await pool.query(
      `
      INSERT INTO contracts (
        contract_code,
        contract_date,
        customer_name,
        value,
        closer_id,
        referrer_id,
        supporter_id,
        closer_fee,
        referrer_fee,
        supporter_fee,
        status,
        notes,
        created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, CURRENT_TIMESTAMP)
      RETURNING *
      `,
      [
        contract_code.trim(),
        contract_date,
        customer_name.trim(),
        numValue,
        closer_id ? parseInt(closer_id, 10) : null,
        referrer_id ? parseInt(referrer_id, 10) : null,
        supporter_id ? parseInt(supporter_id, 10) : null,
        closer_fee,
        referrer_fee,
        supporter_fee,
        status || 'Đã duyệt',
        notes || '',
      ]
    );

    return Response.json({
      success: true,
      contract: res.rows[0],
    });
  } catch (error: any) {
    console.error('Error in POST /api/admin/contracts:', error);
    if (error.code === '23505') {
      return Response.json({ success: false, error: 'Mã hợp đồng đã tồn tại trong hệ thống' }, { status: 400 });
    }
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
}
