import TeamLeadModule from '@/components/admin/TeamLeadModule';
import FundManagementTabs from '@/components/admin/FundManagementTabs';
import { getCurrentMonth, getLatestImportedTeamLeadPeriod, parseMonth } from '@/lib/teamlead';

export default async function TeamLeadAllocationPage({ searchParams }: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
  const params = await searchParams;
  const parsedMonth = typeof params.month === 'string' ? parseMonth(params.month) : null;
  const month = parsedMonth?.slice(0, 7) || getCurrentMonth();
  const hasWeekParam = typeof params.week === 'string';
  const requestedWeek = hasWeekParam ? Number(params.week) : undefined;
  const weekNo = requestedWeek !== undefined && Number.isInteger(requestedWeek) && requestedWeek >= 0 && requestedWeek <= 5
    ? requestedWeek
    : 0;
  return (
    <>
      <FundManagementTabs activeTab="teamlead" />
      <TeamLeadModule activeTab="allocation" initialMonth={month} initialWeekNo={weekNo} />
    </>
  );
}
