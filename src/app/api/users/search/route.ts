import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q')?.trim();
    
    if (!q || q.length < 2) {
      return NextResponse.json({ results: [] });
    }

    const cleanQuery = q.replace(/\s+/g, '');
    const cleanPhone = cleanQuery.replace(/^N_/, '');
    
    const result = await pool.query(
      `SELECT id, full_name, phone, ref_code 
       FROM users 
       WHERE phone LIKE $1 
          OR phone LIKE $2
          OR ref_code ILIKE $1 
          OR ref_code ILIKE $3
          OR full_name ILIKE $4
       ORDER BY full_name ASC 
       LIMIT 10`,
      [`%${cleanQuery}%`, `%${cleanPhone}%`, `%${cleanPhone}%`, `%${q}%`]
    );

    return NextResponse.json({ results: result.rows });
  } catch (error) {
    console.error('User search error:', error);
    return NextResponse.json({ results: [] });
  }
}
