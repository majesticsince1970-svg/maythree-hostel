-- Migration 019: Security, RLS Hardening and Bed Allocation Integrity
-- Enforces S1-S4 and H2 at the PostgreSQL database level.

-- 1. Ensure RLS is enabled on all tables
ALTER TABLE IF EXISTS residents ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS cash_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS cash_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS cash_counts ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS stock_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS stock_purchase_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS stock_counts ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS vacated_residents ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS checkout_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS staff_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS app_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS audit_log ENABLE ROW LEVEL SECURITY;

-- 2. H2: Database level constraint: exactly one active resident per bed
CREATE UNIQUE INDEX IF NOT EXISTS idx_one_active_resident_per_bed 
  ON residents(bed_id) 
  WHERE status = 'active';

-- H2: Database level constraint: exactly one active bed per resident application
CREATE UNIQUE INDEX IF NOT EXISTS idx_one_active_bed_per_resident 
  ON residents(application_id) 
  WHERE status = 'active';

-- 3. S3: Block anonymous read on sensitive tables
-- Revoke all direct anon permissions on sensitive data
REVOKE ALL ON TABLE residents FROM anon;
REVOKE ALL ON TABLE payments FROM anon;
REVOKE ALL ON TABLE expenses FROM anon;
REVOKE ALL ON TABLE cash_accounts FROM anon;
REVOKE ALL ON TABLE cash_transactions FROM anon;
REVOKE ALL ON TABLE cash_counts FROM anon;
REVOKE ALL ON TABLE staff_profiles FROM anon;
REVOKE ALL ON TABLE audit_log FROM anon;
REVOKE ALL ON TABLE vacated_residents FROM anon;
REVOKE ALL ON TABLE checkout_receipts FROM anon;

-- Anon can ONLY insert applications and documents for public /apply
GRANT INSERT ON TABLE applications TO anon;
GRANT INSERT ON TABLE documents TO anon;
GRANT SELECT ON v_public_room_options TO anon;

-- 4. S4: Server-side RLS policies for vacated_residents and checkout_receipts
DROP POLICY IF EXISTS "Staff read vacated_residents" ON vacated_residents;
CREATE POLICY "Staff read vacated_residents" ON vacated_residents
  FOR SELECT TO authenticated
  USING (is_staff() OR is_admin());

DROP POLICY IF EXISTS "Admin manage vacated_residents" ON vacated_residents;
CREATE POLICY "Admin manage vacated_residents" ON vacated_residents
  FOR ALL TO authenticated
  USING (is_admin());

DROP POLICY IF EXISTS "Staff read checkout_receipts" ON checkout_receipts;
CREATE POLICY "Staff read checkout_receipts" ON checkout_receipts
  FOR SELECT TO authenticated
  USING (is_staff() OR is_admin());

DROP POLICY IF EXISTS "Admin manage checkout_receipts" ON checkout_receipts;
CREATE POLICY "Admin manage checkout_receipts" ON checkout_receipts
  FOR ALL TO authenticated
  USING (is_admin());
