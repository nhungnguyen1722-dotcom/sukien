export type DateRange = {
  start: string;
  endExclusive: string;
  endInclusive: string;
};

export type WeekOption = {
  weekNo: number;
  start: string;
  endInclusive: string;
  endExclusive: string;
  label: string; // ví dụ: "12/09 – 18/09/2026"
  shortLabel: string; // ví dụ: "12–18/09"
};

function addDays(value: string, days: number): string {
  const [y, m, d] = value.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function formatDateDM(value: string): string {
  const parts = value.split('-');
  return `${parts[2]}/${parts[1]}`;
}

function formatDateDMY(value: string): string {
  const parts = value.split('-');
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

/**
 * Tính toán các khoảng thời gian tuần trong tháng theo đúng quy chuẩn:
 * 1. Chu kỳ tuần làm việc tiêu chuẩn: Từ Thứ Bảy tuần trước đến Thứ Sáu tuần này (7 ngày).
 * 2. Tháng 9/2026:
 *    - Tuần 1: 01/09 – 04/09/2026 (01/09 Thứ Ba đến 04/09 Thứ Sáu)
 *    - Tuần 2: 05/09 – 11/09/2026 (05/09 Thứ Bảy đến 11/09 Thứ Sáu)
 *    - Tuần 3: 12/09 – 18/09/2026 (12/09 Thứ Bảy đến 18/09 Thứ Sáu)
 *    - Tuần 4: 19/09 – 25/09/2026 (19/09 Thứ Bảy đến 25/09 Thứ Sáu)
 *    - Tuần 5: 26/09 – 02/10/2026 (26/09 Thứ Bảy đến 02/10 Thứ Sáu)
 *    - Dữ liệu các hợp đồng có ngày ký từ 02/10/2026 trở về trước thuộc Tuần 5 Tháng 9.
 * 3. Tháng 10/2026:
 *    - Bắt đầu chu kỳ đếm tuần mới từ ngày 03/10/2026 (ngày tiếp theo sau khi Tuần 5 Tháng 9 kết thúc):
 *    - Tuần 1: 03/10 – 09/10/2026 (03/10 Thứ Bảy đến 09/10 Thứ Sáu)
 *    - Tuần 2: 10/10 – 16/10/2026 (10/10 Thứ Bảy đến 16/10 Thứ Sáu)
 *    - Tuần 3: 17/10 – 23/10/2026 (17/10 Thứ Bảy đến 23/10 Thứ Sáu)
 *    - Tuần 4: 24/10 – 30/10/2026 (24/10 Thứ Bảy đến 30/10 Thứ Sáu)
 *    - Tuần 5: 31/10 – 06/11/2026 (31/10 Thứ Bảy đến 06/11 Thứ Sáu)
 *    - Các hợp đồng từ ngày 02/10/2026 trở về trước KHÔNG xuất hiện trong Tháng 10.
 */
export function computeMonthWeeks(monthKey: string): WeekOption[] {
  const cleanMonth = monthKey.slice(0, 7);

  const makeWeek = (weekNo: number, start: string, endInclusive: string): WeekOption => {
    const endExclusive = addDays(endInclusive, 1);
    const startDM = formatDateDM(start);
    const endDM = formatDateDM(endInclusive);
    const shortLabel = start.slice(5, 7) === endInclusive.slice(5, 7)
      ? `${startDM.slice(0, 2)}–${endDM}`
      : `${startDM}–${endDM}`;
    const label = `${formatDateDMY(start)} – ${formatDateDMY(endInclusive)}`;
    return {
      weekNo,
      start,
      endInclusive,
      endExclusive,
      label,
      shortLabel,
    };
  };

  if (cleanMonth === '2026-09') {
    return [
      makeWeek(1, '2026-09-01', '2026-09-04'),
      makeWeek(2, '2026-09-05', '2026-09-11'),
      makeWeek(3, '2026-09-12', '2026-09-18'),
      makeWeek(4, '2026-09-19', '2026-09-25'),
      makeWeek(5, '2026-09-26', '2026-10-02'),
    ];
  }

  if (cleanMonth === '2026-10') {
    return [
      makeWeek(1, '2026-10-03', '2026-10-09'),
      makeWeek(2, '2026-10-10', '2026-10-16'),
      makeWeek(3, '2026-10-17', '2026-10-23'),
      makeWeek(4, '2026-10-24', '2026-10-30'),
      makeWeek(5, '2026-10-31', '2026-11-06'),
    ];
  }

  const [year, monthNumber] = cleanMonth.split('-').map(Number);
  const daysInMonth = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
  const lastDayOfMonth = `${cleanMonth}-${String(daysInMonth).padStart(2, '0')}`;
  const firstDayStr = `${cleanMonth}-01`;
  const firstDayOfWeek = new Date(Date.UTC(year, monthNumber - 1, 1)).getUTCDay(); // 0 = CN, ..., 5 = T6, 6 = T7

  let week1EndStr: string;
  if (firstDayOfWeek === 6) {
    week1EndStr = addDays(firstDayStr, 6);
  } else {
    const daysToFriday = (5 - firstDayOfWeek + 7) % 7;
    week1EndStr = addDays(firstDayStr, daysToFriday);
  }

  const weeks: WeekOption[] = [];
  weeks.push(makeWeek(1, firstDayStr, week1EndStr));

  let currentStart = addDays(week1EndStr, 1);
  for (let w = 2; w <= 4; w++) {
    const currentEnd = addDays(currentStart, 6);
    weeks.push(makeWeek(w, currentStart, currentEnd));
    currentStart = addDays(currentEnd, 1);
  }

  const week5EndStandard = addDays(currentStart, 6);
  const week5End = week5EndStandard < lastDayOfMonth ? lastDayOfMonth : week5EndStandard;
  weeks.push(makeWeek(5, currentStart, week5End));

  return weeks;
}

export function getMonthWeekRange(month: string, weekNo = 0): DateRange {
  const monthKey = month.slice(0, 7);
  const weeks = computeMonthWeeks(monthKey);

  if (weekNo >= 1 && weekNo <= weeks.length) {
    const found = weeks[weekNo - 1];
    return {
      start: found.start,
      endInclusive: found.endInclusive,
      endExclusive: found.endExclusive,
    };
  }

  const monthStart = weeks[0].start;
  const monthEndInclusive = weeks[weeks.length - 1].endInclusive;
  const monthEndExclusive = weeks[weeks.length - 1].endExclusive;

  return {
    start: monthStart,
    endInclusive: monthEndInclusive,
    endExclusive: monthEndExclusive,
  };
}

export function getMonthWeekNo(date: string, month?: string): number | null {
  const dateOnly = date.slice(0, 10);

  let targetMonth = month ? month.slice(0, 7) : '';
  if (!targetMonth) {
    if (dateOnly >= '2026-09-01' && dateOnly <= '2026-10-02') {
      targetMonth = '2026-09';
    } else if (dateOnly >= '2026-10-03' && dateOnly <= '2026-11-06') {
      targetMonth = '2026-10';
    } else {
      targetMonth = dateOnly.slice(0, 7);
    }
  }

  // Nếu targetMonth là 2026-10 mà ngày <= 2026-10-02 thì thuộc Tháng 9, không thuộc Tháng 10
  if (targetMonth === '2026-10' && dateOnly <= '2026-10-02') {
    return null;
  }

  const weeks = computeMonthWeeks(targetMonth);
  for (const w of weeks) {
    if (dateOnly >= w.start && dateOnly <= w.endInclusive) {
      return w.weekNo;
    }
  }
  return null;
}

export function formatWeekOptionLabel(month: string, weekNo: number, format: 'short' | 'full' = 'short'): string {
  const weeks = computeMonthWeeks(month);
  const found = weeks.find((w) => w.weekNo === weekNo);
  if (!found) return String(weekNo);
  return format === 'full' ? `Tuần ${weekNo}: ${found.label}` : `${weekNo} · ${found.shortLabel}`;
}

export function getPeriodWeekNo(label: string, periodCode: string, fallback: number): number {
  const match = `${label} ${periodCode}`.match(/(?:tuần|tuan|week|wk|w)[\s._-]*0?([1-5])\b/i)
    || label.trim().match(/^0?([1-5])\b/);
  return match ? Number(match[1]) : fallback;
}
