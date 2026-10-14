import FundManagementTabs from '@/components/admin/FundManagementTabs';
import AllFundsReportModule from '@/components/admin/AllFundsReportModule';
import { getAllFundsReportData } from '@/lib/allFundsReport';
import { parseMonth } from '@/lib/teamlead';

export const revalidate = 0;

function getCurrentMonth() {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
  }).formatToParts(new Date());
  const year = parts.find((part) => part.type === 'year')?.value;
  const month = parts.find((part) => part.type === 'month')?.value;
  return year && month ? `${year}-${month}` : new Date().toISOString().slice(0, 7);
}

export default async function AllFundsReportPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const parsedMonth = typeof params.month === 'string' ? parseMonth(params.month) : null;
  const month = parsedMonth?.slice(0, 7) || getCurrentMonth();
  const requestedWeek = typeof params.week === 'string' ? Number(params.week) : 0;
  const week = Number.isInteger(requestedWeek) && requestedWeek >= 0 && requestedWeek <= 5 ? requestedWeek : 0;

  let initialData = undefined;
  try {
    initialData = await getAllFundsReportData(month, week);
  } catch (err) {
    console.warn('Could not fetch initial all funds report data:', err);
  }

  return (
    <>
      <FundManagementTabs activeTab="summary" />
      <AllFundsReportModule initialMonth={month} initialWeek={week} initialData={initialData} />
    </>
  );
}
