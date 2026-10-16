// ============================================================================
// clear-storage-buckets.mjs
//
// Empties every app storage bucket before production. Supabase blocks direct
// `delete from storage.objects` in SQL (storage.protect_delete: "Direct
// deletion from storage tables is not allowed"), so the approved path is the
// Storage API — which this script uses.
//
// REQUIRES the service_role key (it bypasses RLS and can delete any object).
// Never commit it and never ship it to the browser.
//
// USAGE (PowerShell):
//   $env:SUPABASE_URL="https://rfajxzjrzmckroitcqxz.supabase.co"
//   $env:SUPABASE_SERVICE_ROLE_KEY="<service-role-key>"
//   node scripts/clear-storage-buckets.mjs
//
// Add --dry-run to list what would be removed without deleting anything.
// ============================================================================

import { createClient } from '@supabase/supabase-js';

const BUCKETS = [
  'documents',          // tenant/landlord application docs, leases
  'landlord-documents', // proof of ownership, rates, IDs
  'agent-documents',    // agent FICA docs
  'profiles',           // profile pictures
  'agent-profiles',     // agent profile pictures
  'properties'          // listing photos
];

const DRY_RUN = process.argv.includes('--dry-run');

const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url) {
  console.error('✗ Missing SUPABASE_URL (or VITE_SUPABASE_URL) in the environment.');
  process.exit(1);
}
if (!serviceKey) {
  console.error('✗ Missing SUPABASE_SERVICE_ROLE_KEY. This must be the service_role key, not the anon/publishable key.');
  process.exit(1);
}

const supabase = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false }
});

/** Recursively list every file path in a bucket (folders are entries with id === null). */
async function listAll(bucket, prefix = '') {
  const { data, error } = await supabase.storage.from(bucket).list(prefix, { limit: 1000 });
  if (error) throw error;

  let files = [];
  for (const entry of data || []) {
    const path = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.id === null) {
      files = files.concat(await listAll(bucket, path));
    } else {
      files.push(path);
    }
  }
  return files;
}

/** Storage API caps remove() at ~100 paths per call. */
function chunk(arr, size = 100) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

let totalRemoved = 0;
let hadError = false;

for (const bucket of BUCKETS) {
  try {
    const files = await listAll(bucket);

    if (files.length === 0) {
      console.log(`• ${bucket}: empty`);
      continue;
    }

    if (DRY_RUN) {
      console.log(`• ${bucket}: ${files.length} object(s) would be removed (dry run)`);
      continue;
    }

    for (const batch of chunk(files)) {
      const { error } = await supabase.storage.from(bucket).remove(batch);
      if (error) throw error;
      totalRemoved += batch.length;
    }
    console.log(`✓ ${bucket}: removed ${files.length} object(s)`);
  } catch (err) {
    hadError = true;
    console.error(`✗ ${bucket}: ${err?.message || err}`);
  }
}

console.log(
  DRY_RUN
    ? '\nDry run complete — nothing was deleted.'
    : `\nDone. ${totalRemoved} object(s) removed.`
);

process.exit(hadError ? 1 : 0);
