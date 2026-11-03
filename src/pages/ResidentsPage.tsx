import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDemoData } from '@/contexts/DemoDataContext'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/components/ui/toast'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Dialog, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { EmptyState } from '@/components/ui/loading'
import { formatCurrency, formatDate } from '@/lib/utils'
import type { Resident, ResidentStatus } from '@/types/database'
import { Search, Eye, Phone, BedDouble, User, CalendarX, KeyRound, UserMinus } from 'lucide-react'

type FilterTab = 'all' | 'active' | 'checked_out'

const statusBadgeVariant: Record<ResidentStatus, 'success' | 'warning' | 'destructive'> = {
  active: 'success',
  notice: 'warning',
  checked_out: 'destructive',
  vacated: 'destructive',
}

const statusLabel: Record<ResidentStatus, string> = {
  active: 'Active',
  notice: 'Notice',
  checked_out: 'Checked Out',
  vacated: 'Vacated',
}

export function ResidentsPage() {
  const navigate = useNavigate()
  const { residents, payments, rentDueList, resetResidentPin } = useDemoData()
  const { isAdmin } = useAuth()
  const { addToast } = useToast()
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<Resident | null>(null)
  const [tab, setTab] = useState<FilterTab>('all')

  const tabFiltered = residents.filter((r) => {
    if (tab === 'active') return r.status === 'active' || r.status === 'notice'
    if (tab === 'checked_out') return r.status === 'checked_out' || r.status === 'vacated'
    return true
  })

  const filtered = tabFiltered.filter((r) => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      r.application?.full_name.toLowerCase().includes(q) ||
      r.bed?.room?.room_no?.includes(q) ||
      r.application?.phone?.includes(q)
    )
  })

  const activeCount = residents.filter((r) => r.status === 'active' || r.status === 'notice').length
  const checkedOutCount = residents.filter((r) => r.status === 'checked_out' || r.status === 'vacated').length

  const getBalance = (residentId: string) => {
    const due = rentDueList.find((r) => r.resident_id === residentId)
    return due ? due.balance : 0
  }

  const getResidentPayments = (residentId: string) =>
    payments.filter((p) => p.resident_id === residentId).sort((a, b) => b.paid_on.localeCompare(a.paid_on))

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Residents</h1>
          <p className="text-muted-foreground text-sm">
            {activeCount} active · {checkedOutCount} checked out · {residents.length} total
          </p>
        </div>
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search name, room, phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Filter Tabs */}
      <Tabs value={tab} onValueChange={(v) => setTab(v as FilterTab)}>
        <TabsList>
          <TabsTrigger value="all">All ({residents.length})</TabsTrigger>
          <TabsTrigger value="active">Active ({activeCount})</TabsTrigger>
          <TabsTrigger value="checked_out">Checked Out ({checkedOutCount})</TabsTrigger>
        </TabsList>

        <TabsContent value={tab}>
          {filtered.length === 0 ? (
            <EmptyState title="No residents found" description="No residents match your search or filter." />
          ) : (
            <>
              {/* Desktop table */}
              <div className="hidden md:block">
                <Card>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Room</TableHead>
                        <TableHead>Phone</TableHead>
                        <TableHead>Rent</TableHead>
                        <TableHead>Balance</TableHead>
                        <TableHead>Status</TableHead>
                        {tab !== 'active' && <TableHead>Check-out</TableHead>}
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filtered.map((res) => {
                        const balance = getBalance(res.id)
                        return (
                          <TableRow key={res.id}>
                            <TableCell className="font-medium">{res.application?.full_name}</TableCell>
                            <TableCell>Room {res.bed?.room?.room_no || '—'} · Bed {res.bed?.bed_label}</TableCell>
                            <TableCell>{res.application?.phone}</TableCell>
                            <TableCell>{formatCurrency(res.monthly_rent)}</TableCell>
                            <TableCell>
                              {res.status === 'checked_out' ? (
                                <span className="text-muted-foreground">—</span>
                              ) : balance > 0 ? (
                                <span className="text-destructive font-medium">{formatCurrency(balance)}</span>
                              ) : (
                                <span className="text-green-600">Paid</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <Badge variant={statusBadgeVariant[res.status]}>
                                {statusLabel[res.status]}
                              </Badge>
                            </TableCell>
                            {tab !== 'active' && (
                              <TableCell>
                                {res.check_out_date ? formatDate(res.check_out_date) : '—'}
                              </TableCell>
                            )}
                            <TableCell>
                              <Button variant="ghost" size="icon" onClick={() => setSelected(res)}>
                                <Eye className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </Card>
              </div>

              {/* Mobile cards */}
              <div className="md:hidden space-y-3">
                {filtered.map((res) => {
                  const balance = getBalance(res.id)
                  return (
                    <Card key={res.id} className="cursor-pointer hover:shadow-md" onClick={() => setSelected(res)}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <p className="font-semibold">{res.application?.full_name}</p>
                              <Badge variant={statusBadgeVariant[res.status]} className="text-[10px] px-1.5 py-0">
                                {statusLabel[res.status]}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-3 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <BedDouble className="h-3 w-3" />Room {res.bed?.room?.room_no || '—'}
                              </span>
                              <span className="flex items-center gap-1">
                                <Phone className="h-3 w-3" />{res.application?.phone}
                              </span>
                            </div>
                            {res.status === 'checked_out' && res.check_out_date && (
                              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                <CalendarX className="h-3 w-3" />
                                Checked out: {formatDate(res.check_out_date)}
                              </div>
                            )}
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-medium">{formatCurrency(res.monthly_rent)}</p>
                            {res.status !== 'checked_out' && balance > 0 && (
                              <p className="text-xs text-destructive">{formatCurrency(balance)} due</p>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            </>
          )}
        </TabsContent>
      </Tabs>

      {/* Resident Detail Dialog */}
      <Dialog open={!!selected} onClose={() => setSelected(null)}>
        {selected && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <User className="h-5 w-5" /> {selected.application?.full_name}
                <Badge variant={statusBadgeVariant[selected.status]} className="ml-2">
                  {statusLabel[selected.status]}
                </Badge>
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 text-sm max-h-[60vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-x-6 gap-y-2">
                <div><p className="text-muted-foreground">Room</p><p className="font-medium">{selected.bed?.room?.room_no || '—'}</p></div>
                <div><p className="text-muted-foreground">Bed</p><p className="font-medium">{selected.bed?.bed_label}</p></div>
                <div><p className="text-muted-foreground">Phone</p><p className="font-medium">{selected.application?.phone}</p></div>
                <div><p className="text-muted-foreground">Check-in</p><p className="font-medium">{formatDate(selected.check_in_date)}</p></div>
                <div><p className="text-muted-foreground">Monthly Rent</p><p className="font-medium">{formatCurrency(selected.monthly_rent)}</p></div>
                <div><p className="text-muted-foreground">Deposit</p><p className="font-medium">{formatCurrency(selected.deposit_amount)}</p></div>
                <div>
                  <p className="text-muted-foreground">Entrance PIN</p>
                  <p className="font-mono font-bold text-primary flex items-center gap-1.5">
                    <KeyRound className="h-3.5 w-3.5" />
                    {selected.pin || '1021'}
                    {selected.pin_active === false && (
                      <Badge variant="destructive" className="text-[9px] px-1 py-0">Deactivated</Badge>
                    )}
                  </p>
                </div>
                {(selected.status === 'checked_out' || selected.status === 'vacated') && selected.check_out_date && (
                  <div>
                    <p className="text-muted-foreground">Check-out</p>
                    <p className="font-medium">{formatDate(selected.check_out_date)}</p>
                  </div>
                )}
              </div>

              <div className="border-t pt-3">
                <p className="font-semibold mb-2">Payment History</p>
                {getResidentPayments(selected.id).length === 0 ? (
                  <p className="text-muted-foreground">No payments recorded</p>
                ) : (
                  <div className="space-y-2">
                    {getResidentPayments(selected.id).map((pay) => (
                      <div key={pay.id} className="flex justify-between items-center p-2 bg-muted/50 rounded">
                        <div>
                          <p className="font-medium">{pay.period_month}</p>
                          <p className="text-xs text-muted-foreground">{formatDate(pay.paid_on)} · {pay.mode} · {pay.receipt_no}</p>
                        </div>
                        <p className="font-semibold">{formatCurrency(pay.amount)}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex flex-wrap gap-2 pt-2">
                <Button variant="outline" size="sm" className="flex-1" onClick={() => window.open(`tel:${selected.application?.phone}`)}>
                  <Phone className="h-4 w-4 mr-1" /> Call
                </Button>
                <Button variant="outline" size="sm" className="flex-1" onClick={() => window.open(`https://wa.me/91${selected.application?.phone}`)}>
                  WhatsApp
                </Button>
                {(selected.status === 'active' || selected.status === 'notice') && (
                  <Button
                    variant="destructive"
                    size="sm"
                    className="w-full mt-1"
                    onClick={() => {
                      setSelected(null)
                      navigate('/admissions?tab=vacate')
                    }}
                  >
                    <UserMinus className="h-4 w-4 mr-1.5" />
                    Proceed to Vacate & Settlement
                  </Button>
                )}
              </div>
            </div>
          </>
        )}
      </Dialog>
    </div>
  )
}
