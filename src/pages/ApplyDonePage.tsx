import { useLocation, Link } from 'react-router-dom'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CheckCircle, Building2, Phone } from 'lucide-react'

export function ApplyDonePage() {
  const location = useLocation()
  const refNo = location.state?.refNo || 'HST-2026-XXXX'

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary/5 to-background flex items-center justify-center p-4">
      <Card className="max-w-md w-full text-center">
        <CardContent className="p-8">
          <div className="flex justify-center mb-4">
            <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
          </div>
          <h1 className="text-2xl font-bold mb-2">Application Submitted!</h1>
          <p className="text-muted-foreground mb-6">Your application has been received successfully.</p>
          <div className="bg-primary/5 rounded-lg p-4 mb-6">
            <p className="text-sm text-muted-foreground mb-1">Your Reference Number</p>
            <p className="text-2xl font-mono font-bold text-primary">{refNo}</p>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            Please save this reference number. Our staff will review your application and contact you soon.
          </p>
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Phone className="h-4 w-4" />
            <span>We will contact you within 24–48 hours</span>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
