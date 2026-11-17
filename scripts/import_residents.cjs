const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');

const SUPABASE_URL = 'https://mztdwkmyedspmohsohzk.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_WhxDgzaLo4ZWmZzJIZPOHw_IurgT9eP';

const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const RAW_DATA = [
  {
    sl: 1,
    room_no: '201',
    bed_label: 'A',
    room_type: 'Single',
    full_name: 'Vineetha v',
    dob: '1989-11-01',
    phone: '9495065370',
    email: 'vineethav1989@gmail.com',
    permanent_address: 'Sarohar,uralath,Muchukunnu,koyilandi,kollam,673307',
    occupation: 'Working',
    institution_or_employer: 'Post master',
    id_proof_type: 'Aadhaar Card',
    id_proof_no: '429456683100',
    emergency_name: 'Husband',
    emergency_relation: 'Husband',
    emergency_phone: '7012757068',
    monthly_rent: 10000,
    ac: 'no'
  },
  {
    sl: 2,
    room_no: '202',
    bed_label: 'A',
    room_type: 'Single',
    full_name: 'Sangamithra K',
    dob: '2007-11-10',
    phone: '8547440448',
    email: null,
    permanent_address: 'Pattarkadav, Vediyath House, Parammal, Malappuram',
    occupation: 'Student',
    institution_or_employer: 'Universal Institute',
    id_proof_type: 'Aadhaar Card',
    id_proof_no: 'XXXXXXXX5292',
    emergency_name: 'Mother',
    emergency_relation: 'Mother',
    emergency_phone: '6282369915',
    monthly_rent: 10000,
    ac: 'no'
  },
  {
    sl: 3,
    room_no: '203',
    bed_label: 'A',
    room_type: 'Single',
    full_name: 'Anshida Ashraf p',
    dob: '1998-09-28',
    phone: '6282725119',
    email: null,
    permanent_address: 'punnakolil [house],kadavathoor[po],kannur,670676',
    occupation: 'Student',
    institution_or_employer: 'Index',
    id_proof_type: 'Aadhaar Card',
    id_proof_no: '794344790418',
    emergency_name: 'Ayisha',
    emergency_relation: 'Mother',
    emergency_phone: '7012575926',
    monthly_rent: 10000,
    ac: 'no'
  },
  {
    sl: 4,
    room_no: '205',
    bed_label: 'A',
    room_type: 'Single',
    full_name: 'Amana fathima ks',
    dob: '2006-05-23',
    phone: '8089897203',
    email: 'amanafathima23@gmail.com',
    permanent_address: 'Komprambil[H],Perumbavoor,Ernakulam,683556',
    occupation: 'Student',
    institution_or_employer: 'Dopa',
    id_proof_type: 'Aadhaar Card',
    id_proof_no: '452413361907',
    emergency_name: 'Shihab',
    emergency_relation: 'Father',
    emergency_phone: '9645993774',
    monthly_rent: 10000,
    ac: 'no'
  },
  {
    sl: 5,
    room_no: '206',
    bed_label: 'A',
    room_type: 'Single',
    full_name: 'Anjana S Pillai',
    dob: '2000-04-01',
    phone: '8075964271',
    email: 'anjanaspillai0333@gmail.com',
    permanent_address: 'Chundanmackal[H],kadanad[po],686653',
    occupation: 'Working',
    institution_or_employer: 'Ayurvedic Therapist',
    id_proof_type: 'Aadhaar Card',
    id_proof_no: '798864800894',
    emergency_name: 'Anilkumar G',
    emergency_relation: 'Father',
    emergency_phone: '9497665635',
    monthly_rent: 10000,
    ac: 'no'
  },
  {
    sl: 6,
    room_no: '207',
    bed_label: 'A',
    room_type: 'Single',
    full_name: 'Ahsana Fathima S',
    dob: '2007-04-29',
    phone: '8921693559',
    email: 'ahsanafathima197@gmail.com',
    permanent_address: 'kureekavil,mangalam,pandalam[po],pathanamthitta',
    occupation: 'Student',
    institution_or_employer: 'Neet Online',
    id_proof_type: 'Aadhaar Card',
    id_proof_no: '482375061309',
    emergency_name: 'Faisal',
    emergency_relation: 'Father',
    emergency_phone: '9037636918',
    monthly_rent: 10000,
    ac: 'no'
  },
  {
    sl: 7,
    room_no: '208',
    bed_label: 'A',
    room_type: 'Single',
    full_name: 'Nadheera A',
    dob: '2003-09-24',
    phone: '9363566231',
    email: 'nadheerax@gmail.com',
    permanent_address: 'podanur,coimbator-641023',
    occupation: 'Student',
    institution_or_employer: 'Dopa',
    id_proof_type: 'Aadhaar Card',
    id_proof_no: '716463101771',
    emergency_name: 'Mohmed Refiq A',
    emergency_relation: 'Father',
    emergency_phone: '9843270806',
    monthly_rent: 10000,
    ac: 'no'
  },
  {
    sl: 8,
    room_no: '209',
    bed_label: 'A',
    room_type: 'Single',
    full_name: 'Afsana Fathima',
    dob: '2011-06-12',
    phone: '7306646281',
    email: null,
    permanent_address: 'kureekavil,mangalam,pandalam[po],pathanamthitta',
    occupation: 'Student',
    institution_or_employer: 'PKMMHSS',
    id_proof_type: 'Aadhaar Card',
    id_proof_no: '258860617363',
    emergency_name: 'Faisal',
    emergency_relation: 'Father',
    emergency_phone: '8921693559',
    monthly_rent: 10000,
    ac: 'no'
  },
  {
    sl: 9,
    room_no: '210',
    bed_label: 'A',
    room_type: 'Single',
    full_name: 'Khadeeja',
    dob: '1999-04-06',
    phone: '8547487288',
    email: null,
    permanent_address: 'Melethil [H], Kadampuzha, 676553[PIN],Malappuram',
    occupation: 'Student',
    institution_or_employer: 'Student',
    id_proof_type: 'Aadhaar Card',
    id_proof_no: '400348838532',
    emergency_name: 'Sainaba',
    emergency_relation: 'Mother',
    emergency_phone: '9961685504',
    monthly_rent: 10000,
    ac: 'no'
  },
  {
    sl: 10,
    room_no: '211',
    bed_label: 'A',
    room_type: 'Single',
    full_name: 'Rahmath EC',
    dob: '1981-11-21',
    phone: '8943684641',
    email: 'rahmaarakkal@gamil.com',
    permanent_address: 'Chembala,Vadaloor, Kozhikode',
    occupation: 'Working',
    institution_or_employer: 'Working',
    id_proof_type: 'Aadhaar Card',
    id_proof_no: '451672699946',
    emergency_name: 'Family',
    emergency_relation: 'Guardian',
    emergency_phone: '8943684641',
    monthly_rent: 10000,
    ac: 'no'
  },
  {
    sl: 11,
    room_no: '212',
    bed_label: 'A',
    room_type: 'Single',
    full_name: 'Anjali PK',
    dob: '1991-11-20',
    phone: '6238190540',
    email: 'dranjusudhi@gmail.com',
    permanent_address: 'Chaithram[H], Muttikulangara [po], Palakkad,678594',
    occupation: 'Working',
    institution_or_employer: 'Dentist',
    id_proof_type: 'Aadhaar Card',
    id_proof_no: '374764566486',
    emergency_name: 'Family',
    emergency_relation: 'Guardian',
    emergency_phone: '6238190540',
    monthly_rent: 10000,
    ac: 'no'
  },
  {
    sl: 12,
    room_no: '213',
    bed_label: 'A',
    room_type: 'Single',
    full_name: 'Fathima Fidha MM',
    dob: '2008-02-07',
    phone: '7025323879',
    email: 'shemithaf@gmail.com',
    permanent_address: 'Mavungal[H], Athani[po], 683585[PIN], Ernakulam',
    occupation: 'Student',
    institution_or_employer: 'Universal Institute',
    id_proof_type: 'Aadhaar Card',
    id_proof_no: '490356150166',
    emergency_name: 'Shemitha VK',
    emergency_relation: 'Mother',
    emergency_phone: '9746643102',
    monthly_rent: 10000,
    ac: 'no'
  },
  {
    sl: 13,
    room_no: '214',
    bed_label: 'A',
    room_type: 'Single',
    full_name: 'Hina Nowfel',
    dob: '2006-03-29',
    phone: '8921925643',
    email: 'hinanowfel@gmail.com',
    permanent_address: 'Punnoyurkulam, Thrissur',
    occupation: 'Student',
    institution_or_employer: 'Almas Hospital',
    id_proof_type: 'Aadhaar Card',
    id_proof_no: '302197076438',
    emergency_name: 'Nowfel AV',
    emergency_relation: 'Father',
    emergency_phone: '7510835403',
    monthly_rent: 10000,
    ac: 'no'
  },
  {
    sl: 14,
    room_no: '215',
    bed_label: 'A',
    room_type: 'Single',
    full_name: 'Anjali Mariya',
    dob: '2001-02-08',
    phone: '8078247753',
    email: 'anjalimariya2001@gmail.com',
    permanent_address: 'Kannampuzha[H], Anchery[PO], Thrissur,680006[PIN]',
    occupation: 'Student',
    institution_or_employer: 'Pacioli',
    id_proof_type: 'Aadhaar Card',
    id_proof_no: '248741549028',
    emergency_name: 'Edwin KP',
    emergency_relation: 'Father',
    emergency_phone: '9947228491',
    monthly_rent: 10000,
    ac: 'no'
  },
  {
    sl: 15,
    room_no: '216',
    bed_label: 'A',
    room_type: 'Single',
    full_name: 'Fathima Risha T',
    dob: '2008-01-20',
    phone: '9847377236',
    email: null,
    permanent_address: 'Thayyil [H], Kuttipuram [PO]',
    occupation: 'Student',
    institution_or_employer: 'Universal Institute',
    id_proof_type: 'Aadhaar Card',
    id_proof_no: '531377090304',
    emergency_name: 'Muhammed Shajir T',
    emergency_relation: 'Father',
    emergency_phone: '9847896835',
    monthly_rent: 10000,
    ac: 'no'
  },
  {
    sl: 16,
    room_no: '217',
    bed_label: 'A',
    room_type: 'Single AC',
    full_name: 'Fathima hanna c',
    dob: '2005-03-25',
    phone: '9846741910',
    email: 'fatrhimahanna234@gmail.com',
    permanent_address: 'Varikkavil paramb,Pnniyankara, kozhikode',
    occupation: 'Working',
    institution_or_employer: 'Kaisen saloon',
    id_proof_type: 'Aadhaar Card',
    id_proof_no: '250476290929',
    emergency_name: 'Family',
    emergency_relation: 'Guardian',
    emergency_phone: '9567704363',
    monthly_rent: 13000,
    ac: 'yes'
  },
  {
    sl: 17,
    room_no: '218',
    bed_label: 'A',
    room_type: 'Single AC',
    full_name: 'Murshida Beevi',
    dob: '2003-04-22',
    phone: '8086991957',
    email: 'beevimurshida@gmail.com',
    permanent_address: 'Darul Bishara ,Jbra Nagar ,[PO] Kollam',
    occupation: 'Student',
    institution_or_employer: 'Almas Hospital',
    id_proof_type: 'Aadhaar Card',
    id_proof_no: '911414642939',
    emergency_name: 'Salahudeen Koya Thangal',
    emergency_relation: 'Father',
    emergency_phone: '9645496991',
    monthly_rent: 13000,
    ac: 'yes'
  },
  {
    sl: 18,
    room_no: '219',
    bed_label: 'A',
    room_type: 'Single AC',
    full_name: 'Smitha Sebastian',
    dob: '2000-02-28',
    phone: '8943282039',
    email: 'smithasebastian23@gamil.com',
    permanent_address: 'Kunnappillil[H], Cheenikuzhi[po], Idukki, 685595',
    occupation: 'Working',
    institution_or_employer: 'MIMS Hospital',
    id_proof_type: 'Aadhaar Card',
    id_proof_no: '338008132562',
    emergency_name: 'Juby Thomas',
    emergency_relation: 'Father',
    emergency_phone: '9895833992',
    monthly_rent: 13000,
    ac: 'yes'
  },
  {
    sl: 19,
    room_no: '204',
    bed_label: 'A',
    room_type: 'Three share',
    full_name: 'Fathima Fiza v',
    dob: '2009-02-20',
    phone: '9995248080',
    email: null,
    permanent_address: 'Valappil[H], Jeelani Nagar, Cherumukku[po],Tirurangadi',
    occupation: 'Student',
    institution_or_employer: 'Universal Institute',
    id_proof_type: 'Aadhaar Card',
    id_proof_no: '617610217513',
    emergency_name: 'Sakkir Hussain v',
    emergency_relation: 'Father',
    emergency_phone: '9778534010',
    monthly_rent: 8000,
    ac: 'no'
  },
  {
    sl: 20,
    room_no: '204',
    bed_label: 'B',
    room_type: 'Three share',
    full_name: 'Sonal M',
    dob: '2010-11-10',
    phone: '9497670054',
    email: null,
    permanent_address: 'Makkada[H], Neduva[po], Prappanangadi,676303',
    occupation: 'Student',
    institution_or_employer: 'Universal Institute',
    id_proof_type: 'Aadhaar Card',
    id_proof_no: '815719481381',
    emergency_name: 'Shaji M',
    emergency_relation: 'Father',
    emergency_phone: '9895060054',
    monthly_rent: 8000,
    ac: 'no'
  }
];

async function runImport() {
  console.log('--- Starting Real Resident Import to Supabase ---');

  // Authenticate as admin
  const { data: auth, error: authErr } = await client.auth.signInWithPassword({
    email: 'admin@maythree.com',
    password: 'admin123'
  });
  if (authErr) {
    console.error('Admin Auth failed:', authErr);
    process.exit(1);
  }
  console.log('Admin authenticated successfully:', auth.user.email);

  // 1. Fetch rooms and room types
  const { data: rooms, error: roomsErr } = await client.from('rooms').select('id, room_no, room_type_id');
  if (roomsErr) throw roomsErr;
  const roomMap = new Map(rooms.map(r => [r.room_no, r]));

  const { data: roomTypes, error: rtErr } = await client.from('room_types').select('id, name');
  if (rtErr) throw rtErr;
  const rtMapByName = new Map(roomTypes.map(rt => [rt.name.toLowerCase(), rt.id]));

  // 2. Fetch all beds for these rooms
  const { data: beds, error: bedsErr } = await client.from('beds').select('id, room_id, bed_label, status');
  if (bedsErr) throw bedsErr;

  // Build a lookup: `${room_no}-${bed_label}` -> bed
  const bedLookup = new Map();
  for (const b of beds) {
    const room = rooms.find(r => r.id === b.room_id);
    if (room) {
      bedLookup.set(`${room.room_no}-${b.bed_label}`, b);
    }
  }

  // 3. Fetch existing residents to avoid duplication
  const { data: existingResidents } = await client.from('residents').select('id, bed_id, application:applications(phone, full_name)');
  const existingPhones = new Set();
  const existingBeds = new Set();
  for (const r of (existingResidents || [])) {
    if (r.application && r.application.phone) {
      existingPhones.add(r.application.phone);
    }
    if (r.bed_id) {
      existingBeds.add(r.bed_id);
    }
  }

  let importedCount = 0;
  const importedList = [];

  for (const item of RAW_DATA) {
    // Check if bed exists
    const bedKey = `${item.room_no}-${item.bed_label}`;
    const bed = bedLookup.get(bedKey);
    if (!bed) {
      console.warn(`[SKIP] Bed ${bedKey} not found in database!`);
      continue;
    }

    if (existingPhones.has(item.phone)) {
      console.log(`[SKIP] Resident ${item.full_name} (${item.phone}) already exists in database.`);
      continue;
    }

    // Determine preferred_room_type_id
    let prefTypeId = null;
    if (item.room_type.toLowerCase().includes('single')) {
      prefTypeId = rtMapByName.get('single room') || '22222222-2222-2222-2222-222222222222';
    } else if (item.room_type.toLowerCase().includes('twin') || item.room_type.toLowerCase().includes('three') || item.room_type.toLowerCase().includes('share')) {
      prefTypeId = rtMapByName.get('twin sharing') || '11111111-1111-1111-1111-111111111111';
    }

    const appId = crypto.randomUUID();
    const refNo = `HST-2026-${String(item.sl).padStart(4, '0')}`;

    // A. Create Application
    const { error: appInsertErr } = await client.from('applications').insert([{
      id: appId,
      ref_no: refNo,
      full_name: item.full_name,
      dob: item.dob,
      phone: item.phone,
      email: item.email,
      permanent_address: item.permanent_address,
      occupation: item.occupation,
      institution_or_employer: item.institution_or_employer,
      id_proof_type: item.id_proof_type,
      id_proof_no: item.id_proof_no,
      emergency_name: item.emergency_name,
      emergency_relation: item.emergency_relation,
      emergency_phone: item.emergency_phone,
      preferred_room_type_id: prefTypeId,
      preferred_ac: item.ac,
      status: 'approved',
      submitted_at: '2026-08-01T09:00:00.000Z',
      reviewed_by: auth.user.id,
      review_note: 'Approved - Imported from Master Sheet'
    }]);

    if (appInsertErr) {
      console.error(`Error inserting application for ${item.full_name}:`, appInsertErr);
      continue;
    }

    // B. Create Resident
    const residentId = crypto.randomUUID();
    const pin = Math.floor(1000 + Math.random() * 9000).toString();

    const { error: resInsertErr } = await client.from('residents').insert([{
      id: residentId,
      application_id: appId,
      bed_id: bed.id,
      check_in_date: '2026-08-01',
      monthly_rent: item.monthly_rent,
      deposit_amount: 0,
      status: 'active',
      pin: pin,
      pin_active: true
    }]);

    if (resInsertErr) {
      console.error(`Error inserting resident for ${item.full_name}:`, resInsertErr);
      continue;
    }

    // C. Update Bed status to 'occupied'
    const { error: bedUpdateErr } = await client.from('beds').update({
      status: 'occupied'
    }).eq('id', bed.id);

    if (bedUpdateErr) {
      console.error(`Error updating bed status for ${bedKey}:`, bedUpdateErr);
    }

    importedCount++;
    importedList.push({
      name: item.full_name,
      room_no: item.room_no,
      bed_label: item.bed_label,
      rent: item.monthly_rent,
      phone: item.phone,
      pin: pin
    });
  }

  console.log(`\n=== IMPORT SUMMARY ===`);
  console.log(`Successfully imported: ${importedCount} residents`);
  console.table(importedList);

  // Verify total occupied beds in DB
  const { count: occupiedCount } = await client.from('beds').select('*', { count: 'exact', head: true }).eq('status', 'occupied');
  const { count: totalResidents } = await client.from('residents').select('*', { count: 'exact', head: true });
  console.log(`Live Supabase Status:`);
  console.log(`- Total Occupied Beds: ${occupiedCount}`);
  console.log(`- Total Active Residents in DB: ${totalResidents}`);
}

runImport().catch(err => {
  console.error('Fatal error during import:', err);
  process.exit(1);
});
