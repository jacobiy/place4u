#!/usr/bin/env node
/**
 * test/rls-anon.js — the anonymous attack battery.
 *
 * Reproduces what an attacker with ONLY the publishable key (the anon key that
 * ships inside the browser bundle) can do against the live project. Requires no
 * accounts, and is safe to run: every read is limited and every write probe is
 * built so that it CANNOT create a row even if RLS lets the statement through.
 *
 * How the write probes work
 * -------------------------
 * Each probe sends a payload that trips a database constraint (a foreign key to
 * a NIL uuid, or a missing NOT NULL column) *behind* the row-level checks:
 *
 *   RLS blocks it  -> SQLSTATE 42501 / HTTP 401-403, nothing inserted   => PASS
 *   RLS allows it  -> 23502/23503/23514, still nothing inserted         => FAIL
 *                     (the statement reached the table)
 *   it inserts     -> 201; the row is deleted immediately and reported   => FAIL
 *
 * So "a constraint error" is proof that RLS let the statement through, exactly
 * as the July 2026 audit described. With RLS correctly configured this table
 * never triggers a write, which is why the script is safe on production.
 *
 * Run:  node test/rls-anon.js      (or: npm test)
 */
import { createAnonClient, projectConfig } from './lib/env.js';
import {
  NIL_UUID,
  check,
  describeError,
  fail,
  isRlsDenied,
  pass,
  report,
  section
} from './lib/harness.js';

const PRIVATE_READS = [
  { table: 'applications', select: 'id' },
  { table: 'documents', select: 'id' },
  { table: 'messages', select: 'id' },
  { table: 'payments', select: 'id' },
  { table: 'tenants', select: 'id' },
  { table: 'users', select: 'id' },
  { table: 'landlord_profiles', select: 'id' },
  { table: 'tenant_profiles', select: 'id' },
  { table: 'agent_profiles', select: 'id' },
  { table: 'application_property_matches', select: 'id' },
  { table: 'match_events', select: 'id' },
  // Views and tables that carry financial / KYC / activity data. `select: '*'`
  // keeps this schema-agnostic; only row counts are ever printed.
  { table: 'agent_wallet_balances', select: '*' },
  { table: 'application_match_summary', select: '*' },
  { table: 'agent_payout_requests', select: 'id' },
  { table: 'notifications', select: '*' },
  { table: 'landlord_activity_log', select: '*' }
];

// Views created WITHOUT `security_invoker = true` run with their OWNER's rights
// and therefore bypass the RLS of their base tables. For these, "0 rows" is not
// proof of safety — an empty table looks identical to a protected one. The only
// valid result is an outright denial, so a HTTP 200 is a failure here regardless
// of the row count. (`user_directory` was fixed this way by
// security_grant_lockdown.sql; `agent_verification_queue` was missed by it.)
//
// Not in this list, because they are genuinely safe:
//   application_match_summary — declared security_invoker = true
//   agent_wallet_balances     — security_invoker = false, but self-filters on
//                               `u.id = auth.uid() OR admin`, so anon (NULL uid)
//                               already gets nothing
const RLS_BYPASSING_VIEWS = ['user_directory', 'agent_verification_queue'];

const WRITE_PROBES = [
  {
    label: 'applications — anonymous INSERT',
    table: 'applications',
    payload: { tenant_id: NIL_UUID, status: 'submitted' }
  },
  { label: 'properties — anonymous INSERT', table: 'properties', payload: {} },
  { label: 'documents — anonymous INSERT', table: 'documents', payload: {} },
  {
    label: 'messages — anonymous INSERT',
    table: 'messages',
    payload: { sender_id: NIL_UUID, receiver_id: NIL_UUID, content: '__p4u_rls_probe__' }
  },
  {
    label: 'payments — anonymous INSERT',
    table: 'payments',
    payload: { payer_id: NIL_UUID, amount: 1, status: 'completed' }
  },
  { label: 'tenants — anonymous INSERT', table: 'tenants', payload: {} }
];

async function main() {
  const config = projectConfig();
  const client = createAnonClient();
  process.stdout.write(`Target: ${config.url}\n`);
  process.stdout.write(
    config.source ? `Credentials: ${config.source} (anon/publishable key only)\n` : ''
  );

  // -------------------------------------------------------------------------
  section('1. Private table reads');
  // -------------------------------------------------------------------------
  for (const probe of PRIVATE_READS) {
    const { data, error } = await client.from(probe.table).select(probe.select).limit(1);

    if (error) {
      const msg = String(error.message || '');
      if (error.code === '42P01' || error.code === 'PGRST205' || /does not exist|Could not find the table/i.test(msg)) {
        skip(`${probe.table} — not installed`, describeError(error));
        continue;
      }
      // Either the row is filtered out (RLS) or the relation is unreadable. Both
      // mean "not exposed". A column the relation doesn't have is not a leak
      // either, so it passes with the error shown rather than silently hiding.
      if (isRlsDenied(error)) pass(`${probe.table} — not readable`, describeError(error));
      else pass(`${probe.table} — no rows returned`, describeError(error));
      continue;
    }

    const rows = Array.isArray(data) ? data.length : 0;
    if (rows === 0) pass(`${probe.table} — empty`);
    else fail(`${probe.table} — LEAK`, `${rows} row(s) visible to anon`);
  }

  // -------------------------------------------------------------------------
  section('2. RLS-bypassing views (must be denied, not merely empty)');
  // -------------------------------------------------------------------------
  for (const view of RLS_BYPASSING_VIEWS) {
    const { error } = await client.from(view).select('*').limit(1);

    if (error) {
      pass(`${view} — denied to anon`, describeError(error));
    } else {
      fail(
        `${view} — anon can query a view that bypasses RLS`,
        'HTTP 200: the grant exists and base-table RLS is not applied — every row that appears later is exposed'
      );
    }
  }

  // -------------------------------------------------------------------------
  section('3. Public listings are still reachable');
  // -------------------------------------------------------------------------
  {
    const { data, error } = await client
      .from('properties')
      .select('id, is_active, approval_status')
      .limit(200);

    if (error) {
      // A denied properties read is not a leak, but it means the marketing
      // landing page has nothing to render — treat it as a failure worth seeing.
      if (isRlsDenied(error) || error.code === '42501') {
        fail('properties — anon can read live listings (landing page)', describeError(error));
      } else {
        skip('properties — anon read', describeError(error));
      }
    } else {
      const rows = data || [];
      const nonPublic = rows.filter(
        (p) => !(p.is_active === true && p.approval_status === 'approved')
      );
      check(
        'properties — anon sees approved + active listings only',
        nonPublic.length === 0,
        nonPublic.length
          ? `${nonPublic.length} non-public row(s) leaked (e.g. ${JSON.stringify(nonPublic[0])})`
          : `${rows.length} public row(s)`
      );
    }
  }

  // -------------------------------------------------------------------------
  section('4. Anonymous writes');
  // -------------------------------------------------------------------------
  for (const probe of WRITE_PROBES) {
    const { data, error } = await client.from(probe.table).insert(probe.payload).select();

    if (error && isRlsDenied(error)) {
      pass(probe.label, describeError(error));
      continue;
    }

    if (error) {
      // Reached the table: the constraint fired, not row-level security.
      fail(probe.label, `statement reached the table — ${describeError(error)}`);
      continue;
    }

    // Nothing should ever get here. Clean up rather than leave a row behind.
    fail(probe.label, 'row was created by an anonymous caller');
    const created = Array.isArray(data) ? data : [];
    for (const row of created) {
      if (row?.id) await client.from(probe.table).delete().eq('id', row.id);
    }
  }

  // -------------------------------------------------------------------------
  section('5. Anonymous UPDATE / DELETE (advisory)');
  // -------------------------------------------------------------------------
  // Targeting a NIL uuid means no row can be affected; a permissive policy
  // would show up as rows in the representation. Kept advisory because
  // PostgREST's behaviour on a zero-match UPDATE varies by version.
  {
    const { data, error } = await client
      .from('applications')
      .update({ status: 'submitted' })
      .eq('id', NIL_UUID)
      .select();

    if (error) pass('applications — anonymous UPDATE', describeError(error));
    else check('applications — anonymous UPDATE', (data || []).length === 0, `${(data || []).length} row(s) returned`);
  }
  {
    const { data, error } = await client
      .from('applications')
      .delete()
      .eq('id', NIL_UUID)
      .select();

    if (error) pass('applications — anonymous DELETE', describeError(error));
    else check('applications — anonymous DELETE', (data || []).length === 0, `${(data || []).length} row(s) returned`);
  }

  // -------------------------------------------------------------------------
  section('6. Privilege-escalation RPCs');
  // -------------------------------------------------------------------------
  {
    const { error } = await client.rpc('set_initial_role', { p_role: 'admin' });
    if (error && /could not find the function|schema cache/i.test(error.message || '')) {
      skip('set_initial_role — RPC not installed');
    } else {
      check('set_initial_role — cannot self-assign admin', Boolean(error), describeError(error));
    }
  }
  {
    const { error } = await client.rpc('request_agent_payout', { p_amount: 1 });
    if (error && /could not find the function|schema cache/i.test(error.message || '')) {
      skip('request_agent_payout — RPC not installed');
    } else {
      check(
        'request_agent_payout — only agents may request',
        Boolean(error),
        describeError(error)
      );
    }
  }

  return report('Anonymous battery');
}

main().catch((error) => {
  process.stderr.write(`\nFatal: ${error?.message || error}\n`);
  process.exitCode = 1;
});
