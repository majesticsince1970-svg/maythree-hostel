-- MayThree Women's Hostel Management System
-- Migration 003: Database Functions
-- allocate_bed, check_out, next_ref_no

-- Generate next reference number: HST-2026-0001
CREATE OR REPLACE FUNCTION next_ref_no() RETURNS TEXT AS $$
DECLARE
  year_str TEXT;
  next_num INTEGER;
  ref TEXT;
BEGIN
  year_str := EXTRACT(YEAR FROM CURRENT_DATE)::TEXT;
  SELECT COALESCE(MAX(CAST(SPLIT_PART(ref_no, '-', 3) AS INTEGER)), 0) + 1
    INTO next_num
    FROM applications
    WHERE ref_no LIKE 'HST-' || year_str || '-%';
  ref := 'HST-' || year_str || '-' || LPAD(next_num::TEXT, 4, '0');
  RETURN ref;
END;
$$ LANGUAGE plpgsql;

-- Allocate a bed to an approved applicant
-- In one transaction: checks bed is available, creates resident, marks bed occupied, marks application approved
CREATE OR REPLACE FUNCTION allocate_bed(
  p_application_id UUID,
  p_bed_id UUID,
  p_check_in_date DATE,
  p_deposit NUMERIC DEFAULT 0
) RETURNS UUID AS $$
DECLARE
  v_bed_status bed_status;
  v_room_rent NUMERIC;
  v_resident_id UUID;
BEGIN
  -- Check caller is staff
  IF NOT is_staff() THEN
    RAISE EXCEPTION 'Only staff can allocate beds';
  END IF;

  -- Lock and check bed status
  SELECT status INTO v_bed_status FROM beds WHERE id = p_bed_id FOR UPDATE;
  IF v_bed_status IS NULL THEN
    RAISE EXCEPTION 'Bed not found';
  END IF;
  IF v_bed_status <> 'available' THEN
    RAISE EXCEPTION 'Bed is not available (current status: %)', v_bed_status;
  END IF;

  -- Get room rent
  SELECT rt.rent_per_head INTO v_room_rent
    FROM beds b
    JOIN rooms r ON b.room_id = r.id
    JOIN room_types rt ON r.room_type_id = rt.id
    WHERE b.id = p_bed_id;

  -- Create resident
  INSERT INTO residents (application_id, bed_id, check_in_date, monthly_rent, deposit_amount, status)
    VALUES (p_application_id, p_bed_id, p_check_in_date, v_room_rent, p_deposit, 'active')
    RETURNING id INTO v_resident_id;

  -- Mark bed as occupied
  UPDATE beds SET status = 'occupied' WHERE id = p_bed_id;

  -- Mark application as approved
  UPDATE applications SET status = 'approved', reviewed_by = auth.uid() WHERE id = p_application_id;

  -- Audit log
  INSERT INTO audit_log (action, table_name, record_id, new_values, performed_by)
    VALUES ('allocate_bed', 'residents', v_resident_id,
      jsonb_build_object('application_id', p_application_id, 'bed_id', p_bed_id, 'rent', v_room_rent),
      auth.uid());

  RETURN v_resident_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check out a resident
CREATE OR REPLACE FUNCTION check_out(
  p_resident_id UUID,
  p_date DATE
) RETURNS VOID AS $$
DECLARE
  v_bed_id UUID;
BEGIN
  IF NOT is_staff() THEN
    RAISE EXCEPTION 'Only staff can check out residents';
  END IF;

  -- Get bed_id and lock resident
  SELECT bed_id INTO v_bed_id FROM residents WHERE id = p_resident_id AND status = 'active' FOR UPDATE;
  IF v_bed_id IS NULL THEN
    RAISE EXCEPTION 'Active resident not found';
  END IF;

  -- Update resident
  UPDATE residents SET check_out_date = p_date, status = 'checked_out' WHERE id = p_resident_id;

  -- Free the bed
  UPDATE beds SET status = 'available' WHERE id = v_bed_id;

  -- Audit log
  INSERT INTO audit_log (action, table_name, record_id, new_values, performed_by)
    VALUES ('check_out', 'residents', p_resident_id,
      jsonb_build_object('check_out_date', p_date, 'bed_id', v_bed_id),
      auth.uid());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

