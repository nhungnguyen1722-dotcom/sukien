DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'contracts' AND column_name = 'customer_name'
  ) THEN
    ALTER TABLE contracts ADD COLUMN customer_name VARCHAR(255);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'contracts' AND column_name = 'allocated_value'
  ) THEN
    ALTER TABLE contracts ADD COLUMN allocated_value NUMERIC(15, 2);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'contracts' AND column_name = 'closer_name'
  ) THEN
    ALTER TABLE contracts ADD COLUMN closer_name VARCHAR(255);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'contracts' AND column_name = 'closer_phone'
  ) THEN
    ALTER TABLE contracts ADD COLUMN closer_phone VARCHAR(50);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'contracts' AND column_name = 'referrer_name'
  ) THEN
    ALTER TABLE contracts ADD COLUMN referrer_name VARCHAR(255);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'contracts' AND column_name = 'referrer_phone'
  ) THEN
    ALTER TABLE contracts ADD COLUMN referrer_phone VARCHAR(50);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'contracts' AND column_name = 'supporter_name'
  ) THEN
    ALTER TABLE contracts ADD COLUMN supporter_name VARCHAR(255);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'contracts' AND column_name = 'supporter_phone'
  ) THEN
    ALTER TABLE contracts ADD COLUMN supporter_phone VARCHAR(50);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'contracts' AND column_name = 'supporter_id'
  ) THEN
    ALTER TABLE contracts ADD COLUMN supporter_id INT REFERENCES users(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'contracts' AND column_name = 'closer_fee'
  ) THEN
    ALTER TABLE contracts ADD COLUMN closer_fee NUMERIC(15, 3) DEFAULT 0;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'contracts' AND column_name = 'referrer_fee'
  ) THEN
    ALTER TABLE contracts ADD COLUMN referrer_fee NUMERIC(15, 3) DEFAULT 0;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'contracts' AND column_name = 'supporter_fee'
  ) THEN
    ALTER TABLE contracts ADD COLUMN supporter_fee NUMERIC(15, 3) DEFAULT 0;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'contracts' AND column_name = 'status'
  ) THEN
    ALTER TABLE contracts ADD COLUMN status VARCHAR(50) DEFAULT 'Chờ duyệt';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'contracts' AND column_name = 'team_name'
  ) THEN
    ALTER TABLE contracts ADD COLUMN team_name VARCHAR(255);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'contracts' AND column_name = 'contract_type'
  ) THEN
    ALTER TABLE contracts ADD COLUMN contract_type VARCHAR(100);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'contracts' AND column_name = 'approved_date'
  ) THEN
    ALTER TABLE contracts ADD COLUMN approved_date DATE;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'contracts' AND column_name = 'file_url'
  ) THEN
    ALTER TABLE contracts ADD COLUMN file_url VARCHAR(500);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'contracts' AND column_name = 'notes'
  ) THEN
    ALTER TABLE contracts ADD COLUMN notes TEXT;
  END IF;
END $$;

ALTER TABLE contracts ALTER COLUMN closer_fee TYPE NUMERIC(15, 3);
ALTER TABLE contracts ALTER COLUMN referrer_fee TYPE NUMERIC(15, 3);
ALTER TABLE contracts ALTER COLUMN supporter_fee TYPE NUMERIC(15, 3);

UPDATE contracts
SET allocated_value = value
WHERE allocated_value IS NULL;
