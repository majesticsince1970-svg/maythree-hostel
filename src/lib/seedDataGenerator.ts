import type {
  RoomType, Flat, Room, Bed, Application, Resident, Payment,
  AttendanceMovement, BedStatus
} from '@/types/database'

// ── Room Types ──
export const seedRoomTypes: RoomType[] = [
  { id: 'rt-1', name: 'Twin Sharing', beds_per_room: 2, rent_per_head: 8000, has_attached_toilet: true, created_at: '2026-01-01' },
  { id: 'rt-2', name: 'Single Room', beds_per_room: 1, rent_per_head: 10000, has_attached_toilet: true, created_at: '2026-01-01' },
  { id: 'rt-3', name: '4-Sharing', beds_per_room: 4, rent_per_head: 7000, has_attached_toilet: false, created_at: '2026-01-01' },
]

// ── Flats ──
export const seedFlats: Flat[] = [
  { id: 'f-a', code: 'A', bhk: 2, floor: 1 },
  { id: 'f-b', code: 'B', bhk: 3, floor: 1 },
  { id: 'f-c', code: 'C', bhk: 3, floor: 1 },
  { id: 'f-d', code: 'D', bhk: 3, floor: 1 },
  { id: 'f-e', code: 'E', bhk: 3, floor: 1 },
  { id: 'f-f', code: 'F', bhk: 2, floor: 1 },
  { id: 'f-g', code: 'G', bhk: 3, floor: 1 },
  { id: 'f-h', code: 'H', bhk: 3, floor: 1 },
  { id: 'f-i', code: 'I', bhk: 3, floor: 1 },
  { id: 'f-j', code: 'J', bhk: 3, floor: 1 },
]

// AC Rooms
export const seedAcRoomIds = new Set([
  'room-301', 'room-303', 'room-305', 'room-307', 'room-309',
  'room-311', 'room-313', 'room-315', 'room-317', 'room-319'
])

const RESIDENT_NAMES = [
  'Priya Sharma', 'Ananya Reddy', 'Kavya Nair', 'Deepa Menon', 'Sneha Patil',
  'Meera Iyer', 'Roshni Das', 'Fatima Zahra', 'Keerthy Suresh', 'Pooja Hegde',
  'Haritha Krishnan', 'Malavika Nair', 'Divya Pillai', 'Gopika Ramesh', 'Anju Varghese',
  'Nimmy George', 'Shilpa Rajan', 'Reshma Thomas', 'Aparna Sen', 'Swathi Reddy',
  'Lakshmi Priya', 'Aisha Noor', 'Devika Nambiar', 'Arya Sankar', 'Bhavana Menon',
  'Sreelakshmi V', 'Athira Madhav', 'Nandana Jayakumar', 'Gayatri Devi', 'Sandra Mohan',
  'Ritu Varma', 'Manju Warrier', 'Shreya Ghoshal', 'Jyothika Saravanan', 'Nazriya Nazim',
  'Parvathy Thiruvothu', 'Nayanthara Kurian', 'Kalyani Priyadarshan', 'Sai Pallavi', 'Nithya Menen',
  'Amala Paul', 'Trisha Krishnan', 'Anupama Parameswaran', 'Krithi Shetty', 'Rashmika Mandanna',
  'Shruti Haasan', 'Samantha Ruth', 'Tamannaah Bhatia', 'Kajal Aggarwal', 'Aishwarya Lekshmi',
  'Anna Ben', 'Darshana Rajendran', 'Rajisha Vijayan', 'Anaswara Rajan', 'Mamitha Baiju',
  'Mahima Nambiar', 'Gouri Kishan', 'Srinda Arhaan', 'Vincy Aloshious', 'Saniya Iyappan',
  'Nikhila Vimal', 'Prayaga Martin', 'Namitha Pramod', 'Miya George', 'Honey Rose',
  'Anu Emmanuel', 'Ahaana Krishna', 'Diya Krishna', 'Ishaani Krishna', 'Hansika Krishna',
  'Esther Anil', 'Sanusha Santhosh', 'Shaun Romy', 'Kani Kusruti', 'Surabhi Lakshmi'
]

const INSTITUTIONS = [
  'Christ University', 'TCS', 'BITS Pilani', 'IIT Madras', 'Infosys',
  'Wipro', 'VIT University', 'Calicut University', 'MES Medical College',
  'Almas Hospital Nursing College', 'Aster MIMS', 'Kozhikode Medical College',
  'NIT Calicut', 'Federal Bank Kottakkal', 'UST Global'
]

const HOMETOWNS = [
  'Kochi, Kerala', 'Kozhikode, Kerala', 'Malappuram, Kerala', 'Thiruvananthapuram, Kerala',
  'Thrissur, Kerala', 'Bengaluru, Karnataka', 'Chennai, Tamil Nadu', 'Hyderabad, Telangana',
  'Coimbatore, Tamil Nadu', 'Palakkad, Kerala', 'Kannur, Kerala', 'Kottayam, Kerala'
]

export interface SeedDataResult {
  rooms: Room[]
  beds: Bed[]
  applications: Application[]
  residents: Resident[]
  payments: Payment[]
  attendanceLogs: AttendanceMovement[]
}

export function generateCompleteHostelData(rts = seedRoomTypes): SeedDataResult {
  const rooms: Room[] = []
  const beds: Bed[] = []
  const occupiedBedIds: { bedId: string; roomId: string; bedLabel: string; rent: number; deposit: number }[] = []

  // 1. Floor 2: Twin sharing (201-219) -> 19 rooms * 2 beds = 38 beds
  // Occupy 16 beds: rooms 201 to 208 both A and B (8 rooms * 2 = 16 occupied beds)
  // Remaining 22 beds available
  for (let i = 201; i <= 219; i++) {
    const roomId = `room-${i}`
    rooms.push({
      id: roomId,
      room_no: String(i),
      room_type_id: 'rt-1',
      flat_id: null,
      floor: 2,
      is_active: true,
      room_type: rts[0]
    })

    const isRoomOccupied = i <= 208
    for (const label of ['A', 'B']) {
      const bedId = `bed-${i}-${label}`
      const status: BedStatus = isRoomOccupied ? 'occupied' : 'available'
      beds.push({ id: bedId, room_id: roomId, bed_label: label, status })
      if (status === 'occupied') {
        occupiedBedIds.push({ bedId, roomId, bedLabel: label, rent: 8000, deposit: 16000 })
      }
    }
  }

  // 2. Floor 3: Single rooms (301-319) -> 19 rooms * 1 bed = 19 beds
  // Occupy 9 beds: rooms 301 to 309 (9 occupied beds)
  // Remaining 10 beds available
  for (let i = 301; i <= 319; i++) {
    const roomId = `room-${i}`
    rooms.push({
      id: roomId,
      room_no: String(i),
      room_type_id: 'rt-2',
      flat_id: null,
      floor: 3,
      is_active: true,
      room_type: rts[1]
    })

    const isBedOccupied = i <= 309
    const bedId = `bed-${i}-A`
    const status: BedStatus = isBedOccupied ? 'occupied' : 'available'
    beds.push({ id: bedId, room_id: roomId, bed_label: 'A', status })
    if (status === 'occupied') {
      occupiedBedIds.push({ bedId, roomId, bedLabel: 'A', rent: 10000, deposit: 20000 })
    }
  }

  // 3. Flats: 4-sharing across 10 flats (A to J) -> 28 rooms * 4 beds = 112 beds
  // Occupy exactly 50 beds, leaving 62 available
  // Total beds = 38 + 19 + 112 = 169 beds!
  // Total occupied beds = 16 + 9 + 50 = 75 occupied beds!
  // Total available beds = 22 + 10 + 62 = 94 available beds!
  const flatRoomCounts: Record<string, number> = { A: 2, B: 3, C: 3, D: 3, E: 3, F: 2, G: 3, H: 3, I: 3, J: 3 }
  let flatOccupiedTarget = 50

  for (const flat of seedFlats) {
    const count = flatRoomCounts[flat.code] || 3
    for (let r = 1; r <= count; r++) {
      const roomNo = `${flat.code}${r}`
      const roomId = `room-${roomNo}`
      rooms.push({
        id: roomId,
        room_no: roomNo,
        room_type_id: 'rt-3',
        flat_id: flat.id,
        floor: flat.floor,
        is_active: true,
        room_type: rts[2],
        flat
      })

      for (const label of ['A', 'B', 'C', 'D']) {
        const bedId = `bed-${roomNo}-${label}`
        let status: BedStatus = 'available'
        if (flatOccupiedTarget > 0) {
          status = 'occupied'
          flatOccupiedTarget--
          occupiedBedIds.push({ bedId, roomId, bedLabel: label, rent: 7000, deposit: 14000 })
        }
        beds.push({ id: bedId, room_id: roomId, bed_label: label, status })
      }
    }
  }

  // 4. Generate 75 Applications and Residents for ALL 75 Occupied Beds
  const residents: Resident[] = []
  const applications: Application[] = []
  const payments: Payment[] = []
  const currentMonth = new Date().toISOString().slice(0, 7)

  occupiedBedIds.forEach((occ, idx) => {
    const num = idx + 1
    const resId = `res-${num}`
    const appId = `app-${num}`
    const fullName = RESIDENT_NAMES[idx % RESIDENT_NAMES.length] || `Resident ${num}`
    const phone = `9876543${String(num).padStart(3, '0')}`
    const institution = INSTITUTIONS[idx % INSTITUTIONS.length]
    const hometown = HOMETOWNS[idx % HOMETOWNS.length]
    const pin = String(1000 + num) // e.g. 1001, 1002, ..., 1075
    const room = rooms.find(r => r.id === occ.roomId)

    const checkInMonthsAgo = (idx % 5) + 1
    const checkInDate = `2026-0${Math.max(1, 10 - checkInMonthsAgo)}-15`

    const app: Application = {
      id: appId,
      ref_no: `HST-2026-${String(num).padStart(4, '0')}`,
      full_name: fullName,
      dob: '2001-05-15',
      phone,
      email: `${fullName.toLowerCase().replace(/[^a-z]/g, '')}@email.com`,
      permanent_address: `${100 + num}, Main Road, ${hometown}`,
      occupation: idx % 2 === 0 ? 'Student' : 'Working Professional',
      institution_or_employer: institution,
      id_proof_type: 'Aadhaar',
      id_proof_no: `5678 ${String(1000 + num * 13).slice(0, 4)} ${String(9000 - num * 17).slice(0, 4)}`,
      emergency_name: `${fullName.split(' ')[1] || 'Family'} Contact`,
      emergency_relation: idx % 2 === 0 ? 'Father' : 'Mother',
      emergency_phone: `9876599${String(num).padStart(3, '0')}`,
      preferred_room_type_id: room?.room_type_id || 'rt-1',
      preferred_ac: seedAcRoomIds.has(occ.roomId) ? 'yes' : 'no',
      status: 'approved',
      submitted_at: `${checkInDate}T10:00:00Z`,
      reviewed_by: 'demo-staff-1',
      review_note: `Bed allocated: Room ${room?.room_no} Bed ${occ.bedLabel}`,
      preferred_room_type: room?.room_type
    }
    applications.push(app)

    const res: Resident = {
      id: resId,
      application_id: appId,
      bed_id: occ.bedId,
      check_in_date: checkInDate,
      check_out_date: null,
      monthly_rent: occ.rent,
      deposit_amount: occ.deposit,
      status: 'active',
      pin,
      pin_active: true,
      application: app,
      bed: {
        id: occ.bedId,
        room_id: occ.roomId,
        bed_label: occ.bedLabel,
        status: 'occupied',
        room
      }
    }
    residents.push(res)

    // Seed initial payments for ~48 residents in full, rest ~27 pending
    if (idx < 48) {
      const mode = idx % 3 === 0 ? 'UPI' : idx % 3 === 1 ? 'cash' : 'bank'
      payments.push({
        id: `pay-${num}`,
        resident_id: resId,
        period_month: currentMonth,
        amount: occ.rent,
        paid_on: `${currentMonth}-0${(idx % 10) + 1}`,
        mode,
        reference: mode === 'UPI' ? `UPI${987000000 + num}` : mode === 'bank' ? `NEFT${4800000 + num}` : null,
        received_by: 'demo-staff-1',
        receipt_no: `RCT-${String(num).padStart(4, '0')}`
      })
    }
  })

  // 5. Add 5 pending applications waiting in the verification queue
  const queueApps: Application[] = [
    {
      id: 'app-pending-1', ref_no: 'HST-2026-0101', full_name: 'Ananya Varma', dob: '2002-04-12',
      phone: '9847111222', email: 'ananya.v@email.com', permanent_address: '45 Palace Road, Thiruvananthapuram, Kerala',
      occupation: 'Student', institution_or_employer: 'MES Medical College',
      id_proof_type: 'Aadhaar', id_proof_no: '4512 8794 1230',
      emergency_name: 'Dr. K. Varma', emergency_relation: 'Father', emergency_phone: '9847111223',
      preferred_room_type_id: 'rt-1', preferred_ac: 'no', status: 'submitted',
      submitted_at: new Date(Date.now() - 3600000 * 4).toISOString(), reviewed_by: null, review_note: null,
      preferred_room_type: rts[0]
    },
    {
      id: 'app-pending-2', ref_no: 'HST-2026-0102', full_name: 'Nandita Menon', dob: '2001-09-18',
      phone: '9847222333', email: 'nandita.m@email.com', permanent_address: '12 Hill View, Kozhikode, Kerala',
      occupation: 'Working Professional', institution_or_employer: 'Almas Hospital',
      id_proof_type: 'Aadhaar', id_proof_no: '7845 1203 9865',
      emergency_name: 'Radha Menon', emergency_relation: 'Mother', emergency_phone: '9847222334',
      preferred_room_type_id: 'rt-2', preferred_ac: 'yes', status: 'under_review',
      submitted_at: new Date(Date.now() - 3600000 * 12).toISOString(), reviewed_by: null, review_note: null,
      preferred_room_type: rts[1]
    },
    {
      id: 'app-pending-3', ref_no: 'HST-2026-0103', full_name: 'Keerthana Raj', dob: '2003-01-25',
      phone: '9847333444', email: 'keerthana.r@email.com', permanent_address: '88 Lake View, Kottayam, Kerala',
      occupation: 'Student', institution_or_employer: 'Calicut University',
      id_proof_type: 'PAN', id_proof_no: 'ABCDE1234F',
      emergency_name: 'Rajendran P', emergency_relation: 'Father', emergency_phone: '9847333445',
      preferred_room_type_id: 'rt-3', preferred_ac: 'no', status: 'approved',
      submitted_at: new Date(Date.now() - 3600000 * 28).toISOString(), reviewed_by: 'demo-staff-1', review_note: 'Verified documents. Ready for room assignment.',
      preferred_room_type: rts[2]
    },
    {
      id: 'app-pending-4', ref_no: 'HST-2026-0104', full_name: 'Devi Chandran', dob: '2000-11-05',
      phone: '9847444555', email: 'devi.c@email.com', permanent_address: '23 Beach Road, Kannur, Kerala',
      occupation: 'Student', institution_or_employer: 'Christ College',
      id_proof_type: 'Aadhaar', id_proof_no: '9632 5874 1025',
      emergency_name: 'Chandran K', emergency_relation: 'Father', emergency_phone: '9847444556',
      preferred_room_type_id: 'rt-1', preferred_ac: 'no', status: 'submitted',
      submitted_at: new Date(Date.now() - 3600000 * 48).toISOString(), reviewed_by: null, review_note: null,
      preferred_room_type: rts[0]
    },
    {
      id: 'app-pending-5', ref_no: 'HST-2026-0105', full_name: 'Meenakshi Sundaram', dob: '2001-08-30',
      phone: '9847555666', email: null, permanent_address: '15 Gandhi Road, Palakkad, Kerala',
      occupation: 'Working Professional', institution_or_employer: 'Federal Bank',
      id_proof_type: 'Aadhaar', id_proof_no: '1478 5236 9852',
      emergency_name: 'Sundaram S', emergency_relation: 'Father', emergency_phone: '9847555667',
      preferred_room_type_id: 'rt-2', preferred_ac: 'no', status: 'rejected',
      submitted_at: new Date(Date.now() - 3600000 * 72).toISOString(), reviewed_by: 'demo-staff-1', review_note: 'Incomplete proof of address',
      preferred_room_type: rts[1]
    }
  ]
  applications.push(...queueApps)

  // 6. Generate Baseline Attendance Movements for the 75 Active Residents
  // 68 residents IN (inside hostel)
  // 7 residents OUT (outside hostel)
  // Total = 75 residents!
  const attendanceLogs: AttendanceMovement[] = []
  const outReasons = [
    'Attending College Lab Practical',
    'Office Night Shift Overtime',
    'Hospital Clinical Duty - Almas Hospital',
    'Library Reference Study',
    'Shopping & Personal errands at Kottakkal Town',
    'Home Visit / Weekend Leave',
    'Tuition Coaching Class'
  ]

  const now = new Date()
  const todayStr = now.toISOString().slice(0, 10)

  // Mark first 7 residents as OUT with timestamps
  for (let i = 0; i < 7; i++) {
    const res = residents[i]
    const hoursAgo = (i + 1) * 1.5
    const movTime = new Date(now.getTime() - hoursAgo * 3600000).toISOString().replace('T', ' ').slice(0, 16)
    attendanceLogs.push({
      id: `mov-out-${i + 1}`,
      resident_id: res.id,
      resident_name: res.application?.full_name || 'Resident',
      room_no: res.bed?.room?.room_no || '—',
      bed_label: res.bed?.bed_label,
      direction: 'OUT',
      time: movTime,
      note: outReasons[i % outReasons.length],
      recorded_by: 'Kiosk Automated Punch'
    })
  }

  // Add sample IN check-in records for residents who returned earlier today
  for (let i = 7; i < 15; i++) {
    const res = residents[i]
    const hoursAgo = (i - 5) * 0.8
    const movTime = new Date(now.getTime() - hoursAgo * 3600000).toISOString().replace('T', ' ').slice(0, 16)
    attendanceLogs.push({
      id: `mov-in-${i + 1}`,
      resident_id: res.id,
      resident_name: res.application?.full_name || 'Resident',
      room_no: res.bed?.room?.room_no || '—',
      bed_label: res.bed?.bed_label,
      direction: 'IN',
      time: movTime,
      note: 'Normal Entry - Regular Return',
      recorded_by: 'Kiosk Automated Punch'
    })
  }

  return {
    rooms,
    beds,
    applications,
    residents,
    payments,
    attendanceLogs
  }
}

