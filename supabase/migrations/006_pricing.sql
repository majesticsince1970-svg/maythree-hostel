-- MayThree Women's Hostel Management System
-- Migration 006: Rent Pricing and Approvals

-- Amenities (e.g., AC)
CREATE TABLE amenities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  addon_per_head NUMERIC(10,2) DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE
);

-- Room Amenities (which rooms have AC etc.)
CREATE TABLE room_amenities (
  room_id UUID NOT NULL REFERENCES rooms(id),
  amenity_id UUID NOT NULL REFERENCES amenities(id),
  installed_on DATE NOT NULL DEFAULT CURRENT_DATE,
  PRIMARY KEY (room_id, amenity_id)
);

-- Room Rates (rate history; current = latest effective date)
CREATE TABLE room_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES rooms(id),
  rate_per_head NUMERIC(10,2) NOT NULL,
  effective_from DATE NOT NULL,
  approved_by UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_room_rates_room ON room_rates(room_id);

-- Change request status
CREATE TYPE change_request_status AS ENUM ('pending', 'approved', 'rejected', 'cancelled');

-- Amenity Change Requests
CREATE TABLE amenity_change_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES rooms(id),
  amenity_id UUID NOT NULL REFERENCES amenities(id),
  action TEXT NOT NULL CHECK (action IN ('add', 'remove')),
  requested_by UUID NOT NULL,
  effective_from DATE NOT NULL,
  status change_request_status DEFAULT 'pending',
  decided_by UUID,
  decided_at TIMESTAMPTZ,
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Rent Change Requests (concession workflow)
CREATE TABLE rent_change_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resident_id UUID NOT NULL REFERENCES residents(id),
  standard_rent NUMERIC(10,2) NOT NULL,
  requested_rent NUMERIC(10,2) NOT NULL,
  reason TEXT NOT NULL,
  effective_from DATE NOT NULL,
  until DATE,
  requested_by UUID NOT NULL,
  status change_request_status DEFAULT 'pending',
  decided_by UUID,
  decided_at TIMESTAMPTZ,
  decision_note TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_rent_change_resident ON rent_change_requests(resident_id);
CREATE INDEX idx_rent_change_status ON rent_change_requests(status);

-- Resident Rent History
CREATE TYPE rent_history_source AS ENUM ('allocation', 'concession', 'rate_change');

CREATE TABLE resident_rent_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resident_id UUID NOT NULL REFERENCES residents(id),
  monthly_rent NUMERIC(10,2) NOT NULL,
  effective_from DATE NOT NULL,
  source rent_history_source NOT NULL,
  approved_by UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_rent_history_resident ON resident_rent_history(resident_id);

-- Enable RLS
ALTER TABLE amenities ENABLE ROW LEVEL SECURITY;
ALTER TABLE room_amenities ENABLE ROW LEVEL SECURITY;
ALTER TABLE room_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE amenity_change_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE rent_change_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE resident_rent_history ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Staff can read amenities" ON amenities FOR SELECT TO authenticated USING (is_staff());
CREATE POLICY "Admin manage amenities" ON amenities FOR ALL TO authenticated USING (is_admin());

CREATE POLICY "Staff can read room_amenities" ON room_amenities FOR SELECT TO authenticated USING (is_staff());
CREATE POLICY "Admin manage room_amenities" ON room_amenities FOR ALL TO authenticated USING (is_admin());

CREATE POLICY "Staff can read room_rates" ON room_rates FOR SELECT TO authenticated USING (is_staff());
CREATE POLICY "Admin manage room_rates" ON room_rates FOR ALL TO authenticated USING (is_admin());

CREATE POLICY "Staff can read amenity_change_requests" ON amenity_change_requests FOR SELECT TO authenticated USING (is_staff());
CREATE POLICY "Staff can insert amenity_change_requests" ON amenity_change_requests FOR INSERT TO authenticated WITH CHECK (is_staff());
CREATE POLICY "Admin manage amenity_change_requests" ON amenity_change_requests FOR ALL TO authenticated USING (is_admin());

CREATE POLICY "Staff can read rent_change_requests" ON rent_change_requests FOR SELECT TO authenticated USING (is_staff());
CREATE POLICY "Staff can insert rent_change_requests" ON rent_change_requests FOR INSERT TO authenticated WITH CHECK (is_staff());
CREATE POLICY "Admin manage rent_change_requests" ON rent_change_requests FOR ALL TO authenticated USING (is_admin());

CREATE POLICY "Staff can read rent_history" ON resident_rent_history FOR SELECT TO authenticated USING (is_staff());
CREATE POLICY "Admin manage rent_history" ON resident_rent_history FOR ALL TO authenticated USING (is_admin());

-- Functions for approval workflows
CREATE OR REPLACE FUNCTION approve_rent_change(p_request_id UUID, p_note TEXT DEFAULT NULL) RETURNS VOID AS $$
DECLARE
  v_req rent_change_requests%ROWTYPE;
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Only corporate admin can approve rent changes';
  END IF;

  SELECT * INTO v_req FROM rent_change_requests WHERE id = p_request_id AND status = 'pending' FOR UPDATE;
  IF v_req IS NULL THEN RAISE EXCEPTION 'Pending request not found'; END IF;

  -- Update request
  UPDATE rent_change_requests SET status = 'approved', decided_by = auth.uid(), decided_at = now(), decision_note = p_note
    WHERE id = p_request_id;

  -- Write rent history
  INSERT INTO resident_rent_history (resident_id, monthly_rent, effective_from, source, approved_by)
    VALUES (v_req.resident_id, v_req.requested_rent, v_req.effective_from, 'concession', auth.uid());

  -- Update current rent
  UPDATE residents SET monthly_rent = v_req.requested_rent WHERE id = v_req.resident_id;

  -- Audit
  INSERT INTO audit_log (action, table_name, record_id, new_values, performed_by)
    VALUES ('approve_rent_change', 'rent_change_requests', p_request_id,
      jsonb_build_object('resident_id', v_req.resident_id, 'new_rent', v_req.requested_rent), auth.uid());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION approve_amenity_change(p_request_id UUID, p_note TEXT DEFAULT NULL) RETURNS VOID AS $$
DECLARE
  v_req amenity_change_requests%ROWTYPE;
  v_addon NUMERIC;
  v_current_rate NUMERIC;
  v_new_rate NUMERIC;
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Only corporate admin can approve amenity changes';
  END IF;

  SELECT * INTO v_req FROM amenity_change_requests WHERE id = p_request_id AND status = 'pending' FOR UPDATE;
  IF v_req IS NULL THEN RAISE EXCEPTION 'Pending request not found'; END IF;

  -- Update request
  UPDATE amenity_change_requests SET status = 'approved', decided_by = auth.uid(), decided_at = now(), note = p_note
    WHERE id = p_request_id;

  IF v_req.action = 'add' THEN
    -- Add amenity to room
    INSERT INTO room_amenities (room_id, amenity_id, installed_on) VALUES (v_req.room_id, v_req.amenity_id, v_req.effective_from);

    -- Recalculate rate
    SELECT addon_per_head INTO v_addon FROM amenities WHERE id = v_req.amenity_id;
    SELECT rt.rent_per_head INTO v_current_rate FROM rooms r JOIN room_types rt ON r.room_type_id = rt.id WHERE r.id = v_req.room_id;
    v_new_rate := v_current_rate + COALESCE((SELECT SUM(a.addon_per_head) FROM room_amenities ra JOIN amenities a ON ra.amenity_id = a.id WHERE ra.room_id = v_req.room_id), 0);

    -- Insert new rate
    INSERT INTO room_rates (room_id, rate_per_head, effective_from, approved_by) VALUES (v_req.room_id, v_new_rate, v_req.effective_from, auth.uid());
  ELSE
    -- Remove amenity
    DELETE FROM room_amenities WHERE room_id = v_req.room_id AND amenity_id = v_req.amenity_id;
  END IF;

  INSERT INTO audit_log (action, table_name, record_id, new_values, performed_by)
    VALUES ('approve_amenity_change', 'amenity_change_requests', p_request_id,
      jsonb_build_object('room_id', v_req.room_id, 'action', v_req.action), auth.uid());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

