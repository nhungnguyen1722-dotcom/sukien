/**
 * Thư viện chuẩn hóa các công thức và quy tắc phân bổ tài chính
 * Dựa trên tệp dữ liệu gốc: Tong-hop-DNTT-T9-T10.xlsx
 */

// ============================================================================
// 1. QUY TẮC PHÂN BỔ HỢP ĐỒNG & HỢP ĐỒNG BẤT ĐỘNG SẢN (BĐS)
// ============================================================================

/** Tỷ lệ phân bổ cho hợp đồng BĐS: 4/15 giá trị hợp đồng */
export const BDS_ALLOCATION_NUMERATOR = 4;
export const BDS_ALLOCATION_DENOMINATOR = 15;
export const BDS_ALLOCATION_FACTOR = BDS_ALLOCATION_NUMERATOR / BDS_ALLOCATION_DENOMINATOR; // ~0.26666666666666666

/**
 * Kiểm tra xem loại hợp đồng có thuộc loại BĐS (Bất động sản) hay không
 */
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

/**
 * Tính giá trị phân bổ chuẩn cho hợp đồng:
 * - Hợp đồng BĐS: nhân với hệ số 4/15 và làm tròn
 * - Hợp đồng khác: giữ nguyên 100% giá trị
 */
export function calculateContractAllocatedValue(value: number, contractType?: string | null): number {
  const numValue = Number(value || 0);
  if (isBdsContract(contractType)) {
    return Math.round((numValue * BDS_ALLOCATION_NUMERATOR) / BDS_ALLOCATION_DENOMINATOR);
  }
  return Math.round(numValue);
}

/**
 * Đoạn SQL CASE chuẩn để tính giá trị phân bổ cho hợp đồng trong truy vấn PostgreSQL
 */
export const CONTRACT_ALLOCATED_VALUE_SQL = `
  CASE
    WHEN UPPER(TRIM(COALESCE(contract_type, ''))) IN ('BĐS', 'BDS', 'BẤT ĐỘNG SẢN', 'BAT DONG SAN')
      THEN ROUND((COALESCE(value, 0) * 4.0) / 15.0)
    ELSE COALESCE(value, 0)
  END::float8
`;

// ============================================================================
// 2. MỐC THỜI GIAN VÀ BỘ LỌC THÁNG 10/2026
// ============================================================================

/**
 * Ngày kết thúc của Tuần 5 Tháng 9: 02/10/2026.
 * Các hợp đồng từ ngày 02/10/2026 trở về trước ĐÃ tính vào Tuần 5 Tháng 9,
 * hoàn toàn LOẠI BỎ khỏi Tháng 10.
 */
export const OCTOBER_2026_CUTOFF_DATE = '2026-10-02';

/**
 * Ngày bắt đầu tính dữ liệu cho Tháng 10: 03/10/2026.
 */
export const OCTOBER_2026_START_DATE = '2026-10-03';

/**
 * Kiểm tra xem một ngày hợp đồng có hợp lệ thuộc Tháng 10 hay không
 */
export function isDateInOctoberPeriod(contractDate: string | null | undefined): boolean {
  if (!contractDate) return false;
  const dateOnly = contractDate.slice(0, 10);
  // Loại bỏ hoàn toàn hợp đồng từ ngày 02/10/2026 trở về trước
  return dateOnly >= OCTOBER_2026_START_DATE;
}

// ============================================================================
// 3. CÔNG THỨC QUỸ LEADER TEAM (2,9% DOANH SỐ)
// ============================================================================

export const TEAMLEAD_FUND_RATE = 0.029; // 2.9% trên doanh số HĐ
export const TEAMLEAD_SHARE_30 = 0.30;  // 30% quỹ chia đều theo tháng
export const TEAMLEAD_SHARE_70 = 0.70;  // 70% quỹ chia theo hiệu quả doanh số tuần

/**
 * Trọng số các chức danh TeamLead trong quỹ 70%
 */
export const TEAMLEAD_ROLE_WEIGHTS = {
  GIAM_DOC: 0.50,       // 50%
  PHO_GIAM_DOC: 0.30,   // 30%
  TRUONG_PHONG: 0.20,   // 20%
} as const;

export function normalizeTeamLeadRole(role: string): 'Giám đốc' | 'Phó Giám đốc' | 'Trưởng phòng' | '' {
  const norm = role.trim().toLocaleLowerCase('vi-VN');
  if (norm.includes('giám đốc') && (norm.startsWith('p.') || norm.includes('phó') || norm.includes('pgd'))) {
    return 'Phó Giám đốc';
  }
  if (norm.includes('giám đốc') || norm.includes('gd')) {
    return 'Giám đốc';
  }
  if (norm.includes('trưởng phòng') || norm.includes('tp')) {
    return 'Trưởng phòng';
  }
  return '';
}

/**
 * Phân bổ quỹ 70% theo hiệu quả doanh số của một đội nhóm:
 * - Tỷ lệ: Giám đốc 50%, Phó Giám đốc 30%, Trưởng phòng 20%
 * - Nếu khuyết Phó Giám đốc: phần 30% chuyển dồn cho Giám đốc (50% + 30% = 80%)
 * - Nếu khuyết Giám đốc: phần 50% chuyển dồn cho Phó Giám đốc (30% + 50% = 80%)
 * - Nếu cùng cấp có nhiều người: chia đều tỷ lệ của cấp đó
 */
export function calculateTeam70PayoutMap(
  teamSales: number,
  fundRate: number = TEAMLEAD_FUND_RATE,
  candidates: Array<{ memberTeamId: number; role: string }>
): Map<number, number> {
  const payouts = new Map<number, number>();
  if (!teamSales || !candidates.length) return payouts;

  const pool70 = teamSales * fundRate * TEAMLEAD_SHARE_70;

  const countGd = candidates.filter((c) => normalizeTeamLeadRole(c.role) === 'Giám đốc').length;
  const countPgd = candidates.filter((c) => normalizeTeamLeadRole(c.role) === 'Phó Giám đốc').length;
  const countTp = candidates.filter((c) => normalizeTeamLeadRole(c.role) === 'Trưởng phòng').length;

  const tongWTeam =
    (countGd > 0 ? (TEAMLEAD_ROLE_WEIGHTS.GIAM_DOC + (countPgd === 0 ? TEAMLEAD_ROLE_WEIGHTS.PHO_GIAM_DOC : 0)) : 0) +
    (countPgd > 0 ? (TEAMLEAD_ROLE_WEIGHTS.PHO_GIAM_DOC + (countGd === 0 ? TEAMLEAD_ROLE_WEIGHTS.GIAM_DOC : 0)) : 0) +
    (countTp > 0 ? TEAMLEAD_ROLE_WEIGHTS.TRUONG_PHONG : 0);

  if (tongWTeam <= 0) return payouts;

  for (const c of candidates) {
    const role = normalizeTeamLeadRole(c.role);
    let wCanhan = 0;
    let soNguoi = 1;

    if (role === 'Giám đốc') {
      wCanhan = TEAMLEAD_ROLE_WEIGHTS.GIAM_DOC + (countPgd === 0 ? TEAMLEAD_ROLE_WEIGHTS.PHO_GIAM_DOC : 0);
      soNguoi = countGd;
    } else if (role === 'Phó Giám đốc') {
      wCanhan = TEAMLEAD_ROLE_WEIGHTS.PHO_GIAM_DOC + (countGd === 0 ? TEAMLEAD_ROLE_WEIGHTS.GIAM_DOC : 0);
      soNguoi = countPgd;
    } else if (role === 'Trưởng phòng') {
      wCanhan = TEAMLEAD_ROLE_WEIGHTS.TRUONG_PHONG;
      soNguoi = countTp;
    }

    if (wCanhan > 0 && soNguoi > 0) {
      const share = Math.round((pool70 * (wCanhan / soNguoi)) / tongWTeam);
      payouts.set(c.memberTeamId, share);
    }
  }

  return payouts;
}

// ============================================================================
// 4. CÔNG THỨC QUỸ VẬN HÀNH & BỘ PHẬN HỖ TRỢ (2,5% DOANH SỐ)
// ============================================================================

export const OPERATIONS_TOTAL_RATE = 0.025;      // 2.5% tổng quỹ
export const OPERATIONS_FUND_RATE = 0.022;       // 2.2% Quỹ vận hành
export const SUPPORT_CN_FUND_RATE = 0.002;       // 0.2% Bộ phận hỗ trợ CN
export const SUPPORT_KT_FUND_RATE = 0.001;       // 0.1% Bộ phận hỗ trợ KT

/** Tỷ lệ nội bộ của Quỹ Vận hành (2,2%): */
export const OPERATIONS_SUB_RATES = {
  PHO_TONG: 0.012,                    // 1.2% (Vũ Thị Cúc)
  TONG_DIEU_HANH: 0.005,              // 0.5% (Đinh Văn Bắc)
  TRI_AN_KET_NOI_PHO_TONG: 0.005,     // 0.5% (Nguyễn Thị Hương Thảo)
} as const;

/**
 * Tính toán chi tiết Quỹ Vận hành & Hỗ trợ theo doanh số hợp đồng
 */
export function calculateOperationsSupportFunds(contractRevenue: number) {
  const base = Math.max(0, Number(contractRevenue || 0));
  const totalFund = Math.round(base * OPERATIONS_TOTAL_RATE);
  const operationsFund = Math.round(base * OPERATIONS_FUND_RATE);
  const supportCnFund = Math.round(base * SUPPORT_CN_FUND_RATE);
  const supportKtFund = Math.round(base * SUPPORT_KT_FUND_RATE);

  const phoTong = Math.round(base * OPERATIONS_SUB_RATES.PHO_TONG);
  const tongDieuHanh = Math.round(base * OPERATIONS_SUB_RATES.TONG_DIEU_HANH);
  const triAnKetNoi = Math.round(base * OPERATIONS_SUB_RATES.TRI_AN_KET_NOI_PHO_TONG);

  return {
    contractRevenue: base,
    totalFund,
    operationsFund,
    supportCnFund,
    supportKtFund,
    details: {
      phoTong,
      tongDieuHanh,
      triAnKetNoi,
      supportCn: supportCnFund,
      supportKt: supportKtFund,
    },
  };
}

// ============================================================================
// 5. TOÀN BỘ 12 ĐỊNH MỨC PHÂN BỔ TRÊN DOANH SỐ THEO TAB 1. CHÍNH SÁCH (15%)
// ============================================================================

export const TOTAL_BUDGET_RATE = 0.15; // 15% tổng ngân sách phân bổ

export const STANDARD_FUND_RATES = {
  direct_sale: 0.06,           // 6.0%  Sale trực tiếp - Pro sale (Nguồn khách)
  tribute_connection: 0.01,    // 1.0%  Tri ân kết nối sale trực tiếp
  tribute_support: 0.005,      // 0.5%  Tri ân hỗ trợ sale
  tribute_referral: 0.000,     // 0.0%  Tri ân giới thiệu
  event_close: 0.005,          // 0.5%  Quỹ Sự kiện & Chốt hợp đồng
  customer_care: 0.002,        // 0.2%  Quỹ Chăm sóc khách hàng
  training: 0.003,             // 0.3%  Quỹ Đào tạo Chuyên môn & Kỹ năng
  incentive: 0.008,            // 0.8%  Quỹ Thi đua & Chương trình thúc đẩy
  travel: 0.003,               // 0.3%  Chi phí Công tác phí
  operations: 0.022,           // 2.2%  Quỹ Vận hành
  support_kt: 0.001,           // 0.1%  BP hỗ trợ KT
  support_cn: 0.002,           // 0.2%  BP hỗ trợ CN
  leader: 0.029,               // 2.9%  Leader team - giám đốc Kd
} as const;

export type StandardFundKey = keyof typeof STANDARD_FUND_RATES;

/**
 * Tính định mức của từng quỹ theo doanh số hợp đồng
 */
export function calculateAllFundAllocations(contractRevenue: number) {
  const base = Math.max(0, Number(contractRevenue || 0));
  const totalOperatingBudget = Math.round(base * TOTAL_BUDGET_RATE);

  const allocations: Record<StandardFundKey, number> = {} as any;
  for (const [key, rate] of Object.entries(STANDARD_FUND_RATES)) {
    allocations[key as StandardFundKey] = Math.round(base * rate);
  }

  return {
    contractRevenue: base,
    totalOperatingBudget,
    allocations,
  };
}

// ============================================================================
// 6. PHÂN BỔ NHÂN SỰ THỤ HƯỞNG THEO HỢP ĐỒNG (QUỸ VẬN HÀNH & TEAMLEAD)
// ============================================================================

export interface DetailedBeneficiaryLine {
  source: string;
  calculation: string;
  amount: number;
}

export interface DetailedBeneficiary {
  name: string;
  amount: number;
  phone?: string | null;
  bank_account?: string | null;
  bank_name?: string | null;
  lines: DetailedBeneficiaryLine[];
}

/** Danh sách thành viên/bộ phận thụ hưởng cố định Quỹ Vận hành & Hỗ trợ (2,5%) */
export const OPERATIONS_BENEFICIARIES_ROSTER = [
  {
    department: 'Tri ân kết nối phó tổng',
    fullName: 'Nguyễn Thị Hương Thảo',
    phone: '000006',
    bankAccount: '0965749223',
    bankName: 'Vpbank',
    rate: 0.005,
    fundSource: 'Quỹ vận hành → Tri ân kết nối phó tổng',
  },
  {
    department: 'Tổng điều hành',
    fullName: 'Đinh Văn Bắc',
    phone: '000007',
    bankAccount: '19033903936017',
    bankName: 'Techcombank',
    rate: 0.005,
    fundSource: 'Quỹ vận hành → Tổng điều hành',
  },
  {
    department: 'Phó tổng',
    fullName: 'Vũ Thị Cúc',
    phone: '0889225989',
    bankAccount: '2589225989',
    bankName: 'Techcombank',
    rate: 0.012,
    fundSource: 'Quỹ vận hành → Phó tổng',
  },
  {
    department: 'Quỹ hỗ trợ & dự phòng (CN)',
    fullName: 'Nguyễn Đăng An',
    phone: '0343781580',
    bankAccount: '183093983',
    bankName: 'VP Bank',
    rate: 0.002,
    fundSource: 'Quỹ hỗ trợ & dự phòng → BP hỗ trợ CN',
  },
  {
    department: 'Quỹ hỗ trợ & dự phòng (KT)',
    fullName: 'Quỹ hỗ trợ & dự phòng (KT)',
    phone: '',
    bankAccount: '',
    bankName: '',
    rate: 0.001,
    fundSource: 'Quỹ hỗ trợ & dự phòng → BP hỗ trợ KT',
  },
] as const;

/** Cấu hình lãnh đạo các đội nhóm cho quỹ hiệu quả TeamLead 70% */
export const TEAM_LEADER_ROSTER: Record<string, Array<{
  name: string;
  role: string;
  share70: number;
  phone?: string;
  bankAccount?: string;
  bankName?: string;
}>> = {
  'ong vang': [
    { name: 'Nguyễn Hùng Vĩ', role: 'Giám đốc Đội Ong Vàng', share70: 0.50, phone: '0326894993', bankAccount: '31978686868', bankName: 'Techcombank' },
    { name: 'Phạm Minh Tuấn', role: 'Phó Giám đốc Đội Ong Vàng', share70: 0.30, phone: '0768635148' },
    { name: 'Vũ Hùng Vỹ', role: 'Trưởng phòng Đội Ong Vàng', share70: 0.10, phone: '0984065555' },
    { name: 'Diệp Thị Huế', role: 'Trưởng phòng Đội Ong Vàng', share70: 0.10, phone: '0915095848' },
  ],
  'loc phat': [
    { name: 'Nguyễn Hùng Vĩ', role: 'Giám đốc Đội Lộc Phát', share70: 0.50, phone: '0326894993', bankAccount: '31978686868', bankName: 'Techcombank' },
    { name: 'Phượng Ngọc Thu', role: 'Trưởng phòng Đội Lộc Phát', share70: 0.50, phone: '0969881698' },
  ],
  'kien vang': [
    { name: 'Nguyễn Hùng Vĩ', role: 'Giám đốc Đội Kiến Vàng', share70: 0.50, phone: '0326894993', bankAccount: '31978686868', bankName: 'Techcombank' },
    { name: 'Cung Thu Hà', role: 'Trưởng phòng Đội Kiến Vàng', share70: 0.25, phone: '0965759559' },
    { name: 'Phượng Ngọc Thu', role: 'Trưởng phòng Đội Kiến Vàng', share70: 0.25, phone: '0969881698' },
  ],
  'happy': [
    { name: 'Vũ Thị Cúc', role: 'Giám đốc Đội Happy', share70: 0.50, phone: '0889225989', bankAccount: '2589225989', bankName: 'Techcombank' },
    { name: 'Nguyễn Đức Vĩnh', role: 'Phó Giám đốc Đội Happy', share70: 0.30, phone: '0984398568' },
    { name: 'Hoàng Thị Chích', role: 'Trưởng phòng Đội Happy', share70: 0.20, phone: '0384081272' },
  ],
  'thanh cong': [
    { name: 'Nguyễn Hùng Vĩ', role: 'Giám đốc Đội Thành Công', share70: 1.00, phone: '0326894993', bankAccount: '31978686868', bankName: 'Techcombank' },
  ],
  'kim cuong': [
    { name: 'Nguyễn Hùng Vĩ', role: 'Giám đốc Đội Biệt đội Kim Cương', share70: 0.50, phone: '0326894993', bankAccount: '31978686868', bankName: 'Techcombank' },
    { name: 'Dương Hồng Phương', role: 'Trưởng phòng Đội Biệt đội Kim Cương', share70: 0.50, phone: '0979345229' },
  ],
  'thinh vuong': [
    { name: 'Vũ Thị Cúc', role: 'Giám đốc Đội Thịnh Vượng', share70: 0.50, phone: '0889225989', bankAccount: '2589225989', bankName: 'Techcombank' },
    { name: 'Phạm Thị Hương', role: 'Giám đốc Đội Thịnh Vượng', share70: 0.50, phone: '0947876133' },
  ],
  'hai dang vang': [
    { name: 'Nguyễn Hùng Vĩ', role: 'Giám đốc Đội Hải Đăng Vàng', share70: 1.00, phone: '0326894993', bankAccount: '31978686868', bankName: 'Techcombank' },
  ],
};

export function resolveContractTeamName(teamName?: string | null, customerName?: string | null): string {
  if (teamName && teamName.trim()) return teamName.trim();
  const cust = (customerName || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/gi, 'd')
    .toLowerCase();
  if (cust.includes('thoa') || cust.includes('le thi thao') || cust.includes('nguyen hung vi')) return 'Thành Công';
  if (cust.includes('lan huong') || cust.includes('thanh phuong') || cust.includes('doan') || cust.includes('minh') || cust.includes('chich') || cust.includes('loan') || cust.includes('long') || cust.includes('nguyen thi cuc')) return 'Happy';
  if (cust.includes('dau') || cust.includes('hung vy') || cust.includes('my') || cust.includes('trang') || cust.includes('huong') || cust.includes('thu')) return 'Ong Vàng';
  if (cust.includes('dieu') || cust.includes('ha')) return 'Kiến Vàng';
  if (cust.includes('thang')) return 'Lộc Phát';
  if (cust.includes('phuong')) return 'Biệt đội Kim Cương';
  return '';
}

export function getTeamLeaders(teamName?: string | null, customerName?: string | null) {
  const resolved = resolveContractTeamName(teamName, customerName);
  const norm = resolved
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/gi, 'd')
    .trim();
  for (const [key, roster] of Object.entries(TEAM_LEADER_ROSTER)) {
    if (norm.includes(key)) return roster;
  }
  return TEAM_LEADER_ROSTER['thanh cong'];
}

function formatVndAmount(value: number): string {
  return `${new Intl.NumberFormat('vi-VN').format(Math.round(value))} ₫`;
}

/**
 * Tính toán danh sách đầy đủ nhân sự thụ hưởng của một hợp đồng
 * Gồm:
 * 1. Phí hoa hồng hợp đồng: Sale trực tiếp (6%), Tri ân kết nối (1%), Tri ân hỗ trợ (0,5%)
 * 2. Quỹ vận hành & hỗ trợ (2,5%): 5 thành viên/bộ phận
 * 3. Quỹ TeamLead (2,9% × 70%): Lãnh đạo đội nhóm tương ứng
 */
export function calculateContractAllBeneficiaries(contract: {
  id?: number;
  contract_code?: string | null;
  customer_name?: string | null;
  value: number;
  contract_type?: string | null;
  allocated_value?: number;
  closer_name?: string | null;
  closer_fee?: number | null;
  referrer_name?: string | null;
  referrer_fee?: number | null;
  supporter_name?: string | null;
  supporter_fee?: number | null;
  team_name?: string | null;
}): DetailedBeneficiary[] {
  const contractBase = Number(
    contract.allocated_value ?? calculateContractAllocatedValue(contract.value, contract.contract_type)
  );
  if (!contractBase || contractBase <= 0) return [];

  type RawItem = {
    name: string;
    amount: number;
    phone?: string | null;
    bankAccount?: string | null;
    bankName?: string | null;
    source: string;
    calculation: string;
    priority: number;
  };

  const rawItems: RawItem[] = [];

  // 1. Phí hoa hồng bán hàng trực tiếp trên hợp đồng
  const closerName = (contract.closer_name || '').trim();
  if (closerName) {
    const fee = contract.closer_fee && contract.closer_fee > 0 ? Number(contract.closer_fee) : Math.round(contractBase * 0.06);
    rawItems.push({
      name: closerName,
      amount: fee,
      source: 'Sale trực tiếp · chốt sale',
      calculation: contract.closer_fee && contract.closer_fee > 0
        ? `Phí được ghi trên hợp đồng: ${formatVndAmount(fee)} (6% × ${formatVndAmount(contractBase)})`
        : `6% × ${formatVndAmount(contractBase)} = ${formatVndAmount(fee)}`,
      priority: 1,
    });
  }

  const referrerName = (contract.referrer_name || '').trim();
  if (referrerName) {
    const fee = contract.referrer_fee && contract.referrer_fee > 0 ? Number(contract.referrer_fee) : Math.round(contractBase * 0.01);
    rawItems.push({
      name: referrerName,
      amount: fee,
      source: 'Tri ân kết nối sale trực tiếp · giới thiệu sale',
      calculation: contract.referrer_fee && contract.referrer_fee > 0
        ? `Phí được ghi trên hợp đồng: ${formatVndAmount(fee)} (1% × ${formatVndAmount(contractBase)})`
        : `1% × ${formatVndAmount(contractBase)} = ${formatVndAmount(fee)}`,
      priority: 2,
    });
  }

  const supporterName = (contract.supporter_name || '').trim();
  if (supporterName) {
    const fee = contract.supporter_fee && contract.supporter_fee > 0 ? Number(contract.supporter_fee) : Math.round(contractBase * 0.005);
    rawItems.push({
      name: supporterName,
      amount: fee,
      source: 'Tri ân hỗ trợ sale',
      calculation: contract.supporter_fee && contract.supporter_fee > 0
        ? `Phí được ghi trên hợp đồng: ${formatVndAmount(fee)} (0,5% × ${formatVndAmount(contractBase)})`
        : `0,5% × ${formatVndAmount(contractBase)} = ${formatVndAmount(fee)}`,
      priority: 3,
    });
  }

  // 2. Quỹ vận hành & hỗ trợ (2,5%): 5 thành viên/bộ phận niêm yết
  for (const row of OPERATIONS_BENEFICIARIES_ROSTER) {
    const amount = Math.round(contractBase * row.rate);
    const ratePercent = `${(row.rate * 100).toLocaleString('vi-VN', { maximumFractionDigits: 1 })}%`;
    rawItems.push({
      name: row.fullName,
      amount,
      phone: row.phone || null,
      bankAccount: row.bankAccount || null,
      bankName: row.bankName || null,
      source: row.fundSource,
      calculation: `${ratePercent} × ${formatVndAmount(contractBase)} = ${formatVndAmount(amount)}`,
      priority: 10,
    });
  }

  // 3. Quỹ TeamLead (2,9% × 70% = 2,03% quỹ hiệu quả tuần)
  const pool70 = Math.round(contractBase * TEAMLEAD_FUND_RATE * TEAMLEAD_SHARE_70);
  if (pool70 > 0) {
    const leaders = getTeamLeaders(contract.team_name, contract.customer_name);
    for (const leader of leaders) {
      const leaderAmount = Math.round(pool70 * leader.share70);
      const sharePercent = `${(leader.share70 * 100).toLocaleString('vi-VN', { maximumFractionDigits: 1 })}%`;
      rawItems.push({
        name: leader.name,
        amount: leaderAmount,
        phone: leader.phone || null,
        bankAccount: leader.bankAccount || null,
        bankName: leader.bankName || null,
        source: `Quỹ TeamLead · Quỹ hiệu quả (${leader.role})`,
        calculation: `${sharePercent} × (2,9% × 70% × ${formatVndAmount(contractBase)}) = ${formatVndAmount(leaderAmount)}`,
        priority: 5,
      });
    }
  }

  // 4. Nhóm theo tên nhân sự và tổng hợp các nguồn/công thức tính
  const normalizeKey = (val: string) => val
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/gi, 'd')
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');

  const grouped = new Map<string, {
    name: string;
    amount: number;
    phone?: string | null;
    bank_account?: string | null;
    bank_name?: string | null;
    lines: DetailedBeneficiaryLine[];
    minPriority: number;
  }>();

  for (const item of rawItems) {
    if (!item.name || item.amount <= 0) continue;
    const key = normalizeKey(item.name);
    const existing = grouped.get(key);
    if (!existing) {
      grouped.set(key, {
        name: item.name,
        amount: item.amount,
        phone: item.phone,
        bank_account: item.bankAccount,
        bank_name: item.bankName,
        lines: [{
          source: item.source,
          calculation: item.calculation,
          amount: item.amount,
        }],
        minPriority: item.priority,
      });
    } else {
      existing.amount += item.amount;
      existing.lines.push({
        source: item.source,
        calculation: item.calculation,
        amount: item.amount,
      });
      if (item.bankAccount && !existing.bank_account) existing.bank_account = item.bankAccount;
      if (item.bankName && !existing.bank_name) existing.bank_name = item.bankName;
      if (item.phone && !existing.phone) existing.phone = item.phone;
      if (item.priority < existing.minPriority) existing.minPriority = item.priority;
    }
  }

  return Array.from(grouped.values())
    .sort((a, b) => a.minPriority - b.minPriority || b.amount - a.amount)
    .map(({ name, amount, phone, bank_account, bank_name, lines }) => ({
      name,
      amount,
      phone,
      bank_account,
      bank_name,
      lines,
    }));
}

/**
 * Bóc tách và giải trình chi tiết từng thành phần hoa hồng cho một nhân sự nhận số tiền cụ thể
 * Đảm bảo tổng các dòng giải trình luôn khớp 100% với số tiền nhận được trên bảng kê.
 */
export function decomposeBeneficiarySource(
  contract: {
    customer_name?: string | null;
    value: number;
    allocated_value?: number;
    contract_type?: string | null;
    team_name?: string | null;
    closer_name?: string | null;
    closer_fee?: number | null;
    referrer_name?: string | null;
    referrer_fee?: number | null;
    supporter_name?: string | null;
    supporter_fee?: number | null;
  },
  personName: string,
  targetAmount: number,
  sourceSheet?: string,
  sourceRow?: number
): DetailedBeneficiaryLine[] {
  const roundedTarget = Math.round(Number(targetAmount || 0));
  if (roundedTarget <= 0) return [];

  const contractBase = Number(
    contract.allocated_value ?? calculateContractAllocatedValue(contract.value, contract.contract_type)
  );

  const normalizeKey = (val?: string | null) => (val || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/gi, 'd')
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');

  const namesMatch = (a?: string | null, b?: string | null) => {
    if (!a || !b) return false;
    const normA = normalizeKey(a).replace(/y/g, 'i');
    const normB = normalizeKey(b).replace(/y/g, 'i');
    if (normA === normB) return true;
    if (normA.replace(' huong ', ' ') === normB || normB.replace(' huong ', ' ') === normA) return true;
    if (normA.replace(' thi ', ' ') === normB || normB.replace(' thi ', ' ') === normA) return true;
    if (normA.replace('trang', 'tran') === normB.replace('trang', 'tran')) return true;
    return false;
  };

  const lines: DetailedBeneficiaryLine[] = [];
  const currentTotal = () => lines.reduce((sum, l) => sum + l.amount, 0);

  // 1. Phí bán hàng trực tiếp (Closer 6%, Referrer 1%, Supporter 0.5%)
  if (namesMatch(contract.closer_name, personName)) {
    const fee = contract.closer_fee && contract.closer_fee > 0 ? Number(contract.closer_fee) : Math.round(contractBase * 0.06);
    const rem = roundedTarget - currentTotal();
    if (fee > 0 && fee <= rem) {
      lines.push({
        source: 'Sale trực tiếp · chốt sale (6%)',
        calculation: `6% × ${formatVndAmount(contractBase)} = ${formatVndAmount(fee)}`,
        amount: fee,
      });
    }
  }

  if (namesMatch(contract.referrer_name, personName)) {
    const fee = contract.referrer_fee && contract.referrer_fee > 0 ? Number(contract.referrer_fee) : Math.round(contractBase * 0.01);
    const rem = roundedTarget - currentTotal();
    if (fee > 0 && fee <= rem) {
      lines.push({
        source: 'Tri ân kết nối sale trực tiếp (1%)',
        calculation: `1% × ${formatVndAmount(contractBase)} = ${formatVndAmount(fee)}`,
        amount: fee,
      });
    }
  }

  if (namesMatch(contract.supporter_name, personName)) {
    const fee = contract.supporter_fee && contract.supporter_fee > 0 ? Number(contract.supporter_fee) : Math.round(contractBase * 0.005);
    const rem = roundedTarget - currentTotal();
    if (fee > 0 && fee <= rem) {
      lines.push({
        source: 'Tri ân hỗ trợ sale (0,5%)',
        calculation: `0,5% × ${formatVndAmount(contractBase)} = ${formatVndAmount(fee)}`,
        amount: fee,
      });
    }
  }

  // 2. Quỹ vận hành & hỗ trợ (2,5%)
  const opsRoster = [
    { name: 'Vũ Thị Cúc', source: 'Quỹ vận hành → Phó tổng (1,2%)', rate: 0.012 },
    { name: 'Nguyễn Thị Hương Thảo', source: 'Quỹ vận hành → Tri ân kết nối phó tổng (0,5%)', rate: 0.005 },
    { name: 'Đinh Văn Bắc', source: 'Quỹ vận hành → Tổng điều hành (0,5%)', rate: 0.005 },
    { name: 'Nguyễn Đăng An', source: 'Quỹ hỗ trợ & dự phòng → BP hỗ trợ CN (0,2%)', rate: 0.002 },
    { name: 'Quỹ hỗ trợ & dự phòng (KT)', source: 'Quỹ hỗ trợ & dự phòng → BP hỗ trợ KT (0,1%)', rate: 0.001 },
  ];

  for (const op of opsRoster) {
    if (namesMatch(op.name, personName)) {
      const amount = Math.round(contractBase * op.rate);
      const rem = roundedTarget - currentTotal();
      if (amount > 0 && amount <= rem) {
        lines.push({
          source: op.source,
          calculation: `${(op.rate * 100).toLocaleString('vi-VN', { maximumFractionDigits: 1 })}% × ${formatVndAmount(contractBase)} = ${formatVndAmount(amount)}`,
          amount,
        });
      }
    }
  }

  // 3. Quỹ TeamLead (2,9% × 70% hiệu quả)
  const pool70 = Math.round(contractBase * TEAMLEAD_FUND_RATE * TEAMLEAD_SHARE_70);
  if (pool70 > 0) {
    const leaders = getTeamLeaders(contract.team_name, contract.customer_name);
    for (const leader of leaders) {
      if (namesMatch(leader.name, personName)) {
        const leaderAmount = Math.round(pool70 * leader.share70);
        const rem = roundedTarget - currentTotal();
        if (leaderAmount > 0 && leaderAmount <= rem) {
          lines.push({
            source: `Quỹ TeamLead (${leader.role})`,
            calculation: `${(leader.share70 * 100).toLocaleString('vi-VN', { maximumFractionDigits: 1 })}% × (2,9% × 70% × ${formatVndAmount(contractBase)}) = ${formatVndAmount(leaderAmount)}`,
            amount: leaderAmount,
          });
        }
      }
    }
  }

  // 4. Nếu chưa bóc tách đủ targetAmount:
  let rem = roundedTarget - currentTotal();
  if (rem > 0) {
    // Kiểm tra xem phần còn lại có phải là khoản bán hàng 6%, 1% hoặc 0.5% chưa được nhận dạng
    const std6 = Math.round(contractBase * 0.06);
    const std1 = Math.round(contractBase * 0.01);
    const std05 = Math.round(contractBase * 0.005);

    if (rem >= std6 && !lines.some(l => l.source.includes('chốt sale'))) {
      lines.push({
        source: 'Sale trực tiếp · chốt sale (6%)',
        calculation: `6% × ${formatVndAmount(contractBase)} = ${formatVndAmount(std6)}`,
        amount: std6,
      });
      rem -= std6;
    } else if (rem >= std1 && !lines.some(l => l.source.includes('kết nối sale'))) {
      lines.push({
        source: 'Tri ân kết nối sale trực tiếp (1%)',
        calculation: `1% × ${formatVndAmount(contractBase)} = ${formatVndAmount(std1)}`,
        amount: std1,
      });
      rem -= std1;
    } else if (rem >= std05 && !lines.some(l => l.source.includes('hỗ trợ sale'))) {
      lines.push({
        source: 'Tri ân hỗ trợ sale (0,5%)',
        calculation: `0,5% × ${formatVndAmount(contractBase)} = ${formatVndAmount(std05)}`,
        amount: std05,
      });
      rem -= std05;
    }

    // Nếu vẫn còn khoản chênh lệch do phân bổ đặc thù bảng kê Excel
    if (rem > 0) {
      const refText = sourceSheet ? `${sourceSheet}${sourceRow ? ` · dòng ${sourceRow}` : ''}` : 'bảng kê Excel';
      lines.push({
        source: 'Phân bổ theo bảng kê thực tế',
        calculation: `Ghi nhận thực tế ${formatVndAmount(rem)} theo ${refText}`,
        amount: rem,
      });
    }
  }

  return lines;
}


