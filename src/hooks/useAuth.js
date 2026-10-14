import { useEffect, useState, useCallback, useRef } from 'react'
import { supabase } from '../utils/Supabase'

// A stalled PostgREST request must never pin the app on its auth gate, so every
// authoritative lookup is raced against a hard timeout. One transient failure
// (dropped connection, throttled background tab) is retried once before the
// caller is told the account could not be resolved.
const ACCESS_LOOKUP_TIMEOUT_MS = 5000
const ACCESS_LOOKUP_ATTEMPTS = 2
const ACCESS_LOOKUP_RETRY_DELAY_MS = 600

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

/**
 * Fetch the authoritative `public.users` row, bounded by a hard timeout so the
 * returned promise always settles. Never throws.
 *
 * @returns {Promise<{status: 'ok', row: object} | {status: 'empty'} |
 *                   {status: 'error', error: any} | {status: 'timeout'}>}
 */
async function fetchUserAccessRow(userId) {
  const query = supabase
    .from('users')
    .select('user_type, is_verified')
    .eq('id', userId)
    .maybeSingle()

  const timeout = new Promise((resolve) => {
    setTimeout(() => resolve({ __timedOut: true }), ACCESS_LOOKUP_TIMEOUT_MS)
  })

  const result = await Promise.race([query, timeout])

  if (result?.__timedOut) return { status: 'timeout' }
  if (result?.error) return { status: 'error', error: result.error }
  return result?.data ? { status: 'ok', row: result.data } : { status: 'empty' }
}

/**
 * Resolves a user's role and account state from `public.users` — the ONLY
 * authoritative source. `user_metadata` and the email address are
 * client-controlled and were previously trusted here (privilege escalation),
 * so they are deliberately never consulted.
 *
 * Fails closed: every error path returns an inactive decision rather than a
 * guessed role. Returns { role, active, reason } where reason is one of
 * 'unauthenticated' | 'lookup-error' | 'timeout' | 'no-profile' | 'disabled'
 * | 'ok'. Only 'timeout' and 'lookup-error' are transient and safe to retry —
 * the caller should surface a retry affordance rather than bounce to /login.
 *
 * NOTE: only columns that are known to exist on public.users are selected, so
 * this never issues a request that PostgREST rejects with 400. If you later add
 * a dedicated account-status column (e.g. `status`), add it to the projection
 * and to the disabled-account check below.
 */
export async function resolveUserAccess(authUser) {
  if (!authUser?.id) {
    return { role: null, active: false, reason: 'unauthenticated' }
  }

  let lastReason = 'lookup-error'

  for (let attempt = 0; attempt < ACCESS_LOOKUP_ATTEMPTS; attempt++) {
    let outcome

    try {
      outcome = await fetchUserAccessRow(authUser.id)
    } catch (err) {
      outcome = { status: 'error', error: err }
    }

    if (outcome.status === 'ok') {
      const row = outcome.row

      if (!row?.user_type) {
        return { role: null, active: false, reason: 'no-profile' }
      }

      // An admin that has been explicitly de-verified is treated as disabled,
      // so a suspended admin cannot keep the console. Non-admin portals stay
      // reachable while pending so onboarding flows are not blocked.
      if (row.user_type === 'admin' && row.is_verified === false) {
        return { role: 'admin', active: false, reason: 'disabled' }
      }

      return { role: row.user_type, active: true, reason: 'ok' }
    }

    if (outcome.status === 'empty') {
      // Definitive: the request succeeded but no profile row exists.
      return { role: null, active: false, reason: 'no-profile' }
    }

    // Transient: a network error or a timeout. Back off briefly and retry once
    // so a single stalled request does not bounce the user to /login.
    lastReason = outcome.status === 'timeout' ? 'timeout' : 'lookup-error'
    if (outcome.status === 'error') {
      console.warn(
        '[useAuth] Authoritative role lookup failed:',
        outcome.error?.message || outcome.error
      )
    }
    if (attempt < ACCESS_LOOKUP_ATTEMPTS - 1) await delay(ACCESS_LOOKUP_RETRY_DELAY_MS)
  }

  return { role: null, active: false, reason: lastReason }
}

/**
 * Backwards-compatible string role resolver. Returns the authoritative role, or
 * null when the account cannot be resolved or is disabled. Fail closed.
 */
export async function resolveUserRole(authUser) {
  const access = await resolveUserAccess(authUser)
  return access.active ? access.role : null
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
        // Fail closed — never guess a role from client-controlled metadata.
        setRole(null)
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
      // TOKEN_REFRESHED fires often — notably whenever a backgrounded tab
      // regains focus. The identity is unchanged and the token is already
      // persisted, so re-syncing here only causes needless refetches.
      if (event === 'TOKEN_REFRESHED') return

      // IMPORTANT: this callback runs while the auth client holds its internal
      // lock, and every REST query *re-enters* that lock (to attach the access
      // token). Running `syncUserState` — which queries public.users — inline
      // therefore deadlocks the client permanently, after which every request
      // hangs and every page sits on its spinner. Defer to a macrotask so the
      // lock is released before we touch Supabase again.
      const currentUser = session?.user ?? null
      setTimeout(() => {
        if (!mountedRef.current) return

        if (event === 'SIGNED_OUT') {
          setUser(null)
          setRole(null)
          setLoading(false)
          return
        }

        syncUserState(currentUser)
      }, 0)
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