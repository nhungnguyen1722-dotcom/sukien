import LeaderboardManagement from '@/components/admin/LeaderboardManagement';
import { getCurrentMonth } from '@/lib/teamlead';

export const dynamic = 'force-dynamic';

export default async function VinhDanhPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const month = typeof params.month === 'string' ? params.month : getCurrentMonth();

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1600px]">
        <LeaderboardManagement initialMonth={month} />
      </div>
    </div>
  );
}
