import { useState, useMemo } from 'react'
import { useDemoData } from '@/contexts/DemoDataContext'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { Dialog, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { useToast } from '@/components/ui/toast'
import { formatCurrency, formatDate } from '@/lib/utils'
import type { VacatedResident, SettlementType } from '@/types/database'
import {
  UserMinus, CheckCircle2, AlertTriangle, ArrowDownRight, ArrowUpRight,
  Download, Search, ShieldCheck, User, Calendar, RefreshCw, KeyRound,
  FileSpreadsheet, Filter, Check, Clock, Building2, Banknote
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

export function VacateResidentManager() {
  const {
    residents,
    rentDueList,
    cashAccounts,
    vacatedResidents,
    vacateResident
  } = useDemoData()
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
  const [pendingDuesOverride, setPendingDuesOverride] = useState<string>('')
  const [deductions, setDeductions] = useState<string>('0')
  const [deductionReason, setDeductionReason] = useState<string>('')
  const [selectedAccountId, setSelectedAccountId] = useState<string>('ca-3') // Default to Rent Cash
  const [isConfirmOpen, setIsConfirmOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

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

  // Compute pending dues automatically
  const pendingDues = useMemo(() => {
    if (pendingDuesOverride !== '') {
      return Math.max(0, parseFloat(pendingDuesOverride) || 0)
    }
    if (residentDueInfo && residentDueInfo.balance > 0) {
      return residentDueInfo.balance
    }
    return 0
  }, [pendingDuesOverride, residentDueInfo])

  const depositHeld = selectedResident?.deposit_amount || 0
  const deductionAmount = Math.max(0, parseFloat(deductions) || 0)

  // Net Settlement Calculation: Deposit - Pending Dues - Deductions
  const netSettlement = depositHeld - pendingDues - deductionAmount
  const settlementType: SettlementType = netSettlement > 0 ? 'refund' : netSettlement < 0 ? 'collected' : 'settled'
  const absoluteSettlementAmount = Math.abs(netSettlement)

  // Filtered Departure Log
  const filteredDepartureLog = useMemo(() => {
    return vacatedResidents.filter(item => {
      // Search filter
      const q = logSearch.toLowerCase().trim()
      const matchesSearch = !q ||
        item.resident_name.toLowerCase().includes(q) ||
        item.room_no.toLowerCase().includes(q) ||
        item.processed_by.toLowerCase().includes(q) ||
        (item.reason && item.reason.toLowerCase().includes(q))

      // Date filter
      if (!matchesSearch) return false
      if (dateFilter === 'all') return true

      const vDate = new Date(item.vacate_date)
      const now = new Date()
      const currentYear = now.getFullYear()
      const currentMonth = now.getMonth()

      if (dateFilter === 'this_month') {
        return vDate.getFullYear() === currentYear && vDate.getMonth() === currentMonth
      }
      if (dateFilter === 'last_month') {
        const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1
        const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear
        return vDate.getFullYear() === lastMonthYear && vDate.getMonth() === lastMonth
      }
      return true
    })
  }, [vacatedResidents, logSearch, dateFilter])

  // Reset form when resident changes
  const handleSelectResident = (resId: string) => {
    setSelectedResidentId(resId)
    setPendingDuesOverride('')
    setDeductions('0')
    setDeductionReason('')
    setNotes('')
  }

  // Confirm and Execute Vacate
  const handleExecuteVacate = async () => {
    if (!selectedResident) return
    setIsSubmitting(true)

    try {
      const finalReason = reason === 'Other' && customReason ? customReason : reason
      const combinedNotes = [
        deductionReason ? `Deduction note: ${deductionReason}` : '',
        notes ? `Staff note: ${notes}` : ''
      ].filter(Boolean).join(' | ')

      const departure = vacateResident({
        residentId: selectedResident.id,
        vacateDate,
        reason: finalReason,
        notes: combinedNotes || undefined,
        pendingDues,
        depositAmount: depositHeld,
        deductions: deductionAmount,
        deductionReason: deductionReason || undefined,
        settlementAmount: absoluteSettlementAmount,
        settlementType,
        accountId: selectedAccountId,
        processedBy: 'Admin User'
      })

      addToast({
        type: 'success',
        title: 'Resident Vacated Successfully',
        description: `${departure.resident_name} checked out. Room ${departure.room_no} (Bed ${departure.bed_label}) is now available. Cash book updated.`
      })

      // Reset
      setIsConfirmOpen(false)
      setSelectedResidentId('')
      setPendingDuesOverride('')
      setDeductions('0')
      setDeductionReason('')
      setNotes('')
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Checkout Failed',
        description: err.message || 'An error occurred during checkout.'
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Export CSV
  const handleExportCsv = () => {
    if (filteredDepartureLog.length === 0) {
      addToast({ type: 'info', title: 'No Data', description: 'No departure records to export.' })
      return
    }

    const headers = [
      'Resident Name',
      'Room No',
      'Bed Label',
      'Admission Date',
      'Vacate Date',
      'Settlement Type',
      'Settlement Amount (INR)',
      'Security Deposit (INR)',
      'Pending Dues (INR)',
      'Deductions (INR)',
      'Reason',
      'Notes',
      'Processed By',
      'Recorded At'
    ]

    const csvRows = filteredDepartureLog.map(v => [
      `"${v.resident_name}"`,
      `"${v.room_no}"`,
      `"${v.bed_label}"`,
      `"${v.admission_date}"`,
      `"${v.vacate_date}"`,
      `"${v.settlement_type.toUpperCase()}"`,
      v.settlement_amount,
      v.deposit_amount,
      v.pending_dues,
      v.deductions,
      `"${(v.reason || '').replace(/"/g, '""')}"`,
      `"${(v.notes || '').replace(/"/g, '""')}"`,
      `"${v.processed_by}"`,
      `"${v.created_at}"`
    ])

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...csvRows.map(r => r.join(','))].join('\n')
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `vacated_residents_maythree_${new Date().toISOString().slice(0, 10)}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    addToast({
      type: 'success',
      title: 'Export Complete',
      description: `Exported ${filteredDepartureLog.length} departure records to CSV.`
    })
  }

  return (
    <div className="space-y-8">
      {/* ── Section 1: Vacate Resident Checkout Flow ── */}
      <Card className="border shadow-sm">
        <CardHeader className="bg-muted/20 border-b pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <UserMinus className="h-5 w-5 text-destructive" />
                Vacate Resident & Settlement
              </CardTitle>
              <CardDescription className="text-xs mt-1">
                Calculate deposit refund or dues settlement, free room inventory, deactivate door PIN, and post to Cash Book.
              </CardDescription>
            </div>
            <Badge variant="outline" className="self-start sm:self-auto text-xs px-2.5 py-1">
              Phase 2 Checkout System
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-6 space-y-6">
          {/* Step 1: Resident Selector */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-1 space-y-2">
              <label className="text-xs font-semibold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                <User className="h-3.5 w-3.5 text-primary" />
                1. Select Current Resident
              </label>
              <select
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                value={selectedResidentId}
                onChange={(e) => handleSelectResident(e.target.value)}
              >
                <option value="">-- Choose active resident --</option>
                {activeResidents.map(r => (
                  <option key={r.id} value={r.id}>
                    {r.application?.full_name} · Room {r.bed?.room?.room_no || '—'} (Bed {r.bed?.bed_label || 'A'})
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-muted-foreground">
                Showing {activeResidents.length} currently housed residents.
              </p>
            </div>

            {/* Resident Quick Profile Card */}
            <div className="md:col-span-2">
              {selectedResident ? (
                <div className="bg-muted/40 rounded-xl p-4 border flex flex-col sm:flex-row justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-base text-foreground">
                        {selectedResident.application?.full_name}
                      </span>
                      <Badge variant="secondary" className="text-[10px]">
                        {selectedResident.application?.occupation || 'Resident'}
                      </Badge>
                    </div>
                    <div className="text-xs text-muted-foreground flex flex-wrap gap-x-4 gap-y-1">
                      <span>Phone: <strong className="text-foreground">{selectedResident.application?.phone}</strong></span>
                      <span>Admission: <strong className="text-foreground">{formatDate(selectedResident.check_in_date)}</strong></span>
                      <span>Bed: <strong className="text-foreground">Room {selectedResident.bed?.room?.room_no} · Bed {selectedResident.bed?.bed_label}</strong></span>
                    </div>
                  </div>
                  <div className="flex sm:flex-col items-end justify-between sm:justify-center border-t sm:border-t-0 sm:border-l sm:pl-4 pt-2 sm:pt-0">
                    <span className="text-[11px] text-muted-foreground uppercase font-medium">Security Deposit</span>
                    <span className="text-base font-bold text-primary font-mono">
                      {formatCurrency(selectedResident.deposit_amount)}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="h-full min-h-[76px] rounded-xl border border-dashed flex items-center justify-center p-4 text-xs text-muted-foreground text-center">
                  Select a resident to inspect check-in dates, security deposit balance, and calculate settlement.
                </div>
              )}
            </div>
          </div>

          {/* Step 2: Form & Settlement Calculator (Only if resident selected) */}
          {selectedResident && (
            <div className="space-y-6 pt-4 border-t">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Vacate Details */}
                <div className="space-y-4">
                  <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5 text-primary" />
                    2. Vacate Details
                  </h4>
                  
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">Vacate Date</label>
                    <Input
                      type="date"
                      value={vacateDate}
                      onChange={(e) => setVacateDate(e.target.value)}
                      className="text-xs"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">Reason for Vacating</label>
                    <select
                      className="w-full rounded-lg border bg-background px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary"
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                    >
                      {VACATE_REASONS.map(r => (
                        <option key={r} value={r}>{r}</option>
                      ))}
                    </select>
                    {reason === 'Other' && (
                      <Input
                        placeholder="Specify reason..."
                        value={customReason}
                        onChange={(e) => setCustomReason(e.target.value)}
                        className="text-xs mt-1.5"
                      />
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">Settlement Account (Cash Book)</label>
                    <select
                      className="w-full rounded-lg border bg-background px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary"
                      value={selectedAccountId}
                      onChange={(e) => setSelectedAccountId(e.target.value)}
                    >
                      {cashAccounts.filter(a => a.is_active).map(acc => (
                        <option key={acc.id} value={acc.id}>
                          {acc.name} ({acc.kind.toUpperCase()}) — Balance: {formatCurrency(acc.balance || 0)}
                        </option>
                      ))}
                    </select>
                    <p className="text-[10px] text-muted-foreground">
                      Transaction will automatically post to this account ledger.
                    </p>
                  </div>
                </div>

                {/* Adjustments & Deductions */}
                <div className="space-y-4">
                  <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <Banknote className="h-3.5 w-3.5 text-primary" />
                    3. Dues & Deductions
                  </h4>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-medium text-muted-foreground">Pending Rent / Dues (₹)</label>
                      {residentDueInfo && (
                        <span className="text-[10px] text-muted-foreground">
                          Recorded: {formatCurrency(residentDueInfo.balance)}
                        </span>
                      )}
                    </div>
                    <Input
                      type="number"
                      min="0"
                      step="100"
                      value={pendingDuesOverride !== '' ? pendingDuesOverride : pendingDues}
                      onChange={(e) => setPendingDuesOverride(e.target.value)}
                      placeholder="0"
                      className="text-xs font-mono"
                    />
                    <p className="text-[10px] text-muted-foreground">
                      Subtracted from deposit return.
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">Deductions (Damages/Cleaning/Fine) (₹)</label>
                    <Input
                      type="number"
                      min="0"
                      step="50"
                      value={deductions}
                      onChange={(e) => setDeductions(e.target.value)}
                      placeholder="0"
                      className="text-xs font-mono"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">Deduction Reason (Optional)</label>
                    <Input
                      type="text"
                      value={deductionReason}
                      onChange={(e) => setDeductionReason(e.target.value)}
                      placeholder="e.g. Broken window latch, deep cleaning fee"
                      className="text-xs"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">Staff Notes / Keys Handover</label>
                    <Input
                      type="text"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="e.g. Room key returned, locker verified empty"
                      className="text-xs"
                    />
                  </div>
                </div>

                {/* Settlement Summary Box */}
                <div className="space-y-4">
                  <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <ShieldCheck className="h-3.5 w-3.5 text-primary" />
                    4. Settlement Calculation
                  </h4>

                  <div className="bg-muted/50 rounded-xl p-4 border space-y-3">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-muted-foreground">Security Deposit Held:</span>
                      <span className="font-mono font-medium">{formatCurrency(depositHeld)}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs text-rose-600">
                      <span>Less Pending Dues:</span>
                      <span className="font-mono font-medium">- {formatCurrency(pendingDues)}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs text-rose-600">
                      <span>Less Deductions:</span>
                      <span className="font-mono font-medium">- {formatCurrency(deductionAmount)}</span>
                    </div>
                    
                    <div className="border-t pt-3 flex flex-col gap-1">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-semibold">Final Settlement:</span>
                        <span className={`text-base font-bold font-mono ${
                          settlementType === 'refund'
                            ? 'text-green-600'
                            : settlementType === 'collected'
                              ? 'text-rose-600'
                              : 'text-muted-foreground'
                        }`}>
                          {settlementType === 'refund' && `Refund: ${formatCurrency(absoluteSettlementAmount)}`}
                          {settlementType === 'collected' && `Collect: ${formatCurrency(absoluteSettlementAmount)}`}
                          {settlementType === 'settled' && '₹0 (Settled)'}
                        </span>
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        {settlementType === 'refund' && 'Hostel pays this refund amount to resident.'}
                        {settlementType === 'collected' && 'Resident owes this balance to the hostel.'}
                        {settlementType === 'settled' && 'All accounts reconciled with zero balance.'}
                      </p>
                    </div>

                    <div className="pt-2">
                      <Button
                        className="w-full text-xs h-10"
                        variant={settlementType === 'refund' ? 'default' : 'destructive'}
                        onClick={() => setIsConfirmOpen(true)}
                      >
                        <UserMinus className="h-4 w-4 mr-1.5" />
                        Review & Confirm Checkout
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Section 2: Departure Log (Vacated Residents) ── */}
      <Card className="border shadow-sm">
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <FileSpreadsheet className="h-5 w-5 text-primary" />
                Vacated Residents Departure Log
              </CardTitle>
              <CardDescription className="text-xs mt-1">
                Historical record of all departures, room releases, settlement transactions, and staff auditors.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportCsv}
                className="text-xs h-9"
              >
                <Download className="h-3.5 w-3.5 mr-1.5" />
                Export to CSV / Excel
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filters Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pb-2">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, room, or processor..."
                value={logSearch}
                onChange={(e) => setLogSearch(e.target.value)}
                className="pl-8 text-xs h-9"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Filter className="h-3.5 w-3.5" />
                Period:
              </span>
              <Button
                size="sm"
                variant={dateFilter === 'all' ? 'default' : 'outline'}
                className="text-xs h-8"
                onClick={() => setDateFilter('all')}
              >
                All Time
              </Button>
              <Button
                size="sm"
                variant={dateFilter === 'this_month' ? 'default' : 'outline'}
                className="text-xs h-8"
                onClick={() => setDateFilter('this_month')}
              >
                This Month
              </Button>
              <Button
                size="sm"
                variant={dateFilter === 'last_month' ? 'default' : 'outline'}
                className="text-xs h-8"
                onClick={() => setDateFilter('last_month')}
              >
                Last Month
              </Button>
            </div>
          </div>

          {/* Table */}
          <div className="rounded-xl border overflow-hidden">
            <Table>
              <TableHeader className="bg-muted/40">
                <TableRow>
                  <TableHead className="text-xs">Resident</TableHead>
                  <TableHead className="text-xs">Room & Bed</TableHead>
                  <TableHead className="text-xs">Admission Date</TableHead>
                  <TableHead className="text-xs">Vacate Date</TableHead>
                  <TableHead className="text-xs">Settlement Amount</TableHead>
                  <TableHead className="text-xs">Reason & Notes</TableHead>
                  <TableHead className="text-xs">Processed By</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDepartureLog.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-32 text-center text-xs text-muted-foreground">
                      No vacated residents found matching criteria.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredDepartureLog.map((log) => (
                    <TableRow key={log.id} className="hover:bg-muted/20">
                      <TableCell className="font-medium text-xs">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-[11px]">
                            {log.resident_name.charAt(0)}
                          </div>
                          <span>{log.resident_name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs font-mono">
                        Room {log.room_no} · {log.bed_label}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {formatDate(log.admission_date)}
                      </TableCell>
                      <TableCell className="text-xs font-semibold text-foreground">
                        {formatDate(log.vacate_date)}
                      </TableCell>
                      <TableCell className="text-xs">
                        {log.settlement_type === 'refund' && (
                          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-[11px] gap-1">
                            <ArrowDownRight className="h-3 w-3" />
                            Refunded {formatCurrency(log.settlement_amount)}
                          </Badge>
                        )}
                        {log.settlement_type === 'collected' && (
                          <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-[11px] gap-1">
                            <ArrowUpRight className="h-3 w-3" />
                            Collected {formatCurrency(log.settlement_amount)}
                          </Badge>
                        )}
                        {log.settlement_type === 'settled' && (
                          <Badge variant="secondary" className="text-[11px]">
                            Settled (₹0)
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-xs max-w-xs truncate text-muted-foreground" title={log.notes || log.reason || ''}>
                        <span className="text-foreground">{log.reason || '—'}</span>
                        {log.notes && <span className="block text-[11px] text-muted-foreground truncate">{log.notes}</span>}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {log.processed_by}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          <p className="text-[11px] text-muted-foreground text-right">
            Total Vacated Records: <strong>{filteredDepartureLog.length}</strong>
          </p>
        </CardContent>
      </Card>

      {/* ── Confirmation Modal ── */}
      {selectedResident && (
        <Dialog open={isConfirmOpen} onClose={() => setIsConfirmOpen(false)}>
          <div className="space-y-4">
            <DialogHeader>
              <DialogTitle className="text-lg flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-600" />
                Confirm Vacating Resident
              </DialogTitle>
              <DialogDescription className="text-xs">
                Please double check the settlement figures. This action will free up the room and update accounting ledgers.
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
                <span className="text-muted-foreground">Effective Date:</span>
                <span className="font-medium">{formatDate(vacateDate)}</span>
              </div>
              <div className="border-t pt-2 space-y-1">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Deposit Held:</span>
                  <span className="font-mono">{formatCurrency(depositHeld)}</span>
                </div>
                <div className="flex justify-between text-rose-600">
                  <span>Pending Dues:</span>
                  <span className="font-mono">- {formatCurrency(pendingDues)}</span>
                </div>
                <div className="flex justify-between text-rose-600">
                  <span>Deductions:</span>
                  <span className="font-mono">- {formatCurrency(deductionAmount)}</span>
                </div>
                <div className="flex justify-between font-bold pt-1 border-t text-sm">
                  <span>Net Settlement:</span>
                  <span className={settlementType === 'refund' ? 'text-green-600' : 'text-rose-600'}>
                    {settlementType === 'refund' && `Refund ${formatCurrency(absoluteSettlementAmount)}`}
                    {settlementType === 'collected' && `Collect ${formatCurrency(absoluteSettlementAmount)}`}
                    {settlementType === 'settled' && '₹0 (Reconciled)'}
                  </span>
                </div>
              </div>
            </div>

            <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl space-y-1.5 text-xs text-amber-900 dark:text-amber-300">
              <p className="font-semibold flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4" />
                Automatic actions performed on confirmation:
              </p>
              <ul className="list-disc list-inside space-y-0.5 text-[11px] text-muted-foreground">
                <li>Bed marked <strong>Available</strong> for new bookings</li>
                <li>Resident status changed to <strong>Vacated</strong></li>
                <li>Entrance PIN automatically <strong>Deactivated</strong></li>
                <li>Cash transaction posted to Cash Book: <strong>{settlementType === 'refund' ? 'Cash Out' : 'Cash In'} ({formatCurrency(absoluteSettlementAmount)})</strong></li>
                <li>Recorded into the Departure Log</li>
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
                className="text-xs"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Check className="h-3.5 w-3.5 mr-1.5" />
                    Confirm & Complete Checkout
                  </>
                )}
              </Button>
            </div>
          </div>
        </Dialog>
      )}
    </div>
  )
}
