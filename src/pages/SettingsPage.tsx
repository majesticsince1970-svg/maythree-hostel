import { useState, useMemo } from 'react'
import { useDemoData } from '@/contexts/DemoDataContext'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Dialog, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { useToast } from '@/components/ui/toast'
import { formatCurrency } from '@/lib/utils'
import { Settings, BedDouble, Users, QrCode, Download, Edit, Plus, Trash2, Snowflake, ArrowRightLeft, ChevronLeft, ChevronRight, Key } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import type { StaffProfile, StaffRole } from '@/types/database'

const ROOMS_PER_PAGE = 20

export function SettingsPage() {
  const {
    roomTypes, rooms, beds, acRooms,
    staffList,
    updateRoomType,
    addStaff, updateStaff, removeStaff,
    updateRoomConfig, addBedToRoom, removeBedFromRoom, toggleRoomAC,
    checkoutRentRule, setCheckoutRentRule,
  } = useDemoData()
  const { addToast } = useToast()
  const [tab, setTab] = useState('rooms')

  // Edit Rent states
  const [editRentDialog, setEditRentDialog] = useState(false)
  const [editRentTypeId, setEditRentTypeId] = useState('')
  const [editRentValue, setEditRentValue] = useState('')

  // Add Staff states
  const [addStaffDialog, setAddStaffDialog] = useState(false)
  const [newStaffName, setNewStaffName] = useState('')
  const [newStaffUsername, setNewStaffUsername] = useState('')
  const [newStaffEmail, setNewStaffEmail] = useState('')
  const [newStaffPassword, setNewStaffPassword] = useState('')
  const [newStaffRole, setNewStaffRole] = useState<StaffRole>('staff')

  // Edit Staff states
  const [editStaffDialog, setEditStaffDialog] = useState(false)
  const [editStaffName, setEditStaffName] = useState('')
  const [editStaffUsername, setEditStaffUsername] = useState('')
  const [editStaffEmail, setEditStaffEmail] = useState('')
  const [editStaffPassword, setEditStaffPassword] = useState('')
  const [editStaffRole, setEditStaffRole] = useState<StaffRole>('staff')
  const [editStaffUserId, setEditStaffUserId] = useState('')

  // Reset Password states
  const [resetPwdDialog, setResetPwdDialog] = useState(false)
  const [resetPwdStaff, setResetPwdStaff] = useState<StaffProfile | null>(null)
  const [newPasswordVal, setNewPasswordVal] = useState('')

  // Room config states
  const [roomConfigDialog, setRoomConfigDialog] = useState(false)
  const [configRoomId, setConfigRoomId] = useState('')
  const [configRoomNo, setConfigRoomNo] = useState('')
  const [configAction, setConfigAction] = useState<'change_type' | 'add_bed' | 'remove_bed' | 'toggle_ac'>('change_type')
  const [configNewTypeId, setConfigNewTypeId] = useState('')
  const [configRemoveBedId, setConfigRemoveBedId] = useState('')

  // Room config pagination
  const [roomPage, setRoomPage] = useState(0)

  const qrUrl = typeof window !== 'undefined' ? `${window.location.origin}/apply` : '/apply'

  // Paginated rooms
  const totalPages = Math.ceil(rooms.length / ROOMS_PER_PAGE)
  const pagedRooms = useMemo(
    () => rooms.slice(roomPage * ROOMS_PER_PAGE, (roomPage + 1) * ROOMS_PER_PAGE),
    [rooms, roomPage]
  )

  // ── Handlers ──

  const handleEditRent = () => {
    if (!editRentTypeId || !editRentValue) return
    const newRent = Number(editRentValue)
    if (isNaN(newRent) || newRent < 0) return
    updateRoomType(editRentTypeId, { rent_per_head: newRent })
    const typeName = roomTypes.find(rt => rt.id === editRentTypeId)?.name
    addToast({ type: 'success', title: 'Rent updated', description: `${typeName}: ${formatCurrency(newRent)}/head` })
    setEditRentDialog(false)
    setEditRentTypeId('')
    setEditRentValue('')
  }

  const handleAddStaff = () => {
    if (!newStaffName || !newStaffEmail || !newStaffPassword) return
    const cleanEmail = newStaffEmail.trim().toLowerCase()
    const cleanUsername = newStaffUsername.trim().toLowerCase() || cleanEmail.split('@')[0]
    const newStaffProfile: StaffProfile = {
      user_id: `staff-${Date.now()}`,
      name: newStaffName.trim(),
      email: cleanEmail,
      username: cleanUsername,
      password: newStaffPassword,
      role: newStaffRole,
      created_at: new Date().toISOString()
    }
    addStaff(newStaffProfile)
    addToast({ type: 'success', title: 'Staff account created', description: `${newStaffName} (${newStaffRole}) - Login credentials active` })
    setAddStaffDialog(false)
    setNewStaffName('')
    setNewStaffUsername('')
    setNewStaffEmail('')
    setNewStaffPassword('')
    setNewStaffRole('staff')
  }

  const handleEditStaff = () => {
    if (!editStaffName || !editStaffEmail) return
    const cleanEmail = editStaffEmail.trim().toLowerCase()
    const cleanUsername = editStaffUsername.trim().toLowerCase() || cleanEmail.split('@')[0]
    const updates: Partial<StaffProfile> = {
      name: editStaffName.trim(),
      email: cleanEmail,
      username: cleanUsername,
      role: editStaffRole
    }
    if (editStaffPassword.trim()) {
      updates.password = editStaffPassword.trim()
    }
    updateStaff(editStaffUserId, updates)
    addToast({ type: 'success', title: 'Staff account updated', description: `${editStaffName}` })
    setEditStaffDialog(false)
  }

  const handleResetPassword = () => {
    if (!resetPwdStaff || !newPasswordVal.trim()) return
    updateStaff(resetPwdStaff.user_id, { password: newPasswordVal.trim() })
    addToast({ type: 'success', title: 'Password updated', description: `Login password set for ${resetPwdStaff.name}` })
    setResetPwdDialog(false)
    setNewPasswordVal('')
  }

  const handleDeleteStaff = (staff: StaffProfile) => {
    if (staff.email === 'admin@maythree.com' || (staff.role === 'admin' && staffList.filter(s => s.role === 'admin').length <= 1)) {
      addToast({ type: 'error', title: 'Cannot delete the main admin account' })
      return
    }
    removeStaff(staff.user_id)
    addToast({ type: 'info', title: 'Staff account removed' })
  }

  const openEditStaff = (staff: StaffProfile) => {
    setEditStaffUserId(staff.user_id)
    setEditStaffName(staff.name)
    setEditStaffUsername(staff.username || (staff.email ? staff.email.split('@')[0] : ''))
    setEditStaffEmail(staff.email || '')
    setEditStaffPassword(staff.password || '')
    setEditStaffRole(staff.role)
    setEditStaffDialog(true)
  }

  const openResetPassword = (staff: StaffProfile) => {
    setResetPwdStaff(staff)
    setNewPasswordVal(staff.password || 'admin123')
    setResetPwdDialog(true)
  }

  const handleRoomConfig = () => {
    if (!configRoomId) return
    if (configAction === 'change_type') {
      if (!configNewTypeId) return
      updateRoomConfig(configRoomId, { room_type_id: configNewTypeId })
      const newType = roomTypes.find(rt => rt.id === configNewTypeId)
      addToast({ type: 'success', title: 'Room type changed', description: `Room ${configRoomNo} → ${newType?.name}` })
    } else if (configAction === 'add_bed') {
      addBedToRoom(configRoomId)
      addToast({ type: 'success', title: 'Bed added', description: `New bed added to Room ${configRoomNo}` })
    } else if (configAction === 'remove_bed') {
      if (!configRemoveBedId) {
        addToast({ type: 'error', title: 'Select a bed to remove' })
        return
      }
      removeBedFromRoom(configRemoveBedId)
      addToast({ type: 'success', title: 'Bed removed', description: `Bed removed from Room ${configRoomNo}` })
    } else if (configAction === 'toggle_ac') {
      toggleRoomAC(configRoomId)
      const hadAC = acRooms.has(configRoomId)
      addToast({
        type: hadAC ? 'info' : 'success',
        title: hadAC ? 'AC removed' : 'AC added',
        description: `Room ${configRoomNo} is now ${hadAC ? 'Non-AC' : 'AC'}`,
      })
    }
    setRoomConfigDialog(false)
    setConfigRoomId('')
    setConfigRoomNo('')
    setConfigRemoveBedId('')
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-muted-foreground text-sm">Manage hostel configuration</p>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="rooms">Room Types & Rents</TabsTrigger>
          <TabsTrigger value="room_config">Room Config</TabsTrigger>
          <TabsTrigger value="staff">Staff Accounts</TabsTrigger>
          <TabsTrigger value="checkout_rules">Checkout Rules</TabsTrigger>
          <TabsTrigger value="qr">QR Code</TabsTrigger>
        </TabsList>

        {/* Room Types & Rents */}
        <TabsContent value="rooms">
          <Card className="mt-4">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <BedDouble className="h-5 w-5" /> Room Types & Rents
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Beds/Room</TableHead>
                    <TableHead>Rent/Head</TableHead>
                    <TableHead>Attached Toilet</TableHead>
                    <TableHead>Rooms</TableHead>
                    <TableHead>Total Beds</TableHead>
                    <TableHead>Occupied</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {roomTypes.map(rt => {
                    const rtRooms = rooms.filter(r => r.room_type_id === rt.id)
                    const rtBeds = beds.filter(b => rtRooms.some(r => r.id === b.room_id))
                    const occupiedBeds = rtBeds.filter(b => b.status === 'occupied').length
                    return (
                      <TableRow key={rt.id}>
                        <TableCell className="font-medium">{rt.name}</TableCell>
                        <TableCell>{rt.beds_per_room}</TableCell>
                        <TableCell className="font-semibold">{formatCurrency(rt.rent_per_head)}</TableCell>
                        <TableCell>{rt.has_attached_toilet ? '✅' : '❌'}</TableCell>
                        <TableCell>{rtRooms.length}</TableCell>
                        <TableCell>{rtBeds.length}</TableCell>
                        <TableCell>
                          <Badge variant={occupiedBeds === rtBeds.length ? 'destructive' : 'outline'}>
                            {occupiedBeds}/{rtBeds.length}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm" onClick={() => {
                            setEditRentTypeId(rt.id)
                            setEditRentValue(String(rt.rent_per_head))
                            setEditRentDialog(true)
                          }}>
                            <Edit className="h-4 w-4 mr-1" /> Edit Rent
                          </Button>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
              <div className="mt-4 p-4 bg-muted/50 rounded-lg">
                <p className="text-sm"><strong>Total:</strong> {rooms.length} rooms · {beds.length} beds · Full occupancy: {formatCurrency(beds.reduce((s, bed) => {
                  const room = rooms.find(r => r.id === bed.room_id)
                  const rt = roomTypes.find(t => t.id === room?.room_type_id)
                  return s + (rt?.rent_per_head || 0)
                }, 0))}/month</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Room Configuration */}
        <TabsContent value="room_config">
          <Card className="mt-4">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <ArrowRightLeft className="h-5 w-5" /> Room Configuration
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">Change room types, add/remove beds, toggle AC for individual rooms.</p>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Room</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Floor</TableHead>
                    <TableHead>Beds</TableHead>
                    <TableHead>AC</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pagedRooms.map(room => {
                    const rt = roomTypes.find(r => r.id === room.room_type_id)
                    const roomBeds = beds.filter(b => b.room_id === room.id)
                    const hasAC = acRooms.has(room.id)
                    return (
                      <TableRow key={room.id}>
                        <TableCell className="font-medium">{room.room_no}</TableCell>
                        <TableCell>{rt?.name}</TableCell>
                        <TableCell>{room.floor}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{roomBeds.length} beds</Badge>
                        </TableCell>
                        <TableCell>
                          {hasAC ? (
                            <Badge variant="info" className="gap-1"><Snowflake className="h-3 w-3" />AC</Badge>
                          ) : (
                            <span className="text-muted-foreground text-sm">Non-AC</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm" onClick={() => {
                            setConfigRoomId(room.id)
                            setConfigRoomNo(room.room_no)
                            setConfigNewTypeId(room.room_type_id)
                            setConfigRemoveBedId('')
                            setRoomConfigDialog(true)
                          }}>
                            <Edit className="h-4 w-4 mr-1" /> Configure
                          </Button>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <p className="text-sm text-muted-foreground">
                    Showing {roomPage * ROOMS_PER_PAGE + 1}–{Math.min((roomPage + 1) * ROOMS_PER_PAGE, rooms.length)} of {rooms.length} rooms
                  </p>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" disabled={roomPage === 0} onClick={() => setRoomPage(p => p - 1)}>
                      <ChevronLeft className="h-4 w-4 mr-1" /> Prev
                    </Button>
                    <Button variant="outline" size="sm" disabled={roomPage >= totalPages - 1} onClick={() => setRoomPage(p => p + 1)}>
                      Next <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Staff Accounts */}
        <TabsContent value="staff">
          <Card className="mt-4">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <Users className="h-5 w-5" /> Staff Accounts
              </CardTitle>
              <Button size="sm" onClick={() => setAddStaffDialog(true)}>
                <Plus className="h-4 w-4 mr-1" /> Add Staff
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Username / Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Login Access</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {staffList.map((staff) => (
                    <TableRow key={staff.user_id}>
                      <TableCell className="font-medium">{staff.name}</TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-mono text-xs text-foreground font-semibold">
                            {staff.username || (staff.email ? staff.email.split('@')[0] : '—')}
                          </span>
                          <span className="text-xs text-muted-foreground">{staff.email || '—'}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={staff.role === 'admin' ? 'default' : staff.role === 'staff' ? 'secondary' : 'outline'}>
                          {staff.role.replace('_', ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="inline-flex items-center text-xs font-mono bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded border border-emerald-500/20">
                          Active · Ready
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="sm" onClick={() => openResetPassword(staff)} title="Change or Reset Login Password">
                            <Key className="h-4 w-4 mr-1 text-amber-600" /> Password
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => openEditStaff(staff)}>
                            <Edit className="h-4 w-4 mr-1" /> Edit
                          </Button>
                          {staff.email !== 'admin@maythree.com' && (
                            <Button variant="ghost" size="sm" className="text-destructive" onClick={() => handleDeleteStaff(staff)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Checkout Settlement Rules */}
        <TabsContent value="checkout_rules">
          <Card className="mt-4">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Settings className="h-5 w-5 text-primary" /> Checkout Settlement & Rent Calculation Rules
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h4 className="text-sm font-semibold mb-1">Current Month Rent Rule on Checkout</h4>
                <p className="text-xs text-muted-foreground mb-4">
                  Controls how the system automatically calculates the rent for the month in which a resident vacates.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div
                    onClick={() => {
                      setCheckoutRentRule('per_day')
                      addToast({ type: 'success', title: 'Rule updated', description: 'Rent rule set to Per-day pro-rata' })
                    }}
                    className={`cursor-pointer p-4 rounded-xl border-2 transition-all space-y-2 ${
                      checkoutRentRule === 'per_day'
                        ? 'border-primary bg-primary/5 ring-1 ring-primary'
                        : 'border-muted hover:border-muted-foreground/30'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-sm">Per-Day Pro-Rata (Days Stayed)</span>
                      {checkoutRentRule === 'per_day' && (
                        <Badge variant="default" className="text-[10px]">Active Rule</Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Calculates daily rate = Monthly Rent / Days in Month, then multiplies by the exact number of days stayed up to the checkout date.
                    </p>
                    <div className="text-[11px] font-mono bg-muted/60 p-2 rounded text-muted-foreground">
                      Example: ₹6,500 / 30 days × 12 days = ₹2,600
                    </div>
                  </div>

                  <div
                    onClick={() => {
                      setCheckoutRentRule('full_month')
                      addToast({ type: 'success', title: 'Rule updated', description: 'Rent rule set to Full month rent' })
                    }}
                    className={`cursor-pointer p-4 rounded-xl border-2 transition-all space-y-2 ${
                      checkoutRentRule === 'full_month'
                        ? 'border-primary bg-primary/5 ring-1 ring-primary'
                        : 'border-muted hover:border-muted-foreground/30'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-sm">Full Month's Rent</span>
                      {checkoutRentRule === 'full_month' && (
                        <Badge variant="default" className="text-[10px]">Active Rule</Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Charges the resident for the full calendar month regardless of the day of departure.
                    </p>
                    <div className="text-[11px] font-mono bg-muted/60 p-2 rounded text-muted-foreground">
                      Example: Checking out on 12th = Full ₹6,500 due
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-muted/40 rounded-xl border space-y-2 text-xs">
                <h5 className="font-semibold">Automatic Checkout Settlement Posting</h5>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                  <li><strong>Security Deposit:</strong> Held advance is applied against unpaid rent and itemized deductions (damages, store dues).</li>
                  <li><strong>Refunds:</strong> Net positive amounts post automatically as Cash OUT to the Cash Book.</li>
                  <li><strong>Collections:</strong> Net negative amounts post automatically as Cash IN to the Cash Book.</li>
                  <li><strong>Official Receipts:</strong> A sequential numbered receipt (CKR-2026-XXXX) with dual signatures is generated and saved.</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* QR Code */}
        <TabsContent value="qr">
          <Card className="mt-4">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <QrCode className="h-5 w-5" /> Admission QR Code
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center space-y-4">
              <div className="p-8 bg-white rounded-lg border-2 border-dashed">
                <QRCodeSVG value={qrUrl} size={200} />
              </div>
              <p className="text-sm text-muted-foreground text-center max-w-sm">
                Print this QR code and place it at the hostel reception. Applicants scan it to open the admission form.
              </p>
              <p className="text-xs font-mono text-muted-foreground">{qrUrl}</p>
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => {
                  const svg = document.querySelector('.p-8.bg-white svg')
                  if (svg) {
                    const svgData = new XMLSerializer().serializeToString(svg)
                    const canvas = document.createElement('canvas')
                    canvas.width = 400; canvas.height = 400
                    const ctx = canvas.getContext('2d')
                    const img = new Image()
                    img.onload = () => {
                      ctx?.drawImage(img, 0, 0, 400, 400)
                      const a = document.createElement('a')
                      a.download = 'mythree-hostel-qr.png'
                      a.href = canvas.toDataURL('image/png')
                      a.click()
                    }
                    img.src = 'data:image/svg+xml;base64,' + btoa(svgData)
                    addToast({ type: 'success', title: 'QR code downloaded' })
                  }
                }}>
                  <Download className="h-4 w-4 mr-2" /> Download PNG
                </Button>
                <Button onClick={() => window.print()}>
                  <Download className="h-4 w-4 mr-2" /> Print A4 Poster
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit Rent Dialog */}
      <Dialog open={editRentDialog} onClose={() => { setEditRentDialog(false); setEditRentTypeId(''); setEditRentValue('') }}>
        <DialogHeader>
          <DialogTitle>Edit Room Rent</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Room Type</Label>
            <p className="font-medium mt-1">{roomTypes.find(rt => rt.id === editRentTypeId)?.name}</p>
          </div>
          <div>
            <Label>Current Rent</Label>
            <p className="font-medium mt-1">{formatCurrency(roomTypes.find(rt => rt.id === editRentTypeId)?.rent_per_head || 0)}/head/month</p>
          </div>
          <div>
            <Label>New Rent (₹/head/month) *</Label>
            <Input type="number" value={editRentValue} onChange={(e) => setEditRentValue(e.target.value)} className="mt-1" min={0} />
          </div>
          <div className="p-3 bg-amber-50 rounded-lg text-sm text-amber-800">
            ⚠️ Changing the rent will apply to all new allocations. Existing residents' rents remain unchanged unless updated individually.
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => { setEditRentDialog(false); setEditRentTypeId(''); setEditRentValue('') }}>Cancel</Button>
          <Button onClick={handleEditRent} disabled={!editRentValue}>Update Rent</Button>
        </DialogFooter>
      </Dialog>

      {/* Add Staff Dialog */}
      <Dialog open={addStaffDialog} onClose={() => setAddStaffDialog(false)}>
        <DialogHeader>
          <DialogTitle>Add Staff Account</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Full Name *</Label>
            <Input value={newStaffName} onChange={(e) => setNewStaffName(e.target.value)} placeholder="e.g. Anjali Nair" className="mt-1" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Username</Label>
              <Input value={newStaffUsername} onChange={(e) => setNewStaffUsername(e.target.value)} placeholder="e.g. anjali" className="mt-1" />
              <p className="text-[10px] text-muted-foreground mt-0.5">Used for quick sign-in</p>
            </div>
            <div>
              <Label>Email *</Label>
              <Input type="email" value={newStaffEmail} onChange={(e) => setNewStaffEmail(e.target.value)} placeholder="anjali@maythree.com" className="mt-1" />
            </div>
          </div>
          <div>
            <Label>Login Password *</Label>
            <Input type="text" value={newStaffPassword} onChange={(e) => setNewStaffPassword(e.target.value)} placeholder="Password for login (e.g. staff123)" className="mt-1" />
            <p className="text-[10px] text-muted-foreground mt-0.5">Used immediately to authenticate on the login screen</p>
          </div>
          <div>
            <Label>Role *</Label>
            <select value={newStaffRole} onChange={(e) => setNewStaffRole(e.target.value as StaffRole)} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm mt-1">
              <option value="staff">Hostel Staff (Admissions, Rooms, Attendance)</option>
              <option value="admin">Corporate Admin (Full Privileges)</option>
              <option value="store_staff">Store Staff (POS & Canteen Inventory)</option>
            </select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setAddStaffDialog(false)}>Cancel</Button>
          <Button onClick={handleAddStaff} disabled={!newStaffName || !newStaffEmail || !newStaffPassword}>Create Account</Button>
        </DialogFooter>
      </Dialog>

      {/* Edit Staff Dialog */}
      <Dialog open={editStaffDialog} onClose={() => setEditStaffDialog(false)}>
        <DialogHeader>
          <DialogTitle>Edit Staff Account</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Full Name *</Label>
            <Input value={editStaffName} onChange={(e) => setEditStaffName(e.target.value)} className="mt-1" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Username</Label>
              <Input value={editStaffUsername} onChange={(e) => setEditStaffUsername(e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label>Email *</Label>
              <Input type="email" value={editStaffEmail} onChange={(e) => setEditStaffEmail(e.target.value)} className="mt-1" />
            </div>
          </div>
          <div>
            <Label>Update Password (leave blank to keep current)</Label>
            <Input type="text" value={editStaffPassword} onChange={(e) => setEditStaffPassword(e.target.value)} placeholder="Enter new password to change" className="mt-1" />
          </div>
          <div>
            <Label>Role *</Label>
            <select value={editStaffRole} onChange={(e) => setEditStaffRole(e.target.value as StaffRole)} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm mt-1">
              <option value="staff">Hostel Staff</option>
              <option value="admin">Corporate Admin</option>
              <option value="store_staff">Store Staff</option>
            </select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setEditStaffDialog(false)}>Cancel</Button>
          <Button onClick={handleEditStaff} disabled={!editStaffName || !editStaffEmail}>Save Changes</Button>
        </DialogFooter>
      </Dialog>

      {/* Reset Password Dialog */}
      <Dialog open={resetPwdDialog} onClose={() => setResetPwdDialog(false)}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Key className="h-5 w-5 text-amber-600" /> Reset Login Password
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="p-3 bg-muted rounded-lg text-xs space-y-1">
            <p><strong>Staff:</strong> {resetPwdStaff?.name}</p>
            <p><strong>Username:</strong> <span className="font-mono">{resetPwdStaff?.username || (resetPwdStaff?.email ? resetPwdStaff.email.split('@')[0] : '—')}</span></p>
            <p><strong>Email:</strong> {resetPwdStaff?.email}</p>
          </div>
          <div>
            <Label>New Login Password *</Label>
            <Input
              type="text"
              value={newPasswordVal}
              onChange={(e) => setNewPasswordVal(e.target.value)}
              placeholder="e.g. staff123"
              className="mt-1 font-mono"
            />
            <p className="text-[11px] text-muted-foreground mt-1">
              The user will be able to sign in immediately using this password with either their username or email.
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setResetPwdDialog(false)}>Cancel</Button>
          <Button onClick={handleResetPassword} disabled={!newPasswordVal.trim()}>
            Save Password
          </Button>
        </DialogFooter>
      </Dialog>

      {/* Room Configuration Dialog */}
      <Dialog open={roomConfigDialog} onClose={() => { setRoomConfigDialog(false); setConfigRoomId(''); setConfigRoomNo('') }}>
        <DialogHeader>
          <DialogTitle>Configure Room {configRoomNo}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Action</Label>
            <div className="grid grid-cols-2 gap-2 mt-2">
              {([
                { value: 'change_type' as const, label: '🔄 Change Type', desc: 'Convert to different room type' },
                { value: 'add_bed' as const, label: '➕ Add Bed', desc: 'Add an extra bed' },
                { value: 'remove_bed' as const, label: '➖ Remove Bed', desc: 'Remove a bed' },
                { value: 'toggle_ac' as const, label: '❄️ Toggle AC', desc: acRooms.has(configRoomId) ? 'Remove AC' : 'Add AC' },
              ]).map(({ value, label, desc }) => (
                <label key={value} className={`p-3 border rounded-lg cursor-pointer text-center ${configAction === value ? 'border-primary bg-primary/5' : 'hover:border-primary/50'}`}>
                  <input type="radio" name="configAction" value={value} checked={configAction === value} onChange={() => setConfigAction(value)} className="sr-only" />
                  <p className="font-medium text-sm">{label}</p>
                  <p className="text-xs text-muted-foreground">{desc}</p>
                </label>
              ))}
            </div>
          </div>

          {configAction === 'change_type' && (
            <div>
              <Label>New Room Type *</Label>
              <select value={configNewTypeId} onChange={(e) => setConfigNewTypeId(e.target.value)} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm mt-1">
                {roomTypes.map(rt => (
                  <option key={rt.id} value={rt.id}>{rt.name} ({rt.beds_per_room} beds, {formatCurrency(rt.rent_per_head)}/head)</option>
                ))}
              </select>
              <p className="text-xs text-muted-foreground mt-2">⚠️ Changing room type will update the bed count and rent. Existing occupants will be notified.</p>
            </div>
          )}

          {configAction === 'remove_bed' && (
            <div>
              <Label>Select Bed to Remove *</Label>
              <select value={configRemoveBedId} onChange={(e) => setConfigRemoveBedId(e.target.value)} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm mt-1">
                <option value="">Select a bed...</option>
                {beds
                  .filter(b => b.room_id === configRoomId && b.status !== 'occupied')
                  .map(b => (
                    <option key={b.id} value={b.id}>Bed {b.bed_label} ({b.status})</option>
                  ))}
              </select>
              {beds.filter(b => b.room_id === configRoomId && b.status !== 'occupied').length === 0 && (
                <p className="text-xs text-destructive mt-2">No available beds to remove. Occupied beds cannot be removed.</p>
              )}
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => { setRoomConfigDialog(false); setConfigRoomId(''); setConfigRoomNo('') }}>Cancel</Button>
          <Button onClick={handleRoomConfig}>Apply Changes</Button>
        </DialogFooter>
      </Dialog>
    </div>
  )
}
