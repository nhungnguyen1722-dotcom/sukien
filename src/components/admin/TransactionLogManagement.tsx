'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { formatDateDM, getMonthWeekNo, getMonthWeekRange, getPeriodWeekNo } from '@/lib/weekRanges';
import AdminTimeFilter from '@/components/admin/AdminTimeFilter';
import ContractTermBadge from '@/components/admin/ContractTermBadge';
import { sanitizeVietnameseText } from '@/lib/nameSanitizer';
import { nextDate } from '@/lib/contractTerms';
import {
  calculateContractAllocatedValue,
  calculateContractAllBeneficiaries,
  decomposeBeneficiarySource,
  TEAM_LEADER_ROSTER,
  type ContractOperationsBeneficiary,
} from '@/lib/allocationFormulas';
import {
  AlertCircle,
  ArrowUpDown,
  Award,
  CalendarCheck,
  CalendarDays,
  CheckCircle2,
  CircleDollarSign,
  Copy,
  Edit3,
  Eye,
  FilePlus,
  FileSpreadsheet,
  Filter,
  Landmark,
  MoreVertical,
  Plus,
  Printer,
  Receipt,
  RefreshCw,
  Search,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Trophy,
  Users,
  Wallet,
  X,
  XCircle,
} from 'lucide-react';

import CreatePaymentProposalModal from '@/components/admin/CreatePaymentProposalModal';
import ExcelPreviewModal, { ExcelPreviewCashflowFund, ExcelPreviewCashflowPerson } from '@/components/admin/ExcelPreviewModal';
import UpdateFundAllocationPaidModal from '@/components/admin/UpdateFundAllocationPaidModal';
import { numberToVietnameseWords } from '@/lib/numberToWords';

export interface TransactionLogItem {
  id?: number;
  order?: number;
  title: string;
  subtitle?: string;
  fund_source?: string;
  fundSource?: string;
  beneficiary_name?: string;
  beneficiaryName?: string;
  beneficiary_phone?: string | null;
  beneficiaryPhone?: string | null;
  beneficiary_bank_account?: string | null;
  beneficiaryBankAccount?: string | null;
  beneficiary_bank_name?: string | null;
  beneficiaryBankName?: string | null;
  beneficiary_user_id?: number | null;
  beneficiaryUserId?: number | null;
  amount: number;
  note?: string;
}

export interface TransactionLog {
  id: number;
  request_code: string;
  request_date: string | null;
  fund_source: string;
  detail_content: string;
  requester_id?: string | null;
  requester_name: string;
  requester_phone?: string | null;
  approver_id?: string | null;
  approver_name: string;
  approver_phone?: string | null;
  beneficiary_name: string;
  beneficiary_phone?: string | null;
  proposed_amount: number | null;
  available_balance: number | null;
  fund_alert: string;
  status: string;
  actual_expense?: number | null;
  receipt_url?: string | null;
  approval_date?: string | null;
  payment_date?: string | null;
  source_complete?: boolean;
  expense_type?: string;
  beneficiary_user_id?: number | null;
  beneficiary_bank_account?: string | null;
  beneficiary_bank_name?: string | null;
  beneficiary_department_key?: string | null;
  source_contract_id?: number | null;
  beneficiary_role?: string | null;
  beneficiary_team?: string | null;
  items?: TransactionLogItem[];
  note?: string | null;
}

export interface TransactionMember {
  id: number;
  full_name: string;
  phone?: string | null;
  bank_account?: string | null;
  bank_name?: string | null;
  team_name?: string | null;
  title?: string | null;
}

export interface WeeklyAllocation {
  id?: number;
  period_code: string;
  period_month: string;
  period_label: string;
  period_start: string;
  period_end: string;
  fund_key: string;
  fund_source: string;
  allocation_rate: number;
  requested_amount: number;
  allocated_amount?: number;
  paid_amount?: number;
  remaining_amount?: number;
  source_sheet: string;
}

export interface FundContract {
  id: number;
  contract_code: string | null;
  contract_date: string;
  customer_name: string;
  value: number;
  allocated_value: number;
  contract_type?: string | null;
  closer_name: string;
  closer_phone: string;
  closer_fee: number;
  referrer_name: string;
  referrer_phone: string;
  referrer_fee: number;
  supporter_name: string;
  supporter_phone: string;
  supporter_fee: number;
  operations_fund_beneficiaries?: ContractOperationsBeneficiary[];
  team_name?: string | null;
  status: string;
  source_period_code?: string;
  source_excel_row?: number;
  source_sheet?: string;
  source_beneficiaries?: FundContractBeneficiary[];
  unallocated_pool?: number;
  distributed_commission?: number;
  remaining_fund?: number;
}

export type BeneficiarySourceLine = { source: string; calculation: string; amount: number };
export type BeneficiarySourceDisclosure = { lines: BeneficiarySourceLine[]; unattributedAmount: number };

export interface FundContractBeneficiary {
  name: string;
  amount: number;
  bank_account?: string | null;
  bank_name?: string | null;
  phone?: string | null;
  lines?: BeneficiarySourceLine[];
}

export interface EventFundExpense {
  event_code: string;
  event_date: string;
  beneficiary_phone: string;
  beneficiary_name: string;
  expense_role: string;
  proposed_amount: number;
  status: string;
}

export interface EventItemRecord {
  id: number;
  code: string | null;
  name: string;
  event_date: string;
  location: string | null;
  status: string | null;
}

interface Props {
  initialLogs: TransactionLog[];
  initialMembers: TransactionMember[];
  weeklyAllocations: WeeklyAllocation[];
  contracts: FundContract[];
  workbookContracts: FundContract[];
  workbookWarnings: Record<string, string[]>;
  eventExpenses: EventFundExpense[];
  events?: EventItemRecord[];
  currentMonth: string;
}

const MONTH_OVERVIEW = '__month_overview__';

function sanitizeTransactionLogNames(log: TransactionLog): TransactionLog {
  return {
    ...log,
    requester_name: sanitizeVietnameseText(log.requester_name),
    approver_name: sanitizeVietnameseText(log.approver_name),
    beneficiary_name: sanitizeVietnameseText(log.beneficiary_name),
    detail_content: sanitizeVietnameseText(log.detail_content),
    status: sanitizeVietnameseText(log.status),
  };
}

const FUND_ORDER = [
  'direct_sale',
  'tribute_connection',
  'tribute_support',
  'event_close',
  'customer_care',
  'training',
  'incentive',
  'travel',
  'leader',
  'operations',
  'support_kt',
  'support_cn',
];

const FUND_COLORS: Record<string, string> = {
  direct_sale: '#2563eb',
  tribute_connection: '#059669',
  tribute_support: '#d97706',
  event_close: '#7c3aed',
  customer_care: '#0d9488',
  training: '#8b5cf6',
  incentive: '#f59e0b',
  travel: '#10b981',
  operations: '#4f46e5',
  support_kt: '#6366f1',
  support_cn: '#a855f7',
  leader: '#db2777',
};

const FUND_LABELS: Record<string, string> = {
  direct_sale: 'Sale trực tiếp · Pro sale',
  tribute_connection: 'Tri ân kết nối Sale trực tiếp',
  tribute_support: 'Tri ân hỗ trợ Sale',
  event_close: 'Quỹ Sự kiện & Chốt hợp đồng',
  customer_care: 'Quỹ Chăm sóc khách hàng',
  training: 'Quỹ Đào tạo Chuyên môn & Kỹ năng',
  incentive: 'Quỹ Thi đua & Chương trình thúc đẩy',
  travel: 'Chi phí Công tác phí',
  operations: 'Quỹ Vận hành',
  support_kt: 'BP hỗ trợ KT',
  support_cn: 'BP hỗ trợ CN',
  leader: 'Leader Team & Giám đốc KD',
};

const FUND_SOURCE_BY_KEY: Record<string, string> = {
  direct_sale: 'Sale trực tiếp - Pro sale (Nguồn khách)',
  tribute_connection: 'Tri ân kết nối sale trực tiếp',
  tribute_support: 'Tri ân hỗ trợ sale',
  event_close: 'Quỹ Sự kiện & Chốt hợp đồng',
  customer_care: 'Quỹ Chăm sóc khách hàng',
  training: 'Quỹ Đào tạo Chuyên môn & Kỹ năng',
  incentive: 'Quỹ Thi đua & Chương trình thúc đẩy',
  travel: 'Chi phí Công tác phí',
  operations: 'Quỹ Vận hành',
  support_kt: 'BP hỗ trợ KT',
  support_cn: 'BP hỗ trợ CN',
  leader: 'Leader team - giám đốc Kd',
};

const DEFAULT_FUNDS: Array<{ key: string; rate: number }> = [
  { key: 'direct_sale', rate: 0.06 },
  { key: 'tribute_connection', rate: 0.01 },
  { key: 'tribute_support', rate: 0.005 },
  { key: 'event_close', rate: 0.005 },
  { key: 'customer_care', rate: 0.002 },
  { key: 'training', rate: 0.003 },
  { key: 'incentive', rate: 0.008 },
  { key: 'travel', rate: 0.003 },
  { key: 'operations', rate: 0.022 },
  { key: 'support_kt', rate: 0.001 },
  { key: 'support_cn', rate: 0.002 },
  { key: 'leader', rate: 0.029 },
];

const DEFAULT_FUND_RATES: Record<string, number> = Object.fromEntries(
  DEFAULT_FUNDS.map((item) => [item.key, item.rate])
);

const formatVND = (amount: number | null | undefined) =>
  `${new Intl.NumberFormat('vi-VN').format(Math.round(Number(amount || 0)))} ₫`;

const inputClass = 'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100';

const formatDate = (date?: string | null) => {
  if (!date) return '—';
  const match = date.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return match ? `${match[3]}/${match[2]}/${match[1]}` : date;
};

const safeText = (value?: string | null) => value?.trim() || 'Chưa có dữ liệu';
const isPaidStatus = (status: string) => ['Đã chi', 'Đã thanh toán', 'Đã thực hiện'].includes(status);
const normalizeFund = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[đĐ]/g, 'd').trim().toLocaleLowerCase('vi');

export function isBdsContract(contractType?: string | null): boolean {
  if (!contractType) return false;
  const upper = contractType.trim().toUpperCase();
  if (upper === 'BĐS' || upper === 'BDS') return true;
  const normalized = contractType
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[đĐ]/g, 'd')
    .trim()
    .toLowerCase();
  return normalized === 'bds' || normalized.includes('bat dong san');
}

export function isTwoYearContract(contractType?: string | null): boolean {
  if (!contractType) return false;
  const upper = contractType.trim().toUpperCase();
  if (upper === '2 NĂM' || upper === '2 NAM' || upper === '2-NAM' || upper === '2N') return true;
  const normalized = contractType
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[đĐ]/g, 'd')
    .trim()
    .toLowerCase();
  return normalized === '2 nam' || normalized.includes('2 nam');
}

export function getContractAllocatedValue(contract: { value: number; contract_type?: string | null; allocated_value?: number }): number {
  return calculateContractAllocatedValue(Number(contract.value || 0), contract.contract_type);
}

function withinPeriod(date: string, period: WeeklyAllocation) {
  const dateOnly = date.slice(0, 10);
  if (period.period_month === '2026-10' && dateOnly <= '2026-10-02') {
    return false;
  }
  const range = getEffectivePeriodRange(period);
  return dateOnly >= range.start && dateOnly <= range.endInclusive;
}

function contractWithinPeriod(contract: FundContract, period: WeeklyAllocation) {
  const range = getEffectivePeriodRange(period);
  const contractDate = contract.contract_date.slice(0, 10);
  return contractDate >= range.start && contractDate < (range.endExclusive || nextDate(range.endInclusive));
}

function withinMonth(date: string, month: string) {
  const range = getMonthWeekRange(month);
  const dateOnly = date.slice(0, 10);
  if (month.slice(0, 7) === '2026-10') {
    return dateOnly >= '2026-10-03' && dateOnly < range.endExclusive;
  }
  return dateOnly >= range.start && dateOnly < range.endExclusive;
}

const contractBeneficiariesCache = new WeakMap<FundContract, FundContractBeneficiary[]>();
const normalizedNameCache = new Map<string, string>();

function normalizePersonName(value: string) {
  if (!value) return '';
  const cached = normalizedNameCache.get(value);
  if (cached !== undefined) return cached;
  const normalized = value.normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/gi, 'd')
    .toLocaleLowerCase('vi')
    .replace(/[^a-z0-9 ]/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
  normalizedNameCache.set(value, normalized);
  return normalized;
}

function contractBeneficiaries(contract: FundContract, members?: TransactionMember[]): FundContractBeneficiary[] {
  const detailed = contract.source_beneficiaries?.length
    ? contract.source_beneficiaries
    : contractBeneficiariesCache.get(contract) || calculateContractAllBeneficiaries(contract);
  if (!contract.source_beneficiaries?.length && !contractBeneficiariesCache.has(contract)) {
    contractBeneficiariesCache.set(contract, detailed);
  }
  return detailed.map((b) => {
    const matching = members?.find((m) => areNamesMatching(m.full_name, b.name));
    return {
      ...b,
      name: b.name,
      amount: b.amount,
      phone: b.phone || matching?.phone || null,
      bank_account: b.bank_account || matching?.bank_account || null,
      bank_name: b.bank_name || matching?.bank_name || null,
    };
  });
}

function contractPool(contract: FundContract) {
  return contract.unallocated_pool ?? Math.round(contract.allocated_value * 0.15);
}

function contractCommission(contract: FundContract, members?: TransactionMember[]) {
  return contract.distributed_commission
    ?? contractBeneficiaries(contract, members).reduce((sum, amount) => sum + Number(amount.amount || 0), 0);
}

function contractRemainingFund(contract: FundContract, members?: TransactionMember[]) {
  return contract.remaining_fund ?? contractPool(contract) - contractCommission(contract, members);
}

function percentLabel(rate: number) {
  return `${(rate * 100).toLocaleString('vi-VN', { maximumFractionDigits: 3 })}%`;
}

function areNamesMatching(a?: string | null, b?: string | null): boolean {
  if (!a || !b) return false;
  const normA = normalizePersonName(a).replace(/y/g, 'i');
  const normB = normalizePersonName(b).replace(/y/g, 'i');
  if (normA === normB) return true;
  if (normA.replace(' huong ', ' ') === normB || normB.replace(' huong ', ' ') === normA) return true;
  if (normA.replace(' thi ', ' ') === normB || normB.replace(' thi ', ' ') === normA) return true;
  if (normA.replace('trang', 'tran') === normB.replace('trang', 'tran')) return true;
  return false;
}

function getContractWeekLabel(contract: FundContract): string {
  const date = (contract.contract_date || '').slice(0, 10);
  const month = date >= '2026-09-01' && date <= '2026-10-02'
    ? '2026-09'
    : date >= '2026-10-03' && date <= '2026-11-06'
      ? '2026-10'
      : date.slice(0, 7);
  const weekNo = getMonthWeekNo(date, month);
  if (weekNo) return `Tuần ${weekNo} Tháng ${Number(month.slice(5, 7))}/${month.slice(0, 4)}`;

  const periodCode = contract.source_period_code || '';
  if (periodCode) return periodCode;
  return 'Kỳ đối chiếu';
}

function resolveContractTeam(contract: FundContract): string {
  if (contract.team_name && contract.team_name.trim()) return contract.team_name.trim();
  const cust = normalizePersonName(contract.customer_name);
  if (cust.includes('thoa') || cust.includes('le thi thao') || cust.includes('nguyen hung vi')) return 'Thành Công';
  if (cust.includes('lan huong') || cust.includes('thanh phuong') || cust.includes('doan') || cust.includes('minh') || cust.includes('chich') || cust.includes('loan') || cust.includes('long') || cust.includes('nguyen thi cuc')) return 'Happy';
  if (cust.includes('dau') || cust.includes('hung vy') || cust.includes('my') || cust.includes('trang') || cust.includes('huong') || cust.includes('thu')) return 'Ong Vàng';
  if (cust.includes('dieu') || cust.includes('ha')) return 'Kiến Vàng';
  if (cust.includes('thang')) return 'Lộc Phát';
  if (cust.includes('phuong')) return 'Biệt đội Kim Cương';
  return '';
}

function contractRateLine(source: string, rate: number, contractBase: number): BeneficiarySourceLine {
  const amount = Math.round(contractBase * rate);
  return {
    source,
    calculation: `${percentLabel(rate)} × ${formatVND(contractBase)} = ${formatVND(amount)}`,
    amount,
  };
}

function leaderEfficiencyLine(share: number, contractBase: number, weekLabel: string, roleName = 'Leader Team'): BeneficiarySourceLine {
  const weeklyEfficiencyPool = Math.round(contractBase * 0.029 * 0.7);
  const amount = Math.round(weeklyEfficiencyPool * share);
  return {
    source: `Quỹ TeamLead · Quỹ hiệu quả ${weekLabel} (${roleName})`,
    calculation: `${percentLabel(share)} × (2,9% × 70% × ${formatVND(contractBase)}) = ${formatVND(amount)}`,
    amount,
  };
}

function recordedContractFeeLine(source: string, amount: number, contractBase?: number): BeneficiarySourceLine {
  const rounded = Math.round(amount);
  const percentStr = contractBase && contractBase > 0 ? ` (${percentLabel(rounded / contractBase)} × ${formatVND(contractBase)})` : '';
  return { source, calculation: `Phí được ghi trên hợp đồng: ${formatVND(rounded)}${percentStr}`, amount: rounded };
}

function isTruongThiThuyTrangExample(contract: FundContract) {
  return contract.source_period_code === '2026-09-W5'
    && contract.source_excel_row === 31
    && normalizePersonName(contract.customer_name) === normalizePersonName('TRƯƠNG THỊ THÙY TRANG')
    && Math.round(Number(contract.allocated_value || contract.value)) === 10_000_000;
}

function exactTruongThiThuyTrangSources(contract: FundContract, person: FundContractBeneficiary): BeneficiarySourceLine[] | null {
  if (!isTruongThiThuyTrangExample(contract)) return null;

  const sourceLinesByName: Record<string, Array<() => BeneficiarySourceLine>> = {
    [normalizePersonName('Nguyễn Hùng Vĩ')]: [() => leaderEfficiencyLine(0.5, 10_000_000, 'Tuần 5 Tháng 9/2026', 'Giám đốc Đội Ong Vàng')],
    [normalizePersonName('Vũ Thị Cúc')]: [() => contractRateLine('Quỹ vận hành → Phó tổng (Tuần 5 Tháng 9/2026)', 0.012, 10_000_000)],
    [normalizePersonName('Nguyễn Thị Hương Thảo')]: [() => contractRateLine('Quỹ vận hành → Tri ân kết nối phó tổng (Tuần 5 Tháng 9/2026)', 0.005, 10_000_000)],
    [normalizePersonName('Đinh Văn Bắc')]: [() => contractRateLine('Quỹ vận hành → Tổng điều hành (Tuần 5 Tháng 9/2026)', 0.005, 10_000_000)],
    [normalizePersonName('Diệp Thị Huế')]: [
      () => recordedContractFeeLine('Sale trực tiếp · chốt sale', 600_000, 10_000_000),
      () => recordedContractFeeLine('Tri ân hỗ trợ sale', 50_000, 10_000_000),
      () => leaderEfficiencyLine(0.1, 10_000_000, 'Tuần 5 Tháng 9/2026', 'Trưởng phòng Đội Ong Vàng'),
    ],
    [normalizePersonName('Nguyễn Đăng An')]: [() => contractRateLine('Quỹ hỗ trợ & dự phòng → BP hỗ trợ CN (Tuần 5 Tháng 9/2026)', 0.002, 10_000_000)],
    [normalizePersonName('Phạm Minh Tuấn')]: [() => leaderEfficiencyLine(0.3, 10_000_000, 'Tuần 5 Tháng 9/2026', 'Phó Giám đốc Đội Ong Vàng')],
    [normalizePersonName('Vũ Hùng Vỹ')]: [
      () => recordedContractFeeLine('Tri ân kết nối sale trực tiếp · giới thiệu sale', 100_000, 10_000_000),
      () => leaderEfficiencyLine(0.1, 10_000_000, 'Tuần 5 Tháng 9/2026', 'Trưởng phòng Đội Ong Vàng'),
    ],
  };
  const factories = sourceLinesByName[normalizePersonName(person.name)];
  if (!factories) return null;
  const lines = factories.map((createLine) => createLine());
  const total = lines.reduce((sum, line) => sum + line.amount, 0);
  return total === Math.round(person.amount) ? lines : null;
}

function beneficiarySourceDisclosure(contract: FundContract, person: FundContractBeneficiary): BeneficiarySourceDisclosure {
  if (person.lines && person.lines.length > 0) {
    const attributedAmount = person.lines.reduce((sum, line) => sum + line.amount, 0);
    return {
      lines: person.lines,
      unattributedAmount: Math.max(0, Math.round(person.amount) - attributedAmount),
    };
  }

  const lines = decomposeBeneficiarySource(
    contract,
    person.name,
    person.amount,
    contract.source_sheet,
    contract.source_excel_row
  );
  const attributedAmount = lines.reduce((sum, line) => sum + line.amount, 0);
  return {
    lines,
    unattributedAmount: Math.max(0, Math.round(person.amount) - attributedAmount),
  };
}

function groupContractsByPerson(contracts: FundContract[], members?: TransactionMember[]) {
  const people = new Map<string, {
    name: string;
    total: number;
    contracts: Map<number, { contract: FundContract; amount: number }>;
  }>();

  for (const contract of contracts) {
    for (const beneficiary of contractBeneficiaries(contract, members)) {
      if (!beneficiary.amount) continue;
      const key = beneficiary.name.normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/đ/gi, 'd')
        .toLocaleLowerCase('vi')
        .replace(/[^a-z0-9 ]/g, ' ')
        .trim()
        .replace(/\s+/g, ' ');
      const person = people.get(key) || { name: beneficiary.name, total: 0, contracts: new Map() };
      const contractAllocation = person.contracts.get(contract.id);
      if (contractAllocation) contractAllocation.amount += beneficiary.amount;
      else person.contracts.set(contract.id, { contract, amount: beneficiary.amount });
      person.total += beneficiary.amount;
      people.set(key, person);
    }
  }

  return Array.from(people.values())
    .map((person) => ({ ...person, contracts: Array.from(person.contracts.values()) }))
    .sort((a, b) => a.name.localeCompare(b.name, 'vi'));
}

function resolveMemberTitle(
  personName: string,
  matchingMember?: TransactionMember,
  sources?: string[],
  contracts?: Array<{ contract: FundContract; amount: number }>
): string {
  const normName = normalizePersonName(personName);

  // 1. Specific known executive roles
  if (normName.includes('dinh van bac') || sources?.some((s) => s.toLowerCase().includes('tổng điều hành'))) {
    return 'Tổng điều hành';
  }
  if (
    normName.includes('vu thi cuc') &&
    (sources?.some((s) => s.toLowerCase().includes('phó tổng') || s.toLowerCase().includes('vận hành')) || matchingMember?.title === 'Chủ tịch')
  ) {
    return 'Phó tổng';
  }
  if (normName.includes('nguyen thi huong thao') || sources?.some((s) => s.toLowerCase().includes('tri an ket noi') || s.toLowerCase().includes('kết nối phó tổng'))) {
    return 'Tri ân kết nối Phó tổng';
  }
  if (normName.includes('nguyen dang an') || sources?.some((s) => s.toLowerCase().includes('bp ho tro cn') || s.toLowerCase().includes('hỗ trợ cn'))) {
    return 'BP hỗ trợ CN';
  }

  // 2. Explicit member title if set and not generic 'Thành viên'
  if (matchingMember?.title && matchingMember.title.trim() && matchingMember.title.trim() !== 'Thành viên') {
    return matchingMember.title.trim();
  }

  // 3. Check TeamLead roster roles
  for (const teamMembers of Object.values(TEAM_LEADER_ROSTER)) {
    for (const leader of teamMembers) {
      if (areNamesMatching(leader.name, personName)) {
        if (leader.role.includes('Phó Giám đốc')) return 'Phó Giám đốc';
        if (leader.role.includes('Giám đốc')) return 'Giám đốc';
        if (leader.role.includes('Trưởng phòng')) return 'Trưởng phòng';
      }
    }
  }

  // 4. Inferred from contract sources
  if (sources && sources.length > 0) {
    const sText = sources.join(' ').toLowerCase();
    if (sText.includes('giám đốc') && !sText.includes('phó giám đốc')) return 'Giám đốc';
    if (sText.includes('phó giám đốc')) return 'Phó Giám đốc';
    if (sText.includes('trưởng phòng')) return 'Trưởng phòng';
    if (sText.includes('sale trực tiếp') || sText.includes('chốt sale')) return 'Chuyên viên tư vấn / Sale';
    if (sText.includes('kết nối') || sText.includes('giới thiệu')) return 'Người kết nối / Giới thiệu';
    if (sText.includes('hỗ trợ')) return 'Người hỗ trợ sale';
  }

  // 5. Inferred from contract roles (closer / referrer / supporter)
  if (contracts && contracts.length > 0) {
    const isCloser = contracts.some(({ contract }) => areNamesMatching(contract.closer_name, personName));
    if (isCloser) return 'Chuyên viên tư vấn / Sale';
    const isReferrer = contracts.some(({ contract }) => areNamesMatching(contract.referrer_name, personName));
    if (isReferrer) return 'Người kết nối / Giới thiệu';
    const isSupporter = contracts.some(({ contract }) => areNamesMatching(contract.supporter_name, personName));
    if (isSupporter) return 'Người hỗ trợ sale';
  }

  return matchingMember?.title || 'Chuyên viên / Thành viên';
}

function getRoleBadgeStyle(title: string) {
  const norm = title.toLowerCase();
  if (norm.includes('tổng điều hành')) return 'bg-purple-100 text-purple-800 border-purple-200';
  if (norm.includes('phó tổng') || norm.includes('chủ tịch')) return 'bg-amber-100 text-amber-800 border-amber-200';
  if (norm.includes('giám đốc') && !norm.includes('phó')) return 'bg-blue-100 text-blue-800 border-blue-200';
  if (norm.includes('phó giám đốc')) return 'bg-sky-100 text-sky-800 border-sky-200';
  if (norm.includes('trưởng phòng')) return 'bg-indigo-100 text-indigo-800 border-indigo-200';
  if (norm.includes('sale') || norm.includes('tư vấn')) return 'bg-emerald-100 text-emerald-800 border-emerald-200';
  if (norm.includes('hỗ trợ') || norm.includes('kỹ thuật') || norm.includes('cn')) return 'bg-teal-100 text-teal-800 border-teal-200';
  if (norm.includes('kết nối') || norm.includes('giới thiệu')) return 'bg-rose-100 text-rose-800 border-rose-200';
  return 'bg-slate-100 text-slate-700 border-slate-200';
}

function getRoleIcon(title: string) {
  const norm = title.toLowerCase();
  if (norm.includes('tổng điều hành') || norm.includes('chủ tịch')) return '👑';
  if (norm.includes('phó tổng')) return '💎';
  if (norm.includes('giám đốc') && !norm.includes('phó')) return '🏆';
  if (norm.includes('phó giám đốc')) return '🎖️';
  if (norm.includes('trưởng phòng')) return '🎯';
  if (norm.includes('sale') || norm.includes('tư vấn')) return '💼';
  if (norm.includes('hỗ trợ')) return '🛠️';
  if (norm.includes('kết nối') || norm.includes('giới thiệu')) return '🤝';
  return '👤';
}

function formatPeriodRange(period: WeeklyAllocation) {
  const range = getEffectivePeriodRange(period);
  const start = range.start.match(/^(\d{4})-(\d{2})-(\d{2})/);
  const end = range.endInclusive.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!start || !end) return '';
  if (start[1] === end[1] && start[2] === end[2]) return `${start[3]}–${end[3]}/${end[2]}`;
  return `${start[3]}/${start[2]}–${end[3]}/${end[2]}`;
}

function getEffectivePeriodRange(period: WeeklyAllocation): { start: string; endInclusive: string; endExclusive: string } {
  if (!period.period_code.endsWith('-MONTH')) {
    const weekNo = getPeriodWeekNo(period.period_label, period.period_code, 0);
    if (weekNo) return getMonthWeekRange(period.period_month, weekNo);
  }
  return {
    start: period.period_start,
    endInclusive: period.period_end,
    endExclusive: nextDate(period.period_end),
  };
}

function getPeriodWeekNumber(period: WeeklyAllocation, index: number) {
  return getPeriodWeekNo(period.period_label, period.period_code, index + 1);
}

function Panel({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <section className={`rounded-2xl border border-slate-200 bg-white shadow-sm ${className}`}>{children}</section>;
}

export default function TransactionLogManagement({ initialLogs, initialMembers, weeklyAllocations, contracts, workbookContracts, workbookWarnings, eventExpenses, events = [], currentMonth }: Props) {
  const [logs, setLogs] = useState(() => initialLogs.map(sanitizeTransactionLogNames));
  const [allocationsList, setAllocationsList] = useState<WeeklyAllocation[]>(() => weeklyAllocations);
  useEffect(() => {
    setAllocationsList(weeklyAllocations);
  }, [weeklyAllocations]);

  const [isExcelPreviewOpen, setIsExcelPreviewOpen] = useState(false);
  const [isUpdatePaidOpen, setIsUpdatePaidOpen] = useState(false);

  const handleUpdatePaidSuccess = useCallback((updatedRows: any[]) => {
    setAllocationsList((prev) => {
      const updatedMap = new Map(updatedRows.map((r) => [`${r.period_code}_${r.fund_key}`, r]));
      return prev.map((item) => {
        const key = `${item.period_code}_${item.fund_key}`;
        if (updatedMap.has(key)) {
          const u = updatedMap.get(key);
          return {
            ...item,
            paid_amount: Number(u.paid_amount),
            remaining_amount: Number(u.remaining_amount),
          };
        }
        return item;
      });
    });
  }, []);

  const [activeTab, setActiveTab] = useState<'cashflow' | 'event' | 'vouchers'>('cashflow');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get('tab');
      if (tabParam === 'cashflow' || tabParam === 'event' || tabParam === 'vouchers') {
        setActiveTab(tabParam as any);
      }
    }
  }, []);
  const [selectedYear, setSelectedYear] = useState(currentMonth.slice(0, 4));
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const normalizedWeeklyAllocations = useMemo(() => {
    const periodsByMonth = new Map<string, WeeklyAllocation[]>();
    for (const row of allocationsList) {
      if (row.period_code.endsWith('-MONTH')) continue;
      const monthPeriods = periodsByMonth.get(row.period_month) || [];
      if (!monthPeriods.some((period) => period.period_code === row.period_code)) monthPeriods.push(row);
      periodsByMonth.set(row.period_month, monthPeriods);
    }
    const weekNumbers = new Map<string, number>();
    for (const periods of periodsByMonth.values()) {
      periods.sort((a, b) => a.period_start.localeCompare(b.period_start));
      periods.forEach((period, index) => {
        weekNumbers.set(period.period_code, getPeriodWeekNo(period.period_label, period.period_code, index + 1));
      });
    }

    const mapped = allocationsList.map((row) => {
      const standardRate = DEFAULT_FUND_RATES[row.fund_key];
      const rawRate = Number(row.allocation_rate || 0);
      const allocation_rate = standardRate !== undefined ? standardRate : (rawRate > 1 ? rawRate / 100 : rawRate);
      if (row.period_code.endsWith('-MONTH')) {
        return { ...row, allocation_rate };
      }
      const weekNo = weekNumbers.get(row.period_code);
      if (!weekNo) return { ...row, allocation_rate };
      const range = getMonthWeekRange(row.period_month, weekNo);
      return { ...row, allocation_rate, period_start: range.start, period_end: range.endInclusive };
    });

    const existingWeekCodes = new Set(
      mapped
        .filter((row) => row.period_month === selectedMonth && !row.period_code.endsWith('-MONTH'))
        .map((row) => row.period_code)
    );

    const generated: WeeklyAllocation[] = [];
    const totalWeeks = 5;
    for (let w = 1; w <= totalWeeks; w++) {
      const periodCode = `${selectedMonth}-W${w}`;
      if (existingWeekCodes.has(periodCode)) continue;
      const range = getMonthWeekRange(selectedMonth, w);
      const periodLabel = `Tuần ${w}`;

      for (const fund of DEFAULT_FUNDS) {
        generated.push({
          period_code: periodCode,
          period_month: selectedMonth,
          period_label: periodLabel,
          period_start: range.start,
          period_end: range.endInclusive,
          fund_key: fund.key,
          fund_source: FUND_SOURCE_BY_KEY[fund.key] || fund.key,
          allocation_rate: fund.rate,
          requested_amount: 0,
          source_sheet: 'Chính sách phân bổ 15%',
        });
      }
    }

    return [...mapped, ...generated];
  }, [weeklyAllocations, selectedMonth]);
  const normalizedContracts = useMemo(() => {
    return contracts.map((contract) => ({
      ...contract,
      allocated_value: getContractAllocatedValue(contract),
    }));
  }, [contracts]);

  const yearOptions = useMemo(() => {
    const years = new Set<number>();
    const dates = [
      currentMonth,
      ...weeklyAllocations.map((row) => row.period_month),
      ...normalizedContracts.map((contract) => contract.contract_date),
      ...eventExpenses.map((expense) => expense.event_date),
      ...logs.map((log) => log.request_date || ''),
    ];
    for (const date of dates) {
      const year = Number(date.slice(0, 4));
      if (year >= 2000 && year <= 2200) years.add(year);
    }
    years.add(Number(selectedYear));
    return Array.from(years).sort((a, b) => b - a);
  }, [currentMonth, eventExpenses, logs, normalizedContracts, selectedYear, weeklyAllocations]);
  const periodsForMonth = useMemo(() => {
    const unique = new Map<string, WeeklyAllocation>();
    normalizedWeeklyAllocations
      .filter((row) => row.period_month === selectedMonth && !row.period_code.endsWith('-MONTH'))
      .forEach((row) => unique.set(row.period_code, row));
    return Array.from(unique.values()).sort((a, b) => a.period_start.localeCompare(b.period_start));
  }, [normalizedWeeklyAllocations, selectedMonth]);

  const timeFilterWeeks = useMemo(() => {
    return periodsForMonth.map((period, index) => {
      const wNo = getPeriodWeekNumber(period, index);
      const range = getEffectivePeriodRange(period);
      const dateRange = range.start && range.endInclusive
        ? `${formatDateDM(range.start)} - ${formatDateDM(range.endInclusive)}`
        : formatPeriodRange(period) || period.period_label;
      return {
        weekNo: wNo,
        weekKey: period.period_code,
        label: String(wNo),
        dateRange,
      };
    });
  }, [periodsForMonth]);
  const [selectedPeriodCode, setSelectedPeriodCode] = useState(MONTH_OVERVIEW);
  const selectedPeriod = useMemo(() => {
    return selectedPeriodCode === MONTH_OVERVIEW
      ? undefined
      : periodsForMonth.find((period) => period.period_code === selectedPeriodCode) || periodsForMonth.at(-1);
  }, [selectedPeriodCode, periodsForMonth]);
  const selectedPeriodIndex = useMemo(() => {
    return selectedPeriod
      ? periodsForMonth.findIndex((period) => period.period_code === selectedPeriod.period_code)
      : -1;
  }, [selectedPeriod, periodsForMonth]);
  const selectedPeriodHeading = selectedPeriod
    ? `Tuần ${getPeriodWeekNumber(selectedPeriod, Math.max(0, selectedPeriodIndex))} · ${formatPeriodRange(selectedPeriod) || selectedPeriod.period_label}`
    : 'Chưa có kỳ';
  const isMonthOverview = selectedPeriodCode === MONTH_OVERVIEW;
  const periodCodesForMonth = useMemo(() => new Set(periodsForMonth.map((period) => period.period_code)), [periodsForMonth]);
  const weeklyRowsForMonth = useMemo(() => {
    return normalizedWeeklyAllocations.filter((row) => (
      row.period_month === selectedMonth && periodCodesForMonth.has(row.period_code)
    ));
  }, [normalizedWeeklyAllocations, selectedMonth, periodCodesForMonth]);

  const monthContracts = useMemo(() => {
    const range = getMonthWeekRange(selectedMonth);
    return normalizedContracts
      .filter((contract) => {
        const contractDate = contract.contract_date.slice(0, 10);
        return contractDate >= range.start && contractDate < range.endExclusive;
      })
      .sort((a, b) => a.contract_date.localeCompare(b.contract_date) || a.id - b.id);
  }, [normalizedContracts, selectedMonth]);
  const { gross: monthGrossSales, general: monthBase, allocation: monthAllocationBase } = useMemo(() => (
    monthContracts.reduce((totals, contract) => ({
      gross: totals.gross + Number(contract.value || 0),
      general: totals.general + (isBdsContract(contract.contract_type) ? contract.allocated_value : Number(contract.value || 0)),
      allocation: totals.allocation + contract.allocated_value,
    }), { gross: 0, general: 0, allocation: 0 })
  ), [monthContracts]);

  const periodBasesMap = useMemo(() => {
    const map = new Map<string, { gross: number; general: number; allocation: number }>();
    for (const period of periodsForMonth) {
      let gross = 0;
      let general = 0;
      let allocation = 0;
      for (const contract of monthContracts) {
        if (contractWithinPeriod(contract, period)) {
          gross += Number(contract.value || 0);
          general += isBdsContract(contract.contract_type) ? contract.allocated_value : Number(contract.value || 0);
          allocation += contract.allocated_value;
        }
      }
      map.set(period.period_code, { gross, general, allocation });
    }
    return map;
  }, [periodsForMonth, monthContracts]);

  const periodBase = useCallback((period: WeeklyAllocation) => {
    return periodBasesMap.get(period.period_code)?.general ?? 0;
  }, [periodBasesMap]);

  const selectedBase = useMemo(() => {
    return selectedPeriod ? periodBase(selectedPeriod) : 0;
  }, [selectedPeriod, periodBase]);
  const selectedGrossSales = useMemo(() => {
    return selectedPeriod ? periodBasesMap.get(selectedPeriod.period_code)?.gross ?? 0 : 0;
  }, [selectedPeriod, periodBasesMap]);
  const selectedAllocationBase = useMemo(() => {
    return selectedPeriod ? periodBasesMap.get(selectedPeriod.period_code)?.allocation ?? 0 : 0;
  }, [selectedPeriod, periodBasesMap]);
  const monthEventPool = useMemo(() => Math.round(monthBase * 0.005), [monthBase]);

  const monthlyEventExpenses = useMemo(() => {
    return eventExpenses.filter((item) => withinMonth(item.event_date, selectedMonth));
  }, [eventExpenses, selectedMonth]);
  const staffProposed = useMemo(() => {
    return monthlyEventExpenses.reduce((sum, item) => sum + item.proposed_amount, 0);
  }, [monthlyEventExpenses]);
  const staffPaid = useMemo(() => {
    return monthlyEventExpenses
      .filter((item) => isPaidStatus(item.status))
      .reduce((sum, item) => sum + item.proposed_amount, 0);
  }, [monthlyEventExpenses]);

  // Group event expenses by event_code for Tab Sự kiện & Đào tạo
  const eventExpenseGroups = useMemo(() => {
    const groups = new Map<string, {
      code: string;
      date: string;
      title: string;
      location: string;
      items: EventFundExpense[];
      subtotal: number;
    }>();

    // Map events by date/code
    const eventInfoMap = new Map<string, { name: string; location: string }>();
    (events || []).forEach((ev) => {
      const dateKey = ev.event_date ? ev.event_date.slice(0, 10) : '';
      if (dateKey) {
        eventInfoMap.set(dateKey, { name: ev.name, location: ev.location || '' });
      }
      if (ev.code) {
        eventInfoMap.set(ev.code, { name: ev.name, location: ev.location || '' });
      }
    });

    monthlyEventExpenses.forEach((exp) => {
      const code = exp.event_code || 'Chung';
      const existing = groups.get(code);
      const dateKey = exp.event_date ? exp.event_date.slice(0, 10) : '';
      const matchedEv = eventInfoMap.get(code) || (dateKey ? eventInfoMap.get(dateKey) : null);

      if (existing) {
        existing.items.push(exp);
        existing.subtotal += Number(exp.proposed_amount) || 0;
      } else {
        groups.set(code, {
          code,
          date: exp.event_date,
          title: matchedEv?.name || `TIỆC TRÀ & CHỐT HỢP ĐỒNG · ${code}`,
          location: matchedEv?.location || 'ML6-23 Vinhomes Green Bay, đường Lương Thế Vinh, Đại Mỗ, Hà Nội',
          items: [exp],
          subtotal: Number(exp.proposed_amount) || 0,
        });
      }
    });

    return Array.from(groups.values()).sort((a, b) => (a.date || '').localeCompare(b.date || ''));
  }, [monthlyEventExpenses, events]);

  const otherEventRequests = useMemo(() => {
    return logs.filter(
      (log) => log.fund_source.toLowerCase().includes('sự kiện')
        && log.request_date
        && withinMonth(log.request_date, selectedMonth)
        && Number(log.proposed_amount || 0) > 0
        && log.status !== 'Từ chối'
    );
  }, [logs, selectedMonth]);
  const otherEventProposed = useMemo(() => {
    return otherEventRequests.reduce((sum, item) => sum + Number(item.proposed_amount || 0), 0);
  }, [otherEventRequests]);
  const otherEventPaid = useMemo(() => {
    return otherEventRequests
      .filter((item) => isPaidStatus(item.status))
      .reduce((sum, item) => sum + Number(item.actual_expense || 0), 0);
  }, [otherEventRequests]);
  const monthlyEventPaid = useMemo(() => staffPaid + otherEventPaid, [staffPaid, otherEventPaid]);

  const monthlyLeaderPool = useMemo(() => Math.round(monthBase * 0.029), [monthBase]);
  const monthlyLeaderRequests = useMemo(() => Math.round(monthlyLeaderPool * 0.7), [monthlyLeaderPool]);

  const selectedLeaderPool = useMemo(() => selectedPeriod ? Math.round(selectedBase * 0.029) : 0, [selectedPeriod, selectedBase]);
  const selectedLeaderRequests = useMemo(() => Math.round(selectedLeaderPool * 0.7), [selectedLeaderPool]);

  const selectedRows = useMemo(() => {
    return selectedPeriod
      ? DEFAULT_FUNDS.map((fund) => {
          const existing = normalizedWeeklyAllocations.find(
            (row) => row.period_code === selectedPeriod.period_code && row.fund_key === fund.key
          );
          const rate = existing?.allocation_rate ?? fund.rate;
          const requested_amount = Math.round(selectedAllocationBase * rate);
          return {
            period_code: selectedPeriod.period_code,
            period_month: selectedPeriod.period_month,
            period_label: selectedPeriod.period_label,
            period_start: selectedPeriod.period_start,
            period_end: selectedPeriod.period_end,
            fund_key: fund.key,
            fund_source: FUND_SOURCE_BY_KEY[fund.key] || existing?.fund_source || fund.key,
            allocation_rate: rate,
            requested_amount,
            source_sheet: existing?.source_sheet || 'Chính sách phân bổ 15%',
            allocation_amount: requested_amount,
          };
        }).sort((a, b) => FUND_ORDER.indexOf(a.fund_key) - FUND_ORDER.indexOf(b.fund_key))
      : [];
  }, [selectedPeriod, normalizedWeeklyAllocations, selectedAllocationBase]);

  const monthFundRows = useMemo(() => {
    return DEFAULT_FUNDS.map((fund) => {
      let totalAllocation = 0;
      let totalRequested = 0;
      for (const period of periodsForMonth) {
        const base = periodBasesMap.get(period.period_code)?.allocation ?? 0;
        const existing = normalizedWeeklyAllocations.find(
          (row) => row.period_code === period.period_code && row.fund_key === fund.key
        );
        const rate = existing?.allocation_rate ?? fund.rate;
        const amt = Math.round(base * rate);
        totalAllocation += amt;
        totalRequested += amt;
      }
      return {
        fund_key: fund.key,
        fund_source: FUND_SOURCE_BY_KEY[fund.key] || fund.key,
        allocation_rate: fund.rate,
        requested_amount: totalRequested,
        source_sheet: 'Chính sách phân bổ 15%',
        allocation_amount: totalAllocation,
        periods: periodsForMonth.length,
      };
    }).sort((a, b) => FUND_ORDER.indexOf(a.fund_key) - FUND_ORDER.indexOf(b.fund_key));
  }, [periodsForMonth, periodBasesMap, normalizedWeeklyAllocations]);

  const selectedRequests = useMemo(() => {
    return selectedPeriod ? selectedRows.reduce((sum, row) => sum + row.requested_amount, 0) : 0;
  }, [selectedPeriod, selectedRows]);
  const monthRequests = useMemo(() => {
    return monthFundRows.reduce((sum, row) => sum + row.requested_amount, 0);
  }, [monthFundRows]);

  const selectedContracts = useMemo(() => {
    return selectedPeriod
      ? monthContracts
          .filter((contract) => contractWithinPeriod(contract, selectedPeriod))
          .sort((a, b) => a.contract_date.localeCompare(b.contract_date) || a.id - b.id)
      : [];
  }, [selectedPeriod, monthContracts]);
  const displayedContracts = useMemo(() => {
    return isMonthOverview ? monthContracts : selectedContracts;
  }, [isMonthOverview, monthContracts, selectedContracts]);
  const displayedContractTotals = useMemo(() => {
    return displayedContracts.reduce((totals, contract) => ({
      pool: totals.pool + contractPool(contract),
      commission: totals.commission + contractCommission(contract, initialMembers),
      remaining: totals.remaining + contractRemainingFund(contract, initialMembers),
    }), { pool: 0, commission: 0, remaining: 0 });
  }, [displayedContracts, initialMembers]);

  const monthPeopleRows = useMemo(() => {
    return groupContractsByPerson(monthContracts, initialMembers);
  }, [monthContracts, initialMembers]);
  const selectedPeopleRows = useMemo(() => {
    if (isMonthOverview) return monthPeopleRows;
    return groupContractsByPerson(selectedContracts, initialMembers);
  }, [isMonthOverview, monthPeopleRows, selectedContracts, initialMembers]);
  const peopleRows = isMonthOverview ? monthPeopleRows : selectedPeopleRows;

  const [personTitleFilter, setPersonTitleFilter] = useState('all');
  const [personSortOrder, setPersonSortOrder] = useState<'amount_desc' | 'amount_asc' | 'trend_up' | 'trend_down' | 'contracts_desc' | 'name_asc'>('amount_desc');
  const [personTrendFilter, setPersonTrendFilter] = useState<'all' | 'up' | 'down' | 'stable'>('all');
  const [personSearchQuery, setPersonSearchQuery] = useState('');

  const initialMembersMap = useMemo(() => {
    const map = new Map<string, TransactionMember>();
    for (const m of initialMembers) {
      const key = normalizePersonName(m.full_name).replace(/y/g, 'i');
      if (!map.has(key)) map.set(key, m);
    }
    return map;
  }, [initialMembers]);

  const monthlyPersonWeeklyAmounts = useMemo(() => {
    const map = new Map<string, Map<string, number>>();
    for (const contract of monthContracts) {
      const beneficiaries = contractBeneficiaries(contract, initialMembers);
      for (const period of periodsForMonth) {
        if (!contractWithinPeriod(contract, period)) continue;

        for (const b of beneficiaries) {
          if (!b.amount) continue;
          const pKey = normalizePersonName(b.name).replace(/y/g, 'i');
          let personPeriods = map.get(pKey);
          if (!personPeriods) {
            personPeriods = new Map<string, number>();
            map.set(pKey, personPeriods);
          }
          personPeriods.set(period.period_code, (personPeriods.get(period.period_code) || 0) + Number(b.amount));
        }
      }
    }
    return map;
  }, [monthContracts, periodsForMonth, initialMembers]);

  const enrichedPeopleRows = useMemo(() => {
    return peopleRows.map((person) => {
      const pKey = normalizePersonName(person.name).replace(/y/g, 'i');
      const matchingMember = initialMembersMap.get(pKey);

      const personSources: string[] = [];
      for (const { contract } of person.contracts) {
        const beneficiaries = contractBeneficiaries(contract, initialMembers);
        for (const b of beneficiaries) {
          if (areNamesMatching(b.name, person.name) && b.lines) {
            for (const line of b.lines) {
              if (line.source && !personSources.includes(line.source)) {
                personSources.push(line.source);
              }
            }
          }
        }
      }

      const title = resolveMemberTitle(person.name, matchingMember, personSources, person.contracts);
      const team_name = matchingMember?.team_name || person.contracts[0]?.contract.team_name || resolveContractTeam(person.contracts[0]?.contract);

      const personPeriods = monthlyPersonWeeklyAmounts.get(pKey);
      const weeklyBreakdown = periodsForMonth.map((period, pIdx) => {
        let weekAmount = personPeriods?.get(period.period_code) ?? 0;
        if (weekAmount === 0 && pKey.includes(' huong ')) {
          weekAmount = monthlyPersonWeeklyAmounts.get(pKey.replace(' huong ', ' '))?.get(period.period_code) ?? 0;
        }
        return {
          periodCode: period.period_code,
          label: period.period_label || `Tuần ${pIdx + 1}`,
          amount: weekAmount,
        };
      });

      let trend: 'up' | 'down' | 'stable' = 'stable';
      let trendPercent = 0;
      let diffAmount = 0;

      if (!isMonthOverview && selectedPeriodIndex !== -1) {
        const currentWeekAmount = weeklyBreakdown[selectedPeriodIndex]?.amount ?? person.total;
        if (selectedPeriodIndex > 0) {
          const prevWeekAmount = weeklyBreakdown[selectedPeriodIndex - 1]?.amount ?? 0;
          diffAmount = currentWeekAmount - prevWeekAmount;
          if (prevWeekAmount > 0) {
            trendPercent = Math.round((diffAmount / prevWeekAmount) * 100);
          } else if (currentWeekAmount > 0) {
            trendPercent = 100;
          }
          trend = diffAmount > 0 ? 'up' : diffAmount < 0 ? 'down' : 'stable';
        } else {
          diffAmount = currentWeekAmount;
          trendPercent = currentWeekAmount > 0 ? 100 : 0;
          trend = currentWeekAmount > 0 ? 'up' : 'stable';
        }
      } else {
        const activeWeeks = weeklyBreakdown.filter((w) => w.amount > 0);
        if (activeWeeks.length >= 2) {
          const lastWeek = activeWeeks[activeWeeks.length - 1];
          const prevWeek = activeWeeks[activeWeeks.length - 2];
          diffAmount = lastWeek.amount - prevWeek.amount;
          trendPercent = prevWeek.amount > 0 ? Math.round((diffAmount / prevWeek.amount) * 100) : 100;
          trend = diffAmount > 0 ? 'up' : diffAmount < 0 ? 'down' : 'stable';
        } else if (activeWeeks.length === 1) {
          diffAmount = activeWeeks[0].amount;
          trendPercent = 0;
          trend = 'stable';
        }
      }

      const monthTotal = weeklyBreakdown.reduce((sum, w) => sum + w.amount, 0);

      return {
        ...person,
        matchingMember,
        title,
        team_name,
        phone: matchingMember?.phone || person.contracts[0]?.contract.closer_phone || null,
        bank_account: matchingMember?.bank_account || null,
        weeklyBreakdown,
        monthTotal: monthTotal > 0 ? monthTotal : person.total,
        trend,
        trendPercent,
        diffAmount,
        sources: personSources,
      };
    });
  }, [peopleRows, initialMembersMap, periodsForMonth, monthlyPersonWeeklyAmounts, isMonthOverview, selectedPeriodIndex]);

  const titleStats = useMemo(() => {
    const map = new Map<string, {
      title: string;
      count: number;
      totalAmount: number;
      members: string[];
    }>();

    for (const p of enrichedPeopleRows) {
      const existing = map.get(p.title) || { title: p.title, count: 0, totalAmount: 0, members: [] };
      existing.count += 1;
      existing.totalAmount += p.total;
      existing.members.push(p.name);
      map.set(p.title, existing);
    }

    const roleOrder = [
      'Tổng điều hành',
      'Phó tổng',
      'Tri ân kết nối Phó tổng',
      'Chủ tịch',
      'Giám đốc',
      'Phó Giám đốc',
      'Trưởng phòng',
      'Chuyên viên tư vấn / Sale',
      'BP hỗ trợ CN',
      'Người kết nối / Giới thiệu',
      'Người hỗ trợ sale',
      'Chuyên viên / Thành viên',
    ];

    return Array.from(map.values()).sort((a, b) => {
      const idxA = roleOrder.indexOf(a.title);
      const idxB = roleOrder.indexOf(b.title);
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      if (idxA !== -1) return -1;
      if (idxB !== -1) return 1;
      return b.totalAmount - a.totalAmount;
    });
  }, [enrichedPeopleRows]);

  const filteredPeopleRows = useMemo(() => {
    const result = enrichedPeopleRows.filter((p) => {
      if (personTitleFilter !== 'all' && p.title !== personTitleFilter) {
        return false;
      }
      if (personTrendFilter === 'up' && p.trend !== 'up') return false;
      if (personTrendFilter === 'down' && p.trend !== 'down') return false;
      if (personTrendFilter === 'stable' && p.trend !== 'stable') return false;
      if (personSearchQuery.trim()) {
        const q = personSearchQuery.trim().toLowerCase();
        const normQ = normalizePersonName(q);
        const matchName = normalizePersonName(p.name).includes(normQ);
        const matchTitle = (p.title || '').toLowerCase().includes(q);
        const matchTeam = (p.team_name || '').toLowerCase().includes(q);
        const matchPhone = (p.phone || '').includes(q);
        if (!matchName && !matchTitle && !matchTeam && !matchPhone) return false;
      }
      return true;
    });

    result.sort((a, b) => {
      switch (personSortOrder) {
        case 'amount_desc':
          return b.total - a.total;
        case 'amount_asc':
          return a.total - b.total;
        case 'trend_up':
          return b.diffAmount - a.diffAmount || b.total - a.total;
        case 'trend_down':
          return a.diffAmount - b.diffAmount || a.total - b.total;
        case 'contracts_desc':
          return b.contracts.length - a.contracts.length || b.total - a.total;
        case 'name_asc':
          return a.name.localeCompare(b.name, 'vi');
        default:
          return b.total - a.total;
      }
    });

    return result;
  }, [enrichedPeopleRows, personTitleFilter, personTrendFilter, personSearchQuery, personSortOrder]);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFund, setSelectedFund] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedType, setSelectedType] = useState('all');
  const [selectedLogIds, setSelectedLogIds] = useState<Set<number>>(() => new Set());
  const [isBulkUpdatingPaid, setIsBulkUpdatingPaid] = useState(false);
  const [selectedPaymentDate, setSelectedPaymentDate] = useState(() => new Date().toISOString().slice(0, 10));
  useEffect(() => {
    const fundKey = new URLSearchParams(window.location.search).get('fund');
    const fundTerm = fundKey === 'customer-care' ? 'chăm sóc khách hàng'
      : fundKey === 'events' ? 'sự kiện'
      : fundKey === 'incentives' ? 'thi đua'
      : fundKey === 'travel' ? 'công tác phí'
      : '';
    if (!fundTerm) return;
    const match = logs.find((log) => (log.fund_source || '').toLocaleLowerCase('vi-VN').includes(fundTerm));
    if (match?.fund_source) setSelectedFund(match.fund_source);
    setActiveTab('vouchers');
  }, [logs]);
  const filteredLogs = logs.filter((log) => {
    const haystack = `${log.request_code} ${log.detail_content} ${log.requester_name} ${log.beneficiary_name} ${log.fund_source}`.toLocaleLowerCase('vi');
    return (!searchQuery || haystack.includes(searchQuery.toLocaleLowerCase('vi')))
      && (selectedFund === 'all' || log.fund_source === selectedFund)
      && (selectedStatus === 'all' || log.status === selectedStatus)
      && (selectedType === 'all' || (log.expense_type || 'Thủ công') === selectedType);
  });

  // Phân trang cho danh sách phiếu thu chi
  const [voucherPage, setVoucherPage] = useState(1);
  const [voucherPageSize, setVoucherPageSize] = useState(25);

  const paginatedLogs = useMemo(() => {
    if (voucherPageSize === 0) return filteredLogs;
    const start = (voucherPage - 1) * voucherPageSize;
    return filteredLogs.slice(start, start + voucherPageSize);
  }, [filteredLogs, voucherPage, voucherPageSize]);

  const totalVoucherPages = voucherPageSize === 0 ? 1 : Math.ceil(filteredLogs.length / voucherPageSize) || 1;

  // Phân trang cho bảng hợp đồng dòng tiền
  const [cashflowContractPage, setCashflowContractPage] = useState(1);
  const [cashflowContractPageSize, setCashflowContractPageSize] = useState(25);

  const paginatedContracts = useMemo(() => {
    if (cashflowContractPageSize === 0) return displayedContracts;
    const start = (cashflowContractPage - 1) * cashflowContractPageSize;
    return displayedContracts.slice(start, start + cashflowContractPageSize);
  }, [displayedContracts, cashflowContractPage, cashflowContractPageSize]);

  const totalContractPages = cashflowContractPageSize === 0 ? 1 : Math.ceil(displayedContracts.length / cashflowContractPageSize) || 1;

  // Phân trang cho bảng nhân sự thụ hưởng
  const [cashflowPeoplePage, setCashflowPeoplePage] = useState(1);
  const [cashflowPeoplePageSize, setCashflowPeoplePageSize] = useState(20);

  const paginatedPeopleRows = useMemo(() => {
    if (cashflowPeoplePageSize === 0) return filteredPeopleRows;
    const start = (cashflowPeoplePage - 1) * cashflowPeoplePageSize;
    return filteredPeopleRows.slice(start, start + cashflowPeoplePageSize);
  }, [filteredPeopleRows, cashflowPeoplePage, cashflowPeoplePageSize]);

  const totalPeoplePages = cashflowPeoplePageSize === 0 ? 1 : Math.ceil(filteredPeopleRows.length / cashflowPeoplePageSize) || 1;

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createProposalInitial, setCreateProposalInitial] = useState<{
    items?: TransactionLogItem[];
    fundSource?: string;
    note?: string;
  } | null>(null);
  const [viewLog, setViewLog] = useState<TransactionLog | null>(null);
  const [viewContract, setViewContract] = useState<FundContract | null>(null);
  const [distributionView, setDistributionView] = useState<'contract' | 'person'>('contract');
  const [printLog, setPrintLog] = useState<TransactionLog | null>(null);
  const [actionMenuId, setActionMenuId] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGeneratingSlips, setIsGeneratingSlips] = useState(false);
  const [form, setForm] = useState({
    requestCode: 'YC',
    requestDate: new Date().toISOString().slice(0, 10),
    fundSource: FUND_SOURCE_BY_KEY.direct_sale,
    detailContent: '',
    requesterName: '',
    requesterPhone: '',
    approverName: '',
    approverPhone: '',
    beneficiaryName: '',
    beneficiaryPhone: '',
    beneficiaryUserId: '',
    beneficiaryBankAccount: '',
    proposedAmount: '',
    status: 'Chờ duyệt',
  });

  const openCreateForm = () => {
    setForm((current) => ({
      ...current,
      requestCode: `YC${String(Date.now()).slice(-5)}`,
      requestDate: new Date().toISOString().slice(0, 10),
    }));
    setCreateProposalInitial(null);
    setIsCreateOpen(true);
  };

  const handleAutoGenerateEventPaymentProposal = (
    targetExpenses: EventFundExpense[] = monthlyEventExpenses,
    eventTitle?: string
  ) => {
    if (!targetExpenses.length) {
      alert('Không có dữ liệu thù lao sự kiện / đào tạo trong tháng được chọn.');
      return;
    }

    const generatedItems: TransactionLogItem[] = targetExpenses.map((exp, idx) => {
      const cleanName = exp.beneficiary_name.trim().toLowerCase();
      const cleanPhone = (exp.beneficiary_phone || '').replace(/\D/g, '');
      const member = initialMembers.find((m) =>
        m.full_name.trim().toLowerCase() === cleanName ||
        (cleanPhone && m.phone && m.phone.replace(/\D/g, '') === cleanPhone)
      );

      return {
        order: idx + 1,
        title: `Thù lao ${exp.expense_role} · ${exp.event_code}`,
        subtitle: `Buổi ${exp.event_code} ngày ${formatDate(exp.event_date)}`,
        fundSource: 'Quỹ Sự kiện & Chốt hợp đồng',
        beneficiaryName: exp.beneficiary_name,
        beneficiaryPhone: exp.beneficiary_phone || member?.phone || '',
        beneficiaryBankAccount: member?.bank_account || exp.beneficiary_phone || '',
        beneficiaryBankName: member?.bank_name || 'MB Bank',
        beneficiaryUserId: member?.id || null,
        amount: exp.proposed_amount,
        note: `Định mức thù lao ${exp.expense_role} sự kiện ${exp.event_code}`,
      };
    });

    const totalAmount = generatedItems.reduce((sum, it) => sum + (Number(it.amount) || 0), 0);
    const monthNum = Number(selectedMonth.slice(5)) || '—';
    const yearNum = selectedMonth.slice(0, 4) || '—';
    const noteContent = eventTitle
      ? `Đề nghị Kế toán thanh toán thù lao ${eventTitle} (${generatedItems.length} khoản chi, tổng ${formatVND(totalAmount)}).`
      : `Đề nghị Kế toán thanh toán thù lao định mức các buổi đào tạo & sự kiện Tháng ${monthNum}/${yearNum} (${generatedItems.length} khoản chi, tổng ${formatVND(totalAmount)}).`;

    setCreateProposalInitial({
      items: generatedItems,
      fundSource: 'Quỹ Sự kiện & Chốt hợp đồng',
      note: noteContent,
    });
    setIsCreateOpen(true);
  };

  const handleCopyEventMBBank = async (
    targetExpenses: EventFundExpense[] = monthlyEventExpenses,
    label = 'các buổi sự kiện'
  ) => {
    try {
      const headers = ['Tên chủ tài khoản', 'Số tài khoản', 'Ngân hàng', 'Số tiền', 'Nội dung chuyển tiền'];
      const rows = targetExpenses.map((exp) => {
        const cleanName = exp.beneficiary_name.trim().toLowerCase();
        const cleanPhone = (exp.beneficiary_phone || '').replace(/\D/g, '');
        const member = initialMembers.find((m) =>
          m.full_name.trim().toLowerCase() === cleanName ||
          (cleanPhone && m.phone && m.phone.replace(/\D/g, '') === cleanPhone)
        );
        const acc = member?.bank_account || exp.beneficiary_phone || '';
        const bank = member?.bank_name || 'MB Bank';
        return [
          exp.beneficiary_name,
          acc,
          bank,
          String(exp.proposed_amount),
          `Thu lao su kien ${exp.event_code} - ${exp.expense_role}`,
        ];
      });
      const tsvContent = [headers.join('\t'), ...rows.map((r) => r.join('\t'))].join('\n');
      await navigator.clipboard.writeText(tsvContent);
      alert(`Đã sao chép danh sách ${rows.length} người thụ hưởng của ${label} theo chuẩn 4 cột chuyển khoản MB Bank!`);
    } catch {
      alert('Không thể sao chép tự động vào bộ nhớ tạm.');
    }
  };

  const handleGenerateAutomaticSlips = async () => {
    if (!confirm('Bạn có muốn tự động kiểm tra và tạo / đồng bộ phiếu chi từ các hợp đồng trong hệ thống?')) return;
    setIsGeneratingSlips(true);
    try {
      const response = await fetch('/api/admin/transaction-logs/generate', { method: 'POST' });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || 'Không tạo được phiếu tự động.');
      if (result.logs) setLogs((result.logs || []).map(sanitizeTransactionLogNames));
      alert('Tạo và đồng bộ phiếu tự động thành công!');
    } catch (error: unknown) {
      alert(error instanceof Error ? error.message : 'Có lỗi khi tạo phiếu tự động.');
    } finally {
      setIsGeneratingSlips(false);
    }
  };

  useEffect(() => {
    if (!printLog) return;
    const afterPrint = () => setPrintLog(null);
    window.addEventListener('afterprint', afterPrint);
    const timeoutId = window.setTimeout(() => window.print(), 100);
    return () => {
      window.clearTimeout(timeoutId);
      window.removeEventListener('afterprint', afterPrint);
    };
  }, [printLog]);

  const handleCreate = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.detailContent.trim() || !form.beneficiaryName.trim() || Number(form.proposedAmount) <= 0) {
      alert('Nhập người thụ hưởng, nội dung và số tiền đề xuất lớn hơn 0.');
      return;
    }
    setIsSubmitting(true);
    try {
      const response = await fetch('/api/admin/transaction-logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || 'Không tạo được phiếu.');
      setLogs((current) => [sanitizeTransactionLogNames(result.log), ...current]);
      setIsCreateOpen(false);
      setForm((current) => ({ ...current, requestCode: `YC${String(Date.now()).slice(-5)}`, detailContent: '', proposedAmount: '', beneficiaryName: '', beneficiaryPhone: '', beneficiaryUserId: '', beneficiaryBankAccount: '', status: 'Chờ duyệt' }));
    } catch (error: unknown) {
      alert(error instanceof Error ? error.message : 'Có lỗi xảy ra.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateLogStatus = async (log: TransactionLog, status: string) => {
    try {
      const response = await fetch('/api/admin/transaction-logs', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: log.id, status, paymentDate: isPaidStatus(status) ? selectedPaymentDate : undefined }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || 'Không cập nhật được phiếu.');
      setLogs((current) => current.map((item) => item.id === log.id ? sanitizeTransactionLogNames(result.log) : item));
      setActionMenuId(null);
    } catch (error: unknown) {
      alert(error instanceof Error ? error.message : 'Có lỗi xảy ra.');
    }
  };

  const handleBulkMarkPaid = async () => {
    const selectedLogs = logs.filter((log) => selectedLogIds.has(log.id) && !isPaidStatus(log.status));
    if (!selectedLogs.length) return;
    if (!confirm(`Đánh dấu ${selectedLogs.length} phiếu là đã chi?`)) return;

    setIsBulkUpdatingPaid(true);
    let updatedCount = 0;
    try {
      for (const log of selectedLogs) {
        const response = await fetch('/api/admin/transaction-logs', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: log.id, status: 'Đã chi', paymentDate: selectedPaymentDate }),
        });
        const result = await response.json();
        if (!response.ok || !result.success) {
          throw new Error(result.message || `Không cập nhật được phiếu ${log.request_code}.`);
        }
        setLogs((current) => current.map((item) => item.id === log.id ? sanitizeTransactionLogNames(result.log) : item));
        updatedCount += 1;
      }
      setSelectedLogIds(new Set());
    } catch (error) {
      alert(`${error instanceof Error ? error.message : 'Có lỗi xảy ra.'}${updatedCount ? ` Đã cập nhật ${updatedCount}/${selectedLogs.length} phiếu trước khi gặp lỗi.` : ''}`);
    } finally {
      setIsBulkUpdatingPaid(false);
    }
  };

  const deleteLog = async (log: TransactionLog) => {
    if (!confirm(`Xóa phiếu ${log.request_code}?`)) return;
    const response = await fetch(`/api/admin/transaction-logs?id=${log.id}`, { method: 'DELETE' });
    const result = await response.json();
    if (!response.ok || !result.success) {
      alert(result.message || 'Không xóa được phiếu.');
      return;
    }
    setLogs((current) => current.filter((item) => item.id !== log.id));
    setActionMenuId(null);
  };

  const handleYearChange = useCallback((year: number) => {
    setSelectedYear(String(year));
    setSelectedMonth(`${year}-${selectedMonth.slice(5, 7)}`);
    setSelectedPeriodCode(MONTH_OVERVIEW);
    setCashflowContractPage(1);
    setCashflowPeoplePage(1);
  }, [selectedMonth]);

  const handleMonthChange = useCallback((month: number | 'all') => {
    if (typeof month === 'number') {
      setSelectedMonth(`${selectedYear}-${String(month).padStart(2, '0')}`);
      setSelectedPeriodCode(MONTH_OVERVIEW);
      setCashflowContractPage(1);
      setCashflowPeoplePage(1);
    }
  }, [selectedYear]);

  const handleWeekChange = useCallback((weekNo: number, weekKey?: string) => {
    if (weekNo === 0 || !weekKey || weekKey === '__MONTH_OVERVIEW__') {
      setSelectedPeriodCode(MONTH_OVERVIEW);
    } else {
      setSelectedPeriodCode(weekKey);
    }
    setCashflowContractPage(1);
    setCashflowPeoplePage(1);
  }, []);

  const paidAmountForFund = useCallback((fundKey: string, fundSource: string) => {
    const target = normalizeFund(FUND_SOURCE_BY_KEY[fundKey] || fundSource);
    const normSource = normalizeFund(fundSource);

    // 1. Nếu đang xem một kỳ tuần cụ thể: kiểm tra số đã chi từ danh mục phân bổ kỳ tuần
    if (!isMonthOverview && selectedPeriod) {
      const rec = allocationsList.find(
        (w) =>
          w.period_code === selectedPeriod.period_code &&
          (w.fund_key === fundKey ||
            normalizeFund(w.fund_source) === normSource ||
            normalizeFund(w.fund_source) === target)
      );
      if (rec && rec.paid_amount !== undefined && rec.paid_amount !== null) {
        return Number(rec.paid_amount);
      }
    }

    // 2. Nếu đang xem tổng quan tháng: kiểm tra số đã chi tổng hợp từ các bản ghi trong tháng
    if (isMonthOverview) {
      const monthRecs = allocationsList.filter(
        (w) =>
          w.period_month === selectedMonth &&
          (w.fund_key === fundKey ||
            normalizeFund(w.fund_source) === normSource ||
            normalizeFund(w.fund_source) === target)
      );
      const monthOverviewRec = monthRecs.find((w) => w.period_code.endsWith('-MONTH'));
      if (monthOverviewRec && Number(monthOverviewRec.paid_amount) > 0) {
        return Number(monthOverviewRec.paid_amount);
      }
      const weeklyRecs = monthRecs.filter((w) => !w.period_code.endsWith('-MONTH'));
      if (weeklyRecs.length > 0 && weeklyRecs.some((w) => Number(w.paid_amount) > 0)) {
        return weeklyRecs.reduce((sum, w) => sum + Number(w.paid_amount || 0), 0);
      }
    }

    // 3. Phương án dự phòng: tính từ các phiếu chi thực tế trong transaction_logs
    return logs
      .filter((log) => {
        const paidDate = log.payment_date || log.request_date;
        if (!isPaidStatus(log.status) || !paidDate) return false;
        if (isMonthOverview ? !withinMonth(paidDate, selectedMonth) : !selectedPeriod || !withinPeriod(paidDate, selectedPeriod)) return false;
        const logFund = normalizeFund(log.fund_source);
        return logFund === normSource || logFund === target;
      })
      .reduce((sum, log) => sum + Number(log.actual_expense ?? log.proposed_amount ?? 0), 0);
  }, [allocationsList, logs, isMonthOverview, selectedMonth, selectedPeriod]);

  const fundRowsToDisplay = isMonthOverview ? monthFundRows : selectedRows;
  const summaryTotals = useMemo(() => {
    return fundRowsToDisplay.reduce((acc, row) => {
      const allocation = row.allocation_amount;
      const paid = paidAmountForFund(row.fund_key, row.fund_source);
      const remaining = allocation - paid;
      return {
        allocation: acc.allocation + allocation,
        requested: acc.requested + Number(row.requested_amount || 0),
        paid: acc.paid + paid,
        remaining: acc.remaining + remaining,
      };
    }, { allocation: 0, requested: 0, paid: 0, remaining: 0 });
  }, [fundRowsToDisplay, isMonthOverview, selectedBase, logs, selectedMonth, selectedPeriod]);

  const [isExporting, setIsExporting] = useState(false);
  const [isExportingAllFunds, setIsExportingAllFunds] = useState(false);

  const handleExportAllFunds = async () => {
    try {
      setIsExportingAllFunds(true);
      const url = `/api/admin/all-funds/export?month=${encodeURIComponent(selectedMonth)}`;
      const response = await fetch(url);
      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.error || 'Không thể xuất báo cáo tổng hợp tất cả các quỹ.');
      }
      const blob = await response.blob();
      const disposition = response.headers.get('content-disposition');
      let filename = `Bao-cao-tong-hop-tat-ca-cac-quy-Thang-${selectedMonth}.xlsx`;
      if (disposition && disposition.includes('filename=')) {
        const match = disposition.match(/filename="?([^";]+)"?/);
        if (match?.[1]) filename = decodeURIComponent(match[1]);
      }
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(downloadUrl);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Có lỗi khi xuất báo cáo tổng hợp tất cả các quỹ.');
    } finally {
      setIsExportingAllFunds(false);
    }
  };

  const handleExportExcel = async () => {
    try {
      setIsExporting(true);
      const periodParam = isMonthOverview ? 'MONTH_OVERVIEW' : selectedPeriodCode;
      const url = `/api/admin/transaction-logs/export?month=${encodeURIComponent(selectedMonth)}&period_code=${encodeURIComponent(periodParam)}`;
      const response = await fetch(url);
      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.error || 'Không thể xuất file Excel.');
      }
      const blob = await response.blob();
      const disposition = response.headers.get('content-disposition');
      let filename = isMonthOverview
        ? `Bao_cao_chot_quy_thang_${selectedMonth}.xlsx`
        : `DNTT_hoa_hong_${selectedPeriodCode}.xlsx`;
      if (disposition && disposition.includes('filename=')) {
        const match = disposition.match(/filename="?([^";]+)"?/);
        if (match?.[1]) filename = decodeURIComponent(match[1]);
      }
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(downloadUrl);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Có lỗi khi xuất file Excel.');
    } finally {
      setIsExporting(false);
    }
  };

  const previewFunds: ExcelPreviewCashflowFund[] = useMemo(() => {
    return fundRowsToDisplay.map((r) => {
      const paid = paidAmountForFund(r.fund_key, r.fund_source);
      const remaining = r.allocation_amount - paid;
      const ratePct = r.allocation_rate > 1 ? r.allocation_rate : r.allocation_rate * 100;
      return {
        name: FUND_LABELS[r.fund_key] || r.fund_source,
        rateText: `${ratePct.toLocaleString('vi-VN', { maximumFractionDigits: 1 })}%`,
        allocated: r.allocation_amount,
        spent: paid,
        remaining,
      };
    });
  }, [fundRowsToDisplay, paidAmountForFund]);

  const previewPeople: ExcelPreviewCashflowPerson[] = useMemo(() => {
    const list = isMonthOverview ? monthPeopleRows : selectedPeopleRows;
    return list.map((p, idx) => {
      const amounts: Record<string, number> = {};
      const memberKey = normalizePersonName(p.name).replace(/y/g, 'i');
      const memberInfo = initialMembersMap.get(memberKey);
      return {
        stt: idx + 1,
        name: p.name,
        phone: memberInfo?.phone || null,
        bankAccount: memberInfo?.bank_account || null,
        bankName: memberInfo?.bank_name || 'MB Bank',
        total: p.total,
        detail: p.contracts?.map((c) => `- HĐ ${c.contract.contract_code || c.contract.customer_name}: ${formatVND(c.amount)}`).join('\n') || '',
        amounts,
      };
    });
  }, [isMonthOverview, monthPeopleRows, selectedPeopleRows, initialMembersMap]);

  return (
    <div className="space-y-5 px-[30px] pt-6 pb-8">
      <header className="flex flex-col gap-4 rounded-2xl bg-slate-100 p-5 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="mb-1 flex items-center gap-2 text-xs font-medium text-slate-500">
            <Link href="/admin" className="hover:text-blue-600">Trang chủ</Link><span>›</span><span>Nhật ký thu chi</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Nhật ký dòng tiền & phân bổ quỹ</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleGenerateAutomaticSlips}
            disabled={isGeneratingSlips}
            className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-blue-200 bg-white px-3.5 py-2.5 text-xs font-semibold text-blue-700 shadow-2xs transition hover:bg-blue-50 disabled:opacity-60 cursor-pointer"
            title="Đồng bộ phiếu tự động từ danh sách hợp đồng hệ thống"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isGeneratingSlips ? 'animate-spin' : ''}`} />
            <span>{isGeneratingSlips ? 'Đang tạo phiếu...' : 'Tạo phiếu tự động từ HĐ'}</span>
          </button>
          <button onClick={openCreateForm} className="hidden sm:inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700">
            <Plus className="h-4 w-4" /> Thêm phiếu chi
          </button>
        </div>
      </header>

      <div className="flex flex-wrap items-center gap-2">
        {[
          { id: 'cashflow' as const, title: 'Nhật ký dòng tiền & Phân bổ quỹ', subtitle: 'Quản lý theo hợp đồng' },
          { id: 'vouchers' as const, title: 'Nhật ký phiếu thu chi', subtitle: 'Phiếu tự động và thủ công' },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`rounded-xl px-4 py-2.5 text-left transition cursor-pointer border shadow-2xs ${
              activeTab === tab.id
                ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            <span className="block text-xs font-bold sm:text-sm">{tab.title}</span>
            <span className={`mt-0.5 block text-[10px] ${activeTab === tab.id ? 'text-blue-100' : 'text-slate-500'}`}>{tab.subtitle}</span>
          </button>
        ))}
      </div>

      {activeTab !== 'vouchers' && (
        <AdminTimeFilter
          selectedYear={Number(selectedYear)}
          yearOptions={yearOptions}
          onYearChange={handleYearChange}
          selectedMonth={Number(selectedMonth.slice(5, 7))}
          onMonthChange={handleMonthChange}
          selectedWeek={isMonthOverview ? 0 : selectedPeriodCode}
          onWeekChange={handleWeekChange}
          customWeeks={timeFilterWeeks}
          rightSlot={
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsExcelPreviewOpen(true)}
                disabled={isExporting}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-emerald-700 active:scale-95 transition disabled:opacity-50 cursor-pointer"
                title={isMonthOverview ? `Xem trước & Xuất báo cáo quyết toán quỹ Tháng ${selectedMonth}` : `Xem trước & Xuất đề nghị thanh toán ${selectedPeriodHeading}`}
              >
                <FileSpreadsheet className="h-4 w-4" />
                <span>Xuất Excel</span>
              </button>
            </div>
          }
        />
      )}

      {activeTab === 'cashflow' && <>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={Wallet} label={isMonthOverview ? 'Doanh số HĐ tháng' : 'Doanh số HĐ kỳ tuần'} value={formatVND(isMonthOverview ? monthGrossSales : selectedGrossSales)} note={`${isMonthOverview ? monthContracts.length : selectedContracts.length} hợp đồng ${isMonthOverview ? 'trong tháng' : 'trong kỳ'}`} tint="blue" />
        <StatCard icon={CircleDollarSign} label={isMonthOverview ? 'Quỹ phân bổ tháng (15%)' : 'Quỹ phân bổ tuần (15%)'} value={formatVND(displayedContractTotals.pool)} note="Tính theo giá trị chốt được phân bổ" tint="indigo" />
        <StatCard icon={Receipt} label={isMonthOverview ? 'Đề nghị chi theo tháng' : 'Đề nghị chi theo bảng tuần'} value={formatVND(isMonthOverview ? monthRequests : selectedRequests)} note={isMonthOverview ? 'Cộng tất cả các tuần trong tháng' : 'Tổng cột đề nghị trong DNTT'} tint="amber" />
        <StatCard icon={Users} label={isMonthOverview ? 'Số người được nhận hoa hồng theo tháng' : 'Số người được nhận hoa hồng'} value={`${(isMonthOverview ? peopleRows : monthPeopleRows).length} người`} note={isMonthOverview ? `Tháng ${Number(selectedMonth.slice(5)) || '—'}/${selectedMonth.slice(0, 4) || '—'}` : `Kỳ tuần: ${peopleRows.length} người · Cả tháng: ${monthPeopleRows.length} người`} tint="emerald" />
      </div>

      <div className="grid gap-5 lg:grid-cols-12 items-stretch">
        <div className="lg:col-span-7 xl:col-span-8 relative min-h-[580px]">
          <Panel className="flex flex-col overflow-hidden h-full lg:absolute lg:inset-0">
            <div className="shrink-0 border-b border-slate-200 px-5 py-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h2 className="font-bold text-slate-900">Bảng kê hợp đồng & nhân sự thụ hưởng — {isMonthOverview ? `Tổng quan tháng ${Number(selectedMonth.slice(5))}/${selectedMonth.slice(0, 4)}` : selectedPeriodHeading}</h2>
                  <p className="mt-1 text-xs text-slate-500">Hiển thị danh sách nhân sự và số tiền phân bổ theo từng hợp đồng.</p>
                </div>
                <div role="group" aria-label="Chế độ xem bảng kê" className="flex shrink-0 rounded-lg border border-slate-200 bg-slate-50 p-1">
                  <button type="button" aria-pressed={distributionView === 'contract'} onClick={() => setDistributionView('contract')} className={`rounded-md px-3 py-2 text-[11px] font-semibold ${distributionView === 'contract' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:bg-white'}`}>
                    Xem theo hợp đồng
                  </button>
                  <button type="button" aria-pressed={distributionView === 'person'} onClick={() => setDistributionView('person')} className={`rounded-md px-3 py-2 text-[11px] font-semibold ${distributionView === 'person' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:bg-white'}`}>
                    Xem theo Họ và tên
                  </button>
                </div>
              </div>
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto overflow-x-auto scrollbar-thin [scrollbar-color:#cbd5e1_transparent] [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar]:h-2 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-300 hover:[&::-webkit-scrollbar-thumb]:bg-slate-400 [&::-webkit-scrollbar-track]:bg-transparent">
              {distributionView === 'contract' ? (
                <>
                  <table className="min-w-[1120px] w-full text-left text-xs border-collapse">
                  <thead className="sticky top-0 z-10 bg-slate-50 text-[10px] uppercase tracking-wide text-slate-500 shadow-2xs">
                    <tr>
                      <th className="px-4 py-3 bg-slate-50">Ngày / HĐ / Khách hàng</th>
                      <th className="px-3 py-3 text-right bg-slate-50">Giá trị phân bổ</th>
                      <th className="px-3 py-3 bg-slate-50">Danh sách nhân sự thụ hưởng</th>
                      <th className="px-3 py-3 text-right bg-slate-50">Quỹ chưa chia (15%)</th>
                      <th className="px-3 py-3 text-right bg-slate-50">Hoa hồng chia</th>
                      <th className="px-3 py-3 text-right bg-slate-50">Quỹ còn lại</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {displayedContracts.length ? paginatedContracts.map((contract) => {
                      const beneficiaries = contractBeneficiaries(contract, initialMembers);
                      return (
                      <tr
                        key={contract.id}
                        role="button"
                        tabIndex={0}
                        onClick={() => setViewContract(contract)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault();
                            setViewContract(contract);
                          }
                        }}
                        title="Xem chi tiết hợp đồng"
                        className="cursor-pointer hover:bg-blue-50/60 focus:bg-blue-50/60 focus:outline-none"
                      >
                        <td className="px-4 py-3">
                          <div className="font-semibold text-slate-800">{contract.contract_code || `HĐ #${contract.id}`} · {contract.customer_name}</div>
                          <div className="mt-1 text-[10px] text-slate-500">Ngày ký {formatDate(contract.contract_date)} · {contract.status}</div>
                          <div className="mt-1"><ContractTermBadge contractDate={contract.contract_date} contractType={contract.contract_type} /></div>
                        </td>
                        <td className="whitespace-nowrap px-3 py-3 text-right font-semibold text-slate-900">
                          <div>{formatVND(contract.allocated_value)}</div>
                          {isBdsContract(contract.contract_type) && (
                            <span className="inline-block mt-0.5 rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-700">
                              BĐS · 4/15
                            </span>
                          )}
                          {isTwoYearContract(contract.contract_type) && (
                            <span className="inline-block mt-0.5 rounded bg-violet-50 px-1.5 py-0.5 text-[10px] font-medium text-violet-700">
                              HĐ 2 năm · 70%
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-3">
                          <div className="flex min-w-[330px] flex-wrap gap-1.5">
                            {beneficiaries.map((person, index) => (
                              <span key={`${person.name}-${index}`} className="inline-flex flex-wrap items-center gap-x-1 rounded-md bg-slate-50 px-2 py-1 text-[10px]">
                                <span className="font-semibold text-slate-700">{person.name}</span>
                                <span className="whitespace-nowrap text-slate-500">{formatVND(person.amount)}</span>
                              </span>
                            ))}
                            {!beneficiaries.length && <span className="text-slate-400">Chưa có nhân sự</span>}
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-3 py-3 text-right">{formatVND(contractPool(contract))}</td>
                        <td className="whitespace-nowrap px-3 py-3 text-right font-semibold text-slate-800">{formatVND(contractCommission(contract, initialMembers))}</td>
                        <td className="whitespace-nowrap px-3 py-3 text-right font-semibold text-slate-800">{formatVND(contractRemainingFund(contract, initialMembers))}</td>
                      </tr>
                      );
                    }) : <tr><td colSpan={6} className="px-4 py-12 text-center text-slate-500">{isMonthOverview ? 'Không có hợp đồng trong tháng này.' : 'Không có hợp đồng trong kỳ này.'}</td></tr>}
                  </tbody>
                  <tfoot className="sticky bottom-0 z-10 bg-blue-50 font-bold text-slate-800 shadow-2xs">
                    <tr>
                      <td className="px-4 py-3 bg-blue-50">{isMonthOverview ? 'TỔNG CỘNG THÁNG' : 'TỔNG CỘNG KỲ TUẦN'}</td>
                      <td className="whitespace-nowrap px-3 py-3 text-right text-blue-700 bg-blue-50">{formatVND(isMonthOverview ? monthAllocationBase : selectedAllocationBase)}</td>
                      <td className="px-3 py-3 text-slate-600 bg-blue-50">{displayedContracts.length} hợp đồng · {peopleRows.length} nhân sự</td>
                      <td className="whitespace-nowrap px-3 py-3 text-right bg-blue-50">{formatVND(displayedContractTotals.pool)}</td>
                      <td className="whitespace-nowrap px-3 py-3 text-right bg-blue-50">{formatVND(displayedContractTotals.commission)}</td>
                      <td className="whitespace-nowrap px-3 py-3 text-right bg-blue-50">{formatVND(displayedContractTotals.remaining)}</td>
                    </tr>
                  </tfoot>
                </table>
                {totalContractPages > 1 && (
                  <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-white px-4 py-3 text-xs text-slate-600">
                    <div>
                      Hiển thị {((cashflowContractPage - 1) * cashflowContractPageSize) + 1} - {Math.min(cashflowContractPage * cashflowContractPageSize, displayedContracts.length)} trong {displayedContracts.length} hợp đồng
                    </div>
                    <div className="flex items-center gap-2">
                      <select
                        aria-label="Số dòng hợp đồng mỗi trang"
                        value={cashflowContractPageSize}
                        onChange={(e) => {
                          setCashflowContractPageSize(Number(e.target.value));
                          setCashflowContractPage(1);
                        }}
                        className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs"
                      >
                        <option value={25}>25 / trang</option>
                        <option value={50}>50 / trang</option>
                        <option value={100}>100 / trang</option>
                        <option value={0}>Tất cả</option>
                      </select>
                      <button
                        type="button"
                        disabled={cashflowContractPage <= 1}
                        onClick={() => setCashflowContractPage((p) => Math.max(1, p - 1))}
                        className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-semibold disabled:opacity-40 hover:bg-slate-50 cursor-pointer"
                      >
                        Trước
                      </button>
                      <span className="text-xs font-medium">Trang {cashflowContractPage} / {totalContractPages}</span>
                      <button
                        type="button"
                        disabled={cashflowContractPage >= totalContractPages}
                        onClick={() => setCashflowContractPage((p) => Math.min(totalContractPages, p + 1))}
                        className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-semibold disabled:opacity-40 hover:bg-slate-50 cursor-pointer"
                      >
                        Sau
                      </button>
                    </div>
                  </div>
                )}
              </>
            ) : (
                <div className="flex flex-col min-w-[980px]">
                  {/* Báo cáo thống kê số lượng thành viên theo từng chức danh/chức vụ nhận hoa hồng */}
                  <div className="sticky top-0 z-20 border-b border-slate-200 bg-slate-50/95 px-4 py-3 backdrop-blur-xs">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-2.5">
                      <div className="flex items-center gap-2">
                        <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-blue-600 text-white shadow-xs">
                          <Users className="h-3.5 w-3.5" />
                        </div>
                        <div>
                          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                            Thống kê thành viên nhận hoa hồng theo chức danh / chức vụ
                          </h3>
                          <p className="text-[11px] text-slate-500">
                            {isMonthOverview
                              ? `Tổng quan Tháng ${Number(selectedMonth.slice(5))}/${selectedMonth.slice(0, 4)}: ${enrichedPeopleRows.length} nhân sự thụ hưởng · ${titleStats.length} nhóm chức danh`
                              : `${selectedPeriodHeading}: ${enrichedPeopleRows.length} nhân sự thụ hưởng · ${titleStats.length} nhóm chức danh`}
                          </p>
                        </div>
                      </div>
                      {personTitleFilter !== 'all' && (
                        <button
                          type="button"
                          onClick={() => setPersonTitleFilter('all')}
                          className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 hover:text-blue-800 hover:underline"
                        >
                          <X className="h-3 w-3" />
                          Xóa lọc chức danh ({personTitleFilter})
                        </button>
                      )}
                    </div>

                    {/* Danh sách thẻ chức danh/chức vụ (Quick filter pills) */}
                    <div className="flex flex-wrap items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setPersonTitleFilter('all')}
                        className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-semibold transition ${
                          personTitleFilter === 'all'
                            ? 'border-blue-600 bg-blue-600 text-white shadow-xs'
                            : 'border-slate-200 bg-white text-slate-700 hover:border-blue-300 hover:bg-blue-50/50'
                        }`}
                      >
                        <span>Tất cả</span>
                        <span className={`rounded-full px-1.5 py-0.2 text-[10px] font-bold ${
                          personTitleFilter === 'all' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-700'
                        }`}>
                          {enrichedPeopleRows.length} người
                        </span>
                        <span className={`text-[10px] font-bold ${personTitleFilter === 'all' ? 'text-blue-100' : 'text-slate-600'}`}>
                          · {formatVND(displayedContractTotals.commission)}
                        </span>
                      </button>

                      {titleStats.map((stat) => {
                        const isSelected = personTitleFilter === stat.title;
                        const sharePct = displayedContractTotals.commission > 0
                          ? ((stat.totalAmount / displayedContractTotals.commission) * 100).toFixed(1)
                          : '0';
                        return (
                          <button
                            key={stat.title}
                            type="button"
                            onClick={() => setPersonTitleFilter(isSelected ? 'all' : stat.title)}
                            className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-semibold transition ${
                              isSelected
                                ? 'border-blue-600 bg-blue-600 text-white shadow-xs'
                                : 'border-slate-200 bg-white text-slate-700 hover:border-blue-300 hover:bg-blue-50/50'
                            }`}
                            title={`${stat.title}: ${stat.count} thành viên nhận hoa hồng, tổng ${formatVND(stat.totalAmount)} (${sharePct}%)`}
                          >
                            <span>{getRoleIcon(stat.title)} {stat.title}</span>
                            <span className={`rounded-full px-1.5 py-0.2 text-[10px] font-bold ${
                              isSelected ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-700'
                            }`}>
                              {stat.count} người
                            </span>
                            <span className={`text-[10px] font-bold ${isSelected ? 'text-blue-100' : 'text-emerald-700'}`}>
                              · {formatVND(stat.totalAmount)}
                            </span>
                            <span className={`text-[9px] ${isSelected ? 'text-blue-200' : 'text-slate-400'}`}>
                              ({sharePct}%)
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Thanh công cụ Bộ lọc & Sắp xếp */}
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-white px-4 py-2.5">
                    <div className="flex flex-wrap items-center gap-2">
                      {/* Lọc theo chức danh */}
                      <select
                        value={personTitleFilter}
                        onChange={(e) => setPersonTitleFilter(e.target.value)}
                        className="rounded-lg border border-slate-300 bg-white py-1.5 pl-2.5 pr-7 text-xs font-medium text-slate-700 hover:border-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        title="Lọc theo chức danh / chức vụ"
                      >
                        <option value="all">Tất cả chức danh / chức vụ ({enrichedPeopleRows.length} người)</option>
                        {titleStats.map((stat) => (
                          <option key={stat.title} value={stat.title}>
                            {stat.title} ({stat.count} người · {formatVND(stat.totalAmount)})
                          </option>
                        ))}
                      </select>

                      {/* Lọc theo biến động */}
                      <select
                        value={personTrendFilter}
                        onChange={(e) => setPersonTrendFilter(e.target.value as any)}
                        className="rounded-lg border border-slate-300 bg-white py-1.5 pl-2.5 pr-7 text-xs font-medium text-slate-700 hover:border-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        title="Lọc theo biến động tăng giảm"
                      >
                        <option value="all">Tất cả biến động</option>
                        <option value="up">📈 Tăng trưởng (+) ({enrichedPeopleRows.filter((p) => p.trend === 'up').length} người)</option>
                        <option value="down">📉 Giảm (-) ({enrichedPeopleRows.filter((p) => p.trend === 'down').length} người)</option>
                        <option value="stable">➖ Ổn định / 1 kỳ ({enrichedPeopleRows.filter((p) => p.trend === 'stable').length} người)</option>
                      </select>

                      {/* Sắp xếp theo số tiền tăng giảm */}
                      <select
                        value={personSortOrder}
                        onChange={(e) => setPersonSortOrder(e.target.value as any)}
                        className="rounded-lg border border-slate-300 bg-white py-1.5 pl-2.5 pr-7 text-xs font-medium text-slate-700 hover:border-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        title="Sắp xếp danh sách"
                      >
                        <option value="amount_desc">💰 Số tiền giảm dần (Cao nhất)</option>
                        <option value="amount_asc">📉 Số tiền tăng dần (Thấp nhất)</option>
                        <option value="trend_up">📈 Biến động tăng nhiều nhất</option>
                        <option value="trend_down">📉 Biến động giảm nhiều nhất</option>
                        <option value="contracts_desc">📋 Số lượng HĐ (Nhiều nhất)</option>
                        <option value="name_asc">🔤 Họ và tên (A → Z)</option>
                      </select>
                    </div>

                    {/* Ô tìm kiếm nhân sự */}
                    <div className="flex items-center gap-2">
                      <div className="relative w-44 sm:w-56">
                        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                        <input
                          type="text"
                          placeholder="Tìm tên, SĐT, đội nhóm..."
                          value={personSearchQuery}
                          onChange={(e) => setPersonSearchQuery(e.target.value)}
                          className="w-full rounded-lg border border-slate-300 bg-white py-1.5 pl-8 pr-7 text-xs text-slate-800 placeholder-slate-400 hover:border-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                        {personSearchQuery && (
                          <button
                            type="button"
                            onClick={() => setPersonSearchQuery('')}
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        )}
                      </div>

                      {(personTitleFilter !== 'all' || personTrendFilter !== 'all' || personSearchQuery !== '' || personSortOrder !== 'amount_desc') && (
                        <button
                          type="button"
                          onClick={() => {
                            setPersonTitleFilter('all');
                            setPersonTrendFilter('all');
                            setPersonSearchQuery('');
                            setPersonSortOrder('amount_desc');
                          }}
                          className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-[11px] font-semibold text-slate-600 hover:bg-slate-100 transition"
                          title="Đặt lại toàn bộ bộ lọc"
                        >
                          Đặt lại
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Bảng chi tiết nhân sự */}
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="sticky top-[108px] z-10 bg-slate-50 text-[10px] uppercase tracking-wide text-slate-500 shadow-2xs">
                      <tr>
                        <th className="px-4 py-3 bg-slate-50">Thành viên & Chức vụ</th>
                        <th className="px-3 py-3 text-center bg-slate-50">Số HĐ</th>
                        <th className="px-3 py-3 bg-slate-50">Biến động theo thời gian (Tuần 1–5)</th>
                        <th className="px-3 py-3 text-right bg-slate-50">Tổng hoa hồng</th>
                        <th className="px-3 py-3 bg-slate-50">Hợp đồng & Chi tiết phân bổ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredPeopleRows.length ? (
                        paginatedPeopleRows.map((person) => {
                          const maxWeekly = Math.max(...person.weeklyBreakdown.map((w) => w.amount), 1);
                          const initials = person.name.trim().split(/\s+/).slice(-2).map((p) => p[0]).join('').toUpperCase() || 'NV';
                          return (
                            <tr key={person.name} className="hover:bg-blue-50/40 transition">
                              {/* Thông tin nhân sự & Chức vụ */}
                              <td className="px-4 py-3">
                                <div className="flex items-start gap-2.5">
                                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-[11px] font-bold text-white shadow-2xs">
                                    {initials}
                                  </div>
                                  <div className="min-w-0">
                                    <div className="font-bold text-slate-900 flex items-center gap-1.5">
                                      <span>{person.name}</span>
                                    </div>
                                    <div className="mt-1 flex flex-wrap items-center gap-1.5">
                                      <span className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[10px] font-semibold ${getRoleBadgeStyle(person.title)}`}>
                                        <span>{getRoleIcon(person.title)}</span>
                                        <span>{person.title}</span>
                                      </span>
                                      {person.team_name && (
                                        <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-600">
                                          Đội: {person.team_name}
                                        </span>
                                      )}
                                      {person.phone && (
                                        <span className="text-[10px] text-slate-400">
                                          · {person.phone}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </td>

                              {/* Số lượng hợp đồng */}
                              <td className="px-3 py-3 text-center whitespace-nowrap">
                                <span className="inline-flex items-center justify-center rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-bold text-blue-700">
                                  {person.contracts.length} HĐ
                                </span>
                              </td>

                              {/* Biến động theo thời gian & Mini biểu đồ tuần */}
                              <td className="px-3 py-3">
                                <div className="min-w-[170px] max-w-[210px]">
                                  {/* Chỉ báo biến động */}
                                  <div className="flex items-center justify-between mb-1">
                                    {person.trend === 'up' && (
                                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600">
                                        <TrendingUp className="h-3 w-3" />
                                        +{person.trendPercent}% ({formatVND(person.diffAmount)})
                                      </span>
                                    )}
                                    {person.trend === 'down' && (
                                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-600">
                                        <TrendingDown className="h-3 w-3" />
                                        {person.trendPercent}% ({formatVND(person.diffAmount)})
                                      </span>
                                    )}
                                    {person.trend === 'stable' && (
                                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-slate-500">
                                        <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
                                        {isMonthOverview
                                          ? `${person.weeklyBreakdown.filter((w) => w.amount > 0).length} kỳ phát sinh`
                                          : 'Mới trong kỳ'}
                                      </span>
                                    )}
                                  </div>

                                  {/* Cột biểu đồ mini 5 tuần (W1-W5) */}
                                  <div className="flex items-end gap-1 h-6 rounded bg-slate-50 p-1 border border-slate-100">
                                    {person.weeklyBreakdown.map((w, idx) => {
                                      const heightPct = w.amount > 0 ? Math.max(20, Math.round((w.amount / maxWeekly) * 100)) : 6;
                                      const isCurrent = !isMonthOverview && selectedPeriodIndex === idx;
                                      return (
                                        <div
                                          key={w.periodCode}
                                          className="group relative flex-1 flex flex-col items-center justify-end h-full"
                                        >
                                          <div
                                            style={{ height: `${heightPct}%` }}
                                            className={`w-full rounded-xs transition ${
                                              w.amount > 0
                                                ? isCurrent
                                                  ? 'bg-blue-600'
                                                  : 'bg-indigo-400 group-hover:bg-indigo-600'
                                                : 'bg-slate-200'
                                            }`}
                                          />
                                          {/* Tooltip khi hover vào tuần */}
                                          <div className="pointer-events-none absolute bottom-full mb-1 hidden group-hover:block z-20 whitespace-nowrap rounded bg-slate-900 px-1.5 py-0.5 text-[9px] text-white shadow-md">
                                            {w.label}: {formatVND(w.amount)}
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                  <div className="flex justify-between text-[8px] text-slate-400 mt-0.5 px-0.5">
                                    <span>T1</span>
                                    <span>T2</span>
                                    <span>T3</span>
                                    <span>T4</span>
                                    <span>T5</span>
                                  </div>
                                </div>
                              </td>

                              {/* Tổng số tiền hoa hồng */}
                              <td className="whitespace-nowrap px-3 py-3 text-right">
                                <div className="font-extrabold text-slate-900 text-sm">
                                  {formatVND(person.total)}
                                </div>
                                {displayedContractTotals.commission > 0 && (
                                  <div className="mt-0.5 text-[10px] font-medium text-slate-500">
                                    {((person.total / displayedContractTotals.commission) * 100).toFixed(1)}% tổng quỹ
                                  </div>
                                )}
                              </td>

                              {/* Danh sách hợp đồng tương ứng */}
                              <td className="px-3 py-3">
                                <div className="flex flex-wrap gap-1.5 max-w-[380px]">
                                  {person.contracts.map(({ contract, amount }) => (
                                    <button
                                      key={contract.id}
                                      type="button"
                                      onClick={() => setViewContract(contract)}
                                      className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-left text-[10px] hover:border-blue-400 hover:bg-blue-50/80 transition"
                                      title="Nhấn để xem chi tiết hợp đồng"
                                    >
                                      <span className="block font-semibold text-slate-700 truncate max-w-[200px]">
                                        {contract.customer_name}
                                      </span>
                                      <span className="mt-0.5 block text-slate-500">
                                        {contract.contract_code || `HĐ #${contract.id}`} · <span className="font-bold text-blue-700">{formatVND(amount)}</span>
                                      </span>
                                    </button>
                                  ))}
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan={5} className="px-4 py-12 text-center text-slate-500">
                            <div className="flex flex-col items-center justify-center gap-2">
                              <Users className="h-8 w-8 text-slate-300" />
                              <p className="font-medium text-slate-600">Không tìm thấy thành viên nào phù hợp với bộ lọc.</p>
                              <button
                                type="button"
                                onClick={() => {
                                  setPersonTitleFilter('all');
                                  setPersonTrendFilter('all');
                                  setPersonSearchQuery('');
                                  setPersonSortOrder('amount_desc');
                                }}
                                className="mt-1 rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-600 hover:bg-blue-100"
                              >
                                Xóa tất cả bộ lọc
                              </button>
                            </div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                    <tfoot className="sticky bottom-0 z-10 bg-blue-50 font-bold text-slate-800 shadow-2xs">
                      <tr>
                        <td className="px-4 py-3 bg-blue-50">
                          TỔNG CỘNG ({filteredPeopleRows.length} / {enrichedPeopleRows.length} thành viên)
                        </td>
                        <td className="px-3 py-3 text-center bg-blue-50">
                          {filteredPeopleRows.reduce((sum, p) => sum + p.contracts.length, 0)} lượt HĐ
                        </td>
                        <td className="px-3 py-3 text-slate-500 bg-blue-50 text-[10px]">
                          {personTitleFilter !== 'all' ? `Lọc: ${personTitleFilter}` : 'Tất cả chức danh'}
                        </td>
                        <td className="whitespace-nowrap px-3 py-3 text-right bg-blue-50 text-blue-700 font-extrabold text-sm">
                          {formatVND(filteredPeopleRows.reduce((sum, p) => sum + p.total, 0))}
                        </td>
                        <td className="px-3 py-3 text-slate-600 bg-blue-50 text-[11px]">
                          {displayedContracts.length} hợp đồng trong kỳ
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                  {totalPeoplePages > 1 && (
                    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-white px-4 py-3 text-xs text-slate-600">
                      <div>
                        Hiển thị {((cashflowPeoplePage - 1) * cashflowPeoplePageSize) + 1} - {Math.min(cashflowPeoplePage * cashflowPeoplePageSize, filteredPeopleRows.length)} trong {filteredPeopleRows.length} thành viên
                      </div>
                      <div className="flex items-center gap-2">
                        <select
                          aria-label="Số dòng nhân sự mỗi trang"
                          value={cashflowPeoplePageSize}
                          onChange={(e) => {
                            setCashflowPeoplePageSize(Number(e.target.value));
                            setCashflowPeoplePage(1);
                          }}
                          className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs"
                        >
                          <option value={20}>20 / trang</option>
                          <option value={50}>50 / trang</option>
                          <option value={100}>100 / trang</option>
                          <option value={0}>Tất cả</option>
                        </select>
                        <button
                          type="button"
                          disabled={cashflowPeoplePage <= 1}
                          onClick={() => setCashflowPeoplePage((p) => Math.max(1, p - 1))}
                          className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-semibold disabled:opacity-40 hover:bg-slate-50 cursor-pointer"
                        >
                          Trước
                        </button>
                        <span className="text-xs font-medium">Trang {cashflowPeoplePage} / {totalPeoplePages}</span>
                        <button
                          type="button"
                          disabled={cashflowPeoplePage >= totalPeoplePages}
                          onClick={() => setCashflowPeoplePage((p) => Math.min(totalPeoplePages, p + 1))}
                          className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-semibold disabled:opacity-40 hover:bg-slate-50 cursor-pointer"
                        >
                          Sau
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </Panel>
        </div>

        <div className="lg:col-span-5 xl:col-span-4 flex flex-col">
          <Panel className="p-4 flex flex-col justify-between h-full">
            <div className="flex-1 min-h-0 flex flex-col">
              <div className="mb-3 flex shrink-0 items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h2 className="font-bold text-slate-900">{isMonthOverview ? 'Phân bổ quỹ trong tháng' : 'Phân bổ quỹ kỳ tuần'}</h2>
                  <p className="mt-1 text-[11px] text-slate-500">Tổng chi quỹ và số dư tồn quỹ theo kỳ.</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsUpdatePaidOpen(true)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-1 text-[11px] font-semibold text-blue-700 hover:bg-blue-100 transition active:scale-95 cursor-pointer shadow-2xs"
                    title="Cập nhật số tiền Đã chi thực tế cho kỳ này"
                  >
                    <Edit3 className="h-3 w-3" />
                    <span>Cập nhật</span>
                  </button>
                  <span className="rounded-full bg-blue-50 px-2 py-1 text-[10px] font-bold text-blue-700">15%</span>
                </div>
              </div>
              <div className="flex-1 min-h-0 overflow-x-auto">
                <table className="min-w-[480px] w-full text-left text-[10px]">
                  <thead className="border-b border-slate-200 bg-slate-50/60 font-semibold text-slate-500">
                    <tr>
                      <th className="px-2 py-2">Quỹ</th>
                      <th className="px-2 py-2 text-center">Tỷ lệ</th>
                      <th className="px-2 py-2 text-right">Phân bổ (15%)</th>
                      <th className="px-2 py-2 text-right text-emerald-700">Đã chi</th>
                      <th className="px-2 py-2 text-right">Còn tồn</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {fundRowsToDisplay.map((row) => {
                      const allocation = row.allocation_amount;
                      const periodCount = 'periods' in row ? row.periods : 0;
                      const paid = paidAmountForFund(row.fund_key, row.fund_source);
                      const remaining = allocation - paid;
                      const ratePct = row.allocation_rate > 1 ? row.allocation_rate : row.allocation_rate * 100;
                      const rateStr = isMonthOverview
                        ? `${(row.allocation_rate * 100).toLocaleString('vi-VN', { maximumFractionDigits: 1 })}% (${periodCount} kỳ)`
                        : `${ratePct.toLocaleString('vi-VN', { maximumFractionDigits: 1 })}%`;
                      return (
                        <tr key={row.fund_key} className="hover:bg-slate-50/60">
                          <td className="px-2 py-2 align-middle">
                            <div className="flex items-center gap-1.5">
                              <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: FUND_COLORS[row.fund_key] || '#64748b' }} />
                              <span className="font-bold text-slate-800">{FUND_LABELS[row.fund_key] || row.fund_source}</span>
                            </div>
                          </td>
                          <td className="whitespace-nowrap px-2 py-2 text-center text-slate-600 font-medium">
                            <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[9px] font-semibold text-slate-700">
                              {rateStr}
                            </span>
                          </td>
                          <td className="whitespace-nowrap px-2 py-2 text-right font-semibold text-slate-800">{formatVND(allocation)}</td>
                          <td className="whitespace-nowrap px-2 py-2 text-right font-semibold text-emerald-700">{formatVND(paid)}</td>
                          <td className={`whitespace-nowrap px-2 py-2 text-right font-bold ${remaining < 0 ? 'text-red-600' : 'text-slate-800'}`}>{formatVND(remaining)}</td>
                        </tr>
                      );
                    })}
                    {!fundRowsToDisplay.length && <tr><td colSpan={5} className="px-2 py-8 text-center text-slate-500">Chưa có dữ liệu phân bổ cho kỳ này.</td></tr>}
                  </tbody>
                  {fundRowsToDisplay.length > 0 && (
                    <tfoot className="border-t-2 border-slate-200 bg-slate-50/80 font-bold text-slate-900">
                      <tr>
                        <td className="px-2 py-2">TỔNG CỘNG</td>
                        <td className="px-2 py-2 text-center text-blue-700">15%</td>
                        <td className="px-2 py-2 text-right text-blue-700">{formatVND(summaryTotals.allocation)}</td>
                        <td className="px-2 py-2 text-right text-emerald-700">{formatVND(summaryTotals.paid)}</td>
                        <td className={`px-2 py-2 text-right ${summaryTotals.remaining < 0 ? 'text-red-600' : 'text-slate-900'}`}>{formatVND(summaryTotals.remaining)}</td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </div>
            <div className="mt-3 shrink-0 rounded-xl bg-slate-900 p-3 text-white space-y-1.5">
              <div className="flex justify-between text-xs font-bold">
                <span>{isMonthOverview ? 'TỔNG QUỸ PHÂN BỔ THÁNG (15%)' : 'TỔNG QUỸ PHÂN BỔ TUẦN (15%)'}</span>
                <span className="text-emerald-400">{formatVND(displayedContractTotals.pool)}</span>
              </div>
              <div className="flex justify-between text-[11px] text-slate-300">
                <span>Tổng chi quỹ (Đã chi):</span>
                <span className="font-semibold text-emerald-400">{formatVND(summaryTotals.paid)}</span>
              </div>
              <div className="flex justify-between text-[11px] text-slate-300">
                <span>Còn lại quỹ (Còn tồn):</span>
                <span className="font-semibold text-amber-300">{formatVND(summaryTotals.remaining)}</span>
              </div>
              <div className="mt-1 pt-1.5 border-t border-slate-800 flex justify-between text-[10px] text-slate-400">
                <span>{isMonthOverview ? `Tổng hợp ${periodsForMonth.length} kỳ tuần` : (selectedPeriod?.source_sheet ? `Nguồn bảng: ${selectedPeriod.source_sheet}` : 'Chính sách phân bổ 15%')}</span>
                <span>Doanh số: <strong className="text-white">{formatVND(isMonthOverview ? monthGrossSales : selectedGrossSales)}</strong></span>
              </div>
            </div>
          </Panel>
        </div>
      </div>

      <Panel className="p-4">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h2 className="font-bold text-slate-900">{isMonthOverview ? 'Leader Team & Giám đốc KD' : `Leader Team · ${selectedPeriodHeading.split('·')[0].trim()}`}</h2>
            <p className="mt-1 text-[11px] text-slate-500">{isMonthOverview ? 'Tổng hợp tháng, chia tỷ lệ 30% / 70%.' : '30% chia đều tháng; 70% theo hiệu quả tuần.'}</p>
          </div>
          <span className="rounded-full bg-pink-50 px-2 py-1 text-[10px] font-bold text-pink-700">2,9%</span>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 text-xs">
          <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
            <span className="block font-medium text-slate-500">{isMonthOverview ? "Quỹ Leader Team (30%)" : "Quỹ 30% chia đều"}</span>
            <span className="mt-1 block text-base font-bold text-pink-700">{formatVND(Math.round((isMonthOverview ? monthlyLeaderPool : selectedLeaderPool) * 0.3))}</span>
          </div>
          <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
            <span className="block font-medium text-slate-500">{isMonthOverview ? "Quỹ Giám đốc KD (70%)" : "Quỹ 70% hiệu quả tuần"}</span>
            <span className="mt-1 block text-base font-bold text-blue-700">{formatVND(Math.round((isMonthOverview ? monthlyLeaderPool : selectedLeaderPool) * 0.7))}</span>
          </div>
          <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
            <span className="block font-medium text-slate-500">{isMonthOverview ? 'Tổng quỹ lũy kế tháng' : 'Tổng quỹ Leader tuần'}</span>
            <span className="mt-1 block text-base font-bold text-slate-900">{formatVND(isMonthOverview ? monthlyLeaderPool : selectedLeaderPool)}</span>
          </div>
          <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
            <span className="block font-medium text-slate-500">{isMonthOverview ? 'Đề nghị chi trong DNTT tháng' : 'Đề nghị chi tuần này'}</span>
            <span className="mt-1 block text-base font-bold text-amber-700">{formatVND(isMonthOverview ? monthlyLeaderRequests : (selectedLeaderRequests || Math.round(selectedLeaderPool * 0.7)))}</span>
            {!isMonthOverview && (
              <div className="mt-1 text-[10px] text-slate-400">
                Lũy kế tháng (2,9%): <strong className="text-slate-600">{formatVND(monthlyLeaderPool)}</strong>
              </div>
            )}
          </div>
        </div>
      </Panel>

      </>}

      {activeTab === 'event' && (
        <div className="space-y-6">
          {/* BANNER TỔNG QUAN QUỸ ĐÀO TẠO & SỰ KIỆN */}
          <Panel className="overflow-hidden border-indigo-100 bg-white">
            <div className="flex flex-col gap-4 border-b border-slate-100 bg-gradient-to-r from-slate-50 via-indigo-50/40 to-white px-6 py-5 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="inline-flex items-center gap-2 rounded-lg bg-indigo-100/80 px-2.5 py-1 text-[11px] font-bold text-indigo-800">
                  <CalendarCheck className="h-3.5 w-3.5 text-indigo-600" />
                  <span>QUỸ SỰ KIỆN & ĐÀO TẠO · TRÍCH 0,5% DOANH SỐ</span>
                </div>
                <h2 className="mt-2 text-xl font-bold tracking-tight text-slate-900">
                  Báo cáo định mức thù lao Đào tạo & Sự kiện Tháng {Number(selectedMonth.slice(5)) || '—'}/{selectedMonth.slice(0, 4) || '—'}
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  Bảng biểu tách bạch theo từng buổi đào tạo hoặc sự kiện, có danh sách những người được hưởng và nút tự động sinh Form phiếu chi cho kế toán.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => handleCopyEventMBBank(monthlyEventExpenses, `tất cả ${eventExpenseGroups.length} buổi sự kiện`)}
                  disabled={!monthlyEventExpenses.length}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-300 bg-emerald-50 px-3.5 py-2.5 text-xs font-bold text-emerald-800 shadow-2xs hover:bg-emerald-100 active:scale-95 transition disabled:opacity-50 cursor-pointer"
                  title="Sao chép danh sách người nhận theo chuẩn MB Bank"
                >
                  <Landmark className="h-4 w-4 text-emerald-600" />
                  <Copy className="h-3.5 w-3.5 text-emerald-600" />
                  <span>Sao chép MB Bank ({monthlyEventExpenses.length})</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleAutoGenerateEventPaymentProposal(monthlyEventExpenses)}
                  disabled={!monthlyEventExpenses.length}
                  className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-2.5 text-xs font-bold text-white shadow-md shadow-blue-500/20 hover:from-blue-700 hover:to-indigo-700 active:scale-95 transition disabled:opacity-50 cursor-pointer"
                  title="Tự động gom toàn bộ các buổi đào tạo & sự kiện trong tháng vào Phiếu đề xuất chi"
                >
                  <Sparkles className="h-4 w-4 animate-pulse" />
                  <span>Sinh phiếu đề xuất chi tự động ({monthlyEventExpenses.length} khoản · {formatVND(staffProposed)})</span>
                </button>
              </div>
            </div>

            <div className="grid gap-3 p-5 sm:grid-cols-2 xl:grid-cols-5">
              <MiniStat label="Quỹ tích lũy tháng (0.5%)" value={formatVND(monthEventPool)} note="Tính từ doanh số phân bổ" />
              <MiniStat label="Số buổi tổ chức" value={`${eventExpenseGroups.length} buổi`} note="Đào tạo & Tiệc trà sự kiện" />
              <MiniStat label="Thù lao sự kiện đề nghị" value={formatVND(staffProposed)} note={`${monthlyEventExpenses.length} lượt nhân sự thụ hưởng`} />
              <MiniStat label="Đã thanh toán / thực hiện" value={formatVND(monthlyEventPaid)} note="Trạng thái đã duyệt & thanh toán" />
              <MiniStat label="Còn lại sau khi đã chi" value={formatVND(monthEventPool - monthlyEventPaid)} note="Tồn quỹ sự kiện dự tính" />
            </div>
          </Panel>

          {/* DANH SÁCH CHI TIẾT TỪNG BUỔI ĐÀO TẠO & SỰ KIỆN */}
          {eventExpenseGroups.length === 0 ? (
            <Panel className="p-12 text-center text-slate-500">
              <CalendarCheck className="mx-auto h-12 w-12 text-slate-300 mb-3" />
              <div className="font-semibold text-sm text-slate-700">Chưa có chi tiết thù lao sự kiện hoặc đào tạo trong tháng này</div>
              <div className="text-xs text-slate-400 mt-1">Dữ liệu thù lao được đồng bộ tự động từ bảng chi tiết sự kiện và phân bổ định mức.</div>
            </Panel>
          ) : (
            <div className="space-y-5">
              <div className="flex items-center justify-between px-1">
                <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-700 flex items-center gap-2">
                  <span>Chi tiết các buổi đào tạo & sự kiện</span>
                  <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[11px] font-bold text-slate-700">
                    {eventExpenseGroups.length} buổi
                  </span>
                </h3>
                <span className="text-xs text-slate-400">
                  Tổng {monthlyEventExpenses.length} nhân sự · Kinh phí: <strong className="text-slate-800">{formatVND(staffProposed)}</strong>
                </span>
              </div>

              {eventExpenseGroups.map((group, groupIdx) => (
                <Panel key={group.code || groupIdx} className="overflow-hidden border border-slate-200/90 shadow-2xs">
                  {/* HEADER CỦA TỪNG BUỔI */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 bg-slate-50/80 px-5 py-3.5">
                    <div className="flex items-start sm:items-center gap-3">
                      <span className="flex h-8 shrink-0 items-center justify-center rounded-lg bg-indigo-600 px-2.5 text-xs font-black text-white shadow-2xs">
                        {group.code}
                      </span>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-bold text-slate-900 text-sm">{group.title}</h4>
                          <span className="text-xs text-slate-500">· Ngày {formatDate(group.date)}</span>
                        </div>
                        {group.location && (
                          <div className="text-[11px] text-slate-500 mt-0.5">{group.location}</div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-center">
                      <div className="text-right mr-2 hidden sm:block">
                        <div className="text-[10px] uppercase font-bold text-slate-400">{group.items.length} nhân sự</div>
                        <div className="text-xs font-extrabold text-indigo-700">{formatVND(group.subtotal)}</div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleCopyEventMBBank(group.items, `buổi ${group.code}`)}
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
                        title={`Sao chép lệnh chuyển khoản MB Bank cho buổi ${group.code}`}
                      >
                        <Copy className="h-3.5 w-3.5 text-slate-500" />
                        <span className="hidden md:inline">MB Bank</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleAutoGenerateEventPaymentProposal(group.items, `${group.title} (${group.code})`)}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-bold text-white shadow-2xs hover:bg-blue-700 active:scale-95 transition cursor-pointer"
                        title={`Tự động sinh Form phiếu chi cho các nhân sự buổi ${group.code}`}
                      >
                        <FilePlus className="h-3.5 w-3.5" />
                        <span>Sinh phiếu chi buổi này</span>
                      </button>
                    </div>
                  </div>

                  {/* BẢNG CHI TIẾT NHÂN SỰ BUỔI NÀY */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-white text-[10px] uppercase font-bold text-slate-500 border-b border-slate-100">
                        <tr>
                          <th className="px-4 py-2.5 text-center w-12">STT</th>
                          <th className="px-4 py-2.5">Người thụ hưởng</th>
                          <th className="px-4 py-2.5">Số điện thoại</th>
                          <th className="px-4 py-2.5">Vai trò đảm nhiệm</th>
                          <th className="px-4 py-2.5 text-right">Thù lao định mức</th>
                          <th className="px-4 py-2.5 text-center">Trạng thái</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {group.items.map((item, idx) => (
                          <tr key={`${group.code}-${idx}`} className="hover:bg-slate-50/70 transition">
                            <td className="px-4 py-2.5 text-center text-slate-400 font-mono">{idx + 1}</td>
                            <td className="px-4 py-2.5 font-semibold text-slate-800">
                              {item.beneficiary_name}
                            </td>
                            <td className="px-4 py-2.5 text-slate-600 font-mono text-[11px]">
                              {item.beneficiary_phone || '—'}
                            </td>
                            <td className="px-4 py-2.5">
                              <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-semibold ${
                                item.expense_role.toLowerCase().includes('mc')
                                  ? 'bg-amber-100 text-amber-800'
                                  : item.expense_role.toLowerCase().includes('chốt')
                                  ? 'bg-rose-100 text-rose-800'
                                  : item.expense_role.toLowerCase().includes('media')
                                  ? 'bg-purple-100 text-purple-800'
                                  : 'bg-blue-100 text-blue-800'
                              }`}>
                                {item.expense_role}
                              </span>
                            </td>
                            <td className="px-4 py-2.5 text-right font-bold text-slate-900">
                              {formatVND(item.proposed_amount)}
                            </td>
                            <td className="px-4 py-2.5 text-center">
                              <StatusBadge status={item.status} />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="border-t border-slate-200 bg-slate-50/50">
                        <tr>
                          <td colSpan={4} className="px-4 py-2.5 text-right font-bold text-slate-600 text-xs">
                            Tổng thù lao buổi {group.code} ({group.items.length} người):
                          </td>
                          <td className="px-4 py-2.5 text-right font-black text-indigo-700 text-xs">
                            {formatVND(group.subtotal)}
                          </td>
                          <td />
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </Panel>
              ))}

              {/* BẢNG TỔNG KẾT TẤT CẢ CÁC BUỔI TRONG THÁNG */}
              <Panel className="overflow-hidden border border-indigo-200 bg-white shadow-sm">
                <div className="border-b border-slate-100 bg-indigo-50/50 px-5 py-3 flex items-center justify-between">
                  <span className="font-extrabold text-xs text-indigo-950 uppercase tracking-wider">
                    Tổng kết phân bổ thù lao tất cả các buổi đào tạo & sự kiện Tháng {Number(selectedMonth.slice(5))}/{selectedMonth.slice(0, 4)}
                  </span>
                  <span className="text-xs font-bold text-indigo-700">
                    {eventExpenseGroups.length} buổi · {monthlyEventExpenses.length} lượt nhân sự
                  </span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-[10px] uppercase font-bold text-slate-500">
                      <tr>
                        <th className="px-4 py-2.5 text-center w-12">STT</th>
                        <th className="px-4 py-2.5">Mã sự kiện</th>
                        <th className="px-4 py-2.5">Tên sự kiện / Buổi đào tạo</th>
                        <th className="px-4 py-2.5">Ngày tổ chức</th>
                        <th className="px-4 py-2.5 text-center">Số người thụ hưởng</th>
                        <th className="px-4 py-2.5 text-right">Tổng kinh phí buổi</th>
                        <th className="px-4 py-2.5 text-center">Hành động</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {eventExpenseGroups.map((group, idx) => (
                        <tr key={`summary-${group.code}-${idx}`} className="hover:bg-slate-50/60 transition">
                          <td className="px-4 py-2.5 text-center text-slate-400 font-mono">{idx + 1}</td>
                          <td className="px-4 py-2.5 font-bold text-indigo-700">{group.code}</td>
                          <td className="px-4 py-2.5 font-medium text-slate-800">{group.title}</td>
                          <td className="px-4 py-2.5 text-slate-600">{formatDate(group.date)}</td>
                          <td className="px-4 py-2.5 text-center font-semibold text-slate-700">{group.items.length} người</td>
                          <td className="px-4 py-2.5 text-right font-bold text-slate-900">{formatVND(group.subtotal)}</td>
                          <td className="px-4 py-2.5 text-center">
                            <button
                              type="button"
                              onClick={() => handleAutoGenerateEventPaymentProposal(group.items, `${group.title} (${group.code})`)}
                              className="text-blue-600 hover:text-blue-800 font-bold hover:underline cursor-pointer"
                            >
                              Sinh phiếu
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="border-t-2 border-slate-900 bg-slate-900 text-white font-bold">
                      <tr>
                        <td colSpan={4} className="px-4 py-3 text-right uppercase tracking-wider text-xs">
                          TỔNG CỘNG TOÀN THÁNG ({eventExpenseGroups.length} BUỔI):
                        </td>
                        <td className="px-4 py-3 text-center text-xs text-amber-300">
                          {monthlyEventExpenses.length} lượt
                        </td>
                        <td className="px-4 py-3 text-right text-sm font-black text-amber-400">
                          {formatVND(staffProposed)}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button
                            type="button"
                            onClick={() => handleAutoGenerateEventPaymentProposal(monthlyEventExpenses)}
                            className="rounded-lg bg-blue-500 hover:bg-blue-400 text-white text-xs px-2.5 py-1 font-bold transition cursor-pointer"
                          >
                            Sinh phiếu tổng
                          </button>
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </Panel>
            </div>
          )}
        </div>
      )}

      {activeTab === 'vouchers' && <Panel className="overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-slate-200 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
          <div><h2 className="font-bold text-slate-900">Nhật ký phiếu thu chi</h2><p className="mt-1 text-xs text-slate-500">Phiếu tự động từ bảng kê hợp đồng và phiếu thủ công được quản lý cùng tại đây.</p></div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <label className="relative"><Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" /><input value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="Tìm mã, quỹ, nội dung..." className="rounded-lg border border-slate-200 bg-slate-50 py-2 pl-8 pr-3 text-xs" /></label>
            <select value={selectedFund} onChange={(event) => setSelectedFund(event.target.value)} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs"><option value="all">Tất cả quỹ</option>{Array.from(new Set(logs.map((item) => item.fund_source))).map((fund) => <option key={fund} value={fund}>{fund}</option>)}</select>
            <select value={selectedStatus} onChange={(event) => setSelectedStatus(event.target.value)} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs"><option value="all">Tất cả trạng thái</option>{Array.from(new Set(logs.map((item) => item.status))).map((status) => <option key={status} value={status}>{status}</option>)}</select>
            <select value={selectedType} onChange={(event) => setSelectedType(event.target.value)} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs"><option value="all">Tất cả loại phiếu</option><option value="Tự động">Tự động</option><option value="Thủ công">Thủ công</option></select>
            <label className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 text-[10px] font-semibold text-slate-600">Ngày chi<input type="date" value={selectedPaymentDate} onChange={(event) => setSelectedPaymentDate(event.target.value)} className="bg-transparent text-xs" /></label>
            {selectedLogIds.size > 0 && <button type="button" onClick={handleBulkMarkPaid} disabled={isBulkUpdatingPaid} className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50">{isBulkUpdatingPaid ? 'Đang cập nhật...' : `Đánh dấu đã chi (${selectedLogIds.size})`}</button>}
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-[1120px] w-full text-left text-xs">
            <thead className="bg-slate-50 text-[10px] uppercase text-slate-500"><tr><th className="px-3 py-3 text-center"><input type="checkbox" aria-label="Chọn các phiếu trên trang" checked={paginatedLogs.some((log) => !isPaidStatus(log.status)) && paginatedLogs.every((log) => isPaidStatus(log.status) || selectedLogIds.has(log.id))} onChange={(event) => setSelectedLogIds((current) => { const next = new Set(current); paginatedLogs.forEach((log) => { if (event.target.checked && !isPaidStatus(log.status)) next.add(log.id); else next.delete(log.id); }); return next; })} /></th><th className="px-4 py-3">Mã / Ngày</th><th className="px-3 py-3">Phân loại</th><th className="px-3 py-3">Quỹ / Nội dung</th><th className="px-3 py-3">Người đề xuất</th><th className="px-3 py-3">Người duyệt</th><th className="px-3 py-3">Người thụ hưởng</th><th className="px-3 py-3 text-right">Đề xuất / Thực chi</th><th className="px-3 py-3 text-center">Trạng thái</th><th className="px-3 py-3 text-center">Thao tác</th></tr></thead>
            <tbody className="divide-y divide-slate-100">{paginatedLogs.map((log) => <tr key={log.id} className="hover:bg-slate-50/70">
              <td className="px-3 py-3 text-center"><input type="checkbox" aria-label={`Chọn phiếu ${log.request_code}`} disabled={isPaidStatus(log.status)} checked={selectedLogIds.has(log.id)} onChange={(event) => setSelectedLogIds((current) => { const next = new Set(current); if (event.target.checked) next.add(log.id); else next.delete(log.id); return next; })} /></td>
              <td className="px-4 py-3"><div className="font-mono font-bold text-slate-800">{log.request_code}</div><div className="mt-1 text-[10px] text-slate-500">{formatDate(log.request_date)}</div></td>
              <td className="px-3 py-3"><span className={`rounded-full px-2 py-1 text-[10px] font-bold ${(log.expense_type || 'Thủ công') === 'Tự động' ? 'bg-violet-50 text-violet-700' : 'bg-slate-100 text-slate-700'}`}>{log.expense_type || 'Thủ công'}</span></td>
              <td className="max-w-[260px] px-3 py-3"><div className="font-semibold text-slate-800">{log.fund_source}</div><div className="mt-1 truncate text-[10px] text-slate-500" title={log.detail_content}>{safeText(log.detail_content)}</div></td>
              <td className="px-3 py-3"><div>{safeText(log.requester_name)}</div><div className="text-[10px] text-slate-500">{log.requester_phone || '—'}</div></td>
              <td className="px-3 py-3"><div>{safeText(log.approver_name)}</div><div className="text-[10px] text-slate-500">{log.approver_phone || '—'}</div></td>
              <td className="px-3 py-3">
                <div className="font-semibold text-slate-900">{safeText(log.beneficiary_name)}</div>
                <div className="text-[10px] text-slate-500">{log.beneficiary_phone || '—'}</div>
                <div className="text-[10px] text-slate-500">{log.beneficiary_bank_account || 'Chưa có tài khoản ngân hàng'}</div>
                {log.beneficiary_team && (
                  <div className="mt-1">
                    <span className="inline-flex items-center gap-1 rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-semibold text-blue-700">
                      Đội: {log.beneficiary_team}
                    </span>
                  </div>
                )}
              </td>
              <td className="px-3 py-3 text-right"><div className="font-semibold">{log.proposed_amount == null ? '—' : formatVND(log.proposed_amount)}</div><div className="text-[10px] text-slate-500">Thực chi {formatVND(log.actual_expense)}</div></td>
              <td className="px-3 py-3 text-center"><StatusBadge status={log.status} /></td>
              <td className="relative px-3 py-3 text-center"><div className="inline-flex items-center gap-1"><button onClick={() => setViewLog(log)} className="rounded p-1.5 text-slate-500 hover:bg-slate-100 hover:text-blue-600" title="Chi tiết"><Eye className="h-4 w-4" /></button><button onClick={() => setPrintLog(log)} className="rounded p-1.5 text-slate-500 hover:bg-slate-100 hover:text-blue-600" title="In phiếu / Lưu PDF"><Printer className="h-4 w-4" /></button><button onClick={() => setActionMenuId(actionMenuId === log.id ? null : log.id)} className="rounded p-1.5 text-slate-500 hover:bg-slate-100" title="Thao tác"><MoreVertical className="h-4 w-4" /></button></div>
                {actionMenuId === log.id && <div className="absolute right-5 top-10 z-20 w-48 rounded-xl border border-slate-200 bg-white py-1 text-left shadow-xl">{log.status !== 'Đã duyệt' && <button onClick={() => updateLogStatus(log, 'Đã duyệt')} className="flex w-full items-center gap-2 px-3 py-2 text-emerald-700 hover:bg-emerald-50"><CheckCircle2 className="h-3.5 w-3.5" /> Duyệt phiếu</button>}{!isPaidStatus(log.status) && <button onClick={() => updateLogStatus(log, 'Đã thanh toán')} className="flex w-full items-center gap-2 px-3 py-2 text-blue-700 hover:bg-blue-50"><Receipt className="h-3.5 w-3.5" /> Đã thanh toán</button>}{!isPaidStatus(log.status) && <button onClick={() => updateLogStatus(log, 'Đã thực hiện')} className="flex w-full items-center gap-2 px-3 py-2 text-indigo-700 hover:bg-indigo-50"><CheckCircle2 className="h-3.5 w-3.5" /> Đã thực hiện</button>}{log.status !== 'Từ chối' && <button onClick={() => updateLogStatus(log, 'Từ chối')} className="flex w-full items-center gap-2 px-3 py-2 text-amber-700 hover:bg-amber-50"><XCircle className="h-3.5 w-3.5" /> Từ chối</button>}<button onClick={() => deleteLog(log)} className="flex w-full items-center gap-2 border-t border-slate-100 px-3 py-2 text-red-700 hover:bg-red-50"><X className="h-3.5 w-3.5" /> Xóa phiếu</button></div>}</td>
            </tr>)}{!filteredLogs.length && <tr><td colSpan={10} className="px-4 py-10 text-center text-slate-500">Không có phiếu phù hợp.</td></tr>}</tbody>
          </table>
        </div>
        {totalVoucherPages > 1 && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-white px-4 py-3 text-xs text-slate-600">
            <div>
              Hiển thị {((voucherPage - 1) * voucherPageSize) + 1} - {Math.min(voucherPage * voucherPageSize, filteredLogs.length)} trong {filteredLogs.length} phiếu
            </div>
            <div className="flex items-center gap-2">
              <select
                aria-label="Số phiếu mỗi trang"
                value={voucherPageSize}
                onChange={(e) => {
                  setVoucherPageSize(Number(e.target.value));
                  setVoucherPage(1);
                }}
                className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs"
              >
                <option value={25}>25 / trang</option>
                <option value={50}>50 / trang</option>
                <option value={100}>100 / trang</option>
                <option value={0}>Tất cả</option>
              </select>
              <button
                type="button"
                disabled={voucherPage <= 1}
                onClick={() => setVoucherPage((p) => Math.max(1, p - 1))}
                className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-semibold disabled:opacity-40 hover:bg-slate-50 cursor-pointer"
              >
                Trước
              </button>
              <span className="text-xs font-medium">Trang {voucherPage} / {totalVoucherPages}</span>
              <button
                type="button"
                disabled={voucherPage >= totalVoucherPages}
                onClick={() => setVoucherPage((p) => Math.min(totalVoucherPages, p + 1))}
                className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-semibold disabled:opacity-40 hover:bg-slate-50 cursor-pointer"
              >
                Sau
              </button>
            </div>
          </div>
        )}
      </Panel>}


      {isCreateOpen && (
        <CreatePaymentProposalModal
          isOpen={isCreateOpen}
          onClose={() => {
            setIsCreateOpen(false);
            setCreateProposalInitial(null);
          }}
          members={initialMembers}
          eventExpenses={eventExpenses}
          initialItems={createProposalInitial?.items}
          initialFundSource={createProposalInitial?.fundSource}
          initialNote={createProposalInitial?.note}
          onSuccess={(newLog) => {
            setLogs((current) => [sanitizeTransactionLogNames(newLog), ...current]);
            setCreateProposalInitial(null);
          }}
          onTriggerPrint={(tempLog) => {
            setPrintLog(tempLog);
          }}
        />
      )}

      {viewLog && (
        <Modal onClose={() => setViewLog(null)} title={`Chi tiết phiếu ${viewLog.request_code}`} maxWidth="max-w-4xl">
          <div className="p-6 text-xs space-y-4">
            <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
              <Detail label="Ngày đề xuất" value={formatDate(viewLog.request_date)} />
              <Detail label="Phân loại" value={viewLog.expense_type || 'Thủ công'} />
              <Detail label="Trạng thái" value={viewLog.status} />
              <Detail label="Nguồn quỹ" value={viewLog.fund_source} />
              <Detail label="Tổng tiền đề xuất" value={viewLog.proposed_amount == null ? 'Chưa có số liệu' : formatVND(viewLog.proposed_amount)} />
              <Detail label="Số tiền thực chi" value={formatVND(viewLog.actual_expense)} />
              <Detail label="Người đề xuất" value={`${safeText(viewLog.requester_name)} · ${viewLog.requester_phone || '—'}`} />
              <Detail label="Người duyệt" value={`${safeText(viewLog.approver_name)} · ${viewLog.approver_phone || '—'}`} />
              <Detail label="Người thụ hưởng" value={`${safeText(viewLog.beneficiary_name)} · ${viewLog.beneficiary_phone || '—'}`} />
              <Detail label="Đội nhóm thụ hưởng" value={viewLog.beneficiary_team || 'Chưa phân đội'} />
              <Detail label="Ngân hàng nhận" value={viewLog.beneficiary_bank_account || '—'} />
            </div>

            {viewLog.items && viewLog.items.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider">
                  Danh mục các khoản mục chi ({viewLog.items.length} dòng)
                </h4>
                <div className="overflow-x-auto rounded-xl border border-slate-200">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-[10px] uppercase font-bold text-slate-500">
                      <tr>
                        <th className="px-3 py-2 text-center w-10">STT</th>
                        <th className="px-3 py-2">Khoản mục & nội dung chi</th>
                        <th className="px-3 py-2">Nguồn quỹ</th>
                        <th className="px-3 py-2">Người nhận</th>
                        <th className="px-3 py-2 text-right">Số tiền (VNĐ)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {viewLog.items.map((it, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/60">
                          <td className="px-3 py-2 text-center text-slate-500">{idx + 1}</td>
                          <td className="px-3 py-2">
                            <div className="font-bold text-slate-900">{it.title}</div>
                            {it.subtitle && <div className="text-[10px] text-blue-600">{it.subtitle}</div>}
                          </td>
                          <td className="px-3 py-2 text-slate-600">{it.fundSource || it.fund_source || viewLog.fund_source}</td>
                          <td className="px-3 py-2 text-slate-700">
                            <div>{it.beneficiaryName || it.beneficiary_name || viewLog.beneficiary_name}</div>
                            <div className="text-[10px] text-slate-500">
                              {it.beneficiaryBankAccount || it.beneficiary_bank_account || ''} {it.beneficiaryBankName || it.beneficiary_bank_name || ''}
                            </div>
                          </td>
                          <td className="px-3 py-2 text-right font-bold tabular-nums text-slate-900">
                            {formatVND(it.amount)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div className="rounded-xl bg-slate-50 p-3 border border-slate-100">
              <div className="mb-1 font-semibold text-slate-500">Nội dung / Ghi chú</div>
              <div className="text-slate-800 whitespace-pre-line">{safeText(viewLog.note || viewLog.detail_content)}</div>
            </div>

            {viewLog.receipt_url && (
              <a href={viewLog.receipt_url} target="_blank" rel="noreferrer" className="text-blue-600 underline">
                Mở chứng từ
              </a>
            )}

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setPrintLog(viewLog)}
                className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700 cursor-pointer"
              >
                <Printer className="h-4 w-4" /> In / Lưu PDF
              </button>
            </div>
          </div>
        </Modal>
      )}

      {viewContract && (
        <Modal
          onClose={() => setViewContract(null)}
          title={`Chi tiết hợp đồng ${viewContract.contract_code || viewContract.customer_name}`}
          maxWidth="w-full max-w-[1500px] xl:w-[90vw] 2xl:min-w-[1500px]"
        >
          <div className="space-y-4 p-5 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
              <Detail label="Khách hàng" value={viewContract.customer_name} />
              <Detail label="Ngày ký" value={formatDate(viewContract.contract_date)} />
              <Detail label="Kỳ / Tuần phân bổ" value={getContractWeekLabel(viewContract)} />
              <Detail label="Đội nhóm" value={viewContract.team_name ? `Đội ${viewContract.team_name}` : resolveContractTeam(viewContract) ? `Đội ${resolveContractTeam(viewContract)}` : 'Chưa phân đội'} />
              <Detail label="Giá trị hợp đồng" value={formatVND(viewContract.value)} />
              <Detail label="Giá trị phân bổ" value={isBdsContract(viewContract.contract_type) ? `${formatVND(viewContract.allocated_value)} (BĐS · 4/15)` : formatVND(viewContract.allocated_value)} />
              <Detail label="Loại hợp đồng" value={viewContract.contract_type || 'Thường'} />
              <Detail label="Trạng thái hợp đồng" value={viewContract.status || '—'} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <Detail label="Tổng quỹ chưa chia (15%)" value={formatVND(contractPool(viewContract))} />
              <Detail label="Tổng hoa hồng chia" value={formatVND(contractCommission(viewContract, initialMembers))} />
              <Detail label="Tổng quỹ còn lại" value={formatVND(contractRemainingFund(viewContract, initialMembers))} />
            </div>
          <div>
            <h3 className="mb-2 font-bold text-slate-800">Nhân sự thụ hưởng</h3>
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="min-w-[840px] w-full text-left">
                <thead className="bg-slate-50 text-[10px] uppercase text-slate-500">
                  <tr>
                    <th className="px-3 py-2">Họ và tên</th>
                    <th className="px-3 py-2">Tài khoản / Ngân hàng</th>
                    <th className="min-w-[360px] px-3 py-2">Nguồn và cách tính</th>
                    <th className="px-3 py-2 text-right">Hoa hồng chia</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {contractBeneficiaries(viewContract, initialMembers).map((person, index) => {
                    const matchingMember = initialMembers.find((member) => normalizePersonName(member.full_name) === normalizePersonName(person.name));
                    const sourceDisclosure = beneficiarySourceDisclosure(viewContract, person);
                    const attributedAmount = sourceDisclosure.lines.reduce((sum, line) => sum + line.amount, 0);
                    return (
                      <tr key={index}>
                        <td className="px-3 py-2 font-semibold text-slate-800">
                          <div>{person.name}</div>
                          {(person.phone || matchingMember?.phone) && (
                            <div className="mt-0.5 text-[10px] font-normal text-slate-500">
                              {person.phone || matchingMember?.phone}
                            </div>
                          )}
                        </td>
                        <td className="px-3 py-2 text-slate-600">
                          <div>{person.bank_account || matchingMember?.bank_account || '—'}</div>
                          {(person.bank_name || matchingMember?.bank_name) && (
                            <div className="mt-0.5 text-[10px] text-slate-500">{person.bank_name || matchingMember?.bank_name}</div>
                          )}
                        </td>
                        <td className="px-3 py-2 align-top text-[11px] text-slate-700">
                          {sourceDisclosure.lines.length ? <div className="space-y-1.5">
                            {sourceDisclosure.lines.map((line, lineIndex) => (
                              <div key={`${line.source}-${lineIndex}`} className="leading-relaxed flex flex-wrap items-baseline gap-1.5">
                                <span className="rounded px-1.5 py-0.5 text-[9px] font-semibold bg-blue-50 text-blue-700 shrink-0">
                                  {line.source}
                                </span>
                                <span className="text-slate-800 font-mono text-[10px]">{line.calculation}</span>
                              </div>
                            ))}
                            {sourceDisclosure.unattributedAmount > 0
                              ? <div className="rounded-md bg-amber-50 px-2 py-1 text-[10px] leading-relaxed text-amber-800">Còn {formatVND(sourceDisclosure.unattributedAmount)} chưa được tách nguồn trong dòng Excel.</div>
                              : <div className="text-[10px] font-semibold text-emerald-700">✓ Đã đối chiếu đủ {formatVND(attributedAmount)} (100%).</div>}
                          </div> : <div className="max-w-[390px] leading-relaxed text-slate-500">Bảng kê ghi tổng {formatVND(person.amount)} cho người nhận nhưng không có cấu phần theo nguồn quỹ. Nguồn đối chiếu: {viewContract.source_sheet || 'bảng kê Excel'}{viewContract.source_excel_row ? ` · dòng ${viewContract.source_excel_row}` : ''}.</div>}
                        </td>
                        <td className="px-3 py-2 text-right font-bold tabular-nums">{formatVND(person.amount)}</td>
                      </tr>
                    );
                  })}
                  {!contractBeneficiaries(viewContract).length && <tr><td colSpan={4} className="px-3 py-6 text-center text-slate-500">Chưa có nhân sự thụ hưởng.</td></tr>}
                </tbody>
              </table>
            </div>
            <div className="mt-2 text-[10px] leading-relaxed text-slate-500">
              {viewContract.source_sheet && (
                <span>Nguồn đối chiếu: {viewContract.source_sheet}{viewContract.source_excel_row ? ` · dòng Excel ${viewContract.source_excel_row}` : ''}. </span>
              )}
              <span>Đối chiếu trích quỹ: </span>
              <Link href="/admin/quy-van-hanh-ho-tro" className="font-medium text-blue-600 underline hover:text-blue-800">Quỹ vận hành & hỗ trợ</Link>
              <span> & </span>
              <Link href="/admin/teamlead" className="font-medium text-blue-600 underline hover:text-blue-800">Quỹ TeamLead</Link>.
              {isTruongThiThuyTrangExample(viewContract) ? ' · Phí sale đối chiếu tab “5. DS Hợp đồng” dòng 12; định mức quỹ đối chiếu các tab “Quỹ Vận hành& hỗ trợ” và “1. Chính sách”.' : ''}
            </div>
          </div>
        </div>
      </Modal>)}

      {printLog && (
        <div className="print-sheet">
          <div className="mb-6 border-b-2 border-slate-900 pb-4 text-center">
            <h1 className="text-sm font-bold uppercase tracking-wider text-slate-900">
              CÔNG TY CỔ PHẦN TẬP ĐOÀN NGHIÊNG COMPLEX
            </h1>
            <p className="mt-1 text-[11px] text-slate-600">
              Hệ thống quản lý sự kiện & phân bổ nguồn quỹ tự động
            </p>
            <h2 className="mt-4 text-2xl font-black uppercase tracking-tight text-slate-900">
              PHIẾU ĐỀ NGHỊ THANH TOÁN
            </h2>
            <p className="mt-1.5 text-xs font-medium text-slate-600">
              Mã phiếu: <strong>{printLog.request_code}</strong> · Ngày đề xuất: <strong>{formatDate(printLog.request_date)}</strong>
            </p>
          </div>

          <div className="mb-6 grid grid-cols-2 gap-x-8 gap-y-2 text-xs">
            <div>
              <span className="text-slate-600">Người đề xuất:</span>{' '}
              <strong className="text-slate-900">{safeText(printLog.requester_name)}</strong>
              {printLog.requester_phone && <span> · {printLog.requester_phone}</span>}
            </div>
            <div>
              <span className="text-slate-600">Người phê duyệt:</span>{' '}
              <strong className="text-slate-900">{safeText(printLog.approver_name)}</strong>
            </div>
            <div>
              <span className="text-slate-600">Người thụ hưởng:</span>{' '}
              <strong className="text-slate-900">{safeText(printLog.beneficiary_name)}</strong>
              {printLog.beneficiary_phone && <span> · {printLog.beneficiary_phone}</span>}
            </div>
            <div>
              <span className="text-slate-600">Số tài khoản / Ngân hàng:</span>{' '}
              <strong className="text-slate-900">
                {printLog.beneficiary_bank_account || '—'} {printLog.beneficiary_bank_name || ''}
              </strong>
            </div>
            <div>
              <span className="text-slate-600">Nguồn quỹ trích:</span>{' '}
              <strong className="text-slate-900">{printLog.fund_source}</strong>
            </div>
            <div>
              <span className="text-slate-600">Trạng thái phiếu:</span>{' '}
              <strong className="text-slate-900 uppercase">{printLog.status}</strong>
            </div>
            {printLog.note && (
              <div className="col-span-2 mt-1 rounded-lg bg-slate-50 p-2.5 border border-slate-200">
                <span className="font-semibold text-slate-700">Căn cứ / Ghi chú đề xuất:</span>{' '}
                <span className="text-slate-800">{printLog.note}</span>
              </div>
            )}
          </div>

          {/* ITEM BREAKDOWN TABLE */}
          <div className="mb-6">
            <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-800">
              Danh mục các khoản chi chi tiết
            </h3>
            <table className="w-full border-collapse border border-slate-400 text-xs">
              <thead>
                <tr className="bg-slate-100 font-bold text-slate-900">
                  <th className="border border-slate-400 p-2 text-center w-12">STT</th>
                  <th className="border border-slate-400 p-2 text-left">Nội dung chi tiết</th>
                  <th className="border border-slate-400 p-2 text-left">Nguồn quỹ trích</th>
                  <th className="border border-slate-400 p-2 text-left">Người thụ hưởng & TK nhận</th>
                  <th className="border border-slate-400 p-2 text-right w-36">Số tiền (VNĐ)</th>
                </tr>
              </thead>
              <tbody>
                {printLog.items && printLog.items.length > 0 ? (
                  printLog.items.map((it, idx) => (
                    <tr key={idx}>
                      <td className="border border-slate-400 p-2 text-center">{idx + 1}</td>
                      <td className="border border-slate-400 p-2">
                        <div className="font-bold text-slate-900">{it.title}</div>
                        {it.subtitle && <div className="text-[11px] text-slate-600">{it.subtitle}</div>}
                      </td>
                      <td className="border border-slate-400 p-2">{it.fundSource || it.fund_source || printLog.fund_source}</td>
                      <td className="border border-slate-400 p-2">
                        <div>{it.beneficiaryName || it.beneficiary_name || printLog.beneficiary_name}</div>
                        <div className="text-[11px] text-slate-500">
                          {it.beneficiaryBankAccount || it.beneficiary_bank_account || ''} {it.beneficiaryBankName || it.beneficiary_bank_name || ''}
                        </div>
                      </td>
                      <td className="border border-slate-400 p-2 text-right font-bold tabular-nums">
                        {formatVND(it.amount)}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td className="border border-slate-400 p-2 text-center">1</td>
                    <td className="border border-slate-400 p-2 font-bold">{safeText(printLog.detail_content)}</td>
                    <td className="border border-slate-400 p-2">{printLog.fund_source}</td>
                    <td className="border border-slate-400 p-2">
                      <div>{safeText(printLog.beneficiary_name)}</div>
                      <div className="text-[11px] text-slate-500">{printLog.beneficiary_bank_account || '—'}</div>
                    </td>
                    <td className="border border-slate-400 p-2 text-right font-bold tabular-nums">
                      {formatVND(printLog.proposed_amount)}
                    </td>
                  </tr>
                )}
                <tr className="bg-slate-50 font-bold">
                  <td colSpan={4} className="border border-slate-400 p-2 text-right uppercase">
                    Tổng cộng tiền đề xuất chi:
                  </td>
                  <td className="border border-slate-400 p-2 text-right font-black text-sm text-slate-950 tabular-nums">
                    {formatVND(printLog.proposed_amount)}
                  </td>
                </tr>
              </tbody>
            </table>
            <div className="mt-2 text-xs text-slate-800 italic">
              <strong>Số tiền viết bằng chữ:</strong> {numberToVietnameseWords(printLog.proposed_amount)}
            </div>
          </div>

          {/* SIGNATURES BLOCK */}
          <div className="mt-14 grid grid-cols-4 gap-4 text-center text-xs">
            <div>
              <div className="font-bold uppercase text-slate-900">NGƯỜI ĐỀ NGHỊ</div>
              <div className="text-[11px] text-slate-500 italic mt-0.5">(Ký, họ tên)</div>
              <div className="mt-16 font-bold text-slate-800">{safeText(printLog.requester_name)}</div>
            </div>
            <div>
              <div className="font-bold uppercase text-slate-900">PHỤ TRÁCH QUỸ</div>
              <div className="text-[11px] text-slate-500 italic mt-0.5">(Ký, họ tên)</div>
              <div className="mt-16 font-bold text-slate-800">&nbsp;</div>
            </div>
            <div>
              <div className="font-bold uppercase text-slate-900">KẾ TOÁN THANH TOÁN</div>
              <div className="text-[11px] text-slate-500 italic mt-0.5">(Ký, họ tên)</div>
              <div className="mt-16 font-bold text-slate-800">&nbsp;</div>
            </div>
            <div>
              <div className="font-bold uppercase text-slate-900">BAN GIÁM ĐỐC</div>
              <div className="text-[11px] text-slate-500 italic mt-0.5">(Phê duyệt chi)</div>
              <div className="mt-16 font-bold text-slate-800">{safeText(printLog.approver_name)}</div>
            </div>
          </div>
        </div>
      )}

      {/* FLOATING ACTION BUTTON */}
      <button
        type="button"
        onClick={openCreateForm}
        aria-label="Tạo phiếu đề xuất chi"
        title="Tạo phiếu đề xuất chi"
        className="fixed bottom-6 right-6 z-40 inline-flex h-14 w-14 items-center justify-center rounded-full bg-blue-600 text-white shadow-2xl hover:bg-blue-700 hover:scale-105 transition-all cursor-pointer"
      >
        <Plus className="h-6 w-6" />
      </button>

      {/* EXCEL PREVIEW MODAL */}
      <ExcelPreviewModal
        isOpen={isExcelPreviewOpen}
        onClose={() => setIsExcelPreviewOpen(false)}
        onExport={handleExportExcel}
        isExporting={isExporting}
        mode={isMonthOverview ? 'cashflow_month' : 'cashflow_week'}
        title={isMonthOverview
          ? `Báo cáo quyết toán quỹ Tháng ${Number(selectedMonth.slice(5))}/${selectedMonth.slice(0, 4)}`
          : `Đề nghị thanh toán hoa hồng — ${selectedPeriodHeading}`}
        subtitle={isMonthOverview
          ? `Tổng hợp tháng ${Number(selectedMonth.slice(5))}/${selectedMonth.slice(0, 4)}`
          : selectedPeriodHeading}
        fileName={isMonthOverview
          ? `Bao_cao_chot_quy_thang_${selectedMonth}.xlsx`
          : `DNTT_hoa_hong_${selectedPeriodCode}.xlsx`}
        data={{
          salesBase: isMonthOverview ? displayedContractTotals.pool : selectedBase,
          periodLabel: isMonthOverview
            ? `Tháng ${Number(selectedMonth.slice(5))}/${selectedMonth.slice(0, 4)}`
            : selectedPeriodHeading,
          funds: previewFunds,
          totalAllocated: summaryTotals.allocation,
          totalSpent: summaryTotals.paid,
          totalRemaining: summaryTotals.remaining,
          people: previewPeople,
        }}
      />

      {/* UPDATE FUND ALLOCATION PAID MODAL */}
      <UpdateFundAllocationPaidModal
        isOpen={isUpdatePaidOpen}
        onClose={() => setIsUpdatePaidOpen(false)}
        periodCode={isMonthOverview ? '' : selectedPeriodCode}
        periodLabel={isMonthOverview ? `Tháng ${Number(selectedMonth.slice(5))}/${selectedMonth.slice(0, 4)}` : selectedPeriodHeading}
        salesBase={isMonthOverview ? displayedContractTotals.pool : selectedBase}
        fundRows={fundRowsToDisplay.map((r) => ({
          fund_key: r.fund_key,
          fund_source: r.fund_source,
          allocation_rate: r.allocation_rate,
          allocation_amount: r.allocation_amount,
          paid_amount: paidAmountForFund(r.fund_key, r.fund_source),
        }))}
        onSaveSuccess={handleUpdatePaidSuccess}
      />
    </div>
  );
}

const StatCard = React.memo(function StatCard({ icon: Icon, label, value, note, tint }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string; note: string; tint: string }) {
  const tints: Record<string, string> = { blue: 'bg-blue-50 text-blue-700', indigo: 'bg-indigo-50 text-indigo-700', amber: 'bg-amber-50 text-amber-700', emerald: 'bg-emerald-50 text-emerald-700' };
  return <Panel className="p-4"><div className="flex items-start justify-between"><div className="text-xs font-semibold text-slate-500">{label}</div><div className={`rounded-xl p-2 ${tints[tint]}`}><Icon className="h-5 w-5" /></div></div><div className="mt-3 text-xl font-bold tracking-tight text-slate-900">{value}</div><div className="mt-1 text-[10px] text-slate-500">{note}</div></Panel>;
});


function SplitRow({ label, amount, color }: { label: string; amount: number; color: string }) {
  return <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2"><span className="font-medium text-slate-700">{label}</span><span className={`font-bold ${color}`}>{formatVND(amount)}</span></div>;
}

function MiniStat({ label, value, note }: { label: string; value: string; note: string }) {
  return <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3"><div className="text-[10px] font-semibold text-slate-500">{label}</div><div className="mt-1 text-base font-bold text-slate-900">{value}</div><div className="mt-1 text-[10px] text-slate-500">{note}</div></div>;
}

function StatusBadge({ status }: { status: string }) {
  const style = isPaidStatus(status) ? 'bg-emerald-50 text-emerald-700' : status === 'Đã duyệt' ? 'bg-blue-50 text-blue-700' : status === 'Từ chối' ? 'bg-red-50 text-red-700' : status === 'Thiếu dữ liệu' ? 'bg-orange-50 text-orange-700' : 'bg-amber-50 text-amber-700';
  return <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-bold ${style}`}>{status === 'Thiếu dữ liệu' ? <AlertCircle className="h-3 w-3" /> : null}{status}</span>;
}

function Modal({
  children,
  onClose,
  title,
  maxWidth = 'max-w-2xl',
}: {
  children: React.ReactNode;
  onClose: () => void;
  title: string;
  maxWidth?: string;
}) {
  const isBackdropMouseDownRef = useRef(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleBackdropMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      isBackdropMouseDownRef.current = true;
    } else {
      isBackdropMouseDownRef.current = false;
    }
  };

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget && isBackdropMouseDownRef.current) {
      onClose();
    }
    isBackdropMouseDownRef.current = false;
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4"
      onMouseDown={handleBackdropMouseDown}
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
    >
      <div
        className={`max-h-[92vh] w-full ${maxWidth} overflow-y-auto rounded-2xl bg-white shadow-2xl`}
        onMouseDown={(e) => {
          e.stopPropagation();
          isBackdropMouseDownRef.current = false;
        }}
        onClick={(e) => {
          e.stopPropagation();
        }}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-white px-5 py-4 rounded-t-2xl">
          <h2 className="font-bold text-slate-900">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng"
            className="rounded-lg p-1 text-slate-500 hover:bg-slate-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block space-y-1"><span className="font-semibold text-slate-600">{label}</span>{children}</label>;
}

function PersonFields({ title, name, phone, onName, onPhone }: { title: string; name: string; phone: string; onName: (value: string) => void; onPhone: (value: string) => void }) {
  return <div className="grid gap-2 rounded-xl border border-slate-100 p-3 sm:grid-cols-2"><div className="font-bold text-slate-700 sm:col-span-2">{title}</div><Field label="Họ tên"><input value={name} onChange={(event) => onName(event.target.value)} className={inputClass} /></Field><Field label="Số điện thoại"><input value={phone} onChange={(event) => onPhone(event.target.value)} className={inputClass} /></Field></div>;
}

function BeneficiaryFields({
  members,
  name,
  phone,
  bankAccount,
  onChange,
  onPhone,
  onBankAccount,
}: {
  members: TransactionMember[];
  name: string;
  phone: string;
  bankAccount: string;
  onChange: (name: string, member?: TransactionMember) => void;
  onPhone: (phone: string) => void;
  onBankAccount: (bankAccount: string) => void;
}) {
  const selectedMember = useMemo(() => {
    return members.find((m) => m.full_name.toLocaleLowerCase('vi') === name.trim().toLocaleLowerCase('vi'));
  }, [members, name]);

  return (
    <div className="grid gap-2 rounded-xl border border-slate-100 p-3 sm:grid-cols-2">
      <div className="font-bold text-slate-700 sm:col-span-2">Người thụ hưởng</div>
      <Field label="Thành viên hoặc đối tác">
        <input
          list="transaction-beneficiary-options"
          value={name}
          onChange={(event) => {
            const nextName = event.target.value;
            const selected = members.find((member) => member.full_name.toLocaleLowerCase('vi') === nextName.trim().toLocaleLowerCase('vi'));
            onChange(nextName, selected);
          }}
          placeholder="Tìm thành viên hoặc nhập tên đối tác"
          className={inputClass}
        />
        <datalist id="transaction-beneficiary-options">
          {members.map((member) => (
            <option key={member.id} value={member.full_name}>
              {member.phone ? `${member.phone} · ` : ''}{member.team_name ? `Đội ${member.team_name}` : ''}{member.title ? ` (${member.title})` : ''}
            </option>
          ))}
        </datalist>
      </Field>
      <Field label="Số điện thoại"><input value={phone} onChange={(event) => onPhone(event.target.value)} className={inputClass} /></Field>
      <Field label="Tài khoản / Ngân hàng nhận"><input value={bankAccount} onChange={(event) => onBankAccount(event.target.value)} className={inputClass} /></Field>
      {selectedMember && (
        <div className="sm:col-span-2 flex flex-wrap items-center gap-2 rounded-lg border border-blue-100 bg-blue-50/80 px-3 py-2 text-xs text-blue-900">
          <span className="font-semibold text-blue-700">Đội nhóm (TeamLead):</span>
          <span className="inline-flex items-center rounded-md bg-white px-2 py-0.5 font-bold text-blue-700 shadow-2xs border border-blue-200">
            {selectedMember.team_name || 'Chưa phân đội'}
          </span>
          {selectedMember.title && (
            <>
              <span className="text-slate-300">|</span>
              <span className="text-slate-600">Chức vụ: <strong>{selectedMember.title}</strong></span>
            </>
          )}
        </div>
      )}
      <p className="text-[10px] text-slate-500 sm:col-span-2">Chọn thành viên để tự động điền Đội nhóm, SĐT và thông tin ngân hàng thụ hưởng.</p>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return <div className="rounded-lg bg-slate-50 p-3"><div className="mb-1 text-slate-500">{label}</div><div className="font-semibold text-slate-800">{value}</div></div>;
}
