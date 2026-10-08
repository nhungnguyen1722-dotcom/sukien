import { NextRequest } from 'next/server';
import pool from '@/lib/db';
import { ensureTeamLeadSchema } from '@/lib/teamlead';
import { generateAutomaticContractSlips } from '@/lib/transactionLogs';
import { sanitizeVietnameseText } from '@/lib/nameSanitizer';

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
        c.id,
        c.contract_code,
        c.contract_date,
        c.contract_date::text AS contract_date_text,
        c.customer_name,
        c.customer_phone,
        c.customer_address,
        c.value,
        c.closer_id,
        CASE 
          WHEN c.closer_name = 'Nguy?n H?ng V?' THEN 'Nguyễn Hùng Vĩ'
          WHEN c.closer_name LIKE '%?%' AND u_closer.full_name IS NOT NULL THEN u_closer.full_name
          ELSE COALESCE(c.closer_name, u_closer.full_name)
        END as closer_name,
        COALESCE(c.closer_phone, u_closer.phone) as closer_phone,
        c.referrer_id,
        CASE 
          WHEN c.referrer_name = 'Chu Th? L??ng' THEN 'Chu Thị Lương'
          WHEN c.referrer_name LIKE '%?%' AND u_referrer.full_name IS NOT NULL THEN u_referrer.full_name
          ELSE COALESCE(c.referrer_name, u_referrer.full_name)
        END as referrer_name,
        COALESCE(c.referrer_phone, u_referrer.phone) as referrer_phone,
        c.supporter_id,
        CASE 
          WHEN c.supporter_name = 'V? Th? C?c' THEN 'Vũ Thị Cúc'
          WHEN c.supporter_name = 'Nguy?n H?ng V?' THEN 'Nguyễn Hùng Vĩ'
          WHEN c.supporter_name LIKE '%?%' AND u_supporter.full_name IS NOT NULL THEN u_supporter.full_name
          ELSE COALESCE(c.supporter_name, u_supporter.full_name)
        END as supporter_name,
        COALESCE(c.supporter_phone, u_supporter.phone) as supporter_phone,
        c.team_name,
        c.contract_type,
        c.created_at
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

    const contractRow = res.rows[0];
    return Response.json({
      success: true,
      contract: {
        ...contractRow,
        closer_name: sanitizeVietnameseText(contractRow.closer_name),
        referrer_name: sanitizeVietnameseText(contractRow.referrer_name),
        supporter_name: sanitizeVietnameseText(contractRow.supporter_name),
        contract_date: contractRow.contract_date_text || '',
      },
    });
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
      customer_phone,
      customer_address,
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
      team_name,
      contract_type,
    } = body;

    if (!customer_name || !customer_name.trim()) {
      return Response.json({ success: false, error: 'Tên khách hàng không được để trống' }, { status: 400 });
    }
    if (!contract_date) {
      return Response.json({ success: false, error: 'Ngày ký không được để trống' }, { status: 400 });
    }

    let normalizedTeamName = typeof team_name === 'string' ? team_name.trim() : '';
    if (normalizedTeamName) {
      await ensureTeamLeadSchema();
      const teamResult = await pool.query(
        `SELECT BTRIM(name) AS name FROM teamlead_teams WHERE LOWER(BTRIM(name)) = LOWER(BTRIM($1)) LIMIT 1`,
        [normalizedTeamName]
      );
      if (!teamResult.rows.length) {
        return Response.json({ success: false, error: 'Đội nhóm chưa có trong danh sách TeamLead. Hãy thêm đội nhóm ở phân hệ TeamLead trước.' }, { status: 400 });
      }
      normalizedTeamName = teamResult.rows[0].name;
    }

    const numValue = Number(value) || 0;

    const res = await pool.query(
      `
      UPDATE contracts
      SET
        contract_code = $1,
        contract_date = $2,
        customer_name = $3,
        customer_phone = $4,
        customer_address = $5,
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
        team_name = $16,
        contract_type = $17
      WHERE id = $18
      RETURNING *, contract_date::text AS contract_date_text, approved_date::text AS approved_date_text
      `,
      [
        typeof contract_code === 'string' && contract_code.trim() ? contract_code.trim() : null,
        contract_date,
        customer_name.trim(),
        customer_phone ? String(customer_phone).trim() : null,
        customer_address ? String(customer_address).trim() : null,
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
        normalizedTeamName || null,
        contract_type || null,
        contractId,
      ]
    );

    if (res.rows.length === 0) {
      return Response.json({ success: false, error: 'Không tìm thấy hợp đồng để cập nhật' }, { status: 404 });
    }

    try {
      await generateAutomaticContractSlips();
    } catch (slipErr) {
      console.error('Failed to update automatic transaction slips:', slipErr);
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
