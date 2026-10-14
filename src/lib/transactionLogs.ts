import pool from '@/lib/db';
import { ensureMemberSchema } from '@/lib/memberTeams';
import { ensureOperationsFundBeneficiaries } from '@/lib/operationsFundBeneficiaries';

export const SELECT_TRANSACTION_LOGS = `
  SELECT 
    tl.id, tl.request_code, tl.request_date::text AS request_date, tl.fund_source, tl.detail_content,
    tl.requester_id, tl.requester_name, tl.requester_phone, tl.approver_id, tl.approver_name, tl.approver_phone,
    COALESCE(NULLIF(BTRIM(ops_beneficiary.full_name), ''), NULLIF(BTRIM(tl.beneficiary_name), ''), u.full_name) AS beneficiary_name,
    COALESCE(NULLIF(BTRIM(ops_beneficiary.phone), ''), NULLIF(BTRIM(tl.beneficiary_phone), ''), u.phone) AS beneficiary_phone,
    COALESCE(ops_member.id, tl.beneficiary_user_id) AS beneficiary_user_id,
    COALESCE(NULLIF(BTRIM(ops_beneficiary.bank_account), ''), NULLIF(BTRIM(tl.beneficiary_bank_account), ''), u.bank_account) AS beneficiary_bank_account,
    COALESCE(NULLIF(BTRIM(ops_beneficiary.bank_name), ''), NULLIF(BTRIM(tl.beneficiary_bank_name), ''), u.bank_name) AS beneficiary_bank_name,
    ops_beneficiary.department_key AS beneficiary_department_key,
    tl.proposed_amount::float8 AS proposed_amount,
    tl.available_balance::float8 AS available_balance, tl.fund_alert, tl.status, tl.expense_type,
    tl.source_contract_id, tl.beneficiary_role,
    tl.actual_expense::float8 AS actual_expense, tl.receipt_url,
    tl.approval_date::text AS approval_date, tl.payment_date::text AS payment_date, tl.source_complete,
    COALESCE(itemized.resolved_items, '[]'::jsonb) AS items, tl.note,
    COALESCE(
      NULLIF(BTRIM(c.team_name), ''),
      NULLIF(BTRIM(u.team_name), ''),
      (
        SELECT STRING_AGG(DISTINCT tt.name, ', ')
        FROM teamlead_members tm
        JOIN teamlead_member_teams tmt ON tm.id = tmt.member_id
        JOIN teamlead_teams tt ON tmt.team_id = tt.id
        WHERE (tm.member_id = u.id OR (NULLIF(REGEXP_REPLACE(tm.member_phone, '[^0-9]', '', 'g'), '') IS NOT NULL AND REGEXP_REPLACE(tm.member_phone, '[^0-9]', '', 'g') = REGEXP_REPLACE(u.phone, '[^0-9]', '', 'g')))
          AND NULLIF(BTRIM(tt.name), '') IS NOT NULL
          AND tt.name NOT LIKE '%?%'
      ),
      t.name
    ) AS beneficiary_team
  FROM transaction_logs tl
  LEFT JOIN LATERAL (
    SELECT candidate.id, candidate.full_name, candidate.phone, candidate.bank_account,
      candidate.bank_name, candidate.team_name, candidate.team_id
    FROM users candidate
    WHERE tl.beneficiary_user_id = candidate.id
      OR (
        NULLIF(REGEXP_REPLACE(tl.beneficiary_phone, '[^0-9]', '', 'g'), '') IS NOT NULL
        AND REGEXP_REPLACE(tl.beneficiary_phone, '[^0-9]', '', 'g') =
            REGEXP_REPLACE(candidate.phone, '[^0-9]', '', 'g')
      )
      OR (
        tl.beneficiary_phone IS NULL
        AND LOWER(BTRIM(tl.beneficiary_name)) = LOWER(BTRIM(candidate.full_name))
      )
    ORDER BY CASE
      WHEN tl.beneficiary_user_id = candidate.id THEN 0
      WHEN NULLIF(REGEXP_REPLACE(tl.beneficiary_phone, '[^0-9]', '', 'g'), '') IS NOT NULL
        AND REGEXP_REPLACE(tl.beneficiary_phone, '[^0-9]', '', 'g') =
            REGEXP_REPLACE(candidate.phone, '[^0-9]', '', 'g') THEN 1
      ELSE 2
    END, candidate.id
    LIMIT 1
  ) u ON TRUE
  LEFT JOIN LATERAL (
    SELECT current_recipient.id, current_recipient.department_key, current_recipient.fund_key,
      current_recipient.full_name, current_recipient.phone, current_recipient.bank_account,
      current_recipient.bank_name
    FROM operations_fund_beneficiaries current_recipient
    WHERE LOWER(BTRIM(current_recipient.fund_source)) = LOWER(BTRIM(tl.fund_source))
      AND current_recipient.effective_from <= COALESCE(tl.request_date, tl.payment_date, CURRENT_DATE)
      AND EXISTS (
        SELECT 1
        FROM operations_fund_beneficiaries historical_recipient
        WHERE historical_recipient.department_key = current_recipient.department_key
          AND LOWER(BTRIM(historical_recipient.fund_source)) = LOWER(BTRIM(tl.fund_source))
          AND historical_recipient.effective_from <= COALESCE(tl.request_date, tl.payment_date, CURRENT_DATE)
          AND (
            current_recipient.fund_key IN ('support_cn', 'support_kt')
            OR (
              NULLIF(BTRIM(tl.detail_content), '') IS NOT NULL
              AND POSITION(LOWER(BTRIM(historical_recipient.department)) IN LOWER(tl.detail_content)) > 0
            )
            OR (
              NULLIF(BTRIM(tl.beneficiary_name), '') IS NOT NULL
              AND LOWER(BTRIM(tl.beneficiary_name)) = LOWER(BTRIM(historical_recipient.full_name))
            )
          )
      )
    ORDER BY current_recipient.effective_from DESC,
      CASE WHEN EXISTS (
        SELECT 1
        FROM operations_fund_beneficiaries historical_recipient
        WHERE historical_recipient.department_key = current_recipient.department_key
          AND LOWER(BTRIM(historical_recipient.fund_source)) = LOWER(BTRIM(tl.fund_source))
          AND historical_recipient.effective_from <= COALESCE(tl.request_date, tl.payment_date, CURRENT_DATE)
          AND NULLIF(BTRIM(tl.beneficiary_name), '') IS NOT NULL
          AND LOWER(BTRIM(tl.beneficiary_name)) = LOWER(BTRIM(historical_recipient.full_name))
      ) THEN 0 ELSE 1 END,
      COALESCE((
        SELECT MAX(LENGTH(BTRIM(historical_recipient.department)))
        FROM operations_fund_beneficiaries historical_recipient
        WHERE historical_recipient.department_key = current_recipient.department_key
          AND LOWER(BTRIM(historical_recipient.fund_source)) = LOWER(BTRIM(tl.fund_source))
          AND historical_recipient.effective_from <= COALESCE(tl.request_date, tl.payment_date, CURRENT_DATE)
          AND NULLIF(BTRIM(tl.detail_content), '') IS NOT NULL
          AND POSITION(LOWER(BTRIM(historical_recipient.department)) IN LOWER(tl.detail_content)) > 0
      ), 0) DESC,
      current_recipient.id DESC
    LIMIT 1
  ) ops_beneficiary ON TRUE
  LEFT JOIN LATERAL (
    SELECT candidate.id
    FROM users candidate
    WHERE ops_beneficiary.id IS NOT NULL
      AND (
        (
          NULLIF(REGEXP_REPLACE(COALESCE(ops_beneficiary.phone, ''), '[^0-9]', '', 'g'), '') IS NOT NULL
          AND REGEXP_REPLACE(COALESCE(candidate.phone, ''), '[^0-9]', '', 'g') =
              REGEXP_REPLACE(COALESCE(ops_beneficiary.phone, ''), '[^0-9]', '', 'g')
        )
        OR LOWER(BTRIM(candidate.full_name)) = LOWER(BTRIM(ops_beneficiary.full_name))
      )
    ORDER BY CASE
      WHEN NULLIF(REGEXP_REPLACE(COALESCE(ops_beneficiary.phone, ''), '[^0-9]', '', 'g'), '') IS NOT NULL
        AND REGEXP_REPLACE(COALESCE(candidate.phone, ''), '[^0-9]', '', 'g') =
            REGEXP_REPLACE(COALESCE(ops_beneficiary.phone, ''), '[^0-9]', '', 'g') THEN 0
      ELSE 1
    END, candidate.id
    LIMIT 1
  ) ops_member ON TRUE
  LEFT JOIN LATERAL (
    SELECT jsonb_agg(
      CASE
        WHEN ops_beneficiary.id IS NOT NULL
          AND LOWER(BTRIM(COALESCE(entry.item->>'fundSource', entry.item->>'fund_source', tl.fund_source))) = LOWER(BTRIM(tl.fund_source))
          AND (
            NULLIF(BTRIM(COALESCE(entry.item->>'beneficiaryName', entry.item->>'beneficiary_name', '')), '') IS NULL
            OR LOWER(BTRIM(COALESCE(entry.item->>'beneficiaryName', entry.item->>'beneficiary_name', ''))) =
               LOWER(BTRIM(COALESCE(tl.beneficiary_name, '')))
          )
        THEN entry.item || jsonb_build_object(
          'beneficiaryName', COALESCE(NULLIF(BTRIM(ops_beneficiary.full_name), ''), tl.beneficiary_name),
          'beneficiary_name', COALESCE(NULLIF(BTRIM(ops_beneficiary.full_name), ''), tl.beneficiary_name),
          'beneficiaryPhone', COALESCE(NULLIF(BTRIM(ops_beneficiary.phone), ''), tl.beneficiary_phone),
          'beneficiary_phone', COALESCE(NULLIF(BTRIM(ops_beneficiary.phone), ''), tl.beneficiary_phone),
          'beneficiaryBankAccount', COALESCE(NULLIF(BTRIM(ops_beneficiary.bank_account), ''), tl.beneficiary_bank_account),
          'beneficiary_bank_account', COALESCE(NULLIF(BTRIM(ops_beneficiary.bank_account), ''), tl.beneficiary_bank_account),
          'beneficiaryBankName', COALESCE(NULLIF(BTRIM(ops_beneficiary.bank_name), ''), tl.beneficiary_bank_name),
          'beneficiary_bank_name', COALESCE(NULLIF(BTRIM(ops_beneficiary.bank_name), ''), tl.beneficiary_bank_name),
          'beneficiaryUserId', ops_member.id,
          'beneficiary_user_id', ops_member.id
        )
        ELSE entry.item
      END
      ORDER BY entry.ordinality
    ) AS resolved_items
    FROM jsonb_array_elements(COALESCE(tl.items::jsonb, '[]'::jsonb)) WITH ORDINALITY AS entry(item, ordinality)
  ) itemized ON TRUE
  LEFT JOIN teams t ON u.team_id = t.id
  LEFT JOIN contracts c ON tl.source_contract_id = c.id
`;

export async function generateAutomaticContractSlips() {
  await ensureMemberSchema();
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    // PostgreSQL 9.3 has transaction advisory locks, but not INSERT ... ON CONFLICT.
    await client.query('SELECT pg_advisory_xact_lock($1, $2)', [20261009, 517]);

    const contracts = await client.query(`
      SELECT id, contract_date::text AS contract_date, contract_code, customer_name,
        closer_name, closer_phone, closer_fee,
        referrer_name, referrer_phone, referrer_fee,
        supporter_name, supporter_phone, supporter_fee
      FROM contracts
      WHERE contract_date IS NOT NULL
      ORDER BY id
    `);
    const roles = [
      { key: 'closer', label: 'Người chốt', fund: 'Sale trực tiếp - Pro sale (Nguồn khách)', name: 'closer_name', phone: 'closer_phone', fee: 'closer_fee' },
      { key: 'referrer', label: 'Người giới thiệu', fund: 'Tri ân kết nối sale trực tiếp', name: 'referrer_name', phone: 'referrer_phone', fee: 'referrer_fee' },
      { key: 'supporter', label: 'Người hỗ trợ', fund: 'Tri ân hỗ trợ sale', name: 'supporter_name', phone: 'supporter_phone', fee: 'supporter_fee' },
    ] as const;
    const paidStatuses = ['Đã chi', 'Đã thanh toán', 'Đã thực hiện'];

    for (const contract of contracts.rows) {
      for (const role of roles) {
        const beneficiaryName = String(contract[role.name] || '').trim();
        const beneficiaryPhone = String(contract[role.phone] || '').trim() || null;
        const amount = Number(contract[role.fee] || 0);
        if (!beneficiaryName || !Number.isFinite(amount) || amount <= 0) continue;

        const member = await client.query(
          `SELECT id, bank_account, bank_name
           FROM users
           WHERE (
             NULLIF(REGEXP_REPLACE(COALESCE(phone, ''), '[^0-9]', '', 'g'), '') IS NOT NULL
             AND REGEXP_REPLACE(COALESCE(phone, ''), '[^0-9]', '', 'g') =
                 REGEXP_REPLACE(COALESCE($1, ''), '[^0-9]', '', 'g')
           ) OR LOWER(BTRIM(full_name)) = LOWER(BTRIM($2))
           ORDER BY CASE WHEN REGEXP_REPLACE(COALESCE(phone, ''), '[^0-9]', '', 'g') =
                                      REGEXP_REPLACE(COALESCE($1, ''), '[^0-9]', '', 'g')
                         AND NULLIF(REGEXP_REPLACE(COALESCE($1, ''), '[^0-9]', '', 'g'), '') IS NOT NULL
                         THEN 0 ELSE 1 END, id
           LIMIT 1`,
          [beneficiaryPhone, beneficiaryName]
        );
        const memberRow = member.rows[0];
        const existing = await client.query(
          `SELECT id, status FROM transaction_logs
           WHERE source_contract_id = $1 AND beneficiary_role = $2
           ORDER BY id LIMIT 1 FOR UPDATE`,
          [contract.id, role.key]
        );
        if (existing.rows[0] && paidStatuses.includes(existing.rows[0].status)) continue;

        const values = [
          contract.contract_date,
          role.fund,
          `Hoa hồng tự động · ${role.label} · Hợp đồng ${contract.contract_code || `#${contract.id}`} · ${contract.customer_name || ''}`,
          beneficiaryName,
          beneficiaryPhone,
          memberRow?.id ?? null,
          memberRow?.bank_account ?? null,
          memberRow?.bank_name ?? null,
          amount,
          contract.id,
          role.key,
        ];

        if (existing.rows[0]) {
          await client.query(
            `UPDATE transaction_logs
             SET request_date = $1, fund_source = $2, detail_content = $3,
                 beneficiary_name = $4, beneficiary_phone = $5,
                 beneficiary_user_id = $6, beneficiary_bank_account = $7,
                 beneficiary_bank_name = $8, proposed_amount = $9, source_complete = TRUE
             WHERE id = $10`,
            [...values.slice(0, 9), existing.rows[0].id]
          );
        } else {
          await client.query(
            `INSERT INTO transaction_logs (
               request_code, request_date, fund_source, detail_content,
               requester_name, beneficiary_name, beneficiary_phone, beneficiary_user_id,
               beneficiary_bank_account, beneficiary_bank_name, proposed_amount, available_balance, fund_alert,
               status, actual_expense, source_complete, expense_type,
               source_contract_id, beneficiary_role
             ) VALUES ($1, $2, $3, $4, 'Hệ thống', $5, $6, $7, $8, $9, $10, NULL,
                       'Chưa đối soát', 'Chờ duyệt', 0, TRUE, 'Tự động', $11, $12)`,
            [
              `HD${contract.id}-${role.key.toUpperCase()}`,
              ...values.slice(0, 9),
              contract.id,
              role.key,
            ]
          );
        }
      }
    }
    // Đồng bộ tự động beneficiary_user_id cho các phiếu chưa có user_id
    await client.query(`
      UPDATE transaction_logs tl
      SET beneficiary_user_id = u.id
      FROM users u
      WHERE tl.beneficiary_user_id IS NULL
        AND (
          (NULLIF(REGEXP_REPLACE(tl.beneficiary_phone, '[^0-9]', '', 'g'), '') IS NOT NULL 
           AND REGEXP_REPLACE(tl.beneficiary_phone, '[^0-9]', '', 'g') = REGEXP_REPLACE(u.phone, '[^0-9]', '', 'g'))
          OR (tl.beneficiary_phone IS NULL AND LOWER(BTRIM(tl.beneficiary_name)) = LOWER(BTRIM(u.full_name)))
        )
    `);

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function getTransactionLogRows() {
  await ensureMemberSchema();
  await ensureOperationsFundBeneficiaries();
  const result = await pool.query(
    `${SELECT_TRANSACTION_LOGS} ORDER BY tl.id DESC`
  );
  return result.rows;
}
