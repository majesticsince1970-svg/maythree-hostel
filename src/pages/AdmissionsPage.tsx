import { useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { ApplicationsPage } from '@/pages/ApplicationsPage'
import { RoomsPage } from '@/pages/RoomsPage'
import { VacateResidentManager } from '@/components/VacateResidentManager'
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
  const currentTab = searchParams.get('tab') || 'applications'
  const [copied, setCopied] = useState(false)

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
      {currentTab === 'qr' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <QrCode className="h-5 w-5 text-primary" />
              Public QR Admission Portal
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Prospective students and working women can scan this QR code or use the link below to apply for hostel admission directly from their mobile phones.
            </p>
            <div className="p-6 bg-muted/40 rounded-xl border flex flex-col sm:flex-row items-center gap-6 justify-center">
              <div className="p-4 bg-white rounded-xl border shadow-sm text-center">
                <div className="w-44 h-44 bg-neutral-900 rounded-lg flex flex-col items-center justify-center text-white p-3">
                  <QrCode className="w-24 h-24 text-white mb-2" />
                  <span className="text-[10px] font-mono tracking-widest text-neutral-300">SCAN TO APPLY</span>
                </div>
              </div>
              <div className="space-y-3 text-center sm:text-left">
                <div>
                  <h4 className="font-semibold text-base">MayThree Admission Form</h4>
                  <p className="text-xs text-muted-foreground mt-0.5 font-mono">{publicApplyUrl}</p>
                </div>
                <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
                  <Button size="sm" onClick={handleCopyLink}>
                    {copied ? <Check className="h-4 w-4 mr-1.5" /> : <Copy className="h-4 w-4 mr-1.5" />}
                    {copied ? 'Link Copied!' : 'Copy Form URL'}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => window.open('/apply', '_blank')}>
                    <ExternalLink className="h-4 w-4 mr-1.5" />
                    Open Form in New Tab
                  </Button>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Applications submitted here appear instantly in the <strong>New Admissions</strong> tab for staff verification.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

