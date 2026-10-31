-- Migration 011: Magic Tumbler product and opening stock
INSERT INTO products (id, name, category, unit, barcode, cost_price, selling_price, reorder_level, is_active)
VALUES (
  '55555555-5555-5555-5555-555555555501',
  'Magic Tumbler',
  'Hostel Essentials',
  'piece',
  '8901234567899',
  180.00,
  250.00,
  10,
  TRUE
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  selling_price = EXCLUDED.selling_price,
  cost_price = EXCLUDED.cost_price;

-- Opening stock movement for Magic Tumbler (25 units)
INSERT INTO stock_movements (id, product_id, date, type, qty, ref_id)
VALUES (
  '66666666-6666-6666-6666-666666666601',
  '55555555-5555-5555-5555-555555555501',
  CURRENT_DATE,
  'adjustment',
  25,
  NULL
)
ON CONFLICT (id) DO NOTHING;
