import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import { numberToWordsINR } from '@/lib/numberToWords'
import type {
  Application, Bed, Room, RoomType, Flat, Resident, Payment,
  ExpenseCategory, Expense, CashAccount, CashTransaction,
  Product, Vendor, Sale, SaleItem, StockMovement, StockPurchase, StockPurchaseItem, StockCount,
  DashboardStats, RentDueView, PublicRoomOption,
  ApplicationStatus, BedStatus, StaffProfile, StockMovementType, SalePaymentMode,
  VacatedResident, SettlementType, CashDirection, PaymentMode,
  RentBreakdownItem, DeductionItem, CheckoutReceipt,
  Document as ApplicationDocument
} from '@/types/database'

import {
  seedRoomTypes,
  seedFlats,
  seedAcRoomIds,
  generateCompleteHostelData
} from '@/lib/seedDataGenerator'
import {
  upsertAuthUser,
  deleteAuthUser,
  syncStaffListWithAuthStore,
  syncAuthUsersFromSupabase
} from '@/lib/authStore'
import type { AttendanceMovement } from '@/types/database'
import { generateApplicationRefNo, randomUuid, type ApplicationSubmission } from '@/lib/applicationRef'
import { APPLICATION_DOCUMENTS_BUCKET, applicationDocumentPath, type ApplicationUpload } from '@/lib/applicationDocuments'

export interface VacateResidentParams {
  residentId: string
  vacateDate: string
  reason?: string
  notes?: string
  pendingDues: number
  depositAmount: number
  deductions: number
  deductionReason?: string
  deductionsBreakdown?: DeductionItem[]
  rentBreakdown?: RentBreakdownItem[]
  settlementAmount: number
  settlementType: SettlementType
  accountId: string
  paymentMode?: PaymentMode
  advanceStatus?: 'Returned' | 'Adjusted'
  processedBy?: string
}

const DEMO_MODE = false

export interface AddApplicationResult {
  application: Application
  /** False when the application was saved but one or more documents were not. */
  documentsSaved: boolean
}

interface StorageErrorLike {
  message?: string
  status?: number
  statusCode?: string
  code?: string
}

interface PostgrestErrorLike {
  code?: string
  message?: string
  details?: string
}

function isUniqueViolation(error: PostgrestErrorLike): boolean {
  return error.code === '23505'
}

function isApplicationPrimaryKeyConflict(error: PostgrestErrorLike): boolean {
  return Boolean(error.message?.includes('applications_pkey') || error.details?.includes('Key (id)'))
}

function isAlreadyUploaded(error: { message?: string; status?: number; statusCode?: string; code?: string }): boolean {
  return error.code === 'ResourceAlreadyExists' || error.code === 'Duplicate' ||
    error.status === 409 || error.statusCode === '409' || Boolean(error.message?.includes('already exists'))
}

/**
 * Uploads the form's files to the private Storage bucket, then records their paths.
 * Runs after the application row is saved, so a failure here keeps the application.
 */
async function saveApplicationDocuments(applicationId: string, uploads: ApplicationUpload[]): Promise<ApplicationDocument[] | null> {
  const rows: ApplicationDocument[] = []
  for (const upload of uploads) {
    const path = applicationDocumentPath(applicationId, upload)
    const { error } = await supabase.storage
      .from(APPLICATION_DOCUMENTS_BUCKET)
      .upload(path, upload.file, { upsert: false, contentType: upload.file.type || undefined })
    if (error && !isAlreadyUploaded(error as StorageErrorLike)) {
      console.warn('[PublicAdmission] Document upload failed:', error.message)
      return null
    }
    rows.push({ id: randomUuid(), application_id: applicationId, kind: upload.kind, storage_path: path, verified: false })
  }
  // No .select(): the public form may insert documents but not read them back.
  const { error } = await (supabase as any).from('documents').insert(rows)
  if (error) {
    console.warn('[PublicAdmission] Document records not saved:', error.message)
    return null
  }
  return rows
}

const STORAGE_KEY = 'mythree_hostel_state_v10'

// ── Clean Hostel Data: 169 beds, 0 occupied, 169 vacant, 0 active residents, structure strictly preserved ──
const seedData = generateCompleteHostelData(seedRoomTypes, false)
const initialRoomTypes: RoomType[] = seedRoomTypes
const flats: Flat[] = seedFlats
const acRoomIds: Set<string> = seedAcRoomIds
const initRooms: Room[] = seedData.rooms
const initBeds: Bed[] = seedData.beds
const initApplications: Application[] = []
const initResidents: Resident[] = []
const initPayments: Payment[] = []
const initAttendanceLogs: AttendanceMovement[] = []

// ── Vacated Residents (Departure Log) ──
const initVacatedResidents: VacatedResident[] = []

// ── Checkout Receipts ──
const initCheckoutReceipts: CheckoutReceipt[] = []

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
const initVendors: Vendor[] = []

// ── Expenses ──
const initExpenses: Expense[] = []

// ── Cash Accounts (All 5 Ledgers preserved, balances reset to 0) ──
const initCashAccounts: CashAccount[] = [
  { id: 'ca-1', name: 'Petty Cash', kind: 'petty_cash', float_limit: 50000, is_active: true, balance: 0 },
  { id: 'ca-2', name: 'Store Counter', kind: 'store_counter', float_limit: 10000, is_active: true, balance: 0 },
  { id: 'ca-3', name: 'Rent Cash', kind: 'rent_collection', float_limit: null, is_active: true, balance: 0 },
  { id: 'ca-4', name: 'Hostel Bank Account', kind: 'bank', float_limit: null, is_active: true, balance: 0 },
  { id: 'ca-5', name: 'Hostel UPI Account', kind: 'upi', float_limit: null, is_active: true, balance: 0 },
]

// ── Initial Cash Transactions across all accounts ──
const initCashTransactions: CashTransaction[] = []

// ── Products (9 core catalog products preserved with stock set strictly to 0 and barcodes blank) ──
const initProducts: Product[] = [
  { id: '44444444-4444-4444-4444-444444444401', name: 'Maggi Noodles', category: 'Snacks', unit: 'packet', barcode: '', cost_price: 12.00, selling_price: 15.00, reorder_level: 20, is_active: true, stock_on_hand: 0 },
  { id: '44444444-4444-4444-4444-444444444402', name: 'Lays Chips (Classic)', category: 'Snacks', unit: 'packet', barcode: '', cost_price: 16.00, selling_price: 20.00, reorder_level: 15, is_active: true, stock_on_hand: 0 },
  { id: '44444444-4444-4444-4444-444444444403', name: 'Dove Soap', category: 'Toiletries', unit: 'piece', barcode: '', cost_price: 45.00, selling_price: 55.00, reorder_level: 10, is_active: true, stock_on_hand: 0 },
  { id: '44444444-4444-4444-4444-444444444404', name: 'Bisleri Water (1L)', category: 'Drinks', unit: 'bottle', barcode: '', cost_price: 14.00, selling_price: 20.00, reorder_level: 30, is_active: true, stock_on_hand: 0 },
  { id: '44444444-4444-4444-4444-444444444405', name: 'Notebook (200 pages)', category: 'Stationery', unit: 'piece', barcode: '', cost_price: 28.00, selling_price: 40.00, reorder_level: 10, is_active: true, stock_on_hand: 0 },
  { id: '44444444-4444-4444-4444-444444444406', name: 'Pen (Blue)', category: 'Stationery', unit: 'piece', barcode: '', cost_price: 5.00, selling_price: 10.00, reorder_level: 20, is_active: true, stock_on_hand: 0 },
  { id: '44444444-4444-4444-4444-444444444407', name: 'Coca Cola (300ml)', category: 'Drinks', unit: 'bottle', barcode: '', cost_price: 22.00, selling_price: 30.00, reorder_level: 20, is_active: true, stock_on_hand: 0 },
  { id: '44444444-4444-4444-4444-444444444408', name: 'Colgate Toothpaste', category: 'Toiletries', unit: 'piece', barcode: '', cost_price: 58.00, selling_price: 75.00, reorder_level: 8, is_active: true, stock_on_hand: 0 },
  { id: '55555555-5555-5555-5555-555555555501', name: 'Magic Tumbler', category: 'Hostel Essentials', unit: 'piece', barcode: '', cost_price: 180.00, selling_price: 250.00, reorder_level: 10, is_active: true, stock_on_hand: 0 },
]

// ── Store Sales ──
const initSales: Sale[] = []

// ── Stock Movements ──
const initStockMovements: StockMovement[] = []

// ── Staff ──
const initStaff: StaffProfile[] = [
  { user_id: 'a0b1b6ac-c20f-4be1-ae43-02ef283661a1', name: 'Hadi Muhammad', role: 'admin', email: 'hadimajestic@gmail.com', username: 'hadi.admin' },
  { user_id: '6fb5cf6c-cef0-4864-8f08-20d3825273e1', name: 'Abdul Latheef CM', role: 'admin', email: 'abdullatheefcm@gmail.com', username: 'latheef.admin' },
  { user_id: '68aa5870-a6d0-4183-8525-71c5a4fac82b', name: 'Mythree Hostel Staff', role: 'staff', email: 'mythreehostel@gmail.com', username: 'mythree.staff' },
]

// Helper to safely read from localStorage
function getStoredState() {
  try {
    // Clean up legacy demo storage keys to ensure clean reset applies everywhere
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem('mythree_hostel_state_v9')
      localStorage.removeItem('mythree_hostel_state_v8')
      localStorage.removeItem('mythree_hostel_state_v7')
      localStorage.removeItem('mythree_hostel_state_v6')
      localStorage.removeItem('mythree_hostel_state')
      localStorage.removeItem('mythree_auth_users_v2')
      localStorage.removeItem('mythree_auth_users')
    }
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
  checkoutReceipts: CheckoutReceipt[]
  checkoutRentRule: 'per_day' | 'full_month'
  setCheckoutRentRule: (rule: 'per_day' | 'full_month') => void
  // Attendance
  attendanceLogs: AttendanceMovement[]
  attendanceStats: { totalResidents: number; insideHostel: number; outsideHostel: number }
  recordAttendanceMovement: (
    residentId: string,
    direction: 'IN' | 'OUT',
    note?: string,
    recordedBy?: string,
    options?: { residentName?: string; roomNo?: string; bedLabel?: string }
  ) => AttendanceMovement
  getResidentAttendanceStatus: (residentId: string) => { status: 'IN' | 'OUT'; lastTime: string; note?: string }
  // Computed
  dashboardStats: DashboardStats
  publicRoomOptions: PublicRoomOption[]
  rentDueList: RentDueView[]
  // Application actions
  addApplication: (
    app: Omit<Application, 'id' | 'ref_no' | 'submitted_at' | 'status' | 'reviewed_by' | 'review_note'>,
    submission: ApplicationSubmission,
    uploads: ApplicationUpload[]
  ) => Promise<AddApplicationResult>
  refreshApplications: () => Promise<void>
  updateApplicationStatus: (id: string, status: ApplicationStatus, note?: string) => void
  updateApplicationDetails: (id: string, details: Partial<Application>) => void
  // Bed allocation & checkout
  allocateBed: (
    applicationId: string,
    bedId: string,
    checkInDate: string,
    depositAmount: number,
    monthlyRent?: number,
    advanceReceived?: boolean,
    advanceAccountId?: string
  ) => void
  checkOutResident: (residentId: string, checkOutDate: string) => void
  vacateResident: (params: VacateResidentParams) => { vacated: VacatedResident; receipt: CheckoutReceipt }
  resetResidentPin: (residentId: string, newPin?: string) => string
  updateBedStatus: (bedId: string, status: BedStatus) => void
  // Payments
  addPayment: (payment: Omit<Payment, 'id' | 'receipt_no'>) => Payment
  // Expenses
  addExpense: (expense: Omit<Expense, 'id' | 'status' | 'approved_by'>) => Expense
  updateExpenseStatus: (id: string, status: 'approved' | 'rejected') => void
  // Cash
  topUpCash: (targetAccountId: string, amount: number, sourceAccountId?: string, note?: string) => void
  recordCashCount: (accountId: string, countedAmount: number, note?: string) => void
  // Store
  addProduct: (product: Omit<Product, 'id'>) => Product
  updateProduct: (id: string, changes: Partial<Product>) => void
  addVendor: (vendor: { name: string; phone?: string }) => Vendor
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
  const [staffList, setStaffList] = useState<StaffProfile[]>(() => {
    const rawList = stored?.staffList || initStaff
    return syncStaffListWithAuthStore(rawList)
  })
  const [vacatedResidents, setVacatedResidents] = useState<VacatedResident[]>(stored?.vacatedResidents || initVacatedResidents)
  const [checkoutReceipts, setCheckoutReceipts] = useState<CheckoutReceipt[]>(stored?.checkoutReceipts || initCheckoutReceipts)
  const [checkoutRentRule, setCheckoutRentRule] = useState<'per_day' | 'full_month'>(stored?.checkoutRentRule || 'per_day')
  const [attendanceLogs, setAttendanceLogs] = useState<AttendanceMovement[]>(stored?.attendanceLogs || initAttendanceLogs)
  const [acRoomsState, setAcRooms] = useState<Set<string>>(
    stored?.acRooms ? new Set(stored.acRooms) : acRoomIds
  )
  const [vendors, setVendors] = useState<Vendor[]>(stored?.vendors || initVendors)

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
        checkoutReceipts,
        checkoutRentRule,
        attendanceLogs,
        acRooms: Array.from(acRoomsState),
        vendors,
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(stateToPersist))
    } catch (err) {
      console.warn('Failed to save to localStorage:', err)
    }
  }, [
    roomTypes, rooms, beds, applications, residents, payments, expenses,
    cashAccounts, cashTransactions, products, sales, stockMovements,
    stockPurchases, stockCounts, staffList, vacatedResidents, checkoutReceipts,
    checkoutRentRule, attendanceLogs, acRoomsState
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
          if (fresh.checkoutReceipts) setCheckoutReceipts(fresh.checkoutReceipts)
          if (fresh.checkoutRentRule) setCheckoutRentRule(fresh.checkoutRentRule)
          if (fresh.attendanceLogs) setAttendanceLogs(fresh.attendanceLogs)
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
          { data: remoteReceipts },
          { data: remoteRooms },
          { data: remoteBeds },
        ] = await Promise.all([
          supabase.from('applications').select('*, documents(*)').order('submitted_at', { ascending: false }),
          supabase.from('residents').select('*, application:applications(*), bed:beds(*, room:rooms(*))'),
          supabase.from('payments').select('*'),
          supabase.from('products').select('*'),
          supabase.from('vacated_residents').select('*'),
          supabase.from('checkout_receipts').select('*'),
          supabase.from('rooms').select('*'),
          supabase.from('beds').select('*'),
        ])

        if (remoteRooms && remoteRooms.length > 0) {
          setRooms(remoteRooms as Room[])
        }

        if (remoteBeds && remoteBeds.length > 0) {
          setBeds(remoteBeds as Bed[])
        }

        if (remoteProducts && remoteProducts.length > 0) {
          const rps = remoteProducts as unknown as Product[]
          setProducts(prev => {
            const map = new Map(prev.map(p => [p.id, p]))
            for (const rp of rps) {
              const existing = map.get(rp.id)
              map.set(rp.id, {
                ...rp,
                stock_on_hand: existing?.stock_on_hand ?? 0
              })
            }
            return Array.from(map.values())
          })
        }

        if (remoteApps) {
          const rApps = remoteApps as unknown as Application[]
          setApplications(prev => {
            const map = new Map(rApps.map(a => [a.id, a]))
            for (const localApp of prev) {
              if (!map.has(localApp.id)) {
                map.set(localApp.id, localApp)
              } else {
                const remote = map.get(localApp.id)!
                map.set(localApp.id, {
                  ...localApp,
                  ...remote,
                  documents: (remote.documents && remote.documents.length > 0) ? remote.documents : (localApp.documents || [])
                })
              }
            }
            return Array.from(map.values()).sort((a, b) => new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime())
          })
        }

        if (remoteResidents && remoteResidents.length > 0) {
          const rRes = remoteResidents as unknown as Resident[]
          setResidents(prev => {
            const map = new Map(rRes.map(r => [r.id, r]))
            for (const localRes of prev) {
              if (!map.has(localRes.id)) {
                map.set(localRes.id, localRes)
              }
            }
            return Array.from(map.values())
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

        if (remoteReceipts && remoteReceipts.length > 0) {
          const rRec = remoteReceipts as unknown as CheckoutReceipt[]
          setCheckoutReceipts(prev => {
            const existingIds = new Set(prev.map(r => r.id))
            const newOnes = rRec.filter(r => !existingIds.has(r.id))
            return [...newOnes, ...prev]
          })
        }

        // Hydrate staff user accounts from shared Supabase database
        const syncedStaff = await syncAuthUsersFromSupabase()
        if (syncedStaff && syncedStaff.length > 0) {
          setStaffList(syncedStaff)
        }
      } catch (e) {
        console.warn('Supabase background load warning (using local state):', e)
      }
    }

    loadFromSupabase()
  }, [])

  // ── Realtime Listener for Applications (Admin Live Sync) ──
  useEffect(() => {
    if (DEMO_MODE) return

    const channel = supabase
      .channel('public:applications_live_sync')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'applications' },
        (payload) => {
          console.log('[Realtime:Applications] Change event received:', payload.eventType, payload)
          if (payload.eventType === 'INSERT') {
            const newApp = payload.new as Application
            setApplications(prev => {
              if (prev.some(a => a.id === newApp.id || a.ref_no === newApp.ref_no)) return prev
              return [newApp, ...prev]
            })
            // Fetch complete record with uploaded documents in background
            refreshApplications()
          } else if (payload.eventType === 'UPDATE') {
            const updatedApp = payload.new as Application
            setApplications(prev => prev.map(a => a.id === updatedApp.id ? { ...a, ...updatedApp } : a))
          } else if (payload.eventType === 'DELETE') {
            setApplications(prev => prev.filter(a => a.id !== (payload.old as any).id))
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  // ── Attendance helpers & Live derived state ──
  const getResidentAttendanceStatus = useCallback((residentId: string) => {
    const lastMovement = attendanceLogs.find(m => m.resident_id === residentId)
    if (lastMovement) {
      return {
        status: lastMovement.direction,
        lastTime: lastMovement.time,
        note: lastMovement.note
      }
    }
    return {
      status: 'IN' as const,
      lastTime: 'Inside Hostel',
      note: 'Present in hostel'
    }
  }, [attendanceLogs])

  const attendanceStats = useMemo(() => {
    const activeResidents = residents.filter(r => r.status === 'active')
    let inside = 0
    let outside = 0

    for (const r of activeResidents) {
      const st = getResidentAttendanceStatus(r.id)
      if (st.status === 'OUT') {
        outside++
      } else {
        inside++
      }
    }

    return {
      totalResidents: activeResidents.length,
      insideHostel: inside,
      outsideHostel: outside
    }
  }, [residents, getResidentAttendanceStatus])

  const recordAttendanceMovement = useCallback((
    residentId: string,
    direction: 'IN' | 'OUT',
    note?: string,
    recordedBy?: string,
    options?: { residentName?: string; roomNo?: string; bedLabel?: string }
  ): AttendanceMovement => {
    const res = residents.find(r => r.id === residentId)
    const room = rooms.find(rm => rm.id === res?.bed?.room_id)
    const roomNo = options?.roomNo || room?.room_no || res?.bed?.room?.room_no || '—'
    const bedLabel = options?.bedLabel || res?.bed?.bed_label || 'A'
    const resName = options?.residentName || res?.application?.full_name || 'Resident'
    // M9: Display all dates and times in Asia/Kolkata
    const nowTime = new Date().toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    })

    const newMov: AttendanceMovement = {
      id: `mov-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      resident_id: residentId,
      resident_name: resName,
      room_no: roomNo,
      bed_label: bedLabel,
      direction,
      time: nowTime,
      note: note || (direction === 'IN' ? 'Normal return to hostel' : 'Stepped out from hostel'),
      recorded_by: recordedBy || 'Staff User'
    }

    setAttendanceLogs(prev => [newMov, ...prev])
    return newMov
  }, [residents, rooms])

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

    const roomMap = new Map(rooms.map(r => [r.id, r]))
    const twinType = roomTypes.find(rt => rt.name.toLowerCase().includes('twin') || rt.beds_per_room === 2)
    const singleType = roomTypes.find(rt => rt.name.toLowerCase().includes('single') || rt.beds_per_room === 1)
    const fourType = roomTypes.find(rt => rt.name.toLowerCase().includes('4') || rt.beds_per_room === 4)

    const twinVacant = beds.filter(b => {
      if (b.status !== 'available') return false
      const rm = roomMap.get(b.room_id)
      if (rm && twinType) return rm.room_type_id === twinType.id
      return rm ? (rm.floor === 2 || rm.room_no.startsWith('2')) : b.room_id.startsWith('room-2')
    }).length
    const singleVacant = beds.filter(b => {
      if (b.status !== 'available') return false
      const rm = roomMap.get(b.room_id)
      if (rm && singleType) return rm.room_type_id === singleType.id
      return rm ? (rm.floor === 3 || rm.room_no.startsWith('3')) : b.room_id.startsWith('room-3')
    }).length
    const fourVacant = beds.filter(b => {
      if (b.status !== 'available') return false
      const rm = roomMap.get(b.room_id)
      if (rm && fourType) return rm.room_type_id === fourType.id
      return rm ? (rm.floor !== 2 && rm.floor !== 3 && !rm.room_no.startsWith('2') && !rm.room_no.startsWith('3')) : (!b.room_id.startsWith('room-2') && !b.room_id.startsWith('room-3'))
    }).length

    return {
      total_beds: beds.length,
      occupied,
      vacant,
      reserved,
      maintenance,
      pending_applications: pendingApps,
      rent_due_this_month: totalRentDue,
      rent_collected_this_month: totalPaid,
      total_residents: activeResidents.length,
      inside_hostel: attendanceStats.insideHostel,
      outside_hostel: attendanceStats.outsideHostel,
      admissions_possible: [
        { category: 'Twin Sharing', count: twinVacant },
        { category: 'Single Room', count: singleVacant },
        { category: '4-Sharing', count: fourVacant },
      ]
    }
  }, [beds, rooms, roomTypes, applications, residents, payments, attendanceStats])

  const publicRoomOptions = useMemo<PublicRoomOption[]>(() => {
    const roomMap = new Map(rooms.map(r => [r.id, r]))
    const twinType = roomTypes.find(rt => rt.name.toLowerCase().includes('twin') || rt.beds_per_room === 2)
    const singleType = roomTypes.find(rt => rt.name.toLowerCase().includes('single') || rt.beds_per_room === 1)
    const fourType = roomTypes.find(rt => rt.name.toLowerCase().includes('4') || rt.beds_per_room === 4)

    return [
      {
        room_type: 'Twin Sharing · Non-AC',
        has_ac: false,
        rent_per_head: twinType?.rent_per_head || 8000,
        beds_available: beds.filter(b => {
          if (b.status !== 'available') return false
          const rm = roomMap.get(b.room_id)
          if (rm && twinType) return rm.room_type_id === twinType.id && !acRoomsState.has(rm.id) && !acRoomsState.has(`room-${rm.room_no}`)
          return rm ? (rm.floor === 2 || rm.room_no.startsWith('2')) : b.room_id.startsWith('room-2')
        }).length
      },
      {
        room_type: 'Twin Sharing · ❄️ AC (Rooms 217-219)',
        has_ac: true,
        rent_per_head: 13000,
        beds_available: beds.filter(b => {
          if (b.status !== 'available') return false
          const rm = roomMap.get(b.room_id)
          return rm ? (acRoomsState.has(rm.id) || acRoomsState.has(`room-${rm.room_no}`) || ['217', '218', '219'].includes(rm.room_no)) : false
        }).length
      },
      {
        room_type: 'Single Room · Non-AC',
        has_ac: false,
        rent_per_head: singleType?.rent_per_head || 10000,
        beds_available: beds.filter(b => {
          if (b.status !== 'available') return false
          const rm = roomMap.get(b.room_id)
          if (rm && singleType) return rm.room_type_id === singleType.id
          return rm ? (rm.floor === 3 || rm.room_no.startsWith('3')) : b.room_id.startsWith('room-3')
        }).length
      },
      {
        room_type: '4-Sharing · Non-AC',
        has_ac: false,
        rent_per_head: fourType?.rent_per_head || 7000,
        beds_available: beds.filter(b => {
          if (b.status !== 'available') return false
          const rm = roomMap.get(b.room_id)
          if (rm && fourType) return rm.room_type_id === fourType.id
          return rm ? (rm.floor !== 2 && rm.floor !== 3 && !rm.room_no.startsWith('2') && !rm.room_no.startsWith('3')) : (!b.room_id.startsWith('room-2') && !b.room_id.startsWith('room-3'))
        }).length
      },
    ].filter(o => o.beds_available > 0)
  }, [beds, rooms, roomTypes, acRoomsState])

  const rentDueList = useMemo<RentDueView[]>(() => {
    const currentMonth = new Date().toISOString().slice(0, 7)
    return residents.filter(r => r.status === 'active').map(r => {
      const paid = payments.filter(p => p.resident_id === r.id && p.period_month === currentMonth).reduce((s, p) => s + p.amount, 0)
      const storeCreditDues = sales
        .filter(s => s.resident_id === r.id && s.payment_mode === 'on_account')
        .reduce((s, sl) => s + sl.total, 0)
      const room = rooms.find(rm => rm.id === r.bed?.room_id)
      const rentBalance = Math.max(0, r.monthly_rent - paid)
      return {
        resident_id: r.id,
        resident_name: r.application?.full_name || 'Unknown',
        room_no: room?.room_no || r.bed?.room?.room_no || '—',
        bed_label: r.bed?.bed_label || '—',
        period_month: currentMonth,
        rent_due: r.monthly_rent,
        paid,
        balance: rentBalance + storeCreditDues,
        store_dues: storeCreditDues,
        phone: r.application?.phone || '',
      }
    })
  }, [residents, payments, sales, rooms])

  // ── Application actions ──
  // Public QR form submission. Resolves only once the application row is saved, so an
  // applicant never sees a success page for an application staff will never receive.
  // `submission` (id + reference) is created once per form session: retrying after a lost
  // response re-sends the same id, and the database's primary key stops a duplicate.
  const addApplication = useCallback(async (
    app: Omit<Application, 'id' | 'ref_no' | 'submitted_at' | 'status' | 'reviewed_by' | 'review_note'>,
    submission: ApplicationSubmission,
    uploads: ApplicationUpload[]
  ): Promise<AddApplicationResult> => {
    // Map room type ID to Supabase UUID if needed
    let supaRoomTypeId: string | null = null
    if (app.preferred_room_type_id) {
      if (app.preferred_room_type_id === 'rt-1' || app.preferred_room_type_id.includes('twin')) {
        supaRoomTypeId = '11111111-1111-1111-1111-111111111111'
      } else if (app.preferred_room_type_id === 'rt-2' || app.preferred_room_type_id.includes('single')) {
        supaRoomTypeId = '22222222-2222-2222-2222-222222222222'
      } else if (app.preferred_room_type_id === 'rt-3' || app.preferred_room_type_id.includes('4')) {
        supaRoomTypeId = '33333333-3333-3333-3333-333333333333'
      } else if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(app.preferred_room_type_id)) {
        supaRoomTypeId = app.preferred_room_type_id
      }
    }

    const submittedAt = new Date().toISOString()
    let refNo = submission.refNo
    let documentsSaved = true
    let savedDocuments: ApplicationDocument[] = []

    if (!DEMO_MODE) {
      const row = {
        id: submission.id,
        full_name: app.full_name,
        dob: app.dob,
        phone: app.phone,
        email: app.email || null,
        permanent_address: app.permanent_address,
        occupation: app.occupation,
        institution_or_employer: app.institution_or_employer,
        id_proof_type: app.id_proof_type,
        id_proof_no: app.id_proof_no,
        emergency_name: app.emergency_name,
        emergency_relation: app.emergency_relation,
        emergency_phone: app.emergency_phone,
        preferred_room_type_id: supaRoomTypeId,
        preferred_ac: app.preferred_ac || 'any',
        status: 'submitted',
        submitted_at: submittedAt
      }

      let saved = false
      for (let attempt = 0; attempt < 3 && !saved; attempt++) {
        const { error } = await (supabase as any).from('applications').insert([{ ...row, ref_no: refNo }])
        if (!error) {
          saved = true
        } else if (isUniqueViolation(error) && isApplicationPrimaryKeyConflict(error)) {
          // Same submission id already stored: an earlier attempt was saved but its response was lost.
          saved = true
        } else if (isUniqueViolation(error)) {
          // Reference number already taken by another application: pick a new one and retry.
          refNo = generateApplicationRefNo()
        } else {
          console.error('[PublicAdmission] Application not saved:', error)
          throw new Error('APPLICATION_NOT_SAVED')
        }
      }
      if (!saved) throw new Error('APPLICATION_NOT_SAVED')

      if (uploads.length > 0) {
        const documents = await saveApplicationDocuments(submission.id, uploads)
        documentsSaved = documents !== null
        savedDocuments = documents ?? []
      }
    }

    const newApp: Application = {
      ...app,
      id: submission.id,
      ref_no: refNo,
      submitted_at: submittedAt,
      status: 'submitted',
      reviewed_by: null,
      review_note: null,
      documents: savedDocuments
    }
    // Staff devices receive the application from the database (realtime and polling).
    // Only demo mode keeps it locally, so applicants' own phones don't store it.
    if (DEMO_MODE) {
      setApplications(prev => prev.some(a => a.id === newApp.id) ? prev : [newApp, ...prev])
    }

    return { application: newApp, documentsSaved }
  }, [])

  const refreshApplications = useCallback(async () => {
    if (DEMO_MODE) return
    try {
      const { data, error } = await supabase
        .from('applications')
        .select('*, documents(*)')
        .order('submitted_at', { ascending: false })
      if (!error && data) {
        setApplications(prev => {
          const map = new Map(prev.map(a => [a.id, a]))
          data.forEach((app: any) => {
            const existing = map.get(app.id)
            map.set(app.id, {
              ...existing,
              ...app,
              documents: (app.documents && app.documents.length > 0) ? app.documents : (existing?.documents || [])
            })
          })
          return Array.from(map.values()).sort((a, b) => new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime())
        })
      } else if (error) {
        console.error('[AdminDashboard] Applications fetch error:', error)
      }
    } catch (err) {
      console.error('[AdminDashboard] Failed to refresh applications:', err)
    }
  }, [])

  const updateApplicationStatus = useCallback((id: string, status: ApplicationStatus, note?: string) => {
    setApplications(prev => prev.map(a => a.id === id ? { ...a, status, review_note: note || a.review_note, reviewed_by: 'demo-staff-1' } : a))

    if (!DEMO_MODE) {
      (supabase as any).from('applications').update({ status, review_note: note }).eq('id', id).then(({ error }: any) => {
        if (error) {
          console.error('[AdminDashboard] Supabase application status update error:', error)
        } else {
          console.log(`[AdminDashboard] Application ${id} status updated to ${status}`)
        }
      })
    }
  }, [])

  const updateApplicationDetails = useCallback((id: string, details: Partial<Application>) => {
    setApplications(prev => prev.map(a => a.id === id ? { ...a, ...details } : a))

    if (!DEMO_MODE) {
      ;(supabase as any).from('applications').update(details).eq('id', id).then(({ error }: any) => {
        if (error) console.warn('Supabase application details update warning:', error.message)
      })
    }
  }, [])

  // ── Bed allocation (influences Bed, Resident, Application & Dashboard) ──
  const allocateBed = useCallback((
    applicationId: string,
    bedId: string,
    checkInDate: string,
    depositAmount: number,
    monthlyRent?: number,
    advanceReceived: boolean = true,
    advanceAccountId: string = 'ca-3'
  ) => {
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

    const rentToCharge = monthlyRent || rt?.rent_per_head || 8000

    // Create resident
    const residentUuid = (typeof crypto !== 'undefined' && crypto.randomUUID) 
      ? crypto.randomUUID() 
      : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
          const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
          return v.toString(16);
        })

    const newResident: Resident = {
      id: residentUuid,
      application_id: applicationId,
      bed_id: bedId,
      check_in_date: checkInDate,
      check_out_date: null,
      monthly_rent: rentToCharge,
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

    // Record new admission in attendance (L10: show resident name and room)
    recordAttendanceMovement(
      newResident.id,
      'IN',
      `Newly admitted resident check-in (Room ${room?.room_no || '—'} · Bed ${bed.bed_label})`,
      'Staff User',
      {
        residentName: app.full_name,
        roomNo: room?.room_no || '—',
        bedLabel: bed.bed_label
      }
    )

    // Update application status
    setApplications(prev => prev.map(a => a.id === applicationId ? { ...a, status: 'approved' as ApplicationStatus, review_note: 'Approved and bed allocated', reviewed_by: 'demo-staff-1' } : a))

    // Advance received -> post cash IN transaction to Cash Book
    if (advanceReceived && depositAmount > 0) {
      const targetAccId = advanceAccountId || 'ca-3'
      const advanceTxn: CashTransaction = {
        id: `ct-adv-${Date.now()}`,
        account_id: targetAccId,
        txn_date: checkInDate,
        direction: 'in',
        amount: depositAmount,
        source: 'adjustment',
        source_id: newResident.id,
        note: `${app.full_name} - Advance security deposit received (Room ${room?.room_no || '—'} · Bed ${bed.bed_label})`,
        recorded_by: 'Staff User'
      }

      setCashTransactions(prev => [advanceTxn, ...prev])
      setCashAccounts(prev => prev.map(acc => {
        if (acc.id === targetAccId) {
          return { ...acc, balance: (acc.balance || 0) + depositAmount }
        }
        return acc
      }))

      if (!DEMO_MODE) {
        ;(supabase as any).from('cash_transactions').insert([advanceTxn]).then()
        const targetAcc = cashAccounts.find(a => a.id === targetAccId)
        if (targetAcc) {
          const finalBal = (targetAcc.balance || 0) + depositAmount;
          ;(supabase as any).from('cash_accounts').update({ balance: finalBal }).eq('id', targetAccId).then()
        }
      }
    }

    if (!DEMO_MODE) {
      ;(supabase as any).from('beds').update({ status: 'occupied' }).eq('id', bedId).then().catch(() => {})
      const { application: _app, bed: _bed, ...dbResident } = newResident
      ;(supabase as any).from('residents').insert([{
        id: dbResident.id,
        application_id: dbResident.application_id,
        bed_id: dbResident.bed_id,
        check_in_date: dbResident.check_in_date,
        monthly_rent: dbResident.monthly_rent,
        deposit_amount: dbResident.deposit_amount,
        status: dbResident.status,
        pin: dbResident.pin,
        pin_active: dbResident.pin_active
      }]).then().catch((e: any) => console.warn('[Supabase] resident insert:', e?.message))
      ;(supabase as any).from('applications').update({ status: 'approved', review_note: 'Approved and bed allocated' }).eq('id', applicationId).then().catch(() => {})
    }
  }, [applications, beds, rooms, roomTypes, residents, cashAccounts])

  // ── Checkout (frees Bed and moves Resident to Checked Out) ──
  const checkOutResident = useCallback((residentId: string, checkOutDate: string) => {
    const resident = residents.find(r => r.id === residentId)
    if (!resident) return

    // Free the bed
    setBeds(prev => prev.map(b => b.id === resident.bed_id ? { ...b, status: 'available' as BedStatus } : b))

    // Update resident
    setResidents(prev => prev.map(r => r.id === residentId ? { ...r, status: 'checked_out' as const, check_out_date: checkOutDate } : r))

    if (!DEMO_MODE) {
      ;(supabase as any).from('beds').update({ status: 'available' }).eq('id', resident.bed_id).then().catch(() => {})
      ;(supabase as any).from('residents').update({ status: 'checked_out', check_out_date: checkOutDate }).eq('id', residentId).then().catch(() => {})
    }
  }, [residents])

  // ── Vacate Resident (Full Phase 2 & Phase 3 Checkout Settlement) ──
  const vacateResident = useCallback((params: VacateResidentParams): { vacated: VacatedResident; receipt: CheckoutReceipt } => {
    const resident = residents.find(r => r.id === params.residentId)
    if (!resident) {
      throw new Error(`Resident ${params.residentId} not found`)
    }

    const settlementAmt = Math.abs(Number(params.settlementAmount) || 0)
    const isRefund = params.settlementType === 'refund'

    // C6: Check overdraft on refund
    if (isRefund && settlementAmt > 0 && params.accountId) {
      const targetAcc = cashAccounts.find(a => a.id === params.accountId)
      const currentBal = targetAcc?.balance || 0
      if (settlementAmt > currentBal) {
        throw new Error(`Insufficient funds in ${targetAcc?.name || 'Account'} to process refund. Balance: ₹${currentBal}, Refund: ₹${settlementAmt}. Please top up the account first.`)
      }
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

    // 3. Generate sequential receipt number
    const receiptSeq = (checkoutReceipts.length + 1).toString().padStart(4, '0')
    const receiptNo = `CKR-2026-${receiptSeq}`

    const advanceStatus = params.advanceStatus || (isRefund ? 'Returned' : 'Adjusted')

    // 4. Create departure record
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
      receipt_no: receiptNo,
      advance_status: advanceStatus,
      payment_mode: params.paymentMode || 'cash',
      rent_breakdown: params.rentBreakdown || [],
      deductions_breakdown: params.deductionsBreakdown || [],
      processed_by: params.processedBy || 'Admin User',
      created_at: new Date().toISOString()
    }
    setVacatedResidents(prev => [newDeparture, ...prev])

    // Record checkout movement in attendance
    recordAttendanceMovement(
      resident.id,
      'OUT',
      `Vacated hostel - ${params.reason || 'Checkout settlement completed'}`,
      params.processedBy || 'Admin User'
    )

    // 5. Create Checkout Receipt record
    const newReceipt: CheckoutReceipt = {
      id: `ckr-${Date.now()}`,
      receipt_no: receiptNo,
      vacated_id: newDeparture.id,
      resident_id: resident.id,
      resident_name: residentName,
      phone: resident.application?.phone || '—',
      room_no: roomNo,
      bed_label: bedLabel,
      admission_date: resident.check_in_date,
      checkout_date: params.vacateDate,
      advance_amount: Number(params.depositAmount) || 0,
      pending_rent_deducted: Number(params.pendingDues) || 0,
      other_deductions: Number(params.deductions) || 0,
      final_refund_amount: settlementAmt,
      settlement_type: params.settlementType,
      amount_in_words: numberToWordsINR(settlementAmt),
      payment_mode: params.paymentMode || 'cash',
      account_id: params.accountId || null,
      rent_breakdown: params.rentBreakdown || [],
      deductions_breakdown: params.deductionsBreakdown || [],
      notes: params.notes || null,
      issued_by: params.processedBy || 'Admin User',
      created_at: new Date().toISOString()
    }
    setCheckoutReceipts(prev => [newReceipt, ...prev])

    // 6. Post automatically to Cash Book as a transaction
    // "with the resident name and 'Checkout settlement'"
    if (settlementAmt > 0 && params.accountId) {
      const direction: CashDirection = isRefund ? 'out' : 'in'
      const note = `${residentName} - Checkout settlement`

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

    // 7. Remote Supabase sync
    if (!DEMO_MODE) {
      ;(supabase as any).from('beds').update({ status: 'available' }).eq('id', resident.bed_id).then().catch(() => {})
      ;(supabase as any).from('residents').update({
        status: 'vacated',
        check_out_date: params.vacateDate,
        pin_active: false
      }).eq('id', resident.id).then().catch(() => {})
      const { rent_breakdown: _rb, deductions_breakdown: _db, ...dbDeparture } = newDeparture
      ;(supabase as any).from('vacated_residents').insert([dbDeparture]).then().catch(() => {})
      const { rent_breakdown: _rrb, deductions_breakdown: _ddb, ...dbReceipt } = newReceipt
      ;(supabase as any).from('checkout_receipts').insert([dbReceipt]).then().catch(() => {})
    }

    return { vacated: newDeparture, receipt: newReceipt }
  }, [residents, rooms, cashAccounts, checkoutReceipts])

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

  // ── Expenses (influences Petty Cash / Bank / UPI & Operating Expenses on Reports) ──
  const addExpense = useCallback((expense: Omit<Expense, 'id' | 'status' | 'approved_by'>): Expense => {
    // Resolve target account for debit
    let targetAccId = 'ca-1'
    if (expense.paid_from === 'bank') targetAccId = 'ca-4'
    else if (expense.paid_from === 'upi') targetAccId = 'ca-5'
    else if (expense.paid_from === 'petty_cash') targetAccId = 'ca-1'
    else {
      const match = cashAccounts.find(a => a.id === expense.paid_from || a.kind === expense.paid_from)
      if (match) targetAccId = match.id
    }

    const targetAccount = cashAccounts.find(a => a.id === targetAccId)
    const currentBalance = targetAccount?.balance || 0

    // C6: Overdraft check - prevent account from going below ₹0
    if (expense.amount > currentBalance) {
      throw new Error(`Insufficient funds in ${targetAccount?.name || 'Account'}. Current balance: ₹${currentBalance}, required: ₹${expense.amount}.`)
    }

    const newExpense: Expense = {
      ...expense,
      id: `exp-${Date.now()}`,
      status: 'approved', // M13: Immediately approved & debited without pending approval step
      approved_by: 'system',
    }
    setExpenses(prev => [newExpense, ...prev])

    // Debit target account immediately
    setCashAccounts(prev => prev.map(a => a.id === targetAccId ? { ...a, balance: (a.balance || 0) - expense.amount } : a))
    setCashTransactions(prev => [{
      id: `ct-${Date.now()}`, account_id: targetAccId, txn_date: expense.expense_date,
      direction: 'out' as const, amount: expense.amount, source: 'expense' as const,
      source_id: newExpense.id, note: expense.description, recorded_by: expense.recorded_by
    }, ...prev])

    if (!DEMO_MODE) {
      (supabase as any).from('expenses').insert([newExpense]).then()
      const finalBal = currentBalance - expense.amount
      ;(supabase as any).from('cash_accounts').update({ balance: finalBal }).eq('id', targetAccId).then().catch(() => {})
    }

    return newExpense
  }, [cashAccounts])

  const updateExpenseStatus = useCallback((id: string, status: 'approved' | 'rejected') => {
    setExpenses(prev => prev.map(e => e.id === id ? { ...e, status, approved_by: status === 'approved' ? 'demo-admin-1' : null } : e))
    if (!DEMO_MODE) {
      (supabase as any).from('expenses').update({ status }).eq('id', id).then()
    }
  }, [])

  // ── Cash Top-up & Account Transfer (H4) ──
  const topUpCash = useCallback((targetAccountId: string, amount: number, sourceAccountId?: string, note?: string) => {
    const target = cashAccounts.find(a => a.id === targetAccountId)
    const source = sourceAccountId ? cashAccounts.find(a => a.id === sourceAccountId) : null

    // If source account specified, ensure no overdraft on source account
    if (source && (source.balance || 0) < amount) {
      throw new Error(`Insufficient funds in ${source.name} (Balance: ₹${source.balance || 0}) to transfer ₹${amount}.`)
    }

    const today = new Date().toISOString().split('T')[0]
    const txns: CashTransaction[] = []

    // Debit source account if provided
    if (source) {
      setCashAccounts(prev => prev.map(a => {
        if (a.id === source.id) return { ...a, balance: (a.balance || 0) - amount }
        if (a.id === targetAccountId) return { ...a, balance: (a.balance || 0) + amount }
        return a
      }))

      const debitTxn: CashTransaction = {
        id: `ct-transfer-out-${Date.now()}`,
        account_id: source.id,
        txn_date: today,
        direction: 'out' as const,
        amount,
        source: 'top_up' as const,
        source_id: null,
        note: note ? `Transfer to ${target?.name}: ${note}` : `Transfer to ${target?.name}`,
        recorded_by: 'Staff User'
      }
      txns.push(debitTxn)
    } else {
      setCashAccounts(prev => prev.map(a => a.id === targetAccountId ? { ...a, balance: (a.balance || 0) + amount } : a))
    }

    // Credit target account
    const creditTxn: CashTransaction = {
      id: `ct-topup-in-${Date.now()}`,
      account_id: targetAccountId,
      txn_date: today,
      direction: 'in' as const,
      amount,
      source: 'top_up' as const,
      source_id: null,
      note: note ? (source ? `Transfer from ${source.name}: ${note}` : note) : (source ? `Transfer from ${source.name}` : `Top-up for ${target?.name || 'Cash Account'}`),
      recorded_by: 'Staff User'
    }
    txns.push(creditTxn)

    setCashTransactions(prev => [...txns, ...prev])

    if (!DEMO_MODE) {
      ;(supabase as any).from('cash_transactions').insert(txns).then().catch(() => {})
      if (source) {
        ;(supabase as any).from('cash_accounts').update({ balance: (source.balance || 0) - amount }).eq('id', source.id).then().catch(() => {})
      }
      ;(supabase as any).from('cash_accounts').update({ balance: (target?.balance || 0) + amount }).eq('id', targetAccountId).then().catch(() => {})
    }
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

  // L14: Simple vendor management
  const addVendor = useCallback((vendorData: { name: string; phone?: string }): Vendor => {
    const newV: Vendor = {
      id: `ven-${Date.now()}`,
      name: vendorData.name,
      phone: vendorData.phone || null,
      default_category_id: null,
    }
    setVendors(prev => [...prev, newV])
    return newV
  }, [])

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
    const total = items.reduce((s, i) => s + i.qty * i.unitCost, 0)

    // C6: Overdraft check on purchase
    let targetAccId = 'ca-1'
    if (paidFrom === 'bank') targetAccId = 'ca-4'
    else if (paidFrom === 'upi') targetAccId = 'ca-5'
    else if (paidFrom === 'petty_cash') targetAccId = 'ca-1'
    else {
      const match = cashAccounts.find(a => a.id === paidFrom || a.kind === paidFrom)
      if (match) targetAccId = match.id
    }

    const targetAccount = cashAccounts.find(a => a.id === targetAccId)
    const currentBalance = targetAccount?.balance || 0

    if (total > currentBalance) {
      throw new Error(`Insufficient funds in ${targetAccount?.name || 'Account'} to record purchase. Balance: ₹${currentBalance}, required: ₹${total}.`)
    }

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
      vendor: vendors.find(v => v.id === vendorId),
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
    upsertAuthUser(staff)
    setStaffList(prev => [...prev.filter(s => s.user_id !== staff.user_id), staff])
  }, [])

  const updateStaff = useCallback((userId: string, changes: Partial<StaffProfile>) => {
    setStaffList(prev => {
      const existing = prev.find(s => s.user_id === userId)
      if (existing) {
        const merged: StaffProfile = { ...existing, ...changes }
        upsertAuthUser(merged)
        return prev.map(s => s.user_id === userId ? merged : s)
      }
      return prev
    })
  }, [])

  const removeStaff = useCallback((userId: string) => {
    deleteAuthUser(userId)
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
      checkoutReceipts,
      checkoutRentRule,
      setCheckoutRentRule,
      attendanceLogs,
      attendanceStats,
      recordAttendanceMovement,
      getResidentAttendanceStatus,
      dashboardStats,
      publicRoomOptions,
      rentDueList,
      addApplication,
      refreshApplications,
      updateApplicationStatus,
      updateApplicationDetails,
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
      addVendor,
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
