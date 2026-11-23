-- MayThree Women's Hostel - Migration 007: Seed Data (Room Types, Flats, 66 Rooms, 169 Beds, Products)

-- 1. Room Types
INSERT INTO room_types (id, name, beds_per_room, rent_per_head, has_attached_toilet) VALUES
  ('11111111-1111-1111-1111-111111111111', 'Twin Sharing', 2, 8000, TRUE),
  ('22222222-2222-2222-2222-222222222222', 'Single Room', 1, 10000, TRUE),
  ('33333333-3333-3333-3333-333333333333', '4-Sharing', 4, 7000, FALSE)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  rent_per_head = EXCLUDED.rent_per_head;

-- 2. Flats (A to J)
INSERT INTO flats (id, code, bhk, floor) VALUES
  ('a0000000-0000-0000-0000-000000000001', 'A', 2, 1),
  ('a0000000-0000-0000-0000-000000000002', 'B', 3, 1),
  ('a0000000-0000-0000-0000-000000000003', 'C', 3, 1),
  ('a0000000-0000-0000-0000-000000000004', 'D', 3, 1),
  ('a0000000-0000-0000-0000-000000000005', 'E', 3, 1),
  ('a0000000-0000-0000-0000-000000000006', 'F', 2, 1),
  ('a0000000-0000-0000-0000-000000000007', 'G', 3, 1),
  ('a0000000-0000-0000-0000-000000000008', 'H', 3, 1),
  ('a0000000-0000-0000-0000-000000000009', 'I', 3, 1),
  ('a0000000-0000-0000-0000-00000000000a', 'J', 3, 1)
ON CONFLICT (code) DO NOTHING;

-- 3. Floor 2: Twin Sharing rooms 201-219 (19 rooms)
DO $$
DECLARE
  r_num INT;
  v_room_id UUID;
BEGIN
  FOR r_num IN 201..219 LOOP
    INSERT INTO rooms (room_no, room_type_id, flat_id, floor)
    VALUES (r_num::TEXT, '11111111-1111-1111-1111-111111111111', NULL, 2)
    ON CONFLICT (room_no) DO UPDATE SET room_type_id = EXCLUDED.room_type_id
    RETURNING id INTO v_room_id;

    -- Add beds A and B if not exist
    IF NOT EXISTS (SELECT 1 FROM beds WHERE room_id = v_room_id AND bed_label = 'A') THEN
      INSERT INTO beds (room_id, bed_label, status) VALUES (v_room_id, 'A', 'available');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM beds WHERE room_id = v_room_id AND bed_label = 'B') THEN
      INSERT INTO beds (room_id, bed_label, status) VALUES (v_room_id, 'B', 'available');
    END IF;
  END LOOP;
END $$;

-- 4. Floor 3: Single rooms 301-319 (19 rooms)
DO $$
DECLARE
  r_num INT;
  v_room_id UUID;
BEGIN
  FOR r_num IN 301..319 LOOP
    INSERT INTO rooms (room_no, room_type_id, flat_id, floor)
    VALUES (r_num::TEXT, '22222222-2222-2222-2222-222222222222', NULL, 3)
    ON CONFLICT (room_no) DO UPDATE SET room_type_id = EXCLUDED.room_type_id
    RETURNING id INTO v_room_id;

    -- Add bed A if not exist
    IF NOT EXISTS (SELECT 1 FROM beds WHERE room_id = v_room_id AND bed_label = 'A') THEN
      INSERT INTO beds (room_id, bed_label, status) VALUES (v_room_id, 'A', 'available');
    END IF;
  END LOOP;
END $$;

-- 5. Flat rooms (Flats A-J, 4-sharing)
DO $$
DECLARE
  f RECORD;
  r_count INT;
  i INT;
  v_room_no TEXT;
  v_room_id UUID;
  lbl TEXT;
BEGIN
  FOR f IN SELECT id, code, bhk, floor FROM flats LOOP
    r_count := f.bhk;
    FOR i IN 1..r_count LOOP
      v_room_no := f.code || i::TEXT;
      INSERT INTO rooms (room_no, room_type_id, flat_id, floor)
      VALUES (v_room_no, '33333333-3333-3333-3333-333333333333', f.id, f.floor)
      ON CONFLICT (room_no) DO UPDATE SET room_type_id = EXCLUDED.room_type_id
      RETURNING id INTO v_room_id;

      -- Add 4 beds: A, B, C, D
      FOREACH lbl IN ARRAY ARRAY['A', 'B', 'C', 'D'] LOOP
        IF NOT EXISTS (SELECT 1 FROM beds WHERE room_id = v_room_id AND bed_label = lbl) THEN
          INSERT INTO beds (room_id, bed_label, status) VALUES (v_room_id, lbl, 'available');
        END IF;
      END LOOP;
    END LOOP;
  END LOOP;
END $$;

-- 6. Initial Store Products
INSERT INTO products (id, name, category, unit, barcode, cost_price, selling_price, reorder_level) VALUES
  ('44444444-4444-4444-4444-444444444401', 'Maggi Noodles', 'Snacks', 'packet', '8901234567890', 12.00, 15.00, 20),
  ('44444444-4444-4444-4444-444444444402', 'Lays Chips (Classic)', 'Snacks', 'packet', '8901234567891', 16.00, 20.00, 15),
  ('44444444-4444-4444-4444-444444444403', 'Dove Soap', 'Toiletries', 'piece', '8901234567892', 45.00, 55.00, 10),
  ('44444444-4444-4444-4444-444444444404', 'Bisleri Water (1L)', 'Drinks', 'bottle', '8901234567893', 15.00, 20.00, 30),
  ('44444444-4444-4444-4444-444444444405', 'Notebook (200 pages)', 'Stationery', 'piece', '8901234567894', 30.00, 40.00, 10),
  ('44444444-4444-4444-4444-444444444406', 'Pen (Blue)', 'Stationery', 'piece', NULL, 5.00, 10.00, 20),
  ('44444444-4444-4444-4444-444444444407', 'Coca Cola (300ml)', 'Drinks', 'bottle', '8901234567896', 25.00, 30.00, 20),
  ('44444444-4444-4444-4444-444444444408', 'Colgate Toothpaste', 'Toiletries', 'tube', '8901234567897', 60.00, 75.00, 8)
ON CONFLICT (id) DO NOTHING;

-- Initial opening stock movements
INSERT INTO stock_movements (product_id, date, type, qty) VALUES
  ('44444444-4444-4444-4444-444444444401', CURRENT_DATE, 'purchase', 45),
  ('44444444-4444-4444-4444-444444444402', CURRENT_DATE, 'purchase', 32),
  ('44444444-4444-4444-4444-444444444403', CURRENT_DATE, 'purchase', 18),
  ('44444444-4444-4444-4444-444444444404', CURRENT_DATE, 'purchase', 8),
  ('44444444-4444-4444-4444-444444444405', CURRENT_DATE, 'purchase', 25),
  ('44444444-4444-4444-4444-444444444406', CURRENT_DATE, 'purchase', 50),
  ('44444444-4444-4444-4444-444444444407', CURRENT_DATE, 'purchase', 15),
  ('44444444-4444-4444-4444-444444444408', CURRENT_DATE, 'purchase', 12)
ON CONFLICT DO NOTHING;
