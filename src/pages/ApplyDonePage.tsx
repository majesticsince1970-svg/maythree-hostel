import { useLocation, Link } from 'react-router-dom'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { BRAND } from '@/lib/brandConfig'
import { MythreeLogo } from '@/components/MythreeLogo'
import { CheckCircle2, Clock, Phone, Mail, MapPin, ArrowLeft, Printer } from 'lucide-react'

export function ApplyDonePage() {
  const location = useLocation()
  const refNo = location.state?.refNo || 'HST-2026-XXXX'
  const applicantName = location.state?.name || 'Applicant'

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary/5 via-background to-background flex items-center justify-center p-4">
      <Card className="max-w-md w-full text-center border-2 border-emerald-500/20 shadow-xl overflow-hidden">
        {/* Top brand header */}
        <div className="bg-primary/5 p-4 border-b flex flex-col items-center gap-1">
          <MythreeLogo variant="horizontal" size="md" />
          <p className="text-[11px] text-muted-foreground font-medium">{BRAND.shortName} · Admissions</p>
        </div>

        <CardContent className="p-6 space-y-5">
          {/* Success Checkmark */}
          <div className="flex justify-center">
            <div className="h-16 w-16 rounded-full bg-emerald-100 dark:bg-emerald-950/40 flex items-center justify-center animate-bounce-once">
              <CheckCircle2 className="h-10 w-10 text-emerald-600 dark:text-emerald-400" />
            </div>
          </div>

          {/* Heading */}
          <div className="space-y-1">
            <h1 className="text-xl font-bold text-foreground">Application Submitted Successfully</h1>
            <p className="text-xs text-muted-foreground">
              Thank you, <strong className="text-foreground">{applicantName}</strong>. Your admission request has been recorded.
            </p>
          </div>

          {/* Clear Visual Feedback Banner requested by user */}
          <div className="p-3.5 bg-amber-50/90 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-800 rounded-xl flex items-center gap-2.5 text-left">
            <Clock className="h-5 w-5 text-amber-600 shrink-0" />
            <div className="text-xs">
              <p className="font-semibold text-amber-900 dark:text-amber-300">
                Application submitted successfully. Awaiting admin approval.
              </p>
              <p className="text-amber-800/80 dark:text-amber-400 text-[11px] mt-0.5">
                Our hostel warden & admin team will review your submitted documents and allocate a room.
              </p>
            </div>
          </div>

          {/* Reference Number Box */}
          <div className="bg-primary/5 border rounded-xl p-4 space-y-1">
            <div className="flex items-center justify-center gap-1.5 mb-1">
              <Badge variant="outline" className="text-[10px] bg-amber-100 text-amber-800 border-amber-300 font-semibold">
                Status: Pending Approval
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">Application Reference Number</p>
            <p className="text-2xl font-mono font-extrabold text-primary tracking-wider">{refNo}</p>
            <p className="text-[11px] text-muted-foreground">
              Please save or screenshot this number for follow-up
            </p>
          </div>

          {/* Contact Details */}
          <div className="text-xs text-muted-foreground space-y-1.5 border-t pt-3 text-left">
            <p className="font-semibold text-foreground text-[11px] uppercase tracking-wide">Hostel Office Contact</p>
            <p className="flex items-center gap-2">
              <Phone className="h-3.5 w-3.5 text-primary shrink-0" />
              <span>{BRAND.contacts.phoneFormatted}</span>
            </p>
            <p className="flex items-center gap-2">
              <Mail className="h-3.5 w-3.5 text-primary shrink-0" />
              <span>{BRAND.contacts.email}</span>
            </p>
            <p className="flex items-start gap-2">
              <MapPin className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
              <span className="text-[11px] leading-tight">{BRAND.address.full}</span>
            </p>
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              size="sm"
              className="text-xs flex-1 gap-1.5"
              onClick={() => window.print()}
            >
              <Printer className="h-3.5 w-3.5" />
              Print / Save Reference
            </Button>
            <Link to="/apply" className="flex-1">
              <Button size="sm" className="w-full text-xs gap-1.5">
                <ArrowLeft className="h-3.5 w-3.5" />
                New Application
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
