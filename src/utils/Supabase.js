import { createClient } from '@supabase/supabase-js'

/**
 * Required Supabase credentials, resolved once at build time.
 *
 * These are deliberately NOT defaulted. Vite inlines every `VITE_*` value at
 * build time, so a missing value means this bundle was built without its
 * environment configured. This file used to fall back to a hard-coded live
 * project — which would silently point a dev / uat build at production data.
 * Shipping that cross-environment leak is far worse than failing loudly, so a
 * missing or invalid value throws here, and `vite.config.js` fails the build
 * even earlier, before anything reaches the browser.
 */
const ENV_SETUP_HINT =
  'Copy .env.example to .env, set the value, then rebuild. Vite inlines VITE_* ' +
  'variables at build time, so a running dev server needs a restart and a ' +
  'deployed build needs the value set in the host build environment.'

function requireEnv(value, name) {
  const raw = String(value ?? '').trim()
  if (!raw) {
    throw new Error(`[Supabase] Missing required environment variable ${name}. ${ENV_SETUP_HINT}`)
  }
  return raw
}

/**
 * Normalise and validate the Supabase project URL.
 *
 * A missing protocol, stray whitespace or trailing slash in
 * `VITE_SUPABASE_URL` is the usual root cause of the library's cryptic
 * "Invalid URL" errors (which then surface as pages that never load). Resolve
 * it once, up front, and fail loudly with an actionable message.
 *
 * @param {string|undefined} value
 * @returns {string} an origin such as `https://<project-ref>.supabase.co`
 */
function resolveSupabaseUrl(value) {
  const raw = requireEnv(value, 'VITE_SUPABASE_URL').replace(/\/+$/, '')

  try {
    const parsed = new URL(raw)
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      throw new Error(`unsupported protocol "${parsed.protocol}"`)
    }
    return parsed.origin
  } catch (err) {
    throw new Error(
      `[Supabase] VITE_SUPABASE_URL is not a valid http(s) URL (${err?.message || err}). ` +
        `Received: ${JSON.stringify(value)}.`
    )
  }
}

const supabaseUrl = resolveSupabaseUrl(import.meta.env.VITE_SUPABASE_URL)
const supabaseAnonKey = requireEnv(import.meta.env.VITE_SUPABASE_ANON_KEY, 'VITE_SUPABASE_ANON_KEY')

// A single stalled request (common right after a backgrounded tab regains focus
// and Supabase refreshes its token) must never leave a page spinning forever.
// Bound every request so it always settles: the caller then hits its own
// try/finally and the UI falls through to an empty/error state. Storage
// transfers are given a longer budget than API/auth calls.
const API_REQUEST_TIMEOUT_MS = 15000
const STORAGE_REQUEST_TIMEOUT_MS = 60000

function fetchWithTimeout(input, init = {}) {
  if (typeof AbortController === 'undefined' || typeof fetch === 'undefined') {
    return fetch(input, init)
  }

  const url = typeof input === 'string' ? input : input?.url || ''
  const timeoutMs = url.includes('/storage/v1')
    ? STORAGE_REQUEST_TIMEOUT_MS
    : API_REQUEST_TIMEOUT_MS

  const controller = new AbortController()
  const externalSignal = init.signal

  // Honour a caller-provided signal (e.g. an explicit cancel) as well.
  if (externalSignal) {
    if (externalSignal.aborted) controller.abort(externalSignal.reason)
    else externalSignal.addEventListener('abort', () => controller.abort(externalSignal.reason), { once: true })
  }

  const timer = setTimeout(() => controller.abort(new Error('Request timed out')), timeoutMs)

  return fetch(input, { ...init, signal: controller.signal }).finally(() => clearTimeout(timer))
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  global: {
    fetch: fetchWithTimeout
  },
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    // Use Supabase's built-in Navigator Lock. It includes "steal the orphaned
    // lock" recovery (added for the React Strict Mode / suspended-tab case),
    // which a previous custom no-op lock here had accidentally disabled — so a
    // single stuck lock would hang every request in the app forever.
    // Bound how long we wait before reclaiming an orphaned lock (e.g. left
    // behind by a backgrounded tab) so the client always self-heals.
    lockAcquireTimeout: 10000
  }
})
