import { useState, useRef } from 'react'
import { QRCodeCanvas } from 'qrcode.react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/components/ui/toast'
import {
  Download, Printer, Copy, Check, ExternalLink, QrCode,
  Building2, Sparkles, Smartphone, ShieldCheck
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

    // Create a branded canvas with hostel title and border for download
    const exportCanvas = document.createElement('canvas')
    const ctx = exportCanvas.getContext('2d')
    if (!ctx) return

    exportCanvas.width = 600
    exportCanvas.height = 750

    // White background
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, 600, 750)

    // Border
    ctx.strokeStyle = '#e2e8f0'
    ctx.lineWidth = 4
    ctx.strokeRect(16, 16, 568, 718)

    // Header text
    ctx.fillStyle = '#0f172a'
    ctx.font = 'bold 32px sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText("MayThree Women's Hostel", 300, 75)

    ctx.fillStyle = '#64748b'
    ctx.font = '16px sans-serif'
    ctx.fillText('Admissions Portal & Room Booking', 300, 110)

    // Draw QR canvas
    ctx.drawImage(canvas, 120, 150, 360, 360)

    // Footer text
    ctx.fillStyle = '#0f172a'
    ctx.font = 'bold 22px sans-serif'
    ctx.fillText('Scan to apply for admission', 300, 560)

    ctx.fillStyle = '#475569'
    ctx.font = '14px sans-serif'
    ctx.fillText(publicApplyUrl, 300, 595)

    ctx.fillStyle = '#94a3b8'
    ctx.font = '12px sans-serif'
    ctx.fillText('Open camera on your smartphone and point at this code', 300, 640)
    ctx.fillText('12/4, Gandhi Nagar, 2nd Main Road, Adyar, Chennai - 600020', 300, 680)

    const pngUrl = exportCanvas.toDataURL('image/png')
    const link = document.createElement('a')
    link.href = pngUrl
    link.download = 'MayThree_Admission_QR_Code.png'
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
      <Card className="border shadow-sm print:hidden">
        <CardHeader className="bg-muted/20 border-b pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <QrCode className="h-5 w-5 text-primary" />
                Public QR Admission Portal
              </CardTitle>
              <CardDescription className="text-xs mt-1">
                Display and print high-resolution QR codes for the entrance gate, reception, and notice board.
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
              className="bg-white text-neutral-900 border-2 border-primary/20 rounded-2xl p-8 shadow-md flex flex-col items-center text-center max-w-sm w-full"
            >
              <div className="flex items-center gap-2 text-primary font-bold text-lg mb-1">
                <Building2 className="h-5 w-5" />
                <span>MayThree Women's Hostel</span>
              </div>
              <p className="text-xs text-muted-foreground mb-6">
                Online Admission & Bed Booking
              </p>

              {/* Real QR Code Canvas */}
              <div className="p-4 bg-white rounded-2xl shadow-inner border border-neutral-200">
                <QRCodeCanvas
                  value={publicApplyUrl}
                  size={240}
                  level="H"
                  includeMargin={true}
                  className="rounded-lg"
                />
              </div>

              <div className="mt-6 space-y-1">
                <h4 className="font-bold text-base text-neutral-900">
                  Scan to apply for admission
                </h4>
                <p className="text-xs text-neutral-500">
                  Point your smartphone camera to open the instant mobile form.
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-neutral-100 w-full flex items-center justify-center gap-2 text-[11px] text-neutral-400">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                <span>No login required · 2-minute mobile submission</span>
              </div>
            </div>

            {/* Actions & Instructions */}
            <div className="max-w-md space-y-5 text-center lg:text-left">
              <div>
                <h3 className="font-semibold text-lg text-foreground">
                  Hostel Entrance QR Code Signboard
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Prospective students, job seekers, and visitors can scan this code from their mobile phones to submit their admission details and upload verification documents.
                </p>
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
                  className="text-xs h-10 px-4 gap-1.5 shadow-sm"
                >
                  <Download className="h-4 w-4" />
                  Download QR (PNG)
                </Button>

                <Button
                  onClick={handlePrint}
                  variant="outline"
                  className="text-xs h-10 px-4 gap-1.5"
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
                <p>• Clicking <strong>Print QR</strong> formats the page for standard A4 paper ready to pin at the hostel gate.</p>
                <p>• Submissions appear in real-time in the <strong>New Admissions Verification</strong> queue.</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── A4 Printable Sign Sheet (Visible only when printing) ── */}
      <div className="hidden print:block print:p-8 bg-white text-black min-h-screen text-center font-sans">
        <div className="max-w-xl mx-auto border-4 border-black p-10 rounded-2xl flex flex-col items-center justify-between min-h-[90vh]">
          <div>
            <div className="flex items-center justify-center gap-3 text-3xl font-extrabold uppercase tracking-wide">
              <span>MayThree Women's Hostel</span>
            </div>
            <p className="text-lg text-neutral-600 mt-2 font-medium">
              Safe, Secure & Comfortable Living for Students & Working Professionals
            </p>
            <p className="text-sm text-neutral-500 mt-1">
              12/4, Gandhi Nagar, 2nd Main Road, Adyar, Chennai - 600020 · Phone: +91 98765 43210
            </p>
          </div>

          <div className="my-8 p-6 border-2 border-black rounded-3xl bg-neutral-50 shadow-sm">
            <QRCodeCanvas
              value={publicApplyUrl}
              size={340}
              level="H"
              includeMargin={true}
              className="mx-auto"
            />
          </div>

          <div className="space-y-3">
            <h2 className="text-3xl font-black uppercase tracking-wider text-black">
              Scan to Apply for Admission
            </h2>
            <p className="text-base text-neutral-700 max-w-md mx-auto">
              Open your smartphone camera and point it at the QR code above to fill out your admission application form online.
            </p>
            <div className="pt-2 text-xs font-mono text-neutral-500">
              Direct Web Link: {publicApplyUrl}
            </div>
          </div>

          <div className="mt-8 pt-4 border-t border-neutral-300 w-full text-xs text-neutral-400">
            Powered by MayThree Hostel Management System
          </div>
        </div>
      </div>
    </div>
  )
}
