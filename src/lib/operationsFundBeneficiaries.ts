import pool from '@/lib/db';
import { DEFAULT_OPERATIONS_FUND_BENEFICIARIES, type OperationsFundBeneficiary } from '@/lib/operationsFundBeneficiaryDefaults';

export { DEFAULT_OPERATIONS_FUND_BENEFICIARIES, type OperationsFundBeneficiary } from '@/lib/operationsFundBeneficiaryDefaults';

export async function ensureOperationsFundBeneficiaries(): Promise<OperationsFundBeneficiary[]> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS operations_fund_beneficiaries (
      id BIGSERIAL PRIMARY KEY,
      department_key TEXT NOT NULL,
      fund_key TEXT NOT NULL,
      fund_source TEXT NOT NULL,
      department TEXT NOT NULL,
      full_name TEXT NOT NULL DEFAULT '',
      phone TEXT NOT NULL DEFAULT '',
      bank_account TEXT NOT NULL DEFAULT '',
      bank_name TEXT NOT NULL DEFAULT '',
      weekly_rate NUMERIC NOT NULL CHECK (weekly_rate >= 0 AND weekly_rate <= 1),
      monthly_rate NUMERIC NOT NULL CHECK (monthly_rate >= 0 AND monthly_rate <= 1),
      effective_from DATE NOT NULL,
      created_by TEXT,
      updated_by TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE (department_key, effective_from)
    )
  `);

  for (const row of DEFAULT_OPERATIONS_FUND_BENEFICIARIES) {
    await pool.query(
      `INSERT INTO operations_fund_beneficiaries (
        department_key, fund_key, fund_source, department, full_name, phone,
        bank_account, bank_name, weekly_rate, monthly_rate, effective_from
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, '1900-01-01')
      ON CONFLICT (department_key, effective_from) DO NOTHING`,
      [
        row.department_key,
        row.fund_key,
        row.fund_source,
        row.department,
        row.full_name,
        row.phone,
        row.bank_account,
        row.bank_name,
        row.weekly_rate,
        row.monthly_rate,
      ],
    );
  }

  const result = await pool.query(`
    SELECT b.id, b.department_key, b.fund_key, b.department, b.full_name,
      COALESCE(NULLIF(BTRIM(b.phone), ''), u.phone, '') AS phone,
      COALESCE(NULLIF(BTRIM(b.bank_account), ''), u.bank_account, '') AS bank_account,
      COALESCE(NULLIF(BTRIM(b.bank_name), ''), u.bank_name, '') AS bank_name,
      b.weekly_rate::float8 AS weekly_rate,
      b.monthly_rate::float8 AS monthly_rate, b.effective_from::text AS effective_from
    FROM operations_fund_beneficiaries b
    LEFT JOIN users u ON LOWER(BTRIM(u.full_name)) = LOWER(BTRIM(b.full_name))
    ORDER BY b.department_key, b.effective_from, b.id
  `);

  return result.rows as OperationsFundBeneficiary[];
}
