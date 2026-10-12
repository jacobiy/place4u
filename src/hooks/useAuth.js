import { useEffect, useState, useCallback, useRef } from 'react'
import { supabase } from '../utils/Supabase'

/**
 * Resolves authoritative role for a given Supabase auth user with timeout safeguard.
 * Priority:
 * 1. public.users table (authoritative database role)
 * 2. user_metadata.user_type
 * 3. Administrative email domains/patterns
 * 4. Default: 'tenant'
 */
export async function resolveUserRole(authUser) {
  if (!authUser) return null

  // Quick synchronous check from user_metadata or email first
  let fallbackRole = authUser.user_metadata?.user_type || null
  const emailLower = (authUser.email || '').toLowerCase()
  if (!fallbackRole || fallbackRole === 'tenant') {
    if (
      emailLower === 'jason@admin.com' ||
      emailLower.endsWith('@admin.com') ||
      emailLower.startsWith('admin@')
    ) {
      fallbackRole = 'admin'
    } else if (emailLower.includes('landlord')) {
      fallbackRole = 'landlord'
    } else if (emailLower.includes('agent')) {
      fallbackRole = 'agent'
    }
  }

  // Authoritative DB query with 2.5s strict timeout so it never hangs
  let dbRole = null
  try {
    const fetchPromise = supabase
      .from('users')
      .select('user_type')
      .eq('id', authUser.id)
      .maybeSingle()

    const timeoutPromise = new Promise((resolve) => setTimeout(() => resolve({ data: null, error: 'timeout' }), 2500))
    const result = await Promise.race([fetchPromise, timeoutPromise])

    if (result?.data?.user_type) {
      dbRole = result.data.user_type
    }
  } catch (err) {
    console.warn('[useAuth] Profile lookup warning:', err)
  }

  return dbRole || fallbackRole || 'tenant'
}

export function useAuth() {
  const [user, setUser] = useState(null)
  const [role, setRole] = useState(null)
  const [loading, setLoading] = useState(true)
  const mountedRef = useRef(true)

  const syncUserState = useCallback(async (authUser) => {
    if (!mountedRef.current) return

    if (!authUser) {
      setUser(null)
      setRole(null)
      setLoading(false)
      return
    }

    setUser(authUser)
    try {
      const userRole = await resolveUserRole(authUser)
      if (mountedRef.current) {
        setRole(userRole)
      }
    } catch {
      if (mountedRef.current) {
        setRole(authUser.user_metadata?.user_type || 'tenant')
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false)
      }
    }
  }, [])

  useEffect(() => {
    mountedRef.current = true

    // 1. Initial session check with 3s timeout safeguard
    const initSession = async () => {
      try {
        const getSessionPromise = supabase.auth.getSession()
        const timeoutPromise = new Promise((resolve) =>
          setTimeout(() => resolve({ data: { session: null } }), 3000)
        )
        const { data: { session } } = await Promise.race([getSessionPromise, timeoutPromise])
        syncUserState(session?.user ?? null)
      } catch {
        if (mountedRef.current) setLoading(false)
      }
    }

    initSession()

    // 2. Listen for cross-tab and in-tab auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      const currentUser = session?.user ?? null

      if (event === 'SIGNED_OUT') {
        localStorage.removeItem('place4u_demo_role')
        if (mountedRef.current) {
          setUser(null)
          setRole(null)
          setLoading(false)
        }
        return
      }

      syncUserState(currentUser)
    })

    return () => {
      mountedRef.current = false
      subscription.unsubscribe()
    }
  }, [syncUserState])

  const signUp = async (email, password, userData) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: userData
      }
    })
    if (error) throw error
    return data
  }

  const signIn = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    })
    if (error) throw error
    return data
  }

  const signOut = async () => {
    localStorage.removeItem('place4u_demo_role')
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  }

  return {
    user,
    role,
    loading,
    signUp,
    signIn,
    signOut
  }
}