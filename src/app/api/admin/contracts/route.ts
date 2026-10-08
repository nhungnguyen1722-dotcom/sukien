import { NextRequest } from 'next/server';
import pool from '@/lib/db';
import { ensureTeamLeadSchema } from '@/lib/teamlead';
import { ensureMemberSchema, UNIFIED_TEAM_NAME_SQL } from '@/lib/memberTeams';
import { generateAutomaticContractSlips } from '@/lib/transactionLogs';
import { sanitizeVietnameseText } from '@/lib/nameSanitizer';

export const dynamic = 'force-dynamic';


export async function GET(request: NextRequest) {
  try {
    await ensureTeamLeadSchema();
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || '';
    const closerId = searchParams.get('closer_id') || '';
    const year = Number(searchParams.get('year')) || 0;
    const month = Number(searchParams.get('month')) || 0;
    const week = Number(searchParams.get('week')) || 0;
    const fromDate = searchParams.get('from_date') || '';
    const toDate = searchParams.get('to_date') || '';

    const conditions: string[] = [];
    const values: any[] = [];
    let idx = 1;

    if (search) {
      conditions.push(`(
        c.contract_code ILIKE $${idx} 
        OR c.customer_name ILIKE $${idx} 
        OR c.customer_phone ILIKE $${idx}
        OR c.customer_address ILIKE $${idx}
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

    if (year >= 2000 && year <= 2200) {
      conditions.push('EXTRACT(YEAR FROM c.contract_date) = $' + idx);
      values.push(year);
      idx++;
    }

    if (month >= 1 && month <= 12) {
      conditions.push('EXTRACT(MONTH FROM c.contract_date) = $' + idx);
      values.push(month);
      idx++;
    }

    if (week >= 1 && week <= 5) {
      const firstDay = (week - 1) * 7 + 1;
      const lastDay = week === 5 ? 31 : week * 7;
      conditions.push('EXTRACT(DAY FROM c.contract_date) BETWEEN $' + idx + ' AND $' + (idx + 1));
      values.push(firstDay, lastDay);
      idx += 2;
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

    const paymentConditions = ["status = 'Đã chi'"];
    const paymentValues: any[] = [];
    let paymentIdx = 1;
    const paymentDate = 'COALESCE(payment_date, request_date)';

    if (year >= 2000 && year <= 2200) {
      paymentConditions.push(`EXTRACT(YEAR FROM ${paymentDate}) = $${paymentIdx}`);
      paymentValues.push(year);
      paymentIdx++;
    }

    if (month >= 1 && month <= 12) {
      paymentConditions.push(`EXTRACT(MONTH FROM ${paymentDate}) = $${paymentIdx}`);
      paymentValues.push(month);
      paymentIdx++;
    }

    if (week >= 1 && week <= 5) {
      const firstDay = (week - 1) * 7 + 1;
      const lastDay = week === 5 ? 31 : week * 7;
      paymentConditions.push(`EXTRACT(DAY FROM ${paymentDate}) BETWEEN $${paymentIdx} AND $${paymentIdx + 1}`);
      paymentValues.push(firstDay, lastDay);
      paymentIdx += 2;
    }

    if (fromDate) {
      paymentConditions.push(`${paymentDate} >= $${paymentIdx}`);
      paymentValues.push(fromDate);
      paymentIdx++;
    }

    if (toDate) {
      paymentConditions.push(`${paymentDate} <= $${paymentIdx}`);
      paymentValues.push(toDate);
    }

    const paymentWhereClause = `WHERE ${paymentConditions.join(' AND ')}`;

    const query = `
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
          ELSE COALESCE(NULLIF(BTRIM(c.closer_name), ''), u_closer.full_name)
        END as closer_name,
        COALESCE(NULLIF(BTRIM(c.closer_phone), ''), u_closer.phone) as closer_phone,
        c.referrer_id,
        CASE 
          WHEN c.referrer_name = 'Chu Th? L??ng' THEN 'Chu Thị Lương'
          WHEN c.referrer_name LIKE '%?%' AND u_referrer.full_name IS NOT NULL THEN u_referrer.full_name
          ELSE COALESCE(NULLIF(BTRIM(c.referrer_name), ''), u_referrer.full_name)
        END as referrer_name,
        COALESCE(NULLIF(BTRIM(c.referrer_phone), ''), u_referrer.phone) as referrer_phone,
        c.supporter_id,
        CASE 
          WHEN c.supporter_name = 'V? Th? C?c' THEN 'Vũ Thị Cúc'
          WHEN c.supporter_name = 'Nguy?n H?ng V?' THEN 'Nguyễn Hùng Vĩ'
          WHEN c.supporter_name LIKE '%?%' AND u_supporter.full_name IS NOT NULL THEN u_supporter.full_name
          ELSE COALESCE(NULLIF(BTRIM(c.supporter_name), ''), u_supporter.full_name)
        END as supporter_name,
        COALESCE(NULLIF(BTRIM(c.supporter_phone), ''), u_supporter.phone) as supporter_phone,
        c.team_name,
        c.contract_type,
        c.closer_fee,
        c.referrer_fee,
        c.supporter_fee,
        CASE WHEN c.status = 'Ch? duy?t' THEN 'Chờ duyệt' ELSE c.status END as status,
        c.created_at
      FROM contracts c
      LEFT JOIN users u_closer ON c.closer_id = u_closer.id
      LEFT JOIN users u_referrer ON c.referrer_id = u_referrer.id
      LEFT JOIN users u_supporter ON c.supporter_id = u_supporter.id
      ${whereClause}
      ORDER BY c.contract_date DESC, c.id DESC
    `;

    const statsQuery = `
      SELECT
        COUNT(*)::int AS total_contracts,
        COALESCE(SUM(c.value), 0)::numeric AS total_value,
        COALESCE(SUM(COALESCE(c.closer_fee, 0) + COALESCE(c.referrer_fee, 0) + COALESCE(c.supporter_fee, 0)), 0)::numeric AS total_commission,
        COUNT(CASE WHEN c.status IN ('Đã duyệt', 'Da duyệt', 'Da duy?t') THEN 1 END)::int AS approved_contracts,
        COALESCE(SUM(COALESCE(c.allocated_value, c.value)), 0)::numeric AS allocation_base
      FROM contracts c
      LEFT JOIN users u_closer ON c.closer_id = u_closer.id
      ${whereClause}
    `;

    const [contractsRes, statsRes, closersRes, usersRes, teamsRes, actualFundSpendingRes] = await Promise.all([
      pool.query(query, values),
      pool.query(statsQuery, values),
      pool.query(`
        SELECT DISTINCT u.id, u.full_name 
        FROM contracts c
        JOIN users u ON c.closer_id = u.id
        ORDER BY u.full_name ASC
      `),
      pool.query(`
        SELECT 
          u.id, 
          u.full_name, 
          u.phone, 
          u.referrer_id,
          r.full_name AS referrer_name,
          r.phone AS referrer_phone,
          u.referral_group,
          ${UNIFIED_TEAM_NAME_SQL} AS team_name
        FROM users u
        LEFT JOIN users r ON u.referrer_id = r.id
        LEFT JOIN teams t ON u.team_id = t.id
        WHERE u.status != 'Tạm khóa'
        ORDER BY u.full_name ASC
      `),
      pool.query(`
        SELECT id, BTRIM(name) AS name
        FROM teamlead_teams
        WHERE NULLIF(BTRIM(name), '') IS NOT NULL
          AND name NOT LIKE '%?%'
        ORDER BY name ASC
      `),
      pool.query(`
        SELECT fund_source, COALESCE(SUM(actual_expense), 0)::float8 AS actual_spent
        FROM transaction_logs
        ${paymentWhereClause}
        GROUP BY fund_source
      `, paymentValues),
    ]);

    const statsRow = statsRes.rows[0] || {
      total_contracts: 0,
      total_value: 0,
      total_commission: 0,
      approved_contracts: 0,
      allocation_base: 0,
    };

    const contracts = contractsRes.rows.map((row) => ({
      ...row,
      closer_name: sanitizeVietnameseText(row.closer_name),
      referrer_name: sanitizeVietnameseText(row.referrer_name),
      supporter_name: sanitizeVietnameseText(row.supporter_name),
      status: sanitizeVietnameseText(row.status),
      contract_date: row.contract_date_text || '',
      created_at: row.created_at ? new Date(row.created_at).toISOString() : '',
    }));

    return Response.json({
      success: true,
      contracts,
      actualFundSpending: actualFundSpendingRes.rows,
      allocationBase: Number(statsRow.allocation_base),
      stats: {
        totalContracts: statsRow.total_contracts,
        totalValue: Number(statsRow.total_value),
        totalCommission: Number(statsRow.total_commission),
        approvedContracts: Number(statsRow.approved_contracts),
      },
      closers: closersRes.rows,
      users: usersRes.rows,
      teams: teamsRes.rows,
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
    const allocatedValue = numValue;
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
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, 'Đã duyệt', $20, $21, NULL, NULL, CURRENT_TIMESTAMP)
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
        allocatedValue,
        closer_fee,
        referrer_fee,
        supporter_fee,
        normalizedTeamName || null,
        contract_type || null,
      ]
    );

    try {
      await generateAutomaticContractSlips();
    } catch (slipErr) {
      console.error('Failed to generate automatic transaction slips for contract:', slipErr);
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
    console.error('Error in POST /api/admin/contracts:', error);
    if (error.code === '23505') {
      return Response.json({ success: false, error: 'Mã hợp đồng đã tồn tại trong hệ thống' }, { status: 400 });
    }
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
}


