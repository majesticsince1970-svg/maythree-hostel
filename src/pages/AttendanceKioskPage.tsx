import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDemoData } from '@/contexts/DemoDataContext'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { BRAND } from '@/lib/brandConfig'
import { MythreeLogo } from '@/components/MythreeLogo'
import type { Resident } from '@/types/database'
import {
  ArrowLeft, Delete, CheckCircle2, Lock,
  Clock, ShieldAlert, Sparkles, Building2, UserCheck, ArrowDownRight, ArrowUpRight
} from 'lucide-react'

const OUT_REASONS = [
  'College / Classes',
  'Office / Work',
  'Hospital / Clinical duty',
  'Market / Shopping',
  'Home Visit / Leave',
  'Other'
]

export function AttendanceKioskPage() {
  const navigate = useNavigate()
  const { residents, recordAttendanceMovement, getResidentAttendanceStatus } = useDemoData()
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [failedAttempts, setFailedAttempts] = useState(0)
  const [lockCountdown, setLockCountdown] = useState(0)
  const [currentTime, setCurrentTime] = useState(new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }))

  // Punch modal state
  const [verifiedResident, setVerifiedResident] = useState<Resident | null>(null)
  const [selectedReason, setSelectedReason] = useState(OUT_REASONS[0])
  const [successMessage, setSuccessMessage] = useState('')

  // Clock tick
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }))
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  // Lockout countdown
  useEffect(() => {
    if (lockCountdown <= 0) return
    const timer = setInterval(() => {
      setLockCountdown(prev => {
        if (prev <= 1) {
          setFailedAttempts(0)
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [lockCountdown])

  const handleDigit = (digit: string) => {
    if (lockCountdown > 0) return
    if (pin.length < 4) {
      setError('')
      const nextPin = pin + digit
      setPin(nextPin)
      if (nextPin.length === 4) {
        verifyPinCode(nextPin)
      }
    }
  }

  const handleDelete = () => {
    if (lockCountdown > 0) return
    setPin(prev => prev.slice(0, -1))
    setError('')
  }

  const handleClear = () => {
    if (lockCountdown > 0) return
    setPin('')
    setError('')
  }

  const verifyPinCode = (inputPin: string) => {
    // Match against active residents by PIN or last 4 digits of phone, or master demo PIN 1234
    const matched = residents.find(
      r => r.status === 'active' && (r.pin === inputPin || r.application?.phone?.endsWith(inputPin) || inputPin === '1234')
    )

    if (!matched) {
      const nextFail = failedAttempts + 1
      setFailedAttempts(nextFail)
      setPin('')
      if (nextFail >= 5) {
        setLockCountdown(60)
        setError('Too many failed attempts. Screen locked for 60 seconds.')
      } else {
        setError(`Invalid PIN code. ${5 - nextFail} attempt(s) remaining.`)
      }
    } else {
      setError('')
      setPin('')
      setVerifiedResident(matched)
    }
  }

  const handleExecutePunch = (direction: 'IN' | 'OUT') => {
    if (!verifiedResident) return

    const note = direction === 'OUT' ? selectedReason : 'Normal return to hostel'
    recordAttendanceMovement(verifiedResident.id, direction, note, 'Entrance Kiosk Punch')

    const resName = verifiedResident.application?.full_name || 'Resident'
    setSuccessMessage(
      direction === 'IN'
        ? `Welcome back, ${resName}! Marked IN.`
        : `Safe travels, ${resName}! Marked OUT.`
    )

    setTimeout(() => {
      setSuccessMessage('')
      setVerifiedResident(null)
    }, 2200)
  }

  const currentStatus = verifiedResident ? getResidentAttendanceStatus(verifiedResident.id).status : 'IN'

  return (
    <div className="min-h-screen bg-neutral-950 text-white flex flex-col justify-between p-4 sm:p-6 select-none">
      {/* Top Bar */}
      <div className="flex items-center justify-between border-b border-neutral-800 pb-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/attendance')}
          className="text-neutral-400 hover:text-white"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Exit Kiosk
        </Button>
        <div className="flex items-center gap-2">
          <MythreeLogo variant="horizontal" size="sm" color="#ffffff" />
          <span className="font-bold text-sm tracking-wide text-neutral-300">Entrance Kiosk</span>
        </div>
        <div className="flex items-center gap-2 text-neutral-400 font-mono text-sm">
          <Clock className="h-4 w-4 text-primary" />
          <span>{currentTime}</span>
        </div>
      </div>

      {/* Main Kiosk Keypad */}
      <div className="max-w-md w-full mx-auto space-y-6 py-4">
        <div className="text-center space-y-1">
          <h2 className="text-2xl font-bold tracking-tight">Enter Your 4-Digit PIN</h2>
          <p className="text-xs text-neutral-400">Punch your resident security PIN to mark IN or OUT</p>
        </div>

        {/* PIN Dots */}
        <div className="flex justify-center gap-4 py-2">
          {[0, 1, 2, 3].map((idx) => {
            const hasChar = pin.length > idx
            return (
              <div
                key={idx}
                className={`w-12 h-14 rounded-xl border-2 flex items-center justify-center text-2xl font-bold transition-all ${
                  hasChar
                    ? 'border-primary bg-primary/20 text-white shadow-lg shadow-primary/20 scale-105'
                    : 'border-neutral-800 bg-neutral-900 text-neutral-600'
                }`}
              >
                {hasChar ? '•' : ''}
              </div>
            )
          })}
        </div>

        {/* Error message / Lockout warning */}
        {error && (
          <div className="p-3 bg-red-950/60 border border-red-800/80 rounded-xl text-center text-xs text-red-200 flex items-center justify-center gap-2">
            <ShieldAlert className="h-4 w-4 text-red-400 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {lockCountdown > 0 && (
          <div className="p-4 bg-amber-950/60 border border-amber-800 rounded-xl text-center text-amber-200 space-y-1">
            <Lock className="h-6 w-6 text-amber-400 mx-auto" />
            <p className="font-bold text-sm">Keypad Locked</p>
            <p className="text-xs">Unlocking in {lockCountdown} seconds...</p>
          </div>
        )}

        {/* Keypad Grid */}
        <div className="grid grid-cols-3 gap-3 max-w-xs mx-auto">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
            <button
              key={digit}
              type="button"
              disabled={lockCountdown > 0}
              onClick={() => handleDigit(digit)}
              className="h-16 rounded-2xl bg-neutral-900 border border-neutral-800 hover:bg-neutral-800 active:scale-95 transition-all text-2xl font-bold flex items-center justify-center disabled:opacity-30 disabled:pointer-events-none"
            >
              {digit}
            </button>
          ))}
          <button
            type="button"
            disabled={lockCountdown > 0 || pin.length === 0}
            onClick={handleClear}
            className="h-16 rounded-2xl bg-neutral-900/60 border border-neutral-800 hover:bg-neutral-800 text-xs font-semibold uppercase text-neutral-400 flex items-center justify-center disabled:opacity-20"
          >
            Clear
          </button>
          <button
            type="button"
            disabled={lockCountdown > 0}
            onClick={() => handleDigit('0')}
            className="h-16 rounded-2xl bg-neutral-900 border border-neutral-800 hover:bg-neutral-800 active:scale-95 transition-all text-2xl font-bold flex items-center justify-center disabled:opacity-30"
          >
            0
          </button>
          <button
            type="button"
            disabled={lockCountdown > 0 || pin.length === 0}
            onClick={handleDelete}
            className="h-16 rounded-2xl bg-neutral-900/60 border border-neutral-800 hover:bg-neutral-800 text-neutral-400 flex items-center justify-center disabled:opacity-20"
          >
            <Delete className="h-6 w-6" />
          </button>
        </div>

        {/* Info Hint */}
        <div className="max-w-xs mx-auto pt-2 text-center text-xs text-neutral-500">
          Tip: Enter your 4-digit PIN or last 4 digits of mobile
        </div>
      </div>

      {/* Bottom Footer */}
      <div className="text-center text-xs text-neutral-500 border-t border-neutral-900 pt-3">
        {BRAND.name} · Kiosk Station · {BRAND.address.city}, {BRAND.address.state}
      </div>

      {/* Resident Punch Modal */}
      <Dialog open={!!verifiedResident} onClose={() => setVerifiedResident(null)}>
        {verifiedResident && (
          <div className="space-y-4 p-2 text-neutral-900 dark:text-white">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-lg">
                <UserCheck className="h-5 w-5 text-primary" />
                Attendance Verification
              </DialogTitle>
            </DialogHeader>

            {successMessage ? (
              <div className="p-6 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-center space-y-2">
                <CheckCircle2 className="h-12 w-12 text-emerald-500 mx-auto animate-bounce" />
                <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">{successMessage}</p>
                <p className="text-xs text-muted-foreground">Updating live hostel register...</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="p-4 bg-muted/60 rounded-xl border flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-base">{verifiedResident.application?.full_name}</h3>
                    <p className="text-xs text-muted-foreground">
                      Room {verifiedResident.bed?.room?.room_no || '—'} · Bed {verifiedResident.bed?.bed_label}
                    </p>
                  </div>
                  <Badge variant={currentStatus === 'IN' ? 'success' : 'warning'} className="text-xs px-2.5 py-1">
                    Currently {currentStatus}
                  </Badge>
                </div>

                {currentStatus === 'IN' ? (
                  <div className="space-y-3">
                    <p className="text-xs font-semibold text-muted-foreground">Purpose of Leaving (Marking OUT):</p>
                    <div className="grid grid-cols-2 gap-2">
                      {OUT_REASONS.map(r => (
                        <button
                          key={r}
                          type="button"
                          onClick={() => setSelectedReason(r)}
                          className={`p-2.5 rounded-lg text-xs font-medium border text-left transition-all ${
                            selectedReason === r
                              ? 'bg-primary text-primary-foreground border-primary'
                              : 'bg-muted/40 hover:bg-muted border-neutral-300 dark:border-neutral-700'
                          }`}
                        >
                          {r}
                        </button>
                      ))}
                    </div>

                    <Button
                      className="w-full py-6 text-sm font-bold bg-amber-600 hover:bg-amber-700 text-white gap-2 mt-2"
                      onClick={() => handleExecutePunch('OUT')}
                    >
                      <ArrowUpRight className="h-4 w-4" /> Punch OUT (Leaving Hostel)
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3 pt-2">
                    <p className="text-xs text-muted-foreground text-center">
                      Welcome back! Confirm your entry to mark yourself inside the hostel.
                    </p>
                    <Button
                      className="w-full py-6 text-sm font-bold bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
                      onClick={() => handleExecutePunch('IN')}
                    >
                      <ArrowDownRight className="h-4 w-4" /> Punch IN (Returning to Hostel)
                    </Button>
                  </div>
                )}
              </div>
            )}

            <DialogFooter className="pt-2">
              <Button variant="outline" size="sm" onClick={() => setVerifiedResident(null)} disabled={!!successMessage}>
                Cancel
              </Button>
            </DialogFooter>
          </div>
        )}
      </Dialog>
    </div>
  )
}

