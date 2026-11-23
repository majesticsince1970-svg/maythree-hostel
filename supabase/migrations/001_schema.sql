-- MayThree Women's Hostel Management System
-- Migration 001: Core Schema
-- Tables: room_types, flats, rooms, beds, applications, documents, residents, payments, staff_profiles, audit_log

-- Enums
CREATE TYPE application_status AS ENUM ('submitted', 'under_review', 'approved', 'rejected', 'waitlisted');
CREATE TYPE bed_status AS ENUM ('available', 'reserved', 'occupied', 'maintenance');
CREATE TYPE resident_status AS ENUM ('active', 'notice', 'checked_out');
CREATE TYPE payment_mode AS ENUM ('cash', 'UPI', 'bank');
CREATE TYPE document_kind AS ENUM ('photo', 'id_proof', 'certificate', 'other');
CREATE TYPE staff_role AS ENUM ('admin', 'staff', 'store_staff');

-- Room Types
CREATE TABLE room_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  beds_per_room INTEGER NOT NULL,
  rent_per_head NUMERIC(10,2) NOT NULL,
  has_attached_toilet BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_room_types_name ON room_types(name);

-- Flats (only for 4-sharing block)
CREATE TABLE flats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  bhk INTEGER NOT NULL,
  floor INTEGER NOT NULL
);

-- Rooms
CREATE TABLE rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_no TEXT NOT NULL UNIQUE,
  room_type_id UUID NOT NULL REFERENCES room_types(id),
  flat_id UUID REFERENCES flats(id),
  floor INTEGER NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_rooms_type ON rooms(room_type_id);
CREATE INDEX idx_rooms_flat ON rooms(flat_id);
CREATE INDEX idx_rooms_floor ON rooms(floor);

-- Beds (one row per bed — 169 rows; the unit you allocate)
CREATE TABLE beds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES rooms(id),
  bed_label TEXT NOT NULL,
  status bed_status DEFAULT 'available',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(room_id, bed_label)
);
CREATE INDEX idx_beds_status ON beds(status);
CREATE INDEX idx_beds_room ON beds(room_id);

-- Applications (written by the public QR form)
CREATE TABLE applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ref_no TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  dob DATE NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  permanent_address TEXT NOT NULL,
  occupation TEXT NOT NULL,
  institution_or_employer TEXT NOT NULL,
  id_proof_type TEXT NOT NULL,
  id_proof_no TEXT NOT NULL,
  emergency_name TEXT NOT NULL,
  emergency_relation TEXT NOT NULL,
  emergency_phone TEXT NOT NULL,
  preferred_room_type_id UUID REFERENCES room_types(id),
  preferred_ac TEXT DEFAULT 'any' CHECK (preferred_ac IN ('yes', 'no', 'any')),
  status application_status DEFAULT 'submitted',
  submitted_at TIMESTAMPTZ DEFAULT now(),
  reviewed_by UUID,
  review_note TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_applications_status ON applications(status);
CREATE INDEX idx_applications_ref ON applications(ref_no);

-- Documents
CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  kind document_kind NOT NULL,
  storage_path TEXT NOT NULL,
  verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_documents_application ON documents(application_id);

-- Residents
CREATE TABLE residents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL REFERENCES applications(id),
  bed_id UUID NOT NULL REFERENCES beds(id),
  check_in_date DATE NOT NULL,
  check_out_date DATE,
  monthly_rent NUMERIC(10,2) NOT NULL,
  deposit_amount NUMERIC(10,2) DEFAULT 0,
  status resident_status DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_residents_status ON residents(status);
CREATE INDEX idx_residents_bed ON residents(bed_id);

-- Payments
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resident_id UUID NOT NULL REFERENCES residents(id),
  period_month TEXT NOT NULL, -- YYYY-MM
  amount NUMERIC(10,2) NOT NULL,
  paid_on DATE NOT NULL,
  mode payment_mode NOT NULL,
  reference TEXT,
  received_by UUID NOT NULL,
  receipt_no TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_payments_resident ON payments(resident_id);
CREATE INDEX idx_payments_month ON payments(period_month);

-- Staff Profiles
CREATE TABLE staff_profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id),
  name TEXT NOT NULL,
  role staff_role NOT NULL DEFAULT 'staff',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Audit Log
CREATE TABLE audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action TEXT NOT NULL,
  table_name TEXT NOT NULL,
  record_id UUID,
  old_values JSONB,
  new_values JSONB,
  performed_by UUID,
  performed_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_audit_log_table ON audit_log(table_name);
CREATE INDEX idx_audit_log_action ON audit_log(action);

-- Views
CREATE OR REPLACE VIEW v_occupancy AS
SELECT
  r.id AS room_id,
  r.room_no,
  rt.name AS room_type,
  r.floor,
  f.code AS flat_code,
  COUNT(b.id) AS total_beds,
  COUNT(CASE WHEN b.status = 'available' THEN 1 END) AS available,
  COUNT(CASE WHEN b.status = 'occupied' THEN 1 END) AS occupied,
  COUNT(CASE WHEN b.status = 'reserved' THEN 1 END) AS reserved,
  COUNT(CASE WHEN b.status = 'maintenance' THEN 1 END) AS maintenance
FROM rooms r
  JOIN room_types rt ON r.room_type_id = rt.id
  LEFT JOIN flats f ON r.flat_id = f.id
  JOIN beds b ON b.room_id = r.id
WHERE r.is_active = TRUE
GROUP BY r.id, r.room_no, rt.name, r.floor, f.code;

CREATE OR REPLACE VIEW v_rent_due AS
SELECT
  res.id AS resident_id,
  a.full_name AS resident_name,
  r.room_no,
  b.bed_label,
  TO_CHAR(CURRENT_DATE, 'YYYY-MM') AS period_month,
  res.monthly_rent AS rent_due,
  COALESCE(SUM(p.amount), 0) AS paid,
  res.monthly_rent - COALESCE(SUM(p.amount), 0) AS balance,
  a.phone
FROM residents res
  JOIN applications a ON res.application_id = a.id
  JOIN beds b ON res.bed_id = b.id
  JOIN rooms r ON b.room_id = r.id
  LEFT JOIN payments p ON p.resident_id = res.id AND p.period_month = TO_CHAR(CURRENT_DATE, 'YYYY-MM')
WHERE res.status = 'active'
GROUP BY res.id, a.full_name, r.room_no, b.bed_label, res.monthly_rent, a.phone;

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers
CREATE TRIGGER tr_room_types_updated_at BEFORE UPDATE ON room_types FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER tr_rooms_updated_at BEFORE UPDATE ON rooms FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER tr_beds_updated_at BEFORE UPDATE ON beds FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER tr_applications_updated_at BEFORE UPDATE ON applications FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER tr_residents_updated_at BEFORE UPDATE ON residents FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER tr_staff_profiles_updated_at BEFORE UPDATE ON staff_profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at();

