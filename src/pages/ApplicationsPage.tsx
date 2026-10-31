import { useState, useMemo } from 'react'
import { useDemoData } from '@/contexts/DemoDataContext'
import { useAuth } from '@/contexts/AuthContext'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Dialog, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { EmptyState } from '@/components/ui/loading'
import { formatDate, formatCurrency } from '@/lib/utils'
import type { Application, ApplicationStatus } from '@/types/database'
import { Search, Eye, CheckCircle, XCircle, Clock, FileText, Phone, Briefcase, BedDouble, Snowflake } from 'lucide-react'

const statusVariant: Record<ApplicationStatus, 'default' | 'warning' | 'success' | 'destructive' | 'info'> = {
  submitted: 'warning',
  under_review: 'info',
  approved: 'success',
  rejected: 'destructive',
  waitlisted: 'default',
}

export function ApplicationsPage() {
  const { applications, beds, rooms, roomTypes, acRooms, updateApplicationStatus, allocateBed } = useDemoData()
  const { profile } = useAuth()
  const [tab, setTab] = useState<string>('all')
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<Application | null>(null)
  const [rejectDialog, setRejectDialog] = useState(false)
  const [rejectNote, setRejectNote] = useState('')
  const [allocateDialog, setAllocateDialog] = useState(false)
  const [selectedRoomTypeId, setSelectedRoomTypeId] = useState('')
  const [selectedBedId, setSelectedBedId] = useState('')
  const [checkInDate, setCheckInDate] = useState(new Date().toISOString().split('T')[0])
  const [depositAmount, setDepositAmount] = useState('')

  const filtered = applications
    .filter(a => tab === 'all' || a.status === tab)
    .filter(a => !search || a.full_name.toLowerCase().includes(search.toLowerCase()) || a.ref_no.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime())

  // Get available beds filtered by room type
  const availableBedsByType = useMemo(() => {
    if (!selectedRoomTypeId) return []
    const roomsOfType = rooms.filter(r => r.room_type_id === selectedRoomTypeId)
    return beds
      .filter(b => b.status === 'available' && roomsOfType.some(r => r.id === b.room_id))
      .map(b => {
        const room = rooms.find(r => r.id === b.room_id)
        const rt = roomTypes.find(t => t.id === room?.room_type_id)
        const hasAC = room ? acRooms.has(room.id) : false
        return { bed: b, room, roomType: rt, hasAC }
      })
  }, [selectedRoomTypeId, beds, rooms, roomTypes, acRooms])

  const selectedRoomType = roomTypes.find(rt => rt.id === selectedRoomTypeId)

  const handleApprove = () => {
    if (selected && selectedBedId && checkInDate) {
      const deposit = depositAmount
        ? Number(depositAmount)
        : (selectedRoomType?.rent_per_head || 0) * 2
      allocateBed(selected.id, selectedBedId, checkInDate, deposit)
      setAllocateDialog(false)
      setSelected(null)
      setSelectedBedId('')
      setSelectedRoomTypeId('')
      setDepositAmount('')
    }
  }

  const handleReject = () => {
    if (selected && rejectNote) {
      updateApplicationStatus(selected.id, 'rejected', rejectNote)
      setRejectDialog(false)
      setSelected(null)
      setRejectNote('')
    }
  }

  const handleWaitlist = () => {
    if (selected) {
      updateApplicationStatus(selected.id, 'waitlisted', 'Added to waitlist')
      setSelected(null)
    }
  }

  const openAllocate = () => {
    // Pre-select the applicant's preferred room type
    if (selected?.preferred_room_type_id) {
      setSelectedRoomTypeId(selected.preferred_room_type_id)
    }
    setAllocateDialog(true)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Applications</h1>
          <p className="text-muted-foreground text-sm">{applications.length} total applications</p>
        </div>
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search by name or ref..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="w-full sm:w-auto flex flex-wrap">
          <TabsTrigger value="all">All ({applications.length})</TabsTrigger>
          <TabsTrigger value="submitted">New ({applications.filter(a => a.status === 'submitted').length})</TabsTrigger>
          <TabsTrigger value="under_review">Review ({applications.filter(a => a.status === 'under_review').length})</TabsTrigger>
          <TabsTrigger value="approved">Approved ({applications.filter(a => a.status === 'approved').length})</TabsTrigger>
          <TabsTrigger value="rejected">Rejected ({applications.filter(a => a.status === 'rejected').length})</TabsTrigger>
          <TabsTrigger value="waitlisted">Waitlisted ({applications.filter(a => a.status === 'waitlisted').length})</TabsTrigger>
        </TabsList>

        <TabsContent value={tab}>
          {filtered.length === 0 ? (
            <EmptyState title="No applications found" description="No applications match the current filter." />
          ) : (
            <div className="grid gap-4 mt-4">
              {filtered.map((app) => (
                <Card key={app.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => setSelected(app)}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold">{app.full_name}</p>
                          <Badge variant={statusVariant[app.status]}>{app.status.replace('_', ' ')}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{app.ref_no} · {formatDate(app.submitted_at)}</p>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{app.phone}</span>
                          <span className="flex items-center gap-1"><Briefcase className="h-3 w-3" />{app.occupation}</span>
                          {app.preferred_room_type && <span className="flex items-center gap-1"><BedDouble className="h-3 w-3" />{app.preferred_room_type.name}</span>}
                          {app.preferred_ac === 'yes' && <span className="flex items-center gap-1"><Snowflake className="h-3 w-3" />AC</span>}
                        </div>
                      </div>
                      <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); setSelected(app) }}>
                        <Eye className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Application Detail Dialog */}
      <Dialog open={!!selected && !allocateDialog && !rejectDialog} onClose={() => setSelected(null)}>
        {selected && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                {selected.full_name}
                <Badge variant={statusVariant[selected.status]} className="ml-2">{selected.status.replace('_', ' ')}</Badge>
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 text-sm max-h-[60vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-x-6 gap-y-2">
                <div><p className="text-muted-foreground">Ref No</p><p className="font-medium">{selected.ref_no}</p></div>
                <div><p className="text-muted-foreground">Submitted</p><p className="font-medium">{formatDate(selected.submitted_at)}</p></div>
                <div><p className="text-muted-foreground">DOB</p><p className="font-medium">{selected.dob}</p></div>
                <div><p className="text-muted-foreground">Phone</p><p className="font-medium">{selected.phone}</p></div>
                {selected.email && <div><p className="text-muted-foreground">Email</p><p className="font-medium">{selected.email}</p></div>}
                <div className="col-span-2"><p className="text-muted-foreground">Address</p><p className="font-medium">{selected.permanent_address}</p></div>
                <div><p className="text-muted-foreground">Occupation</p><p className="font-medium">{selected.occupation}</p></div>
                <div><p className="text-muted-foreground">Institution</p><p className="font-medium">{selected.institution_or_employer}</p></div>
                <div><p className="text-muted-foreground">ID Proof</p><p className="font-medium">{selected.id_proof_type}: {selected.id_proof_no}</p></div>
                <div><p className="text-muted-foreground">Room Pref</p><p className="font-medium">{selected.preferred_room_type?.name || '—'} · AC: {selected.preferred_ac}</p></div>
              </div>
              <div className="border-t pt-3">
                <p className="font-semibold mb-2">Emergency Contact</p>
                <div className="grid grid-cols-3 gap-2">
                  <div><p className="text-muted-foreground">Name</p><p className="font-medium">{selected.emergency_name}</p></div>
                  <div><p className="text-muted-foreground">Relation</p><p className="font-medium">{selected.emergency_relation}</p></div>
                  <div><p className="text-muted-foreground">Phone</p><p className="font-medium">{selected.emergency_phone}</p></div>
                </div>
              </div>
              {selected.review_note && (
                <div className="border-t pt-3">
                  <p className="font-semibold mb-1">Review Note</p>
                  <p className="text-muted-foreground">{selected.review_note}</p>
                </div>
              )}
            </div>
            {(selected.status === 'submitted' || selected.status === 'under_review' || selected.status === 'waitlisted') && (
              <DialogFooter>
                <div className="flex flex-wrap gap-2 w-full">
                  <Button onClick={openAllocate} className="flex-1">
                    <CheckCircle className="h-4 w-4 mr-1" /> Approve & Allocate
                  </Button>
                  <Button variant="destructive" onClick={() => { setRejectDialog(true) }} className="flex-1">
                    <XCircle className="h-4 w-4 mr-1" /> Reject
                  </Button>
                  <Button variant="outline" onClick={handleWaitlist} className="flex-1">
                    <Clock className="h-4 w-4 mr-1" /> Waitlist
                  </Button>
                </div>
              </DialogFooter>
            )}
          </>
        )}
      </Dialog>

      {/* Allocate Bed Dialog - Now with room type selection first */}
      <Dialog open={allocateDialog} onClose={() => { setAllocateDialog(false); setSelectedBedId(''); setSelectedRoomTypeId(''); setDepositAmount('') }}>
        <DialogHeader>
          <DialogTitle>Allocate Bed — {selected?.full_name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {/* Step 1: Select Room Type */}
          <div>
            <Label>Room Type *</Label>
            <div className="grid grid-cols-3 gap-2 mt-2">
              {roomTypes.map(rt => {
                const availCount = beds.filter(b => b.status === 'available' && rooms.filter(r => r.room_type_id === rt.id).some(r => r.id === b.room_id)).length
                return (
                  <label
                    key={rt.id}
                    className={`p-3 border rounded-lg cursor-pointer text-center transition-colors ${
                      selectedRoomTypeId === rt.id ? 'border-primary bg-primary/5 ring-2 ring-primary/20' : 'hover:border-primary/50'
                    } ${availCount === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <input
                      type="radio"
                      name="roomType"
                      value={rt.id}
                      checked={selectedRoomTypeId === rt.id}
                      onChange={(e) => { setSelectedRoomTypeId(e.target.value); setSelectedBedId('') }}
                      disabled={availCount === 0}
                      className="sr-only"
                    />
                    <BedDouble className="h-5 w-5 mx-auto mb-1 text-primary" />
                    <p className="text-sm font-medium">{rt.name}</p>
                    <p className="text-xs text-muted-foreground">{formatCurrency(rt.rent_per_head)}/mo</p>
                    <Badge variant={availCount > 0 ? 'success' : 'destructive'} className="mt-1 text-xs">
                      {availCount} available
                    </Badge>
                  </label>
                )
              })}
            </div>
          </div>

          {/* Step 2: Select Bed (filtered by type) */}
          {selectedRoomTypeId && (
            <div>
              <Label>Select Bed * ({availableBedsByType.length} available)</Label>
              <div className="max-h-48 overflow-y-auto mt-2 space-y-1">
                {availableBedsByType.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">No beds available for this room type</p>
                ) : (
                  availableBedsByType.map(({ bed, room, hasAC }) => (
                    <label
                      key={bed.id}
                      className={`flex items-center justify-between p-3 border rounded-lg cursor-pointer transition-colors ${
                        selectedBedId === bed.id ? 'border-primary bg-primary/5' : 'hover:border-primary/50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="radio"
                          name="bed"
                          value={bed.id}
                          checked={selectedBedId === bed.id}
                          onChange={(e) => setSelectedBedId(e.target.value)}
                          className="text-primary"
                        />
                        <div>
                          <p className="font-medium text-sm">
                            Room {room?.room_no} · Bed {bed.bed_label}
                            {room?.flat_id && ` (Flat ${room?.room_no.charAt(0)})`}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Floor {room?.floor} · {selectedRoomType?.name}
                            {hasAC && ' · ❄️ AC'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {hasAC && <Snowflake className="h-4 w-4 text-blue-500" />}
                        <Badge variant="success" className="text-xs">Available</Badge>
                      </div>
                    </label>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Check-in date and deposit */}
          {selectedBedId && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Check-in Date *</Label>
                <Input type="date" value={checkInDate} onChange={(e) => setCheckInDate(e.target.value)} className="mt-1" />
              </div>
              <div>
                <Label>Deposit Amount (₹)</Label>
                <Input type="number" value={depositAmount} onChange={(e) => setDepositAmount(e.target.value)} placeholder={String((selectedRoomType?.rent_per_head || 0) * 2)} className="mt-1" />
              </div>
            </div>
          )}

          {/* Rate summary */}
          {selectedBedId && selectedRoomType && (
            <div className="p-3 bg-primary/5 rounded-lg border border-primary/20">
              <p className="text-sm"><strong>Monthly Rent:</strong> {formatCurrency(selectedRoomType.rent_per_head)} (set automatically, cannot be edited by staff)</p>
              {depositAmount && <p className="text-sm mt-1"><strong>Deposit:</strong> {formatCurrency(Number(depositAmount))}</p>}
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => { setAllocateDialog(false); setSelectedBedId(''); setSelectedRoomTypeId(''); setDepositAmount('') }}>Cancel</Button>
          <Button onClick={handleApprove} disabled={!selectedBedId || !checkInDate}>
            Allocate & Approve
          </Button>
        </DialogFooter>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={rejectDialog} onClose={() => { setRejectDialog(false); setRejectNote('') }}>
        <DialogHeader>
          <DialogTitle>Reject Application</DialogTitle>
        </DialogHeader>
        <div>
          <Label>Reason for rejection *</Label>
          <Textarea value={rejectNote} onChange={(e) => setRejectNote(e.target.value)} placeholder="Enter reason..." className="mt-1" rows={3} />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => { setRejectDialog(false); setRejectNote('') }}>Cancel</Button>
          <Button variant="destructive" onClick={handleReject} disabled={!rejectNote.trim()}>Reject</Button>
        </DialogFooter>
      </Dialog>
    </div>
  )
}
