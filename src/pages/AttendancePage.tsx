import { useState, useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useDemoData } from '@/contexts/DemoDataContext'
import { useAuth } from '@/contexts/AuthContext'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { formatCurrency, formatDate } from '@/lib/utils'
import { useToast } from '@/components/ui/toast'
import {
  Clock, ArrowRightLeft, UserCheck, UserX,
  Tablet, Search, CheckCircle2, AlertTriangle, ArrowDownRight, ArrowUpRight
} from 'lucide-react'

export function AttendancePage() {
  const { residents } = useDemoData()
  const { profile } = useAuth()
  const navigate = useNavigate()
  const { addToast } = useToast()
  const [searchParams, setSearchParams] = useSearchParams()
  const currentTab = searchParams.get('tab') || 'live'
  const [search, setSearch] = useState('')
  const [showManualModal, setShowManualModal] = useState(false)
  const [selectedResidentId, setSelectedResidentId] = useState('')
  const [manualDirection, setManualDirection] = useState<'IN' | 'OUT'>('OUT')
  const [manualNote, setManualNote] = useState('')

  const activeResidents = useMemo(() => residents.filter(r => r.status === 'active'), [residents])

  // Baseline movement logs
  const [movements, setMovements] = useState([
    { id: 'mov-1', residentId: 'res-1', residentName: 'Kavya Nair', roomNo: '201-A', direction: 'IN' as const, time: '2026-10-31 20:45', note: 'Regular return' },
    { id: 'mov-2', residentId: 'res-2', residentName: 'Meera Iyer', roomNo: '301-A', direction: 'OUT' as const, time: '2026-10-31 18:30', note: 'Office overtime' },
    { id: 'mov-3', residentId: 'res-3', residentName: 'Roshni Das', roomNo: 'B1-A', direction: 'IN' as const, time: '2026-10-31 17:15', note: 'Returned from college' },
  ])

  // Determine current resident status from movements
  const residentStatuses = useMemo(() => {
    const map = new Map<string, { status: 'IN' | 'OUT'; lastTime: string; note?: string }>()
    // Defaults: residents are IN unless last movement is OUT
    for (const r of activeResidents) {
      map.set(r.id, { status: 'IN', lastTime: 'Hostel' })
    }
    // Apply movements
    for (const m of movements) {
      if (map.has(m.residentId)) {
        map.set(m.residentId, { status: m.direction, lastTime: m.time, note: m.note })
      }
    }
    return map
  }, [activeResidents, movements])

  const insideResidents = activeResidents.filter(r => (residentStatuses.get(r.id)?.status || 'IN') === 'IN')
  const outsideResidents = activeResidents.filter(r => residentStatuses.get(r.id)?.status === 'OUT')

  const handleManualSubmit = () => {
    if (!selectedResidentId) {
      addToast({ type: 'error', title: 'Select Resident', description: 'Please select a resident to record movement.' })
      return
    }

    const res = activeResidents.find(r => r.id === selectedResidentId)
    const nowTime = new Date().toISOString().replace('T', ' ').slice(0, 16)

    const newMov = {
      id: `mov-${Date.now()}`,
      residentId: selectedResidentId,
      residentName: res?.application?.full_name || 'Resident',
      roomNo: res?.bed?.room?.room_no || '—',
      direction: manualDirection,
      time: nowTime,
      note: manualNote.trim() || `Manual entry by ${profile?.name || 'Staff'}`
    }

    setMovements(prev => [newMov, ...prev])
    addToast({
      type: 'success',
      title: `Resident Marked ${manualDirection}`,
      description: `${res?.application?.full_name} marked ${manualDirection} successfully.`
    })

    setShowManualModal(false)
    setSelectedResidentId('')
    setManualNote('')
  }

  const filteredInside = insideResidents.filter(r =>
    !search ||
    r.application?.full_name.toLowerCase().includes(search.toLowerCase()) ||
    r.bed?.room?.room_no.includes(search)
  )

  const filteredOutside = outsideResidents.filter(r =>
    !search ||
    r.application?.full_name.toLowerCase().includes(search.toLowerCase()) ||
    r.bed?.room?.room_no.includes(search)
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Clock className="h-6 w-6 text-primary" />
            Attendance (In / Out)
          </h1>
          <p className="text-muted-foreground text-sm">
            Real-time hostel ingress/egress, PIN kiosk status, and movement history
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowManualModal(true)}
            className="text-xs"
          >
            <ArrowRightLeft className="h-3.5 w-3.5 mr-1.5" />
            Manual Entry
          </Button>
          <Button
            size="sm"
            onClick={() => navigate('/attendance/kiosk')}
            className="text-xs shadow-sm bg-gradient-to-r from-primary to-primary/90"
          >
            <Tablet className="h-3.5 w-3.5 mr-1.5" />
            Launch Entrance Kiosk
          </Button>
        </div>
      </div>

      {/* 3 Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-l-4 border-l-primary shadow-sm">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-muted-foreground">Total Active Residents</p>
              <p className="text-3xl font-extrabold mt-1 text-foreground">{activeResidents.length}</p>
            </div>
            <div className="h-12 w-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <UserCheck className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500 shadow-sm">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-muted-foreground">Inside Hostel Now</p>
              <p className="text-3xl font-extrabold mt-1 text-green-600 dark:text-green-400">{insideResidents.length}</p>
            </div>
            <div className="h-12 w-12 rounded-xl bg-green-500/10 text-green-600 dark:text-green-400 flex items-center justify-center">
              <ArrowDownRight className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-amber-500 shadow-sm">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-muted-foreground">Outside Hostel Now</p>
              <p className="text-3xl font-extrabold mt-1 text-amber-600 dark:text-amber-400">{outsideResidents.length}</p>
            </div>
            <div className="h-12 w-12 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <ArrowUpRight className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Sub Tabs */}
      <div className="flex flex-wrap items-center gap-2 p-1.5 bg-muted/60 rounded-xl border">
        <Button
          variant={currentTab === 'live' ? 'default' : 'ghost'}
          size="sm"
          className="text-xs h-9"
          onClick={() => setSearchParams({ tab: 'live' })}
        >
          <UserCheck className="h-4 w-4 mr-1.5" />
          Who is Inside / Outside
        </Button>
        <Button
          variant={currentTab === 'log' ? 'default' : 'ghost'}
          size="sm"
          className="text-xs h-9"
          onClick={() => setSearchParams({ tab: 'log' })}
        >
          <ArrowRightLeft className="h-4 w-4 mr-1.5" />
          Daily Movement Log ({movements.length})
        </Button>
      </div>

      {/* Content */}
      {currentTab === 'live' && (
        <div className="space-y-4">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by resident name or room..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Inside List */}
            <Card className="border-green-500/30">
              <CardHeader className="pb-3 border-b flex flex-row items-center justify-between bg-green-500/5">
                <CardTitle className="text-base flex items-center gap-2 text-green-700 dark:text-green-400">
                  <CheckCircle2 className="h-4 w-4" />
                  Inside the Hostel ({filteredInside.length})
                </CardTitle>
                <Badge variant="outline" className="text-green-700 dark:text-green-400 border-green-500/40">Present</Badge>
              </CardHeader>
              <CardContent className="pt-4">
                {filteredInside.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-6">No residents currently marked inside</p>
                ) : (
                  <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                    {filteredInside.map(r => (
                      <div key={r.id} className="flex items-center justify-between p-3 bg-muted/40 rounded-lg border">
                        <div>
                          <p className="font-semibold text-sm text-foreground">{r.application?.full_name}</p>
                          <p className="text-xs text-muted-foreground">
                            Room {r.bed?.room?.room_no || '—'} · Bed {r.bed?.bed_label}
                          </p>
                        </div>
                        <Badge variant="success" className="text-[10px]">IN</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Outside List */}
            <Card className="border-amber-500/30">
              <CardHeader className="pb-3 border-b flex flex-row items-center justify-between bg-amber-500/5">
                <CardTitle className="text-base flex items-center gap-2 text-amber-700 dark:text-amber-400">
                  <UserX className="h-4 w-4" />
                  Outside the Hostel ({filteredOutside.length})
                </CardTitle>
                <Badge variant="outline" className="text-amber-700 dark:text-amber-400 border-amber-500/40">Out</Badge>
              </CardHeader>
              <CardContent className="pt-4">
                {filteredOutside.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-6">All residents are currently inside the hostel</p>
                ) : (
                  <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                    {filteredOutside.map(r => {
                      const st = residentStatuses.get(r.id)
                      return (
                        <div key={r.id} className="flex items-center justify-between p-3 bg-muted/40 rounded-lg border">
                          <div>
                            <p className="font-semibold text-sm text-foreground">{r.application?.full_name}</p>
                            <p className="text-xs text-muted-foreground">
                              Room {r.bed?.room?.room_no || '—'} · Left at: {st?.lastTime || 'Earlier today'}
                            </p>
                            {st?.note && <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-0.5 font-medium">{st.note}</p>}
                          </div>
                          <Badge variant="warning" className="text-[10px]">OUT</Badge>
                        </div>
                      )
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {currentTab === 'log' && (
        <Card>
          <CardHeader className="pb-3 border-b">
            <CardTitle className="text-base">Movement & Kiosk Log</CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="space-y-2.5">
              {movements.map((m) => (
                <div key={m.id} className="flex items-center justify-between p-3 bg-muted/40 rounded-lg border text-sm">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-full ${m.direction === 'IN' ? 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400' : 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400'}`}>
                      {m.direction === 'IN' ? <ArrowDownRight className="h-4 w-4" /> : <ArrowUpRight className="h-4 w-4" />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-foreground">{m.residentName}</span>
                        <Badge variant={m.direction === 'IN' ? 'success' : 'warning'} className="text-[10px] py-0 px-1.5">
                          {m.direction}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Room {m.roomNo} · {m.time} {m.note && `· ${m.note}`}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Manual In/Out Modal */}
      <Dialog open={showManualModal} onClose={() => setShowManualModal(false)}>
        <DialogHeader>
          <DialogTitle>Manual Attendance Override</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Resident *</Label>
            <select
              value={selectedResidentId}
              onChange={(e) => setSelectedResidentId(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm mt-1"
            >
              <option value="">Select resident...</option>
              {activeResidents.map(r => (
                <option key={r.id} value={r.id}>
                  {r.application?.full_name} (Room {r.bed?.room?.room_no || '—'})
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label>Direction *</Label>
            <div className="grid grid-cols-2 gap-2 mt-1">
              <Button
                type="button"
                variant={manualDirection === 'IN' ? 'default' : 'outline'}
                className="w-full"
                onClick={() => setManualDirection('IN')}
              >
                Mark IN
              </Button>
              <Button
                type="button"
                variant={manualDirection === 'OUT' ? 'default' : 'outline'}
                className="w-full"
                onClick={() => setManualDirection('OUT')}
              >
                Mark OUT
              </Button>
            </div>
          </div>
          <div>
            <Label>Reason / Note</Label>
            <Input
              value={manualNote}
              onChange={(e) => setManualNote(e.target.value)}
              placeholder="e.g. Forgot PIN, emergency leave, phone check-in"
              className="mt-1"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setShowManualModal(false)}>Cancel</Button>
          <Button onClick={handleManualSubmit} disabled={!selectedResidentId}>Save Movement</Button>
        </DialogFooter>
      </Dialog>
    </div>
  )
}

