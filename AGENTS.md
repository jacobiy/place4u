# AGENTS.md

Guidance for agents working in the **Place4U** repository (a South African relocation / tenant–property matching platform).

> **Read `readmev2.md` first.** It is the authoritative, up-to-date architecture and product overview (roles, data model, money flow, the planned Decision Engine). This file captures the things that are *not* obvious from reading a file or two.

---

## 0. Repository Verification (MANDATORY — runs first)

**Before any agent executes any task in this repository, it MUST verify it is operating in the correct GitHub repository.**

- **Expected GitHub owner/account:** `jacobiy`
- **Expected Git email:** `jacob@place4u.xyz`
- **Expected repository name:** `Place4U` (case-insensitive)

### Verification Procedure

1. Run `git config --get remote.origin.url` and confirm the remote points to `github.com/jacobiy/Place4U` (or `git@github.com:jacobiy/Place4U.git`).
2. Run `git config user.email` and confirm it matches `jacob@place4u.xyz`.
3. Run `git config user.name` and confirm it matches `jacobiy`.

### Failure Behavior

- If **any** check fails, the agent **MUST STOP IMMEDIATELY** and report the mismatch.
- Do not proceed with any file reads, writes, shell commands, or API calls until the repository identity is confirmed.
- This rule exists to prevent accidental operations on forks, clones, or unrelated repositories that may share a similar structure.

> **Note:** This check runs in the agent's environment before the first tool call. It is not a runtime check in the application code — it is a *agent operating procedure* for this workspace.

---

## 1. What this project is

A **client-only React SPA (Vite) with no bespoke backend**. The browser talks directly to **Supabase** (Postgres + Row Level Security, Auth, Storage, Realtime) using the anon key, and to **PayPal** for the application fee.

Consequences that shape almost every change:

- **Business rules live in SQL**, not in a server. Tables, constraints, triggers, RLS policies, views, and RPCs are all defined by the `.sql` files in `database/`. Money logic in particular lives in `database/agent_wallet_ledger.sql`.
- The client is **untrusted**. Never infer identity, role, or authorization from anything client-controlled (`localStorage`, `user_metadata`, email). Authorization must be enforced by RLS / RPC in the DB, and the client just reflects it.
- There is no application server to hold secrets. Only the Supabase **anon/publishable** key and PayPal **client-side** config are used in the app. Server-side PayPal secrets in `.env.example` are not consumed by this SPA.
- Rows are expected to be **additive and idempotent** SQL applied by hand in the Supabase SQL editor — there is no migration runner.

### High-level layout

```
src/
  App.jsx            Routes (lazy), role guards, ChunkErrorBoundary, AuthCallback
  main.jsx           React root + BrowserRouter
  hooks/useAuth.js   Session + authoritative role resolution
  component/         Shared UI (Navbar, Footer, modals, consent, ProtectedRoute)
  components/        ONLY loading.jsx — do not confuse with component/
  pages/
    landing/ login/ Signup/ resetpassword/ legal/
    Tenant/ Landlord/ Agent/   (PascalCase portal folders)
    admin/                     (lowercase; nested routes via AdminDashboard)
  services/          Supabase-backed domain services (see §5)
  utils/             Supabase client, document URLs, matcher, consent
database/            All Supabase SQL: schemas, triggers, RPCs, views, RLS
docs/                BRD.md, IMPLEMENTATION_STEPS.md
test-*.js            Plain-Node integration scripts (see §3)
```

---

## 2. Commands

```bash
npm install
npm run dev        # vite --host --port 1337  (http://localhost:1337)
npm run build      # vite build  -> dist/ (gitignored)
npm run preview    # serve the production build
```

- The dev server binds `--host` on **port 1337** (not Vite's default 5173).
- **There is no lint or typecheck script and no ESLint/TS config.** Do not add lint steps or invent `npm run lint`. The project is plain JavaScript (`.js`/`.jsx`), no TypeScript.
- `.cdmrc` is a Crush/IDE config that runs `bun install && bun run dev`; `bun.lockb` exists, but `npm` works too.

---

## 3. Testing

Tests are **not** a unit-test framework. `test-*.js` at the repo root are standalone Node scripts that:

- import `@supabase/supabase-js` directly,
- connect to a **live Supabase project with credentials hardcoded in the file**,
- assert with a local `assert()` that calls `process.exit(1)` on failure.

```bash
npm test               # runs test-agent-dashboard.js
npm run test:agent     # test-agent-dashboard.js
npm run test:properties # test-admin-property-management.js
node test-<name>.js    # any of the other test-*.js scripts
```

Other scripts (`test-users.js`, `test-tenants.js`, `test-schema*.js`, `test-insert-tenant.js`, `test-agent-settings.js`, `test-agent-verification.js`, `test-properties.js`) are run the same way. They require network access to Supabase and will fail offline. Because they hit shared live data, treat them as integration smoke tests, not deterministic unit tests — do not "fix" them by mocking unless asked.

---

## 4. Authentication & authorization (critical, easy to break)

Role and account state come **only** from `public.users.user_type` (+ `is_verified` for admins). This is enforced in two places and must stay that way:

- `src/hooks/useAuth.js` → `resolveUserAccess()` / `resolveUserRole()`
- `src/component/ProtectedRoute.jsx`

Non-obvious rules:

- **Fail closed.** Unknown/deferred states must never guess a role. `resolveUserAccess` returns `{ role, active, reason }`; only `timeout` and `lookup-error` are transient (show a retry screen), everything else denies access.
- **Do not trust `user_metadata`, the email string, or `localStorage` for the role.** Earlier code did this (privilege escalation); the comments explicitly warn against reintroducing it. `getStoredLocalUser()` reads localStorage only to obtain the *authenticated user object*, never the role.
- **`onAuthStateChange` callbacks must defer any Supabase query to a macrotask** (`setTimeout(..., 0)`). The auth client holds an internal lock during that callback, and issuing a PostgREST query inline re-enters the lock and **deadlocks the client permanently** (every page sticks on its spinner). This is documented in both `useAuth.js` and `ProtectedRoute.jsx` — preserve it.
- In `App.jsx`, the `*_ROLES` arrays are module-level constants on purpose. Inlining `["tenant"]` in JSX creates a new array each render, re-running `ProtectedRoute`'s auth effect and tearing down/rebuilding its subscription. Never inline them.
- `AuthCallback` (`/auth/callback`) resolves the role from `public.users` and routes to `/${role}`; it never guesses a portal from metadata.

The Supabase client (`src/utils/Supabase.js`) is singleton and hardened: it wraps `fetch` with per-request timeouts (15s API / 60s storage) and uses a `lockAcquireTimeout` for the Navigator Lock. Read its comments before touching client options.

---

## 5. Data access patterns (follow these, don't reinvent)

### 5.1 Supabase client
Always import the shared client: `import { supabase } from '<relative>/utils/Supabase'`. Never `createClient` in a page.

### 5.2 `applicationSync.js` — the canonical write/broadcast path
`src/services/applicationSync.js` implements a **DB-authoritative + local-cache merge**:

1. Supabase is the source of truth (status, payment, assignment).
2. `localStorage` (`place4u_tenant_applications`) fills gaps and keeps UIs responsive/offline.
3. Updates fan out three ways: a Supabase Realtime channel, an in-page `CustomEvent` (`place4u:application-updated`), and a cross-tab `storage` ping (`place4u_sync_ping`).

**After any successful status write in any portal, call `applyApplicationUpdate(id, status, extra)`.**
Never let a status change be local-only. Read `subscribeToApplicationUpdates` / `mergeLocalAndDbApplications` before adding new sync behavior.

### 5.3 Per-portal query modules return `{ success, data, error }`
`src/pages/<Portal>/db/queries.js` (e.g. `AgentQueries`, tenant/landlord/admin equivalents) wrap Supabase calls, **return a result object instead of throwing**, and often layer a `localStorage` cache. Match this shape when adding queries; don't throw from these modules.

### 5.4 Application statuses have ONE vocabulary
`src/services/applicationStatus.js` is the single source of truth for `applications.status`. Canonical lifecycle: `submitted → under_review → matches_found → completed`, plus `expired`, `cancelled`, `rejected`. It also maps many legacy aliases (`pending`, `matched`, `approved`, …). **All status reads/writes must go through `normalizeApplicationStatus` / `getApplicationStatusMeta` / labels from this module** so the four dashboards agree. Hard-coding a status list or label elsewhere is the bug this module exists to prevent.

### 5.5 Two match workflows coexist (don't merge them by accident)
- **Draft match** — `src/services/applicationMatchService.js` + `database/application_match_draft.sql`: one row per `(application_id, property_id)` with `flagged | skipped | shipped`. Local-cache-first, degrades gracefully if the migration isn't applied.
- **Full pipeline** — `src/services/matchWorkflowService.js` + `database/match_.sql` on `public.application_property_matches`: `shipped → tenant_accepted → agent_forwarded → landlord_accepted → admin_approved → scheduled → …` with off-ramps. Writes go through **SECURITY DEFINER RPCs** validated server-side.

Both are designed to **degrade gracefully when their SQL hasn't been applied** (reads return `[]`, transitions return a helpful error rather than throwing). Preserve that.

### 5.6 Money
`src/services/walletService.js` is the single client entry for agent balances/payouts/refunds. It wraps SQL RPCs (`request_agent_payout`, `process_agent_payout`, `admin_direct_agent_payout`, `refund_application_fee`) and the `agent_wallet_balances` view. Constants `APPLICATION_FEE = 100`, `AGENT_SPLIT_RATE = 0.5` also exist client-side, but **the DB is authoritative** for balances and refunds (a refund also removes the agent's share).

### 5.7 Documents / storage
Documents live in **private buckets** (`agent-documents`, `landlord-documents`; see `src/utils/documentUrls.js`). Stored values may be a storage path or a URL. Always resolve to a displayable URL via `resolveDocumentUrl` / `resolveDocumentUrls` (which signs the object, and can re-sign legacy public/expired URLs). Never render a bare storage path or navigate to a relative path — `openDocumentSafely` guards against the SPA catch-all redirect.

---

## 6. Routing & page structure

- All routes are **`lazy()`-loaded** in `src/App.jsx` inside a `Suspense` + `ChunkErrorBoundary`. The boundary auto-reloads once on stale-chunk / adblock-detected failures (tracked via `sessionStorage` per pathname) and shows a dedicated "module loading" screen. Keep new top-level routes lazy.
- Role-gated portals: `/tenant`, `/landlord`, `/agent`, `/admin/*`, each wrapped in `ProtectedRoute` with `allowedRoles`.
- **Admin uses nested routes** (`AdminDashboard.jsx` renders `<Routes>` with `AdminLayout`); **Tenant/Landlord/Agent do not** — their entry pages (`MainTenant`, `MainLandLord`, `MainAgent`) manage an internal `activeView` state and render panel components directly. Follow the existing convention of the portal you touch rather than converting one style to the other.
- Portal folders: `src/pages/Tenant`, `Landlord`, `Agent` (PascalCase), `src/pages/admin` (lowercase). Shared UI is `src/component/`; `src/components/` contains only `loading.jsx`.

---

## 7. Styling

Multiple styling approaches coexist; match the local file.

- **Tailwind CSS v4** is wired via `@tailwindcss/vite` (plugin in `vite.config.js`) **and** `@tailwindcss/postcss` (`postcss.config.js`). `tailwind.config.js` defines a Material-style design-token palette (`surface-*`, `on-*`, `primary`, `secondary`, `tertiary`, …) plus custom spacing/font scales.
- `src/index.css` also defines `--color-*` CSS variables and loads fonts via `index.html`.
- Some portals (Agent) additionally use plain CSS (`*.css` per page) and a `Styles/designTokens.js` with `globalStyle`/`T` objects. Other panels are Tailwind-class-heavy.

Do not introduce a new styling system or migrate a component to a different one; use whatever its neighbors already use.

---

## 8. Environment & secrets (gotchas)

- Copy `.env.example` → `.env`. Vite only exposes `VITE_`-prefixed vars to the client.
- **Missing credentials fail the build — there is no fallback.** `src/utils/Supabase.js` runs `requireEnv()` → `resolveSupabaseUrl()` and *throws* on a missing or invalid `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`; `vite.config.js` fails the build even earlier, before anything reaches the browser. `paypalService.js` likewise defaults the client ID to `''` and the environment to `sandbox`, so a misconfigured build cannot take live payments. An earlier revision *did* silently fall back to a hard-coded live project — do not reintroduce that; this section documented the old behaviour for a while and it misled a security review into reporting a non-existent "hardcoded credentials" finding.
- Because Vite **inlines** every `VITE_*` value into the bundle at build time, seeing the production Supabase URL / publishable key as a literal string in a built bundle is **expected and not a leak**. Only a `service_role`/secret key in client code would be.
- The committed `.env` points at the shared production Supabase project, so local dev reads and writes production data. Give dev/uat their own values per `.env.example` before trusting anything you see locally.
- `.env` is gitignored. Never commit real secrets.

---

## 9. Deployment

The SPA is host-agnostic and **both hosts are configured**. `place4u.xyz` currently runs on **Netlify** (verify with `curl -sSI https://place4u.xyz/` → `Server: Netlify`), so do not assume Vercel:

- **Vercel** — `vercel.json`: a catch-all rewrite to `/index.html` for SPA client routing, plus security headers.
- **Netlify** — `public/_redirects` (`/*    /index.html   200`) for routing, plus `public/_headers` for the same security headers.

Because Vite copies `public/` into `dist/`, both `_redirects` and `_headers` ship on build (build output is `dist/`, gitignored; `vite.config.js` sets `manualChunks` for react/charts/framer/supabase vendors and a 600 kB chunk warning limit).

**The two header mechanisms are not interchangeable.** Netlify does *not* read the `headers` array in `vercel.json`, and Vercel does *not* read `public/_headers`. A header added to only one file is silently absent on the other host — so change **both** or the live host will serve the app with no CSP. After deploying, confirm with:

```powershell
curl -sSI https://place4u.xyz/ | Select-String "content-security-policy|x-frame-options|x-content-type-options"
```

The CSP is deliberately tuned to what the app loads — Supabase (REST, Realtime, and signed-URL documents rendered in `<iframe>`/`<object>`), the PayPal SDK for the application-fee buttons, and Google Fonts. Test any CSP change on a preview deploy, and exercise the payment flow and the document/PDF preview modals specifically.

---

## 10. The "Decision Engine" (planned focus)

`src/utils/jobAffordabilityMatcher.js` ("Job & Affordability Linking & Approximation Engine") scores a tenant **against a property** using weighted signals — affordability (45%, SA 33% rent-to-income norm), commute proximity (30%, via a hardcoded SA suburb→metro cluster graph), and employment stability blended with document verification. It returns a composite score, tier, verdict, and insights, and is consumed by the agent portal (`JobLinkApproximationModal`).

`readmev2.md` §9–10 describes the intended next step: generalizing this into a **Decision Engine** (`src/services/decisionEngine.js`) that also ranks *applications → agents* and produces explainable, auditable, human-in-the-loop recommendations. It is **not built yet** — if asked to work on it, follow the phasing in `readmev2.md` §10.5 and keep the SQL/server-authoritative + explainability principles. Today the agent-assignment decision is still manual (Admin assigns; agent accepts/rejects; rejects go to a needs-reassignment queue).

---

## 11. Conventions & gotchas summary

- Plain JavaScript, ESM (`"type": "module"`), functional React with hooks. Match surrounding style; no TypeScript, no ESLint config.
- Don't add a linter/formatter/test framework to this repo unless explicitly asked.
- The codebase favors **defensive, self-healing code with explanatory comments** (timeouts, retries, fail-closed auth, graceful degradation when SQL migrations are absent). Preserve these safeguards rather than simplifying them away.
- Keep the SPA's status vocabulary centralized (§5.4), the role resolution DB-authoritative (§4), and status writes broadcast (§5.2).
- `readmev2.md` is kept current and is the best single source for product/architecture context; `docs/BRD.md` is the business requirements doc.
