import type { StaffProfile, StaffRole } from '@/types/database'

const AUTH_USERS_KEY = 'mythree_auth_users_v2'

export const DEFAULT_AUTH_USERS: StaffProfile[] = [
  {
    user_id: '6fb5cf6c-cef0-4864-8f08-20d3825273e1',
    name: 'System Admin',
    role: 'admin',
    email: 'admin@maythree.com',
    username: 'admin',
    password: 'admin123',
    created_at: '2026-10-31T14:30:59Z'
  },
  {
    user_id: 'demo-admin-1',
    name: 'Admin User',
    role: 'admin',
    email: 'admin@mythreehostels.com',
    username: 'admin_demo',
    password: 'admin123',
    created_at: '2026-10-31T14:30:59Z'
  },
  {
    user_id: 'demo-staff-1',
    name: 'Staff User',
    role: 'staff',
    email: 'staff@maythree.com',
    username: 'staff',
    password: 'staff123',
    created_at: '2026-10-31T14:30:59Z'
  },
  {
    user_id: 'demo-staff-2',
    name: 'Staff User (Hostels)',
    role: 'staff',
    email: 'staff@mythreehostels.com',
    username: 'staff_demo',
    password: 'staff123',
    created_at: '2026-10-31T14:30:59Z'
  },
  {
    user_id: 'demo-store-1',
    name: 'Store Staff',
    role: 'store_staff',
    email: 'store@maythree.com',
    username: 'store',
    password: 'store123',
    created_at: '2026-10-31T14:30:59Z'
  },
  {
    user_id: 'demo-store-2',
    name: 'Store Staff (Hostels)',
    role: 'store_staff',
    email: 'store@mythreehostels.com',
    username: 'store_demo',
    password: 'store123',
    created_at: '2026-10-31T14:30:59Z'
  }
]

export function getStoredAuthUsers(): StaffProfile[] {
  if (typeof localStorage === 'undefined') return DEFAULT_AUTH_USERS
  try {
    const raw = localStorage.getItem(AUTH_USERS_KEY)
    if (!raw) {
      // First time initialization
      localStorage.setItem(AUTH_USERS_KEY, JSON.stringify(DEFAULT_AUTH_USERS))
      return DEFAULT_AUTH_USERS
    }
    const parsed: StaffProfile[] = JSON.parse(raw)
    
    // Ensure admin@maythree.com is always preserved
    const hasMainAdmin = parsed.some(
      u => u.email?.toLowerCase() === 'admin@maythree.com' || u.username === 'admin'
    )
    if (!hasMainAdmin) {
      const merged = [DEFAULT_AUTH_USERS[0], ...parsed]
      localStorage.setItem(AUTH_USERS_KEY, JSON.stringify(merged))
      return merged
    }
    return parsed
  } catch (err) {
    console.warn('[authStore] Error parsing stored auth users:', err)
    return DEFAULT_AUTH_USERS
  }
}

export function saveAuthUsers(users: StaffProfile[]): void {
  if (typeof localStorage === 'undefined') return
  try {
    localStorage.setItem(AUTH_USERS_KEY, JSON.stringify(users))
  } catch (err) {
    console.warn('[authStore] Error saving auth users:', err)
  }
}

export function findAuthUserByIdentifier(identifier: string): StaffProfile | null {
  const clean = identifier.trim().toLowerCase()
  if (!clean) return null
  const users = getStoredAuthUsers()

  return users.find(u => {
    const emailMatch = u.email && u.email.trim().toLowerCase() === clean
    const usernameMatch = u.username && u.username.trim().toLowerCase() === clean
    const prefixMatch = u.email && u.email.trim().toLowerCase().split('@')[0] === clean
    return emailMatch || usernameMatch || prefixMatch
  }) || null
}

export function upsertAuthUser(user: StaffProfile): void {
  const users = getStoredAuthUsers()
  const idx = users.findIndex(u => u.user_id === user.user_id || (u.email && user.email && u.email.toLowerCase() === user.email.toLowerCase()))
  
  if (idx >= 0) {
    users[idx] = { ...users[idx], ...user, updated_at: new Date().toISOString() }
  } else {
    users.push({
      ...user,
      created_at: user.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
  }
  saveAuthUsers(users)
}

export function deleteAuthUser(userId: string): void {
  const users = getStoredAuthUsers()
  // Never delete main admin
  const filtered = users.filter(u => u.user_id !== userId || u.email === 'admin@maythree.com')
  saveAuthUsers(filtered)
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
      const newUser: StaffProfile = {
        ...staff,
        username: staff.username || (staff.email ? staff.email.split('@')[0] : `user_${staff.user_id.slice(-4)}`),
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

