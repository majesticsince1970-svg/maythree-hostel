import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDemoData } from '@/contexts/DemoDataContext'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  ArrowLeft, Delete, CheckCircle2, Lock,
  Clock, ShieldAlert, Sparkles, Building2
} from 'lucide-react'

export function AttendanceKioskPage() {
  const navigate = useNavigate()
  const { residents } = useDemoData()
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [failedAttempts, setFailedAttempts] = useState(0)
  const [lockCountdown, setLockCountdown] = useState(0)
  const [currentTime, setCurrentTime] = useState(new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }))

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
      setPin(prev => prev + digit)
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

  const handleVerify = () => {
    if (pin.length !== 4) return

    // In Phase 3, we match against resident.pin
    // For now in Phase 1 demo: check sample PIN '1234' or last 4 of phone
    const matched = residents.find(r => r.application?.phone?.endsWith(pin) || pin === '1234')

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
      alert(`PIN Verified: Welcome ${matched.application?.full_name}! (Phase 3 confirmation dialog will appear here)`)
      setPin('')
    }
  }

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
          <Building2 className="h-5 w-5 text-primary" />
          <span className="font-bold text-base tracking-wide">MayThree Entrance Kiosk</span>
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

        {/* Submit Button */}
        <div className="max-w-xs mx-auto pt-2">
          <Button
            className="w-full py-6 text-base font-bold shadow-lg"
            disabled={pin.length !== 4 || lockCountdown > 0}
            onClick={handleVerify}
          >
            Confirm PIN
          </Button>
          <p className="text-[11px] text-neutral-500 text-center mt-2">
            Demo PIN hint: Try 1234 or last 4 digits of phone
          </p>
        </div>
      </div>

      {/* Bottom Footer */}
      <div className="text-center text-xs text-neutral-500 border-t border-neutral-900 pt-3">
        MayThree Women's Hostel · Kiosk Mode · Entrance Station
      </div>
    </div>
  )
}

