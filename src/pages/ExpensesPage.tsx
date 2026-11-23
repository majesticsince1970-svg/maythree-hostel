import { useState, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useDemoData } from '@/contexts/DemoDataContext'
import { useAuth } from '@/contexts/AuthContext'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { EmptyState } from '@/components/ui/loading'
import { useToast } from '@/components/ui/toast'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Plus, CheckCircle, XCircle, Download, Search } from 'lucide-react'

const expenseSchema = z.object({
  expense_date: z.string().min(1, 'Date is required'),
  category_id: z.string().min(1, 'Category is required'),
  vendor_id: z.string().optional(),
  description: z.string().min(2, 'Description must be at least 2 characters'),
  amount: z.number().min(1, 'Amount must be greater than 0'),
  paid_from: z.string().min(1, 'Paid from is required'),
  bill_no: z.string().optional(),
})

type ExpenseFormData = z.infer<typeof expenseSchema>

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

export function ExpensesPage() {
  const { expenses, expenseCategories, vendors, addExpense, updateExpenseStatus } = useDemoData()
  const { profile, isAdmin } = useAuth()
  const { addToast } = useToast()
  const [showForm, setShowForm] = useState(false)
  const [filterMonth, setFilterMonth] = useState('2026-10')
  const [filterCategory, setFilterCategory] = useState('all')
  const [search, setSearch] = useState('')

  const form = useForm<ExpenseFormData>({
    resolver: zodResolver(expenseSchema),
    defaultValues: {
      expense_date: new Date().toISOString().split('T')[0],
      category_id: '',
      description: '',
      amount: 0,
      paid_from: 'petty_cash',
      bill_no: ''
    },
  })

  const filtered = useMemo(() => {
    return expenses
      .filter(e => !filterMonth || e.expense_date.startsWith(filterMonth))
      .filter(e => filterCategory === 'all' || e.category_id === filterCategory)
      .filter(e => !search || e.description.toLowerCase().includes(search.toLowerCase()) || (e.bill_no && e.bill_no.toLowerCase().includes(search.toLowerCase())))
      .sort((a, b) => b.expense_date.localeCompare(a.expense_date))
  }, [expenses, filterMonth, filterCategory, search])

  const monthTotal = filtered.reduce((s, e) => s + e.amount, 0)

  const categoryTotals = useMemo(() => {
    return expenseCategories.map(c => ({
      category: c.name,
      total: expenses
        .filter(e => (!filterMonth || e.expense_date.startsWith(filterMonth)) && e.category_id === c.id)
        .reduce((s, e) => s + e.amount, 0),
    })).filter(c => c.total > 0).sort((a, b) => b.total - a.total)
  }, [expenses, expenseCategories, filterMonth])

  const handleSubmit = (data: ExpenseFormData) => {
    addExpense({
      ...data,
      vendor_id: data.vendor_id || null,
      bill_no: data.bill_no || null,
      bill_photo_path: null,
      recorded_by: profile?.user_id || 'unknown',
      category: expenseCategories.find(c => c.id === data.category_id),
      vendor: vendors.find(v => v.id === data.vendor_id) || undefined,
    })
    addToast({ type: 'success', title: 'Expense recorded', description: `${formatCurrency(data.amount)} under ${expenseCategories.find(c => c.id === data.category_id)?.name}` })
    form.reset()
    setShowForm(false)
  }

  const handleExport = () => {
    if (filtered.length === 0) {
      addToast({ type: 'info', title: 'No data to export' })
      return
    }
    const exportData = filtered.map(exp => ({
      'Date': exp.expense_date,
      'Category': exp.category?.name || 'Other',
      'Description': exp.description,
      'Vendor': exp.vendor?.name || '—',
      'Amount (INR)': exp.amount,
      'Paid From': exp.paid_from.replace('_', ' ').toUpperCase(),
      'Bill No': exp.bill_no || '—',
      'Status': exp.status.toUpperCase(),
    }))
    exportToCsv(exportData, `expenses_${filterMonth || 'all'}_${new Date().toISOString().split('T')[0]}`)
    addToast({ type: 'success', title: 'Export generated', description: `Exported ${filtered.length} expense record(s) to CSV.` })
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Expenses</h1>
          <p className="text-muted-foreground text-sm">
            Total for filtered view: <span className="font-semibold text-foreground">{formatCurrency(monthTotal)}</span> ({filtered.length} entries)
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" /> Export CSV / Excel
          </Button>
          <Button onClick={() => setShowForm(true)}>
            <Plus className="h-4 w-4 mr-2" /> Add Expense
          </Button>
        </div>
      </div>

      {/* Category breakdown pills */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {categoryTotals.slice(0, 5).map(ct => (
          <Card key={ct.category}>
            <CardContent className="p-4 text-center">
              <p className="text-xs text-muted-foreground truncate">{ct.category}</p>
              <p className="text-lg font-bold mt-0.5 text-primary">{formatCurrency(ct.total)}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <Input
          type="month"
          value={filterMonth}
          onChange={(e) => setFilterMonth(e.target.value)}
          className="w-auto"
        />
        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
        >
          <option value="all">All Categories</option>
          {expenseCategories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search description or bill number..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Expense list */}
      <Card>
        {filtered.length === 0 ? (
          <EmptyState title="No expenses found" description="No expense records match your current filters." />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Vendor</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Paid From</TableHead>
                <TableHead>Status</TableHead>
                {isAdmin && <TableHead className="text-right">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((exp) => (
                <TableRow key={exp.id}>
                  <TableCell className="whitespace-nowrap">{formatDate(exp.expense_date)}</TableCell>
                  <TableCell><Badge variant="outline">{exp.category?.name || '—'}</Badge></TableCell>
                  <TableCell className="font-medium">
                    {exp.description}
                    {exp.bill_no && <span className="block text-xs text-muted-foreground">Bill: {exp.bill_no}</span>}
                  </TableCell>
                  <TableCell>{exp.vendor?.name || '—'}</TableCell>
                  <TableCell className="font-bold text-foreground">{formatCurrency(exp.amount)}</TableCell>
                  <TableCell className="capitalize text-xs">{exp.paid_from.replace('_', ' ')}</TableCell>
                  <TableCell>
                    <Badge variant={exp.status === 'approved' ? 'success' : exp.status === 'rejected' ? 'destructive' : 'warning'}>
                      {exp.status}
                    </Badge>
                  </TableCell>
                  {isAdmin && (
                    <TableCell className="text-right">
                      {exp.status === 'recorded' && (
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-green-600 hover:bg-green-50"
                            onClick={() => { updateExpenseStatus(exp.id, 'approved'); addToast({ type: 'success', title: 'Expense approved' }) }}
                            title="Approve expense"
                          >
                            <CheckCircle className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:bg-destructive/10"
                            onClick={() => { updateExpenseStatus(exp.id, 'rejected'); addToast({ type: 'info', title: 'Expense rejected' }) }}
                            title="Reject expense"
                          >
                            <XCircle className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      {/* Add Expense Dialog */}
      <Dialog open={showForm} onClose={() => setShowForm(false)}>
        <DialogHeader>
          <DialogTitle>Add Expense</DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Date *</Label>
              <Input type="date" {...form.register('expense_date')} className="mt-1" />
            </div>
            <div>
              <Label>Category *</Label>
              <select {...form.register('category_id')} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm mt-1">
                <option value="">Select category...</option>
                {expenseCategories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          </div>
          <div>
            <Label>Description *</Label>
            <Textarea {...form.register('description')} placeholder="What was purchased or spent on" className="mt-1" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Amount (₹) *</Label>
              <Input type="number" {...form.register('amount', { valueAsNumber: true })} className="mt-1" placeholder="e.g. 2500" />
            </div>
            <div>
              <Label>Paid From *</Label>
              <select {...form.register('paid_from')} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm mt-1">
                <option value="petty_cash">Petty Cash</option>
                <option value="bank">Bank / UPI Transfer</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Vendor</Label>
              <select {...form.register('vendor_id')} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm mt-1">
                <option value="">None / Direct</option>
                {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
              </select>
            </div>
            <div>
              <Label>Bill / Voucher No</Label>
              <Input {...form.register('bill_no')} className="mt-1" placeholder="Optional" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" type="button" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button type="submit">Record Expense</Button>
          </DialogFooter>
        </form>
      </Dialog>
    </div>
  )
}
