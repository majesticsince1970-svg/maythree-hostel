import { useState, useMemo } from 'react'
import { useDemoData } from '@/contexts/DemoDataContext'
import { useAuth } from '@/contexts/AuthContext'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { Dialog, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { useToast } from '@/components/ui/toast'
import { formatCurrency, formatDate } from '@/lib/utils'
import { CheckoutReceiptModal } from '@/components/CheckoutReceiptModal'
import type { VacatedResident, SettlementType, RentBreakdownItem, DeductionItem, CheckoutReceipt } from '@/types/database'
import {
  UserMinus, CheckCircle2, AlertTriangle, ArrowDownRight, ArrowUpRight,
  Download, Search, ShieldCheck, User, Calendar, RefreshCw, KeyRound,
  FileSpreadsheet, Filter, Check, Clock, Building2, Banknote, Plus, Trash2,
  Printer, DollarSign, Settings, ReceiptText
} from 'lucide-react'

const VACATE_REASONS = [
  'Course completed / Graduation',
  'Job transfer / Office relocation',
  'Moving to independent flat / PG',
  'Personal / Family reasons',
  'Medical / Health reasons',
  'Notice period completed',
  'Other'
]

const PRESET_DEDUCTIONS = [
  { label: 'Room Deep Clean', amount: 500 },
  { label: 'Lost Key / Lock Replacement', amount: 300 },
  { label: 'Wall Paint / Patch Damage', amount: 1000 },
  { label: 'Store / Canteen Unpaid Dues', amount: 450 },
]

export function VacateResidentManager() {
  const {
    residents,
    rentDueList,
    payments,
    cashAccounts,
    vacatedResidents,
    checkoutReceipts,
    checkoutRentRule,
    setCheckoutRentRule,
    vacateResident
  } = useDemoData()
  const { profile } = useAuth()
  const { addToast } = useToast()

  // Active / notice residents eligible to vacate
  const activeResidents = useMemo(() => {
    return residents.filter(r => r.status === 'active' || r.status === 'notice')
  }, [residents])

  // Form State
  const [selectedResidentId, setSelectedResidentId] = useState<string>('')
  const [vacateDate, setVacateDate] = useState<string>(() => new Date().toISOString().slice(0, 10))
  const [reason, setReason] = useState<string>(VACATE_REASONS[0])
  const [customReason, setCustomReason] = useState<string>('')
  const [notes, setNotes] = useState<string>('')
  const [paymentMode, setPaymentMode] = useState<'cash' | 'UPI' | 'bank'>('cash')
  const [paymentReference, setPaymentReference] = useState<string>('')
  const [selectedAccountId, setSelectedAccountId] = useState<string>('ca-3') // Default to Rent Cash

  // Local Rent Rule Override for this settlement
  const [localRentRule, setLocalRentRule] = useState<'per_day' | 'full_month'>(checkoutRentRule)

  // Itemized Deductions State
  const [deductionsList, setDeductionsList] = useState<DeductionItem[]>([])
  const [newDeductionDesc, setNewDeductionDesc] = useState('')
  const [newDeductionAmt, setNewDeductionAmt] = useState('')

  // Confirmation Modal & Active Receipt Modal
  const [isConfirmOpen, setIsConfirmOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [activeReceipt, setActiveReceipt] = useState<CheckoutReceipt | null>(null)
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false)

  // Departure Log Filters
  const [logSearch, setLogSearch] = useState('')
  const [dateFilter, setDateFilter] = useState<'all' | 'this_month' | 'last_month'>('all')

  // Selected Resident Details
  const selectedResident = useMemo(() => {
    return activeResidents.find(r => r.id === selectedResidentId)
  }, [activeResidents, selectedResidentId])

  const residentDueInfo = useMemo(() => {
    if (!selectedResidentId) return null
    return rentDueList.find(d => d.resident_id === selectedResidentId)
  }, [selectedResidentId, rentDueList])

  // Advance security deposit held at admission
  const depositHeld = selectedResident?.deposit_amount || 0
  const monthlyRent = selectedResident?.monthly_rent || 0

  // ── Automatic Rent Calculation Breakdown ──
  const rentBreakdown = useMemo<RentBreakdownItem[]>(() => {
    if (!selectedResident) return []

    const vDate = new Date(vacateDate)
    const vacYear = vDate.getFullYear()
    const vacMonth = vDate.getMonth() // 0-based
    const vacDay = vDate.getDate()

    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ]

    const items: RentBreakdownItem[] = []

    // 1. Previous Months Unpaid Rent (from resident due balance if any, minus current month share)
    const generalBalance = residentDueInfo ? Math.max(0, residentDueInfo.balance) : 0

    // Current month calculation
    const daysInCurrentMonth = new Date(vacYear, vacMonth + 1, 0).getDate()
    let currentMonthRentDue = monthlyRent
    let currentMonthLabel = `${monthNames[vacMonth]} ${vacYear}`

    if (localRentRule === 'per_day') {
      const dailyRate = monthlyRent / daysInCurrentMonth
      currentMonthRentDue = Math.round(dailyRate * Math.min(vacDay, daysInCurrentMonth))
      currentMonthLabel = `${monthNames[vacMonth]} ${vacYear} (${vacDay} days pro-rata)`
    } else {
      currentMonthLabel = `${monthNames[vacMonth]} ${vacYear} (Full Month)`
    }

    const currentMonthKey = `${vacYear}-${(vacMonth + 1).toString().padStart(2, '0')}`
    const residentPayments = payments.filter(p => p.resident_id === selectedResident.id)
    const paidForCurrentMonth = residentPayments
      .filter(p => p.period_month === currentMonthKey)
      .reduce((sum, p) => sum + p.amount, 0)

    const currentMonthBalance = Math.max(0, currentMonthRentDue - paidForCurrentMonth)

    // If previous dues exist, represent prior month balance
    const priorDues = Math.max(0, generalBalance - monthlyRent)
    if (priorDues > 0) {
      const prevMonthIdx = vacMonth === 0 ? 11 : vacMonth - 1
      const prevYear = vacMonth === 0 ? vacYear - 1 : vacYear
      items.push({
        month: `${prevYear}-${(prevMonthIdx + 1).toString().padStart(2, '0')}`,
        label: `${monthNames[prevMonthIdx]} ${prevYear} (Prior Balance)`,
        rent_due: priorDues,
        amount_paid: 0,
        balance: priorDues
      })
    }

    // Current month item
    items.push({
      month: currentMonthKey,
      label: currentMonthLabel,
      rent_due: currentMonthRentDue,
      amount_paid: paidForCurrentMonth,
      balance: currentMonthBalance,
      is_current_month: true,
      days_stayed: vacDay,
      total_days: daysInCurrentMonth
    })

    return items
  }, [selectedResident, vacateDate, localRentRule, residentDueInfo, monthlyRent, payments])

  const totalRentDue = useMemo(() => {
    return rentBreakdown.reduce((sum, item) => sum + item.balance, 0)
  }, [rentBreakdown])

  const totalOtherDeductions = useMemo(() => {
    return deductionsList.reduce((sum, item) => sum + item.amount, 0)
  }, [deductionsList])

  // Final Net Calculation: Advance - Pending Rent - Other Deductions
  const netSettlement = depositHeld - totalRentDue - totalOtherDeductions
  const settlementType: SettlementType = netSettlement > 0 ? 'refund' : netSettlement < 0 ? 'collected' : 'settled'
  const absoluteSettlementAmount = Math.abs(netSettlement)

  // Deduction helper methods
  const handleAddDeduction = () => {
    const amt = parseFloat(newDeductionAmt)
    if (!newDeductionDesc.trim() || isNaN(amt) || amt <= 0) {
      addToast({ type: 'error', title: 'Invalid input', description: 'Please enter a valid description and amount' })
      return
    }
    const newId = `ded-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`
    setDeductionsList(prev => [...prev, { id: newId, description: newDeductionDesc.trim(), amount: amt }])
    setNewDeductionDesc('')
    setNewDeductionAmt('')
  }

  const handleAddPresetDeduction = (preset: { label: string; amount: number }) => {
    const newId = `ded-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`
    setDeductionsList(prev => [...prev, { id: newId, description: preset.label, amount: preset.amount }])
  }

  const handleRemoveDeduction = (index: number) => {
    setDeductionsList(prev => prev.filter((_, idx) => idx !== index))
  }

  // Filtered Departure Log
  const filteredDepartureLog = useMemo(() => {
    return vacatedResidents.filter(item => {
      const q = logSearch.toLowerCase().trim()
      const matchesSearch = !q ||
        item.resident_name.toLowerCase().includes(q) ||
        item.room_no.toLowerCase().includes(q) ||
        item.processed_by.toLowerCase().includes(q) ||
        (item.receipt_no && item.receipt_no.toLowerCase().includes(q)) ||
        (item.reason && item.reason.toLowerCase().includes(q))

      if (!matchesSearch) return false

      if (dateFilter === 'all') return true
      const itemDate = new Date(item.vacate_date)
      const now = new Date()

      if (dateFilter === 'this_month') {
        return itemDate.getMonth() === now.getMonth() && itemDate.getFullYear() === now.getFullYear()
      }
      if (dateFilter === 'last_month') {
        const lastMonth = now.getMonth() === 0 ? 11 : now.getMonth() - 1
        const lastMonthYear = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear()
        return itemDate.getMonth() === lastMonth && itemDate.getFullYear() === lastMonthYear
      }
      return true
    })
  }, [vacatedResidents, logSearch, dateFilter])

  // Re-open receipt modal from departure log
  const handleViewReceipt = (receiptNo?: string | null, residentId?: string) => {
    if (!receiptNo && !residentId) return
    const match = checkoutReceipts.find(r => (receiptNo && r.receipt_no === receiptNo) || r.resident_id === residentId)
    if (match) {
      setActiveReceipt(match)
      setIsReceiptModalOpen(true)
    } else {
      addToast({ type: 'error', title: 'Receipt not found', description: 'Checkout receipt details not found for this entry' })
    }
  }

  // Permission Check
  // Staff with Accounts permission or Admin can confirm checkout refunds and collections
  const userRole = profile?.role || 'admin'
  const canSettleCheckout = userRole === 'admin' || userRole === 'staff'

  const handleExecuteVacate = async () => {
    if (!selectedResident) return
    if (!canSettleCheckout) {
      addToast({ type: 'error', title: 'Permission denied', description: 'You do not have accounts permission to process checkout settlements' })
      return
    }

    setIsSubmitting(true)
    try {
      const effectiveReason = reason === 'Other' && customReason.trim() ? customReason.trim() : reason
      const advanceStatus = settlementType === 'refund' ? 'Returned' : 'Adjusted'

      const result = vacateResident({
        residentId: selectedResident.id,
        vacateDate,
        reason: effectiveReason,
        notes: notes.trim() || undefined,
        pendingDues: totalRentDue,
        depositAmount: depositHeld,
        deductions: totalOtherDeductions,
        settlementAmount: absoluteSettlementAmount,
        settlementType,
        accountId: selectedAccountId,
        advanceStatus,
        paymentMode,
        rentBreakdown,
        deductionsBreakdown: deductionsList,
        processedBy: profile?.name || 'Staff'
      })

      addToast({
        type: 'success',
        title: 'Checkout completed',
        description: `Resident ${selectedResident.application?.full_name} vacated successfully. Bed freed & PIN deactivated.`
      })

      setIsConfirmOpen(false)
      setSelectedResidentId('')
      setNotes('')
      setCustomReason('')
      setDeductionsList([])

      // Immediately show the official Checkout Receipt
      if (result?.receipt) {
        setActiveReceipt(result.receipt)
        setIsReceiptModalOpen(true)
      }
    } catch (err: any) {
      addToast({ type: 'error', title: 'Checkout failed', description: err?.message || 'Failed to process checkout settlement' })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* ── SECTION 1: Vacate & Checkout Settlement Card ── */}
      <Card className="border shadow-sm">
        <CardHeader className="pb-3 border-b bg-muted/20">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                <UserMinus className="h-5 w-5 text-rose-600" />
                Vacate Resident & Advance Settlement
              </CardTitle>
              <CardDescription className="text-xs">
                Part 3 Checkout workflow: automatically reconcile security deposit, rent dues, and room deductions into Cash Book.
              </CardDescription>
            </div>
            {/* Rent rule setting indicator & toggle */}
            <div className="flex items-center gap-2 bg-background border px-3 py-1.5 rounded-lg text-xs">
              <Settings className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-muted-foreground">Checkout Rent Rule:</span>
              <button
                type="button"
                onClick={() => {
                  const nextRule = localRentRule === 'per_day' ? 'full_month' : 'per_day'
                  setLocalRentRule(nextRule)
                  setCheckoutRentRule(nextRule)
                  addToast({
                    type: 'info',
                    title: 'Rent rule updated',
                    description: `Checkout rent rule updated to: ${nextRule === 'per_day' ? 'Per-day pro-rata' : 'Full month'}`
                  })
                }}
                className="font-semibold text-primary underline hover:text-primary/80 transition-colors"
              >
                {localRentRule === 'per_day' ? 'Per-Day Pro-Rata (Stayed)' : 'Full Month Rent'}
              </button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-6 space-y-6">
          {/* Step 1: Resident & Vacate Details */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">
                Select Active Resident <span className="text-rose-500">*</span>
              </label>
              <select
                value={selectedResidentId}
                onChange={e => setSelectedResidentId(e.target.value)}
                className="w-full h-9 rounded-md border border-input bg-background px-3 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="">-- Choose Resident to Check Out --</option>
                {activeResidents.map(r => (
                  <option key={r.id} value={r.id}>
                    {r.application?.full_name} · Room {r.bed?.room?.room_no || '—'} (Bed {r.bed?.bed_label || 'A'}) · {formatCurrency(r.monthly_rent)}/mo
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">
                Vacate / Checkout Date <span className="text-rose-500">*</span>
              </label>
              <Input
                type="date"
                value={vacateDate}
                onChange={e => setVacateDate(e.target.value)}
                className="h-9 text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">
                Departure Reason
              </label>
              <select
                value={reason}
                onChange={e => setReason(e.target.value)}
                className="w-full h-9 rounded-md border border-input bg-background px-3 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                {VACATE_REASONS.map(r => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>
          </div>

          {reason === 'Other' && (
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">Specify Reason</label>
              <Input
                placeholder="Enter specific reason for vacating..."
                value={customReason}
                onChange={e => setCustomReason(e.target.value)}
                className="text-xs h-9"
              />
            </div>
          )}

          {/* Step 2: Selected Resident Profile Banner */}
          {selectedResident ? (
            <div className="rounded-xl border bg-card p-4 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b">
                <div className="flex items-center gap-3">
                  <div className="h-11 w-11 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm">
                    {selectedResident.application?.full_name?.charAt(0) || 'R'}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold text-sm">{selectedResident.application?.full_name}</h4>
                      <Badge variant="outline" className="text-[10px] uppercase font-mono">
                        {selectedResident.status}
                      </Badge>
                      {selectedResident.pin && (
                        <Badge variant="secondary" className="text-[10px] font-mono flex items-center gap-1">
                          <KeyRound className="h-3 w-3" /> PIN: {selectedResident.pin}
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Phone: {selectedResident.application?.phone || '—'} · Email: {selectedResident.application?.email || '—'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4 text-xs font-mono">
                  <div className="text-right">
                    <span className="text-muted-foreground block text-[10px] uppercase font-sans">Room & Bed</span>
                    <span className="font-bold">Room {selectedResident.bed?.room?.room_no} · Bed {selectedResident.bed?.bed_label}</span>
                  </div>
                  <div className="text-right border-l pl-4">
                    <span className="text-muted-foreground block text-[10px] uppercase font-sans">Admission Date</span>
                    <span className="font-medium">{formatDate(selectedResident.check_in_date)}</span>
                  </div>
                </div>
              </div>

              {/* 1. Advance Security Deposit Banner (At top as requested) */}
              <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="h-8 w-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold text-xs">
                    ₹
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-emerald-950 dark:text-emerald-200">
                      1. Advance (Security Deposit) Paid at Admission
                    </div>
                    <div className="text-[11px] text-emerald-800 dark:text-emerald-300">
                      Eligible for refund after deducting pending rent and damages
                    </div>
                  </div>
                </div>
                <div className="text-right sm:text-right">
                  <span className="text-lg font-black font-mono text-emerald-700 dark:text-emerald-300">
                    {formatCurrency(depositHeld)}
                  </span>
                </div>
              </div>

              {/* 2. Rent Check at Checkout */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5 text-primary" />
                    2. Rent Check at Checkout (Calculated Automatically)
                  </label>
                  <span className="text-[11px] text-muted-foreground font-mono">
                    Monthly Rent: {formatCurrency(monthlyRent)}
                  </span>
                </div>

                <div className="border rounded-xl overflow-hidden">
                  <Table>
                    <TableHeader className="bg-muted/40">
                      <TableRow className="text-[11px]">
                        <TableHead className="h-8 font-semibold">Month / Period</TableHead>
                        <TableHead className="h-8 text-right font-semibold">Rent Due</TableHead>
                        <TableHead className="h-8 text-right font-semibold">Amount Paid</TableHead>
                        <TableHead className="h-8 text-right font-semibold">Balance Due</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rentBreakdown.map((row, idx) => (
                        <TableRow key={idx} className="text-xs">
                          <TableCell className="py-2 font-medium">{row.label || row.month}</TableCell>
                          <TableCell className="py-2 text-right font-mono">{formatCurrency(row.rent_due)}</TableCell>
                          <TableCell className="py-2 text-right font-mono text-emerald-600">
                            {formatCurrency(row.amount_paid)}
                          </TableCell>
                          <TableCell className="py-2 text-right font-mono font-bold text-rose-600">
                            {formatCurrency(row.balance)}
                          </TableCell>
                        </TableRow>
                      ))}
                      <TableRow className="bg-muted/20 font-bold text-xs border-t">
                        <TableCell colSpan={3} className="py-2 text-right">
                          Total Unpaid Rent to Deduct:
                        </TableCell>
                        <TableCell className="py-2 text-right font-mono text-rose-600">
                          {formatCurrency(totalRentDue)}
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              </div>

              {/* 3. Other Deductions (Optional) */}
              <div className="space-y-3 pt-2 border-t">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                  <label className="text-xs font-bold flex items-center gap-1.5">
                    <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
                    3. Other Deductions (Damage, Cleaning, Store Dues)
                  </label>
                  <div className="flex flex-wrap items-center gap-1">
                    <span className="text-[11px] text-muted-foreground mr-1">Presets:</span>
                    {PRESET_DEDUCTIONS.map((p, idx) => (
                      <Button
                        key={idx}
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleAddPresetDeduction(p)}
                        className="text-[10px] h-6 px-2 py-0"
                      >
                        + {p.label} (₹{p.amount})
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Deductions List */}
                {deductionsList.length > 0 ? (
                  <div className="border rounded-xl overflow-hidden">
                    <Table>
                      <TableHeader className="bg-muted/40">
                        <TableRow className="text-[11px]">
                          <TableHead className="h-8">Description</TableHead>
                          <TableHead className="h-8 text-right">Amount</TableHead>
                          <TableHead className="h-8 w-12 text-center">Action</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {deductionsList.map((item, idx) => (
                          <TableRow key={idx} className="text-xs">
                            <TableCell className="py-1.5">{item.description}</TableCell>
                            <TableCell className="py-1.5 text-right font-mono text-rose-600 font-semibold">
                              {formatCurrency(item.amount)}
                            </TableCell>
                            <TableCell className="py-1.5 text-center">
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRemoveDeduction(idx)}
                                className="h-6 w-6 p-0 text-muted-foreground hover:text-rose-600"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                        <TableRow className="bg-muted/20 font-bold text-xs border-t">
                          <TableCell className="py-2 text-right">Total Other Deductions:</TableCell>
                          <TableCell className="py-2 text-right font-mono text-rose-600">
                            {formatCurrency(totalOtherDeductions)}
                          </TableCell>
                          <TableCell />
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <p className="text-[11px] text-muted-foreground italic">
                    No extra deductions added. Add any damages or canteen dues below if applicable.
                  </p>
                )}

                {/* Add Custom Deduction Row */}
                <div className="flex gap-2 items-center pt-1">
                  <Input
                    placeholder="Deduction description (e.g. Broken chair, Laundry)"
                    value={newDeductionDesc}
                    onChange={e => setNewDeductionDesc(e.target.value)}
                    className="text-xs h-8 flex-1"
                  />
                  <Input
                    type="number"
                    min="0"
                    placeholder="Amount (₹)"
                    value={newDeductionAmt}
                    onChange={e => setNewDeductionAmt(e.target.value)}
                    className="text-xs h-8 w-28 font-mono"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAddDeduction}
                    className="text-xs h-8 gap-1"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Add
                  </Button>
                </div>
              </div>

              {/* 4. Final Settlement Calculation Box */}
              <div className={`p-4 rounded-xl border-2 transition-all ${
                settlementType === 'refund'
                  ? 'border-emerald-500/40 bg-emerald-50/50 dark:bg-emerald-950/20'
                  : settlementType === 'collected'
                  ? 'border-rose-500/40 bg-rose-50/50 dark:bg-rose-950/20'
                  : 'border-blue-500/40 bg-blue-50/50 dark:bg-blue-950/20'
              }`}>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold uppercase tracking-wider">
                        4. Final Settlement Calculation
                      </span>
                      <Badge
                        variant={settlementType === 'refund' ? 'default' : settlementType === 'collected' ? 'destructive' : 'secondary'}
                        className="text-[10px]"
                      >
                        {settlementType === 'refund' && 'Refund to Resident'}
                        {settlementType === 'collected' && 'Payable by Resident'}
                        {settlementType === 'settled' && 'Nil Balance (Settled)'}
                      </Badge>
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      Advance ({formatCurrency(depositHeld)}) − Unpaid Rent ({formatCurrency(totalRentDue)}) − Deductions ({formatCurrency(totalOtherDeductions)})
                    </p>
                  </div>

                  <div className="text-left sm:text-right">
                    <span className="text-xs font-semibold block text-muted-foreground">
                      {settlementType === 'refund' ? 'Total Refund to Resident:' : 'Total Payable by Resident:'}
                    </span>
                    <span className={`text-2xl font-black font-mono ${
                      settlementType === 'refund' ? 'text-emerald-600' : 'text-rose-600'
                    }`}>
                      {formatCurrency(absoluteSettlementAmount)}
                    </span>
                  </div>
                </div>

                {/* Settlement Method & Cash Account */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-4 mt-3 border-t text-xs">
                  <div>
                    <label className="font-semibold text-muted-foreground block mb-1">
                      Payment Mode
                    </label>
                    <select
                      value={paymentMode}
                      onChange={e => setPaymentMode(e.target.value as any)}
                      className="w-full h-8 rounded-md border border-input bg-background px-2 text-xs"
                    >
                      <option value="cash">Cash</option>
                      <option value="UPI">UPI (GPay / PhonePe / Paytm)</option>
                      <option value="bank">Bank Transfer (NEFT/IMPS)</option>
                    </select>
                  </div>

                  <div>
                    <label className="font-semibold text-muted-foreground block mb-1">
                      Cash Account for Ledger
                    </label>
                    <select
                      value={selectedAccountId}
                      onChange={e => setSelectedAccountId(e.target.value)}
                      className="w-full h-8 rounded-md border border-input bg-background px-2 text-xs"
                    >
                      {cashAccounts.map(acc => (
                        <option key={acc.id} value={acc.id}>
                          {acc.name} ({formatCurrency(acc.balance || 0)})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="font-semibold text-muted-foreground block mb-1">
                      UPI / Transaction Ref #
                    </label>
                    <Input
                      placeholder={paymentMode === 'cash' ? 'Optional for cash' : 'UTR / Ref number'}
                      value={paymentReference}
                      onChange={e => setPaymentReference(e.target.value)}
                      className="h-8 text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* Staff Notes */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground">
                  Settlement & Checkout Remarks (Optional)
                </label>
                <Input
                  placeholder="e.g. Keys received, room inspected, cupboards empty and clean..."
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  className="text-xs h-9"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
                <div className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span>
                    Frees Bed #{selectedResident.bed?.bed_label}, deactivates PIN, records Cash Book entry, and generates official receipt.
                  </span>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedResidentId('')
                      setDeductionsList([])
                      setNotes('')
                    }}
                    className="text-xs flex-1 sm:flex-initial"
                  >
                    Reset
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => setIsConfirmOpen(true)}
                    variant={settlementType === 'refund' ? 'default' : 'destructive'}
                    className="text-xs flex-1 sm:flex-initial gap-1.5"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    Review & Complete Checkout
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="border border-dashed rounded-xl p-8 text-center text-muted-foreground text-xs space-y-1">
              <UserMinus className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
              <p className="font-medium">No resident selected</p>
              <p className="text-[11px]">Select a resident from the dropdown above to calculate checkout settlement</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── SECTION 2: Vacated Residents List (Departure Log) ── */}
      <Card className="border shadow-sm">
        <CardHeader className="pb-3 border-b bg-muted/20">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                <ReceiptText className="h-5 w-5 text-primary" />
                Vacated Residents (Departure Log)
              </CardTitle>
              <CardDescription className="text-xs">
                Historical record of all departures with advance settlements and reprintable checkout receipts.
              </CardDescription>
            </div>
            <Badge variant="outline" className="font-mono text-xs w-fit">
              {filteredDepartureLog.length} Records
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="pt-4 space-y-4">
          {/* Filters Bar */}
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by resident name, room, receipt #, or staff..."
                value={logSearch}
                onChange={e => setLogSearch(e.target.value)}
                className="pl-8 text-xs h-9"
              />
            </div>

            <div className="flex gap-2">
              <select
                value={dateFilter}
                onChange={e => setDateFilter(e.target.value as any)}
                className="h-9 rounded-md border border-input bg-background px-3 text-xs"
              >
                <option value="all">All Dates</option>
                <option value="this_month">This Month</option>
                <option value="last_month">Last Month</option>
              </select>
            </div>
          </div>

          {/* Table */}
          <div className="border rounded-xl overflow-hidden">
            <Table>
              <TableHeader className="bg-muted/40">
                <TableRow className="text-[11px]">
                  <TableHead className="h-8">Receipt #</TableHead>
                  <TableHead className="h-8">Resident Name</TableHead>
                  <TableHead className="h-8">Room / Bed</TableHead>
                  <TableHead className="h-8">Admission</TableHead>
                  <TableHead className="h-8">Vacate Date</TableHead>
                  <TableHead className="h-8 text-right">Settlement</TableHead>
                  <TableHead className="h-8">Status</TableHead>
                  <TableHead className="h-8">Processed By</TableHead>
                  <TableHead className="h-8 text-center">Receipt</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDepartureLog.length > 0 ? (
                  filteredDepartureLog.map(item => (
                    <TableRow key={item.id} className="text-xs hover:bg-muted/30">
                      <TableCell className="font-mono text-[11px] font-semibold text-primary">
                        {item.receipt_no || '—'}
                      </TableCell>
                      <TableCell className="font-medium">
                        <div>
                          <span>{item.resident_name}</span>
                          {item.reason && (
                            <span className="block text-[10px] text-muted-foreground italic">
                              {item.reason}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="font-mono">
                        Room {item.room_no} · {item.bed_label}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-[11px]">
                        {formatDate(item.admission_date)}
                      </TableCell>
                      <TableCell className="font-medium text-[11px]">
                        {formatDate(item.vacate_date)}
                      </TableCell>
                      <TableCell className="text-right font-mono font-bold">
                        <span className={item.settlement_type === 'refund' ? 'text-emerald-600' : 'text-rose-600'}>
                          {item.settlement_type === 'refund' ? '-' : '+'}
                          {formatCurrency(item.settlement_amount)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={item.settlement_type === 'refund' ? 'default' : item.settlement_type === 'collected' ? 'destructive' : 'secondary'}
                          className="text-[10px]"
                        >
                          {item.settlement_type === 'refund' ? 'Refunded' : item.settlement_type === 'collected' ? 'Collected' : 'Settled'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-[11px]">
                        {item.processed_by}
                      </TableCell>
                      <TableCell className="text-center">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleViewReceipt(item.receipt_no, item.resident_id)}
                          className="h-7 text-[11px] gap-1 px-2"
                        >
                          <Printer className="h-3 w-3" />
                          Receipt
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={9} className="h-24 text-center text-muted-foreground text-xs">
                      No vacated residents found matching filter.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* ── Confirmation Modal ── */}
      {selectedResident && (
        <Dialog open={isConfirmOpen} onClose={() => setIsConfirmOpen(false)}>
          <div className="space-y-4">
            <DialogHeader>
              <DialogTitle className="text-lg flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-600" />
                Confirm Checkout & Settlement
              </DialogTitle>
              <DialogDescription className="text-xs">
                Review the final settlement figures. Confirming will update the Cash Book, free the bed, deactivate the entrance PIN, and issue an official receipt.
              </DialogDescription>
            </DialogHeader>

            <div className="bg-muted/40 rounded-xl p-4 border space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Resident:</span>
                <span className="font-semibold">{selectedResident.application?.full_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Room & Bed:</span>
                <span className="font-mono">Room {selectedResident.bed?.room?.room_no} · Bed {selectedResident.bed?.bed_label}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Vacate Date:</span>
                <span className="font-medium">{formatDate(vacateDate)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Payment Mode:</span>
                <span className="font-medium uppercase">{paymentMode}</span>
              </div>

              <div className="border-t pt-2 space-y-1">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Advance Deposit:</span>
                  <span className="font-mono font-semibold">{formatCurrency(depositHeld)}</span>
                </div>
                <div className="flex justify-between text-rose-600">
                  <span>Less Unpaid Rent:</span>
                  <span className="font-mono">- {formatCurrency(totalRentDue)}</span>
                </div>
                <div className="flex justify-between text-rose-600">
                  <span>Less Other Deductions:</span>
                  <span className="font-mono">- {formatCurrency(totalOtherDeductions)}</span>
                </div>
                <div className="flex justify-between font-bold pt-2 border-t text-sm">
                  <span>Net Settlement:</span>
                  <span className={settlementType === 'refund' ? 'text-emerald-600' : 'text-rose-600'}>
                    {settlementType === 'refund' && `Refund ${formatCurrency(absoluteSettlementAmount)}`}
                    {settlementType === 'collected' && `Collect ${formatCurrency(absoluteSettlementAmount)}`}
                    {settlementType === 'settled' && '₹0 (Reconciled)'}
                  </span>
                </div>
              </div>
            </div>

            <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl space-y-1 text-xs text-amber-900 dark:text-amber-300">
              <p className="font-semibold flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4" />
                Actions performed on confirmation:
              </p>
              <ul className="list-disc list-inside space-y-0.5 text-[11px] text-muted-foreground">
                <li>Bed #{selectedResident.bed?.bed_label} status &rarr; <strong>Available</strong></li>
                <li>Resident status &rarr; <strong>Vacated</strong></li>
                <li>Entrance PIN &rarr; <strong>Deactivated</strong></li>
                <li>Cash Book entry posted: <strong>{settlementType === 'refund' ? 'Cash OUT' : 'Cash IN'} ({formatCurrency(absoluteSettlementAmount)})</strong></li>
                <li>Official Checkout Receipt generated with unique sequential number</li>
              </ul>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsConfirmOpen(false)}
                disabled={isSubmitting}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleExecuteVacate}
                disabled={isSubmitting}
                variant={settlementType === 'refund' ? 'default' : 'destructive'}
                className="text-xs gap-1.5"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Check className="h-3.5 w-3.5" />
                    Confirm & Complete Checkout
                  </>
                )}
              </Button>
            </div>
          </div>
        </Dialog>
      )}

      {/* ── Checkout Settlement Receipt Modal (Part 4) ── */}
      <CheckoutReceiptModal
        receipt={activeReceipt}
        open={isReceiptModalOpen}
        onClose={() => setIsReceiptModalOpen(false)}
      />
    </div>
  )
}
