-- Clean up manual record so GoTrue can create it properly
DELETE FROM staff_profiles WHERE user_id = '00000000-0000-0000-0000-000000000001';
DELETE FROM auth.identities WHERE user_id = '00000000-0000-0000-0000-000000000001';
DELETE FROM auth.users WHERE id = '00000000-0000-0000-0000-000000000001';

-- Confirm staff@maythree.com and make it an admin
UPDATE auth.users SET email_confirmed_at = now() WHERE email = 'staff@maythree.com';
INSERT INTO staff_profiles (user_id, name, role)
SELECT id, 'Staff Admin', 'admin' FROM auth.users WHERE email = 'staff@maythree.com'
ON CONFLICT (user_id) DO UPDATE SET role = 'admin';
