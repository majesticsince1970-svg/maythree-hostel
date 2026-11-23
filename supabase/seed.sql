-- MayThree Women's Hostel - Seed Data
-- 3 room types, flats A-J, 66 rooms, 169 beds

-- Room Types
INSERT INTO room_types (id, name, beds_per_room, rent_per_head, has_attached_toilet) VALUES
  ('rt-twin', 'Twin Sharing', 2, 8000, TRUE),
  ('rt-single', 'Single Room', 1, 10000, TRUE),
  ('rt-four', '4-Sharing', 4, 7000, FALSE);

-- Flats (4-sharing block)
INSERT INTO flats (id, code, bhk, floor) VALUES
  ('flat-a', 'A', 2, 1),
  ('flat-b', 'B', 3, 1),
  ('flat-c', 'C', 3, 1),
  ('flat-d', 'D', 3, 1),
  ('flat-e', 'E', 3, 1),
  ('flat-f', 'F', 2, 1),
  ('flat-g', 'G', 3, 1),
  ('flat-h', 'H', 3, 1),
  ('flat-i', 'I', 3, 1),
  ('flat-j', 'J', 3, 1);

-- Floor 2: Twin Sharing rooms 201-219 (19 rooms × 2 beds = 38 beds)
INSERT INTO rooms (id, room_no, room_type_id, flat_id, floor) VALUES
  ('room-201', '201', 'rt-twin', NULL, 2),
  ('room-202', '202', 'rt-twin', NULL, 2),
  ('room-203', '203', 'rt-twin', NULL, 2),
  ('room-204', '204', 'rt-twin', NULL, 2),
  ('room-205', '205', 'rt-twin', NULL, 2),
  ('room-206', '206', 'rt-twin', NULL, 2),
  ('room-207', '207', 'rt-twin', NULL, 2),
  ('room-208', '208', 'rt-twin', NULL, 2),
  ('room-209', '209', 'rt-twin', NULL, 2),
  ('room-210', '210', 'rt-twin', NULL, 2),
  ('room-211', '211', 'rt-twin', NULL, 2),
  ('room-212', '212', 'rt-twin', NULL, 2),
  ('room-213', '213', 'rt-twin', NULL, 2),
  ('room-214', '214', 'rt-twin', NULL, 2),
  ('room-215', '215', 'rt-twin', NULL, 2),
  ('room-216', '216', 'rt-twin', NULL, 2),
  ('room-217', '217', 'rt-twin', NULL, 2),
  ('room-218', '218', 'rt-twin', NULL, 2),
  ('room-219', '219', 'rt-twin', NULL, 2);

-- Beds for Floor 2 (2 per room: A, B)
INSERT INTO beds (room_id, bed_label, status)
  SELECT r.id, label, 'available'
  FROM rooms r, (VALUES ('A'), ('B')) AS labels(label)
  WHERE r.floor = 2 AND r.flat_id IS NULL;

-- Floor 3: Single rooms 301-319 (19 rooms × 1 bed = 19 beds)
INSERT INTO rooms (id, room_no, room_type_id, flat_id, floor) VALUES
  ('room-301', '301', 'rt-single', NULL, 3),
  ('room-302', '302', 'rt-single', NULL, 3),
  ('room-303', '303', 'rt-single', NULL, 3),
  ('room-304', '304', 'rt-single', NULL, 3),
  ('room-305', '305', 'rt-single', NULL, 3),
  ('room-306', '306', 'rt-single', NULL, 3),
  ('room-307', '307', 'rt-single', NULL, 3),
  ('room-308', '308', 'rt-single', NULL, 3),
  ('room-309', '309', 'rt-single', NULL, 3),
  ('room-310', '310', 'rt-single', NULL, 3),
  ('room-311', '311', 'rt-single', NULL, 3),
  ('room-312', '312', 'rt-single', NULL, 3),
  ('room-313', '313', 'rt-single', NULL, 3),
  ('room-314', '314', 'rt-single', NULL, 3),
  ('room-315', '315', 'rt-single', NULL, 3),
  ('room-316', '316', 'rt-single', NULL, 3),
  ('room-317', '317', 'rt-single', NULL, 3),
  ('room-318', '318', 'rt-single', NULL, 3),
  ('room-319', '319', 'rt-single', NULL, 3);

-- Beds for Floor 3 (1 per room: A)
INSERT INTO beds (room_id, bed_label, status)
  SELECT r.id, 'A', 'available'
  FROM rooms r
  WHERE r.floor = 3 AND r.flat_id IS NULL;

-- Flat rooms with 4 beds each
-- Flat A (2 BHK = 2 rooms)
INSERT INTO rooms (id, room_no, room_type_id, flat_id, floor) VALUES
  ('room-a1', 'A1', 'rt-four', 'flat-a', 1),
  ('room-a2', 'A2', 'rt-four', 'flat-a', 1);

-- Flat B (3 BHK = 3 rooms)
INSERT INTO rooms (id, room_no, room_type_id, flat_id, floor) VALUES
  ('room-b1', 'B1', 'rt-four', 'flat-b', 1),
  ('room-b2', 'B2', 'rt-four', 'flat-b', 1),
  ('room-b3', 'B3', 'rt-four', 'flat-b', 1);

-- Flat C (3 BHK = 3 rooms)
INSERT INTO rooms (id, room_no, room_type_id, flat_id, floor) VALUES
  ('room-c1', 'C1', 'rt-four', 'flat-c', 1),
  ('room-c2', 'C2', 'rt-four', 'flat-c', 1),
  ('room-c3', 'C3', 'rt-four', 'flat-c', 1);

-- Flat D (3 BHK = 3 rooms)
INSERT INTO rooms (id, room_no, room_type_id, flat_id, floor) VALUES
  ('room-d1', 'D1', 'rt-four', 'flat-d', 1),
  ('room-d2', 'D2', 'rt-four', 'flat-d', 1),
  ('room-d3', 'D3', 'rt-four', 'flat-d', 1);

-- Flat E (3 BHK = 3 rooms)
INSERT INTO rooms (id, room_no, room_type_id, flat_id, floor) VALUES
  ('room-e1', 'E1', 'rt-four', 'flat-e', 1),
  ('room-e2', 'E2', 'rt-four', 'flat-e', 1),
  ('room-e3', 'E3', 'rt-four', 'flat-e', 1);

-- Flat F (2 BHK = 2 rooms)
INSERT INTO rooms (id, room_no, room_type_id, flat_id, floor) VALUES
  ('room-f1', 'F1', 'rt-four', 'flat-f', 1),
  ('room-f2', 'F2', 'rt-four', 'flat-f', 1);

-- Flat G (3 BHK = 3 rooms)
INSERT INTO rooms (id, room_no, room_type_id, flat_id, floor) VALUES
  ('room-g1', 'G1', 'rt-four', 'flat-g', 1),
  ('room-g2', 'G2', 'rt-four', 'flat-g', 1),
  ('room-g3', 'G3', 'rt-four', 'flat-g', 1);

-- Flat H (3 BHK = 3 rooms)
INSERT INTO rooms (id, room_no, room_type_id, flat_id, floor) VALUES
  ('room-h1', 'H1', 'rt-four', 'flat-h', 1),
  ('room-h2', 'H2', 'rt-four', 'flat-h', 1),
  ('room-h3', 'H3', 'rt-four', 'flat-h', 1);

-- Flat I (3 BHK = 3 rooms)
INSERT INTO rooms (id, room_no, room_type_id, flat_id, floor) VALUES
  ('room-i1', 'I1', 'rt-four', 'flat-i', 1),
  ('room-i2', 'I2', 'rt-four', 'flat-i', 1),
  ('room-i3', 'I3', 'rt-four', 'flat-i', 1);

-- Flat J (3 BHK = 3 rooms)
INSERT INTO rooms (id, room_no, room_type_id, flat_id, floor) VALUES
  ('room-j1', 'J1', 'rt-four', 'flat-j', 1),
  ('room-j2', 'J2', 'rt-four', 'flat-j', 1),
  ('room-j3', 'J3', 'rt-four', 'flat-j', 1);

-- Beds for all flat rooms (4 per room: A, B, C, D)
INSERT INTO beds (room_id, bed_label, status)
  SELECT r.id, label, 'available'
  FROM rooms r, (VALUES ('A'), ('B'), ('C'), ('D')) AS labels(label)
  WHERE r.flat_id IS NOT NULL;

-- Verification: should be 66 rooms and 169 beds
-- SELECT count(*) FROM rooms;  -- 66
-- SELECT count(*) FROM beds;   -- 169
-- Full occupancy: 38×8000 + 19×10000 + 112×7000 = 304000 + 190000 + 784000 = ₹12,78,000

