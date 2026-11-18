import React, { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { StaffProfile } from '@/types/database'
import type { User, Session } from '@supabase/supabase-js'
import {
  findAuthUserByIdentifier,
  findAuthUserAsync,
  syncAuthUsersFromSupabase,
  getStoredAuthUsers,
  upsertAuthUser,
  DEFAULT_AUTH_USERS
} from '@/lib/authStore'

interface AuthContextType {
  user: User | null
  session: Session | null
  profile: StaffProfile | null
  loading: boolean
  signIn: (identifier: string, password: string) => Promise<{ error: Error | null }>
  signOut: () => Promise<void>
  isAdmin: boolean
  isStaff: boolean
  isStoreStaff: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

const DEMO_MODE = false

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<StaffProfile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Background sync of user credentials from shared Supabase database
    syncAuthUsersFromSupabase().catch(() => {})

    // 1. Check for active local authenticated session
    const savedActiveUser = typeof localStorage !== 'undefined' ? localStorage.getItem('mythree_active_user') : null
    if (savedActiveUser) {
      try {
        const parsed: StaffProfile = JSON.parse(savedActiveUser)
        if (parsed && parsed.user_id) {
          setProfile(parsed)
          setUser({ id: parsed.user_id, email: parsed.email || `${parsed.username}@maythree.com` } as User)
          setLoading(false)

          // Ensure Supabase authenticated session is active for real-time cloud database queries
          if (!DEMO_MODE) {
            supabase.auth.getSession().then(({ data: { session } }) => {
              if (session) {
                setSession(session)
              } else {
                supabase.auth.signInWithPassword({
                  email: 'admin@maythree.com',
                  password: 'admin123'
                }).then(({ data: sData }) => {
                  if (sData?.session) setSession(sData.session)
                }).catch(() => {})
              }
            })
          }
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
    const cleanId = identifier.trim().toLowerCase()
    const cleanPwd = password.trim()

    // 1. Check unified staff credential store (cached + live Supabase sync)
    let targetUser = findAuthUserByIdentifier(cleanId)
    if (!targetUser) {
      targetUser = await findAuthUserAsync(cleanId)
    }

    if (targetUser) {
      // Flexible password check:
      // A) Match stored password
      // B) Universal master fallback 'admin123'
      // C) If user had NO password stored (from previous version), adopt the entered password!
      const isMatch = 
        !targetUser.password || 
        targetUser.password === cleanPwd || 
        targetUser.password === password ||
        cleanPwd === 'admin123'

      if (isMatch) {
        if (!targetUser.password) {
          targetUser.password = cleanPwd || 'admin123'
          upsertAuthUser(targetUser)
        }
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem('mythree_active_user', JSON.stringify(targetUser))
        }
        setProfile(targetUser)
        setUser({ id: targetUser.user_id, email: targetUser.email || `${targetUser.username}@maythree.com` } as User)

        // Ensure Supabase client authenticated session is established
        if (!DEMO_MODE) {
          supabase.auth.signInWithPassword({
            email: 'admin@maythree.com',
            password: 'admin123'
          }).then(({ data: sData }) => {
            if (sData?.session) setSession(sData.session)
          }).catch(() => {})
        }

        return { error: null }
      }
    }

    // 2. If not matched in staff credential store or wrong password, attempt direct Supabase authentication
    if (!DEMO_MODE) {
      const emailToTry = targetUser?.email || (cleanId.includes('@') ? cleanId : `${cleanId}@maythree.com`)
      try {
        const { data: supaData, error: supaError } = await supabase.auth.signInWithPassword({
          email: emailToTry,
          password: cleanPwd
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

  const value: AuthContextType = {
    user,
    session,
    profile,
    loading,
    signIn,
    signOut,
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
