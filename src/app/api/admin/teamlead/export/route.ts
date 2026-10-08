import { NextRequest } from 'next/server';
import * as XLSX from 'xlsx';
import { getTeamLeadAllocation, isTeamLeadAdmin, parseMonth } from '@/lib/teamlead';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  if (!isTeamLeadAdmin(request)) return Response.json({ success: false, error: 'Không có quyền truy cập.' }, { status: 403 });
  const params = new URL(request.url).searchParams;
  const month = parseMonth(params.get('month'));
  const weekNo = Number(params.get('week') || 0);
  if (!month || !Number.isInteger(weekNo) || weekNo < 0 || weekNo > 5) {
    return Response.json({ success: false, error: 'Tháng hoặc tuần không hợp lệ.' }, { status: 400 });
  }
  try {
    const allocation = await getTeamLeadAllocation(month, weekNo);
    const rows = allocation.rows.map((row) => ({
      'Thành viên': row.memberName,
      'Số điện thoại': row.memberPhone,
      'Đội nhóm': row.teamName,
      'Chức danh': row.role,
      'Doanh số đội nhóm': row.salesBasis,
      'Quỹ 30% tháng (tham khảo)': row.payout30,
      'Quỹ 70% kỳ này': row.payout70,
      'Tổng chi kỳ này': weekNo ? row.payout70 : row.total,
      'Đủ điều kiện 30%': row.eligible30 ? 'Có' : 'Không',
      'Đủ điều kiện 70%': row.eligible70 ? 'Có' : 'Không',
    }));
    const sheet = XLSX.utils.json_to_sheet(rows);
    sheet['!cols'] = [{ wch: 26 }, { wch: 18 }, { wch: 24 }, { wch: 20 }, { wch: 20 }, { wch: 24 }, { wch: 20 }, { wch: 20 }, { wch: 18 }, { wch: 18 }];
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, sheet, weekNo ? `Tuan ${weekNo}` : 'Tong thang');
    const note = weekNo
      ? 'Quỹ 30% chỉ để tham khảo quyền hưởng theo tháng; không nằm trong phiếu chi tuần.'
      : `Tỷ lệ nguồn quỹ: ${(allocation.meta.fundRate * 100).toFixed(2)}%.`;
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([[note]]), 'Ghi chu');
    const bytes = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
    const body = new Uint8Array(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const fileName = `teamlead-${month.slice(0, 7)}-${weekNo ? `tuan-${weekNo}` : 'thang'}.xlsx`;
    return new Response(body as unknown as BodyInit, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (error: any) {
    console.error('Error exporting TeamLead allocation:', error);
    return Response.json({ success: false, error: error.message || 'Không thể xuất Excel.' }, { status: 500 });
  }
}
