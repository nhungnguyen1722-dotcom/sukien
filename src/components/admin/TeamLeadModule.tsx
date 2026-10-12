'use client';

import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { formatWeekOptionLabel } from '@/lib/weekRanges';
import AdminTimeFilter from '@/components/admin/AdminTimeFilter';
import {
  BarChart3,
  CalendarDays,
  Check,
  ChevronDown,
  Clock,
  Copy,
  Download,
  FileSpreadsheet,
  LayoutGrid,
  LockKeyhole,
  Plus,
  Printer,
  Receipt,
  RefreshCw,
  Save,
  Search,
  ShieldCheck,
  Trophy,
  Users,
  Wallet,
  X,
} from 'lucide-react';
const LeaderboardManagement = dynamic(() => import('@/components/admin/LeaderboardManagement'), {
  loading: () => (
    <div aria-busy="true" className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm" />
  ),
});

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
  const [monthFilterMode, setMonthFilterMode] = useState<'month' | 'all'>('month');
  const [weekNo, setWeekNo] = useState(() => initialWeekNo !== undefined && initialWeekNo >= 0 && initialWeekNo <= 5 ? initialWeekNo : 0);
  const [roster, setRoster] = useState<RosterMember[]>([]);
  const [users, setUsers] = useState<RosterUser[]>([]);
  const [teams, setTeams] = useState<TeamOption[]>([]);
  const [periods, setPeriods] = useState<Array<{ weekNo: number; locked: boolean; imported: boolean }>>([]);
  const [allocation, setAllocation] = useState<Allocation | null>(null);
  const [ratePercent, setRatePercent] = useState('2.9');
  const [reportWeekNo, setReportWeekNo] = useState(0);
  const [reportSubTab, setReportSubTab] = useState<'leaderboard' | 'contracts'>('leaderboard');
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
  const [viewMode, setViewMode] = useState<'member' | 'group'>('member');
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string | number, boolean>>({});
  const autoCloneAttempted = useRef(new Set<string>());

  // Cache dữ liệu giữa các tab và bộ lọc tuần/tháng để chuyển đổi ngay lập tức (0ms)
  const cacheRef = useRef<{
    roster: Map<string, any>;
    allocation: Map<string, any>;
    reports: Map<string, any>;
  }>({
    roster: new Map(),
    allocation: new Map(),
    reports: new Map(),
  });

  // Hủy các request cũ khi người dùng bấm đổi tab hoặc bộ lọc liên tục
  const abortControllerRef = useRef<AbortController | null>(null);

  // Phân trang cho các bảng dữ liệu lớn
  const [rosterPage, setRosterPage] = useState(1);
  const [rosterPageSize, setRosterPageSize] = useState(30);

  const [allocationPage, setAllocationPage] = useState(1);
  const [allocationPageSize, setAllocationPageSize] = useState(30);

  const [reportPage, setReportPage] = useState(1);
  const [reportPageSize, setReportPageSize] = useState(30);

  useEffect(() => {
    if (initialMonth && /^\d{4}-\d{2}$/.test(initialMonth)) setMonth(initialMonth);
    if (initialWeekNo !== undefined && initialWeekNo >= 0 && initialWeekNo <= 5) {
      setWeekNo(initialWeekNo);
    }
  }, [defaultMonth, initialMonth, initialWeekNo]);

  const selectedWeekLocked = periods.find((period) => period.weekNo === weekNo)?.locked || false;
  const selectedYear = Number(month.slice(0, 4));
  const selectedMonthNumber = Number(month.slice(5, 7));
  const weekOptions = Array.from({ length: weekCountForMonth(month) }, (_, index) => index + 1);
  const maximumYear = Math.max(new Date().getFullYear() + 1, selectedYear);
  const yearOptions = Array.from({ length: maximumYear - 1999 }, (_, index) => maximumYear - index);

  const updateMonthFilter = useCallback((year: number, monthNumber: number) => {
    const nextMonth = `${year}-${String(monthNumber).padStart(2, '0')}`;
    setMonth(nextMonth);
    setMonthFilterMode('month');
    // Khi chuyển sang tháng mới, mặc định chọn Cả tháng (0)
    setWeekNo(0);
    setReportWeekNo(0);
    setSelectedContract(null);
    setBreakdown(null);
    setRosterPage(1);
    setAllocationPage(1);
    setReportPage(1);
  }, []);

  const handleYearChange = useCallback((year: number) => {
    updateMonthFilter(year, selectedMonthNumber);
  }, [selectedMonthNumber, updateMonthFilter]);

  const handleMonthChange = useCallback((m: number | 'all') => {
    if (m === 'all') {
      setMonthFilterMode('all');
      setWeekNo(0);
      setReportWeekNo(0);
    } else {
      updateMonthFilter(selectedYear, m);
    }
  }, [selectedYear, updateMonthFilter]);

  const handleWeekChange = useCallback((w: number) => {
    setWeekNo(w);
    setReportWeekNo(w);
  }, []);

  const loadRoster = useCallback(async (forceRefresh = false) => {
    const cacheKey = `${month}_${weekNo}`;
    if (!forceRefresh && cacheRef.current.roster.has(cacheKey)) {
      const cached = cacheRef.current.roster.get(cacheKey);
      setRoster(cached.roster || []);
      setUsers(cached.users || []);
      setTeams(cached.teams || []);
      setPeriods(cached.periods || []);
      setLoading(false);
      return;
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setLoading(true);
    setError('');
    try {
      const response = await fetch(`/api/admin/teamlead?month=${month}&week=${weekNo}`, {
        signal: controller.signal,
      });
      let data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || 'Không thể tải dữ liệu TeamLead.');
      if (!data.roster?.length && !autoCloneAttempted.current.has(month)) {
        autoCloneAttempted.current.add(month);
        const cloneResponse = await fetch('/api/admin/teamlead', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'clone-month', month }),
          signal: controller.signal,
        });
        const cloneData = await cloneResponse.json();
        if (cloneResponse.ok && cloneData.success) {
          const refreshed = await fetch(`/api/admin/teamlead?month=${month}&week=${weekNo}`, {
            signal: controller.signal,
          });
          const refreshedData = await refreshed.json();
          if (refreshed.ok && refreshedData.success) data = refreshedData;
        }
      }
      cacheRef.current.roster.set(cacheKey, data);
      setRoster(data.roster || []);
      setUsers(data.users || []);
      setTeams(data.teams || []);
      setPeriods(data.periods || []);
    } catch (caught: unknown) {
      if ((caught as any)?.name === 'AbortError') return;
      setError(caught instanceof Error ? caught.message : 'Không thể tải dữ liệu TeamLead.');
    } finally {
      setLoading(false);
    }
  }, [month, weekNo]);

  const loadAllocation = useCallback(async (forceRefresh = false) => {
    const rate = Number(ratePercent) / 100;
    const cacheKey = `${month}_${weekNo}_${rate}`;
    if (!forceRefresh && cacheRef.current.allocation.has(cacheKey)) {
      const cached = cacheRef.current.allocation.get(cacheKey);
      setAllocation(cached.data);
      if (cached.teams) setTeams(cached.teams);
      setLoading(false);
      return;
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setLoading(true);
    setError('');
    try {
      const [response, teamsResponse] = await Promise.all([
        fetch(`/api/admin/teamlead/allocation?month=${month}&week=${weekNo}&rate=${rate}`, {
          signal: controller.signal,
        }),
        fetch('/api/admin/teamlead/teams', {
          signal: controller.signal,
        }),
      ]);
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || 'Không thể tính phân bổ quỹ.');
      setAllocation(data);
      let teamsResult = teams;
      const teamsData = await teamsResponse.json();
      if (teamsResponse.ok && teamsData.success) {
        teamsResult = teamsData.teams || [];
        setTeams(teamsResult);
      }
      cacheRef.current.allocation.set(cacheKey, { data, teams: teamsResult });
      if (data.meta?.fundRate !== undefined && !data.meta.locked) {
        const nextRate = (Number(data.meta.fundRate) * 100).toString();
        setRatePercent((previous) => (Number(previous) === Number(nextRate) ? previous : nextRate));
      }
    } catch (caught: unknown) {
      if ((caught as any)?.name === 'AbortError') return;
      setError(caught instanceof Error ? caught.message : 'Không thể tính phân bổ quỹ.');
    } finally {
      setLoading(false);
    }
  }, [month, weekNo, ratePercent, teams]);

  const loadReports = useCallback(async (forceRefresh = false) => {
    const cacheKey = `${month}`;
    if (!forceRefresh && cacheRef.current.reports.has(cacheKey)) {
      const cached = cacheRef.current.reports.get(cacheKey);
      setReportContracts(cached.contracts || []);
      setLoading(false);
      return;
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setLoading(true);
    setError('');
    try {
      const response = await fetch(`/api/admin/teamlead/reports?month=${month}`, {
        signal: controller.signal,
      });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || 'Không thể tải báo cáo.');
      cacheRef.current.reports.set(cacheKey, data);
      setReportContracts(data.contracts || []);
    } catch (caught: unknown) {
      if ((caught as any)?.name === 'AbortError') return;
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
    return visibleRoster.filter((member) => {
      if (!term) return true;
      const teamNames = member.teams.map((t) => t.teamName).join(' ');
      return `${member.name} ${member.phone} ${teamNames}`.toLocaleLowerCase('vi-VN').includes(term);
    });
  }, [visibleRoster, search]);

  const groupedRoster = useMemo(() => {
    const map = new Map<number, { id: number; name: string; items: Array<{ member: RosterMember; teamAssignment?: TeamAssignment }> }>();

    teams.forEach((t) => {
      map.set(t.id, { id: t.id, name: t.name, items: [] });
    });

    const unassignedItems: Array<{ member: RosterMember; teamAssignment?: TeamAssignment }> = [];

    filteredRoster.forEach((member) => {
      if (!member.teams || member.teams.length === 0) {
        unassignedItems.push({ member });
        return;
      }

      member.teams.forEach((teamItem) => {
        let group = map.get(teamItem.teamId);
        if (!group) {
          group = { id: teamItem.teamId, name: teamItem.teamName || 'Đội khác', items: [] };
          map.set(teamItem.teamId, group);
        }
        group.items.push({ member, teamAssignment: teamItem });
      });
    });

    const result = Array.from(map.values()).filter((g) => g.items.length > 0);

    if (unassignedItems.length > 0) {
      result.push({
        id: 0,
        name: 'Chưa phân nhóm',
        items: unassignedItems,
      });
    }

    return result;
  }, [teams, filteredRoster]);

  const toggleGroupCollapse = (groupId: string | number) => {
    setCollapsedGroups((prev) => ({
      ...prev,
      [groupId]: !prev[groupId],
    }));
  };

  const collapseAllGroups = () => {
    const next: Record<string | number, boolean> = {};
    groupedRoster.forEach((g) => {
      next[g.id] = true;
    });
    setCollapsedGroups(next);
  };

  const expandAllGroups = () => {
    setCollapsedGroups({});
  };

  const filteredAllocationRows = useMemo(() => {
    const term = search.trim().toLocaleLowerCase('vi-VN');
    return (allocation?.rows || []).filter((row) => {
      const teamMatches = teamFilter === 'all' || String(row.teamId || '') === teamFilter;
      const searchMatches = !term || `${row.memberName} ${row.memberPhone} ${row.teamName}`.toLocaleLowerCase('vi-VN').includes(term);
      return teamMatches && searchMatches;
    });
  }, [allocation, search, teamFilter]);

  const filteredContracts = useMemo(() => reportContracts.filter((contract) => reportWeekNo === 0 || contract.weekNo === reportWeekNo), [reportContracts, reportWeekNo]);

  const paginatedRoster = useMemo(() => {
    if (rosterPageSize === 0) return filteredRoster;
    const start = (rosterPage - 1) * rosterPageSize;
    return filteredRoster.slice(start, start + rosterPageSize);
  }, [filteredRoster, rosterPage, rosterPageSize]);

  const totalRosterPages = rosterPageSize === 0 ? 1 : Math.ceil(filteredRoster.length / rosterPageSize) || 1;

  const paginatedAllocationRows = useMemo(() => {
    if (allocationPageSize === 0) return filteredAllocationRows;
    const start = (allocationPage - 1) * allocationPageSize;
    return filteredAllocationRows.slice(start, start + allocationPageSize);
  }, [filteredAllocationRows, allocationPage, allocationPageSize]);

  const totalAllocationPages = allocationPageSize === 0 ? 1 : Math.ceil(filteredAllocationRows.length / allocationPageSize) || 1;

  const paginatedContracts = useMemo(() => {
    if (reportPageSize === 0) return filteredContracts;
    const start = (reportPage - 1) * reportPageSize;
    return filteredContracts.slice(start, start + reportPageSize);
  }, [filteredContracts, reportPage, reportPageSize]);

  const totalReportPages = reportPageSize === 0 ? 1 : Math.ceil(filteredContracts.length / reportPageSize) || 1;

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

  const removeMemberFromGroup = (member: RosterMember, teamId?: number) => {
    if (teamId && teamId !== 0 && member.teams.length > 1) {
      const remainingTeamIds = member.teams.filter((t) => t.teamId !== teamId).map((t) => t.teamId);
      updateMemberTeams(member, remainingTeamIds);
    } else {
      setRoster((previous) => previous.filter((item) => item !== member));
    }
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

  const toggleRoster30 = async (member: RosterMember) => {
    if (rosterReadOnly || saving) return;
    const nextVal = !member.include30;
    updateRosterMember(member.membershipId, member.userId, { include30: nextVal });
    if (member.membershipId) {
      setSaving(true);
      setError('');
      try {
        const response = await fetch('/api/admin/teamlead', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'set-eligibility',
            month,
            weekNo,
            membershipId: member.membershipId,
            include30: nextVal,
          }),
        });
        const data = await response.json();
        if (!response.ok || !data.success) throw new Error(data.error || 'Không thể cập nhật quyền quỹ 30%.');
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : 'Không thể cập nhật quyền quỹ 30%.');
        await loadRoster();
      } finally {
        setSaving(false);
      }
    }
  };

  const toggleRoster70 = async (member: RosterMember, team: TeamAssignment) => {
    if (rosterReadOnly || saving) return;
    const nextVal = !team.include70;
    const nextTeams = member.teams.map((t) =>
      t.teamId === team.teamId
        ? { ...t, include70: nextVal, include70Default: weekNo === 0 ? nextVal : t.include70Default }
        : t
    );
    updateRosterMember(member.membershipId, member.userId, { teams: nextTeams });
    if (team.memberTeamId) {
      setSaving(true);
      setError('');
      try {
        const response = await fetch('/api/admin/teamlead', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'set-eligibility',
            month,
            weekNo,
            membershipId: member.membershipId,
            memberTeamId: team.memberTeamId,
            include70: nextVal,
          }),
        });
        const data = await response.json();
        if (!response.ok || !data.success) throw new Error(data.error || 'Không thể cập nhật quyền quỹ 70%.');
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : 'Không thể cập nhật quyền quỹ 70%.');
        await loadRoster();
      } finally {
        setSaving(false);
      }
    }
  };

  const toggleAllocation30 = async (row: AllocationRow) => {
    if (saving || allocation?.meta.locked || !row.membershipId) return;
    const nextValue = !row.eligible30;
    setAllocation((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        rows: prev.rows.map((r) =>
          r.membershipId === row.membershipId ? { ...r, eligible30: nextValue } : r
        ),
      };
    });
    setSaving(true);
    setError('');
    try {
      const response = await fetch('/api/admin/teamlead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'set-eligibility',
          month,
          weekNo,
          membershipId: row.membershipId,
          memberTeamId: row.memberTeamId,
          include30: nextValue,
        }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || 'Không thể cập nhật tỷ lệ quỹ 30%.');
      await loadAllocation();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Không thể cập nhật tỷ lệ quỹ 30%.');
      await loadAllocation();
    } finally {
      setSaving(false);
    }
  };

  const toggleAllocation70 = async (row: AllocationRow) => {
    if (saving || allocation?.meta.locked || !row.memberTeamId) return;
    const nextValue = !row.eligible70;
    setAllocation((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        rows: prev.rows.map((r) =>
          r.memberTeamId === row.memberTeamId ? { ...r, eligible70: nextValue } : r
        ),
      };
    });
    setSaving(true);
    setError('');
    try {
      const response = await fetch('/api/admin/teamlead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'set-eligibility',
          month,
          weekNo,
          membershipId: row.membershipId,
          memberTeamId: row.memberTeamId,
          include70: nextValue,
        }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || 'Không thể cập nhật tỷ lệ quỹ 70%.');
      await loadAllocation();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Không thể cập nhật tỷ lệ quỹ 70%.');
      await loadAllocation();
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
              <button
                type="button"
                onClick={() => {
                  if (activeTab === 'roster') void loadRoster(true);
                  if (activeTab === 'allocation') void loadAllocation(true);
                  if (activeTab === 'reports') void loadReports(true);
                }}
                disabled={loading}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-60 cursor-pointer"
                title="Làm mới dữ liệu từ máy chủ"
              >
                <RefreshCw className={`h-4 w-4 text-blue-600 ${loading ? 'animate-spin' : ''}`} />
                <span>Làm mới</span>
              </button>
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
          <div className="mt-5 border-t border-slate-100 pt-4">
            <AdminTimeFilter
              selectedYear={selectedYear}
              yearOptions={yearOptions}
              onYearChange={handleYearChange}
              selectedMonth={monthFilterMode === 'all' ? 'all' : selectedMonthNumber}
              onMonthChange={handleMonthChange}
              allowAllMonths={true}
              selectedWeek={weekNo}
              onWeekChange={handleWeekChange}
              hideWeekRow={monthFilterMode === 'all'}
            />
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
                <div className="flex flex-wrap items-center gap-4">
                  <div>
                    <h2 className="font-bold text-slate-900">{monthTitle(month)}</h2>
                    <p className="mt-0.5 text-xs text-slate-500">{visibleRoster.length} thành viên · {teams.length} đội nhóm</p>
                  </div>
                  <div className="inline-flex items-center rounded-xl bg-slate-100 p-1 text-xs font-semibold text-slate-600">
                    <button
                      type="button"
                      onClick={() => setViewMode('member')}
                      className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 transition ${
                        viewMode === 'member'
                          ? 'bg-white text-blue-600 shadow-sm font-bold'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <Users className="h-3.5 w-3.5" />
                      Xem theo thành viên
                    </button>
                    <button
                      type="button"
                      onClick={() => setViewMode('group')}
                      className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 transition ${
                        viewMode === 'group'
                          ? 'bg-white text-blue-600 shadow-sm font-bold'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <LayoutGrid className="h-3.5 w-3.5" />
                      Xem theo nhóm
                    </button>
                  </div>
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
              {loading ? (
                <div className="p-12 text-center text-sm text-slate-500">Đang tải dữ liệu…</div>
              ) : viewMode === 'member' ? (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[900px] text-left text-sm">
                    <thead className="bg-slate-900 text-xs uppercase tracking-wide text-slate-300">
                      <tr>
                        <th className="px-4 py-3.5">Thành viên</th>
                        <th className="px-4 py-3.5">Đội nhóm</th>
                        <th className="px-4 py-3.5">Chức danh</th>
                        <th className="px-4 py-3.5 text-center">
                          Quỹ 30%
                          <span className="mt-0.5 block font-normal normal-case tracking-normal text-slate-400">
                            {weekNo === 0 ? 'Cả tháng' : `Tuần ${weekNo}`}
                          </span>
                        </th>
                        <th className="px-4 py-3.5 text-center">
                          Quỹ 70%
                          <span className="mt-0.5 block font-normal normal-case tracking-normal text-slate-400">
                            {weekNo === 0 ? 'Cả tháng' : `Tuần ${weekNo}`}
                          </span>
                        </th>
                        <th className="px-4 py-3.5 text-right">Thao tác</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {paginatedRoster.map((member, index) => {
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
                            <td className="px-4 py-4 text-center">
                              <label className="inline-flex cursor-pointer items-center justify-center p-1">
                                <input
                                  type="checkbox"
                                  checked={Boolean(member.include30)}
                                  disabled={rosterReadOnly || saving}
                                  onChange={() => void toggleRoster30(member)}
                                  className="h-4 w-4 rounded border-slate-300 text-blue-600 accent-blue-600 focus:ring-blue-500 disabled:opacity-50"
                                  title={weekNo === 0 ? 'Tỷ lệ 30% mặc định cả tháng (áp dụng cho tất cả các tuần)' : `Tỷ lệ 30% riêng cho tuần ${weekNo}`}
                                />
                              </label>
                            </td>
                            <td className="px-4 py-4 text-center">
                              <div className="flex flex-col items-center justify-center gap-1">
                                {member.teams.map((teamItem) => (
                                  <label key={teamItem.memberTeamId || teamItem.teamId} className="inline-flex cursor-pointer items-center gap-1.5 p-0.5">
                                    <input
                                      type="checkbox"
                                      checked={Boolean(teamItem.include70)}
                                      disabled={rosterReadOnly || saving}
                                      onChange={() => void toggleRoster70(member, teamItem)}
                                      className="h-4 w-4 rounded border-slate-300 text-emerald-600 accent-emerald-600 focus:ring-emerald-500 disabled:opacity-50"
                                      title={weekNo === 0 ? `Tỷ lệ 70% ${teamItem.teamName} mặc định cả tháng (áp dụng cho tất cả các tuần)` : `Tỷ lệ 70% ${teamItem.teamName} riêng cho tuần ${weekNo}`}
                                    />
                                    {member.teams.length > 1 && (
                                      <span className="text-[11px] text-slate-500">{teamItem.teamName}</span>
                                    )}
                                  </label>
                                ))}
                                {!member.teams.length && <span className="text-slate-300">—</span>}
                              </div>
                            </td>
                            <td className="px-4 py-4 text-right">
                              {!rosterReadOnly && <button onClick={() => setRoster((previous) => previous.filter((item) => item !== member))} className="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50">Xóa</button>}
                            </td>
                          </tr>
                        );
                      })}
                      {!filteredRoster.length && <tr><td colSpan={6} className="px-4 py-14 text-center text-sm text-slate-500">{visibleRoster.length ? 'Không có thành viên phù hợp.' : roster.length ? 'Chưa có thành viên thuộc chức danh TeamLead trong tháng này.' : 'Tháng này chưa có danh sách. Thêm thành viên hoặc kế thừa tháng trước để bắt đầu.'}</td></tr>}
                    </tbody>
                  </table>
                  {totalRosterPages > 1 && (
                    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-white px-4 py-3 text-xs text-slate-600">
                      <div>
                        Hiển thị {((rosterPage - 1) * rosterPageSize) + 1} - {Math.min(rosterPage * rosterPageSize, filteredRoster.length)} trong {filteredRoster.length} thành viên
                      </div>
                      <div className="flex items-center gap-2">
                        <select
                          aria-label="Số dòng thành viên mỗi trang"
                          value={rosterPageSize}
                          onChange={(e) => {
                            setRosterPageSize(Number(e.target.value));
                            setRosterPage(1);
                          }}
                          className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs"
                        >
                          <option value={30}>30 / trang</option>
                          <option value={50}>50 / trang</option>
                          <option value={100}>100 / trang</option>
                          <option value={0}>Tất cả</option>
                        </select>
                        <button
                          type="button"
                          disabled={rosterPage <= 1}
                          onClick={() => setRosterPage((p) => Math.max(1, p - 1))}
                          className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-semibold disabled:opacity-40 hover:bg-slate-50 cursor-pointer"
                        >
                          Trước
                        </button>
                        <span className="text-xs font-medium">Trang {rosterPage} / {totalRosterPages}</span>
                        <button
                          type="button"
                          disabled={rosterPage >= totalRosterPages}
                          onClick={() => setRosterPage((p) => Math.min(totalRosterPages, p + 1))}
                          className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-semibold disabled:opacity-40 hover:bg-slate-50 cursor-pointer"
                        >
                          Sau
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-4 p-4 sm:p-5 bg-slate-50/50">
                  {groupedRoster.length > 0 ? (
                    <>
                      <div className="flex items-center justify-between text-xs text-slate-500">
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-slate-700">{groupedRoster.length} đội nhóm</span>
                          <span>·</span>
                          <span>{filteredRoster.length} thành viên</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={expandAllGroups}
                            className="font-semibold text-blue-600 hover:text-blue-700 hover:underline"
                          >
                            Mở rộng tất cả
                          </button>
                          <span className="text-slate-300">|</span>
                          <button
                            type="button"
                            onClick={collapseAllGroups}
                            className="font-medium text-slate-500 hover:text-slate-700 hover:underline"
                          >
                            Thu gọn tất cả
                          </button>
                        </div>
                      </div>

                      {groupedRoster.map((group) => {
                        const isCollapsed = Boolean(collapsedGroups[group.id]);
                        return (
                          <div
                            key={group.id}
                            className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition hover:border-slate-300"
                          >
                            <div
                              onClick={() => toggleGroupCollapse(group.id)}
                              className="flex cursor-pointer items-center justify-between border-b border-slate-100 bg-slate-50/80 px-4 py-3 select-none hover:bg-slate-100/70 transition"
                            >
                              <div className="flex items-center gap-3">
                                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-100 text-xs font-bold text-blue-700">
                                  <Users className="h-4 w-4" />
                                </div>
                                <div className="flex items-center gap-2.5">
                                  <span className="font-bold text-slate-900 text-sm sm:text-base">
                                    {group.name}
                                  </span>
                                  <span className="rounded-full bg-blue-50 border border-blue-200/70 px-2.5 py-0.5 text-xs font-semibold text-blue-700">
                                    {group.items.length} thành viên
                                  </span>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-slate-400 font-medium">
                                  {isCollapsed ? 'Nhấn để mở' : 'Thu gọn'}
                                </span>
                                <ChevronDown
                                  className={`h-4 w-4 text-slate-400 transition-transform duration-200 ${
                                    isCollapsed ? '-rotate-90' : ''
                                  }`}
                                />
                              </div>
                            </div>

                            {!isCollapsed && (
                              <div className="overflow-x-auto">
                                <table className="w-full min-w-[800px] text-left text-sm">
                                  <thead className="bg-slate-900 text-xs uppercase tracking-wide text-slate-300">
                                    <tr>
                                      <th className="px-4 py-3.5">Thành viên</th>
                                      <th className="px-4 py-3.5">Chức danh</th>
                                      <th className="px-4 py-3.5 text-center">
                                        Quỹ 30%
                                        <span className="mt-0.5 block font-normal normal-case tracking-normal text-slate-400">
                                          {weekNo === 0 ? 'Cả tháng' : `Tuần ${weekNo}`}
                                        </span>
                                      </th>
                                      <th className="px-4 py-3.5 text-center">
                                        Quỹ 70%
                                        <span className="mt-0.5 block font-normal normal-case tracking-normal text-slate-400">
                                          {weekNo === 0 ? 'Cả tháng' : `Tuần ${weekNo}`}
                                        </span>
                                      </th>
                                      <th className="px-4 py-3.5 text-right">Thao tác</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-100">
                                    {group.items.map(({ member, teamAssignment }) => {
                                      const role = teamAssignment?.role || member.teams[0]?.role || '';
                                      return (
                                        <tr
                                          key={`${group.id}-${member.membershipId}-${member.userId}`}
                                          className="align-middle hover:bg-slate-50/70"
                                        >
                                          <td className="px-4 py-4">
                                            <div className="font-semibold text-slate-900">{member.name}</div>
                                            <div className="mt-1 text-xs text-slate-500">
                                              {member.phone || 'Chưa có số điện thoại'}
                                            </div>
                                            {!member.userId && (
                                              <span className="mt-1 inline-block rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-500">
                                                Dữ liệu nhập Excel
                                              </span>
                                            )}
                                            {member.teams.length > 1 && (
                                              <div className="mt-1 flex flex-wrap gap-1">
                                                {member.teams
                                                  .filter((t) => t.teamId !== group.id)
                                                  .map((t) => (
                                                    <span
                                                      key={t.teamId}
                                                      className="inline-flex items-center rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-600"
                                                    >
                                                      Kiêm: {t.teamName}
                                                    </span>
                                                  ))}
                                              </div>
                                            )}
                                          </td>
                                          <td className="px-4 py-4">
                                            <select
                                              value={role}
                                              onChange={(event) => updateRole(member, event.target.value)}
                                              disabled={!member.teams.length || rosterReadOnly}
                                              className="w-44 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 outline-none focus:border-blue-500 disabled:bg-slate-100"
                                            >
                                              {!role && <option value="">Chưa gán chức danh</option>}
                                              {ROLE_OPTIONS.map((item) => (
                                                <option key={item} value={item}>
                                                  {item} ({ROLE_WEIGHTS[item]})
                                                </option>
                                              ))}
                                            </select>
                                          </td>
                                          <td className="px-4 py-4 text-center">
                                            <label className="inline-flex cursor-pointer items-center justify-center p-1">
                                              <input
                                                type="checkbox"
                                                checked={Boolean(member.include30)}
                                                disabled={rosterReadOnly || saving}
                                                onChange={() => void toggleRoster30(member)}
                                                className="h-4 w-4 rounded border-slate-300 text-blue-600 accent-blue-600 focus:ring-blue-500 disabled:opacity-50"
                                                title={
                                                  weekNo === 0
                                                    ? 'Tỷ lệ 30% mặc định cả tháng (áp dụng cho tất cả các tuần)'
                                                    : `Tỷ lệ 30% riêng cho tuần ${weekNo}`
                                                }
                                              />
                                            </label>
                                          </td>
                                          <td className="px-4 py-4 text-center">
                                            {teamAssignment ? (
                                              <label className="inline-flex cursor-pointer items-center justify-center p-1">
                                                <input
                                                  type="checkbox"
                                                  checked={Boolean(teamAssignment.include70)}
                                                  disabled={rosterReadOnly || saving}
                                                  onChange={() => void toggleRoster70(member, teamAssignment)}
                                                  className="h-4 w-4 rounded border-slate-300 text-emerald-600 accent-emerald-600 focus:ring-emerald-500 disabled:opacity-50"
                                                  title={
                                                    weekNo === 0
                                                      ? `Tỷ lệ 70% ${teamAssignment.teamName} mặc định cả tháng (áp dụng cho tất cả các tuần)`
                                                      : `Tỷ lệ 70% ${teamAssignment.teamName} riêng cho tuần ${weekNo}`
                                                  }
                                                />
                                              </label>
                                            ) : (
                                              <span className="text-slate-300">—</span>
                                            )}
                                          </td>
                                          <td className="px-4 py-4 text-right">
                                            {!rosterReadOnly && (
                                              <button
                                                onClick={() => removeMemberFromGroup(member, group.id)}
                                                className="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50"
                                              >
                                                Xóa
                                              </button>
                                            )}
                                          </td>
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </table>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </>
                  ) : (
                    <div className="p-12 text-center text-sm text-slate-500">
                      {visibleRoster.length
                        ? 'Không có thành viên phù hợp.'
                        : roster.length
                        ? 'Chưa có thành viên thuộc chức danh TeamLead trong tháng này.'
                        : 'Tháng này chưa có danh sách. Thêm thành viên hoặc kế thừa tháng trước để bắt đầu.'}
                    </div>
                  )}
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
                <button onClick={() => void loadAllocation(true)} disabled={loading} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"><Search className="h-4 w-4" /> Cập nhật</button>
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
                        <th className="px-4 py-3.5 text-center">
                          Quỹ 30%
                          <span className="mt-0.5 block font-normal normal-case tracking-normal text-slate-400">
                            {weekNo === 0 ? 'Cả tháng' : `Tuần ${weekNo}`}
                          </span>
                        </th>
                        <th className="px-4 py-3.5 text-center">
                          Quỹ 70%
                          <span className="mt-0.5 block font-normal normal-case tracking-normal text-slate-400">
                            {weekNo === 0 ? 'Cả tháng' : `Tuần ${weekNo}`}
                          </span>
                        </th>
                        <th className="px-4 py-3.5 text-right">Doanh số đội</th><th className="px-4 py-3.5 text-right">Tiền 30% tháng</th><th className="px-4 py-3.5 text-right">Tiền 70% kỳ</th><th className="px-4 py-3.5 text-right">{weekNo ? 'Chi tuần này' : 'Tổng thực nhận'}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {paginatedAllocationRows.map((row, index) => (
                        <tr key={`${row.memberPhone}-${row.teamName}-${index}`} className="hover:bg-slate-50/70">
                          <td className="px-4 py-3.5"><div className="font-semibold text-slate-900">{row.memberName}</div><div className="mt-0.5 text-xs text-slate-500">{row.memberPhone}</div></td>
                          <td className="px-4 py-3.5 text-slate-700">{row.teamName || 'Chưa gán đội'}</td>
                          <td className="px-4 py-3.5"><span className="rounded-md bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-700">{row.role || 'Thành viên'}</span></td>
                          <td className="px-4 py-3.5 text-center">
                            <label className="inline-flex cursor-pointer items-center justify-center p-1">
                              <input
                                type="checkbox"
                                checked={Boolean(row.eligible30)}
                                disabled={saving || Boolean(allocation?.meta.locked)}
                                onChange={() => void toggleAllocation30(row)}
                                className="h-4 w-4 rounded border-slate-300 text-blue-600 accent-blue-600 focus:ring-blue-500 disabled:opacity-50"
                                title={weekNo === 0 ? 'Tỷ lệ 30% mặc định cả tháng (áp dụng cho tất cả các tuần)' : `Tỷ lệ 30% riêng cho tuần ${weekNo}`}
                              />
                            </label>
                          </td>
                          <td className="px-4 py-3.5 text-center">
                            <label className="inline-flex cursor-pointer items-center justify-center p-1">
                              <input
                                type="checkbox"
                                checked={Boolean(row.eligible70)}
                                disabled={saving || Boolean(allocation?.meta.locked)}
                                onChange={() => void toggleAllocation70(row)}
                                className="h-4 w-4 rounded border-slate-300 text-emerald-600 accent-emerald-600 focus:ring-emerald-500 disabled:opacity-50"
                                title={weekNo === 0 ? 'Tỷ lệ 70% mặc định cả tháng (áp dụng cho tất cả các tuần)' : `Tỷ lệ 70% riêng cho tuần ${weekNo}`}
                              />
                            </label>
                          </td>
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
                        <tr>
                          <td colSpan={5} className="px-4 py-4">TỔNG CỘNG ({filteredAllocationRows.length} dòng)</td>
                          <td className="px-4 py-4 text-right tabular-nums text-slate-800">{money(allocation?.meta.totalSales || 0)}</td>
                          <td className="px-4 py-4 text-right tabular-nums text-violet-700">{money(filteredAllocationRows.reduce((sum, row) => sum + row.payout30, 0))}</td>
                          <td className="px-4 py-4 text-right tabular-nums text-amber-700">{money(filteredAllocationRows.reduce((sum, row) => sum + row.payout70, 0))}</td>
                          <td className="px-4 py-4 text-right tabular-nums text-emerald-700">{money(filteredAllocationRows.reduce((sum, row) => sum + (weekNo ? row.payout70 : row.total), 0))}</td>
                        </tr>
                      </tfoot>
                    )}
                  </table>
                  {totalAllocationPages > 1 && (
                    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-white px-4 py-3 text-xs text-slate-600">
                      <div>
                        Hiển thị {((allocationPage - 1) * allocationPageSize) + 1} - {Math.min(allocationPage * allocationPageSize, filteredAllocationRows.length)} trong {filteredAllocationRows.length} dòng
                      </div>
                      <div className="flex items-center gap-2">
                        <select
                          aria-label="Số dòng phân bổ mỗi trang"
                          value={allocationPageSize}
                          onChange={(e) => {
                            setAllocationPageSize(Number(e.target.value));
                            setAllocationPage(1);
                          }}
                          className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs"
                        >
                          <option value={30}>30 / trang</option>
                          <option value={50}>50 / trang</option>
                          <option value={100}>100 / trang</option>
                          <option value={0}>Tất cả</option>
                        </select>
                        <button
                          type="button"
                          disabled={allocationPage <= 1}
                          onClick={() => setAllocationPage((p) => Math.max(1, p - 1))}
                          className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-semibold disabled:opacity-40 hover:bg-slate-50 cursor-pointer"
                        >
                          Trước
                        </button>
                        <span className="text-xs font-medium">Trang {allocationPage} / {totalAllocationPages}</span>
                        <button
                          type="button"
                          disabled={allocationPage >= totalAllocationPages}
                          onClick={() => setAllocationPage((p) => Math.min(totalAllocationPages, p + 1))}
                          className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-semibold disabled:opacity-40 hover:bg-slate-50 cursor-pointer"
                        >
                          Sau
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
              {allocation?.meta.locked && <div className="flex items-center justify-between gap-3 border-t border-rose-100 bg-rose-50 px-4 py-3 text-xs font-medium text-rose-800"><span className="inline-flex items-center gap-2"><LockKeyhole className="h-4 w-4" /> Dữ liệu kỳ này đã chốt; bảng và bản Excel ở chế độ chỉ đọc.</span><span>{allocation.meta.lockedAt ? `Chốt lúc ${new Date(allocation.meta.lockedAt).toLocaleString('vi-VN')}` : ''}</span></div>}
            </section>
          </>
        )}

        {activeTab === 'reports' && (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-white p-2 shadow-xs">
              <button
                type="button"
                onClick={() => setReportSubTab('leaderboard')}
                className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition ${
                  reportSubTab === 'leaderboard'
                    ? 'bg-amber-500 text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <Trophy className="h-4 w-4" /> Bảng xếp hạng thi đua & Vinh danh doanh số
              </button>
              <button
                type="button"
                onClick={() => setReportSubTab('contracts')}
                className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition ${
                  reportSubTab === 'contracts'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <Receipt className="h-4 w-4" /> Tra cứu hợp đồng & Chi tiết phân bổ
              </button>
            </div>

            {reportSubTab === 'leaderboard' ? (
              <LeaderboardManagement initialMonth={month} />
            ) : (
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
                          {paginatedContracts.map((contract) => (
                            <tr key={contract.id} onClick={() => void loadContractBreakdown(contract.id)} className={`cursor-pointer transition hover:bg-blue-50/70 ${selectedContract === contract.id ? 'bg-blue-50' : ''}`}>
                              <td className="px-4 py-3 font-semibold text-blue-700">{contract.contract_code || `HĐ #${contract.id}`}</td><td className="px-4 py-3 text-slate-800">{contract.customer_name}</td><td className="px-4 py-3 whitespace-nowrap text-slate-500">{shortDate(contract.contract_date)}</td><td className="px-4 py-3 text-slate-600">{contract.team_name || 'Chưa gán đội'}</td><td className="px-4 py-3 text-right font-semibold tabular-nums">{money(contract.value)}</td><td className="px-4 py-3 text-slate-500">{contract.weekNo}</td>
                            </tr>
                          ))}
                          {!filteredContracts.length && <tr><td colSpan={6} className="px-4 py-14 text-center text-sm text-slate-500">Không có hợp đồng trong kỳ lọc.</td></tr>}
                        </tbody>
                      </table>
                      {totalReportPages > 1 && (
                        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-white px-4 py-3 text-xs text-slate-600">
                          <div>
                            Hiển thị {((reportPage - 1) * reportPageSize) + 1} - {Math.min(reportPage * reportPageSize, filteredContracts.length)} trong {filteredContracts.length} hợp đồng
                          </div>
                          <div className="flex items-center gap-2">
                            <select
                              aria-label="Số dòng hợp đồng mỗi trang"
                              value={reportPageSize}
                              onChange={(e) => {
                                setReportPageSize(Number(e.target.value));
                                setReportPage(1);
                              }}
                              className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs"
                            >
                              <option value={30}>30 / trang</option>
                              <option value={50}>50 / trang</option>
                              <option value={100}>100 / trang</option>
                              <option value={0}>Tất cả</option>
                            </select>
                            <button
                              type="button"
                              disabled={reportPage <= 1}
                              onClick={() => setReportPage((p) => Math.max(1, p - 1))}
                              className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-semibold disabled:opacity-40 hover:bg-slate-50 cursor-pointer"
                            >
                              Trước
                            </button>
                            <span className="text-xs font-medium">Trang {reportPage} / {totalReportPages}</span>
                            <button
                              type="button"
                              disabled={reportPage >= totalReportPages}
                              onClick={() => setReportPage((p) => Math.min(totalReportPages, p + 1))}
                              className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-semibold disabled:opacity-40 hover:bg-slate-50 cursor-pointer"
                            >
                              Sau
                            </button>
                          </div>
                        </div>
                      )}
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
