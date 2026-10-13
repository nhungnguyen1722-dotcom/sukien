export interface ContractTerm {
  expiresOn: string | null;
  finalMonthStartsOn: string | null;
}

function addMonthsClamped(value: string, months: number): string {
  const [year, month, day] = value.slice(0, 10).split('-').map(Number);
  const targetMonth = month - 1 + months;
  const targetYear = year + Math.floor(targetMonth / 12);
  const normalizedMonth = ((targetMonth % 12) + 12) % 12;
  const lastDay = new Date(Date.UTC(targetYear, normalizedMonth + 1, 0)).getUTCDate();
  return new Date(Date.UTC(targetYear, normalizedMonth, Math.min(day, lastDay)))
    .toISOString()
    .slice(0, 10);
}

export function getVietnamDate(now = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);
  const year = parts.find((part) => part.type === 'year')?.value;
  const month = parts.find((part) => part.type === 'month')?.value;
  const day = parts.find((part) => part.type === 'day')?.value;
  return year && month && day ? `${year}-${month}-${day}` : now.toISOString().slice(0, 10);
}

export function nextDate(value: string): string {
  const [year, month, day] = value.slice(0, 10).split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day + 1)).toISOString().slice(0, 10);
}

export function getContractTermMonths(contractType?: string | null): number | null {
  const normalized = (contractType || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/gi, 'd')
    .toLocaleLowerCase('vi')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
  const match = normalized.match(/\b([123])\s*(?:nam|n)\b/);
  return match ? Number(match[1]) * 12 : null;
}

export function getContractTerm(contractDate: string, contractType?: string | null): ContractTerm {
  const months = getContractTermMonths(contractType);
  if (!months || !/^\d{4}-\d{2}-\d{2}/.test(contractDate)) {
    return { expiresOn: null, finalMonthStartsOn: null };
  }
  return {
    expiresOn: addMonthsClamped(contractDate, months),
    finalMonthStartsOn: addMonthsClamped(contractDate, months - 1),
  };
}

export function isContractActiveInPeriod(
  contractDate: string,
  contractType: string | null | undefined,
  periodStart: string,
  periodEndExclusive: string,
): boolean {
  if (!contractDate || contractDate.slice(0, 10) >= periodEndExclusive) return false;
  const { expiresOn } = getContractTerm(contractDate, contractType);
  return !expiresOn || expiresOn > periodStart;
}

export function getContractTermStatus(
  contractDate: string,
  contractType: string | null | undefined,
  today: string,
): 'active' | 'final-month' | 'expired' | null {
  const { expiresOn, finalMonthStartsOn } = getContractTerm(contractDate, contractType);
  if (!expiresOn || !finalMonthStartsOn) return null;
  if (today >= expiresOn) return 'expired';
  if (today >= finalMonthStartsOn) return 'final-month';
  return 'active';
}
