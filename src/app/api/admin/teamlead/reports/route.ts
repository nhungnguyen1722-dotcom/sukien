import { NextRequest } from 'next/server';
import { getTeamLeadContractBreakdown, getTeamLeadReports, isTeamLeadAdmin, parseMonth } from '@/lib/teamlead';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  if (!isTeamLeadAdmin(request)) return Response.json({ success: false, error: 'Không có quyền truy cập.' }, { status: 403 });
  const params = new URL(request.url).searchParams;
  const month = parseMonth(params.get('month'));
  if (!month) return Response.json({ success: false, error: 'Tháng không hợp lệ.' }, { status: 400 });
  try {
    const [data, breakdown] = await Promise.all([
      getTeamLeadReports(month),
      params.get('contract_id') ? getTeamLeadContractBreakdown(month, Number(params.get('contract_id'))) : Promise.resolve(null),
    ]);
    return Response.json({ success: true, ...data, breakdown });
  } catch (error: any) {
    console.error('Error loading TeamLead reports:', error);
    return Response.json({ success: false, error: error.message || 'Không thể tải báo cáo TeamLead.' }, { status: 500 });
  }
}
