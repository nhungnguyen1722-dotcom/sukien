import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { SELECT_TRANSACTION_LOGS } from '@/lib/transactionLogs';

export const dynamic = 'force-dynamic';

const SELECT_LOG = SELECT_TRANSACTION_LOGS;
const ALLOWED_STATUSES = ['Chờ duyệt', 'Đã duyệt', 'Đã thanh toán', 'Đã thực hiện', 'Đã chi', 'Từ chối'];

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const fund = searchParams.get('fund');
    const status = searchParams.get('status');
    const search = searchParams.get('search');
    const params: unknown[] = [];
    let query = SELECT_LOG + ' WHERE 1=1';

    if (fund && fund !== 'all') {
      params.push(fund);
      query += ` AND fund_source = $${params.length}`;
    }
    if (status && status !== 'all') {
      params.push(status);
      query += ` AND status = $${params.length}`;
    }
    if (search) {
      params.push(`%${search}%`);
      query += ` AND (request_code ILIKE $${params.length} OR detail_content ILIKE $${params.length} OR requester_name ILIKE $${params.length} OR beneficiary_name ILIKE $${params.length})`;
    }
    query += ' ORDER BY request_date DESC NULLS LAST, id DESC';
    const result = await pool.query(query, params);
    return NextResponse.json({ success: true, logs: result.rows });
  } catch (error: any) {
    console.error('API GET transaction logs error:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const code = String(body.requestCode || `YC${String(Date.now()).slice(-5)}`).trim();
    const detail = String(body.detailContent || '').trim();
    const amount = Number(body.proposedAmount);
    if (!detail || !Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json({ success: false, message: 'Nhập nội dung và số tiền đề xuất hợp lệ.' }, { status: 400 });
    }

    const availableBalance = Number(body.availableBalance || 0);
    const fundAlert = amount > availableBalance ? 'Vượt quá tồn quỹ' : 'An toàn';
    const status = ALLOWED_STATUSES.includes(body.status) ? body.status : 'Chờ duyệt';
    const beneficiaryUserId = Number.isInteger(Number(body.beneficiaryUserId)) && Number(body.beneficiaryUserId) > 0
      ? Number(body.beneficiaryUserId)
      : null;
    const beneficiaryBankAccount = String(body.beneficiaryBankAccount || '').trim() || null;
    const paidImmediately = ['Đã thanh toán', 'Đã thực hiện', 'Đã chi'].includes(status);
    const inserted = await pool.query(
      `INSERT INTO transaction_logs (
        request_code, request_date, fund_source, detail_content,
        requester_id, requester_name, requester_phone, approver_id, approver_name, approver_phone,
        beneficiary_name, beneficiary_phone, beneficiary_user_id, beneficiary_bank_account,
        proposed_amount, available_balance, fund_alert, status, actual_expense, receipt_url,
        source_complete, expense_type, approval_date, payment_date
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,TRUE,'Thủ công',
        CASE WHEN $18 IN ('Đã duyệt', 'Đã thanh toán', 'Đã thực hiện', 'Đã chi') THEN CURRENT_DATE ELSE NULL END,
        CASE WHEN $18 IN ('Đã thanh toán', 'Đã thực hiện', 'Đã chi') THEN CURRENT_DATE ELSE NULL END)
      RETURNING id`,
      [
        code,
        body.requestDate || new Date().toISOString().slice(0, 10),
        body.fundSource || 'Quỹ Sự kiện & Chốt hợp đồng',
        detail,
        body.requesterId || null,
        body.requesterName || '',
        body.requesterPhone || null,
        body.approverId || null,
        body.approverName || '',
        body.approverPhone || null,
        body.beneficiaryName || '',
        body.beneficiaryPhone || null,
        beneficiaryUserId,
        beneficiaryBankAccount,
        amount,
        availableBalance,
        fundAlert,
        status,
        paidImmediately ? Number(body.actualExpense ?? amount) : 0,
        body.receiptUrl || null,
      ]
    );
    const log = await pool.query(`${SELECT_LOG} WHERE id = $1`, [inserted.rows[0].id]);
    return NextResponse.json({ success: true, log: log.rows[0] }, { status: 201 });
  } catch (error: any) {
    console.error('API POST transaction log error:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    if (!body.id) return NextResponse.json({ success: false, message: 'Thiếu mã phiếu.' }, { status: 400 });
    if (body.status && !ALLOWED_STATUSES.includes(body.status)) {
      return NextResponse.json({ success: false, message: 'Trạng thái phiếu không hợp lệ.' }, { status: 400 });
    }
    const result = await pool.query(
      `UPDATE transaction_logs
       SET status = COALESCE($1, status),
           approver_name = COALESCE(NULLIF($2, ''), approver_name),
           approval_date = CASE WHEN $1 = 'Đã duyệt' AND approval_date IS NULL THEN CURRENT_DATE ELSE approval_date END,
           payment_date = CASE WHEN $1 IN ('Đã thanh toán', 'Đã thực hiện', 'Đã chi') AND payment_date IS NULL THEN CURRENT_DATE ELSE payment_date END,
           actual_expense = CASE WHEN $1 IN ('Đã thanh toán', 'Đã thực hiện', 'Đã chi') THEN COALESCE($3, proposed_amount, 0) ELSE actual_expense END
       WHERE id = $4
       RETURNING id`,
      [body.status || null, body.approverName || '', body.actualExpense == null ? null : Number(body.actualExpense), body.id]
    );
    if (!result.rowCount) return NextResponse.json({ success: false, message: 'Không tìm thấy phiếu.' }, { status: 404 });
    const log = await pool.query(`${SELECT_LOG} WHERE id = $1`, [body.id]);
    return NextResponse.json({ success: true, log: log.rows[0] });
  } catch (error: any) {
    console.error('API PUT transaction log error:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ success: false, message: 'Thiếu mã phiếu.' }, { status: 400 });
    await pool.query('DELETE FROM transaction_logs WHERE id = $1', [id]);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('API DELETE transaction log error:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
