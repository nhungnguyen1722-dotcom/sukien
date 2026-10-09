import { NextRequest } from 'next/server';
import pool from '@/lib/db';
import { isTeamLeadAdmin } from '@/lib/teamlead';
import {
  DEFAULT_ALLOCATION_POLICY_ROWS,
  DEFAULT_POLICY_EFFECTIVE_DATE,
  DEFAULT_POLICY_VERSION,
  type AllocationPolicyRow,
  type AllocationPolicyVersion,
} from '@/lib/allocationPolicyConfig';

export const dynamic = 'force-dynamic';

let schemaPromise: Promise<void> | null = null;

// The first draft stored the rounded spreadsheet display values.  Reading that
// seed back with the display group excluded gives 99.8%, so recognize it and
// use the precise source fractions without changing any user-edited version.
const legacySeedPercentages: Record<string, number> = {
  'sale-direct': 40,
  'sale-connection': 6.7,
  'sale-support': 3.3,
  'event-contract': 3.3,
  'customer-care': 1.3,
  training: 2,
  competition: 5.3,
  travel: 2,
  'leader-team': 19.3,
  'operations-support': 16.7,
};

type PolicyDatabaseRow = {
  id: number | string;
  version_label: string;
  effective_date: string;
  created_at: Date | string;
  created_by: string;
  note: string;
  rows: unknown;
};

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback;
}

async function ensurePolicySchema() {
  if (!schemaPromise) {
    schemaPromise = (async () => {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        await client.query('SELECT pg_advisory_xact_lock($1)', [814202610]);
        await client.query(`
          CREATE TABLE IF NOT EXISTS allocation_policy_versions (
            id BIGSERIAL PRIMARY KEY,
            version_label VARCHAR(32) NOT NULL,
            effective_date DATE NOT NULL,
            note TEXT NOT NULL,
            rows JSONB NOT NULL,
            created_by VARCHAR(255) NOT NULL DEFAULT 'Admin',
            is_active BOOLEAN NOT NULL DEFAULT FALSE,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
          )
        `);
        await client.query(`
          CREATE UNIQUE INDEX IF NOT EXISTS allocation_policy_one_active_idx
          ON allocation_policy_versions (is_active) WHERE is_active = TRUE
        `);
        await client.query(
          `INSERT INTO allocation_policy_versions
             (version_label, effective_date, note, rows, created_by, is_active)
           SELECT $1, $2::date, $3, $4::jsonb, 'Khởi tạo hệ thống', TRUE
           WHERE NOT EXISTS (SELECT 1 FROM allocation_policy_versions WHERE is_active = TRUE)`,
          [
            DEFAULT_POLICY_VERSION,
            DEFAULT_POLICY_EFFECTIVE_DATE,
            'Khởi tạo theo tab 1. Chính sách trong Tong-hop-DNTT-T9-T10.xlsx',
            JSON.stringify(DEFAULT_ALLOCATION_POLICY_ROWS),
          ]
        );
        await client.query('COMMIT');
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    })().catch((error) => {
      schemaPromise = null;
      throw error;
    });
  }
  await schemaPromise;
}

function normalizePolicyRows(rawRows: unknown): AllocationPolicyRow[] {
  let parsedRows = rawRows;
  if (typeof rawRows === 'string') {
    try {
      parsedRows = JSON.parse(rawRows);
    } catch {
      parsedRows = [];
    }
  }
  const storedById = new Map<string, unknown>();
  if (Array.isArray(parsedRows)) {
    for (const row of parsedRows) {
      if (row && typeof row === 'object' && typeof row.id === 'string') {
        storedById.set(row.id, row.allocationPercent);
      }
    }
  }
  const isLegacySeed = DEFAULT_ALLOCATION_POLICY_ROWS.every((definition) => (
    storedById.get(definition.id) === legacySeedPercentages[definition.id]
  ));
  const rows = DEFAULT_ALLOCATION_POLICY_ROWS.map((definition) => {
    const storedValue = storedById.get(definition.id);
    return {
      ...definition,
      allocationPercent: !isLegacySeed && typeof storedValue === 'number' && Number.isFinite(storedValue)
        ? storedValue
        : definition.allocationPercent,
    };
  });
  return rows;
}

function mapVersion(row: PolicyDatabaseRow): AllocationPolicyVersion {
  return {
    id: Number(row.id),
    versionLabel: row.version_label,
    effectiveDate: row.effective_date,
    createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at),
    createdBy: row.created_by,
    note: row.note,
    rows: normalizePolicyRows(row.rows),
  };
}

async function readVersions(): Promise<AllocationPolicyVersion[]> {
  const result = await pool.query(`
    SELECT id, version_label, TO_CHAR(effective_date, 'YYYY-MM-DD') AS effective_date,
           created_at, created_by, note, rows
    FROM allocation_policy_versions
    ORDER BY id DESC
    LIMIT 100
  `);
  return result.rows.map(mapVersion);
}

export async function GET(request: NextRequest) {
  if (!isTeamLeadAdmin(request)) {
    return Response.json({ success: false, error: 'Không có quyền truy cập.' }, { status: 403 });
  }
  try {
    await ensurePolicySchema();
    const versions = await readVersions();
    const current = versions[0];
    if (!current) throw new Error('Chưa có phiên bản chính sách đang áp dụng.');
    return Response.json({ success: true, current, history: versions }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('Error loading allocation policy:', error);
    return Response.json({ success: false, error: getErrorMessage(error, 'Không thể tải chính sách phân bổ.') }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  if (!isTeamLeadAdmin(request)) {
    return Response.json({ success: false, error: 'Không có quyền truy cập.' }, { status: 403 });
  }

  let body: { rows?: Array<{ id?: string; allocationPercent?: number }>; note?: string; effectiveDate?: string } | null;
  try {
    body = await request.json();
  } catch {
    return Response.json({ success: false, error: 'Dữ liệu gửi lên không hợp lệ.' }, { status: 400 });
  }
  if (!body || typeof body !== 'object') {
    return Response.json({ success: false, error: 'Dữ liệu gửi lên không hợp lệ.' }, { status: 400 });
  }

  const note = typeof body.note === 'string' ? body.note.trim() : '';
  const effectiveDate = typeof body.effectiveDate === 'string' ? body.effectiveDate : '';
  if (!note) return Response.json({ success: false, error: 'Vui lòng nhập ghi chú thay đổi.' }, { status: 400 });
  if (note.length > 500) return Response.json({ success: false, error: 'Ghi chú tối đa 500 ký tự.' }, { status: 400 });
  const parsedEffectiveDate = new Date(`${effectiveDate}T00:00:00Z`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(effectiveDate) || Number.isNaN(parsedEffectiveDate.valueOf()) || parsedEffectiveDate.toISOString().slice(0, 10) !== effectiveDate) {
    return Response.json({ success: false, error: 'Ngày áp dụng không hợp lệ.' }, { status: 400 });
  }

  const suppliedRows = Array.isArray(body.rows) ? body.rows : [];
  if (suppliedRows.some((row) => !row || typeof row !== 'object' || typeof row.id !== 'string')) {
    return Response.json({ success: false, error: 'Danh sách định mức không hợp lệ.' }, { status: 400 });
  }
  const suppliedById = new Map(suppliedRows.map((row) => [row.id, row.allocationPercent]));
  const expectedIds = new Set(DEFAULT_ALLOCATION_POLICY_ROWS.map((row) => row.id));
  if (suppliedRows.length !== expectedIds.size || suppliedRows.some((row) => !row.id || !expectedIds.has(row.id)) || suppliedById.size !== expectedIds.size) {
    return Response.json({ success: false, error: 'Danh sách định mức không khớp cấu hình chính sách.' }, { status: 400 });
  }

  const invalidRow = DEFAULT_ALLOCATION_POLICY_ROWS.find((row) => {
    const value = suppliedById.get(row.id);
    return typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > 100;
  });
  if (invalidRow) {
    return Response.json({ success: false, error: `Tỷ lệ của “${invalidRow.label}” phải nằm trong khoảng 0–100%.` }, { status: 400 });
  }
  const rows: AllocationPolicyRow[] = DEFAULT_ALLOCATION_POLICY_ROWS.map((row) => ({
    ...row,
    allocationPercent: suppliedById.get(row.id) as number,
  }));
  try {
    await ensurePolicySchema();
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query('SELECT pg_advisory_xact_lock($1)', [814202610]);
      const prior = await client.query(`
        SELECT version_label FROM allocation_policy_versions
        ORDER BY id DESC LIMIT 1 FOR UPDATE
      `);
      const match = String(prior.rows[0]?.version_label || DEFAULT_POLICY_VERSION).match(/^v(\d+)\.(\d+)$/i);
      const versionLabel = match ? `v${match[1]}.${Number(match[2]) + 1}` : `v${Date.now()}`;
      await client.query(`UPDATE allocation_policy_versions SET is_active = FALSE WHERE is_active = TRUE`);
      const actor = request.cookies.get('user_name')?.value;
      let createdBy = 'Admin';
      if (actor) {
        try { createdBy = decodeURIComponent(actor).slice(0, 255); } catch { createdBy = actor.slice(0, 255); }
      }
      const inserted = await client.query(`
        INSERT INTO allocation_policy_versions
          (version_label, effective_date, note, rows, created_by, is_active)
        VALUES ($1, $2::date, $3, $4::jsonb, $5, TRUE)
        RETURNING id, version_label, TO_CHAR(effective_date, 'YYYY-MM-DD') AS effective_date,
                  created_at, created_by, note, rows
      `, [versionLabel, effectiveDate, note, JSON.stringify(rows), createdBy]);
      const historyResult = await client.query(`
        SELECT id, version_label, TO_CHAR(effective_date, 'YYYY-MM-DD') AS effective_date,
               created_at, created_by, note, rows
        FROM allocation_policy_versions
        ORDER BY id DESC
        LIMIT 100
      `);
      await client.query('COMMIT');
      const current = mapVersion(inserted.rows[0]);
      return Response.json({ success: true, current, history: historyResult.rows.map(mapVersion) });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error saving allocation policy:', error);
    return Response.json({ success: false, error: getErrorMessage(error, 'Không thể lưu chính sách phân bổ.') }, { status: 500 });
  }
}
