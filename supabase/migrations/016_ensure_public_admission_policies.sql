-- Migration 016: Public Admission Policies and Document Access
-- Guarantees public (anon) insert permissions on applications and documents for QR submissions,
-- and ensures staff can read and manage all applications and attached verification documents.

-- 1. Ensure public anonymous submission permissions
DROP POLICY IF EXISTS "Anyone can submit applications" ON applications;
CREATE POLICY "Anyone can submit applications" ON applications
  FOR INSERT TO anon
  WITH CHECK (TRUE);

-- 2. Ensure public anonymous document upload permissions
DROP POLICY IF EXISTS "Anyone can upload documents" ON documents;
CREATE POLICY "Anyone can upload documents" ON documents
  FOR INSERT TO anon
  WITH CHECK (TRUE);

-- 3. Ensure staff and admin can read all applications
DROP POLICY IF EXISTS "Staff can read applications" ON applications;
CREATE POLICY "Staff can read applications" ON applications
  FOR SELECT TO authenticated
  USING (is_staff() OR is_admin());

-- 4. Ensure staff and admin can update application status
DROP POLICY IF EXISTS "Staff can update application status" ON applications;
CREATE POLICY "Staff can update application status" ON applications
  FOR UPDATE TO authenticated
  USING (is_staff() OR is_admin());

-- 5. Ensure staff and admin can read all verification documents
DROP POLICY IF EXISTS "Staff can read documents" ON documents;
CREATE POLICY "Staff can read documents" ON documents
  FOR SELECT TO authenticated
  USING (is_staff() OR is_admin());

-- 6. Ensure realtime publication is enabled for applications
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE applications;
EXCEPTION WHEN duplicate_object THEN NULL;
END;
$$;

