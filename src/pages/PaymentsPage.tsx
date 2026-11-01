import { useState, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useDemoData } from '@/contexts/DemoDataContext'
import { useAuth } from '@/contexts/AuthContext'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { EmptyState } from '@/components/ui/loading'
import { useToast } from '@/components/ui/toast'
import { formatCurrency, formatDate } from '@/lib/utils'
import { BRAND } from '@/lib/brandConfig'
import { PrintTemplate } from '@/components/PrintTemplate'
import { numberToWordsINR } from '@/lib/numberToWords'
import {
  Plus, Phone, MessageCircle, Printer, Search, IndianRupee,
  Download, Banknote, CreditCard, Landmark, ShoppingBag
} from 'lucide-react'
import type { Payment } from '@/types/database'

const paymentSchema = z.object({
  resident_id: z.string().min(1, 'Select a resident'),
  period_month: z.string().min(1, 'Select month'),
  amount: z.number().min(1, 'Enter a valid amount'),
  mode: z.enum(['cash', 'UPI', 'bank']),
  reference: z.string().optional(),
})

type PaymentFormData = z.infer<typeof paymentSchema>

function exportToCsv(data: Record<string, unknown>[], filename: string) {
  if (data.length === 0) return
  const headers = Object.keys(data[0])
  const csvContent = [
    headers.join(','),
    ...data.map(row => headers.map(h => {
      const val = String(row[h] ?? '')
      return val.includes(',') || val.includes('"') ? `"${val.replace(/"/g, '""')}"` : val
    }).join(','))
  ].join('\n')

  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${filename}.csv`
  link.click()
  URL.revokeObjectURL(url)
}

export function PaymentsPage() {
  const { payments, residents, rentDueList, sales, cashAccounts, addPayment } = useDemoData()
  const { profile } = useAuth()
  const { addToast } = useToast()
  const [tab, setTab] = useState('all')
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [receiptPayment, setReceiptPayment] = useState<Payment | null>(null)

  const currentMonth = new Date().toISOString().slice(0, 7)

  const form = useForm<PaymentFormData>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      resident_id: '',
      period_month: currentMonth,
      amount: 0,
      mode: 'cash',
      reference: ''
    },
  })

  const watchMode = form.watch('mode')

  // Total metrics
  const bankTotal = useMemo(() =>
    payments.filter(p => p.mode === 'bank' && p.period_month === currentMonth).reduce((s, p) => s + p.amount, 0),
    [payments, currentMonth]
  )

  const upiTotal = useMemo(() =>
    payments.filter(p => p.mode === 'UPI' && p.period_month === currentMonth).reduce((s, p) => s + p.amount, 0),
    [payments, currentMonth]
  )

  const rentCashTotal = useMemo(() =>
    payments.filter(p => p.mode === 'cash' && p.period_month === currentMonth).reduce((s, p) => s + p.amount, 0),
    [payments, currentMonth]
  )

  const storeSalesCashTotal = useMemo(() => {
    const storeSales = sales.filter(s => s.payment_mode === 'cash' && s.sale_date.startsWith(currentMonth))
    return storeSales.reduce((s, x) => s + x.total, 0)
  }, [sales, currentMonth])

  const storeAccountBalance = cashAccounts.find(a => a.id === 'ca-2')?.balance || 0
  const rentAccountBalance = cashAccounts.find(a => a.id === 'ca-3')?.balance || 0

  const grandTotal = bankTotal + upiTotal + rentCashTotal

  const defaulters = rentDueList.filter(r => r.balance > 0)

  // Filter payments by search and active tab
  const activePayments = useMemo(() => {
    let list = [...payments].sort((a, b) => b.paid_on.localeCompare(a.paid_on))

    if (tab === 'bank') list = list.filter(p => p.mode === 'bank')
    else if (tab === 'upi') list = list.filter(p => p.mode === 'UPI')
    else if (tab === 'cash_rent') list = list.filter(p => p.mode === 'cash')

    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(p => {
        const res = residents.find(r => r.id === p.resident_id)
        return (
          p.receipt_no.toLowerCase().includes(q) ||
          (p.reference && p.reference.toLowerCase().includes(q)) ||
          (res?.application?.full_name && res.application.full_name.toLowerCase().includes(q)) ||
          (res?.bed?.room?.room_no && res.bed.room.room_no.includes(q))
        )
      })
    }

    return list
  }, [payments, tab, search, residents])

  // Store cash ledger entries
  const storeSalesEntries = useMemo(() => {
    let list = sales.filter(s => s.payment_mode === 'cash')
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(s => s.id.toLowerCase().includes(q))
    }
    return list.sort((a, b) => b.sale_date.localeCompare(a.sale_date))
  }, [sales, search])

  const handleRecord = (data: PaymentFormData) => {
    const payment = addPayment({
      resident_id: data.resident_id,
      period_month: data.period_month,
      amount: data.amount,
      paid_on: new Date().toISOString().split('T')[0],
      mode: data.mode,
      reference: data.reference || null,
      received_by: profile?.name || 'Staff',
    })
    addToast({
      type: 'success',
      title: 'Payment recorded',
      description: `Receipt ${payment.receipt_no} generated for ${formatCurrency(payment.amount)}.`
    })
    form.reset()
    setShowForm(false)
  }

  const handleExport = () => {
    if (tab === 'cash_store') {
      if (storeSalesEntries.length === 0) {
        addToast({ type: 'info', title: 'No store cash records to export' })
        return
      }
      const data = storeSalesEntries.map(s => ({
        'Sale ID': s.id,
        'Date': s.sale_date,
        'Payment Mode': 'Cash',
        'Sold By': s.sold_by,
        'Amount (INR)': s.total,
        'Items Count': s.items?.length || 0,
      }))
      exportToCsv(data, `store_cash_sales_${new Date().toISOString().split('T')[0]}`)
      addToast({ type: 'success', title: 'Export complete', description: 'Exported store cash sales to CSV.' })
      return
    }

    if (tab === 'defaulters') {
      if (defaulters.length === 0) {
        addToast({ type: 'info', title: 'No defaulters to export' })
        return
      }
      const data = defaulters.map(d => ({
        'Resident': d.resident_name,
        'Room': d.room_no,
        'Bed': d.bed_label,
        'Phone': d.phone,
        'Period': d.period_month,
        'Rent Due': d.rent_due,
        'Paid': d.paid,
        'Pending Balance': d.balance,
      }))
      exportToCsv(data, `rent_defaulters_${new Date().toISOString().split('T')[0]}`)
      addToast({ type: 'success', title: 'Export complete', description: 'Exported rent defaulters list to CSV.' })
      return
    }

    if (activePayments.length === 0) {
      addToast({ type: 'info', title: 'No records to export' })
      return
    }

    const data = activePayments.map(p => {
      const res = residents.find(r => r.id === p.resident_id)
      return {
        'Receipt No': p.receipt_no,
        'Resident': res?.application?.full_name || '—',
        'Room': res?.bed?.room?.room_no || '—',
        'Bed': res?.bed?.bed_label || '—',
        'Period Month': p.period_month,
        'Amount (INR)': p.amount,
        'Mode': p.mode.toUpperCase(),
        'Reference No': p.reference || '—',
        'Paid Date': p.paid_on,
        'Received By': p.received_by,
      }
    })

    exportToCsv(data, `payments_${tab}_${new Date().toISOString().split('T')[0]}`)
    addToast({ type: 'success', title: 'Export complete', description: `Exported ${activePayments.length} payment record(s) to CSV.` })
  }

  const renderPaymentTable = (list: Payment[]) => {
    if (list.length === 0) {
      return <EmptyState title="No payments found" description="No payment entries match the selected filter." />
    }
    return (
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Receipt</TableHead>
              <TableHead>Resident</TableHead>
              <TableHead>Room</TableHead>
              <TableHead>Month</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Channel / Mode</TableHead>
              <TableHead>Reference / Txn ID</TableHead>
              <TableHead>Paid On</TableHead>
              <TableHead className="text-right">Receipt</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {list.map((pay) => {
              const res = residents.find(r => r.id === pay.resident_id)
              return (
                <TableRow key={pay.id}>
                  <TableCell className="font-mono font-bold text-xs">{pay.receipt_no}</TableCell>
                  <TableCell className="font-semibold text-foreground">{res?.application?.full_name || '—'}</TableCell>
                  <TableCell className="text-xs">Room {res?.bed?.room?.room_no || '—'} ({res?.bed?.bed_label || '—'})</TableCell>
                  <TableCell className="text-xs">{pay.period_month}</TableCell>
                  <TableCell className="font-bold text-foreground">{formatCurrency(pay.amount)}</TableCell>
                  <TableCell>
                    <Badge variant={pay.mode === 'cash' ? 'success' : pay.mode === 'UPI' ? 'info' : 'default'}>
                      {pay.mode === 'UPI' ? '📱 UPI' : pay.mode === 'bank' ? '🏦 Bank' : '💵 Cash'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-xs font-mono">{pay.reference || '—'}</TableCell>
                  <TableCell className="text-xs whitespace-nowrap">{formatDate(pay.paid_on)}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-primary hover:bg-primary/10"
                      onClick={() => setReceiptPayment(pay)}
                      title="View & Print Official Receipt"
                    >
                      <Printer className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Payments & Ledgers</h1>
          <p className="text-muted-foreground text-sm">
            Distinct tracking for Bank, UPI, Rent Cash, and Store Cash collections
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" /> Export CSV / Excel
          </Button>
          <Button onClick={() => setShowForm(true)}>
            <Plus className="h-4 w-4 mr-2" /> Record Rent Payment
          </Button>
        </div>
      </div>

      {/* Mode-wise ledger balance cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className={`cursor-pointer transition-all ${tab === 'bank' ? 'ring-2 ring-blue-500 bg-blue-50/20' : 'hover:shadow-md'}`} onClick={() => setTab('bank')}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-blue-100 dark:bg-blue-950"><Landmark className="h-5 w-5 text-blue-600 dark:text-blue-400" /></div>
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase">Bank NEFT/IMPS</p>
                <p className="text-xl font-bold text-foreground mt-0.5">{formatCurrency(bankTotal)}</p>
                <p className="text-[11px] text-muted-foreground">Oct Collection</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={`cursor-pointer transition-all ${tab === 'upi' ? 'ring-2 ring-purple-500 bg-purple-50/20' : 'hover:shadow-md'}`} onClick={() => setTab('upi')}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-purple-100 dark:bg-purple-950"><CreditCard className="h-5 w-5 text-purple-600 dark:text-purple-400" /></div>
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase">UPI / QR Code</p>
                <p className="text-xl font-bold text-foreground mt-0.5">{formatCurrency(upiTotal)}</p>
                <p className="text-[11px] text-muted-foreground">Oct Collection</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={`cursor-pointer transition-all ${tab === 'cash_rent' ? 'ring-2 ring-green-500 bg-green-50/20' : 'hover:shadow-md'}`} onClick={() => setTab('cash_rent')}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-green-100 dark:bg-green-950"><Banknote className="h-5 w-5 text-green-600 dark:text-green-400" /></div>
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase">Cash (Rent Box)</p>
                <p className="text-xl font-bold text-foreground mt-0.5">{formatCurrency(rentCashTotal)}</p>
                <p className="text-[11px] text-muted-foreground">In Vault: {formatCurrency(rentAccountBalance)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={`cursor-pointer transition-all ${tab === 'cash_store' ? 'ring-2 ring-amber-500 bg-amber-50/20' : 'hover:shadow-md'}`} onClick={() => setTab('cash_store')}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-amber-100 dark:bg-amber-950"><ShoppingBag className="h-5 w-5 text-amber-600 dark:text-amber-400" /></div>
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase">Cash (Store Counter)</p>
                <p className="text-xl font-bold text-foreground mt-0.5">{formatCurrency(storeSalesCashTotal)}</p>
                <p className="text-[11px] text-muted-foreground">Till: {formatCurrency(storeAccountBalance)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <TabsList className="flex flex-wrap h-auto p-1">
            <TabsTrigger value="all">All Payments ({payments.length})</TabsTrigger>
            <TabsTrigger value="bank">🏦 Bank Ledger</TabsTrigger>
            <TabsTrigger value="upi">📱 UPI Ledger</TabsTrigger>
            <TabsTrigger value="cash_rent">💵 Cash (Rent)</TabsTrigger>
            <TabsTrigger value="cash_store">🛒 Cash (Store)</TabsTrigger>
            <TabsTrigger value="defaulters">⚠️ Defaulters ({defaulters.length})</TabsTrigger>
          </TabsList>
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search receipt, resident, room..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        <TabsContent value="all" className="mt-4">{renderPaymentTable(activePayments)}</TabsContent>
        <TabsContent value="bank" className="mt-4">{renderPaymentTable(activePayments)}</TabsContent>
        <TabsContent value="upi" className="mt-4">{renderPaymentTable(activePayments)}</TabsContent>
        <TabsContent value="cash_rent" className="mt-4">{renderPaymentTable(activePayments)}</TabsContent>

        {/* Store Counter Cash Ledger */}
        <TabsContent value="cash_store" className="mt-4">
          {storeSalesEntries.length === 0 ? (
            <EmptyState title="No store cash transactions" description="Cash sales from the store POS will appear here." />
          ) : (
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Sale ID</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Payment Type</TableHead>
                    <TableHead>Handled By</TableHead>
                    <TableHead>Items Billed</TableHead>
                    <TableHead className="text-right">Cash Received</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {storeSalesEntries.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell className="font-mono text-xs">{s.id}</TableCell>
                      <TableCell>{formatDate(s.sale_date)}</TableCell>
                      <TableCell><Badge variant="success">💵 Cash</Badge></TableCell>
                      <TableCell>{s.sold_by}</TableCell>
                      <TableCell>{s.items?.length || 0} product line(s)</TableCell>
                      <TableCell className="text-right font-bold text-foreground">{formatCurrency(s.total)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          )}
        </TabsContent>

        {/* Defaulters list */}
        <TabsContent value="defaulters" className="mt-4">
          <div className="grid gap-3">
            {defaulters.length === 0 ? (
              <Card><CardContent className="p-8 text-center text-muted-foreground">All rents are cleared! 🎉</CardContent></Card>
            ) : (
              defaulters.map((d) => (
                <Card key={d.resident_id} className="border-red-200 dark:border-red-950">
                  <CardContent className="p-4 flex items-center justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-foreground">{d.resident_name}</p>
                        <Badge variant="destructive">{formatCurrency(d.balance)} overdue</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Room {d.room_no} · Bed {d.bed_label} · Month: {d.period_month} · Monthly Rent: {formatCurrency(d.rent_due)} · Paid: {formatCurrency(d.paid)}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="icon" onClick={() => window.open(`tel:${d.phone}`)} title="Call resident">
                        <Phone className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="icon" onClick={() => window.open(`https://wa.me/91${d.phone}`)} title="WhatsApp reminder">
                        <MessageCircle className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Record Payment Dialog */}
      <Dialog open={showForm} onClose={() => setShowForm(false)}>
        <DialogHeader>
          <DialogTitle>Record Rent Payment</DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(handleRecord)} className="space-y-4">
          <div>
            <Label>Resident *</Label>
            <select
              {...form.register('resident_id')}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm mt-1"
            >
              <option value="">Select resident...</option>
              {residents.filter(r => r.status === 'active').map(r => (
                <option key={r.id} value={r.id}>
                  {r.application?.full_name} — Room {r.bed?.room?.room_no} — {formatCurrency(r.monthly_rent)}/mo
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Month *</Label>
              <Input type="month" {...form.register('period_month')} className="mt-1" />
            </div>
            <div>
              <Label>Amount (₹) *</Label>
              <Input
                type="number"
                {...form.register('amount', { valueAsNumber: true })}
                className="mt-1"
                placeholder="e.g. 8000"
              />
            </div>
          </div>

          <div>
            <Label>Payment Mode *</Label>
            <div className="grid grid-cols-3 gap-2 mt-1">
              <Button
                type="button"
                variant={watchMode === 'bank' ? 'default' : 'outline'}
                className="w-full text-xs"
                onClick={() => form.setValue('mode', 'bank')}
              >
                <Landmark className="h-3.5 w-3.5 mr-1" /> Bank
              </Button>
              <Button
                type="button"
                variant={watchMode === 'UPI' ? 'default' : 'outline'}
                className="w-full text-xs"
                onClick={() => form.setValue('mode', 'UPI')}
              >
                <CreditCard className="h-3.5 w-3.5 mr-1" /> UPI
              </Button>
              <Button
                type="button"
                variant={watchMode === 'cash' ? 'default' : 'outline'}
                className="w-full text-xs"
                onClick={() => form.setValue('mode', 'cash')}
              >
                <Banknote className="h-3.5 w-3.5 mr-1" /> Cash
              </Button>
            </div>
          </div>

          <div>
            <Label>
              {watchMode === 'bank' ? 'Bank UTR / NEFT Reference *' : watchMode === 'UPI' ? 'UPI Transaction ID / Ref *' : 'Receipt / Cash Note'}
            </Label>
            <Input
              {...form.register('reference')}
              placeholder={watchMode === 'bank' ? 'e.g. UTR123456789' : watchMode === 'UPI' ? 'e.g. UPI/12345678' : 'Optional notes'}
              className="mt-1"
            />
          </div>

          <DialogFooter>
            <Button variant="outline" type="button" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button type="submit">Issue Official Receipt</Button>
          </DialogFooter>
        </form>
      </Dialog>

      {/* Official Rent Receipt Dialog (A4 Printable) */}
      <Dialog open={!!receiptPayment} onClose={() => setReceiptPayment(null)}>
        {receiptPayment && (() => {
          const res = residents.find(r => r.id === receiptPayment.resident_id)
          return (
            <div className="space-y-4">
              <div className="flex items-center justify-between no-print border-b pb-2">
                <div>
                  <h3 className="font-bold text-sm text-primary">Rent Payment Voucher</h3>
                  <p className="text-[11px] text-muted-foreground">{receiptPayment.receipt_no}</p>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    className="h-8 text-xs bg-[#10375C] hover:bg-[#10375C]/90 text-white"
                    onClick={() => window.print()}
                  >
                    <Printer className="h-3.5 w-3.5 mr-1.5" /> Print A4 Receipt
                  </Button>
                  <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => setReceiptPayment(null)}>
                    Close
                  </Button>
                </div>
              </div>

              {/* Printable Document Payload */}
              <div className="border rounded-xl overflow-hidden max-h-[75vh] overflow-y-auto">
                <PrintTemplate
                  documentTitle="OFFICIAL RENT PAYMENT VOUCHER"
                  referenceNo={receiptPayment.receipt_no}
                  date={formatDate(receiptPayment.paid_on)}
                  guestDetails={{
                    name: res?.application?.full_name || 'Resident',
                    phone: res?.application?.phone || '—',
                    roomBed: `Room ${res?.bed?.room?.room_no || '—'} · Bed ${res?.bed?.bed_label || 'A'}`,
                    admissionDate: res?.check_in_date ? formatDate(res.check_in_date) : undefined,
                    duration: `Month: ${receiptPayment.period_month}`,
                  }}
                  signatoryName={profile?.name || 'Authorised Staff'}
                  declarationText="Payment received in full and credited to resident ledger. This is a computer generated official acknowledgement."
                  termsNote={`Mode of payment: ${receiptPayment.mode.toUpperCase()}${receiptPayment.reference ? ` · Ref: ${receiptPayment.reference}` : ''}`}
                >
                  <table className="w-full text-xs border border-neutral-300">
                    <thead>
                      <tr className="bg-[#10375C]/10 border-b border-neutral-300 text-neutral-900">
                        <th className="p-2.5 text-left font-bold w-12 text-center">S.No</th>
                        <th className="p-2.5 text-left font-bold">Particulars / Description</th>
                        <th className="p-2.5 text-left font-bold w-32">Billing Period</th>
                        <th className="p-2.5 text-right font-bold w-32">Amount (INR)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-200">
                      <tr>
                        <td className="p-2.5 text-center font-mono">1</td>
                        <td className="p-2.5 font-medium">
                          Hostel Accommodation & Facilities Rent
                          <span className="block text-[10px] text-neutral-500 font-normal">
                            Room {res?.bed?.room?.room_no} (Bed {res?.bed?.bed_label})
                          </span>
                        </td>
                        <td className="p-2.5 font-mono text-neutral-700">{receiptPayment.period_month}</td>
                        <td className="p-2.5 text-right font-mono font-bold text-neutral-900">
                          {formatCurrency(receiptPayment.amount)}
                        </td>
                      </tr>
                      <tr className="bg-[#10375C]/10 border-t-2 border-neutral-900 font-bold text-sm">
                        <td colSpan={3} className="p-2.5 text-right text-neutral-900">
                          TOTAL AMOUNT RECEIVED:
                        </td>
                        <td className="p-2.5 text-right font-mono font-black text-[#10375C]">
                          {formatCurrency(receiptPayment.amount)}
                        </td>
                      </tr>
                    </tbody>
                  </table>

                  <div className="p-3 bg-neutral-100 rounded text-xs">
                    <span className="text-neutral-500 font-semibold block text-[10px] uppercase">Amount in Words:</span>
                    <p className="font-bold text-neutral-900 uppercase font-mono">
                      {numberToWordsINR(receiptPayment.amount)}
                    </p>
                  </div>
                </PrintTemplate>
              </div>
            </div>
          )
        })()}
      </Dialog>
    </div>
  )
}
