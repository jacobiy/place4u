/**
 * Shared configuration + Supabase client factory for the scripts in test/.
 *
 * Credentials are resolved from the process environment first, then from the
 * repo's .env (which is git-ignored). The anon/publishable key is the same one
 * that ships inside the browser bundle, so a test run must never require the
 * service_role key — if it does, the test is testing the wrong thing.
 *
 * Overrides (all optional):
 *   P4U_SUPABASE_URL / SUPABASE_URL / VITE_SUPABASE_URL
 *   P4U_SUPABASE_ANON_KEY / SUPABASE_ANON_KEY / VITE_SUPABASE_ANON_KEY
 *   P4U_TEST_<ROLE>_EMAIL / P4U_TEST_<ROLE>_PASSWORD   (tenant|agent|landlord|admin)
 *
 * Point these at a dev/uat project when you can — .env defaults to production.
 */
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, '..', '..');

/** Minimal KEY=VALUE .env reader. Never overwrites an existing env var. */
export function loadDotEnv() {
  for (const file of [join(REPO_ROOT, '.env'), join(HERE, '..', '.env')]) {
    if (!existsSync(file)) continue;
    for (const raw of readFileSync(file, 'utf8').split(/\r?\n/)) {
      const line = raw.trim();
      if (!line || line.startsWith('#')) continue;
      const eq = line.indexOf('=');
      if (eq === -1) continue;
      const key = line.slice(0, eq).trim();
      let value = line.slice(eq + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      if (!(key in process.env)) process.env[key] = value;
    }
    return file;
  }
  return null;
}

const DOT_ENV = loadDotEnv();

export function projectConfig() {
  const url =
    process.env.P4U_SUPABASE_URL || process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const anonKey =
    process.env.P4U_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    process.env.VITE_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      'Missing Supabase credentials. Set VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY ' +
        'in .env (see .env.example) or as environment variables.'
    );
  }
  return { url, anonKey, source: DOT_ENV };
}

/** A fresh, session-less client — exactly what an anonymous visitor holds. */
export function createAnonClient() {
  const { url, anonKey } = projectConfig();
  return createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
  });
}

/**
 * A client signed in as one of the test accounts. Returns null when the
 * credentials are absent, so callers can skip that role instead of failing.
 */
export async function createRoleClient(role) {
  const prefix = `P4U_TEST_${String(role).toUpperCase()}`;
  const email = process.env[`${prefix}_EMAIL`];
  const password = process.env[`${prefix}_PASSWORD`];
  if (!email || !password) return null;

  const client = createAnonClient();
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw new Error(`[${role}] sign-in failed for ${email}: ${error.message}`);
  return { client, user: data.user };
}
