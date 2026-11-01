import { useState, useMemo } from 'react'
import { useDemoData } from '@/contexts/DemoDataContext'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { Dialog } from '@/components/ui/dialog'
import { formatCurrency, formatDate } from '@/lib/utils'
import { BRAND } from '@/lib/brandConfig'
import { PrintTemplate } from '@/components/PrintTemplate'
import { CheckoutReceiptModal } from '@/components/CheckoutReceiptModal'
import type { CheckoutReceipt } from '@/types/database'
import {
  BarChart3, Download, TrendingUp, TrendingDown, IndianRupee,
  Utensils, BedDouble, ShoppingBag, PieChart, Printer, Search,
  ReceiptText, FileSpreadsheet
} from 'lucide-react'

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

export function ReportsPage() {
  const {
    residents,
    payments,
    expenses,
    products,
    sales,
    cashAccounts,
    beds,
    expenseCategories,
    checkoutReceipts
  } = useDemoData()
  const [selectedMonth, setSelectedMonth] = useState('2026-10')
  const [activeTab, setActiveTab] = useState<'financials' | 'checkout_receipts'>('financials')
  const [receiptSearch, setReceiptSearch] = useState('')
  const [selectedReceipt, setSelectedReceipt] = useState<CheckoutReceipt | null>(null)
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false)
  const [isPrintFinancialOpen, setIsPrintFinancialOpen] = useState(false)

  // Rent Income in selected month
  const rentIncome = useMemo(() =>
    payments.filter(p => p.period_month === selectedMonth).reduce((s, p) => s + p.amount, 0),
    [payments, selectedMonth]
  )

  // Store sales in selected month
  const monthSales = useMemo(() =>
    sales.filter(s => s.sale_date.startsWith(selectedMonth)),
    [sales, selectedMonth]
  )

  const storeSalesTotal = useMemo(() =>
    monthSales.reduce((s, sale) => s + sale.total, 0),
    [monthSales]
  )

  // Cost of goods sold
  const costOfGoods = useMemo(() => {
    let cogs = 0
    for (const sale of monthSales) {
      if (sale.items) {
        for (const it of sale.items) {
          cogs += (it.unit_cost || 0) * it.qty
        }
      }
    }
    // If no sales this month yet, use baseline 0
    return cogs
  }, [monthSales])

  // Operating Expenses in selected month
  const monthExpenses = useMemo(() =>
    expenses.filter(e => e.expense_date.startsWith(selectedMonth) && e.status !== 'rejected'),
    [expenses, selectedMonth]
  )

  const totalExpenses = useMemo(() =>
    monthExpenses.reduce((s, e) => s + e.amount, 0),
    [monthExpenses]
  )

  const grossProfit = (rentIncome + storeSalesTotal) - costOfGoods - totalExpenses

  // Food metrics
  const activeResidents = residents.filter(r => r.status === 'active').length
  const foodCategory = expenseCategories.find(c => c.name.toLowerCase().includes('food'))
  const foodExpenses = useMemo(() =>
    monthExpenses.filter(e => foodCategory ? e.category_id === foodCategory.id : e.category_id === 'ec-1')
      .reduce((s, e) => s + e.amount, 0),
    [monthExpenses, foodCategory]
  )

  // Days in month calculation
  const [yearStr, monthStr] = selectedMonth.split('-')
  const daysInMonth = new Date(Number(yearStr), Number(monthStr), 0).getDate() || 30
  const foodCostPerResident = activeResidents > 0 ? foodExpenses / (activeResidents * daysInMonth) : 0

  // Category-wise expense breakdown
  const expenseBreakdown = useMemo(() => {
    return expenseCategories.map(cat => {
      const amount = monthExpenses.filter(e => e.category_id === cat.id).reduce((s, e) => s + e.amount, 0)
      return {
        name: cat.name,
        amount,
        percentage: totalExpenses > 0 ? ((amount / totalExpenses) * 100).toFixed(1) : '0'
      }
    }).filter(c => c.amount > 0).sort((a, b) => b.amount - a.amount)
  }, [expenseCategories, monthExpenses, totalExpenses])

  // Occupancy metrics
  const totalBeds = beds.length
  const occupiedBeds = beds.filter(b => b.status === 'occupied').length
  const vacantBeds = beds.filter(b => b.status === 'available').length
  const reservedBeds = beds.filter(b => b.status === 'reserved').length
  const occupancyRate = totalBeds > 0 ? ((occupiedBeds / totalBeds) * 100).toFixed(1) : '0'

  const handleExportCSV = () => {
    const reportData = [
      { 'Report Section': 'Income', 'Item': 'Rent Collections', 'Amount (INR)': rentIncome },
      { 'Report Section': 'Income', 'Item': 'Store Sales', 'Amount (INR)': storeSalesTotal },
      { 'Report Section': 'COGS', 'Item': 'Cost of Goods Sold', 'Amount (INR)': costOfGoods },
      { 'Report Section': 'Expenses', 'Item': 'Operating Expenses Total', 'Amount (INR)': totalExpenses },
      ...expenseBreakdown.map(e => ({ 'Report Section': 'Expense Breakdown', 'Item': e.name, 'Amount (INR)': e.amount })),
      { 'Report Section': 'Summary', 'Item': 'Net Profit / Operating Surplus', 'Amount (INR)': grossProfit },
      { 'Report Section': 'Occupancy', 'Item': 'Total Beds', 'Amount (INR)': totalBeds },
      { 'Report Section': 'Occupancy', 'Item': 'Occupied Beds', 'Amount (INR)': occupiedBeds },
      { 'Report Section': 'Occupancy', 'Item': 'Occupancy Rate (%)', 'Amount (INR)': Number(occupancyRate) },
    ]
    exportToCsv(reportData, `hostel_financial_report_${selectedMonth}`)
  }

  // Filtered Checkout Receipts
  const filteredReceipts = useMemo(() => {
    const q = receiptSearch.toLowerCase().trim()
    if (!q) return checkoutReceipts
    return checkoutReceipts.filter(r =>
      r.receipt_no.toLowerCase().includes(q) ||
      r.resident_name.toLowerCase().includes(q) ||
      r.room_no.toLowerCase().includes(q) ||
      r.issued_by.toLowerCase().includes(q) ||
      (r.phone && r.phone.toLowerCase().includes(q))
    )
  }, [checkoutReceipts, receiptSearch])

  const handleExportReceiptsCSV = () => {
    const data = filteredReceipts.map(r => ({
      'Receipt No': r.receipt_no,
      'Resident Name': r.resident_name,
      'Phone': r.phone || '',
      'Room No': r.room_no,
      'Bed': r.bed_label,
      'Admission Date': r.admission_date,
      'Checkout Date': r.checkout_date,
      'Advance Deposit': r.advance_amount,
      'Pending Rent Deducted': r.pending_rent_deducted,
      'Other Deductions': r.other_deductions,
      'Final Settlement Amount': r.final_refund_amount,
      'Settlement Type': r.settlement_type,
      'Payment Mode': r.payment_mode,
      'Issued By': r.issued_by,
      'Date Issued': r.created_at
    }))
    exportToCsv(data, `checkout_settlement_receipts_${new Date().toISOString().slice(0, 10)}`)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Financial & Operational Reports</h1>
          <p className="text-muted-foreground text-sm">Verified real-time hostel metrics, P&L summary, and checkout receipts</p>
        </div>
        {activeTab === 'financials' ? (
          <div className="flex flex-wrap items-center gap-3">
            <Input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="w-auto h-9 text-sm"
            />
            <Button
              size="sm"
              onClick={() => setIsPrintFinancialOpen(true)}
              className="bg-[#10375C] hover:bg-[#10375C]/90 text-white font-semibold text-xs h-9"
            >
              <Printer className="h-4 w-4 mr-1.5" /> Print A4 P&L Statement
            </Button>
            <Button variant="outline" size="sm" onClick={handleExportCSV} className="h-9 text-xs">
              <Download className="h-4 w-4 mr-1.5" /> Export Report (CSV)
            </Button>
          </div>
        ) : (
          <Button variant="outline" size="sm" onClick={handleExportReceiptsCSV}>
            <Download className="h-4 w-4 mr-2" /> Export All Receipts (CSV)
          </Button>
        )}
      </div>

      {/* Module Tabs */}
      <div className="flex border-b space-x-6">
        <button
          onClick={() => setActiveTab('financials')}
          className={`pb-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'financials'
              ? 'border-primary text-primary font-semibold'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <BarChart3 className="h-4 w-4" />
          Financial & Operating P&L
        </button>
        <button
          onClick={() => setActiveTab('checkout_receipts')}
          className={`pb-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'checkout_receipts'
              ? 'border-primary text-primary font-semibold'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <ReceiptText className="h-4 w-4" />
          Checkout Settlement Receipts
          {checkoutReceipts.length > 0 && (
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 font-mono">
              {checkoutReceipts.length}
            </Badge>
          )}
        </button>
      </div>

      {activeTab === 'financials' ? (
        <>

      {/* Monthly P&L Overview */}
      <Card className="border-2 shadow-sm">
        <CardHeader className="pb-3 border-b">
          <CardTitle className="text-lg flex items-center justify-between">
            <span className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              Monthly Profit & Loss Statement ({selectedMonth})
            </span>
            <Badge variant={grossProfit >= 0 ? 'success' : 'destructive'} className="text-xs px-2.5 py-0.5">
              {grossProfit >= 0 ? 'Operating Surplus' : 'Operating Deficit'}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4 space-y-3">
          <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-950/40 rounded-lg border border-green-200 dark:border-green-900">
            <div className="flex items-center gap-2.5">
              <TrendingUp className="h-4 w-4 text-green-600 dark:text-green-400" />
              <div>
                <span className="font-semibold text-foreground text-sm">Rent Income (Collected)</span>
                <p className="text-xs text-muted-foreground">Collected from hostel residents</p>
              </div>
            </div>
            <span className="font-bold text-green-600 dark:text-green-400 text-base">{formatCurrency(rentIncome)}</span>
          </div>

          <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-950/40 rounded-lg border border-green-200 dark:border-green-900">
            <div className="flex items-center gap-2.5">
              <ShoppingBag className="h-4 w-4 text-green-600 dark:text-green-400" />
              <div>
                <span className="font-semibold text-foreground text-sm">Hostel Store Sales</span>
                <p className="text-xs text-muted-foreground">{monthSales.length} billed store transactions</p>
              </div>
            </div>
            <span className="font-bold text-green-600 dark:text-green-400 text-base">{formatCurrency(storeSalesTotal)}</span>
          </div>

          <div className="flex items-center justify-between p-3 bg-red-50 dark:bg-red-950/40 rounded-lg border border-red-200 dark:border-red-900">
            <div className="flex items-center gap-2.5">
              <TrendingDown className="h-4 w-4 text-red-600 dark:text-red-400" />
              <div>
                <span className="font-semibold text-foreground text-sm">Cost of Goods Sold (Store inventory cost)</span>
                <p className="text-xs text-muted-foreground">Product procurement cost of items billed</p>
              </div>
            </div>
            <span className="font-bold text-red-600 dark:text-red-400 text-base">−{formatCurrency(costOfGoods)}</span>
          </div>

          <div className="flex items-center justify-between p-3 bg-red-50 dark:bg-red-950/40 rounded-lg border border-red-200 dark:border-red-900">
            <div className="flex items-center gap-2.5">
              <TrendingDown className="h-4 w-4 text-red-600 dark:text-red-400" />
              <div>
                <span className="font-semibold text-foreground text-sm">Operating Expenses</span>
                <p className="text-xs text-muted-foreground">Food, electricity, gas, salary, repairs</p>
              </div>
            </div>
            <span className="font-bold text-red-600 dark:text-red-400 text-base">−{formatCurrency(totalExpenses)}</span>
          </div>

          <div className="border-t pt-2">
            <div className="flex items-center justify-between p-4 bg-primary/5 rounded-xl border border-primary/20">
              <div>
                <span className="text-lg font-bold text-foreground">Net Operating Balance</span>
                <p className="text-xs text-muted-foreground">Gross hostel operating profit after food & utilities</p>
              </div>
              <span className={`text-2xl font-bold ${grossProfit >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                {grossProfit >= 0 ? '+' : '−'}{formatCurrency(Math.abs(grossProfit))}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Occupancy Card */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <BedDouble className="h-4 w-4 text-primary" /> Occupancy Metrics
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 pt-2">
            <div className="text-center py-2">
              <p className="text-4xl font-extrabold text-primary">{occupancyRate}%</p>
              <p className="text-xs text-muted-foreground mt-1">Hostel Bed Occupancy Rate</p>
            </div>
            <div className="space-y-1.5 text-xs border-t pt-3">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Occupied Beds:</span>
                <span className="font-semibold text-foreground">{occupiedBeds} beds</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Vacant Beds Available:</span>
                <span className="font-semibold text-green-600">{vacantBeds} beds</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Reserved:</span>
                <span className="font-semibold text-amber-600">{reservedBeds} beds</span>
              </div>
              <div className="flex justify-between font-semibold border-t pt-1">
                <span>Total Hostel Beds:</span>
                <span>{totalBeds} beds</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Food Cost Card */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Utensils className="h-4 w-4 text-primary" /> Mess & Food Efficiency
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 pt-2">
            <div className="text-center py-2">
              <p className="text-4xl font-extrabold text-foreground">{formatCurrency(Math.round(foodCostPerResident))}</p>
              <p className="text-xs text-muted-foreground mt-1">Cost per resident per day</p>
            </div>
            <div className="space-y-1.5 text-xs border-t pt-3">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Food & Grocery:</span>
                <span className="font-semibold">{formatCurrency(foodExpenses)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Active Hostel Residents:</span>
                <span className="font-semibold">{activeResidents} residents</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Billing Days in Month:</span>
                <span className="font-semibold">{daysInMonth} days</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Cash Balance Position */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <IndianRupee className="h-4 w-4 text-primary" /> Physical Cash Balances
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2.5 pt-2">
            {cashAccounts.map(ca => (
              <div key={ca.id} className="flex items-center justify-between p-2.5 bg-muted/40 rounded-lg text-xs">
                <div>
                  <p className="font-semibold text-foreground">{ca.name}</p>
                  <p className="text-muted-foreground capitalize">{ca.kind.replace('_', ' ')}</p>
                </div>
                <span className="font-bold text-foreground text-sm">{formatCurrency(ca.balance || 0)}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Expense Category Breakdown */}
      <Card>
        <CardHeader className="pb-3 border-b">
          <CardTitle className="text-base flex items-center gap-2">
            <PieChart className="h-4 w-4 text-primary" /> Operating Expense Breakdown by Category
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          {expenseBreakdown.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">No expenses recorded for {selectedMonth}.</p>
          ) : (
            <div className="space-y-3">
              {expenseBreakdown.map((item) => (
                <div key={item.name} className="space-y-1">
                  <div className="flex justify-between text-xs font-medium">
                    <span className="text-foreground">{item.name}</span>
                    <span className="text-muted-foreground">
                      {formatCurrency(item.amount)} ({item.percentage}%)
                    </span>
                  </div>
                  <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all duration-300"
                      style={{ width: `${Math.min(100, Math.max(2, Number(item.percentage)))}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
        </>
      ) : (
        /* Checkout Receipts Tab */
        <Card className="border shadow-sm">
          <CardHeader className="pb-3 border-b bg-muted/20">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                  <ReceiptText className="h-5 w-5 text-primary" />
                  All Checkout Settlement Receipts
                </CardTitle>
                <CardDescription className="text-xs">
                  Central archive of all resident checkout receipts. Click "Print / View" to reprint A4/A5 receipts or export as PDF.
                </CardDescription>
              </div>
              <Badge variant="outline" className="font-mono text-xs w-fit">
                {filteredReceipts.length} Receipts
              </Badge>
            </div>
          </CardHeader>

          <CardContent className="pt-4 space-y-4">
            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search receipts by receipt #, resident name, room, or staff..."
                value={receiptSearch}
                onChange={e => setReceiptSearch(e.target.value)}
                className="pl-8 text-xs h-9"
              />
            </div>

            {/* Receipts Table */}
            <div className="border rounded-xl overflow-hidden">
              <Table>
                <TableHeader className="bg-muted/40">
                  <TableRow className="text-[11px]">
                    <TableHead className="h-8">Receipt #</TableHead>
                    <TableHead className="h-8">Resident Name</TableHead>
                    <TableHead className="h-8">Room / Bed</TableHead>
                    <TableHead className="h-8">Checkout Date</TableHead>
                    <TableHead className="h-8 text-right">Advance</TableHead>
                    <TableHead className="h-8 text-right">Rent Ded.</TableHead>
                    <TableHead className="h-8 text-right">Other Ded.</TableHead>
                    <TableHead className="h-8 text-right">Final Settlement</TableHead>
                    <TableHead className="h-8">Payment Mode</TableHead>
                    <TableHead className="h-8">Issued By</TableHead>
                    <TableHead className="h-8 text-center">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredReceipts.length > 0 ? (
                    filteredReceipts.map(r => (
                      <TableRow key={r.id} className="text-xs hover:bg-muted/30">
                        <TableCell className="font-mono font-bold text-primary text-[11px]">
                          {r.receipt_no}
                        </TableCell>
                        <TableCell className="font-medium">
                          <div>
                            <span>{r.resident_name}</span>
                            {r.phone && (
                              <span className="block text-[10px] text-muted-foreground font-mono">
                                {r.phone}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="font-mono text-[11px]">
                          Room {r.room_no} · {r.bed_label}
                        </TableCell>
                        <TableCell className="text-[11px]">
                          {formatDate(r.checkout_date)}
                        </TableCell>
                        <TableCell className="text-right font-mono text-[11px] text-emerald-600">
                          {formatCurrency(r.advance_amount)}
                        </TableCell>
                        <TableCell className="text-right font-mono text-[11px] text-rose-600">
                          - {formatCurrency(r.pending_rent_deducted)}
                        </TableCell>
                        <TableCell className="text-right font-mono text-[11px] text-rose-600">
                          - {formatCurrency(r.other_deductions)}
                        </TableCell>
                        <TableCell className="text-right font-mono font-bold text-xs">
                          <span className={r.settlement_type === 'refund' ? 'text-emerald-600' : 'text-rose-600'}>
                            {r.settlement_type === 'refund' ? 'Refund ' : 'Collected '}
                            {formatCurrency(r.final_refund_amount)}
                          </span>
                        </TableCell>
                        <TableCell className="text-[11px] uppercase font-mono">
                          {r.payment_mode}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-[11px]">
                          {r.issued_by}
                        </TableCell>
                        <TableCell className="text-center">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedReceipt(r)
                              setIsReceiptModalOpen(true)
                            }}
                            className="h-7 text-[11px] gap-1 px-2"
                          >
                            <Printer className="h-3 w-3" />
                            Print / View
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={11} className="h-24 text-center text-muted-foreground text-xs">
                        No checkout receipts recorded yet.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Checkout Receipt Modal for Reprinting */}
      <CheckoutReceiptModal
        receipt={selectedReceipt}
        open={isReceiptModalOpen}
        onClose={() => setIsReceiptModalOpen(false)}
      />

      {/* Monthly Financial & P&L Statement A4 Print Modal */}
      <Dialog open={isPrintFinancialOpen} onClose={() => setIsPrintFinancialOpen(false)}>
        <div className="space-y-4">
          <div className="flex items-center justify-between no-print border-b pb-2">
            <div>
              <h3 className="font-bold text-sm text-primary">Monthly Financial & Operations Statement</h3>
              <p className="text-[11px] text-muted-foreground">Reporting Period: {selectedMonth}</p>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                className="h-8 text-xs bg-[#10375C] hover:bg-[#10375C]/90 text-white font-semibold"
                onClick={() => window.print()}
              >
                <Printer className="h-3.5 w-3.5 mr-1.5" /> Print A4 Statement
              </Button>
              <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => setIsPrintFinancialOpen(false)}>
                Close
              </Button>
            </div>
          </div>

          <div className="border rounded-xl overflow-hidden max-h-[75vh] overflow-y-auto">
            <PrintTemplate
              documentTitle={`MONTHLY FINANCIAL & OPERATIONS STATEMENT (${selectedMonth})`}
              referenceNo={`FIN-P&L-${selectedMonth}`}
              signatoryName="Accounts Incharge"
              declarationText="This statement represents the verified operating revenue, store transactions, expenditures, and occupancy metrics for the specified billing cycle."
              termsNote="Official institutional statement. Generated from validated general ledger entries."
            >
              {/* Income Section */}
              <div className="space-y-2">
                <h4 className="font-bold text-xs uppercase tracking-wider text-[#10375C] border-b pb-1">
                  1. Operating Revenue & Inflow
                </h4>
                <table className="w-full text-xs border border-neutral-300">
                  <thead className="bg-[#10375C]/10 border-b border-neutral-300">
                    <tr>
                      <th className="p-2 text-left font-bold">Particulars / Source</th>
                      <th className="p-2 text-right font-bold w-36">Amount (INR)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-200">
                    <tr>
                      <td className="p-2">Hostel Accommodation & Bed Rent Collections</td>
                      <td className="p-2 text-right font-mono font-bold">{formatCurrency(rentIncome)}</td>
                    </tr>
                    <tr>
                      <td className="p-2">Store & Canteen Sales Collections</td>
                      <td className="p-2 text-right font-mono font-bold">{formatCurrency(storeSalesTotal)}</td>
                    </tr>
                    <tr className="bg-neutral-100 font-bold border-t">
                      <td className="p-2">Total Operating Income</td>
                      <td className="p-2 text-right font-mono font-bold text-emerald-700">
                        {formatCurrency(rentIncome + storeSalesTotal)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Outgoings Section */}
              <div className="space-y-2 pt-2">
                <h4 className="font-bold text-xs uppercase tracking-wider text-[#10375C] border-b pb-1">
                  2. Operating Expenditures & Outflows
                </h4>
                <table className="w-full text-xs border border-neutral-300">
                  <thead className="bg-[#10375C]/10 border-b border-neutral-300">
                    <tr>
                      <th className="p-2 text-left font-bold">Category</th>
                      <th className="p-2 text-right font-bold w-20">Share</th>
                      <th className="p-2 text-right font-bold w-36">Amount (INR)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-200">
                    <tr>
                      <td className="p-2">Store Cost of Goods Sold (COGS)</td>
                      <td className="p-2 text-right text-neutral-500 font-mono">—</td>
                      <td className="p-2 text-right font-mono">{formatCurrency(costOfGoods)}</td>
                    </tr>
                    {expenseBreakdown.map((item) => (
                      <tr key={item.name}>
                        <td className="p-2">{item.name}</td>
                        <td className="p-2 text-right text-neutral-500 font-mono">{item.percentage}%</td>
                        <td className="p-2 text-right font-mono">{formatCurrency(item.amount)}</td>
                      </tr>
                    ))}
                    <tr className="bg-neutral-100 font-bold border-t">
                      <td className="p-2" colSpan={2}>Total Operating Outgoings</td>
                      <td className="p-2 text-right font-mono font-bold text-rose-700">
                        {formatCurrency(costOfGoods + totalExpenses)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Net Surplus Box */}
              <div className="p-3 bg-[#10375C]/10 border-2 border-[#10375C] rounded flex justify-between items-center text-sm font-bold">
                <span className="text-[#10375C] uppercase">Net Operating Result (Surplus / Deficit):</span>
                <span className={`font-mono text-base ${grossProfit >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                  {formatCurrency(grossProfit)}
                </span>
              </div>

              {/* Operational Metrics Audit */}
              <div className="grid grid-cols-2 gap-4 pt-2">
                <div className="p-3 border rounded text-xs space-y-1">
                  <span className="font-bold text-neutral-800 block uppercase text-[10px]">Bed Occupancy Status</span>
                  <div className="flex justify-between"><span>Total Beds:</span><strong>{totalBeds}</strong></div>
                  <div className="flex justify-between"><span>Occupied Beds:</span><strong>{occupiedBeds}</strong></div>
                  <div className="flex justify-between"><span>Vacant Available:</span><strong>{vacantBeds}</strong></div>
                  <div className="flex justify-between pt-1 border-t text-primary"><span>Occupancy Rate:</span><strong>{occupancyRate}%</strong></div>
                </div>

                <div className="p-3 border rounded text-xs space-y-1">
                  <span className="font-bold text-neutral-800 block uppercase text-[10px]">Food & Mess Efficiency</span>
                  <div className="flex justify-between"><span>Food Purchases:</span><strong>{formatCurrency(foodExpenses)}</strong></div>
                  <div className="flex justify-between"><span>Active Residents:</span><strong>{activeResidents}</strong></div>
                  <div className="flex justify-between"><span>Days in Month:</span><strong>{daysInMonth}</strong></div>
                  <div className="flex justify-between pt-1 border-t text-primary"><span>Cost / Resident / Day:</span><strong>{formatCurrency(Math.round(foodCostPerResident))}</strong></div>
                </div>
              </div>
            </PrintTemplate>
          </div>
        </div>
      </Dialog>
    </div>
  )
}
