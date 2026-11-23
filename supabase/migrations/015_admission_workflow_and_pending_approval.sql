-- Migration 015: Public Admission Workflow & Pending Approval Status
-- Supports public admission submission with 'pending_approval' status, admin review and approval, and realtime synchronization

-- 1. Ensure 'pending_approval' exists in application_status enum
ALTER TYPE application_status ADD VALUE IF NOT EXISTS 'pending_approval';

-- 2. Set default application status to 'pending_approval'
ALTER TABLE applications ALTER COLUMN status SET DEFAULT 'pending_approval';

-- 3. Explicitly ensure anonymous users have permission to insert admission applications
DROP POLICY IF EXISTS "Anyone can submit applications" ON applications;
CREATE POLICY "Anyone can submit applications" ON applications
  FOR INSERT TO anon
  WITH CHECK (status IN ('pending_approval', 'submitted'));

-- 4. Ensure authenticated staff & admin have read/write access to view and update applications
DROP POLICY IF EXISTS "Staff can read applications" ON applications;
CREATE POLICY "Staff can read applications" ON applications
  FOR SELECT TO authenticated
  USING (is_staff() OR is_admin());

DROP POLICY IF EXISTS "Staff can update application status" ON applications;
CREATE POLICY "Staff can update application status" ON applications
  FOR UPDATE TO authenticated
  USING (is_staff() OR is_admin());

DROP POLICY IF EXISTS "Admin full access applications" ON applications;
CREATE POLICY "Admin full access applications" ON applications
  FOR ALL TO authenticated
  USING (is_admin());

-- 5. Ensure anonymous users can upload applicant documents
DROP POLICY IF EXISTS "Anyone can upload documents" ON documents;
CREATE POLICY "Anyone can upload documents" ON documents
  FOR INSERT TO anon
  WITH CHECK (TRUE);

-- 6. Add realtime publication for applications if not already added
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE applications;
EXCEPTION WHEN duplicate_object THEN NULL;
END;
$$;

