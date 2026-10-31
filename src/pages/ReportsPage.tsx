import { useState, useMemo } from 'react'
import { useDemoData } from '@/contexts/DemoDataContext'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { formatCurrency } from '@/lib/utils'
import {
  BarChart3, Download, TrendingUp, TrendingDown, IndianRupee,
  Utensils, BedDouble, ShoppingBag, PieChart
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
  const { residents, payments, expenses, products, sales, cashAccounts, beds, expenseCategories } = useDemoData()
  const [selectedMonth, setSelectedMonth] = useState('2026-10')

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

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Financial & Operational Reports</h1>
          <p className="text-muted-foreground text-sm">Verified real-time hostel metrics and P&L summary</p>
        </div>
        <div className="flex items-center gap-3">
          <Input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="w-auto h-9 text-sm"
          />
          <Button variant="outline" size="sm" onClick={handleExportCSV}>
            <Download className="h-4 w-4 mr-2" /> Export Report (CSV)
          </Button>
        </div>
      </div>

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
    </div>
  )
}
