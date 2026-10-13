import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { SELECT_TRANSACTION_LOGS } from '@/lib/transactionLogs';
import { ensureMemberSchema } from '@/lib/memberTeams';

export const dynamic = 'force-dynamic';

const SELECT_LOG = SELECT_TRANSACTION_LOGS;
const ALLOWED_STATUSES = ['Chờ duyệt', 'Đã duyệt', 'Đã thanh toán', 'Đã thực hiện', 'Đã chi', 'Từ chối'];

export async function GET(request: Request) {
  try {
    await ensureMemberSchema();
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
    await ensureMemberSchema();
    const body = await request.json();
    const rawItems = Array.isArray(body.items) ? body.items : [];
    const items = rawItems.map((item: any, idx: number) => ({
      order: item.order ?? (idx + 1),
      title: String(item.title || item.detail || '').trim(),
      subtitle: String(item.subtitle || '').trim(),
      fundSource: String(item.fundSource || item.fund_source || body.fundSource || '').trim(),
      beneficiaryName: String(item.beneficiaryName || item.beneficiary_name || body.beneficiaryName || '').trim(),
      beneficiaryPhone: item.beneficiaryPhone || item.beneficiary_phone || body.beneficiaryPhone || null,
      beneficiaryBankAccount: item.beneficiaryBankAccount || item.beneficiary_bank_account || body.beneficiaryBankAccount || null,
      beneficiaryBankName: item.beneficiaryBankName || item.beneficiary_bank_name || body.beneficiaryBankName || null,
      beneficiaryUserId: Number.isInteger(Number(item.beneficiaryUserId || item.beneficiary_user_id)) && Number(item.beneficiaryUserId || item.beneficiary_user_id) > 0
        ? Number(item.beneficiaryUserId || item.beneficiary_user_id)
        : null,
      amount: Number(item.amount || 0),
      note: String(item.note || '').trim(),
    })).filter((item: any) => item.title || item.amount > 0);

    const calculatedTotal = items.length > 0
      ? items.reduce((sum: number, it: any) => sum + (Number(it.amount) || 0), 0)
      : Number(body.proposedAmount);

    const code = String(body.requestCode || `YC${String(Date.now()).slice(-5)}`).trim();
    const note = String(body.note || '').trim();
    let detail = String(body.detailContent || '').trim();
    if (!detail && items.length > 0) {
      detail = items.map((it: any, idx: number) => (
        `${idx + 1}. ${it.title}${it.subtitle ? ` (${it.subtitle})` : ''} · ${Number(it.amount).toLocaleString('vi-VN')} đ`
      )).join('\n');
    }

    const amount = Number(calculatedTotal);
    if ((!detail && items.length === 0) || !Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json({ success: false, message: 'Nhập danh sách khoản chi và tổng số tiền đề xuất hợp lệ.' }, { status: 400 });
    }

    const availableBalance = Number(body.availableBalance || 0);
    const fundAlert = amount > availableBalance ? 'Vượt quá tồn quỹ' : 'An toàn';
    const status = ALLOWED_STATUSES.includes(body.status) ? body.status : 'Chờ duyệt';
    const beneficiaryUserId = Number.isInteger(Number(body.beneficiaryUserId)) && Number(body.beneficiaryUserId) > 0
      ? Number(body.beneficiaryUserId)
      : null;
    const beneficiaryBankAccount = String(body.beneficiaryBankAccount || '').trim() || null;
    const beneficiaryBankName = String(body.beneficiaryBankName || body.bankName || '').trim() || null;
    const paidImmediately = ['Đã thanh toán', 'Đã thực hiện', 'Đã chi'].includes(status);
    const approvalDate = ['Đã duyệt', 'Đã thanh toán', 'Đã thực hiện', 'Đã chi'].includes(status)
      ? (body.requestDate || new Date().toISOString().slice(0, 10))
      : null;
    const paymentDate = paidImmediately
      ? (body.requestDate || new Date().toISOString().slice(0, 10))
      : null;

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const inserted = await client.query(
        `INSERT INTO transaction_logs (
          request_code, request_date, fund_source, detail_content,
          requester_id, requester_name, requester_phone, approver_id, approver_name, approver_phone,
          beneficiary_name, beneficiary_phone, beneficiary_user_id, beneficiary_bank_account,
          beneficiary_bank_name,
          proposed_amount, available_balance, fund_alert, status, actual_expense, receipt_url,
          source_complete, expense_type, approval_date, payment_date,
          items, note
        ) VALUES (
          $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,TRUE,'Thủ công',
          $22, $23, $24::jsonb, $25
        )
        RETURNING id`,
        [
          code,
          body.requestDate || new Date().toISOString().slice(0, 10),
          body.fundSource || (items[0]?.fundSource || 'Quỹ Sự kiện & Chốt hợp đồng'),
          detail,
          body.requesterId || null,
          body.requesterName || '',
          body.requesterPhone || null,
          body.approverId || null,
          body.approverName || '',
          body.approverPhone || null,
          body.beneficiaryName || (items[0]?.beneficiaryName || ''),
          body.beneficiaryPhone || (items[0]?.beneficiaryPhone || null),
          beneficiaryUserId || items[0]?.beneficiaryUserId || null,
          beneficiaryBankAccount || (items[0]?.beneficiaryBankAccount || null),
          beneficiaryBankName || (items[0]?.beneficiaryBankName || null),
          amount,
          availableBalance,
          fundAlert,
          status,
          paidImmediately ? Number(body.actualExpense ?? amount) : 0,
          body.receiptUrl || null,
          approvalDate,
          paymentDate,
          JSON.stringify(items),
          note || null,
        ]
      );

      const logId = inserted.rows[0].id;

      // Insert line items into relational table
      for (const item of items) {
        await client.query(
          `INSERT INTO transaction_log_items (
            transaction_log_id, item_order, title, subtitle, fund_source,
            beneficiary_name, beneficiary_phone, beneficiary_bank_account,
            beneficiary_bank_name, beneficiary_user_id, amount, note
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
          [
            logId,
            item.order,
            item.title,
            item.subtitle || null,
            item.fundSource || null,
            item.beneficiaryName || null,
            item.beneficiaryPhone || null,
            item.beneficiaryBankAccount || null,
            item.beneficiaryBankName || null,
            item.beneficiaryUserId || null,
            item.amount,
            item.note || null,
          ]
        );
      }

      await client.query('COMMIT');

      const log = await pool.query(`${SELECT_LOG} WHERE tl.id = $1`, [logId]);
      return NextResponse.json({ success: true, log: log.rows[0] }, { status: 201 });
    } catch (dbErr) {
      await client.query('ROLLBACK');
      throw dbErr;
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error('API POST transaction log error:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    await ensureMemberSchema();
    const body = await request.json();
    if (!body.id) return NextResponse.json({ success: false, message: 'Thiếu mã phiếu.' }, { status: 400 });
    if (body.status && !ALLOWED_STATUSES.includes(body.status)) {
      return NextResponse.json({ success: false, message: 'Trạng thái phiếu không hợp lệ.' }, { status: 400 });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const rawItems = Array.isArray(body.items) ? body.items : null;
      let itemsUpdateSql = '';
      const params: any[] = [
        body.status || null,
        body.approverName || '',
        body.actualExpense == null ? null : Number(body.actualExpense),
        body.id,
      ];

      if (rawItems) {
        const items = rawItems.map((item: any, idx: number) => ({
          order: item.order ?? (idx + 1),
          title: String(item.title || item.detail || '').trim(),
          subtitle: String(item.subtitle || '').trim(),
          fundSource: String(item.fundSource || item.fund_source || '').trim(),
          beneficiaryName: String(item.beneficiaryName || item.beneficiary_name || '').trim(),
          beneficiaryPhone: item.beneficiaryPhone || item.beneficiary_phone || null,
          beneficiaryBankAccount: item.beneficiaryBankAccount || item.beneficiary_bank_account || null,
          beneficiaryBankName: item.beneficiaryBankName || item.beneficiary_bank_name || null,
          beneficiaryUserId: Number(item.beneficiaryUserId || item.beneficiary_user_id) || null,
          amount: Number(item.amount || 0),
          note: String(item.note || '').trim(),
        }));

        const totalAmount = items.reduce((sum: number, it: any) => sum + (Number(it.amount) || 0), 0);
        params.push(JSON.stringify(items));
        params.push(totalAmount);
        itemsUpdateSql = `, items = $5::jsonb, proposed_amount = $6`;

        // Sync items table
        await client.query(`DELETE FROM transaction_log_items WHERE transaction_log_id = $1`, [body.id]);
        for (const item of items) {
          await client.query(
            `INSERT INTO transaction_log_items (
              transaction_log_id, item_order, title, subtitle, fund_source,
              beneficiary_name, beneficiary_phone, beneficiary_bank_account,
              beneficiary_bank_name, beneficiary_user_id, amount, note
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
            [
              body.id,
              item.order,
              item.title,
              item.subtitle || null,
              item.fundSource || null,
              item.beneficiaryName || null,
              item.beneficiaryPhone || null,
              item.beneficiaryBankAccount || null,
              item.beneficiaryBankName || null,
              item.beneficiaryUserId || null,
              item.amount,
              item.note || null,
            ]
          );
        }
      }

      const result = await client.query(
        `UPDATE transaction_logs
         SET status = COALESCE($1, status),
             approver_name = COALESCE(NULLIF($2, ''), approver_name),
             approval_date = CASE WHEN $1 = 'Đã duyệt' AND approval_date IS NULL THEN CURRENT_DATE ELSE approval_date END,
             payment_date = CASE WHEN $1 IN ('Đã thanh toán', 'Đã thực hiện', 'Đã chi') AND payment_date IS NULL THEN CURRENT_DATE ELSE payment_date END,
             actual_expense = CASE WHEN $1 IN ('Đã thanh toán', 'Đã thực hiện', 'Đã chi') THEN COALESCE($3, proposed_amount, 0) ELSE actual_expense END
             ${itemsUpdateSql}
         WHERE id = $4
         RETURNING id`,
        params
      );

      if (!result.rowCount) {
        await client.query('ROLLBACK');
        return NextResponse.json({ success: false, message: 'Không tìm thấy phiếu.' }, { status: 404 });
      }

      await client.query('COMMIT');

      const log = await pool.query(`${SELECT_LOG} WHERE tl.id = $1`, [body.id]);
      return NextResponse.json({ success: true, log: log.rows[0] });
    } catch (dbErr) {
      await client.query('ROLLBACK');
      throw dbErr;
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error('API PUT transaction log error:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    await ensureMemberSchema();
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
