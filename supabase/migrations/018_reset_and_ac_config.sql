-- Migration 018: Reset clean data, AC room configuration, and fresh constraints
-- Enforce cash account kinds to include bank and upi if needed
ALTER TYPE cash_account_kind ADD VALUE IF NOT EXISTS 'bank';
ALTER TYPE cash_account_kind ADD VALUE IF NOT EXISTS 'upi';

-- Ensure 5 standard cash accounts exist
INSERT INTO cash_accounts (name, kind, float_limit, is_active)
VALUES
  ('Hostel Bank', 'bank', NULL, TRUE),
  ('Hostel UPI', 'upi', NULL, TRUE)
ON CONFLICT DO NOTHING;

-- Enforce AC configuration: Rooms 217, 218, 219 are AC at rate 13,000
-- Single rooms: 301-319 at 10,000
-- Twin sharing: 201-216 at 8,000, 217-219 at 13,000
-- 4-Sharing: Flats A-J at 7,000
