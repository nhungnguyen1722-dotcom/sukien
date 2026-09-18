import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const fund = searchParams.get('fund');
    const status = searchParams.get('status');
    const search = searchParams.get('search');

    let query = `
      SELECT 
        id, request_code, request_date, fund_source, detail_content,
        requester_id, requester_name, approver_id, approver_name,
        beneficiary_name, proposed_amount, available_balance,
        fund_alert, status, actual_expense, receipt_url, created_at
      FROM transaction_logs
      WHERE 1=1
    `;
    const params: any[] = [];

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
      query += ` AND (
        request_code ILIKE $${params.length} OR
        detail_content ILIKE $${params.length} OR
        requester_name ILIKE $${params.length} OR
        beneficiary_name ILIKE $${params.length}
      )`;
    }

    query += ` ORDER BY request_date DESC, id DESC`;

    const res = await pool.query(query, params);

    // Calculate stats
    const statsRes = await pool.query(`
      SELECT 
        fund_source,
        COALESCE(SUM(CASE WHEN status = 'Đã duyệt' THEN proposed_amount ELSE 0 END), 0)::numeric as used_amount
      FROM transaction_logs
      GROUP BY fund_source
    `);

    // Predefined 6 funds
    const fundBudgets: Record<string, { percent: number; total: number; color: string }> = {
      'Quỹ Chăm sóc khách hàng': { percent: 35, total: 52500000, color: '#2563eb' },
      'Quỹ Sự kiện & Chốt HĐ': { percent: 20, total: 30000000, color: '#ec4899' },
      'Quỹ Đào tạo Kỹ năng': { percent: 15, total: 22500000, color: '#8b5cf6' },
      'Quỹ Thi đua & Thúc đẩy': { percent: 10, total: 15000000, color: '#f59e0b' },
      'Quỹ Công tác phí': { percent: 10, total: 15000000, color: '#10b981' },
      'Quỹ Vận hành gián tiếp': { percent: 10, total: 15000000, color: '#06b6d4' },
    };

    const fundMap: Record<string, any> = {};
    let totalUsed = 0;

    Object.keys(fundBudgets).forEach((k) => {
      fundMap[k] = {
        name: k,
        percent: fundBudgets[k].percent,
        total: fundBudgets[k].total,
        used: 0,
        color: fundBudgets[k].color,
      };
    });

    statsRes.rows.forEach((r) => {
      // Find matching fund key
      const key = Object.keys(fundBudgets).find((k) => k.toLowerCase().includes(r.fund_source.toLowerCase()) || r.fund_source.toLowerCase().includes(k.toLowerCase())) || r.fund_source;
      const amt = Number(r.used_amount || 0);
      if (fundMap[key]) {
        fundMap[key].used += amt;
      }
      totalUsed += amt;
    });

    const totalBudget = 150000000;
    const remaining = Math.max(0, totalBudget - totalUsed);

    const logs = res.rows.map((row) => ({
      ...row,
      proposed_amount: Number(row.proposed_amount || 0),
      available_balance: Number(row.available_balance || 0),
      actual_expense: Number(row.actual_expense || 0),
      request_date: row.request_date ? new Date(row.request_date).toISOString().split('T')[0] : '',
    }));

    return NextResponse.json({
      success: true,
      logs,
      stats: {
        totalBudget,
        totalUsed,
        totalRemaining: remaining,
        fundMap,
      },
    });
  } catch (error: any) {
    console.error('API GET transaction_logs error:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      requestCode,
      requestDate,
      fundSource,
      detailContent,
      requesterId,
      requesterName,
      approverId,
      approverName,
      beneficiaryName,
      proposedAmount,
      availableBalance,
      receiptUrl,
    } = body;

    const code = requestCode || `YC${String(Date.now()).slice(-4)}`;
    const propAmt = Number(proposedAmount || 0);
    const availBal = Number(availableBalance || 0);
    const alertStatus = propAmt > availBal ? 'Vượt quá tồn quỹ' : 'An toàn';

    const insertRes = await pool.query(
      `
      INSERT INTO transaction_logs (
        request_code, request_date, fund_source, detail_content,
        requester_id, requester_name, approver_id, approver_name,
        beneficiary_name, proposed_amount, available_balance, fund_alert,
        status, actual_expense, receipt_url
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      RETURNING *
    `,
      [
        code,
        requestDate || new Date().toISOString().split('T')[0],
        fundSource || 'Quỹ Chăm sóc khách hàng',
        detailContent || '',
        requesterId || 'TV001',
        requesterName || 'Kế toán',
        approverId || 'QL01',
        approverName || 'Vũ Thị Cúc',
        beneficiaryName || 'Khách hàng',
        propAmt,
        availBal,
        alertStatus,
        'Chờ duyệt',
        0,
        receiptUrl || null,
      ]
    );

    return NextResponse.json({ success: true, log: insertRes.rows[0] });
  } catch (error: any) {
    console.error('API POST transaction_logs error:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, status, approverName, actualExpense } = body;

    if (!id) {
      return NextResponse.json({ success: false, message: 'Missing log ID' }, { status: 400 });
    }

    const updateRes = await pool.query(
      `
      UPDATE transaction_logs
      SET 
        status = COALESCE($1, status),
        approver_name = COALESCE($2, approver_name),
        actual_expense = CASE WHEN $1 = 'Đã duyệt' THEN proposed_amount ELSE COALESCE($3, actual_expense) END
      WHERE id = $4
      RETURNING *
    `,
      [status, approverName, actualExpense, id]
    );

    return NextResponse.json({ success: true, log: updateRes.rows[0] });
  } catch (error: any) {
    console.error('API PUT transaction_logs error:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, message: 'Missing log ID' }, { status: 400 });
    }

    await pool.query('DELETE FROM transaction_logs WHERE id = $1', [id]);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('API DELETE transaction_logs error:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
