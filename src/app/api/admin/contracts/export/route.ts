import { NextRequest } from 'next/server';
import pool from '@/lib/db';
import { createContractsWorkbook } from '@/lib/contract-export-xlsx';
import { sanitizeVietnameseText } from '@/lib/nameSanitizer';

export const dynamic = 'force-dynamic';

function formatDate(dateValue: string | Date | null | undefined): string {
  if (!dateValue) return '';
  const value = dateValue instanceof Date ? dateValue.toISOString() : String(dateValue);
  const dateParts = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (dateParts) return `${dateParts[3]}/${dateParts[2]}/${dateParts[1]}`;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('vi-VN', {
    timeZone: 'Asia/Bangkok',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
}

function dateStamp(): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Bangkok',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());
  const part = (type: string) => parts.find((item) => item.type === type)?.value || '';
  return `${part('year')}-${part('month')}-${part('day')}`;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search')?.trim() || '';
    const status = searchParams.get('status') || '';
    const closerId = Number(searchParams.get('closer_id')) || 0;
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
        OR COALESCE(NULLIF(BTRIM(c.closer_name), ''), u_closer.full_name) ILIKE $${idx}
        OR COALESCE(NULLIF(BTRIM(c.referrer_name), ''), u_referrer.full_name) ILIKE $${idx}
      )`);
      values.push(`%${search}%`);
      idx += 1;
    }

    if (status && status !== 'Tất cả') {
      conditions.push(`c.status = $${idx}`);
      values.push(status);
      idx += 1;
    }

    if (closerId > 0) {
      conditions.push(`c.closer_id = $${idx}`);
      values.push(closerId);
      idx += 1;
    }

    if (fromDate) {
      conditions.push(`c.contract_date >= $${idx}`);
      values.push(fromDate);
      idx += 1;
    }

    if (toDate) {
      conditions.push(`c.contract_date <= $${idx}`);
      values.push(toDate);
    }

    const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const result = await pool.query(`
      SELECT
        c.id,
        c.contract_code,
        c.contract_type,
        c.contract_date::text AS contract_date_text,
        c.customer_name,
        c.customer_phone,
        c.customer_address,
        c.value,
        CASE 
          WHEN c.closer_name = 'Nguy?n H?ng V?' THEN 'Nguyễn Hùng Vĩ'
          WHEN c.closer_name LIKE '%?%' AND u_closer.full_name IS NOT NULL THEN u_closer.full_name
          ELSE COALESCE(NULLIF(BTRIM(c.closer_name), ''), u_closer.full_name)
        END AS closer_name,
        COALESCE(NULLIF(BTRIM(c.closer_phone), ''), u_closer.phone) AS closer_phone,
        CASE 
          WHEN c.referrer_name = 'Chu Th? L??ng' THEN 'Chu Thị Lương'
          WHEN c.referrer_name LIKE '%?%' AND u_referrer.full_name IS NOT NULL THEN u_referrer.full_name
          ELSE COALESCE(NULLIF(BTRIM(c.referrer_name), ''), u_referrer.full_name)
        END AS referrer_name,
        COALESCE(NULLIF(BTRIM(c.referrer_phone), ''), u_referrer.phone) AS referrer_phone,
        CASE 
          WHEN c.supporter_name = 'V? Th? C?c' THEN 'Vũ Thị Cúc'
          WHEN c.supporter_name = 'Nguy?n H?ng V?' THEN 'Nguyễn Hùng Vĩ'
          WHEN c.supporter_name LIKE '%?%' AND u_supporter.full_name IS NOT NULL THEN u_supporter.full_name
          ELSE COALESCE(NULLIF(BTRIM(c.supporter_name), ''), u_supporter.full_name)
        END AS supporter_name,
        COALESCE(NULLIF(BTRIM(c.supporter_phone), ''), u_supporter.phone) AS supporter_phone,
        c.team_name,
        CASE WHEN c.status = 'Ch? duy?t' THEN 'Chờ duyệt' ELSE c.status END AS status
      FROM contracts c
      LEFT JOIN users u_closer ON c.closer_id = u_closer.id
      LEFT JOIN users u_referrer ON c.referrer_id = u_referrer.id
      LEFT JOIN users u_supporter ON c.supporter_id = u_supporter.id
      ${whereClause}
      ORDER BY c.contract_date DESC, c.id DESC
    `, values);

    const rows = result.rows.map((row) => ({
      ...row,
      closer_name: sanitizeVietnameseText(row.closer_name),
      referrer_name: sanitizeVietnameseText(row.referrer_name),
      supporter_name: sanitizeVietnameseText(row.supporter_name),
      status: sanitizeVietnameseText(row.status),
      contract_date_text: formatDate(row.contract_date_text),
    }));
    const workbook = createContractsWorkbook(rows);

    return new Response(new Uint8Array(workbook), {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="danh-sach-hop-dong-${dateStamp()}.xlsx"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    console.error('Error in GET /api/admin/contracts/export:', error);
    return Response.json({ success: false, error: error instanceof Error ? error.message : 'Lỗi xuất danh sách hợp đồng' }, { status: 500 });
  }
}
