import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { BRAND } from '@/lib/brandConfig'
import { MythreeLogo } from '@/components/MythreeLogo'
import { LogIn, AlertCircle, ShieldCheck } from 'lucide-react'

export function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { signIn } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    const { error } = await signIn(email, password)
    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      navigate('/dashboard')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-primary/10 via-background to-background p-4">
      <Card className="w-full max-w-md shadow-lg border-2 border-primary/20">
        <CardHeader className="text-center pb-2">
          <div className="flex justify-center mb-3">
            <MythreeLogo variant="full" size="md" color="#10375C" />
          </div>
          <CardTitle className="text-xl font-bold tracking-tight">Staff Operations Portal</CardTitle>
          <CardDescription className="text-xs">
            {BRAND.tagline}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="flex items-center gap-2 p-3 bg-destructive/10 text-destructive rounded-lg text-xs font-medium">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {error}
              </div>
            )}
            <div>
              <Label htmlFor="email" className="text-xs font-semibold">Email Address</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="staff@mythreehostels.com"
                className="mt-1 text-xs h-9"
                required
              />
            </div>
            <div>
              <Label htmlFor="password" className="text-xs font-semibold">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                className="mt-1 text-xs h-9"
                required
              />
            </div>
            <Button
              type="submit"
              className="w-full text-xs h-9 font-semibold bg-[#10375C] hover:bg-[#10375C]/90 text-white"
              disabled={loading}
            >
              <LogIn className="h-4 w-4 mr-2" />
              {loading ? 'Authenticating...' : 'Sign In'}
            </Button>
          </form>

          {/* Quick Sign-in Shortcuts */}
          <div className="mt-5 p-3.5 bg-muted/50 rounded-xl space-y-2.5 border">
            <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground">
              <span>Quick Demo Sign-In</span>
              <ShieldCheck className="h-3.5 w-3.5 text-primary" />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="text-xs h-8 font-medium"
                onClick={() => { setEmail('admin@mythreehostels.com'); setPassword('admin123') }}
              >
                Admin
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="text-xs h-8 font-medium"
                onClick={() => { setEmail('staff@mythreehostels.com'); setPassword('staff123') }}
              >
                Staff
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="text-xs h-8 font-medium"
                onClick={() => { setEmail('store@mythreehostels.com'); setPassword('store123') }}
              >
                Store
              </Button>
            </div>
            <p className="text-[10px] text-muted-foreground text-center">
              Click any role above to pre-fill verified credentials
            </p>
          </div>

          <div className="mt-4 pt-3 border-t text-center">
            <button
              type="button"
              onClick={() => navigate('/apply')}
              className="text-xs text-primary hover:underline font-semibold"
            >
              Need to apply for a room? Open Public Admission Form →
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
