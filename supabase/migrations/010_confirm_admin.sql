-- Confirm admin@maythree.com and create staff profile
UPDATE auth.users SET email_confirmed_at = now() WHERE email = 'admin@maythree.com';

INSERT INTO staff_profiles (user_id, name, role)
SELECT id, 'System Admin', 'admin' FROM auth.users WHERE email = 'admin@maythree.com'
ON CONFLICT (user_id) DO UPDATE SET role = 'admin', name = 'System Admin';

