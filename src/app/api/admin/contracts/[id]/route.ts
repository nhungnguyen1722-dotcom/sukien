import { NextRequest } from 'next/server';
import pool from '@/lib/db';

export const dynamic = 'force-dynamic';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const contractId = parseInt(id, 10);

    if (isNaN(contractId)) {
      return Response.json({ success: false, error: 'ID hợp đồng không hợp lệ' }, { status: 400 });
    }

    const res = await pool.query(
      `
      SELECT 
        c.*,
        c.contract_date::text AS contract_date_text,
        c.approved_date::text AS approved_date_text,
        COALESCE(c.closer_name, u_closer.full_name) as closer_name,
        COALESCE(c.closer_phone, u_closer.phone) as closer_phone,
        COALESCE(c.referrer_name, u_referrer.full_name) as referrer_name,
        COALESCE(c.referrer_phone, u_referrer.phone) as referrer_phone,
        COALESCE(c.supporter_name, u_supporter.full_name) as supporter_name,
        COALESCE(c.supporter_phone, u_supporter.phone) as supporter_phone
      FROM contracts c
      LEFT JOIN users u_closer ON c.closer_id = u_closer.id
      LEFT JOIN users u_referrer ON c.referrer_id = u_referrer.id
      LEFT JOIN users u_supporter ON c.supporter_id = u_supporter.id
      WHERE c.id = $1
      `,
      [contractId]
    );

    if (res.rows.length === 0) {
      return Response.json({ success: false, error: 'Không tìm thấy hợp đồng' }, { status: 404 });
    }

    return Response.json({
      success: true,
      contract: {
        ...res.rows[0],
        contract_date: res.rows[0].contract_date_text || '',
        approved_date: res.rows[0].approved_date_text || '',
      },
    });
  } catch (error: any) {
    console.error('Error in GET /api/admin/contracts/[id]:', error);
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    await pool.query(`ALTER TABLE contracts ADD COLUMN IF NOT EXISTS customer_phone VARCHAR(50), ADD COLUMN IF NOT EXISTS customer_birth_date DATE`);
    const { id } = await params;
    const contractId = parseInt(id, 10);

    if (isNaN(contractId)) {
      return Response.json({ success: false, error: 'ID hợp đồng không hợp lệ' }, { status: 400 });
    }

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
    const closer_fee = body.closer_fee !== undefined ? Number(body.closer_fee) : Math.round(numValue * 0.06);
    const referrer_fee = body.referrer_fee !== undefined ? Number(body.referrer_fee) : Math.round(numValue * 0.01);
    const supporter_fee = body.supporter_fee !== undefined ? Number(body.supporter_fee) : Math.round(numValue * 0.005);

    const res = await pool.query(
      `
      UPDATE contracts
      SET
        contract_code = $1,
        contract_date = $2,
        customer_name = $3,
        customer_phone = $4,
        customer_birth_date = $5,
        value = $6,
        closer_id = $7,
        closer_name = $8,
        closer_phone = $9,
        referrer_id = $10,
        referrer_name = $11,
        referrer_phone = $12,
        supporter_id = $13,
        supporter_name = $14,
        supporter_phone = $15,
        allocated_value = $16,
        closer_fee = $17,
        referrer_fee = $18,
        supporter_fee = $19,
        status = $20,
        team_name = $21,
        contract_type = $22,
        approved_date = $23,
        notes = $24
      WHERE id = $25
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
        contractId,
      ]
    );

    if (res.rows.length === 0) {
      return Response.json({ success: false, error: 'Không tìm thấy hợp đồng để cập nhật' }, { status: 404 });
    }

    return Response.json({
      success: true,
      contract: {
        ...res.rows[0],
        contract_date: res.rows[0].contract_date_text || '',
        approved_date: res.rows[0].approved_date_text || '',
      },
    });
  } catch (error: any) {
    console.error('Error in PUT /api/admin/contracts/[id]:', error);
    if (error.code === '23505') {
      return Response.json({ success: false, error: 'Mã hợp đồng đã tồn tại trong hệ thống' }, { status: 400 });
    }
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const contractId = parseInt(id, 10);

    if (isNaN(contractId)) {
      return Response.json({ success: false, error: 'ID hợp đồng không hợp lệ' }, { status: 400 });
    }

    const res = await pool.query(`DELETE FROM contracts WHERE id = $1 RETURNING id`, [contractId]);

    if (res.rows.length === 0) {
      return Response.json({ success: false, error: 'Không tìm thấy hợp đồng để xóa' }, { status: 404 });
    }

    return Response.json({ success: true, message: 'Xóa hợp đồng thành công' });
  } catch (error: any) {
    console.error('Error in DELETE /api/admin/contracts/[id]:', error);
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
}
