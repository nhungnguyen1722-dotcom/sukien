import { NextRequest, NextResponse } from 'next/server';
import { getAllFundsReportData } from '@/lib/allFundsReport';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const month = searchParams.get('month') || '2026-10';
    const data = await getAllFundsReportData(month);
    return NextResponse.json(data);
  } catch (error) {
    console.error('Failed to get all funds report data:', error);
    return NextResponse.json({ error: 'Không thể tải dữ liệu báo cáo tất cả các quỹ.' }, { status: 500 });
  }
}
