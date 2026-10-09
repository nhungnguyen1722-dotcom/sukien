'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import * as XLSX from 'xlsx';
import { CONTRACT_TEAM_OPTIONS } from '@/lib/teamOptions';
import { sanitizeVietnameseText } from '@/lib/nameSanitizer';
import { getOperationsSupportFundKey, OPERATIONS_SUPPORT_FUND_RATE } from '@/lib/operationsFunds';
import {
  AlertCircle,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Coins,
  Eye,
  FileText,
  HandCoins,
  Pencil,
  Plus,
  Printer,
  Receipt,
  RotateCw,
  Search,
  ShieldCheck,
  Trash2,
  X,
} from 'lucide-react';

export interface Contract {
  id: number;
  contract_code: string | null;
  contract_date: string;
  customer_name: string;
  customer_phone?: string | null;
  customer_address?: string | null;
  value: number | string;
  closer_id: number | null;
  closer_name?: string | null;
  closer_phone?: string | null;
  referrer_id: number | null;
  referrer_name?: string | null;
  referrer_phone?: string | null;
  supporter_id: number | null;
  supporter_name?: string | null;
  supporter_phone?: string | null;
  team_name?: string | null;
  contract_type?: string | null;
  closer_fee?: number | string | null;
  referrer_fee?: number | string | null;
  supporter_fee?: number | string | null;
  status?: string | null;
  created_at?: string;
}

export interface Stats {
  totalContracts: number;
  totalValue: number;
  totalCommission?: number;
  approvedContracts?: number;
  allocationBase?: number;
}

export interface UserOption {
  id: number;
  full_name: string;
  phone?: string | null;
  referrer_id?: number | null;
  referrer_name?: string | null;
  referrer_phone?: string | null;
  referral_group?: string | null;
  team_name?: string | null;
}

export interface TeamOption {
  id: number;
  name: string;
}

type MemberRole = 'closer' | 'referrer' | 'supporter';

interface ContractManagementProps {
  initialContracts: Contract[];
  initialStats: Stats;
  initialUsers: UserOption[];
  initialClosers: UserOption[];
  initialTeams: TeamOption[];
  currentYear: number;
}

interface ContractFormData {
  contract_code: string;
  contract_date: string;
  contract_type: string;
  customer_name: string;
  customer_phone: string;
  customer_address: string;
  value: number;
  closer_id: string;
  closer_name: string;
  closer_phone: string;
  referrer_id: string;
  referrer_name: string;
  referrer_phone: string;
  supporter_id: string;
  supporter_name: string;
  supporter_phone: string;
  team_name: string;
}

const emptyForm: ContractFormData = {
  contract_code: '',
  contract_date: '',
  contract_type: '',
  customer_name: '',
  customer_phone: '',
  customer_address: '',
  value: 0,
  closer_id: '',
  closer_name: '',
  closer_phone: '',
  referrer_id: '',
  referrer_name: '',
  referrer_phone: '',
  supporter_id: '',
  supporter_name: '',
  supporter_phone: '',
  team_name: '',
};

const weekOptions = [1, 2, 3, 4, 5];
const contractTypes = [
  { value: 'BĐS', label: 'BĐS' },
  { value: '1 năm', label: '1 Năm' },
  { value: '2 năm', label: '2 Năm' },
  { value: '3 năm', label: '3 Năm' },
];

function formatWeekRange(year: string, month: number, week: number) {
  const firstDay = (week - 1) * 7 + 1;
  const lastDay = Math.min(week * 7, new Date(Number(year), month, 0).getDate());
  if (firstDay > lastDay) return '';
  const monthLabel = String(month).padStart(2, '0');
  return `${String(firstDay).padStart(2, '0')}–${String(lastDay).padStart(2, '0')}/${monthLabel}`;
}

function formatWeekLabel(year: string, month: number, week: number) {
  const range = formatWeekRange(year, month, week);
  return range ? `${week} · ${range}` : String(week);
}

function numeric(value: number | string | null | undefined) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatMoney(value: number | string | null | undefined) {
  return new Intl.NumberFormat('vi-VN').format(numeric(value)) + ' đ';
}

function formatDate(value: string | null | undefined) {
  if (!value) return '—';
  const datePart = String(value).slice(0, 10);
  const parts = datePart.split('-');
  if (parts.length !== 3) return value;
  return parts[2] + '/' + parts[1] + '/' + parts[0];
}

function toDateInput(value: string | null | undefined) {
  return value ? String(value).slice(0, 10) : '';
}

function cleanNumber(value: string) {
  const digits = value.replace(/\D/g, '');
  return digits ? new Intl.NumberFormat('vi-VN').format(Number(digits)) : '';
}

const contractBudgetFunds = [
  { key: 'direct_sale', label: 'Sale trực tiếp - Pro sale (Nguồn khách)', rate: 0.06, color: 'bg-blue-500' },
  { key: 'connection', label: 'Tri ân kết nối sale trực tiếp', rate: 0.01, color: 'bg-emerald-500' },
  { key: 'support', label: 'Tri ân hỗ trợ sale', rate: 0.005, color: 'bg-amber-500' },
  { key: 'event_close', label: 'Quỹ Sự kiện - Chốt hợp đồng', rate: 0.005, color: 'bg-violet-500' },
  { key: 'customer_care', label: 'Quỹ Chăm sóc khách hàng', rate: 0.002, color: 'bg-rose-500' },
  { key: 'training', label: 'Quỹ Đào tạo Chuyên môn & Kỹ năng', rate: 0.003, color: 'bg-indigo-500' },
  { key: 'incentive', label: 'Quỹ Thi đua & Chương trình thúc đẩy', rate: 0.008, color: 'bg-orange-500' },
  { key: 'travel', label: 'Chi phí Công tác phí', rate: 0.003, color: 'bg-cyan-500' },
  { key: 'leader', label: 'Leader team - giám đốc Kd', rate: 0.029, color: 'bg-yellow-500' },
  { key: 'operations', label: 'Quỹ Vận hành & Bộ phận hỗ trợ', rate: OPERATIONS_SUPPORT_FUND_RATE, color: 'bg-slate-500' },
] as const;

function getBudgetFundKey(fundSource: string) {
  const source = fundSource.toLocaleLowerCase('vi-VN');
  if (source.includes('sale trực tiếp') && !source.includes('tri ân')) return 'direct_sale';
  if (source.includes('tri ân kết nối') || source.includes('tri ân giới thiệu')) return 'connection';
  if (source.includes('tri ân hỗ trợ')) return 'support';
  if (source.includes('sự kiện') || source.includes('chốt hợp đồng')) return 'event_close';
  if (source.includes('chăm sóc khách hàng')) return 'customer_care';
  if (source.includes('đào tạo')) return 'training';
  if (source.includes('thi đua') || source.includes('thúc đẩy')) return 'incentive';
  if (source.includes('công tác phí')) return 'travel';
  if (source.includes('leader') || source.includes('giám đốc kd')) return 'leader';
  if (getOperationsSupportFundKey(fundSource)) return 'operations';
  return null;
}

function ContractBudgetSummary({
  allocationBase,
  actualFundSpending,
  onRefresh,
}: {
  allocationBase: number;
  actualFundSpending: { fund_source: string; actual_spent: number }[];
  onRefresh: () => Promise<void>;
}) {
  const [isUpdating, setIsUpdating] = useState(false);
  const actualByFund = new Map<string, number>();
  for (const expense of actualFundSpending) {
    const key = getBudgetFundKey(expense.fund_source);
    if (key) actualByFund.set(key, (actualByFund.get(key) || 0) + numeric(expense.actual_spent));
  }

  const updateSummary = async () => {
    setIsUpdating(true);
    try {
      await onRefresh();
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="mt-4 flex justify-end">
      <section className="w-full lg:w-1/2 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs">
        <div className="flex flex-col gap-2.5 border-b border-slate-100 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <div className="flex min-w-0 items-center gap-1.5">
            <h2 className="text-xs font-bold text-slate-900 sm:text-sm">PHÂN TÍCH PHÂN BỔ NGÂN SÁCH HỢP ĐỒNG (15%) - GIAI ĐOẠN 1</h2>
            <span title="Ngân sách tính theo cơ sở phân bổ nội bộ của hợp đồng trong bộ lọc; thực chi lấy từ phiếu đã chi trong kỳ." className="shrink-0 cursor-help text-slate-400" aria-label="Thông tin cách tính">ⓘ</span>
          </div>
          <div className="flex shrink-0 gap-1.5">
            <button type="button" onClick={updateSummary} disabled={isUpdating} className="rounded-lg bg-blue-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-60">
              {isUpdating ? 'Đang cập nhật...' : 'Cập nhật'}
            </button>
            <button type="button" onClick={updateSummary} disabled={isUpdating} className="rounded-lg bg-blue-50 px-2.5 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-100 disabled:opacity-60">
              Tự động tính
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[480px] border-collapse text-left text-xs tabular-nums">
            <thead className="bg-slate-50 text-[11px] font-semibold text-slate-500">
              <tr>
                <th className="px-3.5 py-2.5 sm:px-4 sm:py-3">Tên Quỹ / Bộ phận</th>
                <th className="px-2 py-2.5 text-center sm:px-3 sm:py-3">Tỷ lệ (%)</th>
                <th className="whitespace-nowrap px-2.5 py-2.5 text-right sm:px-3 sm:py-3">Thêm từ Chốt HĐ</th>
                <th className="whitespace-nowrap px-3.5 py-2.5 text-right sm:px-4 sm:py-3">Đã thực chi thực tế</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              <tr className="bg-slate-50/70 font-bold text-slate-900">
                <td className="px-3.5 py-2.5 sm:px-4">TỔNG NGÂN SÁCH (15%)</td>
                <td className="px-2 py-2.5 text-center sm:px-3"><span className="rounded-md bg-blue-600 px-2 py-0.5 text-[11px] font-bold text-white">15,00%</span></td>
                <td className="whitespace-nowrap px-2.5 py-2.5 text-right sm:px-3">{formatMoney(Math.round(allocationBase * 0.15))}</td>
                <td className="whitespace-nowrap px-3.5 py-2.5 text-right text-emerald-700 sm:px-4">{formatMoney(contractBudgetFunds.reduce((sum, fund) => sum + (actualByFund.get(fund.key) || 0), 0))}</td>
              </tr>
              {contractBudgetFunds.map((fund) => (
                <tr key={fund.key} className="hover:bg-slate-50/70">
                  <td className="px-3.5 py-2 sm:px-4 sm:py-2.5">
                    <span className={`mr-2 inline-block h-2 w-2 rounded-full align-middle ${fund.color}`} aria-hidden="true" />
                    <span className="align-middle text-slate-700">{fund.label}</span>
                  </td>
                  <td className="px-2 py-2 text-center sm:px-3 sm:py-2.5"><span className="rounded-md bg-blue-50 px-1.5 py-0.5 text-[11px] font-semibold text-blue-700">{(fund.rate * 100).toLocaleString('vi-VN', { minimumFractionDigits: 2 })}%</span></td>
                  <td className="whitespace-nowrap px-2.5 py-2 text-right font-semibold text-slate-900 sm:px-3 sm:py-2.5">{formatMoney(Math.round(allocationBase * fund.rate))}</td>
                  <td className="whitespace-nowrap px-3.5 py-2 text-right text-emerald-700 sm:px-4 sm:py-2.5">{formatMoney(actualByFund.get(fund.key) || 0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function normalizeVietnamese(value: string | null | undefined): string {
  return (value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .trim();
}

interface SearchableMemberSelectProps {
  id: string;
  label: string;
  role: MemberRole;
  selectedId: string;
  selectedName: string;
  selectedPhone: string;
  users: UserOption[];
  isOpen: boolean;
  onToggle: (open: boolean) => void;
  onSelect: (role: MemberRole, userId: string, override?: UserOption) => void;
  onQuickAdd: (role: MemberRole) => void;
}

function SearchableMemberSelect({
  id,
  label,
  role,
  selectedId,
  selectedName,
  selectedPhone,
  users,
  isOpen,
  onToggle,
  onSelect,
  onQuickAdd,
}: SearchableMemberSelectProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setSearchQuery('');
      const timer = setTimeout(() => {
        searchInputRef.current?.focus();
      }, 30);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        onToggle(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onToggle(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onToggle]);

  const currentSelectedUser = useMemo(() => {
    if (!selectedId || selectedId === 'legacy') return null;
    return users.find((u) => String(u.id) === selectedId) || null;
  }, [selectedId, users]);

  const displayName = currentSelectedUser ? currentSelectedUser.full_name : selectedName;
  const displayPhone = currentSelectedUser ? (currentSelectedUser.phone || '') : selectedPhone;
  const hasSelection = Boolean(selectedId || selectedName);

  const filteredUsers = useMemo(() => {
    const q = searchQuery.trim();
    if (!q) return users;
    const normQ = normalizeVietnamese(q);
    const digitsQ = q.replace(/\D/g, '');

    return users.filter((u) => {
      const name = u.full_name || '';
      const phone = u.phone || '';
      if (digitsQ && phone.replace(/\D/g, '').includes(digitsQ)) return true;
      if (phone.includes(q)) return true;
      if (name.toLowerCase().includes(q.toLowerCase())) return true;
      if (normalizeVietnamese(name).includes(normQ)) return true;
      return false;
    });
  }, [users, searchQuery]);

  return (
    <div ref={containerRef} className="relative rounded-xl border border-slate-200 bg-white p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <label htmlFor={id} className="text-xs font-semibold text-slate-700">
          {label}
        </label>
        <button
          type="button"
          onClick={() => onQuickAdd(role)}
          aria-label={'Thêm nhanh ' + label}
          title="Thêm nhanh thành viên"
          className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>

      <div className="relative">
        <button
          type="button"
          id={id}
          onClick={() => onToggle(!isOpen)}
          aria-haspopup="listbox"
          aria-expanded={isOpen}
          className={`flex w-full items-center justify-between gap-2 rounded-lg border bg-white px-3 py-2 text-sm text-left transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 ${
            isOpen ? 'border-blue-500 ring-2 ring-blue-500/20' : 'border-slate-200 hover:border-slate-300'
          }`}
        >
          <span className="min-w-0 flex-1 truncate">
            {hasSelection ? (
              <span className="font-medium text-slate-800">
                {displayName}
                {displayPhone ? (
                  <span className="text-xs font-normal text-slate-500"> · {displayPhone}</span>
                ) : null}
              </span>
            ) : (
              <span className="text-slate-400">Chọn thành viên</span>
            )}
          </span>

          <span className="flex items-center gap-1 shrink-0 text-slate-400">
            {hasSelection && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onSelect(role, '');
                }}
                title="Bỏ chọn"
                className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors cursor-pointer"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
            <ChevronDown
              className={`h-4 w-4 text-slate-400 transition-transform duration-200 ${
                isOpen ? 'rotate-180 text-blue-600' : ''
              }`}
            />
          </span>
        </button>

        {isOpen && (
          <div className="absolute left-0 right-0 top-full mt-1.5 z-50 rounded-xl border border-slate-200 bg-white shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-100">
            <div className="p-2 border-b border-slate-100 bg-slate-50/50">
              <div className="relative">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && filteredUsers.length > 0) {
                      e.preventDefault();
                      onSelect(role, String(filteredUsers[0].id), filteredUsers[0]);
                      onToggle(false);
                    }
                  }}
                  placeholder="Tìm theo tên hoặc số điện thoại..."
                  className="w-full rounded-lg border border-slate-200 bg-white py-1.5 pl-8 pr-7 text-xs text-slate-800 placeholder:text-slate-400 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('');
                      searchInputRef.current?.focus();
                    }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-slate-600 rounded"
                    title="Xóa tìm kiếm"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>
            </div>

            <div className="max-h-56 overflow-y-auto p-1 text-xs overscroll-contain">
              <button
                type="button"
                onClick={() => {
                  onSelect(role, '');
                  onToggle(false);
                }}
                className={`w-full text-left px-2.5 py-1.5 rounded-lg flex items-center justify-between transition-colors ${
                  !hasSelection
                    ? 'bg-blue-50/70 font-semibold text-blue-700'
                    : 'text-slate-500 hover:bg-slate-50'
                }`}
              >
                <span>— Chọn thành viên (Bỏ chọn) —</span>
                {!hasSelection && <Check className="h-3.5 w-3.5 text-blue-600 shrink-0" />}
              </button>

              {selectedName && !selectedId && (
                <button
                  type="button"
                  onClick={() => {
                    onSelect(role, 'legacy');
                    onToggle(false);
                  }}
                  className="w-full text-left px-2.5 py-1.5 rounded-lg bg-amber-50 text-amber-900 font-medium hover:bg-amber-100/70 my-0.5"
                >
                  <span>{selectedName} (chưa liên kết)</span>
                </button>
              )}

              {filteredUsers.length === 0 ? (
                <div className="py-4 px-2 text-center text-xs text-slate-400">
                  <p>Không tìm thấy thành viên phù hợp</p>
                  <button
                    type="button"
                    onClick={() => {
                      onToggle(false);
                      onQuickAdd(role);
                    }}
                    className="mt-1.5 text-blue-600 font-medium hover:underline inline-flex items-center gap-1"
                  >
                    <Plus className="h-3 w-3" /> Thêm thành viên mới
                  </button>
                </div>
              ) : (
                filteredUsers.map((user) => {
                  const isSelected = String(user.id) === selectedId;
                  return (
                    <button
                      key={user.id}
                      type="button"
                      onClick={() => {
                        onSelect(role, String(user.id), user);
                        onToggle(false);
                      }}
                      className={`w-full text-left px-2.5 py-2 rounded-lg flex items-center justify-between gap-2 transition-colors cursor-pointer ${
                        isSelected
                          ? 'bg-blue-50 font-semibold text-blue-700'
                          : 'text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-medium text-slate-900">{user.full_name}</div>
                        {user.phone && (
                          <div className="text-[11px] text-slate-500 mt-0.5 truncate">{user.phone}</div>
                        )}
                      </div>
                      {isSelected && <Check className="h-4 w-4 text-blue-600 shrink-0" />}
                    </button>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>

      {hasSelection && (
        <p className="mt-1.5 truncate text-[11px] text-slate-500">
          {displayName}
          {displayPhone ? ' · ' + displayPhone : ''}
        </p>
      )}
    </div>
  );
}

function normalizeContract(contract: Contract): Contract {
  return {
    ...contract,
    closer_name: sanitizeVietnameseText(contract.closer_name),
    referrer_name: sanitizeVietnameseText(contract.referrer_name),
    supporter_name: sanitizeVietnameseText(contract.supporter_name),
    status: sanitizeVietnameseText(contract.status),
  };
}

function normalizeUserOption(user: UserOption): UserOption {
  return {
    ...user,
    full_name: sanitizeVietnameseText(user.full_name),
    referrer_name: sanitizeVietnameseText(user.referrer_name),
  };
}

export default function ContractManagement({
  initialContracts,
  initialStats,
  initialUsers,
  initialClosers,
  initialTeams,
  currentYear,
}: ContractManagementProps) {
  const [contracts, setContracts] = useState<Contract[]>(() => (initialContracts || []).map(normalizeContract));
  const [stats, setStats] = useState(initialStats);
  const [allocationBase, setAllocationBase] = useState(initialStats.allocationBase ?? initialStats.totalValue);
  const [actualFundSpending, setActualFundSpending] = useState<{ fund_source: string; actual_spent: number }[]>([]);
  const [users, setUsers] = useState<UserOption[]>(() => (initialUsers || []).map(normalizeUserOption));
  const [closers, setClosers] = useState<UserOption[]>(() => (initialClosers || []).map(normalizeUserOption));
  const [teams, setTeams] = useState(initialTeams);

  const [searchQuery, setSearchQuery] = useState('');
  const [closerFilter, setCloserFilter] = useState('all');
  const [selectedYear, setSelectedYear] = useState(String(currentYear));
  const [selectedMonth, setSelectedMonth] = useState<number | 'all'>('all');
  const activeMonthRef = useRef<HTMLButtonElement | null>(null);
  const [selectedWeek, setSelectedWeek] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingContract, setEditingContract] = useState<Contract | null>(null);
  const [viewingContract, setViewingContract] = useState<Contract | null>(null);
  const [deleteConfirmContract, setDeleteConfirmContract] = useState<Contract | null>(null);
  const [formData, setFormData] = useState<ContractFormData>(emptyForm);
  const [valueFormatted, setValueFormatted] = useState('');
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [activeDropdown, setActiveDropdown] = useState<MemberRole | null>(null);

  const [quickAddKind, setQuickAddKind] = useState<'member' | 'team' | null>(null);
  const [quickAddRole, setQuickAddRole] = useState<MemberRole>('closer');
  const [quickAddName, setQuickAddName] = useState('');
  const [quickAddPhone, setQuickAddPhone] = useState('');
  const [quickAddError, setQuickAddError] = useState('');
  const [isQuickAdding, setIsQuickAdding] = useState(false);

  const showToast = (type: 'success' | 'error', text: string) => {
    setToastMessage({ type, text });
    window.setTimeout(() => setToastMessage(null), 4000);
  };

  const refreshData = useCallback(async () => {
    const params = new URLSearchParams({ year: selectedYear });
    if (selectedMonth !== 'all') params.set('month', String(selectedMonth));
    if (selectedMonth !== 'all' && selectedWeek) params.set('week', String(selectedWeek));
    if (searchQuery.trim()) params.set('search', searchQuery.trim());
    if (closerFilter !== 'all') params.set('closer_id', closerFilter);

    try {
      const response = await fetch('/api/admin/contracts?' + params.toString());
      if (!response.ok) throw new Error('Không thể tải danh sách hợp đồng');
      const data = await response.json();
      setContracts((data.contracts || []).map(normalizeContract));
      setStats(data.stats || initialStats);
      setAllocationBase(numeric(data.allocationBase ?? data.stats?.totalValue));
      setActualFundSpending(data.actualFundSpending || []);
      if (data.closers) setClosers((data.closers || []).map(normalizeUserOption));
      if (data.users) setUsers((data.users || []).map(normalizeUserOption));
      if (data.teams) setTeams(data.teams);
      setCurrentPage(1);
    } catch (error) {
      console.error('Lỗi tải danh sách hợp đồng:', error);
    }
  }, [closerFilter, initialStats, searchQuery, selectedMonth, selectedYear, selectedWeek]);

  useEffect(() => {
    void refreshData();
  }, [refreshData]);

  useEffect(() => {
    activeMonthRef.current?.scrollIntoView({ block: 'nearest', inline: 'center' });
  }, [selectedMonth]);

  const yearOptions = useMemo(() => {
    const years = new Set<number>();
    for (let year = currentYear - 3; year <= currentYear + 3; year += 1) years.add(year);
    for (const contract of contracts) {
      const year = Number(String(contract.contract_date || '').slice(0, 4));
      if (year) years.add(year);
    }
    years.add(Number(selectedYear));
    return Array.from(years).sort((a, b) => b - a);
  }, [contracts, currentYear, selectedYear]);

  const totalPages = Math.ceil(contracts.length / pageSize) || 1;

  const totalCommission = stats.totalCommission !== undefined
    ? stats.totalCommission
    : contracts.reduce(
        (sum, c) => sum + numeric(c.closer_fee) + numeric(c.referrer_fee) + numeric(c.supporter_fee),
        0
      );

  const approvedContracts = stats.approvedContracts !== undefined
    ? stats.approvedContracts
    : contracts.filter((c) => c.status === 'Đã duyệt' || c.status === 'Da duyệt').length;
  const paginatedContracts = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return contracts.slice(start, start + pageSize);
  }, [contracts, currentPage, pageSize]);

  const handleResetFilters = () => {
    setSearchQuery('');
    setCloserFilter('all');
    setSelectedYear(String(currentYear));
    setSelectedMonth('all');
    setSelectedWeek(null);
  };

  const openAddForm = () => {
    setEditingContract(null);
    setActiveDropdown(null);
    setFormData({
      ...emptyForm,
      contract_code: 'HD' + String(Date.now()).slice(-6),
      contract_date: new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Bangkok' }),
      value: 50000000,
    });
    setValueFormatted(cleanNumber('50000000'));
    setFormError('');
    setIsFormOpen(true);
  };

  const openEditForm = (contract: Contract) => {
    setEditingContract(contract);
    setActiveDropdown(null);
    setFormData({
      contract_code: contract.contract_code || '',
      contract_date: toDateInput(contract.contract_date),
      contract_type: contract.contract_type || '',
      customer_name: contract.customer_name || '',
      customer_phone: contract.customer_phone || '',
      customer_address: contract.customer_address || '',
      value: numeric(contract.value),
      closer_id: contract.closer_id ? String(contract.closer_id) : '',
      closer_name: contract.closer_name || '',
      closer_phone: contract.closer_phone || '',
      referrer_id: contract.referrer_id ? String(contract.referrer_id) : '',
      referrer_name: contract.referrer_name || '',
      referrer_phone: contract.referrer_phone || '',
      supporter_id: contract.supporter_id ? String(contract.supporter_id) : '',
      supporter_name: contract.supporter_name || '',
      supporter_phone: contract.supporter_phone || '',
      team_name: contract.team_name || '',
    });
    setValueFormatted(cleanNumber(String(numeric(contract.value))));
    setFormError('');
    setIsFormOpen(true);
  };

  const selectMember = (role: MemberRole, selectedId: string, override?: UserOption) => {
    if (selectedId === 'legacy') {
      setFormData((current) => ({
        ...current,
        ...(role === 'closer' ? { closer_id: '' } : role === 'referrer' ? { referrer_id: '' } : { supporter_id: '' }),
      }));
      return;
    }
    if (!selectedId) {
      setFormData((current) => ({
        ...current,
        ...(role === 'closer'
          ? { closer_id: '', closer_name: '', closer_phone: '' }
          : role === 'referrer'
            ? { referrer_id: '', referrer_name: '', referrer_phone: '' }
            : { supporter_id: '', supporter_name: '', supporter_phone: '' }),
      }));
      return;
    }
    const selected = override || users.find((user) => user.id === Number(selectedId));
    if (!selected) return;

    setFormData((current) => {
      const selectedFields = role === 'closer'
        ? { closer_id: String(selected.id), closer_name: selected.full_name, closer_phone: selected.phone || '' }
        : role === 'referrer'
          ? { referrer_id: String(selected.id), referrer_name: selected.full_name, referrer_phone: selected.phone || '' }
          : { supporter_id: String(selected.id), supporter_name: selected.full_name, supporter_phone: selected.phone || '' };
      const next = { ...current, ...selectedFields };

      if (role === 'closer') {
        // Tự động thay đổi người giới thiệu F1 nếu người chốt có người giới thiệu trước đó
        let foundReferrer: UserOption | undefined = undefined;

        // Ưu tiên 1: Tìm theo referrer_id trong danh sách users
        if (selected.referrer_id && selected.referrer_id !== selected.id) {
          foundReferrer = users.find((u) => u.id === Number(selected.referrer_id));
        }

        if (foundReferrer) {
          next.referrer_id = String(foundReferrer.id);
          next.referrer_name = foundReferrer.full_name;
          next.referrer_phone = foundReferrer.phone || '';
        } else if (selected.referrer_id && selected.referrer_id !== selected.id && selected.referrer_name) {
          // Referrer không có trong users list nhưng có từ DB LEFT JOIN
          next.referrer_id = String(selected.referrer_id);
          next.referrer_name = selected.referrer_name;
          next.referrer_phone = selected.referrer_phone || '';
        } else if (selected.referral_group && selected.referral_group.trim()) {
          // Ưu tiên 2: Tìm theo referral_group nếu có tên người giới thiệu
          const groupUser = users.find(
            (u) => normalizeVietnamese(u.full_name) === normalizeVietnamese(selected.referral_group) && u.id !== selected.id
          );
          if (groupUser) {
            next.referrer_id = String(groupUser.id);
            next.referrer_name = groupUser.full_name;
            next.referrer_phone = groupUser.phone || '';
          } else {
            next.referrer_id = '';
            next.referrer_name = selected.referral_group.trim();
            next.referrer_phone = '';
          }
        } else {
          // Người chốt không có người giới thiệu
          next.referrer_id = '';
          next.referrer_name = '';
          next.referrer_phone = '';
        }

        // Tự động điền/cập nhật đội nhóm theo người chốt được chọn
        if (selected.team_name && selected.team_name.trim()) {
          const closerTeams = selected.team_name.split(',').map((s) => s.trim()).filter(Boolean);
          if (closerTeams.length > 0) {
            if (!closerTeams.includes(next.team_name)) {
              next.team_name = closerTeams[0];
            }
          }
        }
      }

      return next;
    });
  };

  const openQuickAdd = (kind: 'member' | 'team', role: MemberRole = 'closer') => {
    setQuickAddKind(kind);
    setQuickAddRole(role);
    setQuickAddName('');
    setQuickAddPhone('');
    setQuickAddError('');
  };

  const submitQuickAdd = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setQuickAddError('');
    setIsQuickAdding(true);
    try {
      const isTeam = quickAddKind === 'team';
      const response = await fetch(isTeam ? '/api/admin/teams' : '/api/admin/members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(isTeam
          ? { name: quickAddName.trim() }
          : {
              full_name: quickAddName.trim(),
              phone: quickAddPhone.trim(),
              role: 'Nhân viên',
              classification: 'Sale',
              title: 'Thành viên',
              status: 'Hoạt động',
            }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Không thể tạo mới');

      if (isTeam) {
        const createdTeam = data.team as TeamOption;
        setTeams((current) => current.some((team) => team.name.trim().toLocaleLowerCase('vi-VN') === createdTeam.name.trim().toLocaleLowerCase('vi-VN')) ? current : [...current, createdTeam].sort((a, b) => a.name.localeCompare(b.name, 'vi')));
        setFormData((current) => ({ ...current, team_name: createdTeam.name }));
      } else {
        const createdUser = data.member as UserOption;
        setUsers((current) => current.some((user) => user.id === createdUser.id) ? current : [...current, createdUser].sort((a, b) => a.full_name.localeCompare(b.full_name, 'vi')));
        selectMember(quickAddRole, String(createdUser.id), createdUser);
      }
      setQuickAddKind(null);
      showToast('success', isTeam ? 'Đã thêm đội nhóm' : 'Đã thêm thành viên');
    } catch (error) {
      setQuickAddError(error instanceof Error ? error.message : 'Không thể tạo mới');
    } finally {
      setIsQuickAdding(false);
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError('');
    if (!formData.customer_name.trim()) {
      setFormError('Vui lòng nhập tên khách hàng');
      return;
    }
    if (!formData.contract_date) {
      setFormError('Vui lòng chọn ngày ký');
      return;
    }

    setIsSubmitting(true);
    try {
      const url = editingContract ? '/api/admin/contracts/' + editingContract.id : '/api/admin/contracts';
      const response = await fetch(url, {
        method: editingContract ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          value: numeric(formData.value),
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Có lỗi xảy ra khi lưu hợp đồng');

      setIsFormOpen(false);
      showToast('success', editingContract ? 'Cập nhật hợp đồng thành công' : 'Thêm hợp đồng thành công');
      await refreshData();
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Lỗi khi lưu hợp đồng');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirmContract) return;
    try {
      const response = await fetch('/api/admin/contracts/' + deleteConfirmContract.id, { method: 'DELETE' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Xóa hợp đồng thất bại');
      setDeleteConfirmContract(null);
      showToast('success', 'Đã xóa hợp đồng');
      await refreshData();
    } catch (error) {
      showToast('error', error instanceof Error ? error.message : 'Lỗi khi xóa hợp đồng');
    }
  };

  const detailRows = viewingContract ? [
    {
      role: 'Người chốt',
      name: viewingContract.closer_name || '—',
      phone: viewingContract.closer_phone || '—',
    },
    {
      role: 'Người giới thiệu',
      name: viewingContract.referrer_name || '—',
      phone: viewingContract.referrer_phone || '—',
    },
    {
      role: 'Người hỗ trợ',
      name: viewingContract.supporter_name || '—',
      phone: viewingContract.supporter_phone || '—',
    },
  ] : [];

  const exportContractDetail = () => {
    if (!viewingContract) return;
    const rows = [{
      'Mã hợp đồng': viewingContract.contract_code || '',
      'Loại hợp đồng': viewingContract.contract_type || '',
      'Ngày ký': formatDate(viewingContract.contract_date),
      'Khách hàng': viewingContract.customer_name,
      'SĐT khách hàng': viewingContract.customer_phone || '',
      'Địa chỉ': viewingContract.customer_address || '',
      'Giá trị hợp đồng (VNĐ)': numeric(viewingContract.value),
      'Đội nhóm': viewingContract.team_name?.trim() || '',
      'Người chốt': viewingContract.closer_name || '',
      'SĐT người chốt': viewingContract.closer_phone || '',
      'Người giới thiệu': viewingContract.referrer_name || '',
      'SĐT người giới thiệu': viewingContract.referrer_phone || '',
      'Người hỗ trợ': viewingContract.supporter_name || '',
      'SĐT người hỗ trợ': viewingContract.supporter_phone || '',
      'Thù lao Người chốt 6% (VNĐ)': numeric(viewingContract.closer_fee),
      'Thù lao Người giới thiệu 1% (VNĐ)': numeric(viewingContract.referrer_fee),
      'Thù lao Người hỗ trợ 0,5% (VNĐ)': numeric(viewingContract.supporter_fee),
      'Trạng thái': viewingContract.status || 'Chờ duyệt',
    }];
    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Thông tin hợp đồng');
    XLSX.writeFile(workbook, 'chi-tiet-hop-dong-' + (viewingContract.contract_code || viewingContract.id) + '.xlsx');
  };

  const memberSelect = (role: MemberRole, label: string, name: string, phone: string, id: string) => {
    return (
      <SearchableMemberSelect
        id={'member-' + role}
        label={label}
        role={role}
        selectedId={id}
        selectedName={name}
        selectedPhone={phone}
        users={users}
        isOpen={activeDropdown === role}
        onToggle={(open) => setActiveDropdown(open ? role : null)}
        onSelect={selectMember}
        onQuickAdd={(targetRole) => openQuickAdd('member', targetRole)}
      />
    );
  };

  return (
    <div className="contract-log-page min-h-screen bg-slate-50 p-[15px] text-slate-900 sm:p-8">
      {toastMessage && (
        <div className="fixed right-4 top-4 z-[100] flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-lg">
          {toastMessage.type === 'success'
            ? <Check className="h-4 w-4 text-emerald-600" />
            : <AlertCircle className="h-4 w-4 text-rose-600" />}
          <span>{toastMessage.text}</span>
        </div>
      )}

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="mb-1 text-[11px] font-medium text-slate-500">Trang chủ &gt; Nhật ký hợp đồng</div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">Nhật ký hợp đồng</h1>
          <p className="mt-0.5 text-xs text-slate-500">Quản lý hợp đồng, doanh số chốt và phân bổ hoa hồng</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <a
            href="/api/admin/contracts/export"
            title="Tải xuống danh sách đầy đủ, không giới hạn theo bộ lọc trên màn hình"
            download
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 sm:px-4 sm:text-sm"
          >
            <DownloadIcon />
            <span>Xuất tất cả</span>
          </a>
          <button
            type="button"
            onClick={openAddForm}
            className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-3 py-2 text-xs font-semibold text-white shadow-sm hover:bg-blue-700 sm:px-4 sm:text-sm"
          >
            <Plus className="h-4 w-4" />
            <span>Thêm hợp đồng</span>
          </button>
        </div>
      </div>

      <div className="sticky top-12 z-30 -mx-[15px] bg-slate-50/95 px-[15px] pb-3 pt-2 backdrop-blur md:top-0 sm:-mx-8 sm:px-8">
        <div className="mb-3 grid grid-cols-2 gap-2.5 sm:gap-4 lg:grid-cols-4">
          <div className="flex min-w-0 items-center gap-3 rounded-2xl border border-slate-100 bg-white p-3.5 shadow-xs sm:p-4">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 sm:h-12 sm:w-12">
              <FileText className="h-5 w-5 sm:h-6 sm:w-6" />
            </span>
            <div className="min-w-0 flex-1">
              <span className="block truncate text-xs font-normal text-slate-500 sm:text-[13px]">Tổng hợp đồng</span>
              <div className="mt-0.5 flex items-baseline gap-1.5">
                <strong className="text-base font-bold text-slate-900 sm:text-xl">{stats.totalContracts}</strong>
                <span className="text-xs text-slate-400">hợp đồng</span>
              </div>
            </div>
          </div>

          <div className="flex min-w-0 items-center gap-3 rounded-2xl border border-slate-100 bg-white p-3.5 shadow-xs sm:p-4">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 sm:h-12 sm:w-12">
              <Coins className="h-5 w-5 sm:h-6 sm:w-6" />
            </span>
            <div className="min-w-0 flex-1">
              <span className="block truncate text-xs font-normal text-slate-500 sm:text-[13px]">Tổng giá trị HĐ</span>
              <strong className="mt-0.5 block truncate text-base font-bold text-slate-900 sm:text-xl">
                {formatMoney(stats.totalValue)}
              </strong>
            </div>
          </div>

          <div className="flex min-w-0 items-center gap-3 rounded-2xl border border-slate-100 bg-white p-3.5 shadow-xs sm:p-4">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-amber-50 text-amber-500 sm:h-12 sm:w-12">
              <HandCoins className="h-5 w-5 sm:h-6 sm:w-6" />
            </span>
            <div className="min-w-0 flex-1">
              <span className="block truncate text-xs font-normal text-slate-500 sm:text-[13px]">Tổng hoa hồng</span>
              <strong className="mt-0.5 block truncate text-base font-bold text-slate-900 sm:text-xl">
                {formatMoney(totalCommission)}
              </strong>
            </div>
          </div>

          <div className="flex min-w-0 items-center gap-3 rounded-2xl border border-slate-100 bg-white p-3.5 shadow-xs sm:p-4">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-purple-50 text-purple-600 sm:h-12 sm:w-12">
              <ShieldCheck className="h-5 w-5 sm:h-6 sm:w-6" />
            </span>
            <div className="min-w-0 flex-1">
              <span className="block truncate text-xs font-normal text-slate-500 sm:text-[13px]">Đã duyệt</span>
              <div className="mt-0.5 flex items-baseline gap-1.5">
                <strong className="text-base font-bold text-slate-900 sm:text-xl">{approvedContracts}</strong>
                <span className="text-xs text-slate-400">hợp đồng</span>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-xs">
          <div className="flex flex-col gap-2.5 lg:flex-row lg:items-center">
            <div className="relative min-w-0 flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="search"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Tìm mã hợp đồng, khách hàng..."
                className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-xs text-slate-800 outline-none focus:ring-2 focus:ring-blue-500 sm:text-sm"
              />
            </div>
            <select
              aria-label="Chọn năm"
              value={selectedYear}
              onChange={(event) => setSelectedYear(event.target.value)}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 sm:text-sm"
            >
              {yearOptions.map((year) => <option key={year} value={year}>{year}</option>)}
            </select>
            <select
              aria-label="Lọc theo người chốt"
              value={closerFilter}
              onChange={(event) => setCloserFilter(event.target.value)}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 sm:text-sm"
            >
              <option value="all">Tất cả người chốt</option>
              {closers.map((closer) => <option key={closer.id} value={closer.id}>{closer.full_name}</option>)}
            </select>
            <button
              type="button"
              onClick={handleResetFilters}
              title="Đặt lại bộ lọc"
              aria-label="Đặt lại bộ lọc"
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50"
            >
              <RotateCw className="h-4 w-4" />
            </button>
          </div>
          <div className="mt-3 flex gap-1 overflow-x-auto border-b border-slate-100 pb-2">
            <span className="flex shrink-0 items-center px-2 text-xs font-bold text-slate-500">Tháng</span>
            <button
              type="button"
              ref={selectedMonth === 'all' ? activeMonthRef : undefined}
              onClick={() => { setSelectedMonth('all'); setSelectedWeek(null); }}
              className={'shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ' + (selectedMonth === 'all' ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-100')}
              aria-pressed={selectedMonth === 'all'}
            >
              Tất cả
            </button>
            {Array.from({ length: 12 }, (_, index) => index + 1).map((month) => (
              <button
                type="button"
                key={month}
                ref={selectedMonth === month ? activeMonthRef : undefined}
                onClick={() => { setSelectedMonth(month); setSelectedWeek(null); }}
                className={'shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ' + (selectedMonth === month ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-100')}
                aria-pressed={selectedMonth === month}
              >
                {month}
              </button>
            ))}
          </div>
          {selectedMonth !== 'all' && <div className="mt-2 flex items-center gap-1.5 overflow-x-auto">
            <CalendarDays className="mr-1 h-4 w-4 shrink-0 text-slate-400" />
            <button
              type="button"
              onClick={() => setSelectedWeek(null)}
              className={'shrink-0 rounded-full px-3 py-1 text-[11px] font-semibold ' + (!selectedWeek ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200')}
            >
              Cả tháng
            </button>
            {weekOptions.map((week) => (
              <button
                type="button"
                key={week}
                onClick={() => setSelectedWeek(week)}
                className={'shrink-0 rounded-full px-3 py-1 text-[11px] font-semibold ' + (selectedWeek === week ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200')}
              >
                {formatWeekLabel(selectedYear, selectedMonth, week)}
              </button>
            ))}
          </div>}
        </div>
      </div>

      <div className="mt-3 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1320px] border-collapse text-left text-xs tabular-nums">
            <thead className="bg-slate-50 text-[11px] font-semibold uppercase tracking-wide text-slate-600">
              <tr className="border-b border-slate-200">
                <th className="w-12 px-3 py-3 text-center">STT</th>
                <th className="min-w-[180px] px-3 py-3">Mã / loại hợp đồng</th>
                <th className="min-w-[150px] px-3 py-3">Đội nhóm</th>
                <th className="whitespace-nowrap px-3 py-3">Ngày ký</th>
                <th className="min-w-[180px] px-3 py-3">Khách hàng &amp; SĐT</th>
                <th className="min-w-[170px] px-3 py-3">Người chốt</th>
                <th className="min-w-[170px] px-3 py-3">Người giới thiệu</th>
                <th className="whitespace-nowrap px-3 py-3 text-right">Giá trị HĐ (VNĐ)</th>
                <th className="whitespace-nowrap px-3 py-3 text-center">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedContracts.length === 0 ? (
                <tr><td colSpan={9} className="px-4 py-12 text-center text-sm text-slate-400">Không tìm thấy hợp đồng trong khoảng thời gian này.</td></tr>
              ) : paginatedContracts.map((contract, index) => (
                <tr
                  key={contract.id}
                  onClick={() => setViewingContract(contract)}
                  onKeyDown={(event) => { if (event.key === 'Enter') setViewingContract(contract); }}
                  tabIndex={0}
                  className="cursor-pointer transition-colors hover:bg-blue-50/50 focus:bg-blue-50/50"
                >
                  <td className="px-3 py-3 text-center text-slate-400">{(currentPage - 1) * pageSize + index + 1}</td>
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-2 whitespace-nowrap">
                      <strong className="text-sm text-blue-700">{contract.contract_code || '—'}</strong>
                      {contract.contract_type && <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600">{contract.contract_type}</span>}
                    </div>
                  </td>
                  <td className="px-3 py-3 font-medium text-slate-600">{contract.team_name?.trim() || '—'}</td>
                  <td className="whitespace-nowrap px-3 py-3 text-slate-600">{formatDate(contract.contract_date)}</td>
                  <td className="px-3 py-3">
                    <strong className="block max-w-[220px] truncate text-[13px] text-slate-800">{contract.customer_name}</strong>
                    <span className="mt-0.5 block text-[11px] text-slate-400">{contract.customer_phone || 'Chưa có SĐT'}</span>
                  </td>
                  <td className="px-3 py-3">
                    <strong className="block max-w-[200px] truncate text-[13px] text-slate-800">{contract.closer_name || '—'}</strong>
                    <span className="mt-0.5 block text-[11px] text-slate-400">{contract.closer_phone || 'Chưa có SĐT'}</span>
                  </td>
                  <td className="px-3 py-3">
                    <strong className="block max-w-[200px] truncate text-[13px] text-slate-800">{contract.referrer_name || '—'}</strong>
                    <span className="mt-0.5 block text-[11px] text-slate-400">{contract.referrer_phone || 'Chưa có SĐT'}</span>
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 text-right font-bold text-slate-900">{formatMoney(contract.value)}</td>
                  <td className="px-3 py-3">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        type="button"
                        onClick={(event) => { event.stopPropagation(); setViewingContract(contract); }}
                        className="inline-flex items-center justify-center rounded-lg bg-blue-600 p-1.5 text-white hover:bg-blue-700"
                        title="Xem chi tiết"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        aria-label="Sửa hợp đồng"
                        title="Sửa"
                        onClick={(event) => { event.stopPropagation(); openEditForm(contract); }}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-amber-50 hover:text-amber-600"
                      ><Pencil className="h-4 w-4" /></button>
                      <button
                        type="button"
                        aria-label="Xóa hợp đồng"
                        title="Xóa"
                        onClick={(event) => { event.stopPropagation(); setDeleteConfirmContract(contract); }}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                      ><Trash2 className="h-4 w-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-3 flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-3 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:px-4">
        <span>Hiển thị {contracts.length ? (currentPage - 1) * pageSize + 1 : 0}–{Math.min(currentPage * pageSize, contracts.length)} trong {contracts.length} hợp đồng</span>
        <div className="flex flex-wrap items-center gap-1.5">
          <button type="button" disabled={currentPage <= 1} onClick={() => setCurrentPage((page) => Math.max(1, page - 1))} className="rounded-lg border border-slate-200 p-1.5 text-slate-600 disabled:opacity-40"><ChevronLeft className="h-4 w-4" /></button>
          <span className="px-2 font-semibold text-slate-700">{currentPage} / {totalPages}</span>
          <button type="button" disabled={currentPage >= totalPages} onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))} className="rounded-lg border border-slate-200 p-1.5 text-slate-600 disabled:opacity-40"><ChevronRight className="h-4 w-4" /></button>
          <select value={pageSize} onChange={(event) => { setPageSize(Number(event.target.value)); setCurrentPage(1); }} className="ml-1 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-700">
            <option value={25}>25 dòng</option><option value={50}>50 dòng</option><option value={100}>100 dòng</option>
          </select>
        </div>
      </div>

      <ContractBudgetSummary
        allocationBase={allocationBase}
        actualFundSpending={actualFundSpending}
        onRefresh={refreshData}
      />

      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-3 backdrop-blur-[2px] sm:p-5">
          <div className="flex max-h-[94vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 sm:px-6">
              <h2 className="text-base font-bold text-slate-900">{editingContract ? 'Sửa hợp đồng' : 'Thêm mới hợp đồng'}</h2>
              <button type="button" onClick={() => setIsFormOpen(false)} aria-label="Đóng form" className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"><X className="h-4 w-4" /></button>
            </div>

            <form onSubmit={handleSubmit} className="flex-1 space-y-4 overflow-y-auto px-5 py-4 sm:px-6">
              {formError && <div className="flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700"><AlertCircle className="h-4 w-4 shrink-0" />{formError}</div>}

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label className="text-xs font-semibold text-slate-700">
                  Mã hợp đồng
                  <input
                    value={formData.contract_code}
                    disabled
                    readOnly
                    tabIndex={-1}
                    className="mt-1.5 w-full rounded-lg border border-slate-200 bg-slate-100 px-3 py-2.5 text-sm font-medium text-slate-500 cursor-not-allowed outline-none select-none"
                    placeholder="Tự động tạo mã"
                  />
                </label>
                <label className="text-xs font-semibold text-slate-700">
                  Loại hợp đồng
                  <select value={formData.contract_type} onChange={(event) => setFormData({ ...formData, contract_type: event.target.value })} className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="">Chọn BĐS</option>
                    {!contractTypes.some((type) => type.value === formData.contract_type) && formData.contract_type && <option value={formData.contract_type}>{formData.contract_type}</option>}
                    {contractTypes.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}
                  </select>
                </label>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label className="text-xs font-semibold text-slate-700">
                  Ngày ký <span className="text-rose-500">*</span>
                  <input type="date" value={formData.contract_date} onChange={(event) => setFormData({ ...formData, contract_date: event.target.value })} required className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-blue-500" />
                </label>
                <label className="text-xs font-semibold text-slate-700">
                  Giá trị hợp đồng (VNĐ) <span className="text-rose-500">*</span>
                  <span className="relative mt-1.5 block">
                    <input type="text" inputMode="numeric" value={valueFormatted} onChange={(event) => {
                      const raw = event.target.value.replace(/\D/g, '');
                      setValueFormatted(cleanNumber(event.target.value));
                      setFormData((current) => ({ ...current, value: Number(raw) || 0 }));
                    }} required className="w-full rounded-lg border border-slate-200 px-3 py-2.5 pr-12 text-sm font-bold text-blue-700 outline-none focus:ring-2 focus:ring-blue-500" placeholder="50.000.000" />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400">đ</span>
                  </span>
                </label>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <label className="text-xs font-semibold text-slate-700">
                  Khách hàng <span className="text-rose-500">*</span>
                  <input value={formData.customer_name} onChange={(event) => setFormData({ ...formData, customer_name: event.target.value })} required className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-blue-500" placeholder="Họ tên khách hàng" />
                </label>
                <label className="text-xs font-semibold text-slate-700">
                  Số điện thoại khách hàng
                  <input type="tel" value={formData.customer_phone} onChange={(event) => setFormData({ ...formData, customer_phone: event.target.value })} className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-blue-500" placeholder="Số điện thoại" />
                </label>
                <label className="text-xs font-semibold text-slate-700">
                  Địa chỉ khách hàng
                  <input value={formData.customer_address} onChange={(event) => setFormData({ ...formData, customer_address: event.target.value })} className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-blue-500" placeholder="Địa chỉ" />
                </label>
              </div>

              <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
                {memberSelect('closer', 'Người chốt', formData.closer_name, formData.closer_phone, formData.closer_id)}
                {memberSelect('referrer', 'Người giới thiệu F1', formData.referrer_name, formData.referrer_phone, formData.referrer_id)}
                {memberSelect('supporter', 'Người hỗ trợ sale', formData.supporter_name, formData.supporter_phone, formData.supporter_id)}
              </div>

              <div className="grid grid-cols-1 gap-3">
                <label className="text-xs font-semibold text-slate-700">
                  Đội nhóm
                  <span className="mt-1.5 flex gap-2">
                    <select value={formData.team_name} onChange={(event) => setFormData({ ...formData, team_name: event.target.value })} className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-blue-500">
                      <option value="">Chọn đội nhóm</option>
                      {CONTRACT_TEAM_OPTIONS.map((team) => <option key={team} value={team}>{team}</option>)}
                      {teams.filter((team) => !(CONTRACT_TEAM_OPTIONS as readonly string[]).includes(team.name)).map((team) => <option key={team.id} value={team.name}>{team.name}</option>)}
                      {formData.team_name && !teams.some((team) => team.name === formData.team_name) && !(CONTRACT_TEAM_OPTIONS as readonly string[]).includes(formData.team_name) && <option value={formData.team_name}>{formData.team_name}</option>}
                    </select>
                    <button type="button" onClick={() => openQuickAdd('team')} aria-label="Thêm đội nhóm" title="Thêm đội nhóm" className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100"><Plus className="h-4 w-4" /></button>
                  </span>
                </label>
              </div>

              <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
                <button type="button" onClick={() => setIsFormOpen(false)} className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50">Hủy</button>
                <button type="submit" disabled={isSubmitting} className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50">{isSubmitting ? 'Đang lưu...' : 'Lưu hợp đồng'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {quickAddKind && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/55 p-4">
          <form onSubmit={submitQuickAdd} className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900">{quickAddKind === 'team' ? 'Thêm đội nhóm' : 'Thêm thành viên nhanh'}</h3>
              <button type="button" onClick={() => setQuickAddKind(null)} aria-label="Đóng" className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"><X className="h-4 w-4" /></button>
            </div>
            {quickAddError && <p className="mb-3 rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700">{quickAddError}</p>}
            <label className="block text-xs font-semibold text-slate-700">
              {quickAddKind === 'team' ? 'Tên đội nhóm' : 'Họ tên'}
              <input autoFocus value={quickAddName} onChange={(event) => setQuickAddName(event.target.value)} required className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500" />
            </label>
            {quickAddKind === 'member' && (
              <label className="mt-3 block text-xs font-semibold text-slate-700">
                Số điện thoại
                <input type="tel" value={quickAddPhone} onChange={(event) => setQuickAddPhone(event.target.value)} required className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500" />
              </label>
            )}
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={() => setQuickAddKind(null)} className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-600">Hủy</button>
              <button type="submit" disabled={isQuickAdding} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{isQuickAdding ? 'Đang tạo...' : 'Tạo và chọn'}</button>
            </div>
          </form>
        </div>
      )}

      {viewingContract && (
        <>
          <style>{'@media print { body * { visibility: hidden !important; } #contract-detail-print, #contract-detail-print * { visibility: visible !important; } #contract-detail-print { position: fixed !important; inset: 0 !important; width: 100% !important; max-width: none !important; max-height: none !important; overflow: visible !important; border: 0 !important; box-shadow: none !important; } .contract-print-hide { display: none !important; } }'}</style>
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-3 backdrop-blur-[2px] sm:p-5">
            <div id="contract-detail-print" className="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-2xl">
              <div className="contract-print-hide flex items-center justify-between border-b border-slate-100 px-5 py-4 sm:px-6">
                <div>
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-blue-600">Chi tiết hợp đồng</span>
                  <h2 className="mt-1 text-lg font-bold text-slate-900">{viewingContract.contract_code || 'Hợp đồng'}</h2>
                </div>
                <button type="button" onClick={() => setViewingContract(null)} aria-label="Đóng Pop-up" className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"><X className="h-4 w-4" /></button>
              </div>
              <div className="flex-1 space-y-4 overflow-y-auto p-5 sm:p-6">
                <div className="grid grid-cols-2 gap-3 rounded-xl border border-slate-100 bg-slate-50 p-4 text-xs sm:grid-cols-3">
                  <div><span className="block text-slate-400">Loại hợp đồng</span><strong className="mt-1 block text-slate-800">{viewingContract.contract_type || '—'}</strong></div>
                  <div><span className="block text-slate-400">Khách hàng</span><strong className="mt-1 block text-slate-800">{viewingContract.customer_name}</strong></div>
                  <div><span className="block text-slate-400">SĐT khách hàng</span><strong className="mt-1 block text-slate-800">{viewingContract.customer_phone || '—'}</strong></div>
                  <div><span className="block text-slate-400">Địa chỉ</span><strong className="mt-1 block text-slate-800">{viewingContract.customer_address || '—'}</strong></div>
                  <div><span className="block text-slate-400">Ngày ký</span><strong className="mt-1 block text-slate-800">{formatDate(viewingContract.contract_date)}</strong></div>
                  <div><span className="block text-slate-400">Giá trị hợp đồng</span><strong className="mt-1 block text-blue-700">{formatMoney(viewingContract.value)}</strong></div>
                  <div><span className="block text-slate-400">Đội nhóm</span><strong className="mt-1 block text-slate-800">{viewingContract.team_name?.trim() || '—'}</strong></div>
                  <div><span className="block text-slate-400">Thù lao Người chốt (6%)</span><strong className="mt-1 block text-blue-700">{formatMoney(viewingContract.closer_fee)}</strong></div>
                  <div><span className="block text-slate-400">Thù lao Người giới thiệu (1%)</span><strong className="mt-1 block text-emerald-700">{formatMoney(viewingContract.referrer_fee)}</strong></div>
                  <div><span className="block text-slate-400">Thù lao Người hỗ trợ (0,5%)</span><strong className="mt-1 block text-amber-700">{formatMoney(viewingContract.supporter_fee)}</strong></div>
                  <div><span className="block text-slate-400">Trạng thái</span><strong className="mt-1 block"><span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-bold ${viewingContract.status === 'Đã duyệt' ? 'bg-emerald-50 text-emerald-700' : viewingContract.status === 'Từ chối' ? 'bg-rose-50 text-rose-700' : 'bg-amber-50 text-amber-700'}`}>{viewingContract.status || 'Chờ duyệt'}</span></strong></div>
                </div>
                <div>
                  <h3 className="mb-2 text-sm font-bold text-slate-800">Người tham gia hợp đồng</h3>
                  <div className="overflow-x-auto rounded-xl border border-slate-200">
                    <table className="w-full min-w-[440px] border-collapse text-left text-xs">
                      <thead className="bg-slate-50 text-[11px] font-semibold text-slate-600">
                        <tr><th className="px-3 py-3">Vai trò</th><th className="px-3 py-3">Họ tên</th><th className="px-3 py-3">SĐT</th></tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {detailRows.map((row) => (
                          <tr key={row.role}>
                            <td className="whitespace-nowrap px-3 py-3 font-medium text-slate-700">{row.role}</td>
                            <td className="px-3 py-3 font-semibold text-slate-900">{row.name}</td>
                            <td className="whitespace-nowrap px-3 py-3 text-slate-600">{row.phone}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
              <div className="contract-print-hide flex flex-col-reverse gap-2 border-t border-slate-100 bg-slate-50 px-5 py-4 sm:flex-row sm:justify-end sm:px-6">
                <button type="button" onClick={() => setViewingContract(null)} className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100">Đóng Pop-up</button>
                <Link
                  href={`/admin/nhat-ky-thu-chi?search=${encodeURIComponent(viewingContract.contract_code || viewingContract.customer_name)}`}
                  className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-purple-200 bg-purple-50 px-4 py-2 text-xs font-semibold text-purple-700 hover:bg-purple-100"
                >
                  <Receipt className="h-4 w-4" /> Xem Thu Chi & Hoa hồng
                </Link>
                <button type="button" onClick={exportContractDetail} className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-4 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-100"><DownloadIcon /> Xuất Excel chi tiết</button>
                <button type="button" onClick={() => window.print()} className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700"><Printer className="h-4 w-4" /> In Phiếu này</button>
              </div>
            </div>
          </div>
        </>
      )}

      {deleteConfirmContract && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/55 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 text-center shadow-2xl">
            <span className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-rose-50 text-rose-600"><Trash2 className="h-5 w-5" /></span>
            <h3 className="font-bold text-slate-900">Xác nhận xóa hợp đồng</h3>
            <p className="mt-2 text-xs text-slate-500">Xóa hợp đồng <strong className="text-slate-800">{deleteConfirmContract.contract_code}</strong>? Thao tác này không thể hoàn tác.</p>
            <div className="mt-5 flex justify-center gap-2">
              <button type="button" onClick={() => setDeleteConfirmContract(null)} className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-600">Hủy</button>
              <button type="button" onClick={handleDelete} className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700">Xóa</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function DownloadIcon() {
  return <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 3v12m0 0 4-4m-4 4-4-4M4 17v3h16v-3" /></svg>;
}
