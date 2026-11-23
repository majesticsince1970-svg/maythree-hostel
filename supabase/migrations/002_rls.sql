-- MayThree Women's Hostel Management System
-- Migration 002: Row Level Security
-- Security policies for all tables

-- Enable RLS on all tables
ALTER TABLE room_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE flats ENABLE ROW LEVEL SECURITY;
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE beds ENABLE ROW LEVEL SECURITY;
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE residents ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- Helper function to check staff role
CREATE OR REPLACE FUNCTION is_staff() RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM staff_profiles WHERE user_id = auth.uid() AND role IN ('admin', 'staff')
  );
$$ LANGUAGE sql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION is_admin() RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM staff_profiles WHERE user_id = auth.uid() AND role = 'admin'
  );
$$ LANGUAGE sql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION is_store_staff() RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM staff_profiles WHERE user_id = auth.uid() AND role IN ('admin', 'store_staff')
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- room_types: staff read, admin full
CREATE POLICY "Staff can read room_types" ON room_types FOR SELECT TO authenticated USING (is_staff() OR is_store_staff());
CREATE POLICY "Admin full access room_types" ON room_types FOR ALL TO authenticated USING (is_admin());

-- flats: staff read, admin full
CREATE POLICY "Staff can read flats" ON flats FOR SELECT TO authenticated USING (is_staff());
CREATE POLICY "Admin full access flats" ON flats FOR ALL TO authenticated USING (is_admin());

-- rooms: staff read, admin full
CREATE POLICY "Staff can read rooms" ON rooms FOR SELECT TO authenticated USING (is_staff() OR is_store_staff());
CREATE POLICY "Admin full access rooms" ON rooms FOR ALL TO authenticated USING (is_admin());

-- beds: staff read, updated only through allocate_bed
CREATE POLICY "Staff can read beds" ON beds FOR SELECT TO authenticated USING (is_staff());
CREATE POLICY "Admin full access beds" ON beds FOR ALL TO authenticated USING (is_admin());

-- applications: anonymous insert only, staff read+update status, admin full
CREATE POLICY "Anyone can submit applications" ON applications FOR INSERT TO anon WITH CHECK (TRUE);
CREATE POLICY "Staff can read applications" ON applications FOR SELECT TO authenticated USING (is_staff());
CREATE POLICY "Staff can update application status" ON applications FOR UPDATE TO authenticated USING (is_staff());
CREATE POLICY "Admin full access applications" ON applications FOR ALL TO authenticated USING (is_admin());

-- documents: anonymous insert own, staff read, admin full
CREATE POLICY "Anyone can upload documents" ON documents FOR INSERT TO anon WITH CHECK (TRUE);
CREATE POLICY "Staff can read documents" ON documents FOR SELECT TO authenticated USING (is_staff());
CREATE POLICY "Admin full access documents" ON documents FOR ALL TO authenticated USING (is_admin());

-- residents: staff read + create through allocate_bed, admin full
CREATE POLICY "Staff can read residents" ON residents FOR SELECT TO authenticated USING (is_staff());
CREATE POLICY "Staff can insert residents" ON residents FOR INSERT TO authenticated WITH CHECK (is_staff());
CREATE POLICY "Admin full access residents" ON residents FOR ALL TO authenticated USING (is_admin());

-- payments: staff read + insert, admin full (including corrections)
CREATE POLICY "Staff can read payments" ON payments FOR SELECT TO authenticated USING (is_staff());
CREATE POLICY "Staff can insert payments" ON payments FOR INSERT TO authenticated WITH CHECK (is_staff());
CREATE POLICY "Admin full access payments" ON payments FOR ALL TO authenticated USING (is_admin());

-- staff_profiles: read own row, admin full
CREATE POLICY "Staff can read own profile" ON staff_profiles FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Admin full access staff_profiles" ON staff_profiles FOR ALL TO authenticated USING (is_admin());

-- audit_log: staff read, admin full
CREATE POLICY "Staff can read audit_log" ON audit_log FOR SELECT TO authenticated USING (is_staff());
CREATE POLICY "Admin full access audit_log" ON audit_log FOR ALL TO authenticated USING (is_admin());

-- Public view for the QR admission form (anonymous read)
CREATE OR REPLACE VIEW v_public_room_options AS
SELECT
  rt.name AS room_type,
  FALSE AS has_ac,
  rt.rent_per_head,
  COUNT(CASE WHEN b.status = 'available' THEN 1 END) AS beds_available
FROM room_types rt
  JOIN rooms r ON r.room_type_id = rt.id AND r.is_active = TRUE
  JOIN beds b ON b.room_id = r.id
GROUP BY rt.id, rt.name, rt.rent_per_head
HAVING COUNT(CASE WHEN b.status = 'available' THEN 1 END) > 0;

-- Grant anonymous access to the public view
GRANT SELECT ON v_public_room_options TO anon;

