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
        OR c.closer_name ILIKE $${idx}
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
        c.contract_date::text AS contract_date_text,
        c.approved_date::text AS approved_date_text,
        COALESCE(NULLIF(BTRIM(c.closer_name), ''), u_closer.full_name) as closer_name,
        COALESCE(NULLIF(BTRIM(c.closer_phone), ''), u_closer.phone) as closer_phone,
        COALESCE(NULLIF(BTRIM(c.referrer_name), ''), u_referrer.full_name) as referrer_name,
        COALESCE(NULLIF(BTRIM(c.referrer_phone), ''), u_referrer.phone) as referrer_phone,
        COALESCE(NULLIF(BTRIM(c.supporter_name), ''), u_supporter.full_name) as supporter_name,
        COALESCE(NULLIF(BTRIM(c.supporter_phone), ''), u_supporter.phone) as supporter_phone
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
          COALESCE(SUM(COALESCE(allocated_value, value, 0)), 0)::numeric AS total_allocated_value,
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
      total_allocated_value: 0,
      total_commission: 0,
      approved_contracts: 0,
    };

    const contracts = contractsRes.rows.map((row) => ({
      ...row,
      contract_date: row.contract_date_text || '',
      approved_date: row.approved_date_text || '',
      created_at: row.created_at ? new Date(row.created_at).toISOString() : '',
    }));

    return Response.json({
      success: true,
      contracts,
      stats: {
        totalContracts: statsRow.total_contracts,
        totalValue: Number(statsRow.total_value),
        totalAllocatedValue: Number(statsRow.total_allocated_value),
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
    await pool.query(`ALTER TABLE contracts ADD COLUMN IF NOT EXISTS customer_phone VARCHAR(50), ADD COLUMN IF NOT EXISTS customer_birth_date DATE`);
    const body = await request.json();
    const {
      contract_code,
      contract_date,
      customer_name,
      customer_phone,
      customer_birth_date,
      value,
      closer_id,
      closer_name,
      closer_phone,
      referrer_id,
      referrer_name,
      referrer_phone,
      supporter_id,
      supporter_name,
      supporter_phone,
      allocated_value,
      team_name,
      contract_type,
      approved_date,
      status,
      notes,
    } = body;

    if (!customer_name || !customer_name.trim()) {
      return Response.json({ success: false, error: 'Tên khách hàng không được để trống' }, { status: 400 });
    }
    if (!contract_date) {
      return Response.json({ success: false, error: 'Ngày ký không được để trống' }, { status: 400 });
    }

    const numValue = Number(value) || 0;
    const allocatedValue = allocated_value === undefined || allocated_value === null || allocated_value === ''
      ? numValue
      : Number(allocated_value) || 0;
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
        customer_phone,
        customer_birth_date,
        value,
        closer_id,
        closer_name,
        closer_phone,
        referrer_id,
        referrer_name,
        referrer_phone,
        supporter_id,
        supporter_name,
        supporter_phone,
        allocated_value,
        closer_fee,
        referrer_fee,
        supporter_fee,
        status,
        team_name,
        contract_type,
        approved_date,
        notes,
        created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, CURRENT_TIMESTAMP)
      RETURNING *, contract_date::text AS contract_date_text, approved_date::text AS approved_date_text
      `,
      [
        typeof contract_code === 'string' && contract_code.trim() ? contract_code.trim() : null,
        contract_date,
        customer_name.trim(),
        customer_phone?.trim() || null,
        customer_birth_date || null,
        numValue,
        closer_id && Number.isInteger(Number(closer_id)) ? Number(closer_id) : null,
        closer_name || null,
        closer_phone || null,
        referrer_id && Number.isInteger(Number(referrer_id)) ? Number(referrer_id) : null,
        referrer_name || null,
        referrer_phone || null,
        supporter_id && Number.isInteger(Number(supporter_id)) ? Number(supporter_id) : null,
        supporter_name || null,
        supporter_phone || null,
        allocatedValue,
        closer_fee,
        referrer_fee,
        supporter_fee,
        status || 'Đã duyệt',
        team_name || null,
        contract_type || null,
        approved_date || null,
        notes || '',
      ]
    );

    return Response.json({
      success: true,
      contract: {
        ...res.rows[0],
        contract_date: res.rows[0].contract_date_text || '',
        approved_date: res.rows[0].approved_date_text || '',
      },
    });
  } catch (error: any) {
    console.error('Error in POST /api/admin/contracts:', error);
    if (error.code === '23505') {
      return Response.json({ success: false, error: 'Mã hợp đồng đã tồn tại trong hệ thống' }, { status: 400 });
    }
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
}
