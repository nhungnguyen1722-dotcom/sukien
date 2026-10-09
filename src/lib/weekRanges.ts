export type DateRange = {
  start: string;
  endExclusive: string;
  endInclusive: string;
};

const SEPTEMBER_2026_WEEK_RANGES: Record<number, Omit<DateRange, 'endInclusive'>> = {
  1: { start: '2026-09-01', endExclusive: '2026-09-05' },
  2: { start: '2026-09-05', endExclusive: '2026-09-12' },
  3: { start: '2026-09-12', endExclusive: '2026-09-19' },
  4: { start: '2026-09-19', endExclusive: '2026-09-26' },
  5: { start: '2026-09-26', endExclusive: '2026-10-03' },
};

function addDays(value: string, days: number) {
  const date = new Date(`${value}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function withInclusiveEnd(range: Omit<DateRange, 'endInclusive'>): DateRange {
  return { ...range, endInclusive: addDays(range.endExclusive, -1) };
}

export function getMonthWeekRange(month: string, weekNo = 0): DateRange {
  const monthKey = month.slice(0, 7);
  if (monthKey === '2026-09') {
    if (weekNo === 0) {
      return withInclusiveEnd({ start: '2026-09-01', endExclusive: '2026-10-03' });
    }
    const septemberWeek = SEPTEMBER_2026_WEEK_RANGES[weekNo];
    if (septemberWeek) return withInclusiveEnd(septemberWeek);
  }

  const [year, monthNumber] = monthKey.split('-').map(Number);
  const monthStart = new Date(Date.UTC(year, monthNumber - 1, 1));
  const nextMonthStart = new Date(Date.UTC(year, monthNumber, 1));
  if (!weekNo) {
    return withInclusiveEnd({
      start: monthStart.toISOString().slice(0, 10),
      endExclusive: nextMonthStart.toISOString().slice(0, 10),
    });
  }

  const startDay = (weekNo - 1) * 7 + 1;
  const endDay = Math.min(weekNo * 7 + 1, new Date(Date.UTC(year, monthNumber, 0)).getUTCDate() + 1);
  return withInclusiveEnd({
    start: new Date(Date.UTC(year, monthNumber - 1, startDay)).toISOString().slice(0, 10),
    endExclusive: new Date(Date.UTC(year, monthNumber - 1, endDay)).toISOString().slice(0, 10),
  });
}

export function getMonthWeekNo(date: string, month: string): number | null {
  const dateOnly = date.slice(0, 10);
  for (let weekNo = 1; weekNo <= 5; weekNo += 1) {
    const range = getMonthWeekRange(month, weekNo);
    if (dateOnly >= range.start && dateOnly < range.endExclusive) return weekNo;
  }
  return null;
}

export function getPeriodWeekNo(label: string, periodCode: string, fallback: number): number {
  const match = `${label} ${periodCode}`.match(/(?:tuần|tuan|week|wk|w)[\s._-]*0?([1-5])\b/i)
    || label.trim().match(/^0?([1-5])\b/);
  return match ? Number(match[1]) : fallback;
}
