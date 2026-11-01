-- Migration 013: Admissions verification, checkout receipts, and advance settlement breakdown

-- 1. Add extra settlement columns to vacated_residents
ALTER TABLE vacated_residents ADD COLUMN IF NOT EXISTS receipt_no TEXT;
ALTER TABLE vacated_residents ADD COLUMN IF NOT EXISTS advance_status TEXT DEFAULT 'Returned';
ALTER TABLE vacated_residents ADD COLUMN IF NOT EXISTS payment_mode TEXT DEFAULT 'cash';
ALTER TABLE vacated_residents ADD COLUMN IF NOT EXISTS rent_breakdown JSONB;
ALTER TABLE vacated_residents ADD COLUMN IF NOT EXISTS deductions_breakdown JSONB;

-- 2. Create checkout_receipts table
CREATE TABLE IF NOT EXISTS checkout_receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  receipt_no TEXT NOT NULL UNIQUE,
  vacated_id UUID REFERENCES vacated_residents(id) ON DELETE SET NULL,
  resident_id UUID NOT NULL,
  resident_name TEXT NOT NULL,
  phone TEXT,
  room_no TEXT NOT NULL,
  bed_label TEXT NOT NULL,
  admission_date DATE NOT NULL,
  checkout_date DATE NOT NULL,
  advance_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  pending_rent_deducted NUMERIC(10,2) NOT NULL DEFAULT 0,
  other_deductions NUMERIC(10,2) NOT NULL DEFAULT 0,
  final_refund_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  settlement_type TEXT NOT NULL CHECK (settlement_type IN ('refund', 'collected', 'settled')),
  amount_in_words TEXT NOT NULL,
  payment_mode TEXT NOT NULL DEFAULT 'cash',
  account_id TEXT,
  rent_breakdown JSONB,
  deductions_breakdown JSONB,
  notes TEXT,
  issued_by TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_checkout_receipts_no ON checkout_receipts(receipt_no);
CREATE INDEX IF NOT EXISTS idx_checkout_receipts_resident ON checkout_receipts(resident_id);
CREATE INDEX IF NOT EXISTS idx_checkout_receipts_date ON checkout_receipts(checkout_date);

-- 3. Enable RLS
ALTER TABLE checkout_receipts ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'checkout_receipts' AND policyname = 'Staff can read checkout_receipts'
  ) THEN
    CREATE POLICY "Staff can read checkout_receipts" ON checkout_receipts FOR SELECT TO authenticated USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'checkout_receipts' AND policyname = 'Staff can insert checkout_receipts'
  ) THEN
    CREATE POLICY "Staff can insert checkout_receipts" ON checkout_receipts FOR INSERT TO authenticated WITH CHECK (true);
  END IF;
END $$;
