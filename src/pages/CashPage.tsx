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
import { Wallet, ArrowUpCircle, ArrowDownCircle, ClipboardCheck } from 'lucide-react'

export function CashPage() {
  const { cashAccounts, cashTransactions, topUpCash, recordCashCount } = useDemoData()
  const { isAdmin } = useAuth()
  const { addToast } = useToast()
  const [showTopUp, setShowTopUp] = useState(false)
  const [showCount, setShowCount] = useState(false)
  const [topUpAccount, setTopUpAccount] = useState<string>('')
  const [topUpAmount, setTopUpAmount] = useState('')
  const [topUpNote, setTopUpNote] = useState('')
  const [countAccount, setCountAccount] = useState<string>('')
  const [countedAmount, setCountedAmount] = useState('')
  const [countNote, setCountNote] = useState('')

  const totalCash = cashAccounts.reduce((s, a) => s + (a.balance || 0), 0)

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

  // Combine live context transactions with baseline initial transactions
  const allTransactions = useMemo(() => {
    const initialTxns = [
      { id: 'init-1', date: '2026-10-29', accountName: 'Petty Cash', direction: 'out' as const, amount: 2500, source: 'expense', note: 'Vegetables and fruits' },
      { id: 'init-2', date: '2026-10-29', accountName: 'Rent Cash', direction: 'in' as const, amount: 10000, source: 'rent_payment', note: 'Meera Iyer - Oct rent' },
      { id: 'init-3', date: '2026-10-28', accountName: 'Petty Cash', direction: 'out' as const, amount: 1200, source: 'expense', note: 'Milk - 20 litres' },
      { id: 'init-4', date: '2026-10-28', accountName: 'Store Counter', direction: 'in' as const, amount: 750, source: 'store_sale', note: 'Store sales' },
      { id: 'init-5', date: '2026-10-27', accountName: 'Rent Cash', direction: 'in' as const, amount: 3500, source: 'rent_payment', note: 'Roshni Das - Oct rent (partial)' },
      { id: 'init-6', date: '2026-10-27', accountName: 'Petty Cash', direction: 'in' as const, amount: 20000, source: 'top_up', note: 'Top-up from bank' },
    ]

    const live = cashTransactions.map(t => {
      const acc = cashAccounts.find(a => a.id === t.account_id)
      return {
        id: t.id,
        date: t.txn_date,
        accountName: acc?.name || 'Cash Account',
        direction: t.direction,
        amount: t.amount,
        source: t.source,
        note: t.note || 'Transaction'
      }
    })

    return [...live, ...initialTxns].sort((a, b) => b.date.localeCompare(a.date))
  }, [cashTransactions, cashAccounts])

  const selectedCountAccount = cashAccounts.find(a => a.id === countAccount)
  const countDifference = countedAmount !== '' && selectedCountAccount
    ? Number(countedAmount) - (selectedCountAccount.balance || 0)
    : 0

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Cash Management</h1>
          <p className="text-muted-foreground text-sm">Total cash on hand: {formatCurrency(totalCash)}</p>
        </div>
        <div className="flex gap-2">
          {isAdmin && (
            <Button variant="outline" onClick={() => setShowTopUp(true)}>
              <ArrowUpCircle className="h-4 w-4 mr-2" /> Top-up
            </Button>
          )}
          <Button onClick={() => setShowCount(true)}>
            <ClipboardCheck className="h-4 w-4 mr-2" /> Daily Count
          </Button>
        </div>
      </div>

      {/* Cash Account Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {cashAccounts.map((ca) => (
          <Card key={ca.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{ca.name}</p>
                  <p className="text-3xl font-bold mt-1 text-foreground">{formatCurrency(ca.balance || 0)}</p>
                </div>
                <div className="p-3 rounded-full bg-primary/10">
                  <Wallet className="h-6 w-6 text-primary" />
                </div>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground capitalize">{ca.kind.replace('_', ' ')}</span>
                {ca.float_limit && (
                  <Badge variant={(ca.balance || 0) > ca.float_limit ? 'warning' : 'outline'}>
                    Limit: {formatCurrency(ca.float_limit)}
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Transaction Ledger */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Recent Cash Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {allTransactions.map((txn) => (
              <div key={txn.id} className="flex items-center justify-between p-3 bg-muted/40 rounded-lg border">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-full ${txn.direction === 'in' ? 'bg-green-100 dark:bg-green-950' : 'bg-red-100 dark:bg-red-950'}`}>
                    {txn.direction === 'in' ? (
                      <ArrowDownCircle className="h-4 w-4 text-green-600" />
                    ) : (
                      <ArrowUpCircle className="h-4 w-4 text-red-600" />
                    )}
                  </div>
                  <div>
                    <p className="font-semibold text-sm">{txn.note}</p>
                    <p className="text-xs text-muted-foreground">{formatDate(txn.date)} · {txn.accountName} · {txn.source.replace('_', ' ')}</p>
                  </div>
                </div>
                <p className={`font-bold ${txn.direction === 'in' ? 'text-green-600' : 'text-red-600'}`}>
                  {txn.direction === 'in' ? '+' : '-'}{formatCurrency(txn.amount)}
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Top-up Dialog */}
      <Dialog open={showTopUp} onClose={() => setShowTopUp(false)}>
        <DialogHeader>
          <DialogTitle>Cash Top-up</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Cash Account *</Label>
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
            <Label>Note</Label>
            <Input
              type="text"
              value={topUpNote}
              onChange={(e) => setTopUpNote(e.target.value)}
              className="mt-1"
              placeholder="e.g. Withdrawn from bank for petty cash"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setShowTopUp(false)}>Cancel</Button>
          <Button onClick={handleTopUp} disabled={!topUpAccount || !topUpAmount}>Top-up Account</Button>
        </DialogFooter>
      </Dialog>

      {/* Daily Count Dialog */}
      <Dialog open={showCount} onClose={() => setShowCount(false)}>
        <DialogHeader>
          <DialogTitle>Daily Physical Cash Count</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Cash Account *</Label>
            <select
              value={countAccount}
              onChange={(e) => setCountAccount(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm mt-1"
            >
              <option value="">Select account...</option>
              {cashAccounts.map(ca => (
                <option key={ca.id} value={ca.id}>{ca.name} (System: {formatCurrency(ca.balance || 0)})</option>
              ))}
            </select>
          </div>
          <div>
            <Label>Physical Counted Amount (₹) *</Label>
            <Input
              type="number"
              value={countedAmount}
              onChange={(e) => setCountedAmount(e.target.value)}
              className="mt-1"
              placeholder="Actual cash counted in hand"
            />
          </div>
          {selectedCountAccount && countedAmount !== '' && (
            <div className={`p-3 rounded-lg border text-sm ${countDifference === 0 ? 'bg-green-50 border-green-200 text-green-900' : 'bg-amber-50 border-amber-200 text-amber-900'}`}>
              <div className="flex justify-between">
                <span>System Book Balance:</span>
                <span className="font-semibold">{formatCurrency(selectedCountAccount.balance || 0)}</span>
              </div>
              <div className="flex justify-between mt-1">
                <span>Difference:</span>
                <span className="font-bold">
                  {countDifference > 0 ? `+${formatCurrency(countDifference)} (Surplus)` : countDifference < 0 ? `${formatCurrency(countDifference)} (Shortage)` : 'Balanced (₹0)'}
                </span>
              </div>
            </div>
          )}
          <div>
            <Label>Explanation / Note {countDifference !== 0 && countedAmount !== '' ? '*' : ''}</Label>
            <Textarea
              value={countNote}
              onChange={(e) => setCountNote(e.target.value)}
              placeholder="Reason for discrepancy or audit remarks..."
              className="mt-1"
              rows={2}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setShowCount(false)}>Cancel</Button>
          <Button onClick={handleCount} disabled={!countAccount || countedAmount === ''}>Submit & Reconcile</Button>
        </DialogFooter>
      </Dialog>
    </div>
  )
}
