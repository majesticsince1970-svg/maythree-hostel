import React, { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { StaffProfile } from '@/types/database'
import type { User, Session } from '@supabase/supabase-js'

interface AuthContextType {
  user: User | null
  session: Session | null
  profile: StaffProfile | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>
  signOut: () => Promise<void>
  switchRole: (role: 'admin' | 'staff' | 'store_staff') => void
  isAdmin: boolean
  isStaff: boolean
  isStoreStaff: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

// Demo mode data for when Supabase is not configured
const DEMO_MODE = !import.meta.env.VITE_SUPABASE_URL || import.meta.env.VITE_SUPABASE_URL === 'your-supabase-url'

const DEMO_USERS: Record<string, { password: string; profile: StaffProfile }> = {
  'admin@mythreehostels.com': {
    password: 'admin123',
    profile: { user_id: 'demo-admin-1', name: 'Admin User', role: 'admin', email: 'admin@mythreehostels.com' }
  },
  'staff@mythreehostels.com': {
    password: 'staff123',
    profile: { user_id: 'demo-staff-1', name: 'Staff User', role: 'staff', email: 'staff@mythreehostels.com' }
  },
  'store@mythreehostels.com': {
    password: 'store123',
    profile: { user_id: 'demo-store-1', name: 'Store Staff', role: 'store_staff', email: 'store@mythreehostels.com' }
  },
  // Legacy aliases for backward compatibility
  'admin@maythree.com': {
    password: 'admin123',
    profile: { user_id: 'demo-admin-1', name: 'Admin User', role: 'admin', email: 'admin@mythreehostels.com' }
  },
  'staff@maythree.com': {
    password: 'staff123',
    profile: { user_id: 'demo-staff-1', name: 'Staff User', role: 'staff', email: 'staff@mythreehostels.com' }
  },
  'store@maythree.com': {
    password: 'store123',
    profile: { user_id: 'demo-store-1', name: 'Store Staff', role: 'store_staff', email: 'store@mythreehostels.com' }
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<StaffProfile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (DEMO_MODE) {
      // Check localStorage for demo session
      const savedEmail = localStorage.getItem('demo_user_email')
      if (savedEmail && DEMO_USERS[savedEmail]) {
        setProfile(DEMO_USERS[savedEmail].profile)
        setUser({ id: DEMO_USERS[savedEmail].profile.user_id, email: savedEmail } as User)
      }
      setLoading(false)
      return
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      if (session?.user) {
        fetchProfile(session.user.id)
      } else {
        setLoading(false)
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setUser(session?.user ?? null)
      if (session?.user) {
        fetchProfile(session.user.id)
      } else {
        setProfile(null)
        setLoading(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  async function fetchProfile(userId: string) {
    try {
      const { data } = await supabase
        .from('staff_profiles')
        .select('*')
        .eq('user_id', userId)
        .single()
      setProfile(data as StaffProfile | null)
    } catch {
      setProfile(null)
    } finally {
      setLoading(false)
    }
  }

  const signIn = async (email: string, password: string) => {
    const cleanEmail = email.trim().toLowerCase()
    if (DEMO_MODE) {
      const demoUser = DEMO_USERS[cleanEmail]
      if (demoUser && demoUser.password === password) {
        localStorage.setItem('demo_user_email', cleanEmail)
        setProfile(demoUser.profile)
        setUser({ id: demoUser.profile.user_id, email: cleanEmail } as User)
        return { error: null }
      }
      return { error: new Error('Invalid username or password') }
    }

    const { error } = await supabase.auth.signInWithPassword({ email: cleanEmail, password })
    if (error) {
      console.warn('[Auth] Authentication failed for provided credentials')
      return { error: new Error('Invalid username or password') }
    }
    return { error: null }
  }

  const signOut = async () => {
    if (DEMO_MODE) {
      localStorage.removeItem('demo_user_email')
      setUser(null)
      setProfile(null)
      return
    }
    await supabase.auth.signOut()
  }

  const switchRole = (role: 'admin' | 'staff' | 'store_staff') => {
    const emailByRole: Record<'admin' | 'staff' | 'store_staff', string> = {
      admin: 'admin@mythreehostels.com',
      staff: 'staff@mythreehostels.com',
      store_staff: 'store@mythreehostels.com',
    }
    const targetEmail = emailByRole[role]
    const demo = DEMO_USERS[targetEmail]
    if (demo) {
      localStorage.setItem('demo_user_email', targetEmail)
      setProfile(demo.profile)
      setUser({ id: demo.profile.user_id, email: targetEmail } as User)
    }
  }

  const value: AuthContextType = {
    user,
    session,
    profile,
    loading,
    signIn,
    signOut,
    switchRole,
    isAdmin: profile?.role === 'admin',
    isStaff: profile?.role === 'staff' || profile?.role === 'admin',
    isStoreStaff: profile?.role === 'store_staff' || profile?.role === 'admin',
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) throw new Error('useAuth must be used within an AuthProvider')
  return context
}
