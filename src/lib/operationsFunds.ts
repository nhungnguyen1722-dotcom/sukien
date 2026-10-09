export const OPERATIONS_SUPPORT_FUND_RATE = 0.025;

export const OPERATIONS_SUPPORT_FUND_TYPES = [
  { key: 'operations', label: 'Quỹ vận hành', color: '#2563eb' },
  { key: 'support_kt', label: 'BP hỗ trợ KT', color: '#7c3aed' },
  { key: 'support_cn', label: 'BP hỗ trợ CN', color: '#10b981' },
] as const;

export type OperationsSupportFundKey = (typeof OPERATIONS_SUPPORT_FUND_TYPES)[number]['key'];

export const SEPTEMBER_2026_OPERATIONS_FUND_SOURCE = {
  workbook: 'Tong-hop-DNTT-T9-T10.xlsx · Quỹ Vận hành& hỗ trợ',
  start: '2026-09-01',
  endInclusive: '2026-10-02',
  contractRevenue: 1_701_666_667,
  totalRate: 0.025,
  totalFund: 42_541_666.67,
  totalPaid: 16_080_000,
  remaining: 26_461_666.67,
  cumulativeFund: 61_291_666.67,
  cumulativePaid: 16_080_000,
  cumulativePayable: 45_211_666.67,
  groups: [
    { key: 'operations', rate: 0.022, fund: 37_436_666.67, paid: 14_740_000, remaining: 22_696_666.67 },
    { key: 'support_cn', rate: 0.002, fund: 3_403_333.33, paid: 1_340_000, remaining: 2_063_333.33 },
    { key: 'support_kt', rate: 0.001, fund: 1_701_666.67, paid: 0, remaining: 1_701_666.67 },
  ] satisfies ReadonlyArray<{
    key: OperationsSupportFundKey;
    rate: number;
    fund: number;
    paid: number;
    remaining: number;
  }>,
} as const;

export const SEPTEMBER_2026_OPERATIONS_EXPENSE_SOURCE_ROWS = [
  { date: '2026-09-28', department: 'Tri ân kết nối phó tổng', beneficiary: 'Nguyễn Thị Hương Thảo', amount: 2_975_000 },
  { date: '2026-09-28', department: 'Tổng điều hành', beneficiary: 'Đinh Văn Bắc', amount: 2_975_000 },
  { date: '2026-09-28', department: 'Phó tổng', beneficiary: 'Vũ Thị Cúc', amount: 7_140_000 },
  { date: '2026-09-28', department: 'Quỹ hỗ trợ & dự phòng', beneficiary: 'Nguyễn Đăng An', amount: 1_190_000 },
  { date: '2026-09-28', department: 'Tri ân kết nối phó tổng', beneficiary: 'Nguyễn Thị Hương Thảo', amount: 375_000 },
  { date: '2026-09-28', department: 'Tổng điều hành', beneficiary: 'Đinh Văn Bắc', amount: 375_000 },
  { date: '2026-09-28', department: 'Phó tổng', beneficiary: 'Vũ Thị Cúc', amount: 900_000 },
  { date: '2026-09-28', department: 'Quỹ hỗ trợ & dự phòng', beneficiary: 'Nguyễn Đăng An', amount: 150_000 },
] as const;

function normalizeFundSource(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[đĐ]/g, 'd')
    .toLocaleLowerCase('vi')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

export function getOperationsSupportFundKey(value: string): OperationsSupportFundKey | null {
  const source = normalizeFundSource(value);
  if (source.includes('support kt') || source.includes('bp ho tro kt') || source.includes('ho tro kt')) {
    return 'support_kt';
  }
  if (source.includes('support cn') || source.includes('bp ho tro cn') || source.includes('ho tro cn')) {
    return 'support_cn';
  }
  if (
    source.includes('operations')
    || source.includes('quy van hanh')
    || source.includes('bp ho tro')
    || source.includes('bo phan ho tro')
  ) {
    return 'operations';
  }
  return null;
}
