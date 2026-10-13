export interface OperationsFundBeneficiary {
  id: number;
  department_key: string;
  fund_key: string;
  fund_source: string;
  department: string;
  full_name: string;
  phone: string;
  bank_account: string;
  bank_name: string;
  weekly_rate: number;
  monthly_rate: number;
  effective_from: string;
}

export const DEFAULT_OPERATIONS_FUND_BENEFICIARIES = [
  {
    department_key: 'connection_deputy',
    fund_key: 'operations',
    fund_source: 'Quỹ vận hành',
    department: 'Tri ân kết nối phó tổng',
    full_name: 'Nguyễn Thị Hương Thảo',
    phone: '',
    bank_account: '',
    bank_name: '',
    weekly_rate: 0.005,
    monthly_rate: 0.005,
  },
  {
    department_key: 'executive',
    fund_key: 'operations',
    fund_source: 'Quỹ vận hành',
    department: 'Tổng điều hành',
    full_name: 'Đinh Văn Bắc',
    phone: '',
    bank_account: '',
    bank_name: '',
    weekly_rate: 0.005,
    monthly_rate: 0.005,
  },
  {
    department_key: 'deputy_general',
    fund_key: 'operations',
    fund_source: 'Quỹ vận hành',
    department: 'Phó tổng',
    full_name: 'Vũ Thị Cúc',
    phone: '',
    bank_account: '',
    bank_name: '',
    weekly_rate: 0.012,
    monthly_rate: 0.012,
  },
  {
    department_key: 'support_cn',
    fund_key: 'support_cn',
    fund_source: 'BP hỗ trợ CN',
    department: 'Quỹ hỗ trợ & dự phòng (CN)',
    full_name: 'Nguyễn Đăng An',
    phone: '',
    bank_account: '',
    bank_name: '',
    weekly_rate: 0.002,
    monthly_rate: 0.002,
  },
  {
    department_key: 'support_kt',
    fund_key: 'support_kt',
    fund_source: 'BP hỗ trợ KT',
    department: 'Quỹ hỗ trợ & dự phòng (KT)',
    full_name: '',
    phone: '',
    bank_account: '',
    bank_name: '',
    weekly_rate: 0.001,
    monthly_rate: 0.001,
  },
] as const;
