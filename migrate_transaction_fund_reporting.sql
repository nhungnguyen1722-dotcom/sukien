-- Expense log fields and imported period summaries for weekly/monthly fund reporting.
-- Written to remain compatible with the local PostgreSQL 9.3 instance.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'transaction_logs' AND column_name = 'requester_phone') THEN
    ALTER TABLE transaction_logs ADD COLUMN requester_phone VARCHAR(32);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'transaction_logs' AND column_name = 'approver_phone') THEN
    ALTER TABLE transaction_logs ADD COLUMN approver_phone VARCHAR(32);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'transaction_logs' AND column_name = 'beneficiary_phone') THEN
    ALTER TABLE transaction_logs ADD COLUMN beneficiary_phone VARCHAR(32);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'transaction_logs' AND column_name = 'approval_date') THEN
    ALTER TABLE transaction_logs ADD COLUMN approval_date DATE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'transaction_logs' AND column_name = 'payment_date') THEN
    ALTER TABLE transaction_logs ADD COLUMN payment_date DATE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'transaction_logs' AND column_name = 'source_row') THEN
    ALTER TABLE transaction_logs ADD COLUMN source_row INTEGER;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'transaction_logs' AND column_name = 'source_complete') THEN
    ALTER TABLE transaction_logs ADD COLUMN source_complete BOOLEAN NOT NULL DEFAULT FALSE;
  END IF;
END $$;

ALTER TABLE transaction_logs ALTER COLUMN request_date DROP NOT NULL;
ALTER TABLE transaction_logs ALTER COLUMN proposed_amount DROP NOT NULL;
ALTER TABLE transaction_logs ALTER COLUMN available_balance DROP NOT NULL;

CREATE TABLE IF NOT EXISTS fund_weekly_allocations (
  id SERIAL PRIMARY KEY,
  period_code VARCHAR(32) NOT NULL,
  period_month VARCHAR(7) NOT NULL,
  period_label VARCHAR(80) NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  fund_key VARCHAR(48) NOT NULL,
  fund_source VARCHAR(120) NOT NULL,
  allocation_rate NUMERIC(7,5) NOT NULL DEFAULT 0,
  requested_amount NUMERIC(18,2) NOT NULL DEFAULT 0,
  source_sheet VARCHAR(80) NOT NULL,
  CONSTRAINT fund_weekly_allocations_period_fund_unique UNIQUE (period_code, fund_key)
);

CREATE TABLE IF NOT EXISTS fund_event_expenses (
  id SERIAL PRIMARY KEY,
  source_sheet VARCHAR(80) NOT NULL,
  source_row INTEGER NOT NULL,
  event_code VARCHAR(32) NOT NULL,
  event_date DATE NOT NULL,
  beneficiary_phone VARCHAR(32),
  beneficiary_name VARCHAR(120) NOT NULL,
  expense_role VARCHAR(120) NOT NULL,
  proposed_amount NUMERIC(18,2) NOT NULL DEFAULT 0,
  status VARCHAR(40) NOT NULL DEFAULT 'Chờ duyệt',
  CONSTRAINT fund_event_expenses_source_unique UNIQUE (source_sheet, source_row)
);
