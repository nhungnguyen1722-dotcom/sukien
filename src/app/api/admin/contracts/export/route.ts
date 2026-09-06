import { NextRequest } from 'next/server';
import pool from '@/lib/db';

export const dynamic = 'force-dynamic';

function escapeCsvField(val: any): string {
  if (val === null || val === undefined) return '""';
  const str = String(val);
  return `"${str.replace(/"/g, '""')}"`;
}

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

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
        u_closer.full_name as closer_name,
        u_referrer.full_name as referrer_name,
        u_supporter.full_name as supporter_name
      FROM contracts c
      LEFT JOIN users u_closer ON c.closer_id = u_closer.id
      LEFT JOIN users u_referrer ON c.referrer_id = u_referrer.id
      LEFT JOIN users u_supporter ON c.supporter_id = u_supporter.id
      ${whereClause}
      ORDER BY c.contract_date DESC, c.id DESC
    `;

    const res = await pool.query(query, values);

    // CSV header with Vietnamese columns
    const headers = [
      'STT',
      'Mã hợp đồng',
      'Ngày ký',
      'Khách hàng',
      'Giá trị hợp đồng (VNĐ)',
      'Người chốt sale (6%)',
      'Hoa hồng chốt (VNĐ)',
      'Người giới thiệu (1%)',
      'Hoa hồng GT (VNĐ)',
      'Người hỗ trợ (0.5%)',
      'Hoa hồng HT (VNĐ)',
      'Trạng thái',
      'Ghi chú',
    ];

    const rows: string[] = [headers.map(escapeCsvField).join(',')];

    res.rows.forEach((c, index) => {
      rows.push(
        [
          index + 1,
          c.contract_code || '',
          formatDate(c.contract_date),
          c.customer_name || '',
          c.value || 0,
          c.closer_name || '',
          c.closer_fee || 0,
          c.referrer_name || '',
          c.referrer_fee || 0,
          c.supporter_name || '',
          c.supporter_fee || 0,
          c.status || '',
          c.notes || '',
        ]
          .map(escapeCsvField)
          .join(',')
      );
    });

    // UTF-8 BOM for Excel
    const csvContent = '\uFEFF' + rows.join('\r\n');
    const today = new Date().toISOString().split('T')[0];

    return new Response(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="nhat-ky-hop-dong-${today}.csv"`,
      },
    });
  } catch (error: any) {
    console.error('Error in GET /api/admin/contracts/export:', error);
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
}
