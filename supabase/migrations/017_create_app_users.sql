-- Migration 017: Create app_users table for cross-device authentication and user management

CREATE TABLE IF NOT EXISTS app_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'staff',
  email TEXT,
  username TEXT NOT NULL,
  password TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_app_users_username ON app_users(LOWER(username));
CREATE INDEX IF NOT EXISTS idx_app_users_email ON app_users(LOWER(email));

ALTER TABLE app_users ENABLE ROW LEVEL SECURITY;

-- Allow reading app_users for login verification across mobile and laptop
DROP POLICY IF EXISTS "Public read app_users for login" ON app_users;
CREATE POLICY "Public read app_users for login" ON app_users
  FOR SELECT TO anon, authenticated
  USING (true);

-- Allow admins to insert/update/delete users
DROP POLICY IF EXISTS "Admin write app_users" ON app_users;
CREATE POLICY "Admin write app_users" ON app_users
  FOR ALL TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE app_users;
EXCEPTION WHEN duplicate_object THEN NULL;
END;
$$;
