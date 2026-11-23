import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

// Primary cloud database credentials (with verified live fallbacks to guarantee cloud sync across all mobile & laptop deployments)
const DEFAULT_SUPABASE_URL = 'https://mztdwkmyedspmohsohzk.supabase.co'
const DEFAULT_SUPABASE_ANON_KEY = 'sb_publishable_WhxDgzaLo4ZWmZzJIZPOHw_IurgT9eP'

export const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL &&
  import.meta.env.VITE_SUPABASE_URL !== 'your-supabase-url' &&
  !import.meta.env.VITE_SUPABASE_URL.includes('placeholder')
    ? import.meta.env.VITE_SUPABASE_URL
    : DEFAULT_SUPABASE_URL

export const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY &&
  import.meta.env.VITE_SUPABASE_ANON_KEY !== 'your-supabase-anon-key' &&
  !import.meta.env.VITE_SUPABASE_ANON_KEY.includes('placeholder')
    ? import.meta.env.VITE_SUPABASE_ANON_KEY
    : DEFAULT_SUPABASE_ANON_KEY

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey)
