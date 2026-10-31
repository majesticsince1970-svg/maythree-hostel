import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { useDemoData } from '@/contexts/DemoDataContext'
import { formatCurrency } from '@/lib/utils'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, ChevronRight, Upload, CheckCircle, Building2 } from 'lucide-react'

const personalSchema = z.object({
  full_name: z.string().min(2, 'Name is required'),
  dob: z.string().min(1, 'Date of birth is required'),
  phone: z.string().regex(/^[6-9]\d{9}$/, 'Enter a valid 10-digit Indian mobile number'),
  email: z.string().email('Enter a valid email').or(z.literal('')).optional(),
  preferred_room_type_id: z.string().min(1, 'Select a room preference'),
  preferred_ac: z.enum(['yes', 'no', 'any']),
})

const addressSchema = z.object({
  permanent_address: z.string().min(10, 'Enter your full address'),
  occupation: z.string().min(2, 'Occupation is required'),
  institution_or_employer: z.string().min(2, 'Institution/employer is required'),
  id_proof_type: z.string().min(1, 'Select ID proof type'),
  id_proof_no: z.string().min(4, 'Enter ID proof number'),
})

const emergencySchema = z.object({
  emergency_name: z.string().min(2, 'Emergency contact name is required'),
  emergency_relation: z.string().min(2, 'Relation is required'),
  emergency_phone: z.string().regex(/^[6-9]\d{9}$/, 'Enter a valid 10-digit mobile number'),
})

type PersonalData = z.infer<typeof personalSchema>
type AddressData = z.infer<typeof addressSchema>
type EmergencyData = z.infer<typeof emergencySchema>

export function ApplyPage() {
  const [step, setStep] = useState(1)
  const [personalData, setPersonalData] = useState<PersonalData | null>(null)
  const [addressData, setAddressData] = useState<AddressData | null>(null)
  const [emergencyData, setEmergencyData] = useState<EmergencyData | null>(null)
  const [documents, setDocuments] = useState<{ photo?: File; id_proof?: File; certificate?: File }>({})
  const [agreed, setAgreed] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const { publicRoomOptions, addApplication, roomTypes } = useDemoData()
  const navigate = useNavigate()

  const personalForm = useForm<PersonalData>({
    resolver: zodResolver(personalSchema),
    defaultValues: personalData || { full_name: '', dob: '', phone: '', email: '', preferred_room_type_id: '', preferred_ac: 'any' },
  })

  const addressForm = useForm<AddressData>({
    resolver: zodResolver(addressSchema),
    defaultValues: addressData || { permanent_address: '', occupation: '', institution_or_employer: '', id_proof_type: '', id_proof_no: '' },
  })

  const emergencyForm = useForm<EmergencyData>({
    resolver: zodResolver(emergencySchema),
    defaultValues: emergencyData || { emergency_name: '', emergency_relation: '', emergency_phone: '' },
  })

  const handleNext = async () => {
    if (step === 1) {
      const valid = await personalForm.trigger()
      if (valid) { setPersonalData(personalForm.getValues()); setStep(2) }
    } else if (step === 2) {
      const valid = await addressForm.trigger()
      if (valid) { setAddressData(addressForm.getValues()); setStep(3) }
    } else if (step === 3) {
      const valid = await emergencyForm.trigger()
      if (valid) { setEmergencyData(emergencyForm.getValues()); setStep(4) }
    } else if (step === 4) {
      if (!documents.photo) { alert('Please upload a photo'); return }
      if (!documents.id_proof) { alert('Please upload ID proof'); return }
      setStep(5)
    }
  }

  const handleSubmit = async () => {
    if (!personalData || !addressData || !emergencyData || !agreed) return
    setSubmitting(true)
    try {
      const app = addApplication({
        full_name: personalData.full_name,
        dob: personalData.dob,
        phone: personalData.phone,
        email: personalData.email || null,
        permanent_address: addressData.permanent_address,
        occupation: addressData.occupation,
        institution_or_employer: addressData.institution_or_employer,
        id_proof_type: addressData.id_proof_type,
        id_proof_no: addressData.id_proof_no,
        emergency_name: emergencyData.emergency_name,
        emergency_relation: emergencyData.emergency_relation,
        emergency_phone: emergencyData.emergency_phone,
        preferred_room_type_id: personalData.preferred_room_type_id,
        preferred_ac: personalData.preferred_ac,
        documents: [],
        preferred_room_type: roomTypes.find(rt => rt.id === personalData.preferred_room_type_id),
      })
      navigate('/apply/done', { state: { refNo: app.ref_no } })
    } catch {
      alert('Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const steps = ['Personal', 'Address', 'Emergency', 'Documents', 'Review']

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary/5 to-background">
      <div className="max-w-lg mx-auto px-4 py-6">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Building2 className="h-8 w-8 text-primary" />
            <h1 className="text-2xl font-bold">MayThree Hostel</h1>
          </div>
          <p className="text-muted-foreground text-sm">Women's Hostel Admission Form</p>
        </div>

        {/* Progress */}
        <div className="flex items-center justify-between mb-8 px-2">
          {steps.map((s, i) => (
            <div key={s} className="flex items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                i + 1 < step ? 'bg-primary text-primary-foreground' :
                i + 1 === step ? 'bg-primary text-primary-foreground ring-4 ring-primary/20' :
                'bg-muted text-muted-foreground'
              }`}>
                {i + 1 < step ? <CheckCircle className="h-4 w-4" /> : i + 1}
              </div>
              {i < steps.length - 1 && <div className={`w-6 sm:w-10 h-0.5 mx-1 ${i + 1 < step ? 'bg-primary' : 'bg-muted'}`} />}
            </div>
          ))}
        </div>

        {/* Step 1: Personal */}
        {step === 1 && (
          <Card>
            <CardHeader>
              <CardTitle>Personal Details</CardTitle>
              <CardDescription>Enter your basic information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="full_name">Full Name *</Label>
                <Input id="full_name" {...personalForm.register('full_name')} placeholder="Enter your full name" className="mt-1" />
                {personalForm.formState.errors.full_name && <p className="text-xs text-destructive mt-1">{personalForm.formState.errors.full_name.message}</p>}
              </div>
              <div>
                <Label htmlFor="dob">Date of Birth *</Label>
                <Input id="dob" type="date" {...personalForm.register('dob')} className="mt-1" />
                {personalForm.formState.errors.dob && <p className="text-xs text-destructive mt-1">{personalForm.formState.errors.dob.message}</p>}
              </div>
              <div>
                <Label htmlFor="phone">Mobile Number *</Label>
                <Input id="phone" {...personalForm.register('phone')} placeholder="10-digit mobile number" className="mt-1" />
                {personalForm.formState.errors.phone && <p className="text-xs text-destructive mt-1">{personalForm.formState.errors.phone.message}</p>}
              </div>
              <div>
                <Label htmlFor="email">Email (optional)</Label>
                <Input id="email" type="email" {...personalForm.register('email')} placeholder="your@email.com" className="mt-1" />
              </div>
              <div>
                <Label>Room Preference *</Label>
                <div className="space-y-2 mt-2">
                  {publicRoomOptions.map((opt) => (
                    <label key={opt.room_type} className={`flex items-center justify-between p-3 border rounded-lg cursor-pointer transition-colors ${
                      personalForm.watch('preferred_room_type_id') === roomTypes.find(rt => opt.room_type.includes(rt.name))?.id
                        ? 'border-primary bg-primary/5' : 'hover:border-primary/50'
                    }`}>
                      <div className="flex items-center gap-3">
                        <input
                          type="radio"
                          {...personalForm.register('preferred_room_type_id')}
                          value={roomTypes.find(rt => opt.room_type.includes(rt.name))?.id || ''}
                          className="text-primary"
                        />
                        <div>
                          <p className="font-medium text-sm">{opt.room_type}</p>
                          <p className="text-xs text-muted-foreground">{opt.beds_available} beds available</p>
                        </div>
                      </div>
                      <p className="font-semibold text-primary">{formatCurrency(opt.rent_per_head)}/mo</p>
                    </label>
                  ))}
                </div>
                {personalForm.formState.errors.preferred_room_type_id && <p className="text-xs text-destructive mt-1">{personalForm.formState.errors.preferred_room_type_id.message}</p>}
              </div>
              <div>
                <Label>AC Preference</Label>
                <div className="flex gap-3 mt-2">
                  {(['any', 'yes', 'no'] as const).map((v) => (
                    <label key={v} className={`flex-1 text-center p-2 border rounded-lg cursor-pointer text-sm ${
                      personalForm.watch('preferred_ac') === v ? 'border-primary bg-primary/5 font-medium' : ''
                    }`}>
                      <input type="radio" {...personalForm.register('preferred_ac')} value={v} className="sr-only" />
                      {v === 'any' ? 'No preference' : v === 'yes' ? 'AC' : 'Non-AC'}
                    </label>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Address */}
        {step === 2 && (
          <Card>
            <CardHeader>
              <CardTitle>Address & Occupation</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="permanent_address">Permanent Address *</Label>
                <Textarea id="permanent_address" {...addressForm.register('permanent_address')} placeholder="Full address with PIN code" className="mt-1" rows={3} />
                {addressForm.formState.errors.permanent_address && <p className="text-xs text-destructive mt-1">{addressForm.formState.errors.permanent_address.message}</p>}
              </div>
              <div>
                <Label htmlFor="occupation">Occupation *</Label>
                <select {...addressForm.register('occupation')} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm mt-1">
                  <option value="">Select occupation</option>
                  <option value="Student">Student</option>
                  <option value="Working Professional">Working Professional</option>
                  <option value="Other">Other</option>
                </select>
                {addressForm.formState.errors.occupation && <p className="text-xs text-destructive mt-1">{addressForm.formState.errors.occupation.message}</p>}
              </div>
              <div>
                <Label htmlFor="institution_or_employer">Institution / Employer *</Label>
                <Input id="institution_or_employer" {...addressForm.register('institution_or_employer')} placeholder="College or company name" className="mt-1" />
                {addressForm.formState.errors.institution_or_employer && <p className="text-xs text-destructive mt-1">{addressForm.formState.errors.institution_or_employer.message}</p>}
              </div>
              <div>
                <Label htmlFor="id_proof_type">ID Proof Type *</Label>
                <select {...addressForm.register('id_proof_type')} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm mt-1">
                  <option value="">Select ID type</option>
                  <option value="Aadhaar">Aadhaar Card</option>
                  <option value="PAN">PAN Card</option>
                  <option value="Passport">Passport</option>
                  <option value="Voter ID">Voter ID</option>
                  <option value="Driving License">Driving License</option>
                </select>
                {addressForm.formState.errors.id_proof_type && <p className="text-xs text-destructive mt-1">{addressForm.formState.errors.id_proof_type.message}</p>}
              </div>
              <div>
                <Label htmlFor="id_proof_no">ID Proof Number *</Label>
                <Input id="id_proof_no" {...addressForm.register('id_proof_no')} placeholder="Enter ID number" className="mt-1" />
                {addressForm.formState.errors.id_proof_no && <p className="text-xs text-destructive mt-1">{addressForm.formState.errors.id_proof_no.message}</p>}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 3: Emergency */}
        {step === 3 && (
          <Card>
            <CardHeader>
              <CardTitle>Emergency Contact</CardTitle>
              <CardDescription>In case we need to reach your family</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="emergency_name">Contact Name *</Label>
                <Input id="emergency_name" {...emergencyForm.register('emergency_name')} placeholder="Parent or guardian name" className="mt-1" />
                {emergencyForm.formState.errors.emergency_name && <p className="text-xs text-destructive mt-1">{emergencyForm.formState.errors.emergency_name.message}</p>}
              </div>
              <div>
                <Label htmlFor="emergency_relation">Relation *</Label>
                <select {...emergencyForm.register('emergency_relation')} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm mt-1">
                  <option value="">Select relation</option>
                  <option value="Father">Father</option>
                  <option value="Mother">Mother</option>
                  <option value="Guardian">Guardian</option>
                  <option value="Spouse">Spouse</option>
                  <option value="Sibling">Sibling</option>
                  <option value="Other">Other</option>
                </select>
                {emergencyForm.formState.errors.emergency_relation && <p className="text-xs text-destructive mt-1">{emergencyForm.formState.errors.emergency_relation.message}</p>}
              </div>
              <div>
                <Label htmlFor="emergency_phone">Contact Phone *</Label>
                <Input id="emergency_phone" {...emergencyForm.register('emergency_phone')} placeholder="10-digit mobile number" className="mt-1" />
                {emergencyForm.formState.errors.emergency_phone && <p className="text-xs text-destructive mt-1">{emergencyForm.formState.errors.emergency_phone.message}</p>}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 4: Documents */}
        {step === 4 && (
          <Card>
            <CardHeader>
              <CardTitle>Upload Documents</CardTitle>
              <CardDescription>JPG, PNG or PDF, max 5 MB each</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {([
                { key: 'photo' as const, label: 'Your Photo *', accept: 'image/*' },
                { key: 'id_proof' as const, label: 'ID Proof *', accept: 'image/*,.pdf' },
                { key: 'certificate' as const, label: 'Certificate (optional)', accept: 'image/*,.pdf' },
              ]).map(({ key, label, accept }) => (
                <div key={key}>
                  <Label>{label}</Label>
                  <label className={`mt-1 flex items-center gap-3 p-4 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${
                    documents[key] ? 'border-primary bg-primary/5' : 'hover:border-primary/50'
                  }`}>
                    <Upload className="h-5 w-5 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">
                      {documents[key] ? documents[key]!.name : 'Tap to upload or take a photo'}
                    </span>
                    <input
                      type="file"
                      accept={accept}
                      capture={key === 'photo' ? 'user' : undefined}
                      className="sr-only"
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (file) setDocuments(prev => ({ ...prev, [key]: file }))
                      }}
                    />
                  </label>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Step 5: Review */}
        {step === 5 && personalData && addressData && emergencyData && (
          <Card>
            <CardHeader>
              <CardTitle>Review Your Application</CardTitle>
              <CardDescription>Please verify all details before submitting</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3 text-sm">
                <h4 className="font-semibold text-primary">Personal Details</h4>
                <div className="grid grid-cols-2 gap-2 bg-muted/50 p-3 rounded-lg">
                  <p className="text-muted-foreground">Name</p><p className="font-medium">{personalData.full_name}</p>
                  <p className="text-muted-foreground">DOB</p><p className="font-medium">{personalData.dob}</p>
                  <p className="text-muted-foreground">Phone</p><p className="font-medium">{personalData.phone}</p>
                  {personalData.email && <><p className="text-muted-foreground">Email</p><p className="font-medium">{personalData.email}</p></>}
                </div>
                <h4 className="font-semibold text-primary">Address & Occupation</h4>
                <div className="grid grid-cols-2 gap-2 bg-muted/50 p-3 rounded-lg">
                  <p className="text-muted-foreground">Address</p><p className="font-medium col-span-1">{addressData.permanent_address}</p>
                  <p className="text-muted-foreground">Occupation</p><p className="font-medium">{addressData.occupation}</p>
                  <p className="text-muted-foreground">Institution</p><p className="font-medium">{addressData.institution_or_employer}</p>
                  <p className="text-muted-foreground">ID Type</p><p className="font-medium">{addressData.id_proof_type}</p>
                  <p className="text-muted-foreground">ID No</p><p className="font-medium">{addressData.id_proof_no}</p>
                </div>
                <h4 className="font-semibold text-primary">Emergency Contact</h4>
                <div className="grid grid-cols-2 gap-2 bg-muted/50 p-3 rounded-lg">
                  <p className="text-muted-foreground">Name</p><p className="font-medium">{emergencyData.emergency_name}</p>
                  <p className="text-muted-foreground">Relation</p><p className="font-medium">{emergencyData.emergency_relation}</p>
                  <p className="text-muted-foreground">Phone</p><p className="font-medium">{emergencyData.emergency_phone}</p>
                </div>
                <h4 className="font-semibold text-primary">Documents</h4>
                <div className="bg-muted/50 p-3 rounded-lg space-y-1">
                  <p className="text-sm">📷 Photo: {documents.photo?.name || 'Not uploaded'}</p>
                  <p className="text-sm">🪪 ID Proof: {documents.id_proof?.name || 'Not uploaded'}</p>
                  {documents.certificate && <p className="text-sm">📄 Certificate: {documents.certificate.name}</p>}
                </div>
              </div>
              <label className="flex items-start gap-3 p-3 border rounded-lg cursor-pointer">
                <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} className="mt-0.5" />
                <span className="text-xs text-muted-foreground">
                  I confirm that the information provided is correct. I consent to the hostel collecting, storing and using this data for admission and hostel management purposes.
                </span>
              </label>
            </CardContent>
          </Card>
        )}

        {/* Navigation */}
        <div className="flex justify-between mt-6">
          {step > 1 && (
            <Button variant="outline" onClick={() => setStep(step - 1)}>
              <ChevronLeft className="h-4 w-4 mr-1" /> Back
            </Button>
          )}
          {step < 5 ? (
            <Button onClick={handleNext} className="ml-auto">
              Next <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          ) : (
            <Button onClick={handleSubmit} disabled={!agreed || submitting} className="ml-auto">
              {submitting ? 'Submitting...' : 'Submit Application'}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
