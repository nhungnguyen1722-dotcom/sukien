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
