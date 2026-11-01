import { useState, useRef } from 'react'
import { QRCodeCanvas } from 'qrcode.react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/components/ui/toast'
import { BRAND } from '@/lib/brandConfig'
import { MythreeLogo } from '@/components/MythreeLogo'
import {
  Download, Printer, Copy, Check, ExternalLink, QrCode,
  Smartphone, ShieldCheck, MapPin, Phone
} from 'lucide-react'

export function AdmissionQrCard() {
  const { addToast } = useToast()
  const [copied, setCopied] = useState(false)
  const qrRef = useRef<HTMLDivElement>(null)

  const publicApplyUrl = typeof window !== 'undefined' ? `${window.location.origin}/apply` : '/apply'

  const handleCopyLink = () => {
    navigator.clipboard.writeText(publicApplyUrl)
    setCopied(true)
    addToast({
      type: 'success',
      title: 'Link Copied',
      description: 'Public admission link copied to clipboard.'
    })
    setTimeout(() => setCopied(false), 2000)
  }

  const handleDownloadPng = () => {
    const canvas = qrRef.current?.querySelector('canvas')
    if (!canvas) {
      addToast({ type: 'error', title: 'Error', description: 'Could not generate QR code image.' })
      return
    }

    // Create a branded canvas with official Mythree title and border for download
    const exportCanvas = document.createElement('canvas')
    const ctx = exportCanvas.getContext('2d')
    if (!ctx) return

    exportCanvas.width = 650
    exportCanvas.height = 850

    // White background
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, 650, 850)

    // Top brand navy banner
    ctx.fillStyle = '#10375C'
    ctx.fillRect(0, 0, 650, 130)

    // Header text inside banner
    ctx.fillStyle = '#ffffff'
    ctx.font = '900 36px sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText('MYTHREE LADIES HOSTEL', 325, 60)

    ctx.font = '700 14px sans-serif'
    ctx.fillStyle = '#EAF2F8'
    ctx.fillText(BRAND.roomTypesSummary.toUpperCase(), 325, 95)

    // Outer border
    ctx.strokeStyle = '#10375C'
    ctx.lineWidth = 4
    ctx.strokeRect(12, 12, 626, 826)

    // Draw QR canvas in center
    ctx.drawImage(canvas, 145, 175, 360, 360)

    // Call to action
    ctx.fillStyle = '#10375C'
    ctx.font = '900 26px sans-serif'
    ctx.fillText('SCAN TO APPLY FOR ADMISSION', 325, 580)

    ctx.fillStyle = '#475569'
    ctx.font = '14px sans-serif'
    ctx.fillText('Point your smartphone camera to open the instant admission form', 325, 615)

    ctx.fillStyle = '#0f172a'
    ctx.font = 'bold 15px monospace'
    ctx.fillText(publicApplyUrl, 325, 650)

    // Divider
    ctx.strokeStyle = '#cbd5e1'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(40, 680)
    ctx.lineTo(610, 680)
    ctx.stroke()

    // Address & Contact details
    ctx.fillStyle = '#1e293b'
    ctx.font = 'bold 13px sans-serif'
    ctx.fillText(BRAND.address.full, 325, 715)

    ctx.font = 'bold 15px sans-serif'
    ctx.fillStyle = '#10375C'
    ctx.fillText(`Phone: ${BRAND.contacts.phoneFormatted}`, 325, 745)

    ctx.font = '13px sans-serif'
    ctx.fillStyle = '#64748b'
    ctx.fillText(`${BRAND.contacts.website} · Safe & Modern Living`, 325, 775)

    const pngUrl = exportCanvas.toDataURL('image/png')
    const link = document.createElement('a')
    link.href = pngUrl
    link.download = 'Mythree_Admission_QR_Code.png'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    addToast({
      type: 'success',
      title: 'QR Code Downloaded',
      description: 'Saved high-resolution PNG for entrance poster.'
    })
  }

  const handlePrint = () => {
    window.print()
  }

  return (
    <div className="space-y-6">
      <Card className="border shadow-sm no-print">
        <CardHeader className="bg-muted/20 border-b pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <CardTitle className="text-lg flex items-center gap-2 text-primary">
                <QrCode className="h-5 w-5 text-primary" />
                Public QR Admission Portal
              </CardTitle>
              <CardDescription className="text-xs mt-1">
                Display and print high-resolution QR entrance poster for Mythree Ladies Hostel reception and gate.
              </CardDescription>
            </div>
            <Badge variant="outline" className="text-xs px-2.5 py-1">
              Part 1 · Public Access
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <div className="flex flex-col lg:flex-row items-center justify-center gap-8">
            {/* The QR Display Card (What visitors see) */}
            <div
              ref={qrRef}
              className="bg-white text-neutral-900 border-2 border-[#10375C]/30 rounded-2xl p-8 shadow-md flex flex-col items-center text-center max-w-sm w-full"
            >
              <MythreeLogo variant="full" size="md" color="#10375C" className="mb-4" />

              <p className="text-[11px] font-medium text-neutral-500 mb-4 tracking-wide">
                {BRAND.roomTypesSummary}
              </p>

              {/* Real QR Code Canvas */}
              <div className="p-4 bg-white rounded-2xl shadow-inner border-2 border-neutral-200">
                <QRCodeCanvas
                  value={publicApplyUrl}
                  size={240}
                  level="H"
                  includeMargin={true}
                  className="rounded-lg"
                />
              </div>

              <div className="mt-6 space-y-1">
                <h4 className="font-extrabold text-base text-[#10375C] uppercase tracking-wide">
                  Scan to apply for admission
                </h4>
                <p className="text-xs text-neutral-500">
                  Point your smartphone camera to open the instant mobile form.
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-neutral-100 w-full flex items-center justify-center gap-2 text-[11px] text-neutral-500">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                <span>No login required · 2-minute mobile submission</span>
              </div>
            </div>

            {/* Actions & Instructions */}
            <div className="max-w-md space-y-5 text-center lg:text-left">
              <div>
                <h3 className="font-bold text-lg text-foreground">
                  Hostel Entrance QR Code Signboard
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Prospective students and working women can scan this code from their mobile phones to submit their admission details and select room preferences.
                </p>
              </div>

              {/* Institutional Address Badge */}
              <div className="p-3.5 bg-muted/50 rounded-xl border text-xs space-y-1.5">
                <div className="flex items-center gap-2 font-semibold text-foreground">
                  <MapPin className="h-4 w-4 text-primary shrink-0" />
                  <span>{BRAND.address.full}</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground font-mono text-[11px]">
                  <Phone className="h-3.5 w-3.5 text-primary shrink-0" />
                  <span>{BRAND.contacts.phoneFormatted}</span>
                </div>
              </div>

              <div className="p-4 bg-muted/40 rounded-xl border text-xs space-y-2">
                <div className="flex items-center gap-2 font-medium text-foreground">
                  <Smartphone className="h-4 w-4 text-primary" />
                  Public Form URL:
                </div>
                <p className="font-mono text-primary text-[11px] break-all bg-background p-2 rounded border">
                  {publicApplyUrl}
                </p>
              </div>

              {/* Main Action Buttons */}
              <div className="flex flex-wrap gap-3 justify-center lg:justify-start">
                <Button
                  onClick={handleDownloadPng}
                  className="text-xs h-10 px-4 gap-1.5 shadow-sm bg-[#10375C] hover:bg-[#10375C]/90 text-white font-semibold"
                >
                  <Download className="h-4 w-4" />
                  Download QR (PNG)
                </Button>

                <Button
                  onClick={handlePrint}
                  variant="outline"
                  className="text-xs h-10 px-4 gap-1.5 font-medium"
                >
                  <Printer className="h-4 w-4" />
                  Print QR (A4 Poster)
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCopyLink}
                  className="text-xs h-10 px-3 text-muted-foreground hover:text-foreground"
                >
                  {copied ? (
                    <>
                      <Check className="h-3.5 w-3.5 mr-1 text-emerald-600" />
                      Link Copied
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5 mr-1" />
                      Copy Link
                    </>
                  )}
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => window.open(publicApplyUrl, '_blank')}
                  className="text-xs h-10 px-3 text-muted-foreground hover:text-foreground"
                >
                  <ExternalLink className="h-3.5 w-3.5 mr-1" />
                  Test Form
                </Button>
              </div>

              <div className="text-[11px] text-muted-foreground space-y-1">
                <p>• Clicking <strong>Print QR</strong> formats a clean standard A4 poster ready to paste at the entrance.</p>
                <p>• Submissions appear live in the <strong>New Admissions Verification</strong> queue.</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── STRICT A4 PRINTABLE SIGN SHEET (Visible solely during printing) ── */}
      <div className="printable-document hidden print:block bg-white text-black text-center font-sans">
        <div className="border-4 border-[#10375C] p-8 rounded-2xl flex flex-col items-center justify-between min-h-[92vh]">
          {/* Top Brand Block */}
          <div className="w-full pb-4 border-b-2 border-[#10375C]">
            <MythreeLogo variant="full" size="xl" color="#10375C" className="mx-auto" />
            <div className="mt-3 py-1.5 px-4 bg-[#10375C] text-white rounded font-bold text-sm uppercase tracking-widest inline-block">
              {BRAND.roomTypesSummary}
            </div>
            <p className="text-sm font-semibold text-neutral-800 mt-2">
              {BRAND.address.full}
            </p>
            <p className="text-sm font-bold text-[#10375C] font-mono mt-0.5">
              Contact: {BRAND.contacts.phoneFormatted}
            </p>
          </div>

          {/* QR Code Canvas */}
          <div className="my-6 p-6 border-2 border-[#10375C] rounded-3xl bg-neutral-50 shadow-sm">
            <QRCodeCanvas
              value={publicApplyUrl}
              size={340}
              level="H"
              includeMargin={true}
              className="mx-auto"
            />
          </div>

          {/* Call to Action */}
          <div className="space-y-3 w-full">
            <h2 className="text-3xl font-black uppercase tracking-wider text-[#10375C]">
              Scan to Apply for Admission
            </h2>
            <p className="text-base text-neutral-700 max-w-lg mx-auto">
              Open your smartphone camera and point it at the QR code above to submit your admission application form online.
            </p>
            <div className="pt-2 text-xs font-mono text-neutral-600 bg-neutral-100 py-1.5 px-3 rounded inline-block">
              {publicApplyUrl}
            </div>
          </div>

          {/* Institutional Footer */}
          <div className="mt-6 pt-3 border-t border-neutral-300 w-full flex items-center justify-between text-xs text-neutral-600 font-mono">
            <span>{BRAND.name}</span>
            <span>{BRAND.contacts.website}</span>
            <span>Tel: {BRAND.contacts.phone1}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
