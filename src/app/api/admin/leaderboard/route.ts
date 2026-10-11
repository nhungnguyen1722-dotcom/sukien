import { NextRequest, NextResponse } from 'next/server';
import { getLeaderboardData } from '@/lib/leaderboardService';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const month = searchParams.get('month') || '2026-10';
    const mode = (searchParams.get('mode') === 'cumulative3' ? 'cumulative3' : 'month') as 'month' | 'cumulative3';
    const startDate = searchParams.get('startDate') || undefined;
    const endDate = searchParams.get('endDate') || undefined;

    const data = await getLeaderboardData(month, mode, startDate, endDate);
    return NextResponse.json({ success: true, data });
  } catch (error: unknown) {
    console.error('Failed to get leaderboard data:', error);
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : 'Lỗi lấy dữ liệu bảng xếp hạng' },
      { status: 500 }
    );
  }
}
