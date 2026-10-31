import { useState } from 'react'
import { useDemoData } from '@/contexts/DemoDataContext'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn, formatCurrency, formatDate } from '@/lib/utils'
import { useToast } from '@/components/ui/toast'
import type { Bed } from '@/types/database'
import { BedDouble, Layers, Snowflake, Phone, MessageCircle, User, Briefcase, LogOut, CalendarCheck, Building2 } from 'lucide-react'

const statusColors: Record<string, string> = {
  available: 'bg-green-100 text-green-800 border-green-300 hover:bg-green-200',
  occupied: 'bg-red-100 text-red-800 border-red-300 hover:bg-red-200',
  reserved: 'bg-yellow-100 text-yellow-800 border-yellow-300 hover:bg-yellow-200',
  maintenance: 'bg-gray-100 text-gray-800 border-gray-300',
}

const statusDots: Record<string, string> = {
  available: 'bg-green-500',
  occupied: 'bg-red-500',
  reserved: 'bg-yellow-500',
  maintenance: 'bg-gray-500',
}

export function RoomsPage() {
  const { rooms, beds, flats, roomTypes, residents, acRooms, checkOutResident } = useDemoData()
  const { addToast } = useToast()
  const [selectedBed, setSelectedBed] = useState<Bed | null>(null)
  const [filter, setFilter] = useState<string>('all')
  const [showCheckOut, setShowCheckOut] = useState(false)
  const [checkOutDate, setCheckOutDate] = useState(new Date().toISOString().split('T')[0])

  // Group rooms by section
  const floor2Rooms = rooms.filter(r => r.floor === 2 && !r.flat_id).sort((a, b) => a.room_no.localeCompare(b.room_no))
  const floor3Rooms = rooms.filter(r => r.floor === 3 && !r.flat_id).sort((a, b) => a.room_no.localeCompare(b.room_no))
  const flatGroups = flats.map(f => ({
    flat: f,
    rooms: rooms.filter(r => r.flat_id === f.id).sort((a, b) => a.room_no.localeCompare(b.room_no)),
  }))

  const getBedsForRoom = (roomId: string) => {
    let roomBeds = beds.filter(b => b.room_id === roomId)
    if (filter !== 'all') roomBeds = roomBeds.filter(b => b.status === filter)
    return roomBeds
  }

  const total = beds.length
  const available = beds.filter(b => b.status === 'available').length
  const occupied = beds.filter(b => b.status === 'occupied').length
  const reserved = beds.filter(b => b.status === 'reserved').length

  const bedResident = selectedBed ? residents.find(r => r.bed_id === selectedBed.id && r.status === 'active') : null
  const bedRoom = selectedBed ? rooms.find(r => r.id === selectedBed.room_id) : null
  const bedRoomType = bedRoom ? roomTypes.find(rt => rt.id === bedRoom.room_type_id) : null
  const bedIsAC = bedRoom ? acRooms.has(bedRoom.id) : false

  // Derive rent labels from roomTypes
  const twinRoomType = roomTypes.find(rt => rt.id === 'rt-1')
  const singleRoomType = roomTypes.find(rt => rt.id === 'rt-2')
  const fourSharingRoomType = roomTypes.find(rt => rt.id === 'rt-3')

  const handleCheckOut = () => {
    if (!bedResident) return
    checkOutResident(bedResident.id, checkOutDate)
    addToast({ type: 'success', title: 'Check-out recorded', description: `${bedResident.application?.full_name} checked out. Bed is now available.` })
    setShowCheckOut(false)
    setSelectedBed(null)
  }

  const renderBedGrid = (roomsList: typeof rooms) => (
    <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-7 lg:grid-cols-10 gap-2">
      {roomsList.map((room) => {
        const roomIsAC = acRooms.has(room.id)
        return (
          <div key={room.id} className="space-y-1">
            <p className="text-xs font-semibold text-center text-muted-foreground flex items-center justify-center gap-0.5">
              {room.room_no}
              {roomIsAC && <Snowflake className="h-3 w-3 text-blue-500" />}
            </p>
            <div className="flex gap-1 justify-center">
              {getBedsForRoom(room.id).map((bed) => (
                <button
                  key={bed.id}
                  onClick={() => setSelectedBed(bed)}
                  className={cn(
                    "w-8 h-8 rounded text-xs font-bold border transition-colors",
                    statusColors[bed.status]
                  )}
                  title={`Room ${room.room_no} · Bed ${bed.bed_label} · ${bed.status}`}
                >
                  {bed.bed_label}
                </button>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Bed Board</h1>
          <p className="text-muted-foreground text-sm">{total} beds · {available} available · {occupied} occupied · {reserved} reserved</p>
        </div>
        <div className="flex items-center gap-2">
          <select value={filter} onChange={(e) => setFilter(e.target.value)} className="flex h-9 rounded-md border border-input bg-background px-3 py-1 text-sm">
            <option value="all">All Beds</option>
            <option value="available">Available</option>
            <option value="occupied">Occupied</option>
            <option value="reserved">Reserved</option>
            <option value="maintenance">Maintenance</option>
          </select>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-sm">
        {Object.entries(statusDots).map(([status, color]) => (
          <div key={status} className="flex items-center gap-2">
            <div className={cn("w-3 h-3 rounded-full", color)} />
            <span className="capitalize">{status}</span>
          </div>
        ))}
        <div className="flex items-center gap-2 ml-4">
          <Snowflake className="h-3 w-3 text-blue-500" />
          <span>AC Room</span>
        </div>
      </div>

      {/* Floor 2 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Layers className="h-5 w-5" /> Floor 2 — {twinRoomType?.name || 'Twin Sharing'} (201–219)
            <Badge variant="outline" className="ml-auto">{formatCurrency(twinRoomType?.rent_per_head || 8000)}/head</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {renderBedGrid(floor2Rooms)}
        </CardContent>
      </Card>

      {/* Floor 3 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Layers className="h-5 w-5" /> Floor 3 — {singleRoomType?.name || 'Single Room'} (301–319)
            <Badge variant="outline" className="ml-auto">{formatCurrency(singleRoomType?.rent_per_head || 10000)}/head</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {renderBedGrid(floor3Rooms)}
        </CardContent>
      </Card>

      {/* Flats */}
      {flatGroups.map(({ flat, rooms: flatRooms }) => (
        <Card key={flat.id}>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <BedDouble className="h-5 w-5" /> Flat {flat.code} ({flat.bhk} BHK)
              <Badge variant="outline" className="ml-auto">{formatCurrency(fourSharingRoomType?.rent_per_head || 7000)}/head</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {flatRooms.map((room) => {
                const roomIsAC = acRooms.has(room.id)
                return (
                  <div key={room.id} className="space-y-1">
                    <p className="text-xs font-semibold text-center text-muted-foreground flex items-center justify-center gap-0.5">
                      {room.room_no}
                      {roomIsAC && <Snowflake className="h-3 w-3 text-blue-500" />}
                    </p>
                    <div className="flex gap-1 justify-center">
                      {getBedsForRoom(room.id).map((bed) => (
                        <button
                          key={bed.id}
                          onClick={() => setSelectedBed(bed)}
                          className={cn(
                            "w-8 h-8 rounded text-xs font-bold border transition-colors",
                            statusColors[bed.status]
                          )}
                        >
                          {bed.bed_label}
                        </button>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      ))}

      {/* Bed Detail Dialog — Enhanced with full occupant info */}
      <Dialog open={!!selectedBed && !showCheckOut} onClose={() => setSelectedBed(null)}>
        {selectedBed && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <BedDouble className="h-5 w-5" />
                Room {bedRoom?.room_no || '—'} · Bed {selectedBed.bed_label}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {/* Room Info */}
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="p-3 bg-muted/50 rounded-lg">
                  <p className="text-muted-foreground text-xs">Room Type</p>
                  <p className="font-medium">{bedRoomType?.name || '—'}</p>
                </div>
                <div className="p-3 bg-muted/50 rounded-lg">
                  <p className="text-muted-foreground text-xs">Rent/Head</p>
                  <p className="font-medium">{formatCurrency(bedRoomType?.rent_per_head || 0)}</p>
                </div>
                <div className="p-3 bg-muted/50 rounded-lg">
                  <p className="text-muted-foreground text-xs">Floor</p>
                  <p className="font-medium">{bedRoom?.floor}</p>
                </div>
                <div className="p-3 bg-muted/50 rounded-lg">
                  <p className="text-muted-foreground text-xs">AC Status</p>
                  <p className="font-medium flex items-center gap-1">
                    {bedIsAC ? (
                      <>
                        <Snowflake className="h-3 w-3 text-blue-500" /> AC
                      </>
                    ) : (
                      'Non-AC'
                    )}
                  </p>
                </div>
              </div>

              {/* Bed Status */}
              <div className="flex items-center gap-2">
                <div className={cn("w-3 h-3 rounded-full", statusDots[selectedBed.status])} />
                <Badge variant={selectedBed.status === 'available' ? 'success' : selectedBed.status === 'occupied' ? 'destructive' : 'warning'}>
                  {selectedBed.status}
                </Badge>
              </div>

              {/* Occupant Details — full info */}
              {bedResident && bedResident.application && (
                <div className="border rounded-lg p-4 space-y-3">
                  <h4 className="font-semibold flex items-center gap-2"><User className="h-4 w-4" /> Occupant Details</h4>
                  <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                    <div>
                      <p className="text-muted-foreground">Name</p>
                      <p className="font-semibold text-base">{bedResident.application.full_name}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Phone</p>
                      <p className="font-medium">{bedResident.application.phone}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Occupation</p>
                      <p className="font-medium flex items-center gap-1">
                        <Briefcase className="h-3 w-3" />
                        {bedResident.application.occupation}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Institution / Employer</p>
                      <p className="font-medium flex items-center gap-1">
                        <Building2 className="h-3 w-3" />
                        {bedResident.application.institution_or_employer}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Check-in Date</p>
                      <p className="font-medium flex items-center gap-1">
                        <CalendarCheck className="h-3 w-3" />
                        {formatDate(bedResident.check_in_date)}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Monthly Rent</p>
                      <p className="font-medium">{formatCurrency(bedResident.monthly_rent)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Deposit Paid</p>
                      <p className="font-medium">{formatCurrency(bedResident.deposit_amount)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Status</p>
                      <Badge variant={bedResident.status === 'active' ? 'success' : 'warning'}>{bedResident.status}</Badge>
                    </div>
                  </div>

                  {/* Emergency contact */}
                  <div className="border-t pt-2 mt-2">
                    <p className="text-xs text-muted-foreground mb-1">Emergency Contact</p>
                    <p className="text-sm">{bedResident.application.emergency_name} ({bedResident.application.emergency_relation}) — {bedResident.application.emergency_phone}</p>
                  </div>

                  {/* Action buttons */}
                  <div className="flex gap-2 pt-2">
                    <Button variant="outline" size="sm" className="flex-1" onClick={() => window.open(`tel:${bedResident.application?.phone}`)}>
                      <Phone className="h-4 w-4 mr-1" /> Call
                    </Button>
                    <Button variant="outline" size="sm" className="flex-1" onClick={() => window.open(`https://wa.me/91${bedResident.application?.phone}`)}>
                      <MessageCircle className="h-4 w-4 mr-1" /> WhatsApp
                    </Button>
                    <Button variant="destructive" size="sm" className="flex-1" onClick={() => setShowCheckOut(true)}>
                      <LogOut className="h-4 w-4 mr-1" /> Check Out
                    </Button>
                  </div>
                </div>
              )}

              {/* If available, show ready to assign */}
              {selectedBed.status === 'available' && (
                <div className="p-4 bg-green-50 rounded-lg text-center">
                  <p className="text-green-800 font-medium">✅ Ready to assign</p>
                  <p className="text-sm text-green-600 mt-1">This bed is available and can be allocated to a new resident.</p>
                </div>
              )}
            </div>
          </>
        )}
      </Dialog>

      {/* Check-out Confirmation Dialog */}
      <Dialog open={showCheckOut} onClose={() => setShowCheckOut(false)}>
        <DialogHeader>
          <DialogTitle>Check Out — {bedResident?.application?.full_name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            This will mark the resident as checked out and free up the bed (Room {bedRoom?.room_no || '—'} · Bed {selectedBed?.bed_label}) for reassignment to a new occupant.
          </p>
          <div>
            <Label>Check-out Date *</Label>
            <Input type="date" value={checkOutDate} onChange={(e) => setCheckOutDate(e.target.value)} className="mt-1" />
          </div>
          <div className="p-3 bg-amber-50 rounded-lg text-sm text-amber-800">
            <p>⚠️ Please ensure all pending dues are settled before check-out.</p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setShowCheckOut(false)}>Cancel</Button>
          <Button variant="destructive" onClick={handleCheckOut}>Confirm Check-out</Button>
        </DialogFooter>
      </Dialog>
    </div>
  )
}
