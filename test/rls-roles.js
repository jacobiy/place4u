#!/usr/bin/env node
/**
 * test/rls-roles.js — the authenticated access matrix.
 *
 * Signs in as one test account per role and checks that Row Level Security
 * scopes what each role can see and change. Strongest assertion here is
 * "self-consistency": whatever a tenant/agent/landlord can read from
 * `applications` must satisfy that role's ownership predicate. A permissive
 * policy shows up immediately as a foreign row.
 *
 * Needs credentials for the accounts you want to exercise (any subset):
 *   P4U_TEST_TENANT_EMAIL   / P4U_TEST_TENANT_PASSWORD
 *   P4U_TEST_AGENT_EMAIL    / P4U_TEST_AGENT_PASSWORD
 *   P4U_TEST_LANDLORD_EMAIL / P4U_TEST_LANDLORD_PASSWORD
 *   P4U_TEST_ADMIN_EMAIL    / P4U_TEST_ADMIN_PASSWORD
 *
 * A role with no credentials is skipped, not failed — so this is safe to run
 * with only the accounts you have. Read-only apart from two probes that are
 * asserted to be *rejected* (self-promotion and a forged payment).
 *
 * Run:  node test/rls-roles.js
 */
import { createRoleClient, projectConfig } from './lib/env.js';
import {
  NIL_UUID,
  check,
  describeError,
  fail,
  isRlsDenied,
  pass,
  report,
  section,
  skip
} from './lib/harness.js';

const ROLES = ['tenant', 'agent', 'landlord', 'admin'];

async function readApplications(client, role) {
  const { data, error } = await client.from('applications').select('*').limit(200);
  if (error) {
    fail(`${role}: can read applications`, describeError(error));
    return [];
  }
  pass(`${role}: can read applications`, `${(data || []).length} row(s)`);
  return data || [];
}

async function checkApplicationsScoping(client, role, user, rows) {
  const label = `${role}: only applications it is entitled to`;
  if (role === 'admin') {
    pass(label, 'admin sees everything by design');
    return;
  }

  if (role === 'tenant') {
    const foreign = rows.filter((a) => a.tenant_id !== user.id);
    check(label, foreign.length === 0, foreign.length ? `${foreign.length} foreign row(s) leaked` : `${rows.length} own row(s)`);
    return;
  }

  if (role === 'agent') {
    const foreign = rows.filter((a) => a.assigned_to !== user.id);
    check(label, foreign.length === 0, foreign.length ? `${foreign.length} foreign row(s) leaked` : `${rows.length} assigned row(s)`);
    return;
  }

  if (role === 'landlord') {
    const { data, error } = await client.from('properties').select('id').eq('landlord_id', user.id);
    if (error) {
      fail(label, `could not list own listings — ${describeError(error)}`);
      return;
    }
    const owned = new Set((data || []).map((p) => String(p.id)));
    const foreign = rows.filter((a) => !owned.has(String(a.property_id)));
    check(
      label,
      foreign.length === 0,
      foreign.length
        ? `${foreign.length} row(s) for listings the landlord does not own`
        : `${rows.length} row(s) across ${owned.size} own listing(s)`
    );
  }
}

async function checkUsersScoping(client, role, user) {
  const { data, error } = await client.from('users').select('id, user_type, full_name').limit(50);

  if (error) {
    if (role === 'admin') fail('admin: can read users', describeError(error));
    else pass(`${role}: users read blocked`, describeError(error));
    return;
  }

  if (role === 'admin') {
    check('admin: can read users', (data || []).length > 0, `${(data || []).length} row(s)`);
    return;
  }

  const foreign = (data || []).filter((u) => u.id !== user.id);
  check(
    `${role}: only its own users row is visible`,
    foreign.length === 0,
    foreign.length ? `${foreign.length} foreign user row(s) leaked` : 'self only'
  );
}

async function checkNoSelfPromotion(client, role, user) {
  if (role === 'admin') return;

  const { data, error } = await client
    .from('users')
    .update({ user_type: 'admin' })
    .eq('id', user.id)
    .select();

  const changed = (data || []).length;
  const blocked = Boolean(error) || changed === 0;
  check(
    `${role}: cannot self-promote to admin`,
    blocked,
    error ? describeError(error) : `${changed} row(s) changed`
  );

  // Defensive revert if a regression ever let this through.
  if (!blocked) {
    await client.from('users').update({ user_type: role }).eq('id', user.id);
    process.stdout.write('  ! reverted a successful self-promotion\n');
  }
}

async function checkPaymentForgery(client, role) {
  if (role === 'admin') return; // admins legitimately manage payments

  const { data, error } = await client
    .from('payments')
    .insert({
      payer_id: NIL_UUID,
      amount: 1,
      status: 'completed',
      payment_type: 'application_fee'
    })
    .select();

  if (error && isRlsDenied(error)) {
    pass(`${role}: cannot record a payment for another payer`, describeError(error));
    return;
  }
  if (error) {
    fail(`${role}: cannot record a payment for another payer`, `reached the table — ${describeError(error)}`);
    return;
  }

  fail(`${role}: cannot record a payment for another payer`, 'row was created');
  for (const row of data || []) {
    if (row?.id) await client.from('payments').delete().eq('id', row.id);
  }
}

async function runRole(role) {
  let session;
  try {
    session = await createRoleClient(role);
  } catch (error) {
    section(`${role}`);
    fail(`${role}: sign-in`, error.message);
    return;
  }

  if (!session) {
    section(`${role}`);
    skip(`${role}: no credentials`, `set P4U_TEST_${role.toUpperCase()}_EMAIL / _PASSWORD`);
    return;
  }

  const { client, user } = session;
  section(`${role} — ${user.email}`);

  const rows = await readApplications(client, role);
  await checkApplicationsScoping(client, role, user, rows);

  const props = await client.from('properties').select('id, is_active, approval_status').limit(50);
  if (props.error) fail(`${role}: can read properties`, describeError(props.error));
  else pass(`${role}: can read properties`, `${(props.data || []).length} row(s)`);

  await checkUsersScoping(client, role, user);
  await checkNoSelfPromotion(client, role, user);
  await checkPaymentForgery(client, role);

  // Informational: user_directory is readable by any authenticated account by
  // design (messaging lookups). Reported so the exposure stays visible.
  const dir = await client.from('user_directory').select('id').limit(1000);
  if (dir.error) pass(`${role}: user_directory blocked`, describeError(dir.error));
  else pass(`${role}: user_directory reachable (by design)`, `${(dir.data || []).length} row(s)`);
}

async function main() {
  const config = projectConfig();
  process.stdout.write(`Target: ${config.url}\n`);

  for (const role of ROLES) {
    await runRole(role);
  }

  return report('Role matrix');
}

main().catch((error) => {
  process.stderr.write(`\nFatal: ${error?.message || error}\n`);
  process.exitCode = 1;
});
