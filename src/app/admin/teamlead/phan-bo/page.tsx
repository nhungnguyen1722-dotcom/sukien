import TeamLeadModule from '@/components/admin/TeamLeadModule';
import { getCurrentMonth, getLatestImportedTeamLeadPeriod, parseMonth } from '@/lib/teamlead';

export default async function TeamLeadAllocationPage({ searchParams }: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
  const params = await searchParams;
  const parsedMonth = typeof params.month === 'string' ? parseMonth(params.month) : null;
  const month = parsedMonth?.slice(0, 7) || getCurrentMonth();
  const latest = await getLatestImportedTeamLeadPeriod(month);
  const requestedWeek = typeof params.week === 'string' ? Number(params.week) : 0;
  const weekNo = Number.isInteger(requestedWeek) && requestedWeek >= 1 && requestedWeek <= 5
    ? requestedWeek
    : latest?.weekNo && latest.weekNo > 0 ? latest.weekNo : 1;
  return <TeamLeadModule activeTab="allocation" initialMonth={month} initialWeekNo={weekNo} />;
}
