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
        u_closer.full_name as closer_name,
        u_referrer.full_name as referrer_name,
        u_supporter.full_name as supporter_name
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

    return Response.json({ success: true, contract: res.rows[0] });
  } catch (error: any) {
    console.error('Error in GET /api/admin/contracts/[id]:', error);
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
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
        value = $4,
        closer_id = $5,
        referrer_id = $6,
        supporter_id = $7,
        closer_fee = $8,
        referrer_fee = $9,
        supporter_fee = $10,
        status = $11,
        notes = $12
      WHERE id = $13
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
        contractId,
      ]
    );

    if (res.rows.length === 0) {
      return Response.json({ success: false, error: 'Không tìm thấy hợp đồng để cập nhật' }, { status: 404 });
    }

    return Response.json({ success: true, contract: res.rows[0] });
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
