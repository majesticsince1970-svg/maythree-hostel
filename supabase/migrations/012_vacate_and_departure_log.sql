-- Migration 012: Vacating a resident and departure log
-- Supports Phase 2: Checkout, settlement, Cash Book posting, and PIN deactivation

-- 1. Ensure 'vacated' is part of resident_status
ALTER TYPE resident_status ADD VALUE IF NOT EXISTS 'vacated';

-- 2. Add PIN fields to residents (also supports Phase 3)
ALTER TABLE residents ADD COLUMN IF NOT EXISTS pin VARCHAR(4);
ALTER TABLE residents ADD COLUMN IF NOT EXISTS pin_active BOOLEAN DEFAULT TRUE;

-- 3. Create vacated_residents table (departure log)
CREATE TABLE IF NOT EXISTS vacated_residents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resident_id UUID NOT NULL,
  resident_name TEXT NOT NULL,
  room_no TEXT NOT NULL,
  bed_label TEXT NOT NULL,
  admission_date DATE NOT NULL,
  vacate_date DATE NOT NULL,
  reason TEXT,
  notes TEXT,
  pending_dues NUMERIC(10,2) DEFAULT 0,
  deposit_amount NUMERIC(10,2) DEFAULT 0,
  deductions NUMERIC(10,2) DEFAULT 0,
  settlement_amount NUMERIC(10,2) NOT NULL,
  settlement_type TEXT NOT NULL CHECK (settlement_type IN ('refund', 'collected', 'settled')),
  account_id TEXT,
  processed_by TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_vacated_residents_date ON vacated_residents(vacate_date);
CREATE INDEX IF NOT EXISTS idx_vacated_residents_name ON vacated_residents(resident_name);

-- 4. Enable RLS
ALTER TABLE vacated_residents ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'vacated_residents' AND policyname = 'Staff can read vacated_residents'
  ) THEN
    CREATE POLICY "Staff can read vacated_residents" ON vacated_residents FOR SELECT TO authenticated USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'vacated_residents' AND policyname = 'Staff can insert vacated_residents'
  ) THEN
    CREATE POLICY "Staff can insert vacated_residents" ON vacated_residents FOR INSERT TO authenticated WITH CHECK (true);
  END IF;
END $$;

