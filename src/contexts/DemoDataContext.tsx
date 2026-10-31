import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import type {
  Application, Bed, Room, RoomType, Flat, Resident, Payment,
  ExpenseCategory, Expense, CashAccount, CashTransaction,
  Product, Vendor, Sale, SaleItem, StockMovement, StockPurchase, StockPurchaseItem, StockCount,
  DashboardStats, RentDueView, PublicRoomOption,
  ApplicationStatus, BedStatus, StaffProfile, StockMovementType, SalePaymentMode,
  VacatedResident, SettlementType, CashDirection
} from '@/types/database'

export interface VacateResidentParams {
  residentId: string
  vacateDate: string
  reason?: string
  notes?: string
  pendingDues: number
  depositAmount: number
  deductions: number
  deductionReason?: string
  settlementAmount: number
  settlementType: SettlementType
  accountId: string
  processedBy?: string
}

const DEMO_MODE = !import.meta.env.VITE_SUPABASE_URL || import.meta.env.VITE_SUPABASE_URL === 'your-supabase-url'
const STORAGE_KEY = 'maythree_hostel_state_v6'

// ── Room Types ──
const initialRoomTypes: RoomType[] = [
  { id: 'rt-1', name: 'Twin Sharing', beds_per_room: 2, rent_per_head: 8000, has_attached_toilet: true, created_at: '2026-01-01' },
  { id: 'rt-2', name: 'Single Room', beds_per_room: 1, rent_per_head: 10000, has_attached_toilet: true, created_at: '2026-01-01' },
  { id: 'rt-3', name: '4-Sharing', beds_per_room: 4, rent_per_head: 7000, has_attached_toilet: false, created_at: '2026-01-01' },
]

// ── Flats ──
const flats: Flat[] = [
  { id: 'f-a', code: 'A', bhk: 2, floor: 1 },
  { id: 'f-b', code: 'B', bhk: 3, floor: 1 },
  { id: 'f-c', code: 'C', bhk: 3, floor: 1 },
  { id: 'f-d', code: 'D', bhk: 3, floor: 1 },
  { id: 'f-e', code: 'E', bhk: 3, floor: 1 },
  { id: 'f-f', code: 'F', bhk: 2, floor: 1 },
  { id: 'f-g', code: 'G', bhk: 3, floor: 1 },
  { id: 'f-h', code: 'H', bhk: 3, floor: 1 },
  { id: 'f-i', code: 'I', bhk: 3, floor: 1 },
  { id: 'f-j', code: 'J', bhk: 3, floor: 1 },
]

// ── AC Rooms (rooms that have AC) ──
const acRoomIds = new Set(['room-301', 'room-303', 'room-305', 'room-307', 'room-309', 'room-311', 'room-313', 'room-315', 'room-317', 'room-319'])

// ── Generate Rooms and Beds ──
function generateRoomsAndBeds(rts: RoomType[]) {
  const rooms: Room[] = []
  const beds: Bed[] = []

  // Floor 2: Twin sharing (201-219)
  for (let i = 201; i <= 219; i++) {
    const roomId = `room-${i}`
    rooms.push({ id: roomId, room_no: String(i), room_type_id: 'rt-1', flat_id: null, floor: 2, is_active: true, room_type: rts[0] })
    beds.push(
      { id: `bed-${i}-A`, room_id: roomId, bed_label: 'A', status: i % 3 === 0 ? 'occupied' : 'available' },
      { id: `bed-${i}-B`, room_id: roomId, bed_label: 'B', status: i % 4 === 0 ? 'occupied' : i % 5 === 0 ? 'reserved' : 'available' }
    )
  }

  // Floor 3: Single rooms (301-319)
  for (let i = 301; i <= 319; i++) {
    const roomId = `room-${i}`
    rooms.push({ id: roomId, room_no: String(i), room_type_id: 'rt-2', flat_id: null, floor: 3, is_active: true, room_type: rts[1] })
    beds.push({ id: `bed-${i}-A`, room_id: roomId, bed_label: 'A', status: i % 3 === 0 ? 'occupied' : 'available' })
  }

  // Flats: 4-sharing
  const flatRoomCounts: Record<string, number> = { A: 2, B: 3, C: 3, D: 3, E: 3, F: 2, G: 3, H: 3, I: 3, J: 3 }
  for (const flat of flats) {
    const count = flatRoomCounts[flat.code] || 3
    for (let r = 1; r <= count; r++) {
      const roomNo = `${flat.code}${r}`
      const roomId = `room-${roomNo}`
      rooms.push({ id: roomId, room_no: roomNo, room_type_id: 'rt-3', flat_id: flat.id, floor: flat.floor, is_active: true, room_type: rts[2], flat: flat })
      for (const label of ['A', 'B', 'C', 'D']) {
        const hash = (flat.code.charCodeAt(0) + r + label.charCodeAt(0)) % 7
        beds.push({ id: `bed-${roomNo}-${label}`, room_id: roomId, bed_label: label, status: hash < 2 ? 'occupied' : hash === 2 ? 'reserved' : 'available' })
      }
    }
  }

  return { rooms, beds }
}

const { rooms: initRooms, beds: initBeds } = generateRoomsAndBeds(initialRoomTypes)

// ── Applications ──
const initApplications: Application[] = [
  {
    id: 'app-1', ref_no: 'HST-2026-0001', full_name: 'Priya Sharma', dob: '2000-05-15',
    phone: '9876543210', email: 'priya@email.com', permanent_address: '123 MG Road, Bangalore, Karnataka',
    occupation: 'Student', institution_or_employer: 'Christ University',
    id_proof_type: 'Aadhaar', id_proof_no: '1234 5678 9012',
    emergency_name: 'Raj Sharma', emergency_relation: 'Father', emergency_phone: '9876543211',
    preferred_room_type_id: 'rt-1', preferred_ac: 'no', status: 'submitted',
    submitted_at: '2026-10-28T10:30:00', reviewed_by: null, review_note: null, preferred_room_type: initialRoomTypes[0]
  },
  {
    id: 'app-2', ref_no: 'HST-2026-0002', full_name: 'Ananya Reddy', dob: '2001-08-22',
    phone: '9876543220', email: 'ananya@email.com', permanent_address: '456 Jubilee Hills, Hyderabad, Telangana',
    occupation: 'Working Professional', institution_or_employer: 'TCS',
    id_proof_type: 'Aadhaar', id_proof_no: '2345 6789 0123',
    emergency_name: 'Lakshmi Reddy', emergency_relation: 'Mother', emergency_phone: '9876543221',
    preferred_room_type_id: 'rt-2', preferred_ac: 'yes', status: 'under_review',
    submitted_at: '2026-10-27T14:15:00', reviewed_by: null, review_note: null, preferred_room_type: initialRoomTypes[1]
  },
  {
    id: 'app-3', ref_no: 'HST-2026-0003', full_name: 'Kavya Nair', dob: '1999-12-03',
    phone: '9876543230', email: 'kavya@email.com', permanent_address: '789 Marine Drive, Kochi, Kerala',
    occupation: 'Student', institution_or_employer: 'BITS Pilani',
    id_proof_type: 'PAN', id_proof_no: 'ABCPN1234K',
    emergency_name: 'Suresh Nair', emergency_relation: 'Father', emergency_phone: '9876543231',
    preferred_room_type_id: 'rt-3', preferred_ac: 'no', status: 'approved',
    submitted_at: '2026-10-25T09:00:00', reviewed_by: 'demo-staff-1', review_note: 'Documents verified', preferred_room_type: initialRoomTypes[2]
  },
  {
    id: 'app-4', ref_no: 'HST-2026-0004', full_name: 'Deepa Menon', dob: '2002-03-18',
    phone: '9876543240', email: null, permanent_address: '321 Anna Nagar, Chennai, Tamil Nadu',
    occupation: 'Student', institution_or_employer: 'IIT Madras',
    id_proof_type: 'Aadhaar', id_proof_no: '3456 7890 1234',
    emergency_name: 'Ravi Menon', emergency_relation: 'Father', emergency_phone: '9876543241',
    preferred_room_type_id: 'rt-1', preferred_ac: 'any', status: 'submitted',
    submitted_at: '2026-10-29T08:45:00', reviewed_by: null, review_note: null, preferred_room_type: initialRoomTypes[0]
  },
  {
    id: 'app-5', ref_no: 'HST-2026-0005', full_name: 'Sneha Patil', dob: '2001-07-10',
    phone: '9876543250', email: 'sneha@email.com', permanent_address: '567 FC Road, Pune, Maharashtra',
    occupation: 'Working Professional', institution_or_employer: 'Infosys',
    id_proof_type: 'Aadhaar', id_proof_no: '4567 8901 2345',
    emergency_name: 'Meena Patil', emergency_relation: 'Mother', emergency_phone: '9876543251',
    preferred_room_type_id: 'rt-2', preferred_ac: 'no', status: 'rejected',
    submitted_at: '2026-10-20T11:00:00', reviewed_by: 'demo-staff-1', review_note: 'Incomplete documents', preferred_room_type: initialRoomTypes[1]
  },
]

// ── Residents (linked to occupied beds) ──
const initResidents: Resident[] = [
  {
    id: 'res-1', application_id: 'app-3', bed_id: 'bed-201-A', check_in_date: '2026-10-01',
    check_out_date: null, monthly_rent: 8000, deposit_amount: 16000, status: 'active',
    pin: '1021', pin_active: true,
    application: initApplications[2],
    bed: { id: 'bed-201-A', room_id: 'room-201', bed_label: 'A', status: 'occupied', room: initRooms[0] }
  },
  {
    id: 'res-2', application_id: 'app-6', bed_id: 'bed-301-A', check_in_date: '2026-09-15',
    check_out_date: null, monthly_rent: 10000, deposit_amount: 20000, status: 'active',
    pin: '2045', pin_active: true,
    application: { ...initApplications[0], id: 'app-6', full_name: 'Meera Iyer', phone: '9876543260', ref_no: 'HST-2026-0006', occupation: 'Working Professional', institution_or_employer: 'Wipro' },
    bed: { id: 'bed-301-A', room_id: 'room-301', bed_label: 'A', status: 'occupied', room: initRooms[19] }
  },
  {
    id: 'res-3', application_id: 'app-7', bed_id: 'bed-B1-A', check_in_date: '2026-08-01',
    check_out_date: null, monthly_rent: 7000, deposit_amount: 14000, status: 'active',
    pin: '3089', pin_active: true,
    application: { ...initApplications[0], id: 'app-7', full_name: 'Roshni Das', phone: '9876543270', ref_no: 'HST-2026-0007', occupation: 'Student', institution_or_employer: 'VIT University' },
    bed: { id: 'bed-B1-A', room_id: 'room-B1', bed_label: 'A', status: 'occupied' }
  },
]

// ── Initial Vacated Residents (Departure Log) ──
const initVacatedResidents: VacatedResident[] = [
  {
    id: 'vac-1',
    resident_id: 'res-old-1',
    resident_name: 'Ananya Sharma',
    room_no: '202',
    bed_label: 'B',
    admission_date: '2026-05-10',
    vacate_date: '2026-10-15',
    reason: 'Completed internship in Chennai',
    notes: 'Handover complete. Keys returned.',
    pending_dues: 0,
    deposit_amount: 16000,
    deductions: 500,
    settlement_amount: 15500,
    settlement_type: 'refund',
    account_id: 'ca-4',
    processed_by: 'Admin User',
    created_at: '2026-10-15T11:30:00Z'
  },
  {
    id: 'vac-2',
    resident_id: 'res-old-2',
    resident_name: 'Pooja Hegde',
    room_no: '305',
    bed_label: 'A',
    admission_date: '2026-06-01',
    vacate_date: '2026-09-30',
    reason: 'Job relocation to Bengaluru',
    notes: 'Settled dues in full',
    pending_dues: 2000,
    deposit_amount: 10000,
    deductions: 0,
    settlement_amount: 8000,
    settlement_type: 'refund',
    account_id: 'ca-5',
    processed_by: 'Staff User',
    created_at: '2026-09-30T16:00:00Z'
  }
]

// ── Payments ──
const initPayments: Payment[] = [
  { id: 'pay-1', resident_id: 'res-1', period_month: '2026-10', amount: 8000, paid_on: '2026-10-05', mode: 'UPI', reference: 'UPI987213456', received_by: 'demo-staff-1', receipt_no: 'RCT-001' },
  { id: 'pay-2', resident_id: 'res-2', period_month: '2026-10', amount: 10000, paid_on: '2026-10-03', mode: 'cash', reference: null, received_by: 'demo-staff-1', receipt_no: 'RCT-002' },
  { id: 'pay-3', resident_id: 'res-2', period_month: '2026-09', amount: 10000, paid_on: '2026-09-05', mode: 'bank', reference: 'NEFT491823', received_by: 'demo-staff-1', receipt_no: 'RCT-003' },
  { id: 'pay-4', resident_id: 'res-3', period_month: '2026-10', amount: 3500, paid_on: '2026-10-10', mode: 'cash', reference: null, received_by: 'demo-staff-1', receipt_no: 'RCT-004' },
]

// ── Expense categories ──
const demoExpenseCategories: ExpenseCategory[] = [
  { id: 'ec-1', name: 'Food and Groceries', is_active: true },
  { id: 'ec-2', name: 'Gas (LPG)', is_active: true },
  { id: 'ec-3', name: 'Electricity', is_active: true },
  { id: 'ec-4', name: 'Water', is_active: true },
  { id: 'ec-5', name: 'Staff Salary', is_active: true },
  { id: 'ec-6', name: 'Maintenance and Repairs', is_active: true },
  { id: 'ec-7', name: 'Cleaning Supplies', is_active: true },
  { id: 'ec-8', name: 'Internet', is_active: true },
  { id: 'ec-9', name: 'Building Rent', is_active: true },
  { id: 'ec-10', name: 'Other', is_active: true },
]

// ── Vendors ──
const initVendors: Vendor[] = [
  { id: 'v-1', name: 'Fresh Grocery Store', phone: '9876500001', default_category_id: 'ec-1' },
  { id: 'v-2', name: 'Milk Dairy Supplier', phone: '9876500002', default_category_id: 'ec-1' },
  { id: 'v-3', name: 'HP Gas Agency', phone: '9876500003', default_category_id: 'ec-2' },
  { id: 'v-4', name: 'City Electricals', phone: '9876500004', default_category_id: 'ec-3' },
]

// ── Expenses ──
const initExpenses: Expense[] = [
  { id: 'exp-1', expense_date: '2026-10-29', category_id: 'ec-1', vendor_id: 'v-1', description: 'Vegetables and fruits', amount: 2500, paid_from: 'petty_cash', bill_no: 'B001', bill_photo_path: null, recorded_by: 'demo-staff-1', status: 'approved', approved_by: 'demo-admin-1', category: demoExpenseCategories[0], vendor: initVendors[0] },
  { id: 'exp-2', expense_date: '2026-10-28', category_id: 'ec-1', vendor_id: 'v-2', description: 'Milk - 20 litres', amount: 1200, paid_from: 'petty_cash', bill_no: 'B002', bill_photo_path: null, recorded_by: 'demo-staff-1', status: 'approved', approved_by: 'demo-admin-1', category: demoExpenseCategories[0], vendor: initVendors[1] },
  { id: 'exp-3', expense_date: '2026-10-27', category_id: 'ec-2', vendor_id: 'v-3', description: 'LPG cylinder refill x2', amount: 1800, paid_from: 'petty_cash', bill_no: null, bill_photo_path: null, recorded_by: 'demo-staff-1', status: 'recorded', approved_by: null, category: demoExpenseCategories[1], vendor: initVendors[2] },
  { id: 'exp-4', expense_date: '2026-10-25', category_id: 'ec-3', vendor_id: null, description: 'Electricity bill - October', amount: 45000, paid_from: 'bank', bill_no: 'EB-OCT', bill_photo_path: null, recorded_by: 'demo-admin-1', status: 'approved', approved_by: 'demo-admin-1', category: demoExpenseCategories[2] },
]

// ── Cash Accounts (All 5 Ledgers: Petty Cash, Store Counter, Rent Cash, Bank, UPI) ──
const initCashAccounts: CashAccount[] = [
  { id: 'ca-1', name: 'Petty Cash', kind: 'petty_cash', float_limit: 50000, is_active: true, balance: 23500 },
  { id: 'ca-2', name: 'Store Counter', kind: 'store_counter', float_limit: 10000, is_active: true, balance: 4750 },
  { id: 'ca-3', name: 'Rent Cash', kind: 'rent_collection', float_limit: null, is_active: true, balance: 13500 },
  { id: 'ca-4', name: 'Hostel Bank Account', kind: 'bank', float_limit: null, is_active: true, balance: 145000 },
  { id: 'ca-5', name: 'Hostel UPI Account', kind: 'upi', float_limit: null, is_active: true, balance: 48000 },
]

// ── Initial Cash Transactions across all accounts ──
const initCashTransactions: CashTransaction[] = [
  { id: 'ct-init-1', account_id: 'ca-1', txn_date: '2026-10-29', direction: 'out', amount: 2500, source: 'expense', source_id: 'exp-1', note: 'Vegetables and fruits', recorded_by: 'demo-staff-1' },
  { id: 'ct-init-2', account_id: 'ca-3', txn_date: '2026-10-29', direction: 'in', amount: 10000, source: 'rent_payment', source_id: 'pay-2', note: 'Rent payment RCT-002 (Cash) - Meera Iyer', recorded_by: 'demo-staff-1' },
  { id: 'ct-init-3', account_id: 'ca-1', txn_date: '2026-10-28', direction: 'out', amount: 1200, source: 'expense', source_id: 'exp-2', note: 'Milk - 20 litres', recorded_by: 'demo-staff-1' },
  { id: 'ct-init-4', account_id: 'ca-2', txn_date: '2026-10-28', direction: 'in', amount: 750, source: 'store_sale', source_id: 'sale-1', note: 'Store sale (Cash) - Snacks & essentials', recorded_by: 'demo-store-1' },
  { id: 'ct-init-5', account_id: 'ca-5', txn_date: '2026-10-28', direction: 'in', amount: 500, source: 'store_sale', source_id: 'sale-2', note: 'Store sale (UPI) - Magic Tumbler order', recorded_by: 'demo-store-1' },
  { id: 'ct-init-6', account_id: 'ca-5', txn_date: '2026-10-26', direction: 'in', amount: 8000, source: 'rent_payment', source_id: 'pay-1', note: 'Rent payment RCT-001 (UPI) - Kavya Nair', recorded_by: 'demo-staff-1' },
  { id: 'ct-init-7', account_id: 'ca-4', txn_date: '2026-10-25', direction: 'out', amount: 45000, source: 'expense', source_id: 'exp-4', note: 'Electricity bill - October (Direct Bank Transfer)', recorded_by: 'demo-admin-1' },
  { id: 'ct-init-8', account_id: 'ca-3', txn_date: '2026-10-24', direction: 'in', amount: 3500, source: 'rent_payment', source_id: 'pay-4', note: 'Rent payment RCT-004 (Cash partial) - Roshni Das', recorded_by: 'demo-staff-1' },
]

// ── Products (Including Magic Tumbler) ──
const initProducts: Product[] = [
  { id: 'prod-magic-tumbler', name: 'Magic Tumbler', category: 'Hostel Essentials', unit: 'piece', barcode: '8901234567899', cost_price: 180, selling_price: 250, reorder_level: 10, is_active: true, stock_on_hand: 25 },
  { id: 'prod-1', name: 'Maggi Noodles', category: 'Snacks', unit: 'packet', barcode: '8901234567890', cost_price: 12, selling_price: 15, reorder_level: 20, is_active: true, stock_on_hand: 45 },
  { id: 'prod-2', name: 'Lays Chips (Classic)', category: 'Snacks', unit: 'packet', barcode: '8901234567891', cost_price: 16, selling_price: 20, reorder_level: 15, is_active: true, stock_on_hand: 32 },
  { id: 'prod-3', name: 'Dove Soap', category: 'Toiletries', unit: 'piece', barcode: '8901234567892', cost_price: 45, selling_price: 55, reorder_level: 10, is_active: true, stock_on_hand: 18 },
  { id: 'prod-4', name: 'Bisleri Water (1L)', category: 'Drinks', unit: 'bottle', barcode: '8901234567893', cost_price: 15, selling_price: 20, reorder_level: 30, is_active: true, stock_on_hand: 8 },
  { id: 'prod-5', name: 'Notebook (200 pages)', category: 'Stationery', unit: 'piece', barcode: '8901234567894', cost_price: 30, selling_price: 40, reorder_level: 10, is_active: true, stock_on_hand: 25 },
  { id: 'prod-6', name: 'Pen (Blue)', category: 'Stationery', unit: 'piece', barcode: null, cost_price: 5, selling_price: 10, reorder_level: 20, is_active: true, stock_on_hand: 50 },
  { id: 'prod-7', name: 'Coca Cola (300ml)', category: 'Drinks', unit: 'bottle', barcode: '8901234567896', cost_price: 25, selling_price: 30, reorder_level: 20, is_active: true, stock_on_hand: 15 },
  { id: 'prod-8', name: 'Colgate Toothpaste', category: 'Toiletries', unit: 'tube', barcode: '8901234567897', cost_price: 60, selling_price: 75, reorder_level: 8, is_active: true, stock_on_hand: 12 },
]

// ── Initial Store Sales (including Magic Tumbler order) ──
const initSales: Sale[] = [
  {
    id: 'sale-init-1',
    sale_date: '2026-10-28',
    sold_by: 'demo-store-1',
    resident_id: 'res-2',
    payment_mode: 'UPI',
    total: 500,
    items: [
      { id: 'si-init-1', sale_id: 'sale-init-1', product_id: 'prod-magic-tumbler', qty: 2, unit_price: 250, unit_cost: 180, product: initProducts[0] }
    ]
  },
  {
    id: 'sale-init-2',
    sale_date: '2026-10-28',
    sold_by: 'demo-store-1',
    resident_id: null,
    payment_mode: 'cash',
    total: 75,
    items: [
      { id: 'si-init-2', sale_id: 'sale-init-2', product_id: 'prod-1', qty: 3, unit_price: 15, unit_cost: 12, product: initProducts[1] },
      { id: 'si-init-3', sale_id: 'sale-init-2', product_id: 'prod-7', qty: 1, unit_price: 30, unit_cost: 25, product: initProducts[7] }
    ]
  }
]

// ── Initial Stock Movements ──
const initStockMovements: StockMovement[] = [
  { id: 'sm-init-1', product_id: 'prod-magic-tumbler', date: '2026-10-28', type: 'sale', qty: -2, ref_id: 'sale-init-1' },
  { id: 'sm-init-2', product_id: 'prod-1', date: '2026-10-28', type: 'sale', qty: -3, ref_id: 'sale-init-2' },
  { id: 'sm-init-3', product_id: 'prod-7', date: '2026-10-28', type: 'sale', qty: -1, ref_id: 'sale-init-2' },
]

// ── Staff ──
const initStaff: StaffProfile[] = [
  { user_id: 'demo-admin-1', name: 'Admin User', role: 'admin', email: 'admin@maythree.com' },
  { user_id: 'demo-staff-1', name: 'Staff User', role: 'staff', email: 'staff@maythree.com' },
  { user_id: 'demo-store-1', name: 'Store Staff', role: 'store_staff', email: 'store@maythree.com' },
]

// Helper to safely read from localStorage
function getStoredState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw)
  } catch (err) {
    console.warn('Could not parse stored state:', err)
    return null
  }
}

// ────────────────────────────────────────────────────────────────────
// Context interface — every action the app can perform
// ────────────────────────────────────────────────────────────────────
interface DemoDataContextType {
  isDemoMode: boolean
  // Read
  roomTypes: RoomType[]
  flats: Flat[]
  rooms: Room[]
  beds: Bed[]
  applications: Application[]
  residents: Resident[]
  payments: Payment[]
  expenseCategories: ExpenseCategory[]
  vendors: Vendor[]
  expenses: Expense[]
  cashAccounts: CashAccount[]
  cashTransactions: CashTransaction[]
  products: Product[]
  sales: Sale[]
  stockMovements: StockMovement[]
  stockPurchases: StockPurchase[]
  stockCounts: StockCount[]
  staffList: StaffProfile[]
  acRooms: Set<string>
  vacatedResidents: VacatedResident[]
  // Computed
  dashboardStats: DashboardStats
  publicRoomOptions: PublicRoomOption[]
  rentDueList: RentDueView[]
  // Application actions
  addApplication: (app: Omit<Application, 'id' | 'ref_no' | 'submitted_at' | 'status' | 'reviewed_by' | 'review_note'>) => Application
  updateApplicationStatus: (id: string, status: ApplicationStatus, note?: string) => void
  // Bed allocation & checkout
  allocateBed: (applicationId: string, bedId: string, checkInDate: string, depositAmount: number) => void
  checkOutResident: (residentId: string, checkOutDate: string) => void
  vacateResident: (params: VacateResidentParams) => VacatedResident
  resetResidentPin: (residentId: string, newPin?: string) => string
  updateBedStatus: (bedId: string, status: BedStatus) => void
  // Payments
  addPayment: (payment: Omit<Payment, 'id' | 'receipt_no'>) => Payment
  // Expenses
  addExpense: (expense: Omit<Expense, 'id' | 'status' | 'approved_by'>) => Expense
  updateExpenseStatus: (id: string, status: 'approved' | 'rejected') => void
  // Cash
  topUpCash: (accountId: string, amount: number, note?: string) => void
  recordCashCount: (accountId: string, countedAmount: number, note?: string) => void
  // Store
  addProduct: (product: Omit<Product, 'id'>) => Product
  updateProduct: (id: string, changes: Partial<Product>) => void
  recordSale: (items: { productId: string; qty: number; unitPrice: number }[], paymentMode: SalePaymentMode, residentId?: string | null) => Sale
  recordPurchase: (vendorId: string | null, invoiceNo: string, paidFrom: string, items: { productId: string; qty: number; unitCost: number }[]) => StockPurchase
  recordStockAdjustment: (productId: string, countedQty: number, reason: string) => void
  recordDamageExpiry: (productId: string, qty: number, type: 'damage' | 'expiry', reason: string) => void
  // Settings
  updateRoomType: (id: string, changes: Partial<RoomType>) => void
  addStaff: (staff: StaffProfile) => void
  updateStaff: (userId: string, changes: Partial<StaffProfile>) => void
  removeStaff: (userId: string) => void
  updateRoomConfig: (roomId: string, changes: { room_type_id?: string }) => void
  addBedToRoom: (roomId: string) => void
  removeBedFromRoom: (bedId: string) => void
  toggleRoomAC: (roomId: string) => void
}

const DemoDataContext = createContext<DemoDataContextType | undefined>(undefined)

export function DemoDataProvider({ children }: { children: React.ReactNode }) {
  const stored = getStoredState()

  const [roomTypes, setRoomTypes] = useState<RoomType[]>(stored?.roomTypes || initialRoomTypes)
  const [rooms, setRooms] = useState<Room[]>(stored?.rooms || initRooms)
  const [beds, setBeds] = useState<Bed[]>(stored?.beds || initBeds)
  const [applications, setApplications] = useState<Application[]>(stored?.applications || initApplications)
  const [residents, setResidents] = useState<Resident[]>(stored?.residents || initResidents)
  const [payments, setPayments] = useState<Payment[]>(stored?.payments || initPayments)
  const [expenses, setExpenses] = useState<Expense[]>(stored?.expenses || initExpenses)
  const [cashAccounts, setCashAccounts] = useState<CashAccount[]>(stored?.cashAccounts || initCashAccounts)
  const [cashTransactions, setCashTransactions] = useState<CashTransaction[]>(stored?.cashTransactions || initCashTransactions)
  const [products, setProducts] = useState<Product[]>(stored?.products || initProducts)
  const [sales, setSales] = useState<Sale[]>(stored?.sales || initSales)
  const [stockMovements, setStockMovements] = useState<StockMovement[]>(stored?.stockMovements || initStockMovements)
  const [stockPurchases, setStockPurchases] = useState<StockPurchase[]>(stored?.stockPurchases || [])
  const [stockCounts, setStockCounts] = useState<StockCount[]>(stored?.stockCounts || [])
  const [staffList, setStaffList] = useState<StaffProfile[]>(stored?.staffList || initStaff)
  const [vacatedResidents, setVacatedResidents] = useState<VacatedResident[]>(stored?.vacatedResidents || initVacatedResidents)
  const [acRoomsState, setAcRooms] = useState<Set<string>>(
    stored?.acRooms ? new Set(stored.acRooms) : acRoomIds
  )
  const [vendors] = useState<Vendor[]>(initVendors)

  // ── Sync to localStorage on every change ──
  useEffect(() => {
    try {
      const stateToPersist = {
        roomTypes,
        rooms,
        beds,
        applications,
        residents,
        payments,
        expenses,
        cashAccounts,
        cashTransactions,
        products,
        sales,
        stockMovements,
        stockPurchases,
        stockCounts,
        staffList,
        vacatedResidents,
        acRooms: Array.from(acRoomsState),
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(stateToPersist))
    } catch (err) {
      console.warn('Failed to save to localStorage:', err)
    }
  }, [
    roomTypes, rooms, beds, applications, residents, payments, expenses,
    cashAccounts, cashTransactions, products, sales, stockMovements,
    stockPurchases, stockCounts, staffList, vacatedResidents, acRoomsState
  ])

  // ── Listen for cross-tab updates ──
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && e.newValue) {
        try {
          const fresh = JSON.parse(e.newValue)
          if (fresh.roomTypes) setRoomTypes(fresh.roomTypes)
          if (fresh.rooms) setRooms(fresh.rooms)
          if (fresh.beds) setBeds(fresh.beds)
          if (fresh.applications) setApplications(fresh.applications)
          if (fresh.residents) setResidents(fresh.residents)
          if (fresh.payments) setPayments(fresh.payments)
          if (fresh.expenses) setExpenses(fresh.expenses)
          if (fresh.cashAccounts) setCashAccounts(fresh.cashAccounts)
          if (fresh.cashTransactions) setCashTransactions(fresh.cashTransactions)
          if (fresh.products) setProducts(fresh.products)
          if (fresh.sales) setSales(fresh.sales)
          if (fresh.stockMovements) setStockMovements(fresh.stockMovements)
          if (fresh.stockPurchases) setStockPurchases(fresh.stockPurchases)
          if (fresh.stockCounts) setStockCounts(fresh.stockCounts)
          if (fresh.staffList) setStaffList(fresh.staffList)
          if (fresh.vacatedResidents) setVacatedResidents(fresh.vacatedResidents)
          if (fresh.acRooms) setAcRooms(new Set(fresh.acRooms))
        } catch (err) {
          console.warn('Cross-tab sync error:', err)
        }
      }
    }
    window.addEventListener('storage', handleStorageChange)
    return () => window.removeEventListener('storage', handleStorageChange)
  }, [])

  // ── Background Supabase Hydration ──
  useEffect(() => {
    if (DEMO_MODE) return

    async function loadFromSupabase() {
      try {
        const [
          { data: remoteApps },
          { data: remoteResidents },
          { data: remotePayments },
          { data: remoteProducts },
          { data: remoteVacated },
        ] = await Promise.all([
          supabase.from('applications').select('*'),
          supabase.from('residents').select('*, application:applications(*), bed:beds(*, room:rooms(*))'),
          supabase.from('payments').select('*'),
          supabase.from('products').select('*'),
          supabase.from('vacated_residents').select('*'),
        ])

        if (remoteProducts && remoteProducts.length > 0) {
          const rps = remoteProducts as unknown as Product[]
          setProducts(prev => {
            const map = new Map(prev.map(p => [p.id, p]))
            for (const rp of rps) {
              const existing = map.get(rp.id)
              map.set(rp.id, {
                ...rp,
                stock_on_hand: existing?.stock_on_hand ?? rp.reorder_level ?? 20
              })
            }
            // Ensure Magic Tumbler is always present
            if (!map.has('prod-magic-tumbler')) {
              map.set('prod-magic-tumbler', initProducts[0])
            }
            return Array.from(map.values())
          })
        }

        if (remoteApps && remoteApps.length > 0) {
          const rApps = remoteApps as unknown as Application[]
          setApplications(prev => {
            const existingIds = new Set(prev.map(a => a.id))
            const newOnes = rApps.filter(a => !existingIds.has(a.id))
            return [...newOnes, ...prev]
          })
        }

        if (remoteResidents && remoteResidents.length > 0) {
          const rRes = remoteResidents as unknown as Resident[]
          setResidents(prev => {
            const existingIds = new Set(prev.map(r => r.id))
            const newOnes = rRes.filter(r => !existingIds.has(r.id))
            return [...prev, ...newOnes]
          })
        }

        if (remotePayments && remotePayments.length > 0) {
          const rPay = remotePayments as unknown as Payment[]
          setPayments(prev => {
            const existingIds = new Set(prev.map(p => p.id))
            const newOnes = rPay.filter(p => !existingIds.has(p.id))
            return [...prev, ...newOnes]
          })
        }

        if (remoteVacated && remoteVacated.length > 0) {
          const rVac = remoteVacated as unknown as VacatedResident[]
          setVacatedResidents(prev => {
            const existingIds = new Set(prev.map(v => v.id))
            const newOnes = rVac.filter(v => !existingIds.has(v.id))
            return [...newOnes, ...prev]
          })
        }
      } catch (e) {
        console.warn('Supabase background load warning (using local state):', e)
      }
    }

    loadFromSupabase()
  }, [])

  // ── Computed values (derived dynamically via useMemo) ──
  const dashboardStats = useMemo<DashboardStats>(() => {
    const occupied = beds.filter(b => b.status === 'occupied').length
    const reserved = beds.filter(b => b.status === 'reserved').length
    const maintenance = beds.filter(b => b.status === 'maintenance').length
    const vacant = beds.filter(b => b.status === 'available').length
    const pendingApps = applications.filter(a => a.status === 'submitted' || a.status === 'under_review').length

    const activeResidents = residents.filter(r => r.status === 'active')
    const totalRentDue = activeResidents.reduce((s, r) => s + r.monthly_rent, 0)
    const currentMonth = new Date().toISOString().slice(0, 7)
    const totalPaid = payments.filter(p => p.period_month === currentMonth).reduce((s, p) => s + p.amount, 0)

    const twinVacant = beds.filter(b => b.status === 'available' && b.room_id.startsWith('room-2')).length
    const singleVacant = beds.filter(b => b.status === 'available' && b.room_id.startsWith('room-3')).length
    const fourVacant = beds.filter(b => b.status === 'available' && !b.room_id.startsWith('room-2') && !b.room_id.startsWith('room-3')).length

    return {
      total_beds: beds.length,
      occupied, vacant, reserved, maintenance,
      pending_applications: pendingApps,
      rent_due_this_month: totalRentDue,
      rent_collected_this_month: totalPaid,
      admissions_possible: [
        { category: 'Twin Sharing', count: twinVacant },
        { category: 'Single Room', count: singleVacant },
        { category: '4-Sharing', count: fourVacant },
      ]
    }
  }, [beds, applications, residents, payments])

  const publicRoomOptions = useMemo<PublicRoomOption[]>(() => {
    return [
      { room_type: 'Twin Sharing · Non-AC', has_ac: false, rent_per_head: roomTypes[0]?.rent_per_head || 8000, beds_available: beds.filter(b => b.status === 'available' && b.room_id.startsWith('room-2')).length },
      { room_type: 'Single Room · Non-AC', has_ac: false, rent_per_head: roomTypes[1]?.rent_per_head || 10000, beds_available: beds.filter(b => b.status === 'available' && b.room_id.startsWith('room-3')).length },
      { room_type: '4-Sharing · Non-AC', has_ac: false, rent_per_head: roomTypes[2]?.rent_per_head || 7000, beds_available: beds.filter(b => b.status === 'available' && !b.room_id.startsWith('room-2') && !b.room_id.startsWith('room-3')).length },
    ].filter(o => o.beds_available > 0)
  }, [beds, roomTypes])

  const rentDueList = useMemo<RentDueView[]>(() => {
    const currentMonth = new Date().toISOString().slice(0, 7)
    return residents.filter(r => r.status === 'active').map(r => {
      const paid = payments.filter(p => p.resident_id === r.id && p.period_month === currentMonth).reduce((s, p) => s + p.amount, 0)
      const room = rooms.find(rm => rm.id === r.bed?.room_id)
      return {
        resident_id: r.id,
        resident_name: r.application?.full_name || 'Unknown',
        room_no: room?.room_no || r.bed?.room?.room_no || '—',
        bed_label: r.bed?.bed_label || '—',
        period_month: currentMonth,
        rent_due: r.monthly_rent,
        paid,
        balance: r.monthly_rent - paid,
        phone: r.application?.phone || '',
      }
    })
  }, [residents, payments, rooms])

  // ── Application actions ──
  const addApplication = useCallback((app: Omit<Application, 'id' | 'ref_no' | 'submitted_at' | 'status' | 'reviewed_by' | 'review_note'>): Application => {
    const newApp: Application = {
      ...app,
      id: `app-${Date.now()}`,
      ref_no: `HST-2026-${String(applications.length + 1).padStart(4, '0')}`,
      submitted_at: new Date().toISOString(),
      status: 'submitted',
      reviewed_by: null,
      review_note: null,
    }
    setApplications(prev => [newApp, ...prev])

    if (!DEMO_MODE) {
      (supabase as any).from('applications').insert([newApp]).then(({ error }: any) => {
        if (error) console.warn('Supabase application insert warning:', error.message)
      })
    }

    return newApp
  }, [applications.length])

  const updateApplicationStatus = useCallback((id: string, status: ApplicationStatus, note?: string) => {
    setApplications(prev => prev.map(a => a.id === id ? { ...a, status, review_note: note || a.review_note, reviewed_by: 'demo-staff-1' } : a))

    if (!DEMO_MODE) {
      (supabase as any).from('applications').update({ status, review_note: note }).eq('id', id).then(({ error }: any) => {
        if (error) console.warn('Supabase application update warning:', error.message)
      })
    }
  }, [])

  // ── Bed allocation (influences Bed, Resident, Application & Dashboard) ──
  const allocateBed = useCallback((applicationId: string, bedId: string, checkInDate: string, depositAmount: number) => {
    const app = applications.find(a => a.id === applicationId)
    if (!app) return

    const bed = beds.find(b => b.id === bedId)
    if (!bed) return

    const room = rooms.find(r => r.id === bed.room_id)
    const rt = roomTypes.find(t => t.id === room?.room_type_id)

    // Generate unique 4-digit PIN for new resident
    const existingPins = new Set(residents.filter(r => r.status === 'active' && r.pin).map(r => r.pin))
    let autoPin = '1234'
    for (let i = 0; i < 500; i++) {
      const candidate = Math.floor(1000 + Math.random() * 9000).toString()
      if (!existingPins.has(candidate)) {
        autoPin = candidate
        break
      }
    }

    // Create resident
    const newResident: Resident = {
      id: `res-${Date.now()}`,
      application_id: applicationId,
      bed_id: bedId,
      check_in_date: checkInDate,
      check_out_date: null,
      monthly_rent: rt?.rent_per_head || 8000,
      deposit_amount: depositAmount,
      status: 'active',
      pin: autoPin,
      pin_active: true,
      application: app,
      bed: { ...bed, status: 'occupied', room: room },
    }

    // Update bed status to occupied
    setBeds(prev => prev.map(b => b.id === bedId ? { ...b, status: 'occupied' as BedStatus } : b))

    // Add resident
    setResidents(prev => [newResident, ...prev])

    // Update application status
    setApplications(prev => prev.map(a => a.id === applicationId ? { ...a, status: 'approved' as ApplicationStatus, review_note: 'Approved and bed allocated', reviewed_by: 'demo-staff-1' } : a))

    if (!DEMO_MODE) {
      (supabase as any).from('beds').update({ status: 'occupied' }).eq('id', bedId).then()
      (supabase as any).from('residents').insert([newResident]).then()
      (supabase as any).from('applications').update({ status: 'approved' }).eq('id', applicationId).then()
    }
  }, [applications, beds, rooms, roomTypes])

  // ── Checkout (frees Bed and moves Resident to Checked Out) ──
  const checkOutResident = useCallback((residentId: string, checkOutDate: string) => {
    const resident = residents.find(r => r.id === residentId)
    if (!resident) return

    // Free the bed
    setBeds(prev => prev.map(b => b.id === resident.bed_id ? { ...b, status: 'available' as BedStatus } : b))

    // Update resident
    setResidents(prev => prev.map(r => r.id === residentId ? { ...r, status: 'checked_out' as const, check_out_date: checkOutDate } : r))

    if (!DEMO_MODE) {
      (supabase as any).from('beds').update({ status: 'available' }).eq('id', resident.bed_id).then()
      (supabase as any).from('residents').update({ status: 'checked_out', check_out_date: checkOutDate }).eq('id', residentId).then()
    }
  }, [residents])

  // ── Vacate Resident (Full Phase 2 checkout settlement) ──
  const vacateResident = useCallback((params: VacateResidentParams): VacatedResident => {
    const resident = residents.find(r => r.id === params.residentId)
    if (!resident) {
      throw new Error(`Resident ${params.residentId} not found`)
    }

    const room = rooms.find(rm => rm.id === resident.bed?.room_id)
    const residentName = resident.application?.full_name || 'Resident'
    const roomNo = room?.room_no || resident.bed?.room?.room_no || '—'
    const bedLabel = resident.bed?.bed_label || 'A'

    // 1. Free the bed (status -> available)
    setBeds(prev => prev.map(b => b.id === resident.bed_id ? { ...b, status: 'available' as BedStatus } : b))

    // 2. Mark resident as vacated, deactivate PIN
    setResidents(prev => prev.map(r => r.id === params.residentId ? {
      ...r,
      status: 'vacated' as const,
      check_out_date: params.vacateDate,
      pin_active: false
    } : r))

    // 3. Create departure record
    const settlementAmt = Math.abs(Number(params.settlementAmount) || 0)
    const newDeparture: VacatedResident = {
      id: `vac-${Date.now()}`,
      resident_id: resident.id,
      resident_name: residentName,
      room_no: roomNo,
      bed_label: bedLabel,
      admission_date: resident.check_in_date,
      vacate_date: params.vacateDate,
      reason: params.reason || null,
      notes: params.notes || null,
      pending_dues: Number(params.pendingDues) || 0,
      deposit_amount: Number(params.depositAmount) || 0,
      deductions: Number(params.deductions) || 0,
      settlement_amount: settlementAmt,
      settlement_type: params.settlementType,
      account_id: params.accountId || null,
      processed_by: params.processedBy || 'Admin User',
      created_at: new Date().toISOString()
    }

    setVacatedResidents(prev => [newDeparture, ...prev])

    // 4. Post automatically to Cash Book as a transaction
    // refund = cash out, dues collected = cash in, with resident name and "Vacate settlement"
    if (settlementAmt > 0 && params.accountId) {
      const isRefund = params.settlementType === 'refund'
      const direction: CashDirection = isRefund ? 'out' : 'in'
      const note = `${residentName} - Vacate settlement`

      const newTxn: CashTransaction = {
        id: `ct-vac-${Date.now()}`,
        account_id: params.accountId,
        txn_date: params.vacateDate,
        direction,
        amount: settlementAmt,
        source: 'adjustment',
        source_id: newDeparture.id,
        note,
        recorded_by: params.processedBy || 'Admin User'
      }

      setCashTransactions(prev => [newTxn, ...prev])

      // Update cash account balance
      setCashAccounts(prev => prev.map(acc => {
        if (acc.id === params.accountId) {
          const currentBal = acc.balance || 0
          const updatedBal = isRefund ? currentBal - settlementAmt : currentBal + settlementAmt
          return { ...acc, balance: updatedBal }
        }
        return acc
      }))

      if (!DEMO_MODE) {
        ;(supabase as any).from('cash_transactions').insert([newTxn]).then()
        const targetAcc = cashAccounts.find(a => a.id === params.accountId)
        if (targetAcc) {
          const accBal = targetAcc.balance || 0
          const finalBal = isRefund ? accBal - settlementAmt : accBal + settlementAmt;
          ;(supabase as any).from('cash_accounts').update({ balance: finalBal }).eq('id', params.accountId).then()
        }
      }
    }

    // 5. Remote Supabase sync
    if (!DEMO_MODE) {
      (supabase as any).from('beds').update({ status: 'available' }).eq('id', resident.bed_id).then()
      (supabase as any).from('residents').update({
        status: 'vacated',
        check_out_date: params.vacateDate,
        pin_active: false
      }).eq('id', resident.id).then()
      (supabase as any).from('vacated_residents').insert([newDeparture]).then()
    }

    return newDeparture
  }, [residents, rooms, cashAccounts])

  // ── PIN Reset ──
  const resetResidentPin = useCallback((residentId: string, newPin?: string): string => {
    const existingPins = new Set(residents.filter(r => r.id !== residentId && r.status === 'active' && r.pin).map(r => r.pin))
    let pinToSet = newPin
    if (!pinToSet) {
      for (let i = 0; i < 500; i++) {
        const candidate = Math.floor(1000 + Math.random() * 9000).toString()
        if (!existingPins.has(candidate)) {
          pinToSet = candidate
          break
        }
      }
    }
    if (!pinToSet) pinToSet = '1234'

    setResidents(prev => prev.map(r => r.id === residentId ? { ...r, pin: pinToSet, pin_active: true } : r))

    if (!DEMO_MODE) {
      (supabase as any).from('residents').update({ pin: pinToSet, pin_active: true }).eq('id', residentId).then()
    }
    return pinToSet
  }, [residents])

  const updateBedStatus = useCallback((bedId: string, status: BedStatus) => {
    setBeds(prev => prev.map(b => b.id === bedId ? { ...b, status } : b))
    if (!DEMO_MODE) {
      (supabase as any).from('beds').update({ status }).eq('id', bedId).then()
    }
  }, [])

  // ── Payments (influences Rent due, Rent Cash, UPI, Bank accounts & Reports) ──
  const addPayment = useCallback((payment: Omit<Payment, 'id' | 'receipt_no'>): Payment => {
    const newPayment: Payment = {
      ...payment,
      id: `pay-${Date.now()}`,
      receipt_no: `RCT-${String(payments.length + 1).padStart(3, '0')}`,
    }
    setPayments(prev => [newPayment, ...prev])

    // Credit corresponding account based on payment mode
    if (payment.mode === 'cash') {
      // Rent Cash Account
      setCashAccounts(prev => prev.map(a => a.id === 'ca-3' ? { ...a, balance: (a.balance || 0) + payment.amount } : a))
      setCashTransactions(prev => [{
        id: `ct-${Date.now()}`, account_id: 'ca-3', txn_date: payment.paid_on,
        direction: 'in' as const, amount: payment.amount, source: 'rent_payment' as const,
        source_id: newPayment.id, note: `Rent payment ${newPayment.receipt_no} (Cash)`, recorded_by: payment.received_by
      }, ...prev])
    } else if (payment.mode === 'UPI') {
      // UPI Account
      setCashAccounts(prev => prev.map(a => a.id === 'ca-5' ? { ...a, balance: (a.balance || 0) + payment.amount } : a))
      setCashTransactions(prev => [{
        id: `ct-${Date.now()}`, account_id: 'ca-5', txn_date: payment.paid_on,
        direction: 'in' as const, amount: payment.amount, source: 'rent_payment' as const,
        source_id: newPayment.id, note: `Rent payment ${newPayment.receipt_no} (UPI ${payment.reference || ''})`, recorded_by: payment.received_by
      }, ...prev])
    } else if (payment.mode === 'bank') {
      // Bank Account
      setCashAccounts(prev => prev.map(a => a.id === 'ca-4' ? { ...a, balance: (a.balance || 0) + payment.amount } : a))
      setCashTransactions(prev => [{
        id: `ct-${Date.now()}`, account_id: 'ca-4', txn_date: payment.paid_on,
        direction: 'in' as const, amount: payment.amount, source: 'rent_payment' as const,
        source_id: newPayment.id, note: `Rent payment ${newPayment.receipt_no} (Bank Transfer ${payment.reference || ''})`, recorded_by: payment.received_by
      }, ...prev])
    }

    if (!DEMO_MODE) {
      (supabase as any).from('payments').insert([newPayment]).then()
    }

    return newPayment
  }, [payments.length])

  // ── Expenses (influences Petty Cash / Bank & Operating Expenses on Reports) ──
  const addExpense = useCallback((expense: Omit<Expense, 'id' | 'status' | 'approved_by'>): Expense => {
    const newExpense: Expense = {
      ...expense,
      id: `exp-${Date.now()}`,
      status: 'recorded',
      approved_by: null,
    }
    setExpenses(prev => [newExpense, ...prev])

    // Debit account based on paid_from
    if (expense.paid_from === 'petty_cash') {
      setCashAccounts(prev => prev.map(a => a.id === 'ca-1' ? { ...a, balance: (a.balance || 0) - expense.amount } : a))
      setCashTransactions(prev => [{
        id: `ct-${Date.now()}`, account_id: 'ca-1', txn_date: expense.expense_date,
        direction: 'out' as const, amount: expense.amount, source: 'expense' as const,
        source_id: newExpense.id, note: expense.description, recorded_by: expense.recorded_by
      }, ...prev])
    } else if (expense.paid_from === 'bank') {
      setCashAccounts(prev => prev.map(a => a.id === 'ca-4' ? { ...a, balance: (a.balance || 0) - expense.amount } : a))
      setCashTransactions(prev => [{
        id: `ct-${Date.now()}`, account_id: 'ca-4', txn_date: expense.expense_date,
        direction: 'out' as const, amount: expense.amount, source: 'expense' as const,
        source_id: newExpense.id, note: expense.description, recorded_by: expense.recorded_by
      }, ...prev])
    }

    if (!DEMO_MODE) {
      (supabase as any).from('expenses').insert([newExpense]).then()
    }

    return newExpense
  }, [])

  const updateExpenseStatus = useCallback((id: string, status: 'approved' | 'rejected') => {
    setExpenses(prev => prev.map(e => e.id === id ? { ...e, status, approved_by: status === 'approved' ? 'demo-admin-1' : null } : e))
    if (!DEMO_MODE) {
      (supabase as any).from('expenses').update({ status }).eq('id', id).then()
    }
  }, [])

  // ── Cash Top-up & Count ──
  const topUpCash = useCallback((accountId: string, amount: number, note?: string) => {
    const target = cashAccounts.find(a => a.id === accountId)
    setCashAccounts(prev => prev.map(a => a.id === accountId ? { ...a, balance: (a.balance || 0) + amount } : a))
    setCashTransactions(prev => [{
      id: `ct-${Date.now()}`, account_id: accountId, txn_date: new Date().toISOString().split('T')[0],
      direction: 'in' as const, amount, source: 'top_up' as const,
      source_id: null, note: note || `Top-up for ${target?.name || 'Cash Account'}`, recorded_by: 'demo-admin-1'
    }, ...prev])
  }, [cashAccounts])

  const recordCashCount = useCallback((accountId: string, countedAmount: number, note?: string) => {
    const account = cashAccounts.find(a => a.id === accountId)
    const systemBalance = account?.balance || 0
    const difference = countedAmount - systemBalance

    setCashAccounts(prev => prev.map(a => a.id === accountId ? { ...a, balance: countedAmount } : a))

    if (difference !== 0) {
      setCashTransactions(prev => [{
        id: `ct-${Date.now()}`, account_id: accountId, txn_date: new Date().toISOString().split('T')[0],
        direction: difference > 0 ? 'in' as const : 'out' as const, amount: Math.abs(difference), source: 'adjustment' as const,
        source_id: null, note: note || `Cash count discrepancy: ${difference > 0 ? '+' : ''}${difference}`, recorded_by: 'demo-admin-1'
      }, ...prev])
    }
  }, [cashAccounts])

  // ── Store: Products ──
  const addProduct = useCallback((product: Omit<Product, 'id'>): Product => {
    const newProduct: Product = { ...product, id: `prod-${Date.now()}` }
    setProducts(prev => [...prev, newProduct])

    if (!DEMO_MODE) {
      (supabase as any).from('products').insert([newProduct]).then()
    }

    return newProduct
  }, [])

  const updateProduct = useCallback((id: string, changes: Partial<Product>) => {
    setProducts(prev => prev.map(p => p.id === id ? { ...p, ...changes } : p))
    if (!DEMO_MODE) {
      (supabase as any).from('products').update(changes).eq('id', id).then()
    }
  }, [])

  // ── Store: Sales (Order / POS checkout - decrements stock, credits cash/UPI, links resident) ──
  const recordSale = useCallback((
    items: { productId: string; qty: number; unitPrice: number }[],
    paymentMode: SalePaymentMode,
    residentId?: string | null
  ): Sale => {
    const saleId = `sale-${Date.now()}`
    const saleDate = new Date().toISOString().split('T')[0]
    const saleItems: SaleItem[] = items.map((item, i) => {
      const product = products.find(p => p.id === item.productId)
      return {
        id: `si-${Date.now()}-${i}`,
        sale_id: saleId,
        product_id: item.productId,
        qty: item.qty,
        unit_price: item.unitPrice,
        unit_cost: product?.cost_price || 0,
        product,
      }
    })

    const total = saleItems.reduce((s, si) => s + si.unit_price * si.qty, 0)

    const sale: Sale = {
      id: saleId,
      sale_date: saleDate,
      sold_by: 'demo-store-1',
      resident_id: residentId || null,
      payment_mode: paymentMode,
      total,
      items: saleItems,
    }

    setSales(prev => [sale, ...prev])

    // Reduce stock for each item immediately
    setProducts(prev => prev.map(p => {
      const soldItem = items.find(i => i.productId === p.id)
      if (soldItem) {
        return { ...p, stock_on_hand: Math.max(0, (p.stock_on_hand || 0) - soldItem.qty) }
      }
      return p
    }))

    // Record stock movements
    const movements: StockMovement[] = items.map((item, i) => ({
      id: `sm-${Date.now()}-${i}`,
      product_id: item.productId,
      date: saleDate,
      type: 'sale' as StockMovementType,
      qty: -item.qty,
      ref_id: saleId,
    }))
    setStockMovements(prev => [...movements, ...prev])

    // Credit cash account if Cash or UPI
    if (paymentMode === 'cash') {
      // Store Counter Account
      setCashAccounts(prev => prev.map(a => a.id === 'ca-2' ? { ...a, balance: (a.balance || 0) + total } : a))
      setCashTransactions(prev => [{
        id: `ct-${Date.now()}`, account_id: 'ca-2', txn_date: saleDate,
        direction: 'in' as const, amount: total, source: 'store_sale' as const,
        source_id: saleId, note: `Store sale #${saleId.slice(-6)} (Cash)`, recorded_by: 'demo-store-1'
      }, ...prev])
    } else if (paymentMode === 'UPI') {
      // UPI Account
      setCashAccounts(prev => prev.map(a => a.id === 'ca-5' ? { ...a, balance: (a.balance || 0) + total } : a))
      setCashTransactions(prev => [{
        id: `ct-${Date.now()}`, account_id: 'ca-5', txn_date: saleDate,
        direction: 'in' as const, amount: total, source: 'store_sale' as const,
        source_id: saleId, note: `Store sale #${saleId.slice(-6)} (UPI)`, recorded_by: 'demo-store-1'
      }, ...prev])
    }

    if (!DEMO_MODE) {
      (supabase as any).from('sales').insert([{ id: saleId, sale_date: saleDate, sold_by: '00000000-0000-0000-0000-000000000001', payment_mode: paymentMode, total }]).then()
    }

    return sale
  }, [products])

  // ── Store: Purchases (Increments stock, debits cash/bank) ──
  const recordPurchase = useCallback((vendorId: string | null, invoiceNo: string, paidFrom: string, items: { productId: string; qty: number; unitCost: number }[]): StockPurchase => {
    const purchaseId = `sp-${Date.now()}`
    const purchaseDate = new Date().toISOString().split('T')[0]

    const purchaseItems: StockPurchaseItem[] = items.map((item, i) => ({
      id: `spi-${Date.now()}-${i}`,
      purchase_id: purchaseId,
      product_id: item.productId,
      qty: item.qty,
      unit_cost: item.unitCost,
      product: products.find(p => p.id === item.productId),
    }))

    const purchase: StockPurchase = {
      id: purchaseId, purchase_date: purchaseDate, vendor_id: vendorId,
      invoice_no: invoiceNo, paid_from: paidFrom, items: purchaseItems,
      vendor: initVendors.find(v => v.id === vendorId),
    }

    setStockPurchases(prev => [purchase, ...prev])

    // Increase stock
    setProducts(prev => prev.map(p => {
      const boughtItem = items.find(i => i.productId === p.id)
      if (boughtItem) {
        return { ...p, stock_on_hand: (p.stock_on_hand || 0) + boughtItem.qty }
      }
      return p
    }))

    // Record stock movements
    const movements: StockMovement[] = items.map((item, i) => ({
      id: `sm-${Date.now()}-${i}`,
      product_id: item.productId,
      date: purchaseDate,
      type: 'purchase' as StockMovementType,
      qty: item.qty,
      ref_id: purchaseId,
    }))
    setStockMovements(prev => [...movements, ...prev])

    // Debit account based on paidFrom
    const total = items.reduce((s, i) => s + i.qty * i.unitCost, 0)
    if (paidFrom === 'petty_cash') {
      setCashAccounts(prev => prev.map(a => a.id === 'ca-1' ? { ...a, balance: (a.balance || 0) - total } : a))
      setCashTransactions(prev => [{
        id: `ct-${Date.now()}`, account_id: 'ca-1', txn_date: purchaseDate,
        direction: 'out' as const, amount: total, source: 'expense' as const,
        source_id: purchaseId, note: `Stock purchase #${invoiceNo || purchaseId.slice(-6)}`, recorded_by: 'demo-admin-1'
      }, ...prev])
    } else if (paidFrom === 'bank') {
      setCashAccounts(prev => prev.map(a => a.id === 'ca-4' ? { ...a, balance: (a.balance || 0) - total } : a))
      setCashTransactions(prev => [{
        id: `ct-${Date.now()}`, account_id: 'ca-4', txn_date: purchaseDate,
        direction: 'out' as const, amount: total, source: 'expense' as const,
        source_id: purchaseId, note: `Stock purchase #${invoiceNo || purchaseId.slice(-6)} (Bank)`, recorded_by: 'demo-admin-1'
      }, ...prev])
    }

    return purchase
  }, [products])

  // ── Store: Physical Count (Stock Adjustment) ──
  const recordStockAdjustment = useCallback((productId: string, countedQty: number, reason: string) => {
    const product = products.find(p => p.id === productId)
    if (!product) return
    const systemQty = product.stock_on_hand || 0
    const difference = countedQty - systemQty

    setProducts(prev => prev.map(p => p.id === productId ? { ...p, stock_on_hand: countedQty } : p))

    if (difference !== 0) {
      setStockMovements(prev => [{
        id: `sm-${Date.now()}`,
        product_id: productId,
        date: new Date().toISOString().split('T')[0],
        type: 'adjustment' as StockMovementType,
        qty: difference,
        ref_id: null,
      }, ...prev])
    }

    setStockCounts(prev => [{
      id: `sc-${Date.now()}`,
      count_date: new Date().toISOString().split('T')[0],
      product_id: productId,
      counted_qty: countedQty,
      system_qty: systemQty,
      difference,
      reason,
    }, ...prev])
  }, [products])

  // ── Store: Damage / Expiry ──
  const recordDamageExpiry = useCallback((productId: string, qty: number, type: 'damage' | 'expiry', reason: string) => {
    setProducts(prev => prev.map(p => p.id === productId ? { ...p, stock_on_hand: Math.max(0, (p.stock_on_hand || 0) - qty) } : p))

    setStockMovements(prev => [{
      id: `sm-${Date.now()}`,
      product_id: productId,
      date: new Date().toISOString().split('T')[0],
      type: type as StockMovementType,
      qty: -qty,
      ref_id: null,
    }, ...prev])
  }, [])

  // ── Settings: Room Types ──
  const updateRoomType = useCallback((id: string, changes: Partial<RoomType>) => {
    setRoomTypes(prev => prev.map(rt => rt.id === id ? { ...rt, ...changes } : rt))
    setRooms(prev => prev.map(r => r.room_type_id === id ? { ...r, room_type: { ...r.room_type!, ...changes } } : r))
  }, [])

  // ── Settings: Staff ──
  const addStaff = useCallback((staff: StaffProfile) => {
    setStaffList(prev => [...prev, staff])
  }, [])

  const updateStaff = useCallback((userId: string, changes: Partial<StaffProfile>) => {
    setStaffList(prev => prev.map(s => s.user_id === userId ? { ...s, ...changes } : s))
  }, [])

  const removeStaff = useCallback((userId: string) => {
    setStaffList(prev => prev.filter(s => s.user_id !== userId))
  }, [])

  // ── Settings: Room Config & Beds ──
  const updateRoomConfig = useCallback((roomId: string, changes: { room_type_id?: string }) => {
    setRooms(prev => prev.map(r => {
      if (r.id !== roomId) return r
      const newRt = roomTypes.find(rt => rt.id === changes.room_type_id)
      return { ...r, ...changes, room_type: newRt || r.room_type }
    }))
  }, [roomTypes])

  const addBedToRoom = useCallback((roomId: string) => {
    const roomBeds = beds.filter(b => b.room_id === roomId)
    const nextLabel = String.fromCharCode(65 + roomBeds.length) // A, B, C, D, E...
    const room = rooms.find(r => r.id === roomId)
    const roomNo = room?.room_no || roomId.replace('room-', '')
    const newBed: Bed = {
      id: `bed-${roomNo}-${nextLabel}`,
      room_id: roomId,
      bed_label: nextLabel,
      status: 'available',
    }
    setBeds(prev => [...prev, newBed])
  }, [beds, rooms])

  const removeBedFromRoom = useCallback((bedId: string) => {
    const bed = beds.find(b => b.id === bedId)
    if (!bed || bed.status === 'occupied') return
    setBeds(prev => prev.filter(b => b.id !== bedId))
  }, [beds])

  const toggleRoomAC = useCallback((roomId: string) => {
    setAcRooms(prev => {
      const next = new Set(prev)
      if (next.has(roomId)) {
        next.delete(roomId)
      } else {
        next.add(roomId)
      }
      return next
    })
  }, [])

  return (
    <DemoDataContext.Provider value={{
      isDemoMode: DEMO_MODE,
      roomTypes,
      flats,
      rooms,
      beds,
      applications,
      residents,
      payments,
      expenseCategories: demoExpenseCategories,
      vendors,
      expenses,
      cashAccounts,
      cashTransactions,
      products,
      sales,
      stockMovements,
      stockPurchases,
      stockCounts,
      staffList,
      acRooms: acRoomsState,
      vacatedResidents,
      dashboardStats,
      publicRoomOptions,
      rentDueList,
      addApplication,
      updateApplicationStatus,
      allocateBed,
      checkOutResident,
      vacateResident,
      resetResidentPin,
      updateBedStatus,
      addPayment,
      addExpense,
      updateExpenseStatus,
      topUpCash,
      recordCashCount,
      addProduct,
      updateProduct,
      recordSale,
      recordPurchase,
      recordStockAdjustment,
      recordDamageExpiry,
      updateRoomType,
      addStaff,
      updateStaff,
      removeStaff,
      updateRoomConfig,
      addBedToRoom,
      removeBedFromRoom,
      toggleRoomAC,
    }}>
      {children}
    </DemoDataContext.Provider>
  )
}

export function useDemoData() {
  const context = useContext(DemoDataContext)
  if (!context) throw new Error('useDemoData must be used within a DemoDataProvider')
  return context
}
