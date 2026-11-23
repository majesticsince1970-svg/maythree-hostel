import type { StaffProfile, StaffRole } from '@/types/database'
import { supabase } from '@/lib/supabase'

const AUTH_USERS_KEY = 'mythree_auth_users_v3'

export const DELETED_USERNAMES = new Set([
  'admin',
  'hadi',
  'admin_demo',
  'staff',
  'staff_demo',
  'store',
  'store_demo'
])

export const DEFAULT_AUTH_USERS: StaffProfile[] = [
  {
    user_id: 'a0b1b6ac-c20f-4be1-ae43-02ef283661a1',
    name: 'Hadi Muhammad',
    role: 'admin',
    email: 'hadimajestic@gmail.com',
    username: 'hadi.admin',
    created_at: '2026-11-18T17:13:06Z'
  },
  {
    user_id: '6fb5cf6c-cef0-4864-8f08-20d3825273e1',
    name: 'Abdul Latheef CM',
    role: 'admin',
    email: 'abdullatheefcm@gmail.com',
    username: 'latheef.admin',
    created_at: '2026-10-31T14:30:59Z'
  },
  {
    user_id: '68aa5870-a6d0-4183-8525-71c5a4fac82b',
    name: 'Mythree Hostel Staff',
    role: 'staff',
    email: 'mythreehostel@gmail.com',
    username: 'mythree.staff',
    created_at: '2026-11-18T17:08:21Z'
  }
]

let inMemoryUsers: StaffProfile[] | null = null

export function getStoredAuthUsers(): StaffProfile[] {
  if (inMemoryUsers && inMemoryUsers.length > 0) {
    return inMemoryUsers
  }

  if (typeof localStorage === 'undefined') {
    inMemoryUsers = [...DEFAULT_AUTH_USERS]
    return inMemoryUsers
  }

  try {
    let users: StaffProfile[] = []
    const raw = localStorage.getItem(AUTH_USERS_KEY)
    if (raw) {
      try {
        users = JSON.parse(raw)
      } catch {}
    }

    if (!Array.isArray(users) || users.length === 0) {
      users = [...DEFAULT_AUTH_USERS]
    }

    // Always scan hostel state keys in localStorage to automatically pick up any user ever created in User Management / Settings
    const stateKeys = [
      'mythree_hostel_state_v9',
      'mythree_hostel_state_v8',
      'mythree_hostel_state_v7',
      'mythree_hostel_state_v6',
      'mythree_hostel_state'
    ]

    for (const key of stateKeys) {
      const stateRaw = localStorage.getItem(key)
      if (stateRaw) {
        try {
          const parsed = JSON.parse(stateRaw)
          if (parsed && Array.isArray(parsed.staffList)) {
            for (const staff of parsed.staffList) {
              if (!staff || !staff.user_id) continue
              const cleanEmail = staff.email ? staff.email.trim().toLowerCase() : ''
              const cleanUsername = staff.username ? staff.username.trim().toLowerCase() : (cleanEmail ? cleanEmail.split('@')[0] : '')

              const existingIdx = users.findIndex(u => 
                u.user_id === staff.user_id || 
                (cleanEmail && u.email?.toLowerCase() === cleanEmail) ||
                (cleanUsername && u.username?.toLowerCase() === cleanUsername)
              )

              if (existingIdx >= 0) {
                users[existingIdx] = {
                  ...users[existingIdx],
                  ...staff,
                  username: cleanUsername || users[existingIdx].username,
                  password: users[existingIdx].password || staff.password || 'admin123'
                }
              } else {
                users.push({
                  ...staff,
                  username: cleanUsername || `user_${staff.user_id.slice(-4)}`,
                  password: staff.password || 'admin123'
                })
              }
            }
          }
        } catch {}
      }
    }

    // Ensure built-in accounts are ALWAYS present
    for (const def of DEFAULT_AUTH_USERS) {
      const hasDef = users.some(u => 
        (u.email && def.email && u.email.toLowerCase() === def.email.toLowerCase()) ||
        (u.username && def.username && u.username.toLowerCase() === def.username.toLowerCase()) ||
        u.user_id === def.user_id
      )
      if (!hasDef) {
        users.push(def)
      }
    }

    inMemoryUsers = users
    localStorage.setItem(AUTH_USERS_KEY, JSON.stringify(users))
    return users
  } catch (err) {
    console.warn('[authStore] Error loading stored auth users:', err)
    inMemoryUsers = [...DEFAULT_AUTH_USERS]
    return inMemoryUsers
  }
}

export function saveAuthUsers(users: StaffProfile[]): void {
  inMemoryUsers = users
  if (typeof localStorage === 'undefined') return
  try {
    localStorage.setItem(AUTH_USERS_KEY, JSON.stringify(users))
  } catch (err) {
    console.warn('[authStore] Error saving auth users:', err)
  }
}

/**
 * Case-insensitive, robust credential lookup supporting:
 * - username (e.g. "hadi", "Hadi", "HADI")
 * - full email (e.g. "hadimajestic@gmail.com", "admin@maythree.com")
 * - email prefix (e.g. "hadimajestic", "admin")
 * - full name (e.g. "Hadi", "System Admin")
 */
export function findAuthUserByIdentifier(identifier: string): StaffProfile | null {
  const clean = identifier.trim().toLowerCase()
  if (!clean) return null
  const users = getStoredAuthUsers()

  return users.find(u => {
    const uUser = (u.username || '').trim().toLowerCase()
    const uEmail = (u.email || '').trim().toLowerCase()
    const uPrefix = uEmail.split('@')[0]
    const uName = (u.name || '').trim().toLowerCase()

    return uUser === clean || uEmail === clean || uPrefix === clean || uName === clean
  }) || null
}

/**
 * Live Supabase query for cross-device authentication:
 * If a user doesn't exist in local browser cache, queries the shared Supabase cloud database.
 */
export async function findAuthUserAsync(identifier: string): Promise<StaffProfile | null> {
  const localMatch = findAuthUserByIdentifier(identifier)
  if (localMatch) return localMatch

  // Fresh sync from cloud
  const freshUsers = await syncAuthUsersFromSupabase()
  const clean = identifier.trim().toLowerCase()

  return freshUsers.find(u => {
    const uUser = (u.username || '').trim().toLowerCase()
    const uEmail = (u.email || '').trim().toLowerCase()
    const uPrefix = uEmail.split('@')[0]
    const uName = (u.name || '').trim().toLowerCase()

    return uUser === clean || uEmail === clean || uPrefix === clean || uName === clean
  }) || null
}

/**
 * Synchronizes user accounts from live Supabase cloud database
 * Reads from both `app_users` table and `audit_log` (with table_name='app_users').
 */
export async function syncAuthUsersFromSupabase(): Promise<StaffProfile[]> {
  try {
    const currentUsers = getStoredAuthUsers()
    const userMap = new Map<string, StaffProfile>()

    // Seed defaults into map
    for (const u of currentUsers) {
      userMap.set(u.user_id, u)
      if (u.username) userMap.set(u.username.toLowerCase(), u)
      if (u.email) userMap.set(u.email.toLowerCase(), u)
    }

    // 1. Fetch from app_users table if available
    try {
      const { data: remoteAppUsers } = await (supabase as any).from('app_users').select('*')
      if (remoteAppUsers && remoteAppUsers.length > 0) {
        for (const ru of remoteAppUsers) {
          const profile: StaffProfile = {
            user_id: ru.user_id,
            name: ru.name,
            role: ru.role as StaffRole,
            email: ru.email || undefined,
            username: ru.username,
            password: ru.password,
            created_at: ru.created_at || undefined,
            updated_at: ru.updated_at || undefined
          }
          userMap.set(profile.user_id, profile)
          if (profile.username) userMap.set(profile.username.toLowerCase(), profile)
          if (profile.email) userMap.set(profile.email.toLowerCase(), profile)
        }
      }
    } catch {}

    // 2. Fetch from audit_log table (persistent cloud sync table)
    try {
      const { data: auditRows } = await (supabase as any)
        .from('audit_log')
        .select('*')
        .eq('table_name', 'app_users')
        .order('performed_at', { ascending: true })

      if (auditRows && auditRows.length > 0) {
        for (const row of auditRows) {
          if (row.action === 'USER_DELETE' && row.record_id) {
            userMap.delete(row.record_id)
            continue
          }

          const rawUser = row.new_values as StaffProfile | undefined
          if (rawUser && rawUser.user_id) {
            const profile: StaffProfile = {
              user_id: rawUser.user_id,
              name: rawUser.name,
              role: (rawUser.role as StaffRole) || 'staff',
              email: rawUser.email || undefined,
              username: rawUser.username || (rawUser.email ? rawUser.email.split('@')[0] : `user_${rawUser.user_id.slice(-4)}`),
              password: rawUser.password || 'admin123',
              created_at: rawUser.created_at || row.performed_at,
              updated_at: rawUser.updated_at || row.performed_at
            }
            userMap.set(profile.user_id, profile)
            if (profile.username) userMap.set(profile.username.toLowerCase(), profile)
            if (profile.email) userMap.set(profile.email.toLowerCase(), profile)
          }
        }
      }
    } catch {}

    // Deduplicate unique profiles by user_id
    const dedupedMap = new Map<string, StaffProfile>()
    for (const val of userMap.values()) {
      dedupedMap.set(val.user_id, val)
    }

    // Ensure built-in accounts are ALWAYS present
    for (const def of DEFAULT_AUTH_USERS) {
      if (!dedupedMap.has(def.user_id)) {
        dedupedMap.set(def.user_id, def)
      }
    }

    const merged = Array.from(dedupedMap.values()).filter(u => !DELETED_USERNAMES.has((u.username || '').toLowerCase()))
    saveAuthUsers(merged)
    return merged
  } catch (err) {
    console.warn('[authStore] Error syncing users from Supabase:', err)
    return getStoredAuthUsers()
  }
}

/**
 * Persists a user to local cache AND live Supabase cloud database
 */
export function upsertAuthUser(user: StaffProfile): void {
  const users = getStoredAuthUsers()
  const cleanEmail = user.email ? user.email.trim().toLowerCase() : ''
  const cleanUsername = user.username ? user.username.trim().toLowerCase() : (cleanEmail ? cleanEmail.split('@')[0] : '')

  const sanitizedUser: StaffProfile = {
    ...user,
    email: cleanEmail || undefined,
    username: cleanUsername || `user_${user.user_id.slice(-4)}`,
    password: user.password || 'admin123',
    updated_at: new Date().toISOString()
  }

  const idx = users.findIndex(u => 
    u.user_id === sanitizedUser.user_id || 
    (cleanEmail && u.email && u.email.toLowerCase() === cleanEmail) ||
    (cleanUsername && u.username && u.username.toLowerCase() === cleanUsername)
  )
  
  if (idx >= 0) {
    users[idx] = { 
      ...users[idx], 
      ...sanitizedUser
    }
  } else {
    users.push({
      ...sanitizedUser,
      created_at: sanitizedUser.created_at || new Date().toISOString()
    })
  }

  saveAuthUsers(users)

  // Asynchronously save to Supabase cloud database
  Promise.resolve().then(async () => {
    try {
      // 1. Write to audit_log for universal cloud replication
      await (supabase as any).from('audit_log').insert({
        action: 'USER_SYNC',
        table_name: 'app_users',
        new_values: sanitizedUser
      })

      // 2. Also try writing directly to app_users table
      await (supabase as any).from('app_users').upsert({
        user_id: sanitizedUser.user_id,
        name: sanitizedUser.name,
        role: sanitizedUser.role,
        email: sanitizedUser.email || null,
        username: sanitizedUser.username || sanitizedUser.user_id,
        password: sanitizedUser.password || 'admin123',
        updated_at: new Date().toISOString()
      }).select()
    } catch (err) {
      console.warn('[authStore] Background cloud user sync notice:', err)
    }
  })
}

/**
 * Removes a user from local cache AND live Supabase cloud database
 */
export function deleteAuthUser(userId: string): void {
  const users = getStoredAuthUsers()
  // Never delete main admin
  const filtered = users.filter(u => u.user_id !== userId || u.email === 'admin@maythree.com')
  saveAuthUsers(filtered)

  // Asynchronously propagate deletion to Supabase cloud
  Promise.resolve().then(async () => {
    try {
      await (supabase as any).from('audit_log').insert({
        action: 'USER_DELETE',
        table_name: 'app_users',
        record_id: userId
      })

      await (supabase as any).from('app_users').delete().eq('user_id', userId)
    } catch (err) {
      console.warn('[authStore] Background cloud user delete notice:', err)
    }
  })
}

export function syncStaffListWithAuthStore(staffList: StaffProfile[]): StaffProfile[] {
  const authUsers = getStoredAuthUsers()
  const authMap = new Map<string, StaffProfile>()

  // Index by user_id and email
  for (const u of authUsers) {
    authMap.set(u.user_id, u)
    if (u.email) authMap.set(u.email.toLowerCase(), u)
    if (u.username) authMap.set(u.username.toLowerCase(), u)
  }

  let updated = false
  const syncedList: StaffProfile[] = staffList.map(staff => {
    const matched = authMap.get(staff.user_id) || 
      (staff.email ? authMap.get(staff.email.toLowerCase()) : null) ||
      (staff.username ? authMap.get(staff.username.toLowerCase()) : null)

    if (matched) {
      return {
        ...staff,
        username: staff.username || matched.username || (staff.email ? staff.email.split('@')[0] : 'staff'),
        password: staff.password || matched.password || 'admin123',
        role: staff.role || matched.role
      }
    } else {
      // User was created without being synced yet: add them to auth store with default password if missing
      const cleanEmail = staff.email ? staff.email.trim().toLowerCase() : ''
      const cleanUsername = staff.username ? staff.username.trim().toLowerCase() : (cleanEmail ? cleanEmail.split('@')[0] : `user_${staff.user_id.slice(-4)}`)
      const newUser: StaffProfile = {
        ...staff,
        username: cleanUsername,
        password: staff.password || 'admin123',
        created_at: staff.created_at || new Date().toISOString()
      }
      authUsers.push(newUser)
      updated = true
      return newUser
    }
  })

  // Also ensure any users in authStore that aren't in staffList get added to staffList
  const staffIds = new Set(syncedList.map(s => s.user_id))
  for (const au of authUsers) {
    if (!staffIds.has(au.user_id)) {
      syncedList.push(au)
    }
  }

  if (updated) {
    saveAuthUsers(authUsers)
  }

  return syncedList
}
