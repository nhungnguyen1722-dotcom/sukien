import fs from 'node:fs';
import path from 'node:path';
import * as XLSX from 'xlsx';

export interface WorkbookBeneficiary {
  name: string;
  amount: number;
  bank_account?: string | null;
  bank_name?: string | null;
}

export interface WorkbookContractDistribution {
  id: number;
  contract_code: string | null;
  contract_date: string;
  customer_name: string;
  value: number;
  allocated_value: number;
  closer_name: string;
  closer_phone: string;
  closer_fee: number;
  referrer_name: string;
  referrer_phone: string;
  referrer_fee: number;
  supporter_name: string;
  supporter_phone: string;
  supporter_fee: number;
  status: string;
  source_period_code: string;
  source_excel_row: number;
  source_sheet: string;
  source_beneficiaries: WorkbookBeneficiary[];
  unallocated_pool: number;
  distributed_commission: number;
  remaining_fund: number;
}

interface DatabaseContract {
  id: number;
  contract_code: string | null;
  contract_date: string;
  customer_name: string;
  value: number;
  allocated_value: number;
  closer_name: string;
  closer_phone: string;
  closer_fee: number;
  referrer_name: string;
  referrer_phone: string;
  referrer_fee: number;
  supporter_name: string;
  supporter_phone: string;
  supporter_fee: number;
  status: string;
}

interface WorkbookSource {
  fileName: string;
  periodCode: string;
  sheetLabel: string;
  weekNumber: number;
}

const SOURCES: WorkbookSource[] = [
  {
    fileName: 'DN_thanh_toan_HH_Tuan3_T9.xlsx',
    periodCode: '2026-09-W3',
    sheetLabel: 'Tuần 3',
    weekNumber: 3,
  },
  {
    fileName: 'DN_thanh_toan_HH_Tuan4_T9.xlsx',
    periodCode: '2026-09-W4',
    sheetLabel: 'Tuần 4',
    weekNumber: 4,
  },
  {
    fileName: 'DN_thanh_toan_HH_Tuan5_T9.xlsx',
    periodCode: '2026-09-W5',
    sheetLabel: 'Tuần 5',
    weekNumber: 5,
  },
];

const normalizeName = (value: string) => value
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/đ/gi, 'd')
  .toLocaleLowerCase('vi')
  .replace(/[^a-z0-9 ]/g, ' ')
  .trim()
  .replace(/\s+/g, ' ');

function namesMatch(left: string, right: string) {
  const a = normalizeName(left).split(' ');
  const b = normalizeName(right).split(' ');
  return a.length === b.length && a.every((part, index) => (
    part === b[index]
    || (part.length === 1 && b[index].startsWith(part))
    || (b[index].length === 1 && part.startsWith(b[index]))
  ));
}

function canonicalName(name: string, memberNames: string[]) {
  const normalized = normalizeName(name);
  const exact = memberNames.filter((candidate) => normalizeName(candidate) === normalized);
  if (exact.length === 1) return exact[0];

  const abbreviated = memberNames.filter((candidate) => namesMatch(name, candidate));
  return abbreviated.length === 1 ? abbreviated[0] : name.trim();
}

function parseMoney(value: unknown) {
  if (typeof value === 'number' && Number.isFinite(value)) return Math.round(value);
  const digits = String(value ?? '').replace(/[^\d-]/g, '');
  const parsed = Number(digits);
  return Number.isFinite(parsed) ? parsed : 0;
}

function toIsoDate(value: string) {
  const dmy = value.match(/(\d{1,2})[/.\-](\d{1,2})[/.\-](\d{4})/);
  if (dmy) return `${dmy[3]}-${dmy[2].padStart(2, '0')}-${dmy[1].padStart(2, '0')}`;
  const iso = value.match(/(\d{4})-(\d{2})-(\d{2})/);
  return iso ? `${iso[1]}-${iso[2]}-${iso[3]}` : null;
}

function parseContractDescription(value: unknown) {
  const lines = String(value ?? '').split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const dateText = lines.find((line) => /\d{1,2}[/.\-]\d{1,2}[/.\-]\d{4}/.test(line)) || '';
  const contractDate = toIsoDate(dateText);
  const valueLine = lines.find((line) => /giá\s*trị\s*:/i.test(line))
    || [...lines].reverse().find((line) => /\d[\d.,]*\d/.test(line) && !/\d{1,2}[/.\-]\d{1,2}[/.\-]\d{4}/.test(line));
  const contractValue = parseMoney(valueLine?.match(/(?:giá\s*trị\s*:\s*)?([\d.,]+)/i)?.[1] || valueLine);
  const customerLine = lines.find((line) => (
    !/\d{1,2}[/.\-]\d{1,2}[/.\-]\d{4}/.test(line)
    && !/giá\s*trị\s*:/i.test(line)
    && !/^\d[\d.,]*$/.test(line)
  )) || '';
  const customerName = customerLine
    .replace(/^[-–]\s*/, '')
    .replace(/^kh\s*:\s*/i, '')
    .trim();

  return { contractDate, customerName, contractValue };
}

function findDatabaseContract(
  source: { contract_date: string; customer_name: string; value: number },
  contracts: DatabaseContract[],
  usedIds: Set<number>,
) {
  const matches = contracts
    .filter((contract) => !usedIds.has(contract.id))
    .filter((contract) => Math.abs(Math.round(contract.allocated_value || contract.value) - source.value) <= 1)
    .map((contract) => {
      const nameMatch = namesMatch(contract.customer_name, source.customer_name);
      const dateMatch = contract.contract_date.slice(0, 10) === source.contract_date;
      return { contract, score: (nameMatch ? 4 : 0) + (dateMatch ? 2 : 0), matched: nameMatch || dateMatch };
    })
    .filter((match) => match.matched)
    .sort((a, b) => b.score - a.score);

  if (!matches.length || (matches[1] && matches[0].score === matches[1].score)) return undefined;
  usedIds.add(matches[0].contract.id);
  return matches[0].contract;
}

function readSource(source: WorkbookSource, memberNames: string[]) {
  const filePath = path.join(process.cwd(), 'imagedata', source.fileName);
  if (!fs.existsSync(filePath)) {
    return {
      contracts: [],
      warnings: [`Không tìm thấy file ${source.fileName}.`],
    };
  }
  const fileBuffer = fs.readFileSync(filePath);
  const workbook = XLSX.read(fileBuffer, { type: 'buffer', cellDates: false });
  const worksheetName = workbook.SheetNames[0];
  const worksheet = worksheetName ? workbook.Sheets[worksheetName] : undefined;
  if (!worksheet) throw new Error(`Không tìm thấy trang tính trong ${source.fileName}.`);

  const rows = XLSX.utils.sheet_to_json<unknown[]>(worksheet, { header: 1, defval: '', raw: false });
  const headerIndex = rows.findIndex((row) => String(row[0] ?? '').trim() === 'STT');
  if (headerIndex < 0) throw new Error(`Không tìm thấy bảng kê hợp đồng trong ${source.fileName}.`);

  const header = rows[headerIndex];
  const poolColumn = header.findIndex((cell) => String(cell).toLocaleLowerCase('vi').includes('tổng quỹ chưa chia'));
  const commissionColumn = header.findIndex((cell) => String(cell).toLocaleLowerCase('vi').includes('tổng hoa hồng chia'));
  const remainingColumn = header.findIndex((cell) => String(cell).toLocaleLowerCase('vi').includes('tổng quỹ còn lại'));
  if (poolColumn < 0 || commissionColumn < 0) {
    throw new Error(`Thiếu cột tổng quỹ hoặc hoa hồng trong ${source.fileName}.`);
  }

  const beneficiaryColumns = header.slice(2, poolColumn).map((cell, offset) => {
    const lines = String(cell ?? '').split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
    const accountLine = lines.find((line) => /^(?:STK|số tài khoản|tài khoản)\s*:?\s*/i.test(line));
    const bankName = lines.slice(1).find((line) => line !== accountLine && !/^(?:STK|số tài khoản|tài khoản)\s*:?\s*/i.test(line));
    return {
      column: offset + 2,
      name: lines[0] || '',
      bank_account: accountLine?.replace(/^(?:STK|số tài khoản|tài khoản)\s*:?\s*/i, '').trim() || null,
      bank_name: bankName || null,
    };
  }).filter((beneficiary) => beneficiary.name);

  const contracts: Omit<WorkbookContractDistribution, 'id' | 'contract_code' | 'closer_name' | 'closer_phone' | 'closer_fee' | 'referrer_name' | 'referrer_phone' | 'referrer_fee' | 'supporter_name' | 'supporter_phone' | 'supporter_fee' | 'status'>[] = [];
  const warnings: string[] = [];

  rows.slice(headerIndex + 1).forEach((row, offset) => {
    const serial = String(row[0] ?? '').trim();
    if (!/^\d+$/.test(serial)) return;

    const description = parseContractDescription(row[1]);
    if (!description.contractDate || !description.customerName || description.contractValue <= 0) {
      warnings.push(`${source.sheetLabel}, dòng Excel ${headerIndex + offset + 2}: không đọc đủ ngày, tên khách hàng hoặc giá trị hợp đồng.`);
      return;
    }

    const sourceBeneficiaries = beneficiaryColumns
      .map(({ column, name, bank_account, bank_name }) => ({
        name: canonicalName(name, memberNames),
        amount: parseMoney(row[column]),
        bank_account,
        bank_name,
      }))
      .filter((beneficiary) => beneficiary.amount > 0);
    const unallocatedPool = parseMoney(row[poolColumn]);
    const distributedCommission = parseMoney(row[commissionColumn]);
    const remainingFund = remainingColumn >= 0
      ? parseMoney(row[remainingColumn])
      : unallocatedPool - distributedCommission;
    const beneficiarySum = sourceBeneficiaries.reduce((sum, beneficiary) => sum + beneficiary.amount, 0);
    if (beneficiarySum !== distributedCommission) {
      warnings.push(`${source.sheetLabel}, ${description.customerName}: tổng các khoản nhân sự ${beneficiarySum.toLocaleString('vi-VN')}₫ khác cột tổng hoa hồng ${distributedCommission.toLocaleString('vi-VN')}₫.`);
    }

    contracts.push({
      contract_date: description.contractDate,
      customer_name: description.customerName,
      value: description.contractValue,
      allocated_value: description.contractValue,
      source_period_code: source.periodCode,
      source_excel_row: headerIndex + offset + 2,
      source_sheet: worksheetName,
      source_beneficiaries: sourceBeneficiaries,
      unallocated_pool: unallocatedPool,
      distributed_commission: distributedCommission,
      remaining_fund: remainingFund,
    });
  });

  const pivotCommissionRow = rows.find((row) => String(row[0] ?? '').trim().toLocaleLowerCase('vi') === 'tổng hoa hồng chia');
  if (pivotCommissionRow) {
    const pivotCommission = parseMoney([...pivotCommissionRow].reverse().find((cell) => String(cell ?? '').trim() !== ''));
    const contractCommission = contracts.reduce((sum, contract) => sum + contract.distributed_commission, 0);
    if (pivotCommission !== contractCommission) {
      warnings.push(
        `${source.sheetLabel}: tổng hoa hồng theo các dòng hợp đồng là ${contractCommission.toLocaleString('vi-VN')}₫, `
        + `nhưng bảng tổng hợp nhân sự cuối file ghi ${pivotCommission.toLocaleString('vi-VN')}₫ `
        + `(lệch ${Math.abs(pivotCommission - contractCommission).toLocaleString('vi-VN')}₫). `
        + 'Giao diện dùng các dòng hợp đồng làm căn cứ chi tiết.',
      );
    }
  }

  return { contracts, warnings };
}

export function loadSeptemberContractDistributions(
  databaseContracts: DatabaseContract[],
  memberNames: string[],
) {
  const usedContractIds = new Set<number>();
  const contracts: WorkbookContractDistribution[] = [];
  const warningsByPeriod: Record<string, string[]> = {};

  for (const source of SOURCES) {
    try {
      const result = readSource(source, memberNames);
      warningsByPeriod[source.periodCode] = result.warnings;
      for (const row of result.contracts) {
        const matched = findDatabaseContract(row, databaseContracts, usedContractIds);
        const identity = matched?.id ?? 900_000 + source.weekNumber * 10_000 + row.source_excel_row;
        contracts.push({
          ...row,
          id: identity,
          contract_code: matched?.contract_code ?? null,
          closer_name: matched?.closer_name ?? '',
          closer_phone: matched?.closer_phone ?? '',
          closer_fee: matched?.closer_fee ?? 0,
          referrer_name: matched?.referrer_name ?? '',
          referrer_phone: matched?.referrer_phone ?? '',
          referrer_fee: matched?.referrer_fee ?? 0,
          supporter_name: matched?.supporter_name ?? '',
          supporter_phone: matched?.supporter_phone ?? '',
          supporter_fee: matched?.supporter_fee ?? 0,
          status: matched?.status || 'Theo bảng Excel',
        });
      }
    } catch (error) {
      warningsByPeriod[source.periodCode] = [
        `Lỗi khi đọc file ${source.fileName}: ${error instanceof Error ? error.message : String(error)}`,
      ];
    }
  }

  return { contracts, warningsByPeriod };
}
