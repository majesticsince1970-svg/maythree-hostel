import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { BRAND } from '@/lib/brandConfig'
import { MythreeLogo } from '@/components/MythreeLogo'
import { LogIn, AlertCircle, Eye, EyeOff, ShieldAlert, Lock, Mail } from 'lucide-react'

const MAX_ATTEMPTS = 5
const LOCKOUT_DURATION_MS = 30000 // 30 seconds

export function LoginPage() {
  // Both fields strictly initialize empty (no hardcoded/demo defaults)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // Rate limiting / Brute-force lockout state
  const [failedAttempts, setFailedAttempts] = useState<number>(() => {
    const saved = sessionStorage.getItem('login_failed_attempts')
    return saved ? parseInt(saved, 10) : 0
  })

  const [lockoutUntil, setLockoutUntil] = useState<number | null>(() => {
    const saved = sessionStorage.getItem('login_lockout_until')
    if (saved) {
      const until = parseInt(saved, 10)
      if (until > Date.now()) return until
    }
    return null
  })

  const [remainingSeconds, setRemainingSeconds] = useState(0)
  const { signIn } = useAuth()
  const navigate = useNavigate()

  // Reset lockout helper
  const resetLockout = () => {
    sessionStorage.removeItem('login_failed_attempts')
    sessionStorage.removeItem('login_lockout_until')
    setFailedAttempts(0)
    setLockoutUntil(null)
    setRemainingSeconds(0)
    setError('')
  }

  // Clear existing lockout on initial component mount as requested
  useEffect(() => {
    resetLockout()
  }, [])

  // Lockout countdown timer
  useEffect(() => {
    if (!lockoutUntil) {
      setRemainingSeconds(0)
      return
    }

    const updateTimer = () => {
      const now = Date.now()
      const diffMs = lockoutUntil - now
      if (diffMs <= 0) {
        setLockoutUntil(null)
        setRemainingSeconds(0)
        sessionStorage.removeItem('login_lockout_until')
        sessionStorage.setItem('login_failed_attempts', '0')
        setFailedAttempts(0)
      } else {
        setRemainingSeconds(Math.ceil(diffMs / 1000))
      }
    }

    updateTimer()
    const interval = setInterval(updateTimer, 1000)
    return () => clearInterval(interval)
  }, [lockoutUntil])

  const isLockedOut = lockoutUntil !== null && remainingSeconds > 0

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (isLockedOut) return

    setError('')
    setLoading(true)

    try {
      const { error: authError } = await signIn(email, password)
      if (authError) {
        const nextAttempts = failedAttempts + 1
        setFailedAttempts(nextAttempts)
        sessionStorage.setItem('login_failed_attempts', nextAttempts.toString())

        if (nextAttempts >= MAX_ATTEMPTS) {
          const lockUntil = Date.now() + LOCKOUT_DURATION_MS
          setLockoutUntil(lockUntil)
          sessionStorage.setItem('login_lockout_until', lockUntil.toString())
          setError(`Too many failed login attempts. Login locked for 30 seconds.`)
        } else {
          // Strictly generic error to avoid username enumeration
          const attemptsLeft = MAX_ATTEMPTS - nextAttempts
          setError(`Invalid username or password. (${attemptsLeft} attempt${attemptsLeft === 1 ? '' : 's'} remaining before temporary lockout)`)
        }
      } else {
        // Reset counters on successful authentication
        sessionStorage.removeItem('login_failed_attempts')
        sessionStorage.removeItem('login_lockout_until')
        navigate('/dashboard')
      }
    } catch {
      setError('Invalid username or password')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-primary/10 via-background to-background p-4">
      <Card className="w-full max-w-md shadow-xl border-2 border-primary/20">
        <CardHeader className="text-center pb-2">
          <div className="flex justify-center mb-3">
            <MythreeLogo variant="full" size="md" color="#10375C" />
          </div>
          <CardTitle className="text-xl font-bold tracking-tight">Staff Operations Portal</CardTitle>
          <CardDescription className="text-xs">
            {BRAND.tagline} · Authorized Personnel Only
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} autoComplete="off" className="space-y-4">
            {/* Lockout Warning Banner */}
            {isLockedOut && (
              <div className="flex flex-col gap-2 p-3.5 bg-destructive/15 text-destructive rounded-xl text-xs font-semibold border border-destructive/30">
                <div className="flex items-start gap-2.5">
                  <ShieldAlert className="h-5 w-5 shrink-0 mt-0.5" />
                  <div>
                    <p>Security Lockout Active</p>
                    <p className="text-[11px] font-normal mt-0.5">
                      Too many consecutive failed attempts. Wait <strong className="font-mono">{remainingSeconds}s</strong> or reset below.
                    </p>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs border-destructive/40 text-destructive hover:bg-destructive/10 mt-1"
                  onClick={resetLockout}
                >
                  Reset Lockout Counter
                </Button>
              </div>
            )}

            {/* Error Message */}
            {error && !isLockedOut && (
              <div className="flex items-center gap-2 p-3 bg-destructive/10 text-destructive rounded-lg text-xs font-medium border border-destructive/20">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Email / Username Field - supports both username or email */}
            <div>
              <Label htmlFor="email" className="text-xs font-semibold flex items-center gap-1.5">
                <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                Username or Email Address
              </Label>
              <Input
                id="email"
                type="text"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@maythree.com or username"
                className="mt-1 text-xs h-9"
                autoComplete="username"
                disabled={loading || isLockedOut}
                required
              />
            </div>

            {/* Password Field - Masked by default with toggle option */}
            <div>
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-xs font-semibold flex items-center gap-1.5">
                  <Lock className="h-3.5 w-3.5 text-muted-foreground" />
                  Password
                </Label>
                <button
                  type="button"
                  onClick={() => setShowPassword(prev => !prev)}
                  tabIndex={-1}
                  className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 focus:outline-none"
                >
                  {showPassword ? (
                    <>
                      <EyeOff className="h-3.5 w-3.5" />
                      <span className="text-[11px]">Hide</span>
                    </>
                  ) : (
                    <>
                      <Eye className="h-3.5 w-3.5" />
                      <span className="text-[11px]">Show</span>
                    </>
                  )}
                </button>
              </div>
              <div className="relative mt-1">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your confidential password"
                  className="text-xs h-9 pr-10"
                  autoComplete="current-password"
                  disabled={loading || isLockedOut}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(prev => !prev)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground focus:outline-none"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              className="w-full text-xs h-9 font-semibold bg-[#10375C] hover:bg-[#10375C]/90 text-white shadow-sm"
              disabled={loading || isLockedOut}
            >
              <LogIn className="h-4 w-4 mr-2" />
              {isLockedOut ? `Locked (${remainingSeconds}s)` : loading ? 'Authenticating...' : 'Sign In'}
            </Button>
          </form>

          {/* Public Form Link */}
          <div className="mt-6 pt-4 border-t text-center">
            <button
              type="button"
              onClick={() => navigate('/apply')}
              className="text-xs text-primary hover:underline font-semibold"
            >
              Need to apply for hostel admission? Open Public Form →
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
