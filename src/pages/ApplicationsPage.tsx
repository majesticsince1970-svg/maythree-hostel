import { useState, useMemo } from 'react'
import { useDemoData } from '@/contexts/DemoDataContext'
import { useAuth } from '@/contexts/AuthContext'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { useToast } from '@/components/ui/toast'
import { formatDate, formatCurrency } from '@/lib/utils'
import type { Application, ApplicationStatus, PaymentMode } from '@/types/database'
import {
  Search, Eye, CheckCircle, XCircle, Clock, FileText, Phone,
  Briefcase, BedDouble, Snowflake, Edit, UserCheck, ShieldAlert,
  Building2, KeyRound, Banknote, Calendar, Check, AlertTriangle, ArrowRight,
  ClipboardList
} from 'lucide-react'

type QueueTab = 'pending' | 'ready' | 'rejected' | 'all'

export function ApplicationsPage() {
  const {
    applications,
    beds,
    rooms,
    roomTypes,
    cashAccounts,
    acRooms,
    updateApplicationStatus,
    updateApplicationDetails,
    allocateBed
  } = useDemoData()
  const { profile } = useAuth()
  const { addToast } = useToast()

  const isStaff = profile?.role === 'admin' || profile?.role === 'staff'

  // Tab & search
  const [tab, setTab] = useState<QueueTab>('pending')
  const [search, setSearch] = useState('')

  // Dialogs
  const [selectedApp, setSelectedApp] = useState<Application | null>(null)
  const [editApp, setEditApp] = useState<Application | null>(null)
  const [rejectDialog, setRejectDialog] = useState(false)
  const [rejectNote, setRejectNote] = useState('')
  const [allocateDialog, setAllocateDialog] = useState(false)

  // Allocation form state
  const [selectedRoomTypeId, setSelectedRoomTypeId] = useState('')
  const [selectedBedId, setSelectedBedId] = useState('')
  const [checkInDate, setCheckInDate] = useState(new Date().toISOString().split('T')[0])
  const [customMonthlyRent, setCustomMonthlyRent] = useState('')
  const [depositAmount, setDepositAmount] = useState('')
  const [advanceReceived, setAdvanceReceived] = useState(true)
  const [advanceAccountId, setAdvanceAccountId] = useState('ca-3') // Rent Cash default
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Edit form state
  const [editForm, setEditForm] = useState({
    full_name: '',
    phone: '',
    email: '',
    dob: '',
    permanent_address: '',
    occupation: '',
    institution_or_employer: '',
    id_proof_type: '',
    id_proof_no: '',
    emergency_name: '',
    emergency_relation: '',
    emergency_phone: '',
  })

  // Pending counts
  const pendingCount = applications.filter(a => a.status === 'submitted' || a.status === 'under_review').length
  const readyCount = applications.filter(a => a.status === 'approved' && !a.review_note?.includes('bed allocated')).length
  const rejectedCount = applications.filter(a => a.status === 'rejected').length

  // Filtered applications
  const filtered = useMemo(() => {
    return applications
      .filter(a => {
        if (tab === 'pending') return a.status === 'submitted' || a.status === 'under_review'
        if (tab === 'ready') return a.status === 'approved' && !a.review_note?.includes('bed allocated')
        if (tab === 'rejected') return a.status === 'rejected'
        return true
      })
      .filter(a => {
        if (!search) return true
        const q = search.toLowerCase()
        return a.full_name.toLowerCase().includes(q) ||
          a.ref_no.toLowerCase().includes(q) ||
          a.phone.includes(q) ||
          a.occupation.toLowerCase().includes(q)
      })
      .sort((a, b) => new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime())
  }, [applications, tab, search])

  // Vacant beds filtered by room type
  const availableBedsByType = useMemo(() => {
    if (!selectedRoomTypeId) return []
    const roomsOfType = rooms.filter(r => r.room_type_id === selectedRoomTypeId && r.is_active)
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

  // Open Edit
  const handleOpenEdit = (app: Application) => {
    setEditApp(app)
    setEditForm({
      full_name: app.full_name,
      phone: app.phone,
      email: app.email || '',
      dob: app.dob,
      permanent_address: app.permanent_address,
      occupation: app.occupation,
      institution_or_employer: app.institution_or_employer,
      id_proof_type: app.id_proof_type,
      id_proof_no: app.id_proof_no,
      emergency_name: app.emergency_name,
      emergency_relation: app.emergency_relation,
      emergency_phone: app.emergency_phone,
    })
  }

  // Save Edit
  const handleSaveEdit = () => {
    if (!editApp) return
    updateApplicationDetails(editApp.id, editForm)
    addToast({
      type: 'success',
      title: 'Details Updated',
      description: `Applicant ${editForm.full_name}'s information has been corrected.`
    })
    if (selectedApp?.id === editApp.id) {
      setSelectedApp({ ...selectedApp, ...editForm })
    }
    setEditApp(null)
  }

  // Approve -> Moves to "Ready for Room Allocation"
  const handleApproveOnly = (app: Application) => {
    updateApplicationStatus(app.id, 'approved', 'Verified and approved by staff. Ready for room allocation.')
    addToast({
      type: 'success',
      title: 'Application Approved',
      description: `${app.full_name} is now approved. Bed can now be allocated.`
    })
    setSelectedApp(null)
  }

  // Open Allocation
  const handleOpenAllocate = (app: Application) => {
    if (app.status !== 'approved') {
      addToast({
        type: 'error',
        title: 'Verification Required',
        description: 'Application must be verified and approved before room allocation.'
      })
      return
    }
    setSelectedApp(app)
    if (app.preferred_room_type_id) {
      setSelectedRoomTypeId(app.preferred_room_type_id)
      const rt = roomTypes.find(t => t.id === app.preferred_room_type_id)
      if (rt) {
        setCustomMonthlyRent(String(rt.rent_per_head))
        setDepositAmount(String(rt.rent_per_head * 2))
      }
    }
    setAllocateDialog(true)
  }

  // Confirm Bed Allocation
  const handleConfirmAllocate = () => {
    if (!selectedApp || !selectedBedId || !checkInDate) return
    setIsSubmitting(true)

    try {
      const deposit = depositAmount ? Number(depositAmount) : (selectedRoomType?.rent_per_head || 8000) * 2
      const rent = customMonthlyRent ? Number(customMonthlyRent) : (selectedRoomType?.rent_per_head || 8000)

      allocateBed(
        selectedApp.id,
        selectedBedId,
        checkInDate,
        deposit,
        rent,
        advanceReceived,
        advanceAccountId
      )

      addToast({
        type: 'success',
        title: 'Resident Enrolled Successfully',
        description: `${selectedApp.full_name} allocated to bed. 4-digit PIN generated and advance posted to Cash Book.`
      })

      setAllocateDialog(false)
      setSelectedApp(null)
      setSelectedBedId('')
      setSelectedRoomTypeId('')
      setDepositAmount('')
      setCustomMonthlyRent('')
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Allocation Failed',
        description: err.message || 'Error allocating bed.'
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Reject Application
  const handleReject = () => {
    if (!selectedApp || !rejectNote.trim()) {
      addToast({ type: 'error', title: 'Reason Required', description: 'Please provide a reason for rejection.' })
      return
    }
    updateApplicationStatus(selectedApp.id, 'rejected', rejectNote)
    addToast({
      type: 'info',
      title: 'Application Rejected',
      description: `${selectedApp.full_name} moved to rejected queue.`
    })
    setRejectDialog(false)
    setSelectedApp(null)
    setRejectNote('')
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ClipboardList className="h-6 w-6 text-primary" />
            New Admission Verification Queue
          </h1>
          <p className="text-muted-foreground text-sm">
            Step 1: Verify submissions & documents → Step 2: Approve → Step 3: Allocate vacant bed & collect advance
          </p>
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search applicant name, ref, phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 text-xs h-9"
          />
        </div>
      </div>

      {/* Verification Queue Tabs */}
      <div className="flex flex-wrap items-center gap-1.5 p-1 bg-muted/60 rounded-xl border">
        <Button
          variant={tab === 'pending' ? 'default' : 'ghost'}
          size="sm"
          className="text-xs h-8 gap-1.5"
          onClick={() => setTab('pending')}
        >
          <Clock className="h-3.5 w-3.5" />
          Pending Verification
          {pendingCount > 0 && (
            <Badge variant="destructive" className="ml-1 text-[10px] px-1.5 py-0 h-4">
              {pendingCount}
            </Badge>
          )}
        </Button>

        <Button
          variant={tab === 'ready' ? 'default' : 'ghost'}
          size="sm"
          className="text-xs h-8 gap-1.5"
          onClick={() => setTab('ready')}
        >
          <UserCheck className="h-3.5 w-3.5" />
          Ready for Room Allocation
          {readyCount > 0 && (
            <Badge variant="secondary" className="ml-1 text-[10px] px-1.5 py-0 h-4 bg-emerald-100 text-emerald-800">
              {readyCount}
            </Badge>
          )}
        </Button>

        <Button
          variant={tab === 'rejected' ? 'default' : 'ghost'}
          size="sm"
          className="text-xs h-8 gap-1.5"
          onClick={() => setTab('rejected')}
        >
          <XCircle className="h-3.5 w-3.5" />
          Rejected ({rejectedCount})
        </Button>

        <Button
          variant={tab === 'all' ? 'default' : 'ghost'}
          size="sm"
          className="text-xs h-8"
          onClick={() => setTab('all')}
        >
          All Submissions ({applications.length})
        </Button>
      </div>

      {/* Applications List */}
      {filtered.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="p-10 text-center space-y-2">
            <ClipboardList className="h-10 w-10 text-muted-foreground mx-auto opacity-50" />
            <h3 className="font-semibold text-base">No Applications in this Queue</h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              {tab === 'pending'
                ? 'All submitted applications have been reviewed! New submissions from the QR portal will appear here.'
                : 'No applications match your active filter.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((app) => {
            const isApproved = app.status === 'approved'
            const isPending = app.status === 'submitted' || app.status === 'under_review'
            const isRejected = app.status === 'rejected'

            return (
              <Card
                key={app.id}
                className="hover:shadow-md transition-shadow cursor-pointer border flex flex-col justify-between"
                onClick={() => setSelectedApp(app)}
              >
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-sm text-foreground">{app.full_name}</span>
                        {isPending && (
                          <Badge variant="outline" className="text-[10px] bg-amber-50 text-amber-700 border-amber-200">
                            Pending Verification
                          </Badge>
                        )}
                        {isApproved && (
                          <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200">
                            Approved · Ready
                          </Badge>
                        )}
                        {isRejected && (
                          <Badge variant="destructive" className="text-[10px]">
                            Rejected
                          </Badge>
                        )}
                      </div>
                      <p className="text-[11px] text-muted-foreground font-mono mt-0.5">
                        {app.ref_no} · {formatDate(app.submitted_at)}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-foreground shrink-0"
                      onClick={(e) => {
                        e.stopPropagation()
                        setSelectedApp(app)
                      }}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="text-xs space-y-1 text-muted-foreground border-t pt-2">
                    <p className="flex items-center gap-1.5">
                      <Phone className="h-3 w-3 text-primary" />
                      <strong className="text-foreground">{app.phone}</strong>
                    </p>
                    <p className="flex items-center gap-1.5">
                      <Briefcase className="h-3 w-3" />
                      <span>{app.occupation} · {app.institution_or_employer}</span>
                    </p>
                    <p className="flex items-center gap-1.5">
                      <BedDouble className="h-3 w-3" />
                      <span>Pref: <strong>{app.preferred_room_type?.name || 'Any Room'}</strong></span>
                      {app.preferred_ac === 'yes' && <span className="text-blue-600 font-semibold">(AC)</span>}
                    </p>
                  </div>

                  {app.review_note && (
                    <div className="bg-muted/40 p-2 rounded text-[11px] text-muted-foreground">
                      <strong>Note: </strong>{app.review_note}
                    </div>
                  )}

                  {/* Direct Action Bar on card */}
                  <div className="pt-2 border-t flex items-center justify-between gap-2" onClick={(e) => e.stopPropagation()}>
                    {isPending && isStaff && (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-xs h-7 px-2 gap-1"
                          onClick={() => handleOpenEdit(app)}
                        >
                          <Edit className="h-3 w-3" /> Edit
                        </Button>
                        <div className="flex gap-1.5">
                          <Button
                            size="sm"
                            variant="destructive"
                            className="text-xs h-7 px-2"
                            onClick={() => {
                              setSelectedApp(app)
                              setRejectDialog(true)
                            }}
                          >
                            Reject
                          </Button>
                          <Button
                            size="sm"
                            className="text-xs h-7 px-2.5 gap-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                            onClick={() => handleApproveOnly(app)}
                          >
                            <CheckCircle className="h-3 w-3" /> Approve
                          </Button>
                        </div>
                      </>
                    )}

                    {isApproved && isStaff && (
                      <Button
                        size="sm"
                        className="w-full text-xs h-8 gap-1.5 shadow-sm"
                        onClick={() => handleOpenAllocate(app)}
                      >
                        <BedDouble className="h-3.5 w-3.5" />
                        Allocate Bed & Collect Advance
                      </Button>
                    )}

                    {isRejected && (
                      <span className="text-[11px] text-destructive italic">
                        Reason: {app.review_note || 'Rejected by staff'}
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* ── Detail Inspection Dialog ── */}
      <Dialog open={!!selectedApp && !allocateDialog && !rejectDialog && !editApp} onClose={() => setSelectedApp(null)}>
        {selectedApp && (
          <div className="space-y-4">
            <DialogHeader>
              <div className="flex items-center justify-between">
                <DialogTitle className="flex items-center gap-2 text-lg">
                  <FileText className="h-5 w-5 text-primary" />
                  {selectedApp.full_name}
                </DialogTitle>
                <Badge variant="outline" className="font-mono text-xs">
                  {selectedApp.ref_no}
                </Badge>
              </div>
              <DialogDescription className="text-xs">
                Submitted on {formatDate(selectedApp.submitted_at)} · Status: <strong>{selectedApp.status.toUpperCase()}</strong>
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 text-xs max-h-[65vh] overflow-y-auto pr-1">
              {/* Profile Grid */}
              <div className="grid grid-cols-2 gap-3 p-3 bg-muted/30 rounded-xl border">
                <div><span className="text-muted-foreground block text-[10px]">DOB</span><strong className="text-foreground">{selectedApp.dob}</strong></div>
                <div><span className="text-muted-foreground block text-[10px]">Phone</span><strong className="text-foreground">{selectedApp.phone}</strong></div>
                {selectedApp.email && <div><span className="text-muted-foreground block text-[10px]">Email</span><strong className="text-foreground">{selectedApp.email}</strong></div>}
                <div><span className="text-muted-foreground block text-[10px]">ID Proof</span><strong className="text-foreground">{selectedApp.id_proof_type}: {selectedApp.id_proof_no}</strong></div>
                <div><span className="text-muted-foreground block text-[10px]">Occupation</span><strong className="text-foreground">{selectedApp.occupation}</strong></div>
                <div><span className="text-muted-foreground block text-[10px]">Institution / Employer</span><strong className="text-foreground">{selectedApp.institution_or_employer}</strong></div>
                <div className="col-span-2"><span className="text-muted-foreground block text-[10px]">Permanent Address</span><strong className="text-foreground">{selectedApp.permanent_address}</strong></div>
              </div>

              {/* Preferences */}
              <div className="p-3 bg-muted/30 rounded-xl border space-y-1">
                <span className="text-muted-foreground text-[10px] uppercase font-bold tracking-wider">Accommodation Preference</span>
                <p className="text-foreground font-medium">
                  {selectedApp.preferred_room_type?.name || 'Any Room Type'} · AC: <strong className="capitalize">{selectedApp.preferred_ac}</strong>
                </p>
              </div>

              {/* Emergency Contact */}
              <div className="p-3 bg-muted/30 rounded-xl border space-y-1">
                <span className="text-muted-foreground text-[10px] uppercase font-bold tracking-wider">Emergency Contact</span>
                <div className="grid grid-cols-3 gap-2 pt-1">
                  <div><span className="text-muted-foreground text-[10px]">Name:</span> <strong className="block">{selectedApp.emergency_name}</strong></div>
                  <div><span className="text-muted-foreground text-[10px]">Relation:</span> <strong className="block">{selectedApp.emergency_relation}</strong></div>
                  <div><span className="text-muted-foreground text-[10px]">Phone:</span> <strong className="block">{selectedApp.emergency_phone}</strong></div>
                </div>
              </div>

              {/* Uploaded Documents / Photo Preview */}
              <div className="p-3 bg-muted/30 rounded-xl border space-y-2">
                <span className="text-muted-foreground text-[10px] uppercase font-bold tracking-wider">Verification Documents</span>
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-lg border bg-background text-center space-y-1.5">
                    <div className="h-16 w-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center font-bold text-lg text-primary">
                      {selectedApp.full_name.charAt(0)}
                    </div>
                    <span className="block font-semibold text-[11px]">Applicant Photo</span>
                    <Badge variant="outline" className="text-[9px] text-emerald-600 bg-emerald-50">Attached & Verified</Badge>
                  </div>
                  <div className="p-3 rounded-lg border bg-background text-center space-y-1.5">
                    <div className="h-16 w-16 mx-auto rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-mono text-xs">
                      ID CARD
                    </div>
                    <span className="block font-semibold text-[11px]">{selectedApp.id_proof_type} Copy</span>
                    <Badge variant="outline" className="text-[9px] text-emerald-600 bg-emerald-50">Attached & Verified</Badge>
                  </div>
                </div>
              </div>

              {selectedApp.review_note && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900">
                  <span className="text-[10px] font-bold uppercase">Staff Review Note</span>
                  <p className="mt-0.5">{selectedApp.review_note}</p>
                </div>
              )}
            </div>

            {/* Modal Actions */}
            {isStaff && (
              <div className="flex flex-wrap gap-2 pt-2 border-t">
                {(selectedApp.status === 'submitted' || selectedApp.status === 'under_review') && (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenEdit(selectedApp)}
                      className="text-xs"
                    >
                      <Edit className="h-3.5 w-3.5 mr-1" /> Edit Details
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => setRejectDialog(true)}
                      className="text-xs"
                    >
                      <XCircle className="h-3.5 w-3.5 mr-1" /> Reject
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleApproveOnly(selectedApp)}
                      className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white ml-auto"
                    >
                      <CheckCircle className="h-3.5 w-3.5 mr-1" /> Approve (Ready for Allocation)
                    </Button>
                  </>
                )}

                {selectedApp.status === 'approved' && (
                  <Button
                    size="sm"
                    onClick={() => handleOpenAllocate(selectedApp)}
                    className="w-full text-xs h-9 gap-1.5"
                  >
                    <BedDouble className="h-4 w-4" />
                    Allocate Bed & Advance Settlement
                  </Button>
                )}
              </div>
            )}
          </div>
        )}
      </Dialog>

      {/* ── Edit Applicant Details Dialog ── */}
      <Dialog open={!!editApp} onClose={() => setEditApp(null)}>
        {editApp && (
          <div className="space-y-4">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-base">
                <Edit className="h-4 w-4 text-primary" />
                Correct Applicant Details — {editApp.ref_no}
              </DialogTitle>
              <DialogDescription className="text-xs">
                Fix typographical errors before approving the application.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 text-xs max-h-[60vh] overflow-y-auto pr-1">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">Full Name *</Label>
                  <Input
                    value={editForm.full_name}
                    onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })}
                    className="text-xs mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs">Phone (10 digits) *</Label>
                  <Input
                    value={editForm.phone}
                    onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                    className="text-xs mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs">Date of Birth</Label>
                  <Input
                    type="date"
                    value={editForm.dob}
                    onChange={(e) => setEditForm({ ...editForm, dob: e.target.value })}
                    className="text-xs mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs">Email</Label>
                  <Input
                    value={editForm.email}
                    onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                    className="text-xs mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs">Occupation</Label>
                  <Input
                    value={editForm.occupation}
                    onChange={(e) => setEditForm({ ...editForm, occupation: e.target.value })}
                    className="text-xs mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs">Institution / Employer</Label>
                  <Input
                    value={editForm.institution_or_employer}
                    onChange={(e) => setEditForm({ ...editForm, institution_or_employer: e.target.value })}
                    className="text-xs mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs">ID Proof Type</Label>
                  <Input
                    value={editForm.id_proof_type}
                    onChange={(e) => setEditForm({ ...editForm, id_proof_type: e.target.value })}
                    className="text-xs mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs">ID Proof Number</Label>
                  <Input
                    value={editForm.id_proof_no}
                    onChange={(e) => setEditForm({ ...editForm, id_proof_no: e.target.value })}
                    className="text-xs mt-1"
                  />
                </div>
                <div className="col-span-2">
                  <Label className="text-xs">Permanent Address</Label>
                  <Input
                    value={editForm.permanent_address}
                    onChange={(e) => setEditForm({ ...editForm, permanent_address: e.target.value })}
                    className="text-xs mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs">Emergency Contact Name</Label>
                  <Input
                    value={editForm.emergency_name}
                    onChange={(e) => setEditForm({ ...editForm, emergency_name: e.target.value })}
                    className="text-xs mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs">Emergency Phone</Label>
                  <Input
                    value={editForm.emergency_phone}
                    onChange={(e) => setEditForm({ ...editForm, emergency_phone: e.target.value })}
                    className="text-xs mt-1"
                  />
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" size="sm" onClick={() => setEditApp(null)} className="text-xs">
                Cancel
              </Button>
              <Button size="sm" onClick={handleSaveEdit} className="text-xs">
                Save Corrections
              </Button>
            </DialogFooter>
          </div>
        )}
      </Dialog>

      {/* ── Room & Bed Allocation Dialog (Approved Applicants Only!) ── */}
      <Dialog
        open={allocateDialog}
        onClose={() => {
          setAllocateDialog(false)
          setSelectedBedId('')
          setSelectedRoomTypeId('')
          setDepositAmount('')
          setCustomMonthlyRent('')
        }}
      >
        <div className="space-y-4">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <BedDouble className="h-5 w-5 text-primary" />
              Room Allocation & Advance Collection
            </DialogTitle>
            <DialogDescription className="text-xs">
              Applicant: <strong>{selectedApp?.full_name}</strong> · Ref: <strong>{selectedApp?.ref_no}</strong>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 text-xs max-h-[65vh] overflow-y-auto pr-1">
            {/* Step 1: Select Room Type */}
            <div>
              <Label className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">
                1. Select Room Type
              </Label>
              <div className="grid grid-cols-3 gap-2 mt-1.5">
                {roomTypes.map((rt) => {
                  const vacantCount = beds.filter(
                    b => b.status === 'available' && rooms.filter(r => r.room_type_id === rt.id && r.is_active).some(r => r.id === b.room_id)
                  ).length
                  const isSelected = selectedRoomTypeId === rt.id

                  return (
                    <button
                      key={rt.id}
                      type="button"
                      onClick={() => {
                        setSelectedRoomTypeId(rt.id)
                        setSelectedBedId('')
                        setCustomMonthlyRent(String(rt.rent_per_head))
                        setDepositAmount(String(rt.rent_per_head * 2))
                      }}
                      disabled={vacantCount === 0}
                      className={`p-2.5 rounded-xl border text-center transition-all ${
                        isSelected
                          ? 'border-primary bg-primary/10 ring-2 ring-primary/20 shadow-sm'
                          : 'hover:border-primary/40'
                      } ${vacantCount === 0 ? 'opacity-40 cursor-not-allowed bg-muted/30' : ''}`}
                    >
                      <p className="font-bold text-xs">{rt.name}</p>
                      <p className="text-[11px] text-muted-foreground">{formatCurrency(rt.rent_per_head)}/mo</p>
                      <Badge
                        variant={vacantCount > 0 ? 'success' : 'destructive'}
                        className="mt-1 text-[9px] px-1 py-0"
                      >
                        {vacantCount} vacant
                      </Badge>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Step 2: Select Vacant Bed (Only available beds shown!) */}
            {selectedRoomTypeId && (
              <div>
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">
                    2. Select Vacant Bed ({availableBedsByType.length} Available)
                  </Label>
                </div>
                <div className="max-h-44 overflow-y-auto mt-1.5 space-y-1.5 border rounded-xl p-2 bg-muted/20">
                  {availableBedsByType.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-4">
                      No vacant beds available in this category.
                    </p>
                  ) : (
                    availableBedsByType.map(({ bed, room, hasAC }) => {
                      const isBedSelected = selectedBedId === bed.id
                      return (
                        <div
                          key={bed.id}
                          onClick={() => setSelectedBedId(bed.id)}
                          className={`flex items-center justify-between p-2.5 border rounded-lg cursor-pointer transition-colors ${
                            isBedSelected
                              ? 'border-primary bg-primary/10 shadow-sm'
                              : 'hover:border-primary/40 bg-background'
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <input
                              type="radio"
                              name="bedSelect"
                              checked={isBedSelected}
                              onChange={() => setSelectedBedId(bed.id)}
                              className="text-primary"
                            />
                            <div>
                              <p className="font-bold text-xs">
                                Room {room?.room_no} · Bed {bed.bed_label}
                              </p>
                              <p className="text-[10px] text-muted-foreground">
                                Floor {room?.floor} · {selectedRoomType?.name}
                                {hasAC && ' · ❄️ AC equipped'}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5">
                            {hasAC && <Snowflake className="h-3.5 w-3.5 text-blue-500" />}
                            <Badge variant="success" className="text-[10px]">Vacant</Badge>
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>
              </div>
            )}

            {/* Step 3: Terms & Advance Collection */}
            {selectedBedId && (
              <div className="space-y-3 p-3 bg-muted/40 rounded-xl border">
                <Label className="text-xs font-semibold uppercase text-muted-foreground tracking-wider block">
                  3. Terms & Advance Payment
                </Label>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-[11px]">Admission Date *</Label>
                    <Input
                      type="date"
                      value={checkInDate}
                      onChange={(e) => setCheckInDate(e.target.value)}
                      className="text-xs mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-[11px]">Monthly Rent (₹)</Label>
                    <Input
                      type="number"
                      value={customMonthlyRent}
                      onChange={(e) => setCustomMonthlyRent(e.target.value)}
                      className="text-xs mt-1 font-mono"
                    />
                  </div>
                </div>

                <div>
                  <Label className="text-[11px]">Security Deposit / Advance Amount (₹) *</Label>
                  <Input
                    type="number"
                    value={depositAmount}
                    onChange={(e) => setDepositAmount(e.target.value)}
                    className="text-xs mt-1 font-mono font-bold"
                  />
                </div>

                {/* Advance Received Checkbox & Account */}
                <div className="p-3 bg-background rounded-lg border space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-medium">
                    <input
                      type="checkbox"
                      checked={advanceReceived}
                      onChange={(e) => setAdvanceReceived(e.target.checked)}
                      className="rounded text-primary h-4 w-4"
                    />
                    <span>Advance payment received from applicant right now</span>
                  </label>

                  {advanceReceived && (
                    <div className="pl-6 space-y-1">
                      <Label className="text-[10px] text-muted-foreground">Post to Cash Book Account:</Label>
                      <select
                        value={advanceAccountId}
                        onChange={(e) => setAdvanceAccountId(e.target.value)}
                        className="w-full text-xs p-1.5 border rounded bg-background"
                      >
                        {cashAccounts.filter(a => a.is_active).map(acc => (
                          <option key={acc.id} value={acc.id}>
                            {acc.name} ({acc.kind.toUpperCase()}) — Bal: {formatCurrency(acc.balance || 0)}
                          </option>
                        ))}
                      </select>
                      <p className="text-[10px] text-emerald-600 flex items-center gap-1">
                        <Check className="h-3 w-3" />
                        Will automatically post <strong>{formatCurrency(Number(depositAmount) || 0)}</strong> as Cash IN
                      </p>
                    </div>
                  )}
                </div>

                <div className="p-2.5 bg-primary/10 border border-primary/20 rounded-lg text-xs space-y-1">
                  <p className="font-semibold text-primary flex items-center gap-1.5">
                    <KeyRound className="h-3.5 w-3.5" />
                    Resident PIN Generation:
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    A unique 4-digit entrance door PIN will be auto-generated and linked to {selectedApp?.full_name}.
                  </p>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setAllocateDialog(false)
                setSelectedBedId('')
                setSelectedRoomTypeId('')
              }}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={!selectedBedId || !checkInDate || isSubmitting}
              onClick={handleConfirmAllocate}
              className="text-xs gap-1.5 bg-primary"
            >
              <Check className="h-4 w-4" />
              {isSubmitting ? 'Enrolling...' : 'Confirm Room Allocation & Enroll'}
            </Button>
          </DialogFooter>
        </div>
      </Dialog>

      {/* ── Reject Reason Dialog ── */}
      <Dialog open={rejectDialog} onClose={() => { setRejectDialog(false); setRejectNote('') }}>
        <div className="space-y-4">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base text-destructive">
              <AlertTriangle className="h-4 w-4" />
              Reject Application — {selectedApp?.full_name}
            </DialogTitle>
            <DialogDescription className="text-xs">
              A rejection reason is required for audit compliance and applicant records.
            </DialogDescription>
          </DialogHeader>

          <div>
            <Label className="text-xs">Reason for Rejection *</Label>
            <Textarea
              value={rejectNote}
              onChange={(e) => setRejectNote(e.target.value)}
              placeholder="e.g. Incomplete ID proof, hostel rules disagreement, no vacancies for preferred block..."
              rows={3}
              className="text-xs mt-1"
            />
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => { setRejectDialog(false); setRejectNote('') }} className="text-xs">
              Cancel
            </Button>
            <Button variant="destructive" size="sm" onClick={handleReject} disabled={!rejectNote.trim()} className="text-xs">
              Confirm Rejection
            </Button>
          </DialogFooter>
        </div>
      </Dialog>
    </div>
  )
}
