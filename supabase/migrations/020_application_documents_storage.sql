-- Migration 020: Store application documents in Supabase Storage
-- Photos, ID proofs and certificates uploaded from the public admission form are stored as
-- files in a private bucket. documents.storage_path holds the object path
-- (applications/<application id>/<kind>.<ext>), not the file contents.

-- 1. Private bucket, 5 MB per file (matches the limit shown on the form).
--    No MIME allow-list: some phones send HEIC photos that the browser can't convert.
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('application-documents', 'application-documents', false, 5242880)
ON CONFLICT (id) DO UPDATE
  SET public = false,
      file_size_limit = EXCLUDED.file_size_limit;

-- 2. The public form may upload, signed in or not, but only under applications/.
--    No update or delete: an uploaded document can't be overwritten from the form.
DROP POLICY IF EXISTS "Public form can upload application documents" ON storage.objects;
CREATE POLICY "Public form can upload application documents" ON storage.objects
  FOR INSERT TO anon, authenticated
  WITH CHECK (
    bucket_id = 'application-documents'
    AND (storage.foldername(name))[1] = 'applications'
  );

-- 3. Only staff can view uploaded documents (through short-lived signed URLs).
DROP POLICY IF EXISTS "Staff can read application documents" ON storage.objects;
CREATE POLICY "Staff can read application documents" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'application-documents'
    AND (is_staff() OR is_admin())
  );
