'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  BarChart3,
  Check,
  ChevronDown,
  Clock,
  Copy,
  Download,
  FileSpreadsheet,
  LockKeyhole,
  Plus,
  Printer,
  Receipt,
  Save,
  Search,
  ShieldCheck,
  Users,
  Wallet,
  X,
} from 'lucide-react';

type Tab = 'roster' | 'allocation' | 'reports';
type TeamOption = { id: number; name: string };
type TeamAssignment = {
  memberTeamId: number;
  teamId: number;
  teamName: string;
  role: string;
  include70Default: boolean;
  include70: boolean;
};
type RosterMember = {
  membershipId: number | null;
  userId: number | null;
  name: string;
  phone: string;
  title?: string | null;
  include30: boolean;
  teams: TeamAssignment[];
};
type RosterUser = { id: number; name: string; phone: string; team_name?: string | null; title?: string | null };
type AllocationRow = {
  membershipId: number | null;
  memberId: number | null;
  memberTeamId: number | null;
  memberName: string;
  memberPhone: string;
  teamId: number | null;
  teamName: string;
  role: string;
  eligible30: boolean;
  eligible70: boolean;
  salesBasis: number;
  payout30: number;
  payout70: number;
  total: number;
};
type Allocation = {
  rows: AllocationRow[];
  meta: {
    totalSales: number;
    fundRate: number;
    grossFund: number;
    fund30: number;
    fund70: number;
    paid30: number;
    paid70: number;
    locked: boolean;
    imported: boolean;
    lockedAt: string | null;
    sourceFile: string | null;
  };
};
type Contract = {
  id: number;
  contract_code: string | null;
  customer_name: string;
  contract_date: string;
  value: number;
  team_name: string;
  contract_type: string;
  weekNo: number;
};
type Breakdown = {
  contract: { id: number; contractCode: string; customerName: string; contractDate: string; value: number; teamName: string; weekNo: number };
  fundRate: number;
  allocations70: Array<{ memberName: string; memberPhone: string; teamName: string; role: string; payout: number }>;
  allocations30: Array<{ memberName: string; memberPhone: string; payout: number }>;
};

const ROLE_OPTIONS = ['Giám đốc', 'Phó Giám đốc', 'Trưởng phòng'];
const ROLE_WEIGHTS: Record<string, string> = { 'Giám đốc': '50%', 'Phó Giám đốc': '30%', 'Trưởng phòng': '20%' };
const TEAMLEAD_TITLES = new Set(['Giám đốc', 'Phó Giám đốc', 'Trưởng phòng', 'Chủ tịch']);
const MONTH_OPTIONS = Array.from({ length: 12 }, (_, index) => index + 1);
const TAB_LINKS: Array<{ id: Tab; label: string; href: string; icon: typeof Users }> = [
  { id: 'roster', label: 'Danh sách TeamLead', href: '/admin/teamlead', icon: Users },
  { id: 'allocation', label: 'Phân bổ quỹ', href: '/admin/teamlead/phan-bo', icon: Wallet },
  { id: 'reports', label: 'Nhật ký & báo cáo', href: '/admin/teamlead/bao-cao', icon: BarChart3 },
];

function currentMonthValue() {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
  }).formatToParts(new Date());
  const year = parts.find((part) => part.type === 'year')?.value;
  const month = parts.find((part) => part.type === 'month')?.value;
  return year && month ? `${year}-${month}` : new Date().toISOString().slice(0, 7);
}

function weekCountForMonth(value: string) {
  const [year, monthNumber] = value.split('-').map(Number);
  return Math.ceil(new Date(year, monthNumber, 0).getDate() / 7);
}

function money(value: number) {
  return new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 0 }).format(Number(value) || 0) + ' ₫';
}

function shortDate(value: string) {
  if (!value) return '—';
  const date = new Date(`${value.slice(0, 10)}T00:00:00`);
  return new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(date);
}

function monthTitle(month: string) {
  const [year, number] = month.split('-').map(Number);
  return `Tháng ${number}/${year}`;
}

function hasTeamLeadTitle(title: string | null | undefined) {
  return TEAMLEAD_TITLES.has(title?.trim() || '');
}

function statusText(locked: boolean, imported: boolean) {
  if (imported) return 'Đã nhập từ Excel';
  if (locked) return 'Đã khóa';
  return 'Chưa chốt';
}

export default function TeamLeadModule({ activeTab, initialMonth, initialWeekNo }: { activeTab: Tab; initialMonth?: string; initialWeekNo?: number }) {
  const defaultMonth = initialMonth && /^\d{4}-\d{2}$/.test(initialMonth) ? initialMonth : currentMonthValue();
  const [month, setMonth] = useState(defaultMonth);
  const [weekNo, setWeekNo] = useState(() => initialWeekNo && initialWeekNo >= 1 && initialWeekNo <= 5 ? Math.min(initialWeekNo, weekCountForMonth(defaultMonth)) : 1);
  const [roster, setRoster] = useState<RosterMember[]>([]);
  const [users, setUsers] = useState<RosterUser[]>([]);
  const [teams, setTeams] = useState<TeamOption[]>([]);
  const [periods, setPeriods] = useState<Array<{ weekNo: number; locked: boolean; imported: boolean }>>([]);
  const [allocation, setAllocation] = useState<Allocation | null>(null);
  const [ratePercent, setRatePercent] = useState('2.9');
  const [reportWeekNo, setReportWeekNo] = useState(0);
  const [teamFilter, setTeamFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [reportContracts, setReportContracts] = useState<Contract[]>([]);
  const [selectedContract, setSelectedContract] = useState<number | null>(null);
  const [breakdown, setBreakdown] = useState<Breakdown | null>(null);
  const [addMemberId, setAddMemberId] = useState('');
  const [addTeamIds, setAddTeamIds] = useState<number[]>([]);
  const [addRole, setAddRole] = useState('');
  const [addInclude30, setAddInclude30] = useState(true);
  const [addInclude70, setAddInclude70] = useState(true);
  const [newTeamName, setNewTeamName] = useState('');
  const [showAddMember, setShowAddMember] = useState(false);
  const [confirmLock, setConfirmLock] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const autoCloneAttempted = useRef(new Set<string>());

  useEffect(() => {
    if (initialMonth && /^\d{4}-\d{2}$/.test(initialMonth)) setMonth(initialMonth);
    if (initialWeekNo && initialWeekNo >= 1 && initialWeekNo <= 5) {
      const periodMonth = initialMonth && /^\d{4}-\d{2}$/.test(initialMonth) ? initialMonth : defaultMonth;
      setWeekNo(Math.min(initialWeekNo, weekCountForMonth(periodMonth)));
    }
  }, [defaultMonth, initialMonth, initialWeekNo]);

  const selectedWeekLocked = periods.find((period) => period.weekNo === weekNo)?.locked || false;
  const selectedYear = Number(month.slice(0, 4));
  const selectedMonthNumber = Number(month.slice(5, 7));
  const weekOptions = Array.from({ length: weekCountForMonth(month) }, (_, index) => index + 1);
  const maximumYear = Math.max(new Date().getFullYear() + 1, selectedYear);
  const yearOptions = Array.from({ length: maximumYear - 1999 }, (_, index) => maximumYear - index);

  const updateMonthFilter = (year: number, monthNumber: number) => {
    const nextMonth = `${year}-${String(monthNumber).padStart(2, '0')}`;
    const nextWeekCount = weekCountForMonth(nextMonth);
    setMonth(nextMonth);
    setWeekNo((previous) => Math.min(previous, nextWeekCount));
    setReportWeekNo((previous) => previous === 0 ? 0 : Math.min(previous, nextWeekCount));
    setSelectedContract(null);
    setBreakdown(null);
  };

  const loadRoster = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`/api/admin/teamlead?month=${month}&week=${weekNo}`, { cache: 'no-store' });
      let data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || 'Không thể tải dữ liệu TeamLead.');
      if (!data.roster?.length && !autoCloneAttempted.current.has(month)) {
        autoCloneAttempted.current.add(month);
        const cloneResponse = await fetch('/api/admin/teamlead', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'clone-month', month }),
        });
        const cloneData = await cloneResponse.json();
        if (cloneResponse.ok && cloneData.success) {
          const refreshed = await fetch(`/api/admin/teamlead?month=${month}&week=${weekNo}`, { cache: 'no-store' });
          const refreshedData = await refreshed.json();
          if (refreshed.ok && refreshedData.success) data = refreshedData;
        }
      }
      setRoster(data.roster || []);
      setUsers(data.users || []);
      setTeams(data.teams || []);
      setPeriods(data.periods || []);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Không thể tải dữ liệu TeamLead.');
    } finally {
      setLoading(false);
    }
  }, [month, weekNo]);

  const loadAllocation = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const rate = Number(ratePercent) / 100;
      const [response, teamsResponse] = await Promise.all([
        fetch(`/api/admin/teamlead/allocation?month=${month}&week=${weekNo}&rate=${rate}`, { cache: 'no-store' }),
        fetch('/api/admin/teamlead/teams', { cache: 'no-store' }),
      ]);
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || 'Không thể tính phân bổ quỹ.');
      setAllocation(data);
      const teamsData = await teamsResponse.json();
      if (teamsResponse.ok && teamsData.success) setTeams(teamsData.teams || []);
      if (data.meta?.fundRate !== undefined && !data.meta.locked) {
        const nextRate = (Number(data.meta.fundRate) * 100).toString();
        setRatePercent((previous) => (Number(previous) === Number(nextRate) ? previous : nextRate));
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Không thể tính phân bổ quỹ.');
    } finally {
      setLoading(false);
    }
  }, [month, weekNo, ratePercent]);

  const loadReports = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`/api/admin/teamlead/reports?month=${month}`, { cache: 'no-store' });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || 'Không thể tải báo cáo.');
      setReportContracts(data.contracts || []);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Không thể tải báo cáo.');
    } finally {
      setLoading(false);
    }
  }, [month]);

  useEffect(() => {
    setNotice('');
    if (activeTab === 'roster') void loadRoster();
    if (activeTab === 'allocation') void loadAllocation();
    if (activeTab === 'reports') void loadReports();
  }, [activeTab, loadAllocation, loadReports, loadRoster]);

  const visibleRoster = useMemo(() => roster.filter((member) => hasTeamLeadTitle(member.title)), [roster]);

  const filteredRoster = useMemo(() => {
    const term = search.trim().toLocaleLowerCase('vi-VN');
    return visibleRoster.filter((member) => !term || `${member.name} ${member.phone}`.toLocaleLowerCase('vi-VN').includes(term));
  }, [visibleRoster, search]);

  const filteredAllocationRows = useMemo(() => {
    const term = search.trim().toLocaleLowerCase('vi-VN');
    return (allocation?.rows || []).filter((row) => {
      const teamMatches = teamFilter === 'all' || String(row.teamId || '') === teamFilter;
      const searchMatches = !term || `${row.memberName} ${row.memberPhone} ${row.teamName}`.toLocaleLowerCase('vi-VN').includes(term);
      return teamMatches && searchMatches;
    });
  }, [allocation, search, teamFilter]);

  const filteredContracts = useMemo(() => reportContracts.filter((contract) => reportWeekNo === 0 || contract.weekNo === reportWeekNo), [reportContracts, reportWeekNo]);

  const addSelectedMember = () => {
    const userId = Number(addMemberId);
    const user = users.find((item) => item.id === userId);
    if (!user || roster.some((member) => member.userId === user.id)) return;
    setRoster((previous) => [...previous, {
      membershipId: null,
      userId: user.id,
      name: user.name,
      phone: user.phone,
      title: user.title,
      include30: addInclude30,
      teams: teams.filter((team) => addTeamIds.includes(team.id)).map((team) => ({
        memberTeamId: 0,
        teamId: team.id,
        teamName: team.name,
        role: addRole,
        include70Default: addInclude70,
        include70: addInclude70,
      })),
    }]);
    setAddMemberId('');
    setAddTeamIds([]);
    setShowAddMember(false);
  };

  const updateRosterMember = (membershipId: number | null, userId: number | null, update: Partial<RosterMember>) => {
    setRoster((previous) => previous.map((member) => member.membershipId === membershipId && member.userId === userId ? { ...member, ...update } : member));
  };

  const updateMemberTeams = (member: RosterMember, selectedIds: number[]) => {
    const previousByTeam = new Map(member.teams.map((team) => [team.teamId, team]));
    const defaultRole = member.teams[0]?.role || 'Trưởng phòng';
    const teamsForMember = teams.filter((team) => selectedIds.includes(team.id)).map((team) => {
      const previous = previousByTeam.get(team.id);
      return previous || {
        memberTeamId: 0,
        teamId: team.id,
        teamName: team.name,
        role: defaultRole,
        include70Default: true,
        include70: true,
      };
    });
    updateRosterMember(member.membershipId, member.userId, { teams: teamsForMember });
  };

  const updateRole = (member: RosterMember, role: string) => {
    updateRosterMember(member.membershipId, member.userId, { teams: member.teams.map((team) => ({ ...team, role })) });
  };

  const createTeam = async () => {
    const name = newTeamName.trim();
    if (!name) return;
    setSaving(true);
    setError('');
    try {
      const response = await fetch('/api/admin/teamlead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create-team', name }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || 'Không thể thêm đội nhóm.');
      setNewTeamName('');
      setNotice(`Đã thêm đội nhóm “${data.team.name}”.`);
      await loadRoster();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Không thể thêm đội nhóm.');
    } finally {
      setSaving(false);
    }
  };

  const clonePreviousMonth = async () => {
    setSaving(true);
    setError('');
    try {
      const response = await fetch('/api/admin/teamlead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'clone-month', month }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || 'Không thể kế thừa danh sách.');
      setNotice(`Đã kế thừa ${data.copiedMembers} thành viên từ tháng trước.`);
      await loadRoster();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Không thể kế thừa danh sách.');
    } finally {
      setSaving(false);
    }
  };

  const saveRoster = async () => {
    setSaving(true);
    setError('');
    try {
      const response = await fetch('/api/admin/teamlead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'save-roster',
          month,
          weekNo,
          roster: roster.map((member) => ({
            membershipId: member.membershipId,
            userId: member.userId,
            include30: member.include30,
            teams: member.teams.map((team) => ({
              teamId: team.teamId,
              role: team.role,
              include70Default: team.include70Default,
              eligible70: team.include70,
            })),
          })),
        }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || 'Không thể lưu danh sách.');
      setNotice(`Đã lưu danh sách ${monthTitle(month)}.`);
      await loadRoster();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Không thể lưu danh sách.');
    } finally {
      setSaving(false);
    }
  };

  const loadContractBreakdown = async (contractId: number) => {
    setSelectedContract(contractId);
    setBreakdown(null);
    try {
      const response = await fetch(`/api/admin/teamlead/reports?month=${month}&contract_id=${contractId}`, { cache: 'no-store' });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || 'Không thể tải phân bổ hợp đồng.');
      setBreakdown(data.breakdown);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Không thể tải phân bổ hợp đồng.');
    }
  };

  const lockPeriod = async () => {
    setSaving(true);
    setError('');
    try {
      const response = await fetch('/api/admin/teamlead/allocation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ month, weekNo, fundRate: Number(ratePercent) / 100 }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || 'Không thể chốt dữ liệu.');
      setAllocation(data);
      setConfirmLock(false);
      setNotice(`${weekNo ? `Tuần ${weekNo}` : 'Tháng'} đã được chốt và chuyển sang chỉ đọc.`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Không thể chốt dữ liệu.');
    } finally {
      setSaving(false);
    }
  };

  const rosterLocked = periods.some((period) => period.weekNo === 0 && period.locked);
  const rosterReadOnly = rosterLocked || selectedWeekLocked;
  const existingUserIds = new Set(roster.map((member) => member.userId).filter(Boolean));
  const availableUsers = users.filter((user) => hasTeamLeadTitle(user.title) && !existingUserIds.has(user.id));
  const title = activeTab === 'roster' ? 'Danh sách TeamLead theo tháng' : activeTab === 'allocation' ? 'Phân bổ quỹ TeamLead' : 'Nhật ký & báo cáo TeamLead';
  const subtitle = activeTab === 'roster'
    ? 'Chốt thành viên, đội nhóm, chức danh và quyền hưởng quỹ cho từng tháng.'
    : activeTab === 'allocation'
      ? 'Theo dõi doanh số theo đội, quỹ 30% tháng và khoản 70% quyết toán theo tuần.'
      : 'Tra cứu hợp đồng và xem các khoản phân bổ theo đội nhóm, chức danh và kỳ.';

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-5 text-slate-900 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1600px] space-y-5">
        <header className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-blue-600">
                <ShieldCheck className="h-4 w-4" /> Quản lý quỹ & đội nhóm
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">{title}</h1>
              <p className="mt-1 max-w-3xl text-sm text-slate-500">{subtitle}</p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              {activeTab === 'roster' && !rosterReadOnly && (
                <button onClick={() => setShowAddMember(true)} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700">
                  <Plus className="h-4 w-4" /> Thêm thủ lĩnh
                </button>
              )}
              {activeTab === 'allocation' && (
                <>
                  <a href={`/api/admin/teamlead/export?month=${month}&week=${weekNo}`} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50">
                    <Download className="h-4 w-4 text-emerald-600" /> Xuất Excel
                  </a>
                  <button onClick={() => window.print()} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 print:hidden">
                    <Printer className="h-4 w-4" /> In bảng
                  </button>
                  {!allocation?.meta.locked && (
                    <button onClick={() => setConfirmLock(true)} className="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-amber-600">
                      <LockKeyhole className="h-4 w-4" /> Chốt {weekNo ? `tuần ${weekNo}` : 'tháng'}
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
          <div className="mt-5 overflow-x-auto border-t border-slate-100 pt-4">
            <div className="flex w-max min-w-full flex-nowrap items-center gap-3">
              <label className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-600">
                <span>Năm</span>
                <select value={selectedYear} onChange={(event) => updateMonthFilter(Number(event.target.value), selectedMonthNumber)} aria-label="Lọc theo năm" className="min-w-24 bg-transparent text-sm font-semibold text-slate-800 outline-none">
                  {yearOptions.map((year) => <option key={year} value={year}>{year}</option>)}
                </select>
              </label>
              <div className="flex shrink-0 items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Tháng</span>
                <div role="group" aria-label="Lọc theo tháng" className="inline-flex overflow-hidden rounded-xl border border-slate-200 bg-white">
                  {MONTH_OPTIONS.map((monthNumber) => (
                    <button
                      key={monthNumber}
                      type="button"
                      aria-label={`Tháng ${monthNumber}`}
                      aria-pressed={selectedMonthNumber === monthNumber}
                      onClick={() => updateMonthFilter(selectedYear, monthNumber)}
                      className={`h-10 min-w-9 border-r border-slate-200 px-2.5 text-sm font-semibold last:border-r-0 ${selectedMonthNumber === monthNumber ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-50'}`}
                    >
                      {monthNumber}
                    </button>
                  ))}
                </div>
              </div>
              {activeTab === 'roster' && (
                <div className="flex shrink-0 items-center gap-2">
                  <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Tuần</span>
                  <div role="group" aria-label="Chọn tuần cần cấu hình" className="inline-flex overflow-hidden rounded-lg border border-slate-200 bg-white">
                    {weekOptions.map((week) => (
                      <button key={week} type="button" aria-pressed={weekNo === week} onClick={() => setWeekNo(week)} className={`min-w-10 border-r border-slate-200 px-3 py-2 text-sm font-semibold last:border-r-0 ${weekNo === week ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-50'}`}>
                        {week}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {activeTab === 'allocation' && (
                <div className="flex shrink-0 items-center gap-2">
                  <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Tuần</span>
                  <div role="group" aria-label="Chọn tuần xem" className="inline-flex overflow-hidden rounded-lg border border-slate-200 bg-white">
                    {weekOptions.map((week) => ({ value: week, label: String(week) })).map((option) => (
                      <button key={option.value} type="button" aria-pressed={weekNo === option.value} onClick={() => setWeekNo(option.value)} className={`border-r border-slate-200 px-3 py-2 text-sm font-semibold last:border-r-0 ${weekNo === option.value ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-50'}`}>
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {activeTab === 'reports' && (
                <div className="flex shrink-0 items-center gap-2">
                  <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Tuần</span>
                  <div role="group" aria-label="Lọc hợp đồng theo tuần" className="inline-flex overflow-hidden rounded-lg border border-slate-200 bg-white">
                    {[{ value: 0, label: 'Tất cả' }, ...weekOptions.map((week) => ({ value: week, label: String(week) }))].map((option) => (
                      <button key={option.value} type="button" aria-pressed={reportWeekNo === option.value} onClick={() => { setReportWeekNo(option.value); if (option.value > 0) setWeekNo(option.value); }} className={`border-r border-slate-200 px-3 py-2 text-sm font-semibold last:border-r-0 ${reportWeekNo === option.value ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-50'}`}>
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
          <nav className="mt-4 flex gap-2 overflow-x-auto border-t border-slate-100 pt-4">
            {TAB_LINKS.map((tab) => {
              const Icon = tab.icon;
              return (
                <Link key={tab.id} href={`${tab.href}?month=${month}&week=${weekNo}`} className={`inline-flex shrink-0 items-center gap-2 rounded-xl px-3.5 py-2.5 text-sm font-semibold transition ${activeTab === tab.id ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'}`}>
                  <Icon className="h-4 w-4" /> {tab.label}
                </Link>
              );
            })}
          </nav>
        </header>

        {(error || notice) && (
          <div className={`flex items-start justify-between gap-3 rounded-xl border px-4 py-3 text-sm ${error ? 'border-rose-200 bg-rose-50 text-rose-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700'}`}>
            <span>{error || notice}</span>
            <button onClick={() => { setError(''); setNotice(''); }} aria-label="Đóng thông báo"><X className="h-4 w-4" /></button>
          </div>
        )}

        {activeTab === 'roster' && (
          <>
            <section className="grid gap-4 lg:grid-cols-[1fr_auto]">
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
                <h2 className="text-base font-bold text-slate-900">Danh sách chức danh và quyền hưởng quỹ</h2>
                <p className="mt-1 text-sm text-slate-500">Chức danh lưu theo tháng. Quyền 70% có thể thay đổi theo tuần; quyền 30% chốt theo tháng.</p>
                <div className="mt-4 flex flex-wrap gap-2 text-xs">
                  <span className="rounded-lg bg-blue-50 px-3 py-2 font-medium text-blue-800">Giám đốc 50%</span>
                  <span className="rounded-lg bg-violet-50 px-3 py-2 font-medium text-violet-800">Phó Giám đốc 30%</span>
                  <span className="rounded-lg bg-amber-50 px-3 py-2 font-medium text-amber-800">Trưởng phòng 20%</span>
                  {selectedWeekLocked && <span className="inline-flex items-center gap-1 rounded-lg bg-rose-50 px-3 py-2 font-semibold text-rose-700"><LockKeyhole className="h-3.5 w-3.5" /> Tuần {weekNo} đã khóa</span>}
                </div>
              </div>
              <div className="flex items-end gap-2 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <label className="min-w-48">
                  <span className="mb-1.5 block text-xs font-semibold text-slate-500">Thêm đội nhóm dùng chung</span>
                  <input value={newTeamName} onChange={(event) => setNewTeamName(event.target.value)} placeholder="VD: Ong Vàng" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500" />
                </label>
                <button onClick={createTeam} disabled={saving || !newTeamName.trim()} className="mb-px inline-flex h-10 items-center gap-1.5 rounded-lg bg-slate-900 px-3 text-sm font-semibold text-white disabled:opacity-50"><Plus className="h-4 w-4" /> Thêm</button>
              </div>
            </section>

            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="font-bold text-slate-900">{monthTitle(month)}</h2>
                  <p className="mt-0.5 text-xs text-slate-500">{visibleRoster.length} thành viên · {teams.length} đội nhóm</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                    <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Tìm tên hoặc số điện thoại" className="w-64 rounded-lg border border-slate-200 py-2 pl-9 pr-3 text-sm outline-none focus:border-blue-500" />
                  </div>
                  {roster.length === 0 && !rosterReadOnly && (
                    <button onClick={clonePreviousMonth} disabled={saving} className="inline-flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-700 disabled:opacity-50"><Copy className="h-4 w-4" /> Kế thừa tháng trước</button>
                  )}
                  <button onClick={saveRoster} disabled={saving || rosterReadOnly} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3.5 py-2 text-sm font-semibold text-white shadow-sm disabled:cursor-not-allowed disabled:opacity-50"><Save className="h-4 w-4" /> {saving ? 'Đang lưu…' : 'Lưu danh sách'}</button>
                </div>
              </div>
              {loading ? <div className="p-12 text-center text-sm text-slate-500">Đang tải dữ liệu…</div> : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[900px] text-left text-sm">
                    <thead className="bg-slate-900 text-xs uppercase tracking-wide text-slate-300">
                      <tr>
                        <th className="px-4 py-3.5">Thành viên</th>
                        <th className="px-4 py-3.5">Đội nhóm</th>
                        <th className="px-4 py-3.5">Chức danh</th>
                        <th className="px-4 py-3.5 text-right">Thao tác</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredRoster.map((member, index) => {
                        const role = member.teams[0]?.role || '';
                        const isNearBottom = index >= Math.max(0, filteredRoster.length - 3);
                        return (
                          <tr key={`${member.membershipId}-${member.userId}`} className="align-middle hover:bg-slate-50/70">
                            <td className="px-4 py-4">
                              <div className="font-semibold text-slate-900">{member.name}</div>
                              <div className="mt-1 text-xs text-slate-500">{member.phone || 'Chưa có số điện thoại'}</div>
                              {!member.userId && <span className="mt-1 inline-block rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-500">Dữ liệu nhập Excel</span>}
                            </td>
                            <td className="px-4 py-3.5">
                              <TeamSelectCell
                                member={member}
                                teams={teams}
                                rosterReadOnly={rosterReadOnly}
                                updateMemberTeams={updateMemberTeams}
                                isNearBottom={isNearBottom}
                              />
                            </td>
                            <td className="px-4 py-4">
                              <select value={role} onChange={(event) => updateRole(member, event.target.value)} disabled={!member.teams.length || rosterReadOnly} className="w-44 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 outline-none focus:border-blue-500 disabled:bg-slate-100">
                                {!role && <option value="">Chưa gán chức danh</option>}
                                {ROLE_OPTIONS.map((item) => <option key={item} value={item}>{item} ({ROLE_WEIGHTS[item]})</option>)}
                              </select>
                            </td>
                            <td className="px-4 py-4 text-right">
                              {!rosterReadOnly && <button onClick={() => setRoster((previous) => previous.filter((item) => item !== member))} className="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50">Xóa</button>}
                            </td>
                          </tr>
                        );
                      })}
                      {!filteredRoster.length && <tr><td colSpan={4} className="px-4 py-14 text-center text-sm text-slate-500">{visibleRoster.length ? 'Không có thành viên phù hợp.' : roster.length ? 'Chưa có thành viên thuộc chức danh TeamLead trong tháng này.' : 'Tháng này chưa có danh sách. Thêm thành viên hoặc kế thừa tháng trước để bắt đầu.'}</td></tr>}
                    </tbody>
                  </table>
                </div>
              )}
              {rosterLocked && <div className="flex items-center gap-2 border-t border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800"><LockKeyhole className="h-4 w-4" /> Danh sách và quyền hưởng quỹ tháng này đã được chốt.</div>}
            </section>
          </>
        )}

        {activeTab === 'allocation' && (
          <>
            <section className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm lg:flex-row lg:items-end lg:justify-between">
              <div className="flex flex-wrap items-end gap-3">
                <label className="text-sm font-semibold text-slate-600">Đội nhóm
                  <select value={teamFilter} onChange={(event) => setTeamFilter(event.target.value)} className="mt-1.5 block min-w-48 rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-blue-500">
                    <option value="all">Tất cả đội nhóm</option>
                    {teams.map((team) => <option key={team.id} value={String(team.id)}>{team.name}</option>)}
                  </select>
                </label>
                <label className="text-sm font-semibold text-slate-600">Tỷ lệ nguồn quỹ
                  <span className="mt-1.5 flex items-center rounded-lg border border-slate-200 bg-white px-3 focus-within:border-blue-500"><input type="number" min="0" max="100" step="0.01" value={ratePercent} onChange={(event) => setRatePercent(event.target.value)} disabled={allocation?.meta.locked} className="w-20 py-2.5 text-sm text-slate-800 outline-none disabled:bg-slate-100" /><span className="text-sm text-slate-400">%</span></span>
                </label>
                <button onClick={loadAllocation} disabled={loading} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"><Search className="h-4 w-4" /> Cập nhật</button>
              </div>
              <div className="flex items-center gap-2 text-sm text-slate-500">
                {allocation?.meta.locked ? <><LockKeyhole className="h-4 w-4 text-rose-600" /> {statusText(true, allocation.meta.imported)}{allocation.meta.sourceFile ? ` · ${allocation.meta.sourceFile}` : ''}</> : <><Clock className="h-4 w-4 text-amber-500" /> Dữ liệu đang ở trạng thái dự thảo</>}
              </div>
            </section>

            {allocation && (
              <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <MetricCard label={weekNo ? `Doanh số hợp đồng tuần ${weekNo}` : 'Doanh số hợp đồng tháng'} value={money(allocation.meta.totalSales)} icon={FileSpreadsheet} tone="blue" />
                <MetricCard label={`Tổng quỹ TeamLead (${(allocation.meta.fundRate * 100).toFixed(2)}%)`} value={money(allocation.meta.grossFund)} icon={Wallet} tone="green" />
                <MetricCard label={weekNo ? 'Quỹ 70% chi tuần này' : 'Quỹ 70% hiệu quả nhóm'} value={money(allocation.meta.fund70)} icon={BarChart3} tone="amber" hint={weekNo ? 'Chia theo doanh số và chức danh của từng đội' : 'Tổng các tuần trong tháng'} />
                <MetricCard label={weekNo ? 'Quỹ 30% chia đều (chốt tháng)' : 'Quỹ 30% chia đều'} value={money(allocation.meta.fund30)} icon={Users} tone="violet" hint={weekNo ? 'Tham khảo quyền hưởng; không đưa vào phiếu chi tuần' : 'Chia đều cho thành viên được chọn'} />
              </section>
            )}

            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="font-bold text-slate-900">{weekNo ? `Phân bổ tuần ${weekNo} · ${monthTitle(month)}` : `Tổng hợp ${monthTitle(month)}`}</h2>
                  <p className="mt-1 text-xs text-slate-500">{weekNo ? '30% hiển thị để theo dõi quyền hưởng tháng; tổng chi tuần chỉ gồm quỹ 70%.' : '30% chia đều theo tháng; 70% cộng dồn từ phân bổ từng tuần.'}</p>
                </div>
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Tìm thành viên hoặc nhóm" className="w-64 rounded-lg border border-slate-200 py-2 pl-9 pr-3 text-sm outline-none focus:border-blue-500" />
                </div>
              </div>
              {loading && !allocation ? <div className="p-12 text-center text-sm text-slate-500">Đang tính dữ liệu…</div> : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[1180px] text-left text-sm">
                    <thead className="bg-slate-900 text-xs uppercase tracking-wide text-slate-300">
                      <tr>
                        <th className="px-4 py-3.5">Thành viên & SĐT</th><th className="px-4 py-3.5">Đội nhóm</th><th className="px-4 py-3.5">Chức danh</th>
                        <th className="px-4 py-3.5 text-center">Quỹ 30%<span className="mt-1 block font-normal normal-case tracking-normal text-slate-400">Tháng</span></th>
                        <th className="px-4 py-3.5 text-center">Quỹ 70%<span className="mt-1 block font-normal normal-case tracking-normal text-slate-400">{weekNo ? `Tuần ${weekNo}` : 'Tháng'}</span></th>
                        <th className="px-4 py-3.5 text-right">Doanh số đội</th><th className="px-4 py-3.5 text-right">Tiền 30% tháng</th><th className="px-4 py-3.5 text-right">Tiền 70% kỳ</th><th className="px-4 py-3.5 text-right">{weekNo ? 'Chi tuần này' : 'Tổng thực nhận'}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredAllocationRows.map((row, index) => (
                        <tr key={`${row.memberPhone}-${row.teamName}-${index}`} className="hover:bg-slate-50/70">
                          <td className="px-4 py-3.5"><div className="font-semibold text-slate-900">{row.memberName}</div><div className="mt-0.5 text-xs text-slate-500">{row.memberPhone}</div></td>
                          <td className="px-4 py-3.5 text-slate-700">{row.teamName || 'Chưa gán đội'}</td>
                          <td className="px-4 py-3.5"><span className="rounded-md bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-700">{row.role || 'Thành viên'}</span></td>
                          <td className="px-4 py-3.5 text-center">{row.eligible30 ? <Check className="mx-auto h-4 w-4 text-blue-600" /> : <span className="text-slate-300">—</span>}</td>
                          <td className="px-4 py-3.5 text-center">{row.eligible70 ? <Check className="mx-auto h-4 w-4 text-emerald-600" /> : <span className="text-slate-300">—</span>}</td>
                          <td className="px-4 py-3.5 text-right tabular-nums text-slate-600">{money(row.salesBasis)}</td>
                          <td className="px-4 py-3.5 text-right font-semibold tabular-nums text-violet-700">{money(row.payout30)}</td>
                          <td className="px-4 py-3.5 text-right font-semibold tabular-nums text-amber-700">{money(row.payout70)}</td>
                          <td className="px-4 py-3.5 text-right font-bold tabular-nums text-emerald-700">{money(weekNo ? row.payout70 : row.total)}</td>
                        </tr>
                      ))}
                      {!filteredAllocationRows.length && <tr><td colSpan={9} className="px-4 py-14 text-center text-sm text-slate-500">Chưa có dữ liệu để phân bổ. Hãy tạo danh sách tháng và nhập hợp đồng có đội nhóm.</td></tr>}
                    </tbody>
                    {!!filteredAllocationRows.length && (
                      <tfoot className="border-t-2 border-slate-200 bg-slate-50 font-bold text-slate-900">
                        <tr><td colSpan={6} className="px-4 py-4">TỔNG CỘNG ({filteredAllocationRows.length} dòng)</td><td className="px-4 py-4 text-right tabular-nums text-violet-700">{money(filteredAllocationRows.reduce((sum, row) => sum + row.payout30, 0))}</td><td className="px-4 py-4 text-right tabular-nums text-amber-700">{money(filteredAllocationRows.reduce((sum, row) => sum + row.payout70, 0))}</td><td className="px-4 py-4 text-right tabular-nums text-emerald-700">{money(filteredAllocationRows.reduce((sum, row) => sum + (weekNo ? row.payout70 : row.total), 0))}</td></tr>
                      </tfoot>
                    )}
                  </table>
                </div>
              )}
              {allocation?.meta.locked && <div className="flex items-center justify-between gap-3 border-t border-rose-100 bg-rose-50 px-4 py-3 text-xs font-medium text-rose-800"><span className="inline-flex items-center gap-2"><LockKeyhole className="h-4 w-4" /> Dữ liệu kỳ này đã chốt; bảng và bản Excel ở chế độ chỉ đọc.</span><span>{allocation.meta.lockedAt ? `Chốt lúc ${new Date(allocation.meta.lockedAt).toLocaleString('vi-VN')}` : ''}</span></div>}
            </section>
          </>
        )}

        {activeTab === 'reports' && (
          <>
            <section className="grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(360px,0.85fr)]">
              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div><h2 className="font-bold text-slate-900">Hợp đồng trong {monthTitle(month)}</h2><p className="mt-1 text-xs text-slate-500">Chọn một hợp đồng để xem phần 70% theo đội và quyền 30% tháng.</p></div>
                </div>
                <div className="max-h-[620px] overflow-auto">
                  <table className="w-full min-w-[640px] text-left text-sm">
                    <thead className="sticky top-0 bg-slate-900 text-xs uppercase tracking-wide text-slate-300"><tr><th className="px-4 py-3">Mã hợp đồng</th><th className="px-4 py-3">Khách hàng</th><th className="px-4 py-3">Ngày ký</th><th className="px-4 py-3">Đội nhóm</th><th className="px-4 py-3 text-right">Giá trị</th><th className="px-4 py-3">Tuần</th></tr></thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredContracts.map((contract) => (
                        <tr key={contract.id} onClick={() => void loadContractBreakdown(contract.id)} className={`cursor-pointer transition hover:bg-blue-50/70 ${selectedContract === contract.id ? 'bg-blue-50' : ''}`}>
                          <td className="px-4 py-3 font-semibold text-blue-700">{contract.contract_code || `HĐ #${contract.id}`}</td><td className="px-4 py-3 text-slate-800">{contract.customer_name}</td><td className="px-4 py-3 whitespace-nowrap text-slate-500">{shortDate(contract.contract_date)}</td><td className="px-4 py-3 text-slate-600">{contract.team_name || 'Chưa gán đội'}</td><td className="px-4 py-3 text-right font-semibold tabular-nums">{money(contract.value)}</td><td className="px-4 py-3 text-slate-500">{contract.weekNo}</td>
                        </tr>
                      ))}
                      {!filteredContracts.length && <tr><td colSpan={6} className="px-4 py-14 text-center text-sm text-slate-500">Không có hợp đồng trong kỳ lọc.</td></tr>}
                    </tbody>
                  </table>
                </div>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="border-b border-slate-100 p-4"><div className="flex items-center gap-2"><Receipt className="h-4 w-4 text-blue-600" /><h2 className="font-bold text-slate-900">Chi tiết phân bổ</h2></div><p className="mt-1 text-xs text-slate-500">Chọn hợp đồng ở bảng bên trái để xem người hưởng.</p></div>
                {!breakdown ? <div className="px-5 py-16 text-center text-sm text-slate-500">{selectedContract ? 'Đang tải chi tiết…' : 'Chưa chọn hợp đồng.'}</div> : (
                  <div className="space-y-5 p-4">
                    <div className="rounded-xl bg-slate-50 p-3.5">
                      <div className="font-bold text-slate-900">{breakdown.contract.contractCode || `HĐ #${breakdown.contract.id}`} · {breakdown.contract.customerName}</div>
                      <div className="mt-1 text-xs text-slate-500">{shortDate(breakdown.contract.contractDate)} · Tuần {breakdown.contract.weekNo} · {breakdown.contract.teamName || 'Chưa gán đội'}</div>
                      <div className="mt-3 flex justify-between border-t border-slate-200 pt-3 text-sm"><span>Giá trị hợp đồng</span><strong>{money(breakdown.contract.value)}</strong></div>
                    </div>
                    <div>
                      <div className="mb-2 flex items-center justify-between"><h3 className="text-sm font-bold text-amber-800">Quỹ 70% theo hợp đồng</h3><span className="text-xs text-slate-500">Tỷ lệ nguồn {(breakdown.fundRate * 100).toFixed(2)}%</span></div>
                      <div className="overflow-hidden rounded-lg border border-slate-200">
                        {breakdown.allocations70.map((row, index) => <div key={`${row.memberPhone}-${row.teamName}-${index}`} className="flex items-center justify-between gap-3 border-b border-slate-100 px-3 py-2.5 last:border-0"><div><div className="text-sm font-semibold text-slate-800">{row.memberName}</div><div className="text-[11px] text-slate-500">{row.teamName} · {row.role}</div></div><div className="text-sm font-bold tabular-nums text-amber-700">{money(row.payout)}</div></div>)}
                        {!breakdown.allocations70.length && <p className="px-3 py-4 text-xs text-slate-500">Đội này chưa có thành viên được chọn hưởng quỹ 70% trong tuần.</p>}
                      </div>
                    </div>
                    <div>
                      <h3 className="mb-2 text-sm font-bold text-violet-800">Quỹ 30% chia đều trong tháng</h3>
                      <p className="mb-2 text-xs text-slate-500">Khoản 30% là phân bổ tháng, không gắn thành khoản chi riêng của hợp đồng này.</p>
                      <div className="max-h-52 overflow-auto rounded-lg border border-slate-200">
                        {breakdown.allocations30.map((row) => <div key={row.memberPhone} className="flex items-center justify-between gap-3 border-b border-slate-100 px-3 py-2.5 last:border-0"><div className="text-sm font-medium text-slate-800">{row.memberName}</div><div className="text-sm font-semibold tabular-nums text-violet-700">{money(row.payout)}</div></div>)}
                        {!breakdown.allocations30.length && <p className="px-3 py-4 text-xs text-slate-500">Chưa có thành viên được chọn chia quỹ 30% tháng.</p>}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </section>
            <section className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-800"><span className="font-semibold">Cách đọc báo cáo:</span> quỹ 70% gắn với doanh số đội của hợp đồng; quỹ 30% được chia đều theo danh sách tháng và được quyết toán riêng cuối tháng.</section>
          </>
        )}
      </div>

      {showAddMember && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/50 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) setShowAddMember(false); }}>
          <div className="w-full max-w-xl rounded-2xl bg-white p-5 shadow-2xl sm:p-6">
            <div className="flex items-start justify-between"><div><h2 className="text-lg font-bold text-slate-900">Thêm TeamLead</h2><p className="mt-1 text-sm text-slate-500">Chọn thành viên từ danh sách chung, sau đó gán đội và chức danh tháng.</p></div><button onClick={() => setShowAddMember(false)} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"><X className="h-5 w-5" /></button></div>
            <div className="mt-5 space-y-4">
              <label className="block text-sm font-semibold text-slate-700">Thành viên
                <select
                  value={addMemberId}
                  onChange={(event) => {
                    const selectedId = event.target.value;
                    setAddMemberId(selectedId);
                    if (!selectedId) {
                      setAddTeamIds([]);
                      setAddRole('');
                      return;
                    }
                    const foundUser = availableUsers.find((u) => String(u.id) === selectedId);
                    if (foundUser?.team_name) {
                      const userTeamNames = foundUser.team_name.split(',').map((s) => s.trim().toLowerCase());
                      const matchedIds = teams
                        .filter((t) => userTeamNames.includes(t.name.trim().toLowerCase()))
                        .map((t) => t.id);
                      if (matchedIds.length > 0) {
                        setAddTeamIds(matchedIds);
                      }
                    }
                    if (foundUser?.title && ROLE_OPTIONS.includes(foundUser.title)) {
                      setAddRole(foundUser.title);
                    }
                  }}
                  className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm font-normal outline-none focus:border-blue-500"
                >
                  <option value="">Chọn thành viên</option>
                  {availableUsers.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.name} {user.phone ? `· ${user.phone}` : ''} {user.team_name ? `(Đội: ${user.team_name})` : ''}
                    </option>
                  ))}
                </select>
              </label>
              <div className="block text-sm font-semibold text-slate-700">Đội nhóm
                <div className="mt-1.5 max-h-44 overflow-y-auto rounded-lg border border-slate-200 bg-white p-1.5 space-y-0.5">
                  {teams.map((team) => {
                    const checked = addTeamIds.includes(team.id);
                    return (
                      <button
                        key={team.id}
                        type="button"
                        onClick={() => {
                          setAddTeamIds(checked ? addTeamIds.filter((id) => id !== team.id) : [...addTeamIds, team.id]);
                        }}
                        className={`w-full flex items-center justify-between rounded-md px-2.5 py-1.5 text-sm text-left transition ${
                          checked ? 'bg-blue-50 font-semibold text-blue-900' : 'hover:bg-slate-50 text-slate-700 font-normal'
                        }`}
                      >
                        <span>{team.name}</span>
                        {checked ? (
                          <Check className="h-4 w-4 text-blue-600 shrink-0" />
                        ) : (
                          <span className="h-4 w-4 rounded border border-slate-300 shrink-0" />
                        )}
                      </button>
                    );
                  })}
                  {!teams.length && <p className="p-2 text-center text-xs text-slate-400">Chưa có đội nhóm nào</p>}
                </div>
              </div>
              <label className="block text-sm font-semibold text-slate-700">Chức danh tháng
                <select value={addRole} onChange={(event) => setAddRole(event.target.value)} className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm font-normal outline-none focus:border-blue-500"><option value="">Chọn chức danh nếu đã gán đội</option>{ROLE_OPTIONS.map((role) => <option key={role} value={role}>{role} · {ROLE_WEIGHTS[role]}</option>)}</select>
              </label>
              <div className="flex flex-wrap gap-5 rounded-xl bg-slate-50 p-3.5">
                <label className="inline-flex items-center gap-2 text-sm font-semibold text-violet-800"><input type="checkbox" checked={addInclude30} onChange={(event) => setAddInclude30(event.target.checked)} className="h-4 w-4 accent-violet-600" /> Quỹ 30% tháng</label>
                <label className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-800"><input type="checkbox" checked={addInclude70} onChange={(event) => setAddInclude70(event.target.checked)} className="h-4 w-4 accent-emerald-600" /> Quỹ 70% tuần {weekNo}</label>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-2"><button onClick={() => setShowAddMember(false)} className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50">Hủy</button><button onClick={addSelectedMember} disabled={!addMemberId || (addTeamIds.length > 0 && !addRole)} className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">Thêm vào danh sách</button></div>
          </div>
        </div>
      )}

      {confirmLock && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber-50 text-amber-600"><LockKeyhole className="h-6 w-6" /></div>
            <h2 className="mt-4 text-center text-lg font-bold text-slate-900">Chốt {weekNo ? `tuần ${weekNo}` : 'tháng'}?</h2>
            <p className="mt-2 text-center text-sm leading-6 text-slate-500">Hệ thống sẽ lưu ảnh chụp phân bổ và khóa dữ liệu kỳ này. Kỳ đã khóa chỉ xem và xuất file.</p>
            <div className="mt-6 flex justify-center gap-2"><button onClick={() => setConfirmLock(false)} className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600">Quay lại</button><button onClick={() => void lockPeriod()} disabled={saving} className="inline-flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"><LockKeyhole className="h-4 w-4" /> {saving ? 'Đang chốt…' : 'Chốt và khóa'}</button></div>
          </div>
        </div>
      )}
    </div>
  );
}

function MetricCard({ label, value, icon: Icon, tone, hint }: { label: string; value: string; icon: typeof Wallet; tone: 'blue' | 'green' | 'amber' | 'violet'; hint?: string }) {
  const styles = {
    blue: 'border-blue-200 bg-blue-50 text-blue-700',
    green: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    amber: 'border-amber-200 bg-amber-50 text-amber-700',
    violet: 'border-violet-200 bg-violet-50 text-violet-700',
  };
  return <div className={`rounded-2xl border p-4 shadow-sm ${styles[tone]}`}><div className="flex items-start justify-between gap-3"><div><div className="text-xs font-semibold uppercase tracking-wide opacity-80">{label}</div><div className="mt-2 text-xl font-bold tabular-nums text-slate-900 sm:text-2xl">{value}</div>{hint && <div className="mt-1 text-[11px] leading-4 text-slate-500">{hint}</div>}</div><div className="rounded-xl bg-white/80 p-2.5"><Icon className="h-5 w-5" /></div></div></div>;
}

function TeamSelectCell({
  member,
  teams,
  rosterReadOnly,
  updateMemberTeams,
  isNearBottom,
}: {
  member: RosterMember;
  teams: TeamOption[];
  rosterReadOnly: boolean;
  updateMemberTeams: (member: RosterMember, selectedIds: number[]) => void;
  isNearBottom?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const selectedTeams = member.teams.map((t) => t.teamId);
  const displayNames = member.teams.map((t) => t.teamName).join(', ');

  if (rosterReadOnly) {
    return (
      <div className="py-2">
        {displayNames ? (
          <span className="font-semibold text-slate-800 text-sm">{displayNames}</span>
        ) : (
          <span className="text-xs italic text-slate-400">Chưa gán đội</span>
        )}
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="w-56 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 outline-none hover:border-blue-500 focus:border-blue-500 flex items-center justify-between gap-1.5 text-left shadow-sm transition"
        title={displayNames || 'Chọn đội nhóm'}
      >
        <span className="truncate">
          {displayNames || <span className="font-normal text-slate-400">Chọn đội nhóm</span>}
        </span>
        <ChevronDown
          className={`h-4 w-4 text-slate-400 shrink-0 transition-transform ${
            isOpen ? 'rotate-180 text-blue-600' : ''
          }`}
        />
      </button>

      {isOpen && (
        <div
          className={`absolute left-0 z-50 w-64 rounded-xl border border-slate-200 bg-white p-2 shadow-xl ring-1 ring-black/5 animate-in fade-in zoom-in-95 duration-100 ${
            isNearBottom ? 'bottom-full mb-1.5' : 'top-full mt-1.5'
          }`}
        >
          <div className="mb-1.5 flex items-center justify-between border-b border-slate-100 px-2 pb-1.5 text-xs text-slate-500">
            <span className="font-medium text-slate-700">Chọn đội nhóm</span>
            <span className="text-[11px] font-semibold text-blue-600">Đã chọn: {selectedTeams.length}</span>
          </div>
          <div className="max-h-56 overflow-y-auto space-y-0.5">
            {teams.map((team) => {
              const isChecked = selectedTeams.includes(team.id);
              return (
                <button
                  key={team.id}
                  type="button"
                  onClick={() => {
                    const next = isChecked
                      ? selectedTeams.filter((id) => id !== team.id)
                      : [...selectedTeams, team.id];
                    updateMemberTeams(member, next);
                  }}
                  className={`w-full flex items-center justify-between rounded-lg px-2.5 py-2 text-sm text-left transition ${
                    isChecked
                      ? 'bg-blue-50 font-semibold text-blue-900'
                      : 'text-slate-700 hover:bg-slate-50 font-normal'
                  }`}
                >
                  <span className="truncate">{team.name}</span>
                  {isChecked ? (
                    <Check className="h-4 w-4 text-blue-600 shrink-0" />
                  ) : (
                    <span className="h-4 w-4 rounded border border-slate-300 shrink-0" />
                  )}
                </button>
              );
            })}
            {!teams.length && (
              <p className="px-2 py-3 text-center text-xs text-slate-400">Chưa có đội nhóm nào</p>
            )}
          </div>
          <div className="mt-1.5 border-t border-slate-100 pt-1.5 text-right">
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="rounded-md bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-200"
            >
              Xong
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
