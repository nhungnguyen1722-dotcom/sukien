import fs from 'node:fs';
import path from 'node:path';
import * as XLSX from 'xlsx';
import { decomposeBeneficiarySource, DetailedBeneficiaryLine } from './allocationFormulas';

export interface WorkbookBeneficiary {
  name: string;
  amount: number;
  bank_account?: string | null;
  bank_name?: string | null;
  lines?: DetailedBeneficiaryLine[];
}

export interface WorkbookContractDistribution {
  id: number;
  contract_code: string | null;
  contract_date: string;
  customer_name: string;
  value: number;
  allocated_value: number;
  team_name?: string | null;
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
  team_name?: string | null;
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

interface MatrixSource {
  fileName: string;
  sheetName: string;
  periodCode: string;
  sheetLabel: string;
  weekNumber: number;
}

const MATRIX_SOURCES: MatrixSource[] = [
  {
    fileName: 'DN_thanh_toan_HH_Tuan1_T10.xlsx',
    sheetName: 'DNTT HH tuần 1 T10',
    periodCode: '2026-10-W1',
    sheetLabel: 'Tuần 1 Tháng 10',
    weekNumber: 1,
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
  const normA = normalizeName(left).replace(/y/g, 'i');
  const normB = normalizeName(right).replace(/y/g, 'i');
  if (normA === normB) return true;
  const a = normA.split(' ');
  const b = normB.split(' ');
  const lastA = a[a.length - 1];
  const lastB = b[b.length - 1];
  if (lastA !== lastB && !lastA.startsWith(lastB) && !lastB.startsWith(lastA)) {
    return false;
  }
  if (a.length === b.length && a.every((part, index) => (
    part === b[index]
    || (part.length === 1 && b[index].startsWith(part))
    || (b[index].length === 1 && part.startsWith(b[index]))
  ))) {
    return true;
  }
  const aWords = new Set(a);
  const bWords = new Set(b);
  const common = a.filter((w) => bWords.has(w));
  return common.length >= 2 && (common.length === a.length || common.length === b.length || common.length >= Math.max(a.length, b.length) - 1);
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

function createDatabaseContractMatcher(contracts: DatabaseContract[]) {
  const contractsByValue = new Map<number, DatabaseContract[]>();
  for (const contract of contracts) {
    const value = Math.round(contract.allocated_value || contract.value);
    const candidates = contractsByValue.get(value) || [];
    candidates.push(contract);
    contractsByValue.set(value, candidates);
  }

  return (
    source: { contract_date: string; customer_name: string; value: number },
    usedIds: Set<number>,
  ) => {
    const candidates = new Map<number, DatabaseContract>();
    for (let value = source.value - 1; value <= source.value + 1; value += 1) {
      for (const contract of contractsByValue.get(value) || []) candidates.set(contract.id, contract);
    }
    const matches = Array.from(candidates.values())
      .filter((contract) => !usedIds.has(contract.id))
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
  };
}

const fileBufferCache = new Map<string, { mtimeMs: number; buffer: Buffer }>();
const workbookCache = new Map<string, { mtimeMs: number; workbook: XLSX.WorkBook }>();

function readFileBuffer(filePath: string): Buffer {
  const stat = fs.statSync(filePath);
  const cached = fileBufferCache.get(filePath);
  if (cached && cached.mtimeMs === stat.mtimeMs) {
    return cached.buffer;
  }
  const buffer = fs.readFileSync(filePath);
  fileBufferCache.set(filePath, { mtimeMs: stat.mtimeMs, buffer });
  return buffer;
}

function readWorkbook(filePath: string): XLSX.WorkBook {
  const stat = fs.statSync(filePath);
  const cached = workbookCache.get(filePath);
  if (cached && cached.mtimeMs === stat.mtimeMs) return cached.workbook;

  const workbook = XLSX.read(readFileBuffer(filePath), { type: 'buffer', cellDates: false });
  workbookCache.set(filePath, { mtimeMs: stat.mtimeMs, workbook });
  return workbook;
}

export function resolveWorkbookPath(fileName: string): string | null {
  const candidateDirs = [
    path.join(process.cwd(), 'imagedata'),
    path.join(process.cwd(), 'New folder'),
    path.join(process.cwd(), '..', 'New folder'),
    path.join(process.cwd(), '..', 'imagedata'),
    'D:\\ProjectNextJS\\New folder',
    'D:\\ProjectNextJS\\sukien\\imagedata',
    'D:\\ProjectNextJS\\imagedata',
  ];
  for (const dir of candidateDirs) {
    try {
      const fullPath = path.join(dir, fileName);
      if (fs.existsSync(fullPath)) {
        return fullPath;
      }
    } catch {
      // ignore
    }
  }
  return null;
}

function readSource(source: WorkbookSource, memberNames: string[]) {
  const resolvedPath = resolveWorkbookPath(source.fileName);
  if (!resolvedPath || !fs.existsSync(resolvedPath)) {
    return {
      contracts: [],
      warnings: [],
    };
  }
  const workbook = readWorkbook(resolvedPath);
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

function readMatrixSource(
  source: MatrixSource,
  memberNames: string[],
  databaseContracts: DatabaseContract[],
  usedContractIds: Set<number>,
) {
  const resolvedPath = resolveWorkbookPath(source.fileName);
  if (!resolvedPath || !fs.existsSync(resolvedPath)) {
    return {
      contracts: [],
      warnings: [],
    };
  }
  const workbook = readWorkbook(resolvedPath);
  const worksheet = workbook.Sheets[source.sheetName];
  if (!worksheet) {
    return {
      contracts: [],
      warnings: [`Không tìm thấy trang tính ${source.sheetName} trong ${source.fileName}.`],
    };
  }

  const rows = XLSX.utils.sheet_to_json<unknown[]>(worksheet, { header: 1, defval: '', raw: false });
  let headerRowIdx = rows.findIndex((r) => String(r[1] ?? '').includes('Họ tên/Hợp đồng'));
  if (headerRowIdx < 0) {
    headerRowIdx = rows.findIndex((r) => {
      const c1 = String(r[1] ?? '').trim();
      return c1 === 'Hợp đồng' || c1.includes('Họ tên/Hợp đồng');
    });
  }
  if (headerRowIdx < 0) {
    return {
      contracts: [],
      warnings: [`Không tìm thấy ma trận hợp đồng trong ${source.sheetLabel}.`],
    };
  }

  const headerRow = rows[headerRowIdx];
  const isRowContracts = String(headerRow[1] ?? '').trim() === 'Hợp đồng';

  // Trường hợp 1: Dòng là Hợp đồng, Cột là Người thụ hưởng (ví dụ sheet DNTT HH tuần 1 T10)
  if (isRowContracts) {
    const colBeneficiaries: Array<{ colIndex: number; name: string; bankAccount: string | null; bankName: string | null }> = [];
    for (let c = 2; c < headerRow.length; c++) {
      const cell = String(headerRow[c] ?? '').trim();
      if (!cell || cell.toLowerCase().includes('tổng chi')) break;
      const lines = cell.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
      const name = canonicalName(lines[0] || '', memberNames);
      const accountLine = lines.find((l) => /^stk/i.test(l));
      const bankAccount = accountLine ? accountLine.replace(/^stk:?\s*/i, '').trim() : null;
      const bankName = lines.length > 2 ? lines[2] : (lines.length === 2 && !accountLine ? lines[1] : null);
      colBeneficiaries.push({ colIndex: c, name, bankAccount, bankName });
    }

    const contracts: WorkbookContractDistribution[] = [];
    for (let r = headerRowIdx + 1; r < rows.length; r++) {
      const row = rows[r];
      const cCell = String(row[1] ?? '').trim();
      if (!cCell || cCell.toLowerCase().includes('tổng') || String(row[0] ?? '').toLowerCase().includes('tổng')) break;
      const lines = cCell.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
      const text = lines.join(' ');
      const dateMatch = text.match(/(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})/);
      const contractDate = dateMatch ? `${dateMatch[3]}-${dateMatch[2].padStart(2, '0')}-${dateMatch[1].padStart(2, '0')}` : '2026-10-03';
      const valMatch = text.match(/Giá trị:\s*([\d.]+)/i);
      const parsedVal = valMatch ? parseMoney(valMatch[1].replace(/\./g, '')) : 0;
      const khMatch = text.match(/KH:\s*([^\n\r]+?)(?:\s*Giá trị:|$)/i);
      let customerName = khMatch ? khMatch[1].trim() : lines[1] || '';
      customerName = customerName.replace(/^KH:?\s*/i, '').trim();

      const sourceBeneficiaries: WorkbookBeneficiary[] = [];
      for (const b of colBeneficiaries) {
        const amount = parseMoney(row[b.colIndex]);
        if (amount > 0) {
          sourceBeneficiaries.push({
            name: b.name,
            amount,
            bank_account: b.bankAccount,
            bank_name: b.bankName,
          });
        }
      }

      const matched = databaseContracts.find((c) => (
        !usedContractIds.has(c.id)
        && (namesMatch(c.customer_name, customerName) || customerName.toLowerCase().includes(c.customer_name.trim().toLowerCase()))
        && (parsedVal === 0 || Math.abs(Math.round(c.allocated_value || c.value) - parsedVal) <= 1)
        && c.contract_date >= '2026-10-01'
      ));
      if (matched) usedContractIds.add(matched.id);

      const actualValue = parsedVal || (matched ? Math.round(matched.allocated_value || matched.value) : 0);
      const unallocatedPool = Math.round(actualValue * 0.15);

      if (sourceBeneficiaries.length === 0 && matched) {
        if (matched.closer_name && matched.closer_fee > 0) {
          sourceBeneficiaries.push({ name: matched.closer_name, amount: Math.round(matched.closer_fee) });
        }
        if (matched.referrer_name && matched.referrer_fee > 0) {
          sourceBeneficiaries.push({ name: matched.referrer_name, amount: Math.round(matched.referrer_fee) });
        }
        if (matched.supporter_name && matched.supporter_fee > 0) {
          sourceBeneficiaries.push({ name: matched.supporter_name, amount: Math.round(matched.supporter_fee) });
        }
      }

      const enrichedBeneficiaries = sourceBeneficiaries.map((b) => ({
        ...b,
        lines: decomposeBeneficiarySource(
          {
            customer_name: matched?.customer_name || customerName,
            value: actualValue,
            allocated_value: actualValue,
            closer_name: matched?.closer_name,
            closer_fee: matched?.closer_fee,
            referrer_name: matched?.referrer_name,
            referrer_fee: matched?.referrer_fee,
            supporter_name: matched?.supporter_name,
            supporter_fee: matched?.supporter_fee,
            team_name: matched?.team_name,
          },
          b.name,
          b.amount,
          source.sheetName,
          r + 1
        ),
      }));

      const distributedCommission = enrichedBeneficiaries.reduce((sum, b) => sum + b.amount, 0);
      const remainingFund = unallocatedPool - distributedCommission;
      const identity = matched?.id ?? 910_000 + source.weekNumber * 10_000 + r;

      contracts.push({
        id: identity,
        contract_code: matched?.contract_code ?? null,
        contract_date: matched?.contract_date ?? contractDate,
        customer_name: matched?.customer_name || customerName,
        value: actualValue,
        allocated_value: actualValue,
        closer_name: matched?.closer_name ?? '',
        closer_phone: matched?.closer_phone ?? '',
        closer_fee: matched?.closer_fee ?? 0,
        referrer_name: matched?.referrer_name ?? '',
        referrer_phone: matched?.referrer_phone ?? '',
        referrer_fee: matched?.referrer_fee ?? 0,
        supporter_name: matched?.supporter_name ?? '',
        supporter_phone: matched?.supporter_phone ?? '',
        supporter_fee: matched?.supporter_fee ?? 0,
        status: matched?.status || 'Chờ duyệt',
        source_period_code: source.periodCode,
        source_excel_row: r + 1,
        source_sheet: source.sheetName,
        source_beneficiaries: enrichedBeneficiaries,
        unallocated_pool: unallocatedPool,
        distributed_commission: distributedCommission,
        remaining_fund: remainingFund,
      });
    }

    const remainingDbContracts = databaseContracts.filter((c) => (
      !usedContractIds.has(c.id)
      && c.contract_date >= '2026-10-03'
      && c.contract_date <= '2026-10-31'
    ));
    for (const dbContract of remainingDbContracts) {
      usedContractIds.add(dbContract.id);
      const actualValue = Math.round(dbContract.allocated_value || dbContract.value);
      const unallocatedPool = Math.round(actualValue * 0.15);
      const sourceBeneficiaries: WorkbookBeneficiary[] = [];
      if (dbContract.closer_name && dbContract.closer_fee > 0) {
        sourceBeneficiaries.push({ name: dbContract.closer_name, amount: Math.round(dbContract.closer_fee) });
      }
      if (dbContract.referrer_name && dbContract.referrer_fee > 0) {
        sourceBeneficiaries.push({ name: dbContract.referrer_name, amount: Math.round(dbContract.referrer_fee) });
      }
      if (dbContract.supporter_name && dbContract.supporter_fee > 0) {
        sourceBeneficiaries.push({ name: dbContract.supporter_name, amount: Math.round(dbContract.supporter_fee) });
      }
      const enrichedBeneficiaries = sourceBeneficiaries.map((b) => ({
        ...b,
        lines: decomposeBeneficiarySource(
          {
            customer_name: dbContract.customer_name,
            value: actualValue,
            allocated_value: actualValue,
            closer_name: dbContract.closer_name,
            closer_fee: dbContract.closer_fee,
            referrer_name: dbContract.referrer_name,
            referrer_fee: dbContract.referrer_fee,
            supporter_name: dbContract.supporter_name,
            supporter_fee: dbContract.supporter_fee,
            team_name: dbContract.team_name,
          },
          b.name,
          b.amount,
          source.sheetName,
          999
        ),
      }));
      const distributedCommission = enrichedBeneficiaries.reduce((sum, b) => sum + b.amount, 0);
      contracts.push({
        id: dbContract.id,
        contract_code: dbContract.contract_code ?? null,
        contract_date: dbContract.contract_date,
        customer_name: dbContract.customer_name,
        value: actualValue,
        allocated_value: actualValue,
        closer_name: dbContract.closer_name,
        closer_phone: dbContract.closer_phone,
        closer_fee: dbContract.closer_fee,
        referrer_name: dbContract.referrer_name,
        referrer_phone: dbContract.referrer_phone,
        referrer_fee: dbContract.referrer_fee,
        supporter_name: dbContract.supporter_name,
        supporter_phone: dbContract.supporter_phone,
        supporter_fee: dbContract.supporter_fee,
        status: dbContract.status || 'Chờ duyệt',
        source_period_code: source.periodCode,
        source_excel_row: 999,
        source_sheet: source.sheetName,
        source_beneficiaries: enrichedBeneficiaries,
        unallocated_pool: unallocatedPool,
        distributed_commission: distributedCommission,
        remaining_fund: unallocatedPool - distributedCommission,
      });
    }

    return { contracts, warnings: [] };
  }

  // Trường hợp 2: Cột là Hợp đồng, Dòng là Người thụ hưởng
  const colContracts: Array<{ colIndex: number; customerName: string; contractValue: number; contractDate: string }> = [];
  for (let c = 2; c < headerRow.length; c++) {
    const cell = String(headerRow[c] ?? '').trim();
    if (!cell || cell.toLowerCase().includes('tổng chi')) break;
    const lines = cell.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    const text = lines.join(' ');
    const dateMatch = text.match(/(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})/);
    const contractDate = dateMatch ? `${dateMatch[3]}-${dateMatch[2].padStart(2, '0')}-${dateMatch[1].padStart(2, '0')}` : '2026-10-03';
    const digitsMatch = text.match(/[\d.]+/g);
    const amountStr = digitsMatch ? digitsMatch[digitsMatch.length - 1].replace(/\./g, '') : '0';
    const contractValue = parseMoney(amountStr);
    let customer = text.replace(/(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})/, '');
    customer = customer.replace(/^[-–\s]+/, '').replace(/[\d.,]+$/, '').trim();
    colContracts.push({ colIndex: c, customerName: customer, contractValue, contractDate });
  }

  const beneficiaries: Array<{ rowIdx: number; name: string; bankAccount: string | null; bankName: string | null }> = [];
  for (let r = headerRowIdx + 1; r < rows.length; r++) {
    const row = rows[r];
    const nameCell = String(row[1] ?? '').trim();
    if (!nameCell || nameCell.toLowerCase().includes('tổng quỹ') || nameCell.toLowerCase().includes('tổng hoa hồng') || nameCell.toLowerCase().includes('người lập')) break;
    const lines = nameCell.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    const name = canonicalName(lines[0] || '', memberNames);
    const accountLine = lines.find((l) => /^stk/i.test(l));
    const bankAccount = accountLine ? accountLine.replace(/^stk:?\s*/i, '').trim() : null;
    const bankName = lines.length > 2 ? lines[2] : (lines.length === 2 && !accountLine ? lines[1] : null);
    beneficiaries.push({ rowIdx: r, name, bankAccount, bankName });
  }

  const poolRow = rows.find((r) => String(r[1] ?? '').includes('Tổng quỹ chưa chia'));
  const commRow = rows.find((r) => String(r[1] ?? '').includes('Tổng hoa hồng chia'));
  const remRow = rows.find((r) => String(r[1] ?? '').includes('Tổng quỹ còn lại'));

  const contracts: WorkbookContractDistribution[] = [];
  for (const col of colContracts) {
    const unallocatedPool = parseMoney(poolRow ? poolRow[col.colIndex] : Math.round(col.contractValue * 0.15));
    const distributedCommission = parseMoney(commRow ? commRow[col.colIndex] : 0);
    const remainingFund = parseMoney(remRow ? remRow[col.colIndex] : unallocatedPool - distributedCommission);

    const sourceBeneficiaries: WorkbookBeneficiary[] = [];
    for (const b of beneficiaries) {
      const amount = parseMoney(rows[b.rowIdx][col.colIndex]);
      if (amount > 0) {
        sourceBeneficiaries.push({
          name: b.name,
          amount,
          bank_account: b.bankAccount,
          bank_name: b.bankName,
        });
      }
    }

    const matched = databaseContracts.find((c) => (
      !usedContractIds.has(c.id)
      && namesMatch(c.customer_name, col.customerName)
      && Math.abs(Math.round(c.allocated_value || c.value) - col.contractValue) <= 1
    ));
    if (matched) usedContractIds.add(matched.id);

    const identity = matched?.id ?? 910_000 + source.weekNumber * 10_000 + col.colIndex;
    const enrichedBeneficiaries = sourceBeneficiaries.map((b) => ({
      ...b,
      lines: decomposeBeneficiarySource(
        {
          customer_name: matched?.customer_name || col.customerName,
          value: col.contractValue,
          allocated_value: col.contractValue,
          closer_name: matched?.closer_name,
          closer_fee: matched?.closer_fee,
          referrer_name: matched?.referrer_name,
          referrer_fee: matched?.referrer_fee,
          supporter_name: matched?.supporter_name,
          supporter_fee: matched?.supporter_fee,
          team_name: matched?.team_name,
        },
        b.name,
        b.amount,
        source.sheetName,
        headerRowIdx + 1
      ),
    }));
    contracts.push({
      id: identity,
      contract_code: matched?.contract_code ?? null,
      contract_date: matched?.contract_date ?? col.contractDate,
      customer_name: matched?.customer_name || col.customerName,
      value: col.contractValue,
      allocated_value: col.contractValue,
      team_name: matched?.team_name ?? '',
      closer_name: matched?.closer_name ?? '',
      closer_phone: matched?.closer_phone ?? '',
      closer_fee: matched?.closer_fee ?? 0,
      referrer_name: matched?.referrer_name ?? '',
      referrer_phone: matched?.referrer_phone ?? '',
      referrer_fee: matched?.referrer_fee ?? 0,
      supporter_name: matched?.supporter_name ?? '',
      supporter_phone: matched?.supporter_phone ?? '',
      supporter_fee: matched?.supporter_fee ?? 0,
      status: matched?.status || 'Chờ duyệt',
      source_period_code: source.periodCode,
      source_excel_row: headerRowIdx + 1,
      source_sheet: source.sheetName,
      source_beneficiaries: enrichedBeneficiaries,
      unallocated_pool: unallocatedPool,
      distributed_commission: distributedCommission,
      remaining_fund: remainingFund,
    });
  }

  const remainingDbContracts = databaseContracts.filter((c) => (
    !usedContractIds.has(c.id)
    && c.contract_date >= '2026-10-03'
    && c.contract_date <= '2026-10-31'
  ));
  for (const dbContract of remainingDbContracts) {
    usedContractIds.add(dbContract.id);
    const actualValue = Math.round(dbContract.allocated_value || dbContract.value);
    const unallocatedPool = Math.round(actualValue * 0.15);
    const sourceBeneficiaries: WorkbookBeneficiary[] = [];
    if (dbContract.closer_name && dbContract.closer_fee > 0) {
      sourceBeneficiaries.push({ name: dbContract.closer_name, amount: Math.round(dbContract.closer_fee) });
    }
    if (dbContract.referrer_name && dbContract.referrer_fee > 0) {
      sourceBeneficiaries.push({ name: dbContract.referrer_name, amount: Math.round(dbContract.referrer_fee) });
    }
    if (dbContract.supporter_name && dbContract.supporter_fee > 0) {
      sourceBeneficiaries.push({ name: dbContract.supporter_name, amount: Math.round(dbContract.supporter_fee) });
    }
    const enrichedBeneficiaries = sourceBeneficiaries.map((b) => ({
      ...b,
      lines: decomposeBeneficiarySource(
        {
          customer_name: dbContract.customer_name,
          value: actualValue,
          allocated_value: actualValue,
          closer_name: dbContract.closer_name,
          closer_fee: dbContract.closer_fee,
          referrer_name: dbContract.referrer_name,
          referrer_fee: dbContract.referrer_fee,
          supporter_name: dbContract.supporter_name,
          supporter_fee: dbContract.supporter_fee,
          team_name: dbContract.team_name,
        },
        b.name,
        b.amount,
        source.sheetName,
        999
      ),
    }));
    const distributedCommission = enrichedBeneficiaries.reduce((sum, b) => sum + b.amount, 0);
    const dStr = (dbContract.contract_date || '').slice(0, 10);
    let octWeek = source.periodCode;
    if (dStr >= '2026-10-10' && dStr <= '2026-10-16') octWeek = '2026-10-W2';
    else if (dStr >= '2026-10-17' && dStr <= '2026-10-23') octWeek = '2026-10-W3';
    else if (dStr >= '2026-10-24' && dStr <= '2026-10-30') octWeek = '2026-10-W4';
    else if (dStr >= '2026-10-31') octWeek = '2026-10-W5';

    contracts.push({
      id: dbContract.id,
      contract_code: dbContract.contract_code ?? null,
      contract_date: dbContract.contract_date,
      customer_name: dbContract.customer_name,
      value: actualValue,
      allocated_value: actualValue,
      team_name: dbContract.team_name ?? '',
      closer_name: dbContract.closer_name,
      closer_phone: dbContract.closer_phone,
      closer_fee: dbContract.closer_fee,
      referrer_name: dbContract.referrer_name,
      referrer_phone: dbContract.referrer_phone,
      referrer_fee: dbContract.referrer_fee,
      supporter_name: dbContract.supporter_name,
      supporter_phone: dbContract.supporter_phone,
      supporter_fee: dbContract.supporter_fee,
      status: dbContract.status || 'Chờ duyệt',
      source_period_code: octWeek,
      source_excel_row: 999,
      source_sheet: source.sheetName,
      source_beneficiaries: enrichedBeneficiaries,
      unallocated_pool: unallocatedPool,
      distributed_commission: distributedCommission,
      remaining_fund: unallocatedPool - distributedCommission,
    });
  }

  return { contracts, warnings: [] };
}

export function loadSeptemberContractDistributions(
  databaseContracts: DatabaseContract[],
  memberNames: string[],
) {
  const usedContractIds = new Set<number>();
  const contracts: WorkbookContractDistribution[] = [];
  const warningsByPeriod: Record<string, string[]> = {};
  const findDatabaseContract = createDatabaseContractMatcher(databaseContracts);

  for (const source of SOURCES) {
    // Week 3–5 September rows are not reconciled against spreadsheet sources anymore.
    if (
      source.periodCode === '2026-09-W3' ||
      source.periodCode === '2026-09-W4' ||
      source.periodCode === '2026-09-W5'
    ) {
      continue;
    }
    try {
      const result = readSource(source, memberNames);
      warningsByPeriod[source.periodCode] = result.warnings;
      for (const row of result.contracts) {
        const matched = findDatabaseContract(row, usedContractIds);
        const identity = matched?.id ?? 900_000 + source.weekNumber * 10_000 + row.source_excel_row;
        const enrichedBeneficiaries = row.source_beneficiaries.map((b) => ({
          ...b,
          lines: decomposeBeneficiarySource(
            {
              customer_name: matched?.customer_name || row.customer_name,
              value: row.value,
              allocated_value: row.allocated_value,
              closer_name: matched?.closer_name,
              closer_fee: matched?.closer_fee,
              referrer_name: matched?.referrer_name,
              referrer_fee: matched?.referrer_fee,
              supporter_name: matched?.supporter_name,
              supporter_fee: matched?.supporter_fee,
              team_name: matched?.team_name,
            },
            b.name,
            b.amount,
            source.sheetLabel,
            row.source_excel_row
          ),
        }));
        contracts.push({
          ...row,
          id: identity,
          contract_code: matched?.contract_code ?? null,
          team_name: matched?.team_name ?? '',
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
          source_beneficiaries: enrichedBeneficiaries,
        });
      }
    } catch (error) {
      warningsByPeriod[source.periodCode] = [
        `Lỗi khi đọc file ${source.fileName}: ${error instanceof Error ? error.message : String(error)}`,
      ];
    }
  }

  for (const source of MATRIX_SOURCES) {
    try {
      const result = readMatrixSource(source, memberNames, databaseContracts, usedContractIds);
      warningsByPeriod[source.periodCode] = result.warnings;
      contracts.push(...result.contracts);
    } catch (error) {
      warningsByPeriod[source.periodCode] = [
        `Lỗi khi đọc sheet ${source.sheetName}: ${error instanceof Error ? error.message : String(error)}`,
      ];
    }
  }

  return { contracts, warningsByPeriod };
}

export const loadContractDistributions = loadSeptemberContractDistributions;
