import { NextRequest } from 'next/server';
import { getTeamLeadAllocation, isTeamLeadAdmin, lockTeamLeadPeriod, parseMonth } from '@/lib/teamlead';

export const dynamic = 'force-dynamic';

function unauthorized() {
  return Response.json({ success: false, error: 'Bạn cần quyền quản trị để sử dụng phân hệ TeamLead.' }, { status: 403 });
}

function periodParams(request: NextRequest) {
  const params = new URL(request.url).searchParams;
  const month = parseMonth(params.get('month'));
  const weekNo = Number(params.get('week') || 0);
  if (!month || !Number.isInteger(weekNo) || weekNo < 0 || weekNo > 5) return null;
  return { month, weekNo };
}

export async function GET(request: NextRequest) {
  if (!isTeamLeadAdmin(request)) return unauthorized();
  const period = periodParams(request);
  if (!period) return Response.json({ success: false, error: 'Tháng hoặc tuần không hợp lệ.' }, { status: 400 });
  try {
    const rateValue = new URL(request.url).searchParams.get('rate');
    const rate = rateValue === null ? undefined : Number(rateValue);
    if (rate !== undefined && (!Number.isFinite(rate) || rate < 0 || rate > 1)) {
      return Response.json({ success: false, error: 'Tỷ lệ quỹ phải từ 0% đến 100%.' }, { status: 400 });
    }
    const allocation = await getTeamLeadAllocation(period.month, period.weekNo, undefined, rate);
    return Response.json({ success: true, ...allocation });
  } catch (error: any) {
    console.error('Error loading TeamLead allocation:', error);
    return Response.json({ success: false, error: error.message || 'Không thể tính phân bổ TeamLead.' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  if (!isTeamLeadAdmin(request)) return unauthorized();
  let body: any;
  try {
    body = await request.json();
  } catch {
    return Response.json({ success: false, error: 'Dữ liệu gửi lên không hợp lệ.' }, { status: 400 });
  }
  const month = parseMonth(body.month);
  const weekNo = Number(body.weekNo);
  const fundRate = Number(body.fundRate);
  if (!month || !Number.isInteger(weekNo) || weekNo < 0 || weekNo > 5) {
    return Response.json({ success: false, error: 'Tháng hoặc tuần không hợp lệ.' }, { status: 400 });
  }
  if (!Number.isFinite(fundRate) || fundRate < 0 || fundRate > 1) {
    return Response.json({ success: false, error: 'Tỷ lệ quỹ phải từ 0% đến 100%.' }, { status: 400 });
  }
  try {
    const result = await lockTeamLeadPeriod(month, weekNo, fundRate);
    if ('error' in result) return Response.json({ success: false, error: result.error }, { status: 409 });
    const allocation = await getTeamLeadAllocation(month, weekNo);
    return Response.json({ success: true, ...allocation });
  } catch (error: any) {
    console.error('Error locking TeamLead allocation:', error);
    return Response.json({ success: false, error: error.message || 'Không thể chốt phân bổ.' }, { status: 500 });
  }
}
