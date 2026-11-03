import { useNavigate } from 'react-router-dom'
import { useDemoData } from '@/contexts/DemoDataContext'
import { StatCard } from '@/components/StatCard'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatCurrency } from '@/lib/utils'
import { BRAND } from '@/lib/brandConfig'
import {
  BedDouble, Users, UserPlus, ClipboardList, IndianRupee,
  TrendingUp, AlertTriangle, ShoppingCart, Wallet, ArrowRight,
  UserCheck, Clock
} from 'lucide-react'

export function DashboardPage() {
  const navigate = useNavigate()
  const {
    dashboardStats,
    applications,
    rentDueList,
    cashAccounts,
    products,
    expenses,
    attendanceStats
  } = useDemoData()
  const s = dashboardStats

  const defaulters = rentDueList.filter(r => r.balance > 0)
  const lowStockProducts = products.filter(p => (p.stock_on_hand || 0) <= p.reorder_level)
  const todaysExpenses = expenses.filter(e => e.expense_date === new Date().toISOString().split('T')[0])
  const todaysExpenseTotal = todaysExpenses.reduce((sum, e) => sum + e.amount, 0)
  const pendingApps = applications.filter(a => a.status === 'submitted' || a.status === 'under_review')

  const occupancyRate = s.total_beds > 0 ? Math.round((s.occupied / s.total_beds) * 100) : 0

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Hostel Operations Dashboard</h1>
          <p className="text-muted-foreground text-sm">Real-time overview of {BRAND.name}</p>
        </div>
      </div>

      {/* Key bed & application stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="cursor-pointer transition-transform hover:scale-[1.02]" onClick={() => navigate('/rooms')}>
          <StatCard title="Total Beds" value={s.total_beds} icon={BedDouble} subtitle={`${s.occupied} occupied`} />
        </div>
        <div className="cursor-pointer transition-transform hover:scale-[1.02]" onClick={() => navigate('/rooms')}>
          <StatCard title="Vacant Beds" value={s.vacant} icon={UserPlus} iconColor="text-green-600" subtitle="Ready for allocation" trend="up" />
        </div>
        <div className="cursor-pointer transition-transform hover:scale-[1.02]" onClick={() => navigate('/applications')}>
          <StatCard title="Pending Applications" value={s.pending_applications} icon={ClipboardList} iconColor="text-yellow-600" subtitle="Need staff review" />
        </div>
        <div className="cursor-pointer transition-transform hover:scale-[1.02]" onClick={() => navigate('/rooms')}>
          <StatCard title="Occupancy Rate" value={`${occupancyRate}%`} icon={Users} iconColor="text-blue-600" subtitle={`${s.occupied} of ${s.total_beds} beds`} />
        </div>
      </div>

      {/* Live Resident Presence & Attendance */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="cursor-pointer transition-transform hover:scale-[1.02]" onClick={() => navigate('/residents')}>
          <StatCard
            title="Total Active Residents"
            value={attendanceStats.totalResidents}
            icon={Users}
            subtitle={`${s.occupied} assigned to occupied beds`}
          />
        </div>
        <div className="cursor-pointer transition-transform hover:scale-[1.02]" onClick={() => navigate('/attendance?tab=live')}>
          <StatCard
            title="Inside Hostel Now"
            value={attendanceStats.insideHostel}
            icon={UserCheck}
            iconColor="text-green-600"
            subtitle="Present on premises"
          />
        </div>
        <div className="cursor-pointer transition-transform hover:scale-[1.02]" onClick={() => navigate('/attendance?tab=live')}>
          <StatCard
            title="Currently Outside"
            value={attendanceStats.outsideHostel}
            icon={Clock}
            iconColor="text-amber-600"
            subtitle="Classes, work, duty & errands"
          />
        </div>
      </div>

      {/* Rent & Finance cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="cursor-pointer transition-transform hover:scale-[1.02]" onClick={() => navigate('/payments')}>
          <StatCard title="Rent Expected (Oct)" value={formatCurrency(s.rent_due_this_month)} icon={IndianRupee} iconColor="text-orange-600" />
        </div>
        <div className="cursor-pointer transition-transform hover:scale-[1.02]" onClick={() => navigate('/payments')}>
          <StatCard title="Rent Collected" value={formatCurrency(s.rent_collected_this_month)} icon={TrendingUp} iconColor="text-green-600" subtitle={`${s.rent_due_this_month > 0 ? Math.round((s.rent_collected_this_month / s.rent_due_this_month) * 100) : 0}% collected`} />
        </div>
        <div className="cursor-pointer transition-transform hover:scale-[1.02]" onClick={() => navigate('/expenses')}>
          <StatCard title="Today's Expenses" value={formatCurrency(todaysExpenseTotal)} icon={Wallet} iconColor="text-red-600" />
        </div>
        <div className="cursor-pointer transition-transform hover:scale-[1.02]" onClick={() => navigate('/store/stock')}>
          <StatCard title="Low Stock Items" value={lowStockProducts.length} icon={ShoppingCart} iconColor="text-amber-600" subtitle="Needs reordering" />
        </div>
      </div>

      {/* Admissions possible by room type */}
      <Card>
        <CardHeader className="pb-3 border-b flex flex-row items-center justify-between">
          <CardTitle className="text-base font-semibold">Immediate Admission Capacity</CardTitle>
          <Button variant="ghost" size="sm" onClick={() => navigate('/applications')} className="text-xs text-primary">
            View Applications <ArrowRight className="h-3 w-3 ml-1" />
          </Button>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {s.admissions_possible.map((cat) => (
              <div
                key={cat.category}
                className="text-center p-4 bg-muted/40 rounded-xl border cursor-pointer hover:border-primary/50 transition-colors"
                onClick={() => navigate('/rooms')}
              >
                <p className="text-3xl font-extrabold text-primary">{cat.count}</p>
                <p className="text-sm font-medium mt-1">{cat.category}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{cat.count > 0 ? 'Available right now' : 'Full capacity'}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Cash Position */}
        <Card>
          <CardHeader className="pb-3 border-b flex flex-row items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Wallet className="h-4 w-4 text-primary" /> Cash Balances on Hand
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={() => navigate('/cash')} className="text-xs text-primary">
              Cash Ledger <ArrowRight className="h-3 w-3 ml-1" />
            </Button>
          </CardHeader>
          <CardContent className="space-y-3 pt-4">
            {cashAccounts.map((ca) => (
              <div key={ca.id} className="flex items-center justify-between p-3 bg-muted/40 rounded-lg border">
                <div>
                  <p className="font-semibold text-sm">{ca.name}</p>
                  <p className="text-xs text-muted-foreground capitalize">{ca.kind.replace('_', ' ')}</p>
                </div>
                <p className="font-bold text-foreground">{formatCurrency(ca.balance || 0)}</p>
              </div>
            ))}
            <div className="flex items-center justify-between p-3.5 bg-primary/5 rounded-xl border border-primary/20">
              <p className="font-semibold text-sm">Total Vault & Counter Cash</p>
              <p className="font-bold text-lg text-primary">
                {formatCurrency(cashAccounts.reduce((s, a) => s + (a.balance || 0), 0))}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Recent Pending Applications */}
        <Card>
          <CardHeader className="pb-3 border-b flex flex-row items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <ClipboardList className="h-4 w-4 text-primary" /> Pending Admissions
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={() => navigate('/applications')} className="text-xs text-primary">
              All ({pendingApps.length}) <ArrowRight className="h-3 w-3 ml-1" />
            </Button>
          </CardHeader>
          <CardContent className="pt-4">
            {pendingApps.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No pending admission applications</p>
            ) : (
              <div className="space-y-2.5">
                {pendingApps.slice(0, 4).map((app) => (
                  <div
                    key={app.id}
                    className="flex items-center justify-between p-3 bg-muted/40 rounded-lg border cursor-pointer hover:border-primary/50"
                    onClick={() => navigate('/applications')}
                  >
                    <div>
                      <p className="font-semibold text-sm">{app.full_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {app.ref_no} · {app.preferred_room_type?.name || 'Any Room'} {app.preferred_ac === 'yes' && '· ❄️ AC'}
                      </p>
                    </div>
                    <Badge variant={app.status === 'submitted' ? 'warning' : 'info'}>
                      {app.status.replace('_', ' ')}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Rent Defaulters */}
        <Card>
          <CardHeader className="pb-3 border-b flex flex-row items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-destructive" /> Outstanding Rent Balances
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={() => navigate('/payments')} className="text-xs text-primary">
              Payments <ArrowRight className="h-3 w-3 ml-1" />
            </Button>
          </CardHeader>
          <CardContent className="pt-4">
            {defaulters.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">All resident rents are up to date! 🎉</p>
            ) : (
              <div className="space-y-2.5">
                {defaulters.map((d) => (
                  <div
                    key={d.resident_id}
                    className="flex items-center justify-between p-3 bg-red-50/50 dark:bg-red-950/20 rounded-lg border border-red-200 dark:border-red-900 cursor-pointer"
                    onClick={() => navigate('/payments')}
                  >
                    <div>
                      <p className="font-semibold text-sm text-foreground">{d.resident_name}</p>
                      <p className="text-xs text-muted-foreground">Room {d.room_no} · Bed {d.bed_label}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-destructive">{formatCurrency(d.balance)}</p>
                      <p className="text-[11px] text-muted-foreground">pending</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Low Stock Alert */}
        <Card>
          <CardHeader className="pb-3 border-b flex flex-row items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <ShoppingCart className="h-4 w-4 text-amber-600" /> Store Low Stock Items
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={() => navigate('/store/stock')} className="text-xs text-primary">
              Stock Manager <ArrowRight className="h-3 w-3 ml-1" />
            </Button>
          </CardHeader>
          <CardContent className="pt-4">
            {lowStockProducts.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">All store products are adequately stocked</p>
            ) : (
              <div className="space-y-2.5">
                {lowStockProducts.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between p-3 bg-muted/40 rounded-lg border cursor-pointer hover:border-primary/50"
                    onClick={() => navigate('/store/stock')}
                  >
                    <div>
                      <p className="font-semibold text-sm">{p.name}</p>
                      <p className="text-xs text-muted-foreground">{p.category} · Threshold: {p.reorder_level} units</p>
                    </div>
                    <Badge variant={(p.stock_on_hand || 0) <= p.reorder_level / 2 ? 'destructive' : 'warning'}>
                      {p.stock_on_hand} left
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
