import pool from '@/lib/db';

export const SELECT_TRANSACTION_LOGS = `
  SELECT 
    tl.id, tl.request_code, tl.request_date::text AS request_date, tl.fund_source, tl.detail_content,
    tl.requester_id, tl.requester_name, tl.requester_phone, tl.approver_id, tl.approver_name, tl.approver_phone,
    tl.beneficiary_name, tl.beneficiary_phone, tl.beneficiary_user_id, tl.beneficiary_bank_account,
    tl.proposed_amount::float8 AS proposed_amount,
    tl.available_balance::float8 AS available_balance, tl.fund_alert, tl.status, tl.expense_type,
    tl.source_contract_id, tl.beneficiary_role,
    tl.actual_expense::float8 AS actual_expense, tl.receipt_url,
    tl.approval_date::text AS approval_date, tl.payment_date::text AS payment_date, tl.source_complete,
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
  LEFT JOIN users u ON (
    tl.beneficiary_user_id = u.id 
    OR (
      NULLIF(REGEXP_REPLACE(tl.beneficiary_phone, '[^0-9]', '', 'g'), '') IS NOT NULL 
      AND REGEXP_REPLACE(tl.beneficiary_phone, '[^0-9]', '', 'g') = REGEXP_REPLACE(u.phone, '[^0-9]', '', 'g')
    )
    OR (
      tl.beneficiary_phone IS NULL 
      AND LOWER(BTRIM(tl.beneficiary_name)) = LOWER(BTRIM(u.full_name))
    )
  )
  LEFT JOIN teams t ON u.team_id = t.id
  LEFT JOIN contracts c ON tl.source_contract_id = c.id
`;

export async function generateAutomaticContractSlips() {
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
          `SELECT id, bank_account
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
                 proposed_amount = $8, source_complete = TRUE
             WHERE id = $9`,
            [...values.slice(0, 8), existing.rows[0].id]
          );
        } else {
          await client.query(
            `INSERT INTO transaction_logs (
               request_code, request_date, fund_source, detail_content,
               requester_name, beneficiary_name, beneficiary_phone, beneficiary_user_id,
               beneficiary_bank_account, proposed_amount, available_balance, fund_alert,
               status, actual_expense, source_complete, expense_type,
               source_contract_id, beneficiary_role
             ) VALUES ($1, $2, $3, $4, 'Hệ thống', $5, $6, $7, $8, $9, NULL,
                       'Chưa đối soát', 'Chờ duyệt', 0, TRUE, 'Tự động', $10, $11)`,
            [
              `HD${contract.id}-${role.key.toUpperCase()}`,
              ...values.slice(0, 8),
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
  const result = await pool.query(
    `${SELECT_TRANSACTION_LOGS} ORDER BY request_date DESC NULLS LAST, id DESC`
  );
  return result.rows;
}
