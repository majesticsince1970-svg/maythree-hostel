-- MayThree Women's Hostel Management System
-- Migration 005: Store (Products, Stock, Sales)

-- Products
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category TEXT,
  unit TEXT NOT NULL DEFAULT 'piece',
  barcode TEXT UNIQUE,
  cost_price NUMERIC(10,2) NOT NULL,
  selling_price NUMERIC(10,2) NOT NULL,
  reorder_level INTEGER DEFAULT 10,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_products_category ON products(category);
CREATE INDEX idx_products_barcode ON products(barcode);

-- Stock Purchases
CREATE TABLE stock_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_date DATE NOT NULL,
  vendor_id UUID REFERENCES vendors(id),
  invoice_no TEXT,
  paid_from TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE stock_purchase_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_id UUID NOT NULL REFERENCES stock_purchases(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id),
  qty INTEGER NOT NULL CHECK (qty > 0),
  unit_cost NUMERIC(10,2) NOT NULL
);

-- Sale payment mode
CREATE TYPE sale_payment_mode AS ENUM ('cash', 'UPI', 'on_account');

-- Sales
CREATE TABLE sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_date DATE NOT NULL DEFAULT CURRENT_DATE,
  sold_by UUID NOT NULL,
  resident_id UUID REFERENCES residents(id),
  payment_mode sale_payment_mode NOT NULL,
  total NUMERIC(10,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_sales_date ON sales(sale_date);

CREATE TABLE sale_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id UUID NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id),
  qty INTEGER NOT NULL CHECK (qty > 0),
  unit_price NUMERIC(10,2) NOT NULL,
  unit_cost NUMERIC(10,2) NOT NULL
);

-- Stock movement types
CREATE TYPE stock_movement_type AS ENUM ('purchase', 'sale', 'return', 'damage', 'expiry', 'adjustment');

-- Stock Movements (running total = stock on hand)
CREATE TABLE stock_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id),
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  type stock_movement_type NOT NULL,
  qty INTEGER NOT NULL, -- positive for in, negative for out
  ref_id UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_stock_movements_product ON stock_movements(product_id);
CREATE INDEX idx_stock_movements_date ON stock_movements(date);

-- Stock Counts (physical)
CREATE TABLE stock_counts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  count_date DATE NOT NULL DEFAULT CURRENT_DATE,
  product_id UUID NOT NULL REFERENCES products(id),
  counted_qty INTEGER NOT NULL,
  system_qty INTEGER NOT NULL,
  difference INTEGER NOT NULL,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_purchase_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_counts ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Store staff can read products" ON products FOR SELECT TO authenticated USING (is_staff() OR is_store_staff());
CREATE POLICY "Admin manage products" ON products FOR ALL TO authenticated USING (is_admin());

CREATE POLICY "Store staff can read purchases" ON stock_purchases FOR SELECT TO authenticated USING (is_store_staff() OR is_staff());
CREATE POLICY "Store staff can insert purchases" ON stock_purchases FOR INSERT TO authenticated WITH CHECK (is_store_staff());
CREATE POLICY "Admin manage purchases" ON stock_purchases FOR ALL TO authenticated USING (is_admin());

CREATE POLICY "Store staff can read purchase items" ON stock_purchase_items FOR SELECT TO authenticated USING (is_store_staff() OR is_staff());
CREATE POLICY "Store staff can insert purchase items" ON stock_purchase_items FOR INSERT TO authenticated WITH CHECK (is_store_staff());

CREATE POLICY "Store staff can read sales" ON sales FOR SELECT TO authenticated USING (is_store_staff() OR is_staff());
CREATE POLICY "Store staff can insert sales" ON sales FOR INSERT TO authenticated WITH CHECK (is_store_staff());
CREATE POLICY "Admin manage sales" ON sales FOR ALL TO authenticated USING (is_admin());

CREATE POLICY "Store staff can read sale items" ON sale_items FOR SELECT TO authenticated USING (is_store_staff() OR is_staff());
CREATE POLICY "Store staff can insert sale items" ON sale_items FOR INSERT TO authenticated WITH CHECK (is_store_staff());

CREATE POLICY "Store staff can read stock movements" ON stock_movements FOR SELECT TO authenticated USING (is_store_staff() OR is_staff());
CREATE POLICY "Store staff can insert stock movements" ON stock_movements FOR INSERT TO authenticated WITH CHECK (is_store_staff());

CREATE POLICY "Store staff can read stock counts" ON stock_counts FOR SELECT TO authenticated USING (is_store_staff() OR is_staff());
CREATE POLICY "Store staff can insert stock counts" ON stock_counts FOR INSERT TO authenticated WITH CHECK (is_store_staff());

-- Views
CREATE OR REPLACE VIEW v_stock_on_hand AS
SELECT
  p.id AS product_id,
  p.name,
  p.category,
  p.unit,
  p.cost_price,
  p.selling_price,
  p.reorder_level,
  COALESCE(SUM(sm.qty), 0) AS stock_on_hand,
  COALESCE(SUM(sm.qty), 0) * p.cost_price AS stock_value,
  CASE WHEN COALESCE(SUM(sm.qty), 0) <= p.reorder_level THEN TRUE ELSE FALSE END AS below_reorder
FROM products p
  LEFT JOIN stock_movements sm ON sm.product_id = p.id
WHERE p.is_active = TRUE
GROUP BY p.id;

CREATE OR REPLACE VIEW v_store_daily AS
SELECT
  s.sale_date,
  COUNT(DISTINCT s.id) AS total_sales,
  SUM(si.qty * si.unit_price) AS revenue,
  SUM(si.qty * si.unit_cost) AS cost_of_goods,
  SUM(si.qty * (si.unit_price - si.unit_cost)) AS gross_profit,
  SUM(CASE WHEN s.payment_mode = 'cash' THEN s.total ELSE 0 END) AS cash_sales,
  SUM(CASE WHEN s.payment_mode = 'UPI' THEN s.total ELSE 0 END) AS upi_sales,
  SUM(CASE WHEN s.payment_mode = 'on_account' THEN s.total ELSE 0 END) AS on_account_sales
FROM sales s
  JOIN sale_items si ON si.sale_id = s.id
GROUP BY s.sale_date;

-- Updated_at trigger for products
CREATE TRIGGER tr_products_updated_at BEFORE UPDATE ON products FOR EACH ROW EXECUTE FUNCTION update_updated_at();

