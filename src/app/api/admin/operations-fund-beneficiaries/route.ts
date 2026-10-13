import { NextRequest } from 'next/server';
import pool from '@/lib/db';
import { isTeamLeadAdmin } from '@/lib/teamlead';
import { safeDecodeURI } from '@/lib/authUtils';
import { ensureOperationsFundBeneficiaries } from '@/lib/operationsFundBeneficiaries';

export const dynamic = 'force-dynamic';

function unauthorized() {
  return Response.json({ success: false, error: 'Chỉ quản trị viên mới được chỉnh sửa phân bổ bộ phận.' }, { status: 403 });
}

function normalizedPayload(body: Record<string, unknown>) {
  const department = typeof body.department === 'string' ? body.department.trim() : '';
  const fullName = typeof body.full_name === 'string' ? body.full_name.trim() : '';
  const phone = typeof body.phone === 'string' ? body.phone.trim() : '';
  const bankAccount = typeof body.bank_account === 'string' ? body.bank_account.trim() : '';
  const bankName = typeof body.bank_name === 'string' ? body.bank_name.trim() : '';
  const weeklyRate = Number(body.weekly_rate);
  const monthlyRate = Number(body.monthly_rate);

  if (!department || !fullName) return { error: 'Bộ phận và họ tên người thụ hưởng là bắt buộc.' };
  if (!Number.isFinite(weeklyRate) || weeklyRate < 0 || weeklyRate > 1
    || !Number.isFinite(monthlyRate) || monthlyRate < 0 || monthlyRate > 1) {
    return { error: 'Tỷ lệ phân bổ phải nằm trong khoảng từ 0% đến 100%.' };
  }

  return { department, fullName, phone, bankAccount, bankName, weeklyRate, monthlyRate };
}

export async function PUT(request: NextRequest) {
  if (!isTeamLeadAdmin(request)) return unauthorized();

  try {
    await ensureOperationsFundBeneficiaries();
    const id = Number(new URL(request.url).searchParams.get('id'));
    if (!Number.isInteger(id) || id <= 0) {
      return Response.json({ success: false, error: 'Dòng phân bổ không hợp lệ.' }, { status: 400 });
    }

    const body = await request.json() as Record<string, unknown>;
    const values = normalizedPayload(body);
    if ('error' in values) return Response.json({ success: false, error: values.error }, { status: 400 });

    const actor = safeDecodeURI(request.cookies.get('user_name')?.value) || null;
    const result = await pool.query(
      `UPDATE operations_fund_beneficiaries
       SET department = $1, full_name = $2, phone = $3, bank_account = $4,
           bank_name = $5, weekly_rate = $6, monthly_rate = $7,
           updated_by = $8, updated_at = CURRENT_TIMESTAMP
       WHERE id = $9
       RETURNING id, department_key, fund_key, department, full_name, phone,
         bank_account, bank_name, weekly_rate::float8 AS weekly_rate,
         monthly_rate::float8 AS monthly_rate, effective_from::text AS effective_from`,
      [values.department, values.fullName, values.phone, values.bankAccount, values.bankName,
        values.weeklyRate, values.monthlyRate, actor, id],
    );
    if (!result.rowCount) {
      return Response.json({ success: false, error: 'Không tìm thấy dòng phân bổ.' }, { status: 404 });
    }
    return Response.json({ success: true, beneficiary: result.rows[0] });
  } catch (error) {
    console.error('Failed to update operations fund beneficiary:', error);
    return Response.json({ success: false, error: 'Không thể cập nhật dòng phân bổ.' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  if (!isTeamLeadAdmin(request)) return unauthorized();

  try {
    const body = await request.json() as Record<string, unknown>;
    const departmentKey = typeof body.department_key === 'string' ? body.department_key.trim() : '';
    const fundKey = typeof body.fund_key === 'string' ? body.fund_key.trim() : '';
    const fundSource = typeof body.fund_source === 'string' ? body.fund_source.trim() : '';
    const effectiveFrom = typeof body.effective_from === 'string' ? body.effective_from.trim() : '';
    const values = normalizedPayload(body);
    if ('error' in values) return Response.json({ success: false, error: values.error }, { status: 400 });
    if (!departmentKey || !fundKey || !fundSource || !/^\d{4}-\d{2}-\d{2}$/.test(effectiveFrom)) {
      return Response.json({ success: false, error: 'Bộ phận, loại quỹ và ngày hiệu lực hợp lệ là bắt buộc.' }, { status: 400 });
    }

    await ensureOperationsFundBeneficiaries();
    const actor = safeDecodeURI(request.cookies.get('user_name')?.value) || null;
    const result = await pool.query(
      `INSERT INTO operations_fund_beneficiaries (
        department_key, fund_key, fund_source, department, full_name, phone, bank_account,
        bank_name, weekly_rate, monthly_rate, effective_from, created_by, updated_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11::date, $12, $12)
      RETURNING id, department_key, fund_key, department, full_name, phone, bank_account,
        bank_name, weekly_rate::float8 AS weekly_rate, monthly_rate::float8 AS monthly_rate,
        effective_from::text AS effective_from`,
      [departmentKey, fundKey, fundSource, values.department, values.fullName, values.phone,
        values.bankAccount, values.bankName, values.weeklyRate, values.monthlyRate, effectiveFrom, actor],
    );
    return Response.json({ success: true, beneficiary: result.rows[0] }, { status: 201 });
  } catch (error) {
    if (typeof error === 'object' && error !== null && 'code' in error && error.code === '23505') {
      return Response.json({ success: false, error: 'Đã có dòng phân bổ cho bộ phận tại ngày hiệu lực này.' }, { status: 409 });
    }
    console.error('Failed to create operations fund beneficiary:', error);
    return Response.json({ success: false, error: 'Không thể tạo dòng phân bổ.' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  if (!isTeamLeadAdmin(request)) return unauthorized();

  try {
    await ensureOperationsFundBeneficiaries();
    const id = Number(new URL(request.url).searchParams.get('id'));
    if (!Number.isInteger(id) || id <= 0) {
      return Response.json({ success: false, error: 'Dòng phân bổ không hợp lệ.' }, { status: 400 });
    }

    const result = await pool.query(
      'DELETE FROM operations_fund_beneficiaries WHERE id = $1 RETURNING id',
      [id],
    );
    if (!result.rowCount) {
      return Response.json({ success: false, error: 'Không tìm thấy dòng phân bổ.' }, { status: 404 });
    }
    return Response.json({ success: true });
  } catch (error) {
    console.error('Failed to delete operations fund beneficiary:', error);
    return Response.json({ success: false, error: 'Không thể xóa dòng phân bổ.' }, { status: 500 });
  }
}
