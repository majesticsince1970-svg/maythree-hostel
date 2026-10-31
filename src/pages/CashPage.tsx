import { useState, useMemo } from 'react'
import { useDemoData } from '@/contexts/DemoDataContext'
import { useAuth } from '@/contexts/AuthContext'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { formatCurrency, formatDate } from '@/lib/utils'
import { useToast } from '@/components/ui/toast'
import {
  Wallet, ArrowUpCircle, ArrowDownCircle, ClipboardCheck,
  ShoppingBag, Building2, Landmark, CreditCard, Download, Filter
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

const accountIcons: Record<string, typeof Wallet> = {
  petty_cash: Wallet,
  store_counter: ShoppingBag,
  rent_collection: Building2,
  bank: Landmark,
  upi: CreditCard,
}

export function CashPage() {
  const { cashAccounts, cashTransactions, topUpCash, recordCashCount } = useDemoData()
  const { isAdmin } = useAuth()
  const { addToast } = useToast()
  const [selectedAccountFilter, setSelectedAccountFilter] = useState<string>('all')
  const [showTopUp, setShowTopUp] = useState(false)
  const [showCount, setShowCount] = useState(false)
  const [topUpAccount, setTopUpAccount] = useState<string>('')
  const [topUpAmount, setTopUpAmount] = useState('')
  const [topUpNote, setTopUpNote] = useState('')
  const [countAccount, setCountAccount] = useState<string>('')
  const [countedAmount, setCountedAmount] = useState('')
  const [countNote, setCountNote] = useState('')

  // Calculations for distinct cash & digital vaults
  const physicalCashBalance = cashAccounts
    .filter(a => a.id === 'ca-1' || a.id === 'ca-2' || a.id === 'ca-3')
    .reduce((s, a) => s + (a.balance || 0), 0)

  const digitalBankBalance = cashAccounts
    .filter(a => a.id === 'ca-4' || a.id === 'ca-5')
    .reduce((s, a) => s + (a.balance || 0), 0)

  const grandTotal = cashAccounts.reduce((s, a) => s + (a.balance || 0), 0)

  const handleTopUp = () => {
    const amt = Number(topUpAmount)
    if (!topUpAccount || isNaN(amt) || amt <= 0) {
      addToast({ type: 'error', title: 'Invalid amount', description: 'Please enter a valid top-up amount.' })
      return
    }

    const account = cashAccounts.find(a => a.id === topUpAccount)
    topUpCash(topUpAccount, amt, topUpNote || `Top-up for ${account?.name}`)
    addToast({ type: 'success', title: 'Top-up successful', description: `${formatCurrency(amt)} added to ${account?.name}` })
    setShowTopUp(false)
    setTopUpAmount('')
    setTopUpNote('')
    setTopUpAccount('')
  }

  const handleCount = () => {
    const counted = Number(countedAmount)
    if (!countAccount || isNaN(counted) || counted < 0) {
      addToast({ type: 'error', title: 'Invalid count', description: 'Please enter a valid counted amount.' })
      return
    }

    const account = cashAccounts.find(a => a.id === countAccount)
    const diff = counted - (account?.balance || 0)

    if (diff !== 0 && !countNote.trim()) {
      addToast({ type: 'error', title: 'Reason required', description: 'Please add a note explaining the discrepancy.' })
      return
    }

    recordCashCount(countAccount, counted, countNote || 'Daily cash count verified')
    addToast({
      type: 'success',
      title: 'Cash count recorded',
      description: diff === 0 ? 'Cash matched system balance perfectly.' : `Difference of ${formatCurrency(diff)} recorded.`
    })
    setShowCount(false)
    setCountedAmount('')
    setCountNote('')
    setCountAccount('')
  }

  // Reactive transaction ledger enriched with account names
  const allTransactions = useMemo(() => {
    return cashTransactions.map(t => {
      const acc = cashAccounts.find(a => a.id === t.account_id)
      return {
        id: t.id,
        accountId: t.account_id,
        date: t.txn_date,
        accountName: acc?.name || 'Cash Account',
        accountKind: acc?.kind || 'petty_cash',
        direction: t.direction,
        amount: t.amount,
        source: t.source,
        note: t.note || 'Transaction'
      }
    }).sort((a, b) => b.date.localeCompare(a.date))
  }, [cashTransactions, cashAccounts])

  // Filtered transactions for distinct ledgers
  const filteredTransactions = useMemo(() => {
    if (selectedAccountFilter === 'all') return allTransactions
    return allTransactions.filter(t => t.accountId === selectedAccountFilter)
  }, [allTransactions, selectedAccountFilter])

  const handleExport = () => {
    const exportData = filteredTransactions.map(t => ({
      Date: t.date,
      Account: t.accountName,
      Type: t.direction === 'in' ? 'Credit (+)' : 'Debit (-)',
      Amount: t.amount,
      Source: t.source.replace('_', ' ').toUpperCase(),
      Description: t.note
    }))
    exportToCsv(exportData, `MayThree_Ledger_${selectedAccountFilter}_${new Date().toISOString().split('T')[0]}`)
    addToast({ type: 'success', title: 'Ledger Exported', description: `${exportData.length} transactions exported to Excel/CSV.` })
  }

  const selectedCountAccount = cashAccounts.find(a => a.id === countAccount)
  const countDifference = countedAmount !== '' && selectedCountAccount
    ? Number(countedAmount) - (selectedCountAccount.balance || 0)
    : 0

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Cash & Bank Ledgers</h1>
          <p className="text-muted-foreground text-sm">
            Cash in Hand: <span className="font-semibold text-foreground">{formatCurrency(physicalCashBalance)}</span> ·
            Bank & UPI: <span className="font-semibold text-foreground">{formatCurrency(digitalBankBalance)}</span> ·
            Total Liquidity: <span className="font-bold text-primary">{formatCurrency(grandTotal)}</span>
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="h-4 w-4 mr-1.5" /> Export Excel
          </Button>
          {isAdmin && (
            <Button variant="outline" size="sm" onClick={() => setShowTopUp(true)}>
              <ArrowUpCircle className="h-4 w-4 mr-1.5" /> Top-up
            </Button>
          )}
          <Button size="sm" onClick={() => setShowCount(true)}>
            <ClipboardCheck className="h-4 w-4 mr-1.5" /> Physical Count
          </Button>
        </div>
      </div>

      {/* 5 Distinct Account Balance Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3.5">
        {cashAccounts.map((ca) => {
          const Icon = accountIcons[ca.kind] || Wallet
          const isSelected = selectedAccountFilter === ca.id
          return (
            <Card
              key={ca.id}
              className={`cursor-pointer transition-all border-2 ${
                isSelected ? 'border-primary bg-primary/5 shadow-md' : 'hover:border-primary/50 hover:shadow-sm'
              }`}
              onClick={() => setSelectedAccountFilter(selectedAccountFilter === ca.id ? 'all' : ca.id)}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground truncate">{ca.name}</p>
                    <p className="text-xl font-extrabold mt-1 text-foreground">{formatCurrency(ca.balance || 0)}</p>
                  </div>
                  <div className="p-2 rounded-xl bg-primary/10 text-primary">
                    <Icon className="h-5 w-5" />
                  </div>
                </div>
                <div className="flex items-center justify-between text-xs mt-3 pt-2 border-t border-border/60">
                  <span className="text-muted-foreground capitalize">{ca.kind.replace('_', ' ')}</span>
                  {isSelected ? (
                    <Badge variant="default" className="text-[10px] py-0 px-1.5">Active</Badge>
                  ) : (
                    <span className="text-[11px] text-primary hover:underline">View Ledger →</span>
                  )}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Ledger Filter Tabs */}
      <div className="flex flex-wrap items-center gap-1.5 p-1 bg-muted/60 rounded-xl border w-fit">
        <Button
          variant={selectedAccountFilter === 'all' ? 'default' : 'ghost'}
          size="sm"
          className="text-xs h-8"
          onClick={() => setSelectedAccountFilter('all')}
        >
          All Accounts ({allTransactions.length})
        </Button>
        {cashAccounts.map(ca => {
          const count = allTransactions.filter(t => t.accountId === ca.id).length
          return (
            <Button
              key={ca.id}
              variant={selectedAccountFilter === ca.id ? 'default' : 'ghost'}
              size="sm"
              className="text-xs h-8"
              onClick={() => setSelectedAccountFilter(ca.id)}
            >
              {ca.name} ({count})
            </Button>
          )
        })}
      </div>

      {/* Transaction Ledger Table */}
      <Card>
        <CardHeader className="pb-3 border-b flex flex-row items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Filter className="h-4 w-4 text-primary" />
            {selectedAccountFilter === 'all'
              ? 'Complete Consolidated Ledger'
              : `${cashAccounts.find(a => a.id === selectedAccountFilter)?.name} Ledger`}
          </CardTitle>
          <span className="text-xs text-muted-foreground">
            Showing {filteredTransactions.length} entries
          </span>
        </CardHeader>
        <CardContent className="pt-4">
          {filteredTransactions.length === 0 ? (
            <p className="text-center py-8 text-sm text-muted-foreground">No transactions recorded for this ledger</p>
          ) : (
            <div className="space-y-2.5">
              {filteredTransactions.map((txn) => (
                <div key={txn.id} className="flex items-center justify-between p-3 bg-muted/40 rounded-lg border hover:bg-muted/70 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-full ${txn.direction === 'in' ? 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400' : 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400'}`}>
                      {txn.direction === 'in' ? (
                        <ArrowDownCircle className="h-4 w-4" />
                      ) : (
                        <ArrowUpCircle className="h-4 w-4" />
                      )}
                    </div>
                    <div>
                      <p className="font-semibold text-sm text-foreground">{txn.note}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                        <span>{formatDate(txn.date)}</span>
                        <span>·</span>
                        <Badge variant="outline" className="text-[10px] py-0 px-1 font-normal">
                          {txn.accountName}
                        </Badge>
                        <span>·</span>
                        <span className="capitalize">{txn.source.replace('_', ' ')}</span>
                      </div>
                    </div>
                  </div>
                  <p className={`font-bold text-sm ${txn.direction === 'in' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                    {txn.direction === 'in' ? '+' : '-'}{formatCurrency(txn.amount)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Top-up Dialog */}
      <Dialog open={showTopUp} onClose={() => setShowTopUp(false)}>
        <DialogHeader>
          <DialogTitle>Account Top-up</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Target Account *</Label>
            <select
              value={topUpAccount}
              onChange={(e) => setTopUpAccount(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm mt-1"
            >
              <option value="">Select account...</option>
              {cashAccounts.map(ca => (
                <option key={ca.id} value={ca.id}>{ca.name} (Current: {formatCurrency(ca.balance || 0)})</option>
              ))}
            </select>
          </div>
          <div>
            <Label>Top-up Amount (₹) *</Label>
            <Input
              type="number"
              value={topUpAmount}
              onChange={(e) => setTopUpAmount(e.target.value)}
              className="mt-1"
              placeholder="e.g. 5000"
            />
          </div>
          <div>
            <Label>Note / Purpose</Label>
            <Input
              type="text"
              value={topUpNote}
              onChange={(e) => setTopUpNote(e.target.value)}
              className="mt-1"
              placeholder="e.g. Vault top-up from bank"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setShowTopUp(false)}>Cancel</Button>
          <Button onClick={handleTopUp} disabled={!topUpAccount || !topUpAmount}>Deposit Funds</Button>
        </DialogFooter>
      </Dialog>

      {/* Daily Physical Count Dialog */}
      <Dialog open={showCount} onClose={() => setShowCount(false)}>
        <DialogHeader>
          <DialogTitle>Physical Cash / Balance Count</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Account to Reconcile *</Label>
            <select
              value={countAccount}
              onChange={(e) => setCountAccount(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm mt-1"
            >
              <option value="">Select account...</option>
              {cashAccounts.map(ca => (
                <option key={ca.id} value={ca.id}>{ca.name} (Book: {formatCurrency(ca.balance || 0)})</option>
              ))}
            </select>
          </div>
          <div>
            <Label>Actual Counted Amount (₹) *</Label>
            <Input
              type="number"
              value={countedAmount}
              onChange={(e) => setCountedAmount(e.target.value)}
              className="mt-1"
              placeholder="Actual cash counted in hand or bank statement"
            />
          </div>
          {selectedCountAccount && countedAmount !== '' && (
            <div className={`p-3 rounded-lg border text-sm ${countDifference === 0 ? 'bg-green-50 border-green-200 text-green-900' : 'bg-amber-50 border-amber-200 text-amber-900'}`}>
              <div className="flex justify-between">
                <span>System Book Balance:</span>
                <span className="font-semibold">{formatCurrency(selectedCountAccount.balance || 0)}</span>
              </div>
              <div className="flex justify-between mt-1">
                <span>Discrepancy:</span>
                <span className="font-bold">
                  {countDifference > 0 ? `+${formatCurrency(countDifference)} (Surplus)` : countDifference < 0 ? `${formatCurrency(countDifference)} (Shortage)` : 'Balanced (₹0)'}
                </span>
              </div>
            </div>
          )}
          <div>
            <Label>Remarks / Audit Explanation {countDifference !== 0 && countedAmount !== '' ? '*' : ''}</Label>
            <Textarea
              value={countNote}
              onChange={(e) => setCountNote(e.target.value)}
              placeholder="Audit notes or explanation of difference..."
              className="mt-1"
              rows={2}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setShowCount(false)}>Cancel</Button>
          <Button onClick={handleCount} disabled={!countAccount || countedAmount === ''}>Confirm & Reconcile</Button>
        </DialogFooter>
      </Dialog>
    </div>
  )
}
