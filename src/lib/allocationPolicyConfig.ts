export const ALLOCATION_POLICY_BUDGET_RATE = 15;

export type AllocationPolicyRow = {
  id: string;
  label: string;
  allocationPercent: number;
  parentId?: string;
};

export type AllocationPolicyVersion = {
  id: number;
  versionLabel: string;
  effectiveDate: string;
  createdAt: string;
  createdBy: string;
  note: string;
  rows: AllocationPolicyRow[];
};

export const DEFAULT_POLICY_VERSION = 'v2.4';
export const DEFAULT_POLICY_EFFECTIVE_DATE = '2026-10-10';

// Initial values transcribed from the "1. Chính sách" worksheet.
// Fractions are kept at their exact values so the allocations total 100%.
export const DEFAULT_ALLOCATION_POLICY_ROWS: AllocationPolicyRow[] = [
  { id: 'sale-direct', label: 'Sale trực tiếp - Pro sale (Nguồn khách)', allocationPercent: 40 },
  { id: 'sale-connection', label: 'Tri ân kết nối sale trực tiếp', allocationPercent: 20 / 3 },
  { id: 'sale-support', label: 'Tri ân hỗ trợ sale', allocationPercent: 10 / 3 },
  { id: 'event-contract', label: 'Quỹ Sự kiện & Chốt hợp đồng', allocationPercent: 10 / 3 },
  { id: 'customer-care', label: 'Quỹ Chăm sóc khách hàng', allocationPercent: 4 / 3 },
  { id: 'training', label: 'Quỹ Đào tạo Chuyên môn & Kỹ năng', allocationPercent: 2 },
  { id: 'competition', label: 'Quỹ Thi đua & Chương trình thúc đẩy', allocationPercent: 16 / 3 },
  { id: 'travel', label: 'Chi phí Công tác phí', allocationPercent: 2 },
  { id: 'leader-team', label: 'Leader team - Giám đốc Kd', allocationPercent: 58 / 3 },
  { id: 'operations-support', label: 'Quỹ Vận hành & Bộ phận hỗ trợ', allocationPercent: 50 / 3 },
];

export function makeDefaultPolicyRows(): AllocationPolicyRow[] {
  return DEFAULT_ALLOCATION_POLICY_ROWS.map((row) => ({ ...row }));
}
