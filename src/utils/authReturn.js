/**
 * Detect a return from an external auth provider (Google OAuth, an email
 * confirmation / magic link, a password-recovery link) so the app can route the
 * user straight to their portal instead of leaving them parked on a public page.
 *
 * WHY THIS EXISTS
 * ---------------
 * Supabase honours `redirectTo` ONLY when the target URL is on the project's
 * Redirect URL allowlist. When it is not, Supabase does NOT throw — it silently
 * falls back to the project's Site URL. That is what turns
 *
 *     .../auth/callback        (what we ask for)
 *     https://place4u.xyz/#    (where Google actually lands)
 *
 * The session is still created, because `detectSessionInUrl` processes the
 * tokens/`?code=` wherever they land. But nothing then routes the user onward:
 * the SPA catch-all renders the landing page with a valid session, so the user
 * ends up looking signed-out-but-not. App.jsx's RoleOnboardingGate consumes
 * this module to finish the job no matter which URL the provider returned to.
 *
 * The URL is read at MODULE-EVALUATION time, deliberately: the Supabase client
 * strips the auth parameters from the URL while it initialises
 * (`detectSessionInUrl`, `_getSessionFromURL` → `history.replaceState`). For
 * that reason this module must be imported before the Supabase client is
 * constructed — `main.jsx` imports it first, ahead of `App.jsx` (which pulls in
 * `utils/Supabase.js`).
 */

// Parameters Supabase puts on the URL for each flow:
//   implicit   -> #access_token=…&refresh_token=…   (or #error=…)
//   PKCE       -> ?code=…                            (or ?error=…)
const AUTH_PARAM_KEYS = [
  'access_token',
  'refresh_token',
  'code',
  'error',
  'error_description',
  'error_code'
]

const initialHref =
  typeof window !== 'undefined' && window.location ? window.location.href : ''

/**
 * True when THIS page load arrived with auth parameters in the query string or
 * the fragment. False on any ordinary visit/reload.
 *
 * @type {boolean}
 */
export const isAuthReturn = (() => {
  if (!initialHref) return false

  try {
    const url = new URL(initialHref)
    const fromQuery = url.searchParams
    const fromHash = new URLSearchParams(url.hash.replace(/^#/, ''))

    return AUTH_PARAM_KEYS.some((key) => fromQuery.has(key) || fromHash.has(key))
  } catch {
    return false
  }
})()

// A *very* recent sign-in is treated as a provider return too. This covers the
// cases the URL marker cannot: a provider round-trip that discards the
// parameters entirely, or a client that cleared the URL before this module was
// evaluated. It is only ever acted on from a public entry path (see App.jsx),
// so a normal signed-in visit to the site is unaffected once the window closes.
const FRESH_SIGN_IN_WINDOW_MS = 5 * 60 * 1000

/**
 * True when the session's server-recorded `last_sign_in_at` is within the last
 * few minutes. Note this is NOT updated by a token refresh, so background
 * refreshes do not make an old session look new.
 *
 * @param {object|null|undefined} session a Supabase session
 * @returns {boolean}
 */
export function isRecentSignIn(session) {
  const raw = session?.user?.last_sign_in_at
  if (!raw) return false

  const signedInAt = Date.parse(raw)
  if (!Number.isFinite(signedInAt)) return false

  return Date.now() - signedInAt < FRESH_SIGN_IN_WINDOW_MS
}

// Only one automatic post-sign-in redirect is allowed per page load. Without
// this, the gate could fight a user who deliberately navigates back to `/`.
let claimed = false

/**
 * Claim this page load's single automatic post-sign-in redirect.
 *
 * Returns true at most once per page load, and only when this load looks like a
 * return from an auth provider. Call it only after the authoritative
 * `public.users` row has been read and a portal has been resolved — the caller
 * must never guess a role.
 *
 * @param {object|null|undefined} session a Supabase session
 * @returns {boolean} whether the caller may redirect to the user's portal
 */
export function claimPostSignInRedirect(session) {
  if (claimed) return false
  if (!isAuthReturn && !isRecentSignIn(session)) return false

  claimed = true
  return true
}
