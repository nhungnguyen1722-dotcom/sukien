import { NextRequest } from 'next/server';
import ExcelJS from 'exceljs';
import { getLeaderboardData } from '@/lib/leaderboardService';

export const dynamic = 'force-dynamic';

function formatDateVN(dateStr: string): string {
  if (!dateStr) return '';
  const parts = dateStr.slice(0, 10).split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateStr;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const month = searchParams.get('month') || '2026-10';
    const mode = (searchParams.get('mode') === 'cumulative3' ? 'cumulative3' : 'month') as 'month' | 'cumulative3';
    const startDate = searchParams.get('startDate') || undefined;
    const endDate = searchParams.get('endDate') || undefined;

    const data = await getLeaderboardData(month, mode, startDate, endDate);

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Hệ Thống Sự Kiện & Quỹ';
    workbook.created = new Date();

    const sheet = workbook.addWorksheet('Bảng Xếp Hạng Thi Đua', {
      views: [{ showGridLines: true }],
    });

    // Setup Column Widths
    // A: Mã TV, B: Họ tên, C: Team, D: Doanh số, E: Thưởng thi đua, F: Thưởng KPI
    // G: Spacer
    // H: Team, I: Doanh số, J: Thưởng thi đua nhóm, K: Thưởng KPI nhóm
    // L: Spacer
    // M: Top 1, N: Top 2, O: Top 3
    sheet.columns = [
      { key: 'colA', width: 16 }, // A: Mã thành viên
      { key: 'colB', width: 24 }, // B: Họ và tên
      { key: 'colC', width: 20 }, // C: Team
      { key: 'colD', width: 20 }, // D: Doanh số
      { key: 'colE', width: 20 }, // E: Thưởng thi đua (Dự kiến)
      { key: 'colF', width: 20 }, // F: Thưởng KPI cá nhân
      { key: 'colG', width: 6 },  // G: Spacer
      { key: 'colH', width: 20 }, // H: Team
      { key: 'colI', width: 20 }, // I: Doanh số
      { key: 'colJ', width: 22 }, // J: Thưởng thi đua nhóm (Dự kiến)
      { key: 'colK', width: 20 }, // K: Thưởng KPI nhóm
      { key: 'colL', width: 6 },  // L: Spacer
      { key: 'colM', width: 26 }, // M: TOP 1
      { key: 'colN', width: 26 }, // N: TOP 2
      { key: 'colO', width: 26 }, // O: TOP 3
    ];

    const thinBorder: Partial<ExcelJS.Borders> = {
      top: { style: 'thin', color: { argb: 'FFD3D3D3' } },
      left: { style: 'thin', color: { argb: 'FFD3D3D3' } },
      bottom: { style: 'thin', color: { argb: 'FFD3D3D3' } },
      right: { style: 'thin', color: { argb: 'FFD3D3D3' } },
    };

    const headerBorder: Partial<ExcelJS.Borders> = {
      top: { style: 'medium', color: { argb: 'FF1F4E78' } },
      left: { style: 'thin', color: { argb: 'FFFFFFFF' } },
      bottom: { style: 'medium', color: { argb: 'FF1F4E78' } },
      right: { style: 'thin', color: { argb: 'FFFFFFFF' } },
    };

    // Row 1: Filter Info (matching Image 2)
    const cellA1 = sheet.getCell('A1');
    cellA1.value = 'Bộ lọc';
    cellA1.font = { bold: true, size: 10, color: { argb: 'FF4A154B' } };
    cellA1.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE1D5E7' } };
    cellA1.alignment = { horizontal: 'center', vertical: 'middle' };
    cellA1.border = thinBorder;

    const cellB1 = sheet.getCell('B1');
    cellB1.value = formatDateVN(data.startDate);
    cellB1.font = { bold: true, size: 10, color: { argb: 'FF000000' } };
    cellB1.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF5EEF8' } };
    cellB1.alignment = { horizontal: 'center', vertical: 'middle' };
    cellB1.border = thinBorder;

    const cellC1 = sheet.getCell('C1');
    cellC1.value = formatDateVN(data.endDate);
    cellC1.font = { bold: true, size: 10, color: { argb: 'FF000000' } };
    cellC1.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF5EEF8' } };
    cellC1.alignment = { horizontal: 'center', vertical: 'middle' };
    cellC1.border = thinBorder;

    // Row 3: Headers
    const navyHeaderFill: ExcelJS.Fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1F4E78' },
    };

    const headerTitles: { [key: string]: string } = {
      A3: 'Mã thành viên',
      B3: 'Họ và tên',
      C3: 'Team',
      D3: 'Doanh số',
      E3: 'Thưởng thi đua\n(Dự kiến)',
      F3: 'Thưởng KPI cá nhân',
      H3: 'Team',
      I3: 'Doanh số',
      J3: 'Thưởng thi đua nhóm\n(Dự kiến)',
      K3: 'Thưởng KPI nhóm',
    };

    for (const [cellRef, title] of Object.entries(headerTitles)) {
      const cell = sheet.getCell(cellRef);
      cell.value = title;
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 };
      cell.fill = navyHeaderFill;
      cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      cell.border = headerBorder;
    }
    sheet.getRow(3).height = 36;

    // Spotlight Top 3 (Block 3 - Columns M, N, O)
    // Row 3: Headers
    const top1Person = data.top3Members[0];
    const top2Person = data.top3Members[1];
    const top3Person = data.top3Members[2];

    const cellM3 = sheet.getCell('M3');
    cellM3.value = '🏆 Cá nhân doanh số\nTOP 1';
    cellM3.font = { bold: true, color: { argb: 'FF7F6000' }, size: 10 };
    cellM3.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF2CC' } };
    cellM3.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cellM3.border = thinBorder;

    const cellN3 = sheet.getCell('N3');
    cellN3.value = '🥈 Cá nhân doanh số\nTOP 2';
    cellN3.font = { bold: true, color: { argb: 'FF203764' }, size: 10 };
    cellN3.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9E1F2' } };
    cellN3.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cellN3.border = thinBorder;

    const cellO3 = sheet.getCell('O3');
    cellO3.value = '🥉 Cá nhân doanh số\nTOP 3';
    cellO3.font = { bold: true, color: { argb: 'FF833C0C' }, size: 10 };
    cellO3.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFCE4D6' } };
    cellO3.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cellO3.border = thinBorder;

    // Row 4: Member names & teams
    const cellM4 = sheet.getCell('M4');
    cellM4.value = top1Person ? `${top1Person.name}\nTeam: ${top1Person.team}` : '—';
    cellM4.font = { bold: true, size: 9, color: { argb: 'FF1F4E78' } };
    cellM4.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cellM4.border = thinBorder;

    const cellN4 = sheet.getCell('N4');
    cellN4.value = top2Person ? `${top2Person.name}\nTeam: ${top2Person.team}` : '—';
    cellN4.font = { bold: true, size: 9, color: { argb: 'FF1F4E78' } };
    cellN4.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cellN4.border = thinBorder;

    const cellO4 = sheet.getCell('O4');
    cellO4.value = top3Person ? `${top3Person.name}\nTeam: ${top3Person.team}` : '—';
    cellO4.font = { bold: true, size: 9, color: { argb: 'FF1F4E78' } };
    cellO4.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cellO4.border = thinBorder;
    sheet.getRow(4).height = 32;

    // Row 5: Member revenues
    const cellM5 = sheet.getCell('M5');
    cellM5.value = top1Person?.revenue || 0;
    cellM5.numFmt = '#,##0 "đ"';
    cellM5.font = { bold: true, size: 10, color: { argb: 'FF002060' } };
    cellM5.alignment = { horizontal: 'center', vertical: 'middle' };
    cellM5.border = thinBorder;

    const cellN5 = sheet.getCell('N5');
    cellN5.value = top2Person?.revenue || 0;
    cellN5.numFmt = '#,##0 "đ"';
    cellN5.font = { bold: true, size: 10, color: { argb: 'FF002060' } };
    cellN5.alignment = { horizontal: 'center', vertical: 'middle' };
    cellN5.border = thinBorder;

    const cellO5 = sheet.getCell('O5');
    cellO5.value = top3Person?.revenue || 0;
    cellO5.numFmt = '#,##0 "đ"';
    cellO5.font = { bold: true, size: 10, color: { argb: 'FF002060' } };
    cellO5.alignment = { horizontal: 'center', vertical: 'middle' };
    cellO5.border = thinBorder;
    sheet.getRow(5).height = 24;

    // Row 7: Team Top 3 Headers
    const top1Team = data.top3Teams[0];
    const top2Team = data.top3Teams[1];
    const top3Team = data.top3Teams[2];

    const cellM7 = sheet.getCell('M7');
    cellM7.value = '🏆 Team doanh số\nTOP 1';
    cellM7.font = { bold: true, color: { argb: 'FF385723' }, size: 10 };
    cellM7.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2EFDA' } };
    cellM7.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cellM7.border = thinBorder;

    const cellN7 = sheet.getCell('N7');
    cellN7.value = '🥈 Team doanh số\nTOP 2';
    cellN7.font = { bold: true, color: { argb: 'FF203764' }, size: 10 };
    cellN7.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9E1F2' } };
    cellN7.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cellN7.border = thinBorder;

    const cellO7 = sheet.getCell('O7');
    cellO7.value = '🥉 Team doanh số\nTOP 3';
    cellO7.font = { bold: true, color: { argb: 'FF833C0C' }, size: 10 };
    cellO7.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFCE4D6' } };
    cellO7.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cellO7.border = thinBorder;
    sheet.getRow(7).height = 36;

    // Row 8: Team Names
    const cellM8 = sheet.getCell('M8');
    cellM8.value = top1Team?.teamName || '—';
    cellM8.font = { bold: true, size: 10, color: { argb: 'FF1F4E78' } };
    cellM8.alignment = { horizontal: 'center', vertical: 'middle' };
    cellM8.border = thinBorder;

    const cellN8 = sheet.getCell('N8');
    cellN8.value = top2Team?.teamName || '—';
    cellN8.font = { bold: true, size: 10, color: { argb: 'FF1F4E78' } };
    cellN8.alignment = { horizontal: 'center', vertical: 'middle' };
    cellN8.border = thinBorder;

    const cellO8 = sheet.getCell('O8');
    cellO8.value = top3Team?.teamName || '—';
    cellO8.font = { bold: true, size: 10, color: { argb: 'FF1F4E78' } };
    cellO8.alignment = { horizontal: 'center', vertical: 'middle' };
    cellO8.border = thinBorder;
    sheet.getRow(8).height = 24;

    // Row 9: Team Revenues
    const cellM9 = sheet.getCell('M9');
    cellM9.value = top1Team?.revenue || 0;
    cellM9.numFmt = '#,##0 "đ"';
    cellM9.font = { bold: true, size: 10, color: { argb: 'FF002060' } };
    cellM9.alignment = { horizontal: 'center', vertical: 'middle' };
    cellM9.border = thinBorder;

    const cellN9 = sheet.getCell('N9');
    cellN9.value = top2Team?.revenue || 0;
    cellN9.numFmt = '#,##0 "đ"';
    cellN9.font = { bold: true, size: 10, color: { argb: 'FF002060' } };
    cellN9.alignment = { horizontal: 'center', vertical: 'middle' };
    cellN9.border = thinBorder;

    const cellO9 = sheet.getCell('O9');
    cellO9.value = top3Team?.revenue || 0;
    cellO9.numFmt = '#,##0 "đ"';
    cellO9.font = { bold: true, size: 10, color: { argb: 'FF002060' } };
    cellO9.alignment = { horizontal: 'center', vertical: 'middle' };
    cellO9.border = thinBorder;
    sheet.getRow(9).height = 24;

    // Populate Data for Individuals (Block 1) and Teams (Block 2)
    const maxRows = Math.max(data.members.length, data.teams.length);

    for (let i = 0; i < maxRows; i++) {
      const rowIndex = 4 + i;
      const member = data.members[i];
      const team = data.teams[i];

      // Highlight colors:
      // Row 4 (Rank 1): Soft gold #FFF2CC
      // Row 6 (Rank 3): Soft orange/peach #FCE4D6
      let memberRowFill: ExcelJS.Fill | undefined = undefined;
      if (member) {
        if (member.rank === 1) {
          memberRowFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF2CC' } };
        } else if (member.rank === 3) {
          memberRowFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFCE4D6' } };
        }
      }

      let teamRowFill: ExcelJS.Fill | undefined = undefined;
      if (team) {
        if (team.rank === 1) {
          teamRowFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF2CC' } };
        } else if (team.rank === 3) {
          teamRowFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFCE4D6' } };
        }
      }

      // Fill Block 1 (Member)
      if (member) {
        const cA = sheet.getCell(`A${rowIndex}`);
        cA.value = member.phone || `TV${member.userId || i + 1}`;
        cA.font = { size: 9, color: { argb: 'FF002060' } };
        cA.alignment = { horizontal: 'center', vertical: 'middle' };
        cA.border = thinBorder;
        if (memberRowFill) cA.fill = memberRowFill;

        const cB = sheet.getCell(`B${rowIndex}`);
        cB.value = member.name;
        cB.font = { size: 9, bold: member.rank <= 3 };
        cB.alignment = { horizontal: 'left', vertical: 'middle' };
        cB.border = thinBorder;
        if (memberRowFill) cB.fill = memberRowFill;

        const cC = sheet.getCell(`C${rowIndex}`);
        cC.value = member.team;
        cC.font = { size: 9 };
        cC.alignment = { horizontal: 'center', vertical: 'middle' };
        cC.border = thinBorder;
        if (memberRowFill) cC.fill = memberRowFill;

        const cD = sheet.getCell(`D${rowIndex}`);
        cD.value = member.revenue;
        cD.numFmt = '#,##0 "đ"';
        cD.font = { size: 9, bold: member.rank <= 3 };
        cD.alignment = { horizontal: 'right', vertical: 'middle' };
        cD.border = thinBorder;
        if (memberRowFill) cD.fill = memberRowFill;

        const cE = sheet.getCell(`E${rowIndex}`);
        cE.value = member.bonusThiDua;
        cE.numFmt = '#,##0 "đ"';
        cE.font = { size: 9 };
        cE.alignment = { horizontal: 'right', vertical: 'middle' };
        cE.border = thinBorder;
        if (memberRowFill) cE.fill = memberRowFill;

        const cF = sheet.getCell(`F${rowIndex}`);
        cF.value = member.bonusKpi;
        cF.numFmt = '#,##0 "đ"';
        cF.font = { size: 9 };
        cF.alignment = { horizontal: 'right', vertical: 'middle' };
        cF.border = thinBorder;
        if (memberRowFill) cF.fill = memberRowFill;
      }

      // Fill Block 2 (Team)
      if (team) {
        const cH = sheet.getCell(`H${rowIndex}`);
        cH.value = team.teamName;
        cH.font = { size: 9, bold: team.rank <= 3 };
        cH.alignment = { horizontal: 'center', vertical: 'middle' };
        cH.border = thinBorder;
        if (teamRowFill) cH.fill = teamRowFill;

        const cI = sheet.getCell(`I${rowIndex}`);
        cI.value = team.revenue;
        cI.numFmt = '#,##0 "đ"';
        cI.font = { size: 9, bold: team.rank <= 3 };
        cI.alignment = { horizontal: 'right', vertical: 'middle' };
        cI.border = thinBorder;
        if (teamRowFill) cI.fill = teamRowFill;

        const cJ = sheet.getCell(`J${rowIndex}`);
        cJ.value = team.bonusThiDua;
        cJ.numFmt = '#,##0 "đ"';
        cJ.font = { size: 9 };
        cJ.alignment = { horizontal: 'right', vertical: 'middle' };
        cJ.border = thinBorder;
        if (teamRowFill) cJ.fill = teamRowFill;

        const cK = sheet.getCell(`K${rowIndex}`);
        cK.value = team.bonusKpi;
        cK.numFmt = '#,##0 "đ"';
        cK.font = { size: 9 };
        cK.alignment = { horizontal: 'right', vertical: 'middle' };
        cK.border = thinBorder;
        if (teamRowFill) cK.fill = teamRowFill;
      }

      sheet.getRow(rowIndex).height = 22;
    }

    const buffer = await workbook.xlsx.writeBuffer();
    const fileName = `bang-xep-hang-thi-dua-${month}-${mode}.xlsx`;

    return new Response(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (error: unknown) {
    console.error('Error generating Excel export:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Lỗi xuất Excel' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
