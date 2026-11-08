import { useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { useDemoData } from '@/contexts/DemoDataContext'
import { ApplicationsPage } from '@/pages/ApplicationsPage'
import { RoomsPage } from '@/pages/RoomsPage'
import { VacateResidentManager } from '@/components/VacateResidentManager'
import { AdmissionQrCard } from '@/components/AdmissionQrCard'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  ClipboardList, BedDouble, UserMinus, QrCode,
  ExternalLink, Copy, Check, Sparkles, Building2
} from 'lucide-react'
import { useToast } from '@/components/ui/toast'

export function AdmissionsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  const { addToast } = useToast()
  const { applications } = useDemoData()
  const currentTab = searchParams.get('tab') || 'applications'
  const [copied, setCopied] = useState(false)

  const pendingVerificationCount = applications.filter(
    a => a.status === 'pending_approval' || a.status === 'submitted' || a.status === 'under_review'
  ).length

  const publicApplyUrl = `${window.location.origin}/apply`

  const setTab = (tab: string) => {
    setSearchParams({ tab })
  }

  const handleCopyLink = () => {
    navigator.clipboard.writeText(publicApplyUrl)
    setCopied(true)
    addToast({ type: 'success', title: 'Link Copied', description: 'Public QR admission form link copied to clipboard.' })
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="space-y-6">
      {/* Module Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BedDouble className="h-6 w-6 text-primary" />
            Admissions & Rooms
          </h1>
          <p className="text-muted-foreground text-sm">
            Manage student admissions, bed allocation, room inventory, and resident vacating
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopyLink}
            className="text-xs"
          >
            {copied ? <Check className="h-3.5 w-3.5 mr-1 text-green-600" /> : <Copy className="h-3.5 w-3.5 mr-1" />}
            {copied ? 'Copied' : 'Copy Public Form Link'}
          </Button>
          <Button
            size="sm"
            onClick={() => window.open('/apply', '_blank')}
            className="text-xs"
          >
            <ExternalLink className="h-3.5 w-3.5 mr-1" />
            Open QR Form
          </Button>
        </div>
      </div>

      {/* Sub-navigation Tabs */}
      <div className="flex flex-wrap items-center gap-2 p-1.5 bg-muted/60 rounded-xl border">
        <Button
          variant={currentTab === 'applications' ? 'default' : 'ghost'}
          size="sm"
          className="text-xs h-9"
          onClick={() => setTab('applications')}
        >
          <ClipboardList className="h-4 w-4 mr-1.5" />
          New Admissions
          {pendingVerificationCount > 0 && (
            <Badge variant="destructive" className="ml-1.5 px-1.5 py-0 text-[10px] h-4">
              {pendingVerificationCount}
            </Badge>
          )}
        </Button>
        <Button
          variant={currentTab === 'rooms' ? 'default' : 'ghost'}
          size="sm"
          className="text-xs h-9"
          onClick={() => setTab('rooms')}
        >
          <BedDouble className="h-4 w-4 mr-1.5" />
          Room & Bed Board
        </Button>
        <Button
          variant={currentTab === 'vacate' ? 'default' : 'ghost'}
          size="sm"
          className="text-xs h-9"
          onClick={() => setTab('vacate')}
        >
          <UserMinus className="h-4 w-4 mr-1.5" />
          Vacate Resident
        </Button>
        <Button
          variant={currentTab === 'qr' ? 'default' : 'ghost'}
          size="sm"
          className="text-xs h-9"
          onClick={() => setTab('qr')}
        >
          <QrCode className="h-4 w-4 mr-1.5" />
          QR Admission Form
        </Button>
      </div>

      {/* Module Content */}
      {currentTab === 'applications' && <ApplicationsPage />}
      {currentTab === 'rooms' && <RoomsPage />}
      {currentTab === 'vacate' && <VacateResidentManager />}
      {currentTab === 'qr' && <AdmissionQrCard />}
    </div>
  )
}

