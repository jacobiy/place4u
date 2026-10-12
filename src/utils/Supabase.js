import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://rfajxzjrzmckroitcqxz.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_mGvaE8MgMQ6PcfPtmSS2Zw_mInWWc_s'

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    // Bypass browser Navigator Lock API deadlocks across tabs / Strict Mode
    lock: async (_name, _acquireTimeout, fn) => {
      return await fn()
    }
  }
})
