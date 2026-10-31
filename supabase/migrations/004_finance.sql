-- MayThree Women's Hostel Management System
-- Migration 004: Finance (Expenses, Petty Cash, Cash Accounts)

-- Expense Categories
CREATE TABLE expense_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  is_active BOOLEAN DEFAULT TRUE
);

-- Vendors
CREATE TABLE vendors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  phone TEXT,
  default_category_id UUID REFERENCES expense_categories(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Expense status enum
CREATE TYPE expense_status AS ENUM ('recorded', 'approved', 'rejected');

-- Expenses
CREATE TABLE expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_date DATE NOT NULL,
  category_id UUID NOT NULL REFERENCES expense_categories(id),
  vendor_id UUID REFERENCES vendors(id),
  description TEXT NOT NULL,
  amount NUMERIC(10,2) NOT NULL CHECK (amount > 0),
  paid_from TEXT NOT NULL, -- cash account id or 'bank'
  bill_no TEXT,
  bill_photo_path TEXT,
  recorded_by UUID NOT NULL,
  status expense_status DEFAULT 'recorded',
  approved_by UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_expenses_date ON expenses(expense_date);
CREATE INDEX idx_expenses_category ON expenses(category_id);
CREATE INDEX idx_expenses_status ON expenses(status);

-- Cash account types
CREATE TYPE cash_account_kind AS ENUM ('petty_cash', 'store_counter', 'rent_collection');
CREATE TYPE cash_direction AS ENUM ('in', 'out');
CREATE TYPE cash_source AS ENUM ('opening', 'top_up', 'expense', 'rent_payment', 'store_sale', 'transfer', 'bank_deposit', 'adjustment');

-- Cash Accounts
CREATE TABLE cash_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  kind cash_account_kind NOT NULL,
  float_limit NUMERIC(10,2),
  is_active BOOLEAN DEFAULT TRUE
);

-- Cash Transactions
CREATE TABLE cash_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES cash_accounts(id),
  txn_date DATE NOT NULL,
  direction cash_direction NOT NULL,
  amount NUMERIC(10,2) NOT NULL CHECK (amount > 0),
  source cash_source NOT NULL,
  source_id UUID,
  note TEXT,
  recorded_by UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_cash_txn_account ON cash_transactions(account_id);
CREATE INDEX idx_cash_txn_date ON cash_transactions(txn_date);

-- Cash Counts (daily closing)
CREATE TABLE cash_counts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES cash_accounts(id),
  count_date DATE NOT NULL,
  counted_amount NUMERIC(10,2) NOT NULL,
  system_balance NUMERIC(10,2) NOT NULL,
  difference NUMERIC(10,2) NOT NULL,
  note TEXT,
  counted_by UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(account_id, count_date)
);

-- Enable RLS
ALTER TABLE expense_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE cash_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE cash_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE cash_counts ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Staff can read expense_categories" ON expense_categories FOR SELECT TO authenticated USING (is_staff());
CREATE POLICY "Admin manage expense_categories" ON expense_categories FOR ALL TO authenticated USING (is_admin());

CREATE POLICY "Staff can read vendors" ON vendors FOR SELECT TO authenticated USING (is_staff());
CREATE POLICY "Staff can insert vendors" ON vendors FOR INSERT TO authenticated WITH CHECK (is_staff());
CREATE POLICY "Admin manage vendors" ON vendors FOR ALL TO authenticated USING (is_admin());

CREATE POLICY "Staff can read expenses" ON expenses FOR SELECT TO authenticated USING (is_staff());
CREATE POLICY "Staff can insert expenses" ON expenses FOR INSERT TO authenticated WITH CHECK (is_staff());
CREATE POLICY "Admin manage expenses" ON expenses FOR ALL TO authenticated USING (is_admin());

CREATE POLICY "Staff can read cash_accounts" ON cash_accounts FOR SELECT TO authenticated USING (is_staff() OR is_store_staff());
CREATE POLICY "Admin manage cash_accounts" ON cash_accounts FOR ALL TO authenticated USING (is_admin());

CREATE POLICY "Staff can read cash_transactions" ON cash_transactions FOR SELECT TO authenticated USING (is_staff() OR is_store_staff());
CREATE POLICY "Staff can insert cash_transactions" ON cash_transactions FOR INSERT TO authenticated WITH CHECK (is_staff() OR is_store_staff());
CREATE POLICY "Admin manage cash_transactions" ON cash_transactions FOR ALL TO authenticated USING (is_admin());

CREATE POLICY "Staff can read cash_counts" ON cash_counts FOR SELECT TO authenticated USING (is_staff());
CREATE POLICY "Staff can insert cash_counts" ON cash_counts FOR INSERT TO authenticated WITH CHECK (is_staff());

-- Seed data
INSERT INTO expense_categories (name) VALUES
  ('Food and Groceries'), ('Gas (LPG)'), ('Electricity'), ('Water'),
  ('Staff Salary'), ('Maintenance and Repairs'), ('Cleaning Supplies'),
  ('Internet'), ('Building Rent'), ('Other');

INSERT INTO cash_accounts (name, kind, float_limit) VALUES
  ('Petty Cash', 'petty_cash', 50000),
  ('Store Counter', 'store_counter', 10000),
  ('Rent Cash', 'rent_collection', NULL);

