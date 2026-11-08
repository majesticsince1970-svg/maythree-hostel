export type ApplicationStatus = 'pending_approval' | 'submitted' | 'under_review' | 'approved' | 'rejected' | 'waitlisted'
export type BedStatus = 'available' | 'reserved' | 'occupied' | 'maintenance'
export type ResidentStatus = 'active' | 'notice' | 'checked_out' | 'vacated'
export type PaymentMode = 'cash' | 'UPI' | 'bank'
export type DocumentKind = 'photo' | 'id_proof' | 'certificate' | 'other'
export type StaffRole = 'admin' | 'staff' | 'store_staff'
export type ExpenseStatus = 'recorded' | 'approved' | 'rejected'
export type CashDirection = 'in' | 'out'
export type CashSource = 'opening' | 'top_up' | 'expense' | 'rent_payment' | 'store_sale' | 'transfer' | 'bank_deposit' | 'adjustment'
export type CashAccountKind = 'petty_cash' | 'store_counter' | 'rent_collection' | 'bank' | 'upi'
export type StockMovementType = 'purchase' | 'sale' | 'return' | 'damage' | 'expiry' | 'adjustment'
export type SalePaymentMode = 'cash' | 'UPI' | 'on_account'
export type ChangeRequestStatus = 'pending' | 'approved' | 'rejected' | 'cancelled'
export type AmenityAction = 'add' | 'remove'
export type RentHistorySource = 'allocation' | 'concession' | 'rate_change'

export interface RoomType {
  id: string
  name: string
  beds_per_room: number
  rent_per_head: number
  has_attached_toilet: boolean
  created_at: string
}

export interface Flat {
  id: string
  code: string
  bhk: number
  floor: number
}

export interface Room {
  id: string
  room_no: string
  room_type_id: string
  flat_id: string | null
  floor: number
  is_active: boolean
  room_type?: RoomType
  flat?: Flat
  beds?: Bed[]
  amenities?: RoomAmenity[]
}

export interface Bed {
  id: string
  room_id: string
  bed_label: string
  status: BedStatus
  room?: Room
  resident?: Resident
}

export interface Application {
  id: string
  ref_no: string
  full_name: string
  dob: string
  phone: string
  email: string | null
  permanent_address: string
  occupation: string
  institution_or_employer: string
  id_proof_type: string
  id_proof_no: string
  emergency_name: string
  emergency_relation: string
  emergency_phone: string
  preferred_room_type_id: string | null
  preferred_ac: 'yes' | 'no' | 'any'
  status: ApplicationStatus
  submitted_at: string
  reviewed_by: string | null
  review_note: string | null
  documents?: Document[]
  preferred_room_type?: RoomType
}

export interface Document {
  id: string
  application_id: string
  kind: DocumentKind
  storage_path: string
  verified: boolean
}

export interface Resident {
  id: string
  application_id: string
  bed_id: string
  check_in_date: string
  check_out_date: string | null
  monthly_rent: number
  deposit_amount: number
  status: ResidentStatus
  pin?: string
  pin_active?: boolean
  application?: Application
  bed?: Bed
  payments?: Payment[]
}

export type SettlementType = 'refund' | 'collected' | 'settled'

export interface RentBreakdownItem {
  month: string // e.g. "2026-09"
  label: string // e.g. "September 2026" or "October 2026 (1-15 Oct, 15 days)"
  rent_due: number
  amount_paid: number
  balance: number
  is_current_month?: boolean
  days_stayed?: number
  total_days?: number
}

export interface DeductionItem {
  id: string
  description: string
  amount: number
}

export interface CheckoutReceipt {
  id: string
  receipt_no: string
  vacated_id?: string
  resident_id: string
  resident_name: string
  phone: string
  room_no: string
  bed_label: string
  admission_date: string
  checkout_date: string
  advance_amount: number
  pending_rent_deducted: number
  other_deductions: number
  final_refund_amount: number
  settlement_type: SettlementType
  amount_in_words: string
  payment_mode: PaymentMode
  account_id?: string | null
  rent_breakdown?: RentBreakdownItem[]
  deductions_breakdown?: DeductionItem[]
  notes?: string | null
  issued_by: string
  created_at: string
}

export interface VacatedResident {
  id: string
  resident_id: string
  resident_name: string
  room_no: string
  bed_label: string
  admission_date: string
  vacate_date: string
  reason: string | null
  notes: string | null
  pending_dues: number
  deposit_amount: number
  deductions: number
  settlement_amount: number
  settlement_type: SettlementType
  account_id: string | null
  receipt_no?: string | null
  advance_status?: 'Returned' | 'Adjusted' | string
  payment_mode?: PaymentMode | string
  rent_breakdown?: RentBreakdownItem[]
  deductions_breakdown?: DeductionItem[]
  processed_by: string
  created_at: string
}

export interface Payment {
  id: string
  resident_id: string
  period_month: string
  amount: number
  paid_on: string
  mode: PaymentMode
  reference: string | null
  received_by: string
  receipt_no: string
  resident?: Resident
}

export interface StaffProfile {
  user_id: string
  name: string
  role: StaffRole
  email?: string
}

export interface AttendanceMovement {
  id: string
  resident_id: string
  resident_name: string
  room_no: string
  bed_label?: string
  direction: 'IN' | 'OUT'
  time: string
  note?: string
  recorded_by?: string
}

export interface Amenity {
  id: string
  name: string
  addon_per_head: number
  is_active: boolean
}

export interface RoomAmenity {
  room_id: string
  amenity_id: string
  installed_on: string
  amenity?: Amenity
}

export interface RoomRate {
  id: string
  room_id: string
  rate_per_head: number
  effective_from: string
  approved_by: string | null
}

export interface AmenityChangeRequest {
  id: string
  room_id: string
  amenity_id: string
  action: AmenityAction
  requested_by: string
  effective_from: string
  status: ChangeRequestStatus
  decided_by: string | null
  decided_at: string | null
  note: string | null
  room?: Room
  amenity?: Amenity
}

export interface RentChangeRequest {
  id: string
  resident_id: string
  standard_rent: number
  requested_rent: number
  reason: string
  effective_from: string
  until: string | null
  requested_by: string
  status: ChangeRequestStatus
  decided_by: string | null
  decided_at: string | null
  decision_note: string | null
  resident?: Resident
}

export interface ResidentRentHistory {
  id: string
  resident_id: string
  monthly_rent: number
  effective_from: string
  source: RentHistorySource
  approved_by: string | null
}

export interface ExpenseCategory {
  id: string
  name: string
  is_active: boolean
}

export interface Vendor {
  id: string
  name: string
  phone: string | null
  default_category_id: string | null
}

export interface Expense {
  id: string
  expense_date: string
  category_id: string
  vendor_id: string | null
  description: string
  amount: number
  paid_from: string
  bill_no: string | null
  bill_photo_path: string | null
  recorded_by: string
  status: ExpenseStatus
  approved_by: string | null
  category?: ExpenseCategory
  vendor?: Vendor
}

export interface CashAccount {
  id: string
  name: string
  kind: CashAccountKind
  float_limit: number | null
  is_active: boolean
  balance?: number
}

export interface CashTransaction {
  id: string
  account_id: string
  txn_date: string
  direction: CashDirection
  amount: number
  source: CashSource
  source_id: string | null
  note: string | null
  recorded_by: string
  account?: CashAccount
}

export interface CashCount {
  id: string
  account_id: string
  count_date: string
  counted_amount: number
  system_balance: number
  difference: number
  note: string | null
  counted_by: string
  account?: CashAccount
}

export interface Product {
  id: string
  name: string
  category: string | null
  unit: string
  barcode: string | null
  cost_price: number
  selling_price: number
  reorder_level: number
  is_active: boolean
  stock_on_hand?: number
}

export interface StockPurchase {
  id: string
  purchase_date: string
  vendor_id: string | null
  invoice_no: string | null
  paid_from: string | null
  items?: StockPurchaseItem[]
  vendor?: Vendor
}

export interface StockPurchaseItem {
  id: string
  purchase_id: string
  product_id: string
  qty: number
  unit_cost: number
  product?: Product
}

export interface Sale {
  id: string
  sale_date: string
  sold_by: string
  resident_id: string | null
  payment_mode: SalePaymentMode
  total: number
  items?: SaleItem[]
  resident?: Resident
}

export interface SaleItem {
  id: string
  sale_id: string
  product_id: string
  qty: number
  unit_price: number
  unit_cost: number
  product?: Product
}

export interface StockMovement {
  id: string
  product_id: string
  date: string
  type: StockMovementType
  qty: number
  ref_id: string | null
  product?: Product
}

export interface StockCount {
  id: string
  count_date: string
  product_id: string
  counted_qty: number
  system_qty: number
  difference: number
  reason: string | null
  product?: Product
}

// View types
export interface OccupancyView {
  room_id: string
  room_no: string
  room_type: string
  floor: number
  flat_code: string | null
  total_beds: number
  available: number
  occupied: number
  reserved: number
  maintenance: number
}

export interface RentDueView {
  resident_id: string
  resident_name: string
  room_no: string
  bed_label: string
  period_month: string
  rent_due: number
  paid: number
  balance: number
  phone: string
}

export interface PublicRoomOption {
  room_type: string
  has_ac: boolean
  rent_per_head: number
  beds_available: number
}

export interface DashboardStats {
  total_beds: number
  occupied: number
  vacant: number
  reserved: number
  maintenance: number
  pending_applications: number
  rent_due_this_month: number
  rent_collected_this_month: number
  total_residents?: number
  inside_hostel?: number
  outside_hostel?: number
  admissions_possible: {
    category: string
    count: number
  }[]
}

type TableDef<T> = {
  Row: T
  Insert: Partial<T>
  Update: Partial<T>
}

// Supabase Database type (simplified for client usage)
export interface Database {
  public: {
    Tables: {
      room_types: TableDef<RoomType>
      flats: TableDef<Flat>
      rooms: TableDef<Room>
      beds: TableDef<Bed>
      applications: TableDef<Application>
      documents: TableDef<Document>
      residents: TableDef<Resident>
      vacated_residents: TableDef<VacatedResident>
      checkout_receipts: TableDef<CheckoutReceipt>
      payments: TableDef<Payment>
      staff_profiles: TableDef<StaffProfile>
      amenities: TableDef<Amenity>
      room_amenities: TableDef<RoomAmenity>
      room_rates: TableDef<RoomRate>
      amenity_change_requests: TableDef<AmenityChangeRequest>
      rent_change_requests: TableDef<RentChangeRequest>
      resident_rent_history: TableDef<ResidentRentHistory>
      expense_categories: TableDef<ExpenseCategory>
      vendors: TableDef<Vendor>
      expenses: TableDef<Expense>
      cash_accounts: TableDef<CashAccount>
      cash_transactions: TableDef<CashTransaction>
      cash_counts: TableDef<CashCount>
      products: TableDef<Product>
      stock_purchases: TableDef<StockPurchase>
      stock_purchase_items: TableDef<StockPurchaseItem>
      sales: TableDef<Sale>
      sale_items: TableDef<SaleItem>
      stock_movements: TableDef<StockMovement>
      stock_counts: TableDef<StockCount>
    }
  }
}
