import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET() {
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT current_database(), current_user, version();');
    client.release();
    
    return NextResponse.json({
      status: 'success',
      message: 'Successfully connected to PostgreSQL!',
      data: result.rows[0]
    });
  } catch (error: any) {
    console.error('Database connection error:', error);
    return NextResponse.json({
      status: 'error',
      message: 'Failed to connect to the database.',
      error: error.message
    }, { status: 500 });
  }
}
