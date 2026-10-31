import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Building2, LogIn, AlertCircle } from 'lucide-react'

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

  const DEMO_MODE = !import.meta.env.VITE_SUPABASE_URL || import.meta.env.VITE_SUPABASE_URL === 'your-supabase-url'

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-primary/5 to-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-2">
            <Building2 className="h-10 w-10 text-primary" />
          </div>
          <CardTitle className="text-2xl">Staff Login</CardTitle>
          <CardDescription>MayThree Women's Hostel Management</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="flex items-center gap-2 p-3 bg-destructive/10 text-destructive rounded-lg text-sm">
                <AlertCircle className="h-4 w-4" />
                {error}
              </div>
            )}
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="staff@maythree.com" className="mt-1" required />
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter password" className="mt-1" required />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              <LogIn className="h-4 w-4 mr-2" />
              {loading ? 'Signing in...' : 'Sign In'}
            </Button>
          </form>

          <div className="mt-6 p-4 bg-muted/50 rounded-lg space-y-3">
            <p className="text-xs font-semibold text-muted-foreground">Quick Sign-in Credentials</p>
            <div className="grid grid-cols-3 gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="text-xs"
                onClick={() => { setEmail('admin@maythree.com'); setPassword('admin123') }}
              >
                Admin
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="text-xs"
                onClick={() => { setEmail('staff@maythree.com'); setPassword('staff123') }}
              >
                Staff
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="text-xs"
                onClick={() => { setEmail('store@maythree.com'); setPassword('store123') }}
              >
                Store
              </Button>
            </div>
            <p className="text-[11px] text-muted-foreground text-center">
              Click any role above to fill credentials instantly
            </p>
          </div>

          <div className="mt-4 pt-4 border-t text-center">
            <button
              type="button"
              onClick={() => navigate('/apply')}
              className="text-xs text-primary hover:underline font-medium"
            >
              Need to apply for a room? Open Public Admission Form →
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
