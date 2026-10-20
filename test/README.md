# test/

Integration probes for the Supabase data layer. Plain Node ESM scripts — no
test framework, no config, no extra dependencies (`@supabase/supabase-js` is
already a dependency of the app).

| Script | What it does | Credentials |
|---|---|---|
| `rls-anon.js` | Anonymous (publishable-key) attack battery: can a visitor read private tables, write rows, or escalate a role? | anon key only |
| `rls-roles.js` | Authenticated access matrix: does each role only see/change what it should? | one account per role (any subset) |
| `lib/env.js` | Env + Supabase client factory | — |
| `lib/harness.js` | `check()` / `report()` helpers | — |

## Run

```bash
npm test                 # same as: node test/rls-anon.js
npm run test:rls:roles   # node test/rls-roles.js
```

Both scripts exit non-zero when a check fails, so they can gate a deploy.

## Configuration

Credentials come from the process environment, then from the repo's `.env`
(git-ignored — **it points at production by default**, so override it to run
against dev/uat):

```bash
P4U_SUPABASE_URL / VITE_SUPABASE_URL
P4U_SUPABASE_ANON_KEY / VITE_SUPABASE_ANON_KEY

# rls-roles.js only — any subset; a role without credentials is skipped
P4U_TEST_TENANT_EMAIL / P4U_TEST_TENANT_PASSWORD
P4U_TEST_AGENT_EMAIL / P4U_TEST_AGENT_PASSWORD
P4U_TEST_LANDLORD_EMAIL / P4U_TEST_LANDLORD_PASSWORD
P4U_TEST_ADMIN_EMAIL / P4U_TEST_ADMIN_PASSWORD
```

Only the **anon/publishable** key is ever used. If a test needs the service_role
key, it is testing the wrong thing — the browser never has one.

## Why the write probes are safe to run

`rls-anon.js` proves a blocked write the same way the July 2026 audit did: it
sends a payload that trips a database constraint *behind* the row-level check.

```
RLS blocks it -> SQLSTATE 42501 / HTTP 401-403, nothing inserted   => PASS
RLS allows it -> 23502 / 23503 / 23514, still nothing inserted     => FAIL
                 (a constraint error is proof the statement reached the table)
```

The payloads use a NIL uuid foreign key or omit a NOT NULL column, so no row can
be created even when RLS is missing. There is nothing to clean up in the normal
case, and a row created by a regression is deleted immediately and reported.

All reads are `limit 1`/`limit 200` and never print row contents — only counts.

## What a healthy run looks like

- `rls-anon.js`: every private table reports `not readable` / `empty`; only
  `properties` returns rows, all `approved` + `active`; every write probe
  reports `42501`; and section 2 reports the RLS-bypassing views as **denied**.
- `rls-roles.js`: each role reads its own applications only; non-admins see only
  their own `users` row; no role can self-promote; no role can record a payment
  for another payer.

## Section 2 — why it fails instead of passing

A view created without `security_invoker = true` runs with its **owner's** rights
and therefore bypasses the RLS of its base tables. For those views "0 rows" means
nothing: an empty table and a well-protected one are indistinguishable. So
section 2 requires an **outright denial** and fails on any `200`, which is how it
catches `agent_verification_queue` today:

```
FAIL agent_verification_queue — anon can query a view that bypasses RLS
     (HTTP 200: the grant exists and base-table RLS is not applied)
```

That is expected until `database/rls_critical_lockdown.sql` Part 8 is applied
(`security_invoker = true` + revoke `anon`). It is deliberately a failing check
rather than a passing one — an empty table is not evidence of safety.

`agent_wallet_balances` is excluded from that section on purpose: it is also
`security_invoker = false`, but its body self-filters on
`u.id = auth.uid() OR admin`, so an anonymous caller (`auth.uid()` = NULL) already
gets zero rows. `application_match_summary` is declared
`security_invoker = true` and needs no special handling.
