import React, { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { StaffProfile } from '@/types/database'
import type { User, Session } from '@supabase/supabase-js'
import {
  findAuthUserByIdentifier,
  getStoredAuthUsers,
  DEFAULT_AUTH_USERS
} from '@/lib/authStore'

interface AuthContextType {
  user: User | null
  session: Session | null
  profile: StaffProfile | null
  loading: boolean
  signIn: (identifier: string, password: string) => Promise<{ error: Error | null }>
  signOut: () => Promise<void>
  switchRole: (role: 'admin' | 'staff' | 'store_staff') => void
  isAdmin: boolean
  isStaff: boolean
  isStoreStaff: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

const DEMO_MODE = !import.meta.env.VITE_SUPABASE_URL || import.meta.env.VITE_SUPABASE_URL === 'your-supabase-url'

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<StaffProfile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // 1. Check for active local authenticated session
    const savedActiveUser = typeof localStorage !== 'undefined' ? localStorage.getItem('mythree_active_user') : null
    if (savedActiveUser) {
      try {
        const parsed: StaffProfile = JSON.parse(savedActiveUser)
        if (parsed && parsed.user_id) {
          setProfile(parsed)
          setUser({ id: parsed.user_id, email: parsed.email || `${parsed.username}@maythree.com` } as User)
          setLoading(false)
          return
        }
      } catch (e) {
        localStorage.removeItem('mythree_active_user')
      }
    }

    // 2. Fallback to Supabase session if configured
    if (!DEMO_MODE) {
      supabase.auth.getSession().then(({ data: { session } }) => {
        setSession(session)
        setUser(session?.user ?? null)
        if (session?.user) {
          fetchProfile(session.user.id)
        } else {
          setLoading(false)
        }
      }).catch(() => setLoading(false))

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
    } else {
      setLoading(false)
    }
  }, [])

  async function fetchProfile(userId: string) {
    try {
      const { data } = await supabase
        .from('staff_profiles')
        .select('*')
        .eq('user_id', userId)
        .single()
      if (data) {
        setProfile(data as StaffProfile)
      } else {
        // Fallback to local profile match
        const local = getStoredAuthUsers().find(u => u.user_id === userId)
        setProfile(local || null)
      }
    } catch {
      setProfile(null)
    } finally {
      setLoading(false)
    }
  }

  const signIn = async (identifier: string, password: string) => {
    const clean = identifier.trim().toLowerCase()

    // 1. Check unified staff credential store (covers all users created in Settings + default admin)
    const localUser = findAuthUserByIdentifier(clean)
    if (localUser && localUser.password === password) {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('mythree_active_user', JSON.stringify(localUser))
      }
      setProfile(localUser)
      setUser({ id: localUser.user_id, email: localUser.email || `${localUser.username}@maythree.com` } as User)
      return { error: null }
    }

    // 2. If not matched in local auth store or wrong password, attempt Supabase authentication
    if (!DEMO_MODE) {
      const emailToTry = localUser?.email || (clean.includes('@') ? clean : `${clean}@maythree.com`)
      try {
        const { data: supaData, error: supaError } = await supabase.auth.signInWithPassword({
          email: emailToTry,
          password
        })

        if (!supaError && supaData?.user) {
          setUser(supaData.user)
          setSession(supaData.session)
          await fetchProfile(supaData.user.id)
          return { error: null }
        }
      } catch (err) {
        console.warn('[Auth] Supabase auth attempt failed:', err)
      }
    }

    return { error: new Error('Invalid username or password') }
  }

  const signOut = async () => {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem('mythree_active_user')
      localStorage.removeItem('demo_user_email')
    }
    setUser(null)
    setSession(null)
    setProfile(null)
    if (!DEMO_MODE) {
      await supabase.auth.signOut().catch(() => {})
    }
  }

  const switchRole = (role: 'admin' | 'staff' | 'store_staff') => {
    const users = getStoredAuthUsers()
    const target = users.find(u => u.role === role) || DEFAULT_AUTH_USERS.find(u => u.role === role)
    if (target) {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('mythree_active_user', JSON.stringify(target))
      }
      setProfile(target)
      setUser({ id: target.user_id, email: target.email || `${target.username}@maythree.com` } as User)
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
