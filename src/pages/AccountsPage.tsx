import { useSearchParams } from 'react-router-dom'
import { PaymentsPage } from '@/pages/PaymentsPage'
import { ExpensesPage } from '@/pages/ExpensesPage'
import { CashPage } from '@/pages/CashPage'
import { Button } from '@/components/ui/button'
import { Landmark, CreditCard, Receipt, Wallet } from 'lucide-react'

export function AccountsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const currentTab = searchParams.get('tab') || 'payments'

  const setTab = (tab: string) => {
    setSearchParams({ tab })
  }

  return (
    <div className="space-y-6">
      {/* Module Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Landmark className="h-6 w-6 text-primary" />
            Accounts & Finance
          </h1>
          <p className="text-muted-foreground text-sm">
            Rent collections, operational expenses, petty cash, bank transfers & UPI reconciliations
          </p>
        </div>
      </div>

      {/* Sub-navigation Tabs */}
      <div className="flex flex-wrap items-center gap-2 p-1.5 bg-muted/60 rounded-xl border">
        <Button
          variant={currentTab === 'payments' ? 'default' : 'ghost'}
          size="sm"
          className="text-xs h-9"
          onClick={() => setTab('payments')}
        >
          <CreditCard className="h-4 w-4 mr-1.5" />
          Rent Collection
        </Button>
        <Button
          variant={currentTab === 'expenses' ? 'default' : 'ghost'}
          size="sm"
          className="text-xs h-9"
          onClick={() => setTab('expenses')}
        >
          <Receipt className="h-4 w-4 mr-1.5" />
          Hostel Expenses
        </Button>
        <Button
          variant={currentTab === 'cash' ? 'default' : 'ghost'}
          size="sm"
          className="text-xs h-9"
          onClick={() => setTab('cash')}
        >
          <Wallet className="h-4 w-4 mr-1.5" />
          Cash & Bank Book
        </Button>
      </div>

      {/* Module Content */}
      {currentTab === 'payments' && <PaymentsPage />}
      {currentTab === 'expenses' && <ExpensesPage />}
      {currentTab === 'cash' && <CashPage />}
    </div>
  )
}
